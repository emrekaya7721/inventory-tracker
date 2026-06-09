import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import pool from '../db';

const router = Router();

const authSchema = z.object({
  username: z.string().min(3, 'Kullanıcı adı en az 3 karakter olmalı').max(50),
  password: z.string().min(4, 'Şifre en az 4 karakter olmalı'),
  email: z.string().email('Geçerli bir email adresi girin').optional(),
});

router.post('/register', async (req: Request, res: Response) => {
  const parsed = authSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }

  const { username, password, email } = parsed.data;

  try {
    const existing = await pool.query('SELECT id FROM users WHERE username = $1', [username]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Bu kullanıcı adı zaten alınmış' });
    }

    const hashed = await bcrypt.hash(password, 10);
const result = await pool.query(
  'INSERT INTO users (username, password, email) VALUES ($1, $2, $3) RETURNING id',
  [username, hashed, email || null]
);
    const token = jwt.sign(
      { userId: result.rows[0].id },
      process.env.JWT_SECRET as string,
      { expiresIn: '7d' }
    );

    res.status(201).json({ token });
  } catch {
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

router.post('/login', async (req: Request, res: Response) => {
  const parsed = authSchema.safeParse(req.body);
  if (!parsed.success) {
   return res.status(400).json({ error: parsed.error.issues[0].message });
  }

  const { username, password } = parsed.data;

  try {
    const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({ error: 'Kullanıcı bulunamadı' });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ error: 'Şifre hatalı' });
    }

    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET as string,
      { expiresIn: '1h' }
    );

    res.json({ token });
  } catch (err) {
  console.error(err);
  res.status(500).json({ error: 'Sunucu hatası' });
}
});

export default router;