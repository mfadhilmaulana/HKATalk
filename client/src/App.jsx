import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { Radio, MessageSquare, Users, Video, Route } from 'lucide-react';
import './index.css';
import ChannelScreen from './components/ChannelScreen';
import ConferenceScreen from './components/ConferenceScreen';
import RadioScreen from './components/RadioScreen';
import ContactScreen from './components/ContactScreen';
import TalkScreen from './components/TalkScreen';
import ChatScreen from './components/ChatScreen';
import MeetingScreen from './components/MeetingScreen';
import { initAudioContext, playZelloBeep, createReceiverChain, setSpeakerMute, playSiren, AUDIO_SAMPLE_RATE } from './audioEngine';

let mediaStreamSource = null;
let scriptNode = null;
let globalStream = null;
let globalVideoStream = null;
let videoInterval = null;
let playTime = 0;
let receiverChain = null;
let radioPlayer = typeof Audio !== 'undefined' ? new Audio() : null;

// Helper to draw video to canvas
const captureVideoFrame = (videoElement, socket, username, channel) => {
  if (!videoElement || videoElement.readyState !== videoElement.HAVE_ENOUGH_DATA) return;
  const canvas = document.createElement('canvas');
  canvas.width = 160; 
  canvas.height = 120; // super low res to avoid crashing server
  const ctx = canvas.getContext('2d');
  ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
  const frame = canvas.toDataURL('image/jpeg', 0.4);
  if (socket) socket.emit('video-frame', { frame });
};

export default function App() {
  const [navState, setNavState] = useState('login'); 
  const [username, setUsername] = useState('');
  const [channel, setChannel] = useState('');
  
  const [socket, setSocket] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [isRecording, setIsRecording] = useState(false);
  const [activeSpeaker, setActiveSpeaker] = useState(null);
  
  const [isVideoEnabled, setIsVideoEnabled] = useState(false);
  const [activeFrame, setActiveFrame] = useState(null);
  const localVideoRef = useRef(null);

  const [activeRadio, setActiveRadio] = useState(null); // FIX MISSING STATE!

  const [messages, setMessages] = useState([]);
  const isRecordingRef = useRef(false);

  useEffect(() => {
    if (!username || !channel) return;
    if (socket) return; // Prevent double connections if already active

    initAudioContext().resume();
    
    if (!receiverChain) {
      receiverChain = createReceiverChain();
    }

    const newSocket = io();
    setSocket(newSocket);

    newSocket.on('connect', () => {
      newSocket.emit('join-channel', { username, channel });
      setMessages(prev => [...prev, { text: `Tergabung di saluran: ${channel}`, type: 'text', self: false, username: 'System', timestamp: new Date().toISOString() }]);
    });

    newSocket.on('channel-info', ({ participants }) => setParticipants(participants));
    newSocket.on('user-joined', (user) => setParticipants(prev => [...prev.filter(p => p.id !== user.id), user]));
    newSocket.on('user-left', (user) => setParticipants(prev => prev.filter(p => p.id !== user.id)));

    newSocket.on('chat-message', (data) => {
       setMessages(prev => [...prev, { ...data, self: false }]);
    });

    newSocket.on('video-frame', (data) => {
      // Show frame if it corresponds to the active speaker
      setActiveFrame(data.frame);
    });

    newSocket.on('sos-alert', (data) => {
      setMessages(prev => [...prev, { text: `🚨 DARURAT: ${data.username} MENEKAN TOMBOL SOS!`, type: 'text', self: false, username: 'System', timestamp: new Date().toISOString() }]);
      playSiren();
    });

    newSocket.on('audio-stream', (payload) => {
      const data = payload.audioData;
      
      if (data.type === 'start') {
        setActiveSpeaker(payload.username);
        setActiveFrame(null); // Clear old frame
        if (!isRecordingRef.current) {
          playZelloBeep('start');
          playTime = initAudioContext().currentTime + 0.1; 
        }
      } 
      else if (data.type === 'end') {
        setActiveSpeaker(null);
        setActiveFrame(null);
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


  const toggleVideo = async () => {
    if (isVideoEnabled) {
      if (globalVideoStream) {
        globalVideoStream.getTracks().forEach(t => t.stop());
        globalVideoStream = null;
      }
      setIsVideoEnabled(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: 320, height: 240 } });
        globalVideoStream = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
        setIsVideoEnabled(true);
      } catch (err) {
        alert("Gagal mengakses kamera video: " + err.message);
      }
    }
  };


  const startRecording = async () => {
    if (isRecordingRef.current) return;
    
    setSpeakerMute(true); 

    const ctx = initAudioContext();
    if (ctx.state === 'suspended') await ctx.resume();
    
    setIsRecording(true);
    isRecordingRef.current = true;
    
    playZelloBeep('start');
    if (socket) socket.emit('audio-stream', { type: 'start' });

    try {
      if (!globalStream) {
        globalStream = await navigator.mediaDevices.getUserMedia({ 
          audio: { 
            echoCancellation: true, 
            noiseSuppression: true,
            autoGainControl: true,
            sampleRate: AUDIO_SAMPLE_RATE,
            channelCount: 1
          } 
        });
      }
      
      mediaStreamSource = ctx.createMediaStreamSource(globalStream);
      scriptNode = ctx.createScriptProcessor(4096, 1, 1);
      
      scriptNode.onaudioprocess = (e) => {
        if (!isRecordingRef.current) return;
        const float32Array = e.inputBuffer.getChannelData(0);
        
        let rms = 0;
        for (let i = 0; i < float32Array.length; i++) {
          rms += float32Array[i] * float32Array[i];
        }
        rms = Math.sqrt(rms / float32Array.length);
        
        if (rms < 0.03) {
          return; 
        }

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

      // Start Video broadcast loop if Video is enabled!
      if (isVideoEnabled && localVideoRef.current) {
        videoInterval = setInterval(() => {
          captureVideoFrame(localVideoRef.current, socket, username, channel);
        }, 200); // 5 FPS
      }
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
    
    if (videoInterval) {
      clearInterval(videoInterval);
      videoInterval = null;
    }

    setTimeout(() => { setSpeakerMute(false); }, 300);
  };

  const stopRadio = () => {
    if (radioPlayer) {
      radioPlayer.pause();
      radioPlayer.currentTime = 0;
    }
    setActiveRadio(null);
  };

  const toggleRadio = (station) => {
    if (!radioPlayer) return;
    if (activeRadio === station.id) {
      stopRadio();
    } else {
      radioPlayer.src = station.url;
      let playPromise = radioPlayer.play();
      if (playPromise !== undefined) {
        playPromise.then(() => {
          setActiveRadio(station.id);
        }).catch(err => {
          alert('Stream Radio sedang gangguan teknis. Coba stasiun lain.');
          setActiveRadio(null);
        });
      }
    }
  };

  const handleSendMessage = (payload) => {
    if (!socket) return;
    
    // Transform string text to unified object model
    const messageData = typeof payload === 'string' ? { type: 'text', text: payload } : payload;
    
    const packet = {
      ...messageData,
      self: true,
      username,
      timestamp: new Date().toISOString()
    };
    
    socket.emit('chat-message', packet);
    setMessages(prev => [...prev, packet]);
  };

  const handleLogin = (e) => {
    e.preventDefault();
    if (username.trim()) setNavState('channel');
  };

  const joinChannel = (ch) => {
    stopRadio(); // PROTECTIVE MUTING: Silence the radio before entering PTT zone!
    setChannel(ch);
    setMessages([]); 
    if (ch.startsWith('MEETING-')) {
      setNavState('meeting');
    } else {
      setNavState('talk');
    }
  };

  const handleSOS = () => {
    if (socket) socket.emit('sos-alert');
    playSiren();
    const packet = { text: `🚨 SAYA MENEKAN TOMBOL SOS!`, type: 'text', self: true, username, timestamp: new Date().toISOString() };
    setMessages(prev => [...prev, packet]);
  };

  const leaveChannel = () => {
    if (channel.startsWith('MEETING-')) setNavState('conference');
    else setNavState('channel');
    
    setChannel('');
    if (socket) {
      socket.disconnect();
      setSocket(null);
    }
    if (globalVideoStream) {
      globalVideoStream.getTracks().forEach(t => t.stop());
      globalVideoStream = null;
      setIsVideoEnabled(false);
    }
  };

  return (
    <div className="app-container">
      {navState === 'login' && (
        <div className="auth-container">
          <h1 style={{color: 'var(--accent)', fontSize: '2.5rem', marginBottom: '4px'}}>Si Talki HKA</h1>
          <div className="auth-subtitle" style={{fontWeight: 'bold', letterSpacing: '0.5px'}}>Komunikasi Cerdas Dengan Seluruh Insan HKA</div>
          <br/>
          <form style={{ width: '100%' }} onSubmit={handleLogin}>
            <input 
              className="form-input"
              placeholder="Masukkan NIK / Nama Anda" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoFocus
            />
            <button type="submit" className="btn-primary" disabled={!username.trim()}>
              Masuk Sistem
            </button>
          </form>
        </div>
      )}

      {navState === 'channel' && (
        <ChannelScreen onJoinChannel={joinChannel} />
      )}

      {navState === 'conference' && (
        <ConferenceScreen username={username} onJoinChannel={joinChannel} />
      )}

      {navState === 'radio' && (
        <RadioScreen activeRadio={activeRadio} onPlayRadio={toggleRadio} />
      )}

      {navState === 'contact' && (
        <ContactScreen username={username} onJoinChannel={joinChannel} />
      )}

      {navState === 'meeting' && (
        <MeetingScreen 
          roomCode={channel.split('-')[1]} 
          username={username} 
          socket={socket} 
          onLeave={leaveChannel} 
        />
      )}

      {navState === 'talk' && (
        <TalkScreen 
          channel={channel}
          onLeave={leaveChannel}
          participants={participants}
          activeSpeaker={activeSpeaker}
          activeFrame={activeFrame}
          isVideoEnabled={isVideoEnabled}
          toggleVideo={toggleVideo}
          localVideoRef={localVideoRef}
          onStartPTT={startRecording}
          onStopPTT={stopRecording}
          onSOS={handleSOS}
          isRecording={isRecording}
        />
      )}

      {navState === 'chat' && (
        <ChatScreen username={username} />
      )}
      
      {navState !== 'login' && navState !== 'meeting' && (
        <div className="bottom-nav">
          <div className={`nav-item ${(navState === 'channel' || navState === 'talk') ? 'active' : ''}`} onClick={() => setNavState((channel && !channel.startsWith('MEETING-')) ? 'talk' : 'channel')}>
            <Route size={20} /> <span style={{fontSize: '0.7rem', marginTop: '4px'}}>Saluran</span>
          </div>
          <div className={`nav-item ${navState === 'conference' ? 'active' : ''}`} onClick={() => setNavState('conference')}>
            <Video size={20} /> <span style={{fontSize: '0.7rem', marginTop: '4px'}}>Rapat</span>
          </div>
          <div className={`nav-item ${navState === 'chat' ? 'active' : ''}`} onClick={() => setNavState('chat')}>
            <MessageSquare size={20} /> <span style={{fontSize: '0.7rem', marginTop: '4px'}}>Chat</span>
          </div>
          <div className={`nav-item ${navState === 'radio' ? 'active' : ''}`} onClick={() => setNavState('radio')}>
            <Radio size={20} /> <span style={{fontSize: '0.7rem', marginTop: '4px'}}>Radio</span>
          </div>
          <div className={`nav-item ${navState === 'contact' ? 'active' : ''}`} onClick={() => setNavState('contact')}>
            <Users size={20} /> <span style={{fontSize: '0.7rem', marginTop: '4px'}}>Kontak</span>
          </div>
        </div>
      )}
    </div>
  );
}
