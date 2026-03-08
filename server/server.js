const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { saveMessage, getRecentMessages, togglePinMessage } = require('./database');

const app = express();
const server = http.createServer(app);

// Allow requests from Vite dev server
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST']
}));

app.use(express.json());

// Ensure uploads directory exists (it's gitignored, won't be present on fresh deploys)
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Serve static uploaded files
app.use('/uploads', express.static(uploadsDir));

// In production, serve the built React app
const clientDistPath = path.join(__dirname, '..', 'client', 'dist');
app.use(express.static(clientDistPath));

const SHARED_PASSWORD = 'cimento2026';

// Set up Multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

// REST endpoints
app.post('/api/login', (req, res) => {
  const { password, nickname } = req.body;
  if (!password || !nickname) {
    return res.status(400).json({ error: 'Password and nickname are required' });
  }
  if (password !== SHARED_PASSWORD) {
    return res.status(401).json({ error: 'Incorrect password' });
  }
  res.json({ success: true, message: 'Logged in successfully' });
});

// File upload endpoint
app.post('/api/upload', upload.single('file'), (req, res) => {
  const { password, nickname, type } = req.body;
  if (password !== SHARED_PASSWORD) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const replyToId = req.body.reply_to_id || null;
  const filePath = '/uploads/' + req.file.filename;

  saveMessage(type, filePath, nickname, replyToId, (err, msg) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to save message' });
    }
    // Broadcast the file message to all connected clients
    io.emit('new_message', msg);
    res.json({ success: true, message: msg });
  });
});

// Socket.io Setup
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Authentication middleware for sockets
io.use((socket, next) => {
  const password = socket.handshake.auth.password;
  const nickname = socket.handshake.auth.nickname;
  if (password === SHARED_PASSWORD && nickname) {
    socket.nickname = nickname;
    next();
  } else {
    next(new Error('Authentication error'));
  }
});

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.nickname} (${socket.id})`);

  // Send the last 50 messages upon connection
  getRecentMessages(50, (err, messages) => {
    if (!err) {
      socket.emit('chat_history', messages);
    }
  });

  // Listen for new text messages
  socket.on('send_message', (payload) => {
    // payload can be a string (old client) or object { content, reply_to_id }
    const content = typeof payload === 'string' ? payload : payload.content;
    const replyToId = typeof payload === 'object' ? payload.reply_to_id : null;

    saveMessage('text', content, socket.nickname, replyToId, (err, msg) => {
      if (!err) {
        // Broadcast the message to everyone
        io.emit('new_message', msg);
      }
    });
  });

  // Listen for pin toggles
  socket.on('toggle_pin', ({ id, isPinned }) => {
    togglePinMessage(id, isPinned, (err, msg) => {
      if (!err && msg) {
        io.emit('message_updated', msg);
      }
    });
  });

  // Listen for like toggles
  socket.on('toggle_like', (id) => {
    const { toggleLikeMessage } = require('./database');
    toggleLikeMessage(id, socket.nickname, (err, msg) => {
      if (!err && msg) {
        io.emit('message_updated', msg);
      }
    });
  });

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.nickname}`);
  });
});

// Catch-all: serve React app for any non-API route (SPA support)
app.get('{*path}', (req, res) => {
  res.sendFile(path.join(clientDistPath, 'index.html'));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
