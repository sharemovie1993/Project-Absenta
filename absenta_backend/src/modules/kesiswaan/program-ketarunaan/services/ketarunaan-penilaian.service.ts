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

    // Ambil seluruh ID semester yang beririsan dalam tahun pelajaran ini (proteksi sinkronisasi)
    const tpSemesters = await prisma.semester.findMany({
      where: {
        tenant_id: tenantId,
        tahun_pelajaran_id,
      },
      select: { id: true },
    });
    const candidateSemIds = Array.from(new Set([semester_id, ...tpSemesters.map((s) => s.id)].filter(Boolean)));

    const sesiList = await prisma.sesiAbsensi.findMany({
      where: {
        tenant_id: tenantId,
        kelas_id,
        tahun_pelajaran_id,
        semester_id: { in: candidateSemIds },
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
      select: {
        id: true,
        nama_kelas: true,
        tingkat: true,
        jurusan_id: true,
        Jurusan: {
          select: {
            id: true,
            nama: true,
            kode: true,
            singkatan: true,
          },
        },
      },
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

    // Konteks periode: fallback ke master Siswa HANYA sah untuk TP & Semester yang sedang aktif.
    // Siswa.kelas_id hanya merepresentasikan rombel SAAT INI, sehingga memakainya untuk periode
    // lampau akan "menarik" taruna angkatan sekarang ke tahun pelajaran yang salah.
    const period = await this.resolvePeriodContext(tenantId, tahun_pelajaran_id, semester_id);
    let rosterSource: 'SISWA_AKADEMIK' | 'MASTER_SISWA_FALLBACK' | 'EMPTY' =
      siswaList.length > 0 ? 'SISWA_AKADEMIK' : 'EMPTY';

    if (siswaList.length === 0 && period.is_active_period) {
      rosterSource = 'MASTER_SISWA_FALLBACK';
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

      const samapta = existing?.nilai_samapta ?? 0;
      const pbb = existing?.nilai_pbb ?? 0;
      const disiplin = existing?.nilai_disiplin ?? p.rekomendasi_disiplin;
      const mental = existing?.nilai_mental ?? p.rekomendasi_mental;

      let nilaiAkhir = existing?.nilai_akhir;
      let predikat = existing?.predikat;
      let deskripsiRapor = existing?.deskripsi_rapor;

      if (nilaiAkhir === undefined || nilaiAkhir === null) {
        const calc = this.calculateScore(
          { samapta, pbb, disiplin, mental },
          {
            samapta: skema.bobot_samapta,
            pbb: skema.bobot_pbb,
            disiplin: skema.bobot_disiplin,
            mental: skema.bobot_mental,
          },
          (skema.mode_pelatihan as 'SEMI_TARUNA' | 'FULL_TARUNA') || 'SEMI_TARUNA'
        );
        nilaiAkhir = calc.nilaiAkhir;
        predikat = calc.predikat;
        deskripsiRapor = calc.narasi;
      }

      return {
        siswa_id: sa.siswa_id,
        siswa_akademik_id: sa.id || null,
        nis: sa.siswa.nis,
        nisn: sa.siswa.nisn,
        nama_siswa: sa.siswa.nama_siswa,
        jenis_kelamin: sa.siswa.jenis_kelamin,
        kelas_id: sa.kelas_id || kelas_id,
        nama_kelas: kelas?.nama_kelas || '',
        tingkat: kelas?.tingkat ? String(kelas.tingkat) : '',
        jurusan_id: kelas?.jurusan_id || '',
        jurusan_nama: kelas?.Jurusan?.nama || '',
        kode_jurusan: kelas?.Jurusan?.kode || '',
        nilai_samapta: samapta,
        nilai_pbb: pbb,
        nilai_disiplin: disiplin,
        nilai_mental: mental,
        nilai_akhir: nilaiAkhir,
        predikat: predikat,
        deskripsi_rapor: deskripsiRapor,
        detail_samapta: existing?.detail_samapta ?? null,
        is_locked: existing?.is_locked ?? false,
        locked_at: existing?.locked_at ?? null,
        presensi: p,
      };
    });

    if (rosterSource === 'MASTER_SISWA_FALLBACK' && rows.length === 0) rosterSource = 'EMPTY';

    return {
      kelas,
      skema,
      period,
      roster_source: rosterSource,
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
   * Konteks periode akademik (TP + Semester) untuk mencegah salah input lintas tahun.
   */
  private async resolvePeriodContext(tenantId: string, tahunPelajaranId: string, semesterId: string) {
    const [tp, sem] = await Promise.all([
      prisma.tahunPelajaran.findFirst({
        where: { id: tahunPelajaranId, tenant_id: tenantId },
        select: { id: true, tahun: true, is_active: true },
      }),
      prisma.semester.findFirst({
        where: { id: semesterId, tenant_id: tenantId },
        select: { id: true, nama_semester: true, is_active: true, tahun_pelajaran_id: true },
      }),
    ]);

    const semesterMatchesTp = Boolean(sem && sem.tahun_pelajaran_id === tahunPelajaranId);
    return {
      tahun_pelajaran_id: tahunPelajaranId,
      tahun: tp?.tahun || '',
      semester_id: semesterId,
      nama_semester: sem?.nama_semester || '',
      is_tp_active: Boolean(tp?.is_active),
      is_semester_active: Boolean(sem?.is_active),
      semester_matches_tp: semesterMatchesTp,
      is_active_period: Boolean(tp?.is_active && sem?.is_active && semesterMatchesTp),
    };
  }

  /**
   * Daftar siswa_id yang sah sebagai anggota rombel pada periode tertentu.
   */
  private async getAllowedSiswaIds(
    tenantId: string,
    kelasId: string,
    tahunPelajaranId: string,
    semesterId: string,
    isActivePeriod: boolean
  ): Promise<Set<string>> {
    const roster = await prisma.siswaAkademik.findMany({
      where: { kelas_id: kelasId, tahun_pelajaran_id: tahunPelajaranId, semester_id: semesterId },
      select: { siswa_id: true },
    });
    if (roster.length > 0 || !isActivePeriod) {
      return new Set(roster.map((r) => r.siswa_id));
    }
    const direct = await prisma.siswa.findMany({
      where: { tenant_id: tenantId, kelas_id: kelasId, status: 'AKTIF' },
      select: { id: true },
    });
    return new Set(direct.map((s) => s.id));
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
      is_archive_correction?: boolean;
      correction_reason?: string;
      userId?: string;
    }
  ) {
    const {
      kelas_id,
      tahun_pelajaran_id,
      semester_id,
      items,
      is_archive_correction,
      correction_reason,
      userId,
    } = payload;

    // 1. Guard kelas milik tenant
    const kelas = await prisma.kelas.findFirst({
      where: { id: kelas_id, tenant_id: tenantId },
      select: { id: true, nama_kelas: true, jurusan_id: true },
    });
    if (!kelas) {
      throw new Error('Rombel / Kelas tidak ditemukan pada institusi ini.');
    }

    // 2. Guard: semester harus milik TP terpilih
    const period = await this.resolvePeriodContext(tenantId, tahun_pelajaran_id, semester_id);
    if (!period.semester_matches_tp) {
      throw new Error('Semester tidak sesuai dengan Tahun Pelajaran terpilih. Muat ulang filter lalu coba lagi.');
    }

    // 3. Guard Periode Lampau / Arsip: wajib melalui Dapur Koreksi Arsip dengan alasan jelas
    const cleanReason = (correction_reason || '').trim();
    if (!period.is_active_period) {
      if (!is_archive_correction) {
        throw new Error(
          `Periode TP ${period.tahun} (${period.nama_semester}) adalah Periode Lampau / Arsip. Penilaian reguler ditutup; gunakan Dapur Koreksi Arsip untuk melakukan perubahan.`
        );
      }
      if (cleanReason.length < 5) {
        throw new Error('Alasan koreksi nilai arsip wajib diisi (minimal 5 karakter) untuk pencatatan log audit.');
      }
    }

    // 4. Guard Nilai Terkunci: tidak boleh menimpa nilai yang sudah dikunci tanpa buka kunci dulu
    const lockedCount = await prisma.ketarunaanNilaiSiswa.count({
      where: {
        tenant_id: tenantId,
        kelas_id,
        tahun_pelajaran_id,
        semester_id,
        is_locked: true,
      },
    });
    if (lockedCount > 0 && !is_archive_correction) {
      throw new Error(
        'Nilai rombel ini sudah terkunci di Rapor. Silakan klik "Buka Kunci Nilai" terlebih dahulu sebelum menyimpan perubahan.'
      );
    }

    // 5. Guard keanggotaan taruna di rombel pada periode tersebut
    const allowed = await this.getAllowedSiswaIds(
      tenantId,
      kelas_id,
      tahun_pelajaran_id,
      semester_id,
      period.is_active_period
    );
    const invalid = (items || []).filter((it) => !allowed.has(it.siswa_id));
    if (invalid.length > 0) {
      throw new Error(
        `${invalid.length} taruna bukan anggota rombel ${kelas.nama_kelas} pada TP ${period.tahun} ${period.nama_semester}. Penyimpanan dibatalkan untuk mencegah salah input.`
      );
    }

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

    // Catat ke ActivityLog jika melalui Dapur Koreksi Arsip
    if (!period.is_active_period || is_archive_correction) {
      try {
        await prisma.activityLog.create({
          data: {
            tenant_id: tenantId,
            user_id: userId || null,
            action: 'ARCHIVE_CORRECTION_KETARUNAAN',
            entity: 'KetarunaanNilaiSiswa',
            entity_id: kelas_id,
            metadata: JSON.stringify({
              kelas_id,
              nama_kelas: kelas.nama_kelas,
              tahun_pelajaran_id,
              tahun: period.tahun,
              semester_id,
              semester: period.nama_semester,
              saved_count: results.length,
              reason: cleanReason || 'Koreksi Dapur Arsip',
            }),
          },
        });
      } catch (e) {}
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
      is_archive_correction?: boolean;
      correction_reason?: string;
    }
  ) {
    const { kelas_id, tahun_pelajaran_id, semester_id, userId, is_archive_correction, correction_reason } = payload;

    const kelas = await prisma.kelas.findFirst({
      where: { id: kelas_id, tenant_id: tenantId },
      select: { id: true, nama_kelas: true },
    });
    if (!kelas) {
      throw new Error('Rombel / Kelas tidak ditemukan pada institusi ini.');
    }

    const period = await this.resolvePeriodContext(tenantId, tahun_pelajaran_id, semester_id);
    if (!period.semester_matches_tp) {
      throw new Error('Semester tidak sesuai dengan Tahun Pelajaran terpilih.');
    }
    if (!period.is_active_period && !is_archive_correction) {
      throw new Error(
        `Periode TP ${period.tahun} (${period.nama_semester}) adalah Periode Lampau / Arsip. Penguncian ulang hanya dapat dilakukan dari Dapur Koreksi Arsip.`
      );
    }

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

    if (!period.is_active_period || is_archive_correction) {
      try {
        await prisma.activityLog.create({
          data: {
            tenant_id: tenantId,
            user_id: userId || null,
            action: 'ARCHIVE_LOCK_KETARUNAAN',
            entity: 'KetarunaanNilaiSiswa',
            entity_id: kelas_id,
            metadata: JSON.stringify({
              kelas_id,
              nama_kelas: kelas.nama_kelas,
              tahun_pelajaran_id,
              tahun: period.tahun,
              semester_id,
              semester: period.nama_semester,
              locked_count: scores.length,
              reason: (correction_reason || '').trim() || 'Kunci ulang dari Dapur Koreksi Arsip',
            }),
          },
        });
      } catch (e) {}
    }

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
      userId?: string;
      is_archive_correction?: boolean;
      correction_reason?: string;
    }
  ) {
    const { kelas_id, tahun_pelajaran_id, semester_id, userId, is_archive_correction, correction_reason } = payload;

    const kelas = await prisma.kelas.findFirst({
      where: { id: kelas_id, tenant_id: tenantId },
      select: { id: true, nama_kelas: true },
    });
    if (!kelas) {
      throw new Error('Rombel / Kelas tidak ditemukan pada institusi ini.');
    }

    const period = await this.resolvePeriodContext(tenantId, tahun_pelajaran_id, semester_id);
    if (!period.semester_matches_tp) {
      throw new Error('Semester tidak sesuai dengan Tahun Pelajaran terpilih.');
    }
    if (!period.is_active_period && !is_archive_correction) {
      throw new Error(
        `Periode TP ${period.tahun} (${period.nama_semester}) adalah Periode Lampau / Arsip. Buka kunci arsip hanya dapat dilakukan melalui Dapur Koreksi Arsip.`
      );
    }

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

    if (!period.is_active_period || is_archive_correction) {
      try {
        await prisma.activityLog.create({
          data: {
            tenant_id: tenantId,
            user_id: userId || null,
            action: 'ARCHIVE_UNLOCK_KETARUNAAN',
            entity: 'KetarunaanNilaiSiswa',
            entity_id: kelas_id,
            metadata: JSON.stringify({
              kelas_id,
              nama_kelas: kelas.nama_kelas,
              tahun_pelajaran_id,
              tahun: period.tahun,
              semester_id,
              semester: period.nama_semester,
              reason: (correction_reason || '').trim() || 'Buka kunci dari Dapur Koreksi Arsip',
            }),
          },
        });
      } catch (e) {}
    }

    return { success: true, message: 'Kunci nilai berhasil dibuka' };
  }

  /**
   * Mengambil data lengkap nilai ketarunaan (per rombel atau seluruh rombel sekolah)
   * untuk keperluan ekspor spreadsheet dan mail merge pencetakan sertifikat/rapor.
   */
  async getNilaiExport(
    tenantId: string,
    params: {
      tahun_pelajaran_id: string;
      semester_id: string;
      kelas_id?: string;
    }
  ) {
    const { tahun_pelajaran_id, semester_id, kelas_id } = params;

    // 1. Ambil info sekolah, tenant, tahun pelajaran, dan semester
    const [sekolah, tenant, tahunPelajaran, semester] = await Promise.all([
      prisma.sekolah.findFirst({
        where: { tenant_id: tenantId },
        select: {
          nama: true,
          npsn: true,
          alamat: true,
          kota: true,
          kecamatan: true,
          provinsi: true,
          kode_pos: true,
          telepon: true,
          email: true,
          website: true,
          kepala_sekolah: true,
          nip_kepala: true,
        },
      }),
      prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { name: true, subdomain: true },
      }),
      prisma.tahunPelajaran.findUnique({
        where: { id: tahun_pelajaran_id },
        select: { id: true, tahun: true },
      }),
      prisma.semester.findUnique({
        where: { id: semester_id },
        select: { id: true, nama_semester: true },
      }),
    ]);

    // 2. Tentukan rombel yang ditargetkan
    const whereKelas: any = { tenant_id: tenantId };
    if (kelas_id && kelas_id !== 'ALL') {
      whereKelas.id = kelas_id;
    }

    const classes = await prisma.kelas.findMany({
      where: whereKelas,
      include: {
        Jurusan: {
          select: { id: true, nama: true, kode: true, singkatan: true },
        },
      },
      orderBy: [
        { tingkat: 'asc' },
        { nama_kelas: 'asc' },
      ],
    });

    if (classes.length === 0) {
      return {
        sekolah,
        tenant,
        tahun_pelajaran: tahunPelajaran,
        semester,
        total_siswa: 0,
        classes: [],
        students: [],
      };
    }

    const classIds = classes.map((c) => c.id);
    const classMap = new Map<string, any>();
    classes.forEach((c) => classMap.set(c.id, c));

    // 3. Ambil data skema per jurusan & global
    const allSkemas = await prisma.ketarunaanSkemaConfig.findMany({
      where: {
        tenant_id: tenantId,
        tahun_pelajaran_id,
      },
    });
    const skemaByJurusan = new Map<string, any>();
    let defaultSkema = allSkemas.find((s) => !s.jurusan_id);
    allSkemas.forEach((s) => {
      if (s.jurusan_id) skemaByJurusan.set(s.jurusan_id, s);
    });

    if (!defaultSkema) {
      defaultSkema = {
        tenant_id: tenantId,
        tahun_pelajaran_id,
        semester_id,
        jurusan_id: null,
        mode_pelatihan: 'SEMI_TARUNA',
        bobot_samapta: 25,
        bobot_pbb: 20,
        bobot_disiplin: 30,
        bobot_mental: 25,
        active_sub_aspects: null,
      } as any;
    }

    // 4. Ambil seluruh siswa aktif di rombel terpilih
    let siswaList = await prisma.siswaAkademik.findMany({
      where: {
        kelas_id: { in: classIds },
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
            tempat_lahir: true,
            tanggal_lahir: true,
          },
        },
      },
      orderBy: [
        { siswa: { nama_siswa: 'asc' } },
      ],
    });

    // Fallback jika belum di-generate di siswaAkademik — hanya untuk periode aktif
    const exportPeriod = await this.resolvePeriodContext(tenantId, tahun_pelajaran_id, semester_id);
    if (siswaList.length === 0 && exportPeriod.is_active_period) {
      const directSiswa = await prisma.siswa.findMany({
        where: {
          tenant_id: tenantId,
          kelas_id: { in: classIds },
          status: 'AKTIF',
        },
        select: {
          id: true,
          nis: true,
          nisn: true,
          nama_siswa: true,
          jenis_kelamin: true,
          tempat_lahir: true,
          tanggal_lahir: true,
          kelas_id: true,
        },
        orderBy: {
          nama_siswa: 'asc',
        },
      });

      siswaList = directSiswa.map((s) => ({
        id: '',
        siswa_id: s.id,
        kelas_id: s.kelas_id,
        tahun_pelajaran_id,
        semester_id,
        status: 'AKTIF',
        created_at: new Date(),
        updated_at: new Date(),
        siswa: s,
      })) as any;
    }

    // 5. Ambil nilai tersimpan
    const savedScores = await prisma.ketarunaanNilaiSiswa.findMany({
      where: {
        tenant_id: tenantId,
        kelas_id: { in: classIds },
        tahun_pelajaran_id,
        semester_id,
      },
    });
    const scoreMap = new Map<string, any>();
    savedScores.forEach((s) => scoreMap.set(s.siswa_id, s));

    // Sort siswa berdasarkan Kelas (tingkat, nama_kelas) lalu nama_siswa
    siswaList.sort((a, b) => {
      const kelasA = classMap.get(a.kelas_id);
      const kelasB = classMap.get(b.kelas_id);
      const kA = `${String(kelasA?.tingkat || 0).padStart(2, '0')}_${kelasA?.nama_kelas || ''}`;
      const kB = `${String(kelasB?.tingkat || 0).padStart(2, '0')}_${kelasB?.nama_kelas || ''}`;
      if (kA !== kB) return kA.localeCompare(kB);
      return (a.siswa?.nama_siswa || '').localeCompare(b.siswa?.nama_siswa || '');
    });

    const exportRows = siswaList.map((sa, idx) => {
      const s = sa.siswa;
      const k = classMap.get(sa.kelas_id);
      const existing = scoreMap.get(sa.siswa_id);
      const sk = (k?.jurusan_id && skemaByJurusan.get(k.jurusan_id)) || defaultSkema;

      const samapta = existing?.nilai_samapta ?? 0;
      const pbb = existing?.nilai_pbb ?? 0;
      const disiplin = existing?.nilai_disiplin ?? 0;
      const mental = existing?.nilai_mental ?? 0;

      const weights = {
        samapta: sk.bobot_samapta ?? 25,
        pbb: sk.bobot_pbb ?? 20,
        disiplin: sk.bobot_disiplin ?? 30,
        mental: sk.bobot_mental ?? 25,
      };

      const calc = this.calculateScore(
        { samapta, pbb, disiplin, mental },
        weights,
        sk.mode_pelatihan as 'FULL_TARUNA' | 'SEMI_TARUNA'
      );

      const nilaiAkhir = existing?.nilai_akhir != null && existing.nilai_akhir > 0 ? existing.nilai_akhir : calc.nilaiAkhir;
      const predikat = existing?.predikat && existing.predikat !== '-' ? existing.predikat : calc.predikat;
      const deskripsi = existing?.deskripsi_rapor || calc.narasi;

      let predikatLabel = 'Kurang';
      if (predikat === 'A') predikatLabel = 'Sangat Baik (Amat Baik)';
      else if (predikat === 'B') predikatLabel = 'Baik';
      else if (predikat === 'C') predikatLabel = 'Cukup';

      const keterangan = (predikat === 'A' || predikat === 'B' || predikat === 'C') ? 'KOMPETEN / LULUS' : 'BELUM MEMENUHI';

      const kotaSekolah = sekolah?.kota || sekolah?.kecamatan || 'Purwakarta';
      const yearNow = new Date().getFullYear();
      const noSertifikat = `421.5/KETARUNAAN/${yearNow}/${s?.nis || String(idx + 1).padStart(3, '0')}`;

      return {
        no: idx + 1,
        siswa_id: sa.siswa_id,
        nis: s?.nis || '',
        nisn: s?.nisn || '',
        nama_taruna: s?.nama_siswa || '',
        nama_lengkap: s?.nama_siswa || '',
        nama_siswa: s?.nama_siswa || '',
        jenis_kelamin: s?.jenis_kelamin || 'L',
        jk: s?.jenis_kelamin || 'L',
        jk_label: s?.jenis_kelamin === 'P' ? 'Perempuan' : 'Laki-laki',
        kelas_id: sa.kelas_id || k?.id || '',
        kelas: k?.nama_kelas || '',
        rombel: k?.nama_kelas || '',
        tingkat: k?.tingkat ? String(k.tingkat) : (k?.nama_kelas?.split(' ')[0] || ''),
        jurusan_id: k?.jurusan_id || '',
        jurusan: k?.Jurusan?.nama || k?.nama_kelas?.split(' ')[1] || 'Umum',
        kode_jurusan: k?.Jurusan?.kode || k?.nama_kelas?.split(' ')[1] || '',
        tahun_pelajaran: tahunPelajaran?.tahun || '',
        semester: semester?.nama_semester || '',
        mode_pelatihan: sk.mode_pelatihan === 'FULL_TARUNA' ? 'Murni Ketarunaan' : 'Semi Ketarunaan',
        nilai_samapta: samapta,
        nilai_pbb: pbb,
        nilai_disiplin: disiplin,
        nilai_mental: mental,
        bobot_samapta: weights.samapta,
        bobot_pbb: weights.pbb,
        bobot_disiplin: weights.disiplin,
        bobot_mental: weights.mental,
        nilai_akhir: nilaiAkhir,
        predikat,
        predikat_label: predikatLabel,
        keterangan,
        deskripsi_capaian: deskripsi,
        deskripsi_rapor: deskripsi,
        nomor_sertifikat: noSertifikat,
        tempat_terbit: kotaSekolah,
        tanggal_terbit: `${kotaSekolah}, ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`,
        tanggal_cetak: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
        nama_sekolah: sekolah?.nama || tenant?.name || 'SMK NEGERI 1 PLERED',
        npsn: sekolah?.npsn || '',
        alamat_sekolah: sekolah?.alamat || '',
        kota_sekolah: kotaSekolah,
        kepala_sekolah: sekolah?.kepala_sekolah || '',
        nip_kepala_sekolah: sekolah?.nip_kepala || '',
        is_locked: existing?.is_locked ?? false,
      };
    });

    return {
      sekolah,
      tenant,
      tahun_pelajaran: tahunPelajaran,
      semester,
      total_siswa: exportRows.length,
      classes: classes.map((c) => ({ id: c.id, nama: c.nama_kelas })),
      students: exportRows,
    };
  }

  /**
   * SSOT Pengumpulan Data Progres Program Ketarunaan terscope khusus ke 1 Semester Ganjil pada Tahun Pelajaran Aktif.
   * Menghitung progres penilaian 4 pilar (Samapta, PBB, Disiplin, Mental), finalisasi nilai, rata-rata capaian,
   * distribusi predikat (A/B/C/D), serta rekap penuh 5 siklus kegiatan ketarunaan selama 1 Semester Ganjil.
   */
  async getAcademicScopedKetarunaanProgress(
    tenantId: string,
    options?: { startUTC?: Date; endUTC?: Date }
  ) {
    const activeTp = await prisma.tahunPelajaran.findFirst({
      where: { tenant_id: tenantId, is_active: true },
      select: { id: true, tahun: true },
    });

    if (!activeTp) {
      return null;
    }

    // Prioritaskan Semester Ganjil pada Tahun Pelajaran aktif sesuai standar siklus ketarunaan
    let targetSem = await prisma.semester.findFirst({
      where: {
        tenant_id: tenantId,
        tahun_pelajaran_id: activeTp.id,
        nama_semester: { contains: 'Ganjil', mode: 'insensitive' },
      },
      select: { id: true, nama_semester: true },
    });

    if (!targetSem) {
      targetSem = await prisma.semester.findFirst({
        where: { tenant_id: tenantId, is_active: true },
        select: { id: true, nama_semester: true },
      });
    }

    if (!targetSem) {
      return null;
    }

    const [
      skemaConfig,
      totalTarunaTarget,
      nilaiRows,
      sesiKetarunaanList,
    ] = await Promise.all([
      this.getSkemaConfig(tenantId, {
        tahun_pelajaran_id: activeTp.id,
        semester_id: targetSem.id,
      }),
      prisma.siswaAkademik.count({
        where: {
          tahun_pelajaran_id: activeTp.id,
          semester_id: targetSem.id,
          status: 'AKTIF',
          siswa: { tenant_id: tenantId, status: 'AKTIF' },
        },
      }),
      prisma.ketarunaanNilaiSiswa.findMany({
        where: {
          tenant_id: tenantId,
          tahun_pelajaran_id: activeTp.id,
          semester_id: targetSem.id,
        },
        select: {
          nilai_samapta: true,
          nilai_pbb: true,
          nilai_disiplin: true,
          nilai_mental: true,
          nilai_akhir: true,
          predikat: true,
          is_locked: true,
        },
      }),
      prisma.sesiAbsensi.findMany({
        where: {
          tenant_id: tenantId,
          tahun_pelajaran_id: activeTp.id,
          semester_id: targetSem.id,
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
        select: {
          id: true,
          tanggal: true,
          status: true,
          jenis_kegiatan: true,
        },
      }),
    ]);

    let tarunaDinilai = 0;
    let tarunaFinalLocked = 0;
    let sumNilaiAkhir = 0;
    let sumSamapta = 0;
    let sumPbb = 0;
    let sumDisiplin = 0;
    let sumMental = 0;
    const predikatCount: Record<string, number> = { A: 0, B: 0, C: 0, D: 0 };

    for (const r of nilaiRows) {
      const hasScore =
        (r.nilai_akhir || 0) > 0 ||
        (r.nilai_samapta || 0) > 0 ||
        (r.nilai_pbb || 0) > 0 ||
        (r.nilai_disiplin || 0) > 0 ||
        (r.nilai_mental || 0) > 0;
      if (hasScore) {
        tarunaDinilai++;
        sumNilaiAkhir += Number(r.nilai_akhir || 0);
        sumSamapta += Number(r.nilai_samapta || 0);
        sumPbb += Number(r.nilai_pbb || 0);
        sumDisiplin += Number(r.nilai_disiplin || 0);
        sumMental += Number(r.nilai_mental || 0);
        const p = (r.predikat || 'B').toUpperCase();
        if (predikatCount[p] !== undefined) predikatCount[p]++;
      }
      if (r.is_locked) {
        tarunaFinalLocked++;
      }
    }

    const classifySiklus = (j: string) => {
      const u = String(j || '').toUpperCase();
      if (u.includes('UPACARA')) return 'UPACARA';
      if (u.includes('DUHA') || u.includes('DHUHA')) return 'DUHA';
      if (u.includes('SORE') || u.includes('PULANG')) return 'APEL_SORE';
      return 'KETARUNAAN';
    };

    let sesiKetarunaanPagiCount = 0;
    let sesiUpacaraCount = 0;
    let sesiDuhaCount = 0;
    let sesiApelPulangCount = 0;

    const totalSesiSemester = sesiKetarunaanList.length;
    const sesiHariIniIds: string[] = [];
    const allSesiIds: string[] = [];
    const disiplinSesiIds: string[] = [];
    const duhaSesiIds: string[] = [];

    for (const s of sesiKetarunaanList) {
      allSesiIds.push(s.id);
      const jenis = classifySiklus(s.jenis_kegiatan);
      if (jenis === 'KETARUNAAN') {
        sesiKetarunaanPagiCount++;
        disiplinSesiIds.push(s.id);
      } else if (jenis === 'UPACARA') {
        sesiUpacaraCount++;
        disiplinSesiIds.push(s.id);
      } else if (jenis === 'DUHA') {
        sesiDuhaCount++;
        duhaSesiIds.push(s.id);
      } else if (jenis === 'APEL_SORE') {
        sesiApelPulangCount++;
        disiplinSesiIds.push(s.id);
      }

      if (
        options?.startUTC &&
        options?.endUTC &&
        s.tanggal >= options.startUTC &&
        s.tanggal <= options.endUTC
      ) {
        sesiHariIniIds.push(s.id);
      }
    }

    // Agregasi presensi selama 1 Semester Ganjil penuh (seluruh sesi 5 siklus di Semester Ganjil)
    let kehadiranLatihanPct = 0;
    let hadirLatihanCount = 0;
    let sakitIzinLatihanCount = 0;
    let alpaLatihanCount = 0;
    let totalPresensiLatihan = 0;

    if (allSesiIds.length > 0) {
      const presensiStats = await prisma.absenSiswa.groupBy({
        by: ['status'],
        where: {
          tenant_id: tenantId,
          sesi_id: { in: allSesiIds },
        },
        _count: { id: true },
      });
      for (const ps of presensiStats) {
        const c = ps._count.id;
        totalPresensiLatihan += c;
        const st = (ps.status || '').toUpperCase();
        if (st === 'HADIR' || st === 'TERLAMBAT') {
          hadirLatihanCount += c;
        } else if (st === 'SAKIT' || st === 'IZIN' || st === 'DISPENSASI') {
          sakitIzinLatihanCount += c;
        } else if (st === 'ALPA') {
          alpaLatihanCount += c;
        }
      }
      if (totalPresensiLatihan > 0) {
        kehadiranLatihanPct = Math.round((hadirLatihanCount / totalPresensiLatihan) * 100);
      }
    }

    const progresInputNilaiPct =
      totalTarunaTarget > 0 ? Math.round((tarunaDinilai / totalTarunaTarget) * 100) : 0;
    const progresFinalisasiPct =
      totalTarunaTarget > 0 ? Math.round((tarunaFinalLocked / totalTarunaTarget) * 100) : 0;
    const rataRataNilaiAkhir =
      tarunaDinilai > 0 ? Number((sumNilaiAkhir / tarunaDinilai).toFixed(1)) : 0;
    const rataRataSamapta =
      tarunaDinilai > 0 ? Number((sumSamapta / tarunaDinilai).toFixed(1)) : 0;
    const rataRataPbb =
      tarunaDinilai > 0 ? Number((sumPbb / tarunaDinilai).toFixed(1)) : 0;
    const rataRataDisiplin =
      tarunaDinilai > 0 ? Number((sumDisiplin / tarunaDinilai).toFixed(1)) : kehadiranLatihanPct;
    const rataRataMental =
      tarunaDinilai > 0 ? Number((sumMental / tarunaDinilai).toFixed(1)) : kehadiranLatihanPct;

    return {
      academicContext: `TP ${activeTp.tahun} • Semester ${targetSem.nama_semester}`,
      modePelatihan:
        (skemaConfig as any)?.mode_pelatihan === 'FULL_TARUNA' ? 'Full Taruna' : 'Semi Taruna',
      isConfigured: !(skemaConfig as any)?.is_default,
      totalTarunaTarget,
      tarunaDinilai,
      tarunaFinalLocked,
      progresInputNilaiPct,
      progresFinalisasiPct,
      rataRataNilaiAkhir,
      rataRataSamapta,
      rataRataPbb,
      rataRataDisiplin,
      rataRataMental,
      predikatCount,
      totalSesiSemester,
      sesiKetarunaanPagiCount,
      sesiUpacaraCount,
      sesiDuhaCount,
      sesiApelPulangCount,
      sesiHariIniCount: sesiHariIniIds.length,
      kehadiranLatihanPct,
      hadirLatihanCount,
      sakitIzinLatihanCount,
      alpaLatihanCount,
      totalPresensiLatihan,
    };
  }
}

export const ketarunaanPenilaianService = new KetarunaanPenilaianService();
