import React, { useState, useEffect } from 'react';
import { QrCode, UserPlus, MessageCircle, Mail } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

export default function ContactScreen({ username, onJoinChannel }) {
  const [contacts, setContacts] = useState([]);
  const [newContactId, setNewContactId] = useState('');
  const [showQR, setShowQR] = useState(false);

  useEffect(() => {
    // Load contacts from local storage on mount
    const saved = localStorage.getItem('sitalaki_contacts');
    if (saved) {
      try {
        setContacts(JSON.parse(saved));
      } catch (e) {
        setContacts([]);
      }
    }
  }, []);

  const saveContact = (e) => {
    e.preventDefault();
    const id = newContactId.trim().toUpperCase();
    if (id && id !== username.toUpperCase() && !contacts.includes(id)) {
      const updated = [...contacts, id];
      setContacts(updated);
      localStorage.setItem('sitalaki_contacts', JSON.stringify(updated));
      setNewContactId('');
    }
  };

  const removeContact = (idToRemove) => {
    const updated = contacts.filter(id => id !== idToRemove);
    setContacts(updated);
    localStorage.setItem('sitalaki_contacts', JSON.stringify(updated));
  };

  const openDirectMessage = (contactId) => {
    // Alphabetically sort to ensure both parties generate the exact same unique channel code
    const sortedNames = [username.toUpperCase(), contactId.toUpperCase()].sort();
    const privateChannelId = `DM-${sortedNames[0]}-${sortedNames[1]}`;
    onJoinChannel(privateChannelId);
  };

  return (
    <div className="tab-screen">
      <div className="zello-header">
        <div>
          <h1>Japri & Kontak</h1>
          <div className="subtitle">ID Saya: {username}</div>
        </div>
      </div>

      <div style={{ padding: '1rem', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
          <button onClick={() => setShowQR(!showQR)} style={{ flex: 1, padding: '0.8rem', background: showQR ? '#111' : 'var(--bg-tertiary)', color: showQR ? 'white' : 'var(--text-main)', border: '1px solid var(--border)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontWeight: 'bold' }}>
            <QrCode size={18} /> {showQR ? 'Tutup QR' : 'QR Code Saya'}
          </button>
          <a href={`mailto:?subject=Ayo Gabung Si Talki&body=Halo, tambahkan ID Kontak saya di aplikasi Si Talki: ${username.toUpperCase()}`} style={{ flex: 1, padding: '0.8rem', background: 'var(--bg-tertiary)', color: 'var(--text-main)', border: '1px solid var(--border)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontWeight: 'bold', textDecoration: 'none' }}>
            <Mail size={18} /> Email
          </a>
        </div>

        {showQR && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '1.5rem', background: 'white', borderRadius: '12px', marginBottom: '1rem', border: '2px dashed var(--border)' }}>
            <QRCodeSVG value={username.toUpperCase()} size={150} />
            <div style={{ marginTop: '1rem', color: '#111', fontWeight: 'bold' }}>SCAN UNTUK JAPRI</div>
          </div>
        )}

        <form onSubmit={saveContact} style={{ display: 'flex', gap: '0.5rem' }}>
          <input 
            className="form-input" 
            placeholder="Ketik ID Kontak..."
            value={newContactId}
            onChange={(e) => setNewContactId(e.target.value)}
            style={{ marginBottom: 0, flex: 1, borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-tertiary)', color: 'var(--text-main)', textTransform: 'uppercase' }}
          />
          <button type="submit" disabled={!newContactId.trim()} style={{ background: 'var(--accent)', color: 'white', border: 'none', borderRadius: '8px', padding: '0 1rem', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 'bold' }}>
            <UserPlus size={18} /> Tambah
          </button>
        </form>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
        <h3 className="section-title">DAFTAR KONTAK TERIKAT</h3>
        <div style={{ background: 'var(--bg-secondary)', borderTop: '1px solid var(--border)' }}>
          {contacts.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Belum ada kontak tersimpan.</div>
          ) : (
            contacts.map((contactId, i) => (
              <div key={i} className="channel-card" style={{ display: 'flex', alignItems: 'center' }}>
                <div className="channel-icon" style={{ background: '#222' }}>
                  <UserPlus size={20} />
                </div>
                <div style={{ flex: 1 }} onClick={() => openDirectMessage(contactId)}>
                  <div style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--text-main)' }}>{contactId}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--accent)', fontWeight: 'bold', marginTop: '2px' }}>🔒 Saluran Enkripsi 1-on-1</div>
                </div>
                <button onClick={() => removeContact(contactId)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.2rem', cursor: 'pointer', padding: '10px' }}>×</button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
