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
    
    const W = canvas.clientWidth;
    const H = canvas.clientHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.scale(dpr, dpr);

    const draw = () => {
      animFrameRef.current = requestAnimationFrame(draw);
      ctx.clearRect(0, 0, W, H);

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
        for (let i = 0; i < BAR_COUNT; i++) {
          const x = i * (barWidth + GAP);
          ctx.fillStyle = 'rgba(0,0,0,0.06)';
          ctx.beginPath();
          ctx.roundRect(x, centerY - 1, barWidth, 2, 1);
          ctx.fill();
        }
        return;
      }

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      analyser.getByteFrequencyData(dataArray);
      const binsPerBar = Math.floor(bufferLength / BAR_COUNT);

      for (let i = 0; i < BAR_COUNT; i++) {
        let sum = 0;
        for (let j = 0; j < binsPerBar; j++) {
          const idx = i * binsPerBar + j;
          sum += idx < bufferLength ? dataArray[idx] : 0;
        }
        const avg = sum / binsPerBar;
        const normalized = avg / 255;

        const maxBarH = (H - 8) / 2;
        const barH = Math.max(2, normalized * maxBarH);

        let color;
        if (isRecording) {
          // Sender: warm accent  
          const r = Math.min(255, 200 + normalized * 55);
          const g = Math.max(30, 80 - normalized * 50);
          const b = 38;
          color = `rgba(${r}, ${g}, ${b}, ${0.5 + normalized * 0.5})`;
        } else {
          // Receiver: cool teal
          const r = 5;
          const g = Math.min(200, 120 + normalized * 80);
          const b = Math.min(180, 90 + normalized * 90);
          color = `rgba(${r}, ${g}, ${b}, ${0.5 + normalized * 0.5})`;
        }

        const x = i * (barWidth + GAP);

        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.roundRect(x, centerY - barH, barWidth, barH, 2);
        ctx.fill();
        ctx.beginPath();
        ctx.roundRect(x, centerY, barWidth, barH, 2);
        ctx.fill();
      }
    };

    draw();

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isRecording, activeSpeaker]);

  const isActive = isRecording || activeSpeaker;
  const label = isRecording ? 'MENGIRIM' : (activeSpeaker ? activeSpeaker.toUpperCase() : '');

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px', padding: '0 0.5rem' }}>
      {label && (
        <div style={{
          fontSize: '0.55rem', fontWeight: 700,
          color: isRecording ? 'var(--accent)' : 'var(--accent-emerald)',
          textTransform: 'uppercase', letterSpacing: '0.1em',
          fontFamily: "'JetBrains Mono', monospace",
          animation: isActive ? 'breathe 1.5s ease-in-out infinite' : 'none',
        }}>{label}</div>
      )}
      <canvas
        ref={canvasRef}
        style={{
          width: '100%', height: '52px',
          borderRadius: 'var(--radius-sm)',
          background: isActive ? 'rgba(0,0,0,0.03)' : 'transparent',
          transition: 'background 0.3s ease',
        }}
      />
    </div>
  );
}
