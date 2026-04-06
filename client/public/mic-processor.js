/**
 * MicProcessor - AudioWorklet for zero-jitter PTT microphone capture
 * Runs on dedicated audio render thread (NOT main JS thread)
 * Accumulates 128-frame worklet blocks into 960-sample chunks (20ms @ 48kHz)
 * Applies simple VAD and sends Float32 data to main thread via MessagePort
 */
class MicProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    // 960 samples = 20ms at 48kHz (standard Opus frame size)
    this._CHUNK = 960;
    this._buffer = [];
    this._active = false;

    this.port.onmessage = (e) => {
      if (e.data.type === 'start') this._active = true;
      if (e.data.type === 'stop')  this._active = false;
    };
  }

  process(inputs) {
    if (!this._active) return true;

    const channel = inputs[0]?.[0];
    if (!channel) return true;

    // Accumulate samples
    for (let i = 0; i < channel.length; i++) {
      this._buffer.push(channel[i]);
    }

    // Drain in CHUNK-sized pieces
    while (this._buffer.length >= this._CHUNK) {
      const chunk = new Float32Array(this._buffer.splice(0, this._CHUNK));

      // Simple energy VAD — skip silent frames to conserve bandwidth
      let sum = 0;
      for (let i = 0; i < chunk.length; i++) sum += chunk[i] * chunk[i];
      const rms = Math.sqrt(sum / chunk.length);
      if (rms < 0.004) continue;

      // Downmix to Int16 for transport (16-bit PCM)
      const int16 = new Int16Array(chunk.length);
      for (let i = 0; i < chunk.length; i++) {
        int16[i] = Math.max(-32768, Math.min(32767, chunk[i] * 32767));
      }

      // Transfer ownership of buffer (zero-copy)
      this.port.postMessage({ pcm: int16.buffer }, [int16.buffer]);
    }

    return true;
  }
}

registerProcessor('mic-processor', MicProcessor);
