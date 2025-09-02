export class OverlayManager {
  constructor() {
    this.overlay = this.createOverlay();
    this.chainDisplay = this.createChainDisplay();
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
      chainDisplay.style.zIndex = '500'; // Behind other elements but above game
      chainDisplay.style.display = 'none';
      chainDisplay.style.pointerEvents = 'none'; // Don't interfere with game interaction
      chainDisplay.style.userSelect = 'none';
      document.body.appendChild(chainDisplay);
    }
    return chainDisplay;
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
      this.chainDisplay.textContent = chainCount;
      this.chainDisplay.style.display = 'block';
    }
  }

  hideChain() {
    this.chainDisplay.style.display = 'none';
  }

  updateChain(chainCount) {
    if (chainCount > 2) {
      this.showChain(chainCount);
    } else {
      this.hideChain();
    }
  }
}
