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
  BOSS_COLLISION_THRESHOLD: 1.0, // Double width for boss hitboxes
  PLAYER_COLLISION_THRESHOLD: 0.7,
  POWERUP_COLLISION_THRESHOLD: 0.6,
  
  // Formation settings
  FORMATION_DISTANCE_THRESHOLD: 2.0,
  FORMATION_OFFSET: 1.5,
  
  // Audio settings
  MASTER_VOLUME: 0.6,
  
  // Explosion settings
  EXPLOSION_DURATION: 60, // frames
  EXPLOSION_PARTICLE_COUNT: 20,
  
  // Enemy bullet settings
  ENEMY_BULLET_GREEN_SPEED: 0.056,
  ENEMY_BULLET_RED_SPEED: 0.10,
  ENEMY_BULLET_YELLOW_SPEED: 0.08,
  ENEMY_BULLET_GREEN_SIZE: 0.3,
  ENEMY_BULLET_RED_SIZE: 0.1,
  ENEMY_BULLET_YELLOW_SIZE: 0.15,
  ENEMY_BULLET_GREEN_SPREAD: Math.PI / 6, // ±15 degrees
  ENEMY_BULLET_RED_SPREAD: Math.PI / 3, // ±30 degrees
  ENEMY_BULLET_YELLOW_SPREAD: Math.PI / 4, // ±22.5 degrees (20% of screen width)
  ENEMY_BULLET_GREEN_CHANCE: 0.005,
  ENEMY_BULLET_RED_CHANCE: 0.005,
  ENEMY_BULLET_YELLOW_CHANCE: 0.003,
  ENEMY_BULLET_GREEN_COOLDOWN: 120,
  ENEMY_BULLET_RED_COOLDOWN: 90,
  ENEMY_BULLET_YELLOW_COOLDOWN: 150,
  ENEMY_BULLET_GREEN_LIFETIME: 600,
  ENEMY_BULLET_RED_LIFETIME: 300,
  ENEMY_BULLET_YELLOW_LIFETIME: 450,
  ENEMY_BULLET_RED_MAX_ANGLE: Math.PI / 6, // 30 degrees from straight down
  ENEMY_BULLET_YELLOW_COUNT: 5, // Base number of bullets in yellow spread
  ENEMY_BULLET_YELLOW_VARIABLE_COUNT_START_LEVEL: 20, // Level when yellow bullets can have variable counts
  ENEMY_BULLET_YELLOW_MULTIPLE_COUNT_START_LEVEL: 40, // Level when yellow bullets can have 3 different counts
  
  // Enemy diving settings
  ENEMY_DIVE_BASE_PROBABILITY: 0.02,
  ENEMY_DIVE_START_LEVEL: 3,
  ENEMY_DIVE_FULL_LEVEL: 20,
  ENEMY_DIVE_COOLDOWN_MIN: 60,
  ENEMY_DIVE_COOLDOWN_MAX: 120,
  ENEMY_DIVE_DURATION_MIN: 120,
  ENEMY_DIVE_DURATION_MAX: 180,
  ENEMY_FORMATION_SWOOP_CHANCE: 0.3,
  
  // Enemy warning settings
  ENEMY_GREEN_WARNING_DURATION: 90, // 1.5 seconds
  ENEMY_RED_WARNING_DURATION: 120, // 2 seconds
  ENEMY_YELLOW_WARNING_DURATION: 60, // 1 second
  ENEMY_RED_WARNING_BLINK_RATE: 12, // frames
  
  // Enemy geometry settings
  ENEMY_BASE_SIZE: 0.7,
  ENEMY_MIN_SIZE: 0.4,
  ENEMY_MAX_SIZE: 1.0,
  ENEMY_SIZE_SCALE_FACTOR: 0.01,
  
  // Player respawn settings
  PLAYER_RESPAWN_DELAY: 5.0, // seconds
  PLAYER_ENEMY_PAUSE_DELAY: 3.0, // seconds
  PLAYER_ENEMY_DIVE_DELAY: 2.0, // seconds
  PLAYER_SPAWN_POSITION_Y: -6.5,
  PLAYER_PORTAL_POSITION_Y: -7.0,
  
  // Portal animation settings
  PORTAL_ANIMATION_DURATION: 240, // frames (4 seconds)
  PORTAL_RING_COUNT: 3,
  PORTAL_RING_BASE_SIZE: 2.0,
  PORTAL_RING_SIZE_INCREMENT: 0.8,
  PORTAL_RING_START_DELAY: 10, // frames between rings
  
  // Green bullet trail settings
  GREEN_BULLET_TRAIL_LENGTH: 6,
  GREEN_BULLET_TRAIL_BASE_SPACING: 0.4,
  GREEN_BULLET_TRAIL_SPACING_VARIATION: 0.3,
  GREEN_BULLET_TRAIL_PARTICLE_SIZE: 0.06,
  GREEN_BULLET_TRAIL_RANDOM_OFFSET: 0.2,
  GREEN_BULLET_TRAIL_WAVE_AMPLITUDE_1: 0.4,
  GREEN_BULLET_TRAIL_WAVE_AMPLITUDE_2: 0.2,
  GREEN_BULLET_TRAIL_TAPER_DISTANCE: 0.1,
  
  // Score calculation settings
  SCORE_ENEMY_BASE: 10,
  SCORE_LEVEL_MULTIPLIER: 0.5,
  SCORE_CHAIN_MULTIPLIER: 0.5,
  SCORE_BLUE_POWERUP_BASE: 2,
  
  // Level progression settings
  ENEMY_LEVEL_COL_INCREMENT: 2, // Add column every 2 levels
  ENEMY_LEVEL_ROW_INCREMENT: 6, // Add row every 6 levels
  ENEMY_MAX_ROWS: 9,
  ENEMY_MAX_COLS: 15,
  
  // Bullet frequency multipliers (level 35+)
  BULLET_FREQUENCY_MULTIPLIER_START_LEVEL: 35,
  BULLET_FREQUENCY_MULTIPLIER_INCREMENT_LEVEL: 10,
  BULLET_FREQUENCY_MULTIPLIER_BASE: 1.5,
  BULLET_FREQUENCY_MULTIPLIER_INCREMENT: 0.5
};
