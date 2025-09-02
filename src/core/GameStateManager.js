export class GameStateManager {
  constructor(gameEngine, effectsManager, overlayManager, audioManager) {
    this.engine = gameEngine;
    this.effects = effectsManager;
    this.overlay = overlayManager;
    this.audio = audioManager;
  }

  checkGameState(completedExplosion, levelCompleteFinished, gameOverFinished, player, enemies, input) {
    const gameState = this.engine.getGameState();
    
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
    if (this.effects.isWaitingForRestart() && input.isShootPressed()) {
      console.log('Restarting game...');
      return { action: 'restart' };
    }

    // Level complete condition (only if game is still playing)
    if (enemies.enemies.length === 0 && gameState.isPlaying && !this.effects.levelCompleteAnimation) {
      console.log('All enemies destroyed! Starting level complete animation...');
      this.effects.startLevelCompleteAnimation();
      this.overlay.showLevelComplete();
      return;
    }

    // Handle level complete animation finished
    if (levelCompleteFinished) {
      console.log('Level complete animation finished! Starting next level...');
      this.overlay.hideLevelComplete();
      return { action: 'nextLevel' };
    }

    return null;
  }
}
