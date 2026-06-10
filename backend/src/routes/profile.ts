import { Router, Response } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import pool from '../db';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticate);

// Profil bilgilerini getir
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      'SELECT id, username, email, created_at FROM users WHERE id = $1',
      [req.userId]
    );
    res.json(result.rows[0]);
  } catch {
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// Profil güncelle
router.put('/', async (req: AuthRequest, res: Response) => {
  const schema = z.object({
    username: z.string().min(3).max(50).optional(),
    email: z.string().email().optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }

  const { username, email } = parsed.data;

  try {
    if (username) {
      const existing = await pool.query(
        'SELECT id FROM users WHERE username = $1 AND id != $2',
        [username, req.userId]
      );
      if (existing.rows.length > 0) {
        return res.status(400).json({ error: 'Bu kullanıcı adı zaten alınmış' });
      }
    }

    const result = await pool.query(
      `UPDATE users SET 
        username = COALESCE($1, username),
        email = COALESCE($2, email)
       WHERE id = $3 RETURNING id, username, email`,
      [username || null, email || null, req.userId]
    );

    res.json(result.rows[0]);
  } catch {
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// Şifre değiştir
router.put('/password', async (req: AuthRequest, res: Response) => {
  const schema = z.object({
    currentPassword: z.string().min(4),
    newPassword: z.string().min(4, 'Yeni şifre en az 4 karakter olmalı'),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }

  const { currentPassword, newPassword } = parsed.data;

  try {
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [req.userId]);
    const user = result.rows[0];

    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) {
      return res.status(400).json({ error: 'Mevcut şifre hatalı' });
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users SET password = $1 WHERE id = $2', [hashed, req.userId]);

    res.json({ message: 'Şifre güncellendi' });
  } catch {
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

export default router;