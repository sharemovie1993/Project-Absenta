import { acquireLock } from '../infra/locks/distributedLock';
import { initRedis } from '../infra/redis/redisClient';

async function main() {
  console.log('Initializing Redis...');
  try {
    await initRedis();
  } catch (err: any) {
    console.error('Redis init failed:', err);
  }
  console.log('Testing acquireLock...');
  try {
    const lock = await acquireLock('heartbeat:license-sync', 90);
    console.log('Lock result:', lock);
  } catch (err: any) {
    console.error('acquireLock THREW ERROR:', err);
  }
  process.exit(0);
}

main();
