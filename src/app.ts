import express from 'express';
import cors from 'cors';
import { Server } from 'socket.io';
import { createServer } from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { DocumentService } from './services/DocumentService';
import { uploadRouter } from './routes/upload';
import { downloadRouter } from './routes/download';
import { filesRouter } from './routes/files';

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static(path.join(__dirname, '../public')));

// Set default encoding for file operations
process.env.NODE_OPTIONS = '--max-old-space-size=4096';
if (!process.env.LANG) {
  process.env.LANG = 'en_US.UTF-8';
}
if (!process.env.LC_ALL) {
  process.env.LC_ALL = 'en_US.UTF-8';
}

// Initialize document service with socket.io for real-time updates
const documentService = new DocumentService(io);

// Routes
app.use('/api/upload', uploadRouter(documentService));
app.use('/api/download', downloadRouter(documentService));
app.use('/api/files', filesRouter(documentService));

// Serve upload page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`Document generator service running on port ${PORT}`);
  console.log(`Upload page available at http://localhost:${PORT}`);
});
