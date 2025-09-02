import * as THREE from 'three';
import { GAME_CONFIG } from '../config/GameConstants.js';

export class EffectsManager {
  constructor(scene) {
    this.scene = scene;
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
      duration: 300, // 5 seconds at 60fps
      time: 0,
      phase: 'fadeIn' // 'fadeIn' | 'display' | 'fadeOut'
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
          [3, 4], [3, 3], [3, 2],         // right bottom
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
          [1, 2], [2, 2]                           // middle
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
        decay: 0.005
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
      const displayDuration = 180; // 3 seconds
      const fadeOutDuration = 60; // 1 second
      
      let opacity = 0;
      
      if (this.gameOverAnimation.time < fadeInDuration) {
        // Fade in
        opacity = this.gameOverAnimation.time / fadeInDuration;
        this.gameOverAnimation.phase = 'fadeIn';
      } else if (this.gameOverAnimation.time < fadeInDuration + displayDuration) {
        // Display
        opacity = 1.0;
        this.gameOverAnimation.phase = 'display';
      } else if (this.gameOverAnimation.time < fadeInDuration + displayDuration + fadeOutDuration) {
        // Fade out
        const fadeOutTime = this.gameOverAnimation.time - (fadeInDuration + displayDuration);
        opacity = 1.0 - (fadeOutTime / fadeOutDuration);
        this.gameOverAnimation.phase = 'fadeOut';
      } else {
        // Animation complete
        opacity = 0;
      }
      
      // Apply opacity to all text letters
      this.gameOverText.traverse((child) => {
        if (child.material) {
          child.material.opacity = opacity;
        }
      });
    }
    
    // Update particles
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
    
    // Check if animation is complete
    if (this.gameOverAnimation.time >= this.gameOverAnimation.duration) {
      this.gameOverAnimation.active = false;
      this.clearGameOverAnimation();
      console.log('Game Over animation finished!');
      return true; // Animation completed
    }

    return false; // Animation still running
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
    
    // Reset level complete animation
    this.levelCompleteAnimation = null;
    this.colorCycleTimer = 0;
    this.scene.background = null;
  }
}
