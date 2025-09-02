export class InputManager {
  constructor() {
    this.keys = {};
    this.previousKeys = {}; // Track previous frame's key states
    this.isMobile = this.detectMobile();
    this.touchState = {
      left: false,
      right: false
    };
    this.autoShoot = this.isMobile; // Auto-shoot on mobile
    this.setupEventListeners();
  }

  detectMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
           ('ontouchstart' in window) ||
           (navigator.maxTouchPoints > 0);
  }

  setupEventListeners() {
    window.addEventListener('keydown', (e) => { 
      this.keys[e.code] = true; 
    });
    window.addEventListener('keyup', (e) => { 
      this.keys[e.code] = false; 
    });

    // Mobile touch controls
    if (this.isMobile) {
      this.setupTouchControls();
    }
  }

  setupTouchControls() {
    // Wait for canvas to be available
    setTimeout(() => {
      const canvas = document.querySelector('canvas');
      if (!canvas) {
        console.warn('Canvas not found for mobile controls');
        return;
      }
      this.attachTouchEvents(canvas);
    }, 100);
  }

  attachTouchEvents(canvas) {
    // Attach touch events to document so they work across the entire screen
    // This allows touch controls to work in pillarboxing areas too

    // Touch start
    document.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      const x = touch.clientX;
      const halfWidth = window.innerWidth / 2;
      
      if (x < halfWidth) {
        this.touchState.left = true;
      } else {
        this.touchState.right = true;
      }
    });

    // Touch end
    document.addEventListener('touchend', (e) => {
      e.preventDefault();
      this.touchState.left = false;
      this.touchState.right = false;
    });

    // Touch cancel (when touch is interrupted)
    document.addEventListener('touchcancel', (e) => {
      e.preventDefault();
      this.touchState.left = false;
      this.touchState.right = false;
    });

    // Mouse events for testing on desktop (still use canvas for mouse)
    canvas.addEventListener('mousedown', (e) => {
      if (this.isMobile) {
        e.preventDefault();
        const x = e.clientX;
        const halfWidth = window.innerWidth / 2;
        
        if (x < halfWidth) {
          this.touchState.left = true;
        } else {
          this.touchState.right = true;
        }
      }
    });

    canvas.addEventListener('mouseup', (e) => {
      if (this.isMobile) {
        e.preventDefault();
        this.touchState.left = false;
        this.touchState.right = false;
      }
    });
  }

  isPressed(key) {
    return !!this.keys[key];
  }

  isKeyPressed(key) {
    // Returns true only on the frame when key transitions from not pressed to pressed
    return !!this.keys[key] && !this.previousKeys[key];
  }

  update() {
    // Update previous keys state for next frame
    this.previousKeys = { ...this.keys };
  }

  isLeftPressed() {
    if (this.isMobile) {
      return this.touchState.left;
    }
    return this.isPressed('ArrowLeft') || this.isPressed('KeyA');
  }

  isRightPressed() {
    if (this.isMobile) {
      return this.touchState.right;
    }
    return this.isPressed('ArrowRight') || this.isPressed('KeyD');
  }

  isShootPressed() {
    if (this.isMobile) {
      return this.autoShoot; // Always true on mobile for auto-shoot
    }
    return this.isPressed('Space') || this.isPressed('KeyZ');
  }

  isManualPowerUpPressed() {
    return this.isPressed('KeyP');
  }

  isManualRedPowerUpPressed() {
    return this.isPressed('KeyR');
  }

  isInvulnerabilityTogglePressed() {
    return this.isKeyPressed('KeyI');
  }

  isEnterPressed() {
    return this.isPressed('Enter');
  }

  // Get mobile status
  getIsMobile() {
    return this.isMobile;
  }

  // Get auto-shoot status
  getAutoShoot() {
    return this.autoShoot;
  }
}
