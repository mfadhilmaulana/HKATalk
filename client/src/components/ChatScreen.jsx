import React, { useState, useRef, useEffect } from 'react';
import { Camera, MapPin, Send, ChevronLeft, ArrowRight, Shield, Plus, MessageSquare, Users, Search, Phone, Video, X, MoreVertical, Edit2, Trash2 } from 'lucide-react';
import { io } from 'socket.io-client';

const AVATAR_COLORS = ['#e53935','#8e24aa','#3949ab','#00897b','#f4511e','#6d4c41','#546e7a','#d81b60'];
function getAvatarColor(name) {
  let hash = 0;
  for (let i = 0; i < (name||'').length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

const DUMMY_STORIES = [
  { id: 1, name: 'Budi (Patroli)', color: '#e53935' },
  { id: 2, name: 'Siti (Senkom)', color: '#8e24aa' },
  { id: 3, name: 'Andi (Rescue)', color: '#3949ab' },
  { id: 4, name: 'Agus (Maintenance)', color: '#00897b' },
  { id: 5, name: 'HKA News', color: '#f4511e' },
  { id: 6, name: 'Operasi I', color: '#6d4c41' },
];

export default function ChatScreen({ username, userPhone, initialRoom, initialRoomName, onClearDM }) {
  const [activeRoom, setActiveRoom] = useState(initialRoom || null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [selectedMessage, setSelectedMessage] = useState(null); // For context menu
  const [editingMessage, setEditingMessage] = useState(null);
  
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
    else {
      // Mark as read when entering
      fetch('/api/read-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: userPhone, room: activeRoom })
      }).catch(() => {});
    }
  }, [activeRoom]);

  // Load history from DB when entering a room
  useEffect(() => {
    if (!activeRoom || !username) return;

    setLoading(true);
    fetch(`/api/messages/${encodeURIComponent(activeRoom)}`)
      .then(r => r.json())
      .then(data => {
        const history = (data.messages || []).map(m => ({
          id: m.id,
          type: m.msg_type,
          text: m.content,
          image: m.image || '',
          lat: m.lat,
          lng: m.lng,
          username: m.sender_name,
          timestamp: m.created_at,
          self: m.sender_phone === userPhone,
          isEdited: m.is_edited,
          isDeleted: m.is_deleted,
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
      if (data.room === activeRoom) {
        setMessages(prev => [...prev, { ...data, self: false }]);
      }
    });
    sock.on('message-edited', (data) => {
      setMessages(prev => prev.map(m => m.id === data.id ? { ...m, text: data.content, isEdited: true } : m));
    });
    sock.on('message-deleted', (data) => {
      setMessages(prev => prev.map(m => m.id === data.id ? { ...m, text: 'Pesan ini telah dihapus', isDeleted: true } : m));
    });

    return () => { sock.disconnect(); socketRef.current = null; };
  }, [activeRoom, username]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const saveMessage = async (msg) => {
    try {
      const res = await fetch('/api/messages', {
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
      });
      const data = await res.json();
      return data.message;
    } catch (e) { return null; }
  };

  const handleSendText = async (e) => {
    e.preventDefault();
    if (!text.trim() || !socketRef.current) return;

    if (editingMessage) {
      // Handle Edit
      try {
        const res = await fetch(`/api/messages/${editingMessage.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: text.trim(), sender_phone: userPhone })
        });
        if (res.ok) {
          const updated = { id: editingMessage.id, content: text.trim(), room: activeRoom };
          socketRef.current.emit('edit-message', updated);
          setMessages(prev => prev.map(m => m.id === editingMessage.id ? { ...m, text: text.trim(), isEdited: true } : m));
        }
      } catch (e) {}
      setEditingMessage(null);
      setText('');
      return;
    }

    const packet = { type: 'text', text: text.trim(), self: true, username, timestamp: new Date().toISOString(), room: activeRoom };
    const saved = await saveMessage(packet);
    if (saved) {
      packet.id = saved.id;
      socketRef.current.emit('chat-message', packet);
      setMessages(prev => [...prev, packet]);
    }
    setText('');
  };

  const handleDeleteMessage = async (msg) => {
    try {
      const res = await fetch(`/api/messages/${msg.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sender_phone: userPhone })
      });
      if (res.ok) {
        socketRef.current.emit('delete-message', { id: msg.id, room: activeRoom });
        setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, text: 'Pesan ini telah dihapus', isDeleted: true } : m));
      }
    } catch (e) {}
    setSelectedMessage(null);
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
      return conv.sender_phone === userPhone ? 'Chat Saya' : conv.sender_name;
    }
    const fixedNames = {
      'CHAT-GENERAL': 'O&M General',
      'CHAT-PPKA': 'Ruas PPKA',
      'CHAT-PIKET': 'Piket Layanan Tol',
      'CHAT-RESCUE': 'Rescue & Medis',
      'CHAT-PATROLI': 'Patroli Keamanan',
      'CHAT-SENKOM': 'Sentral Komunikasi'
    };
    return fixedNames[conv.room] || conv.room.replace('CHAT-', '');
  };

  // ─── CONVERSATION LIST VIEW ───
  if (!activeRoom) {
    return (
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)' }}>
        {/* Modern Header */}
        <div style={{ background: 'var(--bg-secondary)', padding: '1rem 1.2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)' }}>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 900, color: 'var(--accent)', margin: 0 }}>Pesan</h1>
          <button onClick={() => setShowJoinModal(true)} style={{ background: 'var(--accent-light)', border: 'none', color: 'var(--accent)', borderRadius: '12px', padding: '8px 16px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
            <Plus size={18} /> Grup
          </button>
        </div>

        {/* Stories Bar */}
        <div className="story-container">
           {DUMMY_STORIES.map(s => (
             <div key={s.id} className="story-item">
                <div className="story-avatar-wrapper">
                   <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: s.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 800, fontSize: '1rem' }}>{s.name[0]}</div>
                </div>
                <div className="story-name">{s.name}</div>
             </div>
           ))}
        </div>

        {/* Chat List */}
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
          {conversations.length === 0 && (
            <div style={{ padding: '6rem 2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              <MessageSquare size={54} style={{ opacity: 0.1, marginBottom: '1.5rem' }} />
              <p style={{ fontSize: '1rem', fontWeight: 500 }}>Belum ada obrolan.<br/>Mulai koordinasi sekarang.</p>
            </div>
          )}

          {conversations.map((conv) => {
            const name = getChatName(conv);
            const isDM = conv.room.startsWith('DM-');
            const initials = name?.[0]?.toUpperCase() || '?';
            const color = getAvatarColor(name);
            const unreadCount = parseInt(conv.unread_count || 0);

            return (
              <div key={conv.room} className="chat-list-item" onClick={() => setActiveRoom(conv.room)}>
                <div style={{ width: 56, height: 56, borderRadius: '18px', background: isDM ? color : 'var(--accent)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', fontWeight: 800, flexShrink: 0, boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }}>
                  {isDM ? initials : <Users size={28} />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <div style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '1.05rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</div>
                    <div style={{ fontSize: '0.75rem', color: unreadCount > 0 ? 'var(--accent)' : 'var(--text-muted)', fontWeight: unreadCount > 0 ? 800 : 400 }}>{new Date(conv.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, paddingRight: '8px' }}>
                      {conv.sender_phone === userPhone ? 'Anda: ' : `${conv.sender_name}: `}{conv.content}
                    </div>
                    {unreadCount > 0 && <span className="unread-badge">{unreadCount}</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Join Group Modal */}
        {showJoinModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
            <div style={{ background: 'white', borderRadius: '24px', padding: '2rem', width: '100%', maxWidth: '340px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ margin: 0, fontWeight: 900, fontSize: '1.3rem' }}>O&M Groups</h3>
                <button onClick={() => setShowJoinModal(false)} style={{ background: 'var(--bg-primary)', border: 'none', color: '#666', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={20} /></button>
              </div>
              <form onSubmit={handleJoinGroup}>
                <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: '1.5rem', lineHeight: 1.5 }}>Gunakan kode akses atau nama divisi operasional untuk bergabung.</p>
                <input autoFocus placeholder="Contoh: SENKOM atau PPKA" value={joinCode} onChange={e => setJoinCode(e.target.value)} style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '2px solid var(--bg-primary)', marginBottom: '1.5rem', outline: 'none', fontSize: '1rem', fontWeight: 600 }} />
                <button type="submit" style={{ width: '100%', background: 'var(--accent)', color: 'white', border: 'none', borderRadius: '12px', padding: '14px', fontWeight: 800, fontSize: '1rem', boxShadow: '0 4px 15px var(--accent-glow)' }}>GABUNG SEKARANG</button>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ─── CHAT CONVERSATION VIEW ───
  const isDM = activeRoom.startsWith('DM-');
  const roomName = isDM ? (initialRoomName || 'Chat Personal') : getChatName({ room: activeRoom });

  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', background: '#f0f2f5' }}>
      {/* Header */}
      <div style={{ background: 'white', color: 'var(--text-main)', padding: '0.7rem 0.8rem', display: 'flex', alignItems: 'center', gap: '0.6rem', flexShrink: 0, zIndex: 10, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <button onClick={() => { setActiveRoom(null); if(onClearDM) onClearDM(); }} style={{ background: 'none', border: 'none', color: 'var(--accent)', display: 'flex', alignItems: 'center', cursor: 'pointer', padding: '4px' }}><ChevronLeft size={28} /></button>
        <div style={{ width: 44, height: 44, borderRadius: '14px', background: isDM ? getAvatarColor(roomName) : 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', fontWeight: 900, flexShrink: 0, color: 'white' }}>
          {isDM ? roomName[0].toUpperCase() : <Users size={22} />}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 800, fontSize: '1.05rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{roomName}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--success)', fontWeight: 600 }}>{isDM ? 'Online' : 'Koordinasi Jalan Tol'}</div>
        </div>
        <div style={{ display: 'flex', gap: '1rem', marginRight: '0.5rem' }}>
             {isDM && <Phone size={22} onClick={() => onCall?.(activeRoom)} style={{ color: 'var(--accent)', cursor: 'pointer' }} />}
             {isDM && <Video size={24} onClick={() => onVideoCall?.(activeRoom)} style={{ color: 'var(--accent)', cursor: 'pointer' }} />}
             <MoreVertical size={22} style={{ color: '#888', cursor: 'pointer' }} />
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, minHeight: 0, padding: '1rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {loading && <div style={{ alignSelf: 'center', padding: '0.5rem 1rem', background: 'white', borderRadius: '20px', fontSize: '0.8rem', color: '#888', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>Sinkronisasi pesan...</div>}
        
        {messages.map((msg, idx) => {
          const isSelf = msg.self;
          const initials = (msg.username || '?')[0].toUpperCase();
          const avatarBg = getAvatarColor(msg.username);
          return (
            <div key={idx} 
                 onContextMenu={(e) => { e.preventDefault(); if(isSelf && !msg.isDeleted) setSelectedMessage(msg); }}
                 onTouchStart={(e) => { 
                   const timer = setTimeout(() => { if(isSelf && !msg.isDeleted) setSelectedMessage(msg); }, 500);
                   e.target.dataset.timer = timer;
                 }}
                 onTouchEnd={(e) => clearTimeout(e.target.dataset.timer)}
                 style={{ display: 'flex', flexDirection: 'column', alignItems: isSelf ? 'flex-end' : 'flex-start', maxWidth: '85%', alignSelf: isSelf ? 'flex-end' : 'flex-start', marginBottom: '4px' }}>
              
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px', flexDirection: isSelf ? 'row-reverse' : 'row' }}>
                {!isSelf && !isDM && <div style={{ width: 28, height: 28, borderRadius: '50%', background: avatarBg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '0.75rem', fontWeight: 800, flexShrink: 0, marginBottom: '4px' }}>{initials}</div>}
                <div className={`msg-bubble-refined ${isSelf ? 'msg-self' : 'msg-other'}`} style={{ opacity: msg.isDeleted ? 0.6 : 1 }}>
                  {!isSelf && !isDM && <div style={{ fontSize: '0.75rem', fontWeight: 800, color: avatarBg, marginBottom: '4px' }}>{msg.username}</div>}
                  {msg.type === 'image' && msg.image && <img src={msg.image} alt="Foto" style={{ width: '100%', borderRadius: '12px', marginBottom: '6px', maxWidth: '280px' }} />}
                  {msg.type === 'location' && <a href={`https://www.google.com/maps?q=${msg.lat},${msg.lng}`} target="_blank" rel="noreferrer" style={{ display: 'block', padding: '10px', background: 'rgba(0,0,0,0.03)', borderRadius: '10px', color: 'var(--accent)', fontWeight: 700, fontSize: '0.85rem', textDecoration: 'none', marginBottom: '6px', border: '1px solid rgba(0,0,0,0.05)' }}>📍 Lokasi Tim Operasional</a>}
                  
                  <div style={{ fontSize: '0.95rem', color: '#111', lineHeight: 1.5, wordBreak: 'break-word', fontStyle: msg.isDeleted ? 'italic' : 'normal' }}>{msg.text}</div>
                  
                  <div style={{ fontSize: '0.65rem', color: 'rgba(0,0,0,0.4)', textAlign: 'right', marginTop: '4px', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '4px' }}>
                    {msg.isEdited && !msg.isDeleted && <span>direvisi</span>}
                    {new Date(msg.timestamp || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    {isSelf && <span className="msg-status-tick">✓✓</span>}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={chatEndRef} />
      </div>

      {/* Edit Overlay Indicator */}
      {editingMessage && (
        <div style={{ background: 'var(--accent-light)', padding: '8px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '2px solid var(--accent)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent)', fontSize: '0.85rem', fontWeight: 600 }}>
            <Edit2 size={16} /> Edit Pesan: <span style={{ fontWeight: 400, opacity: 0.8 }}>{editingMessage.text.substring(0, 30)}...</span>
          </div>
          <X size={18} style={{ cursor: 'pointer', color: 'var(--accent)' }} onClick={() => { setEditingMessage(null); setText(''); }} />
        </div>
      )}

      {/* Context Menu Modal (Simple) */}
      {selectedMessage && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.1)', zIndex: 100, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={() => setSelectedMessage(null)}>
           <div style={{ background: 'white', width: '100%', maxWidth: '420px', borderRadius: '24px 24px 0 0', padding: '1rem', boxShadow: '0 -4px 20px rgba(0,0,0,0.1)' }} onClick={e => e.stopPropagation()}>
              <div style={{ width: 40, height: 4, background: '#ddd', borderRadius: 2, margin: '0 auto 1.5rem' }}></div>
              <button onClick={() => { setEditingMessage(selectedMessage); setText(selectedMessage.text); setSelectedMessage(null); }} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', background: 'none', border: 'none', fontSize: '1rem', fontWeight: 600, color: '#333', cursor: 'pointer' }}>
                <Edit2 size={20} /> Edit Pesan
              </button>
              <button onClick={() => handleDeleteMessage(selectedMessage)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', background: 'none', border: 'none', fontSize: '1rem', fontWeight: 600, color: 'var(--danger)', cursor: 'pointer' }}>
                <Trash2 size={20} /> Hapus Pesan
              </button>
              <div style={{ height: 'calc(env(safe-area-inset-bottom) + 10px)' }}></div>
           </div>
        </div>
      )}

      {/* Input */}
      <div style={{ padding: '8px 12px', background: 'white', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
        <form onSubmit={handleSendText} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button type="button" onClick={() => fileInputRef.current?.click()} style={{ background: '#f0f2f5', border: 'none', color: '#5f6368', width: 42, height: 42, borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <Camera size={22} />
            <input type="file" accept="image/*" capture="environment" ref={fileInputRef} style={{ display: 'none' }} onChange={(e) => {
              const file = e.target.files[0]; if (!file) return;
              const r = new FileReader(); r.onload = (ev) => {
                  const img = new Image(); img.onload = () => {
                      const canvas = document.createElement('canvas');
                      const MAX_W = 1000, scale = Math.min(MAX_W / img.width, 1);
                      canvas.width = img.width * scale; canvas.height = img.height * scale;
                      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
                      const base64 = canvas.toDataURL('image/jpeg', 0.6);
                      const p = { type: 'image', text: '📷 Foto', image: base64, self: true, username, timestamp: new Date().toISOString(), room: activeRoom };
                      saveMessage(p).then(saved => {
                        if (saved) { p.id = saved.id; socketRef.current?.emit('chat-message', p); setMessages(prev => [...prev, p]); }
                      });
                  }; img.src = ev.target.result;
              }; r.readAsDataURL(file);
            }} />
          </button>
          <button type="button" onClick={() => {
              if (!navigator.geolocation) return;
              navigator.geolocation.getCurrentPosition(pos => {
                const p = { type: 'location', text: '📍 Lokasi', lat: pos.coords.latitude, lng: pos.coords.longitude, self: true, username, timestamp: new Date().toISOString(), room: activeRoom };
                saveMessage(p).then(saved => {
                  if (saved) { p.id = saved.id; socketRef.current?.emit('chat-message', p); setMessages(prev => [...prev, p]); }
                });
              });
          }} style={{ background: '#f0f2f5', border: 'none', color: '#5f6368', width: 42, height: 42, borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><MapPin size={22} /></button>
          
          <input placeholder="Ketik pesan koordinasi..." value={text} onChange={(e) => setText(e.target.value)} autoComplete="off" style={{ flex: 1, background: '#f0f2f5', border: 'none', borderRadius: '14px', padding: '12px 16px', fontSize: '1rem', color: '#111', outline: 'none' }} />
          
          <button type="submit" disabled={!text.trim()} style={{ width: 44, height: 44, borderRadius: '14px', background: text.trim() ? 'var(--accent)' : '#ccc', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, boxShadow: text.trim() ? '0 4px 12px var(--accent-glow)' : 'none', transition: 'all 0.2s' }}>
            <Send size={22} color="white" />
          </button>
        </form>
        <div style={{ height: 'env(safe-area-inset-bottom)' }}></div>
      </div>
    </div>
  );
}
