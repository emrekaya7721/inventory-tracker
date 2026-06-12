import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';
import { createServer } from 'http';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import authRoutes from './routes/auth';
import productRoutes from './routes/products';
import orderRoutes from './routes/orders';
import transactionRoutes from './routes/transactions';
import mailRoutes from './routes/mail';
import fileRoutes from './routes/files';
import profileRoutes from './routes/profile';
import importRoutes from './routes/import';
import jobRoutes from './routes/jobs';

dotenv.config();

const app = express();
const httpServer = createServer(app);

// Socket.io kurulumu
import { initSocket } from './socket';

const io = initSocket(httpServer);

// Socket.io JWT doğrulama
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    return next(new Error('Token gerekli'));
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { userId: number };
    socket.data.userId = decoded.userId;
    next();
  } catch {
    next(new Error('Geçersiz token'));
  }
});

// Bağlantı yönetimi
io.on('connection', (socket) => {
  const userId = socket.data.userId;
  console.log(`Socket bağlandı: userId=${userId}`);

  // Kullanıcıya özel odaya katıl
  socket.join(`user:${userId}`);

  socket.on('disconnect', () => {
    console.log(`Socket ayrıldı: userId=${userId}`);
  });
});

const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Çok fazla istek gönderildi, lütfen bekleyin' }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Çok fazla giriş denemesi, lütfen bekleyin' }
});

app.use('/import', importRoutes);
app.use(limiter);
app.use('/auth', authLimiter, authRoutes);
app.use('/products', productRoutes);
app.use('/orders', orderRoutes);
app.use('/transactions', transactionRoutes);
app.use('/mail', mailRoutes);
app.use('/files', fileRoutes);
app.use('/profile', profileRoutes);
app.use('/jobs', jobRoutes);

app.get('/healthz', (req, res) => {
  res.json({ status: 'ok' });
});

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});