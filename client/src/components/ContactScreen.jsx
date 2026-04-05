import React, { useState, useEffect } from 'react';
import { QrCode, UserPlus, Mail, Search, MessageCircle, Phone, ChevronRight, LogOut, Edit2, Check } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

export default function ContactScreen({ username, userPhone, userProfile, onJoinChannel, onLogout }) {
  const [contacts, setContacts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showQR, setShowQR] = useState(false);
  const [tab, setTab] = useState('contacts'); // 'contacts' | 'search' | 'profile'
  const [editName, setEditName] = useState(userProfile?.display_name || '');
  const [editDept, setEditDept] = useState(userProfile?.department || '');
  const [saving, setSaving] = useState(false);

  // Load contacts from DB
  useEffect(() => {
    if (userPhone) {
      fetch(`/api/contacts/${userPhone}`)
        .then(r => r.json())
        .then(data => setContacts(data.contacts || []))
        .catch(() => {});
    }
  }, [userPhone]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    try {
      const res = await fetch(`/api/users?q=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      setSearchResults((data.users || []).filter(u => u.phone !== userPhone));
    } catch { setSearchResults([]); }
  };

  const addContact = async (contactPhone) => {
    try {
      await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ owner_phone: userPhone, contact_phone: contactPhone })
      });
      // Reload contacts
      const res = await fetch(`/api/contacts/${userPhone}`);
      const data = await res.json();
      setContacts(data.contacts || []);
      setTab('contacts');
    } catch {}
  };

  const openDM = (contactPhone) => {
    const sorted = [userPhone, contactPhone].sort();
    onJoinChannel(`DM-${sorted[0]}-${sorted[1]}`);
  };

  const saveProfile = async () => {
    setSaving(true);
    try {
      await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: userPhone, display_name: editName, department: editDept })
      });
      // Update localStorage
      const updated = { ...userProfile, display_name: editName, department: editDept };
      localStorage.setItem('sitalki_session', JSON.stringify(updated));
    } catch {}
    setSaving(false);
  };

  const avatarColor = userProfile?.avatar_color || '#d32f2f';
  const initials = (username || '?').slice(0, 2).toUpperCase();

  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)' }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #1a237e 0%, #283593 100%)', color: 'white', padding: '1rem', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', marginBottom: '0.8rem' }}>
          <div style={{ width: 44, height: 44, borderRadius: '50%', background: avatarColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', fontWeight: 700, flexShrink: 0, border: '2px solid rgba(255,255,255,0.3)' }}>{initials}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{username}</div>
            <div style={{ fontSize: '0.7rem', opacity: 0.7 }}>{userPhone}</div>
          </div>
          <button onClick={() => setShowQR(!showQR)} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white', borderRadius: '8px', padding: '6px 10px', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.7rem', fontWeight: 600, cursor: 'pointer' }}>
            <QrCode size={14} /> QR
          </button>
        </div>

        {showQR && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '1rem', background: 'white', borderRadius: '12px', marginBottom: '0.6rem' }}>
            <QRCodeSVG value={userPhone || username} size={120} />
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '0.3rem' }}>
          {['contacts', 'search', 'profile'].map(t => (
            <button key={t} onClick={() => setTab(t)} style={{ flex: 1, padding: '6px', borderRadius: '8px', border: 'none', background: tab === t ? 'white' : 'rgba(255,255,255,0.12)', color: tab === t ? '#1a237e' : 'rgba(255,255,255,0.7)', fontWeight: 600, fontSize: '0.75rem', cursor: 'pointer', textTransform: 'capitalize' }}>
              {t === 'contacts' ? 'Kontak' : t === 'search' ? 'Cari User' : 'Profil'}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>

        {/* CONTACTS TAB */}
        {tab === 'contacts' && (
          <>
            {contacts.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                Belum ada kontak. <span style={{ color: 'var(--accent)', cursor: 'pointer', fontWeight: 600 }} onClick={() => setTab('search')}>Cari & tambahkan</span>
              </div>
            ) : (
              contacts.map((c, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', padding: '0.7rem 1rem', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)', cursor: 'pointer' }}>
                  <div style={{ width: 42, height: 42, borderRadius: '50%', background: c.avatar_color || '#888', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: '0.9rem', flexShrink: 0 }}>{(c.display_name||'?')[0].toUpperCase()}</div>
                  <div style={{ flex: 1 }} onClick={() => openDM(c.phone)}>
                    <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.95rem' }}>{c.display_name}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{c.department || c.phone}</div>
                  </div>
                  <button onClick={() => openDM(c.phone)} style={{ background: '#25d366', border: 'none', borderRadius: '50%', width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                    <MessageCircle size={16} color="white" />
                  </button>
                </div>
              ))
            )}
          </>
        )}

        {/* SEARCH TAB */}
        {tab === 'search' && (
          <>
            <div style={{ padding: '0.6rem 0.8rem', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)', display: 'flex', gap: '0.4rem' }}>
              <input placeholder="Cari nama atau nomor HP..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSearch()} style={{ flex: 1, padding: '8px 12px', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '0.85rem', background: 'var(--bg-tertiary)', color: '#111', outline: 'none' }} />
              <button onClick={handleSearch} style={{ background: '#1a237e', color: 'white', border: 'none', borderRadius: '8px', padding: '0 12px', display: 'flex', alignItems: 'center', cursor: 'pointer' }}><Search size={16} /></button>
            </div>
            {searchResults.map((u, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', padding: '0.7rem 1rem', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }}>
                <div style={{ width: 42, height: 42, borderRadius: '50%', background: u.avatar_color || '#888', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: '0.9rem', flexShrink: 0 }}>{(u.display_name||'?')[0].toUpperCase()}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{u.display_name}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{u.phone} • {u.department || '-'}</div>
                </div>
                <button onClick={() => addContact(u.phone)} style={{ background: 'var(--accent)', color: 'white', border: 'none', borderRadius: '8px', padding: '6px 10px', display: 'flex', alignItems: 'center', gap: '3px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}><UserPlus size={14} /> Tambah</button>
              </div>
            ))}
            {searchResults.length === 0 && searchQuery && <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Tekan Enter atau tombol cari</div>}
          </>
        )}

        {/* PROFILE TAB */}
        {tab === 'profile' && (
          <div style={{ padding: '1.5rem 1rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div style={{ width: 72, height: 72, borderRadius: '50%', background: avatarColor, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 800, fontSize: '1.6rem', marginBottom: '0.6rem', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>{initials}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{userPhone}</div>
            </div>

            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Nama Tampilan</label>
            <input value={editName} onChange={(e) => setEditName(e.target.value)} style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '0.95rem', background: 'var(--bg-secondary)', color: '#111', outline: 'none', marginBottom: '1rem' }} />

            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Departemen</label>
            <input value={editDept} onChange={(e) => setEditDept(e.target.value)} style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '0.95rem', background: 'var(--bg-secondary)', color: '#111', outline: 'none', marginBottom: '1.5rem' }} />

            <button onClick={saveProfile} disabled={saving} style={{ width: '100%', padding: '0.8rem', background: '#1a237e', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '0.95rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginBottom: '0.8rem' }}>
              <Check size={16} /> {saving ? 'Menyimpan...' : 'Simpan Profil'}
            </button>

            <button onClick={onLogout} style={{ width: '100%', padding: '0.8rem', background: 'var(--accent)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '0.95rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
              <LogOut size={16} /> Keluar Akun
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
