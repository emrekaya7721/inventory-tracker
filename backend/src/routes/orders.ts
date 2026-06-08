import { Router, Response } from 'express';
import { z } from 'zod';
import pool from '../db';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticate);

const orderSchema = z.object({
  product_id: z.number().int().positive(),
  type: z.enum(['incoming', 'outgoing']),
  quantity: z.number().int().positive('Miktar 0\'dan büyük olmalı'),
  note: z.string().max(255).optional(),
});

// Siparişleri listele
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT o.*, p.name as product_name 
       FROM orders o
       JOIN products p ON o.product_id = p.id
       WHERE o.user_id = $1
       ORDER BY o.created_at DESC`,
      [req.userId]
    );
    res.json(result.rows);
  } catch {
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// Sipariş oluştur
router.post('/', async (req: AuthRequest, res: Response) => {
  const parsed = orderSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }

  const { product_id, type, quantity, note } = parsed.data;

  try {
    const product = await pool.query(
      'SELECT * FROM products WHERE id = $1 AND user_id = $2',
      [product_id, req.userId]
    );

    if (product.rows.length === 0) {
      return res.status(404).json({ error: 'Ürün bulunamadı' });
    }

    if (type === 'outgoing' && product.rows[0].quantity < quantity) {
      return res.status(400).json({ error: 'Yetersiz stok' });
    }

    const result = await pool.query(
      `INSERT INTO orders (product_id, user_id, type, quantity, note)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [product_id, req.userId, type, quantity, note || null]
    );

    res.status(201).json(result.rows[0]);
  } catch {
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// Sipariş tamamla
router.patch('/:id/complete', async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  try {
    const order = await pool.query(
      'SELECT * FROM orders WHERE id = $1 AND user_id = $2',
      [id, req.userId]
    );

    if (order.rows.length === 0) {
      return res.status(404).json({ error: 'Sipariş bulunamadı' });
    }

    if (order.rows[0].status !== 'pending') {
      return res.status(400).json({ error: 'Sipariş zaten tamamlandı veya iptal edildi' });
    }

    const o = order.rows[0];
    const change = o.type === 'incoming' ? o.quantity : -o.quantity;

    const product = await pool.query(
      'SELECT * FROM products WHERE id = $1',
      [o.product_id]
    );
    const p = product.rows[0];

    // Stok güncelle
    await pool.query(
      'UPDATE products SET quantity = GREATEST(0, quantity + $1) WHERE id = $2',
      [change, o.product_id]
    );

    // Stok hareketi kaydet
    await pool.query(
      `INSERT INTO stock_movements (product_id, user_id, change, quantity_after, note)
       SELECT $1, $2, $3, quantity, $4 FROM products WHERE id = $1`,
      [o.product_id, req.userId, change, `Sipariş #${id} tamamlandı`]
    );

    // Alış mı satış mı — fiyatı ona göre belirle
    const amount = o.type === 'outgoing'
      ? p.selling_price * o.quantity
      : p.purchase_price * o.quantity;

    const transactionType = o.type === 'outgoing' ? 'income' : 'expense';

    const description = o.type === 'outgoing'
      ? `${p.name} satışı — ${o.quantity} adet x ${p.selling_price} TL`
      : `${p.name} alımı — ${o.quantity} adet x ${p.purchase_price} TL`;

    // Finansal işlem kaydet
    await pool.query(
      `INSERT INTO transactions (order_id, user_id, type, amount, description)
       VALUES ($1, $2, $3, $4, $5)`,
      [id, req.userId, transactionType, amount, description]
    );

    // Siparişi tamamla
    const result = await pool.query(
      `UPDATE orders SET status = 'completed' WHERE id = $1 RETURNING *`,
      [id]
    );

    res.json({ ...result.rows[0], amount, transactionType });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// Sipariş iptal et
router.patch('/:id/cancel', async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `UPDATE orders SET status = 'cancelled' 
       WHERE id = $1 AND user_id = $2 AND status = 'pending'
       RETURNING *`,
      [id, req.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Sipariş bulunamadı veya zaten işleme alındı' });
    }

    res.json(result.rows[0]);
  } catch {
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

export default router;