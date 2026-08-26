// @ts-nocheck
import { DashboardController } from '../../controllers/dashboard.controller';
import { requireCapability } from '@/middlewares/requireCapability';
import { determineDataScope } from '@/middlewares/dataScope';

export async function dashboardOverviewRoutes(fastify: any) {
  const dashboardController = new DashboardController();
  /**
   * 1️⃣ Dashboard Overview
   * GET /dashboard/overview
   * Query params: tanggal (optional, format: YYYY-MM-DD)
   */
  fastify.get('/overview', {
    preHandler: [requireCapability('dashboard.view.overview'), determineDataScope()],
    schema: {
      description: 'Get dashboard overview with daily statistics',
      tags: ['Dashboard'],
      querystring: {
        type: 'object',
        properties: {
          tanggal: {
            type: 'string',
            format: 'date',
            description: 'Target date (YYYY-MM-DD), defaults to today'
          }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            data: {
              type: 'object',
              properties: {
                tanggal: { type: 'string' },
                total_siswa: { type: 'number' },
                total_guru: { type: 'number' },
                siswa_hadir: { type: 'number' },
                siswa_izin: { type: 'number' },
                siswa_sakit: { type: 'number' },
                siswa_alpa: { type: 'number' },
                guru_hadir: { type: 'number' },
                guru_tidak_hadir: { type: 'number' },
                persentase_siswa: { type: 'number' },
                persentase_guru: { type: 'number' }
              }
            }
          }
        }
      }
    }
  }, dashboardController.getOverview.bind(dashboardController));

  /**
   * 🆕 Get Guru Attendance Status
   * GET /dashboard/guru/attendance
   */
  fastify.get('/guru/attendance', {
    preHandler: [requireCapability("dashboard.view.teacher.attendance"), determineDataScope()],
    schema: {
      description: 'Get current guru attendance status',
      tags: ['Dashboard'],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            data: {
              type: 'object',
              properties: {
                isCheckedIn: { type: 'boolean' },
                status: { type: 'string' },
                waktu_checkin: { type: 'string' }
              }
            }
          }
        }
      }
    }
  }, dashboardController.getGuruAttendance.bind(dashboardController));

  /**
   * 🆕 Get Violation Stats
   * GET /dashboard/kesiswaan/violations
   */
  fastify.get('/kesiswaan/violations', {
    preHandler: [requireCapability("dashboard.view.violation.stats"), determineDataScope()],
    schema: {
      description: 'Get latest violation reports',
      tags: ['Dashboard'],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            data: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  student: { type: 'string' },
                  class: { type: 'string' },
                  violation: { type: 'string' },
                  points: { type: 'number' },
                  date: { type: 'string' },
                  status: { type: 'string' }
                }
              }
            }
          }
        }
      }
    }
  }, dashboardController.getViolationStats.bind(dashboardController));

  /**
   * 🆕 Get Supervision Schedule
   * GET /dashboard/kurikulum/supervision
   */
  fastify.get('/kurikulum/supervision', {
    preHandler: [requireCapability('curriculum.supervision.view.schedule'), determineDataScope()],
    schema: {
      description: 'Get today supervision schedule',
      tags: ['Dashboard'],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            data: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  teacher: { type: 'string' },
                  subject: { type: 'string' },
                  class: { type: 'string' },
                  time: { type: 'string' },
                  status: { type: 'string' }
                }
              }
            }
          }
        }
      }
    }
  }, dashboardController.getSupervisionSchedule.bind(dashboardController));

  fastify.get('/kepsek/escalations', {
    preHandler: [requireCapability('dashboard.view.overview'), determineDataScope()],
    schema: {
      description: 'Get escalation inbox for principal dashboard',
      tags: ['Dashboard'],
      querystring: {
        type: 'object',
        properties: {
          limit: { type: 'number', default: 10 }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            data: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  title: { type: 'string' },
                  source: { type: 'string' },
                  status: { type: 'string' },
                  created_at: { type: 'string' },
                  priority: { type: 'string' },
                  points: { type: 'number' }
                }
              }
            }
          }
        }
      }
    }
  }, dashboardController.getKepsekEscalations.bind(dashboardController));

  /**
   * 🆕 Get Kurikulum Global Monitoring
   * GET /dashboard/kurikulum/monitoring-global
   */
  fastify.get('/kurikulum/monitoring-global', {
    preHandler: [requireCapability(['dashboard.view.kurikulum', 'attendance.sessions.view.list']), determineDataScope()],
    schema: {
      description: 'Get global KBM monitoring stats for Kurikulum',
      tags: ['Dashboard'],
      querystring: {
        type: 'object',
        properties: {
          tanggal: { type: 'string', format: 'date' }
        }
      }
    }
  }, dashboardController.getKurikulumMonitoringGlobal.bind(dashboardController));

  /**
   * 2️⃣ Statistik Harian per Kelas
   * GET /dashboard/statistik/kelas/:tanggal
   */
}
