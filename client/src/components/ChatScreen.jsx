import React, { useState, useRef, useEffect } from 'react';
import { Camera, MapPin, Send, ChevronLeft, ArrowRight, Shield, Plus, MessageSquare, Users, Search, Phone, Video, X, Zap, Mic, Check, CheckCheck, Image as ImageIcon, Pencil, Trash2, MoreVertical } from 'lucide-react';

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
  
  const [chatFilter, setChatFilter] = useState('Semua');
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [contextMenu, setContextMenu] = useState(null); // { idx, x, y }
  const [editingMsg, setEditingMsg] = useState(null); // { idx, text }
  const [isVoiceRecording, setIsVoiceRecording] = useState(false);
  const [voiceSeconds, setVoiceSeconds] = useState(0);
  const [showGpsPopup, setShowGpsPopup] = useState(false);
  const chatEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const fileInspectionRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const voiceChunksRef = useRef([]);
  const voiceTimerRef = useRef(null);

  const handleInspectionPhoto = (e) => {
    const file = e.target.files[0]; if (!file) return;
    const r = new FileReader(); 
    r.onload = (ev) => {
        const img = new Image(); 
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const MAX_W = 1200, scale = Math.min(MAX_W / img.width, 1);
            canvas.width = img.width * scale; canvas.height = img.height * scale;
            const ctx = canvas.getContext('2d');
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            const base64 = canvas.toDataURL('image/jpeg', 0.95);
            
            if (!navigator.geolocation) {
                setShowGpsPopup(true);
                return;
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
                setShowGpsPopup(false);
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
          // For voice: content holds the base64 audio; for others: content is the text
          text: m.msg_type === 'voice' ? m.content : m.content,
          voice: m.msg_type === 'voice' ? m.content : undefined,
          image: m.image || '',
          lat: m.lat,
          lng: m.lng,
          username: m.sender_name,
          timestamp: m.created_at,
          self: m.sender_phone === userPhone,
          is_read: m.is_read,
          id: m.id,
          edited: m.edited
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
    // Determine image field: both 'image' and 'inspection' types carry image data
    const imageData = (msg.type === 'image' || msg.type === 'inspection') ? (msg.image || '') : '';
    // Voice data stored in content field since it's base64 audio
    const contentData = msg.type === 'voice' ? (msg.voice || msg.text || '') : (msg.text || '');

    fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        room: activeRoom,
        sender_phone: userPhone || '',
        sender_name: username,
        msg_type: msg.type,
        content: contentData,
        image: imageData,
        lat: msg.lat || 0,
        lng: msg.lng || 0,
      })
    }).catch((err) => console.warn('[saveMessage] failed:', err.message));
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

  const handleEditMessage = async (idx) => {
    const msg = messages[idx];
    if (!msg || !msg.id) return;
    setEditingMsg({ idx, text: msg.text });
    setText(msg.text);
    setContextMenu(null);
  };

  const handleSaveEdit = async () => {
    if (!editingMsg || !text.trim()) return;
    const msg = messages[editingMsg.idx];
    try {
      await fetch(`/api/messages/${msg.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: text })
      });
      setMessages(prev => prev.map((m, i) => i === editingMsg.idx ? { ...m, text, edited: true } : m));
    } catch {}
    setEditingMsg(null);
    setText('');
  };

  const handleDeleteMessage = async (idx) => {
    const msg = messages[idx];
    if (!msg || !msg.id) return;
    if (!confirm('Hapus pesan ini?')) return;
    try {
      await fetch(`/api/messages/${msg.id}`, { method: 'DELETE' });
      setMessages(prev => prev.filter((_, i) => i !== idx));
    } catch {}
    setContextMenu(null);
  };

  const startVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Pick the best supported MIME type
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : 'audio/ogg';

      const recorder = new MediaRecorder(stream, { mimeType });
      voiceChunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) voiceChunksRef.current.push(e.data); };
      recorder.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(voiceChunksRef.current, { type: mimeType });
        const reader = new FileReader();
        reader.onload = () => {
          const base64 = reader.result;
          const secs = voiceTimerRef._seconds || 0;
          const durLabel = `${String(Math.floor(secs/60)).padStart(2,'0')}:${String(secs%60).padStart(2,'0')}`;
          const packet = { 
            type: 'voice', 
            text: `🎤 Pesan Suara (${durLabel})`, 
            voice: base64, 
            self: true, 
            username, 
            timestamp: new Date().toISOString(), 
            room: activeRoom, 
            is_read: false 
          };
          try {
            if (socket) socket.emit('chat-message', packet);
          } catch(err) { console.warn('[voice emit]', err.message); }
          setMessages(prev => [...prev, packet]);
          saveMessage({ ...packet, type: 'voice' });
        };
        reader.readAsDataURL(blob);
      };
      mediaRecorderRef.current = recorder;
      recorder.start(100); // collect data every 100ms for reliability
      setIsVoiceRecording(true);
      setVoiceSeconds(0);
      voiceTimerRef._seconds = 0;
      voiceTimerRef.current = setInterval(() => {
        voiceTimerRef._seconds = (voiceTimerRef._seconds || 0) + 1;
        setVoiceSeconds(s => s + 1);
      }, 1000);
    } catch(err) {
      console.warn('[startVoiceRecording]', err.message);
      alert('Tidak dapat mengakses mikrofon: ' + err.message);
    }
  };

  const stopVoiceRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    clearInterval(voiceTimerRef.current);
    setIsVoiceRecording(false);
  };

  const cancelVoiceRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.ondataavailable = null;
      mediaRecorderRef.current.onstop = null;
      mediaRecorderRef.current.stop();
    }
    clearInterval(voiceTimerRef.current);
    setIsVoiceRecording(false);
    voiceChunksRef.current = [];
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
      return conv.partner_name || (conv.sender_phone === userPhone ? 'Anda' : (conv.sender_name || 'Tidak Diketahui'));
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

        {/* WhatsApp Style Filters */}
        <div style={{ display: 'flex', gap: '8px', padding: '0.6rem 1rem', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)', flexShrink: 0, overflowX: 'auto' }}>
          {['Semua', 'Personal', 'Grup'].map(filter => (
            <button 
              key={filter} 
              onClick={() => setChatFilter(filter)}
              style={{ 
                padding: '6px 14px', 
                borderRadius: 'var(--radius-full)', 
                border: 'none', 
                background: chatFilter === filter ? 'rgba(37, 211, 102, 0.15)' : 'var(--bg-tertiary)', 
                color: chatFilter === filter ? 'var(--accent-emerald)' : 'var(--text-secondary)',
                fontWeight: chatFilter === filter ? 700 : 500,
                fontSize: '0.75rem',
                cursor: 'pointer',
                transition: 'all 0.2s var(--ease-out)'
              }}>
               {filter}
            </button>
          ))}
        </div>

        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
          {conversations.length === 0 && (
            <div style={{ padding: '4rem 2rem', textAlign: 'center', color: 'var(--text-tertiary)' }}>
              <MessageSquare size={42} style={{ opacity: 0.3, marginBottom: '1rem' }} />
              <p style={{ fontSize: '0.85rem' }}>Belum ada percakapan.<br/>Mulai chat dari menu Kontak atau tekan +</p>
            </div>
          )}

          {conversations.filter(conv => {
            const isDM = conv.room.startsWith('DM-');
            if (chatFilter === 'Personal') return isDM;
            if (chatFilter === 'Grup') return !isDM;
            return true;
          }).map((conv, idx) => {
            const name = getChatName(conv);
            const isDM = conv.room.startsWith('DM-');
            const initials = name?.[0]?.toUpperCase() || '?';
            const color = getAvatarColor(name);

            return (
              <div key={conv.room} onClick={() => setActiveRoom(conv.room)} style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', padding: '0.8rem 1rem', background: 'var(--bg-card)', borderBottom: '1px solid var(--border)', cursor: 'pointer', transition: 'background 0.15s var(--ease-out)' }}>
                <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-full)', background: isDM ? color : 'var(--bg-tertiary)', color: isDM ? 'white' : 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', fontWeight: 700, flexShrink: 0, border: isDM ? 'none' : '1px solid var(--border)' }}>
                  {isDM ? initials : <Users size={18} />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.88rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', letterSpacing: '-0.01em' }}>{isDM ? name : `#${name}`}</div>
                    <div style={{ fontSize: '0.65rem', color: Number(conv.unread_count) > 0 ? 'var(--accent-emerald)' : 'var(--text-tertiary)', fontWeight: Number(conv.unread_count) > 0 ? 800 : 500, fontFamily: "'JetBrains Mono', monospace" }}>{new Date(conv.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, paddingRight: '10px' }}>
                      {conv.sender_phone === userPhone ? 'Anda: ' : `${conv.sender_name}: `}{conv.msg_type === 'sticker' ? '[Balasan Cepat]' : (conv.msg_type === 'image' ? '[Foto]' : (conv.msg_type === 'location' ? '[Lokasi]' : conv.content))}
                    </div>
                    {Number(conv.unread_count) > 0 && (
                      <div style={{ background: 'var(--accent-emerald)', color: 'white', borderRadius: 'var(--radius-full)', padding: '2px 8px', fontSize: '0.65rem', fontWeight: 800, fontFamily: "'JetBrains Mono', monospace" }}>
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
  const currentConv = conversations.find(c => c.room === activeRoom);
  const derivedPartnerName = currentConv?.partner_name || initialRoomName;
  const roomName = isDM ? (derivedPartnerName || 'Chat Personal') : (activeRoom || '').replace('CHAT-','');

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
          
          {/* Last seen / Status logic */}
          {isDM ? (
            <div style={{ fontSize: '0.6rem', color: 'var(--text-tertiary)', fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.04em', marginTop: '2px' }}>
              {(() => {
                 const currentConv = conversations.find(c => c.room === activeRoom);
                 return currentConv?.partner_last_seen 
                   ? `Terakhir dilihat ${new Date(currentConv.partner_last_seen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                   : 'Terdaftar di HKA';
              })()}
            </div>
          ) : (
            <div style={{ fontSize: '0.6rem', color: 'var(--text-tertiary)', fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.04em', marginTop: '2px' }}>GRUP TERBUKA</div>
          )}
        </div>
        {isDM && (
          <div style={{ display: 'flex', gap: '0.5rem', marginRight: '0.8rem', alignItems: 'center' }}>
             <button onClick={() => { if(onPTT) onPTT(activeRoom); }} style={{ background: 'var(--accent-emerald)', padding: '6px 12px', borderRadius: 'var(--radius-full)', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 700, fontSize: '0.65rem', boxShadow: '0 2px 5px rgba(5,150,105,0.2)', transition: 'all 0.15s var(--ease-spring)', fontFamily: 'inherit' }} onMouseDown={e => e.currentTarget.style.transform='scale(0.95)'} onMouseUp={e => e.currentTarget.style.transform='scale(1)'}>
                <Mic size={14} /> PTT
             </button>
          </div>
        )}
      </div>

      {/* GPS Popup Overlay */}
      {showGpsPopup && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'fadeIn 0.2s var(--ease-out)' }}>
          <div style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-xl)', padding: '2rem 1.5rem', textAlign: 'center', maxWidth: '280px', boxShadow: 'var(--shadow-elevated)', border: '1px solid var(--border)', animation: 'slideIn 0.3s var(--ease-out)' }}>
            <div style={{ width: 56, height: 56, borderRadius: 'var(--radius-full)', background: 'rgba(5,150,105,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', animation: 'breathe 2s ease-in-out infinite' }}>
              <MapPin size={28} color="var(--accent-emerald)" />
            </div>
            <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Mengaktifkan GPS</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '1.2rem' }}>
              Sedang mendeteksi lokasi Anda untuk melampirkan koordinat GPS pada foto inspeksi lapangan...
            </div>
            <div style={{ display: 'flex', gap: '4px', justifyContent: 'center', marginBottom: '0.8rem' }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent-emerald)', animation: 'breathe 1s ease-in-out infinite' }} />
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent-emerald)', animation: 'breathe 1s ease-in-out 0.2s infinite' }} />
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent-emerald)', animation: 'breathe 1s ease-in-out 0.4s infinite' }} />
            </div>
            <button onClick={() => setShowGpsPopup(false)} style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '8px 24px', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', cursor: 'pointer', fontFamily: 'inherit' }}>Batal</button>
          </div>
        </div>
      )}

      {/* Messages */}
      <div style={{ flex: 1, minHeight: 0, padding: '1rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {loading && <div style={{ alignSelf: 'center', padding: '0.8rem 1.2rem', color: 'var(--text-secondary)', fontSize: '0.7rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-full)', border: '1px solid var(--border)', fontWeight: 600 }}>Memuat histori...</div>}
        
        {messages.map((msg, idx) => {
          const isSelf = msg.self;
          const initials = ((msg.username && typeof msg.username === 'string' && msg.username.length > 0) ? msg.username : '?')[0].toUpperCase();
          const avatarBg = getAvatarColor(msg.username);
          return (
            <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: isSelf ? 'flex-end' : 'flex-start', maxWidth: '85%', alignSelf: isSelf ? 'flex-end' : 'flex-start', marginBottom: '4px', position: 'relative' }}
              onContextMenu={(e) => { if (isSelf) { e.preventDefault(); setContextMenu({ idx, x: e.clientX, y: e.clientY }); } }}
              onClick={() => { if (contextMenu) setContextMenu(null); }}
            >
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

                  {msg.type === 'voice' && (
                     <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 0' }}>
                        <Mic size={16} color={isSelf ? 'rgba(255,255,255,0.9)' : 'var(--accent-emerald)'} />
                        {msg.voice ? (
                           <audio controls src={msg.voice} style={{ height: '32px', maxWidth: '180px' }} />
                        ) : (
                           <span style={{ fontSize: '0.8rem', color: isSelf ? 'white' : 'var(--text-primary)' }}>{msg.text}</span>
                        )}
                     </div>
                  )}

                  {(msg.type !== 'sticker' && msg.type !== 'inspection' && msg.type !== 'voice') && <div style={{ fontSize: '0.85rem', color: isSelf ? 'white' : 'var(--text-primary)', lineHeight: 1.5, wordBreak: 'break-word', paddingBottom: '12px' }}>{msg.text}</div>}
                  
                  <div style={{ position: 'absolute', bottom: '6px', right: '8px', fontSize: '0.55rem', color: isSelf ? 'rgba(255,255,255,0.7)' : 'var(--text-tertiary)', display: 'flex', gap: '2px', alignItems: 'center', fontFamily: "'JetBrains Mono', monospace" }}>
                    {msg.edited && <span style={{ marginRight: '2px', fontStyle: 'italic' }}>diedit</span>}
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    {isSelf && (msg.is_read ? <CheckCheck size={12} color="rgba(255,255,255,0.9)" /> : <Check size={12} color="rgba(255,255,255,0.6)" />)}
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {/* Context Menu (Edit/Delete) */}
        {contextMenu && (
          <>
            <div style={{ position: 'fixed', inset: 0, zIndex: 999 }} onClick={() => setContextMenu(null)} />
            <div style={{ position: 'fixed', left: Math.min(contextMenu.x, window.innerWidth - 160), top: Math.min(contextMenu.y, window.innerHeight - 100), zIndex: 1000, background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-elevated)', overflow: 'hidden', minWidth: '140px', animation: 'slideIn 0.15s var(--ease-out)' }}>
              <button onClick={() => handleEditMessage(contextMenu.idx)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', background: 'none', border: 'none', color: 'var(--text-primary)', fontSize: '0.8rem', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>
                <Pencil size={14} color="var(--accent-blue)" /> Edit
              </button>
              <div style={{ height: '1px', background: 'var(--border)' }} />
              <button onClick={() => handleDeleteMessage(contextMenu.idx)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', background: 'none', border: 'none', color: 'var(--accent)', fontSize: '0.8rem', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>
                <Trash2 size={14} color="var(--accent)" /> Hapus
              </button>
            </div>
          </>
        )}

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

      {/* Editing Banner */}
      {editingMsg && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: 'rgba(37, 99, 235, 0.08)', borderTop: '1px solid var(--accent-blue)', borderBottom: '1px solid var(--accent-blue)' }}>
          <Pencil size={14} color="var(--accent-blue)" />
          <div style={{ flex: 1, fontSize: '0.75rem', color: 'var(--accent-blue)', fontWeight: 600 }}>Mengedit pesan</div>
          <button onClick={() => { setEditingMsg(null); setText(''); }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px' }}><X size={16} color="var(--text-tertiary)" /></button>
        </div>
      )}

      {/* Input */}
      <form onSubmit={(e) => { e.preventDefault(); if (editingMsg) { handleSaveEdit(); } else { handleSendText(e); } }} style={{ display: 'flex', padding: '0.5rem', background: 'var(--bg-secondary)', alignItems: 'center', gap: '6px', flexShrink: 0, borderTop: '1px solid var(--border)', position: 'relative' }}>
        
        {/* Single + button */}
        <button type="button" onClick={() => setShowAttachMenu(!showAttachMenu)} style={{ background: showAttachMenu ? 'var(--accent-blue)' : 'var(--bg-tertiary)', border: '1px solid var(--border)', color: showAttachMenu ? 'white' : 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', width: 36, height: 36, borderRadius: 'var(--radius-full)', transition: 'all 0.2s', padding: 0, transform: showAttachMenu ? 'rotate(45deg)' : 'none', flexShrink: 0 }}>
          <Plus size={20} />
        </button>

        {/* Popup menu above + */}
        {showAttachMenu && (
          <>
            <div style={{ position: 'fixed', inset: 0, zIndex: 98 }} onClick={() => setShowAttachMenu(false)} />
            <div style={{ position: 'absolute', bottom: '54px', left: '8px', zIndex: 99, background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-elevated)', overflow: 'hidden', minWidth: '180px', animation: 'slideIn 0.15s var(--ease-out)' }}>
              <button onClick={() => { fileInputRef.current?.click(); setShowAttachMenu(false); }} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', background: 'none', border: 'none', color: 'var(--text-primary)', fontSize: '0.8rem', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>
                <div style={{ width: 32, height: 32, borderRadius: 'var(--radius-full)', background: 'rgba(37,99,235,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Camera size={16} color="var(--accent-blue)" /></div>
                Kirim Foto
              </button>
              <div style={{ height: '1px', background: 'var(--border)', margin: '0 12px' }} />
              <button onClick={() => { fileInspectionRef.current?.click(); setShowAttachMenu(false); }} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', background: 'none', border: 'none', color: 'var(--text-primary)', fontSize: '0.8rem', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>
                <div style={{ width: 32, height: 32, borderRadius: 'var(--radius-full)', background: 'rgba(5,150,105,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Shield size={16} color="var(--accent-emerald)" /></div>
                Inspeksi Lapangan
              </button>
              <div style={{ height: '1px', background: 'var(--border)', margin: '0 12px' }} />
              <button onClick={() => {
                if (!navigator.geolocation) return;
                navigator.geolocation.getCurrentPosition(pos => {
                  const p = { type: 'location', text: 'Lokasi Saat Ini', lat: pos.coords.latitude, lng: pos.coords.longitude, self: true, username, timestamp: new Date().toISOString(), room: activeRoom };
                  if (socket) socket.emit('chat-message', p); setMessages(prev => [...prev, p]); saveMessage(p);
                });
                setShowAttachMenu(false);
              }} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', background: 'none', border: 'none', color: 'var(--text-primary)', fontSize: '0.8rem', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>
                <div style={{ width: 32, height: 32, borderRadius: 'var(--radius-full)', background: 'rgba(217,119,6,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><MapPin size={16} color="#d97706" /></div>
                Kirim Lokasi
              </button>
              <div style={{ height: '1px', background: 'var(--border)', margin: '0 12px' }} />
              <button onClick={() => { setShowQuickReplies(!showQuickReplies); setShowAttachMenu(false); }} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', background: 'none', border: 'none', color: 'var(--text-primary)', fontSize: '0.8rem', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>
                <div style={{ width: 32, height: 32, borderRadius: 'var(--radius-full)', background: 'rgba(124,58,237,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Zap size={16} color="var(--accent-purple)" /></div>
                Balasan Cepat
              </button>
            </div>
          </>
        )}

        {/* Hidden file inputs */}
        <input type="file" accept="image/*" capture="environment" ref={fileInputRef} style={{ display: 'none' }} onChange={(e) => {
          const file = e.target.files[0]; if (!file) return;
          const r = new FileReader(); r.onload = (ev) => {
              const img = new Image(); img.onload = () => {
                  const canvas = document.createElement('canvas');
                  const MAX_W = 1200, scale = Math.min(MAX_W / img.width, 1);
                  canvas.width = img.width * scale; canvas.height = img.height * scale;
                  const ctx2 = canvas.getContext('2d');
                  ctx2.imageSmoothingEnabled = true;
                  ctx2.imageSmoothingQuality = 'high';
                  ctx2.drawImage(img, 0, 0, canvas.width, canvas.height);
                  const base64 = canvas.toDataURL('image/jpeg', 0.85);
                  const p = { type: 'image', text: 'Foto Dikirim', image: base64, self: true, username, timestamp: new Date().toISOString(), room: activeRoom };
                  if (socket) socket.emit('chat-message', p); setMessages(prev => [...prev, p]); saveMessage(p);
              }; img.src = ev.target.result;
          }; r.readAsDataURL(file);
          e.target.value = null;
        }} />
        <input type="file" accept="image/*" capture="environment" ref={fileInspectionRef} style={{ display: 'none' }} onChange={handleInspectionPhoto} />

        {/* Text input */}
        {isVoiceRecording ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(220,38,38,0.05)', borderRadius: 'var(--radius-full)', padding: '0.5rem 1rem', border: '1px solid rgba(220,38,38,0.2)' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)', animation: 'breathe 1s infinite' }} />
            <span style={{ fontSize: '0.85rem', color: 'var(--accent)', fontWeight: 600, fontFamily: "'JetBrains Mono', monospace" }}>{String(Math.floor(voiceSeconds / 60)).padStart(2,'0')}:{String(voiceSeconds % 60).padStart(2,'0')}</span>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>Merekam...</span>
            <div style={{ flex: 1 }} />
            <button type="button" onClick={cancelVoiceRecording} style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', fontSize: '0.7rem', fontWeight: 600 }}><X size={16} /></button>
          </div>
        ) : (
          <input placeholder={editingMsg ? 'Edit pesan...' : 'Ketik pesan'} value={text} onChange={(e) => setText(e.target.value)} autoComplete="off" style={{ flex: 1, background: 'var(--bg-tertiary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-full)', padding: '0.55rem 1rem', fontSize: '0.85rem', color: 'var(--text-primary)', outline: 'none' }} />
        )}

        {/* Send or Mic button */}
        {text.trim() || editingMsg ? (
          <button type="submit" style={{ width: 38, height: 38, borderRadius: 'var(--radius-full)', background: editingMsg ? 'var(--accent-blue)' : 'var(--accent-emerald)', color: 'white', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, transition: 'all 0.15s var(--ease-spring)' }}>
            {editingMsg ? <Check size={18} /> : <Send size={17} />}
          </button>
        ) : isVoiceRecording ? (
          <button type="button" onClick={stopVoiceRecording} style={{ width: 38, height: 38, borderRadius: 'var(--radius-full)', background: 'var(--accent)', color: 'white', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
            <Send size={17} />
          </button>
        ) : (
          <button type="button" onClick={startVoiceRecording} style={{ width: 38, height: 38, borderRadius: 'var(--radius-full)', background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, transition: 'all 0.15s var(--ease-spring)' }}>
            <Mic size={18} />
          </button>
        )}
      </form>
    </div>
  );
}
