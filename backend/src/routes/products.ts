import { Router, Response } from 'express';
import { z } from 'zod';
import pool from '../db';
import { authenticate, AuthRequest } from '../middleware/auth';
import { getIO } from '../socket';

const router = Router();

router.use(authenticate);

const productSchema = z.object({
  name: z.string().min(1, 'Ürün adı gerekli').max(255),
  description: z.string().max(1000).optional(),
  quantity: z.number().int().min(0, 'Stok adedi 0 veya daha fazla olmalı'),
  category: z.string().min(1, 'Kategori gerekli').max(100),
  purchase_price: z.number().min(0, 'Alış fiyatı 0 veya daha fazla olmalı'),
  selling_price: z.number().min(0, 'Satış fiyatı 0 veya daha fazla olmalı'),
});

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
router.get('/', async (req: AuthRequest, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 9;
  const offset = (page - 1) * limit;

  try {
    const countResult = await pool.query(
      'SELECT COUNT(*) FROM products WHERE user_id = $1',
      [req.userId]
    );
    const total = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(total / limit);

    const result = await pool.query(
      'SELECT * FROM products WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
      [req.userId, limit, offset]
    );

    res.json({
      products: result.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });
  } catch {
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});
router.post('/', async (req: AuthRequest, res: Response) => {
  const parsed = productSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }

  const { name, description, quantity, category, purchase_price, selling_price } = parsed.data;

  try {
    const result = await pool.query(
  'INSERT INTO products (name, description, quantity, category, purchase_price, selling_price, user_id) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
  [name, description, quantity, category, purchase_price, selling_price, req.userId]
);
getIO().to(`user:${req.userId}`).emit('product:created', result.rows[0]);
    res.status(201).json(result.rows[0]);
  } catch {
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});



router.put('/:id', async (req: AuthRequest, res: Response) => {
  const parsed = productSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }

const { name, description, quantity, category, purchase_price, selling_price } = parsed.data;

  const { id } = req.params;

  try {
    const result = await pool.query(
  'UPDATE products SET name=$1, description=$2, quantity=$3, category=$4, purchase_price=$5, selling_price=$6 WHERE id=$7 AND user_id=$8 RETURNING *',
  [name, description, quantity, category, purchase_price, selling_price, id, req.userId]
);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Ürün bulunamadı' });
    }

    res.json(result.rows[0]);
  } catch {
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

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
    // Realtime güncelleme gönder
getIO().to(`user:${req.userId}`).emit('stock:updated', {
  productId: updated.id,
  quantity: updated.quantity,
  name: updated.name,
});
    


    res.json(updated);
  } catch {
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

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
  getIO().to(`user:${req.userId}`).emit('product:deleted', { id: Number(id) });
    res.json({ message: 'Ürün silindi' });
  } catch {
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

export default router;