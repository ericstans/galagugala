import * as THREE from 'three';
import { GAME_CONFIG } from '../config/GameConstants.js';

export class EnemyManager {
  constructor(scene, level = 1) {
    this.scene = scene;
    this.enemies = [];
    this.diveCooldown = 0;
    this.gameStartTimer = 0;
    this.enemyGeometry = new THREE.BoxGeometry(0.7, 0.7, 0.3);
    this.enemyMaterial = new THREE.MeshBasicMaterial({ 
      color: 0xff3333,
      transparent: false,
      opacity: 1.0
    });
    this.initialColumnStructure = {}; // Track initial column structure
    this.processedColumns = new Set(); // Track which columns have already spawned power-ups
    this.lastEnemyInColumn = {}; // Track the last enemy destroyed in each column
    this.createEnemies(level);
  }

  createEnemies(level = 1) {
    this.enemies = [];
    
    // Calculate level-based enemy formation size
    const baseRows = GAME_CONFIG.ENEMY_ROWS;
    const baseCols = GAME_CONFIG.ENEMY_COLS;
    
    // Increase columns every 2 levels, rows every 3 levels
    const additionalCols = Math.floor((level - 1) / 2);
    const additionalRows = Math.floor((level - 1) / 3);
    
    const totalRows = Math.min(baseRows + additionalRows, 8); // Cap at 8 rows
    const totalCols = Math.min(baseCols + additionalCols, 12); // Cap at 12 columns
    
    console.log(`Level ${level} calculation: baseRows=${baseRows}, baseCols=${baseCols}, additionalRows=${additionalRows}, additionalCols=${additionalCols}, totalRows=${totalRows}, totalCols=${totalCols}`);
    
    // Calculate dynamic Y spacing to keep formation on screen
    // Camera is at z=10 with 75° FOV, so visible height ≈ 14.6 units
    const maxVisibleHeight = 14.6;
    const topMargin = 2.0; // Keep some margin from top
    const bottomMargin = 1.5; // Keep some margin from bottom
    const availableHeight = maxVisibleHeight - topMargin - bottomMargin;
    
    // Calculate Y spacing to fit all rows within available height
    const dynamicYSpacing = totalRows > 1 ? availableHeight / (totalRows - 1) : GAME_CONFIG.ENEMY_Y_SPACING;
    const clampedYSpacing = Math.min(dynamicYSpacing, GAME_CONFIG.ENEMY_Y_SPACING); // Don't exceed original spacing
    
    // Calculate dynamic X spacing to keep formation within player's reach
    // Player can move from x = -6 to x = 6, so max formation width should be ≤ 12 units
    const maxFormationWidth = 12.0; // Match player's movement range
    const dynamicXSpacing = totalCols > 1 ? maxFormationWidth / (totalCols - 1) : GAME_CONFIG.ENEMY_X_SPACING;
    const clampedXSpacing = Math.min(dynamicXSpacing, GAME_CONFIG.ENEMY_X_SPACING); // Don't exceed original spacing
    
    // Calculate dynamic enemy size based on formation size
    const actualFormationWidth = (totalCols - 1) * clampedXSpacing;
    const actualFormationHeight = (totalRows - 1) * clampedYSpacing;
    const formationArea = actualFormationWidth * actualFormationHeight;
    
    console.log(`X spacing: dynamic=${dynamicXSpacing.toFixed(2)}, clamped=${clampedXSpacing.toFixed(2)}, formation width=${actualFormationWidth.toFixed(2)}`);
    
    // Scale enemy size inversely with formation area (larger formations = smaller enemies)
    const baseEnemySize = 0.7;
    const sizeScale = Math.max(0.4, Math.min(1.0, 1.0 - (formationArea - 20) * 0.01));
    const enemySize = baseEnemySize * sizeScale;
    
    // Create new geometry with scaled size
    const scaledGeometry = new THREE.BoxGeometry(enemySize, enemySize, enemySize * 0.4);
    
    console.log(`Level ${level}: Creating ${totalRows}x${totalCols} enemy formation with size scale ${sizeScale.toFixed(2)}, Y spacing ${clampedYSpacing.toFixed(2)}`);
    
    // Reset initial column structure and processed columns
    this.initialColumnStructure = {};
    this.processedColumns.clear();
    this.lastEnemyInColumn = {};
    
    for (let row = 0; row < totalRows; row++) {
      for (let col = 0; col < totalCols; col++) {
        const enemy = new THREE.Mesh(scaledGeometry, this.enemyMaterial.clone());
        
        // Add darker red edges
        const edgeGeometry = new THREE.EdgesGeometry(scaledGeometry);
        const edgeMaterial = new THREE.LineBasicMaterial({ 
          color: 0xcc1111, // Darker red
          linewidth: 2
        });
        const edges = new THREE.LineSegments(edgeGeometry, edgeMaterial);
        enemy.add(edges);
        
        const formationX = (col - totalCols / 2 + 0.5) * clampedXSpacing;
        const formationY = row * clampedYSpacing + bottomMargin;
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
        
        // Track initial column structure
        if (!this.initialColumnStructure[formationX]) {
          this.initialColumnStructure[formationX] = 0;
        }
        this.initialColumnStructure[formationX]++;
      }
    }
  }

  updateIntroAnimation() {
    // Apply waving effect to enemies during intro screen
    this.enemies.forEach(enemy => {
      if (enemy.userData.state === 'formation') {
        // Small wiggle for life (same as in update method)
        enemy.position.x = enemy.userData.formationX + Math.sin(Date.now() * 0.001 + enemy.userData.formationY) * 0.1;
        enemy.position.y = enemy.userData.formationY + Math.cos(Date.now() * 0.001 + enemy.userData.formationX) * 0.05;
      }
    });
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
      if (enemy.userData.state === 'formation') {
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
          // Dive complete, start waiting off-screen at bottom
          enemy.userData.state = 'waiting';
          enemy.userData.waitTime = 0;
          enemy.userData.waitDuration = 18 + Math.random() * 102; // 0.3-2 seconds (18-120 frames at 60fps)
        }
      } else if (enemy.userData.state === 'waiting') {
        // Wait off-screen at bottom before teleporting
        enemy.userData.waitTime++;
        if (enemy.userData.waitTime >= enemy.userData.waitDuration) {
          // Wait complete, teleport to top of screen
          enemy.userData.state = 'teleporting';
          enemy.userData.teleportTime = 0;
          enemy.userData.teleportDuration = 1; // Instant teleport (1 frame)
          
          // Teleport to above the top of the screen
          enemy.position.set(enemy.userData.formationX, 8, 0); // Above the top
        }
      } else if (enemy.userData.state === 'teleporting') {
        // Teleport is instant, move to returning state
        enemy.userData.teleportTime++;
        if (enemy.userData.teleportTime >= enemy.userData.teleportDuration) {
          // Start returning to formation from the top
          enemy.userData.state = 'returning';
          enemy.userData.returnTime = 0;
          enemy.userData.returnDuration = 90 + Math.random() * 30; // 1.5-2 seconds
          enemy.userData.returnStart = enemy.position.clone();
          
          // Calculate side offset once for smooth curve
          enemy.userData.returnSideOffset = (Math.random() - 0.5) * 2; // Small random offset
        }
      } else if (enemy.userData.state === 'returning') {
        // Move back to formation from the side
        enemy.userData.returnTime++;
        const t = enemy.userData.returnTime / enemy.userData.returnDuration;
        
        if (t < 1) {
          // Create a curved path from the top to formation
          const start = enemy.userData.returnStart;
          const end = new THREE.Vector3(enemy.userData.formationX, enemy.userData.formationY, 0);
          
          // Create a control point for the curve (slightly to the side for natural arc)
          const mid = new THREE.Vector3(
            enemy.userData.formationX + enemy.userData.returnSideOffset,
            enemy.userData.formationY + 2, // Mid-point between top and formation
            0
          );
          
          // Quadratic Bezier interpolation for smooth curve
          const a = start.clone().lerp(mid, t);
          const b = mid.clone().lerp(end, t);
          enemy.position.copy(a.lerp(b, t));
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
    enemy.userData.diveDuration = 120 + Math.random() * 60; // Longer dive to go past player
    
    const start = new THREE.Vector3(enemy.userData.formationX, enemy.userData.formationY, 0);
    let end, mid;
    
    if (swoopType < 0.3) {
      // Direct attack - go past player and off screen
      end = new THREE.Vector3(player.position.x, player.position.y - 4, 0); // Go past player
      mid = start.clone().lerp(end, 0.4);
      mid.x += (Math.random() - 0.5) * 2;
      mid.y -= 1; // Curve down
    } else if (swoopType < 0.6) {
      // Predictive attack - aim past where player will be
      const sideOffset = (Math.random() - 0.5) * 3; // -1.5 to 1.5
      end = new THREE.Vector3(player.position.x + sideOffset, player.position.y - 5, 0);
      mid = start.clone().lerp(end, 0.3);
      mid.x += (Math.random() - 0.5) * 3;
      mid.y -= 2; // Deeper curve
    } else if (swoopType < 0.8) {
      // Side attack - swoop past player from the side
      const sideOffset = (Math.random() - 0.5) * 6; // -3 to 3
      end = new THREE.Vector3(player.position.x + sideOffset, player.position.y - 3, 0);
      mid = new THREE.Vector3(
        start.x + (end.x - start.x) * 0.2,
        start.y - 1.5,
        0
      );
    } else {
      // Circular attack - swoop in a wide arc past player
      const arcOffset = (Math.random() - 0.5) * 8; // -4 to 4
      end = new THREE.Vector3(player.position.x + arcOffset, player.position.y - 4, 0);
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
    
    // Target is past the player and off the bottom of the screen
    const target = new THREE.Vector3(player.position.x, player.position.y - 4, 0);
    
    // Set up each enemy in the formation
    group.forEach((enemy, index) => {
      enemy.userData.state = 'diving';
      enemy.userData.diveTime = 0;
      enemy.userData.diveDuration = 120 + Math.random() * 60; // Longer dive to go past player
      
      // Calculate relative position within formation
      const relativePos = new THREE.Vector3(
        enemy.userData.formationX - formationCenter.x,
        enemy.userData.formationY - formationCenter.y,
        0
      );
      
      // Start position (current formation position)
      const start = new THREE.Vector3(enemy.userData.formationX, enemy.userData.formationY, 0);
      
      // End position (maintains relative position in formation, but goes past player)
      const end = target.clone().add(relativePos);
      
      // Mid point for curve (formation moves together, curves down)
      const mid = start.clone().lerp(end, 0.4);
      mid.x += (Math.random() - 0.5) * 1; // Small random variation
      mid.y -= 1; // Curve down to go past player
      
      enemy.userData.diveCurve = [start, mid, end];
      enemy.userData.formationLeader = leader; // Reference to leader for coordination
    });
    
    // Play dive sound for formation
    audioManager.playDive();
  }

  removeEnemy(enemy, powerUpCallback = null) {
    const index = this.enemies.indexOf(enemy);
    if (index > -1) {
      const formationX = enemy.userData.formationX;
      
      // Check if this is the last enemy in this column BEFORE removing it
      const columnCounts = this.getColumnCounts();
      const isLastInColumn = columnCounts[formationX] === 1;
      
      if (isLastInColumn && powerUpCallback) {
        // Spawn power-up immediately at this enemy's position
        powerUpCallback({
          x: enemy.position.x,
          y: enemy.position.y,
          z: enemy.position.z
        });
      }
      
      this.scene.remove(enemy);
      this.enemies.splice(index, 1);
    }
  }

  // Check if any columns have been completely destroyed (and not yet processed)
  checkForDestroyedColumns() {
    if (this.enemies.length === 0) return [];
    
    // Get current column counts
    const currentColumnCounts = this.getColumnCounts();
    
    // Find columns that are completely destroyed (had enemies initially but none now)
    const newlyDestroyedColumns = [];
    Object.keys(this.initialColumnStructure).forEach(x => {
      const initialCount = this.initialColumnStructure[x];
      const currentCount = currentColumnCounts[x] || 0;
      
      // Column is destroyed and hasn't been processed yet
      if (initialCount > 0 && currentCount === 0 && !this.processedColumns.has(x)) {
        newlyDestroyedColumns.push({
          x: parseFloat(x),
          lastEnemyPosition: this.lastEnemyInColumn[x]
        });
        this.processedColumns.add(x); // Mark as processed
      }
    });
    
    return newlyDestroyedColumns;
  }

  // Get the number of enemies remaining in each column
  getColumnCounts() {
    if (this.enemies.length === 0) return {};
    
    const columnCounts = {};
    this.enemies.forEach(enemy => {
      const x = enemy.userData.formationX;
      columnCounts[x] = (columnCounts[x] || 0) + 1;
    });
    
    return columnCounts;
  }

  clearAll() {
    this.enemies.forEach(enemy => {
      this.scene.remove(enemy);
    });
    this.enemies = [];
    this.processedColumns.clear();
    this.lastEnemyInColumn = {};
  }
}
