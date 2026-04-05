import React, { useState, useRef, useEffect } from 'react';
import { Camera, MapPin, Send, ChevronLeft, Hash } from 'lucide-react';
import { io } from 'socket.io-client';

const CHAT_ROOMS = [
  { id: 'CHAT-GENERAL', name: 'General', desc: 'Obrolan Umum Seluruh HKA' },
  { id: 'CHAT-OPERASI', name: 'Operasi', desc: 'Koordinasi Tim Operasional' },
  { id: 'CHAT-DARURAT', name: 'Darurat', desc: 'Laporan Insiden & SOS' },
  { id: 'CHAT-SOSIAL', name: 'Sosial', desc: 'Ngobrol Santai Sesama Insan HKA' },
  { id: 'CHAT-PENGUMUMAN', name: 'Pengumuman', desc: 'Info Resmi Manajemen' },
];

export default function ChatScreen({ username }) {
  const [activeRoom, setActiveRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const chatEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const socketRef = useRef(null);

  // Connect to selected chat room
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

    return () => {
      sock.disconnect();
      socketRef.current = null;
    };
  }, [activeRoom, username]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendText = (e) => {
    e.preventDefault();
    if (!text.trim() || !socketRef.current) return;
    const packet = {
      type: 'text',
      text: text.trim(),
      self: true,
      username,
      timestamp: new Date().toISOString()
    };
    socketRef.current.emit('chat-message', packet);
    setMessages(prev => [...prev, packet]);
    setText('');
  };

  const handleLocation = () => {
    if (!navigator.geolocation) {
      alert("Browser Anda tidak mendukung GPS.");
      return;
    }
    navigator.geolocation.getCurrentPosition((pos) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      const packet = {
        type: 'location',
        text: '📍 Membagikan Lokasi Terkini',
        lat,
        lng,
        self: true,
        username,
        timestamp: new Date().toISOString()
      };
      if (socketRef.current) socketRef.current.emit('chat-message', packet);
      setMessages(prev => [...prev, packet]);
    }, () => {
      alert("Gagal membaca GPS. Pastikan izin lokasi aktif.");
    });
  };

  const handleImageCapture = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800;
        const scaleSize = MAX_WIDTH / img.width;
        canvas.width = MAX_WIDTH;
        canvas.height = img.height * scaleSize;
        
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        const base64Jpeg = canvas.toDataURL('image/jpeg', 0.6);
        const packet = {
          type: 'image',
          text: '📷 Mengirim Foto',
          image: base64Jpeg,
          self: true,
          username,
          timestamp: new Date().toISOString()
        };
        if (socketRef.current) socketRef.current.emit('chat-message', packet);
        setMessages(prev => [...prev, packet]);
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  // ─── ROOM LIST VIEW ───
  if (!activeRoom) {
    return (
      <div className="tab-screen">
        <div className="zello-header">
          <div>
            <h1>Chat</h1>
            <div className="subtitle">Obrolan Multimedia</div>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <h3 className="section-title">RUANG OBROLAN</h3>
          <div style={{ background: 'var(--bg-secondary)', borderTop: '1px solid var(--border)' }}>
            {CHAT_ROOMS.map(room => (
              <div key={room.id} className="channel-card" onClick={() => { setMessages([]); setActiveRoom(room.id); }}>
                <div className="channel-icon" style={{ background: '#25d366' }}>
                  <Hash size={20} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--text-main)' }}>{room.name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>{room.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ─── CHAT CONVERSATION VIEW ───
  const currentRoomName = CHAT_ROOMS.find(r => r.id === activeRoom)?.name || activeRoom;

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg-tertiary)', position: 'relative' }}>
      <div className="zello-header">
        <button className="zello-header-back" onClick={() => { setActiveRoom(null); setMessages([]); }}>
          <ChevronLeft size={24} />
        </button>
        <div style={{ textAlign: 'center', flex: 1 }}>
          <h1 style={{fontSize: '1.1rem'}}>#{currentRoomName}</h1>
          <div className="subtitle">Terenkripsi End-to-End</div>
        </div>
        <div style={{width: '24px'}}></div>
      </div>

      <div className="chat-history">
        <div style={{ textAlign: 'center', margin: '1rem 0', color: 'var(--text-muted)', fontSize: '0.8rem', background: 'rgba(0,0,0,0.05)', padding: '4px 12px', borderRadius: '12px', alignSelf: 'center' }}>
          Bergabung di #{currentRoomName}
        </div>
        
        {messages.filter(m => m.username !== 'System').map((msg, idx) => (
          <div key={idx} className={`message-row ${msg.self ? 'self' : 'other'}`}>
            {!msg.self && <div className="message-sender">{msg.username}</div>}
            <div className="message-bubble">
              
              {msg.type === 'image' && (
                <img src={msg.image} alt="Photo" style={{width: '100%', borderRadius: '8px', marginBottom: '8px'}} />
              )}

              {msg.type === 'location' && (
                <div style={{marginBottom: '8px'}}>
                  <a href={`https://www.google.com/maps?q=${msg.lat},${msg.lng}`} target="_blank" rel="noreferrer" style={{color: msg.self ? '#fff' : 'var(--accent)', fontWeight: 'bold', textDecoration: 'underline'}}>
                    🗺️ Buka Peta
                  </a>
                </div>
              )}

              {msg.text}
              <span className="message-time">
                {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
              </span>
            </div>
          </div>
        ))}
        <div ref={chatEndRef} />
      </div>

      <form 
        className="chat-input-bar" 
        onSubmit={handleSendText} 
        style={{ paddingBottom: 'max(75px, env(safe-area-inset-bottom))', zIndex: 50, position: 'relative', marginTop: 'auto' }}
      >
        <button type="button" className="chat-action-btn" onClick={() => fileInputRef.current?.click()}>
          <Camera size={24} />
          <input 
            type="file" 
            accept="image/*" 
            capture="environment" 
            ref={fileInputRef} 
            style={{display: 'none'}} 
            onChange={handleImageCapture}
          />
        </button>
        <button type="button" className="chat-action-btn" onClick={handleLocation}>
          <MapPin size={24} />
        </button>

        <input 
          className="chat-input" 
          placeholder="Ketik Pesan..." 
          value={text}
          onChange={(e) => setText(e.target.value)}
          autoComplete="off"
        />
        <button type="submit" className="chat-send-btn" disabled={!text.trim()} style={{background: text.trim() ? '#25d366' : 'var(--text-muted)', width: '45px', height:'45px', borderRadius: '50%', border: 'none'}}>
          <Send size={20} color="white" />
        </button>
      </form>
    </div>
  );
}
