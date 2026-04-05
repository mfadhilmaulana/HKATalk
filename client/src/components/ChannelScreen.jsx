import React, { useState } from 'react';
import { Radio, Plus, LogIn, Search, Star, Building2, MapPin, Factory, Wifi, Zap, Hash, ChevronRight, Mic } from 'lucide-react';

export default function ChannelScreen({ onJoinChannel, userProfile }) {
  const [newChannel, setNewChannel] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  const handleCreateChannel = (e) => {
    e.preventDefault();
    if (newChannel.trim().length > 0) {
      onJoinChannel(newChannel.trim().toUpperCase());
      setNewChannel('');
      setShowCreate(false);
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
      color: '#3b82f6',
      gradient: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
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
      color: '#22c55e',
      gradient: 'linear-gradient(135deg, #15803d 0%, #22c55e 100%)',
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
      color: '#f97316',
      gradient: 'linear-gradient(135deg, #c2410c 0%, #f97316 100%)',
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

  const allItems = channelGroups.flatMap(g => g.items);
  const favChannel = allItems.find(ch => {
    if (!userDept) return false;
    return ch === userDept || ch.toLowerCase().includes(userDept.toLowerCase()) || userDept.toLowerCase().includes(ch.toLowerCase());
  });

  const filteredGroups = search.trim()
    ? [{ title: 'HASIL PENCARIAN', icon: Search, color: '#a855f7', gradient: 'linear-gradient(135deg, #7e22ce 0%, #a855f7 100%)', items: allItems.filter(i => i.toLowerCase().includes(search.toLowerCase())) }]
    : channelGroups;

  const getChannelCode = (name) => 'HKA-' + name.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();

  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)' }}>
      
      {/* ═══ Premium Header ═══ */}
      <div style={{ background: 'linear-gradient(135deg, var(--accent) 0%, #b71c1c 100%)', color: 'white', padding: '1rem 1.2rem 0.8rem', flexShrink: 0, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '-30px', right: '-30px', width: '120px', height: '120px', background: 'radial-gradient(circle, rgba(255,255,255,0.1), transparent 70%)', borderRadius: '50%' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem' }}>
          <div style={{ width: 36, height: 36, borderRadius: '10px', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
            <Radio size={18} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.15rem', fontWeight: 800, letterSpacing: '0.3px' }}>Saluran PTT</h1>
            <div style={{ fontSize: '0.65rem', opacity: 0.8, fontWeight: 500, display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Wifi size={10} /> Siaran Langsung • Push-to-Talk
            </div>
          </div>
        </div>
      </div>

      {/* ═══ Search & Quick Actions ═══ */}
      <div style={{ padding: '0.6rem 0.8rem', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <div style={{ position: 'relative', marginBottom: '0.4rem' }}>
          <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
          <input 
            placeholder="Cari saluran..." 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
            style={{ width: '100%', padding: '9px 10px 9px 34px', border: '1px solid var(--border-light)', borderRadius: '10px', fontSize: '0.8rem', background: 'var(--bg-tertiary)', color: 'var(--text-main)', outline: 'none', fontFamily: 'inherit', transition: 'border-color 0.2s' }} 
          />
        </div>
        <div style={{ display: 'flex', gap: '0.4rem' }}>
          <button onClick={() => setShowCreate(!showCreate)} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', padding: '7px', border: '1px solid var(--border-light)', borderRadius: '8px', background: 'var(--bg-tertiary)', color: 'var(--text-muted)', fontSize: '0.7rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s' }}>
            <Plus size={12} /> Buat Baru
          </button>
          <form onSubmit={handleJoinChannel} style={{ flex: 1, display: 'flex', gap: '4px' }}>
            <input placeholder="Kode saluran..." value={joinCode} onChange={(e) => setJoinCode(e.target.value)} style={{ flex: 1, padding: '7px 8px', border: '1px solid var(--border-light)', borderRadius: '8px', fontSize: '0.7rem', background: 'var(--bg-tertiary)', color: 'var(--text-main)', outline: 'none', textTransform: 'uppercase', fontFamily: 'inherit' }} />
            <button type="submit" disabled={!joinCode.trim()} style={{ background: joinCode.trim() ? 'var(--accent-blue)' : 'var(--bg-tertiary)', color: 'white', border: 'none', borderRadius: '8px', padding: '0 10px', display: 'flex', alignItems: 'center', cursor: 'pointer', transition: 'all 0.2s' }}><LogIn size={13} /></button>
          </form>
        </div>

        {/* Create Channel Panel */}
        {showCreate && (
          <form onSubmit={handleCreateChannel} style={{ display: 'flex', gap: '4px', marginTop: '0.4rem', animation: 'slideIn 0.2s ease-out' }}>
            <input autoFocus placeholder="Nama saluran baru..." value={newChannel} onChange={(e) => setNewChannel(e.target.value)} style={{ flex: 1, padding: '8px 10px', border: '1px solid var(--accent)', borderRadius: '8px', fontSize: '0.8rem', background: 'var(--accent-soft)', color: 'var(--text-main)', outline: 'none', fontFamily: 'inherit' }} />
            <button type="submit" disabled={!newChannel.trim()} style={{ background: newChannel.trim() ? 'var(--accent)' : 'var(--bg-tertiary)', color: 'white', border: 'none', borderRadius: '8px', padding: '0 14px', fontWeight: 600, fontSize: '0.75rem', cursor: 'pointer', fontFamily: 'inherit' }}>BUAT</button>
          </form>
        )}
      </div>

      {/* ═══ Channel List ═══ */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', paddingBottom: '1rem' }}>

        {/* ★ SALURAN SAYA */}
        {favChannel && !search.trim() && (
          <div style={{ padding: '0.6rem 0.8rem 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '0.4rem' }}>
              <Star size={12} color="#ffca28" fill="#ffca28" />
              <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#ffca28', letterSpacing: '1px' }}>SALURAN SAYA</span>
            </div>
            <div 
              onClick={() => onJoinChannel(getChannelCode(favChannel))} 
              style={{ 
                background: 'linear-gradient(135deg, rgba(255,202,40,0.12) 0%, rgba(255,143,0,0.08) 100%)', 
                border: '1px solid rgba(255,202,40,0.2)', 
                borderRadius: '14px', 
                padding: '0.8rem', 
                cursor: 'pointer', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.7rem',
                transition: 'all 0.2s',
                marginBottom: '0.3rem'
              }}
            >
              <div style={{ width: 46, height: 46, borderRadius: '12px', background: 'linear-gradient(135deg, #ffca28, #ff8f00)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 4px 12px rgba(255,202,40,0.3)' }}>
                <Star size={20} color="white" fill="white" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{favChannel}</div>
                <div style={{ fontSize: '0.65rem', color: '#ffca28', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '3px', marginTop: '2px' }}>
                  <Mic size={10} /> Saluran Utama Anda
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 6px rgba(34,197,94,0.5)', animation: 'pulseBg 2s infinite' }} />
                <ChevronRight size={16} color="var(--text-dim)" />
              </div>
            </div>
          </div>
        )}

        {filteredGroups.map((group, idx) => {
          const Icon = group.icon || Radio;
          return (
            <div key={idx} style={{ padding: '0.5rem 0.8rem 0' }}>
              {/* Group Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '0.35rem', padding: '0 0.2rem' }}>
                <div style={{ width: 20, height: 20, borderRadius: '5px', background: group.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon size={11} color="white" />
                </div>
                <span style={{ fontSize: '0.65rem', fontWeight: 700, color: group.color, letterSpacing: '1px' }}>{group.title}</span>
                <div style={{ flex: 1, height: '1px', background: 'var(--border)', marginLeft: '4px' }} />
                <span style={{ fontSize: '0.6rem', color: 'var(--text-dim)', fontWeight: 500 }}>{group.items.length}</span>
              </div>
              
              {/* Channel Items */}
              <div style={{ background: 'var(--bg-card)', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border)' }}>
                {group.items.map((chName, i) => {
                  const isFav = chName === favChannel;
                  return (
                    <div 
                      key={i} 
                      onClick={() => onJoinChannel(getChannelCode(chName))} 
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '0.6rem', 
                        padding: '0.6rem 0.7rem', 
                        borderBottom: i < group.items.length - 1 ? '1px solid var(--border)' : 'none', 
                        cursor: 'pointer', 
                        background: isFav ? 'rgba(255,202,40,0.06)' : 'transparent',
                        transition: 'background 0.15s'
                      }}
                    >
                      <div style={{ 
                        width: 36, height: 36, borderRadius: '9px', 
                        background: isFav ? 'linear-gradient(135deg, #ffca28, #ff8f00)' : group.gradient, 
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                        boxShadow: `0 2px 8px ${isFav ? 'rgba(255,202,40,0.2)' : 'rgba(0,0,0,0.2)'}` 
                      }}>
                        {isFav ? <Star size={14} color="white" fill="white" /> : <Hash size={14} color="rgba(255,255,255,0.85)" />}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: isFav ? 700 : 500, fontSize: '0.82rem', color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{chName}</div>
                        <div style={{ fontSize: '0.6rem', color: isFav ? '#ffca28' : 'var(--text-dim)', fontWeight: isFav ? 600 : 400, marginTop: '1px' }}>
                          {isFav ? '⭐ Saluran Anda' : 'Saluran Tetap'}
                        </div>
                      </div>
                      <ChevronRight size={14} color="var(--text-dim)" />
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
