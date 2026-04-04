import React, { useState, useRef, useEffect } from 'react';
import { Camera, MapPin, Send } from 'lucide-react';

export default function ChatScreen({ messages, onSendMessage }) {
  const [text, setText] = useState('');
  const chatEndRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendText = (e) => {
    e.preventDefault();
    if (text.trim()) {
      onSendMessage({ text: text.trim(), type: 'text' });
      setText('');
    }
  };

  const handleLocation = () => {
    if (!navigator.geolocation) {
      alert("Browser Anda tidak mendukung GPS.");
      return;
    }
    navigator.geolocation.getCurrentPosition((pos) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      onSendMessage({
        type: 'location',
        text: '📍 Membagikan Lokasi Terkini',
        lat,
        lng
      });
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
        // Compress Image using Canvas
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800;
        const scaleSize = MAX_WIDTH / img.width;
        canvas.width = MAX_WIDTH;
        canvas.height = img.height * scaleSize;
        
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        const base64Jpeg = canvas.toDataURL('image/jpeg', 0.6);
        onSendMessage({
          type: 'image',
          text: '📷 Mengirim Foto',
          image: base64Jpeg
        });
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg-tertiary)', position: 'relative' }}>
      <div className="zello-header">
        <div style={{ textAlign: 'center', flex: 1 }}>
          <h1 style={{fontSize: '1.1rem'}}>PESAN MULTIMEDIA</h1>
          <div className="subtitle">Si Talki WhatsApp-Bridge</div>
        </div>
      </div>

      <div className="chat-history">
        <div style={{ textAlign: 'center', margin: '1rem 0', color: 'var(--text-muted)', fontSize: '0.8rem', background: 'rgba(0,0,0,0.05)', padding: '4px', borderRadius: '12px', alignSelf: 'center' }}>
          Terenkripsi <i>End-to-End</i>
        </div>
        
        {messages.filter(m => m.username !== 'System').map((msg, idx) => (
          <div key={idx} className={`message-row ${msg.self ? 'self' : 'other'}`}>
            {!msg.self && <div className="message-sender">{msg.username}</div>}
            <div className="message-bubble">
              
              {/* If it's an image */}
              {msg.type === 'image' && (
                <img src={msg.image} alt="Photo" style={{width: '100%', borderRadius: '8px', marginBottom: '8px'}} />
              )}
              
              {/* If it's a location */}
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

      <form className="chat-input-bar" onSubmit={handleSendText}>
        <button type="button" className="chat-action-btn" onClick={() => fileInputRef.current?.click()}>
          <Camera size={20} />
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
          <MapPin size={20} />
        </button>

        <input 
          className="chat-input" 
          placeholder="Ketik Laporan..." 
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <button type="submit" className="chat-send-btn" disabled={!text.trim()} style={{background: 'var(--accent)', width: '40px', height:'40px', borderRadius: '50%'}}>
          <Send size={18} color="white" />
        </button>
      </form>
    </div>
  );
}
