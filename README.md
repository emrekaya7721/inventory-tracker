# Inventory Tracker

Kullanıcı bazlı stok takip uygulaması. JWT kimlik doğrulama, Docker Compose ile çalışır.

## Teknolojiler

- **Frontend:** Vue 3 + TypeScript + Pinia + Vue Router + Chart.js
- **Backend:** Node.js + Express + TypeScript + Zod + Morgan
- **Veritabanı:** PostgreSQL
- **Auth:** JWT + bcrypt
- **Containerization:** Docker Compose + Nginx
- **Asenkron:** Bull + Redis + node-cron
- **Mail:** Nodemailer + Gmail SMTP
- **Mikroservis:** Node.js + Express (file-service)

## Özellikler

- Kullanıcı kaydı ve girişi (JWT)
- Ürün CRUD işlemleri (kullanıcı bazlı)
- Alış/Satış fiyatı ve kar hesabı
- Sayfalama (pagination)
- Gelişmiş arama ve filtreleme
- Hızlı stok güncelleme (+/-)
- Stok hareket geçmişi
- Sipariş yönetimi (gelen/giden)
- Finans modülü (gelir/gider/net kar)
- Dashboard istatistikleri ve grafikler
- PDF/Excel export (mikroservis üzerinden)
- Kritik stok uyarısı maili (manuel + her sabah 09:00 otomatik)
- Profil sayfası (kullanıcı adı, email, şifre güncelleme)
- HTTPS (self-signed, inventory-tracker.local)
- Rate limiting + SQL injection koruması

## Mimari

```
https://inventory-tracker.local
              ↓
           Nginx (SSL)
              ↓
    /       →  frontend:5173 (Vue 3)
    /api/   →  backend:3000 (Express)

backend → file-service:4000 (Mikroservis)
backend → redis:6379 → worker (Bull Queue)
backend → postgres:5432 (PostgreSQL)
```

## Kurulum

### 1. Repoyu klonla

```bash
git clone https://github.com/emrekaya7721/inventory-tracker.git
cd inventory-tracker
```

### 2. SSL Sertifikası Oluştur

```bash
mkdir nginx/ssl
docker run --rm -v ${PWD}/nginx/ssl:/ssl alpine/openssl req -x509 -nodes -days 365 \
  -newkey rsa:2048 -keyout /ssl/key.pem -out /ssl/cert.pem \
  -subj "/C=TR/ST=Istanbul/L=Istanbul/O=Inventory/CN=inventory-tracker.local"
```

### 3. Hosts Dosyasını Düzenle

**Windows** — Notepad'i yönetici olarak aç, şu dosyayı düzenle:
```
C:\Windows\System32\drivers\etc\hosts
```

En alta ekle:
```
127.0.0.1  inventory-tracker.local
```

**Mac/Linux:**
```bash
echo "127.0.0.1 inventory-tracker.local" | sudo tee -a /etc/hosts
```

### 4. .env Dosyalarını Hazırla

`backend/.env`:
```env
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/inventory_db
JWT_SECRET=super_secret_key_123
PORT=3000
REDIS_URL=redis://redis:6379
FILE_SERVICE_URL=http://file-service:4000
```

`worker/.env`:
```env
REDIS_URL=redis://redis:6379
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/inventory_db
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=gmail_adresin@gmail.com
SMTP_PASS=gmail_uygulama_sifresi
```

### 5. Docker Compose ile Çalıştır

```bash
docker compose up --build
```

| Servis | URL |
|--------|-----|
| Uygulama (HTTPS) | https://inventory-tracker.local |
| Frontend | http://localhost:5173 |
| Backend | http://localhost:3000 |
| File Service | http://localhost:4000 |
| PostgreSQL | localhost:5433 |
| Redis | localhost:6379 |

## API Dokümantasyonu

### Auth

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| POST | /auth/register | Kullanıcı kaydı |
| POST | /auth/login | Kullanıcı girişi |

```json
{ "username": "emre", "password": "1234", "email": "emre@gmail.com" }
```

### Products (korumalı)

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | /products?page=1&limit=9 | Sayfalı listeleme |
| POST | /products | Ürün oluştur |
| PUT | /products/:id | Ürün güncelle |
| DELETE | /products/:id | Ürün sil |
| PATCH | /products/:id/stock | Hızlı stok güncelle |
| GET | /products/:id/movements | Stok geçmişi |

### Orders (korumalı)

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | /orders | Siparişleri listele |
| POST | /orders | Sipariş oluştur |
| PATCH | /orders/:id/complete | Siparişi tamamla |
| PATCH | /orders/:id/cancel | Siparişi iptal et |

### Transactions (korumalı)

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | /transactions | Gelir/gider listesi + özet |

### Files (korumalı)

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | /files/products/pdf | Ürün listesi PDF |
| GET | /files/products/excel | Ürün listesi Excel |
| GET | /files/transactions/pdf | Finansal rapor PDF |

### Mail (korumalı)

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| POST | /mail/low-stock | Kritik stok uyarısı gönder |

### Profile (korumalı)

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | /profile | Profil bilgilerini getir |
| PUT | /profile | Profil güncelle |
| PUT | /profile/password | Şifre değiştir |

## Mikroservis

`file-service/` klasöründe bağımsız çalışır. DB bağlantısı yoktur. Backend veriyi hazırlayıp gönderir, mikroservis PDF/Excel üretir.

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| POST | /generate/pdf | PDF üret |
| POST | /generate/excel | Excel üret |

```json
{
  "title": "Ürün Listesi",
  "headers": ["Ürün", "Stok", "Fiyat"],
  "rows": [["Laptop", 10, "5000 TL"]]
}
```

## Worker & Cronjob

`worker/` klasöründe bağımsız çalışır. Redis üzerinden backend ile haberleşir.

- **Manuel:** Ürünler sayfasından "Stok Uyarısı Gönder" butonuyla tetiklenir
- **Otomatik:** Her sabah 09:00'da (Türkiye saati) kritik stoku olan kullanıcılara mail gönderir

## Healthcheck

```
GET http://localhost:3000/healthz
→ { "status": "ok" }

GET http://localhost:4000/healthz
→ { "status": "ok", "service": "file-service" }
```

## Test & Debug

```bash
# Logları görüntüle
docker compose logs backend
docker compose logs worker
docker compose logs file-service

# Veritabanına bağlan
docker compose exec postgres psql -U postgres -d inventory_db

# Servisleri durdur
docker compose down

# Servisleri durdur ve veritabanını sıfırla
docker compose down -v

# Sadece bir servisi rebuild et
docker compose up --build backend
```