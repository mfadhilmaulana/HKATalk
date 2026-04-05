import React, { useState } from 'react';
import { Route, Plus } from 'lucide-react';

export default function ChannelScreen({ onJoinChannel }) {
  const [newChannel, setNewChannel] = useState('');

  const handleCreateChannel = (e) => {
    e.preventDefault();
    if (newChannel.trim().length > 0) {
      onJoinChannel(newChannel.trim().toUpperCase());
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

  return (
    <div className="tab-screen">
      <div className="zello-header">
        <div>
          <h1>Jaringan Audio PTT</h1>
          <div className="subtitle">Saluran Siaran Langsung Nasional</div>
        </div>
      </div>

      <div style={{ padding: '1rem', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }}>
        <form onSubmit={handleCreateChannel} style={{ display: 'flex', gap: '0.5rem' }}>
          <input 
            className="form-input" 
            placeholder="Tulis Channel Baru..."
            value={newChannel}
            onChange={(e) => setNewChannel(e.target.value)}
            style={{ marginBottom: 0, flex: 1, borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-tertiary)', color: 'var(--text-main)' }}
          />
          <button type="submit" disabled={!newChannel.trim()} style={{ background: 'var(--accent)', color: 'white', border: 'none', borderRadius: '8px', padding: '0 1rem', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 'bold' }}>
            <Plus size={18} /> Buat
          </button>
        </form>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
        {channelGroups.map((group, idx) => (
          <div key={idx} style={{ marginBottom: '1rem' }}>
            <h3 className="section-title">{group.title}</h3>
            <div style={{ background: 'var(--bg-secondary)', borderTop: '1px solid var(--border)' }}>
              {group.items.map((chName, i) => (
                <div key={i} className="channel-card" onClick={() => onJoinChannel('HKA-' + chName.replace(/[^a-zA-Z0-9]/g, '').toUpperCase())}>
                  <div className="channel-icon">
                    <Route size={20} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-main)', lineHeight: '1.2' }}>{chName}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>Saluran Tetap</div>
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
