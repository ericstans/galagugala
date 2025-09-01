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

  static checkPlayerEnemyCollision(player, enemies, threshold = GAME_CONFIG.PLAYER_COLLISION_THRESHOLD) {
    for (let enemy of enemies) {
      if (enemy.position.distanceTo(player.position) < threshold) {
        return enemy;
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
}
