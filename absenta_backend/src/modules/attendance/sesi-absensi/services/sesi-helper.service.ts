import { prisma } from '../../../../utils/prisma';

export class SesiHelperService {
  private static instance: SesiHelperService;

  public static getInstance(): SesiHelperService {
    if (!SesiHelperService.instance) {
      SesiHelperService.instance = new SesiHelperService();
    }
    return SesiHelperService.instance;
  }

  async summaryById(tenantId: string, _org: any, id: string) {
    const sesi = await prisma.sesiAbsensi.findFirst({
      where: { id, tenant_id: tenantId },
      select: {
        id: true,
        kelas_id: true,
        guru_id: true,
        jenis_kegiatan: true,
        status: true,
        waktu_mulai: true,
        waktu_selesai: true,
        Kelas: { select: { nama_kelas: true } },
        Mapel: { select: { nama_mapel: true } },
        Guru: { select: { nama_guru: true } }
      }
    });
    if (!sesi) throw new Error('Sesi tidak ditemukan');

    const totalSiswa = await prisma.siswaAkademik.count({
      where: { kelas_id: sesi.kelas_id }
    });

    const absenList = await prisma.absenSiswa.findMany({
      where: { tenant_id: tenantId, sesi_id: id },
      select: { status: true }
    });

    let hadir = 0;
    let terlambat = 0;
    let sakit = 0;
    let izin = 0;
    let alpa = 0;

    absenList.forEach(a => {
      if (a.status === 'HADIR') hadir++;
      else if (a.status === 'TERLAMBAT') terlambat++;
      else if (a.status === 'SAKIT') sakit++;
      else if (a.status === 'IZIN') izin++;
      else if (a.status === 'ALPA') alpa++;
    });

    const unrecorded = Math.max(0, totalSiswa - absenList.length);
    alpa += unrecorded;

    const rate = totalSiswa > 0 ? Math.round(((hadir + terlambat) / totalSiswa) * 100) : 0;

    return {
      sesi_id: id,
      kelas: sesi.Kelas?.nama_kelas || '-',
      mapel: sesi.Mapel?.nama_mapel || sesi.jenis_kegiatan,
      guru: sesi.Guru?.nama_guru || '-',
      total_siswa: totalSiswa,
      hadir,
      terlambat,
      sakit,
      izin,
      alpa,
      persentase_kehadiran: rate
    };
  }

  async checkPetugasActive(userId: string, _tenantId: string, org: any) {
    if (org?.tenant_wide === true) return true;

    const user = await prisma.user.findFirst({
      where: { id: userId },
      select: { id: true, role_id: true }
    });

    if (user?.role_id) return true;

    const isGuru = await prisma.guru.findFirst({
      where: { user_id: userId },
      select: { id: true }
    });

    return Boolean(isGuru);
  }

  async enrichWithSummary(tenantId: string, sessions: any[]) {
    if (!sessions || sessions.length === 0) return [];

    return Promise.all(sessions.map(async (sesi) => {
      try {
        const summary = await this.summaryById(tenantId, null, sesi.id);
        return {
          ...sesi,
          summary
        };
      } catch {
        return sesi;
      }
    }));
  }

  async attachJenisKegiatanMeta(_tenantId: string, sessions: any[]) {
    if (!sessions) return [];
    return sessions.map(s => ({
      ...s,
      meta_jenis: s.jenis_kegiatan || 'KBM'
    }));
  }

  async publishRedisEvent(channel: string, payload: any) {
    console.log(`[Redis Event] Channel: ${channel}`, payload);
  }
}

export const sesiHelperService = SesiHelperService.getInstance();
