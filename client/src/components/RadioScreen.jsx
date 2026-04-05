import React, { useState } from 'react';
import { Search, Play, Pause, Volume2, Music, Newspaper, Globe, BookOpen, Headphones, Mic2, AlertCircle, X, Heart, Radio } from 'lucide-react';

const CATEGORIES = [
  { key: 'all', label: 'Semua', icon: Headphones },
  { key: 'hits', label: 'Top Hits', icon: Music },
  { key: 'news', label: 'Berita', icon: Newspaper },
  { key: 'regional', label: 'Daerah', icon: Globe },
  { key: 'religi', label: 'Religi', icon: BookOpen },
  { key: 'dangdut', label: 'Dangdut', icon: Heart },
];

const STATIONS = [
  { id: 'ardan', name: 'Ardan FM', freq: '105.9 FM Bandung', cat: 'hits', url: 'https://stream.rcs.revma.com/ugpyzu9n5k3vv', color: '#d97706' },
  { id: 'mettakoplo', name: 'Mettaswara Koplo', freq: 'Hits Koplo', cat: 'hits', url: 'https://mettaswara.com:8700//koplo', color: '#dc2626' },
  { id: 'dengerin', name: 'Dengerin Musik ID', freq: 'Pop Indonesia', cat: 'hits', url: 'https://stream.denger.in/', color: '#2563eb' },
  { id: 'mstream', name: 'M-Stream Indo', freq: 'Top Hits Bandung', cat: 'hits', url: 'https://stream.zeno.fm/iln4upodbvuuv', color: '#7c3aed' },
  { id: 'sbfm', name: 'SB FM Tembang', freq: 'Kenangan Indonesia', cat: 'hits', url: 'https://stream.zeno.fm/d16n50mkzhhvv', color: '#059669' },
  { id: 'imelda', name: 'Imelda FM', freq: 'Classic Hits', cat: 'hits', url: 'https://server.radioimeldafm.co.id:8030/imeldafm', color: '#be185d' },
  { id: 'sonora', name: 'Sonora FM', freq: '92.0 FM Jakarta', cat: 'news', url: 'https://cast1.my-control-panel.com/proxy/radioso1/stream', color: '#4338ca' },
  { id: 'elshinta', name: 'Elshinta Jakarta', freq: '90.0 FM Jakarta', cat: 'news', url: 'https://stream-ssl.arenastreaming.com:8000/jakarta', color: '#1d4ed8' },
  { id: 'sssby', name: 'Suara Surabaya', freq: '100.0 FM Surabaya', cat: 'news', url: 'https://c5.siar.us/proxy/ssfm/stream', color: '#1e40af' },
  { id: 'dahlia', name: 'Dahlia FM', freq: '101.5 FM Bandung', cat: 'regional', url: 'https://svara-stream.radioddns.net/bandung_dahliafm', color: '#c2410c' },
  { id: 'campursari', name: 'Campursari FM', freq: '89.2 FM Jakarta', cat: 'regional', url: 'https://streaming.campursarifm.com/listen/campursari/campursari892', color: '#65a30d' },
  { id: 'campursaryjogja', name: 'Campursari Jogja', freq: 'Yogyakarta', cat: 'regional', url: 'https://a8.siar.us/listen/campursari/stream', color: '#78350f' },
  { id: 'rama', name: 'Rama FM', freq: '104.7 FM Bandung', cat: 'regional', url: 'https://i.klikhost.com/8330/;', color: '#047857' },
  { id: 'sholawat', name: 'Radio Sholawat', freq: 'Sholawat 24 Jam', cat: 'religi', url: 'https://stream.zeno.fm/us5bsznu3rptv', color: '#15803d' },
  { id: 'dangdut2', name: 'Dangdut Hits', freq: 'Non-Stop Dangdut', cat: 'dangdut', url: 'https://stream.zeno.fm/vwhplynnpfjtv', color: '#b45309' },
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
      <div style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)', padding: '0.75rem 1rem 0.5rem', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem' }}>
          <div style={{ width: 34, height: 34, borderRadius: 'var(--radius-sm)', background: 'var(--accent-purple)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Radio size={16} color="white" />
          </div>
          <div>
            <h1 style={{ fontSize: '0.95rem', fontWeight: 700, letterSpacing: '-0.02em' }}>Radio Indonesia</h1>
            <div style={{ fontSize: '0.55rem', color: 'var(--text-tertiary)', fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.04em' }}>{STATIONS.length} STASIUN TERVERIFIKASI</div>
          </div>
        </div>
        <div style={{ position: 'relative', marginBottom: '0.4rem' }}>
          <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
          <input type="text" placeholder="Cari stasiun..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ width: '100%', padding: '7px 8px 7px 30px', background: 'var(--bg-tertiary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', fontSize: '0.75rem', outline: 'none', fontFamily: 'inherit' }} />
        </div>
        <div style={{ display: 'flex', gap: '3px', overflowX: 'auto', paddingBottom: '0.2rem' }}>
          {CATEGORIES.map(cat => {
            const Icon = cat.icon;
            return <button key={cat.key} onClick={() => setActiveCat(cat.key)} style={{ display: 'flex', alignItems: 'center', gap: '2px', padding: '3px 8px', borderRadius: 'var(--radius-full)', border: '1px solid ' + (activeCat === cat.key ? 'var(--accent)' : 'var(--border)'), background: activeCat === cat.key ? 'var(--accent)' : 'var(--bg-tertiary)', color: activeCat === cat.key ? 'white' : 'var(--text-secondary)', fontSize: '0.6rem', fontWeight: 600, whiteSpace: 'nowrap', cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s var(--ease-out)' }}><Icon size={9} /> {cat.label}</button>;
          })}
        </div>
      </div>

      {/* Error Banner */}
      {errorStation && (
        <div style={{ background: 'rgba(245,158,11,0.06)', padding: '0.6rem 0.8rem', borderBottom: '1px solid rgba(245,158,11,0.15)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <AlertCircle size={14} color="#d97706" />
              <span style={{ fontWeight: 700, color: '#92400e', fontSize: '0.75rem' }}>{errorStation.name}</span>
              <span style={{ color: 'var(--text-tertiary)', fontSize: '0.65rem' }}>sedang gangguan</span>
            </div>
            <button onClick={() => { if (onClearError) onClearError(); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', padding: '2px' }}><X size={14} /></button>
          </div>
          <div style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', marginBottom: '0.25rem', fontFamily: "'JetBrains Mono', monospace" }}>REKOMENDASI:</div>
          <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
            {getRecommendations().map(r => (
              <button key={r.id} onClick={() => { if (onClearError) onClearError(); handlePlay(r); }} style={{ padding: '3px 8px', background: r.color, color: 'white', border: 'none', borderRadius: 'var(--radius-full)', fontSize: '0.6rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>{r.name}</button>
            ))}
          </div>
        </div>
      )}

      {/* Station List */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
        {filtered.length === 0 && <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '0.8rem' }}>Tidak ada stasiun ditemukan</div>}
        {filtered.map(st => {
          const isPlaying = activeRadio === st.id;
          return (
            <div key={st.id} onClick={() => handlePlay(st)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.8rem', background: isPlaying ? 'var(--accent-subtle)' : 'var(--bg-card)', borderBottom: '1px solid var(--border)', cursor: 'pointer', transition: 'background 0.15s var(--ease-out)' }}>
              <div style={{ width: 38, height: 38, borderRadius: 'var(--radius-sm)', background: st.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {isPlaying ? (
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: '2px', height: '14px' }}>
                    <span style={{ width: 3, background: 'white', borderRadius: 2, animation: 'eqBar1 0.5s ease infinite alternate', display: 'block', height: '60%' }} />
                    <span style={{ width: 3, background: 'white', borderRadius: 2, animation: 'eqBar2 0.4s ease infinite alternate', display: 'block', height: '100%' }} />
                    <span style={{ width: 3, background: 'white', borderRadius: 2, animation: 'eqBar3 0.6s ease infinite alternate', display: 'block', height: '40%' }} />
                  </div>
                ) : <Music size={16} color="white" />}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, color: isPlaying ? 'var(--accent)' : 'var(--text-primary)', fontSize: '0.8rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', letterSpacing: '-0.01em' }}>{st.name}</div>
                <div style={{ fontSize: '0.55rem', color: 'var(--text-tertiary)', marginTop: '1px', fontFamily: "'JetBrains Mono', monospace" }}>{st.freq}</div>
              </div>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: isPlaying ? 'var(--accent)' : 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.2s var(--ease-out)' }}>
                {isPlaying ? <Pause size={11} color="white" /> : <Play size={11} color="var(--text-tertiary)" style={{ marginLeft: 1 }} />}
              </div>
            </div>
          );
        })}
      </div>

      {/* Now Playing */}
      {nowPlaying && (
        <div style={{ background: 'var(--bg-secondary)', padding: '0.5rem 0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0, borderTop: '1px solid var(--border)' }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: nowPlaying.color, display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'spin 3s linear infinite', flexShrink: 0 }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--bg-secondary)', border: '2px solid rgba(0,0,0,0.15)' }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: '0.75rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', letterSpacing: '-0.01em' }}>{nowPlaying.name}</div>
            <div style={{ fontSize: '0.55rem', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: 3, fontFamily: "'JetBrains Mono', monospace" }}><Volume2 size={8} /> {nowPlaying.freq}</div>
          </div>
          <button onClick={(e) => { e.stopPropagation(); onPlayRadio(nowPlaying); }} style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--bg-tertiary)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.15s var(--ease-spring)' }}><Pause size={12} color="var(--text-secondary)" /></button>
        </div>
      )}
    </div>
  );
}
