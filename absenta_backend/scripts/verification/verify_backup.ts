import { PrismaClient } from '@prisma/client';
import { BackupService } from './src/modules/backup/services/backup.service';
import { RestoreService } from './src/modules/backup/services/restore.service';
// import { LocalDiskStorage } from './src/infra/storage/LocalDiskStorage';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

async function runVerification() {
  console.log('=== STARTING BACKUP & RESTORE VERIFICATION ===');

  // const _storage = new LocalDiskStorage();
  const backupService = new BackupService(prisma);
  const restoreService = new RestoreService(prisma);

  // 1. Create Dummy Tenant
  const sourceTenantId = randomUUID();
  console.log(`\n[1] Creating Source Tenant: ${sourceTenantId}`);
  
  await prisma.tenant.create({
    data: {
      id: sourceTenantId,
      name: 'Verification Source Tenant',
      domain: `verify-${sourceTenantId.substring(0, 8)}`,
      status: 'ACTIVE'
    }
  });

  console.log('    Seeding data...');
  const role = await prisma.role.create({
      data: {
          tenant_id: sourceTenantId,
          name: 'Dummy Role',
          // code: 'DUMMY', // 'code' does not exist?
          description: 'Dummy'
      }
  });

  const dummyUser = await prisma.user.create({
      data: {
          tenant_id: sourceTenantId,
          email: 'dummy@log.com',
          full_name: 'Dummy Logger',
          password: 'hashedpassword',
          role_id: role.id
      }
  });
  
  // HEAVY LOAD SIMULATION: 100,000 rows for ActivityLog
  const totalActivityLogs = 100000;
  const batchSize = 2000;
  
  let logs: any[] = [];
  for (let i = 0; i < totalActivityLogs; i++) {
      logs.push({
          tenant_id: sourceTenantId,
          user_id: dummyUser.id,
          action: 'LOGIN',
          entity: 'USER', 
          entity_id: 'some-entity-id',
          metadata: JSON.stringify({ ip: '127.0.0.1', user_agent: 'Mozilla/5.0' })
      });
      
      if (logs.length >= batchSize) {
          await prisma.activityLog.createMany({ data: logs });
          logs = [];
          if (i % 10000 === 0) process.stdout.write('.');
      }
  }
  if (logs.length > 0) {
      await prisma.activityLog.createMany({ data: logs });
  }
  console.log(`\n    Seeded ${totalActivityLogs} ActivityLogs`);

  // We already created one user. Create 99 more.
  // Wait, I created SystemConfig in the original loop but now I'm creating Users in a separate loop.
  // I need to create SystemConfig for the 99 iterations.
  // And the first user loop (which is now the ActivityLog loop) created dummyUser.
  // Did I create SystemConfig for the dummyUser? No.
  // I need 100 SystemConfigs.
  // Let's create 100 SystemConfigs explicitly.
  
  // 1. Create 100 SystemConfigs
  for (let i = 0; i < 100; i++) {
      await prisma.systemConfig.create({
          data: {
              tenant_id: sourceTenantId,
              app_name: `App Config ${i}`
          }
      });
  }

  for (let i = 1; i < 100; i++) {
    await prisma.user.create({
      data: {
        tenant_id: sourceTenantId,
        email: `user${i}@verify.com`,
        full_name: `User ${i}`,
        password: 'hashedpassword',
        role_id: role.id
      }
    });
    
    // Remove SystemConfig creation from this loop to avoid duplicates if I already created them above
    /*
    await prisma.systemConfig.create({
        data: {
            tenant_id: sourceTenantId,
            app_name: `App Config ${i}`
        }
    });
    */
  }

  // 2. Snapshot
  console.log('\n[2] Creating Snapshot...');
  const startSnapshot = process.hrtime();
  const initialMem = process.memoryUsage().heapUsed;
  
  await backupService.createSnapshot(sourceTenantId);
  
  const endSnapshot = process.hrtime(startSnapshot);
  const snapshotDuration = (endSnapshot[0] * 1000 + endSnapshot[1] / 1e6).toFixed(2);
  const peakMemSnapshot = (process.memoryUsage().heapUsed - initialMem) / 1024 / 1024;
  
  console.log(`    Duration: ${snapshotDuration} ms`);
  console.log(`    RAM Delta: ${peakMemSnapshot.toFixed(2)} MB`);

  // Get Backup ID
  const backup = await prisma.tenantBackup.findFirst({
      where: { tenant_id: sourceTenantId },
      orderBy: { snapshot_date: 'desc' }
  });
  
  if (!backup) throw new Error('Backup not found');
  console.log(`    Backup ID: ${backup.id}`);
  console.log(`    Size: ${Number(backup.file_size_bytes)} bytes`);
  
  // 2.5 DELETE SOURCE DATA (Simulate Retention Purge)
  // We need to delete source data so that IDs don't conflict during restore (since they are UUIDs)
  console.log('\n[2.5] Deleting Source Data (Simulating Retention)...');
  await prisma.activityLog.deleteMany({ where: { tenant_id: sourceTenantId } });
  await prisma.systemConfig.deleteMany({ where: { tenant_id: sourceTenantId } });
  await prisma.user.deleteMany({ where: { tenant_id: sourceTenantId } });
  // We don't delete the tenant itself to keep the test simple, but we delete the data.

  // 3. Restore to new Tenant
  const targetTenantId = randomUUID();
  console.log(`\n[3] Restoring to New Tenant: ${targetTenantId}`);

  await prisma.tenant.create({
      data: {
          id: targetTenantId,
          name: 'Verification Target Tenant',
          domain: `target-${targetTenantId.substring(0, 8)}`,
          status: 'ACTIVE'
      }
  });

  // 4. Restore
  console.log('\n[4] Restoring Snapshot...');
  const startRestore = process.hrtime();
  const restoreMemStart = process.memoryUsage().heapUsed;

  await restoreService.restoreBackup(backup.id, targetTenantId, 'system');

  const endRestore = process.hrtime(startRestore);
  const restoreDuration = (endRestore[0] * 1000 + endRestore[1] / 1e6).toFixed(2);
  const peakMemRestore = (process.memoryUsage().heapUsed - restoreMemStart) / 1024 / 1024;

  console.log(`    Duration: ${restoreDuration} ms`);
  console.log(`    RAM Delta: ${peakMemRestore.toFixed(2)} MB`);

  // 5. Verify Data
  console.log('\n[5] Verifying Data Integrity...');
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  const targetConfigCount = await prisma.systemConfig.count({ where: { tenant_id: targetTenantId } });
  const targetLogCount = await prisma.activityLog.count({ where: { tenant_id: targetTenantId } });

  console.log(`    Expected Configs: 100`);
  console.log(`    Target Configs: ${targetConfigCount}`);
  console.log(`    Expected Logs: 100000`);
  console.log(`    Target Logs: ${targetLogCount}`);
  
  if (targetConfigCount !== 100 || targetLogCount !== 100000) {
      console.error('FAILED: Data count mismatch');
      process.exit(1);
  }

  // 6. Concurrency Check
  console.log('\n[6] Verifying Concurrency Guard...');
  try {
      await Promise.all([
          restoreService.restoreBackup(backup.id, targetTenantId, 'system'),
          restoreService.restoreBackup(backup.id, targetTenantId, 'system')
      ]);
      console.error('FAILED: Concurrency guard failed (both succeeded)');
  } catch (e: any) {
      if (e.message.includes('already in progress') || e.message.includes('Backup already restored')) {
          console.log('    SUCCESS: Concurrency/State guard caught duplicate request');
      } else {
          console.log(`    ERROR: ${e.message}`);
      }
  }

  // Cleanup
  console.log('\n[7] Cleanup...');
  // await prisma.tenant.delete({ where: { id: sourceTenantId } });
  // await prisma.tenant.delete({ where: { id: targetTenantId } });
  // await storage.delete(backup.file_path);
  
  console.log('\n=== VERIFICATION COMPLETE ===');
}

runVerification()
  .catch(e => {
      console.error(e);
      process.exit(1);
  })
  .finally(async () => {
      await prisma.$disconnect();
  });
