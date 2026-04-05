import React, { useState } from 'react';
import { Search, Play, Pause, Volume2, Music, Newspaper, Globe, BookOpen, Headphones, Mic2, AlertCircle, X, Heart } from 'lucide-react';

const CATEGORIES = [
  { key: 'all', label: 'Semua', icon: Headphones },
  { key: 'hits', label: 'Top Hits', icon: Music },
  { key: 'news', label: 'Berita', icon: Newspaper },
  { key: 'regional', label: 'Daerah', icon: Globe },
  { key: 'religi', label: 'Religi', icon: BookOpen },
  { key: 'dangdut', label: 'Dangdut', icon: Heart },
];

// Verified HTTPS Indonesian radio streams (2024-2026)
const STATIONS = [
  // TOP HITS / POP
  { id: 'ardan', name: 'Ardan FM', freq: '105.9 FM Bandung', cat: 'hits', url: 'https://stream.rcs.revma.com/ugpyzu9n5k3vv', color: '#ED8F03' },
  { id: 'mettakoplo', name: 'Mettaswara Koplo', freq: 'Hits Koplo', cat: 'hits', url: 'https://mettaswara.com:8700//koplo', color: '#e91e63' },
  { id: 'dengerin', name: 'Dengerin Musik ID', freq: 'Pop Indonesia', cat: 'hits', url: 'https://stream.denger.in/', color: '#1565c0' },
  { id: 'mstream', name: 'M-Stream Indo', freq: 'Top Hits Bandung', cat: 'hits', url: 'https://stream.zeno.fm/iln4upodbvuuv', color: '#6a1b9a' },
  { id: 'sbfm', name: 'SB FM Tembang', freq: 'Kenangan Indonesia', cat: 'hits', url: 'https://stream.zeno.fm/d16n50mkzhhvv', color: '#00897b' },
  { id: 'imelda', name: 'Imelda FM', freq: 'Classic Hits', cat: 'hits', url: 'https://server.radioimeldafm.co.id:8030/imeldafm', color: '#ad1457' },

  // BERITA / NEWS
  { id: 'sonora', name: 'Sonora FM', freq: '92.0 FM Jakarta', cat: 'news', url: 'https://cast1.my-control-panel.com/proxy/radioso1/stream', color: '#4527a0' },
  { id: 'elshinta', name: 'Elshinta Jakarta', freq: '90.0 FM Jakarta', cat: 'news', url: 'https://stream-ssl.arenastreaming.com:8000/jakarta', color: '#0d47a1' },
  { id: 'sssby', name: 'Suara Surabaya', freq: '100.0 FM Surabaya', cat: 'news', url: 'https://c5.siar.us/proxy/ssfm/stream', color: '#283593' },

  // DAERAH / REGIONAL
  { id: 'dahlia', name: 'Dahlia FM', freq: '101.5 FM Bandung', cat: 'regional', url: 'https://svara-stream.radioddns.net/bandung_dahliafm', color: '#bf360c' },
  { id: 'campursari', name: 'Campursari FM', freq: '89.2 FM Jakarta', cat: 'regional', url: 'https://streaming.campursarifm.com/listen/campursari/campursari892', color: '#827717' },
  { id: 'campursaryjogja', name: 'Campursari Jogja', freq: 'Yogyakarta', cat: 'regional', url: 'https://a8.siar.us/listen/campursari/stream', color: '#4e342e' },
  { id: 'rama', name: 'Rama FM', freq: '104.7 FM Bandung', cat: 'regional', url: 'https://i.klikhost.com/8330/;', color: '#00695c' },

  // RELIGI
  { id: 'sholawat', name: 'Radio Sholawat', freq: 'Sholawat 24 Jam', cat: 'religi', url: 'https://stream.zeno.fm/us5bsznu3rptv', color: '#1b5e20' },

  // DANGDUT
  { id: 'dangdut2', name: 'Dangdut Hits', freq: 'Non-Stop Dangdut', cat: 'dangdut', url: 'https://stream.zeno.fm/vwhplynnpfjtv', color: '#f57f17' },
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
            <h1 style={{ fontSize: '1.1rem', fontWeight: 800 }}>🇮🇩 Radio Indonesia</h1>
            <div style={{ fontSize: '0.65rem', opacity: 0.7 }}>{STATIONS.length} Stasiun Terverifikasi • HTTPS</div>
          </div>
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

      {/* Error Banner */}
      {errorStation && (
        <div style={{ background: 'linear-gradient(135deg, #fff3cd, #ffeaa7)', padding: '0.7rem 1rem', borderBottom: '2px solid #ffc107', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <AlertCircle size={16} color="#e65100" />
              <span style={{ fontWeight: 700, color: '#e65100', fontSize: '0.85rem' }}>{errorStation.name}</span>
              <span style={{ color: '#795548', fontSize: '0.75rem' }}>sedang gangguan</span>
            </div>
            <button onClick={() => { if (onClearError) onClearError(); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#795548', padding: '2px' }}><X size={16} /></button>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#5d4037', marginBottom: '0.3rem' }}>Coba stasiun rekomendasi:</div>
          <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
            {getRecommendations().map(r => (
              <button key={r.id} onClick={() => { if (onClearError) onClearError(); handlePlay(r); }} style={{ padding: '4px 10px', background: r.color, color: 'white', border: 'none', borderRadius: '14px', fontSize: '0.7rem', fontWeight: 600, cursor: 'pointer' }}>{r.name}</button>
            ))}
          </div>
        </div>
      )}

      {/* Station List */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
        {filtered.length === 0 && <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Tidak ada stasiun ditemukan</div>}
        {filtered.map(st => {
          const isPlaying = activeRadio === st.id;
          return (
            <div key={st.id} onClick={() => handlePlay(st)} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.6rem 1rem', background: isPlaying ? 'rgba(211,47,47,0.06)' : 'var(--bg-secondary)', borderBottom: '1px solid var(--border)', cursor: 'pointer', transition: 'background 0.15s' }}>
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

      {/* Now Playing Mini Player */}
      {nowPlaying && (
        <div style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)', padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.6rem', flexShrink: 0, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: `radial-gradient(circle, #333 30%, ${nowPlaying.color} 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'spin 3s linear infinite', flexShrink: 0 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#1a1a2e', border: '2px solid rgba(255,255,255,0.3)' }}></div>
          </div>
          <div style={{ flex: 1, minWidth: 0, color: 'white' }}>
            <div style={{ fontWeight: 700, fontSize: '0.8rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nowPlaying.name}</div>
            <div style={{ fontSize: '0.6rem', opacity: 0.6, display: 'flex', alignItems: 'center', gap: 3 }}><Volume2 size={9} /> {nowPlaying.freq}</div>
          </div>
          <button onClick={(e) => { e.stopPropagation(); onPlayRadio(nowPlaying); }} style={{ width: 30, height: 30, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><Pause size={14} color="white" /></button>
        </div>
      )}
    </div>
  );
}
