import React, { useState, useRef, useEffect } from 'react';
import { Camera, MapPin, Send, ChevronLeft, Hash, ArrowRight, Shield } from 'lucide-react';
import { io } from 'socket.io-client';

const CHAT_ROOMS = [
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
  const chatEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const socketRef = useRef(null);

  useEffect(() => {
    if (!activeRoom || !username) return;
    const sock = io();
    socketRef.current = sock;
    sock.on('connect', () => {
      sock.emit('join-channel', { username, channel: activeRoom });
    });
    sock.on('chat-message', (data) => {
      setMessages(prev => [...prev, { ...data, self: false }]);
    });
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
    if (!navigator.geolocation) { alert("Browser tidak mendukung GPS."); return; }
    navigator.geolocation.getCurrentPosition((pos) => {
      const packet = { type: 'location', text: '📍 Lokasi Terkini', lat: pos.coords.latitude, lng: pos.coords.longitude, self: true, username, timestamp: new Date().toISOString() };
      if (socketRef.current) socketRef.current.emit('chat-message', packet);
      setMessages(prev => [...prev, packet]);
    }, () => { alert("Gagal membaca GPS."); });
  };

  const handleImageCapture = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_W = 800;
        const scale = MAX_W / img.width;
        canvas.width = MAX_W;
        canvas.height = img.height * scale;
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        const base64 = canvas.toDataURL('image/jpeg', 0.6);
        const packet = { type: 'image', text: '📷 Foto', image: base64, self: true, username, timestamp: new Date().toISOString() };
        if (socketRef.current) socketRef.current.emit('chat-message', packet);
        setMessages(prev => [...prev, packet]);
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  // ─── ROOM LIST ───
  if (!activeRoom) {
    return (
      <div className="tab-screen">
        <div style={{ background: 'linear-gradient(135deg, #075e54 0%, #128c7e 100%)', color: 'white', padding: '1.5rem 1rem 1.2rem' }}>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800 }}>Chat</h1>
          <div style={{ fontSize: '0.75rem', opacity: 0.8, marginTop: '2px' }}>Obrolan Multimedia Terenkripsi</div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '0.8rem 1rem', display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
            <Shield size={12} /> End-to-End Encrypted
          </div>

          {CHAT_ROOMS.map(room => (
            <div 
              key={room.id} 
              onClick={() => { setMessages([]); setActiveRoom(room.id); }}
              style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', padding: '0.9rem 1rem', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)', cursor: 'pointer', transition: 'background 0.15s' }}
            >
              <div style={{ width: 50, height: 50, borderRadius: '50%', background: room.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', flexShrink: 0, boxShadow: '0 2px 8px rgba(0,0,0,0.12)' }}>
                {room.emoji}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '1rem' }}>#{room.name}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{room.desc}</div>
              </div>
              <ArrowRight size={18} color="var(--text-muted)" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ─── CHAT CONVERSATION ───
  const room = CHAT_ROOMS.find(r => r.id === activeRoom);
  const roomName = room?.name || activeRoom;
  const roomEmoji = room?.emoji || '💬';
  const roomColor = room?.color || '#25d366';

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#ece5dd', position: 'relative' }}>
      {/* Header */}
      <div style={{ background: '#075e54', color: 'white', padding: '0.8rem 0.6rem', display: 'flex', alignItems: 'center', gap: '0.6rem', boxShadow: '0 2px 6px rgba(0,0,0,0.15)', zIndex: 10 }}>
        <button onClick={() => { setActiveRoom(null); setMessages([]); }} style={{ background: 'none', border: 'none', color: 'white', display: 'flex', alignItems: 'center', cursor: 'pointer', padding: '4px' }}>
          <ChevronLeft size={24} />
        </button>
        <div style={{ width: 38, height: 38, borderRadius: '50%', background: roomColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', flexShrink: 0 }}>
          {roomEmoji}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: '1rem' }}>#{roomName}</div>
          <div style={{ fontSize: '0.7rem', opacity: 0.7 }}>tap untuk info grup</div>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, padding: '0.6rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.2rem', backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'200\' height=\'200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M20 20L40 40M60 20L80 40M100 20L120 40M140 20L160 40M20 60L40 80M60 60L80 80M100 60L120 80M140 60L160 80M20 100L40 120M60 100L80 120M100 100L120 120M140 100L160 120M20 140L40 160M60 140L80 160M100 140L120 160M140 140L160 160\' stroke=\'%23d4c9b8\' stroke-width=\'0.5\' fill=\'none\' opacity=\'0.3\'/%3E%3C/svg%3E")', backgroundSize: '100px' }}>
        
        {/* Date chip */}
        <div style={{ alignSelf: 'center', background: 'rgba(225,218,208,0.95)', padding: '3px 12px', borderRadius: '8px', fontSize: '0.7rem', color: '#5f6368', fontWeight: 500, margin: '6px 0', boxShadow: '0 1px 1px rgba(0,0,0,0.08)' }}>
          Hari Ini
        </div>

        {messages.map((msg, idx) => {
          const isSelf = msg.self;
          const initials = (msg.username || '?')[0].toUpperCase();
          const avatarBg = getAvatarColor(msg.username);

          return (
            <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: isSelf ? 'flex-end' : 'flex-start', maxWidth: '82%', alignSelf: isSelf ? 'flex-end' : 'flex-start', marginBottom: '4px', animation: 'slideIn 0.15s ease-out' }}>
              
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px', flexDirection: isSelf ? 'row-reverse' : 'row' }}>
                {/* Avatar */}
                {!isSelf && (
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: avatarBg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '0.7rem', fontWeight: 700, flexShrink: 0 }}>
                    {initials}
                  </div>
                )}

                {/* Bubble */}
                <div style={{ background: isSelf ? '#dcf8c6' : 'white', padding: '6px 8px', borderRadius: isSelf ? '10px 2px 10px 10px' : '2px 10px 10px 10px', boxShadow: '0 1px 1px rgba(0,0,0,0.1)', minWidth: '70px', maxWidth: '100%' }}>
                  {/* Sender name */}
                  {!isSelf && <div style={{ fontSize: '0.7rem', fontWeight: 700, color: avatarBg, marginBottom: '2px' }}>{msg.username}</div>}
                  
                  {msg.type === 'image' && <img src={msg.image} alt="Foto" style={{ width: '100%', borderRadius: '6px', marginBottom: '4px', maxWidth: '240px' }} />}
                  
                  {msg.type === 'location' && (
                    <a href={`https://www.google.com/maps?q=${msg.lat},${msg.lng}`} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#075e54', fontWeight: 600, fontSize: '0.85rem', textDecoration: 'none', background: 'rgba(7,94,84,0.08)', padding: '6px 10px', borderRadius: '8px', marginBottom: '4px' }}>
                      <MapPin size={14} /> Buka di Google Maps
                    </a>
                  )}

                  <div style={{ fontSize: '0.9rem', color: '#111', lineHeight: 1.35, wordBreak: 'break-word' }}>{msg.text}</div>
                  
                  <div style={{ fontSize: '0.6rem', color: 'rgba(0,0,0,0.4)', textAlign: 'right', marginTop: '3px' }}>
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    {isSelf && <span style={{ marginLeft: '4px' }}>✓✓</span>}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={chatEndRef} />
      </div>

      {/* Input Bar */}
      <form 
        onSubmit={handleSendText}
        style={{ display: 'flex', padding: '6px 8px', paddingBottom: 'max(75px, env(safe-area-inset-bottom))', background: '#f0f0f0', alignItems: 'center', gap: '6px', zIndex: 50 }}
      >
        <button type="button" onClick={() => fileInputRef.current?.click()} style={{ background: 'none', border: 'none', color: '#54656f', display: 'flex', alignItems: 'center', padding: '6px', cursor: 'pointer' }}>
          <Camera size={22} />
          <input type="file" accept="image/*" capture="environment" ref={fileInputRef} style={{ display: 'none' }} onChange={handleImageCapture} />
        </button>
        <button type="button" onClick={handleLocation} style={{ background: 'none', border: 'none', color: '#54656f', display: 'flex', alignItems: 'center', padding: '6px', cursor: 'pointer' }}>
          <MapPin size={22} />
        </button>

        <input
          placeholder="Ketik pesan"
          value={text}
          onChange={(e) => setText(e.target.value)}
          autoComplete="off"
          style={{ flex: 1, background: 'white', border: 'none', borderRadius: '24px', padding: '10px 16px', fontSize: '0.95rem', color: '#111', outline: 'none', boxShadow: '0 1px 2px rgba(0,0,0,0.08)' }}
        />

        <button type="submit" disabled={!text.trim()} style={{ width: 42, height: 42, borderRadius: '50%', background: text.trim() ? '#00a884' : '#8696a0', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'background 0.2s', flexShrink: 0 }}>
          <Send size={18} color="white" />
        </button>
      </form>
    </div>
  );
}
