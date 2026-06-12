import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';
import * as XLSX from 'xlsx';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Beklenen kolonlar
const REQUIRED_FIELDS = ['name', 'category', 'quantity', 'purchase_price', 'selling_price'];

interface ParsedRow {
  rowNumber: number;
  data: any;
  errors: string[];
  status: 'valid' | 'invalid' | 'duplicate_in_file' | 'duplicate_in_db';
  existingId?: number;
}

// Dosyayı oku ve satırlara çevir
function readFile(filePath: string, ext: string): any[] {
  if (ext === '.csv') {
    const content = fs.readFileSync(filePath, 'utf-8');
    return parse(content, { columns: true, skip_empty_lines: true, trim: true });
  } else {
    const workbook = XLSX.readFile(filePath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    return XLSX.utils.sheet_to_json(sheet);
  }
}

// Tek satırı doğrula
function validateRow(row: any, rowNumber: number): ParsedRow {
  const errors: string[] = [];
  const data: any = {};

  // Zorunlu alan kontrolü
  for (const field of REQUIRED_FIELDS) {
    if (row[field] === undefined || row[field] === null || row[field] === '') {
      errors.push(`${field} alanı eksik`);
    }
  }

  // Tip kontrolü
  data.name = String(row.name || '').trim();
  data.description = row.description ? String(row.description).trim() : '';
  data.category = String(row.category || '').trim();

  const quantity = Number(row.quantity);
  if (isNaN(quantity) || quantity < 0) {
    errors.push('quantity sayı olmalı ve 0 veya üzeri olmalı');
  }
  data.quantity = isNaN(quantity) ? 0 : quantity;

  const purchasePrice = Number(row.purchase_price);
  if (isNaN(purchasePrice) || purchasePrice < 0) {
    errors.push('purchase_price sayı olmalı ve 0 veya üzeri olmalı');
  }
  data.purchase_price = isNaN(purchasePrice) ? 0 : purchasePrice;

  const sellingPrice = Number(row.selling_price);
  if (isNaN(sellingPrice) || sellingPrice < 0) {
    errors.push('selling_price sayı olmalı ve 0 veya üzeri olmalı');
  }
  data.selling_price = isNaN(sellingPrice) ? 0 : sellingPrice;

  return {
    rowNumber,
    data,
    errors,
    status: errors.length > 0 ? 'invalid' : 'valid',
  };
}

// ANA FONKSİYON — Parse işi
export async function processImportParse(job: any) {
  const { jobId, userId, filePath, fileExt } = job.data;

  try {
    const rawRows = readFile(filePath, fileExt);

    if (rawRows.length === 0) {
      throw new Error('Dosya boş veya okunamadı');
    }

    const parsedRows: ParsedRow[] = rawRows.map((row, idx) => validateRow(row, idx + 2)); // +2: satır 1 header

    // Dosya içi tekrar tespiti (isim bazlı)
    const nameCount: Record<string, number[]> = {};
    parsedRows.forEach((r, idx) => {
      if (r.status === 'valid') {
        const key = r.data.name.toLowerCase();
        if (!nameCount[key]) nameCount[key] = [];
        nameCount[key].push(idx);
      }
    });

    Object.values(nameCount).forEach(indices => {
      if (indices.length > 1) {
        // ilk hariç diğerlerini duplicate_in_file işaretle
        indices.slice(1).forEach(idx => {
          parsedRows[idx].status = 'duplicate_in_file';
          parsedRows[idx].errors.push('Dosya içinde tekrar eden ürün adı');
        });
      }
    });

    // Veritabanındaki mevcut kayıtlarla karşılaştır
    const existingProducts = await pool.query(
      'SELECT id, name FROM products WHERE user_id = $1',
      [userId]
    );
    const existingMap = new Map(
      existingProducts.rows.map((p: any) => [p.name.toLowerCase(), p.id])
    );

    parsedRows.forEach(r => {
      if (r.status === 'valid') {
        const existingId = existingMap.get(r.data.name.toLowerCase());
        if (existingId) {
          r.status = 'duplicate_in_db';
          r.existingId = existingId as number;
        }
      }
    });

    // Özet
    const summary = {
      total: parsedRows.length,
      valid: parsedRows.filter(r => r.status === 'valid').length,
      invalid: parsedRows.filter(r => r.status === 'invalid').length,
      duplicateInFile: parsedRows.filter(r => r.status === 'duplicate_in_file').length,
      duplicateInDb: parsedRows.filter(r => r.status === 'duplicate_in_db').length,
    };

    // Sonucu dosyaya yaz (preview)
    const previewPath = `/tmp/uploads/preview_${jobId}.json`;
    fs.writeFileSync(previewPath, JSON.stringify({
      summary,
      rows: parsedRows,
      filePath, // commit aşamasında tekrar kullanılacak
    }));

    console.log(`Import preview hazır: ${jobId} — ${summary.valid} geçerli, ${summary.invalid} hatalı`);
  } catch (err: any) {
    console.error('Import parse hatası:', err);
    const previewPath = `/tmp/uploads/preview_${jobId}.json`;
    fs.writeFileSync(previewPath, JSON.stringify({
      error: err.message || 'Dosya işlenemedi',
      summary: { total: 0, valid: 0, invalid: 0, duplicateInFile: 0, duplicateInDb: 0 },
      rows: [],
    }));
  }
}

// ANA FONKSİYON — Commit işi
export async function processImportCommit(job: any) {
  const { jobId, userId, duplicateStrategy } = job.data;

  try {
    const previewPath = `/tmp/uploads/preview_${jobId}.json`;
    if (!fs.existsSync(previewPath)) {
      throw new Error('Önizleme verisi bulunamadı');
    }

    const preview = JSON.parse(fs.readFileSync(previewPath, 'utf-8'));
    const rows: ParsedRow[] = preview.rows;

    let created = 0;
    let updated = 0;
    let skipped = 0;
    const failedRows: { rowNumber: number; error: string }[] = [];

    for (const row of rows) {
      try {
        if (row.status === 'invalid' || row.status === 'duplicate_in_file') {
          skipped++;
          continue;
        }

        if (row.status === 'duplicate_in_db') {
          if (duplicateStrategy === 'skip') {
            skipped++;
            continue;
          } else if (duplicateStrategy === 'update') {
            await pool.query(
              `UPDATE products SET description=$1, quantity=$2, category=$3, purchase_price=$4, selling_price=$5 
               WHERE id=$6 AND user_id=$7`,
              [row.data.description, row.data.quantity, row.data.category, row.data.purchase_price, row.data.selling_price, row.existingId, userId]
            );
            updated++;
            continue;
          } else if (duplicateStrategy === 'createOnly') {
            skipped++;
            continue;
          }
        }

        // valid — yeni kayıt oluştur
        await pool.query(
          `INSERT INTO products (name, description, quantity, category, purchase_price, selling_price, user_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [row.data.name, row.data.description, row.data.quantity, row.data.category, row.data.purchase_price, row.data.selling_price, userId]
        );
        created++;
      } catch (err: any) {
        failedRows.push({ rowNumber: row.rowNumber, error: err.message || 'Bilinmeyen hata' });
      }
    }

    const resultPath = `/tmp/uploads/result_${jobId}.json`;
    fs.writeFileSync(resultPath, JSON.stringify({
      created, updated, skipped, failedRows,
      total: rows.length,
    }));

    // Geçici dosyaları temizle
    if (fs.existsSync(preview.filePath)) fs.unlinkSync(preview.filePath);
    if (fs.existsSync(previewPath)) fs.unlinkSync(previewPath);

    console.log(`Import commit tamamlandı: ${jobId} — ${created} oluşturuldu, ${updated} güncellendi, ${skipped} atlandı`);
  } catch (err: any) {
    console.error('Import commit hatası:', err);
    const resultPath = `/tmp/uploads/result_${jobId}.json`;
    fs.writeFileSync(resultPath, JSON.stringify({
      error: err.message || 'İşlem başarısız',
      created: 0, updated: 0, skipped: 0, failedRows: [],
    }));
  }
}