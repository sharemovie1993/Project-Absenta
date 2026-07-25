import { gerbangController } from '../controllers/gerbang.controller';
import { allowBothModes, requireMultiSesiMode } from '@/middlewares/attendanceMode';
import { requireCapability } from '@/middlewares/requireCapability';
import { elevatedScopeMiddleware } from '@/middlewares/organizationalScope';
import { RoleName } from '@/constants/enums';

export async function gerbangRoutes(fastify: any) {
  fastify.post('/bypass', {
    preHandler: [
      allowBothModes,
      elevatedScopeMiddleware,
      requireCapability(['attendance.gate.bypass', 'attendance.gate.tap.entry', 'attendance.scan']),
    ],
    handler: gerbangController.bypass.bind(gerbangController),
    schema: {
      description: 'Bypass late attendance (Force HADIR)',
      tags: ['Gerbang'],
      body: {
        type: 'object',
        required: ['siswa_id'],
        properties: {
          siswa_id: { type: 'string' },
          note: { type: 'string' }
        }
      }
    }
  });

  // Tap entry point - Handles all RFID/Face/QR taps
  fastify.post('/tap', {
    preHandler: [allowBothModes, requireCapability('attendance.gate.tap.entry')],
    handler: gerbangController.tap.bind(gerbangController),
    schema: {
      description: 'Record student gate tap (entry/exit)',
      tags: ['Gerbang'],
      body: {
        type: 'object',
        required: ['siswa_id', 'arah'],
        properties: {
          siswa_id: { type: 'string', description: 'Student ID' },
          arah: { type: 'string', enum: ['GERBANG_DATANG', 'GERBANG_PULANG'], description: 'Tap direction' },
          device_id: { type: 'string', description: 'Gate device ID (optional)' },
          rfid: { type: 'string', description: 'RFID card number (optional)' }
        }
      }
    }
  });

  fastify.post('/offline-sync', {
    preHandler: [requireCapability('attendance.gate.tap.entry')],
    handler: gerbangController.syncOfflineTaps.bind(gerbangController),
    schema: {
      description: 'Sync offline taps from IoT devices',
      tags: ['Gerbang'],
      body: {
        type: 'object',
        required: ['taps'],
        properties: {
          taps: {
            type: 'array',
            items: {
              type: 'object',
              required: ['siswa_id', 'arah', 'timestamp'],
              properties: {
                siswa_id: { type: 'string' },
                arah: { type: 'string', enum: ['GERBANG_DATANG', 'GERBANG_PULANG'] },
                timestamp: { type: 'string', format: 'date-time' },
                rfid: { type: 'string' },
                device_id: { type: 'string' }
              }
            }
          }
        }
      }
    }
  });

  fastify.post('/stress-test', {
    preHandler: [requireCapability('system.performance.test')],
    handler: gerbangController.stressTest.bind(gerbangController),
    schema: {
      description: 'Run stress test for gate taps',
      tags: ['Gerbang'],
      body: {
        type: 'object',
        properties: {
          count: { type: 'number', default: 100 }
        }
      }
    }
  });
  
  // Face verification + tap (1:1)
  fastify.post('/face-verify', {
    preHandler: [allowBothModes, requireCapability('attendance.gate.tap.entry')],
    handler: gerbangController.faceVerifyTap.bind(gerbangController),
    schema: {
      description: 'Verify face (1:1) and record gate tap',
      tags: ['Gerbang'],
      body: {
        type: 'object',
        required: ['arah', 'image_base64'],
        properties: {
          siswa_id: { type: 'string', description: 'Student ID (Optional for 1:N)' },
          arah: { type: 'string', enum: ['GERBANG_DATANG', 'GERBANG_PULANG'], description: 'Tap direction' },
          image_base64: { type: 'string', description: 'Base64-encoded image (JPEG/PNG)' }
        }
      }
    }
  });
  
  fastify.post('/face-enroll', {
    preHandler: [
      allowBothModes,
      requireCapability('attendance.gate.face.enroll'),
    ],
    handler: gerbangController.faceEnroll.bind(gerbangController),
    schema: {
      description: 'Enroll student face template',
      tags: ['Gerbang'],
      body: {
        type: 'object',
        required: ['siswa_id', 'image_base64'],
        properties: {
          siswa_id: { type: 'string', description: 'Student ID' },
          image_base64: { type: 'string', description: 'Base64-encoded image (JPEG/PNG)' },
          source: { type: 'string' },
          embedding_type: { type: 'string' },
          model_name: { type: 'string' }
        }
      }
    }
  });
  
  fastify.get('/face-templates', {
    preHandler: [
      allowBothModes,
      requireCapability("attendance.gate.view.face.templates"),
    ],
    handler: gerbangController.getFaceTemplates.bind(gerbangController),
    schema: {
      description: 'List student face templates',
      tags: ['Gerbang'],
      querystring: {
        type: 'object',
        properties: {
          search: { type: 'string' },
          kelas_id: { type: 'string' },
          limit: { type: 'integer', minimum: 1, maximum: 500, default: 50 },
          offset: { type: 'integer', minimum: 0, default: 0 }
        }
      }
    }
  });

  fastify.get('/embedding/health', {
    preHandler: [
      allowBothModes,
      requireCapability(['attendance.reports.view', 'attendance.sessions.create']),
    ],
    handler: gerbangController.getEmbeddingHealth.bind(gerbangController),
    schema: {
      description: 'Embedding provider health check',
      tags: ['Gerbang', 'Monitoring']
    }
  });

  fastify.delete('/face-templates/:id', {
    preHandler: [
      allowBothModes,
      requireCapability('attendance.gate.face.enroll'),
    ],
    handler: gerbangController.deleteFaceTemplate.bind(gerbangController),
    schema: {
      description: 'Delete a student face template',
      tags: ['Gerbang'],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', description: 'Face template ID' }
        }
      }
    }
  });

  // Session management - get active sessions
  fastify.get('/sessions', {
    preHandler: [
      allowBothModes,
      elevatedScopeMiddleware,
      requireCapability(['attendance.gate.view.logs', 'attendance.sessions.create', 'attendance.gate.tap.entry'], { exemptRoles: [RoleName.SISWA] }),
    ],
    handler: gerbangController.getSessions.bind(gerbangController),
    schema: {
      description: 'Get active gate sessions for current date',
      tags: ['Gerbang'],
      querystring: {
        type: 'object',
        properties: {
          tanggal: { type: 'string', format: 'date', description: 'Date (YYYY-MM-DD), defaults to today' }
        }
      }
    }
  });

  // Get specific session details
  fastify.get('/sessions/:id', {
    preHandler: [
      allowBothModes,
      elevatedScopeMiddleware,
      requireCapability(['attendance.gate.view.logs', 'attendance.sessions.create']),
    ],
    handler: gerbangController.getSessionById.bind(gerbangController),
    schema: {
      description: 'Get specific gate session details',
      tags: ['Gerbang'],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Session ID' }
        }
      }
    }
  });

  // Student status - get current gate status for a student
  fastify.get('/status/:siswa_id', {
    preHandler: [
      allowBothModes,
      elevatedScopeMiddleware,
      requireCapability(['attendance.gate.view.logs', 'attendance.sessions.create']),
    ],
    handler: gerbangController.getStudentStatus.bind(gerbangController),
    schema: {
      description: 'Get current gate status for a specific student',
      tags: ['Gerbang'],
      params: {
        type: 'object',
        properties: {
          siswa_id: { type: 'string', description: 'Student ID' }
        }
      }
    }
  });

  // Student history - get tap history for a student
  fastify.get('/history/:siswa_id', {
    preHandler: [
      allowBothModes,
      elevatedScopeMiddleware,
      requireCapability(['attendance.gate.view.logs', 'attendance.sessions.create', 'attendance.gate.tap.entry']),
    ],
    handler: gerbangController.getStudentHistory.bind(gerbangController),
    schema: {
      description: 'Get gate tap history for a specific student',
      tags: ['Gerbang'],
      params: {
        type: 'object',
        properties: {
          siswa_id: { type: 'string', description: 'Student ID' }
        }
      },
      querystring: {
        type: 'object',
        properties: {
          tanggal_mulai: { type: 'string', format: 'date', description: 'Start date (YYYY-MM-DD)' },
          tanggal_selesai: { type: 'string', format: 'date', description: 'End date (YYYY-MM-DD)' },
          limit: { type: 'integer', minimum: 1, maximum: 100, default: 20, description: 'Number of records to return' },
          offset: { type: 'integer', minimum: 0, default: 0, description: 'Number of records to skip' }
        }
      }
    }
  });

  fastify.get('/records', {
    preHandler: [
      allowBothModes,
      elevatedScopeMiddleware,
      requireCapability(['attendance.gate.view.logs', 'attendance.sessions.create']),
    ],
    handler: gerbangController.getRecords.bind(gerbangController),
    schema: {
      description: 'Get gate attendance records for the current or specified date',
      tags: ['Gerbang'],
      querystring: {
        type: 'object',
        properties: {
          tanggal: { type: 'string', format: 'date' },
          arah: { type: 'string', enum: ['GERBANG_DATANG', 'GERBANG_PULANG'] },
          siswa_id: { type: 'string' },
          kelas_id: { type: 'string' },
          status: { type: 'string', enum: ['HADIR', 'SAKIT', 'IZIN', 'ALPA'] },
          limit: { type: 'integer', minimum: 1, maximum: 500, default: 100 },
          offset: { type: 'integer', minimum: 0, default: 0 }
        }
      }
    }
  });

  fastify.get('/not-present', {
    preHandler: [
      allowBothModes,
      elevatedScopeMiddleware,
      requireCapability(['attendance.reports.view', 'attendance.sessions.create', 'attendance.gate.tap.entry'], { exemptRoles: [RoleName.SISWA] }),
    ],
    handler: gerbangController.getNotPresentStudents.bind(gerbangController),
    schema: {
      description: 'Get students who have not tapped GERBANG_DATANG for current date',
      tags: ['Gerbang'],
      querystring: {
        type: 'object',
        properties: {
          tanggal: { type: 'string', format: 'date' },
          kelas_id: { type: 'string' },
          limit: { type: 'integer', minimum: 1, maximum: 500, default: 100 },
          offset: { type: 'integer', minimum: 0, default: 0 }
        }
      }
    }
  });

  fastify.post('/absence', {
    preHandler: [
      allowBothModes,
      elevatedScopeMiddleware,
      requireCapability(['attendance.reports.view', 'attendance.sessions.create'], { exemptRoles: [RoleName.SISWA] }),
    ],
    handler: gerbangController.markGateAbsence.bind(gerbangController),
    schema: {
      description: 'Create manual gate absence record with status HADIR/SAKIT/IZIN/ALPA/DISPEN',
      tags: ['Gerbang'],
      body: {
        type: 'object',
        required: ['siswa_id', 'status'],
        properties: {
          siswa_id: { type: 'string' },
          status: { type: 'string', enum: ['HADIR', 'SAKIT', 'IZIN', 'ALPA', 'DISPEN'] }
        }
      }
    }
  });

  // Currently present students - get list of students currently inside
  fastify.get('/present', {
    preHandler: [
      allowBothModes,
      elevatedScopeMiddleware,
      requireCapability(['attendance.reports.view', 'attendance.sessions.create', 'attendance.gate.tap.entry']),
    ],
    handler: gerbangController.getPresentStudents.bind(gerbangController),
    schema: {
      description: 'Get list of students currently present (tapped in but not out)',
      tags: ['Gerbang'],
      querystring: {
        type: 'object',
        properties: {
          kelas_id: { type: 'string', description: 'Filter by class ID (optional)' },
          limit: { type: 'integer', minimum: 1, maximum: 500, default: 100, description: 'Number of records to return' },
          offset: { type: 'integer', minimum: 0, default: 0, description: 'Number of records to skip' }
        }
      }
    }
  });

  // Integration endpoints - only available in MULTI_SESI mode
  fastify.get('/integration/status', {
    preHandler: [
      requireMultiSesiMode,
      requireCapability(['attendance.reports.view', 'attendance.sessions.create', 'attendance.gate.tap.entry'], { exemptRoles: [RoleName.SISWA] }),
    ],
    handler: gerbangController.getIntegrationStatus.bind(gerbangController),
    schema: {
      description: 'Get integration status with activity module (MULTI_SESI mode only)',
      tags: ['Gerbang', 'Integration']
    }
  });

  // Activity prerequisites for a student - MULTI_SESI mode only
  fastify.get('/prerequisites/:siswa_id', {
    preHandler: [
      requireMultiSesiMode,
      requireCapability(['attendance.reports.view', 'attendance.sessions.create']),
    ],
    handler: gerbangController.getActivityPrerequisites.bind(gerbangController),
    schema: {
      description: 'Check activity prerequisites for a student (MULTI_SESI mode only)',
      tags: ['Gerbang', 'Integration'],
      params: {
        type: 'object',
        properties: {
          siswa_id: { type: 'string', description: 'Student ID' }
        }
      }
    }
  });

  // System health check
  fastify.get('/health', {
    preHandler: [
      allowBothModes,
      requireCapability(['attendance.reports.view', 'attendance.sessions.create']),
    ],
    handler: gerbangController.getSystemHealth.bind(gerbangController),
    schema: {
      description: 'Get gate system health status',
      tags: ['Gerbang', 'Monitoring']
    }
  });

  // Basic statistics
  fastify.get('/stats', {
    preHandler: [
      allowBothModes,
      elevatedScopeMiddleware,
      requireCapability(['attendance.reports.view', 'attendance.sessions.create', 'dashboard.view.overview'], { exemptRoles: [RoleName.SISWA] }),
    ],

    handler: gerbangController.getStatistics.bind(gerbangController),
    schema: {
      description: 'Get basic gate statistics for current date',
      tags: ['Gerbang', 'Statistics'],
      querystring: {
        type: 'object',
        properties: {
          tanggal: { type: 'string', format: 'date', description: 'Date (YYYY-MM-DD), defaults to today' }
        }
      }
    }
  });
}
