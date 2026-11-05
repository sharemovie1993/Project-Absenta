import { dapodikController } from '../controllers/dapodik.controller';
import { requireCapability } from '@/middlewares/requireCapability';
import { determineDataScope } from '@/middlewares/dataScope';

export async function dapodikRoutes(fastify: any) {
  // 1. Info Network Interface Server (Dapat diakses oleh siapa pun yang punya izin view dapodik/sekolah)
  fastify.get('/server-info', {
    preHandler: [requireCapability('academic.dapodik.view'), determineDataScope()],
    handler: dapodikController.getServerNetworkInfo.bind(dapodikController),
  });

  // 2. Ambil Konfigurasi Dapodik Tenant
  fastify.get('/config', {
    preHandler: [requireCapability('academic.dapodik.view'), determineDataScope()],
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

  // 5. Jalankan Diff Engine / Komparasi Siswa
  fastify.get('/compare-students', {
    preHandler: [requireCapability('academic.dapodik.view'), determineDataScope()],
    handler: dapodikController.compareStudents.bind(dapodikController),
  });

  // 6. Eksekusi Sinkronisasi / Pemutakhiran Siswa
  fastify.post('/sync-students', {
    preHandler: [requireCapability('academic.dapodik.manage'), determineDataScope()],
    handler: dapodikController.syncStudents.bind(dapodikController),
  });
}
