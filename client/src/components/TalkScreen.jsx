import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, Mic, Send } from 'lucide-react';

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
          <ChevronLeft size={24} /> Back
        </button>
        <h1>#{channel}</h1>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
           {participants.length} Online
        </div>
      </div>

      <div className="chat-history">
        <div style={{ textAlign: 'center', margin: '2rem 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          Welcome to #{channel}
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
          placeholder="Send text message..." 
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <button type="submit" className="chat-send-btn">
          <Send size={18} />
        </button>
      </form>

      <div className="ptt-area">
        <div className="ptt-wrapper">
          {activeSpeaker && !isRecording && (
            <div className="receiving-indicator">
              Receiving: {activeSpeaker}
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
            <Mic size={56} color="var(--bg-primary)" />
          </button>
        </div>
      </div>
    </div>
  );
}
