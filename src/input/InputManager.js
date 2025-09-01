export class InputManager {
  constructor() {
    this.keys = {};
    this.setupEventListeners();
  }

  setupEventListeners() {
    window.addEventListener('keydown', (e) => { 
      this.keys[e.code] = true; 
    });
    window.addEventListener('keyup', (e) => { 
      this.keys[e.code] = false; 
    });
  }

  isPressed(key) {
    return !!this.keys[key];
  }

  isLeftPressed() {
    return this.isPressed('ArrowLeft') || this.isPressed('KeyA');
  }

  isRightPressed() {
    return this.isPressed('ArrowRight') || this.isPressed('KeyD');
  }

  isShootPressed() {
    return this.isPressed('Space');
  }

  isManualPowerUpPressed() {
    return this.isPressed('KeyP');
  }

  isEnterPressed() {
    return this.isPressed('Enter');
  }
}
