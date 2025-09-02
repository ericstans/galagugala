import * as THREE from 'three';
import { GAME_CONFIG } from '../config/GameConstants.js';

const DEBUG = false;

export class EffectsManager {
  constructor(scene, audioManager = null) {
    this.scene = scene;
    this.audioManager = audioManager;
    this.explosions = [];
    this.explosionGeometry = new THREE.SphereGeometry(0.1, 8, 6);
    this.explosionMaterial = new THREE.MeshBasicMaterial({ color: 0xff6600 });
    
    // Level completion animation
    this.levelCompleteAnimation = null;
    this.colorCycleTimer = 0;
    this.colorCycleSpeed = 0.1;
    this.colorPalette = [
      0x00ffff, // Cyan
      0xff00ff, // Magenta
      0xffff00, // Yellow
      0xff0000, // Red
      0x00ff00, // Green
      0x0000ff, // Blue
      0xff8800, // Orange
      0x8800ff  // Purple
    ];
    
    // Concentric circles for level complete
    this.concentricCircles = [];
    this.circleGeometry = new THREE.RingGeometry(0, 0.1, 32);
    this.circleMaterial = new THREE.MeshBasicMaterial({ 
      color: 0xffffff, 
      transparent: true, 
      opacity: 0.8,
      side: THREE.DoubleSide
    });
    
    // Game Over animation
    this.gameOverAnimation = null;
    this.gameOverText = null;
    this.gameOverParticles = [];
    this.particleGeometry = new THREE.SphereGeometry(0.05, 8, 6);
    this.particleMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    
    // Intro text
    this.introText = null;
    
    // Portal animation for respawn
    this.portalAnimation = null;
    this.portalRings = [];
    this.portalGeometry = new THREE.RingGeometry(0, 0.1, 32);
    this.portalMaterial = new THREE.MeshBasicMaterial({ 
      color: 0x00ffff, 
      transparent: true, 
      opacity: 0.8,
      side: THREE.DoubleSide
    });
    this.portalSoundVoices = null;
  }

  createExplosion(position) {
    const explosionParticles = [];
    const particleCount = GAME_CONFIG.EXPLOSION_PARTICLE_COUNT;
    
    for (let i = 0; i < particleCount; i++) {
      const particle = new THREE.Mesh(this.explosionGeometry, this.explosionMaterial.clone());
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
      
      this.scene.add(particle);
      explosionParticles.push(particle);
    }
    
    this.explosions.push({
      particles: explosionParticles,
      time: 0,
      duration: GAME_CONFIG.EXPLOSION_DURATION
    });
  }

  update() {
    // Update game over animation
    const gameOverFinished = this.updateGameOverAnimation();
    if (gameOverFinished) {
      return { gameOverFinished: true };
    }

    // Update level complete animation
    const levelCompleteResult = this.updateLevelCompleteAnimation();
    if (levelCompleteResult && levelCompleteResult.completed) {
      return { levelCompleteFinished: true };
    }
    
    // Update portal animation
    this.updatePortalAnimation();
    if (levelCompleteResult && levelCompleteResult.color) {
      return { levelCompleteColor: levelCompleteResult.color };
    }

    // Explosion animations
    for (let i = this.explosions.length - 1; i >= 0; i--) {
      const explosion = this.explosions[i];
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
          this.scene.remove(particle);
        });
        this.explosions.splice(i, 1);
        return explosion; // Return completed explosion for game state handling
      }
    }
    return null;
  }

  startLevelCompleteAnimation() {
    this.levelCompleteAnimation = {
      active: true,
      duration: 300, // 5 seconds at 60fps (2.5s expand, 2.5s contract)
      time: 0,
      phase: 'expanding', // 'expanding' or 'contracting'
      maxRadius: 15, // Maximum radius to fill the screen
      circleSpacing: 0.3, // Distance between circles
      nextCircleRadius: 0.1
    };
    this.colorCycleTimer = 0;
    
    // Clear any existing circles
    this.clearConcentricCircles();
    
    // Create the first circle at the center
    this.createConcentricCircle(0, 0, 0.1);
    
    console.log('Starting Robotron 2084 style concentric circle animation!');
  }

  updateLevelCompleteAnimation() {
    if (!this.levelCompleteAnimation || !this.levelCompleteAnimation.active) {
      return false; // Animation not active
    }

    this.levelCompleteAnimation.time++;
    this.colorCycleTimer += this.colorCycleSpeed;

    // Cycle through colors
    const colorIndex = Math.floor(this.colorCycleTimer) % this.colorPalette.length;
    const nextColorIndex = (colorIndex + 1) % this.colorPalette.length;
    const t = this.colorCycleTimer - Math.floor(this.colorCycleTimer);
    
    // Interpolate between current and next color
    const currentColor = new THREE.Color(this.colorPalette[colorIndex]);
    const nextColor = new THREE.Color(this.colorPalette[nextColorIndex]);
    const interpolatedColor = currentColor.clone().lerp(nextColor, t);

    // Update all existing circles with the current color
    this.concentricCircles.forEach(circle => {
      circle.material.color.copy(interpolatedColor);
    });

    // Determine animation phase
    const halfDuration = this.levelCompleteAnimation.duration / 2;
    
    if (this.levelCompleteAnimation.time < halfDuration) {
      // Expanding phase
      this.levelCompleteAnimation.phase = 'expanding';
      
      // Create new circles as needed
      if (this.levelCompleteAnimation.nextCircleRadius <= this.levelCompleteAnimation.maxRadius) {
        this.createConcentricCircle(0, 0, this.levelCompleteAnimation.nextCircleRadius);
        this.levelCompleteAnimation.nextCircleRadius += this.levelCompleteAnimation.circleSpacing;
      }
    } else {
      // Contracting phase
      this.levelCompleteAnimation.phase = 'contracting';
      
      // Remove circles from the inside out
      if (this.concentricCircles.length > 0) {
        const circleToRemove = this.concentricCircles.shift();
        this.scene.remove(circleToRemove);
      }
    }

    // Check if animation is complete
    if (this.levelCompleteAnimation.time >= this.levelCompleteAnimation.duration) {
      this.levelCompleteAnimation.active = false;
      this.clearConcentricCircles();
      console.log('Level complete animation finished!');
      return { completed: true, color: interpolatedColor };
    }

    return { completed: false, color: interpolatedColor }; // Animation still running
  }

  createConcentricCircle(x, y, radius) {
    const circle = new THREE.Mesh(this.circleGeometry, this.circleMaterial.clone());
    circle.position.set(x, y, 0);
    circle.scale.setScalar(radius);
    circle.userData = { radius: radius };
    
    this.scene.add(circle);
    this.concentricCircles.push(circle);
  }

  clearConcentricCircles() {
    this.concentricCircles.forEach(circle => {
      this.scene.remove(circle);
    });
    this.concentricCircles = [];
  }

  startGameOverAnimation() {
    this.gameOverAnimation = {
      active: true,
      time: 0,
      phase: 'fadeIn', // 'fadeIn' | 'display'
      waitingForRestart: false
    };
    
    // Create "GAME OVER" text
    this.createGameOverText();
    
    // Create falling particles
    this.createGameOverParticles();
    
    console.log('Starting Game Over animation!');
  }

  createGameOverText() {
    // Create a more recognizable "GAME OVER" text using multiple boxes per letter
    const textGroup = new THREE.Group();
    
    const letterMaterial = new THREE.MeshBasicMaterial({ 
      color: 0xff0000, 
      transparent: true, 
      opacity: 0 
    });
    
    // Helper function to create a letter from multiple boxes
    const createLetter = (letter, x, y) => {
      const letterGroup = new THREE.Group();
      const boxGeometry = new THREE.BoxGeometry(0.15, 0.15, 0.05);
      
      // Define letter patterns (simplified block letters)
      const patterns = {
        'G': [
          [0, 0], [1, 0], [2, 0], [3, 0], // top
          [0, 1], [0, 2], [0, 3], [0, 4], // left
          [0, 4], [1, 4], [2, 4], [3, 4], // bottom
          [3, 4], [3, 2], [3, 1], // right
          [2, 2], [3, 2]                  // middle right
        ],
        'A': [
          [0, 4], [1, 4], [2, 4], [3, 4], // top
          [0, 3], [0, 2], [0, 1], [0, 0], // left
          [3, 3], [3, 2], [3, 1], [3, 0], // right
          [0, 2], [1, 2], [2, 2], [3, 2]  // middle
        ],
        'M': [
          [0, 0], [0, 1], [0, 2], [0, 3], [0, 4], // left
          [3, 0], [3, 1], [3, 2], [3, 3], [3, 4], // right
          [1, 3], [2, 3]                           // middle
        ],
        'E': [
          [0, 0], [0, 1], [0, 2], [0, 3], [0, 4], // left
          [0, 4], [1, 4], [2, 4], [3, 4],         // top
          [0, 2], [1, 2], [2, 2],                 // middle
          [0, 0], [1, 0], [2, 0], [3, 0]          // bottom
        ],
        'O': [
          [0, 0], [0, 1], [0, 2], [0, 3], [0, 4], // left
          [3, 0], [3, 1], [3, 2], [3, 3], [3, 4], // right
          [0, 4], [1, 4], [2, 4], [3, 4],         // top
          [0, 0], [1, 0], [2, 0], [3, 0]          // bottom
        ],
        'V': [
          [0, 4], [0, 3], [0, 2], [0, 1],         // left
          [3, 4], [3, 3], [3, 2], [3, 1],         // right
          [1, 0], [2, 0]                           // bottom
        ],
        'R': [
          [0, 0], [0, 1], [0, 2], [0, 3], [0, 4], // left
          [0, 4], [1, 4], [2, 4], [3, 4],         // top
          [0, 2], [1, 2], [2, 2], [3, 2],         // middle
          [3, 3], [3, 1], [4, 0]                  // right leg
        ],
        'L': [
          [0, 0], [0, 1], [0, 2], [0, 3], [0, 4], // left
          [0, 0], [1, 0], [2, 0], [3, 0]          // bottom
        ],
        'U': [
          [0, 0], [0, 1], [0, 2], [0, 3], [0, 4], // left
          [3, 0], [3, 1], [3, 2], [3, 3], [3, 4], // right
          [0, 0], [1, 0], [2, 0], [3, 0]          // bottom
        ]
      };
      
      const pattern = patterns[letter] || [];
      pattern.forEach(([px, py]) => {
        const box = new THREE.Mesh(boxGeometry, letterMaterial.clone());
        box.position.set(px * 0.2, py * 0.2, 0);
        letterGroup.add(box);
      });
      
      letterGroup.position.set(x, y, 0);
      return letterGroup;
    };
    
    // Create each letter with proper centering
    // Total width is approximately 7 units (4 letters + 3 spaces + 4 letters)
    // Center offset: -3.5 to center the text
    const centerOffset = -4.25;
    
    // "GAME" - first word
    textGroup.add(createLetter('G', centerOffset + 0, 0));
    textGroup.add(createLetter('A', centerOffset + 1, 0));
    textGroup.add(createLetter('M', centerOffset + 2, 0));
    textGroup.add(createLetter('E', centerOffset + 3, 0));
    
    // "OVER" - second word (with space between words)
    textGroup.add(createLetter('O', centerOffset + 5, 0));
    textGroup.add(createLetter('V', centerOffset + 6, 0));
    textGroup.add(createLetter('E', centerOffset + 7, 0));
    textGroup.add(createLetter('R', centerOffset + 8, 0));
    
    // Center the text group on the canvas
    textGroup.position.set(0, 0, 0);
    
    this.scene.add(textGroup);
    this.gameOverText = textGroup;
  }

  generateRandomTitle() {
    // Generate random title: GA + 3 random selections from ('GA', 'GU', 'LA', 'LU') + LA
    const options = ['GA', 'GU', 'LA', 'LU'];
    const randomSelections = [];
    
    // Pick 3 random selections with duplicates allowed
    for (let i = 0; i < 3; i++) {
      const randomIndex = Math.floor(Math.random() * options.length);
      randomSelections.push(options[randomIndex]);
    }
    
    // Combine: GA + random selections + LA
    const title = 'GA' + randomSelections.join('') + 'LA';
    console.log(`Generated random title: ${title}`);
    return title;
  }

  createIntroText() {
    // Generate random title
    const title = this.generateRandomTitle();
    
    // Create title text using the same style as GAME OVER
    const textGroup = new THREE.Group();
    
    // Create box geometry and material for letters (same as GAME OVER)
    const boxGeometry = new THREE.BoxGeometry(0.15, 0.15, 0.15);
    const letterMaterial = new THREE.MeshBasicMaterial({ 
      color: 0xff0000,
      transparent: true,
      opacity: 0.9
    });
    
    // Helper function to create a letter from multiple boxes
    const createLetter = (letter, x, y) => {
      const letterGroup = new THREE.Group();
      
      // Define letter patterns (simplified block letters)
      const patterns = {
        'G': [
          [0, 0], [1, 0], [2, 0], [3, 0], // top
          [0, 1], [0, 2], [0, 3], [0, 4], // left
          [0, 4], [1, 4], [2, 4], [3, 4], // bottom
          [3, 4], [3, 2], [3, 1], // right
          [2, 2], [3, 2]                  // middle right
        ],
        'A': [
          [0, 4], [1, 4], [2, 4], [3, 4], // top
          [0, 3], [0, 2], [0, 1], [0, 0], // left
          [3, 3], [3, 2], [3, 1], [3, 0], // right
          [0, 2], [1, 2], [2, 2], [3, 2]  // middle
        ],
        'L': [
          [0, 0], [0, 1], [0, 2], [0, 3], [0, 4], // left
          [0, 0], [1, 0], [2, 0], [3, 0]          // bottom
        ],
        'U': [
          [0, 0], [0, 1], [0, 2], [0, 3], [0, 4], // left
          [3, 0], [3, 1], [3, 2], [3, 3], [3, 4], // right
          [0, 0], [1, 0], [2, 0], [3, 0]          // bottom
        ]
      };
      
      const pattern = patterns[letter] || [];
      pattern.forEach(([px, py]) => {
        const box = new THREE.Mesh(boxGeometry, letterMaterial.clone());
        box.position.set(px * 0.2, py * 0.2, 0);
        letterGroup.add(box);
      });
      
      letterGroup.position.set(x, y, 0);
      return letterGroup;
    };
    
    // Create each letter with proper centering
    // Calculate center offset based on title length
    const titleLength = title.length;
    const centerOffset = -(titleLength * 0.5) + 0.5;
    
    // Create letters for the generated title
    for (let i = 0; i < titleLength; i++) {
      const letter = title[i];
      textGroup.add(createLetter(letter, centerOffset + i, 0));
    }
    
    // Center the text group on the canvas
    textGroup.position.set(0, 0, 0);
    
    this.scene.add(textGroup);
    this.introText = textGroup;
    
    // Return the generated title for robot voice announcement
    return title;
  }

  removeIntroText() {
    if (this.introText) {
      this.scene.remove(this.introText);
      this.introText = null;
    }
  }

  createGameOverParticles() {
    // Create falling red particles
    for (let i = 0; i < 50; i++) {
      const particle = new THREE.Mesh(this.particleGeometry, this.particleMaterial.clone());
      particle.position.set(
        (Math.random() - 0.5) * 20, // Random X position
        Math.random() * 10 + 5,     // Start above screen
        (Math.random() - 0.5) * 2   // Random Z position
      );
      
      particle.userData = {
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 0.02, // Random horizontal drift
          -0.05 - Math.random() * 0.05, // Falling speed
          0
        ),
        life: 1.0,
        decay: 0.00167 // Reduced decay for 3x longer lifetime
      };
      
      this.scene.add(particle);
      this.gameOverParticles.push(particle);
    }
  }

  updateGameOverAnimation() {
    if (!this.gameOverAnimation || !this.gameOverAnimation.active) {
      return false; // Animation not active
    }

    this.gameOverAnimation.time++;
    
    // Update text fade
    if (this.gameOverText) {
      const fadeInDuration = 60; // 1 second
      
      let opacity = 0;
      
      if (this.gameOverAnimation.time < fadeInDuration) {
        // Fade in
        opacity = this.gameOverAnimation.time / fadeInDuration;
        this.gameOverAnimation.phase = 'fadeIn';
      } else {
        // Display and stay visible
        opacity = 1.0;
        this.gameOverAnimation.phase = 'display';
        this.gameOverAnimation.waitingForRestart = true;
      }
      
      // Apply opacity to all text letters
      this.gameOverText.traverse((child) => {
        if (child.material) {
          child.material.opacity = opacity;
        }
      });
    }
    
    // Update particles continuously
    for (let i = this.gameOverParticles.length - 1; i >= 0; i--) {
      const particle = this.gameOverParticles[i];
      
      // Update position
      particle.position.add(particle.userData.velocity);
      
      // Fade out
      particle.userData.life -= particle.userData.decay;
      particle.material.opacity = particle.userData.life;
      
      // Remove particles that are off-screen or faded out
      if (particle.position.y < -10 || particle.userData.life <= 0) {
        this.scene.remove(particle);
        this.gameOverParticles.splice(i, 1);
      }
    }

    return false; // Animation stays active until restart
  }

  isWaitingForRestart() {
    return this.gameOverAnimation && this.gameOverAnimation.waitingForRestart;
  }

  clearGameOverAnimation() {
    // Remove text
    if (this.gameOverText) {
      this.scene.remove(this.gameOverText);
      this.gameOverText = null;
    }
    
    // Remove particles
    this.gameOverParticles.forEach(particle => {
      this.scene.remove(particle);
    });
    this.gameOverParticles = [];
    
    // Reset animation
    this.gameOverAnimation = null;
  }

  clearAll() {
    this.explosions.forEach(explosion => {
      explosion.particles.forEach(particle => {
        this.scene.remove(particle);
      });
    });
    this.explosions = [];
    
    // Clear concentric circles
    this.clearConcentricCircles();
    
    // Clear game over animation
    this.clearGameOverAnimation();
    
    // Clear intro text
    this.removeIntroText();
    
    // Reset level complete animation
    this.levelCompleteAnimation = null;
    this.colorCycleTimer = 0;
    this.scene.background = null;
    
    // Clear portal animation
    this.clearPortalAnimation();
  }
  
  startPortalAnimation(position) {
    if (DEBUG) console.log('Starting portal animation at position:', position);
    
    this.portalAnimation = {
      active: true,
      duration: 240, // 4 seconds at 60fps (starts 2 seconds earlier)
      timer: 0,
      position: position.clone()
    };
    
    // Start portal sound effect
    if (this.audioManager) {
      this.portalSoundVoices = this.audioManager.createPortalSound();
    }
    
    // Create 3 concentric portal rings
    this.portalRings = [];
    for (let i = 0; i < 3; i++) {
      const ring = new THREE.Mesh(this.portalGeometry, this.portalMaterial.clone());
      ring.position.copy(position);
      ring.position.z = -0.1; // Behind the ship
      ring.rotation.x = Math.PI / 2; // Face the camera
      ring.userData = {
        index: i,
        maxRadius: 4.0 + (i * 1.6), // Twice as large: 4.0, 5.6, 7.2
        startDelay: i * 10 // Staggered start times
      };
      this.scene.add(ring);
      this.portalRings.push(ring);
    }
  }
  
  updatePortalAnimation() {
    if (!this.portalAnimation || !this.portalAnimation.active) {
      return false;
    }
    
    this.portalAnimation.timer++;
    const progress = this.portalAnimation.timer / this.portalAnimation.duration;
    
    // Update each ring
    let maxPortalSize = 0;
    this.portalRings.forEach(ring => {
      const ringData = ring.userData;
      const ringProgress = Math.max(0, (this.portalAnimation.timer - ringData.startDelay) / (this.portalAnimation.duration - ringData.startDelay));
      
      if (ringProgress > 0) {
        // Expand then contract
        let scale;
        if (ringProgress < 0.5) {
          // Expanding phase
          scale = (ringProgress * 2) * ringData.maxRadius;
        } else {
          // Contracting phase
          scale = ((1 - ringProgress) * 2) * ringData.maxRadius;
        }
        
        ring.scale.set(scale, scale, 1);
        
        // Track maximum portal size for sound modulation
        maxPortalSize = Math.max(maxPortalSize, scale);
        
        // Fade in and out
        const opacity = Math.sin(ringProgress * Math.PI) * 0.8;
        ring.material.opacity = opacity;
        
        // Rotate the rings
        ring.rotation.z += 0.1;
      }
    });
    
    // Update portal sound based on animation progress and size
    if (this.audioManager && this.portalSoundVoices) {
      this.audioManager.updatePortalSound(this.portalSoundVoices, progress, maxPortalSize);
    }
    
    // Check if animation is complete
    if (this.portalAnimation.timer >= this.portalAnimation.duration) {
      this.clearPortalAnimation();
      return true; // Animation finished
    }
    
    return false;
  }
  
  clearPortalAnimation() {
    if (this.portalRings.length > 0) {
      this.portalRings.forEach(ring => {
        this.scene.remove(ring);
        ring.material.dispose();
      });
      this.portalRings = [];
    }
    
    // Stop portal sound effect
    if (this.audioManager && this.portalSoundVoices) {
      this.audioManager.stopPortalSound(this.portalSoundVoices);
      this.portalSoundVoices = null;
    }
    
    this.portalAnimation = null;
  }
}
