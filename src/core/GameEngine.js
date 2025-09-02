import * as THREE from 'three';

export class GameEngine {
  constructor() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100);
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.gameState = {
      isPlaying: true,
      playerDestroyed: false,
      explosionComplete: false
    };
    this.animationId = null;
  }

  init() {
    // Camera setup - ensure camera is properly aligned
    this.camera.position.set(0, 0, 10);
    this.camera.lookAt(0, 0, 0); // Explicitly look at origin
    
    // Add coordinate axes helper
    const axesHelper = new THREE.AxesHelper(2);
    axesHelper.position.set(-8, 6, 0); // Position in top-left corner
    this.scene.add(axesHelper);
    
    // Renderer setup
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(this.renderer.domElement);
    
    // Handle window resize
    window.addEventListener('resize', () => this.handleResize());
  }

  handleResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
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
}
