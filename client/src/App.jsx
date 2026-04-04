import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import './index.css';
import ChannelLobby from './components/ChannelLobby';
import TalkScreen from './components/TalkScreen';
import { initAudioContext, playZelloBeep, createReceiverChain, AUDIO_SAMPLE_RATE } from './audioEngine';

let mediaStreamSource = null;
let scriptNode = null;
let globalStream = null;
let playTime = 0;
let receiverChain = null;

export default function App() {
  const [navState, setNavState] = useState('login'); 
  const [username, setUsername] = useState('');
  const [channel, setChannel] = useState('');
  
  const [socket, setSocket] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [isRecording, setIsRecording] = useState(false);
  const [activeSpeaker, setActiveSpeaker] = useState(null);
  
  const [messages, setMessages] = useState([]);
  const isRecordingRef = useRef(false);

  useEffect(() => {
    if (!username || !channel || navState !== 'talk') return;

    initAudioContext().resume();
    
    if (!receiverChain) {
      receiverChain = createReceiverChain();
    }

    const newSocket = io();
    setSocket(newSocket);

    newSocket.on('connect', () => {
      newSocket.emit('join-channel', { username, channel });
      setMessages(prev => [...prev, { text: `Joined channel #${channel}`, self: false, username: 'System', timestamp: new Date().toISOString() }]);
    });

    newSocket.on('channel-info', ({ participants }) => setParticipants(participants));
    newSocket.on('user-joined', (user) => setParticipants(prev => [...prev.filter(p => p.id !== user.id), user]));
    newSocket.on('user-left', (user) => setParticipants(prev => prev.filter(p => p.id !== user.id)));

    newSocket.on('chat-message', (data) => {
       setMessages(prev => [...prev, { ...data, self: false }]);
    });

    newSocket.on('audio-stream', (payload) => {
      const data = payload.audioData;
      
      if (data.type === 'start') {
        setActiveSpeaker(payload.username);
        if (!isRecordingRef.current) {
          playZelloBeep('start');
          playTime = initAudioContext().currentTime + 0.1; 
        }
      } 
      else if (data.type === 'end') {
        setActiveSpeaker(null);
        if (!isRecordingRef.current) {
          playZelloBeep('end');
        }
      } 
      else if (data.type === 'chunk' && data.buffer) {
        if (isRecordingRef.current) return;

        const int16Array = new Int16Array(data.buffer);
        const float32Array = new Float32Array(int16Array.length);
        for (let i = 0; i < int16Array.length; i++) {
          float32Array[i] = int16Array[i] / 0x7FFF;
        }
        
        const ctx = initAudioContext();
        if (playTime < ctx.currentTime) {
          playTime = ctx.currentTime;
        }
        
        if (playTime > ctx.currentTime + 1.0) {
           playTime = ctx.currentTime + 0.1;
        }
        
        const audioBuffer = ctx.createBuffer(1, float32Array.length, AUDIO_SAMPLE_RATE);
        audioBuffer.getChannelData(0).set(float32Array);
        
        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;
        
        source.connect(receiverChain.input);
        
        source.start(playTime);
        playTime += audioBuffer.duration;
      }
    });

    return () => {
      newSocket.disconnect();
      setSocket(null);
      setParticipants([]);
    };
  }, [navState, channel, username]);


  const startRecording = async () => {
    if (isRecordingRef.current) return;
    
    const ctx = initAudioContext();
    if (ctx.state === 'suspended') await ctx.resume();
    
    setIsRecording(true);
    isRecordingRef.current = true;
    
    playZelloBeep('start');
    if (socket) socket.emit('audio-stream', { type: 'start' });

    try {
      globalStream = await navigator.mediaDevices.getUserMedia({ 
        audio: { 
          echoCancellation: true, 
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: AUDIO_SAMPLE_RATE,
          channelCount: 1
        } 
      });
      
      mediaStreamSource = ctx.createMediaStreamSource(globalStream);
      scriptNode = ctx.createScriptProcessor(4096, 1, 1);
      
      scriptNode.onaudioprocess = (e) => {
        if (!isRecordingRef.current) return;
        const float32Array = e.inputBuffer.getChannelData(0);
        const int16Array = new Int16Array(float32Array.length);
        for (let i = 0; i < float32Array.length; i++) {
          int16Array[i] = Math.max(-1, Math.min(1, float32Array[i])) * 0x7FFF;
        }
        if (socket) socket.emit('audio-stream', { type: 'chunk', buffer: int16Array.buffer });
      };
      
      const zeroGain = ctx.createGain();
      zeroGain.gain.value = 0;
      
      mediaStreamSource.connect(scriptNode);
      scriptNode.connect(zeroGain);
      zeroGain.connect(ctx.destination);
    } catch (err) {
      console.error('Error accessing microphone:', err);
      alert('Microphone access is required to talk.');
      stopRecording();
    }
  };

  const stopRecording = () => {
    if (!isRecordingRef.current) return;
    setIsRecording(false);
    isRecordingRef.current = false;
    
    setTimeout(() => { playZelloBeep('end'); }, 100);
    if (socket) socket.emit('audio-stream', { type: 'end' });

    if (scriptNode) {
      scriptNode.disconnect();
      scriptNode = null;
    }
    if (mediaStreamSource) {
      mediaStreamSource.disconnect();
      mediaStreamSource = null;
    }
    if (globalStream) {
      globalStream.getTracks().forEach(track => track.stop());
      globalStream = null;
    }
  };

  const handleSendMessage = (text) => {
    if (socket) {
      socket.emit('chat-message', { text });
      setMessages(prev => [...prev, { text, self: true, username, timestamp: new Date().toISOString() }]);
    }
  };

  const handleLogin = (e) => {
    e.preventDefault();
    if (username.trim()) setNavState('lobby');
  };

  const handleJoinChannel = (ch) => {
    setChannel(ch);
    setMessages([]); 
    setNavState('talk');
  };

  const handleLeaveChannel = () => {
    setNavState('lobby');
    setChannel('');
    if (socket) socket.disconnect();
    setSocket(null);
  };

  if (navState === 'login') {
    return (
      <div className="auth-container">
        <h1>HKA<span style={{color: 'white'}}>Talk</span></h1>
        <form onSubmit={handleLogin} style={{width: '100%', maxWidth: '300px'}}>
          <input className="form-input" required placeholder="Enter Callsign..." value={username} onChange={e=>setUsername(e.target.value)} />
          <button type="submit" className="btn-primary">Sign In</button>
        </form>
      </div>
    );
  }

  return (
    <div className="app-container">
      {navState === 'lobby' && (
         <ChannelLobby 
           username={username} 
           onJoinChannel={handleJoinChannel} 
           onLogout={() => { setNavState('login'); setUsername(''); }} 
         />
      )}
      {navState === 'talk' && (
         <TalkScreen 
           channel={channel} 
           participants={participants}
           activeSpeaker={activeSpeaker}
           messages={messages}
           isRecording={isRecording}
           onStartPTT={startRecording}
           onStopPTT={stopRecording}
           onSendMessage={handleSendMessage}
           onLeave={handleLeaveChannel}
         />
      )}
    </div>
  );
}
