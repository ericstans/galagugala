export class OverlayManager {
  constructor() {
    this.overlay = this.createOverlay();
    this.chainDisplay = this.createChainDisplay();
    this.startOverlay = this.createStartOverlay();
    this.scoreDisplay = this.createScoreDisplay();
    this.chainFadeTimeout = null; // Track fade-out timeout
    this.lastChainCount = 0; // Track previous chain count to detect breaks
    this.setupEventListeners();
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
      startOverlay.style.background = 'rgba(0,0,0,0.9)';
      startOverlay.style.zIndex = '2000';
      startOverlay.style.flexDirection = 'column';
      startOverlay.style.color = '#00fffc';
      startOverlay.style.fontSize = '3rem';
      startOverlay.style.fontFamily = 'Arial, sans-serif';
      startOverlay.style.textAlign = 'center';
      startOverlay.style.cursor = 'pointer';
      startOverlay.style.userSelect = 'none';
      startOverlay.innerHTML = `
        <div style="font-size:4rem;font-weight:bold;margin-bottom:2rem;text-shadow:0 0 60px #00fffc;">GALAGUGALA</div>
        <div style="font-size:4rem;opacity:0.8;">WASD / arrows to move</div>
        <div style="font-size:4rem;opacity:0.8;">Z / SPACE to shoot</div>
        <div style="font-size:4rem;margin-bottom:1rem;">Enter to Start</div>
      `;
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
      
      this.chainDisplay.textContent = chainCount;
      this.chainDisplay.style.display = 'block';
      this.chainDisplay.style.opacity = '1'; // Ensure it's fully visible
    }
  }

  hideChain() {
    // Cancel any existing fade-out timeout
    if (this.chainFadeTimeout) {
      clearTimeout(this.chainFadeTimeout);
    }
    
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
      }, 500); // Match the transition duration
    }, 200); // Brief pause to show the text
  }

  updateChain(chainCount) {
    if (chainCount > 2) {
      this.showChain(chainCount);
    } else {
      // Only show "CHAIN BROKEN" if we had a chain before (not at game start)
      if (this.lastChainCount > 2) {
        this.hideChain();
      } else {
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

  // Silently hide chain display without showing "CHAIN BROKEN" text
  silentHideChain() {
    // Cancel any existing fade-out timeout
    if (this.chainFadeTimeout) {
      clearTimeout(this.chainFadeTimeout);
      this.chainFadeTimeout = null;
    }
    
    // Just hide the display immediately
    this.chainDisplay.style.display = 'none';
    
    // Reset the last chain count to prevent false "CHAIN BROKEN" messages
    this.lastChainCount = 0;
  }

  // Score display methods
  showScore() {
    this.scoreDisplay.style.display = 'block';
  }

  hideScore() {
    this.scoreDisplay.style.display = 'none';
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

  // Start overlay methods
  showStartOverlay() {
    this.startOverlay.style.display = 'flex';
  }

  hideStartOverlay() {
    this.startOverlay.style.display = 'none';
  }
}
