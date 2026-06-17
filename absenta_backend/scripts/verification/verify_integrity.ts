import { PrismaClient, BackupStatus } from '@prisma/client';
import { BackupService } from './src/modules/backup/services/backup.service';
import { RestoreService } from './src/modules/backup/services/restore.service';
import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function runIntegrityVerification() {
  console.log('=== SNAPSHOT INTEGRITY VERIFICATION ===');

  const backupService = new BackupService(prisma);
  const restoreService = new RestoreService(prisma);

  // 1. Create Tenant & Data
  const tenantId = randomUUID();
  console.log(`\n[1] Creating Tenant: ${tenantId}`);
  
  await prisma.tenant.create({
    data: {
      id: tenantId,
      name: 'Integrity Test Tenant',
      domain: `integrity-${tenantId.substring(0, 8)}`,
      status: 'ACTIVE'
    }
  });
  
  await prisma.systemConfig.create({
      data: { tenant_id: tenantId, app_name: 'Config 1' }
  });

  // 2. Create Signed Backup
  console.log('\n[2] Creating Signed Backup...');
  await backupService.createSnapshot(tenantId);
  
  const backup = await prisma.tenantBackup.findFirst({
      where: { tenant_id: tenantId },
      orderBy: { snapshot_date: 'desc' }
  });
  
  if (!backup) throw new Error('Backup not found');
  console.log(`    Backup ID: ${backup.id}`);
  console.log(`    Signature: ${backup.file_signature}`);
  console.log(`    Path: ${backup.file_path}`);
  
  if (!backup.file_signature) throw new Error('FAIL: Backup was not signed');

  // 3. Test Restore (Valid)
  const targetId1 = randomUUID();
  console.log(`\n[3] Testing Valid Restore to ${targetId1}...`);
  await prisma.tenant.create({ 
    data: { 
        id: targetId1, 
        name: 'Target 1', 
        domain: `t1-${targetId1.substring(0,8)}`, 
        status: 'ACTIVE' 
    } 
  });
  
  try {
      await restoreService.restoreBackup(backup.id, targetId1, 'admin');
      console.log('    SUCCESS: Valid backup restored.');
  } catch (e) {
      console.error('    FAIL: Valid backup failed to restore', e);
      // Wait, restoreService might fail if file path resolution is weird in test script
      // But verify_resume.ts worked.
      process.exit(1);
  }

  // 4. Test Corrupt File (SHA256 Mismatch)
  console.log('\n[4] Testing Corrupt File (SHA256 Mismatch)...');
  // Corrupt the file on disk
  // The path in DB is relative. We need full path.
  // LocalDiskStorage uses baseDir = 'backups' by default.
  // The verify script runs from backend root.
  // So 'backups/...' is correct.
  const fullPath = path.resolve(process.cwd(), 'backups', backup.file_path);
  console.log(`    Corrupting file: ${fullPath}`);
  
  if (!fs.existsSync(fullPath)) {
      console.error('    FAIL: Backup file not found on disk at', fullPath);
      process.exit(1);
  }

  const originalContent = fs.readFileSync(fullPath);
  
  // Append garbage
  fs.appendFileSync(fullPath, 'CORRUPTION');
  
  const targetId2 = randomUUID();
  await prisma.tenant.create({ data: { id: targetId2, name: 'Target 2', domain: `t2-${targetId2.substring(0,8)}`, status: 'ACTIVE' } });

  // Reset backup status to READY (restoreService marks it COMPLETED after step 3)
  await prisma.tenantBackup.update({
      where: { id: backup.id },
      data: { status: BackupStatus.READY, restore_status: 'NONE' }
  });

  try {
      await restoreService.restoreBackup(backup.id, targetId2, 'admin');
      console.error('    FAIL: Corrupt file was restored!');
      process.exit(1);
  } catch (e: any) {
      if (e.message.includes('integrity check failed')) {
          console.log('    SUCCESS: Integrity check caught corruption.');
      } else {
          console.error('    FAIL: Unexpected error:', e);
          process.exit(1);
      }
  }

  // Restore original file content
  fs.writeFileSync(fullPath, originalContent);

  // 5. Test Signature Mismatch (Manually modify DB signature)
  console.log('\n[5] Testing Signature Mismatch...');
  await prisma.tenantBackup.update({
      where: { id: backup.id },
      data: { file_signature: 'invalid-signature', status: BackupStatus.READY, restore_status: 'NONE' }
  });
  
  const targetId3 = randomUUID();
  await prisma.tenant.create({ data: { id: targetId3, name: 'Target 3', domain: `t3-${targetId3.substring(0,8)}`, status: 'ACTIVE' } });

  try {
      await restoreService.restoreBackup(backup.id, targetId3, 'admin');
      console.error('    FAIL: Invalid signature was accepted!');
      process.exit(1);
  } catch (e: any) {
      if (e.message.includes('signature invalid')) {
          console.log('    SUCCESS: Signature verification caught tampering.');
      } else {
          console.error('    FAIL: Unexpected error:', e);
          process.exit(1);
      }
  }
  
  process.exit(0);
}

runIntegrityVerification()
  .catch(e => {
      console.error(e);
      process.exit(1);
  })
  .finally(async () => {
      await prisma.$disconnect();
  });
