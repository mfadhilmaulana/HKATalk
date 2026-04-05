import React, { useState } from 'react';
import { Radio, Plus, LogIn, Search, Star, Building2, MapPin, Factory, Hash, ChevronRight, Mic, Wifi, ArrowRight } from 'lucide-react';

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
      accent: '#2563eb',
      items: [
        'Departemen HC, Pengembangan dan IT',
        'Departemen Keuangan, Akuntansi, dan Risiko',
        'Departemen Operasi I',
        'Departemen Operasi II',
        'Departemen QHSSE',
        'Departemen Satuan Pengawas Intern',
        'Departemen Sekretaris Perusahaan',
        'Unit ITRS','Unit OCSC','Unit SMRK',
        'Unit Bisnis Turunan OM'
      ]
    },
    {
      title: 'RUAS',
      icon: MapPin,
      accent: '#059669',
      items: [
        'Ruas BTB','Ruas Akses Tanjung Priok',
        'Ruas Bakauheni–Terbanggi Besar','Ruas Bengkulu–Taba Penanjung',
        'Ruas Betung–Jambi','Ruas Binjai–Stabat',
        'Ruas Indralaya–Prabumulih','Ruas Indrapura–Kisaran',
        'Ruas JORRS','Ruas Kuala Tanjung–Parapat',
        'Ruas Medan–Binjai','Ruas Padang–Sicincin',
        'Ruas Palembang–Indralaya','Ruas Pekanbaru–Bangkinang',
        'Ruas Pekanbaru–Dumai','Ruas Sigli–Banda Aceh',
        'Ruas Terbanggi Besar–Kayu Agung'
      ]
    },
    {
      title: 'UNIT PRODUKSI',
      icon: Factory,
      accent: '#d97706',
      items: [
        'UP Bojonegara','UP Indralaya','UP Jabodetabek',
        'UP Muara Fajar','UP Patimban','UP Sei Langsat',
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
    ? [{ title: 'HASIL PENCARIAN', icon: Search, accent: '#8b5cf6', items: allItems.filter(i => i.toLowerCase().includes(search.toLowerCase())) }]
    : channelGroups;

  const getChannelCode = (name) => 'HKA-' + name.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();

  const inputStyle = {
    flex: 1, padding: '8px 10px',
    border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)',
    fontSize: '0.75rem', background: 'var(--bg-tertiary)', color: 'var(--text-primary)',
    outline: 'none', fontFamily: 'inherit', transition: 'border-color 0.2s var(--ease-out)'
  };

  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)' }}>
      
      {/* Header */}
      <div style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)', padding: '0.8rem 1rem', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <div style={{ width: 34, height: 34, borderRadius: 'var(--radius-sm)', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Radio size={16} color="white" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '0.95rem', fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>Saluran PTT</div>
            <div style={{ fontSize: '0.6rem', color: 'var(--text-tertiary)', fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.03em', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Wifi size={9} /> SIARAN LANGSUNG
            </div>
          </div>
        </div>
      </div>

      {/* Search & Actions */}
      <div style={{ padding: '0.5rem 0.8rem', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <div style={{ position: 'relative', marginBottom: '0.4rem' }}>
          <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
          <input 
            placeholder="Cari saluran..." value={search} onChange={(e) => setSearch(e.target.value)} 
            style={{ ...inputStyle, flex: 'unset', width: '100%', paddingLeft: '30px' }} 
          />
        </div>
        <div style={{ display: 'flex', gap: '0.3rem' }}>
          <button onClick={() => setShowCreate(!showCreate)} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px', padding: '7px', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', background: 'transparent', color: 'var(--text-secondary)', fontSize: '0.65rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s var(--ease-out)' }}>
            <Plus size={11} /> Buat Baru
          </button>
          <form onSubmit={handleJoinChannel} style={{ flex: 1, display: 'flex', gap: '3px' }}>
            <input placeholder="Kode..." value={joinCode} onChange={(e) => setJoinCode(e.target.value)} style={{ ...inputStyle, textTransform: 'uppercase', fontFamily: "'JetBrains Mono', monospace", fontSize: '0.7rem' }} />
            <button type="submit" disabled={!joinCode.trim()} style={{ background: joinCode.trim() ? 'var(--accent-blue)' : 'var(--bg-tertiary)', color: 'white', border: '1px solid transparent', borderRadius: 'var(--radius-sm)', padding: '0 8px', display: 'flex', alignItems: 'center', cursor: 'pointer', transition: 'all 0.2s var(--ease-out)' }}><LogIn size={12} /></button>
          </form>
        </div>

        {showCreate && (
          <form onSubmit={handleCreateChannel} style={{ display: 'flex', gap: '3px', marginTop: '0.35rem', animation: 'slideIn 0.2s var(--ease-out)' }}>
            <input autoFocus placeholder="Nama saluran baru..." value={newChannel} onChange={(e) => setNewChannel(e.target.value)} style={{ ...inputStyle, borderColor: 'var(--accent-border)' }} />
            <button type="submit" disabled={!newChannel.trim()} style={{ background: newChannel.trim() ? 'var(--accent)' : 'var(--bg-tertiary)', color: 'white', border: 'none', borderRadius: 'var(--radius-sm)', padding: '0 12px', fontWeight: 600, fontSize: '0.65rem', cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s var(--ease-spring)' }}>BUAT</button>
          </form>
        )}
      </div>

      {/* Channel List */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', paddingBottom: '0.5rem' }}>

        {/* Saluran Saya */}
        {favChannel && !search.trim() && (
          <div style={{ padding: '0.6rem 0.8rem 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '0.35rem' }}>
              <Star size={10} color="#f59e0b" />
              <span style={{ fontSize: '0.55rem', fontWeight: 700, color: '#f59e0b', letterSpacing: '0.1em', fontFamily: "'JetBrains Mono', monospace" }}>SALURAN SAYA</span>
            </div>
            <div 
              onClick={() => onJoinChannel(getChannelCode(favChannel))} 
              style={{ 
                background: 'rgba(245,158,11,0.04)', border: '1px solid rgba(245,158,11,0.1)', borderRadius: 'var(--radius-md)', 
                padding: '0.7rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.6rem',
                transition: 'all 0.2s var(--ease-out)'
              }}
            >
              <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-sm)', background: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Star size={16} color="white" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: '0.82rem', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{favChannel}</div>
                <div style={{ fontSize: '0.55rem', color: '#f59e0b', fontWeight: 600, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.02em', marginTop: '1px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                  <Mic size={8} /> SALURAN UTAMA
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent-emerald)', animation: 'breathe 2s infinite' }} />
                <ArrowRight size={14} color="var(--text-tertiary)" />
              </div>
            </div>
          </div>
        )}

        {filteredGroups.map((group, idx) => {
          const Icon = group.icon || Radio;
          return (
            <div key={idx} style={{ padding: '0.5rem 0.8rem 0' }}>
              {/* Group Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '0.3rem', padding: '0 0.1rem' }}>
                <Icon size={10} color={group.accent} />
                <span style={{ fontSize: '0.55rem', fontWeight: 700, color: group.accent, letterSpacing: '0.1em', fontFamily: "'JetBrains Mono', monospace" }}>{group.title}</span>
                <div style={{ flex: 1, height: '1px', background: 'var(--border)', marginLeft: '4px' }} />
                <span style={{ fontSize: '0.55rem', color: 'var(--text-tertiary)', fontFamily: "'JetBrains Mono', monospace" }}>{group.items.length}</span>
              </div>
              
              {/* Items — using border-t dividers, not cards */}
              <div style={{ borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--border-subtle)' }}>
                {group.items.map((chName, i) => {
                  const isFav = chName === favChannel;
                  return (
                    <div 
                      key={i} 
                      onClick={() => onJoinChannel(getChannelCode(chName))} 
                      style={{ 
                        display: 'flex', alignItems: 'center', gap: '0.5rem', 
                        padding: '0.55rem 0.6rem', 
                        borderTop: i > 0 ? '1px solid var(--border)' : 'none', 
                        cursor: 'pointer', 
                        background: isFav ? 'rgba(245,158,11,0.03)' : 'transparent',
                        transition: 'background 0.15s var(--ease-out)',
                      }}
                    >
                      <div style={{ 
                        width: 30, height: 30, borderRadius: '7px', 
                        background: isFav ? '#f59e0b' : group.accent, 
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                        opacity: isFav ? 1 : 0.75,
                      }}>
                        {isFav ? <Star size={12} color="white" /> : <Hash size={12} color="rgba(255,255,255,0.85)" />}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: isFav ? 600 : 500, fontSize: '0.78rem', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', letterSpacing: '-0.01em' }}>{chName}</div>
                        <div style={{ fontSize: '0.5rem', color: isFav ? '#f59e0b' : 'var(--text-tertiary)', fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.03em', marginTop: '1px' }}>
                          {isFav ? 'SALURAN ANDA' : 'SALURAN TETAP'}
                        </div>
                      </div>
                      <ChevronRight size={12} color="var(--text-tertiary)" style={{ opacity: 0.5 }} />
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
