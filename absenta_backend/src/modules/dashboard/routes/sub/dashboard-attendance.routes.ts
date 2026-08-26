// @ts-nocheck
import { DashboardController } from '../../controllers/dashboard.controller';
import { requireCapability } from '@/middlewares/requireCapability';
import { determineDataScope } from '@/middlewares/dataScope';

export async function dashboardAttendanceRoutes(fastify: any) {
  const dashboardController = new DashboardController();
  fastify.get('/statistik/kelas/:tanggal', {
    preHandler: [requireCapability(['attendance.reports.view', 'academic.structures.view.list', 'academic.teaching.rekap']), determineDataScope()],
    schema: {
      description: 'Get daily attendance statistics per class',
      tags: ['Dashboard'],
      params: {
        type: 'object',
        required: ['tanggal'],
        properties: {
          tanggal: {
            type: 'string',
            format: 'date',
            description: 'Target date (YYYY-MM-DD)'
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
                totalKelas: { type: 'number' },
                kelasAktif: { type: 'number' },
                list: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      kelas: { type: 'string' },
                      kelas_id: { type: 'string' },
                      HADIR: { type: 'number' },
                      TERLAMBAT: { type: 'number' },
                      IZIN: { type: 'number' },
                      SAKIT: { type: 'number' },
                      ALPA: { type: 'number' },
                      populasi_histori: { type: 'number' },
                      persentase_kehadiran_histori: { type: 'number' }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }, dashboardController.getStatistikKelasHarian.bind(dashboardController));

  /**
   * 3️⃣ Statistik Bulanan per Kelas
   * GET /dashboard/statistik/kelas/:kelas_id/bulan/:bulan
   */
  fastify.get('/statistik/kelas/:kelas_id/bulan/:bulan', {
    preHandler: [requireCapability(['attendance.reports.view', 'academic.structures.view.list', 'academic.teaching.rekap']), determineDataScope()],
    schema: {
      description: 'Get monthly attendance statistics for specific class',
      tags: ['Dashboard'],
      params: {
        type: 'object',
        required: ['kelas_id', 'bulan'],
        properties: {
          kelas_id: {
            type: 'string',
            description: 'Class ID'
          },
          bulan: {
            type: 'string',
            description: 'Month in format YYYY-MM or "Oktober 2025"'
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
                kelas: { type: 'string' },
                bulan: { type: 'string' },
                statistik: {
                  type: 'object',
                  properties: {
                    HADIR: { type: 'number' },
                    TERLAMBAT: { type: 'number' },
                    IZIN: { type: 'number' },
                    SAKIT: { type: 'number' },
                    ALPA: { type: 'number' },
                    total_poin: { type: 'number' }
                  }
                },
                persentase_kehadiran: { type: 'number' },
                populasi_histori: { type: 'number' },
                persentase_kehadiran_histori: { type: 'number' }
              }
            }
          }
        }
      }
    }
  }, dashboardController.getStatistikKelasBulanan.bind(dashboardController));

  /**
   * 4️⃣ Statistik Guru Harian
   * GET /dashboard/statistik/guru/:tanggal
   */
  fastify.get('/statistik/guru/:tanggal', {
    preHandler: [requireCapability(['academic.teaching.rekap', 'attendance.reports.view']), determineDataScope()],
    schema: {
      description: 'Get daily teacher attendance statistics',
      tags: ['Dashboard'],
      params: {
        type: 'object',
        required: ['tanggal'],
        properties: {
          tanggal: {
            type: 'string',
            format: 'date',
            description: 'Target date (YYYY-MM-DD)'
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
                totalGuru: { type: 'number' },
                guruHadir: { type: 'number' },
                guruIzin: { type: 'number' },
                guruSakit: { type: 'number' },
                guruAlpa: { type: 'number' },
                list: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      guru_id: { type: 'string' },
                      nama_guru: { type: 'string' },
                      total_sesi: { type: 'number' },
                      hadir: { type: 'number' },
                      persentase: { type: 'number' },
                      status: { type: 'string' }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }, dashboardController.getStatistikGuruHarian.bind(dashboardController));

  /**
   * 5️⃣ Grafik Bulanan Kehadiran Siswa
   * GET /dashboard/grafik/siswa/:bulan
   */
  fastify.get('/grafik/siswa/:bulan', {
    preHandler: [requireCapability('attendance.reports.view'), determineDataScope()],
    schema: {
      description: 'Get monthly student attendance chart data',
      tags: ['Dashboard'],
      params: {
        type: 'object',
        required: ['bulan'],
        properties: {
          bulan: {
            type: 'string',
            pattern: '^\\d{4}-\\d{2}$',
            description: 'Month in format YYYY-MM (e.g., 2025-10)'
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
                labels: {
                  type: 'array',
                  items: { type: 'string' }
                },
                datasets: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      label: { type: 'string' },
                      data: {
                        type: 'array',
                        items: { type: 'number' }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }, dashboardController.getGrafikSiswaBulanan.bind(dashboardController));

  /**
   * 6️⃣ Grafik Bulanan Guru
   * GET /dashboard/grafik/guru/:bulan
   */
  fastify.get('/grafik/guru/:bulan', {
    preHandler: [requireCapability("dashboard.view.guru"), determineDataScope()],
    schema: {
      description: 'Get monthly teacher attendance chart data',
      tags: ['Dashboard'],
      params: {
        type: 'object',
        required: ['bulan'],
        properties: {
          bulan: {
            type: 'string',
            pattern: '^\\d{4}-\\d{2}$',
            description: 'Month in format YYYY-MM (e.g., 2025-10)'
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
                labels: {
                  type: 'array',
                  items: { type: 'string' }
                },
                datasets: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      label: { type: 'string' },
                      data: {
                        type: 'array',
                        items: { type: 'number' }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }, dashboardController.getGrafikGuruBulanan.bind(dashboardController));

  /**
   * 6️⃣ Dashboard Analytics Stats
   * GET /dashboard/stats
   */
}
