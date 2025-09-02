export class LevelManager {
  constructor() {
    this.currentLevel = this.getLevelFromURL();
  }

  getLevelFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    const levelParam = urlParams.get('level');
    
    console.log(`URL search params: ${window.location.search}`);
    console.log(`Level parameter from URL: ${levelParam}`);
    
    if (levelParam) {
      const level = parseInt(levelParam, 10);
      console.log(`Parsed level: ${level}`);
      if (level >= 1 && level <= 100) { // Reasonable level range
        console.log(`Starting game at level ${level} (from URL parameter)`);
        return level;
      } else {
        console.warn(`Invalid level parameter: ${levelParam}. Must be between 1-100. Starting at level 1.`);
      }
    }
    
    console.log(`No valid level parameter found, defaulting to level 1`);
    return 1; // Default to level 1
  }

  getCurrentLevel() {
    return this.currentLevel;
  }

  nextLevel() {
    this.currentLevel++;
    console.log(`Level progressed to ${this.currentLevel}`);
    return this.currentLevel;
  }

  resetToStartLevel() {
    this.currentLevel = this.getLevelFromURL();
    console.log(`Level reset to ${this.currentLevel} (from URL parameter)`);
    return this.currentLevel;
  }
}
