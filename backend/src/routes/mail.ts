import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { lowStockQueue } from '../queue';
import pool from '../db';

const router = Router();
router.use(authenticate);

router.post('/low-stock', async (req: AuthRequest, res: Response) => {
  try {
    const userResult = await pool.query(
      'SELECT id, username, email FROM users WHERE id = $1',
      [req.userId]
    );

    const user = userResult.rows[0];
    if (!user) {
      return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
    }

    if (!user.email) {
      return res.status(400).json({ error: 'Mail göndermek için önce profil sayfasından email adresinizi ekleyin' });
    }

    await lowStockQueue.add({
      userId: req.userId,
      userEmail: user.email,
    });

    res.json({ message: `Mail ${user.email} adresine gönderilecek` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});


export default router;