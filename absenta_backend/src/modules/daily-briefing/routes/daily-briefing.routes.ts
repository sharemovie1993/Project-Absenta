/**
 * daily-briefing.routes.ts
 * Registrasi rute Fastify untuk Daily Briefing & Tokenized Reports.
 */

import { dailyBriefingController } from '../controllers/daily-briefing.controller';
import { requireCapability } from '@/middlewares/requireCapability';

export async function dailyBriefingRoutes(fastify: any) {
  // 1. Endpoint Publik Bebas Login (Token-Guarded via Query `?token=...`)
  fastify.get(
    '/daily-briefing',
    {
      config: { skipAuth: true, public: true },
    },
    dailyBriefingController.getBriefingByToken.bind(dailyBriefingController)
  );

  fastify.get(
    '/daily-briefing/public',
    {
      config: { skipAuth: true, public: true },
    },
    dailyBriefingController.getBriefingByToken.bind(dailyBriefingController)
  );

  // 2. Endpoint Khusus Administrator / Pimpinan (Membutuhkan Login & Akses Dashboard)
  fastify.post(
    '/daily-briefing/trigger-send',
    {
      preHandler: [requireCapability('dashboard.view.overview')],
    },
    dailyBriefingController.triggerSend.bind(dailyBriefingController)
  );

  fastify.get(
    '/daily-briefing/preview',
    {
      preHandler: [requireCapability('dashboard.view.overview')],
    },
    dailyBriefingController.previewBriefing.bind(dailyBriefingController)
  );

  fastify.get(
    '/daily-briefing/group-target',
    {
      preHandler: [requireCapability('dashboard.view.overview')],
    },
    dailyBriefingController.getGroupTarget.bind(dailyBriefingController)
  );

  fastify.post(
    '/daily-briefing/group-target',
    {
      preHandler: [requireCapability('dashboard.view.overview')],
    },
    dailyBriefingController.saveGroupTarget.bind(dailyBriefingController)
  );
}
