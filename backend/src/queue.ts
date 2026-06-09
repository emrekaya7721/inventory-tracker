import Bull from 'bull';
import dotenv from 'dotenv';

dotenv.config();

export const lowStockQueue = new Bull('low-stock-check', {
  redis: process.env.REDIS_URL || 'redis://redis:6379',
});