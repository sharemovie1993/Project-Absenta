// @ts-nocheck
import { DashboardController } from '../../controllers/dashboard.controller';
import { requireCapability } from '@/middlewares/requireCapability';
import { determineDataScope } from '@/middlewares/dataScope';

export async function dashboardRoleRoutes(fastify: any) {
  const dashboardController = new DashboardController();
  fastify.get('/hubin/stats', {
    preHandler: [requireCapability('dashboard.view.hubin'), determineDataScope()],
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
    preHandler: [requireCapability('dashboard.view.sarpras'), determineDataScope()],
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
    preHandler: [requireCapability('dashboard.view.tu'), determineDataScope()],
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
    preHandler: [requireCapability('attendance.reports.view'), determineDataScope()],
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
    preHandler: [requireCapability('dashboard.view.overview'), determineDataScope()],
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
    preHandler: [requireCapability('dashboard.view.guru'), determineDataScope()],
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
    preHandler: [requireCapability('dashboard.view.kurikulum'), determineDataScope()],
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
    preHandler: [requireCapability('dashboard.view.sarpras'), determineDataScope()],
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
    preHandler: [requireCapability('dashboard.view.sarpras'), determineDataScope()],
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
    preHandler: [requireCapability('dashboard.view.hubin'), determineDataScope()],
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
