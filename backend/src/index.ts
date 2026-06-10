import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import authRoutes from './routes/auth';
import productRoutes from './routes/products';
import orderRoutes from './routes/orders';
import transactionRoutes from './routes/transactions';
import mailRoutes from './routes/mail';
import fileRoutes from './routes/files';
import morgan from 'morgan';
import profileRoutes from './routes/profile';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 dakika
  max: 100, // maksimum 100 istek
  message: { error: 'Çok fazla istek gönderildi, lütfen bekleyin' }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10, // auth endpoint'lerine 15 dakikada max 10 istek
  message: { error: 'Çok fazla giriş denemesi, lütfen bekleyin' }
});

app.use(limiter);
app.use('/auth', authLimiter, authRoutes);
app.use('/products', productRoutes);
app.use('/orders', orderRoutes);
app.use('/transactions', transactionRoutes);
app.use('/mail', mailRoutes);
app.use('/files', fileRoutes);
app.use('/profile', profileRoutes);


app.get('/healthz', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});