import { GAME_CONFIG } from '../config/GameConstants.js';

const DEBUG = false;

export class AudioManager {
  constructor() {
    this.audioContext = null;
    this.sounds = {};
    this.masterVolume = GAME_CONFIG.MASTER_VOLUME;
    this.backgroundSound = null;
    
    // Soundtrack layers
    this.soundtrackLayers = {
      kick: null,    // Layer 1: Four on the Floor kick drum
      hats: null,    // Layer 2: Hats (offset by 8th note)
      bass: null,    // Layer 3: Bassline
      chords: null   // Layer 4: Chords
    };
    
    this.currentLevel = 0; // Start at 0 so first updateSoundtrack call always starts layers
    this.isPlaying = false;
    this.bpm = 128;
    this.beatInterval = null;
    this.masterGain = null;
    this.soundtrackBus = null;
    this.reverb = null;
    this.currentChord = null;
    this.bassBeatCounter = 0; // Track beats for chord changes
    this.globalBeatCounter = 0; // Global beat counter for synchronization
    this.lastBeatTime = 0; // Track when the last beat occurred
    this.centralBeatScheduler = null; // Central beat scheduler for all layers
    this.activeLayers = new Set(); // Track which layers are currently active
    
    // Bongo rhythm pattern system
    this.bongoPattern = null; // 4-bar pattern in 8th notes
    this.bongoPatternPosition = 0; // Current position in pattern
    this.bongoPatternLength = 32; // 4 bars * 8 beats = 32 8th notes
    
    // Arp system for plasma storms
    this.arpActive = false; // Whether arp is currently active
    this.arpPhase = 'warning'; // 'warning' or 'storm'
    this.arpNoteIndex = 0; // Current note in chord progression
    
    // Random voice selection
    this.selectedVoice = null;
    this.voiceSelected = false;
    
    this.initAudio();
  }

  initAudio() {
    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      this.masterGain = this.audioContext.createGain();
      this.masterGain.connect(this.audioContext.destination);
      this.masterGain.gain.value = this.masterVolume;
      
      // Initialize random voice selection
      this.initializeVoiceSelection();
      
      // Create soundtrack bus with reverb
      this.soundtrackBus = this.audioContext.createGain();
      this.reverb = this.audioContext.createConvolver();
      
      // Create a simple reverb impulse response
      const reverbLength = this.audioContext.sampleRate * 2; // 2 seconds
      const impulse = this.audioContext.createBuffer(2, reverbLength, this.audioContext.sampleRate);
      
      for (let channel = 0; channel < 2; channel++) {
        const channelData = impulse.getChannelData(channel);
        for (let i = 0; i < reverbLength; i++) {
          channelData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / reverbLength, 2);
        }
      }
      
      this.reverb.buffer = impulse;
      
      // Create reverb mix controls
      this.reverbDryGain = this.audioContext.createGain();
      this.reverbWetGain = this.audioContext.createGain();
      
      // Connect soundtrack bus to both dry and wet paths
      this.soundtrackBus.connect(this.reverbDryGain);
      this.soundtrackBus.connect(this.reverb);
      this.reverb.connect(this.reverbWetGain);
      
      // Both paths go to master gain
      this.reverbDryGain.connect(this.masterGain);
      this.reverbWetGain.connect(this.masterGain);
      
      // Set reverb mix (light reverb)
      this.reverbDryGain.gain.value = 0.7; // Dry signal
      this.reverbWetGain.gain.value = 0.3; // Wet signal
      
      if (DEBUG) console.log('Audio system initialized successfully');
    } catch (e) {
      if (DEBUG) console.warn('Web Audio API not supported:', e);
    }
  }

  // Create procedural sound effects
  createShootSound() {
    if (!this.audioContext) return null;
    
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);
    
    oscillator.frequency.setValueAtTime(800, this.audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(400, this.audioContext.currentTime + 0.1);
    
    gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(this.masterVolume * 0.3, this.audioContext.currentTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.1);
    
    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + 0.1);
    
    return oscillator;
  }

  createHitSound() {
    if (!this.audioContext) return null;
    
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);
    
    oscillator.frequency.setValueAtTime(200, this.audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(50, this.audioContext.currentTime + 0.2);
    
    gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(this.masterVolume * 0.4, this.audioContext.currentTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.2);
    
    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + 0.2);
    
    return oscillator;
  }

  createDiveSound() {
    if (!this.audioContext) return null;
    
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);
    
    oscillator.frequency.setValueAtTime(300, this.audioContext.currentTime);
    oscillator.frequency.linearRampToValueAtTime(150, this.audioContext.currentTime + 0.3);
    
    gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(this.masterVolume * 0.2, this.audioContext.currentTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.3);
    
    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + 0.3);
    
    return oscillator;
  }

  createExplosionSound() {
    if (!this.audioContext) return null;
    
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    const filter = this.audioContext.createBiquadFilter();
    
    oscillator.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.audioContext.destination);
    
    oscillator.frequency.setValueAtTime(100, this.audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(20, this.audioContext.currentTime + 0.5);
    
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(200, this.audioContext.currentTime);
    filter.frequency.exponentialRampToValueAtTime(50, this.audioContext.currentTime + 0.5);
    
    gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(this.masterVolume * 0.6, this.audioContext.currentTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.5);
    
    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + 0.5);
    
    return oscillator;
  }

  createPowerUpSound(chainCount = 1) {
    if (!this.audioContext) return null;
    
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);
    
    // Base frequencies for the ascending sound
    const baseFreq1 = 600;
    const baseFreq2 = 800;
    const baseFreq3 = 1000;
    
    // Increase pitch based on chain count (each chain adds ~50Hz)
    const pitchBoost = (chainCount - 1) * 50;
    const freq1 = baseFreq1 + pitchBoost;
    const freq2 = baseFreq2 + pitchBoost;
    const freq3 = baseFreq3 + pitchBoost;
    
    oscillator.frequency.setValueAtTime(freq1, this.audioContext.currentTime);
    oscillator.frequency.linearRampToValueAtTime(freq2, this.audioContext.currentTime + 0.1);
    oscillator.frequency.linearRampToValueAtTime(freq3, this.audioContext.currentTime + 0.2);
    
    gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(this.masterVolume * 0.3, this.audioContext.currentTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.3);
    
    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + 0.3);
    
    return oscillator;
  }

  createGameOverSound() {
    if (!this.audioContext) return null;
    
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);
    
    oscillator.frequency.setValueAtTime(150, this.audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(50, this.audioContext.currentTime + 1);
    
    gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(this.masterVolume * 0.5, this.audioContext.currentTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 1);
    
    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + 1);
    
    return oscillator;
  }

  createWinSound() {
    if (!this.audioContext) return null;
    
    // Create a pleasant ascending tone
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);
    
    oscillator.frequency.setValueAtTime(200, this.audioContext.currentTime);
    oscillator.frequency.linearRampToValueAtTime(400, this.audioContext.currentTime + 0.2);
    oscillator.frequency.linearRampToValueAtTime(600, this.audioContext.currentTime + 0.4);
    oscillator.frequency.linearRampToValueAtTime(800, this.audioContext.currentTime + 0.6);
    
    gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(this.masterVolume * 0.4, this.audioContext.currentTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.8);
    
    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + 0.8);
    
    return oscillator;
  }

  createChainBreakSound() {
    if (!this.audioContext) return null;
    
    // Create a descending "failure" tone with some dissonance
    const oscillator1 = this.audioContext.createOscillator();
    const oscillator2 = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    const filter = this.audioContext.createBiquadFilter();
    
    // Connect oscillators to filter, then to gain
    oscillator1.connect(filter);
    oscillator2.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.audioContext.destination);
    
    // First oscillator: descending tone
    oscillator1.frequency.setValueAtTime(400, this.audioContext.currentTime);
    oscillator1.frequency.exponentialRampToValueAtTime(200, this.audioContext.currentTime + 0.3);
    oscillator1.frequency.exponentialRampToValueAtTime(100, this.audioContext.currentTime + 0.6);
    
    // Second oscillator: slightly dissonant for tension
    oscillator2.frequency.setValueAtTime(450, this.audioContext.currentTime);
    oscillator2.frequency.exponentialRampToValueAtTime(225, this.audioContext.currentTime + 0.3);
    oscillator2.frequency.exponentialRampToValueAtTime(112, this.audioContext.currentTime + 0.6);
    
    // Low-pass filter for a more muted, disappointing sound
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, this.audioContext.currentTime);
    filter.frequency.exponentialRampToValueAtTime(200, this.audioContext.currentTime + 0.6);
    
    // Volume envelope: quick attack, slow decay
    gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(this.masterVolume * 0.25, this.audioContext.currentTime + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.8);
    
    oscillator1.start(this.audioContext.currentTime);
    oscillator2.start(this.audioContext.currentTime);
    oscillator1.stop(this.audioContext.currentTime + 0.8);
    oscillator2.stop(this.audioContext.currentTime + 0.8);
    
    return [oscillator1, oscillator2];
  }

  createGreenBulletSound() {
    if (!this.audioContext) return null;
    
    // Create a quick, sharp "pew" sound for green bullets
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    const filter = this.audioContext.createBiquadFilter();
    
    oscillator.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.audioContext.destination);
    
    // Quick frequency sweep from high to mid
    oscillator.frequency.setValueAtTime(800, this.audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(400, this.audioContext.currentTime + 0.1);
    
    // High-pass filter for a sharp, laser-like sound
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(300, this.audioContext.currentTime);
    
    // Quick attack and decay
    gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(this.masterVolume * 0.3, this.audioContext.currentTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.15);
    
    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + 0.15);
    
    return oscillator;
  }

  createRedBulletChargeSound() {
    if (!this.audioContext) return null;
    
    // Create a building "charge up" sound for red bullets
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    const filter = this.audioContext.createBiquadFilter();
    
    oscillator.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.audioContext.destination);
    
    // Rising frequency for charge effect - starts immediately, lasts 1 second
    oscillator.frequency.setValueAtTime(200, this.audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(600, this.audioContext.currentTime + 1.0);
    
    // Low-pass filter that opens up during charge
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(400, this.audioContext.currentTime);
    filter.frequency.exponentialRampToValueAtTime(1200, this.audioContext.currentTime + 1.0);
    
    // Building volume with slight tremolo effect
    gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(this.masterVolume * 0.1, this.audioContext.currentTime + 0.1);
    gainNode.gain.linearRampToValueAtTime(this.masterVolume * 0.2, this.audioContext.currentTime + 1.0);
    
    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + 1.0);
    
    return oscillator;
  }

  createRedBulletFireSound() {
    if (!this.audioContext) return null;
    
    // Create a powerful "boom" sound for red bullet firing
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    const filter = this.audioContext.createBiquadFilter();
    
    oscillator.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.audioContext.destination);
    
    // Sharp frequency drop for impact
    oscillator.frequency.setValueAtTime(600, this.audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(100, this.audioContext.currentTime + 0.2);
    
    // Low-pass filter for a deep, powerful sound
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1200, this.audioContext.currentTime);
    filter.frequency.exponentialRampToValueAtTime(200, this.audioContext.currentTime + 0.2);
    
    // Sharp attack with quick decay
    gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(this.masterVolume * 0.5, this.audioContext.currentTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.3);
    
    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + 0.3);
    
    return oscillator;
  }

  createYellowBulletSound() {
    if (!this.audioContext) return null;
    
    // Create a rapid "rat-tat-tat" sound for yellow bullet spread
    const oscillators = [];
    
    for (let i = 0; i < 3; i++) {
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();
      const filter = this.audioContext.createBiquadFilter();
      
      oscillator.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(this.audioContext.destination);
      
      // Higher frequency for yellow bullets
      oscillator.frequency.setValueAtTime(800 + (i * 100), this.audioContext.currentTime);
      oscillator.type = 'square';
      
      // Quick filter sweep
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(2000, this.audioContext.currentTime);
      filter.frequency.exponentialRampToValueAtTime(400, this.audioContext.currentTime + 0.1);
      
      // Quick burst with slight delay for each oscillator
      const startTime = this.audioContext.currentTime + (i * 0.02);
      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(this.masterVolume * 0.08, startTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + 0.08);
      
      oscillator.start(startTime);
      oscillator.stop(startTime + 0.08);
      
      oscillators.push(oscillator);
    }
    
    return oscillators;
  }

  // Background ambient sound
  createBackgroundSound() {
    if (!this.audioContext) return null;
    
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    const filter = this.audioContext.createBiquadFilter();
    
    oscillator.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.audioContext.destination);
    
    oscillator.frequency.setValueAtTime(60, this.audioContext.currentTime);
    oscillator.type = 'sine';
    
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(200, this.audioContext.currentTime);
    
    gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(this.masterVolume * 0.05, this.audioContext.currentTime + 2);
    
    oscillator.start(this.audioContext.currentTime);
    
    return { oscillator, gainNode };
  }

  // Public methods to trigger sounds
  playShoot() {
    if (!this.audioContext) return;
    this.createShootSound();
  }

  playHit() {
    if (!this.audioContext) return;
    this.createHitSound();
  }

  playDive() {
    if (!this.audioContext) return;
    this.createDiveSound();
  }

  playExplosion() {
    if (!this.audioContext) return;
    this.createExplosionSound();
  }

  playPowerUp(chainCount = 1) {
    if (!this.audioContext) return;
    this.createPowerUpSound(chainCount);
  }

  playGameOver() {
    if (!this.audioContext) return;
    this.createGameOverSound();
  }

  playWin() {
    if (!this.audioContext) return;
    this.createWinSound();
  }

  playChainBreak() {
    if (!this.audioContext) return;
    this.createChainBreakSound();
  }

  playGreenBulletFire() {
    if (!this.audioContext) return;
    this.createGreenBulletSound();
  }

  playRedBulletCharge() {
    if (!this.audioContext) return;
    this.createRedBulletChargeSound();
  }

  playRedBulletFire() {
    if (!this.audioContext) return;
    this.createRedBulletFireSound();
  }

  playYellowBulletFire() {
    if (!this.audioContext) return;
    this.createYellowBulletSound();
  }

  startBackgroundSound() {
    if (!this.audioContext) return;
    if (!this.backgroundSound) {
      this.backgroundSound = this.createBackgroundSound();
    }
  }

  stopBackgroundSound() {
    if (!this.audioContext) return;
    if (this.backgroundSound) {
      this.backgroundSound.oscillator.stop();
      this.backgroundSound = null;
    }
  }

  // Soundtrack layer methods
  createKickDrum() {
    if (!this.audioContext) return null;
    
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    const filter = this.audioContext.createBiquadFilter();
    const saturationGain = this.audioContext.createGain();
    
    oscillator.connect(filter);
    filter.connect(saturationGain);
    saturationGain.connect(gainNode);
    gainNode.connect(this.soundtrackBus);
    
    oscillator.type = 'sine';
    // 808-style pitch envelope: start high, drop to sub-bass
    oscillator.frequency.setValueAtTime(120, this.audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(20, this.audioContext.currentTime + 0.3);
    
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(200, this.audioContext.currentTime);
    filter.frequency.exponentialRampToValueAtTime(50, this.audioContext.currentTime + 0.1);
    
    // Saturation for punch
    saturationGain.gain.setValueAtTime(1.5, this.audioContext.currentTime);
    
    // Longer 808-style decay
    gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.7, this.audioContext.currentTime + 0.005);
    gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.8);
    
    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + 0.8);
    
    return oscillator;
  }

  createHats() {
    if (!this.audioContext) return null;
    
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    const filter = this.audioContext.createBiquadFilter();
    
    oscillator.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.soundtrackBus);
    
    oscillator.type = 'square';
    oscillator.frequency.setValueAtTime(8000, this.audioContext.currentTime);
    
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(5000, this.audioContext.currentTime);
    
    gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.1, this.audioContext.currentTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.05);
    
    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + 0.05);
    
    return oscillator;
  }

  selectRandomChord() {
          const chordProgressions = {
        'Cmin': [261.63, 311.13, 392.00],      // C4, Eb4, G4
        'Cmin7': [261.63, 311.13, 392.00, 466.16], // C4, Eb4, G4, Bb4
        'Dmin': [293.66, 349.23, 440.00],      // D4, F4, A4
        'EbMaj': [311.13, 392.00, 466.16],     // Eb4, G4, Bb4
        'Fmin7': [349.23, 415.30, 523.25, 622.25], // F4, Ab4, C5, Eb5
        'Gmin7': [392.00, 466.16, 587.33, 698.46]  // G4, Bb4, D5, F5
      };
    
    const chordNames = Object.keys(chordProgressions);
    this.currentChord = chordNames[Math.floor(Math.random() * chordNames.length)];
    return this.currentChord;
  }

  getSecondaryDominant(chordName) {
    // Secondary dominants: V7 of each chord
    // Each dominant 7th chord resolves to its target chord
    const secondaryDominants = {
      'Cmin': [392.00, 466.16, 523.25, 622.25],    // G7 (G, B, D, F) - resolves to Cmin
      'Cmin7': [392.00, 466.16, 523.25, 622.25],   // G7 (G, B, D, F) - resolves to Cmin7
      'Dmin': [440.00, 523.25, 587.33, 698.46],    // A7 (A, C#, E, G) - resolves to Dmin
      'EbMaj': [466.16, 554.37, 622.25, 739.99],   // Bb7 (Bb, D, F, Ab) - resolves to EbMaj
      'Fmin7': [523.25, 622.25, 698.46, 830.61],   // C7 (C, E, G, Bb) - resolves to Fmin7
      'Gmin7': [587.33, 698.46, 783.99, 932.33]    // D7 (D, F#, A, C) - resolves to Gmin7
    };
    
    return secondaryDominants[chordName] || null;
  }

  createBassline() {
    if (!this.audioContext) return null;
    
    // Define root notes for each chord (one octave below)
    const chordRoots = {
      'Cmin': 65.41,    // C3
      'Cmin7': 65.41,   // C3
      'Dmin': 73.42,    // D3
      'EbMaj': 77.78,   // Eb3
      'Fmin7': 87.31,   // F3
      'Gmin7': 98.00    // G3
    };
    
    // Define 3rd notes for each chord (one octave below)
    const chordThirds = {
      'Cmin': 77.78,    // Eb3 (minor 3rd)
      'Cmin7': 77.78,   // Eb3 (minor 3rd)
      'Dmin': 87.31,    // F3 (minor 3rd)
      'EbMaj': 98.00,   // G3 (major 3rd)
      'Fmin7': 103.83,  // Ab3 (minor 3rd)
      'Gmin7': 116.54   // Bb3 (minor 3rd)
    };
    
    // Use the current chord or select a new one
    if (!this.currentChord) {
      this.selectRandomChord();
    }
    
    // Determine which note to play based on beat position
    let noteFreq;
    let noteType;
    
    if (this.bassBeatCounter % 4 === 3) {
      // Beat 3: 50% chance to play 3rd instead of root
      if (Math.random() < 0.5) {
        noteFreq = chordThirds[this.currentChord];
        noteType = '3rd';
      } else {
        noteFreq = chordRoots[this.currentChord];
        noteType = 'root';
      }
    } else {
      // All other beats: play root
      noteFreq = chordRoots[this.currentChord];
      noteType = 'root';
    }
    
    // Determine bass timbre based on level (switch every 15 levels)
    const timbreIndex = Math.floor((this.currentLevel - 1) / 15) % 3; // 0, 1, or 2
    
    console.log(`Bass playing ${noteType} note for: ${this.currentChord} (${noteFreq}Hz) on beat ${(this.bassBeatCounter % 4) + 1} with timbre ${timbreIndex + 1}`);
    
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    const filter = this.audioContext.createBiquadFilter();
    
    oscillator.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.soundtrackBus);
    
    // Set oscillator type and filter based on timbre
    switch (timbreIndex) {
      case 0:
        // Original timbre: Sawtooth with 200Hz lowpass
        oscillator.type = 'sawtooth';
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(200, this.audioContext.currentTime);
        break;
      case 1:
        // Second timbre: Triangle with 150Hz lowpass (mellower)
        oscillator.type = 'triangle';
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(150, this.audioContext.currentTime);
        break;
      case 2:
        // Third timbre: Square with 120Hz lowpass (deepest/mellowest)
        oscillator.type = 'square';
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(120, this.audioContext.currentTime);
        break;
    }
    
    oscillator.frequency.setValueAtTime(noteFreq, this.audioContext.currentTime);
    
    // Consistent gain envelope for all timbres (matching loudness)
    gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.2, this.audioContext.currentTime + 0.1);
    gainNode.gain.linearRampToValueAtTime(0.2, this.audioContext.currentTime + 0.4);
    gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.5);
    
    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + 0.5);
    
    return oscillator;
  }

  createBongos(pitch = 'high') {
    if (!this.audioContext) return null;
    if (DEBUG) console.log(`createBongos() called with pitch: ${pitch}`);
    
    // Create single bongo sound with chosen pitch
    const bongo = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    const filter = this.audioContext.createBiquadFilter();
    
    // Create stereo panner
    const panner = this.audioContext.createStereoPanner();
    
    // Connect audio chain with panning
    bongo.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(panner);
    panner.connect(this.soundtrackBus);
    
    // Set pitch based on parameter
    bongo.type = 'sine';
    if (pitch === 'high') {
      bongo.frequency.setValueAtTime(250, this.audioContext.currentTime); // Higher pitch
      panner.pan.setValueAtTime(-0.33, this.audioContext.currentTime); // 33% left
    } else {
      bongo.frequency.setValueAtTime(150, this.audioContext.currentTime); // Lower pitch
      panner.pan.setValueAtTime(0.66, this.audioContext.currentTime); // 66% right
    }
    
    // Low-pass filter for warmth
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(400, this.audioContext.currentTime);
    
    // Quick attack, short decay envelope
    gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.6, this.audioContext.currentTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.2);
    
    // Start oscillator
    bongo.start(this.audioContext.currentTime);
    bongo.stop(this.audioContext.currentTime + 0.2);
    
    if (DEBUG) console.log(`Bongo (${pitch}) started and will stop in 0.2 seconds, panned ${pitch === 'high' ? '33% left' : '66% right'}`);
    
    return bongo;
  }

  createArp() {
    if (!this.audioContext) return null;
    if (!this.arpActive) return null; // Don't play if arp is no longer active
    
    // Get current chord frequencies (same as main chord progressions)
    const chordProgressions = {
      'Cmin': [130.81, 155.56, 196.00],      // C3, Eb3, G3
      'Cmin7': [130.81, 155.56, 196.00, 233.08], // C3, Eb3, G3, Bb3
      'Dmin': [146.83, 174.61, 220.00],      // D3, F3, A3
      'EbMaj': [155.56, 196.00, 233.08],     // Eb3, G3, Bb3
      'Fmin7': [174.61, 207.65, 261.63, 311.13], // F3, Ab3, C4, Eb4
      'Gmin7': [196.00, 233.08, 293.66, 349.23]  // G3, Bb3, D4, F4
    };
    
    const frequencies = chordProgressions[this.currentChord];
    if (!frequencies) return null;
    
    // Create fat analog synth sound
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    const filter = this.audioContext.createBiquadFilter();
    const saturationGain = this.audioContext.createGain();
    
    // Connect audio chain
    oscillator.connect(saturationGain);
    saturationGain.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.soundtrackBus);
    
    // Fat analog synth settings
    oscillator.type = 'sawtooth';
    oscillator.frequency.setValueAtTime(frequencies[this.arpNoteIndex], this.audioContext.currentTime);
    
    // Saturation for fatness
    saturationGain.gain.setValueAtTime(2.0, this.audioContext.currentTime);
    
    // Low-pass filter for warmth
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, this.audioContext.currentTime);
    filter.Q.setValueAtTime(1.0, this.audioContext.currentTime);
    
    // Individual note envelope - longer duration for plasma storm
    const noteDuration = 0.8; // Longer note duration
    gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.4, this.audioContext.currentTime + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + noteDuration);
    
    // Start oscillator
    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + noteDuration);
    
    // Move to next note in chord
    this.arpNoteIndex = (this.arpNoteIndex + 1) % frequencies.length;
    
    if (DEBUG) console.log(`Arp playing note ${this.arpNoteIndex} of chord ${this.currentChord} at ${frequencies[this.arpNoteIndex]}Hz`);
    
    return oscillator;
  }

  startArp(phase = 'warning') {
    if (DEBUG) console.log(`Starting arp in ${phase} phase`);
    this.arpActive = true;
    this.arpPhase = phase;
    this.arpNoteIndex = 0;
  }

  stopArp() {
    if (DEBUG) console.log('Stopping arp');
    this.arpActive = false;
    this.arpPhase = 'warning';
    this.arpNoteIndex = 0;
  }

  setArpPhase(phase) {
    if (DEBUG) console.log(`Setting arp phase to ${phase}`);
    this.arpPhase = phase;
  }

  generateBongoPattern() {
    // Generate a 4-bar pattern in 8th notes (32 total positions)
    // 40% density means about 13 hits out of 32 positions
    // Prioritize off-beats from 4th and 8th notes (positions 1, 3, 5, 7, 9, 11, 13, 15, etc.)
    
    const pattern = new Array(32).fill(false);
    const totalPositions = 32;
    const targetHits = Math.floor(totalPositions * 0.40); // 40% density
    
    // Define off-beat positions (prioritized) - every odd position
    const offBeatPositions = [];
    for (let i = 1; i < totalPositions; i += 2) {
      offBeatPositions.push(i);
    }
    
    // Define on-beat positions (less prioritized) - every even position
    const onBeatPositions = [];
    for (let i = 0; i < totalPositions; i += 2) {
      onBeatPositions.push(i);
    }
    
    // Fill pattern prioritizing off-beats
    const selectedPositions = [];
    
    // First, fill with off-beats (70% of target hits)
    const offBeatTarget = Math.floor(targetHits * 0.7);
    const shuffledOffBeats = [...offBeatPositions].sort(() => Math.random() - 0.5);
    
    for (let i = 0; i < offBeatTarget && i < shuffledOffBeats.length; i++) {
      selectedPositions.push(shuffledOffBeats[i]);
    }
    
    // Then fill remaining with on-beats
    const remainingHits = targetHits - selectedPositions.length;
    const shuffledOnBeats = [...onBeatPositions].sort(() => Math.random() - 0.5);
    
    for (let i = 0; i < remainingHits && i < shuffledOnBeats.length; i++) {
      selectedPositions.push(shuffledOnBeats[i]);
    }
    
    // Set the pattern
    selectedPositions.forEach(position => {
      pattern[position] = Math.random() < 0.5 ? 'high' : 'low'; // Randomly assign pitch
    });
    
    this.bongoPattern = pattern;
    this.bongoPatternPosition = 0;
    this.bongoPatternLength = 32; // Update length for 8th notes
    
    if (DEBUG) console.log(`Generated bongo pattern with ${selectedPositions.length} hits (40% density, 8th notes)`);
    if (DEBUG) console.log('Off-beat hits:', selectedPositions.filter(pos => pos % 2 === 1).length);
    if (DEBUG) console.log('On-beat hits:', selectedPositions.filter(pos => pos % 2 === 0).length);
    
    return pattern;
  }

  createChords() {
    if (!this.audioContext) return null;
    
    // Check if only chords are playing (level 13-14)
    const isChordsOnly = this.activeLayers.size === 1 && this.activeLayers.has('chords');
    
    // Create delay nodes early if in chords-only mode
    if (isChordsOnly && !this.delayNode) {
      this.delayNode = this.audioContext.createDelay(1.0); // Max 1 second delay
      this.delayGain = this.audioContext.createGain();
      this.feedbackGain = this.audioContext.createGain();
      
      // Calculate quarter note delay time at current BPM (64 BPM when chords-only)
      const currentBpm = this.bpm / 2; // 64 BPM when chords-only
      const quarterNoteDelay = 60 / currentBpm; // Convert BPM to quarter note duration in seconds
      
      // Set up delay parameters
      this.delayNode.delayTime.setValueAtTime(quarterNoteDelay, this.audioContext.currentTime); // Quarter note delay
      this.delayGain.gain.setValueAtTime(0.4, this.audioContext.currentTime); // 40% wet signal
      this.feedbackGain.gain.setValueAtTime(0.2, this.audioContext.currentTime); // 20% feedback
      
      // Set up feedback loop
      this.delayNode.connect(this.feedbackGain);
      this.feedbackGain.connect(this.delayNode);
    }
    
    // Define chord progressions (frequencies in Hz) - C Dorian mode
    const chordProgressions = {
      'Cmin': [261.63, 311.13, 392.00],      // C4, Eb4, G4
      'Cmin7': [261.63, 311.13, 392.00, 466.16], // C4, Eb4, G4, Bb4
      'Dmin': [293.66, 349.23, 440.00],      // D4, F4, A4
      'EbMaj': [311.13, 392.00, 466.16],     // Eb4, G4, Bb4
      'Fmin7': [349.23, 415.30, 523.25, 622.25], // F4, Ab4, C5, Eb5
      'Gmin7': [392.00, 466.16, 587.33, 698.46]  // G4, Bb4, D5, F5
    };
    
    // Use the current chord or select a new one
    if (!this.currentChord) {
      this.selectRandomChord();
    }
    
    const frequencies = chordProgressions[this.currentChord];
    
    if (DEBUG) console.log(`Playing chord: ${this.currentChord}`);
    
    const chord = [];
    
    // In chords-only mode, add chance of playing secondary dominant first
    if (isChordsOnly && Math.random() < 0.3) { // 30% chance
      const secondaryDominantFrequencies = this.getSecondaryDominant(this.currentChord);
      if (secondaryDominantFrequencies) {
        if (DEBUG) console.log(`Playing secondary dominant before ${this.currentChord}`);
        
        // Play secondary dominant first (shorter duration)
        secondaryDominantFrequencies.forEach(freq => {
          const domOscillator = this.audioContext.createOscillator();
          const domGainNode = this.audioContext.createGain();
          const domSaturationGain = this.audioContext.createGain();
          const domBitcrusher = this.audioContext.createWaveShaper();
          const domLowpassFilter = this.audioContext.createBiquadFilter();
          
          // Create secondary dominant audio chain
          domOscillator.connect(domSaturationGain);
          domSaturationGain.connect(domBitcrusher);
          domBitcrusher.connect(domLowpassFilter);
          domLowpassFilter.connect(domGainNode);
          
          // Apply same effects as main chords
          domOscillator.type = 'sine';
          domOscillator.frequency.setValueAtTime(freq, this.audioContext.currentTime);
          
          // Saturation effect
          domSaturationGain.gain.setValueAtTime(2, this.audioContext.currentTime);
          
          // Bitcrushing
          const bitcrushCurve = new Float32Array(65536);
          const bits = 8;
          const steps = Math.pow(2, bits);
          for (let i = 0; i < 65536; i++) {
            const x = (i - 32768) / 32768;
            bitcrushCurve[i] = Math.round(x * steps) / steps;
          }
          domBitcrusher.curve = bitcrushCurve;
          
          // Low-pass filter
          domLowpassFilter.type = 'lowpass';
          domLowpassFilter.frequency.setValueAtTime(800, this.audioContext.currentTime);
          domLowpassFilter.Q.setValueAtTime(1, this.audioContext.currentTime);
          
          // Shorter envelope for secondary dominant
          domGainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
          domGainNode.gain.linearRampToValueAtTime(0.15, this.audioContext.currentTime + 0.05);
          domGainNode.gain.setValueAtTime(0.15, this.audioContext.currentTime + 0.05);
          domGainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 1.0); // Shorter duration
          
          // Connect through delay if in chords-only mode
          if (isChordsOnly) {
            domGainNode.connect(this.delayNode);
            this.delayNode.connect(this.delayGain);
            this.delayGain.connect(this.soundtrackBus);
            domGainNode.connect(this.soundtrackBus); // Dry signal
          } else {
            domGainNode.connect(this.soundtrackBus);
          }
          
          domOscillator.start(this.audioContext.currentTime);
          domOscillator.stop(this.audioContext.currentTime + 1.0);
          
          chord.push({ oscillator: domOscillator, bitcrusher: domBitcrusher });
        });
        
        // Continue with main chord logic immediately
      }
    }
    
    frequencies.forEach(freq => {
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();
      const saturationGain = this.audioContext.createGain();
      const bitcrusher = this.audioContext.createWaveShaper();
      const lowpassFilter = this.audioContext.createBiquadFilter();
      
      // Create basic audio chain: oscillator -> saturation -> bitcrusher -> lowpass -> gain
      oscillator.connect(saturationGain);
      saturationGain.connect(bitcrusher);
      bitcrusher.connect(lowpassFilter);
      lowpassFilter.connect(gainNode);
      
      if (DEBUG && isChordsOnly) console.log('Chords-only mode detected, will create pad sounds');
      
      if (isChordsOnly) {
        // Create delay chain: gainNode -> delay -> delayGain -> soundtrackBus
        gainNode.connect(this.delayNode);
        this.delayNode.connect(this.delayGain);
        this.delayGain.connect(this.soundtrackBus);
        
        // Also connect dry signal
        gainNode.connect(this.soundtrackBus);
      } else {
        // Normal chain without delay
        gainNode.connect(this.soundtrackBus);
      }
      
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(freq, this.audioContext.currentTime);
      
      // Mild saturation (slight overdrive)
      saturationGain.gain.setValueAtTime(1.2, this.audioContext.currentTime);
      
      // Bitcrushing effect using WaveShaper
      const bitcrushCurve = new Float32Array(65536);
      const bits = 8; // Reduce from 32-bit to 8-bit
      const steps = Math.pow(2, bits);
      
      for (let i = 0; i < 65536; i++) {
        const x = (i - 32768) / 32768;
        bitcrushCurve[i] = Math.round(x * steps) / steps;
      }
      bitcrusher.curve = bitcrushCurve;
      
      // Low-pass filter for warmth
      lowpassFilter.type = 'lowpass';
      lowpassFilter.frequency.setValueAtTime(800, this.audioContext.currentTime);
      lowpassFilter.Q.setValueAtTime(1, this.audioContext.currentTime);
      
      gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.15, this.audioContext.currentTime + 0.05);
      gainNode.gain.setValueAtTime(0.15, this.audioContext.currentTime + 0.05);
      gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 2.05);
      
      oscillator.start(this.audioContext.currentTime);
      oscillator.stop(this.audioContext.currentTime + 2.05);
      
      chord.push({ oscillator, bitcrusher });
      
      // Add pad sound when only chords are playing (notes twice as long)
      if (isChordsOnly) {
        if (DEBUG) console.log(`Creating pad sound for frequency ${freq}Hz`);
        
        // Create the main pad sound
        const padOscillator = this.audioContext.createOscillator();
        const padGainNode = this.audioContext.createGain();
        const padLowpassFilter = this.audioContext.createBiquadFilter();
        
        // Create pad audio chain: oscillator -> lowpass -> gain -> delay (same as chords)
        padOscillator.connect(padLowpassFilter);
        padLowpassFilter.connect(padGainNode);
        padGainNode.connect(this.delayNode);
        this.delayNode.connect(this.delayGain);
        this.delayGain.connect(this.soundtrackBus);
        
        // Also connect dry signal (same as chords)
        padGainNode.connect(this.soundtrackBus);
        
        // Pad sound settings
        padOscillator.type = 'triangle';
        padOscillator.frequency.setValueAtTime(freq, this.audioContext.currentTime);
        
        // Low-pass filter for pad warmth
        padLowpassFilter.type = 'lowpass';
        padLowpassFilter.frequency.setValueAtTime(800, this.audioContext.currentTime); // Higher cutoff for more presence
        padLowpassFilter.Q.setValueAtTime(1, this.audioContext.currentTime);
        
        // Pad envelope (twice as long as chords with longer attack and release)
        padGainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
        padGainNode.gain.linearRampToValueAtTime(0.2, this.audioContext.currentTime + 0.5); // Longer attack (0.5s)
        padGainNode.gain.setValueAtTime(0.2, this.audioContext.currentTime + 0.5);
        padGainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 4.5); // Longer release (1s)
        
        padOscillator.start(this.audioContext.currentTime);
        padOscillator.stop(this.audioContext.currentTime + 4.5);
        
        chord.push({ oscillator: padOscillator, bitcrusher: null }); // Add pad to chord array
        
        // Double the lowest two notes an octave up
        const frequencies = chordProgressions[this.currentChord];
        const noteIndex = frequencies.indexOf(freq);
        if (noteIndex < 2) { // Lowest two notes (indices 0 and 1)
          const octaveUpFreq = freq * 2; // Double frequency = octave up
          if (DEBUG) console.log(`Creating octave-up pad sound for frequency ${octaveUpFreq}Hz`);
          
          const octavePadOscillator = this.audioContext.createOscillator();
          const octavePadGainNode = this.audioContext.createGain();
          const octavePadLowpassFilter = this.audioContext.createBiquadFilter();
          
          // Create octave pad audio chain: oscillator -> lowpass -> gain -> delay (same as chords)
          octavePadOscillator.connect(octavePadLowpassFilter);
          octavePadLowpassFilter.connect(octavePadGainNode);
          octavePadGainNode.connect(this.delayNode);
          this.delayNode.connect(this.delayGain);
          this.delayGain.connect(this.soundtrackBus);
          
          // Also connect dry signal (same as chords)
          octavePadGainNode.connect(this.soundtrackBus);
          
          // Octave pad sound settings
          octavePadOscillator.type = 'triangle';
          octavePadOscillator.frequency.setValueAtTime(octaveUpFreq, this.audioContext.currentTime);
          
          // Low-pass filter for octave pad warmth
          octavePadLowpassFilter.type = 'lowpass';
          octavePadLowpassFilter.frequency.setValueAtTime(1200, this.audioContext.currentTime); // Higher cutoff for octave
          octavePadLowpassFilter.Q.setValueAtTime(1, this.audioContext.currentTime);
          
          // Octave pad envelope (same as main pad)
          octavePadGainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
          octavePadGainNode.gain.linearRampToValueAtTime(0.15, this.audioContext.currentTime + 0.5); // Slightly quieter
          octavePadGainNode.gain.setValueAtTime(0.15, this.audioContext.currentTime + 0.5);
          octavePadGainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 4.5);
          
          octavePadOscillator.start(this.audioContext.currentTime);
          octavePadOscillator.stop(this.audioContext.currentTime + 4.5);
          
          chord.push({ oscillator: octavePadOscillator, bitcrusher: null }); // Add octave pad to chord array
        }
      }
    });
    
    return chord;
  }

  // Level-based soundtrack progression (changes every 2 levels)
  getLayersForLevel(level) {
    // Calculate which soundtrack phase we're in (every 2 levels)
    const soundtrackPhase = Math.floor((level - 1) / 2) + 1;
    const cyclePhase = ((soundtrackPhase - 1) % 13) + 1;
    
    let layers;
    switch (cyclePhase) {
      case 1: layers = ['kick']; break;
      case 2: layers = ['kick', 'hats']; break;
      case 3: layers = ['kick', 'hats', 'bass']; break;
      case 4: layers = ['kick', 'hats', 'bass', 'chords']; break;
      case 5: layers = ['hats', 'bass', 'chords']; break;
      case 6: layers = ['bass', 'chords']; break;
      case 7: layers = ['chords']; break;
      case 8: layers = ['bass', 'chords']; break;
      case 9: layers = ['hats', 'bass', 'chords']; break;
      case 10: layers = ['kick', 'hats', 'bass', 'chords']; break;
      case 11: layers = ['kick', 'hats', 'bass']; break;
      case 12: layers = ['kick', 'hats']; break;
      case 13: layers = ['kick']; break;
      default: layers = ['kick']; break;
    }
    
    // Add bongos on every level ending in 8 or 9, but not when only chords are playing
    if ((level % 10 === 8 || level % 10 === 9) && !(layers.length === 1 && layers.includes('chords'))) {
      if (DEBUG) console.log(`Adding bongos to level ${level}, layers:`, layers);
      layers.push('bongos');
    }
    
    return layers;
  }

  updateSoundtrack(level) {
    // Always update the current level, even if AudioContext isn't available yet
    this.currentLevel = level;
    
    // Only update layers if AudioContext is available
    if (!this.audioContext) {
      if (DEBUG) console.log(`Level ${level}: AudioContext not available, soundtrack will start when user interacts`);
      return;
    }
    
    this.updateSoundtrackLayers();
  }

  updateSoundtrackLayers() {
    if (!this.audioContext) return;
    
    // Calculate soundtrack phase for current level
    const soundtrackPhase = Math.floor((this.currentLevel - 1) / 2) + 1;
    const cyclePhase = ((soundtrackPhase - 1) % 13) + 1;
    const activeLayers = this.getLayersForLevel(this.currentLevel);
    
    if (DEBUG) console.log(`Level ${this.currentLevel} (Phase ${cyclePhase}): Updating layers:`, activeLayers);
    
    // Check if bongos are starting (weren't active before, but are now)
    const bongosStarting = !this.activeLayers.has('bongos') && activeLayers.includes('bongos');
    
    // Update the active layers set
    this.activeLayers.clear();
    activeLayers.forEach(layer => this.activeLayers.add(layer));
    
    // Generate new bongo pattern when bongos start or if bongos are active but no pattern exists
    if (bongosStarting || (this.activeLayers.has('bongos') && !this.bongoPattern)) {
      if (DEBUG) console.log(`Bongos starting on level ${this.currentLevel}, generating new pattern`);
      this.generateBongoPattern();
    }
    
    // Restart beat scheduler if layers changed (to update BPM)
    if (this.centralBeatScheduler) {
      this.stopCentralBeatScheduler();
    }
    this.startCentralBeatScheduler();
  }

  startCentralBeatScheduler() {
    if (!this.audioContext || this.centralBeatScheduler) return;
    
    // Halve BPM when only chords are playing
    const effectiveBpm = this.activeLayers.size === 1 && this.activeLayers.has('chords') ? this.bpm * 2/3 : this.bpm;
    const beatDuration = 60000 / effectiveBpm; // milliseconds per beat
    const eighthNote = beatDuration / 2;
    const fourBeats = beatDuration * 4; // 4 beats duration
    
    if (DEBUG) console.log('Starting central beat scheduler');
    
    this.centralBeatScheduler = setInterval(() => {
      this.globalBeatCounter++;
      this.lastBeatTime = Date.now();
      
      // Play all active layers based on the central beat
      if (this.activeLayers.has('kick')) {
        this.createKickDrum();
      }
      
      if (this.activeLayers.has('hats')) {
        // Offset hats by 8th note
        setTimeout(() => this.createHats(), eighthNote);
      }
      
      // Select new chord every 4 beats (independent of which layers are active)
      if (this.globalBeatCounter % 4 === 1) {
        // Select new chord on beats 1, 5, 9, etc.
        this.selectRandomChord();
      }
      
      if (this.activeLayers.has('bass')) {
        // Play bassline every beat
        this.bassBeatCounter++;
        this.createBassline();
      }
      
      if (this.activeLayers.has('chords') && this.globalBeatCounter % 4 === 1) {
        // Chords play every 4 beats on beat 1
        this.createChords();
      }
      
      if (this.activeLayers.has('bongos')) {
        if (this.bongoPattern) {
          // For 8th notes, we need to check 2 times per beat
          // Calculate the 8th note position within the current beat
          const eighthNotePosition = (this.globalBeatCounter * 2) % this.bongoPatternLength;
          
          // Check all 2 8th note positions within this beat
          for (let i = 0; i < 2; i++) {
            const position = (eighthNotePosition + i) % this.bongoPatternLength;
            const bongoHit = this.bongoPattern[position];
            if (bongoHit) {
              // Schedule the bongo hit at the appropriate time within the beat
              const delayTime = (i * beatDuration) / 2; // Delay in milliseconds
              setTimeout(() => {
                if (DEBUG) console.log(`Playing bongos at beat ${this.globalBeatCounter}, 8th note position ${position}, pitch: ${bongoHit}`);
                this.createBongos(bongoHit);
              }, delayTime);
            }
          }
        } else {
          if (DEBUG) console.log(`Bongos active but no pattern exists at beat ${this.globalBeatCounter}`);
        }
      }
      
      // Arp layer - only plays during plasma storms
      if (this.arpActive) {
        if (this.arpPhase === 'warning') {
          // Play 8th notes during warning phase
          if (this.globalBeatCounter % 1 === 0) { // Every beat
            // Play on beat and off-beat (8th notes)
            setTimeout(() => {
              if (DEBUG) console.log(`Playing arp (warning phase) at beat ${this.globalBeatCounter}`);
              this.createArp();
            }, 0);
            setTimeout(() => {
              if (DEBUG) console.log(`Playing arp (warning phase) at beat ${this.globalBeatCounter} off-beat`);
              this.createArp();
            }, beatDuration / 2);
          }
        } else if (this.arpPhase === 'storm') {
          // Play 8th note triplets during storm phase
          if (this.globalBeatCounter % 1 === 0) { // Every beat
            // Play three notes per beat (triplets)
            setTimeout(() => {
              if (DEBUG) console.log(`Playing arp (storm phase) at beat ${this.globalBeatCounter} - triplet 1`);
              this.createArp();
            }, 0);
            setTimeout(() => {
              if (DEBUG) console.log(`Playing arp (storm phase) at beat ${this.globalBeatCounter} - triplet 2`);
              this.createArp();
            }, beatDuration / 3);
            setTimeout(() => {
              if (DEBUG) console.log(`Playing arp (storm phase) at beat ${this.globalBeatCounter} - triplet 3`);
              this.createArp();
            }, (beatDuration * 2) / 3);
          }
        }
      }
    }, beatDuration);
  }

  stopCentralBeatScheduler() {
    if (this.centralBeatScheduler) {
      clearInterval(this.centralBeatScheduler);
      this.centralBeatScheduler = null;
      if (DEBUG) console.log('Stopped central beat scheduler');
    }
  }

  startSoundtrackForCurrentLevel() {
    if (!this.audioContext) return;
    
    // Calculate soundtrack phase for current level
    const soundtrackPhase = Math.floor((this.currentLevel - 1) / 2) + 1;
    const cyclePhase = ((soundtrackPhase - 1) % 13) + 1;
    const activeLayers = this.getLayersForLevel(this.currentLevel);
    
    if (DEBUG) console.log(`Level ${this.currentLevel} (Phase ${cyclePhase}): Starting layers:`, activeLayers);
    
    // Initialize global beat tracking for first start
    this.globalBeatCounter = 0;
    this.lastBeatTime = Date.now();
    
    // Clear any existing layers and start fresh
    this.stopCentralBeatScheduler();
    this.activeLayers.clear();
    
    // Set up active layers and start central scheduler
    activeLayers.forEach(layer => this.activeLayers.add(layer));
    
    // Generate bongo pattern if bongos are active
    if (this.activeLayers.has('bongos')) {
      this.generateBongoPattern();
    }
    
    this.startCentralBeatScheduler();
  }

  stopAllLayers() {
    this.stopCentralBeatScheduler();
    this.activeLayers.clear();
  }

  // Initialize voice selection when audio manager starts
  initializeVoiceSelection() {
    if (!('speechSynthesis' in window)) {
      if (DEBUG) console.warn('Speech synthesis not supported');
      return;
    }
    
    // Try to select voice immediately if voices are already loaded
    if (speechSynthesis.getVoices().length > 0) {
      this.selectRandomVoice();
    } else {
      // Wait for voices to load, then select
      speechSynthesis.onvoiceschanged = () => {
        if (!this.voiceSelected) {
          this.selectRandomVoice();
        }
      };
    }
  }

  // Select a random voice from available voices
  selectRandomVoice() {
    if (!('speechSynthesis' in window)) {
      if (DEBUG) console.warn('Speech synthesis not supported');
      return;
    }
    
    const voices = speechSynthesis.getVoices();
    if (voices.length > 0) {
      const randomIndex = Math.floor(Math.random() * voices.length);
      this.selectedVoice = voices[randomIndex];
      this.voiceSelected = true;
      if (DEBUG) console.log(`Selected random voice: ${this.selectedVoice.name} (${this.selectedVoice.lang})`);
    } else {
      if (DEBUG) console.log('No voices available yet, will select when voices load');
    }
  }

  // Robot voice using Web Speech API with robot-like parameters
  createRobotSpeech(text, rate = 1.2) {
    if (!('speechSynthesis' in window)) {
      if (DEBUG) console.warn('Speech synthesis not supported');
      return;
    }
    
    // Cancel any existing speech to avoid overlapping
    speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Robot-like parameters - maximum flatness
    utterance.pitch = 0.1;        // Extremely low pitch
    utterance.rate = rate;        // Configurable rate (default: faster pace)
    utterance.volume = 0.7;       // Clear volume
    
    // Function to set up the voice and speak
    const speakWithVoice = () => {
      // Select random voice if not already selected
      if (!this.voiceSelected) {
        this.selectRandomVoice();
      }
      
      // Use the selected random voice
      if (this.selectedVoice) {
        utterance.voice = this.selectedVoice;
        if (DEBUG) console.log(`Using selected voice: ${this.selectedVoice.name}`);
      } else {
        if (DEBUG) console.log('No voice selected, using default voice with robot parameters');
      }
      
      // Add event listeners
      utterance.onstart = () => {
        if (DEBUG) console.log('Robot speech started');
      };
      
      utterance.onend = () => {
        if (DEBUG) console.log('Robot speech ended');
      };
      
      speechSynthesis.speak(utterance);
    };
    
    // If voices are already loaded, speak immediately
    if (speechSynthesis.getVoices().length > 0) {
      speakWithVoice();
    } else {
      // Wait for voices to load
      speechSynthesis.onvoiceschanged = speakWithVoice;
    }
  }

  // Public method to trigger robot speech
  playRobot(text) {
    if (!this.audioContext) return;
    this.createRobotSpeech(text);
  }

  createPortalSound() {
    if (!this.audioContext) return null;
    
    const voices = [];
    const baseFreq = 120; // Base frequency for all voices (5th higher: 80 * 1.5)
    
    // Create three voices, each with two slightly detuned sine waves
    for (let i = 0; i < 3; i++) {
      const voice = {
        oscillator1: this.audioContext.createOscillator(),
        oscillator2: this.audioContext.createOscillator(),
        gainNode: this.audioContext.createGain(),
        lfo: this.audioContext.createOscillator(), // For wub effect
        lfoGain: this.audioContext.createGain(),
        detuneAmount: (Math.random() - 0.5) * 20, // Random detune ±10 cents
        wubSpeed: 0.5 + Math.random() * 2, // Random wub speed 0.5-2.5 Hz
        startTime: this.audioContext.currentTime
      };
      
      // Set up oscillators with slight detuning
      voice.oscillator1.frequency.setValueAtTime(baseFreq + (i * 20), this.audioContext.currentTime);
      voice.oscillator2.frequency.setValueAtTime(baseFreq + (i * 20) + voice.detuneAmount, this.audioContext.currentTime);
      voice.oscillator1.type = 'sine';
      voice.oscillator2.type = 'sine';
      
      // Set up LFO for wub effect
      voice.lfo.frequency.setValueAtTime(voice.wubSpeed, this.audioContext.currentTime);
      voice.lfo.type = 'sine';
      
      // Connect the audio graph
      voice.oscillator1.connect(voice.gainNode);
      voice.oscillator2.connect(voice.gainNode);
      voice.lfo.connect(voice.lfoGain);
      voice.lfoGain.connect(voice.oscillator1.frequency);
      voice.lfoGain.connect(voice.oscillator2.frequency);
      voice.gainNode.connect(this.audioContext.destination);
      
      // Set initial volume (will be modulated by portal size)
      voice.gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
      
      // Start oscillators
      voice.oscillator1.start(this.audioContext.currentTime);
      voice.oscillator2.start(this.audioContext.currentTime);
      voice.lfo.start(this.audioContext.currentTime);
      
      voices.push(voice);
    }
    
    return voices;
  }
  
  updatePortalSound(voices, portalProgress, portalSize) {
    if (!voices || !this.audioContext) return;
    
    const currentTime = this.audioContext.currentTime;
    const baseVolume = this.masterVolume * 0.3; // Base volume for portal sound
    
    voices.forEach((voice, index) => {
      // Calculate volume based on portal size and progress
      // Volume peaks when portal is at maximum size
      const sizeMultiplier = Math.sin(portalProgress * Math.PI); // 0 to 1 to 0
      const volume = baseVolume * sizeMultiplier * (0.5 + index * 0.2); // Different volumes per voice
      
      // Set volume
      voice.gainNode.gain.setValueAtTime(volume, currentTime);
      
      // Decay wub speed over time
      const timeElapsed = currentTime - voice.startTime;
      const decayedWubSpeed = voice.wubSpeed * Math.exp(-timeElapsed * 0.5); // Exponential decay
      voice.lfo.frequency.setValueAtTime(decayedWubSpeed, currentTime);
      
      // Modulate LFO gain for wub intensity (also decays over time)
      const wubIntensity = 10 * Math.exp(-timeElapsed * 0.3); // Wub intensity decays
      voice.lfoGain.gain.setValueAtTime(wubIntensity, currentTime);
    });
  }
  
  stopPortalSound(voices) {
    if (!voices) return;
    
    const currentTime = this.audioContext.currentTime;
    
    voices.forEach(voice => {
      // Fade out over 0.5 seconds
      voice.gainNode.gain.linearRampToValueAtTime(0, currentTime + 0.5);
      
      // Stop oscillators after fade out
      voice.oscillator1.stop(currentTime + 0.5);
      voice.oscillator2.stop(currentTime + 0.5);
      voice.lfo.stop(currentTime + 0.5);
    });
  }
}
