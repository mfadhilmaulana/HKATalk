import React, { useState } from 'react';
import { Search, Play, Pause, Volume2, Music, Newspaper, Globe, BookOpen, Headphones, Mic2, AlertCircle, X } from 'lucide-react';

const CATEGORIES = [
  { key: 'all', label: 'Semua', icon: Headphones },
  { key: 'hits', label: 'Top Hits', icon: Music },
  { key: 'news', label: 'Berita', icon: Newspaper },
  { key: 'regional', label: 'Daerah', icon: Globe },
  { key: 'religi', label: 'Religi', icon: BookOpen },
  { key: 'podcast', label: 'Podcast', icon: Mic2 },
];

// All streams from rcs.revma.com (most reliable Indonesian radio CDN with CORS)
const STATIONS = [
  { id: 'prambors', name: 'Prambors', freq: '102.2 FM Jakarta', cat: 'hits', url: 'https://stream.rcs.revma.com/pbbkq0v7hqhvv', color: '#e91e63' },
  { id: 'hardrock', name: 'Hard Rock FM', freq: '87.6 FM Jakarta', cat: 'hits', url: 'https://stream.rcs.revma.com/gm744ut07qhvv', color: '#880e4f' },
  { id: 'traxfm', name: 'Trax FM', freq: '101.4 FM Jakarta', cat: 'hits', url: 'https://stream.rcs.revma.com/ypqt40u0hqhvv', color: '#ff6d00' },
  { id: 'mustang', name: 'Mustang 88', freq: '88.0 FM Jakarta', cat: 'hits', url: 'https://stream.rcs.revma.com/aw9uqyxy2tzuv', color: '#6a1b9a' },
  { id: 'ozradio', name: 'OZ Radio', freq: '90.8 FM Jakarta', cat: 'hits', url: 'https://stream.rcs.revma.com/4s5zhm12sqhvv', color: '#00897b' },
  { id: 'ardan', name: 'Ardan FM', freq: '105.9 FM Bandung', cat: 'hits', url: 'https://stream.rcs.revma.com/ugpyzu9n5k3vv', color: '#ED8F03' },

  { id: 'sindo', name: 'Sindo Trijaya', freq: '104.6 FM Jakarta', cat: 'news', url: 'https://stream.rcs.revma.com/rmc3cfr7hqhvv', color: '#0d47a1' },
  { id: 'sonora', name: 'Sonora FM', freq: '92.0 FM Jakarta', cat: 'news', url: 'https://stream.rcs.revma.com/bkbntgszhqhvv', color: '#4527a0' },

  { id: 'pas', name: 'PAS FM', freq: '92.4 FM Jakarta', cat: 'regional', url: 'https://stream.rcs.revma.com/ekh2v0w0iqhvv', color: '#bf360c' },
  { id: 'cosmopol', name: 'Cosmopolitan FM', freq: '90.4 FM Jakarta', cat: 'regional', url: 'https://stream.rcs.revma.com/ct8ks0v7hqhvv', color: '#ad1457' },
  { id: 'female', name: 'Female Radio', freq: '96.9 FM Jakarta', cat: 'regional', url: 'https://stream.rcs.revma.com/3ybr4aw0iqhvv', color: '#d81b60' },
  { id: 'jak', name: 'JAK FM', freq: '101.0 FM Jakarta', cat: 'regional', url: 'https://stream.rcs.revma.com/anu5qx40iqhvv', color: '#1565c0' },

  { id: 'dakta', name: 'Dakta Radio', freq: '107.0 FM Bekasi', cat: 'religi', url: 'https://stream.rcs.revma.com/7c5suhvt2tzuv', color: '#004d40' },

  { id: 'podcast1', name: 'Podcast Bisnis', freq: 'Inspirasi & Motivasi', cat: 'podcast', url: 'https://stream.rcs.revma.com/pbbkq0v7hqhvv', color: '#37474f' },
  { id: 'podcast2', name: 'Podcast Teknologi', freq: 'AI, Gadget & Startup', cat: 'podcast', url: 'https://stream.rcs.revma.com/gm744ut07qhvv', color: '#263238' },
];

export default function RadioScreen({ activeRadio, onPlayRadio, radioError, onClearError }) {
  const [activeCat, setActiveCat] = useState('all');
  const [search, setSearch] = useState('');

  const errorStation = radioError;
  const filtered = STATIONS.filter(st => {
    const matchCat = activeCat === 'all' || st.cat === activeCat;
    const matchSearch = !search || st.name.toLowerCase().includes(search.toLowerCase()) || st.freq.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const nowPlaying = STATIONS.find(st => st.id === activeRadio);

  const handlePlay = (st) => {
    if (onClearError) onClearError();
    onPlayRadio(st);
  };

  // Find alternative stations (same category, not the failed one)
  const getRecommendations = () => {
    if (!errorStation) return [];
    return STATIONS.filter(s => s.id !== errorStation.id && s.cat === errorStation.cat).slice(0, 3);
  };

  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)' }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)', color: 'white', padding: '0.8rem 1rem 0.5rem', flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
          <div>
            <h1 style={{ fontSize: '1.1rem', fontWeight: 800 }}>Radio Nusantara</h1>
            <div style={{ fontSize: '0.65rem', opacity: 0.7 }}>{STATIONS.length} Stasiun • 24/7</div>
          </div>
          <Headphones size={16} style={{ opacity: 0.5 }} />
        </div>
        <div style={{ position: 'relative', marginBottom: '0.5rem' }}>
          <Search size={13} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.4)' }} />
          <input type="text" placeholder="Cari stasiun..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ width: '100%', padding: '6px 6px 6px 26px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '7px', color: 'white', fontSize: '0.8rem', outline: 'none' }} />
        </div>
        <div style={{ display: 'flex', gap: '3px', overflowX: 'auto', paddingBottom: '0.3rem' }}>
          {CATEGORIES.map(cat => {
            const Icon = cat.icon;
            return <button key={cat.key} onClick={() => setActiveCat(cat.key)} style={{ display: 'flex', alignItems: 'center', gap: '2px', padding: '3px 8px', borderRadius: '12px', border: 'none', background: activeCat === cat.key ? 'white' : 'rgba(255,255,255,0.1)', color: activeCat === cat.key ? '#1a1a2e' : 'rgba(255,255,255,0.7)', fontSize: '0.65rem', fontWeight: 600, whiteSpace: 'nowrap', cursor: 'pointer' }}><Icon size={10} /> {cat.label}</button>;
          })}
        </div>
      </div>

      {/* Error Modal */}
      {errorStation && (
        <div style={{ background: '#fff3cd', padding: '0.7rem 1rem', borderBottom: '1px solid #ffc107', display: 'flex', flexDirection: 'column', gap: '0.4rem', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, color: '#856404', fontSize: '0.85rem' }}><AlertCircle size={16} /> {errorStation.name} sedang gangguan</div>
            <button onClick={() => { if (onClearError) onClearError(); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#856404' }}><X size={16} /></button>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#856404' }}>Coba stasiun rekomendasi:</div>
          <div style={{ display: 'flex', gap: '0.3rem' }}>
            {getRecommendations().map(r => (
              <button key={r.id} onClick={() => { if (onClearError) onClearError(); handlePlay(r); }} style={{ padding: '4px 10px', background: r.color, color: 'white', border: 'none', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 600, cursor: 'pointer' }}>{r.name}</button>
            ))}
          </div>
        </div>
      )}

      {/* Station List */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
        {filtered.map(st => {
          const isPlaying = activeRadio === st.id;
          return (
            <div key={st.id} onClick={() => handlePlay(st)} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.6rem 1rem', background: isPlaying ? 'rgba(211,47,47,0.06)' : 'var(--bg-secondary)', borderBottom: '1px solid var(--border)', cursor: 'pointer' }}>
              <div style={{ width: 42, height: 42, borderRadius: '10px', background: st.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 2px 6px rgba(0,0,0,0.12)' }}>
                {isPlaying ? (
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: '2px', height: '16px' }}>
                    <span style={{ width: 3, background: 'white', borderRadius: 2, animation: 'eqBar1 0.5s ease infinite alternate', display: 'block', height: '60%' }}></span>
                    <span style={{ width: 3, background: 'white', borderRadius: 2, animation: 'eqBar2 0.4s ease infinite alternate', display: 'block', height: '100%' }}></span>
                    <span style={{ width: 3, background: 'white', borderRadius: 2, animation: 'eqBar3 0.6s ease infinite alternate', display: 'block', height: '40%' }}></span>
                  </div>
                ) : <Music size={18} color="white" />}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, color: isPlaying ? 'var(--accent)' : 'var(--text-main)', fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{st.name}</div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '1px' }}>{st.freq}</div>
              </div>
              <div style={{ width: 30, height: 30, borderRadius: '50%', background: isPlaying ? 'var(--accent)' : 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {isPlaying ? <Pause size={12} color="white" /> : <Play size={12} color="var(--text-muted)" style={{ marginLeft: 1 }} />}
              </div>
            </div>
          );
        })}
      </div>

      {/* Now Playing */}
      {nowPlaying && (
        <div style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)', padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.6rem', flexShrink: 0 }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: `radial-gradient(circle, #333 30%, ${nowPlaying.color} 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'spin 3s linear infinite', flexShrink: 0 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#1a1a2e', border: '2px solid rgba(255,255,255,0.3)' }}></div>
          </div>
          <div style={{ flex: 1, minWidth: 0, color: 'white' }}>
            <div style={{ fontWeight: 700, fontSize: '0.8rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nowPlaying.name}</div>
            <div style={{ fontSize: '0.6rem', opacity: 0.6, display: 'flex', alignItems: 'center', gap: 3 }}><Volume2 size={9} /> Live</div>
          </div>
          <button onClick={(e) => { e.stopPropagation(); onPlayRadio(nowPlaying); }} style={{ width: 30, height: 30, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><Pause size={14} color="white" /></button>
        </div>
      )}
    </div>
  );
}
