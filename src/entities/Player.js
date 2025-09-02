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
    
    // Gun rotation system
    this.gunRotationSpeed = 0.1;
    this.targetGunRotation = 0;
    this.currentGunRotation = 0;
    
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
    
    // Wing body - positioned to extend from the ship
    const wingGeometry = new THREE.BoxGeometry(0.3, 0.12, 0.06);
    const wingMaterial = new THREE.MeshBasicMaterial({ color: 0x00fffc });
    const wingBody = new THREE.Mesh(wingGeometry, wingMaterial);
    wingGroup.add(wingBody);
    
    // Gun launcher at tip - facing upward
    const gunGeometry = new THREE.CylinderGeometry(0.03, 0.03, 0.2, 8);
    const gunMaterial = new THREE.MeshBasicMaterial({ color: 0x666666 });
    const gun = new THREE.Mesh(gunGeometry, gunMaterial);
    // Rotate gun to point upward (cylinder default is along Y axis, we want it along Z axis)
    gun.rotation.x = -Math.PI / 2;
    gun.position.set(side === 'left' ? -0.2 : 0.2, 0, -0.1); // Above the wing (negative Z)
    wingGroup.add(gun);
    
    // Position wing relative to ship - lower on the ship (about half ship height down)
    wingGroup.position.set(side === 'left' ? -0.4 : 0.4, -0.4, 0);
    wingGroup.userData = {
      side: side,
      isDestroyed: false,
      gunPosition: gun.position.clone(),
      gun: gun // Store reference to gun for rotation
    };
    
    this.mesh.add(wingGroup);
    return wingGroup;
  }

  addWing(side) {
    if (side === 'left' && !this.leftWing) {
      this.leftWing = this.createWing('left');
      console.log('Left wing added! Position:', this.leftWing.position);
    } else if (side === 'right' && !this.rightWing) {
      this.rightWing = this.createWing('right');
      console.log('Right wing added! Position:', this.rightWing.position);
    } else {
      console.log(`Cannot add ${side} wing - already exists or invalid side`);
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
      
      // Move bullet in the direction it was fired
      if (bullet.userData && bullet.userData.direction) {
        const direction = bullet.userData.direction;
        bullet.position.x += direction.x * GAME_CONFIG.BULLET_SPEED;
        bullet.position.y += direction.y * GAME_CONFIG.BULLET_SPEED;
        bullet.position.z += direction.z * GAME_CONFIG.BULLET_SPEED;
      } else {
        // Fallback to straight up movement
        bullet.position.y += GAME_CONFIG.BULLET_SPEED;
      }
      
      if (bullet.position.y > 8) {
        this.scene.remove(bullet);
        this.wingBullets.splice(i, 1);
      }
    }

    // Update invulnerability flash effect
    this.updateInvulnerabilityFlash();

    // Update gun rotation based on movement
    this.updateGunRotation(inputManager);

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
    
    // Shoot from left wing
    if (this.leftWing && !this.leftWing.userData.isDestroyed && this.leftWing.userData.gun) {
      const leftBullet = new THREE.Mesh(bulletGeometry, bulletMaterial.clone());
      const leftWingWorldPos = new THREE.Vector3();
      this.leftWing.getWorldPosition(leftWingWorldPos);
      leftBullet.position.copy(leftWingWorldPos);
      
      // Calculate bullet direction based on actual gun orientation
      const gun = this.leftWing.userData.gun;
      const bulletDirection = new THREE.Vector3(0, 0, 1); // Default direction toward camera
      bulletDirection.applyQuaternion(gun.quaternion); // Apply gun's actual rotation
      
      // Remove Y component to keep bullets flat in 3D space
      bulletDirection.y = 0;
      
      // Ensure bullets always move toward camera (positive Z)
      if (bulletDirection.z < 0) {
        bulletDirection.z = -bulletDirection.z;
      }
      
      bulletDirection.normalize(); // Re-normalize after adjustments
      
      // Store direction in bullet for movement
      leftBullet.userData = { direction: bulletDirection };
      
      this.scene.add(leftBullet);
      this.wingBullets.push(leftBullet);
    }
    
    // Shoot from right wing
    if (this.rightWing && !this.rightWing.userData.isDestroyed && this.rightWing.userData.gun) {
      const rightBullet = new THREE.Mesh(bulletGeometry, bulletMaterial.clone());
      const rightWingWorldPos = new THREE.Vector3();
      this.rightWing.getWorldPosition(rightWingWorldPos);
      rightBullet.position.copy(rightWingWorldPos);
      
      // Calculate bullet direction based on actual gun orientation
      const gun = this.rightWing.userData.gun;
      const bulletDirection = new THREE.Vector3(0, 0, 1); // Default direction toward camera
      bulletDirection.applyQuaternion(gun.quaternion); // Apply gun's actual rotation
      
      // Remove Y component to keep bullets flat in 3D space
      bulletDirection.y = 0;
      
      // Ensure bullets always move toward camera (positive Z)
      if (bulletDirection.z < 0) {
        bulletDirection.z = -bulletDirection.z;
      }
      
      bulletDirection.normalize(); // Re-normalize after adjustments
      
      // Store direction in bullet for movement
      rightBullet.userData = { direction: bulletDirection };
      
      this.scene.add(rightBullet);
      this.wingBullets.push(rightBullet);
    }
    
    this.canShootWings = false;
    setTimeout(() => { this.canShootWings = true; }, 200); // slightly faster fire rate for wings
  }

  destroyWing(wing) {
    if (wing) {
      wing.userData.isDestroyed = true;
      
      // Remove the grey gun
      if (wing.userData.gun) {
        wing.remove(wing.userData.gun);
        wing.userData.gun = null;
      }
      
      // Replace the wing body with a "broken" version
      const wingBody = wing.children[0]; // The wing body is the first child
      if (wingBody) {
        // Change the material to look broken (darker, more damaged)
        wingBody.material.color.setHex(0x004444); // Darker blue-green
        wingBody.material.emissive.setHex(0x001111); // Dim glow
        
        // Scale down to look damaged
        wingBody.scale.set(0.7, 0.7, 0.7);
        
        // Add some rotation to look broken
        wingBody.rotation.z = (Math.random() - 0.5) * 0.5; // Slight random rotation
      }
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

  updateGunRotation(inputManager) {
    // Determine target rotation based on input (guns aim in same direction as movement)
    if (inputManager.isRightPressed()) {
      this.targetGunRotation = Math.PI / 4; // 45 degrees right (guns aim right when moving right)
    } else if (inputManager.isLeftPressed()) {
      this.targetGunRotation = -Math.PI / 4; // 45 degrees left (guns aim left when moving left)
    } else {
      this.targetGunRotation = 0; // Center position
    }

    // Smoothly interpolate to target rotation
    this.currentGunRotation += (this.targetGunRotation - this.currentGunRotation) * this.gunRotationSpeed;



    // Apply rotation to wing guns (use Y-axis rotation for left/right aiming)
    if (this.leftWing && !this.leftWing.userData.isDestroyed && this.leftWing.userData.gun) {
      this.leftWing.userData.gun.rotation.y = this.currentGunRotation;
    }
    if (this.rightWing && !this.rightWing.userData.isDestroyed && this.rightWing.userData.gun) {
      this.rightWing.userData.gun.rotation.y = this.currentGunRotation;
    }
  }

  destroy() {
    this.scene.remove(this.mesh);
    // Cockpit and wings are automatically removed as they're children
  }
}
