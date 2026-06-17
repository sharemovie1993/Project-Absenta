import { attendanceNotifyController } from '../controllers/notify.controller';
import { allowBothModes } from '@/middlewares/attendanceMode';
import { requireCapability } from '@/middlewares/requireCapability';

export async function attendanceNotifyRoutes(fastify: any) {
  fastify.post('/session-created', {
    preHandler: [
      allowBothModes,
      requireCapability('attendance.notifications.send'),
    ],
    handler: attendanceNotifyController.sessionCreated,
  });

  fastify.get('/feed', {
    preHandler: [
      allowBothModes,
      requireCapability('attendance.reports.view'),
    ],
    schema: {
      querystring: {
        type: 'object',
        properties: {
          tanggal: { type: 'string', format: 'date' },
          kelas_id: { type: 'string' },
        },
      },
    },
    handler: attendanceNotifyController.feed,
  });
}
