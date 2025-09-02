import * as THREE from 'three';
import { GAME_CONFIG } from '../config/GameConstants.js';

const DEBUG = false;

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
    
    // Jet engines
    this.leftEngine = null;
    this.rightEngine = null;
    this.leftEngineParticles = null;
    this.rightEngineParticles = null;
    this.particleSystems = [];
    
    // Flame delay system
    this.leftEngineFlameDelay = 0;
    this.rightEngineFlameDelay = 0;
    this.flameDelayFrames = 10; // Continue flames for 10 frames after stopping
    
    // Create jet engines after particleSystems is initialized
    this.createJetEngines();
    
    // Invulnerability system
    this.isInvulnerable = false;
    this.invulnerabilityFlashTimer = 0;
    this.originalMaterials = new Map(); // Store original materials for restoration
    
    // Shield system
    this.hasShield = false;
    this.shieldBubble = null;
    
    if (DEBUG) console.log('Player created - no wings initially');
  }

  hide() {
    this.scene.remove(this.mesh);
  }

  show() {
    this.scene.add(this.mesh);
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
    
    // Add thicker outlines using multiple overlapping lines
    const edgeGeometry = new THREE.EdgesGeometry(geometry);
    const edgeMaterial = new THREE.LineBasicMaterial({ 
      color: 0x00ccff, // Slightly darker cyan for outlines
      linewidth: 1
    });
    
    // Create multiple line segments with slight offsets to simulate thickness
    const offsets = [
      { x: 0, y: 0, z: 0 },
      { x: 0.01, y: 0, z: 0 },
      { x: -0.01, y: 0, z: 0 },
      { x: 0, y: 0.01, z: 0 },
      { x: 0, y: -0.01, z: 0 },
      { x: 0, y: 0, z: 0.01 },
      { x: 0, y: 0, z: -0.01 }
    ];
    
    offsets.forEach(offset => {
      const edges = new THREE.LineSegments(edgeGeometry, edgeMaterial);
      edges.position.set(offset.x, offset.y, offset.z);
      spaceship.add(edges);
    });
    
    this.scene.add(spaceship);
    return spaceship;
  }

  createCockpit() {
    // Simple triangular cockpit as part of the ship body
    const cockpitGeometry = new THREE.ConeGeometry(0.15, 0.25, 3, 1, true);
    const cockpitMaterial = new THREE.MeshBasicMaterial({ 
      color: 0x0011ff,
      transparent: true,
      opacity: 0.6
    });
    const cockpit = new THREE.Mesh(cockpitGeometry, cockpitMaterial);
    cockpit.position.set(0, -0.2, 0.125); // Move toward the front of the ship (negative Y)
    cockpit.rotation.x = Math.PI; // Face upward
    
    // Add outlines to cockpit
    const cockpitEdgeGeometry = new THREE.EdgesGeometry(cockpitGeometry);
    const cockpitEdgeMaterial = new THREE.LineBasicMaterial({ 
      color: 0x0011cc, // Darker blue for cockpit outlines
      linewidth: 1
    });
    
    // Create multiple line segments with slight offsets to simulate thickness
    const cockpitOffsets = [
      { x: 0, y: 0, z: 0 },
      { x: 0.01, y: 0, z: 0 },
      { x: -0.01, y: 0, z: 0 },
      { x: 0, y: 0.01, z: 0 },
      { x: 0, y: -0.01, z: 0 },
      { x: 0, y: 0, z: 0.01 },
      { x: 0, y: 0, z: -0.01 }
    ];
    
    cockpitOffsets.forEach(offset => {
      const cockpitEdges = new THREE.LineSegments(cockpitEdgeGeometry, cockpitEdgeMaterial);
      cockpitEdges.position.set(offset.x, offset.y, offset.z);
      cockpit.add(cockpitEdges);
    });
    
    this.mesh.add(cockpit);
    return cockpit;
  }

  createJetEngines() {
    // Left engine
    const leftEngineGeometry = new THREE.CylinderGeometry(0.03, 0.05, 0.15, 8);
    const engineMaterial = new THREE.MeshBasicMaterial({ color: 0x333333 });
    this.leftEngine = new THREE.Mesh(leftEngineGeometry, engineMaterial);
    this.leftEngine.position.set(-0.15, 0.3, 0.05); // Back of ship, left side (positive Y is back since ship is rotated)
    this.leftEngine.rotation.x = Math.PI / 2; // Point backward along Y axis
    
    // Add outlines to left engine
    const leftEngineEdgeGeometry = new THREE.EdgesGeometry(leftEngineGeometry);
    const engineEdgeMaterial = new THREE.LineBasicMaterial({ 
      color: 0x111111, // Dark gray for engine outlines
      linewidth: 1
    });
    
    const engineOffsets = [
      { x: 0, y: 0, z: 0 },
      { x: 0.01, y: 0, z: 0 },
      { x: -0.01, y: 0, z: 0 },
      { x: 0, y: 0.01, z: 0 },
      { x: 0, y: -0.01, z: 0 },
      { x: 0, y: 0, z: 0.01 },
      { x: 0, y: 0, z: -0.01 }
    ];
    
    engineOffsets.forEach(offset => {
      const leftEngineEdges = new THREE.LineSegments(leftEngineEdgeGeometry, engineEdgeMaterial);
      leftEngineEdges.position.set(offset.x, offset.y, offset.z);
      this.leftEngine.add(leftEngineEdges);
    });
    
    this.mesh.add(this.leftEngine);

    // Right engine
    const rightEngineGeometry = new THREE.CylinderGeometry(0.03, 0.05, 0.15, 8);
    this.rightEngine = new THREE.Mesh(rightEngineGeometry, engineMaterial);
    this.rightEngine.position.set(0.15, 0.3, 0.05); // Back of ship, right side (positive Y is back since ship is rotated)
    this.rightEngine.rotation.x = Math.PI / 2; // Point backward along Y axis
    
    // Add outlines to right engine
    const rightEngineEdgeGeometry = new THREE.EdgesGeometry(rightEngineGeometry);
    
    engineOffsets.forEach(offset => {
      const rightEngineEdges = new THREE.LineSegments(rightEngineEdgeGeometry, engineEdgeMaterial);
      rightEngineEdges.position.set(offset.x, offset.y, offset.z);
      this.rightEngine.add(rightEngineEdges);
    });
    
    this.mesh.add(this.rightEngine);

    // Create particle systems for thrust
    this.createEngineParticles();
  }

  createEngineParticles() {
    // Left engine particles
    const leftParticleGeometry = new THREE.BufferGeometry();
    const leftParticleCount = 100;
    const leftPositions = new Float32Array(leftParticleCount * 3);
    const leftVelocities = new Float32Array(leftParticleCount * 3);
    const leftLifetimes = new Float32Array(leftParticleCount);
    
    for (let i = 0; i < leftParticleCount; i++) {
      leftPositions[i * 3] = 0; // x
      leftPositions[i * 3 + 1] = 0; // y
      leftPositions[i * 3 + 2] = 0; // z
      
      leftVelocities[i * 3] = 0; // x velocity
      leftVelocities[i * 3 + 1] = 0; // y velocity
      leftVelocities[i * 3 + 2] = 0; // z velocity
      
      leftLifetimes[i] = 0; // particle lifetime
    }
    
    leftParticleGeometry.setAttribute('position', new THREE.BufferAttribute(leftPositions, 3));
    leftParticleGeometry.setAttribute('velocity', new THREE.BufferAttribute(leftVelocities, 3));
    leftParticleGeometry.setAttribute('lifetime', new THREE.BufferAttribute(leftLifetimes, 1));
    
    const leftParticleMaterial = new THREE.PointsMaterial({
      color: 0xff4400,
      size: 0.03,
      transparent: true,
      opacity: 0.9
    });
    
    this.leftEngineParticles = new THREE.Points(leftParticleGeometry, leftParticleMaterial);
    this.leftEngineParticles.position.set(-0.15, 0.3, 0.05);
    this.scene.add(this.leftEngineParticles);

    // Right engine particles
    const rightParticleGeometry = new THREE.BufferGeometry();
    const rightParticleCount = 100;
    const rightPositions = new Float32Array(rightParticleCount * 3);
    const rightVelocities = new Float32Array(rightParticleCount * 3);
    const rightLifetimes = new Float32Array(rightParticleCount);
    
    for (let i = 0; i < rightParticleCount; i++) {
      rightPositions[i * 3] = 0; // x
      rightPositions[i * 3 + 1] = 0; // y
      rightPositions[i * 3 + 2] = 0; // z
      
      rightVelocities[i * 3] = 0; // x velocity
      rightVelocities[i * 3 + 1] = 0; // y velocity
      rightVelocities[i * 3 + 2] = 0; // z velocity
      
      rightLifetimes[i] = 0; // particle lifetime
    }
    
    rightParticleGeometry.setAttribute('position', new THREE.BufferAttribute(rightPositions, 3));
    rightParticleGeometry.setAttribute('velocity', new THREE.BufferAttribute(rightVelocities, 3));
    rightParticleGeometry.setAttribute('lifetime', new THREE.BufferAttribute(rightLifetimes, 1));
    
    const rightParticleMaterial = new THREE.PointsMaterial({
      color: 0xff4400,
      size: 0.03,
      transparent: true,
      opacity: 0.9
    });
    
    this.rightEngineParticles = new THREE.Points(rightParticleGeometry, rightParticleMaterial);
    this.rightEngineParticles.position.set(0.15, 0.3, 0.05);
    this.scene.add(this.rightEngineParticles);

    this.particleSystems.push(this.leftEngineParticles, this.rightEngineParticles);
  }

  updateEngineParticles(velocityX) {
    if (!this.leftEngineParticles || !this.rightEngineParticles) return;

    const leftPositions = this.leftEngineParticles.geometry.attributes.position.array;
    const rightPositions = this.rightEngineParticles.geometry.attributes.position.array;
    const leftVelocities = this.leftEngineParticles.geometry.attributes.velocity.array;
    const rightVelocities = this.rightEngineParticles.geometry.attributes.velocity.array;
    const leftLifetimes = this.leftEngineParticles.geometry.attributes.lifetime.array;
    const rightLifetimes = this.rightEngineParticles.geometry.attributes.lifetime.array;

    // Update particle system positions to follow the ship
    this.leftEngineParticles.position.copy(this.mesh.position);
    this.leftEngineParticles.position.x -= 0.15;
    this.leftEngineParticles.position.y -= 0.3; // Changed to negative Y (bottom of screen)
    this.leftEngineParticles.position.z += 0.05;

    this.rightEngineParticles.position.copy(this.mesh.position);
    this.rightEngineParticles.position.x += 0.15;
    this.rightEngineParticles.position.y -= 0.3; // Changed to negative Y (bottom of screen)
    this.rightEngineParticles.position.z += 0.05;

    // Update flame delay timers
    if (velocityX > 0) {
      this.leftEngineFlameDelay = this.flameDelayFrames; // Reset delay timer
    } else {
      this.leftEngineFlameDelay = Math.max(0, this.leftEngineFlameDelay - 1); // Decrease delay
    }

    if (velocityX < 0) {
      this.rightEngineFlameDelay = this.flameDelayFrames; // Reset delay timer
    } else {
      this.rightEngineFlameDelay = Math.max(0, this.rightEngineFlameDelay - 1); // Decrease delay
    }

    // Update left engine particles (thrust when moving right or during delay)
    if (velocityX > 0 || this.leftEngineFlameDelay > 0) {
      for (let i = 0; i < leftPositions.length; i += 3) {
        const particleIndex = i / 3;
        
        // If particle is dead or too far, respawn it
        if (leftLifetimes[particleIndex] <= 0 || leftPositions[i + 1] < -0.5) {
          // Spawn new particle at engine position
          leftPositions[i] = (Math.random() - 0.5) * 0.03; // Random X spread
          leftPositions[i + 1] = 0; // Start at engine
          leftPositions[i + 2] = (Math.random() - 0.5) * 0.03; // Random Z spread
          
          // Set initial velocity (shooting away from enemies)
          leftVelocities[i] = (Math.random() - 0.5) * 0.02; // Small X drift
          leftVelocities[i + 1] = -(0.15 + Math.random() * 0.08); // Strong thrust away from enemies (negative Y)
          leftVelocities[i + 2] = (Math.random() - 0.5) * 0.02; // Small Z drift
          
          leftLifetimes[particleIndex] = 1.0; // Full lifetime
        } else {
          // Update existing particle
          leftPositions[i] += leftVelocities[i];
          leftPositions[i + 1] += leftVelocities[i + 1];
          leftPositions[i + 2] += leftVelocities[i + 2];
          
          // Decay velocity (flame spreads out)
          leftVelocities[i] *= 0.99;
          leftVelocities[i + 1] *= 0.97;
          leftVelocities[i + 2] *= 0.99;
          
          // Decrease lifetime
          leftLifetimes[particleIndex] -= 0.02;
        }
      }
    } else {
      // No thrust - fade all particles
      for (let i = 0; i < leftPositions.length; i += 3) {
        const particleIndex = i / 3;
        if (leftLifetimes[particleIndex] > 0) {
          leftLifetimes[particleIndex] -= 0.05; // Faster fade when not thrusting
          // Move particles while fading
          leftPositions[i] += leftVelocities[i];
          leftPositions[i + 1] += leftVelocities[i + 1];
          leftPositions[i + 2] += leftVelocities[i + 2];
          // Decay velocity
          leftVelocities[i] *= 0.95;
          leftVelocities[i + 1] *= 0.95;
          leftVelocities[i + 2] *= 0.95;
        }
      }
    }

    // Update right engine particles (thrust when moving left or during delay)
    if (velocityX < 0 || this.rightEngineFlameDelay > 0) {
      for (let i = 0; i < rightPositions.length; i += 3) {
        const particleIndex = i / 3;
        
        // If particle is dead or too far, respawn it
        if (rightLifetimes[particleIndex] <= 0 || rightPositions[i + 1] < -0.5) {
          // Spawn new particle at engine position
          rightPositions[i] = (Math.random() - 0.5) * 0.03; // Random X spread
          rightPositions[i + 1] = 0; // Start at engine
          rightPositions[i + 2] = (Math.random() - 0.5) * 0.03; // Random Z spread
          
          // Set initial velocity (shooting away from enemies)
          rightVelocities[i] = (Math.random() - 0.5) * 0.02; // Small X drift
          rightVelocities[i + 1] = -(0.15 + Math.random() * 0.08); // Strong thrust away from enemies (negative Y)
          rightVelocities[i + 2] = (Math.random() - 0.5) * 0.02; // Small Z drift
          
          rightLifetimes[particleIndex] = 1.0; // Full lifetime
        } else {
          // Update existing particle
          rightPositions[i] += rightVelocities[i];
          rightPositions[i + 1] += rightVelocities[i + 1];
          rightPositions[i + 2] += rightVelocities[i + 2];
          
          // Decay velocity (flame spreads out)
          rightVelocities[i] *= 0.99;
          rightVelocities[i + 1] *= 0.97;
          rightVelocities[i + 2] *= 0.99;
          
          // Decrease lifetime
          rightLifetimes[particleIndex] -= 0.02;
        }
      }
    } else {
      // No thrust - fade all particles
      for (let i = 0; i < rightPositions.length; i += 3) {
        const particleIndex = i / 3;
        if (rightLifetimes[particleIndex] > 0) {
          rightLifetimes[particleIndex] -= 0.05; // Faster fade when not thrusting
          // Move particles while fading
          rightPositions[i] += rightVelocities[i];
          rightPositions[i + 1] += rightVelocities[i + 1];
          rightPositions[i + 2] += rightVelocities[i + 2];
          // Decay velocity
          rightVelocities[i] *= 0.95;
          rightVelocities[i + 1] *= 0.95;
          rightVelocities[i + 2] *= 0.95;
        }
      }
    }

    this.leftEngineParticles.geometry.attributes.position.needsUpdate = true;
    this.rightEngineParticles.geometry.attributes.position.needsUpdate = true;
  }

  createWing(side) {
    const wingGroup = new THREE.Group();
    
    // Wing body
    const wingGeometry = new THREE.BoxGeometry(0.4, 0.15, 0.08);
    const wingMaterial = new THREE.MeshBasicMaterial({ color: 0x00fffc });
    const wingBody = new THREE.Mesh(wingGeometry, wingMaterial);
    
    // Add outlines to wing body
    const wingEdgeGeometry = new THREE.EdgesGeometry(wingGeometry);
    const wingEdgeMaterial = new THREE.LineBasicMaterial({ 
      color: 0x00ccff, // Slightly darker cyan for wing outlines
      linewidth: 1
    });
    
    const wingOffsets = [
      { x: 0, y: 0, z: 0 },
      { x: 0.01, y: 0, z: 0 },
      { x: -0.01, y: 0, z: 0 },
      { x: 0, y: 0.01, z: 0 },
      { x: 0, y: -0.01, z: 0 },
      { x: 0, y: 0, z: 0.01 },
      { x: 0, y: 0, z: -0.01 }
    ];
    
    wingOffsets.forEach(offset => {
      const wingEdges = new THREE.LineSegments(wingEdgeGeometry, wingEdgeMaterial);
      wingEdges.position.set(offset.x, offset.y, offset.z);
      wingBody.add(wingEdges);
    });
    
    wingGroup.add(wingBody);
    
    // Gun launcher at tip
    const gunGeometry = new THREE.CylinderGeometry(0.03, 0.03, 0.2, 8);
    const gunMaterial = new THREE.MeshBasicMaterial({ color: 0x666666 });
    const gun = new THREE.Mesh(gunGeometry, gunMaterial);
    // No rotation needed - cylinder is already oriented correctly for upward pointing
    gun.position.set(side === 'left' ? -0.25 : 0.25, 0, 0);
    
    // Add outlines to gun
    const gunEdgeGeometry = new THREE.EdgesGeometry(gunGeometry);
    const gunEdgeMaterial = new THREE.LineBasicMaterial({ 
      color: 0x333333, // Dark gray for gun outlines
      linewidth: 1
    });
    
    const gunOffsets = [
      { x: 0, y: 0, z: 0 },
      { x: 0.01, y: 0, z: 0 },
      { x: -0.01, y: 0, z: 0 },
      { x: 0, y: 0.01, z: 0 },
      { x: 0, y: -0.01, z: 0 },
      { x: 0, y: 0, z: 0.01 },
      { x: 0, y: 0, z: -0.01 }
    ];
    
    gunOffsets.forEach(offset => {
      const gunEdges = new THREE.LineSegments(gunEdgeGeometry, gunEdgeMaterial);
      gunEdges.position.set(offset.x, offset.y, offset.z);
      gun.add(gunEdges);
    });
    
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

  update(inputManager, gameState, gameEngine) {
    let velocityX = 0;
    
    // Get dynamic bounds from game engine
    const bounds = gameEngine.getVisibleBounds();
    const playerMargin = 0.5; // Keep player slightly away from screen edges
    const leftBound = bounds.left + playerMargin;
    const rightBound = bounds.right - playerMargin;
    
    // Player movement (only if not destroyed)
    if (gameState.isPlaying && !gameState.playerDestroyed) {
      if (inputManager.isLeftPressed()) {
        this.mesh.position.x -= GAME_CONFIG.PLAYER_SPEED;
        velocityX = -GAME_CONFIG.PLAYER_SPEED;
        if (this.mesh.position.x < leftBound) this.mesh.position.x = leftBound;
      }
      if (inputManager.isRightPressed()) {
        this.mesh.position.x += GAME_CONFIG.PLAYER_SPEED;
        velocityX = GAME_CONFIG.PLAYER_SPEED;
        if (this.mesh.position.x > rightBound) this.mesh.position.x = rightBound;
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
    
    // Update engine particle effects
    this.updateEngineParticles(velocityX);
    
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
    
    // Remove flame particle systems
    this.particleSystems.forEach(particleSystem => {
      this.scene.remove(particleSystem);
    });
  }

  reset(removeWings = false) {
    console.log('Resetting player...');
    
    // Re-add ship to scene if it's not already there
    if (!this.scene.children.includes(this.mesh)) {
      this.scene.add(this.mesh);
      console.log('Re-added player ship to scene');
    }
    
    // Reset position
    this.mesh.position.set(0, -6.5, 0);
    
    // Reset shooting cooldowns
    this.canShoot = true;
    this.canShootWings = true;
    
    // Reset invulnerability
    this.isInvulnerable = false;
    this.invulnerabilityFlashTimer = 0;
    this.originalMaterials.clear();
    
    // Remove wings only if explicitly requested (game restart)
    if (removeWings) {
      if (this.leftWing) {
        this.mesh.remove(this.leftWing);
        this.leftWing = null;
        console.log('Left wing removed on reset');
      }
      
      if (this.rightWing) {
        this.mesh.remove(this.rightWing);
        this.rightWing = null;
        console.log('Right wing removed on reset');
      }
    } else {
      console.log('Wings preserved for level progression');
    }
    
    console.log('Player reset complete');
  }

  activateShield() {
    // Only activate shield if player doesn't already have one
    if (this.hasShield) {
      return;
    }

    this.hasShield = true;
    
    // Create shield bubble
    const shieldGeometry = new THREE.SphereGeometry(1.2, 16, 12);
    const shieldMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ffff, // Cyan color
      transparent: true,
      opacity: 0.3,
      side: THREE.BackSide // Render inside of sphere
    });
    
    this.shieldBubble = new THREE.Mesh(shieldGeometry, shieldMaterial);
    this.shieldBubble.position.set(0, 0, 0); // Position relative to ship (center)
    this.mesh.add(this.shieldBubble);
    
    console.log('Shield activated!');
  }

  deactivateShield() {
    if (!this.hasShield || !this.shieldBubble) {
      return;
    }

    this.hasShield = false;
    
    // Remove shield bubble from scene
    this.mesh.remove(this.shieldBubble);
    this.shieldBubble = null;
    
    console.log('Shield deactivated!');
  }

  hasActiveShield() {
    return this.hasShield;
  }
}
