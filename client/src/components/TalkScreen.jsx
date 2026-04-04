import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, Mic, Send, Radio } from 'lucide-react';

export default function TalkScreen({ 
  channel, 
  onLeave, 
  participants, 
  activeSpeaker,
  messages,
  onSendMessage,
  onStartPTT,
  onStopPTT,
  isRecording
}) {
  const [text, setText] = useState('');
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = (e) => {
    e.preventDefault();
    if (text.trim()) {
      onSendMessage(text.trim());
      setText('');
    }
  };

  return (
    <div className="talk-screen">
      <div className="zello-header">
        <button className="zello-header-back" onClick={onLeave}>
          <ChevronLeft size={24} />
        </button>
        <div style={{ textAlign: 'center', flex: 1 }}>
          <h1 style={{fontSize: '1.1rem'}}>{channel.toUpperCase()}</h1>
          <div className="subtitle">
            <Radio size={10} style={{marginRight: '2px'}} /> {participants.length} Active Node
          </div>
        </div>
        <div style={{width: '24px'}}></div>
      </div>

      <div className="chat-history">
        <div style={{ textAlign: 'center', margin: '1rem 0', color: 'var(--text-muted)', fontSize: '0.8rem', background: 'rgba(0,0,0,0.05)', padding: '4px', borderRadius: '12px', alignSelf: 'center' }}>
          Jaringan Terenkripsi & Anti-Feedback
        </div>
        
        {messages.map((msg, idx) => (
          <div key={idx} className={`message-row ${msg.self ? 'self' : 'other'}`}>
            {!msg.self && <div className="message-sender">{msg.username}</div>}
            <div className="message-bubble">
              {msg.text}
              <span className="message-time">
                {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
              </span>
            </div>
          </div>
        ))}
        <div ref={chatEndRef} />
      </div>

      <form className="chat-input-bar" onSubmit={handleSend}>
        <input 
          className="chat-input" 
          placeholder="Ketik Laporan..." 
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <button type="submit" className="chat-send-btn" disabled={!text.trim()}>
          <Send size={18} />
        </button>
      </form>

      <div className="ptt-area">
        <div className="ptt-wrapper">
          {activeSpeaker && !isRecording && (
            <div className="receiving-indicator">
              MENERIMA SUARA: {activeSpeaker.toUpperCase()}
            </div>
          )}
          <button 
            className={`ptt-button ${isRecording ? 'active' : ''}`}
            onMouseDown={onStartPTT}
            onMouseUp={onStopPTT}
            onMouseLeave={onStopPTT}
            onTouchStart={(e) => { e.preventDefault(); onStartPTT(); }}
            onTouchEnd={(e) => { e.preventDefault(); onStopPTT(); }}
            onTouchCancel={(e) => { e.preventDefault(); onStopPTT(); }}
            onContextMenu={(e) => e.preventDefault()}
          >
            <Mic size={54} color={isRecording ? 'black' : 'white'} />
          </button>
        </div>
      </div>
    </div>
  );
}
