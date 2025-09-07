import * as THREE from 'three';
import { GAME_CONFIG } from '../config/GameConstants.js';

const DEBUG = false;

export class EnemyManager {
  constructor(scene, level = 1, gameEngine = null, audioManager = null) {
    this.scene = scene;
    this.enemies = [];
    this.diveCooldown = 0;
    this.gameStartTimer = 0;
    this.enemyGeometry = new THREE.BoxGeometry(GAME_CONFIG.ENEMY_BASE_SIZE, GAME_CONFIG.ENEMY_BASE_SIZE, 0.3);
    // Shared material for all enemies (avoid cloning per enemy)
    this.enemyMaterial = new THREE.MeshBasicMaterial({ 
      color: 0xff3333,
      transparent: false,
      opacity: 1.0
    });
    // Shared edge material
    this.enemyEdgeMaterial = new THREE.LineBasicMaterial({
      color: 0xcc1111,
      linewidth: 1
    });
    this.initialColumnStructure = {}; // Track initial column structure
    this.processedColumns = new Set(); // Track which columns have already spawned power-ups
    this.lastEnemyInColumn = {}; // Track the last enemy destroyed in each column
    
    // Enemy bullet system (level 5+)
    this.enemyBullets = [];
    this.bulletCooldown = 0;
    this.currentLevel = level;
    this.bulletTrails = []; // Store trail particles for green bullets
    this.audioManager = audioManager; // Reference to audio manager for sound effects
    
    this.createEnemies(level, gameEngine);
  }

  createEnemies(level = 1, gameEngine = null) {
    this.currentLevel = level;
    this.enemies = [];
    
    // Calculate level-based enemy formation size
    const baseRows = GAME_CONFIG.ENEMY_ROWS;
    const baseCols = GAME_CONFIG.ENEMY_COLS;
    
    // Increase columns every 2 levels, rows every 3 levels
    const additionalCols = Math.floor((level - 1) / GAME_CONFIG.ENEMY_LEVEL_COL_INCREMENT);
    const additionalRows = Math.floor((level - 1) / GAME_CONFIG.ENEMY_LEVEL_ROW_INCREMENT);
    
    const totalRows = Math.min(baseRows + additionalRows, GAME_CONFIG.ENEMY_MAX_ROWS);
    const totalCols = Math.min(baseCols + additionalCols, GAME_CONFIG.ENEMY_MAX_COLS);
    
    if (DEBUG) console.log(`Level ${level} calculation: baseRows=${baseRows}, baseCols=${baseCols}, additionalRows=${additionalRows}, additionalCols=${additionalCols}, totalRows=${totalRows}, totalCols=${totalCols}`);
    
    // Get dynamic bounds from game engine if available
    let bounds;
    if (gameEngine) {
      bounds = gameEngine.getVisibleBounds();
    } else {
      // Fallback to hardcoded bounds if gameEngine not available
      bounds = {
        left: -6,
        right: 6,
        top: 7,
        bottom: -7,
        width: 12,
        height: 14
      };
    }
    
    // Calculate dynamic Y spacing to keep formation on screen
    const topMargin = 2.0; // Keep some margin from top
    const bottomMargin = 1.5; // Keep some margin from bottom
    const availableHeight = bounds.height - topMargin - bottomMargin;
    
    // Calculate Y spacing to fit all rows within available height
    const dynamicYSpacing = totalRows > 1 ? availableHeight / (totalRows - 1) : GAME_CONFIG.ENEMY_Y_SPACING;
    const clampedYSpacing = Math.min(dynamicYSpacing, GAME_CONFIG.ENEMY_Y_SPACING); // Don't exceed original spacing
    
    // Calculate dynamic X spacing to keep formation within visible bounds
    const maxFormationWidth = bounds.width * 0.8; // Use 80% of visible width
    const dynamicXSpacing = totalCols > 1 ? maxFormationWidth / (totalCols - 1) : GAME_CONFIG.ENEMY_X_SPACING;
    const clampedXSpacing = Math.min(dynamicXSpacing, GAME_CONFIG.ENEMY_X_SPACING); // Don't exceed original spacing
    
    // Calculate dynamic enemy size based on formation size
    const actualFormationWidth = (totalCols - 1) * clampedXSpacing;
    const actualFormationHeight = (totalRows - 1) * clampedYSpacing;
    const formationArea = actualFormationWidth * actualFormationHeight;
    
    if (DEBUG) console.log(`X spacing: dynamic=${dynamicXSpacing.toFixed(2)}, clamped=${clampedXSpacing.toFixed(2)}, formation width=${actualFormationWidth.toFixed(2)}`);
    
    // Scale enemy size inversely with formation area (larger formations = smaller enemies)
    const baseEnemySize = GAME_CONFIG.ENEMY_BASE_SIZE;
    const sizeScale = Math.max(GAME_CONFIG.ENEMY_MIN_SIZE, Math.min(GAME_CONFIG.ENEMY_MAX_SIZE, 1.0 - (formationArea - 20) * GAME_CONFIG.ENEMY_SIZE_SCALE_FACTOR));
    const enemySize = baseEnemySize * sizeScale;
    
    // Create new geometry with scaled size
    const scaledGeometry = new THREE.BoxGeometry(enemySize, enemySize, enemySize * 0.4);
    
    if (DEBUG) console.log(`Level ${level}: Creating ${totalRows}x${totalCols} enemy formation with size scale ${sizeScale.toFixed(2)}, Y spacing ${clampedYSpacing.toFixed(2)}`);
    
    // Reset initial column structure and processed columns
    this.initialColumnStructure = {};
    this.processedColumns.clear();
    this.lastEnemyInColumn = {};
    
    for (let row = 0; row < totalRows; row++) {
      for (let col = 0; col < totalCols; col++) {
  const enemy = new THREE.Mesh(scaledGeometry, this.enemyMaterial);
  // Single edges overlay (dramatically fewer draw calls)
  const edgeGeometry = new THREE.EdgesGeometry(scaledGeometry);
  const edges = new THREE.LineSegments(edgeGeometry, this.enemyEdgeMaterial);
  enemy.add(edges);
        
        // Center the formation within the visible bounds
        const formationX = (col - (totalCols - 1) / 2) * clampedXSpacing;
        const formationY = bounds.top - topMargin - (row * clampedYSpacing);
        enemy.position.set(formationX, formationY, 0);
        enemy.userData = {
          formationX,
          formationY,
          state: 'formation', // 'formation' | 'diving' | 'returning'
          diveTime: 0,
          diveDuration: GAME_CONFIG.ENEMY_DIVE_DURATION_MIN + Math.random() * (GAME_CONFIG.ENEMY_DIVE_DURATION_MAX - GAME_CONFIG.ENEMY_DIVE_DURATION_MIN), // frames
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

  updateWaveMotionOnly() {
    // Only update the wave motion for formation enemies (no diving/swooping)
    this.enemies.forEach(enemy => {
      if (enemy.userData.state === 'formation') {
        // Small wiggle for life
        enemy.position.x = enemy.userData.formationX + Math.sin(Date.now() * 0.001 + enemy.userData.formationY) * 0.1;
        enemy.position.y = enemy.userData.formationY + Math.cos(Date.now() * 0.001 + enemy.userData.formationX) * 0.05;
      }
    });
  }

  update(player, gameState, audioManager, divingDisabled = false) {
    // Game start timer
    if (gameState.isPlaying && !gameState.playerDestroyed) {
      this.gameStartTimer++;
    }

    // Enemy movement
    // 1. Formation enemies stay in place (with a little wiggle)
    // 2. Occasionally, one enemy dives toward the player in a curve (after 3 second delay)
    // 3. If it misses, it returns to formation
    if (this.diveCooldown > 0) this.diveCooldown--;
    else if (!divingDisabled && this.enemies.length > 0 && this.gameStartTimer >= GAME_CONFIG.GAME_START_DELAY && gameState.isPlaying && !gameState.playerDestroyed) {
      // Calculate diving probability based on level
      let diveProbability = 0;
      if (this.currentLevel >= GAME_CONFIG.ENEMY_DIVE_START_LEVEL) {
        // Scale from 0 to base probability over start to full levels
        const progress = Math.min((this.currentLevel - GAME_CONFIG.ENEMY_DIVE_START_LEVEL) / (GAME_CONFIG.ENEMY_DIVE_FULL_LEVEL - GAME_CONFIG.ENEMY_DIVE_START_LEVEL), 1);
        diveProbability = GAME_CONFIG.ENEMY_DIVE_BASE_PROBABILITY * progress;
      }
      
      if (Math.random() < diveProbability) {
        const formationEnemies = this.enemies.filter(e => e.userData.state === 'formation' && !e.userData.warningActive);
        if (formationEnemies.length > 0) {
          // Check for formation swooping (enemies close to each other)
          const formationGroups = this.findFormationGroups(formationEnemies);
          
          if (formationGroups.length > 0 && Math.random() < GAME_CONFIG.ENEMY_FORMATION_SWOOP_CHANCE) {
            // Formation swoop - multiple enemies together
            const group = formationGroups[Math.floor(Math.random() * formationGroups.length)];
            this.initiateFormationSwoop(group, player, audioManager);
          } else {
            // Single enemy swoop with variety
            const diver = formationEnemies[Math.floor(Math.random() * formationEnemies.length)];
            this.initiateSwoop(diver, Math.random(), player, audioManager);
          }
        }
        this.diveCooldown = GAME_CONFIG.ENEMY_DIVE_COOLDOWN_MIN + Math.random() * (GAME_CONFIG.ENEMY_DIVE_COOLDOWN_MAX - GAME_CONFIG.ENEMY_DIVE_COOLDOWN_MIN);
      }
    }

    // Enemy bullet system (level 5+)
    if (this.currentLevel >= GAME_CONFIG.ENEMY_BULLET_START_LEVEL && !divingDisabled) {
      if (this.bulletCooldown > 0) this.bulletCooldown--;
      else if (this.enemies.length > 0 && gameState.isPlaying && !gameState.playerDestroyed) {
        // Different bullet types based on level
        let shootChance;
        if (this.currentLevel >= 30) {
          // Level 30+: All bullet types active (green, red, yellow)
          shootChance = GAME_CONFIG.ENEMY_BULLET_GREEN_CHANCE; // Base chance for any bullet type
        } else if (this.currentLevel >= 20) {
          // Level 20-29: Red and yellow bullets active
          shootChance = GAME_CONFIG.ENEMY_BULLET_RED_CHANCE; // Base chance for red or yellow bullets
        } else if (this.currentLevel >= 15) {
          // Level 15-19: Green and yellow bullets active
          shootChance = GAME_CONFIG.ENEMY_BULLET_GREEN_CHANCE; // Base chance for green or yellow bullets
        } else {
          // Level 5-14: Only green bullets
          shootChance = GAME_CONFIG.ENEMY_BULLET_GREEN_CHANCE;
        }
        
        // Apply level-based frequency multipliers for red bullets (level 35+)
        if (this.currentLevel >= 20) {
          if (this.currentLevel >= GAME_CONFIG.BULLET_FREQUENCY_MULTIPLIER_START_LEVEL) {
            const multiplierLevels = Math.floor((this.currentLevel - GAME_CONFIG.BULLET_FREQUENCY_MULTIPLIER_START_LEVEL) / GAME_CONFIG.BULLET_FREQUENCY_MULTIPLIER_INCREMENT_LEVEL);
            const frequencyMultiplier = GAME_CONFIG.BULLET_FREQUENCY_MULTIPLIER_BASE + (multiplierLevels * GAME_CONFIG.BULLET_FREQUENCY_MULTIPLIER_INCREMENT);
            shootChance *= frequencyMultiplier;
          }
        }
        if (Math.random() < shootChance) {
          // Find formation enemies that can shoot
          const formationEnemies = this.enemies.filter(e => e.userData.state === 'formation' && !e.userData.warningActive);
          if (formationEnemies.length > 0) {
            const shooter = formationEnemies[Math.floor(Math.random() * formationEnemies.length)];
            this.startEnemyWarning(shooter, player);
          }
          // Different cooldowns based on bullet type
          if (this.currentLevel >= 30) {
            // Level 30+: All bullet types, use average cooldown
            this.bulletCooldown = (GAME_CONFIG.ENEMY_BULLET_GREEN_COOLDOWN + GAME_CONFIG.ENEMY_BULLET_RED_COOLDOWN + GAME_CONFIG.ENEMY_BULLET_YELLOW_COOLDOWN) / 3 + Math.random() * 60;
          } else if (this.currentLevel >= 20) {
            // Level 20-29: Red and yellow bullets, use average cooldown
            this.bulletCooldown = (GAME_CONFIG.ENEMY_BULLET_RED_COOLDOWN + GAME_CONFIG.ENEMY_BULLET_YELLOW_COOLDOWN) / 2 + Math.random() * 60;
          } else if (this.currentLevel >= 15) {
            // Level 15-19: Green and yellow bullets, use average cooldown
            this.bulletCooldown = (GAME_CONFIG.ENEMY_BULLET_GREEN_COOLDOWN + GAME_CONFIG.ENEMY_BULLET_YELLOW_COOLDOWN) / 2 + Math.random() * 60;
          } else {
            // Level 10-14: Only green bullets
            this.bulletCooldown = GAME_CONFIG.ENEMY_BULLET_GREEN_COOLDOWN + Math.random() * 60;
          }
        }
      }
    }

    // Update enemy warnings
    this.updateEnemyWarnings();

    this.enemies.forEach(enemy => {
      // Handle boss rotation and firing
      if (enemy.userData.isBoss) {
        // Check if boss is destroyed (for final boss explosion sequence)
        if (enemy.userData.isDestroyed) {
          // Boss is destroyed - only continue rotation, no movement or firing
          enemy.children.forEach(cube => {
            cube.rotation.x += cube.userData.rotationSpeed;
            cube.rotation.y += cube.userData.rotationSpeed;
            cube.rotation.z += cube.userData.rotationSpeed;
          });
          return; // Skip movement and firing
        }
        
        // Rotate each cube in the boss group
        enemy.children.forEach(cube => {
          cube.rotation.x += cube.userData.rotationSpeed;
          cube.rotation.y += cube.userData.rotationSpeed;
          cube.rotation.z += cube.userData.rotationSpeed;
          
          // Update color based on health
          const healthPercent = enemy.userData.health / enemy.userData.maxHealth;
          if (healthPercent > 0.7) {
            cube.material.color.setHex(0xff4444); // Red when healthy
          } else if (healthPercent > 0.4) {
            cube.material.color.setHex(0xff8844); // Orange when damaged
          } else if (healthPercent > 0.1) {
            cube.material.color.setHex(0xffaa44); // Yellow when heavily damaged
          } else {
            cube.material.color.setHex(0xffaa88); // Light orange when almost dead
          }
        });
        
        // Handle boss horizontal movement using sine wave
        enemy.userData.moveTime += 0.01; // Increment time (half the frequency)
        enemy.position.x = Math.sin(enemy.userData.moveTime) * enemy.userData.moveRange;
        
        // Handle boss firing (with increased fire rate and yellow bullet frequency when damaged)
        // Check if boss is still in initial firing delay period
        if (enemy.userData.fireDelay > 0) {
          enemy.userData.fireDelay--;
          return; // Skip firing during delay period
        }
        
        if (enemy.userData.fireCooldown > 0) {
          enemy.userData.fireCooldown--;
        } else {
          // Fire bullet and cycle to next type
          this.shootBossBullet(enemy, player);
          
          // Calculate health percentage for fire rate and yellow bullet frequency multiplier
          const healthPercent = enemy.userData.health / enemy.userData.maxHealth;
          let fireRateMultiplier = 1.0;
          let yellowMultiplier = 1.0;
          
          if (healthPercent <= 0.4) {
            // Orange or worse - 1.5x yellow bullet frequency and 1.5x fire rate
            yellowMultiplier = 1.5;
            fireRateMultiplier = 1.5;
          }
          if (healthPercent <= 0.1) {
            // Light orange (almost dead) - 2x yellow bullet frequency and 4x fire rate
            yellowMultiplier = 2.0;
            fireRateMultiplier = 4.0;
          }
          
          // Cycle to next bullet type, but favor yellow bullets when damaged
          let nextBulletType = (enemy.userData.currentBulletType + 1) % enemy.userData.bulletTypes.length;
          
          // If we're cycling to yellow and the boss is damaged, potentially fire yellow again
          if (enemy.userData.bulletTypes[nextBulletType] === 'yellow' && yellowMultiplier > 1.0) {
            // Random chance to fire yellow again based on multiplier
            if (Math.random() < (yellowMultiplier - 1.0)) {
              // Stay on yellow bullet type for another shot
              nextBulletType = enemy.userData.currentBulletType;
            }
          }
          
          enemy.userData.currentBulletType = nextBulletType;
          enemy.userData.fireCooldown = Math.floor(30 / fireRateMultiplier); // Faster firing when damaged
        }
        
        return; // Skip normal enemy processing for boss
      }
      
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

    // Update enemy bullets
    this.updateEnemyBullets();
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
    
    // Clear enemy bullets and their trails
    this.enemyBullets.forEach(bullet => {
      if (bullet.userData.isGreen) {
        this.cleanupBulletTrail(bullet);
      }
      this.scene.remove(bullet);
    });
    this.enemyBullets = [];
  }

  shootEnemyBullet(enemy, player) {
    let bulletGeometry, bulletMaterial, bulletSpeed, spreadAmount;
    
    // Determine bullet type based on warning type
    const bulletType = enemy.userData.warningType;
    
    if (bulletType === 'red') {
      // Red bullets - thick cylinders with high spread
      bulletGeometry = new THREE.CylinderGeometry(GAME_CONFIG.ENEMY_BULLET_RED_SIZE, GAME_CONFIG.ENEMY_BULLET_RED_SIZE, 0.5, 8);
      bulletMaterial = new THREE.MeshBasicMaterial({ color: 0xff6666 });
      bulletSpeed = GAME_CONFIG.ENEMY_BULLET_RED_SPEED;
      spreadAmount = GAME_CONFIG.ENEMY_BULLET_RED_SPREAD;
    } else if (bulletType === 'yellow') {
      // Yellow bullets - medium spheres, spread pattern
      bulletGeometry = new THREE.SphereGeometry(GAME_CONFIG.ENEMY_BULLET_YELLOW_SIZE, 8, 6);
      bulletMaterial = new THREE.MeshBasicMaterial({ color: 0xffff66 });
      bulletSpeed = GAME_CONFIG.ENEMY_BULLET_YELLOW_SPEED;
      spreadAmount = GAME_CONFIG.ENEMY_BULLET_YELLOW_SPREAD;
    } else {
      // Green bullets - large circles, easier to dodge
      bulletGeometry = new THREE.SphereGeometry(GAME_CONFIG.ENEMY_BULLET_GREEN_SIZE, 8, 6);
      bulletMaterial = new THREE.MeshBasicMaterial({ color: 0x66ff66 });
      bulletSpeed = GAME_CONFIG.ENEMY_BULLET_GREEN_SPEED;
      spreadAmount = GAME_CONFIG.ENEMY_BULLET_GREEN_SPREAD;
    }
    
    const bullet = new THREE.Mesh(bulletGeometry, bulletMaterial);
    
    // Position bullet at enemy location
    bullet.position.copy(enemy.position);
    bullet.position.y -= 0.5; // Slightly below enemy
    
    // Calculate direction to player with random spread
    const direction = new THREE.Vector3();
    direction.subVectors(player.position, enemy.position);
    direction.normalize();
    
    // Add random spread based on bullet type
    const spreadAngle = (Math.random() - 0.5) * spreadAmount;
    const spreadAxis = new THREE.Vector3(0, 0, 1); // Rotate around Z axis
    direction.applyAxisAngle(spreadAxis, spreadAngle);
    
    if (bulletType === 'yellow') {
      // Yellow bullets: Create variable number of bullets in a spread pattern, all going straight down
      let bulletCount = GAME_CONFIG.ENEMY_BULLET_YELLOW_COUNT; // Default 5
      
      // Variable bullet counts based on level
      if (this.currentLevel >= GAME_CONFIG.ENEMY_BULLET_YELLOW_MULTIPLE_COUNT_START_LEVEL) {
        // Level 40+: 3 equal possibilities (5, 7, 9)
        const countOptions = [5, 7, 9];
        bulletCount = countOptions[Math.floor(Math.random() * countOptions.length)];
      } else if (this.currentLevel >= GAME_CONFIG.ENEMY_BULLET_YELLOW_VARIABLE_COUNT_START_LEVEL) {
        // Level 20+: 50% chance for 7 bullets, 50% chance for 5 bullets
        bulletCount = Math.random() < 0.5 ? 7 : 5;
      }
      
      const maxSpread = GAME_CONFIG.ENEMY_BULLET_YELLOW_SPREAD;
      
      for (let i = 0; i < bulletCount; i++) {
        const yellowBullet = new THREE.Mesh(bulletGeometry, bulletMaterial.clone());
        
        // Position bullet at enemy location
        yellowBullet.position.copy(enemy.position);
        yellowBullet.position.y -= 0.5; // Slightly below enemy
        
        // Calculate spread angle for this bullet
        const spreadRatio = (i - (bulletCount - 1) / 2) / ((bulletCount - 1) / 2); // -1 to 1
        const spreadAngle = spreadRatio * maxSpread;
        
        // Direction is straight down with horizontal spread
        const direction = new THREE.Vector3(Math.sin(spreadAngle), -1, 0);
        direction.normalize();
        
        // Set bullet properties
        yellowBullet.userData = {
          velocity: direction.clone().multiplyScalar(bulletSpeed),
          lifetime: 0,
          isGreen: false,
          trailParticles: []
        };
        
        // Add bullet to scene and array
        this.scene.add(yellowBullet);
        this.enemyBullets.push(yellowBullet);
      }
      
      // Play yellow bullet sound effect
      if (this.audioManager) {
        this.audioManager.playYellowBulletFire();
      }
      return; // Exit early for yellow bullets
    }
    
    // Single bullet for green and red types
    // Add some vertical spread as well (less for green bullets)
    const verticalSpreadAmount = bulletType === 'red' ? 0.3 : 0.15;
    const verticalSpread = (Math.random() - 0.5) * verticalSpreadAmount;
    direction.y += verticalSpread;
    direction.normalize();
    
    // For red bullets, constrain to max angle from straight down
    if (bulletType === 'red') {
      const straightDown = new THREE.Vector3(0, -1, 0);
      const angleFromDown = direction.angleTo(straightDown);
      const maxAngle = GAME_CONFIG.ENEMY_BULLET_RED_MAX_ANGLE;
      
      if (angleFromDown > maxAngle) {
        // Clamp the direction to max 30 degrees from straight down
        const axis = new THREE.Vector3().crossVectors(straightDown, direction).normalize();
        if (axis.length() > 0) {
          direction.copy(straightDown);
          direction.applyAxisAngle(axis, maxAngle);
        } else {
          // If vectors are parallel, just use straight down
          direction.copy(straightDown);
        }
      }
    }
    
    // Store bullet data
    bullet.userData = {
      velocity: direction.multiplyScalar(bulletSpeed),
      lifetime: 0,
      isGreen: bulletType === 'green',
      trailParticles: []
    };
    
    // Create trail for green bullets
    if (bullet.userData.isGreen) {
      this.createBulletTrail(bullet);
    }
    
    // Play appropriate fire sound
    if (this.audioManager) {
      if (bullet.userData.isGreen) {
        this.audioManager.playGreenBulletFire();
      } else {
        this.audioManager.playRedBulletFire();
      }
    }
    
    this.scene.add(bullet);
    this.enemyBullets.push(bullet);
  }

  updateEnemyBullets() {
    for (let i = this.enemyBullets.length - 1; i >= 0; i--) {
      const bullet = this.enemyBullets[i];
      
      // Move bullet
      bullet.position.add(bullet.userData.velocity);
      bullet.userData.lifetime++;
      
      // Update trail for green bullets
      if (bullet.userData.isGreen) {
        this.updateBulletTrail(bullet);
      }
      
      // Remove bullet if it goes off screen or lives too long
      // Green bullets get longer lifetime to let trails fade naturally
      const maxLifetime = bullet.userData.isGreen ? GAME_CONFIG.ENEMY_BULLET_GREEN_LIFETIME : GAME_CONFIG.ENEMY_BULLET_RED_LIFETIME;
      if (bullet.position.y < -8 || bullet.userData.lifetime > maxLifetime) {
        // Clean up trail particles
        if (bullet.userData.isGreen) {
          this.cleanupBulletTrail(bullet);
        }
        this.scene.remove(bullet);
        this.enemyBullets.splice(i, 1);
      }
    }
  }

  createBulletTrail(bullet) {
    // Create scattered trail particles with random spacing
    const trailLength = GAME_CONFIG.GREEN_BULLET_TRAIL_LENGTH;
    const baseTrailSpacing = GAME_CONFIG.GREEN_BULLET_TRAIL_BASE_SPACING;
    
    for (let i = 0; i < trailLength; i++) {
      // Create first trail particle
      const trailGeometry1 = new THREE.SphereGeometry(GAME_CONFIG.GREEN_BULLET_TRAIL_PARTICLE_SIZE, 6, 4);
      const trailMaterial1 = new THREE.MeshBasicMaterial({ 
        color: 0x66ff66,
        transparent: true,
        opacity: 0.7 - (i * 0.08) // Fade out along trail
      });
      const trailParticle1 = new THREE.Mesh(trailGeometry1, trailMaterial1);
      
      // Create second trail particle (180deg out of phase)
      const trailGeometry2 = new THREE.SphereGeometry(GAME_CONFIG.GREEN_BULLET_TRAIL_PARTICLE_SIZE, 6, 4);
      const trailMaterial2 = new THREE.MeshBasicMaterial({ 
        color: 0x66ff66,
        transparent: true,
        opacity: 0.7 - (i * 0.08) // Fade out along trail
      });
      const trailParticle2 = new THREE.Mesh(trailGeometry2, trailMaterial2);
      
      // Calculate bullet direction for positioning and rotation
      const bulletDirection = bullet.userData.velocity.clone().normalize();
      
      // Add random spacing variation to make particles more disconnected
      const randomSpacing = baseTrailSpacing + (Math.random() - 0.5) * GAME_CONFIG.GREEN_BULLET_TRAIL_SPACING_VARIATION;
      const trailOffset = bulletDirection.clone().multiplyScalar(-randomSpacing * (i + 1));
      
      // Position both trail particles behind bullet along its direction
      trailParticle1.position.copy(bullet.position);
      trailParticle2.position.copy(bullet.position);
      trailParticle1.position.add(trailOffset);
      trailParticle2.position.add(trailOffset);
      
      // Add random position offsets to scatter particles
      const randomOffset1 = new THREE.Vector3(
        (Math.random() - 0.5) * GAME_CONFIG.GREEN_BULLET_TRAIL_RANDOM_OFFSET, // Random X offset
        (Math.random() - 0.5) * GAME_CONFIG.GREEN_BULLET_TRAIL_RANDOM_OFFSET, // Random Y offset
        0
      );
      const randomOffset2 = new THREE.Vector3(
        (Math.random() - 0.5) * GAME_CONFIG.GREEN_BULLET_TRAIL_RANDOM_OFFSET, // Random X offset
        (Math.random() - 0.5) * GAME_CONFIG.GREEN_BULLET_TRAIL_RANDOM_OFFSET, // Random Y offset
        0
      );
      
      trailParticle1.position.add(randomOffset1);
      trailParticle2.position.add(randomOffset2);
      
      // Store random data for consistent updates
      trailParticle1.userData = {
        randomOffset: randomOffset1,
        randomSpacing: randomSpacing,
        trailIndex: i
      };
      trailParticle2.userData = {
        randomOffset: randomOffset2,
        randomSpacing: randomSpacing,
        trailIndex: i
      };
      
      // Add sinuous wave pattern (propagates along trail length)
      const time = bullet.userData.lifetime * 0.1;
      const distanceFromBullet = i / (trailLength - 1); // 0 at bullet, 1 at end
      // Taper only for first few pixels from bullet
      const actualDistanceFromBullet = i * baseTrailSpacing;
      const sineIntensity = actualDistanceFromBullet < GAME_CONFIG.GREEN_BULLET_TRAIL_TAPER_DISTANCE ? 0 : Math.pow((actualDistanceFromBullet - GAME_CONFIG.GREEN_BULLET_TRAIL_TAPER_DISTANCE) / 2.0, 2);
      
      // Create wave that propagates along the trail (not just time-based)
      const wavePhase = time * 1.5 - distanceFromBullet * 6; // Slower wave propagation
      const sine1 = Math.sin(wavePhase) * GAME_CONFIG.GREEN_BULLET_TRAIL_WAVE_AMPLITUDE_1 * sineIntensity;
      const sine2 = Math.sin(wavePhase * 2) * GAME_CONFIG.GREEN_BULLET_TRAIL_WAVE_AMPLITUDE_2 * sineIntensity;
      
      // Apply sine waves perpendicular to bullet direction
      const perpendicular = new THREE.Vector3(-bulletDirection.y, bulletDirection.x, 0);
      
      // First trail: normal phase
      trailParticle1.position.add(perpendicular.clone().multiplyScalar(sine1 + sine2));
      
      // Second trail: 180 degrees out of phase
      trailParticle2.position.add(perpendicular.clone().multiplyScalar(-(sine1 + sine2)));
      
      this.scene.add(trailParticle1);
      this.scene.add(trailParticle2);
      bullet.userData.trailParticles.push(trailParticle1);
      bullet.userData.trailParticles.push(trailParticle2);
    }
  }

  updateBulletTrail(bullet) {
    const time = bullet.userData.lifetime * 0.1;
    const trailLength = bullet.userData.trailParticles.length / 2; // Divide by 2 since we have 2 trails per position
    
    // Calculate bullet direction for rotation
    const bulletDirection = bullet.userData.velocity.clone().normalize();
    
    bullet.userData.trailParticles.forEach((particle, index) => {
      // Get stored random data
      const particleData = particle.userData;
      const trailSegment = particleData.trailIndex;
      const isFirstTrail = index % 2 === 0;
      
      // Update position to follow bullet along its direction with stored random spacing
      particle.position.copy(bullet.position);
      const trailOffset = bulletDirection.clone().multiplyScalar(-particleData.randomSpacing * (trailSegment + 1));
      particle.position.add(trailOffset);
      
      // Reapply stored random offset to maintain scattered appearance
      particle.position.add(particleData.randomOffset);
      
      // Add sinuous wave pattern (propagates along trail length)
      const distanceFromBullet = trailSegment / (trailLength - 1); // 0 at bullet, 1 at end
      // Taper only for first 5 pixels (about 0.1 units) from bullet
      const actualDistanceFromBullet = trailSegment * particleData.randomSpacing;
      const sineIntensity = actualDistanceFromBullet < 0.1 ? 0 : Math.pow((actualDistanceFromBullet - 0.1) / 2.0, 2);
      
      // Create wave that propagates along the trail (not just time-based)
      const wavePhase = time * 1.5 - distanceFromBullet * 6; // Slower wave propagation
      const sine1 = Math.sin(wavePhase) * 0.4 * sineIntensity; // Slightly reduced amplitude
      const sine2 = Math.sin(wavePhase * 2) * 0.2 * sineIntensity; // Slightly reduced amplitude
      
      // Apply sine waves perpendicular to bullet direction
      const perpendicular = new THREE.Vector3(-bulletDirection.y, bulletDirection.x, 0);
      
      if (isFirstTrail) {
        // First trail: normal phase
        particle.position.add(perpendicular.clone().multiplyScalar(sine1 + sine2));
      } else {
        // Second trail: 180 degrees out of phase
        particle.position.add(perpendicular.clone().multiplyScalar(-(sine1 + sine2)));
      }
      
      // Fade out over time
      const fadeAmount = 0.7 - (trailSegment * 0.08) - (bullet.userData.lifetime * 0.001);
      particle.material.opacity = Math.max(0, fadeAmount);
    });
  }

  cleanupBulletTrail(bullet) {
    bullet.userData.trailParticles.forEach(particle => {
      this.scene.remove(particle);
    });
    bullet.userData.trailParticles = [];
  }

  isEnemyInBackHalf(enemy) {
    // Calculate which row this enemy is in based on its formationY position
    // Back rows (closer to player) have higher row indices
    const totalRows = this.enemies.length > 0 ? Math.max(...this.enemies.map(e => e.userData.row || 0)) + 1 : 1;
    const enemyRow = enemy.userData.row || 0;
    return enemyRow >= Math.floor(totalRows / 2);
  }

  startEnemyWarning(enemy, player) {
    // Store original color and player reference
    enemy.userData.originalColor = enemy.material.color.getHex();
    enemy.userData.targetPlayer = player;
    // Set warning state
    enemy.userData.warningActive = true;
    enemy.userData.warningTime = 0;
    
    if (this.currentLevel < 15) {
      // Green bullets (level 5-14) - solid green warning
      enemy.userData.warningDuration = GAME_CONFIG.ENEMY_GREEN_WARNING_DURATION;
      enemy.userData.warningType = 'green';
      // Change to green
      enemy.material.color.setHex(0x66ff66);
    } else if (this.currentLevel < 20) {
      // Level 15-19: Green and yellow bullets - randomly choose
      // Yellow bullets only from back half of rows
      const canFireYellow = this.isEnemyInBackHalf(enemy);
      if (canFireYellow && Math.random() < 0.5) {
        // Yellow bullet (50% chance if in back half)
        enemy.userData.warningDuration = GAME_CONFIG.ENEMY_YELLOW_WARNING_DURATION;
        enemy.userData.warningType = 'yellow';
        enemy.material.color.setHex(0xffff66);
      } else {
        // Green bullet (default or if in front half)
        enemy.userData.warningDuration = GAME_CONFIG.ENEMY_GREEN_WARNING_DURATION;
        enemy.userData.warningType = 'green';
        enemy.material.color.setHex(0x66ff66);
      }
    } else if (this.currentLevel < 30) {
      // Level 20-29: Red and yellow bullets - randomly choose
      // Yellow bullets only from back half of rows
      const canFireYellow = this.isEnemyInBackHalf(enemy);
      if (canFireYellow && Math.random() < 0.5) {
        // Yellow bullet (50% chance if in back half)
        enemy.userData.warningDuration = GAME_CONFIG.ENEMY_YELLOW_WARNING_DURATION;
        enemy.userData.warningType = 'yellow';
        enemy.material.color.setHex(0xffff66);
      } else {
        // Red bullet (default or if in front half)
        enemy.userData.warningDuration = GAME_CONFIG.ENEMY_RED_WARNING_DURATION;
        enemy.userData.warningType = 'red';
        enemy.userData.blinkTimer = 0;
        enemy.userData.blinkRate = GAME_CONFIG.ENEMY_RED_WARNING_BLINK_RATE;
        enemy.material.color.setHex(0x660000);
        
        // Play charge up sound for red bullets
        if (this.audioManager) {
          this.audioManager.playRedBulletCharge();
        }
      }
    } else {
      // Level 30+: All bullet types - randomly choose green, red, or yellow
      // Yellow bullets only from back half of rows
      const canFireYellow = this.isEnemyInBackHalf(enemy);
      const bulletType = Math.random();
      
      if (bulletType < 0.33) {
        // Green bullet (33% chance)
        enemy.userData.warningDuration = GAME_CONFIG.ENEMY_GREEN_WARNING_DURATION;
        enemy.userData.warningType = 'green';
        enemy.material.color.setHex(0x66ff66);
      } else if (bulletType < 0.66) {
        // Red bullet (33% chance)
        enemy.userData.warningDuration = GAME_CONFIG.ENEMY_RED_WARNING_DURATION;
        enemy.userData.warningType = 'red';
        enemy.userData.blinkTimer = 0;
        enemy.userData.blinkRate = GAME_CONFIG.ENEMY_RED_WARNING_BLINK_RATE;
        enemy.material.color.setHex(0x660000);
        
        // Play charge up sound for red bullets
        if (this.audioManager) {
          this.audioManager.playRedBulletCharge();
        }
      } else if (canFireYellow) {
        // Yellow bullet (34% chance, but only if in back half)
        enemy.userData.warningDuration = GAME_CONFIG.ENEMY_YELLOW_WARNING_DURATION;
        enemy.userData.warningType = 'yellow';
        enemy.material.color.setHex(0xffff66);
      } else {
        // Fallback to green bullet if yellow not allowed
        enemy.userData.warningDuration = GAME_CONFIG.ENEMY_GREEN_WARNING_DURATION;
        enemy.userData.warningType = 'green';
        enemy.material.color.setHex(0x66ff66);
      }
    }
  }

  updateEnemyWarnings() {
    this.enemies.forEach(enemy => {
      if (enemy.userData.warningActive) {
        enemy.userData.warningTime++;
        
        // Handle blinking for red bullet warnings
        if (enemy.userData.warningType === 'red') {
          enemy.userData.blinkTimer++;
          if (enemy.userData.blinkTimer >= enemy.userData.blinkRate) {
            enemy.userData.blinkTimer = 0;
            // Toggle between dark red and original color
            if (enemy.material.color.getHex() === 0x660000) {
              enemy.material.color.setHex(enemy.userData.originalColor);
            } else {
              enemy.material.color.setHex(0x660000);
            }
          }
        }
        
        if (enemy.userData.warningTime >= enemy.userData.warningDuration) {
          // Warning complete, shoot bullet and restore color
          this.shootEnemyBullet(enemy, enemy.userData.targetPlayer);
          this.endEnemyWarning(enemy);
        }
      }
    });
  }

  endEnemyWarning(enemy) {
    // Restore original color
    if (enemy.userData.originalColor !== undefined) {
      enemy.material.color.setHex(enemy.userData.originalColor);
    }
    // Clear warning state
    enemy.userData.warningActive = false;
    enemy.userData.warningTime = 0;
    enemy.userData.warningType = undefined;
    enemy.userData.blinkTimer = undefined;
    enemy.userData.blinkRate = undefined;
    enemy.userData.originalColor = undefined;
    enemy.userData.targetPlayer = undefined;
  }

  createBoss(gameEngine) {
    if (DEBUG) console.log('Creating Level 50 Boss');
    
    // Clear any existing enemies
    this.clearAll();
    
    // Create boss group
    const bossGroup = new THREE.Group();
    bossGroup.userData = {
      type: 'boss',
      health: 100, // Boss takes 100 hits to destroy
      maxHealth: 100,
      isBoss: true,
      rotationSpeed: 0.02, // Same rotation speed for all cubes
      fireCooldown: 0, // Boss firing cooldown (30 frames = 0.5 seconds at 60fps)
      fireDelay: 180, // 3 seconds delay before boss can start firing (180 frames at 60fps)
      currentBulletType: 0, // Index for cycling through bullet types
      bulletTypes: ['green', 'red', 'yellow'], // Available bullet types
      moveSpeed: 2.0, // Horizontal movement speed
      moveDirection: 1, // 1 for right, -1 for left
      moveRange: 3, // How far left/right the boss moves from center
      moveTime: 0 // Time counter for movement
    };
    
    // Create 10 large overlapping cubes
    for (let i = 0; i < 10; i++) {
      const geometry = new THREE.BoxGeometry(1.5, 1.5, 1.5); // Large cubes
      const material = new THREE.MeshBasicMaterial({ 
        color: 0xff4444, // Red color
        wireframe: true,
        transparent: true,
        opacity: 0.8
      });
      
      const cube = new THREE.Mesh(geometry, material);
      
      // Random position within a small area (overlapping)
      cube.position.x = (Math.random() - 0.5) * 2; // -1 to 1
      cube.position.y = (Math.random() - 0.5) * 2; // -1 to 1
      cube.position.z = (Math.random() - 0.5) * 2; // -1 to 1
      
      // Random rotation angles
      cube.rotation.x = Math.random() * Math.PI * 2;
      cube.rotation.y = Math.random() * Math.PI * 2;
      cube.rotation.z = Math.random() * Math.PI * 2;
      
      // Store rotation speed
      cube.userData.rotationSpeed = bossGroup.userData.rotationSpeed;
      
      // Store reference to boss for health updates
      cube.userData.boss = bossGroup;
      
      bossGroup.add(cube);
    }
    
    // Position boss in the center of the screen
    const bounds = gameEngine.getVisibleBounds();
    bossGroup.position.x = 0;
    bossGroup.position.y = bounds.top - 2; // Near the top
    bossGroup.position.z = 0;
    
    // Add to scene and enemies array
    this.scene.add(bossGroup);
    this.enemies.push(bossGroup);
    
    if (DEBUG) console.log('Boss created with 10 cubes');
  }

  createFinalBoss(gameEngine) {
    if (DEBUG) console.log('Creating Level 100 Final Boss');
    
    // Clear any existing enemies
    this.clearAll();
    
    // Create final boss group
    const bossGroup = new THREE.Group();
    bossGroup.userData = {
      type: 'finalBoss',
      health: 400, // Final boss takes 400 hits to destroy
      maxHealth: 400,
      isBoss: true,
      isFinalBoss: true, // Special flag for final boss
      rotationSpeed: 0.03, // Faster rotation than level 50 boss
      fireCooldown: 0, // Boss firing cooldown (20 frames = 0.33 seconds at 60fps)
      fireDelay: 180, // 3 seconds delay before boss can start firing (180 frames at 60fps)
      currentBulletType: 0, // Index for cycling through bullet types
      bulletTypes: ['green', 'red', 'yellow'], // Available bullet types
      moveSpeed: 3.0, // Faster horizontal movement
      moveDirection: 1, // 1 for right, -1 for left
      moveRange: 4, // Larger movement range
      moveTime: 0 // Time counter for movement
    };
    
    // Create 15 large overlapping cubes (more than level 50 boss)
    for (let i = 0; i < 15; i++) {
      const geometry = new THREE.BoxGeometry(1.8, 1.8, 1.8); // Larger cubes than level 50 boss
      const material = new THREE.MeshBasicMaterial({ 
        color: 0xff0080, // Pink/magenta color for final boss
        wireframe: true,
        transparent: true,
        opacity: 0.9
      });
      
      const cube = new THREE.Mesh(geometry, material);
      
      // Random position within a larger area (more spread out)
      cube.position.x = (Math.random() - 0.5) * 3; // -1.5 to 1.5
      cube.position.y = (Math.random() - 0.5) * 3; // -1.5 to 1.5
      cube.position.z = (Math.random() - 0.5) * 3; // -1.5 to 1.5
      
      // Random rotation angles
      cube.rotation.x = Math.random() * Math.PI * 2;
      cube.rotation.y = Math.random() * Math.PI * 2;
      cube.rotation.z = Math.random() * Math.PI * 2;
      
      // Store rotation speed
      cube.userData.rotationSpeed = bossGroup.userData.rotationSpeed;
      
      // Store reference to boss for health updates
      cube.userData.boss = bossGroup;
      
      bossGroup.add(cube);
    }
    
    // Position boss in the center of the screen
    const bounds = gameEngine.getVisibleBounds();
    bossGroup.position.x = 0;
    bossGroup.position.y = bounds.top - 2; // Near the top
    bossGroup.position.z = 0;
    
    // Add to scene and enemies array
    this.scene.add(bossGroup);
    this.enemies.push(bossGroup);
    
    if (DEBUG) console.log('Final boss created with 15 cubes');
  }

  shootBossBullet(boss, player) {
    const bulletType = boss.userData.bulletTypes[boss.userData.currentBulletType];
    if (DEBUG) console.log(`Boss firing ${bulletType} bullet`);
    
    // Create a temporary enemy object with the bullet type for the existing shootEnemyBullet method
    const tempEnemy = {
      position: boss.position.clone(),
      userData: {
        warningType: bulletType
      }
    };
    
    // Use the existing bullet shooting logic
    this.shootEnemyBullet(tempEnemy, player);
  }
}
