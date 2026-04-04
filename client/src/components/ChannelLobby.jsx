import React, { useState } from 'react';
import { Route, Search, Video, LogIn } from 'lucide-react';

export default function ChannelLobby({ username, onJoinChannel }) {
  const [joinCode, setJoinCode] = useState('');

  const hkaChannels = [
    { id: 'bakter', name: 'Tol Bakauheni - Terbanggi Besar' },
    { id: 'terpeka', name: 'Tol Terbanggi B. - P. Panggang' },
    { id: 'palindra', name: 'Tol Palembang - Indralaya' },
    { id: 'permai', name: 'Tol Pekanbaru - Dumai' },
    { id: 'jorrs', name: 'Tol JORR-S' },
    { id: 'pusat', name: 'Pusat Komando (Puskodal)' }
  ];

  const handleJoinMeeting = () => {
    if (joinCode.trim().length > 0) {
      onJoinChannel(`MEETING-${joinCode.trim().toUpperCase()}`);
    }
  };

  return (
    <div className="lobby-screen">
      <div className="zello-header">
        <div>
          <h1>Si Talki</h1>
          <div className="subtitle">ID: {username}</div>
        </div>
      </div>
      
      {/* Zoom-style Meeting Panel */}
      <h3 className="section-title" style={{marginTop: '1rem'}}>HD VIDEO MEETING</h3>
      <div className="meeting-panel" style={{ padding: '1rem', background: 'var(--bg-secondary)', display: 'flex', flexDirection: 'column', gap: '0.8rem', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
        <button 
          onClick={() => {
            const randomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
            onJoinChannel(`MEETING-${randomCode}`);
          }}
          className="btn-create-meeting"
          style={{ width: '100%', padding: '0.9rem', background: '#0e1111', color: 'white', borderRadius: '12px', border: '1px solid #333', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }}>
          <Video size={20} color="var(--accent-secondary)" /> Buat Rapat Baru
        </button>

        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
          <input 
            className="form-input" 
            placeholder="Ketik Kunci ID Rapat..."
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value)}
            style={{ marginBottom: 0, flex: 1, borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-tertiary)', textTransform: 'uppercase' }}
          />
          <button 
            onClick={handleJoinMeeting}
            disabled={!joinCode.trim()}
            style={{ padding: '0 1rem', background: joinCode.trim() ? 'var(--accent)' : 'gray', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
            Gabung
          </button>
        </div>
      </div>

      {/* Legacy Walkie Talkie Channels */}
      <h3 className="section-title">RADIO PTT: SALURAN TETAP</h3>
      <div style={{ background: 'var(--bg-secondary)', borderTop: '1px solid var(--border)' }}>
        {hkaChannels.map(ch => (
          <div key={ch.id} className="channel-card" onClick={() => onJoinChannel(ch.id)}>
            <div className="channel-icon">
              <Route size={22} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--text-main)' }}>{ch.name}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Ketuk untuk menyiarkan</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
