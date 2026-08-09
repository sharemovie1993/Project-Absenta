import { attendanceNotifyController } from '../controllers/notify.controller';
import { allowBothModes } from '@/middlewares/attendanceMode';
import { requireCapability } from '@/middlewares/requireCapability';
import { determineDataScope } from '@/middlewares/dataScope';

export async function attendanceNotifyRoutes(fastify: any) {
  fastify.post('/session-created', {
    preHandler: [
      allowBothModes,
      requireCapability('attendance.notifications.send'),
    determineDataScope(),
  ],
    handler: attendanceNotifyController.sessionCreated,
  });

  fastify.get('/feed', {
    preHandler: [
      allowBothModes,
      requireCapability('attendance.reports.view'),
    determineDataScope(),
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
