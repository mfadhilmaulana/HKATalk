import React from 'react';
import { Route, Search } from 'lucide-react';

export default function ChannelLobby({ username, onJoinChannel }) {
  const hkaChannels = [
    { id: 'bakter', name: 'Tol Bakauheni - Terbanggi Besar' },
    { id: 'terpeka', name: 'Tol Terbanggi B. - P. Panggang' },
    { id: 'palindra', name: 'Tol Palembang - Indralaya' },
    { id: 'permai', name: 'Tol Pekanbaru - Dumai' },
    { id: 'jorrs', name: 'Tol JORR-S' },
    { id: 'pusat', name: 'Pusat Komando (Puskodal)' }
  ];

  return (
    <div className="lobby-screen">
      <div className="zello-header">
        <div>
          <h1>Si Talki</h1>
          <div className="subtitle">ID: {username}</div>
        </div>
      </div>
      
      <div style={{ padding: '1rem', background: 'var(--bg-secondary)', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
        <div style={{ position: 'relative' }}>
          <Search size={18} style={{position:'absolute', top:'50%', transform:'translateY(-50%)', left:'1rem', color:'var(--text-muted)'}} />
          <input 
            className="form-input" 
            placeholder="Cari ruas atau saluran..."
            style={{ marginBottom: 0, paddingLeft: '2.5rem', borderRadius: '30px', background: 'var(--bg-tertiary)' }}
          />
        </div>
        
        {/* Instant Meeting Button! */}
        <button 
          onClick={() => {
            const randomCode = Math.random().toString(36).substring(2, 6).toUpperCase();
            onJoinChannel(`MEETING-${randomCode}`);
          }}
          style={{ width: '100%', padding: '0.8rem', background: '#0e1111', color: 'white', borderRadius: '12px', border: '1px solid var(--accent-secondary)', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
          📹 Buat Rapat HD Dadakan
        </button>
      </div>

      <h3 className="section-title">Saluran Ruas Tol HKA</h3>
      <div style={{ background: 'var(--bg-secondary)', borderTop: '1px solid var(--border)' }}>
        {hkaChannels.map(ch => (
          <div key={ch.id} className="channel-card" onClick={() => onJoinChannel(ch.id)}>
            <div className="channel-icon">
              <Route size={22} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--text-main)' }}>{ch.name}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Klik untuk sambung</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
