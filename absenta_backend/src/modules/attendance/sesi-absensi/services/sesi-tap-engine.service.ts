import { prisma } from '../../../../utils/prisma';
import { AttendanceRuleEngine } from '../../../../domain/attendance/AttendanceRuleEngine';

export class SesiTapEngineService {
  private static instance: SesiTapEngineService;

  public static getInstance(): SesiTapEngineService {
    if (!SesiTapEngineService.instance) {
      SesiTapEngineService.instance = new SesiTapEngineService();
    }
    return SesiTapEngineService.instance;
  }

  async propagateGateAbsenceToSessions(tenantId: string, siswaId: string, status: string, tanggal: Date | string) {
    const targetDate = typeof tanggal === 'string' ? new Date(tanggal) : tanggal;
    const startOfDay = new Date(targetDate);
    startOfDay.setUTCHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setUTCHours(23, 59, 59, 999);

    const activeSessions = await prisma.sesiAbsensi.findMany({
      where: {
        tenant_id: tenantId,
        tanggal: { gte: startOfDay, lte: endOfDay },
        Kelas: {
          SiswaAkademik: { some: { siswa_id: siswaId } }
        }
      },
      select: { id: true, kelas_id: true }
    });

    for (const sesi of activeSessions) {
      await this.tapSiswa(tenantId, null, sesi.id, {
        siswa_id: siswaId,
        status,
        catatan: `Propagated from Gate Absensi (${status})`,
        waktu_tap: targetDate
      }, 'GATE_PROPAGATION');
    }

    return { success: true, count: activeSessions.length };
  }

  async tapSiswa(tenantId: string, _org: any, sesi_id: string, data: any, _userId: string) {
    const { siswa_id, status = 'HADIR', catatan, waktu_tap, nisn, rfid } = data;

    const sesi = await prisma.sesiAbsensi.findFirst({
      where: { id: sesi_id, tenant_id: tenantId }
    });
    if (!sesi) throw new Error('Sesi tidak ditemukan');

    let targetSiswaId = siswa_id;
    if (!targetSiswaId && (nisn || rfid)) {
      const found = await prisma.siswa.findFirst({
        where: {
          tenant_id: tenantId,
          OR: [
            { nisn: nisn || undefined },
            { no_rfid: rfid || undefined }
          ]
        },
        select: { id: true }
      });
      if (found) targetSiswaId = found.id;
    }

    if (!targetSiswaId) throw new Error('Siswa tidak ditemukan');

    const siswaAkademik = await prisma.siswaAkademik.findFirst({
      where: { siswa_id: targetSiswaId, kelas_id: sesi.kelas_id },
      select: { id: true }
    });

    if (!siswaAkademik) throw new Error('Siswa tidak terdaftar di kelas sesi ini');

    const tapTime = waktu_tap ? new Date(waktu_tap) : new Date();
    let isTerlambat = false;

    if (sesi.waktu_mulai && tapTime > sesi.waktu_mulai) {
      isTerlambat = true;
    }

    const poin = AttendanceRuleEngine.calculateAttendancePoints(status, isTerlambat);

    const existing = await prisma.absenSiswa.findFirst({
      where: {
        tenant_id: tenantId,
        sesi_id,
        siswa_akademik_id: siswaAkademik.id
      }
    });

    let result;
    if (existing) {
      result = await prisma.absenSiswa.update({
        where: {
          sesi_id_siswa_akademik_id: {
            sesi_id,
            siswa_akademik_id: siswaAkademik.id
          }
        },
        data: {
          status,
          is_terlambat: isTerlambat,
          poin_kehadiran: poin,
          waktu_tap: tapTime,
          catatan: catatan || existing.catatan,
          updated_at: new Date()
        }
      });
    } else {
      result = await prisma.absenSiswa.create({
        data: {
          tenant_id: tenantId,
          sesi_id,
          siswa_akademik_id: siswaAkademik.id,
          status,
          is_terlambat: isTerlambat,
          poin_kehadiran: poin,
          waktu_tap: tapTime,
          catatan: catatan || null
        }
      });
    }

    return result;
  }

  async updateAbsenGuru(tenantId: string, _org: any, sesiId: string, guruId: string, data: any) {
    const { status = 'HADIR', catatan, waktu_tap } = data;

    const sesi = await prisma.sesiAbsensi.findFirst({
      where: { id: sesiId, tenant_id: tenantId }
    });
    if (!sesi) throw new Error('Sesi tidak ditemukan');

    const tapTime = waktu_tap ? new Date(waktu_tap) : new Date();

    const existing = await prisma.absenGuru.findFirst({
      where: {
        tenant_id: tenantId,
        sesi_id: sesiId,
        guru_id: guruId
      }
    });

    let result;
    if (existing) {
      result = await prisma.absenGuru.update({
        where: { id: existing.id },
        data: {
          status,
          waktu_tap: tapTime,
          catatan: catatan || existing.catatan,
          updated_at: new Date()
        }
      });
    } else {
      result = await prisma.absenGuru.create({
        data: {
          tenant_id: tenantId,
          sesi_id: sesiId,
          guru_id: guruId,
          tahun_pelajaran_id: sesi.tahun_pelajaran_id,
          semester_id: sesi.semester_id,
          status,
          waktu_tap: tapTime,
          catatan: catatan || null
        }
      });
    }

    return result;
  }

  async listAbsenSiswa(tenantId: string, _org: any, sesi_id: string, _userId: string) {
    const sesi = await prisma.sesiAbsensi.findFirst({
      where: { id: sesi_id, tenant_id: tenantId },
      select: {
        id: true,
        kelas_id: true,
        guru_id: true,
        status: true,
        created_at: true,
        Guru: { select: { nama_guru: true } },
        AbsenGuru: {
          take: 1,
          select: { id: true, guru_id: true, status: true, waktu_tap: true, catatan: true }
        }
      }
    });
    if (!sesi) throw new Error('Sesi tidak ditemukan');

    const siswaAkademikList = await prisma.siswaAkademik.findMany({
      where: { kelas_id: sesi.kelas_id },
      select: {
        id: true,
        siswa_id: true,
        siswa: { select: { id: true, nama_siswa: true, nisn: true, no_rfid: true } }
      }
    });

    const absenSiswaList = await prisma.absenSiswa.findMany({
      where: { tenant_id: tenantId, sesi_id },
      select: {
        id: true,
        siswa_akademik_id: true,
        status: true,
        is_terlambat: true,
        poin_kehadiran: true,
        waktu_tap: true,
        catatan: true
      }
    });

    const absenMap = new Map<string, any>();
    absenSiswaList.forEach(a => absenMap.set(a.siswa_akademik_id, a));

    const mergedStudents = siswaAkademikList.map(sa => {
      const a = absenMap.get(sa.id);
      return {
        id: a?.id || `temp-${sa.id}`,
        siswa_akademik_id: sa.id,
        siswa_id: sa.siswa_id,
        nama_siswa: sa.siswa?.nama_siswa || '-',
        nisn: sa.siswa?.nisn || '-',
        is_guru: false,
        status: a?.status || 'ALPA',
        is_terlambat: a?.is_terlambat || false,
        poin_kehadiran: a?.poin_kehadiran || 0,
        waktu_tap: a?.waktu_tap ? a.waktu_tap.toISOString() : null,
        catatan: a?.catatan || null,
        Siswa: {
          id: sa.siswa?.id,
          nama_siswa: sa.siswa?.nama_siswa,
          nisn: sa.siswa?.nisn
        }
      };
    });

    const teacherRec = {
      id: sesi.AbsenGuru?.[0]?.id || `guru-${sesi.guru_id || 'unassigned'}`,
      siswa_akademik_id: `guru-${sesi.guru_id || 'unassigned'}`,
      siswa_id: sesi.guru_id || 'unassigned',
      nama_siswa: sesi.Guru?.nama_guru || 'Guru Pengajar',
      nisn: 'GURU',
      is_guru: true,
      status: sesi.AbsenGuru?.[0]?.status === 'HADIR' ? 'HADIR' : 'Belum Hadir',
      is_terlambat: false,
      poin_kehadiran: 0,
      waktu_tap: sesi.AbsenGuru?.[0]?.waktu_tap ? sesi.AbsenGuru[0].waktu_tap.toISOString() : sesi.created_at.toISOString(),
      catatan: sesi.AbsenGuru?.[0]?.catatan || null,
      Guru: {
        nama_guru: sesi.Guru?.nama_guru || 'Guru Pengajar'
      }
    };

    return [teacherRec, ...mergedStudents];
  }

  async pullAttendanceFromOverlappingPembiasaan(tenantId: string, targetSesi: any) {
    if (!targetSesi?.kelas_id || !targetSesi?.tanggal) return;

    const startOfDay = new Date(targetSesi.tanggal);
    startOfDay.setUTCHours(0, 0, 0, 0);
    const endOfDay = new Date(targetSesi.tanggal);
    endOfDay.setUTCHours(23, 59, 59, 999);

    const pembiasaanSesi = await prisma.sesiAbsensi.findFirst({
      where: {
        tenant_id: tenantId,
        kelas_id: targetSesi.kelas_id,
        jenis_kegiatan: 'PEMBIASAAN',
        tanggal: { gte: startOfDay, lte: endOfDay }
      },
      select: { id: true }
    });

    if (!pembiasaanSesi) return;

    const pembiasaanAbsen = await prisma.absenSiswa.findMany({
      where: { tenant_id: tenantId, sesi_id: pembiasaanSesi.id, status: 'HADIR' }
    });

    for (const pa of pembiasaanAbsen) {
      await this.tapSiswa(tenantId, null, targetSesi.id, {
        siswa_id: pa.siswa_akademik_id,
        status: 'HADIR',
        catatan: 'Auto-pulled from Pembiasaan',
        waktu_tap: pa.waktu_tap
      }, 'SYSTEM_AUTO_PULL');
    }
  }
}

export const sesiTapEngineService = SesiTapEngineService.getInstance();
