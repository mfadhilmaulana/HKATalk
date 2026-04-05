import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Video as VideoIcon, VideoOff, PhoneOff, User } from 'lucide-react';

export default function CallScreen({ activeCall, userPhone, username, socket, onEndCall }) {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [callStatus, setCallStatus] = useState(activeCall.accepted ? 'Menghubungkan...' : 'Memanggil...');

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnection = useRef(null);

  // Fallback timeout to prevent infinite ringing
  useEffect(() => {
    let timeoutId;
    if (!activeCall.accepted && activeCall.isCaller) {
      timeoutId = setTimeout(() => {
        setCallStatus('Tidak ada jawaban');
        setTimeout(() => handleHangup(), 2000);
      }, 30000); // 30 seconds ringing timeout
    }
    return () => clearTimeout(timeoutId);
  }, [activeCall.accepted, activeCall.isCaller]);

  useEffect(() => {
    if (!socket) return;

    if (activeCall.accepted) {
      setCallStatus('Tersambung');
      initiateWebRTC();
    }
  }, [activeCall.accepted]);

  const initiateWebRTC = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: activeCall.type === 'video',
        audio: true
      });
      setLocalStream(stream);

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:global.stun.twilio.com:3478' }
        ]
      });
      peerConnection.current = pc;

      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });

      pc.ontrack = (event) => {
        setRemoteStream(event.streams[0]);
      };

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit('webrtc-ice-candidate', {
            target: activeCall.targetPhone, // For 1on1, we need to route by phone/socketid, wait.
            // In the backend, we routed `webrtc-offer` by `target`. But our fallback was socket.to(data.target) which assumes target is a socket ID or room.
            // Actually, we should route via the targetPhone logic. Let's wrap it in an object that our new backend handles.
            // Wait, we need to update server/index.js to route webrtc signals using `onlineUsers` if it's a phone number.
            // For now, let's use the room-based approach: we join a CALL-room right after accepting.
            room: activeCall.roomCode,
            candidate: event.candidate
          });
        }
      };

      // Since we join a room upon accepting, we can listen to room-based signals
      if (activeCall.isCaller) {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit('webrtc-offer', {
          target: activeCall.roomCode,
          offer: offer
        });
      }

    } catch (err) {
      console.error('Failed to access media devices:', err);
      setCallStatus('Gagal mengakses kamera/mic');
    }
  };

  useEffect(() => {
    if (!socket) return;

    const handleOffer = async (data) => {
      if (!peerConnection.current) return;
      await peerConnection.current.setRemoteDescription(new RTCSessionDescription(data.offer));
      const answer = await peerConnection.current.createAnswer();
      await peerConnection.current.setLocalDescription(answer);
      socket.emit('webrtc-answer', {
        target: activeCall.roomCode,
        answer: answer
      });
    };

    const handleAnswer = async (data) => {
      if (!peerConnection.current) return;
      await peerConnection.current.setRemoteDescription(new RTCSessionDescription(data.answer));
    };

    const handleCandidate = async (data) => {
      if (!peerConnection.current) return;
      try {
        await peerConnection.current.addIceCandidate(new RTCIceCandidate(data.candidate));
      } catch (e) {
        console.error('Error adding ICE candidate', e);
      }
    };

    socket.on('webrtc-offer', handleOffer);
    socket.on('webrtc-answer', handleAnswer);
    socket.on('webrtc-ice-candidate', handleCandidate);

    return () => {
      socket.off('webrtc-offer', handleOffer);
      socket.off('webrtc-answer', handleAnswer);
      socket.off('webrtc-ice-candidate', handleCandidate);
    };
  }, [socket, activeCall.roomCode]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  const handleHangup = () => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    if (peerConnection.current) {
      peerConnection.current.close();
    }
    socket.emit('hangup-call', { targetPhone: activeCall.targetPhone });
    if (activeCall.roomCode) {
        // Assume App.jsx pass leaveChannel or handles it via onEndCall
        onEndCall(activeCall.roomCode);
    }
  };

  const toggleMute = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
      }
    }
  };

  return (
    <div style={{ position: 'absolute', inset: 0, background: '#111', zIndex: 10000, display: 'flex', flexDirection: 'column' }}>
      
      {/* Background (If video is off or audio call) */}
      {(!remoteStream || activeCall.type !== 'video') && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 1 }}>
           <div style={{ width: 120, height: 120, borderRadius: '50%', background: '#333', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '3rem', marginBottom: '2rem' }}>
             {activeCall.callerName?.[0] || <User size={64} />}
           </div>
           <h2 style={{ color: 'white', margin: 0, fontSize: '1.8rem' }}>{activeCall.callerName}</h2>
           <p style={{ color: '#aaa', margin: '10px 0 0 0' }}>{callStatus}</p>
        </div>
      )}

      {/* Remote Video Container */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 2, background: 'black', display: (activeCall.type === 'video' && remoteStream) ? 'block' : 'none' }}>
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      </div>

      {/* Local Video PIP */}
      {activeCall.type === 'video' && localStream && !isVideoOff && (
        <div style={{ position: 'absolute', top: 40, right: 20, width: 90, height: 160, borderRadius: '12px', overflow: 'hidden', zIndex: 3, boxShadow: '0 4px 12px rgba(0,0,0,0.5)', border: '2px solid rgba(255,255,255,0.2)' }}>
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }}
          />
        </div>
      )}

      {/* Status Overlay for Video Call */}
      {activeCall.type === 'video' && remoteStream && (
        <div style={{ position: 'absolute', top: 40, left: 20, zIndex: 3 }}>
           <h2 style={{ color: 'white', margin: 0, fontSize: '1.2rem', textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>{activeCall.callerName}</h2>
           <p style={{ color: '#eee', margin: 0, fontSize: '0.8rem', textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>00:00</p>
        </div>
      )}

      {/* Controls Overlay */}
      <div style={{ position: 'absolute', bottom: 40, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: '1.5rem', zIndex: 10 }}>
        <button 
          onClick={toggleMute}
          style={{ width: 60, height: 60, borderRadius: '50%', background: isMuted ? 'white' : 'rgba(255,255,255,0.2)', color: isMuted ? '#111' : 'white', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', backdropFilter: 'blur(10px)' }}
        >
          {isMuted ? <MicOff size={28} /> : <Mic size={28} />}
        </button>

        {activeCall.type === 'video' && (
          <button 
            onClick={toggleVideo}
            style={{ width: 60, height: 60, borderRadius: '50%', background: isVideoOff ? 'white' : 'rgba(255,255,255,0.2)', color: isVideoOff ? '#111' : 'white', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', backdropFilter: 'blur(10px)' }}
          >
            {isVideoOff ? <VideoOff size={28} /> : <VideoIcon size={28} />}
          </button>
        )}

        <button 
          onClick={handleHangup}
          style={{ width: 60, height: 60, borderRadius: '50%', background: '#ff3b30', color: 'white', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 4px 12px rgba(255, 59, 48, 0.4)' }}
        >
          <PhoneOff size={28} />
        </button>
      </div>
    </div>
  );
}
