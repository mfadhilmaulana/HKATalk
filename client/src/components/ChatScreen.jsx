import React, { useState, useRef, useEffect } from 'react';
import { Camera, MapPin, Send, ChevronLeft, Hash, ArrowRight, Shield, Plus } from 'lucide-react';
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

export default function ChatScreen({ username }) {
  const [activeRoom, setActiveRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [newRoomName, setNewRoomName] = useState('');
  const [customRooms, setCustomRooms] = useState(() => {
    try { return JSON.parse(localStorage.getItem('sitalki_custom_rooms') || '[]'); } catch { return []; }
  });
  const chatEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const socketRef = useRef(null);

  const allRooms = [...DEFAULT_ROOMS, ...customRooms];

  useEffect(() => {
    if (!activeRoom || !username) return;
    const sock = io();
    socketRef.current = sock;
    sock.on('connect', () => sock.emit('join-channel', { username, channel: activeRoom }));
    sock.on('chat-message', (data) => setMessages(prev => [...prev, { ...data, self: false }]));
    return () => { sock.disconnect(); socketRef.current = null; };
  }, [activeRoom, username]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendText = (e) => {
    e.preventDefault();
    if (!text.trim() || !socketRef.current) return;
    const packet = { type: 'text', text: text.trim(), self: true, username, timestamp: new Date().toISOString() };
    socketRef.current.emit('chat-message', packet);
    setMessages(prev => [...prev, packet]);
    setText('');
  };

  const handleLocation = () => {
    if (!navigator.geolocation) { alert("GPS tidak tersedia."); return; }
    navigator.geolocation.getCurrentPosition((pos) => {
      const packet = { type: 'location', text: '📍 Lokasi Terkini', lat: pos.coords.latitude, lng: pos.coords.longitude, self: true, username, timestamp: new Date().toISOString() };
      if (socketRef.current) socketRef.current.emit('chat-message', packet);
      setMessages(prev => [...prev, packet]);
    }, () => alert("Gagal membaca GPS."));
  };

  const handleImageCapture = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_W = 800, scale = MAX_W / img.width;
        canvas.width = MAX_W; canvas.height = img.height * scale;
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        const packet = { type: 'image', text: '📷 Foto', image: canvas.toDataURL('image/jpeg', 0.6), self: true, username, timestamp: new Date().toISOString() };
        if (socketRef.current) socketRef.current.emit('chat-message', packet);
        setMessages(prev => [...prev, packet]);
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
        <div style={{ background: 'linear-gradient(135deg, #075e54 0%, #128c7e 100%)', color: 'white', padding: '1.2rem 1rem 0.8rem', flexShrink: 0 }}>
          <h1 style={{ fontSize: '1.3rem', fontWeight: 800 }}>Chat</h1>
          <div style={{ fontSize: '0.75rem', opacity: 0.8, marginTop: '2px' }}>Obrolan Multimedia Terenkripsi</div>
        </div>

        {/* Add Room */}
        <form onSubmit={handleAddRoom} style={{ display: 'flex', gap: '0.4rem', padding: '0.6rem 0.8rem', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <input placeholder="Buat ruang obrolan baru..." value={newRoomName} onChange={(e) => setNewRoomName(e.target.value)} style={{ flex: 1, padding: '8px 12px', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '0.85rem', background: 'var(--bg-tertiary)', color: '#111', outline: 'none' }} />
          <button type="submit" disabled={!newRoomName.trim()} style={{ background: newRoomName.trim() ? '#075e54' : '#ccc', color: 'white', border: 'none', borderRadius: '8px', padding: '0 12px', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600, fontSize: '0.8rem' }}><Plus size={16} /> Buat</button>
        </form>

        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
          <div style={{ padding: '0.6rem 1rem', display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '0.7rem' }}>
            <Shield size={11} /> End-to-End Encrypted
          </div>
          {allRooms.map(room => (
            <div key={room.id} onClick={() => { setMessages([]); setActiveRoom(room.id); }} style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', padding: '0.75rem 1rem', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)', cursor: 'pointer' }}>
              <div style={{ width: 46, height: 46, borderRadius: '50%', background: room.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem', flexShrink: 0 }}>{room.emoji}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.95rem' }}>#{room.name}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '1px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{room.desc}</div>
              </div>
              <ArrowRight size={16} color="var(--text-muted)" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ─── CHAT CONVERSATION ───
  const room = allRooms.find(r => r.id === activeRoom);
  const roomName = room?.name || activeRoom;
  const roomEmoji = room?.emoji || '💬';
  const roomColor = room?.color || '#25d366';

  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', background: '#ece5dd' }}>
      {/* Header */}
      <div style={{ background: '#075e54', color: 'white', padding: '0.7rem 0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', boxShadow: '0 1px 4px rgba(0,0,0,0.15)', zIndex: 10, flexShrink: 0 }}>
        <button onClick={() => { setActiveRoom(null); setMessages([]); }} style={{ background: 'none', border: 'none', color: 'white', display: 'flex', alignItems: 'center', cursor: 'pointer', padding: '4px' }}>
          <ChevronLeft size={22} />
        </button>
        <div style={{ width: 34, height: 34, borderRadius: '50%', background: roomColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', flexShrink: 0 }}>{roomEmoji}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>#{roomName}</div>
          <div style={{ fontSize: '0.65rem', opacity: 0.7 }}>ketuk untuk info</div>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, minHeight: 0, padding: '0.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '2px' }}>
        <div style={{ alignSelf: 'center', background: 'rgba(225,218,208,0.95)', padding: '2px 10px', borderRadius: '6px', fontSize: '0.65rem', color: '#5f6368', fontWeight: 500, margin: '4px 0' }}>Hari Ini</div>

        {messages.map((msg, idx) => {
          const isSelf = msg.self;
          const initials = (msg.username || '?')[0].toUpperCase();
          const avatarBg = getAvatarColor(msg.username);
          return (
            <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: isSelf ? 'flex-end' : 'flex-start', maxWidth: '80%', alignSelf: isSelf ? 'flex-end' : 'flex-start', marginBottom: '3px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', flexDirection: isSelf ? 'row-reverse' : 'row' }}>
                {!isSelf && <div style={{ width: 24, height: 24, borderRadius: '50%', background: avatarBg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '0.6rem', fontWeight: 700, flexShrink: 0 }}>{initials}</div>}
                <div style={{ background: isSelf ? '#dcf8c6' : 'white', padding: '5px 7px', borderRadius: isSelf ? '8px 2px 8px 8px' : '2px 8px 8px 8px', boxShadow: '0 1px 1px rgba(0,0,0,0.08)', minWidth: '60px' }}>
                  {!isSelf && <div style={{ fontSize: '0.65rem', fontWeight: 700, color: avatarBg, marginBottom: '1px' }}>{msg.username}</div>}
                  {msg.type === 'image' && <img src={msg.image} alt="Foto" style={{ width: '100%', borderRadius: '4px', marginBottom: '3px', maxWidth: '200px' }} />}
                  {msg.type === 'location' && <a href={`https://www.google.com/maps?q=${msg.lat},${msg.lng}`} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', color: '#075e54', fontWeight: 600, fontSize: '0.8rem', textDecoration: 'none' }}><MapPin size={12} /> Buka Maps</a>}
                  <div style={{ fontSize: '0.85rem', color: '#111', lineHeight: 1.3, wordBreak: 'break-word' }}>{msg.text}</div>
                  <div style={{ fontSize: '0.55rem', color: 'rgba(0,0,0,0.4)', textAlign: 'right', marginTop: '2px' }}>
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    {isSelf && <span style={{ marginLeft: '3px' }}>✓✓</span>}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={chatEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSendText} style={{ display: 'flex', padding: '5px 6px', background: '#f0f0f0', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
        <button type="button" onClick={() => fileInputRef.current?.click()} style={{ background: 'none', border: 'none', color: '#54656f', display: 'flex', alignItems: 'center', padding: '5px', cursor: 'pointer' }}>
          <Camera size={20} />
          <input type="file" accept="image/*" capture="environment" ref={fileInputRef} style={{ display: 'none' }} onChange={handleImageCapture} />
        </button>
        <button type="button" onClick={handleLocation} style={{ background: 'none', border: 'none', color: '#54656f', display: 'flex', alignItems: 'center', padding: '5px', cursor: 'pointer' }}>
          <MapPin size={20} />
        </button>
        <input placeholder="Ketik pesan" value={text} onChange={(e) => setText(e.target.value)} autoComplete="off" style={{ flex: 1, background: 'white', border: 'none', borderRadius: '20px', padding: '8px 14px', fontSize: '0.9rem', color: '#111', outline: 'none' }} />
        <button type="submit" disabled={!text.trim()} style={{ width: 38, height: 38, borderRadius: '50%', background: text.trim() ? '#00a884' : '#8696a0', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
          <Send size={16} color="white" />
        </button>
      </form>
    </div>
  );
}
