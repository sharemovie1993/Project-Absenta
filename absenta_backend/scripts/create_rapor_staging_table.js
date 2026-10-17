const { PrismaClient } = require('@prisma/client');
require('dotenv').config();
const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Creating table rapor_staging_sheets if not exists...');
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS rapor_staging_sheets (
        id VARCHAR(64) PRIMARY KEY,
        tenant_id VARCHAR(64) NOT NULL,
        source_url TEXT NOT NULL,
        file_title VARCHAR(255) NULL,
        tahun_pelajaran_id VARCHAR(64) NULL,
        tahun_pelajaran_nama VARCHAR(50) NOT NULL,
        semester VARCHAR(20) NOT NULL,
        kelas_id VARCHAR(64) NULL,
        nama_kelas VARCHAR(50) NOT NULL,
        wali_kelas_nama VARCHAR(150) NULL,
        jurusan_nama VARCHAR(150) NULL,
        total_siswa INT DEFAULT 0,
        total_mapel INT DEFAULT 0,
        metadata_json JSONB NULL,
        sumatif_sheet_data JSONB NOT NULL,
        cp_sheet_data JSONB NOT NULL,
        status VARCHAR(20) DEFAULT 'READY',
        last_synced_at TIMESTAMP NULL,
        sync_logs JSONB NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS idx_rapor_staging_tenant ON rapor_staging_sheets(tenant_id)
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS idx_rapor_staging_tp_sem ON rapor_staging_sheets(tenant_id, tahun_pelajaran_nama, semester)
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS idx_rapor_staging_kelas ON rapor_staging_sheets(tenant_id, nama_kelas)
    `);

    console.log('✅ Table rapor_staging_sheets and indexes successfully created/verified!');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
