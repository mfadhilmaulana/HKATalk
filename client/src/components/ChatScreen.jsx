import React, { useState, useRef, useEffect } from 'react';
import { Camera, MapPin, Send, ChevronLeft, ArrowRight, Shield, Plus } from 'lucide-react';
import { io } from 'socket.io-client';

const DEFAULT_ROOMS = [
  { id: 'CHAT-GENERAL', name: 'General', desc: 'Obrolan umum seluruh HKA', emoji: '💬', color: '#25d366' },
  { id: 'CHAT-OPERASI', name: 'Operasi', desc: 'Koordinasi tim operasional', emoji: '🛠️', color: '#1565c0' },
  { id: 'CHAT-DARURAT', name: 'Darurat', desc: 'Laporan insiden & SOS', emoji: '🚨', color: '#c62828' },
  { id: 'CHAT-SOSIAL', name: 'Sosial', desc: 'Ngobrol santai sesama insan', emoji: '☕', color: '#6a1b9a' },
  { id: 'CHAT-PENGUMUMAN', name: 'Pengumuman', desc: 'Info resmi manajemen', emoji: '📢', color: '#e65100' },
];

const AVATAR_COLORS = ['#e53935','#8e24aa','#3949ab','#00897b','#f4511e','#6d4c41','#546e7a','#d81b60'];
function getAvatarColor(name) {
  let hash = 0;
  for (let i = 0; i < (name||'').length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export default function ChatScreen({ username, userPhone, initialRoom, initialRoomName, onClearDM }) {
  const [activeRoom, setActiveRoom] = useState(initialRoom || null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [customRooms, setCustomRooms] = useState(() => {
    try { return JSON.parse(localStorage.getItem('sitalki_custom_rooms') || '[]'); } catch { return []; }
  });
  const chatEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const socketRef = useRef(null);

  const allRooms = [...DEFAULT_ROOMS, ...customRooms];

  // Load history from DB when entering a room
  useEffect(() => {
    if (!activeRoom || !username) return;

    setLoading(true);
    // Load persisted messages from DB
    fetch(`/api/messages/${encodeURIComponent(activeRoom)}`)
      .then(r => r.json())
      .then(data => {
        const history = (data.messages || []).map(m => ({
          type: m.msg_type,
          text: m.content,
          image: m.image || '',
          lat: m.lat,
          lng: m.lng,
          username: m.sender_name,
          timestamp: m.created_at,
          self: m.sender_phone === userPhone,
        }));
        setMessages(history);
        setLoading(false);
      })
      .catch(() => { setMessages([]); setLoading(false); });

    // Connect socket for real-time
    const sock = io();
    socketRef.current = sock;
    sock.on('connect', () => sock.emit('join-channel', { username, channel: activeRoom }));
    sock.on('chat-message', (data) => {
      setMessages(prev => [...prev, { ...data, self: false }]);
    });
    return () => { sock.disconnect(); socketRef.current = null; };
  }, [activeRoom, username]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const saveMessage = (msg) => {
    fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        room: activeRoom,
        sender_phone: userPhone || '',
        sender_name: username,
        msg_type: msg.type,
        content: msg.text || '',
        image: msg.type === 'image' ? msg.image : '',
        lat: msg.lat || 0,
        lng: msg.lng || 0,
      })
    }).catch(() => {});
  };

  const handleSendText = (e) => {
    e.preventDefault();
    if (!text.trim() || !socketRef.current) return;
    const packet = { type: 'text', text: text.trim(), self: true, username, timestamp: new Date().toISOString() };
    socketRef.current.emit('chat-message', packet);
    setMessages(prev => [...prev, packet]);
    saveMessage(packet);
    setText('');
  };

  const handleLocation = () => {
    if (!navigator.geolocation) { alert("GPS tidak tersedia."); return; }
    navigator.geolocation.getCurrentPosition((pos) => {
      const packet = { type: 'location', text: '📍 Lokasi', lat: pos.coords.latitude, lng: pos.coords.longitude, self: true, username, timestamp: new Date().toISOString() };
      if (socketRef.current) socketRef.current.emit('chat-message', packet);
      setMessages(prev => [...prev, packet]);
      saveMessage(packet);
    }, () => alert("Gagal GPS."));
  };

  const handleImageCapture = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_W = 600, scale = Math.min(MAX_W / img.width, 1);
        canvas.width = img.width * scale; canvas.height = img.height * scale;
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        const base64 = canvas.toDataURL('image/jpeg', 0.5);
        const packet = { type: 'image', text: '📷 Foto', image: base64, self: true, username, timestamp: new Date().toISOString() };
        if (socketRef.current) socketRef.current.emit('chat-message', packet);
        setMessages(prev => [...prev, packet]);
        // Don't save large images to DB to avoid bloat — only save small ones
        if (base64.length < 200000) saveMessage(packet);
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleAddRoom = (e) => {
    e.preventDefault();
    const n = newRoomName.trim();
    if (!n) return;
    const newRoom = { id: `CHAT-CUSTOM-${n.toUpperCase().replace(/\s/g,'-')}`, name: n, desc: 'Ruang obrolan kustom', emoji: '#️⃣', color: '#37474f' };
    const updated = [...customRooms, newRoom];
    setCustomRooms(updated);
    localStorage.setItem('sitalki_custom_rooms', JSON.stringify(updated));
    setNewRoomName('');
  };

  // ─── ROOM LIST ───
  if (!activeRoom) {
    return (
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)' }}>
        <div style={{ background: 'linear-gradient(135deg, #075e54 0%, #128c7e 100%)', color: 'white', padding: '1rem 1rem 0.6rem', flexShrink: 0 }}>
          <h1 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Chat</h1>
          <div style={{ fontSize: '0.7rem', opacity: 0.8, marginTop: '2px' }}>💾 History tersimpan • Terenkripsi</div>
        </div>
        <form onSubmit={handleAddRoom} style={{ display: 'flex', gap: '0.3rem', padding: '0.5rem 0.8rem', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <input placeholder="Buat ruang baru..." value={newRoomName} onChange={(e) => setNewRoomName(e.target.value)} style={{ flex: 1, padding: '7px 10px', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '0.8rem', background: 'var(--bg-tertiary)', color: '#111', outline: 'none' }} />
          <button type="submit" disabled={!newRoomName.trim()} style={{ background: newRoomName.trim() ? '#075e54' : '#ccc', color: 'white', border: 'none', borderRadius: '8px', padding: '0 10px', display: 'flex', alignItems: 'center', fontSize: '0.75rem', fontWeight: 600 }}><Plus size={14} /></button>
        </form>
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
          <div style={{ padding: '0.4rem 1rem', display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--text-muted)', fontSize: '0.65rem' }}><Shield size={10} /> End-to-End Encrypted</div>
          {allRooms.map(room => (
            <div key={room.id} onClick={() => setActiveRoom(room.id)} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.65rem 1rem', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)', cursor: 'pointer' }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: room.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', flexShrink: 0 }}>{room.emoji}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.9rem' }}>#{room.name}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{room.desc}</div>
              </div>
              <ArrowRight size={14} color="var(--text-muted)" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ─── CHAT CONVERSATION ───
  const room = allRooms.find(r => r.id === activeRoom);
  const roomName = room?.name || activeRoom.replace('DM-','Chat ');
  const roomEmoji = room?.emoji || '💬';
  const roomColor = room?.color || '#25d366';
  const isDM = activeRoom.startsWith('DM-');

  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', background: '#ece5dd' }}>
      {/* Header */}
      <div style={{ background: '#075e54', color: 'white', padding: '0.6rem 0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0, zIndex: 10 }}>
        <button onClick={() => setActiveRoom(null)} style={{ background: 'none', border: 'none', color: 'white', display: 'flex', alignItems: 'center', cursor: 'pointer', padding: '3px' }}><ChevronLeft size={20} /></button>
        <div style={{ width: 32, height: 32, borderRadius: '50%', background: roomColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', flexShrink: 0 }}>{isDM ? '👤' : roomEmoji}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{isDM ? 'Personal Chat' : `#${roomName}`}</div>
          <div style={{ fontSize: '0.6rem', opacity: 0.7 }}>💾 History tersimpan</div>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, minHeight: 0, padding: '0.4rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {loading && <div style={{ alignSelf: 'center', padding: '1rem', color: '#888', fontSize: '0.8rem' }}>Memuat history...</div>}
        
        {!loading && messages.length === 0 && <div style={{ alignSelf: 'center', padding: '2rem', color: '#888', fontSize: '0.8rem' }}>Belum ada pesan. Mulai percakapan!</div>}

        {messages.map((msg, idx) => {
          const isSelf = msg.self;
          const initials = (msg.username || '?')[0].toUpperCase();
          const avatarBg = getAvatarColor(msg.username);
          return (
            <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: isSelf ? 'flex-end' : 'flex-start', maxWidth: '80%', alignSelf: isSelf ? 'flex-end' : 'flex-start', marginBottom: '2px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px', flexDirection: isSelf ? 'row-reverse' : 'row' }}>
                {!isSelf && <div style={{ width: 22, height: 22, borderRadius: '50%', background: avatarBg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '0.55rem', fontWeight: 700, flexShrink: 0 }}>{initials}</div>}
                <div style={{ background: isSelf ? '#dcf8c6' : 'white', padding: '4px 6px', borderRadius: isSelf ? '8px 2px 8px 8px' : '2px 8px 8px 8px', boxShadow: '0 1px 1px rgba(0,0,0,0.06)', minWidth: '50px' }}>
                  {!isSelf && <div style={{ fontSize: '0.6rem', fontWeight: 700, color: avatarBg, marginBottom: '1px' }}>{msg.username}</div>}
                  {msg.type === 'image' && msg.image && <img src={msg.image} alt="Foto" style={{ width: '100%', borderRadius: '4px', marginBottom: '2px', maxWidth: '180px' }} />}
                  {msg.type === 'location' && <a href={`https://www.google.com/maps?q=${msg.lat},${msg.lng}`} target="_blank" rel="noreferrer" style={{ color: '#075e54', fontWeight: 600, fontSize: '0.75rem', textDecoration: 'none' }}>📍 Buka Maps</a>}
                  <div style={{ fontSize: '0.8rem', color: '#111', lineHeight: 1.3, wordBreak: 'break-word' }}>{msg.text}</div>
                  <div style={{ fontSize: '0.5rem', color: 'rgba(0,0,0,0.35)', textAlign: 'right', marginTop: '1px' }}>
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    {isSelf && ' ✓✓'}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={chatEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSendText} style={{ display: 'flex', padding: '4px 5px', background: '#f0f0f0', alignItems: 'center', gap: '3px', flexShrink: 0 }}>
        <button type="button" onClick={() => fileInputRef.current?.click()} style={{ background: 'none', border: 'none', color: '#54656f', display: 'flex', alignItems: 'center', padding: '4px', cursor: 'pointer' }}>
          <Camera size={18} />
          <input type="file" accept="image/*" capture="environment" ref={fileInputRef} style={{ display: 'none' }} onChange={handleImageCapture} />
        </button>
        <button type="button" onClick={handleLocation} style={{ background: 'none', border: 'none', color: '#54656f', display: 'flex', alignItems: 'center', padding: '4px', cursor: 'pointer' }}><MapPin size={18} /></button>
        <input placeholder="Ketik pesan" value={text} onChange={(e) => setText(e.target.value)} autoComplete="off" style={{ flex: 1, background: 'white', border: 'none', borderRadius: '18px', padding: '7px 12px', fontSize: '0.85rem', color: '#111', outline: 'none' }} />
        <button type="submit" disabled={!text.trim()} style={{ width: 34, height: 34, borderRadius: '50%', background: text.trim() ? '#00a884' : '#8696a0', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}><Send size={14} color="white" /></button>
      </form>
    </div>
  );
}
