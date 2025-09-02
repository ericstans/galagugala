import * as THREE from 'three';
import { GAME_CONFIG } from '../config/GameConstants.js';

const DEBUG = false;

export class EnemyManager {
  constructor(scene, level = 1, gameEngine = null) {
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
    
    // Enemy bullet system (level 10+)
    this.enemyBullets = [];
    this.bulletCooldown = 0;
    this.currentLevel = level;
    this.bulletTrails = []; // Store trail particles for green bullets
    
    this.createEnemies(level, gameEngine);
  }

  createEnemies(level = 1, gameEngine = null) {
    this.enemies = [];
    
    // Calculate level-based enemy formation size
    const baseRows = GAME_CONFIG.ENEMY_ROWS;
    const baseCols = GAME_CONFIG.ENEMY_COLS;
    
    // Increase columns every 2 levels, rows every 3 levels
    const additionalCols = Math.floor((level - 1) / 2);
    const additionalRows = Math.floor((level - 1) / 3);
    
    const totalRows = Math.min(baseRows + additionalRows, 8); // Cap at 8 rows
    const totalCols = Math.min(baseCols + additionalCols, 12); // Cap at 12 columns
    
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
    const baseEnemySize = 0.7;
    const sizeScale = Math.max(0.4, Math.min(1.0, 1.0 - (formationArea - 20) * 0.01));
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
        const enemy = new THREE.Mesh(scaledGeometry, this.enemyMaterial.clone());
        
        // Add thicker darker red edges using multiple overlapping lines
        const edgeGeometry = new THREE.EdgesGeometry(scaledGeometry);
        const edgeMaterial = new THREE.LineBasicMaterial({ 
          color: 0xcc1111, // Darker red
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
          enemy.add(edges);
        });
        
        // Center the formation within the visible bounds
        const formationX = (col - (totalCols - 1) / 2) * clampedXSpacing;
        const formationY = bounds.top - topMargin - (row * clampedYSpacing);
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
    else if (!divingDisabled && this.enemies.length > 0 && this.gameStartTimer >= GAME_CONFIG.GAME_START_DELAY && gameState.isPlaying && !gameState.playerDestroyed && Math.random() < 0.02) {
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

    // Enemy bullet system (level 10+)
    if (this.currentLevel >= 10 && !divingDisabled) {
      if (this.bulletCooldown > 0) this.bulletCooldown--;
      else if (this.enemies.length > 0 && gameState.isPlaying && !gameState.playerDestroyed) {
        // Different bullet types based on level
        const shootChance = this.currentLevel >= 20 ? 0.01 : 0.005; // Red bullets are rarer
        if (Math.random() < shootChance) {
          // Find formation enemies that can shoot
          const formationEnemies = this.enemies.filter(e => e.userData.state === 'formation' && !e.userData.warningActive);
          if (formationEnemies.length > 0) {
            const shooter = formationEnemies[Math.floor(Math.random() * formationEnemies.length)];
            this.startEnemyWarning(shooter, player);
          }
          // Different cooldowns based on bullet type
          this.bulletCooldown = this.currentLevel >= 20 ? 
            (90 + Math.random() * 60) : // Red bullets: 1.5-2.5 seconds
            (120 + Math.random() * 60); // Green bullets: 2-3 seconds
        }
      }
    }

    // Update enemy warnings
    this.updateEnemyWarnings();

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
    
    if (this.currentLevel >= 20) {
      // Red bullets (level 20+) - thick cylinders with high spread
      bulletGeometry = new THREE.CylinderGeometry(0.1, 0.1, 0.5, 8);
      bulletMaterial = new THREE.MeshBasicMaterial({ color: 0xff6666 });
      bulletSpeed = 0.15;
      spreadAmount = Math.PI / 3; // ±30 degrees
    } else {
      // Green bullets (level 10-19) - large circles, easier to dodge
      bulletGeometry = new THREE.SphereGeometry(0.3, 8, 6); // Twice as wide (0.15 * 2)
      bulletMaterial = new THREE.MeshBasicMaterial({ color: 0x66ff66 });
      bulletSpeed = 0.056; // 70% of 0.08 (0.08 * 0.7)
      spreadAmount = Math.PI / 6; // ±15 degrees (less spread)
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
    
    // Add some vertical spread as well (less for green bullets)
    const verticalSpreadAmount = this.currentLevel >= 20 ? 0.3 : 0.15;
    const verticalSpread = (Math.random() - 0.5) * verticalSpreadAmount;
    direction.y += verticalSpread;
    direction.normalize();
    
    // Store bullet data
    bullet.userData = {
      velocity: direction.multiplyScalar(bulletSpeed),
      lifetime: 0,
      isGreen: this.currentLevel < 20,
      trailParticles: []
    };
    
    // Create trail for green bullets
    if (bullet.userData.isGreen) {
      this.createBulletTrail(bullet);
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
      const maxLifetime = bullet.userData.isGreen ? 600 : 300;
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
    // Create trail particles with double-sine wave pattern
    const trailLength = 8; // Number of trail particles
    const trailSpacing = 0.3; // Distance between particles
    
    for (let i = 0; i < trailLength; i++) {
      // Create first trail particle
      const trailGeometry1 = new THREE.SphereGeometry(0.08, 6, 4);
      const trailMaterial1 = new THREE.MeshBasicMaterial({ 
        color: 0x66ff66,
        transparent: true,
        opacity: 0.6 - (i * 0.05) // Fade out along trail
      });
      const trailParticle1 = new THREE.Mesh(trailGeometry1, trailMaterial1);
      
      // Create second trail particle (180deg out of phase)
      const trailGeometry2 = new THREE.SphereGeometry(0.08, 6, 4);
      const trailMaterial2 = new THREE.MeshBasicMaterial({ 
        color: 0x66ff66,
        transparent: true,
        opacity: 0.6 - (i * 0.05) // Fade out along trail
      });
      const trailParticle2 = new THREE.Mesh(trailGeometry2, trailMaterial2);
      
      // Calculate bullet direction for positioning and rotation
      const bulletDirection = bullet.userData.velocity.clone().normalize();
      
      // Position both trail particles behind bullet along its direction
      trailParticle1.position.copy(bullet.position);
      trailParticle2.position.copy(bullet.position);
      const trailOffset = bulletDirection.clone().multiplyScalar(-trailSpacing * (i + 1));
      trailParticle1.position.add(trailOffset);
      trailParticle2.position.add(trailOffset);
      
      // Add sinuous wave pattern (propagates along trail length)
      const time = bullet.userData.lifetime * 0.1;
      const distanceFromBullet = i / (trailLength - 1); // 0 at bullet, 1 at end
      // Taper only for first 5 pixels (about 0.1 units) from bullet
      const actualDistanceFromBullet = i * trailSpacing;
      const sineIntensity = actualDistanceFromBullet < 0.1 ? 0 : Math.pow((actualDistanceFromBullet - 0.1) / 2.0, 2);
      
      // Create wave that propagates along the trail (not just time-based)
      const wavePhase = time * 1.5 - distanceFromBullet * 6; // Slower wave propagation
      const sine1 = Math.sin(wavePhase) * 0.5 * sineIntensity; // Higher amplitude
      const sine2 = Math.sin(wavePhase * 2) * 0.25 * sineIntensity; // Higher amplitude
      
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
    const trailSpacing = 0.3;
    const time = bullet.userData.lifetime * 0.1;
    const trailLength = bullet.userData.trailParticles.length / 2; // Divide by 2 since we have 2 trails per position
    
    // Calculate bullet direction for rotation
    const bulletDirection = bullet.userData.velocity.clone().normalize();
    
    bullet.userData.trailParticles.forEach((particle, index) => {
      // Calculate which trail segment this particle belongs to
      const trailSegment = Math.floor(index / 2);
      const isFirstTrail = index % 2 === 0;
      
      // Update position to follow bullet along its direction
      particle.position.copy(bullet.position);
      const trailOffset = bulletDirection.clone().multiplyScalar(-trailSpacing * (trailSegment + 1));
      particle.position.add(trailOffset);
      
      // Add sinuous wave pattern (propagates along trail length)
      const distanceFromBullet = trailSegment / (trailLength - 1); // 0 at bullet, 1 at end
      // Taper only for first 5 pixels (about 0.1 units) from bullet
      const actualDistanceFromBullet = trailSegment * trailSpacing;
      const sineIntensity = actualDistanceFromBullet < 0.1 ? 0 : Math.pow((actualDistanceFromBullet - 0.1) / 2.0, 2);
      
      // Create wave that propagates along the trail (not just time-based)
      const wavePhase = time * 1.5 - distanceFromBullet * 6; // Slower wave propagation
      const sine1 = Math.sin(wavePhase) * 0.5 * sineIntensity; // Higher amplitude
      const sine2 = Math.sin(wavePhase * 2) * 0.25 * sineIntensity; // Higher amplitude
      
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
      const fadeAmount = 0.6 - (trailSegment * 0.05) - (bullet.userData.lifetime * 0.001);
      particle.material.opacity = Math.max(0, fadeAmount);
    });
  }

  cleanupBulletTrail(bullet) {
    bullet.userData.trailParticles.forEach(particle => {
      this.scene.remove(particle);
    });
    bullet.userData.trailParticles = [];
  }

  startEnemyWarning(enemy, player) {
    // Only apply warning for green bullets (level 10-19)
    if (this.currentLevel < 20) {
      // Store original color and player reference
      enemy.userData.originalColor = enemy.material.color.getHex();
      enemy.userData.targetPlayer = player;
      // Set warning state
      enemy.userData.warningActive = true;
      enemy.userData.warningTime = 0;
      enemy.userData.warningDuration = 90; // 1.5 seconds at 60fps
      // Change to green
      enemy.material.color.setHex(0x66ff66);
    } else {
      // For red bullets, shoot immediately
      this.shootEnemyBullet(enemy, player);
    }
  }

  updateEnemyWarnings() {
    this.enemies.forEach(enemy => {
      if (enemy.userData.warningActive) {
        enemy.userData.warningTime++;
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
    enemy.userData.originalColor = undefined;
    enemy.userData.targetPlayer = undefined;
  }
}
