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
    
    // Hide player during intro screen
    this.player.hide();
    
    // Level progression - check URL parameter
    this.currentLevel = this.getLevelFromURL();
    console.log(`Game constructor: currentLevel set to ${this.currentLevel}`);
    
    // Score tracking
    this.score = 0;
    
    this.enemies = new EnemyManager(this.engine.scene, this.currentLevel);
    console.log(`EnemyManager created with level ${this.currentLevel}`);
    this.powerUps = new PowerUpManager(this.engine.scene);
    this.effects = new EffectsManager(this.engine.scene);
    
    this.audioStarted = false;
    this.gameStarted = false;
    this.introRenderId = null;
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

  // Calculate score for enemy destruction: 10 + 10 * floor((LEVEL-1)*0.5 + CHAIN*0.5)
  calculateEnemyScore(chainCount) {
    const levelBonus = (this.currentLevel - 1) * 0.5;
    const chainBonus = chainCount * 0.5;
    const multiplier = Math.floor(levelBonus + chainBonus);
    return 10 + 10 * multiplier;
  }

  // Add score and update display
  addScore(points) {
    this.score += points;
    this.overlay.updateScore(this.score);
  }
  
  init() {
    this.engine.init();
    this.setupAudioStart();
    this.setupGameStart();
    
    // Show start overlay
    this.overlay.showStartOverlay();
    
    // Create intro text and announce the random title
    const randomTitle = this.effects.createIntroText();
    // Announce the random title with robot voice (slower rate)
    setTimeout(() => {
      this.audio.createRobotSpeech(randomTitle, 0.6);
    }, 1000); // Delay to let the intro settle
    
    // Start minimal render loop for intro screen
    this.startIntroRenderLoop();
  }
  
  startIntroRenderLoop() {
    // Simple render loop for intro screen with waving animation
    const render = () => {
      if (!this.gameStarted) {
        // Animate enemies with waving effect during intro
        this.enemies.updateIntroAnimation();
        this.engine.render();
        this.introRenderId = requestAnimationFrame(render);
      }
    };
    this.introRenderId = requestAnimationFrame(render);
  }
  
  stopIntroRenderLoop() {
    if (this.introRenderId) {
      cancelAnimationFrame(this.introRenderId);
      this.introRenderId = null;
    }
  }
  
  setupAudioStart() {
    // Start background sound on first user interaction (required by browsers)
    const startAudio = () => {
      if (!this.audioStarted && this.audio.audioContext) {
        this.audio.audioContext.resume();
        this.audio.startBackgroundSound();
        this.audio.updateSoundtrack(this.currentLevel);
        this.audioStarted = true;
      }
    };

    // Add click listener to start audio
    document.addEventListener('click', startAudio, { once: true });
    document.addEventListener('keydown', startAudio, { once: true });
  }

  setupGameStart() {
    const startGame = () => {
      if (!this.gameStarted) {
        // Hide start overlay
        this.overlay.hideStartOverlay();
        
        // Stop intro render loop
        this.stopIntroRenderLoop();
        
        // Remove intro text
        this.effects.removeIntroText();
        
        // Show player ship
        this.player.show();
        
        // Start audio
        if (!this.audioStarted && this.audio.audioContext) {
          this.audio.audioContext.resume();
          this.audio.startBackgroundSound();
          this.audio.updateSoundtrack(this.currentLevel);
          this.audioStarted = true;
        }
        
        // Start game loop
        this.engine.animate(() => this.update());
        
        // Start soundtrack for current level
        this.audio.updateSoundtrack(this.currentLevel);
        
        // Set keyboard focus to the game canvas
        this.engine.renderer.domElement.focus();
        
        // Show score and level displays
        this.overlay.showScore();
        this.overlay.showLevel();
        this.overlay.updateLevel(this.currentLevel);
        
        this.gameStarted = true;
        console.log('Game started!');
      }
    };

    // Add click listener to start game
    this.overlay.startOverlay.addEventListener('click', startGame, { once: true });
    
    // Also start on any key press
    const startOnKey = (e) => {
      startGame();
      e.preventDefault();
    };
    document.addEventListener('keydown', startOnKey, { once: true });
  }
  
  update() {
    // Only update if game has started
    if (!this.gameStarted) return;
    
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
    this.powerUps.update(gameState, this.player, this.enemies, this.audio);
    
    // Update effects
    const effectsResult = this.effects.update();
    const completedExplosion = effectsResult && effectsResult.explosion ? effectsResult.explosion : null;
    const levelCompleteFinished = effectsResult && effectsResult.levelCompleteFinished;
    
    // Update score popups
    this.overlay.updateScorePopups();
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
      
      // Remove bullet
      this.engine.scene.remove(bullet);
      this.player.bullets.splice(bulletIndex, 1);
      
      // Calculate and add score
      const chainCount = this.powerUps.getChainCount();
      const enemyScore = this.calculateEnemyScore(chainCount);
      this.addScore(enemyScore);
      
      // Show score popup at enemy position
      this.overlay.createScorePopup(enemyScore, enemy.position, this.engine.camera, this.engine.renderer);
      
      // Remove enemy with power-up callback
      this.enemies.removeEnemy(enemy, (position) => {
        this.powerUps.spawnPowerUpOnColumnDestroyed(this.player, position);
      });
      
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
      
      // Remove bullet
      this.engine.scene.remove(bullet);
      this.player.wingBullets.splice(bulletIndex, 1);
      
      // Calculate and add score
      const chainCount = this.powerUps.getChainCount();
      const enemyScore = this.calculateEnemyScore(chainCount);
      this.addScore(enemyScore);
      
      // Show score popup at enemy position
      this.overlay.createScorePopup(enemyScore, enemy.position, this.engine.camera, this.engine.renderer);
      
      // Remove enemy with power-up callback
      this.enemies.removeEnemy(enemy, (position) => {
        this.powerUps.spawnPowerUpOnColumnDestroyed(this.player, position);
      });
      
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
        
        // Calculate and add score
        const chainCount = this.powerUps.getChainCount();
        const enemyScore = this.calculateEnemyScore(chainCount);
        this.addScore(enemyScore);
        
        // Show score popup at enemy position
        this.overlay.createScorePopup(enemyScore, enemy.position, this.engine.camera, this.engine.renderer);
        
        // Remove enemy with power-up callback
        this.enemies.removeEnemy(enemy, (position) => {
          this.powerUps.spawnPowerUpOnColumnDestroyed(this.player, position);
        });
        
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
      this.audio.createRobotSpeech("GAME OVER");
      this.effects.startGameOverAnimation();
      // Hide chain display on game over
      this.overlay.hideChainOnGameOver();
      return;
    }
    
    // Fallback: Start Game Over animation immediately if player is destroyed
    if (gameState.playerDestroyed && !this.effects.gameOverAnimation) {
      console.log('Player destroyed! Starting Game Over animation immediately...');
      this.audio.playGameOver();
      this.audio.createRobotSpeech("GAME OVER");
      this.effects.startGameOverAnimation();
      // Hide chain display on game over
      this.overlay.hideChainOnGameOver();
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
    
    // Update level display
    this.overlay.updateLevel(this.currentLevel);
    
    // Reset game state
    this.engine.resetGameState();
    
    // Clear all effects
    this.effects.clearAll();
    
    // Reset player position and state
    this.player.reset();
    
    // Clear all enemies and power-ups
    this.enemies.clearAll();
    this.powerUps.clearPowerUpsOnly(); // Don't reset chain on level progression
    
    // Update chain display for new level (chain persists)
    const currentChainCount = this.powerUps.getChainCount();
    this.overlay.updateChain(currentChainCount);
    
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
    
    // Update level display
    this.overlay.updateLevel(this.currentLevel);
    
    // Reset game state
    this.engine.resetGameState();
    
    // Clear all effects
    this.effects.clearAll();
    
    // Reset player position and state (remove wings on game restart)
    this.player.reset(true);
    
    // Show player ship
    this.player.show();
    
    // Clear all enemies and power-ups
    this.enemies.clearAll();
    this.powerUps.clearAll();
    
    // Silently hide chain display for restart (no "CHAIN BROKEN" text)
    this.overlay.silentHideChain();
    
    // Reset game over state
    this.overlay.resetGameOverState();
    
    // Clear all score popups
    this.overlay.clearAllScorePopups();
    
    // Reset score
    this.score = 0;
    this.overlay.resetScore();
    this.overlay.showScore(); // Show score for restart
    
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
