export const AUDIO_SAMPLE_RATE = 16000;
let audioContext = null;
let masterGainNode = null;

export function initAudioContext() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: AUDIO_SAMPLE_RATE });
    masterGainNode = audioContext.createGain();
    masterGainNode.connect(audioContext.destination);
  }
  return audioContext;
}

export function setSpeakerMute(isMuted) {
  if (masterGainNode && audioContext) {
    // 0 = Hardcore Instant Mute anti-feedback, 1 = normal volume
    masterGainNode.gain.setValueAtTime(isMuted ? 0 : 1.0, audioContext.currentTime);
  }
}

export function playZelloBeep(type) {
  const ctx = initAudioContext();
  const t = ctx.currentTime;
  
  // Beeps connect bypass the masterGainNode straight to destination
  // So you still hear your own beeps even when the network channel is muted
  const destination = ctx.destination;
  
  if (type === 'start') {
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
    gain.connect(destination);
    osc.start(t);
    osc.stop(t + 0.1);
  } else if (type === 'end') {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    
    osc.frequency.setValueAtTime(1000, t);
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.1, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
    
    osc.connect(gain);
    gain.connect(destination);
    osc.start(t);
    osc.stop(t + 0.1);
  }
}

export function playSiren() {
  const ctx = initAudioContext();
  const t = ctx.currentTime;
  const destination = ctx.destination; // MUST bypass masterGainNode !
  
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  
  osc.type = 'square';
  // Modulate frequency like an emergency siren
  osc.frequency.setValueAtTime(600, t);
  osc.frequency.linearRampToValueAtTime(1200, t + 0.5);
  osc.frequency.linearRampToValueAtTime(600, t + 1.0);
  osc.frequency.linearRampToValueAtTime(1200, t + 1.5);
  osc.frequency.linearRampToValueAtTime(600, t + 2.0);
  
  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(0.2, t + 0.1); // Extremely loud
  gain.gain.setValueAtTime(0.2, t + 1.9);
  gain.gain.linearRampToValueAtTime(0, t + 2.0);
  
  osc.connect(gain);
  gain.connect(destination); // Bypass master mute
  osc.start(t);
  osc.stop(t + 2.0);
}

export function createReceiverChain() {
  const ctx = initAudioContext();
  
  const highpass = ctx.createBiquadFilter();
  highpass.type = 'highpass';
  highpass.frequency.value = 250; 
  
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
  
  // CRITICAL: Connect to masterGainNode, not destination.
  // This allows the entire incoming voice channel to be forcefully muted when PTT is pressed.
  compressor.connect(masterGainNode);
  
  return { input: highpass };
}
