import { PrismaClient, RestoreStatus } from '@prisma/client';
import { BackupService } from './src/modules/backup/services/backup.service';
import { RestoreService } from './src/modules/backup/services/restore.service';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

async function runResumeVerification() {
  console.log('=== STARTING RESUME CAPABILITY VERIFICATION ===');

  const backupService = new BackupService(prisma);
  const restoreService = new RestoreService(prisma);

  // 1. Create Source Tenant & Seed Data
  const sourceTenantId = randomUUID();
  console.log(`\n[1] Creating Source Tenant: ${sourceTenantId}`);
  
  await prisma.tenant.create({
    data: {
      id: sourceTenantId,
      name: 'Resume Verification Source',
      domain: `resume-${sourceTenantId.substring(0, 8)}`,
      status: 'ACTIVE'
    }
  });

  // Seed 3 tables to test resume point
  console.log('    Seeding data (SystemConfig, Role, User)...');
  await prisma.systemConfig.create({
      data: { tenant_id: sourceTenantId, app_name: 'Config 1' }
  });
  
  const role = await prisma.role.create({
      data: { tenant_id: sourceTenantId, name: 'Role 1', description: 'Test' }
  });

  await prisma.user.create({
      data: {
          tenant_id: sourceTenantId,
          email: 'user1@resume.com',
          full_name: 'User 1',
          password: 'pwd',
          role_id: role.id
      }
  });

  // 2. Create Snapshot
  console.log('\n[2] Creating Snapshot...');
  await backupService.createSnapshot(sourceTenantId);
  
  const backup = await prisma.tenantBackup.findFirst({
      where: { tenant_id: sourceTenantId },
      orderBy: { snapshot_date: 'desc' }
  });
  
  if (!backup) throw new Error('Backup not found');
  console.log(`    Backup ID: ${backup.id}`);

  // 3. Delete Source Data (Simulate Retention)
  console.log('\n[3] Deleting Source Data...');
  await prisma.user.deleteMany({ where: { tenant_id: sourceTenantId } });
  await prisma.role.deleteMany({ where: { tenant_id: sourceTenantId } });
  await prisma.systemConfig.deleteMany({ where: { tenant_id: sourceTenantId } });

  // 4. Simulate CRASH state
  // We want to simulate that 'SystemConfig' and 'Role' are done, but 'User' failed.
  // Wait, restore ordering is: SystemConfig -> ... -> Role -> User
  // Let's check TENANT_MODELS order.
  // src/constants/backup.constants.ts:
  // 'SystemConfig', 'Config', ..., 'Role', 'User', ...
  
  // So if we set progress_table = 'Role', it means SystemConfig and Role are DONE.
  // Next restore should start from 'User'.
  
  const targetTenantId = randomUUID();
  console.log(`\n[4] Simulating Crash State on Target Tenant: ${targetTenantId}`);
  
  await prisma.tenant.create({
      data: {
          id: targetTenantId,
          name: 'Resume Verification Target',
          domain: `target-${targetTenantId.substring(0, 8)}`,
          status: 'ACTIVE'
      }
  });

  // Manually insert data for "completed" tables to simulate partial restore
  await prisma.systemConfig.create({
      data: { tenant_id: targetTenantId, app_name: 'Config 1' }
  });
  // We need to map Role ID if we want User to link to it?
  // RestoreService reuses IDs if source is gone.
  // Since we deleted source, we can reuse IDs.
  await prisma.role.create({
      data: { 
          id: role.id, // Reuse ID
          tenant_id: targetTenantId, 
          name: 'Role 1', 
          description: 'Test' 
      }
  });

  // Update Backup Status to IN_PROGRESS and progress_table = 'Role'
  await prisma.tenantBackup.update({
      where: { id: backup.id },
      data: {
          restore_status: RestoreStatus.IN_PROGRESS,
          progress_table: 'Role' // 'Role' is completed
      }
  });
  
  console.log('    Set restore_status = IN_PROGRESS');
  console.log('    Set progress_table = "Role"');

  // 5. Run Restore (Should RESUME from User)
  console.log('\n[5] Running Resume Restore...');
  console.log('    Expectation: Skip SystemConfig and Role (already done), Restore User');
  
  await restoreService.restoreBackup(backup.id, targetTenantId, 'system');

  // 6. Verify Result
  console.log('\n[6] Verifying Data...');
  
  // Check if User exists
  const userCount = await prisma.user.count({ where: { tenant_id: targetTenantId } });
  console.log(`    User Count: ${userCount} (Expected: 1)`);
  
  // Check duplicates for SystemConfig and Role
  const configCount = await prisma.systemConfig.count({ where: { tenant_id: targetTenantId } });
  console.log(`    SystemConfig Count: ${configCount} (Expected: 1)`);
  
  const roleCount = await prisma.role.count({ where: { tenant_id: targetTenantId } });
  console.log(`    Role Count: ${roleCount} (Expected: 1)`);
  
  // Check Final Status
  const finalBackup = await prisma.tenantBackup.findUnique({ where: { id: backup.id } });
  console.log(`    Final Status: ${finalBackup?.status}`);
  console.log(`    Final Restore Status: ${finalBackup?.restore_status}`);

  if (userCount === 1 && configCount === 1 && roleCount === 1 && finalBackup?.restore_status === 'COMPLETED') {
      console.log('\n=== RESUME VERIFICATION SUCCESS ===');
  } else {
      console.error('\n=== RESUME VERIFICATION FAILED ===');
      process.exit(1);
  }
}

runResumeVerification()
  .catch(e => {
      console.error(e);
      process.exit(1);
  })
  .finally(async () => {
      await prisma.$disconnect();
  });
