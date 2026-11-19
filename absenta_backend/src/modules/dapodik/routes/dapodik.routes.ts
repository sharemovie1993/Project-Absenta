import { dapodikController } from '../controllers/dapodik.controller';
import { requireCapability } from '@/middlewares/requireCapability';
import { determineDataScope } from '@/middlewares/dataScope';

export async function dapodikRoutes(fastify: any) {
  // Capabilitas untuk membaca data Dapodik: Kurikulum/Admin (academic.dapodik.view), atau Wali Kelas binaan
  const dapodikViewCaps = ['academic.dapodik.view', 'academic.homeroom.manage', 'dashboard.view.walikelas'];

  // 1. Info Network Interface Server (Dapat diakses oleh siapa pun yang punya izin view dapodik/sekolah)
  fastify.get('/server-info', {
    preHandler: [requireCapability(dapodikViewCaps), determineDataScope()],
    handler: dapodikController.getServerNetworkInfo.bind(dapodikController),
  });

  // 2. Ambil Konfigurasi Dapodik Tenant
  fastify.get('/config', {
    preHandler: [requireCapability(dapodikViewCaps), determineDataScope()],
    handler: dapodikController.getConfig.bind(dapodikController),
  });

  // 3. Simpan / Perbarui Konfigurasi Dapodik
  fastify.post('/config', {
    preHandler: [requireCapability('academic.dapodik.manage'), determineDataScope()],
    handler: dapodikController.saveConfig.bind(dapodikController),
  });

  // 4. Uji Koneksi (Handshake) ke Host Dapodik
  fastify.post('/test-connection', {
    preHandler: [requireCapability('academic.dapodik.manage'), determineDataScope()],
    handler: dapodikController.testConnection.bind(dapodikController),
  });

  // 5. Jalankan Diff Engine / Komparasi Siswa (Mendukung source_mode: LIVE | STAGING)
  fastify.get('/compare-students', {
    preHandler: [requireCapability(dapodikViewCaps), determineDataScope()],
    handler: dapodikController.compareStudents.bind(dapodikController),
  });

  // 5b. Metadata Storage Staging Platform
  fastify.get('/staging-meta', {
    preHandler: [requireCapability(dapodikViewCaps), determineDataScope()],
    handler: dapodikController.getStagingMeta.bind(dapodikController),
  });

  // 5c. Hancurkan Metadata & Snapshot Staging Storage Platform (Purge)
  fastify.post('/staging/purge', {
    preHandler: [requireCapability('academic.dapodik.manage'), determineDataScope()],
    handler: dapodikController.purgeStagingSnapshot.bind(dapodikController),
  });

  // 6. Eksekusi Sinkronisasi / Pemutakhiran Siswa
  fastify.post('/sync-students', {
    preHandler: [requireCapability('academic.dapodik.manage'), determineDataScope()],
    handler: dapodikController.syncStudents.bind(dapodikController),
  });
}
