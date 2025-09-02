import { GAME_CONFIG } from '../config/GameConstants.js';

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
    
    this.initAudio();
  }

  initAudio() {
    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      this.masterGain = this.audioContext.createGain();
      this.masterGain.connect(this.audioContext.destination);
      this.masterGain.gain.value = this.masterVolume;
      
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
      
      console.log('Audio system initialized successfully');
    } catch (e) {
      console.warn('Web Audio API not supported:', e);
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
    
    console.log(`Bass playing ${noteType} note for: ${this.currentChord} (${noteFreq}Hz) on beat ${(this.bassBeatCounter % 4) + 1}`);
    
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    const filter = this.audioContext.createBiquadFilter();
    
    oscillator.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.soundtrackBus);
    
    oscillator.type = 'sawtooth';
    oscillator.frequency.setValueAtTime(noteFreq, this.audioContext.currentTime);
    
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(200, this.audioContext.currentTime);
    
    gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.2, this.audioContext.currentTime + 0.1);
    gainNode.gain.linearRampToValueAtTime(0.2, this.audioContext.currentTime + 0.4);
    gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.5);
    
    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + 0.5);
    
    return oscillator;
  }

  createChords() {
    if (!this.audioContext) return null;
    
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
    
    console.log(`Playing chord: ${this.currentChord}`);
    
    const chord = [];
    
    frequencies.forEach(freq => {
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();
      const saturationGain = this.audioContext.createGain();
      const bitcrusher = this.audioContext.createWaveShaper();
      const lowpassFilter = this.audioContext.createBiquadFilter();
      
      // Create audio chain: oscillator -> saturation -> bitcrusher -> lowpass -> gain -> master
      oscillator.connect(saturationGain);
      saturationGain.connect(bitcrusher);
      bitcrusher.connect(lowpassFilter);
      lowpassFilter.connect(gainNode);
      gainNode.connect(this.soundtrackBus);
      
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
    });
    
    return chord;
  }

  // Level-based soundtrack progression (changes every 2 levels)
  getLayersForLevel(level) {
    // Calculate which soundtrack phase we're in (every 2 levels)
    const soundtrackPhase = Math.floor((level - 1) / 2) + 1;
    const cyclePhase = ((soundtrackPhase - 1) % 13) + 1;
    
    switch (cyclePhase) {
      case 1: return ['kick'];
      case 2: return ['kick', 'hats'];
      case 3: return ['kick', 'hats', 'bass'];
      case 4: return ['kick', 'hats', 'bass', 'chords'];
      case 5: return ['hats', 'bass', 'chords'];
      case 6: return ['bass', 'chords'];
      case 7: return ['chords'];
      case 8: return ['bass', 'chords'];
      case 9: return ['hats', 'bass', 'chords'];
      case 10: return ['kick', 'hats', 'bass', 'chords'];
      case 11: return ['kick', 'hats', 'bass'];
      case 12: return ['kick', 'hats'];
      case 13: return ['kick'];
      default: return ['kick'];
    }
  }

  updateSoundtrack(level) {
    // Always update the current level, even if AudioContext isn't available yet
    this.currentLevel = level;
    this.bassBeatCounter = 0; // Reset bass beat counter for new level
    
    // Only start layers if AudioContext is available
    if (!this.audioContext) {
      console.log(`Level ${level}: AudioContext not available, soundtrack will start when user interacts`);
      return;
    }
    
    this.startSoundtrackForCurrentLevel();
  }

  startSoundtrackForCurrentLevel() {
    if (!this.audioContext) return;
    
    // Calculate soundtrack phase for current level
    const soundtrackPhase = Math.floor((this.currentLevel - 1) / 2) + 1;
    const cyclePhase = ((soundtrackPhase - 1) % 13) + 1;
    const activeLayers = this.getLayersForLevel(this.currentLevel);
    
    console.log(`Level ${this.currentLevel} (Phase ${cyclePhase}): Starting layers:`, activeLayers);
    
    // Stop all layers
    Object.keys(this.soundtrackLayers).forEach(layer => {
      if (this.soundtrackLayers[layer]) {
        this.stopLayer(layer);
      }
    });
    
    // Start active layers
    activeLayers.forEach(layer => {
      this.startLayer(layer);
    });
  }

  startLayer(layerName) {
    if (!this.audioContext || this.soundtrackLayers[layerName]) return;
    
    const beatDuration = 60000 / this.bpm; // milliseconds per beat
    const eighthNote = beatDuration / 2;
    const fourBeats = beatDuration * 4; // 4 beats duration
    
    const playLayer = () => {
      if (!this.soundtrackLayers[layerName]) return;
      
      switch (layerName) {
        case 'kick':
          this.createKickDrum();
          break;
        case 'hats':
          // Offset hats by 8th note
          setTimeout(() => this.createHats(), eighthNote);
          break;
        case 'bass':
          // Select new chord every 4 beats, but play every beat
          this.bassBeatCounter++;
          if (this.bassBeatCounter % 4 === 1) {
            // Select new chord on beats 1, 5, 9, etc.
            this.selectRandomChord();
          }
          this.createBassline();
          break;
        case 'chords':
          this.createChords();
          break;
      }
    };
    
    // Start the layer loop with different intervals
    if (layerName === 'chords') {
      // Chords play every 4 beats
      this.soundtrackLayers[layerName] = setInterval(playLayer, fourBeats);
    } else {
      // Other layers play every beat
      this.soundtrackLayers[layerName] = setInterval(playLayer, beatDuration);
    }
    
    // Play immediately
    playLayer();
  }

  stopLayer(layerName) {
    if (this.soundtrackLayers[layerName]) {
      clearInterval(this.soundtrackLayers[layerName]);
      this.soundtrackLayers[layerName] = null;
    }
  }

  stopAllLayers() {
    Object.keys(this.soundtrackLayers).forEach(layer => {
      this.stopLayer(layer);
    });
  }

  // Robot voice using Web Speech API with robot-like parameters
  createRobotSpeech(text, rate = 1.2) {
    if (!('speechSynthesis' in window)) {
      console.warn('Speech synthesis not supported');
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
      // Try to find a voice that sounds more robotic
      const voices = speechSynthesis.getVoices();
      const robotVoice = voices.find(voice => 
        voice.name.includes('Robot') || 
        voice.name.includes('Synthetic') ||
        voice.name.includes('Neural') ||
        voice.name.includes('Microsoft') ||
        voice.name.includes('Google') ||
        voice.name.includes('Alex') ||
        voice.name.includes('Daniel') ||
        voice.name.includes('Fiona')
      );
      
      if (robotVoice) {
        utterance.voice = robotVoice;
        console.log(`Using robot voice: ${robotVoice.name}`);
      } else {
        console.log('No robot voice found, using default voice with robot parameters');
      }
      
      // Add event listeners
      utterance.onstart = () => {
        console.log('Robot speech started');
      };
      
      utterance.onend = () => {
        console.log('Robot speech ended');
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
}
