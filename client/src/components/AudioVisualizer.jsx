import React, { useRef, useEffect } from 'react';
import { getReceiverAnalyser, getMicAnalyser } from '../audioEngine';

export default function AudioVisualizer({ isRecording, activeSpeaker }) {
  const canvasRef = useRef(null);
  const animFrameRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    
    // Set canvas size
    const W = canvas.clientWidth;
    const H = canvas.clientHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.scale(dpr, dpr);

    const draw = () => {
      animFrameRef.current = requestAnimationFrame(draw);
      ctx.clearRect(0, 0, W, H);

      // Pick the right analyser: mic when recording, receiver when listening
      let analyser = null;
      if (isRecording) {
        analyser = getMicAnalyser();
      } else if (activeSpeaker) {
        analyser = getReceiverAnalyser();
      }

      const BAR_COUNT = 24;
      const GAP = 3;
      const barWidth = (W - (BAR_COUNT - 1) * GAP) / BAR_COUNT;
      const centerY = H / 2;

      if (!analyser) {
        // Draw idle/dormant bars (tiny flat lines)
        for (let i = 0; i < BAR_COUNT; i++) {
          const x = i * (barWidth + GAP);
          const idleH = 2;
          ctx.fillStyle = 'rgba(255,255,255,0.15)';
          ctx.beginPath();
          ctx.roundRect(x, centerY - idleH / 2, barWidth, idleH, 2);
          ctx.fill();
        }
        return;
      }

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      analyser.getByteFrequencyData(dataArray);

      // Map frequency bins to our bar count
      const binsPerBar = Math.floor(bufferLength / BAR_COUNT);

      for (let i = 0; i < BAR_COUNT; i++) {
        // Average the frequency bins for this bar
        let sum = 0;
        for (let j = 0; j < binsPerBar; j++) {
          const idx = i * binsPerBar + j;
          sum += idx < bufferLength ? dataArray[idx] : 0;
        }
        const avg = sum / binsPerBar;
        const normalized = avg / 255; // 0..1

        const maxBarH = (H - 8) / 2; // max half-height (mirrored)
        const barH = Math.max(2, normalized * maxBarH);

        // Color gradient: green -> yellow -> red based on intensity
        let color;
        if (isRecording) {
          // Sender: vibrant red/orange gradient
          const r = Math.min(255, 180 + normalized * 75);
          const g = Math.max(30, 120 - normalized * 90);
          const b = 30;
          color = `rgba(${r}, ${g}, ${b}, ${0.6 + normalized * 0.4})`;
        } else {
          // Receiver: cool green/cyan gradient  
          const r = Math.max(0, normalized * 80);
          const g = Math.min(255, 150 + normalized * 105);
          const b = Math.min(255, 100 + normalized * 155);
          color = `rgba(${r}, ${g}, ${b}, ${0.6 + normalized * 0.4})`;
        }

        const x = i * (barWidth + GAP);

        // Draw mirrored bars (up and down from center)
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.roundRect(x, centerY - barH, barWidth, barH, 2);
        ctx.fill();
        ctx.beginPath();
        ctx.roundRect(x, centerY, barWidth, barH, 2);
        ctx.fill();

        // Glow effect for loud bars
        if (normalized > 0.5) {
          ctx.shadowColor = color;
          ctx.shadowBlur = normalized * 8;
          ctx.beginPath();
          ctx.roundRect(x, centerY - barH, barWidth, barH * 2, 2);
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      }
    };

    draw();

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [isRecording, activeSpeaker]);

  const isActive = isRecording || activeSpeaker;
  const label = isRecording ? '🎙️ MENGIRIM' : (activeSpeaker ? `🔊 ${activeSpeaker.toUpperCase()}` : '');

  return (
    <div style={{
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '4px',
      padding: '0 0.5rem',
    }}>
      {label && (
        <div style={{
          fontSize: '0.65rem',
          fontWeight: 700,
          color: isRecording ? '#ff6b6b' : '#00e676',
          textTransform: 'uppercase',
          letterSpacing: '2px',
          textShadow: `0 0 8px ${isRecording ? 'rgba(255,80,80,0.5)' : 'rgba(0,230,118,0.5)'}`,
          animation: isActive ? 'pulse-text 1.5s ease-in-out infinite' : 'none',
        }}>{label}</div>
      )}
      <canvas
        ref={canvasRef}
        style={{
          width: '100%',
          height: '60px',
          borderRadius: '8px',
          background: isActive ? 'rgba(0,0,0,0.25)' : 'rgba(0,0,0,0.1)',
          transition: 'background 0.3s ease',
        }}
      />
      <style>{`
        @keyframes pulse-text {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
      `}</style>
    </div>
  );
}
