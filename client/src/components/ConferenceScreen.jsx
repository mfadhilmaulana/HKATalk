import React, { useState } from 'react';
import { Video, Users, Clock, Plus, LogIn } from 'lucide-react';

export default function ConferenceScreen({ username, onJoinChannel }) {
  const [joinCode, setJoinCode] = useState('');

  const handleCreateMeeting = () => {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    onJoinChannel(`MEETING-${code}`);
  };

  const handleJoin = (e) => {
    e.preventDefault();
    if (joinCode.trim()) onJoinChannel(`MEETING-${joinCode.trim().toUpperCase()}`);
  };

  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)' }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)', color: 'white', padding: '1.2rem 1rem', flexShrink: 0 }}>
        <h1 style={{ fontSize: '1.3rem', fontWeight: 800 }}>Video Conference HD</h1>
        <div style={{ fontSize: '0.75rem', opacity: 0.7, marginTop: '2px' }}>Rapat Tatap Muka • Unlimited Peserta</div>
      </div>

      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '1rem' }}>
        {/* Create Button */}
        <button onClick={handleCreateMeeting} style={{ width: '100%', padding: '1.2rem', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', borderRadius: '16px', border: 'none', fontWeight: 700, fontSize: '1.05rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', boxShadow: '0 8px 25px rgba(102,126,234,0.4)', cursor: 'pointer', marginBottom: '1rem', transition: 'transform 0.1s' }}>
          <Plus size={22} /> Buat Rapat Baru
        </button>

        {/* Join */}
        <form onSubmit={handleJoin} style={{ background: 'var(--bg-secondary)', padding: '1rem', borderRadius: '16px', border: '1px solid var(--border)', marginBottom: '1.5rem', boxShadow: '0 2px 10px rgba(0,0,0,0.04)' }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.6rem' }}>Gabung dengan Kode</div>
          <div style={{ display: 'flex', gap: '0.4rem' }}>
            <input placeholder="Contoh: X9A2B" value={joinCode} onChange={(e) => setJoinCode(e.target.value)} style={{ flex: 1, padding: '10px', border: '2px solid var(--border)', borderRadius: '10px', background: 'var(--bg-tertiary)', color: '#111', textTransform: 'uppercase', fontSize: '1rem', textAlign: 'center', letterSpacing: '2px', outline: 'none', fontWeight: 600 }} />
            <button type="submit" disabled={!joinCode.trim()} style={{ background: joinCode.trim() ? '#667eea' : '#ccc', color: 'white', border: 'none', borderRadius: '10px', padding: '0 16px', display: 'flex', alignItems: 'center', cursor: 'pointer' }}><LogIn size={18} /></button>
          </div>
        </form>

        {/* Features */}
        <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Fitur Unggulan</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
          {[
            { icon: Video, label: 'HD Video', desc: 'Kamera depan & belakang', color: '#667eea' },
            { icon: Users, label: 'Unlimited', desc: 'Peserta tidak terbatas', color: '#764ba2' },
            { icon: '🖥️', label: 'Share Screen', desc: 'Presentasi layar penuh', color: '#00897b' },
            { icon: Clock, label: 'No Limit', desc: 'Durasi tanpa batas', color: '#f4511e' },
          ].map((f, i) => (
            <div key={i} style={{ background: 'var(--bg-secondary)', padding: '0.8rem', borderRadius: '12px', border: '1px solid var(--border)' }}>
              <div style={{ marginBottom: '0.4rem' }}>
                {typeof f.icon === 'string' ? <span style={{ fontSize: '1.2rem' }}>{f.icon}</span> : <f.icon size={20} color={f.color} />}
              </div>
              <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-main)' }}>{f.label}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
