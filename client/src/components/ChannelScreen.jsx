import React, { useState } from 'react';
import { Route, Plus, LogIn, Search, Star, Building2, MapPin, Factory, Hash, ChevronRight } from 'lucide-react';

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
      color: '#0088cc',
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
      title: 'RUAS JALAN TOL',
      icon: MapPin,
      color: '#25d366',
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
      color: '#ff9500',
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
    return ch === userDept || ch.toLowerCase().includes(userDept.toLowerCase()) || userDept.toLowerCase().includes(ch.toLowerCase());
  });

  // Search filter
  const filteredGroups = search.trim()
    ? [{ title: 'HASIL PENCARIAN', icon: Search, color: '#555', items: allItems.filter(i => i.toLowerCase().includes(search.toLowerCase())) }]
    : channelGroups;

  const getChannelCode = (name) => 'HKA-' + name.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();

  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)' }}>
      {/* Premium Header */}
      <div style={{ background: 'white', padding: '1.2rem 1.2rem 0.8rem', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 900, color: 'var(--text-main)', margin: 0 }}>Saluran</h1>
        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500, marginTop: '4px' }}>Komunikasi PTT Seluruh Insan HKA</div>
      </div>

      {/* Action Bar (Search & Quick Actions) */}
      <div style={{ padding: '0.8rem 1rem', background: 'white', display: 'flex', flexDirection: 'column', gap: '0.8rem', flexShrink: 0, boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
        <div style={{ position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input placeholder="Cari saluran divisi..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ width: '100%', padding: '12px 12px 12px 40px', border: 'none', borderRadius: '14px', fontSize: '1rem', background: 'var(--bg-primary)', color: '#111', outline: 'none', fontWeight: 500 }} />
        </div>
        
        {!search.trim() && (
          <div style={{ display: 'flex', gap: '8px' }}>
            <form onSubmit={handleCreateChannel} style={{ display: 'flex', flex: 1 }}>
               <div style={{ position: 'relative', flex: 1 }}>
                  <Plus size={16} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--accent)' }} />
                  <input placeholder="Buat saluran" value={newChannel} onChange={(e) => setNewChannel(e.target.value)} style={{ width: '100%', padding: '10px 10px 10px 32px', border: '1px solid var(--border)', borderRadius: '12px', fontSize: '0.85rem', background: 'white', color: '#111', outline: 'none' }} />
               </div>
            </form>
            <form onSubmit={handleJoinChannel} style={{ display: 'flex', flex: 1 }}>
               <div style={{ position: 'relative', flex: 1 }}>
                  <LogIn size={16} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--success)' }} />
                  <input placeholder="Kode akses" value={joinCode} onChange={(e) => setJoinCode(e.target.value)} style={{ width: '100%', padding: '10px 10px 10px 32px', border: '1px solid var(--border)', borderRadius: '12px', fontSize: '0.85rem', background: 'white', color: '#111', outline: 'none', textTransform: 'uppercase' }} />
               </div>
            </form>
          </div>
        )}
      </div>

      {/* Content */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', paddingBottom: '1rem' }}>

        {/* FAVORITE SECTION (Redesigned) */}
        {favChannel && !search.trim() && (
          <div style={{ marginTop: '1.2rem' }}>
            <div style={{ padding: '0 1.2rem 0.6rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Star size={14} color="var(--warning)" fill="var(--warning)" />
              <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '0.5px' }}>DIVISI SAYA</span>
            </div>
            <div className="favorite-card" onClick={() => onJoinChannel(getChannelCode(favChannel))}>
               <div style={{ width: 54, height: 54, borderRadius: '16px', background: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 4px 15px rgba(255,165,0,0.3)' }}>
                  <Star size={24} color="white" fill="white" />
               </div>
               <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--text-main)', marginBottom: '2px' }}>{favChannel}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                     <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--success)' }}></div>
                     <div style={{ fontSize: '0.75rem', color: 'var(--success)', fontWeight: 700 }}>SALURAN PRIORITAS</div>
                  </div>
               </div>
               <ChevronRight size={20} color="#ccc" />
            </div>
          </div>
        )}

        {/* CHANNEL GROUPS */}
        {filteredGroups.map((group, idx) => {
          const Icon = group.icon || Route;
          return (
            <div key={idx} style={{ marginTop: '1.5rem' }}>
              <div style={{ padding: '0 1.2rem 0.6rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: 24, height: 24, borderRadius: '6px', background: `${group.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                   <Icon size={14} color={group.color} />
                </div>
                <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '0.5px' }}>{group.title}</span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginLeft: 'auto', fontWeight: 500 }}>{group.items.length} Saluran</span>
              </div>
              
              <div style={{ background: 'white', borderRadius: '20px', margin: '0 12px', overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,0.02)', border: '1px solid var(--border)' }}>
                {group.items.map((chName, i) => {
                  const isFav = chName === favChannel;
                  return (
                    <div key={i} onClick={() => onJoinChannel(getChannelCode(chName))} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderBottom: i === group.items.length - 1 ? 'none' : '1px solid var(--border)', cursor: 'pointer', transition: 'background 0.2s' }} className="channel-list-item-hover">
                      <div style={{ width: 40, height: 40, borderRadius: '12px', background: isFav ? 'linear-gradient(135deg, #FFD700, #FFA500)' : `${group.color}10`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {isFav ? <Star size={18} color="white" fill="white" /> : <Hash size={18} color={group.color} />}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{chName}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 500 }}>{isFav ? 'Klik untuk masuk saluran utama' : 'Saluran koordinasi operasional'}</div>
                      </div>
                      <ChevronRight size={16} color="#ddd" />
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Visual Spacer for Bottom Nav */}
      <div style={{ height: 'calc(env(safe-area-inset-bottom) + 60px)' }}></div>
    </div>
  );
}
