/**
 * audioEngine.js — Clean & Reliable PTT Audio Pipeline
 *
 * DESIGN PHILOSOPHY (lessons learned):
 *  - AudioWorklet re-initialized each PTT = multiple node accumulation = alien voice → REMOVED
 *  - Forced 48000Hz sample rate on devices with 44100Hz native = pitch shift = alien voice → REMOVED
 *  - Static noise through speakers = mic picks it up = feedback → REMOVED
 *  - Heavy brickwall 20:1 compressor = pumping/reverb = artifact → Replaced with 4:1 soft
 *  - Per-chunk gain automation = reverb tail at chunk edges → REMOVED
 *
 * Architecture:
 *  Sender: getUserMedia (native rate) → ScriptProcessor (reliable) → Int16 PCM + sampleRate → Socket
 *  Receiver: Socket → Int16→Float32 → AudioBuffer at SENDER's sample rate → Output
 */

// Use the device's OWN native sample rate — do NOT force 48000
// Different devices: iOS=44100, most Android/Desktop=44100 or 48000
// We report the actual rate with every packet so receiver always decodes correctly
export const AUDIO_SAMPLE_RATE = null; // UNUSED — use ctx.sampleRate dynamically

let audioContext  = null;
let masterGain    = null;
let receiverAnalyser = null;
let micAnalyser   = null;
let silentAudio   = null; 
let audioOutputDestination = null; // For iOS Video Sink hack

const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

/**
 * Manual Linear Resampler
 * Bypasses buggy Safari internal resampler for real-time 48k -> 44.1k (or vice-versa)
 */
export function resampleAudio(float32Array, fromRate, toRate) {
  if (fromRate === toRate) return float32Array;
  const ratio = fromRate / toRate;
  const newLength = Math.round(float32Array.length / ratio);
  const result = new Float32Array(newLength);
  for (let i = 0; i < newLength; i++) {
    const pos = i * ratio;
    const index = Math.floor(pos);
    const weight = pos - index;
    if (index + 1 < float32Array.length) {
      result[i] = float32Array[index] * (1 - weight) + float32Array[index + 1] * weight;
    } else {
      result[i] = float32Array[index];
    }
  }
  return result;
}

/**
 * iOS Audio Session Primer
 * Plays a silent looping sound to keep the audio session 'warm' and on the main speaker.
 * MUST be called inside a user gesture (mousedown/touchstart).
 */
export function primeAudioSession() {
  if (!isIOS) return;
  if (!silentAudio) {
    // 1-second silent WAV base64
    const silentWav = "data:audio/wav;base64,UklGRigAAABXQVZFRm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA==";
    silentAudio = new Audio(silentWav);
    silentAudio.loop = true;
  }
  silentAudio.play().catch(() => {
    // Standard Safari block if no gesture yet
  });
}

// ── AudioContext ──────────────────────────────────────────────────────────────

export function initAudioContext() {
  if (!audioContext) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    audioContext = new AudioContextClass({
      latencyHint: 'interactive',
    });
    
    masterGain = audioContext.createGain();
    masterGain.gain.value = 1.0;

    // --- ULTIMATE iOS HACK: Video Sink Routing ---
    // Forces Safari to use the main speaker and high-priority audio mode.
    if (isIOS) {
       try {
         audioOutputDestination = audioContext.createMediaStreamDestination();
         
         const video = document.createElement('video');
         video.setAttribute('playsinline', 'true');
         video.setAttribute('autoplay', 'true');
         video.setAttribute('muted', 'true'); // Required for autoplay on iOS
         video.style.position = 'absolute';
         video.style.pointerEvents = 'none';
         video.style.opacity = '0';
         video.style.width = '1px';
         video.style.height = '1px';
         document.body.appendChild(video);
         
         video.srcObject = audioOutputDestination.stream;
         video.play().catch(e => console.warn('[VideoSink] play failed:', e));
         
         // On iOS, connect ONLY to the video sink for output consistency
         masterGain.connect(audioOutputDestination);
       } catch (e) {
         console.error('[VideoSink] init failed:', e);
         masterGain.connect(audioContext.destination);
       }
    } else {
       // On Non-iOS, connect to the standard destination
       masterGain.connect(audioContext.destination);
    }
  }
  return audioContext;
}

// ── Speaker Mute ──────────────────────────────────────────────────────────────

export function setSpeakerMute(isMuted) {
  if (!masterGain || !audioContext) return;
  masterGain.gain.cancelScheduledValues(audioContext.currentTime);
  if (isMuted) {
    masterGain.gain.setValueAtTime(0, audioContext.currentTime);
  } else {
    // 20ms soft ramp to avoid click on unmute
    masterGain.gain.setValueAtTime(0, audioContext.currentTime);
    masterGain.gain.linearRampToValueAtTime(1.0, audioContext.currentTime + 0.02);
  }
}

// ── Receiver Chain ────────────────────────────────────────────────────────────

export function createReceiverChain() {
  const ctx = initAudioContext();

  // 120Hz high-pass: remove rumble / wind / handling noise
  const hp = ctx.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 120;
  hp.Q.value = 0.7;

  // 8kHz low-pass: cut harsh HF artifacts above voice band
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 8000;
  lp.Q.value = 0.7;

  // Gentle 4:1 soft-knee limiter (no pumping)
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -6;
  comp.knee.value      = 6;
  comp.ratio.value     = 4;
  comp.attack.value    = 0.003;
  comp.release.value   = 0.25;

  // Analyser for visualizer
  receiverAnalyser = ctx.createAnalyser();
  receiverAnalyser.fftSize = 64;
  receiverAnalyser.smoothingTimeConstant = 0.4;

  hp.connect(lp);
  lp.connect(comp);
  comp.connect(receiverAnalyser);
  receiverAnalyser.connect(masterGain); // masterGain controls mute

  return { input: hp };
}

export function getReceiverAnalyser() { return receiverAnalyser; }

// ── Mic (ScriptProcessor — reliable & universal across all browsers/devices) ──

/**
 * Create microphone capture node.
 * Returns { scriptNode, source } — caller keeps track for cleanup.
 * onChunk(int16Buffer, sampleRate) is called for each non-silent frame.
 */
export function createMicCapture(stream, onChunk) {
  const ctx = initAudioContext();
  const source = ctx.createMediaStreamSource(stream);

  // 2048 samples = ~43ms at 48kHz, ~46ms at 44100Hz — good balance of latency vs reliability
  const processor = ctx.createScriptProcessor(2048, 1, 1);
  const sampleRate = ctx.sampleRate; // ACTUAL device sample rate

  processor.onaudioprocess = (e) => {
    let samples = e.inputBuffer.getChannelData(0);
    const TARGET_RATE = 16000;
    const nativeRate = ctx.sampleRate;

    // Energy VAD — skip silent frames
    let sum = 0;
    for (let i = 0; i < samples.length; i++) sum += samples[i] * samples[i];
    if (Math.sqrt(sum / samples.length) < 0.004) return;

    // NEW: Bandwidth Optimization — Downsample to 16kHz (Standard HD Voice)
    // This reduces data usage by ~66%, making it stable on weak/nighttime networks
    if (nativeRate !== TARGET_RATE) {
      samples = resampleAudio(samples, nativeRate, TARGET_RATE);
    }

    // Convert Float32 → Int16
    const int16 = new Int16Array(samples.length);
    for (let i = 0; i < samples.length; i++) {
      int16[i] = Math.max(-32768, Math.min(32767, samples[i] * 32767));
    }

    onChunk(int16.buffer, TARGET_RATE);
  };

  // Silent output node to keep graph alive without feeding back to speakers
  const silent = ctx.createGain();
  silent.gain.value = 0;

  source.connect(processor);
  processor.connect(silent);
  silent.connect(ctx.destination);

  // Mic analyser tap for visualizer
  micAnalyser = ctx.createAnalyser();
  micAnalyser.fftSize = 64;
  micAnalyser.smoothingTimeConstant = 0.4;
  source.connect(micAnalyser);
  const micSilent = ctx.createGain();
  micSilent.gain.value = 0;
  micAnalyser.connect(micSilent);
  micSilent.connect(ctx.destination);

  return { processor, source, silent };
}

export function getMicAnalyser() { return micAnalyser; }

export function clearMicAnalyser() {
  if (micAnalyser) {
    try { micAnalyser.disconnect(); } catch(e) {}
    micAnalyser = null;
  }
}

// ── Beeps ─────────────────────────────────────────────────────────────────────

export function playZelloBeep(type) {
  const ctx = initAudioContext();
  const t   = ctx.currentTime;
  const dst = ctx.destination; // bypass masterGain so beeps are always audible

  const osc  = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';

  if (type === 'start') {
    osc.frequency.setValueAtTime(880, t);
    osc.frequency.setValueAtTime(1200, t + 0.065);
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.12, t + 0.01);
    gain.gain.setValueAtTime(0.12, t + 0.095);
    gain.gain.linearRampToValueAtTime(0, t + 0.12);
  } else {
    osc.frequency.setValueAtTime(1000, t);
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.12, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
  }

  osc.connect(gain);
  gain.connect(dst);
  osc.start(t);
  osc.stop(t + 0.15);
}

// ── Ringtone ──────────────────────────────────────────────────────────────────

let ringInterval = null;

export function playRingtone() {
  const ctx = initAudioContext();
  if (ringInterval) return;

  const ring = () => {
    [[0, 440], [0, 480], [0.6, 440], [0.6, 480]].forEach(([offset, freq]) => {
      const t    = ctx.currentTime + offset;
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.1, t + 0.05);
      gain.gain.setValueAtTime(0.1, t + 0.4);
      gain.gain.linearRampToValueAtTime(0, t + 0.45);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.5);
    });
  };

  ring();
  ringInterval = setInterval(ring, 3000);
}

export function stopRingtone() {
  if (ringInterval) { clearInterval(ringInterval); ringInterval = null; }
}

// ── Siren ─────────────────────────────────────────────────────────────────────

export function playSiren() {
  const ctx  = initAudioContext();
  const t    = ctx.currentTime;
  const osc  = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'square';
  osc.frequency.setValueAtTime(600, t);
  osc.frequency.linearRampToValueAtTime(1200, t + 0.5);
  osc.frequency.linearRampToValueAtTime(600,  t + 1.0);
  osc.frequency.linearRampToValueAtTime(1200, t + 1.5);
  osc.frequency.linearRampToValueAtTime(600,  t + 2.0);
  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(0.2, t + 0.1);
  gain.gain.setValueAtTime(0.2, t + 1.9);
  gain.gain.linearRampToValueAtTime(0, t + 2.0);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(t);
  osc.stop(t + 2.0);
}

// ── No-ops kept for API compatibility ─────────────────────────────────────────
export function startStaticNoise() {}
export function stopStaticNoise()  {}

// Stub for old import compatibility
export function createMicWorklet()  { return Promise.resolve(null); }
export function startMicWorklet()   {}
export function stopMicWorklet()    {}
export function createMicAnalyser() {}
