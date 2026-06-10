import express, { Request, Response } from 'express';
import PDFDocument from 'pdfkit';
import * as XLSX from 'xlsx';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(express.json());

app.get('/healthz', (req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'file-service' });
});

app.post('/generate/pdf', (req: Request, res: Response) => {
  const { title, headers, rows } = req.body;

  if (!title || !headers || !rows) {
    return res.status(400).json({ error: 'title, headers ve rows gerekli' });
  }

  const doc = new PDFDocument({ margin: 40, size: 'A4' });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${title}.pdf"`);

  doc.pipe(res);

  // Font olarak DejaVu kullan — Türkçe destekli
  const fontPath = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf';
  const boldFontPath = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf';

  // Fontlar varsa kullan, yoksa varsayılan
  const hasFont = fs.existsSync(fontPath);

  if (hasFont) {
    doc.registerFont('Regular', fontPath);
    doc.registerFont('Bold', boldFontPath);
  }

  const regularFont = hasFont ? 'Regular' : 'Helvetica';
  const boldFont = hasFont ? 'Bold' : 'Helvetica-Bold';

  // Başlık
  doc.fontSize(18).font(boldFont).text(title, { align: 'center' });
  doc.moveDown(0.5);
  doc.fontSize(9).font(regularFont).fillColor('#6b7280')
    .text(`Olusturulma tarihi: ${new Date().toLocaleDateString('tr-TR')}`, { align: 'center' });
  doc.moveDown(1);

  const colWidth = (doc.page.width - 80) / headers.length;
  let y = doc.y;

  // Header satırı
  doc.fillColor('#534AB7');
  doc.rect(40, y, doc.page.width - 80, 20).fill();
  doc.fillColor('white').fontSize(9).font(boldFont);
  headers.forEach((h: string, i: number) => {
    doc.text(h, 45 + i * colWidth, y + 5, { width: colWidth - 5, lineBreak: false });
  });

  y += 22;

  // Veri satırları
  rows.forEach((row: any[], idx: number) => {
    if (y > doc.page.height - 60) {
      doc.addPage();
      y = 40;
    }

    doc.fillColor(idx % 2 === 0 ? '#f8fafc' : 'white');
    doc.rect(40, y, doc.page.width - 80, 18).fill();
    doc.fillColor('#1f2937').fontSize(8).font(regularFont);

    row.forEach((cell: any, i: number) => {
      doc.text(String(cell ?? ''), 45 + i * colWidth, y + 4, { width: colWidth - 5, lineBreak: false });
    });

    y += 20;
  });

  doc.moveTo(40, y).lineTo(doc.page.width - 40, y).strokeColor('#ebebeb').stroke();

  doc.end();
});

app.post('/generate/excel', (req: Request, res: Response) => {
  const { title, headers, rows } = req.body;

  if (!title || !headers || !rows) {
    return res.status(400).json({ error: 'title, headers ve rows gerekli' });
  }

  const data = [headers, ...rows];
  const ws = XLSX.utils.aoa_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, title.slice(0, 31));

  ws['!cols'] = headers.map(() => ({ wch: 20 }));

  const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${title}.xlsx"`);
  res.send(buffer);
});

app.listen(PORT, () => {
  console.log(`File service running on port ${PORT}`);
});