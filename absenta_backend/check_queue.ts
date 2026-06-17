import { Queue } from 'bullmq';
import { getRedisConnection } from './src/infra/redis/redisClient';

const INVOICE_PDF_QUEUE_NAME = 'invoice-pdf';

async function checkQueue() {
  console.log('Connecting to Redis...');
  const connection = getRedisConnection();
  const queue = new Queue(INVOICE_PDF_QUEUE_NAME, { connection });

  const activeCount = await queue.getActiveCount();
  const waitingCount = await queue.getWaitingCount();
  const delayedCount = await queue.getDelayedCount();
  const failedCount = await queue.getFailedCount();

  console.log(`Queue Status for "${INVOICE_PDF_QUEUE_NAME}":`);
  console.log(`- Active: ${activeCount}`);
  console.log(`- Waiting: ${waitingCount}`);
  console.log(`- Delayed: ${delayedCount}`);
  console.log(`- Failed: ${failedCount}`);

  if (activeCount > 0) {
    console.log('Active jobs:');
    const activeJobs = await queue.getActive();
    for (const job of activeJobs) {
      console.log(`  - Job ID: ${job.id}, Data:`, job.data);
      // Optional: force fail stuck jobs
      // await job.moveToFailed(new Error('Stuck job force failed'), 'stuck_token');
    }
  }

  process.exit(0);
}

checkQueue().catch(err => {
  console.error(err);
  process.exit(1);
});
