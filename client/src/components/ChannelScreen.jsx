import React, { useState } from 'react';
import { Route, Plus, LogIn, Search } from 'lucide-react';

export default function ChannelScreen({ onJoinChannel }) {
  const [newChannel, setNewChannel] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [search, setSearch] = useState('');

  const handleCreateChannel = (e) => {
    e.preventDefault();
    if (newChannel.trim().length > 0) {
      onJoinChannel(newChannel.trim().toUpperCase());
      setNewChannel('');
    }
  };

  const handleJoinChannel = (e) => {
    e.preventDefault();
    if (joinCode.trim().length > 0) {
      onJoinChannel(joinCode.trim().toUpperCase());
      setJoinCode('');
    }
  };

  const channelGroups = [
    {
      title: 'KANTOR PUSAT',
      items: [
        'Departemen HC, Pengembangan dan IT',
        'Departemen Keuangan, Akuntansi, dan Risiko',
        'Departemen Operasi I',
        'Departemen Operasi II',
        'Departemen QHSSE',
        'Departemen Satuan Pengawas Intern',
        'Departemen Sekretaris Perusahaan',
        'Unit Intelligent Toll Road Systems (ITRS)',
        'Unit Operation Control & Supply Chain (OCSC)',
        'Unit Sistem, Manajemen Risiko & Kepatuhan (SMRK)',
        'Unit Bisnis Turunan OM'
      ]
    },
    {
      title: 'RUAS',
      items: [
        'Ruas BTB',
        'Ruas Akses Tanjung Priok',
        'Ruas Bakauheni–Terbanggi Besar',
        'Ruas Bengkulu–Taba Penanjung',
        'Ruas Betung–Jambi',
        'Ruas Binjai–Stabat',
        'Ruas Indralaya–Prabumulih',
        'Ruas Indrapura–Kisaran',
        'Ruas JORRS',
        'Ruas Kuala Tanjung–Parapat',
        'Ruas Medan–Binjai',
        'Ruas Padang–Sicincin',
        'Ruas Palembang–Indralaya',
        'Ruas Pekanbaru–Bangkinang',
        'Ruas Pekanbaru–Dumai',
        'Ruas Sigli–Banda Aceh',
        'Ruas Terbanggi Besar–Kayu Agung'
      ]
    },
    {
      title: 'UNIT PRODUKSI',
      items: [
        'UP Bojonegara',
        'UP Indralaya',
        'UP Jabodetabek',
        'UP Muara Fajar',
        'UP Patimban',
        'UP Sei Langsat',
        'UP Stone Crusher Sumatera'
      ]
    }
  ];

  // Flatten and filter
  const allItems = channelGroups.flatMap(g => g.items.map(name => ({ name, group: g.title })));
  const filteredGroups = search.trim()
    ? [{ title: 'HASIL PENCARIAN', items: allItems.filter(i => i.name.toLowerCase().includes(search.toLowerCase())).map(i => i.name) }]
    : channelGroups;

  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)' }}>
      <div className="zello-header" style={{ flexShrink: 0 }}>
        <div>
          <h1>Jaringan Audio PTT</h1>
          <div className="subtitle">Saluran Siaran Langsung</div>
        </div>
      </div>

      {/* Action Bar */}
      <div style={{ padding: '0.6rem 0.8rem', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '0.4rem', flexShrink: 0 }}>
        {/* Search */}
        <div style={{ position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input placeholder="Cari saluran..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ width: '100%', padding: '8px 8px 8px 30px', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '0.85rem', background: 'var(--bg-tertiary)', color: '#111', outline: 'none' }} />
        </div>
        
        {/* Create + Join Row */}
        <div style={{ display: 'flex', gap: '0.4rem' }}>
          <form onSubmit={handleCreateChannel} style={{ display: 'flex', gap: '0.3rem', flex: 1 }}>
            <input placeholder="Buat baru..." value={newChannel} onChange={(e) => setNewChannel(e.target.value)} style={{ flex: 1, padding: '7px 10px', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '0.8rem', background: 'var(--bg-tertiary)', color: '#111', outline: 'none' }} />
            <button type="submit" disabled={!newChannel.trim()} style={{ background: newChannel.trim() ? 'var(--accent)' : '#ccc', color: 'white', border: 'none', borderRadius: '8px', padding: '0 8px', display: 'flex', alignItems: 'center', gap: '2px', fontWeight: 600, fontSize: '0.75rem' }}><Plus size={14} /></button>
          </form>
          <form onSubmit={handleJoinChannel} style={{ display: 'flex', gap: '0.3rem', flex: 1 }}>
            <input placeholder="Kode Channel..." value={joinCode} onChange={(e) => setJoinCode(e.target.value)} style={{ flex: 1, padding: '7px 10px', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '0.8rem', background: 'var(--bg-tertiary)', color: '#111', outline: 'none', textTransform: 'uppercase' }} />
            <button type="submit" disabled={!joinCode.trim()} style={{ background: joinCode.trim() ? '#1565c0' : '#ccc', color: 'white', border: 'none', borderRadius: '8px', padding: '0 8px', display: 'flex', alignItems: 'center', gap: '2px', fontWeight: 600, fontSize: '0.75rem' }}><LogIn size={14} /></button>
          </form>
        </div>
      </div>

      {/* Channels */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
        {filteredGroups.map((group, idx) => (
          <div key={idx}>
            <h3 className="section-title">{group.title}</h3>
            <div style={{ background: 'var(--bg-secondary)', borderTop: '1px solid var(--border)' }}>
              {group.items.map((chName, i) => (
                <div key={i} className="channel-card" onClick={() => onJoinChannel('HKA-' + chName.replace(/[^a-zA-Z0-9]/g, '').toUpperCase())} style={{ padding: '0.7rem 1rem' }}>
                  <div className="channel-icon" style={{ width: 40, height: 40 }}>
                    <Route size={18} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-main)', lineHeight: '1.2' }}>{chName}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '1px' }}>Saluran Tetap</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
