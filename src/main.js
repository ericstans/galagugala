
import * as THREE from 'three';

// --- Audio System ---
class AudioManager {
  constructor() {
    this.audioContext = null;
    this.sounds = {};
    this.masterVolume = 0.3;
    this.initAudio();
  }

  initAudio() {
    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      console.log('Audio system initialized successfully');
    } catch (e) {
      console.warn('Web Audio API not supported:', e);
    }
  }

  // Create procedural sound effects
  createShootSound() {
    if (!this.audioContext) return null;
    
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);
    
    oscillator.frequency.setValueAtTime(800, this.audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(400, this.audioContext.currentTime + 0.1);
    
    gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(this.masterVolume * 0.3, this.audioContext.currentTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.1);
    
    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + 0.1);
    
    return oscillator;
  }

  createHitSound() {
    if (!this.audioContext) return null;
    
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);
    
    oscillator.frequency.setValueAtTime(200, this.audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(50, this.audioContext.currentTime + 0.2);
    
    gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(this.masterVolume * 0.4, this.audioContext.currentTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.2);
    
    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + 0.2);
    
    return oscillator;
  }

  createDiveSound() {
    if (!this.audioContext) return null;
    
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);
    
    oscillator.frequency.setValueAtTime(300, this.audioContext.currentTime);
    oscillator.frequency.linearRampToValueAtTime(150, this.audioContext.currentTime + 0.3);
    
    gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(this.masterVolume * 0.2, this.audioContext.currentTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.3);
    
    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + 0.3);
    
    return oscillator;
  }

  createExplosionSound() {
    if (!this.audioContext) return null;
    
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    const filter = this.audioContext.createBiquadFilter();
    
    oscillator.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.audioContext.destination);
    
    oscillator.frequency.setValueAtTime(100, this.audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(20, this.audioContext.currentTime + 0.5);
    
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(200, this.audioContext.currentTime);
    filter.frequency.exponentialRampToValueAtTime(50, this.audioContext.currentTime + 0.5);
    
    gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(this.masterVolume * 0.6, this.audioContext.currentTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.5);
    
    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + 0.5);
    
    return oscillator;
  }

  createGameOverSound() {
    if (!this.audioContext) return null;
    
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);
    
    oscillator.frequency.setValueAtTime(150, this.audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(50, this.audioContext.currentTime + 1);
    
    gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(this.masterVolume * 0.5, this.audioContext.currentTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 1);
    
    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + 1);
    
    return oscillator;
  }

  createPowerUpSound() {
    if (!this.audioContext) return null;
    
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);
    
    oscillator.frequency.setValueAtTime(600, this.audioContext.currentTime);
    oscillator.frequency.linearRampToValueAtTime(800, this.audioContext.currentTime + 0.1);
    oscillator.frequency.linearRampToValueAtTime(1000, this.audioContext.currentTime + 0.2);
    
    gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(this.masterVolume * 0.3, this.audioContext.currentTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.3);
    
    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + 0.3);
    
    return oscillator;
  }

  createWinSound() {
    if (!this.audioContext) return null;
    
    // Create a pleasant ascending tone
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);
    
    oscillator.frequency.setValueAtTime(200, this.audioContext.currentTime);
    oscillator.frequency.linearRampToValueAtTime(400, this.audioContext.currentTime + 0.2);
    oscillator.frequency.linearRampToValueAtTime(600, this.audioContext.currentTime + 0.4);
    oscillator.frequency.linearRampToValueAtTime(800, this.audioContext.currentTime + 0.6);
    
    gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(this.masterVolume * 0.4, this.audioContext.currentTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.8);
    
    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + 0.8);
    
    return oscillator;
  }

  // Background ambient sound
  createBackgroundSound() {
    if (!this.audioContext) return null;
    
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    const filter = this.audioContext.createBiquadFilter();
    
    oscillator.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.audioContext.destination);
    
    oscillator.frequency.setValueAtTime(60, this.audioContext.currentTime);
    oscillator.type = 'sine';
    
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(200, this.audioContext.currentTime);
    
    gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(this.masterVolume * 0.05, this.audioContext.currentTime + 2);
    
    oscillator.start(this.audioContext.currentTime);
    
    return { oscillator, gainNode };
  }

  // Public methods to trigger sounds
  playShoot() {
    this.createShootSound();
  }

  playHit() {
    this.createHitSound();
  }

  playDive() {
    this.createDiveSound();
  }

  playExplosion() {
    this.createExplosionSound();
  }

  playGameOver() {
    this.createGameOverSound();
  }

  playPowerUp() {
    this.createPowerUpSound();
  }

  playWin() {
    this.createWinSound();
  }

  startBackgroundSound() {
    if (!this.backgroundSound) {
      this.backgroundSound = this.createBackgroundSound();
    }
  }

  stopBackgroundSound() {
    if (this.backgroundSound) {
      this.backgroundSound.oscillator.stop();
      this.backgroundSound = null;
    }
  }
}

// Initialize audio manager
const audioManager = new AudioManager();

// Start background sound on first user interaction (required by browsers)
let audioStarted = false;
function startAudio() {
  if (!audioStarted && audioManager.audioContext) {
    audioManager.audioContext.resume();
    audioManager.startBackgroundSound();
    audioStarted = true;
  }
}

// Add click listener to start audio
document.addEventListener('click', startAudio, { once: true });
document.addEventListener('keydown', startAudio, { once: true });

// --- Overlay Setup ---
function createOverlay() {
  let overlay = document.getElementById('game-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'game-overlay';
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100vw';
    overlay.style.height = '100vh';
    overlay.style.display = 'none';
    overlay.style.justifyContent = 'center';
    overlay.style.alignItems = 'center';
    overlay.style.background = 'rgba(0,0,0,0.7)';
    overlay.style.zIndex = '1000';
    overlay.style.flexDirection = 'column';
    overlay.style.color = '#fff';
    overlay.style.fontSize = '3rem';
    overlay.style.fontFamily = 'Arial, sans-serif';
    overlay.style.textAlign = 'center';
    overlay.style.transition = 'opacity 0.3s';
    overlay.innerHTML = `
      <div id="overlay-message"></div>
      <div style="font-size:1rem;margin-top:1rem;opacity:0.8;">Press ENTER or click to restart</div>
      <button id="overlay-dismiss" style="margin-top:1rem;font-size:1.5rem;padding:0.5em 1.5em;cursor:pointer;">Dismiss</button>
    `;
    document.body.appendChild(overlay);
    document.getElementById('overlay-dismiss').onclick = () => {
      overlay.style.display = 'none';
      window.location.reload();
    };
    
    // Add ENTER key listener for dismissing overlay
    const handleOverlayKeydown = (e) => {
      if (e.code === 'Enter' && overlay.style.display === 'flex') {
        overlay.style.display = 'none';
        window.location.reload();
      }
    };
    document.addEventListener('keydown', handleOverlayKeydown);
  }
  return overlay;
}
const overlay = createOverlay();
function showOverlay(message) {
  document.getElementById('overlay-message').textContent = message;
  overlay.style.display = 'flex';
  overlay.style.opacity = '1';
}

// --- Game Constants ---
const PLAYER_SPEED = 0.2;
const BULLET_SPEED = 0.4;
const ENEMY_SPEED = 0.02;
const ENEMY_ROWS = 4;
const ENEMY_COLS = 8;
const ENEMY_X_SPACING = 1.2;
const ENEMY_Y_SPACING = 1.0;

// --- Game State ---
let gameState = {
  isPlaying: true,
  playerDestroyed: false,
  explosionComplete: false
};

// --- Scene Setup ---
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.z = 10;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// --- Player Ship ---
function createSpaceshipGeometry() {
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
  
  return new THREE.ExtrudeGeometry(shape, extrudeSettings);
}

const playerGeometry = createSpaceshipGeometry();
const playerMaterial = new THREE.MeshBasicMaterial({ color: 0x00fffc });
const player = new THREE.Mesh(playerGeometry, playerMaterial);
player.rotation.z = Math.PI; // Rotate 180 degrees to point upward
player.position.y = -6.5; // Move further toward the bottom
scene.add(player);

// Add cockpit window
const cockpitGeometry = new THREE.CylinderGeometry(0.08, 0.08, 0.12, 16);
const cockpitMaterial = new THREE.MeshBasicMaterial({ 
  color: 0x0011ff, 
  transparent: true, 
  opacity: 0.7 
});
const cockpit = new THREE.Mesh(cockpitGeometry, cockpitMaterial);
cockpit.rotation.x = Math.PI / 2; // Rotate to be horizontal
cockpit.position.set(0, 0, 0.06); // Position relative to ship center
player.add(cockpit); // Add cockpit as child of player ship

// --- Bullets ---
let bullets = [];
const bulletGeometry = new THREE.CylinderGeometry(0.08, 0.08, 0.6, 8);
const bulletMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00 });

// --- Power-ups ---
let powerUps = [];
const powerUpGeometry = new THREE.SphereGeometry(0.15, 16, 12);
const powerUpMaterial = new THREE.MeshBasicMaterial({ 
  color: 0x00aaff,
  transparent: true,
  opacity: 0.9
});

function createPowerUp(type = 'blue') {
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
  
  const powerUp = new THREE.Mesh(powerUpGeometry, mainMaterial);
  
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
  scene.add(powerUp);
  powerUps.push(powerUp);
  console.log('Total power-ups:', powerUps.length);
  return powerUp;
}

// --- Explosion System ---
let explosions = [];
const explosionGeometry = new THREE.SphereGeometry(0.1, 8, 6);
const explosionMaterial = new THREE.MeshBasicMaterial({ color: 0xff6600 });

function createExplosion(position) {
  const explosionParticles = [];
  const particleCount = 20;
  
  for (let i = 0; i < particleCount; i++) {
    const particle = new THREE.Mesh(explosionGeometry, explosionMaterial.clone());
    particle.position.copy(position);
    
    // Random velocity for each particle
    const velocity = new THREE.Vector3(
      (Math.random() - 0.5) * 0.3,
      (Math.random() - 0.5) * 0.3,
      (Math.random() - 0.5) * 0.1
    );
    
    // Random color variation
    particle.material.color.setHSL(0.1 + Math.random() * 0.2, 1, 0.5 + Math.random() * 0.5);
    
    particle.userData = {
      velocity,
      life: 1.0,
      decay: 0.02 + Math.random() * 0.01
    };
    
    scene.add(particle);
    explosionParticles.push(particle);
  }
  
  explosions.push({
    particles: explosionParticles,
    time: 0,
    duration: 60 // frames
  });
}

// --- Enemies ---
let enemies = [];
const enemyGeometry = new THREE.BoxGeometry(0.7, 0.7, 0.3);
const enemyMaterial = new THREE.MeshBasicMaterial({ color: 0xff3333 });

function createEnemies() {
  enemies = [];
  for (let row = 0; row < ENEMY_ROWS; row++) {
    for (let col = 0; col < ENEMY_COLS; col++) {
      const enemy = new THREE.Mesh(enemyGeometry, enemyMaterial.clone());
      const formationX = (col - ENEMY_COLS / 2 + 0.5) * ENEMY_X_SPACING;
      const formationY = row * ENEMY_Y_SPACING + 1.5;
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
      scene.add(enemy);
      enemies.push(enemy);
    }
  }
}
createEnemies();

// --- Controls ---
const keys = {};
window.addEventListener('keydown', (e) => { keys[e.code] = true; });
window.addEventListener('keyup', (e) => { keys[e.code] = false; });

// --- Shooting ---
let canShoot = true;
function shoot() {
  if (!canShoot) return;
  const bullet = new THREE.Mesh(bulletGeometry, bulletMaterial.clone());
  bullet.position.copy(player.position);
  bullet.position.y += 0.7;
  scene.add(bullet);
  bullets.push(bullet);
  
  // Play shooting sound
  audioManager.playShoot();
  
  canShoot = false;
  setTimeout(() => { canShoot = true; }, 250); // fire rate
}

// --- Collision Detection ---
function checkCollision(obj1, obj2, threshold = 0.5) {
  return obj1.position.distanceTo(obj2.position) < threshold;
}

// --- Advanced Swoop Behaviors ---
function findFormationGroups(enemies) {
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
      if (distance < 2.0) { // Close enough to be in formation
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

function initiateSwoop(enemy, swoopType) {
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

function initiateFormationSwoop(group) {
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

// --- Galaga-style Enemy Movement ---
let diveCooldown = 0;
let powerUpSpawnTimer = 0;
let gameStartTimer = 0;
const POWERUP_SPAWN_INTERVAL = 180; // frames between power-up spawns (3 seconds at 60fps)
const GAME_START_DELAY = 180; // 3 seconds at 60fps before enemies start swooping

function animate() {
  requestAnimationFrame(animate);

  // Player movement (only if not destroyed)
  if (gameState.isPlaying && !gameState.playerDestroyed) {
    if (keys['ArrowLeft'] || keys['KeyA']) {
      player.position.x -= PLAYER_SPEED;
      if (player.position.x < -6) player.position.x = -6;
    }
    if (keys['ArrowRight'] || keys['KeyD']) {
      player.position.x += PLAYER_SPEED;
      if (player.position.x > 6) player.position.x = 6;
    }
    if (keys['Space']) {
      shoot();
    }
    if (keys['KeyP']) {
      // Manual power-up spawn for testing
      createPowerUp();
    }
  }

  // Bullets movement
  for (let i = bullets.length - 1; i >= 0; i--) {
    const bullet = bullets[i];
    bullet.position.y += BULLET_SPEED;
    if (bullet.position.y > 8) {
      scene.remove(bullet);
      bullets.splice(i, 1);
    }
  }

  // Power-up spawning
  if (gameState.isPlaying) {
    powerUpSpawnTimer++;
    if (powerUpSpawnTimer >= POWERUP_SPAWN_INTERVAL) {
      console.log('Spawning power-up!');
      // 10% chance for red power-up, 90% for blue
      const powerUpType = Math.random() < 0.1 ? 'red' : 'blue';
      createPowerUp(powerUpType);
      powerUpSpawnTimer = 0;
    }
  }

  // Power-up movement and animation
  for (let i = powerUps.length - 1; i >= 0; i--) {
    const powerUp = powerUps[i];
    
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
      scene.remove(powerUp);
      powerUps.splice(i, 1);
    }
  }

  // Game start timer
  if (gameState.isPlaying && !gameState.playerDestroyed) {
    gameStartTimer++;
  }

  // Enemy movement
  // 1. Formation enemies stay in place (with a little wiggle)
  // 2. Occasionally, one enemy dives toward the player in a curve (after 3 second delay)
  // 3. If it misses, it returns to formation
  if (diveCooldown > 0) diveCooldown--;
  else if (enemies.length > 0 && gameStartTimer >= GAME_START_DELAY && gameState.isPlaying && !gameState.playerDestroyed && Math.random() < 0.02) {
    const formationEnemies = enemies.filter(e => e.userData.state === 'formation');
    if (formationEnemies.length > 0) {
      // Check for formation swooping (enemies close to each other)
      const formationGroups = findFormationGroups(formationEnemies);
      
      if (formationGroups.length > 0 && Math.random() < 0.3) {
        // Formation swoop - multiple enemies together
        const group = formationGroups[Math.floor(Math.random() * formationGroups.length)];
        initiateFormationSwoop(group);
      } else {
        // Single enemy swoop with variety
        const diver = formationEnemies[Math.floor(Math.random() * formationEnemies.length)];
        initiateSwoop(diver, Math.random());
      }
    }
    diveCooldown = 60 + Math.random() * 60;
  }

  enemies.forEach(enemy => {
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

  // Bullet-enemy collision
  for (let bi = bullets.length - 1; bi >= 0; bi--) {
    const bullet = bullets[bi];
    for (let ei = enemies.length - 1; ei >= 0; ei--) {
      const enemy = enemies[ei];
      if (checkCollision(bullet, enemy, 0.5)) {
        scene.remove(bullet);
        scene.remove(enemy);
        bullets.splice(bi, 1);
        enemies.splice(ei, 1);
        
        // Play hit sound
        audioManager.playHit();
        
        break;
      }
    }
  }

  // Player-power-up collision
  if (gameState.isPlaying && !gameState.playerDestroyed) {
    for (let i = powerUps.length - 1; i >= 0; i--) {
      const powerUp = powerUps[i];
      if (checkCollision(player, powerUp, 0.4)) {
        // Remove power-up
        scene.remove(powerUp);
        powerUps.splice(i, 1);
        
        // Play power-up collection sound
        audioManager.playPowerUp();
        
        // Handle different power-up types
        const powerUpType = powerUp.userData.type;
        if (powerUpType === 'red') {
          console.log('Red power-up collected! (Special effect)');
          // TODO: Add red power-up effects here
        } else {
          console.log('Blue power-up collected! (Standard effect)');
          // TODO: Add blue power-up effects here
        }
      }
    }
  }

  // Game over (enemy reaches player)
  for (let enemy of enemies) {
    if (enemy.position.distanceTo(player.position) < 0.7 && !gameState.playerDestroyed) {
      // Mark player as destroyed
      gameState.playerDestroyed = true;
      gameState.isPlaying = false;
      
      // Create explosion at player position
      createExplosion(player.position);
      
      // Remove player ship (cockpit is automatically removed as it's a child)
      scene.remove(player);
      
      // Play explosion sound
      audioManager.playExplosion();
      
      // Don't show game over overlay yet - wait for explosion to finish
      return;
    }
  }

  // Explosion animations
  for (let i = explosions.length - 1; i >= 0; i--) {
    const explosion = explosions[i];
    explosion.time++;
    
    explosion.particles.forEach(particle => {
      // Update particle position
      particle.position.add(particle.userData.velocity);
      
      // Apply gravity
      particle.userData.velocity.y -= 0.005;
      
      // Fade out particles
      particle.userData.life -= particle.userData.decay;
      particle.material.opacity = particle.userData.life;
      particle.material.transparent = true;
      
      // Scale particles as they fade
      const scale = particle.userData.life;
      particle.scale.setScalar(scale);
    });
    
    // Remove explosion when duration is complete
    if (explosion.time >= explosion.duration) {
      explosion.particles.forEach(particle => {
        scene.remove(particle);
      });
      explosions.splice(i, 1);
      
      // If this was the player explosion and game over hasn't been shown yet
      if (gameState.playerDestroyed && !gameState.explosionComplete) {
        gameState.explosionComplete = true;
        audioManager.playGameOver();
        showOverlay('Game Over');
        return;
      }
    }
  }

  // Win condition (only if game is still playing)
  if (enemies.length === 0 && gameState.isPlaying) {
    audioManager.playWin();
    showOverlay('You Win!');
    return;
  }

  renderer.render(scene, camera);
}

animate();
