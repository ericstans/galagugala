export class OverlayManager {
  constructor() {
    this.overlay = this.createOverlay();
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

  hideOverlay() {
    this.overlay.style.display = 'none';
  }
}
