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
    
    // Level progression - check URL parameter
    this.currentLevel = this.getLevelFromURL();
    console.log(`Game constructor: currentLevel set to ${this.currentLevel}`);
    
    this.enemies = new EnemyManager(this.engine.scene, this.currentLevel);
    console.log(`EnemyManager created with level ${this.currentLevel}`);
    this.powerUps = new PowerUpManager(this.engine.scene);
    this.effects = new EffectsManager(this.engine.scene);
    
    this.audioStarted = false;
  }

  getLevelFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    const levelParam = urlParams.get('level');
    
    console.log(`URL search params: ${window.location.search}`);
    console.log(`Level parameter from URL: ${levelParam}`);
    
    if (levelParam) {
      const level = parseInt(levelParam, 10);
      console.log(`Parsed level: ${level}`);
      if (level >= 1 && level <= 100) { // Reasonable level range
        console.log(`Starting game at level ${level} (from URL parameter)`);
        return level;
      } else {
        console.warn(`Invalid level parameter: ${levelParam}. Must be between 1-100. Starting at level 1.`);
      }
    }
    
    console.log(`No valid level parameter found, defaulting to level 1`);
    return 1; // Default to level 1
  }
  
  init() {
    this.engine.init();
    this.setupAudioStart();
    this.engine.animate(() => this.update());
    
    // Start soundtrack for current level
    this.audio.updateSoundtrack(this.currentLevel);
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
        
        // Handle chain updates for blue power-ups
        if (powerUpResult.type === 'blue' && powerUpResult.chainCount !== undefined) {
          this.overlay.updateChain(powerUpResult.chainCount);
        }
      }
    }
    
    // Update chain display based on current chain count
    const currentChainCount = this.powerUps.getChainCount();
    this.overlay.updateChain(currentChainCount);
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
    
    // Handle restart when game over and SPACE is pressed
    if (this.effects.isWaitingForRestart() && this.input.isShootPressed()) {
      console.log('Restarting game...');
      this.restartGame();
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
    
    // Hide chain display for new level
    this.overlay.hideChain();
    
    // Spawn new enemies for the next level with level-based scaling
    console.log(`Creating enemies for level ${this.currentLevel}...`);
    this.enemies.createEnemies(this.currentLevel);
    
    // Update soundtrack for new level
    this.audio.updateSoundtrack(this.currentLevel);
    
    console.log(`Level ${this.currentLevel} started!`);
  }

  restartGame() {
    console.log('Restarting game...');
    
    // Reset level to URL parameter level (or 1 if no parameter)
    this.currentLevel = this.getLevelFromURL();
    console.log(`Restarting at level ${this.currentLevel} (from URL parameter)`);
    
    // Reset game state
    this.engine.resetGameState();
    
    // Clear all effects
    this.effects.clearAll();
    
    // Reset player position and state
    this.player.reset();
    
    // Clear all enemies and power-ups
    this.enemies.clearAll();
    this.powerUps.clearAll();
    
    // Hide chain display for restart
    this.overlay.hideChain();
    
    // Spawn new enemies for the restart level
    this.enemies.createEnemies(this.currentLevel);
    
    // Start soundtrack for the restart level
    this.audio.updateSoundtrack(this.currentLevel);
    
    console.log(`Game restarted at level ${this.currentLevel}!`);
  }
}

// Initialize game
const game = new Game();
game.init();
