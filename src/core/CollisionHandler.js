import * as THREE from 'three';

export class CollisionHandler {
  constructor(scene, audioManager, effectsManager, overlayManager) {
    this.scene = scene;
    this.audio = audioManager;
    this.effects = effectsManager;
    this.overlay = overlayManager;
  }

  handleCollisionResults(collisionResults, player, enemies, powerUps) {
    // Handle bullet-enemy collisions
    for (const collision of collisionResults.bulletCollisions) {
      const { bulletIndex, enemyIndex, bullet, enemy } = collision;
      
      // Mark enemy as destroyed immediately to prevent further collisions
      enemy.userData.isDestroyed = true;
      
      // Remove bullet and enemy
      this.scene.remove(bullet);
      this.scene.remove(enemy);
      player.bullets.splice(bulletIndex, 1);
      enemies.splice(enemyIndex, 1);
      
      // Play hit sound
      this.audio.playHit();
    }
    
    // Handle wing bullet-enemy collisions
    for (const collision of collisionResults.wingBulletCollisions) {
      const { bulletIndex, enemyIndex, bullet, enemy } = collision;
      
      // Mark enemy as destroyed immediately to prevent further collisions
      enemy.userData.isDestroyed = true;
      
      // Remove bullet and enemy
      this.scene.remove(bullet);
      this.scene.remove(enemy);
      player.wingBullets.splice(bulletIndex, 1);
      enemies.splice(enemyIndex, 1);
      
      // Play hit sound
      this.audio.playHit();
    }
    
    // Handle power-up collisions
    for (const powerUpResult of collisionResults.powerUpCollisions) {
      // Handle wing upgrades
      if (powerUpResult.type === 'red' && powerUpResult.wingsAdded && powerUpResult.wingsAdded.length > 0) {
        console.log(`Wing upgrade: ${powerUpResult.wingsAdded.join(', ')} wing(s) added!`);
      }
      
      // Handle chain updates for blue power-ups
      if (powerUpResult.type === 'blue' && powerUpResult.chainCount !== undefined) {
        this.overlay.updateChain(powerUpResult.chainCount);
      }
    }
    
    // Handle wing-enemy collisions
    for (const collision of collisionResults.wingCollisions) {
      const { wing, enemy, side } = collision;
      
      // Mark enemy as destroyed immediately to prevent further collisions
      enemy.userData.isDestroyed = true;
      
      // Create explosion at wing position
      const wingWorldPos = new THREE.Vector3();
      wing.getWorldPosition(wingWorldPos);
      this.effects.createExplosion(wingWorldPos);
      
      // Remove enemy
      enemies.removeEnemy(enemy);
      
      // Destroy wing
      player.destroyWing(wing);
      
      // Play explosion sound
      this.audio.playExplosion();
      
      console.log(`${side} wing destroyed!`);
    }
    
    // Handle player-enemy collisions (game over)
    for (const enemy of collisionResults.playerCollisions) {
      // Mark player as destroyed
      return {
        action: 'gameOver',
        enemy: enemy
      };
    }

    return null;
  }
}
