import React, { useState, useRef, useEffect } from 'react';
import { Camera, MapPin, Send, ChevronLeft, ArrowRight, Shield, Plus, MessageSquare, Users, Search, Phone, Video, X } from 'lucide-react';
import { io } from 'socket.io-client';

const AVATAR_COLORS = ['#e53935','#8e24aa','#3949ab','#00897b','#f4511e','#6d4c41','#546e7a','#d81b60'];
function getAvatarColor(name) {
  let hash = 0;
  for (let i = 0; i < (name||'').length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export default function ChatScreen({ username, userPhone, initialRoom, initialRoomName, onClearDM, onCall, onVideoCall }) {
  const [activeRoom, setActiveRoom] = useState(initialRoom || null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  
  const chatEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const socketRef = useRef(null);

  // Load conversations list
  const loadConversations = () => {
    if (!userPhone) return;
    fetch(`/api/conversations/${userPhone}`)
      .then(r => r.json())
      .then(data => setConversations(data.conversations || []))
      .catch(() => {});
  };

  useEffect(() => {
    if (!activeRoom) loadConversations();
  }, [activeRoom]);

  // Load history from DB when entering a room
  useEffect(() => {
    if (!activeRoom || !username) return;

    setLoading(true);
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

    const sock = io();
    socketRef.current = sock;
    sock.on('connect', () => {
      sock.emit('register-user', { phone: userPhone });
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
    const packet = { type: 'text', text: text.trim(), self: true, username, timestamp: new Date().toISOString(), room: activeRoom };
    socketRef.current.emit('chat-message', packet);
    setMessages(prev => [...prev, packet]);
    saveMessage(packet);
    setText('');
  };

  const handleJoinGroup = (e) => {
    e.preventDefault();
    if (!joinCode.trim()) return;
    const code = joinCode.trim().toUpperCase();
    setActiveRoom(code.startsWith('CHAT-') ? code : `CHAT-${code}`);
    setShowJoinModal(false);
    setJoinCode('');
  };

  const getChatName = (conv) => {
    if (conv.room.startsWith('DM-')) {
      // It's a DM, sender_name might be the OTHER person if they sent the last message
      // But we should really store the other participant's name if possible
      return conv.sender_phone === userPhone ? 'Saya' : conv.sender_name;
    }
    return conv.room.replace('CHAT-', '');
  };

  // ─── CONVERSATION LIST VIEW ───
  if (!activeRoom) {
    return (
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)' }}>
        <div style={{ background: 'linear-gradient(135deg, #075e54 0%, #128c7e 100%)', color: 'white', padding: '1rem', flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 800 }}>Chat</h1>
            <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>Hubungkan insan HKA</div>
          </div>
          <button onClick={() => setShowJoinModal(true)} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', borderRadius: '50%', width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <Plus size={24} />
          </button>
        </div>

        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
          {conversations.length === 0 && (
            <div style={{ padding: '4rem 2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              <MessageSquare size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
              <p style={{ fontSize: '0.9rem' }}>Belum ada percakapan.<br/>Mulai chat dari menu Kontak atau tekan +</p>
            </div>
          )}

          {conversations.map((conv, idx) => {
            const name = getChatName(conv);
            const isDM = conv.room.startsWith('DM-');
            const initials = name?.[0]?.toUpperCase() || '?';
            const color = getAvatarColor(name);

            return (
              <div key={conv.room} onClick={() => setActiveRoom(conv.room)} style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', padding: '0.8rem 1rem', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)', cursor: 'pointer' }}>
                <div style={{ width: 50, height: 50, borderRadius: '50%', background: isDM ? color : '#128c7e', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', fontWeight: 800, flexShrink: 0 }}>
                  {isDM ? initials : <Users size={24} />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <div style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '1rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{isDM ? name : `#${name}`}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{new Date(conv.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: '2px' }}>
                    {conv.sender_phone === userPhone ? 'Anda: ' : `${conv.sender_name}: `}{conv.content}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Join Group Modal */}
        {showJoinModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
            <div style={{ background: 'white', borderRadius: '16px', padding: '1.5rem', width: '100%', maxWidth: '320px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ margin: 0, fontWeight: 800 }}>Gabung Grup</h3>
                <button onClick={() => setShowJoinModal(false)} style={{ background: 'none', border: 'none', color: '#888' }}><X size={20} /></button>
              </div>
              <form onSubmit={handleJoinGroup}>
                <p style={{ fontSize: '0.8rem', color: '#666', marginBottom: '1rem' }}>Masukkan kode grup atau nama divisi untuk bergabung ke percakapan.</p>
                <input autoFocus placeholder="Contoh: GENERAL atau HC-IT" value={joinCode} onChange={e => setJoinCode(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ddd', marginBottom: '1rem', outline: 'none' }} />
                <button type="submit" style={{ width: '100%', background: '#128c7e', color: 'white', border: 'none', borderRadius: '8px', padding: '10px', fontWeight: 700 }}>GABUNG</button>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ─── CHAT CONVERSATION VIEW ───
  const isDM = activeRoom.startsWith('DM-');
  const roomName = isDM ? (initialRoomName || 'Chat Personal') : activeRoom.replace('CHAT-','');

  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', background: '#ece5dd' }}>
      {/* Header */}
      <div style={{ background: '#075e54', color: 'white', padding: '0.6rem 0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0, zIndex: 10 }}>
        <button onClick={() => { setActiveRoom(null); if(onClearDM) onClearDM(); }} style={{ background: 'none', border: 'none', color: 'white', display: 'flex', alignItems: 'center', cursor: 'pointer', padding: '3px' }}><ChevronLeft size={24} /></button>
        <div style={{ width: 38, height: 38, borderRadius: '50%', background: isDM ? getAvatarColor(roomName) : '#128c7e', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', fontWeight: 800, flexShrink: 0 }}>
          {isDM ? roomName[0].toUpperCase() : <Users size={20} />}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: '0.95rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{isDM ? roomName : `#${roomName}`}</div>
          <div style={{ fontSize: '0.65rem', opacity: 0.7 }}>{isDM ? 'Aktif Sekarang' : 'Grup Terbuka'}</div>
        </div>
        {isDM && (
          <div style={{ display: 'flex', gap: '0.8rem', marginRight: '0.6rem' }}>
             <button 
               onClick={() => {
                 const otherPhone = activeRoom.split('-').find(p => p !== 'DM' && p !== userPhone);
                 if (onCall) onCall({ phone: otherPhone, display_name: roomName });
               }}
               style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
             >
               <Phone size={20} />
             </button>
             <button 
               onClick={() => {
                 const otherPhone = activeRoom.split('-').find(p => p !== 'DM' && p !== userPhone);
                 if (onVideoCall) onVideoCall({ phone: otherPhone, display_name: roomName });
               }}
               style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
             >
               <Video size={20} />
             </button>
          </div>
        )}
      </div>

      {/* Messages */}
      <div style={{ flex: 1, minHeight: 0, padding: '0.6rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {loading && <div style={{ alignSelf: 'center', padding: '1rem', color: '#888', fontSize: '0.8rem', background: 'rgba(255,255,255,0.7)', borderRadius: '10px' }}>Memuat history...</div>}
        
        {messages.map((msg, idx) => {
          const isSelf = msg.self;
          const initials = (msg.username || '?')[0].toUpperCase();
          const avatarBg = getAvatarColor(msg.username);
          return (
            <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: isSelf ? 'flex-end' : 'flex-start', maxWidth: '85%', alignSelf: isSelf ? 'flex-end' : 'flex-start', marginBottom: '2px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', flexDirection: isSelf ? 'row-reverse' : 'row' }}>
                {!isSelf && !isDM && <div style={{ width: 26, height: 26, borderRadius: '50%', background: avatarBg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '0.65rem', fontWeight: 700, flexShrink: 0, marginBottom: '2px' }}>{initials}</div>}
                <div style={{ background: isSelf ? '#dcf8c6' : 'white', padding: '6px 8px', borderRadius: isSelf ? '8px 2px 8px 8px' : '2px 8px 8px 8px', boxShadow: '0 1px 2px rgba(0,0,0,0.1)', minWidth: '60px', position: 'relative' }}>
                  {!isSelf && !isDM && <div style={{ fontSize: '0.7rem', fontWeight: 700, color: avatarBg, marginBottom: '2px' }}>{msg.username}</div>}
                  {msg.type === 'image' && msg.image && <img src={msg.image} alt="Foto" style={{ width: '100%', borderRadius: '6px', marginBottom: '4px', maxWidth: '240px' }} />}
                  {msg.type === 'location' && <a href={`https://www.google.com/maps?q=${msg.lat},${msg.lng}`} target="_blank" rel="noreferrer" style={{ display: 'block', padding: '8px', background: '#f8f8f8', borderRadius: '6px', color: '#075e54', fontWeight: 700, fontSize: '0.8rem', textDecoration: 'none', marginBottom: '4px', border: '1px solid #eee' }}>📍 Bagikan Lokasi</a>}
                  <div style={{ fontSize: '0.9rem', color: '#111', lineHeight: 1.4, wordBreak: 'break-word' }}>{msg.text}</div>
                  <div style={{ fontSize: '0.6rem', color: 'rgba(0,0,0,0.4)', textAlign: 'right', marginTop: '2px', display: 'flex', justifyContent: 'flex-end', gap: '2px' }}>
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    {isSelf && <span style={{ color: '#34b7f1' }}>✓✓</span>}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={chatEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSendText} style={{ display: 'flex', padding: '6px 8px', background: '#f0f0f0', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
        <button type="button" onClick={() => fileInputRef.current?.click()} style={{ background: 'none', border: 'none', color: '#54656f', display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
          <Camera size={24} />
          <input type="file" accept="image/*" capture="environment" ref={fileInputRef} style={{ display: 'none' }} onChange={(e) => {
            const file = e.target.files[0]; if (!file) return;
            const r = new FileReader(); r.onload = (ev) => {
                const img = new Image(); img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const MAX_W = 800, scale = Math.min(MAX_W / img.width, 1);
                    canvas.width = img.width * scale; canvas.height = img.height * scale;
                    canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
                    const base64 = canvas.toDataURL('image/jpeg', 0.6);
                    const p = { type: 'image', text: '📷 Foto', image: base64, self: true, username, timestamp: new Date().toISOString(), room: activeRoom };
                    socketRef.current?.emit('chat-message', p); setMessages(prev => [...prev, p]); saveMessage(p);
                }; img.src = ev.target.result;
            }; r.readAsDataURL(file);
          }} />
        </button>
        <button type="button" onClick={() => {
            if (!navigator.geolocation) return;
            navigator.geolocation.getCurrentPosition(pos => {
              const p = { type: 'location', text: '📍 Lokasi', lat: pos.coords.latitude, lng: pos.coords.longitude, self: true, username, timestamp: new Date().toISOString(), room: activeRoom };
              socketRef.current?.emit('chat-message', p); setMessages(prev => [...prev, p]); saveMessage(p);
            });
        }} style={{ background: 'none', border: 'none', color: '#54656f', display: 'flex', alignItems: 'center', cursor: 'pointer' }}><MapPin size={24} /></button>
        <input placeholder="Ketik pesan" value={text} onChange={(e) => setText(e.target.value)} autoComplete="off" style={{ flex: 1, background: 'white', border: 'none', borderRadius: '24px', padding: '9px 16px', fontSize: '0.9rem', color: '#111', outline: 'none', boxShadow: '0 1px 1px rgba(0,0,0,0.1)' }} />
        <button type="submit" disabled={!text.trim()} style={{ width: 44, height: 44, borderRadius: '50%', background: text.trim() ? '#00a884' : '#8696a0', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, boxShadow: '0 1px 2px rgba(0,0,0,0.2)' }}><Send size={20} color="white" /></button>
      </form>
    </div>
  );
}
