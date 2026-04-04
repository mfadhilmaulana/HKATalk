export const AUDIO_SAMPLE_RATE = 16000;
let audioContext = null;

export function initAudioContext() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: AUDIO_SAMPLE_RATE });
  }
  return audioContext;
}

export function playZelloBeep(type) {
  const ctx = initAudioContext();
  const t = ctx.currentTime;
  
  if (type === 'start') {
    // Sharp modern start chirp (Zello style rising tones)
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    
    osc.frequency.setValueAtTime(800, t);
    osc.frequency.setValueAtTime(1200, t + 0.05);
    
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.1, t + 0.01);
    gain.gain.setValueAtTime(0.1, t + 0.08);
    gain.gain.linearRampToValueAtTime(0, t + 0.1);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.1);
  } else if (type === 'end') {
    // Clean end pop/chirp for release
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    
    osc.frequency.setValueAtTime(1000, t);
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.1, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.1);
  }
}

// Creates the audio processing chain for incoming audio to make it extremely clear ("terang")
export function createReceiverChain() {
  const ctx = initAudioContext();
  
  // Cut low rumbles so it doesn't sound muffled
  const highpass = ctx.createBiquadFilter();
  highpass.type = 'highpass';
  highpass.frequency.value = 250; 
  
  // Boost the high-end treble for maximum vocal clarity
  const highshelf = ctx.createBiquadFilter();
  highshelf.type = 'highshelf';
  highshelf.frequency.value = 2500;
  highshelf.gain.value = 5; 

  const compressor = ctx.createDynamicsCompressor();
  compressor.threshold.value = -24;
  compressor.knee.value = 30;
  compressor.ratio.value = 12;
  compressor.attack.value = 0.003;
  compressor.release.value = 0.25;

  highpass.connect(highshelf);
  highshelf.connect(compressor);
  compressor.connect(ctx.destination);
  
  return { input: highpass };
}
