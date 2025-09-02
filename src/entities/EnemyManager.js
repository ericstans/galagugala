import * as THREE from 'three';
import { GAME_CONFIG } from '../config/GameConstants.js';

export class EnemyManager {
  constructor(scene) {
    this.scene = scene;
    this.enemies = [];
    this.diveCooldown = 0;
    this.gameStartTimer = 0;
    this.enemyGeometry = new THREE.BoxGeometry(0.7, 0.7, 0.3);
    this.enemyMaterial = new THREE.MeshBasicMaterial({ color: 0xff3333 });
    this.createEnemies();
  }

  createEnemies() {
    this.enemies = [];
    for (let row = 0; row < GAME_CONFIG.ENEMY_ROWS; row++) {
      for (let col = 0; col < GAME_CONFIG.ENEMY_COLS; col++) {
        const enemy = new THREE.Mesh(this.enemyGeometry, this.enemyMaterial.clone());
        const formationX = (col - GAME_CONFIG.ENEMY_COLS / 2 + 0.5) * GAME_CONFIG.ENEMY_X_SPACING;
        const formationY = row * GAME_CONFIG.ENEMY_Y_SPACING + 1.5;
        enemy.position.set(formationX, formationY, 0);
        enemy.userData = {
          formationX,
          formationY,
          state: 'formation', // 'formation' | 'diving' | 'returning'
          diveTime: 0,
          diveDuration: 120 + Math.random() * 60, // frames
          diveAngle: 0,
          diveRadius: 0,
          diveCenter: new THREE.Vector3(),
        };
        this.scene.add(enemy);
        this.enemies.push(enemy);
      }
    }
  }

  update(player, gameState, audioManager) {
    // Game start timer
    if (gameState.isPlaying && !gameState.playerDestroyed) {
      this.gameStartTimer++;
    }

    // Enemy movement
    // 1. Formation enemies stay in place (with a little wiggle)
    // 2. Occasionally, one enemy dives toward the player in a curve (after 3 second delay)
    // 3. If it misses, it returns to formation
    if (this.diveCooldown > 0) this.diveCooldown--;
    else if (this.enemies.length > 0 && this.gameStartTimer >= GAME_CONFIG.GAME_START_DELAY && gameState.isPlaying && !gameState.playerDestroyed && Math.random() < 0.02) {
      const formationEnemies = this.enemies.filter(e => e.userData.state === 'formation');
      if (formationEnemies.length > 0) {
        // Check for formation swooping (enemies close to each other)
        const formationGroups = this.findFormationGroups(formationEnemies);
        
        if (formationGroups.length > 0 && Math.random() < 0.3) {
          // Formation swoop - multiple enemies together
          const group = formationGroups[Math.floor(Math.random() * formationGroups.length)];
          this.initiateFormationSwoop(group, player, audioManager);
        } else {
          // Single enemy swoop with variety
          const diver = formationEnemies[Math.floor(Math.random() * formationEnemies.length)];
          this.initiateSwoop(diver, Math.random(), player, audioManager);
        }
      }
      this.diveCooldown = 60 + Math.random() * 60;
    }

    this.enemies.forEach(enemy => {
      if (enemy.userData.state === 'zPlane') {
        // Z plane enemies move toward the camera (positive Z direction)
        enemy.position.z += enemy.userData.moveSpeed;
        
        // Remove if they get too close to the camera
        if (enemy.position.z > 2) {
          this.removeEnemy(enemy);
        }
      } else if (enemy.userData.state === 'formation') {
        // Small wiggle for life
        enemy.position.x = enemy.userData.formationX + Math.sin(Date.now() * 0.001 + enemy.userData.formationY) * 0.1;
        enemy.position.y = enemy.userData.formationY + Math.cos(Date.now() * 0.001 + enemy.userData.formationX) * 0.05;
      } else if (enemy.userData.state === 'diving') {
        // Move along quadratic Bezier curve
        enemy.userData.diveTime++;
        const t = enemy.userData.diveTime / enemy.userData.diveDuration;
        const [p0, p1, p2] = enemy.userData.diveCurve;
        if (t < 1) {
          // Quadratic Bezier interpolation
          const a = p0.clone().lerp(p1, t);
          const b = p1.clone().lerp(p2, t);
          enemy.position.copy(a.lerp(b, t));
        } else {
          // If missed, return to formation
          enemy.userData.state = 'returning';
          enemy.userData.returnTime = 0;
          enemy.userData.returnDuration = 60;
          enemy.userData.returnStart = enemy.position.clone();
        }
      } else if (enemy.userData.state === 'returning') {
        // Move back to formation
        enemy.userData.returnTime++;
        const t = enemy.userData.returnTime / enemy.userData.returnDuration;
        if (t < 1) {
          enemy.position.lerpVectors(enemy.userData.returnStart, new THREE.Vector3(enemy.userData.formationX, enemy.userData.formationY, 0), t);
        } else {
          enemy.userData.state = 'formation';
          enemy.position.set(enemy.userData.formationX, enemy.userData.formationY, 0);
        }
      }
    });
  }

  findFormationGroups(enemies) {
    const groups = [];
    const processed = new Set();
    
    enemies.forEach(enemy => {
      if (processed.has(enemy)) return;
      
      const group = [enemy];
      processed.add(enemy);
      
      // Find nearby enemies
      enemies.forEach(other => {
        if (processed.has(other)) return;
        
        const distance = enemy.position.distanceTo(other.position);
        if (distance < GAME_CONFIG.FORMATION_DISTANCE_THRESHOLD) { // Close enough to be in formation
          group.push(other);
          processed.add(other);
        }
      });
      
      if (group.length >= 2) {
        groups.push(group);
      }
    });
    
    return groups;
  }

  initiateSwoop(enemy, swoopType, player, audioManager) {
    enemy.userData.state = 'diving';
    enemy.userData.diveTime = 0;
    enemy.userData.diveDuration = 90 + Math.random() * 60;
    
    const start = new THREE.Vector3(enemy.userData.formationX, enemy.userData.formationY, 0);
    let end, mid;
    
    if (swoopType < 0.3) {
      // Direct attack - aim at player's current position
      end = new THREE.Vector3(player.position.x, player.position.y, 0);
      mid = start.clone().lerp(end, 0.5);
      mid.x += (Math.random() - 0.5) * 2;
    } else if (swoopType < 0.6) {
      // Predictive attack - aim where player will be
      const playerVelocity = new THREE.Vector3(0, 0, 0); // Could track player movement
      const predictionTime = 30; // frames ahead
      end = new THREE.Vector3(
        player.position.x + playerVelocity.x * predictionTime,
        player.position.y + playerVelocity.y * predictionTime,
        0
      );
      mid = start.clone().lerp(end, 0.4);
      mid.x += (Math.random() - 0.5) * 3;
    } else if (swoopType < 0.8) {
      // Side attack - swoop from the side
      const sideOffset = (Math.random() - 0.5) * 8; // -4 to 4
      end = new THREE.Vector3(player.position.x + sideOffset, player.position.y - 2, 0);
      mid = new THREE.Vector3(
        start.x + (end.x - start.x) * 0.3,
        start.y - 1,
        0
      );
    } else {
      // Circular attack - swoop in an arc
      end = new THREE.Vector3(player.position.x, player.position.y, 0);
      mid = new THREE.Vector3(
        start.x + (Math.random() - 0.5) * 6,
        start.y - 2,
        0
      );
    }
    
    enemy.userData.diveCurve = [start, mid, end];
    audioManager.playDive();
  }

  initiateFormationSwoop(group, player, audioManager) {
    const leader = group[0];
    
    // Calculate formation center and target
    const formationCenter = new THREE.Vector3();
    group.forEach(enemy => {
      formationCenter.add(new THREE.Vector3(enemy.userData.formationX, enemy.userData.formationY, 0));
    });
    formationCenter.divideScalar(group.length);
    
    // Target is player position
    const target = new THREE.Vector3(player.position.x, player.position.y, 0);
    
    // Calculate formation movement vector
    const formationMovement = target.clone().sub(formationCenter);
    
    // Set up each enemy in the formation
    group.forEach((enemy, index) => {
      enemy.userData.state = 'diving';
      enemy.userData.diveTime = 0;
      enemy.userData.diveDuration = 90 + Math.random() * 60;
      
      // Calculate relative position within formation
      const relativePos = new THREE.Vector3(
        enemy.userData.formationX - formationCenter.x,
        enemy.userData.formationY - formationCenter.y,
        0
      );
      
      // Start position (current formation position)
      const start = new THREE.Vector3(enemy.userData.formationX, enemy.userData.formationY, 0);
      
      // End position (maintains relative position in formation)
      const end = target.clone().add(relativePos);
      
      // Mid point for curve (formation moves together)
      const mid = start.clone().lerp(end, 0.5);
      mid.x += (Math.random() - 0.5) * 1; // Small random variation
      
      enemy.userData.diveCurve = [start, mid, end];
      enemy.userData.formationLeader = leader; // Reference to leader for coordination
    });
    
    // Play dive sound for formation
    audioManager.playDive();
  }

  removeEnemy(enemy) {
    const index = this.enemies.indexOf(enemy);
    if (index > -1) {
      this.scene.remove(enemy);
      this.enemies.splice(index, 1);
    }
  }

  clearAll() {
    this.enemies.forEach(enemy => {
      this.scene.remove(enemy);
    });
    this.enemies = [];
  }
}
