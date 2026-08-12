import { prisma } from '../utils/prisma';
import { backupService } from '../modules/backup/services/backup.service';

async function testBackupIntegrity() {
  console.log('====================================================');
  console.log('🧪 TEST: Integritas Snapshot Backup Base Roles');
  console.log('====================================================');

  const sampleTenant = await prisma.tenant.findFirst({
    where: { id: { not: 'system' } },
    select: { id: true, name: true }
  });

  if (!sampleTenant) {
    throw new Error('Tidak ada tenant untuk dites.');
  }

  console.log(`📌 Membuat snapshot backup untuk tenant: ${sampleTenant.name} (${sampleTenant.id})...`);
  await backupService.createSnapshot(sampleTenant.id);

  const recentBackup = await prisma.tenantBackup.findFirst({
    where: { tenant_id: sampleTenant.id },
    orderBy: { snapshot_date: 'desc' }
  });

  if (!recentBackup) {
    throw new Error('Gagal menemukan record snapshot backup.');
  }

  console.log(`✅ Snapshot Backup Berhasil Dibuat: ${recentBackup.file_path} (${recentBackup.file_size_bytes} bytes)`);

  await prisma.$disconnect();
}

testBackupIntegrity().catch(err => {
  console.error('Test error:', err);
  prisma.$disconnect();
  process.exit(1);
});
