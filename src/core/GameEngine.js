import * as THREE from 'three';

export class GameEngine {
  constructor() {
    this.scene = new THREE.Scene();
    
    // Set up responsive dimensions
    this.setupDimensions();
    
    this.camera = new THREE.PerspectiveCamera(75, this.aspectRatio, 0.1, 100);
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.gameState = {
      isPlaying: true,
      playerDestroyed: false,
      explosionComplete: false
    };
    this.animationId = null;
  }

  setupDimensions() {
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    
    // Detect if we're on mobile
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
                     ('ontouchstart' in window) ||
                     (navigator.maxTouchPoints > 0);
    
    if (isMobile) {
      // On mobile, use full screen height and calculate width from aspect ratio
      this.height = windowHeight;
      this.width = this.height * (3 / 4); // 3:4 aspect ratio
      
      // Ensure minimum width
      const minWidth = 240;
      if (this.width < minWidth) {
        this.width = minWidth;
        this.height = this.width / (3 / 4);
      }
      
      this.aspectRatio = this.width / this.height;
      
      // Center horizontally on mobile
      this.offsetX = (windowWidth - this.width) / 2;
      this.offsetY = 0; // Use full height
    } else {
      // Desktop behavior - maintain aspect ratio with constraints
      const minWidth = 240;
      const minHeight = 320;
      const maxWidth = 600;
      const maxHeight = windowHeight;
      
      const targetAspectRatio = 3 / 4;
      const actualAspectRatio = windowWidth / windowHeight;
      
      if (actualAspectRatio > targetAspectRatio) {
        // Window is wider than target ratio - constrain by height
        this.height = Math.max(minHeight, Math.min(maxHeight, windowHeight));
        this.width = this.height * targetAspectRatio;
      } else {
        // Window is taller than target ratio - constrain by width
        this.width = Math.max(minWidth, Math.min(maxWidth, windowWidth));
        this.height = this.width / targetAspectRatio;
      }
      
      this.aspectRatio = this.width / this.height;
      
      // Center the canvas
      this.offsetX = (windowWidth - this.width) / 2;
      this.offsetY = (windowHeight - this.height) / 2;
    }
  }

  init() {
    // Camera setup
    this.camera.position.z = 10;
    
    // Renderer setup with calculated dimensions
    this.renderer.setSize(this.width, this.height);
    
    // Make canvas focusable for keyboard input
    this.renderer.domElement.setAttribute('tabindex', '0');
    this.renderer.domElement.style.outline = 'none';
    
    // Apply responsive styling
    this.renderer.domElement.style.position = 'absolute';
    this.renderer.domElement.style.left = `${this.offsetX}px`;
    this.renderer.domElement.style.top = `${this.offsetY}px`;
    this.renderer.domElement.style.display = 'block';
    
    document.body.appendChild(this.renderer.domElement);
    
    // Handle window resize
    window.addEventListener('resize', () => this.handleResize());
  }

  handleResize() {
    // Recalculate dimensions for new window size
    this.setupDimensions();
    
    // Update camera aspect ratio
    this.camera.aspect = this.aspectRatio;
    this.camera.updateProjectionMatrix();
    
    // Update renderer size
    this.renderer.setSize(this.width, this.height);
    
    // Update canvas positioning
    this.renderer.domElement.style.left = `${this.offsetX}px`;
    this.renderer.domElement.style.top = `${this.offsetY}px`;
  }

  animate(updateCallback) {
    const animate = () => {
      this.animationId = requestAnimationFrame(animate);
      updateCallback();
      this.render();
    };
    animate();
  }

  update() {
    // Game state updates can be added here
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }

  destroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    if (this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
  }

  setGameState(newState) {
    this.gameState = { ...this.gameState, ...newState };
  }

  getGameState() {
    return this.gameState;
  }

  resetGameState() {
    this.gameState = {
      isPlaying: true,
      playerDestroyed: false,
      explosionComplete: false
    };
  }

  // Calculate visible world bounds based on camera and aspect ratio
  getVisibleBounds() {
    const distance = Math.abs(this.camera.position.z);
    const vFov = THREE.MathUtils.degToRad(this.camera.fov);
    const height = 2 * Math.tan(vFov / 2) * distance;
    const width = height * this.aspectRatio;
    
    return {
      left: -width / 2,
      right: width / 2,
      top: height / 2,
      bottom: -height / 2,
      width: width,
      height: height
    };
  }
}
