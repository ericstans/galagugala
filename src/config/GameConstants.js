// Game configuration constants
export const GAME_CONFIG = {
  // Player settings
  PLAYER_SPEED: 0.08,
  
  // Fire rate settings (frames between shots)
  PRIMARY_FIRE_RATE: 20, // frames between primary shots
  WING_FIRE_RATE: 30, // frames between wing shots
  
  // Bullet settings
  BULLET_SPEED: 0.2,
  
  // Enemy settings
  ENEMY_SPEED: 0.02,
  ENEMY_ROWS: 4,
  ENEMY_COLS: 8,
  ENEMY_X_SPACING: 1.2,
  ENEMY_Y_SPACING: 1.0,
  
  // Power-up settings
  POWERUP_SPAWN_INTERVAL: 300, // frames between power-up spawns (5 seconds at 60fps)
  POWERUP_RED_CHANCE: 0.3, // 30% chance for red power-up (increased for testing)
  
  // Game timing
  GAME_START_DELAY: 180, // 3 seconds at 60fps before enemies start swooping
  
  // Collision thresholds
  COLLISION_THRESHOLD: 0.5,
  PLAYER_COLLISION_THRESHOLD: 0.7,
  POWERUP_COLLISION_THRESHOLD: 0.4,
  
  // Formation settings
  FORMATION_DISTANCE_THRESHOLD: 2.0,
  FORMATION_OFFSET: 1.5,
  
  // Audio settings
  MASTER_VOLUME: 0.3,
  
  // Explosion settings
  EXPLOSION_DURATION: 60, // frames
  EXPLOSION_PARTICLE_COUNT: 20
};
