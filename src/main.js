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
    
    // Level progression
    this.currentLevel = 1;
    
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
    this.powerUps.update(gameState, this.player, this.enemies);
    
    // Update effects
    const effectsResult = this.effects.update();
    const completedExplosion = effectsResult && effectsResult.explosion ? effectsResult.explosion : null;
    const levelCompleteFinished = effectsResult && effectsResult.levelCompleteFinished;
    const levelCompleteColor = effectsResult && effectsResult.levelCompleteColor;
    const gameOverFinished = effectsResult && effectsResult.gameOverFinished;
    
    // Check collisions
    this.checkCollisions();
    
    // Update UI status
    this.overlay.updateInvulnerabilityStatus(this.player.isInvulnerable);
    
    // Update level complete text colors
    if (levelCompleteColor) {
      this.overlay.updateLevelCompleteColors(levelCompleteColor);
    }
    
    // Check game state
    this.checkGameState(completedExplosion, levelCompleteFinished, gameOverFinished);
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
        if (powerUpResult.type === 'red' && powerUpResult.wingsAdded && powerUpResult.wingsAdded.length > 0) {
          console.log(`Wing upgrade: ${powerUpResult.wingsAdded.join(', ')} wing(s) added!`);
        }
      }
    }
  }
  
  checkGameState(completedExplosion, levelCompleteFinished, gameOverFinished) {
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
      console.log('Player destroyed! Starting Game Over animation...');
      this.audio.playGameOver();
      this.effects.startGameOverAnimation();
      return;
    }
    
    // Fallback: Start Game Over animation immediately if player is destroyed
    if (gameState.playerDestroyed && !this.effects.gameOverAnimation) {
      console.log('Player destroyed! Starting Game Over animation immediately...');
      this.audio.playGameOver();
      this.effects.startGameOverAnimation();
      this.engine.setGameState({ explosionComplete: true });
      return;
    }
    
    // Handle game over animation finished
    if (gameOverFinished) {
      console.log('Game Over animation finished!');
      // Game stays in game over state - could add restart logic here
      return;
    }

    // Level complete condition (only if game is still playing)
    if (this.enemies.enemies.length === 0 && gameState.isPlaying && !this.effects.levelCompleteAnimation) {
      console.log('All enemies destroyed! Starting level complete animation...');
      this.effects.startLevelCompleteAnimation();
      this.overlay.showLevelComplete();
    return;
  }

    // Handle level complete animation finished
    if (levelCompleteFinished) {
      console.log('Level complete animation finished! Starting next level...');
      this.overlay.hideLevelComplete();
      this.startNextLevel();
      return;
    }
  }

  startNextLevel() {
    this.currentLevel++;
    console.log(`Starting level ${this.currentLevel}...`);
    
    // Reset game state
    this.engine.resetGameState();
    
    // Clear all effects
    this.effects.clearAll();
    
    // Reset player position and state
    this.player.reset();
    
    // Clear all enemies and power-ups
    this.enemies.clearAll();
    this.powerUps.clearAll();
    
    // Spawn new enemies for the next level with level-based scaling
    this.enemies.createEnemies(this.currentLevel);
    
    // Play level start sound (if you want to add one)
    // this.audio.playLevelStart();
    
    console.log(`Level ${this.currentLevel} started!`);
  }
}

// Initialize game
const game = new Game();
game.init();
