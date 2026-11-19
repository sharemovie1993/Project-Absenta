import { prisma } from '../../../../utils/prisma';
import { cacheInvalidationService } from '../../../../utils/cache-invalidation.service';

export interface SkemaConfigPayload {
  tahun_pelajaran_id: string;
  semester_id?: string | null;
  jurusan_id?: string | null;
  mode_pelatihan: 'FULL_TARUNA' | 'SEMI_TARUNA';
  bobot_samapta: number;
  bobot_pbb: number;
  bobot_disiplin: number;
  bobot_mental: number;
  active_sub_aspects?: any;
}

export interface NilaiItemPayload {
  siswa_id: string;
  siswa_akademik_id?: string | null;
  nilai_samapta: number;
  nilai_pbb: number;
  nilai_disiplin: number;
  nilai_mental: number;
  detail_samapta?: any;
  custom_deskripsi?: string | null;
}

export class KetarunaanPenilaianService {
  /**
   * Mengambil konfigurasi skema dan bobot penilaian yang berlaku.
   * Prioritas: Khusus Jurusan -> Global Sekolah -> Default Preset.
   */
  async getSkemaConfig(
    tenantId: string,
    params: {
      tahun_pelajaran_id: string;
      semester_id?: string | null;
      jurusan_id?: string | null;
    }
  ) {
    const { tahun_pelajaran_id, semester_id, jurusan_id } = params;

    // 1. Coba cari konfigurasi khusus jurusan (jika jurusan_id disediakan)
    if (jurusan_id) {
      const specific = await prisma.ketarunaanSkemaConfig.findFirst({
        where: {
          tenant_id: tenantId,
          tahun_pelajaran_id,
          semester_id: semester_id || null,
          jurusan_id,
        },
      });
      if (specific) return specific;
    }

    // 2. Coba cari konfigurasi global sekolah (jurusan_id is null)
    const globalConfig = await prisma.ketarunaanSkemaConfig.findFirst({
      where: {
        tenant_id: tenantId,
        tahun_pelajaran_id,
        semester_id: semester_id || null,
        jurusan_id: null,
      },
    });
    if (globalConfig) return globalConfig;

    // 3. Fallback ke Default Preset (Semi Taruna)
    return {
      tenant_id: tenantId,
      tahun_pelajaran_id,
      semester_id: semester_id || null,
      jurusan_id: jurusan_id || null,
      mode_pelatihan: 'SEMI_TARUNA',
      bobot_samapta: 25,
      bobot_pbb: 20,
      bobot_disiplin: 30,
      bobot_mental: 25,
      active_sub_aspects: null,
      is_default: true,
    };
  }

  /**
   * Menyimpan atau memperbarui konfigurasi skema bobot ketarunaan.
   */
  async saveSkemaConfig(tenantId: string, payload: SkemaConfigPayload) {
    const totalBobot =
      Number(payload.bobot_samapta || 0) +
      Number(payload.bobot_pbb || 0) +
      Number(payload.bobot_disiplin || 0) +
      Number(payload.bobot_mental || 0);

    if (totalBobot !== 100) {
      throw new Error(`Total bobot harus tepat 100%. Saat ini: ${totalBobot}%`);
    }

    const jurusanId = payload.jurusan_id || null;
    const semesterId = payload.semester_id || null;

    const existing = await prisma.ketarunaanSkemaConfig.findFirst({
      where: {
        tenant_id: tenantId,
        tahun_pelajaran_id: payload.tahun_pelajaran_id,
        semester_id: semesterId,
        jurusan_id: jurusanId,
      },
    });

    if (existing) {
      return prisma.ketarunaanSkemaConfig.update({
        where: { id: existing.id },
        data: {
          mode_pelatihan: payload.mode_pelatihan,
          bobot_samapta: Number(payload.bobot_samapta),
          bobot_pbb: Number(payload.bobot_pbb),
          bobot_disiplin: Number(payload.bobot_disiplin),
          bobot_mental: Number(payload.bobot_mental),
          active_sub_aspects: payload.active_sub_aspects ?? undefined,
        },
      });
    }

    return prisma.ketarunaanSkemaConfig.create({
      data: {
        tenant_id: tenantId,
        tahun_pelajaran_id: payload.tahun_pelajaran_id,
        semester_id: semesterId,
        jurusan_id: jurusanId,
        mode_pelatihan: payload.mode_pelatihan,
        bobot_samapta: Number(payload.bobot_samapta),
        bobot_pbb: Number(payload.bobot_pbb),
        bobot_disiplin: Number(payload.bobot_disiplin),
        bobot_mental: Number(payload.bobot_mental),
        active_sub_aspects: payload.active_sub_aspects ?? undefined,
      },
    });
  }

  /**
   * Menghitung nilai akhir, predikat, dan narasi deskripsi otomatis.
   */
  calculateScore(
    scores: {
      samapta: number;
      pbb: number;
      disiplin: number;
      mental: number;
    },
    weights: {
      samapta: number;
      pbb: number;
      disiplin: number;
      mental: number;
    },
    mode: 'FULL_TARUNA' | 'SEMI_TARUNA' = 'SEMI_TARUNA'
  ) {
    const rawFinal =
      (scores.samapta * weights.samapta +
        scores.pbb * weights.pbb +
        scores.disiplin * weights.disiplin +
        scores.mental * weights.mental) /
      100;

    const nilaiAkhir = Math.round(rawFinal * 10) / 10;

    let predikat = 'D';
    if (nilaiAkhir >= 86) predikat = 'A';
    else if (nilaiAkhir >= 71) predikat = 'B';
    else if (nilaiAkhir >= 56) predikat = 'C';
    else predikat = 'D';

    let narasi = '';
    if (mode === 'FULL_TARUNA') {
      if (predikat === 'A') {
        narasi =
          'Menunjukkan keunggulan kesamaptaan jasmani yang prima dan kepemimpinan baris-berbaris (PBB) yang sangat tangguh. Disiplin atribut ketarunaan dan jiwa korsa terpelihara dengan sangat baik.';
      } else if (predikat === 'B') {
        narasi =
          'Menunjukkan kebugaran jasmani yang baik dan menguasai peraturan baris-berbaris (PBB) dengan tertib. Mematuhi tata tertib atribut ketarunaan dan menunjukkan kerja sama tim yang solid.';
      } else if (predikat === 'C') {
        narasi =
          'Memenuhi standar minimal kesamaptaan fisik dan baris-berbaris. Perlu peningkatan disiplin kehadiran dan konsistensi sikap taruna.';
      } else {
        narasi =
          'Belum memenuhi standar kualifikasi kesamaptaan jasmani dan kedisiplinan ketarunaan. Memerlukan bimbingan intensif dan pembinaan ulang.';
      }
    } else {
      // SEMI_TARUNA
      if (predikat === 'A') {
        narasi =
          'Menunjukkan komitmen kedisiplinan dan kepatuhan tata tertib yang sangat tinggi. Kebugaran jasmani terpelihara dengan prima serta menerapkan budaya kerja 5R dan etos tanggung jawab secara konsisten.';
      } else if (predikat === 'B') {
        narasi =
          'Memiliki kedisiplinan dan kebugaran jasmani yang baik. Mampu mengikuti apel dan kegiatan pembiasaan sekolah dengan tertib serta berakhlak mulia.';
      } else if (predikat === 'C') {
        narasi =
          'Cukup tertib dalam mengikuti pembiasaan sekolah dan kebugaran dasar. Perlu meningkatkan ketepatan waktu dan kerapian atribut seragam.';
      } else {
        narasi =
          'Perlu pembinaan khusus dalam hal kedisiplinan, kehadiran pembiasaan pagi, dan pembentukan karakter etos kerja.';
      }
    }

    return { nilaiAkhir, predikat, narasi };
  }

  /**
   * Menghitung rekap kehadiran 5 siklus ketarunaan untuk seluruh siswa di kelas
   * (Upacara, Ketarunaan Pagi, Pembiasaan Dhuha, Apel Sore, Log Keterlambatan).
   */
  async calculatePresensi5Siklus(
    tenantId: string,
    params: {
      kelas_id: string;
      tahun_pelajaran_id: string;
      semester_id: string;
    }
  ) {
    const { kelas_id, tahun_pelajaran_id, semester_id } = params;

    const sesiList = await prisma.sesiAbsensi.findMany({
      where: {
        tenant_id: tenantId,
        kelas_id,
        tahun_pelajaran_id,
        semester_id,
        status: { not: 'MENDATANG' },
        jenis_kegiatan: {
          in: [
            'Upacara',
            'UPACARA',
            'Ketarunaan',
            'KETARUNAAN',
            'Duha',
            'DUHA',
            'Dhuha',
            'DHUHA',
            'Apel Pulang',
            'APEL_SORE',
            'Apel Pulang Siswa',
          ],
        },
      },
      select: { id: true, jenis_kegiatan: true },
    });

    const classify = (j: string) => {
      const u = String(j || '').toUpperCase();
      if (u.includes('UPACARA')) return 'UPACARA';
      if (u.includes('DUHA') || u.includes('DHUHA')) return 'DUHA';
      if (u.includes('SORE') || u.includes('PULANG')) return 'APEL_SORE';
      return 'KETARUNAAN';
    };

    const duhaSesiIds = new Set(
      sesiList.filter((s) => classify(s.jenis_kegiatan) === 'DUHA').map((s) => s.id)
    );
    const disiplinSesiIds = new Set(
      sesiList.filter((s) => classify(s.jenis_kegiatan) !== 'DUHA').map((s) => s.id)
    );

    const totalSesiDuha = duhaSesiIds.size;
    const totalSesiDisiplin = disiplinSesiIds.size;
    const allSesiIds = sesiList.map((s) => s.id);

    const logs =
      allSesiIds.length > 0
        ? await prisma.absenSiswa.findMany({
            where: {
              tenant_id: tenantId,
              sesi_id: { in: allSesiIds },
              status: { in: ['HADIR', 'TERLAMBAT'] },
            },
            select: {
              siswa_id: true,
              sesi_id: true,
              status: true,
              is_terlambat: true,
            },
          })
        : [];

    const siswaMap = new Map<
      string,
      {
        hadir_disiplin: number;
        hadir_duha: number;
        terlambat_count: number;
      }
    >();

    for (const log of logs) {
      if (!log.siswa_id) continue;
      let curr = siswaMap.get(log.siswa_id);
      if (!curr) {
        curr = { hadir_disiplin: 0, hadir_duha: 0, terlambat_count: 0 };
        siswaMap.set(log.siswa_id, curr);
      }
      if (disiplinSesiIds.has(log.sesi_id)) {
        curr.hadir_disiplin++;
      }
      if (duhaSesiIds.has(log.sesi_id)) {
        curr.hadir_duha++;
      }
      if (log.is_terlambat || log.status === 'TERLAMBAT') {
        curr.terlambat_count++;
      }
    }

    const rekapMap = new Map<
      string,
      {
        hadir_disiplin: number;
        total_sesi_disiplin: number;
        persen_disiplin: number;
        hadir_duha: number;
        total_sesi_duha: number;
        persen_duha: number;
        terlambat_count: number;
        rekomendasi_disiplin: number;
        rekomendasi_mental: number;
      }
    >();

    siswaMap.forEach((val, sId) => {
      const persenDis = totalSesiDisiplin > 0 ? (val.hadir_disiplin / totalSesiDisiplin) * 100 : 80;
      const penalti = Math.min(15, val.terlambat_count * 1);
      const rekDisiplin = Math.max(0, Math.min(100, Math.round(persenDis - penalti)));

      const persenDuh = totalSesiDuha > 0 ? (val.hadir_duha / totalSesiDuha) * 100 : 80;
      const rekMental = Math.max(0, Math.min(100, Math.round(persenDuh)));

      rekapMap.set(sId, {
        hadir_disiplin: val.hadir_disiplin,
        total_sesi_disiplin: totalSesiDisiplin,
        persen_disiplin: Math.round(persenDis),
        hadir_duha: val.hadir_duha,
        total_sesi_duha: totalSesiDuha,
        persen_duha: Math.round(persenDuh),
        terlambat_count: val.terlambat_count,
        rekomendasi_disiplin: rekDisiplin,
        rekomendasi_mental: rekMental,
      });
    });

    return {
      totalSesiTerlaksana: allSesiIds.length,
      totalSesiDisiplin,
      totalSesiDuha,
      rekapMap,
    };
  }

  /**
   * Mengambil daftar siswa per rombel beserta nilai ketarunaan yang sudah ada.
   */
  async getNilaiKelas(
    tenantId: string,
    params: {
      kelas_id: string;
      tahun_pelajaran_id: string;
      semester_id: string;
    }
  ) {
    const { kelas_id, tahun_pelajaran_id, semester_id } = params;

    // 1. Ambil data kelas untuk mengetahui jurusannya
    const kelas = await prisma.kelas.findUnique({
      where: { id: kelas_id },
      select: { id: true, nama_kelas: true, jurusan_id: true },
    });

    // 2. Ambil skema konfigurasi yang relevan
    const skema = await this.getSkemaConfig(tenantId, {
      tahun_pelajaran_id,
      semester_id,
      jurusan_id: kelas?.jurusan_id || null,
    });

    // 3. Ambil seluruh siswa terdaftar aktif di kelas ini (via SiswaAkademik)
    let siswaList = await prisma.siswaAkademik.findMany({
      where: {
        kelas_id,
        tahun_pelajaran_id,
        semester_id,
      },
      include: {
        siswa: {
          select: {
            id: true,
            nis: true,
            nisn: true,
            nama_siswa: true,
            jenis_kelamin: true,
          },
        },
      },
      orderBy: {
        siswa: {
          nama_siswa: 'asc',
        },
      },
    });

    // Fallback: Jika SiswaAkademik belum di-generate untuk semester ini, ambil langsung dari tabel Siswa
    if (siswaList.length === 0) {
      const directSiswa = await prisma.siswa.findMany({
        where: {
          tenant_id: tenantId,
          kelas_id,
          status: 'AKTIF',
        },
        select: {
          id: true,
          nis: true,
          nisn: true,
          nama_siswa: true,
          jenis_kelamin: true,
        },
        orderBy: {
          nama_siswa: 'asc',
        },
      });

      siswaList = directSiswa.map((s) => ({
        id: '',
        siswa_id: s.id,
        kelas_id,
        tahun_pelajaran_id,
        semester_id,
        status: 'AKTIF',
        created_at: new Date(),
        updated_at: new Date(),
        siswa: s,
      })) as any;
    }

    // 4. Ambil nilai siswa yang tersimpan di DB
    const savedScores = await prisma.ketarunaanNilaiSiswa.findMany({
      where: {
        tenant_id: tenantId,
        kelas_id,
        tahun_pelajaran_id,
        semester_id,
      },
    });

    const scoreMap = new Map<string, any>();
    savedScores.forEach((s) => scoreMap.set(s.siswa_id, s));

    // 5. Ambil data presensi 5 siklus ketarunaan untuk kalkulasi rekomendasi
    const presensi5Siklus = await this.calculatePresensi5Siklus(tenantId, {
      kelas_id,
      tahun_pelajaran_id,
      semester_id,
    });

    const rows = siswaList.map((sa) => {
      const existing = scoreMap.get(sa.siswa_id);
      const p = presensi5Siklus.rekapMap.get(sa.siswa_id) || {
        hadir_disiplin: 0,
        total_sesi_disiplin: presensi5Siklus.totalSesiDisiplin,
        persen_disiplin: 0,
        hadir_duha: 0,
        total_sesi_duha: presensi5Siklus.totalSesiDuha,
        persen_duha: 0,
        terlambat_count: 0,
        rekomendasi_disiplin: 0,
        rekomendasi_mental: 0,
      };

      return {
        siswa_id: sa.siswa_id,
        siswa_akademik_id: sa.id || null,
        nis: sa.siswa.nis,
        nisn: sa.siswa.nisn,
        nama_siswa: sa.siswa.nama_siswa,
        jenis_kelamin: sa.siswa.jenis_kelamin,
        nilai_samapta: existing?.nilai_samapta ?? 0,
        nilai_pbb: existing?.nilai_pbb ?? 0,
        nilai_disiplin: existing?.nilai_disiplin ?? p.rekomendasi_disiplin,
        nilai_mental: existing?.nilai_mental ?? p.rekomendasi_mental,
        nilai_akhir: existing?.nilai_akhir ?? 0,
        predikat: existing?.predikat ?? '-',
        deskripsi_rapor: existing?.deskripsi_rapor ?? '',
        detail_samapta: existing?.detail_samapta ?? null,
        is_locked: existing?.is_locked ?? false,
        locked_at: existing?.locked_at ?? null,
        presensi: p,
      };
    });

    return {
      kelas,
      skema,
      total_siswa: rows.length,
      is_class_locked: rows.length > 0 && rows.every((r) => r.is_locked),
      presensi_summary: {
        total_sesi_terlaksana: presensi5Siklus.totalSesiTerlaksana,
        total_sesi_disiplin: presensi5Siklus.totalSesiDisiplin,
        total_sesi_duha: presensi5Siklus.totalSesiDuha,
      },
      students: rows,
    };
  }

  /**
   * Menyimpan nilai secara massal (bulk) untuk satu rombel.
   */
  async saveNilaiBulk(
    tenantId: string,
    payload: {
      kelas_id: string;
      tahun_pelajaran_id: string;
      semester_id: string;
      items: NilaiItemPayload[];
    }
  ) {
    const { kelas_id, tahun_pelajaran_id, semester_id, items } = payload;

    const kelas = await prisma.kelas.findUnique({
      where: { id: kelas_id },
      select: { jurusan_id: true },
    });

    const skema = await this.getSkemaConfig(tenantId, {
      tahun_pelajaran_id,
      semester_id,
      jurusan_id: kelas?.jurusan_id || null,
    });

    const weights = {
      samapta: skema.bobot_samapta,
      pbb: skema.bobot_pbb,
      disiplin: skema.bobot_disiplin,
      mental: skema.bobot_mental,
    };

    const results = [];

    for (const item of items) {
      const scores = {
        samapta: Number(item.nilai_samapta || 0),
        pbb: Number(item.nilai_pbb || 0),
        disiplin: Number(item.nilai_disiplin || 0),
        mental: Number(item.nilai_mental || 0),
      };

      const calc = this.calculateScore(
        scores,
        weights,
        skema.mode_pelatihan as 'FULL_TARUNA' | 'SEMI_TARUNA'
      );

      const finalDeskripsi = item.custom_deskripsi || calc.narasi;

      const record = await prisma.ketarunaanNilaiSiswa.upsert({
        where: {
          unique_ketarunaan_nilai_semester: {
            tenant_id: tenantId,
            siswa_id: item.siswa_id,
            tahun_pelajaran_id,
            semester_id,
          },
        },
        update: {
          kelas_id,
          siswa_akademik_id: item.siswa_akademik_id || undefined,
          nilai_samapta: scores.samapta,
          nilai_pbb: scores.pbb,
          nilai_disiplin: scores.disiplin,
          nilai_mental: scores.mental,
          detail_samapta: item.detail_samapta ?? undefined,
          nilai_akhir: calc.nilaiAkhir,
          predikat: calc.predikat,
          deskripsi_rapor: finalDeskripsi,
        },
        create: {
          tenant_id: tenantId,
          siswa_id: item.siswa_id,
          siswa_akademik_id: item.siswa_akademik_id || undefined,
          kelas_id,
          tahun_pelajaran_id,
          semester_id,
          nilai_samapta: scores.samapta,
          nilai_pbb: scores.pbb,
          nilai_disiplin: scores.disiplin,
          nilai_mental: scores.mental,
          detail_samapta: item.detail_samapta ?? undefined,
          nilai_akhir: calc.nilaiAkhir,
          predikat: calc.predikat,
          deskripsi_rapor: finalDeskripsi,
        },
      });

      results.push(record);
    }

    return {
      success: true,
      saved_count: results.length,
    };
  }

  /**
   * Mengunci nilai & mengirimkan narasi capaian langsung ke Rapor Kokurikuler Wali Kelas.
   */
  async lockNilaiKeRapor(
    tenantId: string,
    payload: {
      kelas_id: string;
      tahun_pelajaran_id: string;
      semester_id: string;
      userId?: string;
    }
  ) {
    const { kelas_id, tahun_pelajaran_id, semester_id, userId } = payload;

    // 1. Ambil seluruh nilai siswa yang sudah tersimpan di kelas ini
    const scores = await prisma.ketarunaanNilaiSiswa.findMany({
      where: {
        tenant_id: tenantId,
        kelas_id,
        tahun_pelajaran_id,
        semester_id,
      },
    });

    if (scores.length === 0) {
      throw new Error('Belum ada nilai ketarunaan yang diinput untuk kelas ini');
    }

    // 2. Kunci status di tabel KetarunaanNilaiSiswa
    const now = new Date();
    await prisma.ketarunaanNilaiSiswa.updateMany({
      where: {
        tenant_id: tenantId,
        kelas_id,
        tahun_pelajaran_id,
        semester_id,
      },
      data: {
        is_locked: true,
        locked_at: now,
        locked_by: userId || 'PEMBINA',
      },
    });

    // 3. Jembatani ke Rapor Kokurikuler:
    // Tulis ke config key yang dibaca modul Rapor: RAPOR_KOKURIKULER_${tp}_${sem}_${siswa_id}
    for (const s of scores) {
      const configKey = `RAPOR_KOKURIKULER_${tahun_pelajaran_id}_${semester_id}_${s.siswa_id}`;
      const configVal = s.deskripsi_rapor || '';

      const existing = await prisma.config.findFirst({
        where: { tenant_id: tenantId, key: configKey },
      });

      if (existing) {
        await prisma.config.update({
          where: { id: existing.id },
          data: { value: configVal },
        });
      } else {
        await prisma.config.create({
          data: {
            tenant_id: tenantId,
            key: configKey,
            value: configVal,
          },
        });
      }
    }

    // 4. Invalidasi cache Rapor agar Wali Kelas langsung melihat deskripsi baru
    try {
      await cacheInvalidationService.invalidateRaporCache(tenantId);
    } catch (e) {}

    return {
      success: true,
      locked_count: scores.length,
      synced_to_rapor: true,
    };
  }

  /**
   * Membuka kembali kunci nilai jika diperlukan pembinaan / remedial susulan.
   */
  async unlockNilai(
    tenantId: string,
    payload: {
      kelas_id: string;
      tahun_pelajaran_id: string;
      semester_id: string;
    }
  ) {
    const { kelas_id, tahun_pelajaran_id, semester_id } = payload;

    await prisma.ketarunaanNilaiSiswa.updateMany({
      where: {
        tenant_id: tenantId,
        kelas_id,
        tahun_pelajaran_id,
        semester_id,
      },
      data: {
        is_locked: false,
        locked_at: null,
        locked_by: null,
      },
    });

    return { success: true, message: 'Kunci nilai berhasil dibuka' };
  }
}

export const ketarunaanPenilaianService = new KetarunaanPenilaianService();
