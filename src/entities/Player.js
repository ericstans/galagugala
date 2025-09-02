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
    
    // Wing system
    this.leftWing = null;
    this.rightWing = null;
    this.wingBullets = [];
    this.canShootWings = true;
    
    // Invulnerability system
    this.isInvulnerable = false;
    this.invulnerabilityFlashTimer = 0;
    this.originalMaterials = new Map(); // Store original materials for restoration
    
    console.log('Player created - no wings initially');
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

  createWing(side) {
    const wingGroup = new THREE.Group();
    
    // Wing body
    const wingGeometry = new THREE.BoxGeometry(0.4, 0.15, 0.08);
    const wingMaterial = new THREE.MeshBasicMaterial({ color: 0x00fffc });
    const wingBody = new THREE.Mesh(wingGeometry, wingMaterial);
    wingGroup.add(wingBody);
    
    // Gun launcher at tip
    const gunGeometry = new THREE.CylinderGeometry(0.03, 0.03, 0.2, 8);
    const gunMaterial = new THREE.MeshBasicMaterial({ color: 0x666666 });
    const gun = new THREE.Mesh(gunGeometry, gunMaterial);
    // No rotation needed - cylinder is already oriented correctly for upward pointing
    gun.position.set(side === 'left' ? -0.25 : 0.25, 0, 0);
    wingGroup.add(gun);
    
    // Position wing relative to ship (moved 10px lower on Y axis - positive Y since ship is rotated)
    wingGroup.position.set(side === 'left' ? -0.6 : 0.6, 0.2, 0);
    wingGroup.userData = {
      side: side,
      isDestroyed: false,
      gunPosition: gun.position.clone()
    };
    
    this.mesh.add(wingGroup);
    return wingGroup;
  }

  addWing(side) {
    if (side === 'left') {
      if (!this.leftWing) {
        // Create new left wing
        this.leftWing = this.createWing('left');
        console.log('Left wing added!');
      } else if (this.leftWing.userData.isDestroyed) {
        // Repair destroyed left wing
        this.repairWing(this.leftWing);
        console.log('Left wing repaired!');
      }
    } else if (side === 'right') {
      if (!this.rightWing) {
        // Create new right wing
        this.rightWing = this.createWing('right');
        console.log('Right wing added!');
      } else if (this.rightWing.userData.isDestroyed) {
        // Repair destroyed right wing
        this.repairWing(this.rightWing);
        console.log('Right wing repaired!');
      }
    } else {
      console.log(`Cannot add ${side} wing - already exists and not destroyed`);
    }
  }

  repairWing(wing) {
    if (wing && wing.userData.isDestroyed) {
      wing.userData.isDestroyed = false;
      
      // Restore original wing appearance
      wing.traverse((child) => {
        if (child.material) {
          // Restore original cyan color
          child.material.color.setHex(0x00fffc);
          child.material.transparent = false;
          child.material.opacity = 1.0;
        }
      });
      
      console.log(`${wing.userData.side} wing repaired - restored original appearance`);
    }
  }

  hasBothWings() {
    return this.leftWing && this.rightWing && 
           !this.leftWing.userData.isDestroyed && 
           !this.rightWing.userData.isDestroyed;
  }

  hasAnyWing() {
    return (this.leftWing && !this.leftWing.userData.isDestroyed) || 
           (this.rightWing && !this.rightWing.userData.isDestroyed);
  }

  getMissingWing() {
    if (!this.leftWing || this.leftWing.userData.isDestroyed) return 'left';
    if (!this.rightWing || this.rightWing.userData.isDestroyed) return 'right';
    return null;
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
        this.shootWings();
      }
      if (inputManager.isManualPowerUpPressed()) {
        // This will be handled by the game loop
        return { manualPowerUp: true };
      }
      if (inputManager.isManualRedPowerUpPressed()) {
        // This will be handled by the game loop
        return { manualRedPowerUp: true };
      }
      if (inputManager.isInvulnerabilityTogglePressed()) {
        this.toggleInvulnerability();
      }
    }

    // Main bullets movement
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const bullet = this.bullets[i];
      bullet.position.y += GAME_CONFIG.BULLET_SPEED;
      if (bullet.position.y > 8) {
        this.scene.remove(bullet);
        this.bullets.splice(i, 1);
      }
    }

    // Wing bullets movement
    for (let i = this.wingBullets.length - 1; i >= 0; i--) {
      const bullet = this.wingBullets[i];
      bullet.position.y += GAME_CONFIG.BULLET_SPEED;
      if (bullet.position.y > 8) {
        this.scene.remove(bullet);
        this.wingBullets.splice(i, 1);
      }
    }

    // Update invulnerability flash effect
    this.updateInvulnerabilityFlash();

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

  shootWings() {
    if (!this.canShootWings) return;
    
    const bulletGeometry = new THREE.CylinderGeometry(0.06, 0.06, 0.4, 8);
    const bulletMaterial = new THREE.MeshBasicMaterial({ color: 0xff8800 });
    
    // Shoot from left wing gun
    if (this.leftWing && !this.leftWing.userData.isDestroyed) {
      const leftBullet = new THREE.Mesh(bulletGeometry, bulletMaterial.clone());
      
      // Find the gun mesh within the left wing
      let leftGun = null;
      this.leftWing.traverse((child) => {
        if (child.geometry && child.geometry.type === 'CylinderGeometry') {
          leftGun = child;
        }
      });
      
      if (leftGun) {
        const leftGunWorldPos = new THREE.Vector3();
        leftGun.getWorldPosition(leftGunWorldPos);
        leftBullet.position.copy(leftGunWorldPos);
        leftBullet.position.y += 0.3; // Small offset to start from gun tip
        this.scene.add(leftBullet);
        this.wingBullets.push(leftBullet);
      }
    }
    
    // Shoot from right wing gun
    if (this.rightWing && !this.rightWing.userData.isDestroyed) {
      const rightBullet = new THREE.Mesh(bulletGeometry, bulletMaterial.clone());
      
      // Find the gun mesh within the right wing
      let rightGun = null;
      this.rightWing.traverse((child) => {
        if (child.geometry && child.geometry.type === 'CylinderGeometry') {
          rightGun = child;
        }
      });
      
      if (rightGun) {
        const rightGunWorldPos = new THREE.Vector3();
        rightGun.getWorldPosition(rightGunWorldPos);
        rightBullet.position.copy(rightGunWorldPos);
        rightBullet.position.y += 0.3; // Small offset to start from gun tip
        this.scene.add(rightBullet);
        this.wingBullets.push(rightBullet);
      }
    }
    
    this.canShootWings = false;
    setTimeout(() => { this.canShootWings = true; }, 200); // slightly faster fire rate for wings
  }

  destroyWing(wing) {
    if (wing) {
      wing.userData.isDestroyed = true;
      
      // Change wing appearance to show it's destroyed
      wing.traverse((child) => {
        if (child.material) {
          // Make the wing appear damaged/destroyed
          child.material.color.setHex(0x333333); // Dark gray
          child.material.transparent = true;
          child.material.opacity = 0.3; // Make it semi-transparent
        }
      });
      
      // Don't remove from scene - keep it visible but damaged
      console.log(`${wing.userData.side} wing destroyed - showing damaged appearance`);
    }
  }

  toggleInvulnerability() {
    this.isInvulnerable = !this.isInvulnerable;
    console.log(`Invulnerability ${this.isInvulnerable ? 'ON' : 'OFF'}`);
    
    if (this.isInvulnerable) {
      this.startInvulnerabilityFlash();
    } else {
      this.stopInvulnerabilityFlash();
    }
  }

  startInvulnerabilityFlash() {
    // Store original materials
    this.storeOriginalMaterials(this.mesh);
    if (this.cockpit) this.storeOriginalMaterials(this.cockpit);
    if (this.leftWing) this.storeOriginalMaterials(this.leftWing);
    if (this.rightWing) this.storeOriginalMaterials(this.rightWing);
  }

  stopInvulnerabilityFlash() {
    // Restore original materials
    this.restoreOriginalMaterials(this.mesh);
    if (this.cockpit) this.restoreOriginalMaterials(this.cockpit);
    if (this.leftWing) this.restoreOriginalMaterials(this.leftWing);
    if (this.rightWing) this.restoreOriginalMaterials(this.rightWing);
    this.invulnerabilityFlashTimer = 0;
  }

  storeOriginalMaterials(object) {
    if (object.material) {
      this.originalMaterials.set(object, object.material.clone());
    }
    // Store materials for children (like wing components)
    object.traverse((child) => {
      if (child.material) {
        this.originalMaterials.set(child, child.material.clone());
      }
    });
  }

  restoreOriginalMaterials(object) {
    if (this.originalMaterials.has(object)) {
      object.material = this.originalMaterials.get(object);
    }
    // Restore materials for children
    object.traverse((child) => {
      if (this.originalMaterials.has(child)) {
        child.material = this.originalMaterials.get(child);
      }
    });
  }

  updateInvulnerabilityFlash() {
    if (this.isInvulnerable) {
      this.invulnerabilityFlashTimer++;
      const flashSpeed = 0.2;
      const opacity = 0.3 + 0.7 * Math.abs(Math.sin(this.invulnerabilityFlashTimer * flashSpeed));
      
      // Apply flashing effect to all materials
      this.applyFlashEffect(this.mesh, opacity);
      if (this.cockpit) this.applyFlashEffect(this.cockpit, opacity);
      if (this.leftWing) this.applyFlashEffect(this.leftWing, opacity);
      if (this.rightWing) this.applyFlashEffect(this.rightWing, opacity);
    }
  }

  applyFlashEffect(object, opacity) {
    if (object.material) {
      object.material.transparent = true;
      object.material.opacity = opacity;
    }
    // Apply to children
    object.traverse((child) => {
      if (child.material) {
        child.material.transparent = true;
        child.material.opacity = opacity;
      }
    });
  }

  destroy() {
    this.scene.remove(this.mesh);
    // Cockpit and wings are automatically removed as they're children
  }

  reset() {
    console.log('Resetting player...');
    
    // Re-add ship to scene if it's not already there
    if (!this.scene.children.includes(this.mesh)) {
      this.scene.add(this.mesh);
      console.log('Re-added player ship to scene');
    }
    
    // Reset position
    this.mesh.position.set(0, -6.5, 0);
    
    // Clear all bullets
    this.bullets.forEach(bullet => {
      this.scene.remove(bullet);
    });
    this.bullets = [];
    
    // Clear wing bullets
    this.wingBullets.forEach(bullet => {
      this.scene.remove(bullet);
    });
    this.wingBullets = [];
    
    // Reset shooting cooldowns
    this.canShoot = true;
    this.canShootWings = true;
    
    // Reset invulnerability
    this.isInvulnerable = false;
    this.invulnerabilityFlashTimer = 0;
    this.originalMaterials.clear();
    
    // Keep existing wings (don't remove ship enhancements)
    // Wings will remain attached to the player ship
    
    console.log('Player reset complete');
  }
}
