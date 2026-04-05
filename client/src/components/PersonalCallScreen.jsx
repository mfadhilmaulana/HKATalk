import React, { useEffect, useState, useRef } from 'react';
import { Phone, PhoneOff, Video, VideoOff, Mic, MicOff, Maximize, Minimize } from 'lucide-react';

export default function PersonalCallScreen({ callerName, type, socket, targetPhone, onLeave, isIncoming }) {
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(type === 'voice');
  const [timer, setTimer] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setTimer(prev => prev + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (t) => {
    const m = Math.floor(t / 60);
    const s = t % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#1c1c1c', z_index: 9999, display: 'flex', flexDirection: 'column', color: 'white' }}>
      {/* Header Info */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <div style={{ width: 120, height: 120, borderRadius: '50%', background: '#128c7e', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem', fontWeight: 800, marginBottom: '1.5rem', boxShadow: '0 0 30px rgba(18,140,126,0.3)' }}>
          {callerName?.[0].toUpperCase()}
        </div>
        <h2 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '0.5rem' }}>{callerName}</h2>
        <p style={{ color: '#aaa', fontSize: '1rem' }}>{formatTime(timer)} • {type === 'video' ? 'Video Panggilan' : 'Panggilan Suara'}</p>
      </div>

      {/* Video Placeholder (Actual WebRTC would hook here) */}
      {type === 'video' && !isVideoOff && (
        <div style={{ position: 'absolute', inset: 0, background: '#000', zIndex: -1 }}>
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#333' }}>
             <Video size={64} style={{ opacity: 0.1 }} />
             <p style={{ position: 'absolute', bottom: '20%', fontSize: '0.8rem' }}>Sinkronisasi WebRTC...</p>
          </div>
        </div>
      )}

      {/* Controls */}
      <div style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(10px)', padding: '2rem', display: 'flex', justifyContent: 'center', gap: '1.5rem', alignItems: 'center' }}>
        <button 
          onClick={() => setIsMuted(!isMuted)}
          style={{ width: 56, height: 56, borderRadius: '50%', background: isMuted ? 'white' : 'rgba(255,255,255,0.2)', color: isMuted ? 'black' : 'white', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
        >
          {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
        </button>

        <button 
          onClick={() => {
            socket?.emit('hangup-call', { targetPhone });
            onLeave();
          }}
          style={{ width: 72, height: 72, borderRadius: '50%', background: '#ff3b30', color: 'white', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 4px 15px rgba(255,59,48,0.3)' }}
        >
          <PhoneOff size={32} />
        </button>

        {type === 'video' && (
          <button 
            onClick={() => setIsVideoOff(!isVideoOff)}
            style={{ width: 56, height: 56, borderRadius: '50%', background: isVideoOff ? 'white' : 'rgba(255,255,255,0.2)', color: isVideoOff ? 'black' : 'white', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
          >
            {isVideoOff ? <VideoOff size={24} /> : <Video size={24} />}
          </button>
        )}
      </div>
    </div>
  );
}
