import { redisLockService } from './src/infra/lock/redis-lock.service';
import { randomUUID } from 'crypto';

async function runDistributedLockVerification() {
  console.log('=== DISTRIBUTED LOCK VERIFICATION ===');
  
  const resourceKey = `lock:test:${randomUUID()}`;
  const TTL = 5000;

  // 1. Simulate Instance A acquiring lock
  console.log('\n[1] Instance A acquiring lock...');
  const lockA = await redisLockService.acquire(resourceKey, TTL);
  console.log(`    Instance A Success: ${lockA.success}, Token: ${lockA.token}`);

  if (!lockA.success || !lockA.token) {
      console.error('FAILED: Instance A could not acquire lock');
      process.exit(1);
  }

  // 2. Simulate Instance B trying to acquire SAME lock
  console.log('\n[2] Instance B acquiring SAME lock...');
  const lockB = await redisLockService.acquire(resourceKey, TTL);
  console.log(`    Instance B Success: ${lockB.success}`);

  if (lockB.success) {
      console.error('FAILED: Instance B acquired lock while A held it');
      process.exit(1);
  } else {
      console.log('    SUCCESS: Instance B was blocked');
  }

  // 3. Heartbeat / Extend
  console.log('\n[3] Instance A extending lock...');
  await redisLockService.extend(resourceKey, lockA.token, TTL);
  console.log('    Extended.');

  // 4. Release
  console.log('\n[4] Instance A releasing lock...');
  await redisLockService.release(resourceKey, lockA.token);
  console.log('    Released.');

  // 5. Instance B acquires again
  console.log('\n[5] Instance B acquiring lock again...');
  const lockB2 = await redisLockService.acquire(resourceKey, TTL);
  console.log(`    Instance B Success: ${lockB2.success}`);

  if (!lockB2.success) {
      console.error('FAILED: Instance B could not acquire lock after release');
      process.exit(1);
  }

  // 6. Auto-Expiry Test
  console.log('\n[6] Testing Auto-Expiry (5s)...');
  await runCorrectExpiryTest();

  // 7. Verify Method Test
  console.log('\n[7] Testing verify()...');
  const verifyKey = `lock:verify:${randomUUID()}`;
  const verifyLock = await redisLockService.acquire(verifyKey, 2000);
  
  if (verifyLock.token) {
      const isValid = await redisLockService.verify(verifyKey, verifyLock.token);
      console.log(`    Valid Token Verify: ${isValid}`);
      
      const isInvalid = await redisLockService.verify(verifyKey, 'wrong-token');
      console.log(`    Invalid Token Verify: ${isInvalid}`);
      
      if (isValid && !isInvalid) {
          console.log('    SUCCESS: Verify method works.');
      } else {
          console.error('    FAILED: Verify method incorrect.');
          process.exit(1);
      }
  }
}

async function runCorrectExpiryTest() {
    const key = `lock:expiry:${randomUUID()}`;
    const ttl = 2000;
    
    console.log(`    Acquiring ${key} for 2s...`);
    await redisLockService.acquire(key, ttl);
    
    console.log('    Waiting 3s...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    console.log('    Attempting to acquire again...');
    const result = await redisLockService.acquire(key, ttl);
    console.log(`    Acquire Success: ${result.success}`);
    
    if (result.success) {
        console.log('    SUCCESS: Lock expired and was re-acquired.');
    } else {
        console.error('    FAILED: Lock did not expire.');
        process.exit(1);
    }
}

runDistributedLockVerification()
  .then(() => {
      console.log('\n=== ALL TESTS PASSED ===');
      process.exit(0);
  })
  .catch(e => {
      console.error(e);
      process.exit(1);
  });
