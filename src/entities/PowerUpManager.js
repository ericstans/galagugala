import * as THREE from 'three';
import { GAME_CONFIG } from '../config/GameConstants.js';

export class PowerUpManager {
  constructor(scene) {
    this.scene = scene;
    this.powerUps = [];
    this.spawnTimer = 0;
    this.powerUpGeometry = new THREE.SphereGeometry(0.15, 16, 12);
  }

  createPowerUp(type = 'blue') {
    // Define colors based on type
    let mainColor, emissiveColor, ringColor, ringEmissive;
    
    if (type === 'red') {
      mainColor = 0xff4444;
      emissiveColor = 0xaa2222;
      ringColor = 0xff6666;
      ringEmissive = 0xff3333;
    } else { // blue (default)
      mainColor = 0x00ddff;
      emissiveColor = 0x0066aa;
      ringColor = 0x00ffff;
      ringEmissive = 0x0088ff;
    }
    
    // Create main power-up sphere with type-specific colors
    const mainMaterial = new THREE.MeshStandardMaterial({ 
      color: mainColor,
      transparent: true,
      opacity: 1.0,
      emissive: emissiveColor,
      emissiveIntensity: 0.5
    });
    
    const powerUp = new THREE.Mesh(this.powerUpGeometry, mainMaterial);
    
    // Create energy ring around the main sphere
    const ringGeometry = new THREE.RingGeometry(0.2, 0.3, 16);
    const ringMaterial = new THREE.MeshStandardMaterial({
      color: ringColor,
      transparent: true,
      opacity: 0.7,
      emissive: ringEmissive,
      emissiveIntensity: 0.4,
      side: THREE.DoubleSide
    });
    
    const energyRing = new THREE.Mesh(ringGeometry, ringMaterial);
    energyRing.rotation.x = Math.PI / 2; // Make it horizontal
    powerUp.add(energyRing); // Add ring as child of main sphere
    
    // Random X position at top of screen
    powerUp.position.x = (Math.random() - 0.5) * 10; // -5 to 5
    powerUp.position.y = 8; // Start at top
    powerUp.position.z = 0;
    
    // Make it bigger
    powerUp.scale.setScalar(1.5);
    
    // Add pulsing animation data
    powerUp.userData = {
      pulseTime: Math.random() * Math.PI * 2,
      pulseSpeed: 0.1,
      fallSpeed: 0.05,
      energyRing: energyRing, // Store reference to ring for animation
      type: type // Store power-up type
    };
    
    console.log(`${type} power-up created at position:`, powerUp.position);
    this.scene.add(powerUp);
    this.powerUps.push(powerUp);
    console.log('Total power-ups:', this.powerUps.length);
    return powerUp;
  }

  update(gameState, player) {
    // Power-up spawning
    if (gameState.isPlaying) {
      this.spawnTimer++;
      if (this.spawnTimer >= GAME_CONFIG.POWERUP_SPAWN_INTERVAL) {
        console.log('Spawning power-up!');
        
        // Determine power-up type based on player's wing status
        let powerUpType;
        const hasBoth = player.hasBothWings();
        const hasAny = player.hasAnyWing();
        const missingWing = player.getMissingWing();
        
        console.log('Wing status:', { hasBoth, hasAny, missingWing, leftWing: !!player.leftWing, rightWing: !!player.rightWing });
        
        if (hasBoth) {
          // Player has both wings, only spawn blue power-ups
          powerUpType = 'blue';
          console.log('Player has both wings, spawning blue power-up');
        } else {
          // Player missing wings, can spawn red power-ups
          const shouldSpawnRed = Math.random() < GAME_CONFIG.POWERUP_RED_CHANCE;
          powerUpType = shouldSpawnRed ? 'red' : 'blue';
          console.log(`Player missing wings, spawning ${powerUpType} power-up (red chance: ${GAME_CONFIG.POWERUP_RED_CHANCE})`);
        }
        
        this.createPowerUp(powerUpType);
        this.spawnTimer = 0;
      }
    }

    // Power-up movement and animation
    for (let i = this.powerUps.length - 1; i >= 0; i--) {
      const powerUp = this.powerUps[i];
      
      // Fall down
      powerUp.position.y -= powerUp.userData.fallSpeed;
      
      // Pulsing animation
      powerUp.userData.pulseTime += powerUp.userData.pulseSpeed;
      const pulseScale = 1.5 + Math.sin(powerUp.userData.pulseTime) * 0.3; // Adjusted for new base scale
      powerUp.scale.setScalar(pulseScale);
      
      // Dynamic glow effect for main sphere
      const glowIntensity = 0.5 + Math.sin(powerUp.userData.pulseTime * 1.5) * 0.3;
      powerUp.material.emissiveIntensity = glowIntensity;
      
      // Energy ring animation
      const ring = powerUp.userData.energyRing;
      if (ring) {
        // Ring pulsing scale
        const ringScale = 1.0 + Math.sin(powerUp.userData.pulseTime * 2) * 0.4;
        ring.scale.setScalar(ringScale);
        
        // Ring rotation
        ring.rotation.z += 0.05;
        
        // Ring glow pulsing
        const ringGlow = 0.4 + Math.sin(powerUp.userData.pulseTime * 2.5) * 0.3;
        ring.material.emissiveIntensity = ringGlow;
        
        // Ring opacity pulsing
        const ringOpacity = 0.7 + Math.sin(powerUp.userData.pulseTime * 1.8) * 0.3;
        ring.material.opacity = Math.max(0.3, ringOpacity);
      }
      
      // Debug: log position occasionally
      if (Math.floor(powerUp.userData.pulseTime * 10) % 60 === 0) {
        console.log('Power-up at y:', powerUp.position.y);
      }
      
      // Remove if fallen off screen
      if (powerUp.position.y < -8) {
        console.log('Power-up removed (fell off screen)');
        this.scene.remove(powerUp);
        this.powerUps.splice(i, 1);
      }
    }
  }

  checkCollisions(player, audioManager) {
    const collision = this.findPlayerCollision(player);
    if (collision) {
      const { powerUpIndex, powerUp } = collision;
      
      // Remove power-up
      this.scene.remove(powerUp);
      this.powerUps.splice(powerUpIndex, 1);
      
      // Play power-up collection sound
      audioManager.playPowerUp();
      
      // Handle different power-up types
      const powerUpType = powerUp.userData.type;
      if (powerUpType === 'red') {
        console.log('Red power-up collected! (Both wings upgrade)');
        
        // Add both wings if missing
        let wingsAdded = [];
        if (!player.leftWing || player.leftWing.userData.isDestroyed) {
          player.addWing('left');
          wingsAdded.push('left');
        }
        if (!player.rightWing || player.rightWing.userData.isDestroyed) {
          player.addWing('right');
          wingsAdded.push('right');
        }
        
        if (wingsAdded.length > 0) {
          console.log(`Wings added: ${wingsAdded.join(', ')}`);
          return { type: 'red', wingsAdded: wingsAdded };
        } else {
          console.log('Player already has both wings!');
          return { type: 'red', wingsAdded: [] };
        }
      } else {
        console.log('Blue power-up collected! (Standard effect)');
        return { type: 'blue' };
      }
    }
    return null;
  }

  findPlayerCollision(player, threshold = GAME_CONFIG.POWERUP_COLLISION_THRESHOLD) {
    for (let i = this.powerUps.length - 1; i >= 0; i--) {
      const powerUp = this.powerUps[i];
      if (player.position.distanceTo(powerUp.position) < threshold) {
        return { powerUpIndex: i, powerUp };
      }
    }
    return null;
  }

  clearAll() {
    this.powerUps.forEach(powerUp => {
      this.scene.remove(powerUp);
    });
    this.powerUps = [];
  }
}
