import React, { useState } from 'react';
import { Route, Search, Video, LogIn } from 'lucide-react';

export default function ChannelLobby({ username, onJoinChannel, activeRadio, onPlayRadio }) {
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

      {/* Radio FM Nusantara */}
      <h3 className="section-title" style={{marginTop: '1rem'}}>🎧 RADIO HIBURAN NASIONAL</h3>
      <div className="radio-grid">
        {[
          { id: 'ardan', name: 'Ardan FM', freq: 'Musik Pop Hits', url: 'https://stream.rcs.revma.com/ugpyzu9n5k3vv', color: 'linear-gradient(135deg, #FFB75E 0%, #ED8F03 100%)' },
          { id: 'ssfm', name: 'Suara Surabaya', freq: 'Lalu Lintas Tol', url: 'https://c5.siar.us/proxy/ssfm/stream', color: 'linear-gradient(135deg, #ff416c 0%, #ff4b2b 100%)' },
          { id: 'elshinta', name: 'Elshinta Berita', freq: 'News & Info', url: 'https://stream-ssl.arenastreaming.com:8000/jakarta', color: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)' },
          { id: 'rri', name: 'RRI Pro 3', freq: 'Nasional', url: 'https://stream-node0.rri.co.id/streaming/14/9014/kbrn.mp3', color: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)' }
        ].map(st => (
          <div key={st.id} className={`radio-tile ${activeRadio === st.id ? 'playing' : ''}`} style={{ background: st.color }} onClick={() => onPlayRadio(st)}>
            <div className="radio-disc"></div>
            <div className="radio-info">
              <div className="radio-name">{st.name}</div>
              <div className="radio-freq">{activeRadio === st.id ? 'Sedang Diputar 🔊' : st.freq}</div>
            </div>
          </div>
        ))}
      </div>
      <div style={{height: '80px'}}></div> {/* Padding bottom nav */}
    </div>
  );
}
