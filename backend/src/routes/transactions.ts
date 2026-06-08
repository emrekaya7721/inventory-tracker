import { Router, Response } from 'express';
import pool from '../db';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT * FROM transactions 
       WHERE user_id = $1 
       ORDER BY created_at DESC`,
      [req.userId]
    );

    const summary = await pool.query(
      `SELECT 
        COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as total_income,
        COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as total_expense
       FROM transactions 
       WHERE user_id = $1`,
      [req.userId]
    );

    const { total_income, total_expense } = summary.rows[0];

    res.json({
      transactions: result.rows,
      summary: {
        total_income: parseFloat(total_income),
        total_expense: parseFloat(total_expense),
        net: parseFloat(total_income) - parseFloat(total_expense)
      }
    });
  } catch {
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

export default router;