import * as THREE from 'three';
import { GameEngine } from './core/GameEngine.js';
import { AudioManager } from './audio/AudioManager.js';
import { Player } from './entities/Player.js';
import { EnemyManager } from './entities/EnemyManager.js';
import { PowerUpManager } from './entities/PowerUpManager.js';
import { EffectsManager } from './effects/EffectsManager.js';
import { InputManager } from './input/InputManager.js';
import { OverlayManager } from './ui/OverlayManager.js';
import { CollisionManager } from './physics/CollisionManager.js';

class Game {
  constructor() {
    this.engine = new GameEngine();
    this.audio = new AudioManager();
    this.input = new InputManager();
    this.overlay = new OverlayManager();
    
    this.player = new Player(this.engine.scene);
    this.enemies = new EnemyManager(this.engine.scene);
    this.powerUps = new PowerUpManager(this.engine.scene);
    this.effects = new EffectsManager(this.engine.scene);
    
    this.audioStarted = false;
  }
  
  init() {
    this.engine.init();
    this.setupAudioStart();
    this.engine.animate(() => this.update());
  }
  
  setupAudioStart() {
    // Start background sound on first user interaction (required by browsers)
    const startAudio = () => {
      if (!this.audioStarted && this.audio.audioContext) {
        this.audio.audioContext.resume();
        this.audio.startBackgroundSound();
        this.audioStarted = true;
      }
    };

    // Add click listener to start audio
    document.addEventListener('click', startAudio, { once: true });
    document.addEventListener('keydown', startAudio, { once: true });
  }
  
  update() {
    const gameState = this.engine.getGameState();
    
    // Update player
    const playerResult = this.player.update(this.input, gameState);
    if (playerResult && playerResult.manualPowerUp) {
      this.powerUps.createPowerUp();
    }
    if (playerResult && playerResult.manualRedPowerUp) {
      this.powerUps.createPowerUp('red');
    }
    
    // Update enemies
    this.enemies.update(this.player, gameState, this.audio);
    
    // Update power-ups
    this.powerUps.update(gameState, this.player);
    
    // Update effects
    const completedExplosion = this.effects.update();
    
    // Check collisions
    this.checkCollisions();
    
    // Update UI status
    this.overlay.updateInvulnerabilityStatus(this.player.isInvulnerable);
    
    // Check game state
    this.checkGameState(completedExplosion);
  }
  
  checkCollisions() {
    const gameState = this.engine.getGameState();
    
    // Main bullet-enemy collision
    const bulletCollision = CollisionManager.checkBulletEnemyCollision(
      this.player.bullets, 
      this.enemies.enemies, 
      this.audio
    );
    
    if (bulletCollision) {
      const { bulletIndex, enemyIndex, bullet, enemy } = bulletCollision;
      
      // Remove bullet and enemy
      this.engine.scene.remove(bullet);
      this.engine.scene.remove(enemy);
      this.player.bullets.splice(bulletIndex, 1);
      this.enemies.enemies.splice(enemyIndex, 1);
      
      // Play hit sound
      this.audio.playHit();
    }
    
    // Wing bullet-enemy collision
    const wingBulletCollision = CollisionManager.checkWingBulletEnemyCollision(
      this.player.wingBullets,
      this.enemies.enemies,
      this.audio
    );
    
    if (wingBulletCollision) {
      const { bulletIndex, enemyIndex, bullet, enemy } = wingBulletCollision;
      
      // Remove bullet and enemy
      this.engine.scene.remove(bullet);
      this.engine.scene.remove(enemy);
      this.player.wingBullets.splice(bulletIndex, 1);
      this.enemies.enemies.splice(enemyIndex, 1);
      
      // Play hit sound
      this.audio.playHit();
    }
    
    // Player-power-up collision
    if (gameState.isPlaying && !gameState.playerDestroyed) {
      const powerUpResult = this.powerUps.checkCollisions(this.player, this.audio);
      if (powerUpResult) {
        // Handle wing upgrades
        if (powerUpResult.type === 'red' && powerUpResult.wingAdded) {
          console.log(`Wing upgrade: ${powerUpResult.wingAdded} wing added!`);
        }
      }
    }
  }
  
  checkGameState(completedExplosion) {
    const gameState = this.engine.getGameState();
    
    // Check wing-enemy collisions first (only if not invulnerable)
    if (!this.player.isInvulnerable) {
      const wingCollision = CollisionManager.checkWingEnemyCollision(
        this.player,
        this.enemies.enemies
      );
      
      if (wingCollision && !gameState.playerDestroyed) {
        const { wing, enemy, side } = wingCollision;
        
        // Create explosion at wing position
        const wingWorldPos = new THREE.Vector3();
        wing.getWorldPosition(wingWorldPos);
        this.effects.createExplosion(wingWorldPos);
        
        // Remove enemy
        this.enemies.removeEnemy(enemy);
        
        // Destroy wing
        this.player.destroyWing(wing);
        
        // Play explosion sound
        this.audio.playExplosion();
        
        console.log(`${side} wing destroyed!`);
      }
    }
    
    // Game over (enemy reaches player) - only if not invulnerable
    if (!this.player.isInvulnerable) {
      const enemyCollision = CollisionManager.checkPlayerEnemyCollision(
        this.player, 
        this.enemies.enemies
      );
      
      if (enemyCollision && !gameState.playerDestroyed) {
        // Mark player as destroyed
        this.engine.setGameState({
          playerDestroyed: true,
          isPlaying: false
        });
        
        // Create explosion at player position
        this.effects.createExplosion(this.player.position);
        
        // Remove player ship (cockpit and wings are automatically removed as they're children)
        this.player.destroy();
        
        // Play explosion sound
        this.audio.playExplosion();
      }
    }
    
    // Handle explosion completion
    if (completedExplosion && gameState.playerDestroyed && !gameState.explosionComplete) {
      this.engine.setGameState({ explosionComplete: true });
      this.audio.playGameOver();
      this.overlay.showOverlay('Game Over');
      return;
    }
    
    // Win condition (only if game is still playing)
    if (this.enemies.enemies.length === 0 && gameState.isPlaying) {
      this.audio.playWin();
      this.overlay.showOverlay('You Win!');
      return;
    }
  }
}

// Initialize game
const game = new Game();
game.init();
