import React, { useState, useEffect } from 'react';
import { Search, UserPlus, Phone, Video, QrCode, Shield, LogOut, Check, MessageCircle, Trash2, Mic, Users, CheckCircle2 } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

export default function ContactScreen({ username, userPhone, userProfile, onOpenDM, onPTTContact, onLogout }) {
  const [contacts, setContacts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showQR, setShowQR] = useState(false);
  const [tab, setTab] = useState('contacts');
  const [editName, setEditName] = useState(userProfile?.display_name || '');
  const [editDept, setEditDept] = useState(userProfile?.department || '');
  const [saving, setSaving] = useState(false);
  const [allUsers, setAllUsers] = useState([]);

  useEffect(() => { if (userPhone) { loadContacts(); loadAllUsers(); } }, [userPhone]);


  const loadContacts = () => {
    fetch(`/api/contacts/${userPhone}`).then(r => r.json()).then(data => setContacts(data.contacts || [])).catch(() => {});
  };
  const loadAllUsers = () => {
    fetch('/api/users').then(r => r.json()).then(data => setAllUsers((data.users || []).filter(u => u.phone !== userPhone))).catch(() => {});
  };
  const handleSearch = async () => {
    if (!searchQuery.trim()) { loadAllUsers(); return; }
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
  const saveProfile = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/profile', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone: userPhone, display_name: editName, department: editDept }) });
      const data = await res.json();
      if (data.user) localStorage.setItem('sitalki_session', JSON.stringify(data.user));
    } catch {}
    setSaving(false);
  };

  const getDMRoom = (contactPhone) => {
    const sorted = [userPhone, contactPhone].sort();
    return `DM-${sorted[0]}-${sorted[1]}`;
  };

  const avatarColor = userProfile?.avatar_color || 'var(--accent-blue)';
  const initials = (username || '?').slice(0, 2).toUpperCase();
  const contactPhones = new Set(contacts.map(c => c.phone));

  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)' }}>
      {/* Header */}
      <div style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)', padding: '0.8rem 1rem 0.6rem', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.8rem' }}>
          <div style={{ width: 44, height: 44, borderRadius: 'var(--radius-full)', background: avatarColor, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '0.9rem', fontWeight: 700, flexShrink: 0, border: '1px solid var(--border)' }}>{initials}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>{username}</div>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)', fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.02em', marginTop: '2px' }}>{userPhone} • {userProfile?.department || 'HKA'}</div>
          </div>
          <button onClick={() => setShowQR(!showQR)} style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)', color: 'var(--text-secondary)', borderRadius: 'var(--radius-sm)', padding: '6px 10px', fontSize: '0.65rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', transition: 'all 0.2s' }}><QrCode size={14} /> BARCODE</button>
        </div>
        
        {showQR && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '1rem', background: 'var(--bg-card)', borderRadius: 'var(--radius-md)', marginBottom: '0.8rem', border: '1px solid var(--border)', boxShadow: 'var(--shadow-xs)', animation: 'slideIn 0.2s var(--ease-out)' }}>
            <QRCodeSVG value={userPhone || username} size={120} />
          </div>
        )}

        <div style={{ display: 'flex', gap: '3px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', padding: '3px', border: '1px solid var(--border)' }}>
          {[
            { key: 'contacts', label: `Kontak (${allUsers.length})` },
            { key: 'profile', label: 'Profil' },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{ flex: 1, padding: '7px', borderRadius: 'var(--radius-sm)', border: 'none', background: tab === t.key ? 'var(--bg-secondary)' : 'transparent', color: tab === t.key ? 'var(--text-primary)' : 'var(--text-tertiary)', fontWeight: 600, fontSize: '0.7rem', cursor: 'pointer', transition: 'all 0.2s var(--ease-out)', boxShadow: tab === t.key ? 'var(--shadow-xs)' : 'none', fontFamily: 'inherit' }}>{t.label}</button>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
        {/* CONTACTS TAB — All registered users */}
        {tab === 'contacts' && (
          <div style={{ padding: '0.6rem' }}>
            {/* Search bar */}
            <div style={{ position: 'sticky', top: 0, zIndex: 5, background: 'var(--bg-primary)', paddingBottom: '0.6rem' }}>
              <div style={{ display: 'flex', gap: '0.4rem' }}>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', background: 'var(--bg-card)' }}>
                  <Search size={14} color="var(--text-tertiary)" />
                  <input placeholder="Cari kontak..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ flex: 1, border: 'none', fontSize: '0.85rem', background: 'transparent', color: 'var(--text-primary)', outline: 'none' }} />
                </div>
              </div>
            </div>

            {(() => {
              const filtered = allUsers.filter(u => {
                if (!searchQuery.trim()) return true;
                const q = searchQuery.toLowerCase();
                return (u.display_name || '').toLowerCase().includes(q) || (u.phone || '').includes(q) || (u.department || '').toLowerCase().includes(q);
              });

              if (filtered.length === 0) return (
                <div style={{ padding: '3rem 2rem', textAlign: 'center', color: 'var(--text-tertiary)' }}>
                  <Users size={42} style={{ opacity: 0.3, marginBottom: '1rem' }} />
                  <p style={{ fontSize: '0.85rem' }}>{searchQuery ? 'Tidak ditemukan.' : 'Belum ada pengguna terdaftar.'}</p>
                </div>
              );

              return (
                <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', overflow: 'hidden' }}>
                  {filtered.map((u, i) => (
                    <div key={u.phone} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.7rem 0.8rem', borderBottom: i < filtered.length - 1 ? '1px solid var(--border)' : 'none', background: 'transparent' }}>
                      <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-full)', background: u.avatar_color || 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: '0.95rem', flexShrink: 0 }}>{(u.display_name||'?')[0].toUpperCase()}</div>
                      <div style={{ flex: 1, cursor: 'pointer', minWidth: 0 }} onClick={() => onOpenDM && onOpenDM(getDMRoom(u.phone), u.display_name)}>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.88rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', letterSpacing: '-0.01em' }}>{u.display_name}</div>
                        <div style={{ fontSize: '0.6rem', color: 'var(--text-tertiary)', marginTop: '2px', fontFamily: "'JetBrains Mono', monospace" }}>{u.department || u.phone}</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <button onClick={() => onOpenDM && onOpenDM(getDMRoom(u.phone), u.display_name)} title="Chat" style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-full)', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, transition: 'all 0.15s' }} onMouseDown={e => e.currentTarget.style.transform='scale(0.92)'} onMouseUp={e => e.currentTarget.style.transform='scale(1)'}><MessageCircle size={14} color="var(--accent-blue)" /></button>
                        <button onClick={() => onPTTContact && onPTTContact(u)} title="Push to Talk" style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-full)', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, transition: 'all 0.15s' }} onMouseDown={e => e.currentTarget.style.transform='scale(0.92)'} onMouseUp={e => e.currentTarget.style.transform='scale(1)'}><Mic size={14} color="var(--accent-emerald)" /></button>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        )}

        {/* PROFILE TAB */}
        {tab === 'profile' && (
          <div style={{ padding: '1rem' }}>
            <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', padding: '1.5rem 1.2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '1.2rem', boxShadow: 'var(--shadow-xs)' }}>
              <div style={{ width: 72, height: 72, borderRadius: 'var(--radius-full)', background: avatarColor, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 800, fontSize: '1.6rem', marginBottom: '0.8rem', border: '2px solid var(--border)' }}>{initials}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.05em' }}>{userPhone}</div>
            </div>

            <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', padding: '1.2rem', marginBottom: '1.2rem', boxShadow: 'var(--shadow-xs)' }}>
              <label style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)', fontWeight: 700, display: 'block', marginBottom: '6px', letterSpacing: '0.05em', fontFamily: "'JetBrains Mono', monospace" }}>NAMA TAMPILAN</label>
              <input value={editName} onChange={(e) => setEditName(e.target.value)} style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', fontSize: '0.85rem', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', outline: 'none', marginBottom: '1.2rem', transition: 'border-color 0.2s' }} onFocus={e => e.currentTarget.style.borderColor='var(--accent)'} onBlur={e => e.currentTarget.style.borderColor='var(--border)'} />
              
              <label style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)', fontWeight: 700, display: 'block', marginBottom: '6px', letterSpacing: '0.05em', fontFamily: "'JetBrains Mono', monospace" }}>DEPARTEMEN / UNIT</label>
              <select value={editDept} onChange={(e) => setEditDept(e.target.value)} style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', fontSize: '0.85rem', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', outline: 'none', marginBottom: '1.5rem' }}>
                <option value="">Pilih Departemen...</option>
                <optgroup label="Kantor Pusat">
                  {['Departemen HC, Pengembangan dan IT','Departemen Keuangan, Akuntansi, dan Risiko','Departemen Operasi I','Departemen Operasi II','Departemen QHSSE','Departemen Satuan Pengawas Intern','Departemen Sekretaris Perusahaan','Unit ITRS','Unit OCSC','Unit SMRK','Unit Bisnis Turunan OM'].map(d => <option key={d} value={d}>{d}</option>)}
                </optgroup>
                <optgroup label="Ruas">
                  {['Ruas BTB','Ruas Akses Tanjung Priok','Ruas Bakauheni–Terbanggi Besar','Ruas Bengkulu–Taba Penanjung','Ruas Betung–Jambi','Ruas Binjai–Stabat','Ruas Indralaya–Prabumulih','Ruas Indrapura–Kisaran','Ruas JORRS','Ruas Kuala Tanjung–Parapat','Ruas Medan–Binjai','Ruas Padang–Sicincin','Ruas Palembang–Indralaya','Ruas Pekanbaru–Bangkinang','Ruas Pekanbaru–Dumai','Ruas Sigli–Banda Aceh','Ruas Terbanggi Besar–Kayu Agung'].map(d => <option key={d} value={d}>{d}</option>)}
                </optgroup>
                <optgroup label="Unit Produksi">
                  {['UP Bojonegara','UP Indralaya','UP Jabodetabek','UP Muara Fajar','UP Patimban','UP Sei Langsat','UP Stone Crusher Sumatera'].map(d => <option key={d} value={d}>{d}</option>)}
                </optgroup>
              </select>

              <button onClick={saveProfile} disabled={saving} style={{ width: '100%', padding: '0.85rem', background: 'var(--accent-blue)', color: 'white', border: 'none', borderRadius: 'var(--radius-md)', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', transition: 'transform 0.15s var(--ease-spring)', fontFamily: 'inherit' }} onMouseDown={e => e.currentTarget.style.transform='scale(0.97)'} onMouseUp={e => e.currentTarget.style.transform='scale(1)'}>
                <Check size={16} /> {saving ? 'Menyimpan...' : 'Simpan Profil'}
              </button>
            </div>

            <button onClick={onLogout} style={{ width: '100%', padding: '0.85rem', background: 'var(--bg-secondary)', color: 'var(--accent)', border: '1px solid var(--accent-border)', borderRadius: 'var(--radius-md)', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'transform 0.15s', fontFamily: 'inherit' }} onMouseDown={e => e.currentTarget.style.transform='scale(0.97)'} onMouseUp={e => e.currentTarget.style.transform='scale(1)'}>
              <LogOut size={16} /> Keluar Akun
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
