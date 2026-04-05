const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const { pool, initDB } = require('./db');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

const PORT = process.env.PORT || 3001;

// Initialize DB on startup
if (process.env.DATABASE_URL) {
  initDB();
} else {
  console.log('⚠️  No DATABASE_URL — running without database');
}

// ── REST API ──

// Guard: if no pool, return 503 for all API routes
app.use('/api', (req, res, next) => {
  if (!pool) return res.status(503).json({ error: 'Database belum dikonfigurasi' });
  next();
});

// Register
app.post('/api/register', async (req, res) => {
  const { phone, display_name, department } = req.body;
  if (!phone || !display_name) return res.status(400).json({ error: 'Phone dan nama wajib diisi' });
  const colors = ['#e53935','#8e24aa','#3949ab','#00897b','#f4511e','#6d4c41','#d81b60','#1565c0'];
  const avatar_color = colors[Math.floor(Math.random() * colors.length)];
  try {
    const result = await pool.query(
      `INSERT INTO users (phone, display_name, department, avatar_color) 
       VALUES ($1, $2, $3, $4) 
       ON CONFLICT (phone) DO UPDATE 
       SET display_name = EXCLUDED.display_name, department = EXCLUDED.department 
       RETURNING *`,
      [phone, display_name, department || '', avatar_color]
    );
    res.json({ user: result.rows[0] });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Login
app.post('/api/login', async (req, res) => {
  const { phone } = req.body;
  if (!phone) return res.status(400).json({ error: 'Phone wajib diisi' });
  try {
    const result = await pool.query('SELECT * FROM users WHERE phone=$1', [phone]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Nomor tidak terdaftar' });
    res.json({ user: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update profile
app.put('/api/profile', async (req, res) => {
  const { phone, display_name, department } = req.body;
  try {
    const result = await pool.query(
      'UPDATE users SET display_name=$2, department=$3 WHERE phone=$1 RETURNING *',
      [phone, display_name, department]
    );
    res.json({ user: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Search users (empty q = show all)
app.get('/api/users', async (req, res) => {
  const q = req.query.q || '';
  try {
    const sql = q 
      ? "SELECT phone, display_name, department, avatar_color FROM users WHERE display_name ILIKE $1 OR phone ILIKE $1 ORDER BY display_name LIMIT 100"
      : "SELECT phone, display_name, department, avatar_color FROM users ORDER BY display_name LIMIT 200";
    const params = q ? [`%${q}%`] : [];
    const result = await pool.query(sql, params);
    res.json({ users: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add contact (TWO-WAY: both sides see each other)
app.post('/api/contacts', async (req, res) => {
  const { owner_phone, contact_phone } = req.body;
  try {
    await pool.query('INSERT INTO contacts (owner_phone, contact_phone) VALUES ($1, $2) ON CONFLICT DO NOTHING', [owner_phone, contact_phone]);
    await pool.query('INSERT INTO contacts (owner_phone, contact_phone) VALUES ($1, $2) ON CONFLICT DO NOTHING', [contact_phone, owner_phone]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Remove contact
app.delete('/api/contacts', async (req, res) => {
  const { owner_phone, contact_phone } = req.body;
  try {
    await pool.query('DELETE FROM contacts WHERE owner_phone=$1 AND contact_phone=$2', [owner_phone, contact_phone]);
    await pool.query('DELETE FROM contacts WHERE owner_phone=$1 AND contact_phone=$2', [contact_phone, owner_phone]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get contacts
app.get('/api/contacts/:phone', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.phone, u.display_name, u.department, u.avatar_color 
       FROM contacts c JOIN users u ON c.contact_phone = u.phone 
       WHERE c.owner_phone=$1
       ORDER BY u.display_name`,
      [req.params.phone]
    );
    res.json({ contacts: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── MESSAGES API ──

// Get chat history for a room (last 100 messages)
app.get('/api/messages/:room', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT sender_phone, sender_name, msg_type, content, image, lat, lng, created_at 
       FROM messages WHERE room=$1 
       ORDER BY created_at ASC 
       LIMIT 100`,
      [req.params.room]
    );
    res.json({ messages: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Save a message
app.post('/api/messages', async (req, res) => {
  const { room, sender_phone, sender_name, msg_type, content, image, lat, lng } = req.body;
  try {
    await pool.query(
      `INSERT INTO messages (room, sender_phone, sender_name, msg_type, content, image, lat, lng) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [room, sender_phone || '', sender_name || '', msg_type || 'text', content || '', image || '', lat || 0, lng || 0]
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Online status tracking
const onlineUsers = new Map();

// Keep track of users in channels
const channels = {}; 

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join-channel', ({ channel, username }) => {
    // Leave previous rooms & gracefully clean memory
    Array.from(socket.rooms).forEach(room => {
      if (room !== socket.id) {
        socket.leave(room);
        if (channels[room]) {
          channels[room].delete(socket.id);
        }
        // Emit user-left so old participants know this socket physically left that channel
        socket.to(room).emit('user-left', { id: socket.id, username: socket.data?.username || 'Unknown' });
      }
    });

    socket.join(channel);
    socket.data.username = username || 'Anonymous';
    socket.data.channel = channel;
    
    if (!channels[channel]) {
      channels[channel] = new Set();
    } else {
      // GHOST KILLER V2 (Deduplication): Instantly terminate old ghost sockets with identical usernames
      Array.from(channels[channel]).forEach(id => {
        const existingSocket = io.sockets.sockets.get(id);
        const nameA = existingSocket?.data?.username?.trim().toLowerCase();
        const nameB = username?.trim().toLowerCase();
        if (existingSocket && nameA === nameB && id !== socket.id) {
           existingSocket.leave(channel);
           channels[channel].delete(id);
           socket.to(channel).emit('user-left', { id: id, username: existingSocket.data.username });
           existingSocket.disconnect(true); // Terminate immediately
        }
      });
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

// Serve static files AFTER API routes
app.use(express.static(path.join(__dirname, '../client/dist')));

// React SPA fallback — only for non-API routes
app.use((req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'API route not found' });
  }
  res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

server.listen(PORT, () => {
  console.log(`HKATalk Server running on port ${PORT}`);
});
