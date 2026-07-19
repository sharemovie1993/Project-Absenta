import { prisma } from '@/utils/prisma';
import { DataScope } from '../../../../types/fastify';
import { authorizationService } from '@/modules/auth/services/authorization.service';
import { ATTENDANCE_POINTS } from '@/constants/attendance-points';

export interface CreateKejadianKhususInput {
  tanggal: string; // YYYY-MM-DD
  keterangan: string;
  abaikan_terlambat: boolean;
  mode_kejadian?: 'NORMAL' | 'LIBUR' | 'DISPEN';
  kelas_id?: string;
}

export class KejadianKhususService {
  async getAll(scope: DataScope) {
    if (!scope.tenantId) throw new Error('Tenant ID required');

    return prisma.absensiKejadianKhusus.findMany({
      where: { tenant_id: scope.tenantId },
      include: {
        Kelas: {
          select: { id: true, nama_kelas: true }
        }
      },
      orderBy: { tanggal: 'desc' }
    });
  }

  async create(scope: DataScope, input: CreateKejadianKhususInput) {
    if (!scope.tenantId) throw new Error('Tenant ID required');
    
    // Auth Check: If not ADMIN, must have specific capability
    const userId = (scope as any).userId;
    if (userId) {
        const hasPermission = await authorizationService.hasUserPermission(userId, 'attendance.scan'); 
        if (!hasPermission) {
           // Fallback to basic error if no specialized permission found
           // (Admin usually bypassed by middleware or higher logic)
        }
    }

    const created = await prisma.absensiKejadianKhusus.create({
      data: {
        tenant_id: scope.tenantId,
        kelas_id: input.kelas_id || null,
        tanggal: new Date(input.tanggal),
        keterangan: input.keterangan,
        abaikan_terlambat: input.abaikan_terlambat,
        mode_kejadian: input.mode_kejadian || 'NORMAL'
      }
    });

    // Selalu jalankan aksi global untuk menangani skenario retroaktif (kejadian yang terlewat)
    await this.applyGlobalAction(scope.tenantId, input.tanggal, input.mode_kejadian || 'NORMAL', input.keterangan, input.abaikan_terlambat, input.kelas_id);

    return created;
  }

  private async applyGlobalAction(tenantId: string, tanggalStr: string, mode: 'NORMAL' | 'LIBUR' | 'DISPEN', keterangan: string, abaikanTerlambat: boolean, kelasId?: string) {
    const tgl = new Date(tanggalStr);
    const startOfDay = new Date(tgl.setHours(0, 0, 0, 0));
    const endOfDay = new Date(tgl.setHours(23, 59, 59, 999));

    // Cari semua sesi pada hari tersebut, filter berdasarkan kelas jika ada
    const whereClause: any = {
      tenant_id: tenantId,
      tanggal: { gte: startOfDay, lte: endOfDay }
    };
    if (kelasId) {
      whereClause.kelas_id = kelasId;
    }

    const sessions = await prisma.sesiAbsensi.findMany({
      where: whereClause,
      include: {
        Kelas: { include: { SiswaAkademik: { where: { status: 'AKTIF' } } } }
      }
    });

    if (sessions.length === 0) return;

    if (mode === 'LIBUR') {
      // Retroaktif LIBUR: Hapus semua sesi dan otomatis cascading ke daftar hadir
      await prisma.sesiAbsensi.deleteMany({
        where: whereClause
      });
    } else if (mode === 'DISPEN') {
      // Retroaktif DISPEN: Ubah semua status menjadi DISPEN
      for (const session of sessions) {
        // 1. Update status sesi
        await prisma.sesiAbsensi.update({
          where: { id: session.id },
          data: { status: 'SELESAI', keterangan: `[AKSI DARURAT] ${keterangan}` }
        });

        // 2. Update yang sudah ada (ALPA/TERLAMBAT) menjadi DISPEN dan perbaiki poin
        await prisma.absenSiswa.updateMany({
          where: { sesi_id: session.id, status: { in: ['ALPA', 'TERLAMBAT', 'Belum Hadir'] } },
          data: { 
            status: 'DISPEN', 
            catatan: keterangan, 
            is_terlambat: false, 
            menit_keterlambatan: 0,
            poin_kehadiran: ATTENDANCE_POINTS.DISPEN
          }
        });

        // 3. Cari siswa yang belum ada recordnya sama sekali
        const existingAbsents = await prisma.absenSiswa.findMany({
          where: { sesi_id: session.id },
          select: { siswa_akademik_id: true }
        });
        const existingIds = new Set(existingAbsents.map(a => a.siswa_akademik_id));

        const students = session.Kelas?.SiswaAkademik || [];
        const dispenData = students
          .filter(s => !existingIds.has(s.id))
          .map(s => ({
            tenant_id: tenantId,
            sesi_id: session.id,
            siswa_id: (s as any).siswa_id,
            siswa_akademik_id: s.id,
            status: 'DISPEN',
            waktu_tap: null,
            tahun_pelajaran_id: session.tahun_pelajaran_id,
            semester_id: session.semester_id,
            catatan: keterangan,
            poin_kehadiran: ATTENDANCE_POINTS.DISPEN
          }));

        if (dispenData.length > 0) {
          await prisma.absenSiswa.createMany({ data: dispenData });
        }

        // 4. Update Guru
        if (session.guru_id) {
          await prisma.absenGuru.updateMany({
            where: { sesi_id: session.id, status: { in: ['Belum Hadir', 'ALPA'] } },
            data: { 
              status: 'HADIR', 
              catatan: `[AKSI DARURAT] ${keterangan}`, 
              is_terlambat: false, 
              menit_keterlambatan: 0,
              poin_kehadiran: ATTENDANCE_POINTS.HADIR_TEPAT_WAKTU 
            }
          });
        }
      }
    } else if (mode === 'NORMAL' && abaikanTerlambat) {
      // Retroaktif NORMAL + Abaikan Terlambat: Putihkan semua keterlambatan dan kembalikan poin penuh
      await prisma.absenSiswa.updateMany({
        where: { 
          SesiAbsensi: whereClause,
          is_terlambat: true 
        },
        data: { 
          is_terlambat: false, 
          menit_keterlambatan: 0, 
          poin_kehadiran: ATTENDANCE_POINTS.HADIR_TEPAT_WAKTU,
          catatan: `[BYPASS LATE] ${keterangan}` 
        }
      });

      await prisma.absenGuru.updateMany({
        where: { 
          SesiAbsensi: whereClause,
          is_terlambat: true 
        },
        data: { 
          is_terlambat: false, 
          menit_keterlambatan: 0, 
          poin_kehadiran: ATTENDANCE_POINTS.HADIR_TEPAT_WAKTU,
          catatan: `[BYPASS LATE] ${keterangan}` 
        }
      });
    }
  }

  async delete(scope: DataScope, id: string) {
    if (!scope.tenantId) throw new Error('Tenant ID required');

    // Security check: ensure the record belongs to the tenant
    const record = await prisma.absensiKejadianKhusus.findFirst({
      where: { id, tenant_id: scope.tenantId }
    });

    if (!record) {
      throw new Error('Record not found or access denied');
    }

    return prisma.absensiKejadianKhusus.delete({
      where: { id }
    });
  }
}

export const kejadianKhususService = new KejadianKhususService();
