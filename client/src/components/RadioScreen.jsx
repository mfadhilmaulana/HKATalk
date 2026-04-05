import React from 'react';

export default function RadioScreen({ activeRadio, onPlayRadio }) {
  return (
    <div className="tab-screen">
      <div className="zello-header">
        <div>
          <h1>Radio FM Nusantara</h1>
          <div className="subtitle">Siaran Hiburan 24/7</div>
        </div>
      </div>
      
      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
        <div className="radio-grid">
          {[
            { id: 'ardan', name: 'Ardan FM', freq: 'Musik Pop Hits', url: 'https://stream.rcs.revma.com/ugpyzu9n5k3vv', color: 'linear-gradient(135deg, #FFB75E 0%, #ED8F03 100%)' },
            { id: 'ssfm', name: 'Suara Surabaya', freq: 'Lalu Lintas Tol', url: 'https://c5.siar.us/proxy/ssfm/stream', color: 'linear-gradient(135deg, #ff416c 0%, #ff4b2b 100%)' },
            { id: 'elshinta', name: 'Elshinta Berita', freq: 'News & Info', url: 'https://stream-ssl.arenastreaming.com:8000/jakarta', color: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)' },
            { id: 'rri', name: 'RRI Pro 3', freq: 'Nasional', url: 'https://stream-node0.rri.co.id/streaming/14/9014/kbrn.mp3', color: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)' }
          ].map(st => (
            <div key={st.id} className={`radio-tile ${activeRadio === st.id ? 'playing' : ''}`} style={{ background: st.color }} onClick={() => onPlayRadio(st)}>
              <div className="radio-disc"></div>
              <div className="radio-info">
                <div className="radio-name">{st.name}</div>
                <div className="radio-freq">{activeRadio === st.id ? 'Sedang Diputar 🔊' : st.freq}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
