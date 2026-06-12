process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:5433/inventory_db';
import request from 'supertest';
import express from 'express';
import cors from 'cors';
import authRoutes from '../routes/auth';
import pool from '../db';

const app = express();
app.use(cors());
app.use(express.json());
app.use('/auth', authRoutes);

afterAll(async () => {
  await pool.end();
});

describe('Auth Endpoints', () => {

  // Test 1 — Kayıt
  it('Yeni kullanıcı kaydı başarılı olmalı', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({
        username: `testuser_${Date.now()}`,
        password: '1234',
      });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('token');
  });

  // Test 2 — Kısa kullanıcı adı
  it('Kısa kullanıcı adında 400 dönmeli', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({ username: 'ab', password: '1234' });
    expect(res.status).toBe(400);
  });

  // Test 3 — Yanlış şifre
  it('Yanlış şifrede 401 dönmeli', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ username: 'emre', password: 'yanlis_sifre' });
    expect(res.status).toBe(401);
  });

  // Test 4 — Olmayan kullanıcı
  it('Olmayan kullanıcıda 401 dönmeli', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ username: 'hicyok123', password: '1234' });
    expect(res.status).toBe(401);
  });

  // Test 5 — Token olmadan ürünlere erişim
  it('Token olmadan /products\'a erişim 401 dönmeli', async () => {
    const productApp = express();
    productApp.use(express.json());
    const { default: productRoutes } = await import('../routes/products');
    productApp.use('/products', productRoutes);

    const res = await request(productApp).get('/products');
    expect(res.status).toBe(401);
  });

});