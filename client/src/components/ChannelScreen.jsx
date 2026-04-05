import React, { useState } from 'react';
import { Route, Plus, LogIn, Search, Star, Building2, MapPin, Factory } from 'lucide-react';

export default function ChannelScreen({ onJoinChannel, userProfile }) {
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

  const userDept = userProfile?.department || '';

  const channelGroups = [
    {
      title: 'KANTOR PUSAT',
      icon: Building2,
      color: '#1a237e',
      items: [
        'Departemen HC, Pengembangan dan IT',
        'Departemen Keuangan, Akuntansi, dan Risiko',
        'Departemen Operasi I',
        'Departemen Operasi II',
        'Departemen QHSSE',
        'Departemen Satuan Pengawas Intern',
        'Departemen Sekretaris Perusahaan',
        'Unit ITRS',
        'Unit OCSC',
        'Unit SMRK',
        'Unit Bisnis Turunan OM'
      ]
    },
    {
      title: 'RUAS',
      icon: MapPin,
      color: '#00695c',
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
      icon: Factory,
      color: '#bf360c',
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

  // Find user's department match
  const allItems = channelGroups.flatMap(g => g.items);
  const favChannel = allItems.find(ch => {
    if (!userDept) return false;
    // Exact or partial match
    return ch === userDept || ch.toLowerCase().includes(userDept.toLowerCase()) || userDept.toLowerCase().includes(ch.toLowerCase());
  });

  // Search filter
  const filteredGroups = search.trim()
    ? [{ title: 'HASIL PENCARIAN', icon: Search, color: '#555', items: allItems.filter(i => i.toLowerCase().includes(search.toLowerCase())) }]
    : channelGroups;

  const getChannelCode = (name) => 'HKA-' + name.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();

  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)' }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #0d47a1 0%, #1565c0 100%)', color: 'white', padding: '0.8rem 1rem 0.6rem', flexShrink: 0 }}>
        <h1 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Saluran PTT</h1>
        <div style={{ fontSize: '0.7rem', opacity: 0.7, marginTop: '2px' }}>Siaran Langsung • Push-to-Talk</div>
      </div>

      {/* Search & Actions */}
      <div style={{ padding: '0.5rem 0.8rem', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '0.35rem', flexShrink: 0 }}>
        <div style={{ position: 'relative' }}>
          <Search size={13} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input placeholder="Cari saluran..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ width: '100%', padding: '7px 8px 7px 28px', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '0.8rem', background: 'var(--bg-tertiary)', color: '#111', outline: 'none' }} />
        </div>
        <div style={{ display: 'flex', gap: '0.3rem' }}>
          <form onSubmit={handleCreateChannel} style={{ display: 'flex', gap: '0.2rem', flex: 1 }}>
            <input placeholder="Buat baru..." value={newChannel} onChange={(e) => setNewChannel(e.target.value)} style={{ flex: 1, padding: '6px 8px', border: '1px solid var(--border)', borderRadius: '7px', fontSize: '0.75rem', background: 'var(--bg-tertiary)', color: '#111', outline: 'none' }} />
            <button type="submit" disabled={!newChannel.trim()} style={{ background: newChannel.trim() ? 'var(--accent)' : '#ccc', color: 'white', border: 'none', borderRadius: '7px', padding: '0 7px', display: 'flex', alignItems: 'center' }}><Plus size={13} /></button>
          </form>
          <form onSubmit={handleJoinChannel} style={{ display: 'flex', gap: '0.2rem', flex: 1 }}>
            <input placeholder="Kode..." value={joinCode} onChange={(e) => setJoinCode(e.target.value)} style={{ flex: 1, padding: '6px 8px', border: '1px solid var(--border)', borderRadius: '7px', fontSize: '0.75rem', background: 'var(--bg-tertiary)', color: '#111', outline: 'none', textTransform: 'uppercase' }} />
            <button type="submit" disabled={!joinCode.trim()} style={{ background: joinCode.trim() ? '#1565c0' : '#ccc', color: 'white', border: 'none', borderRadius: '7px', padding: '0 7px', display: 'flex', alignItems: 'center' }}><LogIn size={13} /></button>
          </form>
        </div>
      </div>

      {/* Channels */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>

        {/* FAVORITE / USER DEPARTMENT CHANNEL */}
        {favChannel && !search.trim() && (
          <div>
            <div style={{ padding: '0.5rem 1rem 0.25rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <Star size={12} color="#f9a825" fill="#f9a825" />
              <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#f9a825', letterSpacing: '0.5px' }}>DIVISI SAYA</span>
            </div>
            <div style={{ background: 'var(--bg-secondary)', border: '2px solid rgba(249,168,37,0.3)', borderRadius: '10px', margin: '0 0.8rem 0.5rem', overflow: 'hidden' }}>
              <div onClick={() => onJoinChannel(getChannelCode(favChannel))} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.7rem 0.8rem', cursor: 'pointer', background: 'rgba(249,168,37,0.06)' }}>
                <div style={{ width: 42, height: 42, borderRadius: '10px', background: 'linear-gradient(135deg, #f9a825, #ff8f00)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 2px 8px rgba(249,168,37,0.3)' }}>
                  <Star size={18} color="white" fill="white" />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-main)' }}>{favChannel}</div>
                  <div style={{ fontSize: '0.65rem', color: '#f9a825', fontWeight: 600 }}>⭐ Saluran Favorit Anda</div>
                </div>
                <div style={{ background: '#f9a825', color: 'white', borderRadius: '6px', padding: '4px 8px', fontSize: '0.65rem', fontWeight: 700 }}>MASUK</div>
              </div>
            </div>
          </div>
        )}

        {filteredGroups.map((group, idx) => {
          const Icon = group.icon || Route;
          return (
            <div key={idx}>
              <div style={{ padding: '0.5rem 1rem 0.25rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Icon size={12} color={group.color} />
                <span style={{ fontSize: '0.65rem', fontWeight: 700, color: group.color, letterSpacing: '0.5px' }}>{group.title}</span>
                <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>{group.items.length} saluran</span>
              </div>
              <div style={{ background: 'var(--bg-secondary)', borderTop: '1px solid var(--border)' }}>
                {group.items.map((chName, i) => {
                  const isFav = chName === favChannel;
                  return (
                    <div key={i} onClick={() => onJoinChannel(getChannelCode(chName))} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.55rem 1rem', borderBottom: '1px solid var(--border)', cursor: 'pointer', background: isFav ? 'rgba(249,168,37,0.05)' : 'transparent' }}>
                      <div style={{ width: 36, height: 36, borderRadius: '8px', background: isFav ? 'linear-gradient(135deg, #f9a825, #ff8f00)' : group.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, opacity: isFav ? 1 : 0.8 }}>
                        {isFav ? <Star size={15} color="white" fill="white" /> : <Route size={15} color="white" />}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: isFav ? 700 : 600, fontSize: '0.85rem', color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{chName}</div>
                        <div style={{ fontSize: '0.6rem', color: isFav ? '#f9a825' : 'var(--text-muted)', fontWeight: isFav ? 600 : 400 }}>{isFav ? '⭐ Divisi Anda' : 'Saluran Tetap'}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
