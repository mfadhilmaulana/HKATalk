const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());

// Serve static files from the React frontend build
app.use(express.static(path.join(__dirname, '../client/dist')));

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

const PORT = process.env.PORT || 3001;

// Keep track of users in channels
// Optional but helps in broadcasting presence
const channels = {}; 

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join-channel', ({ channel, username }) => {
    // Leave previous rooms
    Array.from(socket.rooms).forEach(room => {
      if (room !== socket.id) socket.leave(room);
    });

    socket.join(channel);
    socket.data.username = username || 'Anonymous';
    socket.data.channel = channel;
    
    if (!channels[channel]) {
      channels[channel] = new Set();
    }
    channels[channel].add(socket.id);

    console.log(`${socket.data.username} joined channel: ${channel}`);
    
    // Notify others in the room
    socket.to(channel).emit('user-joined', { username: socket.data.username, id: socket.id });
    
    // Send current participants to the user
    const participants = Array.from(channels[channel]).map(id => {
      const s = io.sockets.sockets.get(id);
      return { id, username: s ? s.data.username : 'Unknown' };
    });
    
    socket.emit('channel-info', { channel, participants });
  });

  // WebRTC Signals
  socket.on('webrtc-offer', (data) => {
    socket.to(data.target).emit('webrtc-offer', { ...data, senderId: socket.id, username: socket.data.username });
  });

  socket.on('webrtc-answer', (data) => {
    socket.to(data.target).emit('webrtc-answer', { ...data, senderId: socket.id });
  });

  socket.on('webrtc-ice-candidate', (data) => {
    socket.to(data.target).emit('webrtc-ice-candidate', { ...data, senderId: socket.id });
  });

  socket.on('sos-alert', () => {
    if (socket.data.channel) {
      socket.to(socket.data.channel).emit('sos-alert', { username: socket.data.username });
    }
  });

  socket.on('audio-stream', (audioData) => {
    // Broadcast the audio chunk to all other users in the same room using binary streaming
    if (socket.data.channel) {
      socket.to(socket.data.channel).emit('audio-stream', {
        audioData: audioData,
        username: socket.data.username,
        id: socket.id,
      });
    }
  });

  socket.on('video-frame', (data) => {
    if (socket.data.channel) {
      // Relay compressed JPEG frame to everyone else in the channel
      socket.to(socket.data.channel).emit('video-frame', {
        username: socket.data.username,
        frame: data.frame,
        id: socket.id
      });
    }
  });

  socket.on('chat-message', (data) => {
    if (socket.data.channel) {
      socket.to(socket.data.channel).emit('chat-message', {
        ...data,
        username: socket.data.username,
        id: socket.id,
        timestamp: new Date().toISOString()
      });
    }
  });

  socket.on('disconnecting', () => {
    if (socket.data.channel && channels[socket.data.channel]) {
      channels[socket.data.channel].delete(socket.id);
      socket.to(socket.data.channel).emit('user-left', { id: socket.id, username: socket.data.username });
    }
  });

  socket.on('disconnect', () => {
    // console.log('User disconnected:', socket.id);
  });
});

// React routing fallback
app.use((req, res) => {
  res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

server.listen(PORT, () => {
  console.log(`HKATalk Server running on port ${PORT}`);
});
