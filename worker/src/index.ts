import dotenv from 'dotenv';
import { Pool } from 'pg';
import cron from 'node-cron';
import { lowStockQueue } from './queue';
import { sendLowStockMail } from './mailer';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

console.log('Worker başlatıldı, kuyruk dinleniyor...');

// Kuyruktaki işleri dinle
lowStockQueue.process(async (job) => {
  console.log('İş alındı:', job.data);

  const { userId, userEmail } = job.data;

  try {
    const result = await pool.query(
      `SELECT name, quantity, category 
       FROM products 
       WHERE user_id = $1 AND quantity <= 5
       ORDER BY quantity ASC`,
      [userId]
    );

    if (result.rows.length === 0) {
      console.log(`Kullanıcı ${userId} için kritik stok yok`);
      return;
    }

    console.log(`${result.rows.length} kritik ürün bulundu, mail gönderiliyor...`);
    await sendLowStockMail(userEmail, result.rows);
    console.log(`Mail gönderildi: ${userEmail}`);
  } catch (err) {
    console.error('Worker hatası:', err);
    throw err;
  }
});

// Her gün sabah 9'da çalışır
cron.schedule('0 9 * * *', async () => {
  console.log('Sabah 9 cronjob başladı — kritik stok kontrolü yapılıyor...');

  try {
    // Email adresi olan tüm kullanıcıları çek
    const users = await pool.query(
      `SELECT DISTINCT u.id, u.email 
       FROM users u
       INNER JOIN products p ON p.user_id = u.id
       WHERE p.quantity <= 5 AND u.email IS NOT NULL`
    );

    if (users.rows.length === 0) {
      console.log('Kritik stoklu kullanıcı bulunamadı');
      return;
    }

    for (const user of users.rows) {
      await lowStockQueue.add({
        userId: user.id,
        userEmail: user.email,
      });
      console.log(`Kuyruğa eklendi: kullanıcı ${user.id}`);
    }

    console.log(`${users.rows.length} kullanıcı için iş kuyruğa eklendi`);
  } catch (err) {
    console.error('Cronjob hatası:', err);
  }
}, {
  timezone: 'Europe/Istanbul'
});

// Hata yönetimi
lowStockQueue.on('completed', (job) => {
  console.log(`İş tamamlandı: ${job.id}`);
});

lowStockQueue.on('failed', (job, err) => {
  console.error(`İş başarısız: ${job.id}`, err);
});