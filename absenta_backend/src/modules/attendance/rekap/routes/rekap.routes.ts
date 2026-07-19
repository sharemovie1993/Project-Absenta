
import { allowBothModes } from '../../../../middlewares/attendanceMode';
import { requireCapability } from '@/middlewares/requireCapability';
import { organizationalScopeMiddleware } from '@/middlewares/organizationalScope';
import {
  getRekapHarianSiswa,
  getRekapHarianSiswaMe,
  getRekapBulananSiswa,
  getRekapBulananSiswaMe,
  getRekapBulananKelas,
  getRekapHarianGuru,
  getTrackingHarianSiswa,
  getStatistikHarian,
  getRekapBulananGuruMe,
  getRekapHarianKelas,
  getLeaderboard,
} from '../controllers/rekap.controller';

export async function rekapRoutes(fastify: any) {
  fastify.get('/leaderboard', {
    preHandler: [requireCapability('attendance.reports.view')],
    handler: getLeaderboard
  });
  fastify.get('/siswa/me/harian', {
    preHandler: [allowBothModes, organizationalScopeMiddleware, requireCapability('attendance.reports.view')],
    schema: {
      description: 'Get daily attendance recap for current student',
      tags: ['Rekap'],
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
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            data: {
              type: 'object',
              properties: {
                nama_siswa: { type: 'string' },
                tanggal: { type: 'string' },
                status: { type: 'string' },
                rincian: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      jenis_kegiatan: { type: 'string' },
                      status: { type: 'string' },
                      waktu_tap: { type: ['string', 'null'] },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  }, getRekapHarianSiswaMe);

  fastify.get('/siswa/me/bulanan', {
    preHandler: [allowBothModes, organizationalScopeMiddleware, requireCapability('attendance.reports.view')],
    schema: {
      description: 'Get monthly attendance recap for current student',
      tags: ['Rekap'],
      querystring: {
        type: 'object',
        properties: {
          bulan: {
            type: 'string',
            pattern: '^\\d{4}-\\d{2}$',
            description: 'Month in YYYY-MM format',
          },
          tahun_pelajaran_id: { type: 'string', description: 'Optional Tahun Pelajaran filter' },
        },
        required: ['bulan'],
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
                nama_siswa: { type: 'string' },
                bulan: { type: 'string' },
                persentase_kehadiran: { type: 'number' },
                total_hadir: { type: 'number' },
                total_izin: { type: 'number' },
                total_sakit: { type: 'number' },
                total_alpa: { type: 'number' },
                total_terlambat: { type: 'number' },
                total_poin: { type: 'number' },
                statistik: {
                  type: 'object',
                  properties: {
                    HADIR: { type: 'number' },
                    IZIN: { type: 'number' },
                    SAKIT: { type: 'number' },
                    ALPA: { type: 'number' },
                    TERLAMBAT: { type: 'number' },
                  },
                },
                detail: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      tanggal: { type: 'string' },
                      status: { type: 'string' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  }, getRekapBulananSiswaMe);

  fastify.get('/siswa/:id/harian', {
    preHandler: [allowBothModes, organizationalScopeMiddleware, requireCapability('attendance.reports.view')],
    schema: {
      description: 'Get daily attendance recap for a specific student',
      tags: ['Rekap'],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Student ID' },
        },
        required: ['id'],
      },
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
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            data: {
              type: 'object',
              properties: {
                nama_siswa: { type: 'string' },
                tanggal: { type: 'string' },
                status: { type: 'string' },
                rincian: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      jenis_kegiatan: { type: 'string' },
                      status: { type: 'string' },
                      waktu_tap: { type: ['string', 'null'] },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  }, getRekapHarianSiswa);

  fastify.get('/siswa/:id/bulanan', {
    preHandler: [allowBothModes, organizationalScopeMiddleware, requireCapability('attendance.reports.view')],
    schema: {
      description: 'Get monthly attendance recap for a specific student',
      tags: ['Rekap'],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Student ID' },
        },
        required: ['id'],
      },
      querystring: {
        type: 'object',
        properties: {
          bulan: { 
            type: 'string', 
            pattern: '^\\d{4}-\\d{2}$',
            description: 'Month in YYYY-MM format',
          },
          tahun_pelajaran_id: { type: 'string', description: 'Optional Tahun Pelajaran filter' },
        },
        required: ['bulan'],
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
                nama_siswa: { type: 'string' },
                bulan: { type: 'string' },
                persentase_kehadiran: { type: 'number' },
                total_hadir: { type: 'number' },
                total_izin: { type: 'number' },
                total_sakit: { type: 'number' },
                total_alpa: { type: 'number' },
                total_terlambat: { type: 'number' },
                total_poin: { type: 'number' },
                statistik: {
                  type: 'object',
                  properties: {
                    HADIR: { type: 'number' },
                    IZIN: { type: 'number' },
                    SAKIT: { type: 'number' },
                    ALPA: { type: 'number' },
                    TERLAMBAT: { type: 'number' },
                  },
                },
                detail: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      tanggal: { type: 'string' },
                      status: { type: 'string' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  }, getRekapBulananSiswa);

  fastify.get('/kelas/:id/harian', {
    preHandler: [allowBothModes, organizationalScopeMiddleware, requireCapability(['attendance.reports.view', 'academic.structures.view.list'])],
    schema: {
      description: 'Get daily attendance recap for all students in a specific class (bulk)',
      tags: ['Rekap'],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Class (Kelas) ID' },
        },
        required: ['id'],
      },
      querystring: {
        type: 'object',
        properties: {
          tanggal: { type: 'string', description: 'Date in YYYY-MM-DD format (defaults to today)' },
          tahun_pelajaran_id: { type: 'string', description: 'Optional Tahun Pelajaran filter' },
        },
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
                  nama: { type: 'string' },
                  status: { type: 'string' },
                  poin: { type: 'number' },
                },
              },
            },
            meta: {
              type: 'object',
              properties: {
                kelasId: { type: 'string' },
                tanggal: { type: 'string' },
                totalSiswa: { type: 'number' },
                totalHadir: { type: 'number' },
                totalAbsen: { type: 'number' },
              },
            },
          },
        },
      },
    },
  }, getRekapHarianKelas);

  fastify.get('/kelas/:id/bulanan', {
    preHandler: [allowBothModes, organizationalScopeMiddleware, requireCapability(['attendance.reports.view', 'academic.structures.view.list'])],
    schema: {
      description: 'Get monthly attendance recap for a specific class',
      tags: ['Rekap'],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Class ID' },
        },
        required: ['id'],
      },
      querystring: {
        type: 'object',
        properties: {
          bulan: { 
            type: 'string', 
            pattern: '^\\d{4}-\\d{2}$',
            description: 'Month in YYYY-MM format',
          },
          tahun_pelajaran_id: { type: 'string', description: 'Optional Tahun Pelajaran filter' },
        },
        required: ['bulan'],
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
                  siswa_id: { type: 'string' },
                  nama_siswa: { type: 'string' },
                  HADIR: { type: 'number' },
                  SAKIT: { type: 'number' },
                  ALPA: { type: 'number' },
                  IZIN: { type: 'number' },
                  TERLAMBAT: { type: 'number' },
                  total_poin: { type: 'number' },
                },
              },
            },
          },
        },
      },
    },
  }, getRekapBulananKelas);

  // 4. Rekap Harian Guru
  // GET /api/attendance/rekap/guru/harian?tanggal=YYYY-MM-DD
  fastify.get('/guru/harian', {
    preHandler: [allowBothModes, organizationalScopeMiddleware, requireCapability('academic.teaching.rekap')],
    schema: {
      description: 'Get daily teacher attendance recap',
      tags: ['Rekap'],
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
                  nama_guru: { type: 'string' },
                  mapel: { type: 'string' },
                  kelas: { type: 'string' },
                  status: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
  }, getRekapHarianGuru);

  fastify.get('/siswa/:id/tracking', {
    preHandler: [allowBothModes, organizationalScopeMiddleware, requireCapability('attendance.reports.view')],
    schema: {
      description: 'Get daily activity tracking for a specific student',
      tags: ['Rekap'],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Student ID' },
        },
        required: ['id'],
      },
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
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            data: {
              type: 'object',
              properties: {
                nama: { type: 'string' },
                nis: { type: 'string' },
                tanggal: { type: 'string' },
                status: { type: 'string' },
                kegiatan: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      waktu: { type: 'string' },
                      jenis_kegiatan: { type: 'string' },
                      status: { type: 'string' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  }, getTrackingHarianSiswa);

  fastify.get('/statistik/harian', {
    preHandler: [allowBothModes, organizationalScopeMiddleware, requireCapability('attendance.reports.view')],
    schema: {
      description: 'Get daily attendance statistics for dashboard',
      tags: ['Rekap'],
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
                  kelas: { type: 'string' },
                  HADIR: { type: 'number' },
                  IZIN: { type: 'number' },
                  SAKIT: { type: 'number' },
                  ALPA: { type: 'number' },
                  TERLAMBAT: { type: 'number' },
                  DISPEN: { type: 'number' },
                },
              },
            },
          },
        },
      },
    },
  }, getStatistikHarian);

  fastify.get('/guru/me/bulanan', {
    preHandler: [allowBothModes, organizationalScopeMiddleware, requireCapability('attendance.reports.view')],
    schema: {
      description: 'Get monthly attendance recap for current teacher',
      tags: ['Rekap'],
      querystring: {
        type: 'object',
        properties: {
          bulan: {
            type: 'string',
            pattern: '^\\d{4}-\\d{2}$',
            description: 'Month in YYYY-MM format',
          },
          tahun_pelajaran_id: { type: 'string', description: 'Optional Tahun Pelajaran filter' },
        },
        required: ['bulan'],
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
                nama_guru: { type: 'string' },
                bulan: { type: 'string' },
                statistik: {
                  type: 'object',
                  properties: {
                    HADIR: { type: 'number' },
                    TERLAMBAT: { type: 'number' },
                    IZIN: { type: 'number' },
                    SAKIT: { type: 'number' },
                    ALPA: { type: 'number' },
                    DISPEN: { type: 'number' },
                  },
                },
                total_poin: { type: 'number' },
                persentase_kehadiran: { type: 'number' },
                detail: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      tanggal: { type: 'string' },
                      status: { type: 'string' },
                      count: { type: 'number' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  }, getRekapBulananGuruMe);
}
