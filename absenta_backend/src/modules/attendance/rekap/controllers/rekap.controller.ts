import { rekapService } from '../services/rekap.service';
import { authorizationService } from '@/modules/auth/services/authorization.service';
import { RoleName } from '../../../../constants/enums';

interface AuthenticatedRequest {
  user?: {
    id: string;
    userId: string;
    tenantId: string;
    role: string;
  };
  tenant?: {
    id: string;
  };
  params: any;
  query: any;
}

// GET /api/attendance/rekap/siswa/:id/harian?tanggal=YYYY-MM-DD
export async function getRekapHarianSiswa(request: AuthenticatedRequest, reply: any) {
  try {
    const { id: siswaId } = request.params as { id: string };
    const { tanggal, tahun_pelajaran_id } = request.query as { tanggal?: string; tahun_pelajaran_id?: string };
    const tenantId = (request as any).tenantId ?? request.tenant?.id;
    const userId = request.user?.id;

    if (!tenantId) {
      return reply.status(400).send({
        success: false,
        message: 'Tenant ID is required',
      });
    }

    if (!userId) {
      return reply.status(401).send({
        success: false,
        message: 'User authentication required',
      });
    }

    if (!tanggal) {
      return reply.status(400).send({
        success: false,
        message: 'Parameter tanggal (YYYY-MM-DD) is required',
      });
    }

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(tanggal)) {
      return reply.status(400).send({
        success: false,
        message: 'Format tanggal harus YYYY-MM-DD',
      });
    }

    // Security Check: If user is SISWA, they can only view their OWN data
    const userRole = request.user?.role?.toUpperCase();
    if (userRole === RoleName.SISWA) {
      const hasOfficerPermission = await authorizationService.hasUserPermission(userId, 'attendance.scan') || 
                                   await authorizationService.hasUserPermission(userId, 'attendance.recap.view.daily');
      
      if (!hasOfficerPermission) {
        const mySiswaId = await rekapService.getSiswaIdFromUser(tenantId, userId);
        if (mySiswaId !== siswaId) {
           return reply.status(403).send({
             success: false,
             message: 'Access denied. You can only view your own attendance data.'
           });
        }
      }
    }

    const data = await rekapService.getRekapHarianSiswa(siswaId, tanggal, tenantId, tahun_pelajaran_id);
    
    // Log activity
    await rekapService.logActivity(userId, tenantId, 'VIEW_REKAP_HARIAN_SISWA', siswaId);

    return reply.status(200).send({
      success: true,
      message: 'Rekap harian siswa berhasil diambil',
      data,
    });
  } catch (error: any) {
    const errorMessage = error.message || 'Internal server error';
    
    // Handle mode-specific errors
    if (errorMessage === 'Tracking hanya tersedia untuk mode MULTI_SESI') {
      return reply.status(403).send({
        success: false,
        message: errorMessage,
        error: 'Attendance mode violation',
        details: {
          current_mode: 'SIMPLE',
          restriction: 'Tracking feature is only available in MULTI_SESI mode',
          mode_restriction: true,
          alternative: 'Use basic attendance reports instead'
        }
      });
    }

    return reply.status(500).send({
      success: false,
      message: errorMessage,
    });
  }
}

// GET /api/attendance/rekap/siswa/me/harian?tanggal=YYYY-MM-DD
export async function getRekapHarianSiswaMe(request: AuthenticatedRequest, reply: any) {
  try {
    const { tanggal, tahun_pelajaran_id } = request.query as { tanggal?: string; tahun_pelajaran_id?: string };
    const tenantId = (request as any).tenantId ?? request.tenant?.id;
    const userId = request.user?.id;

    if (!tenantId) {
      return reply.status(400).send({
        success: false,
        message: 'Tenant ID is required',
      });
    }

    if (!userId) {
      return reply.status(401).send({
        success: false,
        message: 'User authentication required',
      });
    }

    if (!tanggal) {
      return reply.status(400).send({
        success: false,
        message: 'Parameter tanggal (YYYY-MM-DD) is required',
      });
    }

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(tanggal)) {
      return reply.status(400).send({
        success: false,
        message: 'Format tanggal harus YYYY-MM-DD',
      });
    }

    const siswaId = await rekapService.getSiswaIdFromUser(tenantId, userId);
    if (!siswaId) {
      return reply.status(404).send({
        success: false,
        message: 'Siswa profile not found',
      });
    }

    const data = await rekapService.getRekapHarianSiswa(siswaId, tanggal, tenantId, tahun_pelajaran_id);
    await rekapService.logActivity(userId, tenantId, 'VIEW_REKAP_HARIAN_SISWA', siswaId);

    return reply.status(200).send({
      success: true,
      message: 'Rekap harian siswa berhasil diambil',
      data,
    });
  } catch (error: any) {
    const errorMessage = error.message || 'Internal server error';

    if (errorMessage === 'Tracking hanya tersedia untuk mode MULTI_SESI') {
      return reply.status(403).send({
        success: false,
        message: errorMessage,
        error: 'Attendance mode violation',
        details: {
          current_mode: 'SIMPLE',
          restriction: 'Tracking feature is only available in MULTI_SESI mode',
          mode_restriction: true,
          alternative: 'Use basic attendance reports instead',
        },
      });
    }

    return reply.status(500).send({
      success: false,
      message: errorMessage,
    });
  }
}

// GET /api/attendance/rekap/siswa/:id/bulanan?bulan=YYYY-MM
export async function getRekapBulananSiswa(request: AuthenticatedRequest, reply: any) {
  try {
    const { id: siswaId } = request.params as { id: string };
    const { bulan, tahun_pelajaran_id } = request.query as { bulan?: string; tahun_pelajaran_id?: string };
    const tenantId = (request as any).tenantId ?? request.tenant?.id;
    const userId = request.user?.id;

    if (!tenantId) {
      return reply.status(400).send({
        success: false,
        message: 'Tenant ID is required',
      });
    }

    if (!userId) {
      return reply.status(401).send({
        success: false,
        message: 'User authentication required',
      });
    }

    if (!bulan) {
      return reply.status(400).send({
        success: false,
        message: 'Parameter bulan (YYYY-MM) is required',
      });
    }

    // Validate month format
    const monthRegex = /^\d{4}-\d{2}$/;
    if (!monthRegex.test(bulan)) {
      return reply.status(400).send({
        success: false,
        message: 'Format bulan harus YYYY-MM',
      });
    }

    // Security Check: If user is SISWA, they can only view their OWN data
    const userRole = request.user?.role?.toUpperCase();
    if (userRole === RoleName.SISWA) {
      const hasOfficerPermission = await authorizationService.hasUserPermission(userId, 'attendance.scan') || 
                                   await authorizationService.hasUserPermission(userId, 'attendance.recap.view.monthly');
      
      if (!hasOfficerPermission) {
        const mySiswaId = await rekapService.getSiswaIdFromUser(tenantId, userId);
        if (mySiswaId !== siswaId) {
           return reply.status(403).send({
             success: false,
             message: 'Access denied. You can only view your own attendance data.'
           });
        }
      }
    }

    const data = await rekapService.getRekapBulananSiswa(siswaId, bulan, tenantId, tahun_pelajaran_id);
    
    // Log activity
    await rekapService.logActivity(userId, tenantId, 'VIEW_REKAP_BULANAN_SISWA', siswaId);

    return reply.status(200).send({
      success: true,
      message: 'Rekap bulanan siswa berhasil diambil',
      data,
    });
  } catch (error: any) {
    return reply.status(500).send({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
}

// GET /api/attendance/rekap/siswa/me/bulanan?bulan=YYYY-MM
export async function getRekapBulananSiswaMe(request: AuthenticatedRequest, reply: any) {
  try {
    const { bulan, tahun_pelajaran_id } = request.query as { bulan?: string; tahun_pelajaran_id?: string };
    const tenantId = (request as any).tenantId ?? request.tenant?.id;
    const userId = request.user?.id;

    if (!tenantId) {
      return reply.status(400).send({
        success: false,
        message: 'Tenant ID is required',
      });
    }

    if (!userId) {
      return reply.status(401).send({
        success: false,
        message: 'User authentication required',
      });
    }

    if (!bulan) {
      return reply.status(400).send({
        success: false,
        message: 'Parameter bulan (YYYY-MM) is required',
      });
    }

    const monthRegex = /^\d{4}-\d{2}$/;
    if (!monthRegex.test(bulan)) {
      return reply.status(400).send({
        success: false,
        message: 'Format bulan harus YYYY-MM',
      });
    }

    const siswaId = await rekapService.getSiswaIdFromUser(tenantId, userId);
    if (!siswaId) {
      return reply.status(404).send({
        success: false,
        message: 'Siswa profile not found',
      });
    }

    const data = await rekapService.getRekapBulananSiswa(siswaId, bulan, tenantId, tahun_pelajaran_id);
    await rekapService.logActivity(userId, tenantId, 'VIEW_REKAP_BULANAN_SISWA', siswaId);

    return reply.status(200).send({
      success: true,
      message: 'Rekap bulanan siswa berhasil diambil',
      data,
    });
  } catch (error: any) {
    return reply.status(500).send({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
}

// GET /api/attendance/rekap/kelas/:id/bulanan?bulan=YYYY-MM
export async function getRekapBulananKelas(request: AuthenticatedRequest, reply: any) {
  try {
    const { id: kelasId } = request.params as { id: string };
    const { bulan, tahun_pelajaran_id } = request.query as { bulan?: string; tahun_pelajaran_id?: string };
    const tenantId = (request as any).tenantId ?? request.tenant?.id;
    const userId = request.user?.id;

    if (!tenantId) {
      return reply.status(400).send({
        success: false,
        message: 'Tenant ID is required',
      });
    }

    if (!userId) {
      return reply.status(401).send({
        success: false,
        message: 'User authentication required',
      });
    }

    if (!bulan) {
      return reply.status(400).send({
        success: false,
        message: 'Parameter bulan (YYYY-MM) is required',
      });
    }

    // Validate month format
    const monthRegex = /^\d{4}-\d{2}$/;
    if (!monthRegex.test(bulan)) {
      return reply.status(400).send({
        success: false,
        message: 'Format bulan harus YYYY-MM',
      });
    }

    const scope = (request as any).dataScope;
    const data = await rekapService.getRekapBulananKelas(kelasId, bulan, tenantId, tahun_pelajaran_id, scope);
    
    // Log activity
    await rekapService.logActivity(userId, tenantId, 'VIEW_REKAP_BULANAN_KELAS', kelasId);

    const normalized =
      Array.isArray(data)
        ? data
        : Array.isArray((data as any)?.students)
          ? (data as any).students.map((s: any) => ({
              siswa_id: s.id ?? s.siswa_id ?? '',
              nama_siswa: s.nama ?? s.nama_siswa ?? '',
              HADIR: Number(s.hadir ?? s.HADIR ?? 0),
              IZIN: Number(s.izin ?? s.IZIN ?? 0),
              SAKIT: Number(s.sakit ?? s.SAKIT ?? 0),
              ALPA: Number(s.alpa ?? s.ALPA ?? 0),
              TERLAMBAT: Number(s.telat ?? s.TERLAMBAT ?? 0),
              total_poin: Number(s.total_poin ?? 0),
            }))
          : data;

    return reply.status(200).send({
      success: true,
      data: normalized
    });

  } catch (error) {
    console.error('Error getting monthly recap:', error);
    return reply.status(500).send({
      success: false,
      message: 'Failed to get monthly recap'
    });
  }
}

export async function getLeaderboard(request: any, reply: any) {
  try {
    const tenantId = request.tenantId;
    const { limit } = request.query;
    
    const data = await rekapService.getLeaderboard(tenantId, limit ? parseInt(limit) : 10);
    
    return reply.status(200).send({
      success: true,
      message: 'Leaderboard retrieved successfully',
      data
    });
  } catch (error) {
    return reply.status(500).send({ success: false, message: 'Failed to get leaderboard' });
  }
}

// GET /api/attendance/rekap/guru/harian?tanggal=YYYY-MM-DD
export async function getRekapHarianGuru(request: AuthenticatedRequest, reply: any) {
  try {
    const { tanggal } = request.query as { tanggal?: string };
    const tenantId = (request as any).tenantId ?? request.tenant?.id;
    const userId = request.user?.id;

    if (!tenantId) {
      return reply.status(400).send({
        success: false,
        message: 'Tenant ID is required',
      });
    }

    if (!userId) {
      return reply.status(401).send({
        success: false,
        message: 'User authentication required',
      });
    }

    if (!tanggal) {
      return reply.status(400).send({
        success: false,
        message: 'Parameter tanggal (YYYY-MM-DD) is required',
      });
    }

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(tanggal)) {
      return reply.status(400).send({
        success: false,
        message: 'Format tanggal harus YYYY-MM-DD',
      });
    }

    const data = await rekapService.getRekapHarianGuru(tanggal, tenantId);
    
    // Log activity
    await rekapService.logActivity(userId, tenantId, 'VIEW_REKAP_HARIAN_GURU');

    return reply.status(200).send({
      success: true,
      message: 'Rekap harian guru berhasil diambil',
      data,
    });
  } catch (error: any) {
    return reply.status(500).send({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
}

// GET /api/attendance/rekap/siswa/:id/tracking?tanggal=YYYY-MM-DD
export async function getTrackingHarianSiswa(request: AuthenticatedRequest, reply: any) {
  try {
    const { id: siswaId } = request.params as { id: string };
    const { tanggal } = request.query as { tanggal?: string };
    const tenantId = (request as any).tenantId ?? request.tenant?.id;
    const userId = request.user?.id;

    if (!tenantId) {
      return reply.status(400).send({
        success: false,
        message: 'Tenant ID is required',
      });
    }

    if (!userId) {
      return reply.status(401).send({
        success: false,
        message: 'User authentication required',
      });
    }

    if (!tanggal) {
      return reply.status(400).send({
        success: false,
        message: 'Parameter tanggal (YYYY-MM-DD) is required',
      });
    }

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(tanggal)) {
      return reply.status(400).send({
        success: false,
        message: 'Format tanggal harus YYYY-MM-DD',
      });
    }
    // Security Check for SISWA
    const userRole = request.user?.role?.toUpperCase();
    if (userRole === RoleName.SISWA) {
      const hasOfficerPermission = await authorizationService.hasUserPermission(userId, 'attendance.scan');
      
      if (!hasOfficerPermission) {
        const mySiswaId = await rekapService.getSiswaIdFromUser(tenantId, userId);
        if (mySiswaId !== siswaId) {
           return reply.status(403).send({
             success: false,
             message: 'Access denied. You can only view your own tracking data.'
           });
        }
      }
    }

    const data = await rekapService.getTrackingHarianSiswa(siswaId, tanggal, tenantId);
    
    // Log activity
    await rekapService.logActivity(userId, tenantId, 'VIEW_TRACKING_HARIAN_SISWA', siswaId);

    return reply.status(200).send({
      success: true,
      message: 'Tracking harian siswa berhasil diambil',
      data,
    });
  } catch (error: any) {
    return reply.status(500).send({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
}

// GET /api/attendance/rekap/statistik/harian?tanggal=YYYY-MM-DD
export async function getStatistikHarian(request: AuthenticatedRequest, reply: any) {
  try {
    const { tanggal, tahun_pelajaran_id } = request.query as { tanggal?: string; tahun_pelajaran_id?: string };
    const tenantId = (request as any).tenantId ?? request.tenant?.id;
    const userId = request.user?.id;

    if (!tenantId) {
      return reply.status(400).send({
        success: false,
        message: 'Tenant ID is required',
      });
    }

    if (!userId) {
      return reply.status(401).send({
        success: false,
        message: 'User authentication required',
      });
    }

    if (!tanggal) {
      return reply.status(400).send({
        success: false,
        message: 'Parameter tanggal (YYYY-MM-DD) is required',
      });
    }

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(tanggal)) {
      return reply.status(400).send({
        success: false,
        message: 'Format tanggal harus YYYY-MM-DD',
      });
    }

    const scope = (request as any).dataScope;
    const data = await rekapService.getStatistikHarian(tanggal, tenantId, tahun_pelajaran_id, scope);
    
    // Log activity
    await rekapService.logActivity(userId, tenantId, 'VIEW_STATISTIK_HARIAN');

    return reply.status(200).send({
      success: true,
      message: 'Statistik harian berhasil diambil',
      data,
    });
  } catch (error: any) {
    return reply.status(500).send({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
}

// GET /api/attendance/rekap/guru/me/bulanan?bulan=YYYY-MM
export async function getRekapBulananGuruMe(request: AuthenticatedRequest, reply: any) {
  try {
    const { bulan } = request.query as { bulan?: string; tahun_pelajaran_id?: string };
    const tenantId = (request as any).tenantId ?? request.tenant?.id;
    const userId = request.user?.id;

    if (!tenantId || !userId) {
      return reply.status(401).send({
        success: false,
        message: 'Authentication failed',
      });
    }

    if (!bulan) {
      return reply.status(400).send({
        success: false,
        message: 'Parameter bulan (YYYY-MM) is required',
      });
    }

    const monthRegex = /^\d{4}-\d{2}$/;
    if (!monthRegex.test(bulan)) {
      return reply.status(400).send({
        success: false,
        message: 'Format bulan harus YYYY-MM',
      });
    }

    const data = await rekapService.getRekapBulananGuruMe(userId, tenantId, bulan);
    
    return reply.status(200).send({
      success: true,
      message: 'Rekap bulanan guru berhasil diambil',
      data,
    });
  } catch (error: any) {
    return reply.status(500).send({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
}

// GET /api/attendance/rekap/kelas/:id/harian?tanggal=YYYY-MM-DD
export async function getRekapHarianKelas(request: AuthenticatedRequest, reply: any) {
  try {
    const { id: kelasId } = request.params as { id: string };
    const { tanggal, tahun_pelajaran_id } = request.query as { tanggal?: string; tahun_pelajaran_id?: string };
    const tenantId = (request as any).tenantId ?? request.tenant?.id;
    const userId = request.user?.id;

    if (!tenantId) {
      return reply.status(400).send({ success: false, message: 'Tenant ID is required' });
    }
    if (!userId) {
      return reply.status(401).send({ success: false, message: 'User authentication required' });
    }
    if (!kelasId) {
      return reply.status(400).send({ success: false, message: 'Parameter kelas ID is required' });
    }

    // Default tanggal to today if not provided
    const today = new Date().toISOString().split('T')[0];
    const targetDate = tanggal || today;

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(targetDate)) {
      return reply.status(400).send({ success: false, message: 'Format tanggal harus YYYY-MM-DD' });
    }

    const data = await rekapService.getRekapHarianKelas(kelasId, targetDate, tenantId, tahun_pelajaran_id);

    await rekapService.logActivity(userId, tenantId, 'VIEW_REKAP_HARIAN_KELAS', kelasId);

    return reply.status(200).send({
      success: true,
      message: 'Rekap harian kelas berhasil diambil',
      data,
      meta: {
        kelasId,
        tanggal: targetDate,
        totalSiswa: data.length,
        totalHadir: data.filter((s: any) => s.status === 'HADIR' || s.status === 'TERLAMBAT').length,
        totalAbsen: data.filter((s: any) => s.status !== 'HADIR' && s.status !== 'TERLAMBAT').length,
      }
    });
  } catch (error: any) {
    return reply.status(500).send({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
}
