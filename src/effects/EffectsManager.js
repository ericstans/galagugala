import * as THREE from 'three';
import { GAME_CONFIG } from '../config/GameConstants.js';

export class EffectsManager {
  constructor(scene) {
    this.scene = scene;
    this.explosions = [];
    this.explosionGeometry = new THREE.SphereGeometry(0.1, 8, 6);
    this.explosionMaterial = new THREE.MeshBasicMaterial({ color: 0xff6600 });
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

  clearAll() {
    this.explosions.forEach(explosion => {
      explosion.particles.forEach(particle => {
        this.scene.remove(particle);
      });
    });
    this.explosions = [];
  }
}
