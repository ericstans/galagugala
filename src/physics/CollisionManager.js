import * as THREE from 'three';
import { GAME_CONFIG } from '../config/GameConstants.js';

export class CollisionManager {
  static checkCollision(obj1, obj2, threshold = GAME_CONFIG.COLLISION_THRESHOLD) {
  const dx = obj1.position.x - obj2.position.x;
  const dy = obj1.position.y - obj2.position.y;
  const dz = obj1.position.z - obj2.position.z;
  return (dx * dx + dy * dy + dz * dz) < (threshold * threshold);
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
    const threshSq = threshold * threshold;
    const px = player.position.x;
    const py = player.position.y;
    const pz = player.position.z;
    for (let enemy of enemies) {
      const dx = enemy.position.x - px;
      const dy = enemy.position.y - py;
      const dz = enemy.position.z - pz;
      if ((dx * dx + dy * dy + dz * dz) < threshSq) return enemy;
    }
    return null;
  }

  static checkWingEnemyCollision(player, enemies, threshold = GAME_CONFIG.COLLISION_THRESHOLD) {
    // Pre-compute wing world positions once
    let leftWingPos = null;
    let rightWingPos = null;
    if (player.leftWing && !player.leftWing.userData.isDestroyed) {
      leftWingPos = new THREE.Vector3();
      player.leftWing.getWorldPosition(leftWingPos);
    }
    if (player.rightWing && !player.rightWing.userData.isDestroyed) {
      rightWingPos = new THREE.Vector3();
      player.rightWing.getWorldPosition(rightWingPos);
    }
    for (let enemy of enemies) {
      const baseThreshold = enemy.userData.isBoss ? GAME_CONFIG.BOSS_COLLISION_THRESHOLD : threshold;
      const threshSq = baseThreshold * baseThreshold;
      if (leftWingPos) {
        const dxL = enemy.position.x - leftWingPos.x;
        const dyL = enemy.position.y - leftWingPos.y;
        const dzL = enemy.position.z - leftWingPos.z;
        if ((dxL * dxL + dyL * dyL + dzL * dzL) < threshSq) {
          return { wing: player.leftWing, enemy, side: 'left' };
        }
      }
      if (rightWingPos) {
        const dxR = enemy.position.x - rightWingPos.x;
        const dyR = enemy.position.y - rightWingPos.y;
        const dzR = enemy.position.z - rightWingPos.z;
        if ((dxR * dxR + dyR * dyR + dzR * dzR) < threshSq) {
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
