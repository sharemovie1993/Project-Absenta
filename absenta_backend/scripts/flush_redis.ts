import Redis from 'ioredis';
const r = new Redis();
r.flushall().then(() => {
  console.log('Redis flushed');
  process.exit(0);
});
