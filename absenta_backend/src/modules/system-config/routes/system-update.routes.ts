import { requireCapability } from '../../../middlewares/requireCapability';
import {
  checkUpdates,
  executeUpdate,
  readProgress,
} from '../services/system-update.service';
import { exec } from 'child_process';
import { determineDataScope } from '@/middlewares/dataScope';

export async function systemUpdateRoutes(fastify: any) {
  // GET /api/system/update/check
  // Cek apakah ada commit baru di GitHub (backend + frontend)
  fastify.get('/check', {
    preHandler: [requireCapability('core.system.config.update'), determineDataScope()],
    handler: async (_req: any, reply: any) => {
      try {
        const result = await checkUpdates();
        return reply.send({ success: true, data: result });
      } catch (err: any) {
        return reply.status(500).send({
          success: false,
          error: err?.message || 'Gagal memeriksa pembaruan dari GitHub',
        });
      }
    },
  });

  // GET /api/system/update/status
  // Baca progres update yang sedang/sudah berjalan
  fastify.get('/status', {
    preHandler: [requireCapability('core.system.config.update'), determineDataScope()],
    handler: async (_req: any, reply: any) => {
      return reply.send({ success: true, data: readProgress() });
    },
  });

  // POST /api/system/update/execute
  // Mulai proses update di background
  fastify.post('/execute', {
    preHandler: [requireCapability('core.system.config.update'), determineDataScope()],
    handler: async (_req: any, reply: any) => {
      const current = readProgress();
      if (current.status === 'running') {
        return reply.status(400).send({
          success: false,
          error: 'Proses pembaruan sedang berjalan. Silakan tunggu hingga selesai.',
        });
      }
      // Fire-and-forget — tidak di-await
      executeUpdate();
      return reply.send({
        success: true,
        message: 'Proses pembaruan telah dimulai di latar belakang.',
      });
    },
  });

  // POST /api/system/update/restart
  // Paksa restart semua proses PM2 tanpa update kode
  fastify.post('/restart', {
    preHandler: [requireCapability('core.system.config.update'), determineDataScope()],
    handler: async (_req: any, reply: any) => {
      reply.send({ success: true, message: 'Perintah restart PM2 telah dikirim.' });
      setTimeout(() => {
        exec('pm2 reload ecosystem.config.js --update-env', (err) => {
          if (err) {
            console.warn('[System] pm2 reload failed, falling back to restart all:', err.message);
            exec('pm2 restart all', () => {});
          }
        });
      }, 800);
    },
  });
}
