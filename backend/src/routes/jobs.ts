import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { lowStockQueue, importQueue } from '../queue';

const router = Router();
router.use(authenticate);

router.get('/stats', async (req: AuthRequest, res: Response) => {
  try {
    const [lowStockCounts, importCounts] = await Promise.all([
      lowStockQueue.getJobCounts(),
      importQueue.getJobCounts(),
    ]);

    const totalActive = lowStockCounts.active + importCounts.active;
    const totalCompleted = lowStockCounts.completed + importCounts.completed;
    const totalFailed = lowStockCounts.failed + importCounts.failed;
    const totalWaiting = lowStockCounts.waiting + importCounts.waiting;

    // Son işlemler — her iki kuyruktan son 5'er iş
    const [lowStockJobs, importJobs] = await Promise.all([
      lowStockQueue.getJobs(['completed', 'failed'], 0, 5),
      importQueue.getJobs(['completed', 'failed'], 0, 5),
    ]);

    const recentJobs = [...lowStockJobs, ...importJobs]
      .sort((a, b) => (b.finishedOn || 0) - (a.finishedOn || 0))
      .slice(0, 10)
      .map(job => ({
        id: job.id,
        name: job.queue.name === 'low-stock-check' ? 'Stok Uyarısı' : 
              job.name === 'parse' ? 'Dosya Önizleme' : 'İçe Aktarma',
        status: job.failedReason ? 'failed' : 'completed',
        finishedOn: job.finishedOn,
      }));

    res.json({
      active: totalActive,
      completed: totalCompleted,
      failed: totalFailed,
      waiting: totalWaiting,
      recentJobs,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'İstatistikler alınamadı' });
  }
});

export default router;