import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export const sendLowStockMail = async (
  to: string,
  products: { name: string; quantity: number; category: string }[]
) => {
  const productRows = products.map(p => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #ebebeb">${p.name}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #ebebeb">${p.category}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #ebebeb;color:${p.quantity === 0 ? '#dc2626' : '#d97706'}">
        ${p.quantity === 0 ? 'Tükendi' : `${p.quantity} adet`}
      </td>
    </tr>
  `).join('');

  await transporter.sendMail({
    from: `"Inventory Tracker" <${process.env.SMTP_USER}>`,
    to,
    subject: '⚠️ Kritik Stok Uyarısı',
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
        <div style="background:#534AB7;padding:20px;border-radius:8px 8px 0 0">
          <h2 style="color:white;margin:0">📦 Inventory Tracker</h2>
          <p style="color:#ffffffaa;margin:4px 0 0">Kritik Stok Uyarısı</p>
        </div>
        <div style="background:white;padding:20px;border:1px solid #ebebeb">
          <p style="color:#374151">Aşağıdaki ürünlerin stok seviyesi kritik eşiğin altına düştü:</p>
          <table style="width:100%;border-collapse:collapse;margin-top:12px">
            <thead>
              <tr style="background:#f9f9fb">
                <th style="padding:8px 12px;text-align:left;font-size:13px;color:#6b7280">Ürün</th>
                <th style="padding:8px 12px;text-align:left;font-size:13px;color:#6b7280">Kategori</th>
                <th style="padding:8px 12px;text-align:left;font-size:13px;color:#6b7280">Stok</th>
              </tr>
            </thead>
            <tbody>${productRows}</tbody>
          </table>
          <div style="margin-top:20px;padding:12px;background:#fef3c7;border-radius:8px;border:1px solid #fde68a">
            <p style="margin:0;font-size:13px;color:#92400e">
              ⚠️ Lütfen bu ürünler için stok yenileme işlemi yapın.
            </p>
          </div>
        </div>
        <div style="background:#f9f9fb;padding:12px;border-radius:0 0 8px 8px;border:1px solid #ebebeb;border-top:none">
          <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center">
            Bu mail Inventory Tracker tarafından otomatik gönderilmiştir.
          </p>
        </div>
      </div>
    `,
  });
};