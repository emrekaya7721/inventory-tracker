# Inventory Tracker

Kullanıcı bazlı stok takip uygulaması. JWT kimlik doğrulama, Docker Compose ile çalışır.

## Teknolojiler

- **Frontend:** Vue 3 + TypeScript + Pinia + Vue Router
- **Backend:** Node.js + Express + TypeScript + Zod
- **Veritabanı:** PostgreSQL
- **Auth:** JWT + bcrypt
- **Containerization:** Docker Compose

## Özellikler

- Kullanıcı kaydı ve girişi (JWT)
- Ürün CRUD işlemleri (kullanıcı bazlı)
- Dashboard — istatistikler ve kategori dağılımı
- Stok uyarısı (kritik / tükendi)
- Hızlı stok güncelleme (+/-)
- Stok hareket geçmişi
- Arama ve kategori filtresi
- Rate limiting ve input validation

## Kurulum

### 1. Repoyu klonla

```bash
git clone <repo-url>
cd inventory-tracker
```

### 2. .env dosyasını hazırla

`backend/.env` dosyası oluştur:

```env
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/inventory_db
JWT_SECRET=super_secret_key_123
PORT=3000
VITE_API_URL=http://localhost:3000
```

### 3. Docker Compose ile çalıştır

```bash
docker compose up --build
```

| Servis     | URL                   |
| ---------- | --------------------- |
| Frontend   | http://localhost:5173 |
| Backend    | http://localhost:3000 |
| PostgreSQL | localhost:5433        |

## API Dokümantasyonu

### Auth

| Method | Endpoint        | Açıklama         |
| ------ | --------------- | ---------------- |
| POST   | /auth/register  | Kullanıcı kaydı  |
| POST   | /auth/login     | Kullanıcı girişi |

**Request body:**
```json
{
  "username": "emre",
  "password": "1234"
}
```

**Response:**
```json
{
  "token": "eyJhbGci..."
}
```

### Products

> Tüm endpoint'ler `Authorization: Bearer <token>` header'ı gerektirir.

| Method | Endpoint                  | Açıklama            |
| ------ | ------------------------- | ------------------- |
| GET    | /products                 | Ürünleri listele    |
| POST   | /products                 | Ürün oluştur        |
| PUT    | /products/:id             | Ürün güncelle       |
| DELETE | /products/:id             | Ürün sil            |
| PATCH  | /products/:id/stock       | Stok güncelle       |
| GET    | /products/:id/movements   | Stok geçmişi        |

**Ürün request body:**
```json
{
  "name": "Laptop",
  "description": "Dell XPS 15",
  "quantity": 10,
  "category": "Elektronik"
}
```

**Stok güncelleme:**
```json
{
  "change": 1,
  "note": "Yeni teslimat"
}
```

## Healthcheck

```
GET http://localhost:3000/healthz
```

```json
{ "status": "ok" }
```

## Test & Debug

```bash
# Logları görüntüle
docker compose logs backend
docker compose logs postgres

# Veritabanına bağlan
docker compose exec postgres psql -U postgres -d inventory_db

# Servisleri durdur
docker compose down

# Servisleri durdur ve veritabanını sıfırla
docker compose down -v
```