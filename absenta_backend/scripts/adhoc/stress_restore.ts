import { PrismaClient } from '@prisma/client';
import { BackupService } from '../src/modules/backup/services/backup.service';
import { RestoreService } from '../src/modules/backup/services/restore.service';
import { randomUUID } from 'crypto';
import { execSync } from 'child_process';

const prisma = new PrismaClient();

// Parse CLI args
const args = process.argv.slice(2);
let crashAfterTable: string | null = null;
const crashArg = args.find(a => a.startsWith('--crash-after='));
if (crashArg) {
    crashAfterTable = crashArg.split('=')[1];
    // Pass this to the RestoreService via environment variable?
    // Or we modify RestoreService to read it.
    // For now, we will set it in process.env
    process.env.CRASH_AFTER_TABLE = crashAfterTable;
}

const rowCount = parseInt(args.find(a => !a.startsWith('--')) || '1000000', 10);

async function runStressRestore() {
  console.log(`=== BRUTAL STRESS TEST (${rowCount} rows) ===`);
  if (crashAfterTable) console.log(`[CONFIG] Crash simulation active after table: ${crashAfterTable}`);

  const backupService = new BackupService(prisma);
  const restoreService = new RestoreService(prisma);

  // 1. Create Source Tenant
  const sourceTenantId = randomUUID();
  console.log(`\n[1] Creating Source Tenant: ${sourceTenantId}`);
  
  await prisma.tenant.create({
    data: {
      id: sourceTenantId,
      name: 'Stress Source',
      domain: `stress-${sourceTenantId.substring(0, 8)}`,
      status: 'ACTIVE'
    }
  });

  // 2. Generate Data
  console.log(`\n[2] Generating ${rowCount} rows...`);
  // Use the generator script
  try {
      execSync(`npx ts-node scripts/generate_brutal_data.ts ${sourceTenantId} ${rowCount}`, { stdio: 'inherit' });
  } catch (e) {
      console.error('Data generation failed');
      process.exit(1);
  }

  // 3. Create Snapshot
  console.log('\n[3] Creating Snapshot...');
  const snapStart = Date.now();
  await backupService.createSnapshot(sourceTenantId);
  const snapDuration = (Date.now() - snapStart) / 1000;
  
  const backup = await prisma.tenantBackup.findFirst({
      where: { tenant_id: sourceTenantId },
      orderBy: { snapshot_date: 'desc' }
  });
  
  if (!backup) throw new Error('Backup not found');
  console.log(`    Backup ID: ${backup.id}`);
  console.log(`    Size: ${Number(backup.file_size_bytes) / 1024 / 1024} MB`);
  console.log(`    Snapshot Time: ${snapDuration}s`);

  // 4. Create Target Tenant
  const targetTenantId = randomUUID();
  console.log(`\n[4] Creating Target Tenant: ${targetTenantId}`);
  
  await prisma.tenant.create({
      data: {
          id: targetTenantId,
          name: 'Stress Target',
          domain: `target-${targetTenantId.substring(0, 8)}`,
          status: 'ACTIVE'
      }
  });

  // 5. Run Restore
  console.log('\n[5] Preparing for Restore (Disaster Recovery Simulation)...');
  const sourceCountBefore = await prisma.activityLog.count({ where: { tenant_id: sourceTenantId } });
  console.log(`    Source Rows (Verified): ${sourceCountBefore}`);
  
  // DELETE SOURCE DATA to avoid ID conflicts (since we don't regenerate IDs yet)
  console.log('    Deleting Source Data (Simulating Disaster)...');
  // Batch delete or just try deleteMany? 1M rows might be heavy.
  // ActivityLog usually cascades? No, it's logs.
  // We need to delete User/Role too? Yes.
  // Order: ActivityLog -> User -> Role -> Tenant?
  // Actually, we can just delete Tenant and let cascade handle it if configured, 
  // but Prisma deleteMany is safer.
  
  // Delete logs in chunks if needed, but let's try deleteMany first.
  const delStart = Date.now();
  await prisma.activityLog.deleteMany({ where: { tenant_id: sourceTenantId } });
  await prisma.user.deleteMany({ where: { tenant_id: sourceTenantId } });
  await prisma.role.deleteMany({ where: { tenant_id: sourceTenantId } });
  await prisma.tenant.delete({ where: { id: sourceTenantId } });
  console.log(`    Source Data Deleted in ${(Date.now() - delStart)/1000}s`);

  console.log('\n[5.1] Executing Restore...');
  const memBefore = process.memoryUsage();
  const restoreStart = Date.now();
  
  try {
      await restoreService.restoreBackup(backup.id, targetTenantId, 'stress-test');
  } catch (e: any) {
      if (process.env.CRASH_AFTER_TABLE && e.message.includes('SIMULATED CRASH')) {
          console.log('\n[CRASH] Simulated crash occurred as expected.');
          
          // Verify partial state
          const backupState = await prisma.tenantBackup.findUnique({ where: { id: backup.id } });
          console.log(`    Backup State: ${backupState?.restore_status}`);
          console.log(`    Progress Table: ${backupState?.progress_table}`);
          
          console.log('\n[RESUME] Attempting resume...');
          process.env.CRASH_AFTER_TABLE = ''; // Clear crash flag
          const resumeStart = Date.now();
          await restoreService.restoreBackup(backup.id, targetTenantId, 'stress-test');
          const resumeDuration = (Date.now() - resumeStart) / 1000;
          console.log(`    Resume Time: ${resumeDuration}s`);
      } else {
          throw e;
      }
  }

  const restoreDuration = (Date.now() - restoreStart) / 1000;
  const memAfter = process.memoryUsage();
  const peakHeap = (memAfter.heapUsed - memBefore.heapUsed) / 1024 / 1024; // Approximation, actual peak logged inside service

  // 6. Verify
  console.log('\n[6] Verification...');
  // Source Logs deleted, so use sourceCountBefore
  const targetCount = await prisma.activityLog.count({ where: { tenant_id: targetTenantId } });
  
  console.log(`    Source Logs (Verified): ${sourceCountBefore}`);
  console.log(`    Target Logs: ${targetCount}`);
  
  console.log('\n=== REPORT ===');
  console.log(`Rows: ${rowCount}`);
  console.log(`Snapshot Time: ${snapDuration.toFixed(2)}s`);
  console.log(`Restore Time: ${restoreDuration.toFixed(2)}s`);
  console.log(`Peak Node Heap (Diff): ${peakHeap.toFixed(2)} MB`);
  console.log(`Crash Occurred: ${!!crashAfterTable}`);
  console.log(`Resume Successful: ${crashAfterTable ? (sourceCountBefore === targetCount) : 'N/A'}`);
  
  if (sourceCountBefore !== targetCount) {
      console.error('FAILED: Data count mismatch');
      process.exit(1);
  }
  
  process.exit(0);
}

runStressRestore()
  .catch(e => {
      console.error(e);
      process.exit(1);
  })
  .finally(async () => {
      await prisma.$disconnect();
  });
