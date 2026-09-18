/**
 * 🛡️ Platform Backup Runner to MinIO Self-Hosted S3
 * ----------------------------------------------------
 * Mensimulasikan proses pencadangan otomatis platform level-SaaS
 * langsung ke server MinIO self-hosted (10.10.10.250:9000).
 */

import { S3Client, ListBucketsCommand, CreateBucketCommand, PutObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { prisma } from '../../src/utils/prisma';
import { MigrationBundleService } from '../../src/modules/backup/services/migration-bundle.service';

const S3_ENDPOINT = process.env.S3_BACKUP_ENDPOINT || 'http://10.10.10.250:9000';
const S3_ACCESS_KEY = process.env.S3_ACCESS_KEY || 'minioadmin';
const S3_SECRET_KEY = process.env.S3_SECRET_KEY || 'minioadmin';
const BACKUP_BUCKET = 'absenta-platform-backups';

const s3Client = new S3Client({
  endpoint: S3_ENDPOINT,
  region: 'us-east-1',
  credentials: {
    accessKeyId: S3_ACCESS_KEY,
    secretAccessKey: S3_SECRET_KEY
  },
  forcePathStyle: true
});

const migrationService = new MigrationBundleService(prisma);

async function ensureBackupBucketExists() {
  console.log(`🔍 Memeriksa ketersediaan bucket "${BACKUP_BUCKET}" di MinIO (${S3_ENDPOINT})...`);
  const buckets = await s3Client.send(new ListBucketsCommand({}));
  const exists = buckets.Buckets?.some(b => b.Name === BACKUP_BUCKET);

  if (!exists) {
    console.log(`📦 Bucket "${BACKUP_BUCKET}" belum ada. Membuat bucket baru...`);
    await s3Client.send(new CreateBucketCommand({ Bucket: BACKUP_BUCKET }));
    console.log(`✅ Bucket "${BACKUP_BUCKET}" berhasil dibuat di MinIO!`);
  } else {
    console.log(`✅ Bucket "${BACKUP_BUCKET}" sudah siap.`);
  }
}

async function runPlatformBackupSimulation() {
  console.log('\n🚀 =========================================================');
  console.log('   SIMULASI AUTOMATED PLATFORM BACKUP KE MINIO SELF-HOSTED');
  console.log('=========================================================\n');

  try {
    // 1. Pastikan bucket target tersedia
    await ensureBackupBucketExists();

    // 2. Ambil semua tenant sekolah aktif di database
    const tenants = await prisma.tenant.findMany({
      where: {
        AND: [
          { status: 'ACTIVE' },
          { id: { not: 'system' } }
        ]
      }
    });

    console.log(`📋 Ditemukan ${tenants.length} tenant sekolah yang akan dicadangkan.`);

    for (const tenant of tenants) {
      console.log(`\n📦 [1/3] Mengemas data instansi: "${tenant.name}" (${tenant.id})...`);
      
      const { buffer, manifest, filename } = await migrationService.createExportBundle(tenant.id, {
        includeAttendance: true,
        includeMedia: true
      });

      const sizeMB = (buffer.length / (1024 * 1024)).toFixed(2);
      console.log(`   ➔ Berhasil dikemas: ${filename} (${sizeMB} MB, ${manifest.stats.total_records} record, ${manifest.stats.total_media_files} media)`);

      // 3. Upload paket .absenta ke MinIO bucket 'absenta-platform-backups'
      console.log(`📤 [2/3] Mengunggah paket .absenta ke MinIO (${BACKUP_BUCKET}/${filename})...`);
      await s3Client.send(new PutObjectCommand({
        Bucket: BACKUP_BUCKET,
        Key: filename,
        Body: buffer,
        ContentType: 'application/octet-stream',
        Metadata: {
          'tenant-id': tenant.id,
          'tenant-name': encodeURIComponent(tenant.name),
          'checksum-sha256': manifest.checksum_sha256 || ''
        }
      }));
      console.log(`   ➔ Berhasil diunggah ke MinIO S3!`);

      // 4. Catat riwayat ke database TenantBackup
      console.log(`📝 [3/3] Mencatat audit snapshot ke database...`);
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30); // Retensi 30 hari

      await prisma.tenantBackup.create({
        data: {
          Tenant: { connect: { id: tenant.id } },
          file_path: `s3://${BACKUP_BUCKET}/${filename}`,
          file_size_bytes: BigInt(buffer.length),
          checksum_sha256: manifest.checksum_sha256 || 'none',
          status: 'READY',
          expires_at: expiresAt
        }
      });
      console.log(`   ➔ Snapshot audit tersimpan.`);
    }

    // 5. Tampilkan isi bucket sekarang
    console.log(`\n📋 Daftar berkas cadangan di bucket "${BACKUP_BUCKET}":`);
    const objects = await s3Client.send(new ListObjectsV2Command({ Bucket: BACKUP_BUCKET }));
    objects.Contents?.forEach((obj, idx) => {
      const mb = ((obj.Size || 0) / (1024 * 1024)).toFixed(2);
      console.log(`   ${idx + 1}. ${obj.Key} (${mb} MB, Modified: ${obj.LastModified?.toISOString()})`);
    });

    console.log('\n🎉 =========================================================');
    console.log('   SIMULASI SUKSES 100%!');
    console.log(`   Buka MinIO Web Console: http://10.10.10.250:9001/browser/${BACKUP_BUCKET}`);
    console.log('=========================================================\n');

  } catch (error: any) {
    console.error('❌ Simulasi Backup Gagal:', error);
  } finally {
    await prisma.$disconnect();
  }
}

runPlatformBackupSimulation();
