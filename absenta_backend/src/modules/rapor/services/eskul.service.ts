import { prisma } from '@/utils/prisma';
import { anggotaKegiatanEskulService } from '../../attendance/anggota-kegiatan-eskul/anggota-kegiatan-eskul.service';
import type { SaveNilaiEskulDto } from './eskul.schema';

export class EskulService {
  /**
   * Mengambil daftar opsi ekstrakurikuler aktif beserta deteksi hak akses pembina vs supervisi
   */
  static async getEskulOptions(tenantId: string, user: any) {
    const userRole = (user?.role || '').toUpperCase();
    const isSuperAdminOrAdmin = ['SUPERADMIN', 'ADMIN', 'KEPALA_SEKOLAH', 'WAKA_KURIKULUM', 'WAKA_KESISWAAN'].includes(userRole);

    // Ambil penugasan guru sebagai pembina eskul
    const pembinaAssignments = await prisma.organizationalAssignment.findMany({
      where: {
        tenant_id: tenantId,
        user_id: user?.id,
        is_active: true,
        Position: {
          code: 'PEMBINA_ESKUL',
        },
      },
      select: {
        jenis_kegiatan_id: true,
      },
    });

    const assignedEskulIds = new Set(
      pembinaAssignments.map((a) => a.jenis_kegiatan_id).filter((id): id is string => !!id)
    );

    const isSupervisor = isSuperAdminOrAdmin || user?.capabilities?.includes('academic.manage.academic') || user?.capabilities?.includes('kesiswaan.schedules.manage');

    // Ambil seluruh master kegiatan tipe ESKUL yang aktif
    const eskulList = await prisma.jenisKegiatanMaster.findMany({
      where: {
        tenant_id: tenantId,
        tipe: 'ESKUL',
        aktif: true,
      },
      include: {
        _count: {
          select: {
            AnggotaKegiatanEskul: true,
          },
        },
      },
      orderBy: {
        nama: 'asc',
      },
    });

    const eskulOptions = eskulList.map((e) => ({
      id: e.id,
      nama: e.nama,
      tipe: e.tipe,
      total_anggota: e._count?.AnggotaKegiatanEskul || 0,
      is_pembina: assignedEskulIds.has(e.id),
    }));

    return {
      can_supervise: Boolean(isSupervisor),
      is_pembina: assignedEskulIds.size > 0,
      assigned_eskul_ids: Array.from(assignedEskulIds),
      eskul_options: eskulOptions,
    };
  }

  /**
   * Mengambil seluruh anggota eskul terdaftar beserta nilai ekstrakurikuler semester terpilih
   */
  static async getMembersAndGrades(
    tenantId: string,
    params: {
      jenis_kegiatan_id: string;
      tahun_pelajaran_id: string;
      semester_id: string;
      kelas_id?: string;
    }
  ) {
    // 1. Pastikan sinkronisasi pilihan eskul dari biodata siswa berjalan
    await anggotaKegiatanEskulService.syncSiswaBiodataEskul(tenantId).catch(() => {});

    // 2. Ambil master eskul
    const eskulMaster = await prisma.jenisKegiatanMaster.findFirst({
      where: {
        id: params.jenis_kegiatan_id,
        tenant_id: tenantId,
      },
    });

    if (!eskulMaster) {
      throw new Error('Kegiatan ekstrakurikuler tidak ditemukan');
    }

    // 3. Ambil seluruh anggota terdaftar di eskul ini
    const memberRecords = await prisma.anggotaKegiatanEskul.findMany({
      where: {
        tenant_id: tenantId,
        jenis_kegiatan_id: params.jenis_kegiatan_id,
      },
      include: {
        SiswaAkademik: {
          include: {
            siswa: {
              select: {
                id: true,
                nis: true,
                nisn: true,
                nama_siswa: true,
                kelas_id: true,
              },
            },
            kelas: {
              select: {
                id: true,
                nama_kelas: true,
                tingkat: true,
              },
            },
          },
        },
      },
      orderBy: {
        SiswaAkademik: {
          siswa: {
            nama_siswa: 'asc',
          },
        },
      },
    });

    // Filter opsional per kelas jika diminta
    const filteredMembers = params.kelas_id
      ? memberRecords.filter((m) => m.SiswaAkademik?.kelas?.id === params.kelas_id || m.SiswaAkademik?.siswa?.kelas_id === params.kelas_id)
      : memberRecords;

    const studentIds = filteredMembers
      .map((m) => m.SiswaAkademik?.siswa?.id)
      .filter((id): id is string => !!id);

    // 4. Ambil nilai yang sudah tersimpan pada semester & TP ini
    const existingGrades = await prisma.nilaiEskul.findMany({
      where: {
        tenant_id: tenantId,
        jenis_kegiatan_id: params.jenis_kegiatan_id,
        tahun_pelajaran_id: params.tahun_pelajaran_id,
        semester_id: params.semester_id,
        siswa_id: { in: studentIds },
      },
    });

    const gradeMap = new Map<string, { predikat: string; keterangan: string | null }>();
    existingGrades.forEach((g) => {
      gradeMap.set(g.siswa_id, {
        predikat: g.predikat,
        keterangan: g.keterangan,
      });
    });

    // 5. Susun hasil akhir matriks anggota & nilai
    const members = filteredMembers
      .map((m) => {
        const siswa = m.SiswaAkademik?.siswa;
        const kelas = m.SiswaAkademik?.kelas;
        if (!siswa) return null;

        const grade = gradeMap.get(siswa.id);
        const defaultKeterangan = `Aktif melaksanakan kegiatan ekstrakurikuler ${eskulMaster.nama} dengan predikat ${grade?.predikat || 'A'}.`;

        return {
          siswa_id: siswa.id,
          nama_siswa: siswa.nama_siswa,
          nis: siswa.nis || '-',
          nisn: siswa.nisn || '-',
          kelas_id: kelas?.id || siswa.kelas_id || '-',
          kelas_nama: kelas?.nama_kelas || '—',
          tingkat: kelas?.tingkat || 10,
          predikat: grade?.predikat || 'A',
          keterangan: grade?.keterangan || defaultKeterangan,
          is_saved: Boolean(grade),
        };
      })
      .filter((m): m is NonNullable<typeof m> => !!m);

    return {
      eskul: {
        id: eskulMaster.id,
        nama: eskulMaster.nama,
        tipe: eskulMaster.tipe,
      },
      total_anggota: members.length,
      members,
    };
  }

  /**
   * Menyimpan / memperbarui matriks nilai ekstrakurikuler secara atomik
   */
  static async saveMatrix(tenantId: string, payload: SaveNilaiEskulDto) {
    const { jenis_kegiatan_id, tahun_pelajaran_id, semester_id, grades } = payload;

    // Verifikasi keberadaan master kegiatan
    const eskul = await prisma.jenisKegiatanMaster.findFirst({
      where: { id: jenis_kegiatan_id, tenant_id: tenantId },
    });

    if (!eskul) {
      throw new Error('Kegiatan ekstrakurikuler tidak valid');
    }

    // Transaksi atomik upsert seluruh baris nilai
    await prisma.$transaction(
      grades.map((item) =>
        prisma.nilaiEskul.upsert({
          where: {
            unique_nilai_eskul_semester: {
              tenant_id: tenantId,
              siswa_id: item.siswa_id,
              jenis_kegiatan_id,
              tahun_pelajaran_id,
              semester_id,
            },
          },
          update: {
            predikat: item.predikat,
            keterangan: item.keterangan || null,
            updated_at: new Date(),
          },
          create: {
            tenant_id: tenantId,
            siswa_id: item.siswa_id,
            jenis_kegiatan_id,
            tahun_pelajaran_id,
            semester_id,
            predikat: item.predikat,
            keterangan: item.keterangan || null,
          },
        })
      )
    );

    return {
      success: true,
      saved_count: grades.length,
      jenis_kegiatan_nama: eskul.nama,
    };
  }

  /**
   * Membantu Wali Kelas memantau kelengkapan nilai eskul untuk siswa di rombel binaannya
   */
  static async getWaliKelasOverview(
    tenantId: string,
    params: {
      kelas_id: string;
      tahun_pelajaran_id: string;
      semester_id: string;
    }
  ) {
    const students = await prisma.siswa.findMany({
      where: {
        tenant_id: tenantId,
        kelas_id: params.kelas_id,
        status: 'AKTIF',
      },
      select: {
        id: true,
        nama_siswa: true,
        nis: true,
        nisn: true,
        ekskul_1: true,
        ekskul_2: true,
      },
      orderBy: { nama_siswa: 'asc' },
    });

    const studentIds = students.map((s) => s.id);

    // Ambil penugasan anggota eskul
    const eskulMemberships = await prisma.anggotaKegiatanEskul.findMany({
      where: {
        tenant_id: tenantId,
        SiswaAkademik: {
          siswa_id: { in: studentIds },
        },
      },
      include: {
        JenisKegiatanMaster: { select: { id: true, nama: true } },
        SiswaAkademik: { select: { siswa_id: true } },
      },
    });

    // Ambil nilai eskul yang sudah tersimpan
    const savedGrades = await prisma.nilaiEskul.findMany({
      where: {
        tenant_id: tenantId,
        tahun_pelajaran_id: params.tahun_pelajaran_id,
        semester_id: params.semester_id,
        siswa_id: { in: studentIds },
      },
      include: {
        JenisKegiatanMaster: { select: { id: true, nama: true } },
      },
    });

    const overview = students.map((s) => {
      const studentMemberships = eskulMemberships.filter((m) => m.SiswaAkademik?.siswa_id === s.id);
      const studentGrades = savedGrades.filter((g) => g.siswa_id === s.id);

      // Gabungkan nama eskul dari membership atau biodata
      const eskulNames = new Set<string>();
      studentMemberships.forEach((m) => eskulNames.add(m.JenisKegiatanMaster.nama));
      if (s.ekskul_1) eskulNames.add(s.ekskul_1);
      if (s.ekskul_2) eskulNames.add(s.ekskul_2);

      const items = Array.from(eskulNames).map((eName) => {
        const foundGrade = studentGrades.find(
          (g) => g.JenisKegiatanMaster.nama.toLowerCase() === eName.toLowerCase()
        );
        return {
          nama_eskul: eName,
          predikat: foundGrade?.predikat || '-',
          keterangan: foundGrade?.keterangan || '-',
          is_graded: Boolean(foundGrade),
        };
      });

      return {
        siswa_id: s.id,
        nama_siswa: s.nama_siswa,
        nis: s.nis,
        nisn: s.nisn,
        total_eskul: items.length,
        eskul_items: items,
        all_graded: items.length > 0 && items.every((i) => i.is_graded),
      };
    });

    return {
      kelas_id: params.kelas_id,
      total_siswa: students.length,
      overview,
    };
  }
}
