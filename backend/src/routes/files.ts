import { Router, Response, Request } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import pool from '../db';
import axios from 'axios';

const router = Router();
const FILE_SERVICE_URL = process.env.FILE_SERVICE_URL || 'http://file-service:4000';

router.use(authenticate);

// Ürünleri PDF olarak indir
router.get('/products/pdf', async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      'SELECT name, category, quantity, purchase_price, selling_price FROM products WHERE user_id = $1 ORDER BY created_at DESC',
      [req.userId]
    );

    const headers = ['Ürün Adı', 'Kategori', 'Stok', 'Alış Fiyatı', 'Satış Fiyatı'];
    const rows = result.rows.map(p => [
      p.name,
      p.category,
      p.quantity,
      `${parseFloat(p.purchase_price).toFixed(2)} TL`,
      `${parseFloat(p.selling_price).toFixed(2)} TL`,
    ]);

    const response = await axios.post(
      `${FILE_SERVICE_URL}/generate/pdf`,
      { title: 'Ürün Listesi', headers, rows },
      { responseType: 'stream' }
    );

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="urunler.pdf"');
    response.data.pipe(res);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'PDF oluşturulamadı' });
  }
});

// Ürünleri Excel olarak indir
router.get('/products/excel', async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      'SELECT name, category, quantity, purchase_price, selling_price FROM products WHERE user_id = $1 ORDER BY created_at DESC',
      [req.userId]
    );

    const headers = ['Ürün Adı', 'Kategori', 'Stok', 'Alış Fiyatı', 'Satış Fiyatı'];
    const rows = result.rows.map(p => [
      p.name,
      p.category,
      p.quantity,
      parseFloat(p.purchase_price),
      parseFloat(p.selling_price),
    ]);

    const response = await axios.post(
      `${FILE_SERVICE_URL}/generate/excel`,
      { title: 'Urun Listesi', headers, rows },
      { responseType: 'arraybuffer' }
    );

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="urunler.xlsx"');
    res.send(response.data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Excel oluşturulamadı' });
  }
});
router.get('/products/csv', async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      'SELECT name, category, quantity, purchase_price, selling_price FROM products WHERE user_id = $1 ORDER BY created_at DESC',
      [req.userId]
    );

    const headers = ['Urun Adi', 'Kategori', 'Stok', 'Alis Fiyati', 'Satis Fiyati'];
    const rows = result.rows.map(p => [
      p.name,
      p.category,
      p.quantity,
      parseFloat(p.purchase_price),
      parseFloat(p.selling_price),
    ]);

    const response = await axios.post(
      `${FILE_SERVICE_URL}/generate/csv`,
      { title: 'Urun_Listesi', headers, rows },
      { responseType: 'arraybuffer' }
    );

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="urunler.csv"');
    res.send(response.data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'CSV oluşturulamadı' });
  }
});

// Finansal rapor PDF
router.get('/transactions/pdf', async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      'SELECT type, amount, description, created_at FROM transactions WHERE user_id = $1 ORDER BY created_at DESC',
      [req.userId]
    );

    const headers = ['Tür', 'Tutar', 'Açıklama', 'Tarih'];
    const rows = result.rows.map(t => [
      t.type === 'income' ? 'Gelir' : 'Gider',
      `${parseFloat(t.amount).toFixed(2)} TL`,
      t.description || '',
      new Date(t.created_at).toLocaleDateString('tr-TR'),
    ]);

    const response = await axios.post(
      `${FILE_SERVICE_URL}/generate/pdf`,
      { title: 'Finansal Rapor', headers, rows },
      { responseType: 'stream' }
    );
    router.get('/transactions/csv', async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      'SELECT type, amount, description, created_at FROM transactions WHERE user_id = $1 ORDER BY created_at DESC',
      [req.userId]
    );

    const headers = ['Tur', 'Tutar', 'Aciklama', 'Tarih'];
    const rows = result.rows.map(t => [
      t.type === 'income' ? 'Gelir' : 'Gider',
      parseFloat(t.amount),
      t.description || '',
      new Date(t.created_at).toLocaleDateString('tr-TR'),
    ]);

    const response = await axios.post(
      `${FILE_SERVICE_URL}/generate/csv`,
      { title: 'Finans_Raporu', headers, rows },
      { responseType: 'arraybuffer' }
    );

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="finans.csv"');
    res.send(response.data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'CSV oluşturulamadı' });
  }
});

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="finans.pdf"');
    response.data.pipe(res);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'PDF oluşturulamadı' });
  }
});

export default router;