import { Queue } from 'bullmq';
import { getRedisConnection } from './src/infra/redis/redisClient';

const INVOICE_PDF_QUEUE_NAME = 'invoice-pdf';

async function clearQueue() {
  console.log('Connecting to Redis...');
  const connection = getRedisConnection();
  const queue = new Queue(INVOICE_PDF_QUEUE_NAME, { connection });

  console.log('Clearing failed jobs...');
  await queue.clean(0, 1000, 'failed');
  
  console.log('Clearing completed jobs...');
  await queue.clean(0, 1000, 'completed');

  console.log('Done.');
  process.exit(0);
}

clearQueue().catch(err => {
  console.error(err);
  process.exit(1);
});
