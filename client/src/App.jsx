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
  const [dmRoom, setDmRoom] = useState(null);
  const [dmName, setDmName] = useState('');
  const [incomingCall, setIncomingCall] = useState(null); // { from, callerName, type, signalData }
  const [activeCall, setActiveCall] = useState(null); // { targetPhone, type, isCaller }

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
      newSocket.emit('register-user', { phone: userPhone });
      if (channel) newSocket.emit('join-channel', { username, channel });
      setMessages(prev => [...prev, { text: channel ? `Tergabung di saluran: ${channel}` : 'Tersambung ke server', type: 'text', self: false, username: 'System', timestamp: new Date().toISOString() }]);
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

    newSocket.on('incoming-call', (data) => {
      setIncomingCall(data);
      // Play ringing sound (optional)
    });

    newSocket.on('call-accepted', (data) => {
      // Logic to actually start WebRTC or move to Meeting
      setActiveCall(prev => ({ ...prev, accepted: true }));
    });

    newSocket.on('call-rejected', () => {
      alert('Panggilan ditolak');
      setActiveCall(null);
    });

    newSocket.on('call-hungup', () => {
      setActiveCall(null);
      setIncomingCall(null);
    });

    newSocket.on('incoming-message-notif', (data) => {
      // In-app notification for messages
      if (navState !== 'chat') {
        // Show a small toast or badge (simplified for now)
        console.log('New message from', data.senderName);
      }
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
      {/* Incoming Call Modal */}
      {incomingCall && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
          <div style={{ background: 'white', borderRadius: '24px', width: '100%', maxWidth: '320px', padding: '2rem', textAlign: 'center', boxShadow: '0 20px 40px rgba(0,0,0,0.4)' }}>
            <div style={{ width: 80, height: 80, borderRadius: '50%', background: '#128c7e', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', fontSize: '2rem', fontWeight: 800 }}>
              {incomingCall.callerName?.[0].toUpperCase()}
            </div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#111', marginBottom: '0.5rem' }}>{incomingCall.callerName}</h2>
            <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '2rem' }}>Memanggil ({incomingCall.type === 'video' ? 'Video' : 'Suara'})...</p>
            
            <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem' }}>
              <button 
                onClick={() => {
                  socket?.emit('reject-call', { targetPhone: incomingCall.from });
                  setIncomingCall(null);
                }}
                style={{ width: 64, height: 64, borderRadius: '50%', background: '#ff3b30', color: 'white', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              >
                <X size={32} />
              </button>
              <button 
                onClick={() => {
                  socket?.emit('accept-call', { targetPhone: incomingCall.from });
                  const roomCode = `CALL-${[userPhone, incomingCall.from].sort().join('-')}`;
                  setIncomingCall(null);
                  joinChannel(`MEETING-${roomCode}`);
                }}
                style={{ width: 64, height: 64, borderRadius: '50%', background: '#25d366', color: 'white', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              >
                {incomingCall.type === 'video' ? <Video size={32} /> : <Phone size={32} />}
              </button>
            </div>
          </div>
        </div>
      )}

      {navState === 'login' && (
        <div className="auth-container">
          <h1 style={{color: 'var(--accent)', fontSize: '2.2rem', marginBottom: '4px'}}>Si Talki HKA</h1>
          <div className="auth-subtitle" style={{fontWeight: 'bold', letterSpacing: '0.5px'}}>Komunikasi Cerdas Seluruh Insan HKA</div>
          <br/>

          {/* Tab toggle */}
          <div style={{ display: 'flex', width: '100%', marginBottom: '1rem', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border)' }}>
            <button type="button" onClick={() => { setAuthMode('login'); setAuthError(''); }} style={{ flex: 1, padding: '0.6rem', border: 'none', background: authMode === 'login' ? 'var(--accent)' : 'var(--bg-tertiary)', color: authMode === 'login' ? 'white' : 'var(--text-main)', fontWeight: 600, cursor: 'pointer' }}>Masuk</button>
            <button type="button" onClick={() => { setAuthMode('register'); setAuthError(''); }} style={{ flex: 1, padding: '0.6rem', border: 'none', background: authMode === 'register' ? 'var(--accent)' : 'var(--bg-tertiary)', color: authMode === 'register' ? 'white' : 'var(--text-main)', fontWeight: 600, cursor: 'pointer' }}>Daftar Baru</button>
          </div>

          <form style={{ width: '100%' }} onSubmit={handleAuth}>
            <input className="form-input" placeholder="Nomor HP (08xxx)" value={authPhone} onChange={(e) => setAuthPhone(e.target.value)} autoFocus />
            {authMode === 'register' && (
              <>
                <input className="form-input" placeholder="Nama Lengkap" value={authName} onChange={(e) => setAuthName(e.target.value)} />
                <select className="form-input" value={authDept} onChange={(e) => setAuthDept(e.target.value)} style={{color: authDept ? '#fff' : '#888'}}>
                  <option value="">Pilih Departemen / Unit...</option>
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
            {authError && <div style={{ color: '#c62828', fontSize: '0.85rem', marginBottom: '0.8rem', textAlign: 'center' }}>{authError}</div>}
            <button type="submit" className="btn-primary" disabled={authLoading || !authPhone.trim() || (authMode === 'register' && !authName.trim())}>
              {authLoading ? 'Memproses...' : (authMode === 'register' ? 'Daftar & Masuk' : 'Masuk')}
            </button>
          </form>
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
          onCallContact={(c) => { 
            const code = `CALL-${[userPhone,c.phone].sort().join('-')}`; 
            socket?.emit('call-user', { targetPhone: c.phone, type: 'voice', callerName: username });
            joinChannel(`MEETING-${code}`); 
          }}
          onVideoCallContact={(c) => { 
            const code = `VC-${[userPhone,c.phone].sort().join('-')}`; 
            socket?.emit('call-user', { targetPhone: c.phone, type: 'video', callerName: username });
            joinChannel(`MEETING-${code}`); 
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
        <ChatScreen username={username} userPhone={userPhone} initialRoom={dmRoom} initialRoomName={dmName} onClearDM={() => { setDmRoom(null); setDmName(''); }} />
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
