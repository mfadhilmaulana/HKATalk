import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { Radio, MessageSquare, Users, Video, Route, UserCircle, Phone, User2, FolderOpen, ArrowRight, Lock, Mic } from 'lucide-react';
import './index.css';
import ChannelScreen from './components/ChannelScreen';
import ConferenceScreen from './components/ConferenceScreen';
import RadioScreen from './components/RadioScreen';
import ContactScreen from './components/ContactScreen';
import TalkScreen from './components/TalkScreen';
import ChatScreen from './components/ChatScreen';
import MeetingScreen from './components/MeetingScreen';
import { initAudioContext, playZelloBeep, playSiren, playRingtone, stopRingtone, startStaticNoise, stopStaticNoise, createMicAnalyser, clearMicAnalyser, AUDIO_SAMPLE_RATE } from './audioEngine';
import { WebRTCMesh } from './webrtcEngine';

let globalVideoStream = null;
let videoInterval = null;
let radioPlayer = typeof Audio !== 'undefined' ? new Audio() : null;
let webrtcEngine = null;

// Helper to draw video to canvas
const captureVideoFrame = (videoElement, socket, username, channel) => {
  if (!videoElement || videoElement.readyState < 2) return;
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
  const [globalActiveSpeakers, setGlobalActiveSpeakers] = useState({});
  const [channelOccupancy, setChannelOccupancy] = useState({});
  
  // Track remote WebRTC streams for React rendering
  const [remoteStreams, setRemoteStreams] = useState({});

  // Refs for consistent Socket Reconnection (avoids stale closures)
  const usernameRef = useRef('');
  const userPhoneRef = useRef('');
  const channelRef = useRef('');

  useEffect(() => { usernameRef.current = username; }, [username]);
  useEffect(() => { userPhoneRef.current = userPhone; }, [userPhone]);
  useEffect(() => { channelRef.current = channel; }, [channel]);
  const isRecordingRef = useRef(false);
  const localVideoRef = useRef(null);

  const [activeRadio, setActiveRadio] = useState(null);
  const [radioError, setRadioError] = useState(null);
  const [tab, setTab] = useState('summary');
  const [dmRoom, setDmRoom] = useState(null);
  const [dmName, setDmName] = useState('');
  const [messages, setMessages] = useState([]);
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    if (activeSpeaker) {
      startStaticNoise();
    } else {
      stopStaticNoise();
    }
  }, [activeSpeaker]);

  useEffect(() => {
    if (!username || !userPhone) return;
    if (socket) return; // Prevent double connections

    const newSocket = io();
    setSocket(newSocket);

    // Initialize WebRTC Mesh
    const handleRemoteTrackAdded = (targetId, stream) => {
      setRemoteStreams(prev => ({ ...prev, [targetId]: stream }));
    };

    const handleRemoteTrackRemoved = (targetId) => {
      setRemoteStreams(prev => {
        const next = { ...prev };
        delete next[targetId];
        return next;
      });
    };

    webrtcEngine = new WebRTCMesh(newSocket, handleRemoteTrackAdded, handleRemoteTrackRemoved);
    window.webrtcEngineInstance = webrtcEngine;

    newSocket.on('connect', () => {
      console.log('Socket Connected:', newSocket.id);
      newSocket.emit('register-user', { phone: userPhoneRef.current || userPhone });
      // If we reconnect out of nowhere and we were in a channel, tell the server
      if (channelRef.current && usernameRef.current) {
         newSocket.emit('join-channel', { username: usernameRef.current, channel: channelRef.current });
      }
    });

    // Deep Reconnection Handling (e.g. phone lock/network drop)
    newSocket.io.on('reconnect', (attempt) => {
      console.log('Socket Reconnected on attempt:', attempt);
      if (userPhoneRef.current) {
        newSocket.emit('register-user', { phone: userPhoneRef.current });
      }
      if (channelRef.current && usernameRef.current) {
         newSocket.emit('join-channel', { username: usernameRef.current, channel: channelRef.current });
      }
    });

    newSocket.on('channel-info', ({ participants }) => setParticipants(participants));
    newSocket.on('user-joined', (user) => setParticipants(prev => [...prev.filter(p => p.id !== user.id), user]));
    newSocket.on('user-left', (user) => setParticipants(prev => prev.filter(p => p.id !== user.id)));

    newSocket.on('chat-message', (data) => {
       setMessages(prev => [...prev, { ...data, self: false }]);
    });
    
    newSocket.on('channel-members', async ({ participants }) => {
       setParticipants(participants);
       
       // Only run PTT Mesh if NOT in a video meeting (Meetings handle their own WebRTC)
       if (webrtcEngine && channelRef.current && channelRef.current !== 'Lobby' && !channelRef.current.startsWith('MEETING-')) {
          // Ensure local mic track exists
          await webrtcEngine.initLocalStream();

          participants.forEach(p => {
             // Glare prevention: only let the lower socket.id send the offer
             // The higher one will wait to receive the offer
             if (p.id !== newSocket.id && newSocket.id < p.id && !webrtcEngine.peers[p.id]) {
                webrtcEngine.sendOffer(p.id);
             }
          });
       }
    });
    
    newSocket.on('active-speakers-update', (data) => {
       setGlobalActiveSpeakers(data);
       if (channelRef.current && data[channelRef.current]) {
          const speakers = data[channelRef.current];
          const remoteSpeakers = speakers.filter(s => s !== usernameRef.current);
          if (remoteSpeakers.length > 0) {
             setActiveSpeaker(remoteSpeakers[remoteSpeakers.length - 1]);
          } else {
             setActiveSpeaker(null);
          }
       } else {
          setActiveSpeaker(null);
       }
    });

    newSocket.on('channel-occupancy-update', (data) => {
       setChannelOccupancy(data);
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
        setActiveFrame(null);
        if (!isRecordingRef.current) {
          playZelloBeep('start');
        }
      } 
      else if (data.type === 'end') {
        setActiveSpeaker(null);
        setActiveFrame(null);
        if (!isRecordingRef.current) {
          playZelloBeep('end');
        }
      } 
      // LEGACY: No more data.type === 'chunk' handling, because audio now flows over WebRTC MediaStream exclusively.
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
    
    // Auto-stop radio when PTT is pressed
    if (activeRadio) {
      stopRadio();
    }
    
    setIsRecording(true);
    isRecordingRef.current = true;
    
    // Force re-join channel on every PTT press to ensure server room association is fresh
    if (socket) socket.emit('join-channel', { username, channel });
    
    playZelloBeep('start');
    if (socket) socket.emit('audio-stream', { type: 'start' });

    try {
      if (webrtcEngine) {
        await webrtcEngine.initLocalStream();
        // Unmute WebRTC track (start broadcasting)
        webrtcEngine.setMute(false);
      }

      // Start Video broadcast loop if Video is enabled!
      if (isVideoEnabled && localVideoRef.current) {
        videoInterval = setInterval(() => {
          captureVideoFrame(localVideoRef.current, socket, username, channel);
        }, 200); // 5 FPS
      }
    } catch (err) {
      console.error('Error in WebRTC PTT:', err);
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

    if (webrtcEngine) {
      // Mute WebRTC track (stop broadcasting)
      webrtcEngine.setMute(true);
    }
    
    if (videoInterval) {
      clearInterval(videoInterval);
      videoInterval = null;
    }
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
        
        // RESTORE VIEW STATE (Anti-Reset on Refresh)
        const savedNav = localStorage.getItem('sitalki_last_nav');
        const savedChannel = localStorage.getItem('sitalki_last_channel');
        const savedDmRoom = localStorage.getItem('sitalki_last_dm_room');
        const savedDmName = localStorage.getItem('sitalki_last_dm_name');

        if (savedNav) setNavState(savedNav);
        else setNavState('channel');

        if (savedChannel) {
          setChannel(savedChannel);
          // If we have a channel, we should actively join it on the socket
          // Logic is handled by the socket's useEffect which watches 'channel'
        }
        
        if (savedDmRoom) setDmRoom(savedDmRoom);
        if (savedDmName) setDmName(savedDmName);
        
      } catch (e) {}
    }
  }, []);

  // PERSIST VIEW STATE on change
  useEffect(() => {
    if (navState !== 'login') {
      localStorage.setItem('sitalki_last_nav', navState);
    }
    localStorage.setItem('sitalki_last_channel', channel || '');
    localStorage.setItem('sitalki_last_dm_room', dmRoom || '');
    localStorage.setItem('sitalki_last_dm_name', dmName || '');
  }, [navState, channel, dmRoom, dmName]);

  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthError('');
    initAudioContext().resume(); // WAKE UP audio on first button click!
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
      
      initAudioContext().resume(); // Must be launched on user tap
      
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
    localStorage.removeItem('sitalki_last_nav');
    localStorage.removeItem('sitalki_last_channel');
    localStorage.removeItem('sitalki_last_dm_room');
    localStorage.removeItem('sitalki_last_dm_name');
    setUsername('');
    setUserPhone('');
    setUserProfile(null);
    setNavState('login');
    if (socket) { socket.disconnect(); setSocket(null); }
  };

  const joinChannel = (ch) => {
    initAudioContext().resume().catch(console.error); // Force wake-up global audio engine
    stopRadio(); 
    setChannel(ch);
    setMessages([]); 
    if (webrtcEngine) {
       webrtcEngine.audioCtx.resume().catch(console.error); // Force wake-up WebRTC engine
       webrtcEngine.clearPeers(); // AGGRESSIVE CLEANUP: Drop all old connections before joining new room
    }
    
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
    else if (channel.startsWith('DM-')) setNavState('chat'); 
    else setNavState('channel');
    
    setChannel('');
    setRemoteStreams({}); // Clear old WebRTC streams
    
    if (socket) {
       socket.emit('join-channel', { username, channel: 'Lobby' }); 
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
          {/* Icon */}
          <div style={{ width: 56, height: 56, borderRadius: 'var(--radius-md)', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.2rem', position: 'relative', boxShadow: '0 4px 16px rgba(220,38,38,0.15)' }}>
            <Radio size={26} color="white" />
            <div style={{ position: 'absolute', inset: '-6px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--accent-border)' }} />
          </div>

          <h1 style={{ color: 'var(--text-primary)', fontSize: '1.5rem', marginBottom: '2px', fontWeight: 800, letterSpacing: '-0.03em' }}>Si Talki <span style={{color:'var(--accent)'}}>HKA</span></h1>
          <div className="auth-subtitle" style={{ fontWeight: 500, letterSpacing: '0.01em' }}>Komunikasi Cerdas Seluruh Insan HKA</div>

          {/* Tab toggle */}
          <div style={{ display: 'flex', width: '100%', marginBottom: '0.8rem', borderRadius: 'var(--radius-sm)', overflow: 'hidden', border: '1px solid var(--border-subtle)', background: 'var(--bg-tertiary)' }}>
            <button type="button" onClick={() => { setAuthMode('login'); setAuthError(''); }} style={{ flex: 1, padding: '0.55rem', border: 'none', background: authMode === 'login' ? 'var(--accent)' : 'transparent', color: authMode === 'login' ? 'white' : 'var(--text-tertiary)', fontWeight: 600, cursor: 'pointer', fontSize: '0.75rem', fontFamily: 'inherit', transition: 'all 0.2s var(--ease-out)', borderRadius: authMode === 'login' ? '6px' : '0' }}>Masuk</button>
            <button type="button" onClick={() => { setAuthMode('register'); setAuthError(''); }} style={{ flex: 1, padding: '0.55rem', border: 'none', background: authMode === 'register' ? 'var(--accent)' : 'transparent', color: authMode === 'register' ? 'white' : 'var(--text-tertiary)', fontWeight: 600, cursor: 'pointer', fontSize: '0.75rem', fontFamily: 'inherit', transition: 'all 0.2s var(--ease-out)', borderRadius: authMode === 'register' ? '6px' : '0' }}>Daftar Baru</button>
          </div>

          <form style={{ width: '100%' }} onSubmit={handleAuth}>
            <div style={{ position: 'relative', marginBottom: '0.5rem' }}>
              <input className="form-input" style={{marginBottom: 0, paddingLeft: '2.4rem'}} placeholder="Nomor HP (08xxx)" value={authPhone} onChange={(e) => setAuthPhone(e.target.value)} autoFocus />
              <Phone size={14} style={{ position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
            </div>
            {authMode === 'register' && (
              <>
                <div style={{ position: 'relative', marginBottom: '0.5rem' }}>
                  <input className="form-input" style={{marginBottom: 0, paddingLeft: '2.4rem'}} placeholder="Nama Lengkap" value={authName} onChange={(e) => setAuthName(e.target.value)} />
                  <User2 size={14} style={{ position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                </div>
                <select className="form-input" value={authDept} onChange={(e) => setAuthDept(e.target.value)} style={{color: authDept ? 'var(--text-primary)' : 'var(--text-tertiary)'}}>
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
            {authError && <div style={{ color: '#ef4444', fontSize: '0.75rem', marginBottom: '0.5rem', textAlign: 'left', background: 'rgba(220,38,38,0.06)', padding: '0.5rem 0.7rem', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(220,38,38,0.1)' }}>{authError}</div>}
            <button type="submit" className="btn-primary" disabled={authLoading || !authPhone.trim() || (authMode === 'register' && !authName.trim())} style={{ marginTop: '0.2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
              {authLoading ? 'Memproses...' : (authMode === 'register' ? <><ArrowRight size={16} /> Daftar dan Masuk</> : <><Lock size={14} /> Masuk</>)}
            </button>
          </form>

          <div style={{ marginTop: '1.5rem', fontSize: '0.55rem', color: 'var(--text-tertiary)', textAlign: 'center', lineHeight: 1.6, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.02em' }}>
            by ITRS HKA<br/>
            <span style={{ color: 'var(--text-secondary)' }}>ENTERPRISE COMMUNICATION PLATFORM v9.0</span>
          </div>
        </div>
      )}

      {navState === 'channel' && (
        <ChannelScreen 
          onJoinChannel={joinChannel} 
          userProfile={userProfile} 
          activeSpeakers={globalActiveSpeakers}
          occupancy={channelOccupancy}
        />
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
            <Route size={20} /> <span style={{ marginTop: '2px' }}>Saluran</span>
          </div>
          <div className={`nav-item ${navState === 'conference' ? 'active' : ''}`} onClick={() => setNavState('conference')}>
            <Video size={20} /> <span style={{ marginTop: '2px' }}>Rapat</span>
          </div>
          <div className={`nav-item ${navState === 'chat' ? 'active' : ''}`} onClick={() => setNavState('chat')}>
            <MessageSquare size={20} /> <span style={{ marginTop: '2px' }}>Chat</span>
          </div>
          <div className={`nav-item ${navState === 'radio' ? 'active' : ''}`} onClick={() => setNavState('radio')}>
            <Radio size={20} /> <span style={{ marginTop: '2px' }}>Radio</span>
          </div>
          <div className={`nav-item ${navState === 'contact' ? 'active' : ''}`} onClick={() => setNavState('contact')}>
            <Users size={20} /> <span style={{ marginTop: '2px' }}>Kontak</span>
          </div>
        </div>
      )}
      {/* WebRTC Audio Renderer (Hidden) */}
      <div style={{ display: 'none' }}>
        {Object.entries(remoteStreams).map(([id, stream]) => (
           <audio 
             key={id} 
             autoPlay 
             playsInline 
             ref={el => { if(el && el.srcObject !== stream) el.srcObject = stream; }} 
           />
        ))}
      </div>
    </div>
  );
}
