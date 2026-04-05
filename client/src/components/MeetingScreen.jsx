import React, { useEffect, useRef, useState } from 'react';
import { PhoneOff, Video, Mic, MicOff, VideoOff, PhoneCall, MonitorUp } from 'lucide-react';

// ICE servers for NAT traversal (STUN + Public TURN for Symmetric NAT/4G)
const iceServers = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    {
      urls: 'turn:openrelay.metered.ca:80',
      username: 'openrelayproject',
      credential: 'openrelayproject'
    },
    {
      urls: 'turn:openrelay.metered.ca:443',
      username: 'openrelayproject',
      credential: 'openrelayproject'
    }
  ]
};

export default function MeetingScreen({ roomCode, username, socket, onLeave }) {
  const [peers, setPeers] = useState([]); // {id, stream, username}
  const localVideoRef = useRef(null);
  const localStreamRef = useRef(null);
  const connectionsRef = useRef({}); // RTCPeerConnection map
  const [micState, setMicState] = useState(true);
  const [camState, setCamState] = useState(true);

  useEffect(() => {
    if (!socket) return;
    
    // 1. Join Meeting Room specific channel
    const meetingChannel = `RAHASIA-WEB-${roomCode}`;
    
    // Connect local media
    navigator.mediaDevices.getUserMedia({ video: { width: 480, height: 360 }, audio: true })
      .then((stream) => {
        localStreamRef.current = stream;
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;
        
        socket.emit('join-channel', { username, channel: meetingChannel });
        
        // Listeners for WebRTC Signaling
        socket.on('channel-info', ({ participants }) => {
          // Tell others I arrived (this isn't true P2P join but a prompt)
          participants.forEach(p => {
            if (p.id !== socket.id) {
              createPeerConnection(p.id, p.username, true);
            }
          });
        });

        socket.on('webrtc-offer', async (data) => {
          const pc = createPeerConnection(data.senderId, data.username, false);
          await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socket.emit('webrtc-answer', { target: data.senderId, answer });
        });

        socket.on('webrtc-answer', async (data) => {
          const pc = connectionsRef.current[data.senderId];
          if (pc) await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
        });

        socket.on('webrtc-ice-candidate', async (data) => {
          const pc = connectionsRef.current[data.senderId];
          if (pc) await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
        });

        socket.on('user-left', (user) => {
          const id = user.id;
          if (connectionsRef.current[id]) {
            connectionsRef.current[id].close();
            delete connectionsRef.current[id];
            setPeers(prev => prev.filter(p => p.id !== id));
          }
        });
      })
      .catch((err) => {
        alert("Gagal membuka kamera Meeting HD: " + err.message);
        onLeave();
      });

    return () => {
      // Disconnect all peers
      Object.keys(connectionsRef.current).forEach(id => {
        connectionsRef.current[id].close();
      });
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(t => t.stop());
      }
      socket.off('webrtc-offer');
      socket.off('webrtc-answer');
      socket.off('webrtc-ice-candidate');
      socket.off('channel-info');
    };
  }, [socket, roomCode]);

  const createPeerConnection = (targetId, targetUsername, isInitiator) => {
    if (connectionsRef.current[targetId]) return connectionsRef.current[targetId];

    const pc = new RTCPeerConnection(iceServers);
    connectionsRef.current[targetId] = pc;

    // Add local tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, localStreamRef.current);
      });
    }

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('webrtc-ice-candidate', { target: targetId, candidate: event.candidate });
      }
    };

    pc.ontrack = (event) => {
      setPeers(prev => {
        if (!prev.find(p => p.id === targetId)) {
          return [...prev, { id: targetId, stream: event.streams[0], username: targetUsername || 'Unknown' }];
        }
        return prev;
      });
    };

    // GHOST KILLER: Immediately clear participants if their P2P connection physically drops
    pc.onconnectionstatechange = () => {
      if (
        pc.connectionState === 'disconnected' || 
        pc.connectionState === 'failed' || 
        pc.connectionState === 'closed'
      ) {
        pc.close();
        if (connectionsRef.current[targetId]) delete connectionsRef.current[targetId];
        setPeers(prev => prev.filter(p => p.id !== targetId));
      }
    };

    if (isInitiator) {
      pc.createOffer().then(offer => {
        pc.setLocalDescription(offer);
        socket.emit('webrtc-offer', { target: targetId, offer });
      });
    }

    return pc;
  };

  const [isScreenSharing, setIsScreenSharing] = useState(false);

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

  const toggleScreenShare = async () => {
    if (isScreenSharing) {
      // Revert to Webcam
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      Object.values(connectionsRef.current).forEach(pc => {
        const sender = pc.getSenders().find(s => s.track && s.track.kind === 'video');
        if (sender && videoTrack) sender.replaceTrack(videoTrack);
      });
      if (localVideoRef.current) localVideoRef.current.srcObject = localStreamRef.current;
      setIsScreenSharing(false);
    } else {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        const screenTrack = screenStream.getVideoTracks()[0];
        
        screenTrack.onended = () => {
          // Triggered when user physically stops sharing via Chrome top-bar
          const videoTrack = localStreamRef.current.getVideoTracks()[0];
          Object.values(connectionsRef.current).forEach(pc => {
            const sender = pc.getSenders().find(s => s.track && s.track.kind === 'video');
            if (sender && videoTrack) sender.replaceTrack(videoTrack);
          });
          if (localVideoRef.current) localVideoRef.current.srcObject = localStreamRef.current;
          setIsScreenSharing(false);
        };

        // Live inject screen-track into all active Mesh Peers
        Object.values(connectionsRef.current).forEach(pc => {
          const sender = pc.getSenders().find(s => s.track && s.track.kind === 'video');
          if (sender) sender.replaceTrack(screenTrack);
        });
        
        if (localVideoRef.current) localVideoRef.current.srcObject = screenStream;
        setIsScreenSharing(true);
      } catch (err) {
        console.warn("Screen share cancelled", err);
      }
    }
  };

  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', background: '#111', color: 'white' }}>
      {/* Header */}
      <div style={{ background: '#000', padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}><Video size={16} color="var(--accent)" /> HD Video Meeting</div>
          <div style={{ fontSize: '0.8rem', color: 'gray' }}>Kunci ID: <span style={{color: 'white', fontWeight: 'bold', letterSpacing: '1px', paddingLeft: '2px'}}>{roomCode}</span></div>
        </div>
        <PhoneCall size={20} color="var(--accent-secondary)" />
      </div>

      {/* Grid Layout */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gridAutoRows: 'minmax(140px, 1fr)', gap: '4px', padding: '4px', overflowY: 'auto' }}>
         <div style={{ position: 'relative', background: '#222', borderRadius: '8px', overflow: 'hidden' }}>
            <video ref={localVideoRef} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            <div style={{ position: 'absolute', bottom: 10, left: 10, background: 'rgba(0,0,0,0.6)', padding: '2px 8px', borderRadius: 10, fontSize: '0.8rem' }}>Anda</div>
         </div>
         {peers.map(peer => (
           <PeerVideo key={peer.id} peer={peer} />
         ))}
      </div>

      {/* Controls */}
      <div style={{ background: '#000', padding: '1.5rem', display: 'flex', justifyContent: 'space-around', alignItems: 'center' }}>
        <button onClick={toggleMic} style={{ background: micState ? '#333' : 'var(--accent)', color: 'white', border: 'none', borderRadius: '50%', width:'50px', height:'50px', display:'flex', alignItems:'center', justifyContent:'center' }}>
          {micState ? <Mic /> : <MicOff />}
        </button>
        <button onClick={toggleCam} style={{ background: camState ? '#333' : 'var(--accent)', color: 'white', border: 'none', borderRadius: '50%', width:'50px', height:'50px', display:'flex', alignItems:'center', justifyContent:'center' }}>
          {camState ? <Video /> : <VideoOff />}
        </button>
        <button onClick={toggleScreenShare} style={{ background: isScreenSharing ? '#25d366' : '#333', color: 'white', border: 'none', borderRadius: '50%', width:'50px', height:'50px', display:'flex', alignItems:'center', justifyContent:'center', transition: '0.2s', boxShadow: isScreenSharing ? '0 0 15px #25d366' : 'none' }}>
          <MonitorUp />
        </button>
        <button onClick={onLeave} style={{ background: 'red', color: 'white', border: 'none', borderRadius: '50%', width:'50px', height:'50px', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <PhoneOff />
        </button>
      </div>
    </div>
  );
}

const PeerVideo = ({ peer }) => {
  const videoRef = useRef(null);
  useEffect(() => {
    if (videoRef.current && peer.stream) {
      videoRef.current.srcObject = peer.stream;
    }
  }, [peer]);

  return (
    <div style={{ position: 'relative', background: '#222', borderRadius: '8px', overflow: 'hidden' }}>
      <video ref={videoRef} autoPlay playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      <div style={{ position: 'absolute', bottom: 10, left: 10, background: 'rgba(0,0,0,0.6)', padding: '2px 8px', borderRadius: 10, fontSize: '0.8rem' }}>{peer.username}</div>
    </div>
  );
};
