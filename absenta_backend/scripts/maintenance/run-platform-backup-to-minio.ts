/**
 * 🛡️ Platform Backup Runner to MinIO Self-Hosted S3 (Human-Friendly Hierarchical Edition)
 * ---------------------------------------------------------------------------------------
 * Menyusun struktur pencadangan platform yang rapi, hierarkis, dan manusiawi:
 *   absenta-platform-backups/
 *   ├── [subdomain-sekolah]/
 *   │   ├── latest.absenta                 <-- [1 KLIK CEPAT] Selalu backup paling mutakhir
 *   │   └── YYYY-MM-DD_HH-mm_[slug].absenta <-- Riwayat snapshot bertanggal
 */

import { 
  S3Client, 
  ListBucketsCommand, 
  CreateBucketCommand, 
  PutObjectCommand, 
  ListObjectsV2Command,
  DeleteObjectsCommand 
} from '@aws-sdk/client-s3';
import { prisma } from '../../src/utils/prisma';
import { MigrationBundleService } from '../../src/modules/backup/services/migration-bundle.service';
import { backupReplicationService } from '../../src/modules/backup/services/backup-replication.service';

const S3_ENDPOINT = process.env.S3_BACKUP_ENDPOINT || process.env.S3_ENDPOINT || 'http://localhost:9000';
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

async function cleanupMessyRootObjects() {
  console.log(`🧹 Membersihkan berkas lama yang bertumpuk berantakan di root bucket...`);
  const objects = await s3Client.send(new ListObjectsV2Command({ Bucket: BACKUP_BUCKET }));
  const messyRootKeys = (objects.Contents || [])
    .filter(obj => obj.Key && !obj.Key.includes('/'))
    .map(obj => ({ Key: obj.Key! }));

  if (messyRootKeys.length > 0) {
    await s3Client.send(new DeleteObjectsCommand({
      Bucket: BACKUP_BUCKET,
      Delete: { Objects: messyRootKeys }
    }));
    console.log(`✅ ${messyRootKeys.length} berkas mentah di root telah dibersihkan.`);
  } else {
    console.log(`✅ Root bucket sudah bersih.`);
  }
}

async function runPlatformBackupSimulation() {
  console.log('\n🚀 =========================================================');
  console.log('   SISTEM PENCADANGAN PLATFORM TERSTRUKTUR (MANUSIAWI)');
  console.log('   Target: MinIO Server (10.10.10.250:9000)');
  console.log('=========================================================\n');

  try {
    await ensureBackupBucketExists();
    await cleanupMessyRootObjects();

    const tenants = await prisma.tenant.findMany({
      where: {
        AND: [
          { status: 'ACTIVE' },
          { id: { not: 'system' } }
        ]
      }
    });

    console.log(`\n📋 Ditemukan ${tenants.length} tenant sekolah yang akan dicadangkan.\n`);

    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10); // YYYY-MM-DD
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const timestampStr = `${dateStr}_${hours}-${minutes}`;

    for (const tenant of tenants) {
      // 1. Tentukan nama folder sekolah yang rapi & mudah dikenali manusia
      const folderName = tenant.subdomain 
        ? tenant.subdomain.toLowerCase().replace(/[^a-z0-9_-]/g, '')
        : (tenant.name.toLowerCase().replace(/[^a-z0-9_-]/g, '_').slice(0, 25));

      console.log(`📂 [1/3] Menyiapkan folder sekolah: "${folderName}/" untuk "${tenant.name}"...`);

      const { buffer, manifest } = await migrationService.createExportBundle(tenant.id, {
        includeAttendance: true,
        includeMedia: true
      });

      const sizeMB = (buffer.length / (1024 * 1024)).toFixed(2);
      const snapshotFilename = `${dateStr}_${hours}-${minutes}_${folderName}.absenta`;
      const snapshotKey = `${folderName}/${snapshotFilename}`;
      const latestKey = `${folderName}/latest.absenta`;

      console.log(`   ➔ Berhasil dikemas: ${sizeMB} MB (${manifest.stats.total_records} baris data, ${manifest.stats.total_media_files} media)`);

      // 2. Upload Arsip Bertanggal (History)
      console.log(`📤 [2/3] Mengunggah arsip riwayat: "${snapshotKey}"...`);
      await s3Client.send(new PutObjectCommand({
        Bucket: BACKUP_BUCKET,
        Key: snapshotKey,
        Body: buffer,
        ContentType: 'application/octet-stream',
        Metadata: {
          'tenant-id': tenant.id,
          'tenant-name': encodeURIComponent(tenant.name),
          'snapshot-date': now.toISOString(),
          'checksum-sha256': manifest.checksum_sha256 || ''
        }
      }));

      // 3. Upload / Perbarui Shortcut "latest.absenta"
      console.log(`⭐       Memperbarui penunjuk cepat: "${latestKey}" (Paling Baru)...`);
      await s3Client.send(new PutObjectCommand({
        Bucket: BACKUP_BUCKET,
        Key: latestKey,
        Body: buffer,
        ContentType: 'application/octet-stream',
        Metadata: {
          'tenant-id': tenant.id,
          'tenant-name': encodeURIComponent(tenant.name),
          'is-latest': 'true',
          'source-file': snapshotFilename,
          'checksum-sha256': manifest.checksum_sha256 || ''
        }
      }));

      // 4. Catat riwayat ke database TenantBackup
      console.log(`📝 [3/3] Menyimpan data audit log ke database...`);
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30); // Retensi 30 hari

      await prisma.tenantBackup.create({
        data: {
          Tenant: { connect: { id: tenant.id } },
          file_path: `s3://${BACKUP_BUCKET}/${snapshotKey}`,
          file_size_bytes: BigInt(buffer.length),
          checksum_sha256: manifest.checksum_sha256 || 'none',
          status: 'READY',
          expires_at: expiresAt
        }
      });

      // 5. Replikasi otomatis ke MinIO Sekunder (jika aktif)
      await backupReplicationService.replicateFileIfEnabled(snapshotKey);
      await backupReplicationService.replicateFileIfEnabled(latestKey);

      console.log(`   ✅ Selesai untuk ${tenant.name}.\n`);
    }

    // 5. Tampilkan Struktur Folder yang Terbentuk di MinIO
    console.log(`\n📁 ================= STRUKTUR FOLDER MINIO =================`);
    const objects = await s3Client.send(new ListObjectsV2Command({ Bucket: BACKUP_BUCKET }));
    
    // Grouping by folder
    const folders: Record<string, string[]> = {};
    objects.Contents?.forEach(obj => {
      const parts = (obj.Key || '').split('/');
      const f = parts[0];
      const filename = parts.slice(1).join('/');
      if (!folders[f]) folders[f] = [];
      const mb = ((obj.Size || 0) / (1024 * 1024)).toFixed(2);
      folders[f].push(`${filename} (${mb} MB)`);
    });

    for (const [fName, files] of Object.entries(folders)) {
      console.log(`📂 ${fName}/`);
      files.forEach(file => console.log(`    ├── 📄 ${file}`));
    }

    console.log('\n🎉 =========================================================');
    console.log('   PENCADANGAN MANUSIAWI SELESAI DENGAN SEMPURNA!');
    console.log('   👉 Cek MinIO Web Console sekarang:');
    console.log(`      http://10.10.10.250:9001/browser/${BACKUP_BUCKET}`);
    console.log('=========================================================\n');

  } catch (error: any) {
    console.error('❌ Terjadi Kesalahan:', error);
  } finally {
    await prisma.$disconnect();
  }
}

runPlatformBackupSimulation();
