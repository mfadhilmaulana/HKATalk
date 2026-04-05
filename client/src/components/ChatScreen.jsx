import React, { useState, useRef, useEffect } from 'react';
import { Camera, MapPin, Send, ChevronLeft, ArrowRight, Shield, Plus, MessageSquare, Users, Search, Phone, Video, X, Zap, Mic, Check, CheckCheck, Image as ImageIcon } from 'lucide-react';

const QUICK_REPLIES = ['Siap!', 'Dimengerti.', 'Sedang cek ke lokasi.', 'Selesai.', 'Aman terkendali.', 'Mohon tunggu...'];

const AVATAR_COLORS = ['#dc2626','#7c3aed','#2563eb','#059669','#d97706','#4b5563'];
function getAvatarColor(name) {
  let hash = 0;
  for (let i = 0; i < (name||'').length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export default function ChatScreen({ username, userPhone, initialRoom, initialRoomName, socket, onClearDM, onPTT }) {
  const [activeRoom, setActiveRoom] = useState(initialRoom || null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  
  const chatEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const fileInspectionRef = useRef(null);

  const handleInspectionPhoto = (e) => {
    const file = e.target.files[0]; if (!file) return;
    const r = new FileReader(); 
    r.onload = (ev) => {
        const img = new Image(); 
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const MAX_W = 800, scale = Math.min(MAX_W / img.width, 1);
            canvas.width = img.width * scale; canvas.height = img.height * scale;
            canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
            const base64 = canvas.toDataURL('image/jpeg', 0.6);
            
            if (!navigator.geolocation) {
                alert('GPS tidak didukung di browser ini.'); return;
            }
            
            navigator.geolocation.getCurrentPosition(async (pos) => {
                const lat = pos.coords.latitude;
                const lng = pos.coords.longitude;
                let locationName = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
                
                setLoading(true);
                try {
                    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
                    const data = await res.json();
                    if (data.display_name) {
                       // Ambil ringkasan alamat (hilangkan detail kelurahan jika terlalu panjang, atau ambil semua)
                       const parts = data.display_name.split(',');
                       locationName = parts.slice(0, 3).join(',').trim(); 
                    }
                } catch(error) {
                    console.log('Geocoding failed');
                }
                setLoading(false);
                
                const summary = `📍 Inspeksi Lapangan\nLokasi: ${locationName}`;
                
                const p = { type: 'inspection', text: summary, image: base64, lat: lat, lng: lng, self: true, username, timestamp: new Date().toISOString(), room: activeRoom };
                if (socket) socket.emit('chat-message', p); 
                setMessages(prev => [...prev, p]); 
                saveMessage(p);
            }, () => {
                alert('Gagal mendapatkan GPS. Pastikan Izin Lokasi diaktifkan.');
            });
        }; 
        img.src = ev.target.result;
    }; 
    r.readAsDataURL(file);
    e.target.value = null; // reset
  };

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
          is_read: m.is_read
        }));
        setMessages(history);
        setLoading(false);

        if (history.some(m => !m.self && !m.is_read)) {
          fetch('/api/messages/read', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ room: activeRoom, reader_phone: userPhone })
          }).catch(() => {});
          
          if (socket) {
             socket.emit('message-read', { room: activeRoom, readerPhone: userPhone });
          }
        }
      })
      .catch(() => { setMessages([]); setLoading(false); });

    if (socket) {
      socket.emit('join-channel', { username, channel: activeRoom });
      
      const handleChatMessage = (data) => {
        setMessages(prev => [...prev, { ...data, self: false }]);
        fetch('/api/messages/read', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ room: activeRoom, reader_phone: userPhone }) }).catch(()=>{});
        socket.emit('message-read', { room: activeRoom, readerPhone: userPhone });
      };
      
      const handleMessagesMarkedRead = (data) => {
        if (data.room === activeRoom) {
           setMessages(prev => prev.map(m => (!m.self ? m : { ...m, is_read: true })));
        }
      };

      socket.on('chat-message', handleChatMessage);
      socket.on('messages-marked-read', handleMessagesMarkedRead);

      return () => { 
        socket.off('chat-message', handleChatMessage);
        socket.off('messages-marked-read', handleMessagesMarkedRead);
        socket.emit('join-channel', { username, channel: 'Lobby' }); 
      };
    }
  }, [activeRoom, username, socket]);

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

  const handleSendText = (e, msgParams = {}) => {
    if (e) e.preventDefault();
    if (!text.trim() && !msgParams.text) return;
    const packet = { type: 'text', text: msgParams.text || text, self: true, username, timestamp: new Date().toISOString(), room: activeRoom, is_read: false };
    if (socket) socket.emit('chat-message', packet);
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
      return conv.sender_phone === userPhone ? 'Anda' : (conv.sender_name || 'Tidak Diketahui');
    }
    return conv.room.replace('CHAT-', '');
  };

  // ─── CONVERSATION LIST VIEW ───
  if (!activeRoom) {
    return (
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)' }}>
        <div style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)', padding: '1rem', flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Pesan</h1>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)', letterSpacing: '0.04em', fontFamily: "'JetBrains Mono', monospace", marginTop: '2px' }}>HUBUNGKAN INSAN HKA</div>
          </div>
          <button onClick={() => setShowJoinModal(true)} style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)', color: 'var(--text-secondary)', borderRadius: '50%', width: 38, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s var(--ease-out)' }}>
            <Plus size={18} />
          </button>
        </div>

        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
          {conversations.length === 0 && (
            <div style={{ padding: '4rem 2rem', textAlign: 'center', color: 'var(--text-tertiary)' }}>
              <MessageSquare size={42} style={{ opacity: 0.3, marginBottom: '1rem' }} />
              <p style={{ fontSize: '0.85rem' }}>Belum ada percakapan.<br/>Mulai chat dari menu Kontak atau tekan +</p>
            </div>
          )}

          {conversations.map((conv, idx) => {
            const name = getChatName(conv);
            const isDM = conv.room.startsWith('DM-');
            const initials = name?.[0]?.toUpperCase() || '?';
            const color = getAvatarColor(name);

            return (
              <div key={conv.room} onClick={() => setActiveRoom(conv.room)} style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', padding: '0.8rem 1rem', background: 'var(--bg-card)', borderBottom: '1px solid var(--border)', cursor: 'pointer', transition: 'background 0.15s var(--ease-out)' }}>
                <div style={{ width: 46, height: 46, borderRadius: 'var(--radius-full)', background: isDM ? color : 'var(--bg-tertiary)', color: isDM ? 'white' : 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', fontWeight: 700, flexShrink: 0, border: isDM ? 'none' : '1px solid var(--border)' }}>
                  {isDM ? initials : <Users size={20} />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', letterSpacing: '-0.01em' }}>{isDM ? name : `#${name}`}</div>
                    <div style={{ fontSize: '0.65rem', color: Number(conv.unread_count) > 0 ? 'var(--accent)' : 'var(--text-tertiary)', fontWeight: Number(conv.unread_count) > 0 ? 800 : 500, fontFamily: "'JetBrains Mono', monospace" }}>{new Date(conv.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, paddingRight: '10px' }}>
                      {conv.sender_phone === userPhone ? 'Anda: ' : `${conv.sender_name}: `}{conv.msg_type === 'sticker' ? '[Balasan Cepat]' : (conv.msg_type === 'image' ? '[Foto]' : (conv.msg_type === 'location' ? '[Lokasi]' : conv.content))}
                    </div>
                    {Number(conv.unread_count) > 0 && (
                      <div style={{ background: 'var(--accent)', color: 'white', borderRadius: 'var(--radius-full)', padding: '2px 8px', fontSize: '0.65rem', fontWeight: 800, fontFamily: "'JetBrains Mono', monospace" }}>
                        {conv.unread_count}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Join Group Modal */}
        {showJoinModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
            <div style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-xl)', padding: '1.5rem', width: '100%', maxWidth: '320px', boxShadow: 'var(--shadow-elevated)', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ margin: 0, fontWeight: 800, fontSize: '1rem', color: 'var(--text-primary)' }}>Gabung Grup</h3>
                <button onClick={() => setShowJoinModal(false)} style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-full)', color: 'var(--text-secondary)', display: 'flex', padding: '4px', cursor: 'pointer' }}><X size={16} /></button>
              </div>
              <form onSubmit={handleJoinGroup}>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '1rem', lineHeight: 1.4 }}>Masukkan kode grup atau nama divisi untuk bergabung ke percakapan.</p>
                <input autoFocus placeholder="KODE GRUP..." value={joinCode} onChange={e => setJoinCode(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', marginBottom: '1rem', outline: 'none', fontFamily: "'JetBrains Mono', monospace", textTransform: 'uppercase' }} />
                <button type="submit" style={{ width: '100%', background: 'var(--accent)', color: 'white', border: 'none', borderRadius: 'var(--radius-md)', padding: '12px', fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s var(--ease-spring)', fontFamily: 'inherit' }} onMouseDown={e => e.currentTarget.style.transform='scale(0.98)'} onMouseUp={e => e.currentTarget.style.transform='scale(1)'}>GABUNG GROUP</button>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ─── CHAT CONVERSATION VIEW ───
  const isDM = activeRoom?.startsWith('DM-');
  const roomName = isDM ? (initialRoomName || 'Chat Personal') : (activeRoom || '').replace('CHAT-','');

  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)' }}>
      {/* Header */}
      <div style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', padding: '0.7rem 0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0, zIndex: 10, borderBottom: '1px solid var(--border)' }}>
        <button onClick={() => { setActiveRoom(null); if(onClearDM) onClearDM(); }} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', cursor: 'pointer', padding: '3px' }}><ChevronLeft size={24} /></button>
        <div style={{ width: 38, height: 38, borderRadius: 'var(--radius-full)', background: isDM ? getAvatarColor(roomName) : 'var(--bg-tertiary)', border: isDM ? 'none' : '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: isDM ? 'white' : 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 800, flexShrink: 0 }}>
          {isDM ? (roomName?.[0] || 'C').toUpperCase() : <Users size={18} />}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--text-primary)' }}>{isDM ? roomName : `#${roomName}`}</div>
          <div style={{ fontSize: '0.6rem', color: 'var(--text-tertiary)', fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.04em', marginTop: '2px' }}>{isDM ? 'AKTIF SEKARANG' : 'GRUP TERBUKA'}</div>
        </div>
        {isDM && (
          <div style={{ display: 'flex', gap: '0.5rem', marginRight: '0.8rem', alignItems: 'center' }}>
             <button onClick={() => { if(onPTT) onPTT(activeRoom); }} style={{ background: 'var(--accent-emerald)', padding: '6px 12px', borderRadius: 'var(--radius-full)', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 700, fontSize: '0.65rem', boxShadow: '0 2px 5px rgba(5,150,105,0.2)', transition: 'all 0.15s var(--ease-spring)', fontFamily: 'inherit' }} onMouseDown={e => e.currentTarget.style.transform='scale(0.95)'} onMouseUp={e => e.currentTarget.style.transform='scale(1)'}>
                <Mic size={14} /> PTT
             </button>
          </div>
        )}
      </div>

      {/* Messages */}
      <div style={{ flex: 1, minHeight: 0, padding: '1rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {loading && <div style={{ alignSelf: 'center', padding: '0.8rem 1.2rem', color: 'var(--text-secondary)', fontSize: '0.7rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-full)', border: '1px solid var(--border)', fontWeight: 600 }}>Memuat histori...</div>}
        
        {messages.map((msg, idx) => {
          const isSelf = msg.self;
          const initials = ((msg.username && typeof msg.username === 'string' && msg.username.length > 0) ? msg.username : '?')[0].toUpperCase();
          const avatarBg = getAvatarColor(msg.username);
          return (
            <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: isSelf ? 'flex-end' : 'flex-start', maxWidth: '85%', alignSelf: isSelf ? 'flex-end' : 'flex-start', marginBottom: '4px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px', flexDirection: isSelf ? 'row-reverse' : 'row' }}>
                {!isSelf && !isDM && <div style={{ width: 24, height: 24, borderRadius: 'var(--radius-full)', background: avatarBg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '0.6rem', fontWeight: 700, flexShrink: 0, marginBottom: '2px' }}>{initials}</div>}
                
                <div style={{ background: isSelf ? 'var(--accent)' : 'var(--bg-secondary)', padding: '0.6rem 0.8rem', borderRadius: isSelf ? '14px 4px 14px 14px' : '4px 14px 14px 14px', border: isSelf ? '1px solid transparent' : '1px solid var(--border)', boxShadow: 'var(--shadow-xs)', minWidth: '70px', position: 'relative' }}>
                  {!isSelf && !isDM && <div style={{ fontSize: '0.65rem', fontWeight: 700, color: avatarBg, marginBottom: '4px' }}>{msg.username}</div>}
                  
                  {msg.type === 'sticker' && (
                     <div style={{ fontSize: '0.8rem', color: isSelf ? 'white' : 'var(--text-primary)', fontStyle: 'italic', fontWeight: 600 }}>{msg.text}</div>
                  )}

                  {msg.type === 'image' && msg.image && (
                     <img src={msg.image} alt="Media" style={{ width: '100%', borderRadius: '8px', marginBottom: '6px', border: isSelf ? '1px solid rgba(255,255,255,0.2)' : '1px solid var(--border)' }} />
                  )}

                  {msg.type === 'location' && (
                     <a href={`https://www.google.com/maps?q=${msg.lat},${msg.lng}`} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '0.6rem', background: isSelf ? 'rgba(255,255,255,0.15)' : 'var(--bg-tertiary)', borderRadius: '8px', color: isSelf ? 'white' : 'var(--text-primary)', fontWeight: 600, fontSize: '0.75rem', textDecoration: 'none', marginBottom: '6px', border: isSelf ? 'none' : '1px solid var(--border)' }}>
                        <MapPin size={16} /> Lokasi Dikirim
                     </a>
                  )}

                  {msg.type === 'inspection' && (
                     <div style={{ background: isSelf ? 'rgba(0,0,0,0.15)' : 'var(--bg-tertiary)', padding: '0.5rem', borderRadius: '8px', marginBottom: '8px', border: isSelf ? '1px solid rgba(255,255,255,0.2)' : '1px solid var(--border)' }}>
                        <img src={msg.image} alt="Inspeksi" style={{ width: '100%', borderRadius: '4px', marginBottom: '6px' }} />
                        <a href={`https://www.google.com/maps?q=${msg.lat},${msg.lng}`} target="_blank" rel="noreferrer" style={{ display: 'flex', gap: '6px', alignItems: 'flex-start', fontSize: '0.75rem', color: isSelf ? 'white' : 'var(--text-primary)', textDecoration: 'none', fontWeight: 600 }}>
                           <Shield size={16} color={isSelf ? 'white' : 'var(--accent-emerald)'} style={{ flexShrink: 0, marginTop: '2px' }} />
                           <div>
                             <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.4, wordBreak: 'break-word' }}>{msg.text}</div>
                             <div style={{ fontSize: '0.6rem', opacity: 0.8, fontFamily: "'JetBrains Mono', monospace", marginTop: '4px' }}>LAT: {msg.lat?.toFixed(6)} | LNG: {msg.lng?.toFixed(6)}</div>
                           </div>
                        </a>
                     </div>
                  )}

                  {(msg.type !== 'sticker' && msg.type !== 'inspection') && <div style={{ fontSize: '0.85rem', color: isSelf ? 'white' : 'var(--text-primary)', lineHeight: 1.5, wordBreak: 'break-word', paddingBottom: '12px' }}>{msg.text}</div>}
                  
                  <div style={{ position: 'absolute', bottom: '6px', right: '8px', fontSize: '0.55rem', color: isSelf ? 'rgba(255,255,255,0.7)' : 'var(--text-tertiary)', display: 'flex', gap: '2px', alignItems: 'center', fontFamily: "'JetBrains Mono', monospace" }}>
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    {isSelf && (msg.is_read ? <CheckCheck size={12} color="rgba(255,255,255,0.9)" /> : <Check size={12} color="rgba(255,255,255,0.6)" />)}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={chatEndRef} />
      </div>

      {/* Quick Replies Drawer */}
      {showQuickReplies && (
        <div style={{ background: 'var(--bg-tertiary)', borderTop: '1px solid var(--border)', display: 'flex', flexWrap: 'wrap', gap: '6px', padding: '0.8rem', overflowY: 'auto', maxHeight: '160px' }}>
          {QUICK_REPLIES.map((reply, i) => (
             <button key={i} onClick={() => {
                const packet = { type: 'sticker', text: reply, self: true, username, timestamp: new Date().toISOString(), room: activeRoom, is_read: false };
                if (socket) socket.emit('chat-message', packet);
                setMessages(prev => [...prev, packet]);
                saveMessage(packet);
                setShowQuickReplies(false);
             }} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-full)', padding: '6px 12px', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', cursor: 'pointer', transition: 'all 0.15s' }}>
               {reply}
             </button>
          ))}
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSendText} style={{ display: 'flex', padding: '0.6rem', background: 'var(--bg-secondary)', alignItems: 'center', gap: '0.5rem', flexShrink: 0, borderTop: '1px solid var(--border)' }}>
        <button type="button" onClick={() => setShowQuickReplies(!showQuickReplies)} style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)', color: showQuickReplies ? 'var(--accent)' : 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', width: 36, height: 36, borderRadius: 'var(--radius-full)', transition: 'all 0.2s', padding: 0 }}>
          <Zap size={18} />
        </button>
        <button type="button" onClick={() => fileInputRef.current?.click()} style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', width: 36, height: 36, borderRadius: 'var(--radius-full)', transition: 'all 0.2s', padding: 0 }}>
          <Camera size={18} />
          <input type="file" accept="image/*" capture="environment" ref={fileInputRef} style={{ display: 'none' }} onChange={(e) => {
            const file = e.target.files[0]; if (!file) return;
            const r = new FileReader(); r.onload = (ev) => {
                const img = new Image(); img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const MAX_W = 800, scale = Math.min(MAX_W / img.width, 1);
                    canvas.width = img.width * scale; canvas.height = img.height * scale;
                    canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
                    const base64 = canvas.toDataURL('image/jpeg', 0.6);
                    const p = { type: 'image', text: 'Foto Dikirim', image: base64, self: true, username, timestamp: new Date().toISOString(), room: activeRoom };
                    if (socket) socket.emit('chat-message', p); setMessages(prev => [...prev, p]); saveMessage(p);
                }; img.src = ev.target.result;
            }; r.readAsDataURL(file);
            e.target.value = null;
          }} />
        </button>
        <button type="button" onClick={() => fileInspectionRef.current?.click()} style={{ background: 'rgba(5, 150, 105, 0.1)', border: '1px solid rgba(5, 150, 105, 0.4)', color: 'var(--accent-emerald)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', width: 36, height: 36, borderRadius: 'var(--radius-full)', transition: 'all 0.2s', padding: 0 }} title="Inspeksi Lapangan (Foto + GPS Otomatis)">
          <Shield size={18} />
          <input type="file" accept="image/*" capture="environment" ref={fileInspectionRef} style={{ display: 'none' }} onChange={handleInspectionPhoto} />
        </button>
        <button type="button" onClick={() => {
            if (!navigator.geolocation) return;
            navigator.geolocation.getCurrentPosition(pos => {
              const p = { type: 'location', text: 'Lokasi Saat Ini', lat: pos.coords.latitude, lng: pos.coords.longitude, self: true, username, timestamp: new Date().toISOString(), room: activeRoom };
              if (socket) socket.emit('chat-message', p); setMessages(prev => [...prev, p]); saveMessage(p);
            });
        }} style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', width: 36, height: 36, borderRadius: 'var(--radius-full)', transition: 'all 0.2s', padding: 0 }}>
          <MapPin size={18} />
        </button>
        <input placeholder="Ketik pesan" value={text} onChange={(e) => setText(e.target.value)} autoComplete="off" style={{ flex: 1, background: 'var(--bg-tertiary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-full)', padding: '0.6rem 1rem', fontSize: '0.85rem', color: 'var(--text-primary)', outline: 'none' }} />
        <button type="submit" disabled={!text.trim()} style={{ width: 40, height: 40, borderRadius: 'var(--radius-full)', background: text.trim() ? 'var(--accent)' : 'var(--bg-tertiary)', color: text.trim() ? 'white' : 'var(--text-tertiary)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, transition: 'all 0.15s var(--ease-spring)' }} onMouseDown={e => e.currentTarget.style.transform='scale(0.92)'} onMouseUp={e => e.currentTarget.style.transform='scale(1)'}>
          <Send size={18} />
        </button>
      </form>
    </div>
  );
}
