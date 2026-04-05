import React, { useState } from 'react';
import { Video } from 'lucide-react';

export default function ConferenceScreen({ username, onJoinChannel }) {
  const [joinCode, setJoinCode] = useState('');

  const handleJoinMeeting = (e) => {
    e.preventDefault();
    if (joinCode.trim().length > 0) {
      onJoinChannel(`MEETING-${joinCode.trim().toUpperCase()}`);
    }
  };

  return (
    <div className="tab-screen">
      <div className="zello-header">
        <div>
          <h1>HD Video Conference</h1>
          <div className="subtitle">Rapat Tatap Muka</div>
        </div>
      </div>

      <div style={{ flex: 1, padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', justifyContent: 'center' }}>
        <button 
          onClick={() => {
            const randomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
            onJoinChannel(`MEETING-${randomCode}`);
          }}
          className="btn-create-meeting"
          style={{ width: '100%', padding: '1.2rem', background: '#0e1111', color: 'white', borderRadius: '16px', border: '2px solid #333', fontWeight: 'bold', fontSize: '1.1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', boxShadow: '0 8px 20px rgba(0,0,0,0.2)', transition: 'transform 0.1s' }}>
          <Video size={28} color="var(--accent-secondary)" /> Buat Rapat Baru
        </button>

        <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>ATAU</div>

        <form onSubmit={handleJoinMeeting} style={{ background: 'var(--bg-secondary)', padding: '1.2rem', borderRadius: '16px', border: '1px solid var(--border)', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}>
          <div style={{ marginBottom: '0.8rem', fontWeight: 'bold', color: 'var(--text-main)' }}>Gabung dengan Kunci ID</div>
          <input 
            className="form-input" 
            placeholder="Contoh: X9A2B"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value)}
            style={{ marginBottom: '1rem', width: '100%', borderRadius: '12px', border: '2px solid var(--border)', background: 'var(--bg-tertiary)', color: '#111', textTransform: 'uppercase', padding: '1rem', fontSize: '1.2rem', textAlign: 'center', letterSpacing: '2px' }}
          />
          <button 
            type="submit"
            disabled={!joinCode.trim()}
            style={{ width: '100%', padding: '1rem', background: joinCode.trim() ? 'var(--accent)' : 'gray', color: 'white', border: 'none', borderRadius: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '1.1rem' }}>
            Gabung Rapat
          </button>
        </form>
      </div>
    </div>
  );
}
