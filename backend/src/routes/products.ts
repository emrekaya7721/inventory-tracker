import { Router, Response } from 'express';
import { z } from 'zod';
import pool from '../db';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

router.use(authenticate);

const productSchema = z.object({
  name: z.string().min(1, 'Ürün adı gerekli').max(255),
  description: z.string().max(1000).optional(),
  quantity: z.number().int().min(0, 'Stok adedi 0 veya daha fazla olmalı'),
  category: z.string().min(1, 'Kategori gerekli').max(100),
});

// Stok geçmişi
router.get('/:id/movements', async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  try {
    const product = await pool.query(
      'SELECT id FROM products WHERE id = $1 AND user_id = $2',
      [id, req.userId]
    );

    if (product.rows.length === 0) {
      return res.status(404).json({ error: 'Ürün bulunamadı' });
    }

    const result = await pool.query(
      `SELECT * FROM stock_movements 
       WHERE product_id = $1 
       ORDER BY created_at DESC 
       LIMIT 50`,
      [id]
    );

    res.json(result.rows);
  } catch {
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// Tüm ürünleri listele
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      'SELECT * FROM products WHERE user_id = $1 ORDER BY created_at DESC',
      [req.userId]
    );
    res.json(result.rows);
  } catch {
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// Ürün oluştur
router.post('/', async (req: AuthRequest, res: Response) => {
  const parsed = productSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }

  const { name, description, quantity, category } = parsed.data;

  try {
    const result = await pool.query(
      'INSERT INTO products (name, description, quantity, category, user_id) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [name, description, quantity, category, req.userId]
    );
    res.status(201).json(result.rows[0]);
  } catch {
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// Ürün güncelle
router.put('/:id', async (req: AuthRequest, res: Response) => {
  const parsed = productSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }

  const { name, description, quantity, category } = parsed.data;
  const { id } = req.params;

  try {
    const result = await pool.query(
      'UPDATE products SET name=$1, description=$2, quantity=$3, category=$4 WHERE id=$5 AND user_id=$6 RETURNING *',
      [name, description, quantity, category, id, req.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Ürün bulunamadı' });
    }

    res.json(result.rows[0]);
  } catch {
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// Hızlı stok güncelleme
router.patch('/:id/stock', async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { change, note } = req.body;

  try {
    const result = await pool.query(
      `UPDATE products 
       SET quantity = GREATEST(0, quantity + $1) 
       WHERE id = $2 AND user_id = $3 
       RETURNING *`,
      [change, id, req.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Ürün bulunamadı' });
    }

    const updated = result.rows[0];

    await pool.query(
      `INSERT INTO stock_movements (product_id, user_id, change, quantity_after, note)
       VALUES ($1, $2, $3, $4, $5)`,
      [id, req.userId, change, updated.quantity, note || null]
    );

    res.json(updated);
  } catch {
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// Ürün sil
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      'DELETE FROM products WHERE id=$1 AND user_id=$2 RETURNING *',
      [id, req.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Ürün bulunamadı' });
    }

    res.json({ message: 'Ürün silindi' });
  } catch {
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

export default router;