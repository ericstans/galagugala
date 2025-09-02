export class OverlayManager {
  constructor() {
    this.overlay = this.createOverlay();
    this.chainDisplay = this.createChainDisplay();
    this.startOverlay = this.createStartOverlay();
    this.scoreDisplay = this.createScoreDisplay();
    this.levelDisplay = this.createLevelDisplay();
    this.livesDisplay = this.createLivesDisplay();
    this.chainFadeTimeout = null; // Track fade-out timeout
    this.lastChainCount = 0; // Track previous chain count to detect breaks
    this.chainBrokenAnimating = false; // Track if "CHAIN BROKEN" is currently animating
    this.scorePopups = []; // Track active score popups
    this.gameOverActive = false; // Track if game over is active
    this.setupEventListeners();
  }

  isMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
           ('ontouchstart' in window) ||
           (navigator.maxTouchPoints > 0);
  }

  createOverlay() {
    let overlay = document.getElementById('game-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'game-overlay';
      overlay.style.position = 'fixed';
      overlay.style.top = '0';
      overlay.style.left = '0';
      overlay.style.width = '100vw';
      overlay.style.height = '100vh';
      overlay.style.display = 'none';
      overlay.style.justifyContent = 'center';
      overlay.style.alignItems = 'center';
      overlay.style.background = 'rgba(0,0,0,0.7)';
      overlay.style.zIndex = '1000';
      overlay.style.flexDirection = 'column';
      overlay.style.color = '#fff';
      overlay.style.fontSize = '3rem';
      overlay.style.fontFamily = 'Arial, sans-serif';
      overlay.style.textAlign = 'center';
      overlay.style.transition = 'opacity 0.3s';
      overlay.innerHTML = `
        <div id="overlay-message"></div>
        <div style="font-size:1rem;margin-top:1rem;opacity:0.8;">Press ENTER or click to restart</div>
        <button id="overlay-dismiss" style="margin-top:1rem;font-size:1.5rem;padding:0.5em 1.5em;cursor:pointer;">Dismiss</button>
      `;
      document.body.appendChild(overlay);
    }
    return overlay;
  }

  createChainDisplay() {
    let chainDisplay = document.getElementById('chain-display');
    if (!chainDisplay) {
      chainDisplay = document.createElement('div');
      chainDisplay.id = 'chain-display';
      chainDisplay.style.position = 'fixed';
      chainDisplay.style.top = '50%';
      chainDisplay.style.left = '50%';
      chainDisplay.style.transform = 'translate(-50%, -50%)';
      chainDisplay.style.fontSize = '8rem';
      chainDisplay.style.fontWeight = 'bold';
      chainDisplay.style.color = '#00fffc';
      chainDisplay.style.fontFamily = 'Arial, sans-serif';
      chainDisplay.style.textAlign = 'center';
      chainDisplay.style.textShadow = '0 0 20px #00fffc, 0 0 40px #00fffc';
      chainDisplay.style.whiteSpace = 'pre-line'; // Support line breaks
      chainDisplay.style.lineHeight = '0.8'; // Tighter line spacing for multi-line text
      chainDisplay.style.zIndex = '500'; // Behind other elements but above game
      chainDisplay.style.display = 'none';
      chainDisplay.style.pointerEvents = 'none'; // Don't interfere with game interaction
      chainDisplay.style.userSelect = 'none';
      chainDisplay.style.transition = 'opacity 0.5s ease-out'; // Fade-out animation
      chainDisplay.style.opacity = '1'; // Start fully visible
      document.body.appendChild(chainDisplay);
    }
    return chainDisplay;
  }

  createScoreDisplay() {
    let scoreDisplay = document.getElementById('score-display');
    if (!scoreDisplay) {
      scoreDisplay = document.createElement('div');
      scoreDisplay.id = 'score-display';
      scoreDisplay.style.position = 'fixed';
      scoreDisplay.style.top = '20px';
      scoreDisplay.style.right = '20px';
      scoreDisplay.style.fontSize = '2rem';
      scoreDisplay.style.fontWeight = 'bold';
      scoreDisplay.style.color = '#00fffc';
      scoreDisplay.style.fontFamily = 'Courier New, monospace';
      scoreDisplay.style.textAlign = 'right';
      scoreDisplay.style.textShadow = '0 0 10px #00fffc, 0 0 20px #00fffc';
      scoreDisplay.style.zIndex = '400'; // Above game but below other UI elements
      scoreDisplay.style.pointerEvents = 'none'; // Don't interfere with game interaction
      scoreDisplay.style.userSelect = 'none';
      scoreDisplay.style.display = 'none'; // Initially hidden
      // Initialize with dimmed zeros
      let html = '';
      for (let i = 0; i < 10; i++) {
        html += '<span style="color: #004444; text-shadow: 0 0 5px #004444;">0</span>';
      }
      scoreDisplay.innerHTML = html;
      document.body.appendChild(scoreDisplay);
    }
    return scoreDisplay;
  }

  createLevelDisplay() {
    let levelDisplay = document.getElementById('level-display');
    if (!levelDisplay) {
      levelDisplay = document.createElement('div');
      levelDisplay.id = 'level-display';
      levelDisplay.style.position = 'fixed';
      levelDisplay.style.top = '60px'; // Below the score display
      levelDisplay.style.right = '20px';
      levelDisplay.style.fontSize = '1.5rem';
      levelDisplay.style.fontWeight = 'bold';
      levelDisplay.style.color = '#00fffc';
      levelDisplay.style.fontFamily = 'Courier New, monospace';
      levelDisplay.style.textAlign = 'right';
      levelDisplay.style.textShadow = '0 0 10px #00fffc, 0 0 20px #00fffc';
      levelDisplay.style.zIndex = '400'; // Same as score display
      levelDisplay.style.pointerEvents = 'none'; // Don't interfere with game interaction
      levelDisplay.style.userSelect = 'none';
      levelDisplay.style.display = 'none'; // Initially hidden
      levelDisplay.textContent = 'LEVEL 1';
      document.body.appendChild(levelDisplay);
    }
    return levelDisplay;
  }

  createLivesDisplay() {
    let livesDisplay = document.getElementById('lives-display');
    if (!livesDisplay) {
      livesDisplay = document.createElement('div');
      livesDisplay.id = 'lives-display';
      livesDisplay.style.position = 'fixed';
      livesDisplay.style.top = '100px'; // Below the level display
      livesDisplay.style.right = '20px';
      livesDisplay.style.fontSize = '1.2rem';
      livesDisplay.style.fontWeight = 'bold';
      livesDisplay.style.color = '#ff4444';
      livesDisplay.style.fontFamily = 'Courier New, monospace';
      livesDisplay.style.textAlign = 'right';
      livesDisplay.style.textShadow = '0 0 10px #ff4444, 0 0 20px #ff4444';
      livesDisplay.style.zIndex = '400'; // Same as other displays
      livesDisplay.style.pointerEvents = 'none'; // Don't interfere with game interaction
      livesDisplay.style.userSelect = 'none';
      livesDisplay.style.display = 'none'; // Initially hidden
      livesDisplay.innerHTML = '❤️ ❤️ ❤️'; // 3 heart icons
      document.body.appendChild(livesDisplay);
    }
    return livesDisplay;
  }

  createStartOverlay() {
    let startOverlay = document.getElementById('start-overlay');
    if (!startOverlay) {
      startOverlay = document.createElement('div');
      startOverlay.id = 'start-overlay';
      startOverlay.style.position = 'fixed';
      startOverlay.style.top = '0';
      startOverlay.style.left = '0';
      startOverlay.style.width = '100vw';
      startOverlay.style.height = '100vh';
      startOverlay.style.display = 'flex';
      startOverlay.style.justifyContent = 'center';
      startOverlay.style.alignItems = 'center';
      startOverlay.style.background = 'transparent';
      startOverlay.style.zIndex = '2000';
      startOverlay.style.flexDirection = 'column';
      startOverlay.style.color = '#00fffc';
      startOverlay.style.fontSize = '3rem';
      startOverlay.style.fontFamily = 'Arial, sans-serif';
      startOverlay.style.textAlign = 'center';
      startOverlay.style.cursor = 'pointer';
      startOverlay.style.userSelect = 'none';
      // Show mobile or desktop instructions
      if (this.isMobile()) {
        startOverlay.innerHTML = `
          <div style="font-size:2rem;opacity:0.8;margin-top:16rem;">Tap left and right to move</div>
          <div style="font-size:2rem;margin-bottom:1rem;">Tap to start</div>
        `;
      } else {
        startOverlay.innerHTML = `
          <div style="font-size:2rem;opacity:0.8;margin-top:16rem;">WASD / arrows to move</div>
          <div style="font-size:2rem;opacity:0.8;">Z / SPACE to shoot</div>
          <div style="font-size:2rem;margin-bottom:1rem;">Enter to Start</div>
        `;
      }
      document.body.appendChild(startOverlay);
    }
    return startOverlay;
  }

  setupEventListeners() {
    // Click to dismiss
    document.getElementById('overlay-dismiss').onclick = () => {
      this.hideOverlay();
      window.location.reload();
    };
    
    // ENTER key to dismiss
    const handleOverlayKeydown = (e) => {
      if (e.code === 'Enter' && this.overlay.style.display === 'flex') {
        this.hideOverlay();
        window.location.reload();
      }
    };
    document.addEventListener('keydown', handleOverlayKeydown);
  }

  showOverlay(message) {
    document.getElementById('overlay-message').textContent = message;
    this.overlay.style.display = 'flex';
    this.overlay.style.opacity = '1';
  }

  updateInvulnerabilityStatus(isInvulnerable) {
    let statusElement = document.getElementById('invulnerability-status');
    if (!statusElement) {
      statusElement = document.createElement('div');
      statusElement.id = 'invulnerability-status';
      statusElement.style.position = 'fixed';
      statusElement.style.top = '10px';
      statusElement.style.right = '10px';
      statusElement.style.color = '#fff';
      statusElement.style.fontSize = '1.2rem';
      statusElement.style.fontFamily = 'Arial, sans-serif';
      statusElement.style.background = 'rgba(0,0,0,0.7)';
      statusElement.style.padding = '10px';
      statusElement.style.borderRadius = '5px';
      statusElement.style.zIndex = '999';
      document.body.appendChild(statusElement);
    }
    
    if (isInvulnerable) {
      statusElement.textContent = 'INVULNERABLE';
      statusElement.style.color = '#ffaa00';
      statusElement.style.background = 'rgba(255,170,0,0.3)';
    } else {
      statusElement.textContent = '';
      statusElement.style.background = 'transparent';
    }
  }

  showLevelComplete() {
    let levelCompleteOverlay = document.getElementById('level-complete-overlay');
    if (!levelCompleteOverlay) {
      levelCompleteOverlay = document.createElement('div');
      levelCompleteOverlay.id = 'level-complete-overlay';
      levelCompleteOverlay.style.position = 'fixed';
      levelCompleteOverlay.style.top = '50%';
      levelCompleteOverlay.style.left = '50%';
      levelCompleteOverlay.style.transform = 'translate(-50%, -50%)';
      levelCompleteOverlay.style.fontSize = '4rem';
      levelCompleteOverlay.style.fontFamily = 'Arial, sans-serif';
      levelCompleteOverlay.style.fontWeight = 'bold';
      levelCompleteOverlay.style.textAlign = 'center';
      levelCompleteOverlay.style.zIndex = '1001';
      levelCompleteOverlay.style.textShadow = '2px 2px 4px rgba(0,0,0,0.8)';
      levelCompleteOverlay.style.display = 'none';
      document.body.appendChild(levelCompleteOverlay);
    }
    
    levelCompleteOverlay.textContent = 'LEVEL COMPLETE';
    levelCompleteOverlay.style.display = 'block';
    return levelCompleteOverlay;
  }

  hideLevelComplete() {
    const levelCompleteOverlay = document.getElementById('level-complete-overlay');
    if (levelCompleteOverlay) {
      levelCompleteOverlay.style.display = 'none';
    }
  }

  updateLevelCompleteColors(color) {
    const levelCompleteOverlay = document.getElementById('level-complete-overlay');
    if (levelCompleteOverlay) {
      levelCompleteOverlay.style.color = `#${color.getHexString()}`;
    }
  }

  hideOverlay() {
    this.overlay.style.display = 'none';
  }

  // Chain display methods
  showChain(chainCount) {
    if (chainCount > 2) {
      // Cancel any ongoing fade-out
      if (this.chainFadeTimeout) {
        clearTimeout(this.chainFadeTimeout);
        this.chainFadeTimeout = null;
      }
      
      // Show "MAX" instead of 10
      this.chainDisplay.textContent = chainCount === 10 ? 'MAX' : chainCount;
      this.chainDisplay.style.display = 'block';
      // Don't set opacity explicitly - let CSS handle it
      
      // Start fade-out after 3 seconds
      console.log(`Setting fade-out timer for chain ${chainCount}`);
      this.chainFadeTimeout = setTimeout(() => {
        console.log(`Fade-out timer triggered for chain ${chainCount}`);
        this.chainDisplay.style.opacity = '0';
        
        // Hide the element after the fade animation completes
        setTimeout(() => {
          console.log(`Hiding chain display for chain ${chainCount}`);
          this.chainDisplay.style.display = 'none';
          this.chainFadeTimeout = null;
        }, 500); // Match the transition duration
      }, 3000); // Fade out after 3 seconds
    }
  }

  hideChain() {
    // Cancel any existing fade-out timeout
    if (this.chainFadeTimeout) {
      clearTimeout(this.chainFadeTimeout);
    }
    
    // Set flag to indicate "CHAIN BROKEN" animation is starting
    this.chainBrokenAnimating = true;
    
    // Show "CHAIN BROKEN" text instead of fading out the number
    this.chainDisplay.textContent = 'CHAIN\nBROKEN';
    this.chainDisplay.style.display = 'block';
    this.chainDisplay.style.opacity = '1'; // Start fully visible
    
    // Start fade-out animation after a brief moment, then hide completely
    this.chainFadeTimeout = setTimeout(() => {
      this.chainDisplay.style.opacity = '0';
      
      // Hide the element after the fade animation completes
      this.chainFadeTimeout = setTimeout(() => {
        this.chainDisplay.style.display = 'none';
        this.chainFadeTimeout = null;
        this.chainBrokenAnimating = false; // Animation complete
      }, 500); // Match the transition duration
    }, 200); // Brief pause to show the text
  }

  updateChain(chainCount) {
    // Don't update chain display if game over is active
    if (this.gameOverActive) {
      return;
    }
    
    // Only update if chain count has changed
    if (chainCount !== this.lastChainCount) {
      console.log(`Chain count changed from ${this.lastChainCount} to ${chainCount}`);
      if (chainCount > 2) {
        // Only show new chain if "CHAIN BROKEN" animation is not in progress
        if (!this.chainBrokenAnimating) {
          console.log(`Showing chain ${chainCount}`);
          this.showChain(chainCount);
        }
      } else {
        // Only show "CHAIN BROKEN" if we had a chain before (not at game start)
        if (this.lastChainCount > 2 && !this.chainBrokenAnimating) {
          this.hideChain();
        } else if (!this.chainBrokenAnimating) {
          // Just hide the display without showing "CHAIN BROKEN" text
          this.chainDisplay.style.display = 'none';
          // Cancel any pending fade-out timeouts
          if (this.chainFadeTimeout) {
            clearTimeout(this.chainFadeTimeout);
            this.chainFadeTimeout = null;
          }
        }
      }
      
      // Update the last chain count for next comparison
      this.lastChainCount = chainCount;
    }
  }

  // Silently hide chain display without showing "CHAIN BROKEN" text
  silentHideChain() {
    // Cancel any existing fade-out timeout
    if (this.chainFadeTimeout) {
      clearTimeout(this.chainFadeTimeout);
      this.chainFadeTimeout = null;
    }
    
    // Just hide the display immediately
    this.chainDisplay.style.display = 'none';
    
    // Reset animation flag and last chain count
    this.chainBrokenAnimating = false;
    this.lastChainCount = 0;
  }

  // Hide chain display on game over (immediate hide without animation)
  hideChainOnGameOver() {
    // Set game over flag to prevent chain updates
    this.gameOverActive = true;
    
    // Cancel any existing fade-out timeout
    if (this.chainFadeTimeout) {
      clearTimeout(this.chainFadeTimeout);
      this.chainFadeTimeout = null;
    }
    
    // Hide the display immediately
    this.chainDisplay.style.display = 'none';
    this.chainDisplay.style.opacity = '0';
    
    // Reset the animation flag
    this.chainBrokenAnimating = false;
  }

  // Reset game over state (called on game restart)
  resetGameOverState() {
    this.gameOverActive = false;
  }

  // Score display methods
  showScore() {
    this.scoreDisplay.style.display = 'block';
  }

  hideScore() {
    this.scoreDisplay.style.display = 'none';
  }

  // Level display methods
  showLevel() {
    this.levelDisplay.style.display = 'block';
  }

  hideLevel() {
    this.levelDisplay.style.display = 'none';
  }

  updateLevel(level) {
    this.levelDisplay.textContent = `LEVEL ${level}`;
  }

  // Lives display methods
  showLives() {
    this.livesDisplay.style.display = 'block';
  }

  hideLives() {
    this.livesDisplay.style.display = 'none';
  }

  updateLives(lives) {
    // Create heart icons based on remaining lives (show one fewer than actual)
    const displayLives = Math.max(0, lives - 1);
    const hearts = '❤️'.repeat(displayLives);
    this.livesDisplay.innerHTML = hearts;
  }

  updateScore(score) {
    const scoreStr = score.toString();
    const paddedScore = scoreStr.padStart(10, '0');
    
    // Create HTML with dimmed leading zeros and bright score digits
    let html = '';
    const leadingZeros = paddedScore.length - scoreStr.length;
    
    // Add dimmed leading zeros
    for (let i = 0; i < leadingZeros; i++) {
      html += '<span style="color: #004444; text-shadow: 0 0 5px #004444;">0</span>';
    }
    
    // Add bright score digits
    for (let i = 0; i < scoreStr.length; i++) {
      html += '<span style="color: #00fffc; text-shadow: 0 0 10px #00fffc, 0 0 20px #00fffc;">' + scoreStr[i] + '</span>';
    }
    
    this.scoreDisplay.innerHTML = html;
  }

  resetScore() {
    // Show all zeros in dimmed color
    let html = '';
    for (let i = 0; i < 10; i++) {
      html += '<span style="color: #004444; text-shadow: 0 0 5px #004444;">0</span>';
    }
    this.scoreDisplay.innerHTML = html;
  }

  // Score popup methods
  createScorePopup(score, worldPosition, camera, renderer) {
    // Convert 3D world position to 2D screen coordinates
    const vector = worldPosition.clone();
    vector.project(camera);
    
    // Get canvas position and size
    const canvas = renderer.domElement;
    const canvasRect = canvas.getBoundingClientRect();
    
    // Calculate position relative to canvas, then add canvas offset
    const x = (vector.x * 0.5 + 0.5) * canvas.clientWidth + canvasRect.left;
    const y = (vector.y * -0.5 + 0.5) * canvas.clientHeight + canvasRect.top;
    
    // Calculate dynamic font size based on score value
    const baseFontSize = 1.5; // Base font size in rem
    const maxFontSize = 4.0;  // Maximum font size in rem
    const minFontSize = 1.0;  // Minimum font size in rem
    
    // Scale font size based on score (logarithmic scaling for better visual progression)
    let fontSize = baseFontSize;
    if (score > 10) {
      // Use logarithmic scaling: fontSize = baseFontSize + log(score/10) * scaleFactor
      const scaleFactor = 0.8;
      fontSize = baseFontSize + Math.log(score / 10) * scaleFactor;
      fontSize = Math.min(fontSize, maxFontSize); // Cap at maximum
      fontSize = Math.max(fontSize, minFontSize); // Floor at minimum
    }
    
    // Create popup element
    const popup = document.createElement('div');
    popup.style.position = 'fixed';
    popup.style.left = x + 'px';
    popup.style.top = y + 'px';
    popup.style.transform = 'translate(-50%, -50%)';
    popup.style.fontSize = fontSize + 'rem';
    popup.style.fontWeight = 'bold';
    popup.style.color = '#00fffc';
    popup.style.fontFamily = 'Courier New, monospace';
    popup.style.textAlign = 'center';
    popup.style.textShadow = '0 0 10px #00fffc, 0 0 20px #00fffc';
    popup.style.zIndex = '600'; // Above other UI elements
    popup.style.pointerEvents = 'none';
    popup.style.userSelect = 'none';
    popup.style.opacity = '1';
    popup.style.transition = 'opacity 0.5s ease-out, transform 0.5s ease-out';
    popup.textContent = '+' + score.toString();
    
    document.body.appendChild(popup);
    
    // Store popup data
    const popupData = {
      element: popup,
      startTime: Date.now(),
      startY: y,
      score: score
    };
    
    this.scorePopups.push(popupData);
    
    // Start animation
    setTimeout(() => {
      popup.style.transform = 'translate(-50%, -50%) translateY(-30px)';
      popup.style.opacity = '0';
    }, 50);
    
    // Remove after animation
    setTimeout(() => {
      if (popup.parentNode) {
        popup.parentNode.removeChild(popup);
      }
      const index = this.scorePopups.indexOf(popupData);
      if (index > -1) {
        this.scorePopups.splice(index, 1);
      }
    }, 1000);
  }

  updateScorePopups() {
    // Update existing popups (for any additional animations)
    this.scorePopups.forEach(popupData => {
      const elapsed = Date.now() - popupData.startTime;
      // Could add additional effects here if needed
    });
  }

  clearAllScorePopups() {
    this.scorePopups.forEach(popupData => {
      if (popupData.element.parentNode) {
        popupData.element.parentNode.removeChild(popupData.element);
      }
    });
    this.scorePopups = [];
  }

  // Start overlay methods
  showStartOverlay() {
    this.startOverlay.style.display = 'flex';
  }

  hideStartOverlay() {
    this.startOverlay.style.display = 'none';
  }
}
