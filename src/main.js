import * as THREE from 'three';
import { GameEngine } from './core/GameEngine.js';
import { LevelManager } from './core/LevelManager.js';
import { GameStateManager } from './core/GameStateManager.js';
import { CollisionHandler } from './core/CollisionHandler.js';
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
    
    // Core managers
    this.levelManager = new LevelManager();
    this.gameStateManager = new GameStateManager(this.engine, this.effects, this.overlay, this.audio);
    this.collisionHandler = new CollisionHandler(this.engine.scene, this.audio, this.effects, this.overlay);
    
    this.player = new Player(this.engine.scene);
    
    // Initialize entities with current level
    this.currentLevel = this.levelManager.getCurrentLevel();
    console.log(`Game constructor: currentLevel set to ${this.currentLevel}`);
    
    this.enemies = new EnemyManager(this.engine.scene, this.currentLevel);
    console.log(`EnemyManager created with level ${this.currentLevel}`);
    this.powerUps = new PowerUpManager(this.engine.scene);
    this.effects = new EffectsManager(this.engine.scene);
    
    // Update gameStateManager with effects reference
    this.gameStateManager.effects = this.effects;
    
    this.audioStarted = false;
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
    const collisionResults = CollisionManager.processAllCollisions(
      this.player, 
      this.enemies.enemies, 
      this.powerUps, 
      this.audio, 
      gameState
    );
    
    // Handle collision results
    const collisionAction = this.collisionHandler.handleCollisionResults(
      collisionResults, 
      this.player, 
      this.enemies, 
      this.powerUps
    );
    
    // Handle game over from collision
    if (collisionAction && collisionAction.action === 'gameOver') {
      this.engine.setGameState({
        playerDestroyed: true,
        isPlaying: false
      });
      
      // Create explosion at player position
      this.effects.createExplosion(this.player.position);
      
      // Remove player ship
      this.player.destroy();
      
      // Play explosion sound
      this.audio.playExplosion();
    }
    
    // Update chain display based on current chain count
    const currentChainCount = this.powerUps.getChainCount();
    this.overlay.updateChain(currentChainCount);
    
    // Update UI status
    this.overlay.updateInvulnerabilityStatus(this.player.isInvulnerable);
    
    // Update level complete text colors
    if (levelCompleteColor) {
      this.overlay.updateLevelCompleteColors(levelCompleteColor);
    }
    
    // Check game state
    const gameStateAction = this.gameStateManager.checkGameState(
      completedExplosion, 
      levelCompleteFinished, 
      gameOverFinished, 
      this.player, 
      this.enemies, 
      this.input
    );
    
    // Handle game state actions
    if (gameStateAction && gameStateAction.action === 'restart') {
      this.restartGame();
    } else if (gameStateAction && gameStateAction.action === 'nextLevel') {
      this.startNextLevel();
    }
  }
  

  


  startNextLevel() {
    this.currentLevel = this.levelManager.nextLevel();
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
    this.currentLevel = this.levelManager.resetToStartLevel();
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
