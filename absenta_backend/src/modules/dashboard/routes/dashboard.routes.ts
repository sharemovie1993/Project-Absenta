import { DashboardController } from '../controllers/dashboard.controller';
import { requireCapability } from '../../../middlewares/requireCapability';

export async function dashboardRoutes(fastify: any) {
  const dashboardController = new DashboardController();

  /**
   * 1️⃣ Dashboard Overview
   * GET /dashboard/overview
   * Query params: tanggal (optional, format: YYYY-MM-DD)
   */
  fastify.get('/overview', {
    preHandler: [requireCapability('dashboard.view.overview')],
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
    preHandler: [requireCapability("dashboard.view.teacher.attendance")],
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
    preHandler: [requireCapability("dashboard.view.violation.stats")],
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
    preHandler: [requireCapability('curriculum.supervision.view.schedule')],
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
    preHandler: [requireCapability('dashboard.view.overview')],
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
    preHandler: [requireCapability(['dashboard.view.kurikulum', 'attendance.sessions.view.list'])],
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
  fastify.get('/statistik/kelas/:tanggal', {
    preHandler: [requireCapability(['attendance.reports.view', 'academic.structures.view.list', 'academic.teaching.rekap'])],
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
    preHandler: [requireCapability(['attendance.reports.view', 'academic.structures.view.list', 'academic.teaching.rekap'])],
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
    preHandler: [requireCapability(['academic.teaching.rekap', 'attendance.reports.view'])],
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
    preHandler: [requireCapability('attendance.reports.view')],
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
    preHandler: [requireCapability("dashboard.view.guru")],
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
  fastify.get('/stats', {
    preHandler: [requireCapability("dashboard.view.financial.summary")],
    schema: {
      description: 'Get dashboard analytics statistics',
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
                totalUsers: { type: 'number' },
                totalBilling: { type: 'number' },
                totalPayments: { type: 'number' },
                totalRevenue: { type: 'number' },
                userGrowth: { type: 'number' },
                billingGrowth: { type: 'number' },
                paymentGrowth: { type: 'number' },
                revenueGrowth: { type: 'number' }
              }
            }
          }
        }
      }
    }
  }, dashboardController.getDashboardStats.bind(dashboardController));

  /**
   * 7️⃣ Recent Payments
   * GET /dashboard/recent-payments
   */
  fastify.get('/recent-payments', {
    preHandler: [requireCapability("dashboard.view.financial.summary")],
    schema: {
      description: 'Get recent payments for analytics',
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
                  billingId: { type: 'string' },
                  amount: { type: 'number' },
                  status: { type: 'string' },
                  paymentTime: { type: 'string' }
                }
              }
            }
          }
        }
      }
    }
  }, dashboardController.getRecentPayments.bind(dashboardController));

  /**
   * 8️⃣ Payment Chart Data
   * GET /dashboard/payment-chart
   */
  fastify.get('/payment-chart', {
    preHandler: [requireCapability("dashboard.view.financial.summary")],
    schema: {
      description: 'Get payment chart data for analytics',
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
                  month: { type: 'string' },
                  amount: { type: 'number' }
                }
              }
            }
          }
        }
      }
    }
  }, dashboardController.getPaymentChart.bind(dashboardController));

  /**
   * 9️⃣ Effective Capabilities per Guru
   * GET /dashboard/guru/:guruId/capabilities
   */
  fastify.get('/guru/:guruId/capabilities', {
    preHandler: [requireCapability(['academic.teachers.view.detail', 'academic.teachers.update'])],
    schema: {
      description: 'Get effective capabilities for a guru based on active structures',
      tags: ['Dashboard'],
      params: {
        type: 'object',
        required: ['guruId'],
        properties: {
          guruId: {
            type: 'string',
            description: 'Guru ID'
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
                guru: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    nama_guru: { type: 'string' },
                    tenant_id: { type: 'string' }
                  }
                },
                structures: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      struktur_id: { type: 'string' },
                      kode: { type: 'string' },
                      nama: { type: 'string' },
                      start_date: { type: 'string', format: 'date-time' },
                      end_date: { type: ['string', 'null'], format: 'date-time' },
                      is_active: { type: 'boolean' },
                      capabilities: {
                        type: 'array',
                        items: { type: 'string' }
                      }
                    }
                  }
                },
                capabilities: {
                  type: 'array',
                  items: { type: 'string' }
                }
              }
            }
          }
        }
      }
    }
  }, dashboardController.getGuruCapabilities.bind(dashboardController));

  // Recent tenant registrations (SUPERADMIN only)
  // Hubin Stats
  fastify.get('/hubin/stats', {
    preHandler: [requireCapability('dashboard.view.hubin')],
    schema: {
      description: 'Get Hubin/PKL statistics',
      tags: ['Dashboard'],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                totalMitra: { type: 'number' },
                totalSiswaPkl: { type: 'number' },
                pklAktif: { type: 'number' },
                pendingReports: { type: 'number' },
                mouExpiringCount: { type: 'number' },
                totalLowonganAktif: { type: 'number' },
                totalAlumniTraced: { type: 'number' },
                tracerCoverage: { type: 'number' },
                employmentRate: { type: 'number' },
                totalRecruitmentSuccess: { type: 'number' },
                tracerStats: {
                  type: 'object',
                  properties: {
                    BEKERJA: { type: 'number' },
                    KULIAH: { type: 'number' },
                    WIRAUSAHA: { type: 'number' },
                    MENCARI_KERJA: { type: 'number' }
                  }
                },
                topMitra: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      nama: { type: 'string' },
                      count: { type: 'number' }
                    }
                  }
                },
                topJurusanTerserap: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      nama: { type: 'string' },
                      count: { type: 'number' }
                    }
                  }
                },
                recentPkl: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      siswa: { type: 'string' },
                      mitra: { type: 'string' },
                      status: { type: 'string' },
                      tanggal: { type: 'string' }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }, dashboardController.getHubinStats.bind(dashboardController));

  // Sarpras Stats
  fastify.get('/sarpras/stats', {
    preHandler: [requireCapability('dashboard.view.sarpras')],
    schema: {
      description: 'Get Sarpras/Inventory statistics',
      tags: ['Dashboard'],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                totalAssets: { type: 'number' },
                totalLoaned: { type: 'number' },
                totalBroken: { type: 'number' },
                recentLoans: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      asset: { type: 'string' },
                      borrower: { type: 'string' },
                      status: { type: 'string' },
                      date: { type: 'string' }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }, dashboardController.getSarprasStats.bind(dashboardController));

  // TU Stats
  fastify.get('/tu/stats', {
    preHandler: [requireCapability('dashboard.view.tu')],
    schema: {
      description: 'Get TU/Administration statistics',
      tags: ['Dashboard'],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                suratMasukBulanIni: { type: 'number' },
                suratKeluarBulanIni: { type: 'number' },
                recentSuratMasuk: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      nomor: { type: 'string' },
                      judul: { type: 'string' },
                      asal: { type: 'string' },
                      tanggal: { type: 'string' }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }, dashboardController.getTUStats.bind(dashboardController));

  // Gerbang Stats
  fastify.get('/gerbang/stats', {
    preHandler: [requireCapability('attendance.reports.view')],
    schema: {
      description: 'Get Gerbang/Gate statistics',
      tags: ['Dashboard'],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                total_taps_today: { type: 'number' },
                total_masuk: { type: 'number' },
                total_keluar: { type: 'number' },
                active_devices: { type: 'number' },
                last_activity: { type: 'string' },
                recent_activities: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      siswa: { type: 'string' },
                      arah: { type: 'string' },
                      waktu: { type: 'string' }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }, dashboardController.getGerbangStats.bind(dashboardController));

  // Petugas Stats
  fastify.get('/petugas/stats', {
    preHandler: [requireCapability('dashboard.view.overview')],
    schema: {
      description: 'Get Petugas/Officer statistics',
      tags: ['Dashboard'],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                total_sesi: { type: 'number' },
                sesi_hari_ini: { type: 'number' },
                sesi_selesai: { type: 'number' },
                last_activity: { type: 'string' }
              }
            }
          }
        }
      }
    }
  }, dashboardController.getPetugasStats.bind(dashboardController));

  // Guru Leaderboard
  fastify.get('/leaderboard-guru', {
    preHandler: [requireCapability('dashboard.view.guru')],
    schema: {
      description: 'Get teacher leaderboard based on attendance points',
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
                  guru_id: { type: 'string' },
                  nama: { type: 'string' },
                  avatar: { type: ['string', 'null'] },
                  total_poin: { type: 'number' },
                  nip: { type: 'string' }
                }
              }
            }
          }
        }
      }
    }
  }, dashboardController.getGuruLeaderboard.bind(dashboardController));

  // Kaprog Stats
  fastify.get('/kaprog/stats', {
    preHandler: [requireCapability('dashboard.view.kurikulum')],
    schema: {
      description: 'Get Kaprog/Kepala Program statistics',
      tags: ['Dashboard'],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                totalTeachers: { type: 'number' },
                activeClasses: { type: 'number' },
                supervisionCount: { type: 'number' },
                programName: { type: 'string' }
              }
            }
          }
        }
      }
    }
  }, dashboardController.getKaprogStats.bind(dashboardController));

  // Toolman Stats
  fastify.get('/toolman/stats', {
    preHandler: [requireCapability('dashboard.view.sarpras')],
    schema: {
      description: 'Get Toolman/Lab Tool statistics',
      tags: ['Dashboard'],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                toolsBorrowed: { type: 'number' },
                toolsAvailable: { type: 'number' },
                damagedReports: { type: 'number' }
              }
            }
          }
        }
      }
    }
  }, dashboardController.getToolmanStats.bind(dashboardController));

  // Kabeng Stats
  fastify.get('/kabeng/stats', {
    preHandler: [requireCapability('dashboard.view.sarpras')],
    schema: {
      description: 'Get Kabeng/Kepala Bengkel statistics',
      tags: ['Dashboard'],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                activeBengkel: { type: 'number' },
                availableTools: { type: 'number' },
                practiceSchedules: { type: 'number' },
                bengkelName: { type: 'string' }
              }
            }
          }
        }
      }
    }
  }, dashboardController.getKabengStats.bind(dashboardController));

  // BKK Stats
  fastify.get('/bkk/stats', {
    preHandler: [requireCapability('dashboard.view.hubin')],
    schema: {
      description: 'Get BKK (Bursa Kerja Khusus) statistics',
      tags: ['Dashboard'],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                alumniPlaced: { type: 'number' },
                activeJobs: { type: 'number' },
                pendingApplications: { type: 'number' }
              }
            }
          }
        }
      }
    }
  }, dashboardController.getBkkStats.bind(dashboardController));
}
