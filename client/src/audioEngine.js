/**
 * audioEngine.js — Zello-grade Web Audio pipeline for Si Talki HKA
 *
 * Architecture inspired by Zello:
 *  - Sender: getUserMedia (48kHz) → AudioWorklet (mic-processor) → Int16 PCM chunks → WebSocket
 *  - Receiver: WebSocket → Int16→Float32 → Jitter Buffer → Web Audio (48kHz) → Output
 *
 * Key design decisions vs. original:
 *  1. AudioContext at 48kHz with latencyHint:'interactive' (native browser rate, zero resampling)
 *  2. AudioWorklet instead of ScriptProcessor (dedicated audio thread, no main-thread jitter)
 *  3. Adaptive jitter buffer (target 120ms ahead of playhead, auto-flush on overflow/underflow)
 *  4. Soft-knee compressor 4:1 (not brickwall 20:1 which pumped)
 *  5. No static noise (was causing acoustic feedback through speakers)
 */

export const AUDIO_SAMPLE_RATE = 48000; // Native browser rate

let audioContext = null;
let masterGainNode = null;
let receiverAnalyser = null;
let micAnalyser = null;
let workletNode = null;

// ── AudioContext ─────────────────────────────────────────────────────────────

export function initAudioContext() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)({
      sampleRate: AUDIO_SAMPLE_RATE,
      latencyHint: 'interactive', // Zello-style: minimize latency
    });
    masterGainNode = audioContext.createGain();
    masterGainNode.gain.value = 1.0;
    masterGainNode.connect(audioContext.destination);
  }
  return audioContext;
}

// ── Speaker Mute (instant cut, soft unmute) ──────────────────────────────────

export function setSpeakerMute(isMuted) {
  if (!masterGainNode || !audioContext) return;
  masterGainNode.gain.cancelScheduledValues(audioContext.currentTime);
  if (isMuted) {
    // Hard zero immediately — eliminates any feedback bleed-through
    masterGainNode.gain.setValueAtTime(0, audioContext.currentTime);
  } else {
    // 20ms ramp to avoid click/pop on unmute
    masterGainNode.gain.setValueAtTime(0, audioContext.currentTime);
    masterGainNode.gain.linearRampToValueAtTime(1.0, audioContext.currentTime + 0.02);
  }
}

// ── AudioWorklet Mic Setup ───────────────────────────────────────────────────

export async function createMicWorklet(stream, onChunk) {
  const ctx = initAudioContext();
  if (ctx.state === 'suspended') await ctx.resume();

  // Load worklet module (served from /public/)
  try {
    await ctx.audioWorklet.addModule('/mic-processor.js');
  } catch (e) {
    console.warn('[audioEngine] AudioWorklet not available, falling back to ScriptProcessor');
    return null; // caller will use fallback
  }

  const source = ctx.createMediaStreamSource(stream);
  workletNode = new AudioWorkletNode(ctx, 'mic-processor');

  // Receive processed PCM chunks from worklet thread
  workletNode.port.onmessage = (e) => {
    if (e.data.pcm) onChunk(e.data.pcm);
  };

  // Silent output to keep graph alive
  const silentGain = ctx.createGain();
  silentGain.gain.value = 0;

  // Mic analyser for visualizer (taps in parallel)
  micAnalyser = ctx.createAnalyser();
  micAnalyser.fftSize = 64;
  micAnalyser.smoothingTimeConstant = 0.4;

  source.connect(workletNode);
  source.connect(micAnalyser);
  micAnalyser.connect(silentGain);
  silentGain.connect(ctx.destination);
  workletNode.connect(silentGain);

  return { workletNode, source, silentGain };
}

export function startMicWorklet(workletNode) {
  workletNode?.port?.postMessage({ type: 'start' });
}

export function stopMicWorklet(workletNode) {
  workletNode?.port?.postMessage({ type: 'stop' });
}

// ── Receiver Chain ───────────────────────────────────────────────────────────

export function createReceiverChain() {
  const ctx = initAudioContext();

  // High-pass at 120Hz — remove rumble/wind/handling noise
  const highpass = ctx.createBiquadFilter();
  highpass.type = 'highpass';
  highpass.frequency.value = 120;
  highpass.Q.value = 0.7;

  // Low-pass at 8000Hz — remove harsh HF artifacts, keep voice band clean
  const lowpass = ctx.createBiquadFilter();
  lowpass.type = 'lowpass';
  lowpass.frequency.value = 8000;
  lowpass.Q.value = 0.7;

  // Gentle soft-knee limiter — avoids pumping (Zello uses similar approach)
  const compressor = ctx.createDynamicsCompressor();
  compressor.threshold.value = -6;   // Only clip true peaks
  compressor.knee.value = 6;          // Soft knee, no abrupt gain reduction
  compressor.ratio.value = 4;         // 4:1 — gentle, not reverby
  compressor.attack.value = 0.003;
  compressor.release.value = 0.25;

  // Analyser for visualizer
  receiverAnalyser = ctx.createAnalyser();
  receiverAnalyser.fftSize = 64;
  receiverAnalyser.smoothingTimeConstant = 0.4;

  // Signal path: hp → lp → compressor → analyser → masterGain → output
  highpass.connect(lowpass);
  lowpass.connect(compressor);
  compressor.connect(receiverAnalyser);
  receiverAnalyser.connect(masterGainNode);

  return { input: highpass };
}

export function getReceiverAnalyser() { return receiverAnalyser; }
export function getMicAnalyser() { return micAnalyser; }

export function clearMicAnalyser() {
  if (micAnalyser) {
    try { micAnalyser.disconnect(); } catch(e){}
    micAnalyser = null;
  }
}

// ── Beeps ────────────────────────────────────────────────────────────────────

export function playZelloBeep(type) {
  const ctx = initAudioContext();
  const t = ctx.currentTime;
  const dst = ctx.destination; // bypass masterGain so beep is always audible

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';

  if (type === 'start') {
    osc.frequency.setValueAtTime(880, t);
    osc.frequency.setValueAtTime(1200, t + 0.06);
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.12, t + 0.01);
    gain.gain.setValueAtTime(0.12, t + 0.09);
    gain.gain.linearRampToValueAtTime(0, t + 0.12);
    osc.connect(gain); gain.connect(dst);
    osc.start(t); osc.stop(t + 0.12);
  } else {
    osc.frequency.setValueAtTime(1000, t);
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.12, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    osc.connect(gain); gain.connect(dst);
    osc.start(t); osc.stop(t + 0.12);
  }
}

// ── Ringtone ─────────────────────────────────────────────────────────────────

let ringInterval = null;

export function playRingtone() {
  const ctx = initAudioContext();
  if (ringInterval) return;
  const beep = () => {
    const t = ctx.currentTime;
    [[440,0],[480,0],[440,0.6],[480,0.6]].forEach(([freq, offset]) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t + offset);
      g.gain.setValueAtTime(0, t + offset);
      g.gain.linearRampToValueAtTime(0.1, t + offset + 0.05);
      g.gain.setValueAtTime(0.1, t + offset + 0.4);
      g.gain.linearRampToValueAtTime(0, t + offset + 0.45);
      osc.connect(g); g.connect(ctx.destination);
      osc.start(t + offset); osc.stop(t + offset + 0.5);
    });
  };
  beep();
  ringInterval = setInterval(beep, 3000);
}

export function stopRingtone() {
  if (ringInterval) { clearInterval(ringInterval); ringInterval = null; }
}

// ── Siren ─────────────────────────────────────────────────────────────────────

export function playSiren() {
  const ctx = initAudioContext();
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'square';
  osc.frequency.setValueAtTime(600, t);
  osc.frequency.linearRampToValueAtTime(1200, t + 0.5);
  osc.frequency.linearRampToValueAtTime(600, t + 1.0);
  osc.frequency.linearRampToValueAtTime(1200, t + 1.5);
  osc.frequency.linearRampToValueAtTime(600, t + 2.0);
  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(0.2, t + 0.1);
  gain.gain.setValueAtTime(0.2, t + 1.9);
  gain.gain.linearRampToValueAtTime(0, t + 2.0);
  osc.connect(gain); gain.connect(ctx.destination);
  osc.start(t); osc.stop(t + 2.0);
}

// ── Static noise (kept as no-ops for API compatibility) ───────────────────────
// Static noise was removed because it caused acoustic feedback through speakers.
export function startStaticNoise() {}
export function stopStaticNoise() {}
