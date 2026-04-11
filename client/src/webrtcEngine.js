export class WebRTCMesh {
  constructor(socket, onTrackAdded, onTrackRemoved) {
    this.socket = socket;
    this.peers = {}; // targetSocketId -> RTCPeerConnection
    this.localStream = null;
    this.onTrackAdded = onTrackAdded;
    this.onTrackRemoved = onTrackRemoved;

    this.handleOffer = this.handleOffer.bind(this);
    this.handleAnswer = this.handleAnswer.bind(this);
    this.handleIceCandidate = this.handleIceCandidate.bind(this);

    // Bind listeners
    this.socket.on('webrtc-offer', this.handleOffer);
    this.socket.on('webrtc-answer', this.handleAnswer);
    this.socket.on('webrtc-ice-candidate', this.handleIceCandidate);

    // Audio Visualizer hooks
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    this.audioCtx = new AudioContextClass();
    
    this.micAnalyser = this.audioCtx.createAnalyser();
    this.micAnalyser.fftSize = 64;
    this.micAnalyser.smoothingTimeConstant = 0.5;

    this.receiverAnalyser = this.audioCtx.createAnalyser();
    this.receiverAnalyser.fftSize = 64;
    this.receiverAnalyser.smoothingTimeConstant = 0.5;

    // Mix all remote streams into one analyser
    this.remoteMixer = this.audioCtx.createGain();
    this.remoteMixer.connect(this.receiverAnalyser);
    
    // We must connect analysers to a silent destination to keep them active in some browsers
    const silentGain = this.audioCtx.createGain();
    silentGain.gain.value = 0;
    this.micAnalyser.connect(silentGain);
    this.receiverAnalyser.connect(silentGain);
    silentGain.connect(this.audioCtx.destination);

    this.remoteSources = {}; // targetId -> MediaStreamAudioSourceNode
  }

  getMicAnalyser() { return this.micAnalyser; }
  getReceiverAnalyser() { return this.receiverAnalyser; }

  async initLocalStream() {
    if (!this.localStream) {
      try {
        this.localStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            channelCount: 1,
            sampleRate: 48000, // Best quality Opus audio natively
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        });
        // Start muted (PTT off)
        this.localStream.getAudioTracks().forEach(t => t.enabled = false);

        if (this.audioCtx.state === 'suspended') this.audioCtx.resume();
        const source = this.audioCtx.createMediaStreamSource(this.localStream);
        source.connect(this.micAnalyser);
      } catch (err) {
        console.error('Failed to get mic for WebRTC:', err);
      }
    }
    return this.localStream;
  }

  setMute(isMuted) {
    if (this.localStream) {
       this.localStream.getAudioTracks().forEach(t => {
           t.enabled = !isMuted;
       });
    }
  }

  createPeer(targetId) {
    if (this.peers[targetId]) return this.peers[targetId];

    const peer = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stundelay.l.google.com:19302' }
      ]
    });

    if (this.localStream) {
      this.localStream.getTracks().forEach(track => peer.addTrack(track, this.localStream));
    }

    peer.onicecandidate = (event) => {
      if (event.candidate) {
        this.socket.emit('webrtc-ice-candidate', { target: targetId, candidate: event.candidate });
      }
    };

    peer.ontrack = (event) => {
      const stream = event.streams[0];
      
      if (this.audioCtx.state === 'suspended') this.audioCtx.resume();
      const remoteSource = this.audioCtx.createMediaStreamSource(stream);
      remoteSource.connect(this.remoteMixer);
      this.remoteSources[targetId] = remoteSource;

      this.onTrackAdded(targetId, stream);
    };

    peer.onconnectionstatechange = () => {
      if (peer.connectionState === 'failed' || peer.connectionState === 'disconnected' || peer.connectionState === 'closed') {
        this.removePeer(targetId);
      }
    };

    this.peers[targetId] = peer;
    return peer;
  }

  async sendOffer(targetId) {
    const peer = this.createPeer(targetId);
    try {
      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);
      this.socket.emit('webrtc-offer', { target: targetId, offer });
    } catch (e) {
      console.error('Error creating offer', e);
    }
  }

  async handleOffer(data) {
    const peer = this.createPeer(data.senderId);
    try {
      await peer.setRemoteDescription(new RTCSessionDescription(data.offer));
      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);
      this.socket.emit('webrtc-answer', { target: data.senderId, answer });
    } catch (e) {
      console.error('Error handling offer', e);
    }
  }

  async handleAnswer(data) {
    const peer = this.peers[data.senderId];
    if (peer) {
      try {
        await peer.setRemoteDescription(new RTCSessionDescription(data.answer));
      } catch (e) {
        console.error('Error handling answer', e);
      }
    }
  }

  async handleIceCandidate(data) {
    const peer = this.peers[data.senderId];
    if (peer && data.candidate) {
      try {
        await peer.addIceCandidate(new RTCIceCandidate(data.candidate));
      } catch (e) {
        console.error('Error handling ice candidate', e);
      }
    }
  }

  removePeer(targetId) {
    const peer = this.peers[targetId];
    if (peer) {
      peer.close();
      delete this.peers[targetId];
    }
    if (this.remoteSources[targetId]) {
      this.remoteSources[targetId].disconnect();
      delete this.remoteSources[targetId];
    }
    this.onTrackRemoved(targetId);
  }

  destroy() {
    this.socket.off('webrtc-offer', this.handleOffer);
    this.socket.off('webrtc-answer', this.handleAnswer);
    this.socket.off('webrtc-ice-candidate', this.handleIceCandidate);
    
    Object.keys(this.peers).forEach(id => this.removePeer(id));
    if (this.localStream) {
      this.localStream.getTracks().forEach(t => t.stop());
      this.localStream = null;
    }
  }
}
