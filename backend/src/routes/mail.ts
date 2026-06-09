import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { lowStockQueue } from '../queue';
import pool from '../db';

const router = Router();
router.use(authenticate);

// Kritik stok mail gönder
router.post('/low-stock', async (req: AuthRequest, res: Response) => {
  try {
    const userResult = await pool.query(
      'SELECT id, username FROM users WHERE id = $1',
      [req.userId]
    );

    const user = userResult.rows[0];
    if (!user) {
      return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
    }

    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email adresi gerekli' });
    }

    // Kuyruğa iş ekle
    await lowStockQueue.add({
      userId: req.userId,
      userEmail: email,
    });

    res.json({ message: 'Mail kuyruğa eklendi, kısa süre içinde gönderilecek' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

export default router;