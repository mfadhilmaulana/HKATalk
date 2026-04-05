import React, { useState, useEffect } from 'react';
import { QrCode, UserPlus, Search, MessageCircle, Trash2, LogOut, Check, Users, ChevronRight } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

const DEPARTMENTS = [
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
  'Unit Bisnis Turunan OM',
  'Ruas BTB', 'Ruas Akses Tanjung Priok', 'Ruas Bakauheni–Terbanggi Besar',
  'Ruas Bengkulu–Taba Penanjung', 'Ruas Betung–Jambi', 'Ruas Binjai–Stabat',
  'Ruas Indralaya–Prabumulih', 'Ruas Indrapura–Kisaran', 'Ruas JORRS',
  'Ruas Kuala Tanjung–Parapat', 'Ruas Medan–Binjai', 'Ruas Padang–Sicincin',
  'Ruas Palembang–Indralaya', 'Ruas Pekanbaru–Bangkinang', 'Ruas Pekanbaru–Dumai',
  'Ruas Sigli–Banda Aceh', 'Ruas Terbanggi Besar–Kayu Agung',
  'UP Bojonegara', 'UP Indralaya', 'UP Jabodetabek', 'UP Muara Fajar',
  'UP Patimban', 'UP Sei Langsat', 'UP Stone Crusher Sumatera'
];

export default function ContactScreen({ username, userPhone, userProfile, onJoinChannel, onLogout }) {
  const [contacts, setContacts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showQR, setShowQR] = useState(false);
  const [tab, setTab] = useState('contacts');
  const [editName, setEditName] = useState(userProfile?.display_name || '');
  const [editDept, setEditDept] = useState(userProfile?.department || '');
  const [saving, setSaving] = useState(false);
  const [allUsers, setAllUsers] = useState([]);

  useEffect(() => {
    if (userPhone) loadContacts();
  }, [userPhone]);

  useEffect(() => {
    if (tab === 'directory') loadAllUsers();
  }, [tab]);

  const loadContacts = () => {
    fetch(`/api/contacts/${userPhone}`)
      .then(r => r.json())
      .then(data => setContacts(data.contacts || []))
      .catch(() => {});
  };

  const loadAllUsers = () => {
    fetch('/api/users')
      .then(r => r.json())
      .then(data => setAllUsers((data.users || []).filter(u => u.phone !== userPhone)))
      .catch(() => {});
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) { loadAllUsers(); setSearchResults(allUsers); return; }
    try {
      const res = await fetch(`/api/users?q=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      setSearchResults((data.users || []).filter(u => u.phone !== userPhone));
    } catch { setSearchResults([]); }
  };

  const addContact = async (contactPhone) => {
    await fetch('/api/contacts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ owner_phone: userPhone, contact_phone: contactPhone }) });
    loadContacts();
  };

  const removeContact = async (contactPhone) => {
    if (!confirm('Hapus kontak ini?')) return;
    await fetch('/api/contacts', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ owner_phone: userPhone, contact_phone: contactPhone }) });
    loadContacts();
  };

  const openDM = (contactPhone) => {
    const sorted = [userPhone, contactPhone].sort();
    onJoinChannel(`DM-${sorted[0]}-${sorted[1]}`);
  };

  const saveProfile = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/profile', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone: userPhone, display_name: editName, department: editDept }) });
      const data = await res.json();
      if (data.user) localStorage.setItem('sitalki_session', JSON.stringify(data.user));
    } catch {}
    setSaving(false);
  };

  const avatarColor = userProfile?.avatar_color || '#d32f2f';
  const initials = (username || '?').slice(0, 2).toUpperCase();
  const contactPhones = new Set(contacts.map(c => c.phone));

  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)' }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #1a237e 0%, #283593 100%)', color: 'white', padding: '0.8rem 1rem 0.6rem', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.6rem' }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', background: avatarColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', fontWeight: 700, flexShrink: 0, border: '2px solid rgba(255,255,255,0.3)' }}>{initials}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: '1rem' }}>{username}</div>
            <div style={{ fontSize: '0.65rem', opacity: 0.7 }}>{userPhone} • {userProfile?.department || 'HKA'}</div>
          </div>
          <button onClick={() => setShowQR(!showQR)} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white', borderRadius: '6px', padding: '5px 8px', fontSize: '0.65rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px' }}><QrCode size={12} /> QR</button>
        </div>

        {showQR && <div style={{ display: 'flex', justifyContent: 'center', padding: '0.8rem', background: 'white', borderRadius: '10px', marginBottom: '0.5rem' }}><QRCodeSVG value={userPhone || username} size={100} /></div>}

        <div style={{ display: 'flex', gap: '2px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', padding: '2px' }}>
          {[
            { key: 'contacts', label: `Kontak (${contacts.length})` },
            { key: 'directory', label: 'Direktori' },
            { key: 'profile', label: 'Profil' },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{ flex: 1, padding: '5px', borderRadius: '6px', border: 'none', background: tab === t.key ? 'white' : 'transparent', color: tab === t.key ? '#1a237e' : 'rgba(255,255,255,0.7)', fontWeight: 600, fontSize: '0.7rem', cursor: 'pointer' }}>{t.label}</button>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
        {/* CONTACTS TAB */}
        {tab === 'contacts' && (
          <>
            {contacts.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Belum ada kontak. <span style={{ color: 'var(--accent)', cursor: 'pointer', fontWeight: 600 }} onClick={() => setTab('directory')}>Cari di Direktori →</span></div>
            ) : (
              contacts.map((c, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.65rem 1rem', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: c.avatar_color || '#888', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: '0.85rem', flexShrink: 0 }}>{(c.display_name||'?')[0].toUpperCase()}</div>
                  <div style={{ flex: 1, cursor: 'pointer' }} onClick={() => openDM(c.phone)}>
                    <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.9rem' }}>{c.display_name}</div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{c.department || c.phone}</div>
                  </div>
                  <button onClick={() => openDM(c.phone)} style={{ background: '#25d366', border: 'none', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}><MessageCircle size={14} color="white" /></button>
                  <button onClick={() => removeContact(c.phone)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}><Trash2 size={16} /></button>
                </div>
              ))
            )}
          </>
        )}

        {/* DIRECTORY TAB */}
        {tab === 'directory' && (
          <>
            <div style={{ padding: '0.5rem 0.8rem', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)', display: 'flex', gap: '0.3rem', position: 'sticky', top: 0, zIndex: 5 }}>
              <input placeholder="Cari nama atau nomor HP..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSearch()} style={{ flex: 1, padding: '7px 10px', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '0.8rem', background: 'var(--bg-tertiary)', color: '#111', outline: 'none' }} />
              <button onClick={handleSearch} style={{ background: '#1a237e', color: 'white', border: 'none', borderRadius: '8px', padding: '0 10px', cursor: 'pointer' }}><Search size={14} /></button>
            </div>
            <div style={{ padding: '0.4rem 1rem', fontSize: '0.7rem', color: 'var(--text-muted)' }}><Users size={11} style={{ verticalAlign: 'middle' }} /> {allUsers.length} pengguna terdaftar</div>
            {(searchQuery ? searchResults : allUsers).map((u, i) => {
              const isContact = contactPhones.has(u.phone);
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.6rem 1rem', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ width: 38, height: 38, borderRadius: '50%', background: u.avatar_color || '#888', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: '0.8rem', flexShrink: 0 }}>{(u.display_name||'?')[0].toUpperCase()}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.85rem' }}>{u.display_name}</div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{u.department || u.phone}</div>
                  </div>
                  {isContact ? (
                    <span style={{ fontSize: '0.7rem', color: '#25d366', fontWeight: 600 }}>✓ Kontak</span>
                  ) : (
                    <button onClick={() => addContact(u.phone)} style={{ background: 'var(--accent)', color: 'white', border: 'none', borderRadius: '6px', padding: '5px 8px', display: 'flex', alignItems: 'center', gap: '2px', fontSize: '0.7rem', fontWeight: 600, cursor: 'pointer' }}><UserPlus size={12} /> Tambah</button>
                  )}
                </div>
              );
            })}
          </>
        )}

        {/* PROFILE TAB */}
        {tab === 'profile' && (
          <div style={{ padding: '1.2rem 1rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '1.2rem' }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: avatarColor, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 800, fontSize: '1.4rem', marginBottom: '0.4rem', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>{initials}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{userPhone}</div>
            </div>

            <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '3px' }}>Nama Tampilan</label>
            <input value={editName} onChange={(e) => setEditName(e.target.value)} style={{ width: '100%', padding: '9px 10px', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '0.9rem', background: 'var(--bg-secondary)', color: '#111', outline: 'none', marginBottom: '0.8rem' }} />

            <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '3px' }}>Departemen / Unit</label>
            <select value={editDept} onChange={(e) => setEditDept(e.target.value)} style={{ width: '100%', padding: '9px 10px', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '0.85rem', background: 'var(--bg-secondary)', color: '#111', outline: 'none', marginBottom: '1.2rem' }}>
              <option value="">Pilih Departemen...</option>
              {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>

            <button onClick={saveProfile} disabled={saving} style={{ width: '100%', padding: '0.7rem', background: '#1a237e', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', marginBottom: '0.6rem' }}><Check size={14} /> {saving ? 'Menyimpan...' : 'Simpan Profil'}</button>
            <button onClick={onLogout} style={{ width: '100%', padding: '0.7rem', background: 'var(--accent)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}><LogOut size={14} /> Keluar Akun</button>
          </div>
        )}
      </div>
    </div>
  );
}
