import React, { useState } from 'react';
import { Video, Users, Clock, Plus, LogIn, Monitor } from 'lucide-react';

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
      <div style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)', padding: '1rem', flexShrink: 0 }}>
        <h1 style={{ fontSize: '1.05rem', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>Video Conference HD</h1>
        <div style={{ fontSize: '0.6rem', color: 'var(--text-tertiary)', fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.04em', marginTop: '4px' }}>RAPAT TATAP MUKA • UNLIMITED</div>
      </div>

      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '1rem' }}>
        {/* Create Button */}
        <button onClick={handleCreateMeeting} style={{ width: '100%', padding: '1rem', background: 'var(--accent)', color: 'white', borderRadius: 'var(--radius-lg)', border: 'none', fontWeight: 700, fontSize: '0.95rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 4px 14px rgba(220,38,38,0.15)', cursor: 'pointer', marginBottom: '1.2rem', transition: 'all 0.15s var(--ease-spring)', fontFamily: 'inherit' }} onMouseDown={e => e.currentTarget.style.transform='scale(0.97)'} onMouseUp={e => e.currentTarget.style.transform='scale(1)'} onMouseLeave={e => e.currentTarget.style.transform='scale(1)'}>
          <Plus size={20} /> Buat Rapat Baru
        </button>

        {/* Join */}
        <form onSubmit={handleJoin} style={{ background: 'var(--bg-card)', padding: '1rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', marginBottom: '1.5rem', boxShadow: 'var(--shadow-card)' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.6rem', letterSpacing: '-0.01em' }}>Gabung dengan Kode</div>
          <div style={{ display: 'flex', gap: '0.4rem' }}>
            <input placeholder="KODE RAPAT..." value={joinCode} onChange={(e) => setJoinCode(e.target.value)} style={{ flex: 1, padding: '10px', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', textTransform: 'uppercase', fontSize: '0.85rem', textAlign: 'center', letterSpacing: '0.1em', fontFamily: "'JetBrains Mono', monospace", outline: 'none', fontWeight: 600, transition: 'border-color 0.2s var(--ease-out)' }} onFocus={e => e.currentTarget.style.borderColor='var(--accent)'} onBlur={e => e.currentTarget.style.borderColor='var(--border)'} />
            <button type="submit" disabled={!joinCode.trim()} style={{ background: joinCode.trim() ? 'var(--accent-blue)' : 'var(--bg-tertiary)', color: joinCode.trim() ? 'white' : 'var(--text-tertiary)', border: 'none', borderRadius: 'var(--radius-md)', padding: '0 16px', display: 'flex', alignItems: 'center', cursor: 'pointer', transition: 'all 0.2s var(--ease-out)' }}><LogIn size={18} /></button>
          </div>
        </form>

        {/* Features */}
        <div style={{ fontSize: '0.6rem', fontWeight: 700, color: 'var(--text-tertiary)', marginBottom: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: "'JetBrains Mono', monospace" }}>FITUR UNGGULAN</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
          {[
            { icon: Video, label: 'HD Video', desc: 'Depan & belakang', color: 'var(--accent-blue)' },
            { icon: Users, label: 'Unlimited', desc: 'Peserta tak terbatas', color: 'var(--accent-purple)' },
            { icon: Monitor, label: 'Share Screen', desc: 'Presentasi layar', color: 'var(--accent-emerald)' },
            { icon: Clock, label: 'No Limit', desc: 'Durasi tak terbatas', color: 'var(--accent-secondary)' },
          ].map((f, i) => (
            <div key={i} style={{ background: 'var(--bg-card)', padding: '0.8rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-xs)' }}>
              <div style={{ marginBottom: '0.4rem', width: 28, height: 28, borderRadius: 'var(--radius-sm)', background: f.color, opacity: 0.9, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                 <f.icon size={14} color="white" />
              </div>
              <div style={{ fontWeight: 600, fontSize: '0.75rem', color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>{f.label}</div>
              <div style={{ fontSize: '0.6rem', color: 'var(--text-tertiary)', marginTop: '2px', lineHeight: 1.4 }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
