import * as THREE from 'three';
import { GAME_CONFIG } from '../config/GameConstants.js';

export class Player {
  constructor(scene) {
    this.scene = scene;
    this.mesh = this.createSpaceship();
    this.cockpit = this.createCockpit();
    this.bullets = [];
    this.canShoot = true;
    this.position = this.mesh.position;
  }

  createSpaceship() {
    const shape = new THREE.Shape();
    
    // Create spaceship shape (viewed from top down)
    // Main body
    shape.moveTo(-0.3, 0.4);
    shape.lineTo(-0.2, 0.6);
    shape.lineTo(0.2, 0.6);
    shape.lineTo(0.3, 0.4);
    
    // Nose
    shape.lineTo(0.4, 0.2);
    shape.lineTo(0.3, 0);
    shape.lineTo(0.2, -0.1);
    
    // Wings
    shape.lineTo(0.1, -0.3);
    shape.lineTo(-0.1, -0.3);
    shape.lineTo(-0.2, -0.1);
    shape.lineTo(-0.3, 0);
    shape.lineTo(-0.4, 0.2);
    
    // Close the shape
    shape.lineTo(-0.3, 0.4);
    
    // Add cockpit hole
    const cockpitHole = new THREE.Path();
    cockpitHole.ellipse(0, 0.1, 0.08, 0.06, 0, Math.PI * 2);
    shape.holes.push(cockpitHole);
    
    const extrudeSettings = {
      depth: 0.1,
      bevelEnabled: false
    };
    
    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    const material = new THREE.MeshBasicMaterial({ color: 0x00fffc });
    const spaceship = new THREE.Mesh(geometry, material);
    spaceship.rotation.z = Math.PI; // Rotate 180 degrees to point upward
    spaceship.position.y = -6.5; // Move further toward the bottom
    
    this.scene.add(spaceship);
    return spaceship;
  }

  createCockpit() {
    const cockpitGeometry = new THREE.CylinderGeometry(0.08, 0.08, 0.12, 16);
    const cockpitMaterial = new THREE.MeshBasicMaterial({ 
      color: 0x0011ff, 
      transparent: true, 
      opacity: 0.7 
    });
    const cockpit = new THREE.Mesh(cockpitGeometry, cockpitMaterial);
    cockpit.rotation.x = Math.PI / 2; // Rotate to be horizontal
    cockpit.position.set(0, 0, 0.06); // Position relative to ship center
    this.mesh.add(cockpit); // Add cockpit as child of player ship
    return cockpit;
  }

  update(inputManager, gameState) {
    // Player movement (only if not destroyed)
    if (gameState.isPlaying && !gameState.playerDestroyed) {
      if (inputManager.isLeftPressed()) {
        this.mesh.position.x -= GAME_CONFIG.PLAYER_SPEED;
        if (this.mesh.position.x < -6) this.mesh.position.x = -6;
      }
      if (inputManager.isRightPressed()) {
        this.mesh.position.x += GAME_CONFIG.PLAYER_SPEED;
        if (this.mesh.position.x > 6) this.mesh.position.x = 6;
      }
      if (inputManager.isShootPressed()) {
        this.shoot();
      }
      if (inputManager.isManualPowerUpPressed()) {
        // This will be handled by the game loop
        return { manualPowerUp: true };
      }
    }

    // Bullets movement
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const bullet = this.bullets[i];
      bullet.position.y += GAME_CONFIG.BULLET_SPEED;
      if (bullet.position.y > 8) {
        this.scene.remove(bullet);
        this.bullets.splice(i, 1);
      }
    }

    return null;
  }

  shoot() {
    if (!this.canShoot) return;
    
    const bulletGeometry = new THREE.CylinderGeometry(0.08, 0.08, 0.6, 8);
    const bulletMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00 });
    const bullet = new THREE.Mesh(bulletGeometry, bulletMaterial.clone());
    
    bullet.position.copy(this.mesh.position);
    bullet.position.y += 0.7;
    this.scene.add(bullet);
    this.bullets.push(bullet);
    
    this.canShoot = false;
    setTimeout(() => { this.canShoot = true; }, 250); // fire rate
  }

  destroy() {
    this.scene.remove(this.mesh);
    // Cockpit is automatically removed as it's a child
  }
}
