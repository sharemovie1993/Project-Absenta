import { prisma } from '../../../utils/prisma';
import { Prisma } from '@prisma/client';

export class SupervisiService {
  static async create(tenantId: string, data: {
    guru_id: string;
    tanggal: Date;
    mapel?: string;
    kelas?: string;
    jam_ke?: number;
    status?: string;
    catatan?: string;
    nilai?: number;
    supervisor_id?: string;
  }) {
    return prisma.supervisiGuru.create({
      data: {
        tenant_id: tenantId,
        guru_id: data.guru_id,
        tanggal: data.tanggal,
        mapel: data.mapel,
        kelas: data.kelas,
        jam_ke: data.jam_ke,
        status: data.status || 'SCHEDULED',
        catatan: data.catatan,
        nilai: data.nilai,
        supervisor_id: data.supervisor_id,
      },
    });
  }

  static async update(tenantId: string, id: string, data: {
    tanggal?: Date;
    mapel?: string;
    kelas?: string;
    jam_ke?: number;
    status?: string;
    catatan?: string;
    nilai?: number;
    supervisor_id?: string;
  }) {
    // Verify ownership
    const existing = await prisma.supervisiGuru.findFirst({
      where: { id, tenant_id: tenantId },
    });

    if (!existing) {
      throw new Error('Supervisi not found');
    }

    return prisma.supervisiGuru.update({
      where: { id },
      data,
    });
  }

  static async delete(tenantId: string, id: string) {
    const existing = await prisma.supervisiGuru.findFirst({
      where: { id, tenant_id: tenantId },
    });

    if (!existing) {
      throw new Error('Supervisi not found');
    }

    return prisma.supervisiGuru.delete({
      where: { id },
    });
  }

  static async getAll(tenantId: string, query: {
    page?: number;
    limit?: number;
    search?: string;
    guru_id?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
  }) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const offset = (page - 1) * limit;

    const where: Prisma.SupervisiGuruWhereInput = {
      tenant_id: tenantId,
    };

    if (query.guru_id) {
      where.guru_id = query.guru_id;
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.startDate && query.endDate) {
      where.tanggal = {
        gte: new Date(query.startDate),
        lte: new Date(query.endDate),
      };
    }

    if (query.search) {
      where.OR = [
        { mapel: { contains: query.search, mode: 'insensitive' } },
        { kelas: { contains: query.search, mode: 'insensitive' } },
        { Guru: { nama_guru: { contains: query.search, mode: 'insensitive' } } },
      ];
    }

    const [total, list] = await Promise.all([
      prisma.supervisiGuru.count({ where }),
      prisma.supervisiGuru.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { tanggal: 'desc' },
        include: {
          Guru: {
            select: {
              id: true,
              nama_guru: true,
              nip: true,
            },
          },
          Supervisor: {
            select: {
              id: true,
              nama_guru: true,
            },
          },
        },
      }),
    ]);

    return {
      list,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  static async getById(tenantId: string, id: string) {
    return prisma.supervisiGuru.findFirst({
      where: { id, tenant_id: tenantId },
      include: {
        Guru: {
          select: {
            id: true,
            nama_guru: true,
            nip: true,
          },
        },
        Supervisor: {
          select: {
            id: true,
            nama_guru: true,
          },
        },
      },
    });
  }

  static async submitSelfAssessment(
    tenantId: string,
    id: string,
    guruUserId: string,
    data: { target_pembelajaran: string; nilai_self?: number; catatan_self?: string }
  ) {
    const guru = await prisma.guru.findUnique({
      where: { user_id: guruUserId }
    });
    if (!guru) {
      throw new Error('Guru profile not found');
    }

    const existing = await prisma.supervisiGuru.findFirst({
      where: { id, tenant_id: tenantId }
    });
    if (!existing) {
      throw new Error('Supervisi not found');
    }

    if (existing.guru_id !== guru.id) {
      throw new Error('Hanya guru yang disupervisi yang dapat mengisi evaluasi diri');
    }

    return prisma.supervisiGuru.update({
      where: { id },
      data: {
        target_pembelajaran: data.target_pembelajaran,
        nilai_self: data.nilai_self,
        catatan_self: data.catatan_self,
        is_self_evaluated: true
      }
    });
  }

  static async getAnalytics(tenantId: string) {
    const supervisiList = await prisma.supervisiGuru.findMany({
      where: { tenant_id: tenantId },
      select: {
        id: true,
        nilai: true,
        nilai_self: true,
        status: true,
        tanggal: true,
        Guru: { select: { nama_guru: true } }
      }
    });

    const scheduled = supervisiList.filter(s => s.status === 'SCHEDULED').length;
    const completed = supervisiList.filter(s => s.status === 'COMPLETED').length;

    const completedWithScores = supervisiList.filter(s => s.status === 'COMPLETED' && s.nilai !== null);
    const avgScore = completedWithScores.length > 0
      ? Math.round(completedWithScores.reduce((sum, s) => sum + (s.nilai ?? 0), 0) / completedWithScores.length)
      : 0;

    const selfEvalWithScores = supervisiList.filter(s => s.nilai_self !== null);
    const avgSelfScore = selfEvalWithScores.length > 0
      ? Math.round(selfEvalWithScores.reduce((sum, s) => sum + (s.nilai_self ?? 0), 0) / selfEvalWithScores.length)
      : 0;

    const monthlyTrend: Record<string, { count: number; total: number; avg: number }> = {};
    completedWithScores.forEach(s => {
      // Format to YYYY-MM
      const date = new Date(s.tanggal);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const monthStr = `${year}-${month}`;
      
      if (!monthlyTrend[monthStr]) {
        monthlyTrend[monthStr] = { count: 0, total: 0, avg: 0 };
      }
      monthlyTrend[monthStr].count++;
      monthlyTrend[monthStr].total += s.nilai ?? 0;
      monthlyTrend[monthStr].avg = Math.round(monthlyTrend[monthStr].total / monthlyTrend[monthStr].count);
    });

    const teacherScores: Record<string, { count: number; total: number; avg: number; name: string }> = {};
    completedWithScores.forEach(s => {
      const gName = s.Guru.nama_guru;
      if (!teacherScores[gName]) {
        teacherScores[gName] = { count: 0, total: 0, avg: 0, name: gName };
      }
      teacherScores[gName].count++;
      teacherScores[gName].total += s.nilai ?? 0;
      teacherScores[gName].avg = Math.round(teacherScores[gName].total / teacherScores[gName].count);
    });

    const topTeachers = Object.values(teacherScores)
      .sort((a, b) => b.avg - a.avg)
      .slice(0, 5);

    return {
      stats: {
        total: supervisiList.length,
        scheduled,
        completed,
        avgScore,
        avgSelfScore
      },
      monthlyTrend: Object.entries(monthlyTrend)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([month, data]) => ({
          month,
          avg_score: data.avg
        })),
      topTeachers
    };
  }

  static async getSchedulingRecommendations(tenantId: string, guruId: string, tanggalStr: string) {
    const date = new Date(tanggalStr);
    if (isNaN(date.getTime())) {
      throw new Error('Format tanggal tidak valid. Gunakan YYYY-MM-DD');
    }
    
    const daysIndonesian = ['MINGGU', 'SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU'];
    const dayName = daysIndonesian[date.getDay()];

    if (dayName === 'MINGGU') {
      return [];
    }

    const activeYear = await prisma.tahunPelajaran.findFirst({
      where: { tenant_id: tenantId, is_active: true }
    });
    if (!activeYear) return [];

    const activeSemester = await prisma.semester.findFirst({
      where: { tenant_id: tenantId, tahun_pelajaran_id: activeYear.id, is_active: true }
    });
    if (!activeSemester) return [];

    const teacherSchedules = await prisma.jadwalKBM.findMany({
      where: {
        tenant_id: tenantId,
        guru_id: guruId,
        hari: dayName as any,
        tahun_pelajaran_id: activeYear.id,
        semester_id: activeSemester.id,
        mapel_id: { not: null }
      },
      include: {
        Kelas: { select: { nama_kelas: true } },
        Mapel: { select: { nama_mapel: true } }
      },
      orderBy: { jam_mulai: 'asc' }
    });

    if (teacherSchedules.length === 0) {
      return [];
    }

    const allTeachers = await prisma.guru.findMany({
      where: {
        tenant_id: tenantId,
        jenis_ptk: 'PENDIDIK',
        id: { not: guruId }
      },
      select: {
        id: true,
        nama_guru: true,
        nip: true
      }
    });

    const daySchedules = await prisma.jadwalKBM.findMany({
      where: {
        tenant_id: tenantId,
        hari: dayName as any,
        tahun_pelajaran_id: activeYear.id,
        semester_id: activeSemester.id,
        guru_id: { not: null }
      }
    });

    const startOfDay = new Date(tanggalStr);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(tanggalStr);
    endOfDay.setHours(23, 59, 59, 999);

    const daySupervisions = await prisma.supervisiGuru.findMany({
      where: {
        tenant_id: tenantId,
        tanggal: { gte: startOfDay, lte: endOfDay }
      }
    });

    const isOverlapping = (startA: string, endA: string, startB: string, endB: string) => {
      return startA < endB && endA > startB;
    };

    const recommendations = [];

    // Map time slots to order (jam_ke) if not explicitly present
    for (let index = 0; index < teacherSchedules.length; index++) {
      const schedule = teacherSchedules[index];
      const jamMulai = schedule.jam_mulai;
      const jamSelesai = schedule.jam_selesai;
      const calculatedJamKe = index + 1; // logical jam_ke sequence

      const freeSupervisors = [];

      for (const supervisor of allTeachers) {
        const isTeaching = daySchedules.some(s => 
          s.guru_id === supervisor.id &&
          isOverlapping(s.jam_mulai, s.jam_selesai, jamMulai, jamSelesai)
        );

        if (isTeaching) continue;

        const isBusySupervising = daySupervisions.some(sv => 
          sv.supervisor_id === supervisor.id &&
          (sv.jam_ke === calculatedJamKe)
        );

        if (isBusySupervising) continue;

        freeSupervisors.push({
          id: supervisor.id,
          nama_guru: supervisor.nama_guru,
          nip: supervisor.nip
        });
      }

      recommendations.push({
        id: schedule.id,
        hari: schedule.hari,
        jam_mulai: schedule.jam_mulai,
        jam_selesai: schedule.jam_selesai,
        kelas_id: schedule.kelas_id,
        kelas: schedule.Kelas?.nama_kelas || 'N/A',
        mapel_id: schedule.mapel_id,
        mapel: schedule.Mapel?.nama_mapel || 'N/A',
        jam_ke: calculatedJamKe,
        recommended_supervisors: freeSupervisors
      });
    }

    return recommendations;
  }
}
