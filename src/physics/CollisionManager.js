import * as THREE from 'three';
import { GAME_CONFIG } from '../config/GameConstants.js';

export class CollisionManager {
  static checkCollision(obj1, obj2, threshold = GAME_CONFIG.COLLISION_THRESHOLD) {
    return obj1.position.distanceTo(obj2.position) < threshold;
  }

  static checkBulletEnemyCollision(bullets, enemies, audioManager) {
    for (let bi = bullets.length - 1; bi >= 0; bi--) {
      const bullet = bullets[bi];
      for (let ei = enemies.length - 1; ei >= 0; ei--) {
        const enemy = enemies[ei];
        if (this.checkCollision(bullet, enemy, GAME_CONFIG.COLLISION_THRESHOLD)) {
          return { bulletIndex: bi, enemyIndex: ei, bullet, enemy };
        }
      }
    }
    return null;
  }

  static checkWingBulletEnemyCollision(wingBullets, enemies, audioManager) {
    for (let bi = wingBullets.length - 1; bi >= 0; bi--) {
      const bullet = wingBullets[bi];
      for (let ei = enemies.length - 1; ei >= 0; ei--) {
        const enemy = enemies[ei];
        if (this.checkCollision(bullet, enemy, GAME_CONFIG.COLLISION_THRESHOLD)) {
          return { bulletIndex: bi, enemyIndex: ei, bullet, enemy };
        }
      }
    }
    return null;
  }

  static checkPlayerEnemyCollision(player, enemies, threshold = GAME_CONFIG.PLAYER_COLLISION_THRESHOLD) {
    for (let enemy of enemies) {
      if (enemy.position.distanceTo(player.position) < threshold) {
        return enemy;
      }
    }
    return null;
  }

  static checkWingEnemyCollision(player, enemies, threshold = GAME_CONFIG.COLLISION_THRESHOLD) {
    for (let enemy of enemies) {
      // Check left wing collision
      if (player.leftWing && !player.leftWing.userData.isDestroyed) {
        const leftWingWorldPos = new THREE.Vector3();
        player.leftWing.getWorldPosition(leftWingWorldPos);
        if (enemy.position.distanceTo(leftWingWorldPos) < threshold) {
          return { wing: player.leftWing, enemy, side: 'left' };
        }
      }
      
      // Check right wing collision
      if (player.rightWing && !player.rightWing.userData.isDestroyed) {
        const rightWingWorldPos = new THREE.Vector3();
        player.rightWing.getWorldPosition(rightWingWorldPos);
        if (enemy.position.distanceTo(rightWingWorldPos) < threshold) {
          return { wing: player.rightWing, enemy, side: 'right' };
        }
      }
    }
    return null;
  }

  static checkPlayerPowerUpCollision(player, powerUps, threshold = GAME_CONFIG.POWERUP_COLLISION_THRESHOLD) {
    for (let i = powerUps.length - 1; i >= 0; i--) {
      const powerUp = powerUps[i];
      if (this.checkCollision(player, powerUp, threshold)) {
        return { powerUpIndex: i, powerUp };
      }
    }
    return null;
  }

  // Process all collisions and return results
  static processAllCollisions(player, enemies, powerUps, audioManager, gameState) {
    const results = {
      bulletCollisions: [],
      wingBulletCollisions: [],
      powerUpCollisions: [],
      wingCollisions: [],
      playerCollisions: []
    };

    // Main bullet-enemy collision
    const bulletCollision = this.checkBulletEnemyCollision(
      player.bullets, 
      enemies, 
      audioManager
    );
    
    if (bulletCollision) {
      results.bulletCollisions.push(bulletCollision);
    }
    
    // Wing bullet-enemy collision
    const wingBulletCollision = this.checkWingBulletEnemyCollision(
      player.wingBullets,
      enemies,
      audioManager
    );
    
    if (wingBulletCollision) {
      results.wingBulletCollisions.push(wingBulletCollision);
    }
    
    // Player-power-up collision
    if (gameState.isPlaying && !gameState.playerDestroyed) {
      const powerUpResult = powerUps.checkCollisions(player, audioManager);
      if (powerUpResult) {
        results.powerUpCollisions.push(powerUpResult);
      }
    }
    
    // Check wing-enemy collisions first (only if not invulnerable)
    if (!player.isInvulnerable) {
      const wingCollision = this.checkWingEnemyCollision(player, enemies);
      if (wingCollision && !gameState.playerDestroyed) {
        results.wingCollisions.push(wingCollision);
      }
    }
    
    // Game over (enemy reaches player) - only if not invulnerable
    if (!player.isInvulnerable) {
      const enemyCollision = this.checkPlayerEnemyCollision(player, enemies);
      if (enemyCollision && !gameState.playerDestroyed) {
        results.playerCollisions.push(enemyCollision);
      }
    }

    return results;
  }
}
