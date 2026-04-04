import React, { useState } from 'react';
import { Users, LogOut, Radio } from 'lucide-react';

export default function ChannelLobby({ username, onJoinChannel, onLogout }) {
  const [channelInput, setChannelInput] = useState('');
  
  const suggestedChannels = ['general', 'emergency', 'family'];

  const handleSubmit = (e) => {
    e.preventDefault();
    if (channelInput.trim()) {
      onJoinChannel(channelInput.trim());
    }
  };

  return (
    <div className="lobby-screen">
      <div className="zello-header">
        <h1>{username}'s Channels</h1>
        <button className="zello-header-back" onClick={onLogout}>
          <LogOut size={18} /> Logout
        </button>
      </div>
      
      <form onSubmit={handleSubmit} style={{ padding: '1rem' }}>
        <input 
          className="form-input" 
          placeholder="Enter a channel name to join..." 
          value={channelInput}
          onChange={(e) => setChannelInput(e.target.value)}
        />
        <button type="submit" className="btn-primary">Add / Join</button>
      </form>

      <div style={{ padding: '0 1rem' }}>
        <h3 className="section-title">Suggested Channels</h3>
        {suggestedChannels.map(ch => (
          <div key={ch} className="channel-card" onClick={() => onJoinChannel(ch)}>
            <div className="channel-icon">
              <Radio size={24} />
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: '1.1rem' }}>#{ch}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Tap to connect</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
