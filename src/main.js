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

const DEBUG = false;
 
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
    if (DEBUG) console.log(`Game constructor: currentLevel set to ${this.currentLevel}`);
    
    // Score tracking
    this.score = 0;
    
    // Lives system (player starts with 3 lives: 2 extra)
    this.lives = 3;
    this.livesDecremented = false; // Flag to prevent double decrementing
    this.respawnDelay = 0; // Delay before respawning (in seconds)
    this.enemyPauseDelay = 0; // Delay before enemies start moving again (in seconds)
    this.enemyDiveDelay = 0; // Delay before enemies start diving after respawn (in seconds)
    
    this.enemies = null; // Will be created after engine initialization
    this.powerUps = new PowerUpManager(this.engine.scene);
    this.effects = new EffectsManager(this.engine.scene);
    
    this.audioStarted = false;
    this.gameStarted = false;
    this.introRenderId = null;
    
    // Mobile detection
    this.isMobile = this.input.getIsMobile();
    if (this.isMobile) {
      console.log('Mobile device detected - enabling touch controls and auto-shoot');
    }
  }

  getLevelFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    const levelParam = urlParams.get('level');
    
    if (DEBUG) console.log(`URL search params: ${window.location.search}`);
    if (DEBUG) console.log(`Level parameter from URL: ${levelParam}`);
    
    if (levelParam) {
      const level = parseInt(levelParam, 10);
      if (DEBUG) console.log(`Parsed level: ${level}`);
      if (level >= 1 && level <= 100) { // Reasonable level range
        if (DEBUG) console.log(`Starting game at level ${level} (from URL parameter)`);
        return level;
      } else {
        console.warn(`Invalid level parameter: ${levelParam}. Must be between 1-100. Starting at level 1.`);
      }
    }
    
    if (DEBUG) console.log(`No valid level parameter found, defaulting to level 1`);
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
    
    // Create enemies after engine is initialized so bounds calculation works
    this.enemies = new EnemyManager(this.engine.scene, this.currentLevel, this.engine, this.audio);
    if (DEBUG) console.log(`EnemyManager created with level ${this.currentLevel}`);
    
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
        if (this.enemies) {
          this.enemies.updateIntroAnimation();
        }
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
        
        // Show score, level, and lives displays
        this.overlay.showScore();
        this.overlay.showLevel();
        this.overlay.showLives();
        this.overlay.updateLevel(this.currentLevel);
        this.overlay.updateLives(this.lives);
        
        this.gameStarted = true;
        if (DEBUG) console.log('Game started!');
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
    
    // Mobile: start on touch
    if (this.isMobile) {
      const startOnTouch = (e) => {
        startGame();
        e.preventDefault();
      };
      this.overlay.startOverlay.addEventListener('touchstart', startOnTouch, { once: true });
    }
  }
  
  update() {
    // Only update if game has started
    if (!this.gameStarted) return;
    
    const gameState = this.engine.getGameState();
    
    // Handle enemy pause and respawn delays
    if (this.enemyPauseDelay > 0) {
      this.enemyPauseDelay -= 1/60; // Assuming 60 FPS
    }
    
    if (this.enemyDiveDelay > 0) {
      this.enemyDiveDelay -= 1/60; // Assuming 60 FPS
    }
    
    if (this.respawnDelay > 0) {
      this.respawnDelay -= 1/60; // Assuming 60 FPS
      if (this.respawnDelay <= 0) {
        this.respawnPlayer();
        // Set 2-second delay before enemies can start diving again
        this.enemyDiveDelay = 2.0;
      }
      
      // Always update effects (explosions, particles, etc.)
      const effectsResult = this.effects.update();
      
      // During respawn delay, update enemies with limited functionality
      if (this.enemies) {
        if (this.enemyPauseDelay <= 0) {
          // Enemy pause is over - full enemy update (they can move again)
          this.enemies.update(this.player, gameState, this.audio, this.enemyDiveDelay > 0);
        } else {
          // Enemy pause is active - only update wave motion, no diving/swooping
          this.enemies.updateWaveMotionOnly();
        }
      }
      
      // Update score popups
      this.overlay.updateScorePopups();
      
      return; // Don't update other game logic during respawn delay
    }
    
    // Update player
    const playerResult = this.player.update(this.input, gameState, this.engine);
    if (playerResult && playerResult.manualPowerUp) {
      this.powerUps.createPowerUp();
    }
    if (playerResult && playerResult.manualRedPowerUp) {
      this.powerUps.createPowerUp('red');
    }
    
    // Update enemies
    if (this.enemies) {
      this.enemies.update(this.player, gameState, this.audio, this.enemyDiveDelay > 0);
    }
    
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
    const bulletCollision = this.enemies ? CollisionManager.checkBulletEnemyCollision(
      this.player.bullets, 
      this.enemies.enemies, 
      this.audio
    ) : null;
    
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
    const wingBulletCollision = this.enemies ? CollisionManager.checkWingBulletEnemyCollision(
      this.player.wingBullets,
      this.enemies.enemies,
      this.audio
    ) : null;
    
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
    
    // Enemy bullet-player collision (level 10+)
    if (gameState.isPlaying && !gameState.playerDestroyed && this.enemies && this.currentLevel >= 10) {
      const enemyBulletCollision = CollisionManager.checkEnemyBulletPlayerCollision(
        this.enemies.enemyBullets,
        this.player
      );
      
      if (enemyBulletCollision && !this.player.isInvulnerable) {
        // Mark player as destroyed
        this.engine.setGameState({
          playerDestroyed: true,
          isPlaying: false
        });
        
        // Create explosion at player position
        this.effects.createExplosion(this.player.position);
        
        // Remove player ship
        this.player.destroy();
        
        // Remove the bullet that hit and clean up its trail
        const hitBullet = enemyBulletCollision.bullet;
        if (hitBullet.userData.isGreen) {
          this.enemies.cleanupBulletTrail(hitBullet);
        }
        this.engine.scene.remove(hitBullet);
        this.enemies.enemyBullets.splice(enemyBulletCollision.bulletIndex, 1);
        
        // Play explosion sound
        this.audio.playExplosion();
        
        // Announce ship destruction
        this.audio.createRobotSpeech("Ship Destroyed");
      }
    }

    // Player-power-up collision
    if (gameState.isPlaying && !gameState.playerDestroyed) {
      const powerUpResult = this.powerUps.checkCollisions(this.player, this.audio);
      if (powerUpResult) {
        // Handle wing upgrades
        if (powerUpResult.type === 'red' && powerUpResult.wingsAdded && powerUpResult.wingsAdded.length > 0) {
          if (DEBUG) console.log(`Wing upgrade: ${powerUpResult.wingsAdded.join(', ')} wing(s) added!`);
        }
        
        // Handle chain updates and score bonus for blue power-ups
        if (powerUpResult.type === 'blue' && powerUpResult.chainCount !== undefined) {
          this.overlay.updateChain(powerUpResult.chainCount);
          
          // Add score bonus: 10^CHAIN
          if (powerUpResult.scoreBonus !== undefined) {
            this.addScore(powerUpResult.scoreBonus);
            if (DEBUG) console.log(`Blue power-up score bonus: ${powerUpResult.scoreBonus} points (10^${powerUpResult.chainCount})`);
            
            // Show score popup at power-up position
            if (powerUpResult.position) {
              this.overlay.createScorePopup(powerUpResult.scoreBonus, powerUpResult.position, this.engine.camera, this.engine.renderer);
            }
          }
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
    if (!this.player.isInvulnerable && this.enemies) {
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
        
        // Announce wing destruction
        this.audio.createRobotSpeech("Wing Destroyed");
        
        if (DEBUG) console.log(`${side} wing destroyed!`);
      }
    }
    
    // Game over (enemy reaches player) - only if not invulnerable
    if (!this.player.isInvulnerable && this.enemies) {
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
        
        // Announce ship destruction
        this.audio.createRobotSpeech("Ship Destroyed");
      }
    }
    
    // Handle explosion completion
    if (completedExplosion && gameState.playerDestroyed && !gameState.explosionComplete) {
      this.engine.setGameState({ explosionComplete: true });
      
      // Decrement lives (only once)
      if (!this.livesDecremented) {
        this.lives--;
        this.livesDecremented = true;
        this.overlay.updateLives(this.lives);
      }
      
      if (this.lives <= 0) {
        // No lives left - game over
        if (DEBUG) console.log('No lives left! Starting Game Over animation...');
        this.audio.playGameOver();
        this.audio.createRobotSpeech("GAME OVER");
        this.effects.startGameOverAnimation();
        // Hide chain display on game over
        this.overlay.hideChainOnGameOver();
      } else {
        // Still have lives - start enemy pause and respawn delays
        if (DEBUG) console.log(`Player destroyed! Lives remaining: ${this.lives}. Starting 3-second enemy pause, then 2-second respawn delay...`);
        this.enemyPauseDelay = 3.0; // 3 seconds of enemy pause
        this.respawnDelay = 5.0; // 5 seconds total (3 + 2) before respawn
      }
      return;
    }
    
    // Fallback: Start Game Over animation immediately if player is destroyed
    if (gameState.playerDestroyed && !this.effects.gameOverAnimation) {
      // Decrement lives (only once)
      if (!this.livesDecremented) {
        this.lives--;
        this.livesDecremented = true;
        this.overlay.updateLives(this.lives);
      }
      
      if (this.lives <= 0) {
        // No lives left - game over
        if (DEBUG) console.log('No lives left! Starting Game Over animation immediately...');
        this.audio.playGameOver();
        this.audio.createRobotSpeech("GAME OVER");
        this.effects.startGameOverAnimation();
        // Hide chain display on game over
        this.overlay.hideChainOnGameOver();
      } else {
        // Still have lives - start enemy pause and respawn delays
        if (DEBUG) console.log(`Player destroyed! Lives remaining: ${this.lives}. Starting 3-second enemy pause, then 2-second respawn delay...`);
        this.enemyPauseDelay = 3.0; // 3 seconds of enemy pause
        this.respawnDelay = 5.0; // 5 seconds total (3 + 2) before respawn
      }
      this.engine.setGameState({ explosionComplete: true });
      return;
    }
    
    // Handle restart when game over and SPACE is pressed
    if (this.effects.isWaitingForRestart() && this.input.isShootPressed()) {
      if (DEBUG) console.log('Restarting game...');
      this.restartGame();
      return;
    }

    // Level complete condition (only if game is still playing)
    if (this.enemies && this.enemies.enemies.length === 0 && gameState.isPlaying && !this.effects.levelCompleteAnimation) {
      if (DEBUG) console.log('All enemies destroyed! Starting level complete animation...');
      this.effects.startLevelCompleteAnimation();
      this.overlay.showLevelComplete();
    return;
  }

    // Handle level complete animation finished
    if (levelCompleteFinished) {
      if (DEBUG) console.log('Level complete animation finished! Starting next level...');
      this.overlay.hideLevelComplete();
      this.startNextLevel();
      return;
    }
  }

  startNextLevel() {
    this.currentLevel++;
    if (DEBUG) console.log(`Starting level ${this.currentLevel}...`);
    
    // Check if this is a plasma storm level (every 10 levels)
    if (this.currentLevel % 10 === 0) {
      this.startPlasmaStorm();
      return; // Don't proceed with normal level start yet
    }
    
    // Normal level progression
    this.proceedToNextLevel();
  }

  proceedToNextLevel() {
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
    if (DEBUG) console.log(`Creating enemies for level ${this.currentLevel}...`);
    this.enemies.createEnemies(this.currentLevel, this.engine);
    
    // Update soundtrack for new level
    this.audio.updateSoundtrack(this.currentLevel);
    
    if (DEBUG) console.log(`Level ${this.currentLevel} started!`);
  }

  startPlasmaStorm() {
    if (DEBUG) console.log(`Plasma Storm event triggered for level ${this.currentLevel}!`);
    
    // Update level display immediately for plasma storm level
    this.overlay.updateLevel(this.currentLevel);
    
    // Delay 0.5 seconds, then play voice announcement
    setTimeout(() => {
      this.audio.createRobotSpeech("Incoming Plasma Storm");
      
      // Wait another 1.5 seconds, then start power-up flood
      setTimeout(() => {
        this.floodPowerUps();
      }, 1500);
    }, 500);
  }

  floodPowerUps() {
    if (DEBUG) console.log("Starting power-up flood!");
    
    // Spawn power-ups 30 times per second for 5 seconds (150 total spawns)
    const spawnInterval = 1000 / 30; // ~33ms between spawns
    const totalSpawns = 100; // 3 per second * 5 seconds
    let spawnCount = 0;
    
    const spawnPowerUp = () => {
      if (spawnCount < totalSpawns) {
        // Create blue power-up at random position above the screen
        const bounds = this.engine.getVisibleBounds();
        const randomX = bounds.left + Math.random() * bounds.width;
        const randomY = bounds.top + 1; // Above the top of the screen
        
        this.powerUps.createPowerUp('blue', { x: randomX, y: randomY, z: 0 });
        spawnCount++;
        
        // Schedule next spawn
        setTimeout(spawnPowerUp, spawnInterval);
      } else {
        // All power-ups spawned, proceed to next level after a short delay
        setTimeout(() => {
          this.proceedToNextLevel();
        }, 5000);
      }
    };
    
    // Start the flood
    spawnPowerUp();
  }

  restartGame() {
    if (DEBUG) console.log('Restarting game...');
    
    // Reset level to URL parameter level (or 1 if no parameter)
    this.currentLevel = this.getLevelFromURL();
    if (DEBUG) console.log(`Restarting at level ${this.currentLevel} (from URL parameter)`);
    
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
    
    // Reset score and lives
    this.score = 0;
    this.lives = 3; // Reset to 3 lives (2 extra)
    this.livesDecremented = false; // Reset lives decremented flag
    this.respawnDelay = 0; // Reset respawn delay
    this.enemyPauseDelay = 0; // Reset enemy pause delay
    this.enemyDiveDelay = 0; // Reset enemy dive delay
    this.overlay.resetScore();
    this.overlay.showScore(); // Show score for restart
    this.overlay.showLives(); // Show lives display for restart
    this.overlay.updateLives(this.lives); // Update lives display
    
    // Spawn new enemies for the restart level
    this.enemies.createEnemies(this.currentLevel, this.engine);
    
    // Start soundtrack for the restart level
    this.audio.updateSoundtrack(this.currentLevel);
    
    if (DEBUG) console.log(`Game restarted at level ${this.currentLevel}!`);
  }

  respawnPlayer() {
    if (DEBUG) console.log('Respawning player...');
    
    // Reset game state
    this.engine.resetGameState();
    
    // Reset lives decremented flag and delays
    this.livesDecremented = false;
    this.respawnDelay = 0;
    this.enemyPauseDelay = 0;
    this.enemyDiveDelay = 0;
    
    // Clear all effects
    this.effects.clearAll();
    
    // Reset player position and state (remove wings on respawn)
    this.player.reset(true);
    
    // Show player ship
    this.player.show();
    
    // Clear all score popups
    this.overlay.clearAllScorePopups();
    
    // Silently hide chain display for respawn (no "CHAIN BROKEN" text)
    this.overlay.silentHideChain();
    
    // Reset game over state
    this.overlay.resetGameOverState();
    
    if (DEBUG) console.log(`Player respawned! Lives remaining: ${this.lives}`);
  }
}

// Initialize game
const game = new Game();
game.init();
