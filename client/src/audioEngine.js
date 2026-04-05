export const AUDIO_SAMPLE_RATE = 16000;
let audioContext = null;
let masterGainNode = null;
let staticNoiseNode = null;

export function initAudioContext() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: AUDIO_SAMPLE_RATE });
    masterGainNode = audioContext.createGain();
    masterGainNode.connect(audioContext.destination);
  }
  return audioContext;
}

export function startStaticNoise() {
  const ctx = initAudioContext();
  if (staticNoiseNode || !ctx) return;
  const bufferSize = 2 * ctx.sampleRate;
  const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const output = noiseBuffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    output[i] = Math.random() * 2 - 1; 
  }
  staticNoiseNode = ctx.createBufferSource();
  staticNoiseNode.buffer = noiseBuffer;
  staticNoiseNode.loop = true;

  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 3000;
  
  const gain = ctx.createGain();
  gain.gain.value = 0.025; 

  staticNoiseNode.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination); // bypass master mute
  staticNoiseNode.start(0);
}

export function stopStaticNoise() {
  if (staticNoiseNode) {
    try { staticNoiseNode.stop(); } catch(e){}
    staticNoiseNode.disconnect();
    staticNoiseNode = null;
  }
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

let ringInterval = null;

export function playRingtone() {
  const ctx = initAudioContext();
  if (ringInterval) return;
  
  const beep = () => {
     const t = ctx.currentTime;
     const osc1 = ctx.createOscillator();
     const osc2 = ctx.createOscillator();
     const gain = ctx.createGain();
     
     osc1.type = 'sine';
     osc2.type = 'sine';
     osc1.frequency.setValueAtTime(440, t); // Standard European/UK ring tone freq 1
     osc2.frequency.setValueAtTime(480, t); // Standard freq 2
     
     gain.gain.setValueAtTime(0, t);
     gain.gain.linearRampToValueAtTime(0.1, t + 0.05);
     gain.gain.setValueAtTime(0.1, t + 0.4);
     gain.gain.linearRampToValueAtTime(0, t + 0.45);
     
     osc1.connect(gain);
     osc2.connect(gain);
     gain.connect(ctx.destination);
     
     osc1.start(t);
     osc2.start(t);
     osc1.stop(t + 0.5);
     osc2.stop(t + 0.5);
     
     // Double ring pattern: ring, pause, ring
     const t2 = t + 0.6;
     const osc3 = ctx.createOscillator();
     const osc4 = ctx.createOscillator();
     const gain2 = ctx.createGain();
     
     osc3.type = 'sine';
     osc4.type = 'sine';
     osc3.frequency.setValueAtTime(440, t2);
     osc4.frequency.setValueAtTime(480, t2);
     
     gain2.gain.setValueAtTime(0, t2);
     gain2.gain.linearRampToValueAtTime(0.1, t2 + 0.05);
     gain2.gain.setValueAtTime(0.1, t2 + 0.4);
     gain2.gain.linearRampToValueAtTime(0, t2 + 0.45);
     
     osc3.connect(gain2);
     osc4.connect(gain2);
     gain2.connect(ctx.destination);
     
     osc3.start(t2);
     osc4.start(t2);
     osc3.stop(t2 + 0.5);
     osc4.stop(t2 + 0.5);
  };
  
  beep();
  ringInterval = setInterval(beep, 3000); // repeat every 3 seconds
}

export function stopRingtone() {
  if (ringInterval) {
    clearInterval(ringInterval);
    ringInterval = null;
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
