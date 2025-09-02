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
        // Use boss-specific threshold for bosses, regular threshold for other enemies
        const threshold = enemy.userData.isBoss ? GAME_CONFIG.BOSS_COLLISION_THRESHOLD : GAME_CONFIG.COLLISION_THRESHOLD;
        if (this.checkCollision(bullet, enemy, threshold)) {
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
        // Use boss-specific threshold for bosses, regular threshold for other enemies
        const threshold = enemy.userData.isBoss ? GAME_CONFIG.BOSS_COLLISION_THRESHOLD : GAME_CONFIG.COLLISION_THRESHOLD;
        if (this.checkCollision(bullet, enemy, threshold)) {
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
      // Use boss-specific threshold for bosses, regular threshold for other enemies
      const collisionThreshold = enemy.userData.isBoss ? GAME_CONFIG.BOSS_COLLISION_THRESHOLD : threshold;
      
      // Check left wing collision
      if (player.leftWing && !player.leftWing.userData.isDestroyed) {
        const leftWingWorldPos = new THREE.Vector3();
        player.leftWing.getWorldPosition(leftWingWorldPos);
        if (enemy.position.distanceTo(leftWingWorldPos) < collisionThreshold) {
          return { wing: player.leftWing, enemy, side: 'left' };
        }
      }
      
      // Check right wing collision
      if (player.rightWing && !player.rightWing.userData.isDestroyed) {
        const rightWingWorldPos = new THREE.Vector3();
        player.rightWing.getWorldPosition(rightWingWorldPos);
        if (enemy.position.distanceTo(rightWingWorldPos) < collisionThreshold) {
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

  static checkEnemyBulletPlayerCollision(enemyBullets, player, threshold = GAME_CONFIG.COLLISION_THRESHOLD) {
    for (let i = enemyBullets.length - 1; i >= 0; i--) {
      const bullet = enemyBullets[i];
      if (this.checkCollision(bullet, player, threshold)) {
        return { bulletIndex: i, bullet };
      }
    }
    return null;
  }
}
