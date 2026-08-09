import { allowBothModes } from '@/middlewares/attendanceMode';
import { requireCapability } from '@/middlewares/requireCapability';
import { getRekapHarianGuru, getStatistikHarian } from '../../rekap/controllers/rekap.controller';
import { determineDataScope } from '@/middlewares/dataScope';

/**
 * Guru Monitoring routes
 * Alias endpoints that surface guru daily recap and simple statistics
 * under /attendance/guru-monitoring to align with navigation seed items.
 */
export async function guruMonitoringRoutes(fastify: any) {
  // GET /attendance/guru-monitoring/harian?tanggal=YYYY-MM-DD
  fastify.get('/harian', {
    preHandler: [allowBothModes, requireCapability(['attendance.reports.view', 'academic.teachers.view.list']), determineDataScope()],
    schema: {
      description: 'Get daily teacher attendance recap (alias of rekap guru harian)',
      tags: ['Guru Monitoring'],
      querystring: {
        type: 'object',
        properties: {
          tanggal: {
            type: 'string',
            pattern: '^\\d{4}-\\d{2}-\\d{2}$',
            description: 'Date in YYYY-MM-DD format',
          },
        },
        required: ['tanggal'],
      },
    },
  }, getRekapHarianGuru);

  // GET /attendance/guru-monitoring/statistik/harian?tanggal=YYYY-MM-DD
  fastify.get('/statistik/harian', {
    preHandler: [allowBothModes, requireCapability('attendance.reports.view'), determineDataScope()],
    schema: {
      description: 'Get daily attendance statistics for dashboard (alias of rekap statistik harian)',
      tags: ['Guru Monitoring'],
      querystring: {
        type: 'object',
        properties: {
          tanggal: {
            type: 'string',
            pattern: '^\\d{4}-\\d{2}-\\d{2}$',
            description: 'Date in YYYY-MM-DD format',
          },
          tahun_pelajaran_id: { type: 'string', description: 'Optional Tahun Pelajaran filter' },
        },
        required: ['tanggal'],
      },
    },
  }, getStatistikHarian);
}
