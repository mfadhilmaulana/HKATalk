import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { Radio, MessageSquare, Users, Video, Route, UserCircle } from 'lucide-react';
import './index.css';
import ChannelScreen from './components/ChannelScreen';
import ConferenceScreen from './components/ConferenceScreen';
import RadioScreen from './components/RadioScreen';
import ContactScreen from './components/ContactScreen';
import TalkScreen from './components/TalkScreen';
import ChatScreen from './components/ChatScreen';
import MeetingScreen from './components/MeetingScreen';
import { initAudioContext, playZelloBeep, createReceiverChain, setSpeakerMute, playSiren, playRingtone, stopRingtone, startStaticNoise, stopStaticNoise, createMicAnalyser, clearMicAnalyser, AUDIO_SAMPLE_RATE } from './audioEngine';

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
  canvas.width = 320; 
  canvas.height = 240;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
  const frame = canvas.toDataURL('image/jpeg', 0.6);
  if (socket) socket.emit('video-frame', { frame });
};

export default function App() {
  const [navState, setNavState] = useState('login'); 
  const [username, setUsername] = useState('');
  const [userPhone, setUserPhone] = useState('');
  const [userProfile, setUserProfile] = useState(null);
  const [channel, setChannel] = useState('');
  
  // Auth form states
  const [authMode, setAuthMode] = useState('login'); // 'login' or 'register'
  const [authPhone, setAuthPhone] = useState('');
  const [authName, setAuthName] = useState('');
  const [authDept, setAuthDept] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  
  const [socket, setSocket] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [isRecording, setIsRecording] = useState(false);
  const [activeSpeaker, setActiveSpeaker] = useState(null);
  
  const [isVideoEnabled, setIsVideoEnabled] = useState(false);
  const [activeFrame, setActiveFrame] = useState(null);
  const localVideoRef = useRef(null);

  const [activeRadio, setActiveRadio] = useState(null);
  const [radioError, setRadioError] = useState(null);
  const [tab, setTab] = useState('summary');
  const [dmRoom, setDmRoom] = useState(null);
  const [dmName, setDmName] = useState('');
  const [messages, setMessages] = useState([]);
  const isRecordingRef = useRef(false);

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    if (!username || !userPhone) return;
    if (socket) return; // Prevent double connections

    initAudioContext().resume();
    
    if (!receiverChain) {
      receiverChain = createReceiverChain();
    }

    const newSocket = io();
    setSocket(newSocket);

    newSocket.on('connect', () => {
      newSocket.emit('register-user', { phone: userPhone });
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

    newSocket.on('incoming-message-notif', (data) => {
      // In-app notification for messages
      if (navState !== 'chat') {
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(`Pesan Baru dari ${data.senderName}`, {
             body: 'Ketuk untuk membuka aplikasi',
             icon: '/favicon.ico'
          });
        }
      }
    });

    newSocket.on('audio-stream', (payload) => {
      const data = payload.audioData;
      
      // Auto-listen Standby Mode for Personal Walkie-Talkie
      if (payload.channel && payload.channel.startsWith('DM-')) {
        setChannel(prev => {
           if (prev !== payload.channel) {
             setNavState('talk');
             newSocket.emit('join-channel', { username, channel: payload.channel });
             return payload.channel;
           }
           return prev;
        });
      }

      if (data.type === 'start') {
        setActiveSpeaker(payload.username);
        setActiveFrame(null); // Clear old frame
        if (!isRecordingRef.current) {
          playZelloBeep('start');
          startStaticNoise();
          playTime = initAudioContext().currentTime + 0.1; 
        }
      } 
      else if (data.type === 'end') {
        setActiveSpeaker(null);
        setActiveFrame(null);
        if (!isRecordingRef.current) {
          stopStaticNoise();
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
       // We don't disconnect socket easily anymore to let signaling work in background
    }
  }, [username, userPhone]);

  useEffect(() => {
    if (socket && channel && username) {
      socket.emit('join-channel', { username, channel });
      setMessages(prev => [...prev, { text: `Tergabung di saluran: ${channel}`, type: 'text', self: false, username: 'System', timestamp: new Date().toISOString() }]);
    }
  }, [socket, channel, username]);

  const toggleVideo = async () => {
    if (isVideoEnabled) {
      if (globalVideoStream) {
        globalVideoStream.getTracks().forEach(t => t.stop());
        globalVideoStream = null;
      }
      setIsVideoEnabled(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: 640, height: 480 } });
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
    startStaticNoise();
    if (socket) socket.emit('audio-stream', { type: 'start' });

    try {
      if (!globalStream || !globalStream.active || globalStream.getAudioTracks().some(t => t.readyState === 'ended')) {
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
        
        if (rms < 0.01) {
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

      // Connect mic analyser for the audio visualizer
      createMicAnalyser(mediaStreamSource);

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
    
    stopStaticNoise();
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

    clearMicAnalyser();

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
      radioPlayer.onerror = () => {
        setActiveRadio(null);
        setRadioError(station);
      };
      radioPlayer.src = station.url;
      radioPlayer.crossOrigin = 'anonymous';
      let playPromise = radioPlayer.play();
      if (playPromise !== undefined) {
        playPromise.then(() => {
          setActiveRadio(station.id);
          setRadioError(null);
        }).catch(() => {
          setActiveRadio(null);
          setRadioError(station);
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

  // Check localStorage session on mount
  useEffect(() => {
    const saved = localStorage.getItem('sitalki_session');
    if (saved) {
      try {
        const u = JSON.parse(saved);
        setUsername(u.display_name);
        setUserPhone(u.phone);
        setUserProfile(u);
        setNavState('channel');
      } catch (e) {}
    }
  }, []);

  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthError('');
    setAuthLoading(true);
    try {
      let res;
      if (authMode === 'register') {
        res = await fetch('/api/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: authPhone, display_name: authName, department: authDept })
        });
      } else {
        res = await fetch('/api/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: authPhone })
        });
      }
      const data = await res.json();
      if (!res.ok) { setAuthError(data.error || 'Gagal'); setAuthLoading(false); return; }
      setUsername(data.user.display_name);
      setUserPhone(data.user.phone);
      setUserProfile(data.user);
      localStorage.setItem('sitalki_session', JSON.stringify(data.user));
      setNavState('channel');
    } catch (err) {
      setAuthError('Server tidak tersedia. Coba lagi.');
    }
    setAuthLoading(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('sitalki_session');
    setUsername('');
    setUserPhone('');
    setUserProfile(null);
    setNavState('login');
    if (socket) { socket.disconnect(); setSocket(null); }
  };

  const joinChannel = (ch) => {
    stopRadio(); // PROTECTIVE MUTING: Silence the radio before entering PTT zone!
    setChannel(ch);
    setMessages([]); 
    if (ch.startsWith('MEETING-')) {
      setNavState('meeting');
    } else if (ch.startsWith('CALL-') || ch.startsWith('VC-')) {
      // Retain current navState; CallScreen overlay will render on top
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
    else if (channel.startsWith('DM-')) setNavState('chat'); // Go back to chat from PTT
    else setNavState('channel');
    
    setChannel('');
    if (socket) {
       socket.emit('join-channel', { username, channel: 'Lobby' }); // Emits to leave previous rooms
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
          {/* Animated Radio Icon */}
          <div style={{ width: 72, height: 72, borderRadius: '20px', background: 'linear-gradient(135deg, var(--accent) 0%, #b71c1c 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem', boxShadow: '0 8px 30px rgba(229,57,53,0.3)', position: 'relative' }}>
            <Radio size={32} color="white" />
            <div style={{ position: 'absolute', inset: '-4px', borderRadius: '24px', border: '2px solid rgba(229,57,53,0.2)', animation: 'pulseBg 2s infinite' }} />
          </div>

          <h1 style={{ color: 'var(--text-main)', fontSize: '1.8rem', marginBottom: '2px', fontWeight: 900, letterSpacing: '-0.5px' }}>Si Talki <span style={{color:'var(--accent)'}}>HKA</span></h1>
          <div className="auth-subtitle" style={{ fontWeight: 500, letterSpacing: '0.5px', fontSize: '0.75rem', marginBottom: '1.5rem' }}>Komunikasi Cerdas Seluruh Insan HKA</div>

          {/* Tab toggle */}
          <div style={{ display: 'flex', width: '100%', marginBottom: '1rem', borderRadius: '10px', overflow: 'hidden', border: '1px solid var(--border-light)', background: 'var(--bg-tertiary)' }}>
            <button type="button" onClick={() => { setAuthMode('login'); setAuthError(''); }} style={{ flex: 1, padding: '0.6rem', border: 'none', background: authMode === 'login' ? 'var(--accent)' : 'transparent', color: authMode === 'login' ? 'white' : 'var(--text-muted)', fontWeight: 600, cursor: 'pointer', fontSize: '0.8rem', fontFamily: 'inherit', transition: 'all 0.2s', borderRadius: authMode === 'login' ? '8px' : '0' }}>Masuk</button>
            <button type="button" onClick={() => { setAuthMode('register'); setAuthError(''); }} style={{ flex: 1, padding: '0.6rem', border: 'none', background: authMode === 'register' ? 'var(--accent)' : 'transparent', color: authMode === 'register' ? 'white' : 'var(--text-muted)', fontWeight: 600, cursor: 'pointer', fontSize: '0.8rem', fontFamily: 'inherit', transition: 'all 0.2s', borderRadius: authMode === 'register' ? '8px' : '0' }}>Daftar Baru</button>
          </div>

          <form style={{ width: '100%' }} onSubmit={handleAuth}>
            <div style={{ position: 'relative', marginBottom: '0.6rem' }}>
              <input className="form-input" style={{marginBottom: 0, paddingLeft: '2.5rem'}} placeholder="Nomor HP (08xxx)" value={authPhone} onChange={(e) => setAuthPhone(e.target.value)} autoFocus />
              <span style={{ position: 'absolute', left: '0.9rem', top: '50%', transform: 'translateY(-50%)', fontSize: '1rem' }}>📱</span>
            </div>
            {authMode === 'register' && (
              <>
                <div style={{ position: 'relative', marginBottom: '0.6rem' }}>
                  <input className="form-input" style={{marginBottom: 0, paddingLeft: '2.5rem'}} placeholder="Nama Lengkap" value={authName} onChange={(e) => setAuthName(e.target.value)} />
                  <span style={{ position: 'absolute', left: '0.9rem', top: '50%', transform: 'translateY(-50%)', fontSize: '1rem' }}>👤</span>
                </div>
                <select className="form-input" value={authDept} onChange={(e) => setAuthDept(e.target.value)} style={{color: authDept ? 'var(--text-main)' : 'var(--text-dim)'}}>
                  <option value="">📁 Pilih Departemen / Unit...</option>
                  <optgroup label="Kantor Pusat">
                    <option>Departemen HC, Pengembangan dan IT</option>
                    <option>Departemen Keuangan, Akuntansi, dan Risiko</option>
                    <option>Departemen Operasi I</option>
                    <option>Departemen Operasi II</option>
                    <option>Departemen QHSSE</option>
                    <option>Departemen Satuan Pengawas Intern</option>
                    <option>Departemen Sekretaris Perusahaan</option>
                    <option>Unit ITRS</option>
                    <option>Unit OCSC</option>
                    <option>Unit SMRK</option>
                    <option>Unit Bisnis Turunan OM</option>
                  </optgroup>
                  <optgroup label="Ruas">
                    <option>Ruas BTB</option>
                    <option>Ruas Akses Tanjung Priok</option>
                    <option>Ruas Bakauheni–Terbanggi Besar</option>
                    <option>Ruas Bengkulu–Taba Penanjung</option>
                    <option>Ruas Betung–Jambi</option>
                    <option>Ruas Binjai–Stabat</option>
                    <option>Ruas Indralaya–Prabumulih</option>
                    <option>Ruas Indrapura–Kisaran</option>
                    <option>Ruas JORRS</option>
                    <option>Ruas Kuala Tanjung–Parapat</option>
                    <option>Ruas Medan–Binjai</option>
                    <option>Ruas Padang–Sicincin</option>
                    <option>Ruas Palembang–Indralaya</option>
                    <option>Ruas Pekanbaru–Bangkinang</option>
                    <option>Ruas Pekanbaru–Dumai</option>
                    <option>Ruas Sigli–Banda Aceh</option>
                    <option>Ruas Terbanggi Besar–Kayu Agung</option>
                  </optgroup>
                  <optgroup label="Unit Produksi">
                    <option>UP Bojonegara</option>
                    <option>UP Indralaya</option>
                    <option>UP Jabodetabek</option>
                    <option>UP Muara Fajar</option>
                    <option>UP Patimban</option>
                    <option>UP Sei Langsat</option>
                    <option>UP Stone Crusher Sumatera</option>
                  </optgroup>
                </select>
              </>
            )}
            {authError && <div style={{ color: '#ef4444', fontSize: '0.8rem', marginBottom: '0.6rem', textAlign: 'center', background: 'rgba(239,68,68,0.1)', padding: '0.5rem', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.2)' }}>{authError}</div>}
            <button type="submit" className="btn-primary" disabled={authLoading || !authPhone.trim() || (authMode === 'register' && !authName.trim())} style={{ marginTop: '0.3rem' }}>
              {authLoading ? 'Memproses...' : (authMode === 'register' ? '🚀 Daftar & Masuk' : '🔐 Masuk')}
            </button>
          </form>

          <div style={{ marginTop: '1.5rem', fontSize: '0.65rem', color: 'var(--text-dim)', textAlign: 'center', lineHeight: 1.5 }}>
            PT Hutama Karya Infrastruktur<br/>
            <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>Enterprise Communication Platform v8.7</span>
          </div>
        </div>
      )}

      {navState === 'channel' && (
        <ChannelScreen onJoinChannel={joinChannel} userProfile={userProfile} />
      )}

      {navState === 'conference' && (
        <ConferenceScreen username={username} onJoinChannel={joinChannel} />
      )}

      {navState === 'radio' && (
        <RadioScreen activeRadio={activeRadio} onPlayRadio={toggleRadio} radioError={radioError} onClearError={() => setRadioError(null)} />
      )}

      {navState === 'contact' && (
        <ContactScreen 
          username={username} 
          userPhone={userPhone} 
          userProfile={userProfile} 
          onOpenDM={(room, name) => { setDmRoom(room); setDmName(name); setNavState('chat'); }}
          onPTTContact={(c) => { 
            const roomCode = `DM-${[userPhone,c.phone].sort().join('-')}`; 
            setDmRoom(roomCode); 
            setDmName(c.display_name);
            joinChannel(roomCode); 
          }}
          onLogout={handleLogout} 
        />
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
        <ChatScreen 
          username={username} 
          userPhone={userPhone} 
          initialRoom={dmRoom} 
          initialRoomName={dmName} 
          socket={socket}
          onClearDM={() => { setDmRoom(null); setDmName(''); }} 
          onPTT={(activeRoom) => {
             joinChannel(activeRoom); 
          }}
        />
      )}
      
      {navState !== 'login' && (
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
