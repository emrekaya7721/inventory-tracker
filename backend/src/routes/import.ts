import { Router, Response } from 'express';
import multer from 'multer';
import { authenticate, AuthRequest } from '../middleware/auth';
import { importQueue } from '../queue';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { getIO } from '../socket';


const router = Router();
router.use(authenticate);

const upload = multer({ dest: '/tmp/uploads' });

// Dosya yükle, worker'a parse işi gönder
router.post('/preview', upload.single('file'), async (req: AuthRequest, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Dosya gerekli' });
  }

  const jobId = uuidv4();
  const ext = path.extname(req.file.originalname).toLowerCase();
  

  if (ext !== '.csv' && ext !== '.xlsx' && ext !== '.xls') {
    fs.unlinkSync(req.file.path);
    return res.status(400).json({ error: 'Sadece CSV veya Excel dosyası yükleyebilirsiniz' });
  }

  const job = await importQueue.add('parse', {
    jobId,
    userId: req.userId,
    filePath: req.file.path,
    fileExt: ext,
  });

  res.json({ jobId, queueJobId: job.id, message: 'Dosya işleniyor' });
});

// Önizleme sonucunu getir
router.get('/preview/:jobId', async (req: AuthRequest, res: Response) => {
  const { jobId } = req.params;
  const previewPath = `/tmp/uploads/preview_${jobId}.json`;

  if (!fs.existsSync(previewPath)) {
    return res.status(202).json({ status: 'processing' });
  }

  const data = JSON.parse(fs.readFileSync(previewPath, 'utf-8'));
  res.json({ status: 'done', ...data });
});

// Onaylanan verileri commit et
router.post('/commit', async (req: AuthRequest, res: Response) => {
  const { jobId, duplicateStrategy } = req.body;

  if (!jobId) {
    return res.status(400).json({ error: 'jobId gerekli' });
  }

  await importQueue.add('commit', {
    jobId,
    userId: req.userId,
    duplicateStrategy: duplicateStrategy || 'skip',
  });

  getIO().to(`user:${req.userId}`).emit('job:update', { type: 'import_started' });

  res.json({ message: 'İçe aktarma işlemi başlatıldı' });
});

// Commit sonucunu getir
router.get('/commit/:jobId', async (req: AuthRequest, res: Response) => {
  const { jobId } = req.params;
  const resultPath = `/tmp/uploads/result_${jobId}.json`;

  if (!fs.existsSync(resultPath)) {
    return res.status(202).json({ status: 'processing' });
  }

  const data = JSON.parse(fs.readFileSync(resultPath, 'utf-8'));
  res.json({ status: 'done', ...data });
});


export default router;