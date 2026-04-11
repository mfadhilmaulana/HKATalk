import React, { useEffect, useRef, useState } from 'react';
import { PhoneOff, Video, Mic, MicOff, VideoOff, PhoneCall, MonitorUp, SwitchCamera, Maximize, Minimize } from 'lucide-react';

const iceServers = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'turn:openrelay.metered.ca:80', username: 'openrelayproject', credential: 'openrelayproject' },
    { urls: 'turn:openrelay.metered.ca:443', username: 'openrelayproject', credential: 'openrelayproject' }
  ]
};

export default function MeetingScreen({ roomCode, username, socket, onLeave }) {
  const [peers, setPeers] = useState([]); // {id, stream, username}
  const [localStream, setLocalStream] = useState(null); // REAKTIF UNTUK DOM
  const localStreamRef = useRef(null); // UNTUK LOGIKA WEBRTC SYNCHRONOUS
  const connectionsRef = useRef({}); // RTCPeerConnection map
  
  const [micState, setMicState] = useState(true);
  const [camState, setCamState] = useState(true);
  const [isFrontCamera, setIsFrontCamera] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  
  // Layout Management (Zoom/Teams style)
  const [pinnedPeerId, setPinnedPeerId] = useState(null); // 'local' or peer.id
  const [screenSharerId, setScreenSharerId] = useState(null);

  // Initialize Media
  const startMedia = async (useFrontCam) => {
    try {
      const constraints = {
        video: { 
          width: 640, 
          height: 480,
          facingMode: useFrontCam ? 'user' : 'environment'
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      // If we already have a stream (e.g. flipping camera), replace tracks!
      if (localStreamRef.current) {
        const oldVideoTrack = localStreamRef.current.getVideoTracks()[0];
        const newVideoTrack = stream.getVideoTracks()[0];
        
        if (oldVideoTrack && newVideoTrack && !isScreenSharing) {
          Object.values(connectionsRef.current).forEach(pc => {
            const sender = pc.getSenders().find(s => s.track && s.track.kind === 'video');
            if (sender) sender.replaceTrack(newVideoTrack);
          });
          localStreamRef.current.removeTrack(oldVideoTrack);
          localStreamRef.current.addTrack(newVideoTrack);
          oldVideoTrack.stop();
        }
      } else {
        localStreamRef.current = stream;
      }
      
      if (!isScreenSharing) {
        setLocalStream(localStreamRef.current);
      }
    } catch (err) {
      alert("Gagal mengakses kamera/mic: " + err.message);
    }
  };

  useEffect(() => {
    if (!socket) return;
    
    startMedia(isFrontCamera).then(() => {
      // Logic adjusted: We use the consistent MEETING-XXXX channel passed from App.jsx
      // No longer using RAHASIA-WEB- prefix to avoid leaving the main room context
      
      socket.on('channel-info', ({ participants }) => {
        participants.forEach(p => {
          if (p.id !== socket.id) createPeerConnection(p.id, p.username, true);
        });
      });

      socket.on('webrtc-offer', async (data) => {
        if (data.type !== 'meeting') return;
        const pc = createPeerConnection(data.senderId, data.username, false);
        await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit('webrtc-answer', { target: data.senderId, answer, type: 'meeting' });
      });

      socket.on('webrtc-answer', async (data) => {
        if (data.type !== 'meeting') return;
        const pc = connectionsRef.current[data.senderId];
        if (pc) await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
      });

      socket.on('webrtc-ice-candidate', async (data) => {
        if (data.type !== 'meeting') return;
        const pc = connectionsRef.current[data.senderId];
        if (pc) await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
      });

      // Auto-Pin Screen Share feature!
      socket.on('screen-share-status', (data) => {
        if (data.status) {
          setScreenSharerId(data.senderId);
          setPinnedPeerId(data.senderId); // Force Spotlight
        } else {
          setScreenSharerId(null);
          setPinnedPeerId(null); // Unpin when stopped
        }
      });

      socket.on('user-left', (user) => {
        const id = user.id;
        if (connectionsRef.current[id]) {
          connectionsRef.current[id].close();
          delete connectionsRef.current[id];
          setPeers(prev => prev.filter(p => p.id !== id));
          setPinnedPeerId(prev => prev === id ? null : prev);
        }
      });
    });

    return () => {
      Object.values(connectionsRef.current).forEach(pc => pc.close());
      if (localStreamRef.current) localStreamRef.current.getTracks().forEach(t => t.stop());
      socket.off('webrtc-offer');
      socket.off('webrtc-answer');
      socket.off('webrtc-ice-candidate');
      socket.off('channel-info');
      socket.off('screen-share-status');
    };
  }, [socket, roomCode]);

  const createPeerConnection = (targetId, targetUsername, isInitiator) => {
    if (connectionsRef.current[targetId]) return connectionsRef.current[targetId];

    const pc = new RTCPeerConnection(iceServers);
    connectionsRef.current[targetId] = pc;

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, localStreamRef.current);
      });
    }

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('webrtc-ice-candidate', { target: targetId, candidate: event.candidate, type: 'meeting' });
      }
    };

    pc.ontrack = (event) => {
      setPeers(prev => {
        const existing = prev.find(p => p.id === targetId);
        if (!existing) {
          return [...prev, { id: targetId, stream: event.streams[0], username: targetUsername }];
        }
        // Force update stream if tracks changed
        return prev.map(p => p.id === targetId ? { ...p, stream: event.streams[0] } : p);
      });
    };

    pc.onconnectionstatechange = () => {
      if (['disconnected', 'failed', 'closed'].includes(pc.connectionState)) {
        pc.close();
        delete connectionsRef.current[targetId];
        setPeers(prev => prev.filter(p => p.id !== targetId));
        setPinnedPeerId(prev => prev === targetId ? null : prev);
      }
    };

    if (isInitiator) {
      pc.createOffer().then(offer => {
        pc.setLocalDescription(offer);
        socket.emit('webrtc-offer', { target: targetId, offer, type: 'meeting' });
      });
    }
    return pc;
  };

  const toggleMic = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(t => t.enabled = !t.enabled);
      setMicState(!micState);
    }
  };

  const toggleCam = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach(t => t.enabled = !t.enabled);
      setCamState(!camState);
    }
  };

  const flipCamera = async () => {
    setIsFrontCamera(!isFrontCamera);
    await startMedia(!isFrontCamera);
  };

  const toggleScreenShare = async () => {
    if (isScreenSharing) {
      // Revert to Webcam
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      Object.values(connectionsRef.current).forEach(pc => {
        const sender = pc.getSenders().find(s => s.track && s.track.kind === 'video');
        if (sender && videoTrack) sender.replaceTrack(videoTrack);
      });
      setLocalStream(localStreamRef.current);
      setIsScreenSharing(false);
      if (socket) socket.emit('screen-share-status', { status: false });
      setPinnedPeerId(null);
    } else {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        const screenTrack = screenStream.getVideoTracks()[0];
        
        screenTrack.onended = () => {
          const videoTrack = localStreamRef.current.getVideoTracks()[0];
          Object.values(connectionsRef.current).forEach(pc => {
            const sender = pc.getSenders().find(s => s.track && s.track.kind === 'video');
            if (sender && videoTrack) sender.replaceTrack(videoTrack);
          });
          setLocalStream(localStreamRef.current);
          setIsScreenSharing(false);
          if (socket) socket.emit('screen-share-status', { status: false });
          setPinnedPeerId(null);
        };

        Object.values(connectionsRef.current).forEach(pc => {
          const sender = pc.getSenders().find(s => s.track && s.track.kind === 'video');
          if (sender) sender.replaceTrack(screenTrack);
        });
        
        setLocalStream(screenStream);
        setIsScreenSharing(true);
        if (socket) socket.emit('screen-share-status', { status: true });
        setPinnedPeerId('local'); // Pin my own screen share
      } catch (err) {
        console.warn("Screen share cancelled", err);
      }
    }
  };

  // Layout Logic Helpers
  const togglePin = (id) => {
    setPinnedPeerId(prev => prev === id ? null : id);
  };

  const pinnedStream = pinnedPeerId === 'local' 
    ? { id: 'local', username: `Anda ${isScreenSharing ? '(Presentasi)' : ''}`, stream: localStream }
    : peers.find(p => p.id === pinnedPeerId);

  const renderVideoBox = (id, stream, name, isLocal, isPinned) => {
    return (
      <div 
        key={id}
        onClick={() => togglePin(id)}
        style={{ 
          position: 'relative', 
          background: 'var(--bg-tertiary)', 
          borderRadius: isPinned ? '16px' : '10px', 
          overflow: 'hidden',
          width: '100%',
          height: '100%',
          cursor: 'pointer',
          boxShadow: isPinned ? '0 10px 40px rgba(0,0,0,0.5)' : 'none',
          border: screenSharerId === id || (isScreenSharing && isLocal) ? '2px solid var(--accent-emerald)' : '1px solid var(--border)',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
        }}
      >
        <PeerVideo 
            stream={stream} 
            isScreenShare={screenSharerId === id || (isScreenSharing && isLocal)} 
            flip={isLocal && !isScreenSharing && isFrontCamera}
            isLocal={isLocal}
        />
        <div style={{ position: 'absolute', bottom: 10, left: 10, background: 'rgba(0,0,0,0.7)', padding: '6px 12px', borderRadius: 'var(--radius-full)', fontSize: '0.8rem', fontWeight: 600, color: 'white', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.1)' }}>
          {name}
        </div>
        {!isPinned && (
          <div style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.6)', borderRadius: 'var(--radius-full)', padding: '6px', color: 'white', backdropFilter: 'blur(4px)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <Maximize size={14} />
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      {/* Header */}
      <div style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)', padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 10 }}>
        <div>
          <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', fontSize: '1.05rem', letterSpacing: '-0.02em' }}>
            <PhoneCall size={18} color="var(--accent-emerald)" /> Video Conference
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', fontFamily: "'JetBrains Mono', monospace", marginTop: '2px' }}>
            ROOM: {roomCode} • {peers.length + 1} Peserta
          </div>
        </div>
      </div>

      {/* Main Layout Area */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', padding: '0.5rem', gap: '0.5rem', background: '#09090b' }}>
        
        {/* Spotlight View */}
        {pinnedPeerId ? (
          <>
            {/* BIG PINNED SCREEN */}
            <div style={{ flex: 1, minHeight: 0, borderRadius: '12px', overflow: 'hidden', animation: 'fadeIn 0.3s ease-out' }}>
              {pinnedStream && renderVideoBox(
                pinnedStream.id, 
                pinnedStream.stream, 
                pinnedStream.username, 
                pinnedStream.id === 'local',
                true
              )}
            </div>

            {/* BOTTOM / SIDE RIBBON for others */}
            <div style={{ 
              height: '110px', 
              flexShrink: 0, 
              display: 'flex', 
              gap: '8px', 
              overflowX: 'auto', 
              paddingBottom: '4px',
              scrollSnapType: 'x mandatory' 
            }}>
              {/* Local Video in ribbon if not pinned */}
              {pinnedPeerId !== 'local' && (
                <div style={{ minWidth: '140px', height: '100%', scrollSnapAlign: 'start' }}>
                  {renderVideoBox('local', localStream, `Anda`, true, false)}
                </div>
              )}
              {/* Peers in ribbon if not pinned */}
              {peers.map(peer => {
                if (peer.id === pinnedPeerId) return null;
                return (
                  <div key={peer.id} style={{ minWidth: '130px', height: '100%', scrollSnapAlign: 'start' }}>
                    {renderVideoBox(peer.id, peer.stream, peer.username, false, false)}
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          /* STANDARD GRID VIEW */
          <div style={{ 
            flex: 1, 
            display: 'grid', 
            gridTemplateColumns: peers.length === 0 ? '1fr' : 'repeat(auto-fit, minmax(150px, 1fr))', 
            gridAutoRows: peers.length === 0 ? '1fr' : 'minmax(150px, 1fr)', 
            gap: '8px', 
            overflowY: 'auto'
          }}>
            {renderVideoBox('local', localStream, 'Anda', true, false)}
            {peers.map(peer => renderVideoBox(peer.id, peer.stream, peer.username, false, false))}
          </div>
        )}
      </div>

      {/* Controls */}
      <div style={{ background: 'var(--bg-secondary)', borderTop: '1px solid var(--border)', padding: '1rem', display: 'flex', justifyContent: 'center', gap: '1rem', alignItems: 'center' }}>
        <button onClick={toggleMic} style={{ background: micState ? 'var(--bg-tertiary)' : 'rgba(220,38,38,0.1)', color: micState ? 'var(--text-primary)' : 'var(--accent)', border: `1px solid ${micState ? 'var(--border)' : 'var(--accent-border)'}`, borderRadius: '50%', width:'48px', height:'48px', display:'flex', alignItems:'center', justifyContent:'center', transition: 'all 0.2s' }}>
          {micState ? <Mic size={20} /> : <MicOff size={20} />}
        </button>
        <button onClick={toggleCam} style={{ background: camState ? 'var(--bg-tertiary)' : 'rgba(220,38,38,0.1)', color: camState ? 'var(--text-primary)' : 'var(--accent)', border: `1px solid ${camState ? 'var(--border)' : 'var(--accent-border)'}`, borderRadius: '50%', width:'48px', height:'48px', display:'flex', alignItems:'center', justifyContent:'center', transition: 'all 0.2s' }}>
          {camState ? <Video size={20} /> : <VideoOff size={20} />}
        </button>
        
        {/* Flip Camera */}
        <button onClick={flipCamera} style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: '50%', width:'48px', height:'48px', display:'flex', alignItems:'center', justifyContent:'center', transition: 'all 0.2s' }}>
          <SwitchCamera size={20} />
        </button>

        {/* Screen Share */}
        <button onClick={toggleScreenShare} style={{ background: isScreenSharing ? 'rgba(37,211,102,0.1)' : 'var(--bg-tertiary)', color: isScreenSharing ? '#25d366' : 'var(--text-primary)', border: `1px solid ${isScreenSharing ? '#25d366' : 'var(--border)'}`, borderRadius: '50%', width:'48px', height:'48px', display:'flex', alignItems:'center', justifyContent:'center', transition: 'all 0.2s', boxShadow: isScreenSharing ? '0 0 15px rgba(37,211,102,0.2)' : 'none' }}>
          <MonitorUp size={20} />
        </button>

        <button onClick={onLeave} style={{ background: 'var(--accent)', color: 'white', border: 'none', borderRadius: '32px', padding: '0 1.5rem', height:'48px', display:'flex', alignItems:'center', justifyContent:'center', gap: '8px', fontWeight: 600, boxShadow: 'var(--shadow-sm)' }}>
          <PhoneOff size={18} /> Keluar
        </button>
      </div>
    </div>
  );
}

const PeerVideo = ({ stream, isScreenShare, flip, isLocal }) => {
  const videoRef = useRef(null);
  
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <video 
      ref={videoRef} 
      autoPlay 
      playsInline 
      muted={isLocal}
      style={{ 
        width: '100%', 
        height: '100%', 
        objectFit: isScreenShare ? 'contain' : 'cover', // Screen share shouldn't be cropped
        transform: flip ? 'scaleX(-1)' : 'none'
      }} 
    />
  );
};
