import { prisma } from '@/utils/prisma';
import { Prisma } from '@prisma/client';
import { getRedisConnection } from '@/infra/redis/redisClient';
import { cacheInvalidationService } from '@/utils/cache-invalidation.service';
import crypto from 'crypto';

export class CbtJadwalService {
  /**
   * Menghasilkan 6 karakter token acak (tanpa karakter ambigu seperti 0/O, 1/I)
   */
  static generateToken(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let token = '';
    const bytes = crypto.randomBytes(6);
    for (let i = 0; i < 6; i++) {
      token += chars[bytes[i] % chars.length];
    }
    return token;
  }

  /**
   * Mengambil daftar Jadwal Ujian dengan paginasi dan filter
   */
  static async list(tenantId: string, query: any) {
    const page = Math.max(1, Number(query.page || 1));
    const limit = Math.min(100, Math.max(1, Number(query.limit || 10)));
    const skip = (page - 1) * limit;

    const andConditions: Prisma.CbtJadwalUjianWhereInput[] = [
      { tenant_id: tenantId },
    ];

    if (query.status) {
      andConditions.push({ status: query.status });
    }
    if (query.bank_soal_id) {
      andConditions.push({ bank_soal_id: query.bank_soal_id });
    }
    if (query.guru_id) {
      andConditions.push({
        OR: [
          { BankSoal: { guru_id: query.guru_id } },
          {
            setting_keamanan: {
              path: ['created_by_guru_id'],
              equals: query.guru_id,
            },
          },
          {
            setting_keamanan: {
              path: ['pengawas_1_id'],
              equals: query.guru_id,
            },
          },
          {
            setting_keamanan: {
              path: ['pengawas_2_id'],
              equals: query.guru_id,
            },
          },
          {
            setting_keamanan: {
              path: ['proktor_id'],
              equals: query.guru_id,
            },
          },
        ],
      });
    }
    if (query.search) {
      andConditions.push({
        OR: [
          { nama_sesi: { contains: query.search, mode: 'insensitive' } },
          { token_ujian: { contains: query.search, mode: 'insensitive' } },
        ],
      });
    }

    const where: Prisma.CbtJadwalUjianWhereInput =
      andConditions.length === 1 ? andConditions[0] : { AND: andConditions };

    const [total, items] = await Promise.all([
      prisma.cbtJadwalUjian.count({ where }),
      prisma.cbtJadwalUjian.findMany({
        where,
        skip,
        take: limit,
        orderBy: { tanggal_mulai: 'desc' },
        include: {
          BankSoal: {
            select: {
              id: true,
              guru_id: true,
              kode_bank: true,
              judul: true,
              tingkat: true,
              jumlah_soal: true,
              mapel_id: true,
              Mapel: { select: { id: true, nama_mapel: true } },
              Guru: { select: { id: true, nama_guru: true, nip: true } },
            },
          },
          TahunPelajaran: { select: { id: true, tahun: true, is_active: true } },
          Semester: { select: { id: true, nama_semester: true, is_active: true } },
          _count: { select: { Peserta: true } },
        },
      }),
    ]);

    return {
      items,
      pagination: {
        page,
        limit,
        totalItems: total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * Mengambil detail Jadwal Ujian
   */
  static async getById(tenantId: string, id: string) {
    const jadwal = await prisma.cbtJadwalUjian.findFirst({
      where: { id, tenant_id: tenantId },
      include: {
        BankSoal: {
          include: {
            Mapel: { select: { nama_mapel: true, kode_mapel: true } },
            Guru: { select: { nama_guru: true, nip: true } },
          },
        },
        TahunPelajaran: { select: { id: true, tahun: true, is_active: true } },
        Semester: { select: { id: true, nama_semester: true, is_active: true } },
        _count: { select: { Peserta: true } },
      },
    });

    if (!jadwal) {
      throw new Error('Jadwal ujian tidak ditemukan');
    }

    return jadwal;
  }

  /**
   * Membuat Jadwal Ujian baru
   */
  static async create(tenantId: string, data: any) {
    // Pastikan bank soal valid dan memiliki butir soal
    const bankSoal = await prisma.cbtBankSoal.findFirst({
      where: { id: data.bank_soal_id, tenant_id: tenantId },
      include: { _count: { select: { Soal: true } } },
    });

    if (!bankSoal) {
      throw new Error('Bank soal tidak ditemukan');
    }
    if (bankSoal._count.Soal === 0) {
      throw new Error('Bank soal belum memiliki butir soal. Isi soal terlebih dahulu sebelum membuat jadwal.');
    }

    const token = this.generateToken();

    return prisma.cbtJadwalUjian.create({
      data: {
        tenant_id: tenantId,
        bank_soal_id: data.bank_soal_id,
        tahun_pelajaran_id: data.tahun_pelajaran_id,
        semester_id: data.semester_id,
        nama_sesi: data.nama_sesi.trim(),
        token_ujian: token,
        tanggal_mulai: new Date(data.tanggal_mulai),
        tanggal_selesai: new Date(data.tanggal_selesai),
        durasi_menit: data.durasi_menit ?? bankSoal.alokasi_menit,
        toleransi_terlambat_menit: data.toleransi_terlambat_menit ?? 15,
        target_kelas_ids: data.target_kelas_ids,
        setting_keamanan: data.setting_keamanan || {
          lock_device: true,
          block_tab_switching: true,
          max_tab_switches: 3,
          shuffle_questions: bankSoal.acak_soal,
          shuffle_options: bankSoal.acak_opsi,
          show_result_instant: false,
        },
        status: 'DRAFT',
      },
      include: {
        BankSoal: { select: { kode_bank: true, judul: true } },
      },
    });
  }

  /**
   * Mengupdate Jadwal Ujian
   */
  static async update(tenantId: string, id: string, data: any) {
    await this.getById(tenantId, id);

    return prisma.cbtJadwalUjian.update({
      where: { id },
      data: {
        ...(data.bank_soal_id ? { bank_soal_id: data.bank_soal_id } : {}),
        ...(data.tahun_pelajaran_id ? { tahun_pelajaran_id: data.tahun_pelajaran_id } : {}),
        ...(data.semester_id ? { semester_id: data.semester_id } : {}),
        ...(data.nama_sesi ? { nama_sesi: data.nama_sesi.trim() } : {}),
        ...(data.tanggal_mulai ? { tanggal_mulai: new Date(data.tanggal_mulai) } : {}),
        ...(data.tanggal_selesai ? { tanggal_selesai: new Date(data.tanggal_selesai) } : {}),
        ...(data.durasi_menit !== undefined ? { durasi_menit: data.durasi_menit } : {}),
        ...(data.toleransi_terlambat_menit !== undefined ? { toleransi_terlambat_menit: data.toleransi_terlambat_menit } : {}),
        ...(data.target_kelas_ids ? { target_kelas_ids: data.target_kelas_ids } : {}),
        ...(data.setting_keamanan ? { setting_keamanan: data.setting_keamanan } : {}),
        ...(data.status ? { status: data.status } : {}),
      },
    });
  }

  /**
   * Generate token baru untuk jadwal yang aktif
   */
  static async regenerateToken(tenantId: string, id: string) {
    await this.getById(tenantId, id);
    const newToken = this.generateToken();

    await prisma.cbtJadwalUjian.update({
      where: { id },
      data: { token_ujian: newToken },
    });

    // Perbarui token di Redis jika sesi aktif
    const redis = getRedisConnection();
    if (redis) {
      await redis.set(`cbt:${tenantId}:token:${newToken}`, id, 'EX', 86400).catch(() => null);
    }

    return { token_ujian: newToken };
  }

  /**
   * Mengaktifkan Sesi Ujian & Pre-heating Redis Cache Bundle
   * Memastikan 3000 user dapat mengambil bundle soal secara instan tanpa query database berulang.
   */
  static async activateJadwal(tenantId: string, id: string) {
    const jadwal = await this.getById(tenantId, id);

    // Ambil butir soal lengkap
    const soalList = await prisma.cbtSoal.findMany({
      where: { tenant_id: tenantId, bank_soal_id: jadwal.bank_soal_id },
      orderBy: { nomor_urut: 'asc' },
      select: {
        id: true,
        nomor_urut: true,
        jenis_soal: true,
        konten_pertanyaan: true,
        gambar_stimulus_url: true,
        bobot: true,
        opsi_jawaban_json: true,
        // Kunci jawaban TIDAK dikirimkan ke client/redis bundle publik demi keamanan
      },
    });

    // Simpan bundle terkompilasi ke Redis
    const redis = getRedisConnection();
    if (redis) {
      const bundlePayload = JSON.stringify({
        jadwal_id: jadwal.id,
        nama_sesi: jadwal.nama_sesi,
        durasi_menit: jadwal.durasi_menit,
        setting_keamanan: jadwal.setting_keamanan,
        total_soal: soalList.length,
        soal: soalList,
      });

      // TTL 24 jam (86400 detik)
      await redis.set(`cbt:${tenantId}:bundle:${jadwal.id}`, bundlePayload, 'EX', 86400).catch((err: any) => {
        console.warn('[CBT Redis Pre-heat Warn]', err.message);
      });

      // Mapping token -> jadwal_id untuk verifikasi cepat
      await redis.set(`cbt:${tenantId}:token:${jadwal.token_ujian}`, jadwal.id, 'EX', 86400).catch(() => null);
    }

    // Update status di PostgreSQL
    return prisma.cbtJadwalUjian.update({
      where: { id },
      data: { status: 'ACTIVE' },
    });
  }

  /**
   * Pause Jadwal Ujian
   */
  static async pauseJadwal(tenantId: string, id: string) {
    await this.getById(tenantId, id);

    return prisma.cbtJadwalUjian.update({
      where: { id },
      data: { status: 'PAUSED' },
    });
  }

  /**
   * Menyelesaikan Jadwal Ujian & Menjalankan Auto-Transfer ke e-Rapor jika diaktifkan
   */
  static async completeJadwal(tenantId: string, id: string) {
    const jadwal = await this.getById(tenantId, id);

    const redis = getRedisConnection();
    if (redis) {
      await redis.del(`cbt:${tenantId}:bundle:${jadwal.id}`).catch(() => null);
      await redis.del(`cbt:${tenantId}:token:${jadwal.token_ujian}`).catch(() => null);
    }

    const updated = await prisma.cbtJadwalUjian.update({
      where: { id },
      data: { status: 'COMPLETED' },
    });

    // Jaring pengaman: jika auto_transfer_rapor aktif, sinkronkan seluruh peserta FINISHED ke slot tujuan
    const cfg = (jadwal.setting_keamanan as any) || {};
    if (cfg.auto_transfer_rapor && cfg.target_rapor_slot) {
      await this.transferToRapor(tenantId, id, {
        target_slot: cfg.target_rapor_slot,
        tahun_pelajaran_id: jadwal.tahun_pelajaran_id,
        semester_id: jadwal.semester_id,
        mapel_id: jadwal.BankSoal.mapel_id,
        overwrite_existing: true,
        round_integer: true,
      }).catch((err: any) => {
        console.warn('[CBT Complete Jadwal Auto-Transfer Warn]', err?.message);
      });
    }

    return updated;
  }

  /**
   * Auto-Transfer Nilai 1 Siswa secara Real-Time saat siswa menyelesaikan ujian (Submit Final)
   */
  static async autoTransferSingleStudentIfEnabled(
    tenantId: string,
    jadwalId: string,
    siswaId: string,
    rawScore: number
  ) {
    const jadwal = await prisma.cbtJadwalUjian.findFirst({
      where: { id: jadwalId, tenant_id: tenantId },
      include: {
        BankSoal: { select: { mapel_id: true } },
        TahunPelajaran: { select: { id: true, tahun: true } },
        Semester: { select: { id: true, nama_semester: true, tahun_pelajaran_id: true } },
      },
    });

    if (!jadwal) return null;

    const cfg = (jadwal.setting_keamanan as any) || {};
    const targetSlot = cfg.target_rapor_slot as
      | 'sumatif_1'
      | 'sumatif_2'
      | 'sumatif_3'
      | 'sumatif_akhir'
      | undefined;

    if (!cfg.auto_transfer_rapor || !targetSlot) {
      return null;
    }

    const effectiveMapelId = jadwal.BankSoal.mapel_id;
    let effectiveTpId = jadwal.tahun_pelajaran_id;
    let effectiveSemId = jadwal.semester_id;

    // Pastikan semester selaras dengan tahun pelajaran
    if (jadwal.Semester && jadwal.Semester.tahun_pelajaran_id !== effectiveTpId) {
      const matchedSem = await prisma.semester.findFirst({
        where: {
          tenant_id: tenantId,
          tahun_pelajaran_id: effectiveTpId,
          nama_semester: { equals: jadwal.Semester.nama_semester, mode: 'insensitive' },
        },
      });
      if (matchedSem) {
        effectiveSemId = matchedSem.id;
      }
    }

    const siswa = await prisma.siswa.findFirst({
      where: { id: siswaId, tenant_id: tenantId },
      select: { id: true, kelas_id: true },
    });

    if (!siswa) return null;

    let saId: string | null = null;
    if (siswa.kelas_id) {
      const sa = await prisma.siswaAkademik.upsert({
        where: {
          siswa_id_tahun_pelajaran_id_semester_id: {
            siswa_id: siswaId,
            tahun_pelajaran_id: effectiveTpId,
            semester_id: effectiveSemId,
          },
        },
        create: {
          siswa_id: siswaId,
          kelas_id: siswa.kelas_id,
          tahun_pelajaran_id: effectiveTpId,
          semester_id: effectiveSemId,
          status: 'AKTIF',
        },
        update: {
          kelas_id: siswa.kelas_id,
          status: 'AKTIF',
        },
        select: { id: true },
      });
      saId = sa.id;
    }

    const [tpSumberCfg, globalSumberCfg, existing] = await Promise.all([
      prisma.config.findFirst({
        where: { tenant_id: tenantId, key: `RAPOR_SUMBER_NILAI_${effectiveTpId}` },
      }),
      prisma.config.findFirst({
        where: { tenant_id: tenantId, key: 'RAPOR_SUMBER_NILAI' },
      }),
      prisma.nilaiSiswa.findUnique({
        where: {
          siswa_id_mapel_id_tahun_pelajaran_id_semester_id: {
            siswa_id: siswaId,
            mapel_id: effectiveMapelId,
            tahun_pelajaran_id: effectiveTpId,
            semester_id: effectiveSemId,
          },
        },
      }),
    ]);

    const startYear = parseInt((jadwal.TahunPelajaran?.tahun || '').split('/')[0].trim(), 10) || 2024;
    const defaultMode = startYear <= 2023 ? 'MURNI_CP_MANUAL' : 'FORMULA_SUMATIF';
    const activeSumberNilai = (tpSumberCfg?.value || globalSumberCfg?.value || defaultMode) as
      | 'FORMULA_SUMATIF'
      | 'MURNI_CP_MANUAL';

    const cbtScore = Math.round(Number(rawScore ?? 0));

    const sum1 = targetSlot === 'sumatif_1' ? cbtScore : (existing?.sumatif_1 ?? null);
    const sum2 = targetSlot === 'sumatif_2' ? cbtScore : (existing?.sumatif_2 ?? null);
    const sum3 = targetSlot === 'sumatif_3' ? cbtScore : (existing?.sumatif_3 ?? null);
    const nilaiAkhir =
      targetSlot === 'sumatif_akhir' ? cbtScore : (existing?.nilai_akhir_sumatif ?? null);

    const sumatifList = [sum1, sum2, sum3].filter(
      (v): v is number => v !== undefined && v !== null && !isNaN(v)
    );

    let rataRataSumatif: number | null = null;
    if (sumatifList.length > 0) {
      const total = sumatifList.reduce((acc, curr) => acc + curr, 0);
      rataRataSumatif = Number((total / sumatifList.length).toFixed(2));
    }

    let nilaiRaporFinal: number | null = null;
    if (activeSumberNilai === 'MURNI_CP_MANUAL') {
      nilaiRaporFinal = existing?.nilai_rapor_final ?? nilaiAkhir ?? rataRataSumatif ?? cbtScore;
    } else {
      if (rataRataSumatif !== null && nilaiAkhir !== null) {
        nilaiRaporFinal = Number(((rataRataSumatif + nilaiAkhir) / 2).toFixed(2));
      } else if (nilaiAkhir !== null) {
        nilaiRaporFinal = nilaiAkhir;
      } else if (rataRataSumatif !== null) {
        nilaiRaporFinal = rataRataSumatif;
      }
    }

    const mainNilai = nilaiRaporFinal ?? cbtScore;

    await prisma.nilaiSiswa.upsert({
      where: {
        siswa_id_mapel_id_tahun_pelajaran_id_semester_id: {
          siswa_id: siswaId,
          mapel_id: effectiveMapelId,
          tahun_pelajaran_id: effectiveTpId,
          semester_id: effectiveSemId,
        },
      },
      update: {
        sumatif_1: sum1,
        sumatif_2: sum2,
        sumatif_3: sum3,
        rata_rata_sumatif: rataRataSumatif,
        nilai_akhir_sumatif: nilaiAkhir,
        nilai_rapor_final: nilaiRaporFinal,
        nilai: mainNilai,
        ...(saId ? { siswa_akademik_id: saId } : {}),
      },
      create: {
        tenant_id: tenantId,
        siswa_id: siswaId,
        siswa_akademik_id: saId,
        mapel_id: effectiveMapelId,
        tahun_pelajaran_id: effectiveTpId,
        semester_id: effectiveSemId,
        sumatif_1: sum1,
        sumatif_2: sum2,
        sumatif_3: sum3,
        rata_rata_sumatif: rataRataSumatif,
        nilai_akhir_sumatif: nilaiAkhir,
        nilai_rapor_final: nilaiRaporFinal,
        nilai: mainNilai,
      },
    });

    void cacheInvalidationService.invalidateRaporCache(tenantId);

    return {
      auto_transferred: true,
      target_slot: targetSlot,
      score: cbtScore,
    };
  }

  /**
   * Monitoring Peserta Ujian (Proctor Live View)
   */
  static async getPesertaList(tenantId: string, jadwalId: string, query: any) {
    const where: Prisma.CbtPesertaUjianWhereInput = {
      tenant_id: tenantId,
      jadwal_ujian_id: jadwalId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.search
        ? {
            Siswa: {
              OR: [
                { nama_siswa: { contains: query.search, mode: 'insensitive' } },
                { nis: { contains: query.search, mode: 'insensitive' } },
                { nisn: { contains: query.search, mode: 'insensitive' } },
              ],
            },
          }
        : {}),
    };

    const items = await prisma.cbtPesertaUjian.findMany({
      where,
      orderBy: { created_at: 'desc' },
      include: {
        Siswa: {
          select: {
            id: true,
            nama_siswa: true,
            nis: true,
            nisn: true,
            kelas_id: true,
            Kelas: { select: { id: true, nama_kelas: true } },
          },
        },
      },
    });

    return items.map((item) => ({
      ...item,
      Siswa: item.Siswa
        ? {
            ...item.Siswa,
            nama_lengkap: item.Siswa.nama_siswa,
          }
        : undefined,
    }));
  }

  /**
   * Reset Sesi Peserta (Jika terjadi mati listrik, kendala laptop rusak, dsb.)
   */
  static async resetPeserta(tenantId: string, jadwalId: string, siswaId: string) {
    const peserta = await prisma.cbtPesertaUjian.findFirst({
      where: { tenant_id: tenantId, jadwal_ujian_id: jadwalId, siswa_id: siswaId },
    });

    if (!peserta) {
      throw new Error('Data peserta tidak ditemukan');
    }

    const redis = getRedisConnection();
    if (redis) {
      // Hapus session lock di Redis agar siswa bisa login kembali
      await redis.del(`cbt:${tenantId}:session:${siswaId}`).catch(() => null);
    }

    return prisma.cbtPesertaUjian.update({
      where: { id: peserta.id },
      data: {
        status: 'STANDBY',
        status_sinkron: 'IDLE',
      },
    });
  }

  /**
   * Transfer Nilai Hasil Ujian CBT ke Lembar Input Nilai e-Rapor (Hak Prerogatif Guru)
   * Mendukung pemilihan slot (sumatif_1, sumatif_2, sumatif_3, sumatif_akhir),
   * Tahun Pelajaran, Semester, Mapel, dan filter Kelas sasaran.
   */
  static async transferToRapor(
    tenantId: string,
    jadwalId: string,
    payload: {
      target_slot: 'sumatif_1' | 'sumatif_2' | 'sumatif_3' | 'sumatif_akhir';
      tahun_pelajaran_id: string;
      semester_id: string;
      mapel_id?: string;
      kelas_ids?: string[];
      overwrite_existing?: boolean;
      round_integer?: boolean;
    }
  ) {
    const jadwal = await this.getById(tenantId, jadwalId);
    const effectiveMapelId = payload.mapel_id || jadwal.BankSoal.mapel_id;
    const overwrite = payload.overwrite_existing ?? true;
    const roundInt = payload.round_integer ?? true;

    // Validasi Tahun Pelajaran & Semester milik tenant
    const [tp, rawSem] = await Promise.all([
      prisma.tahunPelajaran.findFirst({
        where: { id: payload.tahun_pelajaran_id, tenant_id: tenantId },
      }),
      prisma.semester.findFirst({
        where: { id: payload.semester_id, tenant_id: tenantId },
      }),
    ]);

    if (!tp) {
      throw new Error('Tahun Pelajaran tujuan tidak ditemukan.');
    }
    if (!rawSem) {
      throw new Error('Semester tujuan tidak ditemukan.');
    }

    // Pastikan Semester sinkron dengan Tahun Pelajaran tujuan (Cascading Academic Context)
    let sem = rawSem;
    if (rawSem.tahun_pelajaran_id !== tp.id) {
      const matchedSem = await prisma.semester.findFirst({
        where: {
          tenant_id: tenantId,
          tahun_pelajaran_id: tp.id,
          nama_semester: { equals: rawSem.nama_semester, mode: 'insensitive' },
        },
      });
      const fallbackSem =
        matchedSem ||
        (await prisma.semester.findFirst({
          where: { tenant_id: tenantId, tahun_pelajaran_id: tp.id },
          orderBy: { is_active: 'desc' },
        }));
      if (fallbackSem) {
        sem = fallbackSem;
      }
    }
    const effectiveTpId = tp.id;
    const effectiveSemId = sem.id;

    // Ambil seluruh peserta yang telah menyelesaikan ujian (FINISHED)
    const pesertaList = await prisma.cbtPesertaUjian.findMany({
      where: {
        tenant_id: tenantId,
        jadwal_ujian_id: jadwalId,
        status: 'FINISHED',
        ...(payload.kelas_ids && payload.kelas_ids.length > 0
          ? { Siswa: { kelas_id: { in: payload.kelas_ids } } }
          : {}),
      },
      include: {
        Siswa: {
          select: {
            id: true,
            nama_siswa: true,
            kelas_id: true,
          },
        },
      },
    });

    if (pesertaList.length === 0) {
      throw new Error('Belum ada peserta berstatus Selesai (FINISHED) pada rombel yang dipilih untuk ditransfer.');
    }

    // Cek otoritas pengaturan sumber nilai rapor (MURNI_CP_MANUAL vs FORMULA_SUMATIF)
    const [tpSumberCfg, globalSumberCfg] = await Promise.all([
      prisma.config.findFirst({
        where: { tenant_id: tenantId, key: `RAPOR_SUMBER_NILAI_${effectiveTpId}` },
      }),
      prisma.config.findFirst({
        where: { tenant_id: tenantId, key: 'RAPOR_SUMBER_NILAI' },
      }),
    ]);

    const startYear = parseInt((tp.tahun || '').split('/')[0].trim(), 10) || 2024;
    const defaultMode = startYear <= 2023 ? 'MURNI_CP_MANUAL' : 'FORMULA_SUMATIF';
    const activeSumberNilai = (tpSumberCfg?.value || globalSumberCfg?.value || defaultMode) as
      | 'FORMULA_SUMATIF'
      | 'MURNI_CP_MANUAL';

    const siswaIds = pesertaList.map((p) => p.siswa_id);

    // Ambil nilai rapor yang sudah ada agar slot lain tidak tertimpa
    const existingGrades = await prisma.nilaiSiswa.findMany({
      where: {
        tenant_id: tenantId,
        mapel_id: effectiveMapelId,
        tahun_pelajaran_id: effectiveTpId,
        semester_id: effectiveSemId,
        siswa_id: { in: siswaIds },
      },
    });

    const existingMap = new Map(existingGrades.map((g) => [g.siswa_id, g]));

    // Pastikan SiswaAkademik ter-snapshot untuk periode tujuan
    const saMap = new Map<string, string>();
    const pesertaWithKelas = pesertaList.filter((p) => Boolean(p.Siswa?.kelas_id));
    if (pesertaWithKelas.length > 0) {
      const saRecords = await Promise.all(
        pesertaWithKelas.map((p) =>
          prisma.siswaAkademik.upsert({
            where: {
              siswa_id_tahun_pelajaran_id_semester_id: {
                siswa_id: p.siswa_id,
                tahun_pelajaran_id: effectiveTpId,
                semester_id: effectiveSemId,
              },
            },
            create: {
              siswa_id: p.siswa_id,
              kelas_id: p.Siswa!.kelas_id!,
              tahun_pelajaran_id: effectiveTpId,
              semester_id: effectiveSemId,
              status: 'AKTIF',
            },
            update: {
              kelas_id: p.Siswa!.kelas_id!,
              status: 'AKTIF',
            },
            select: { id: true, siswa_id: true },
          })
        )
      );
      saRecords.forEach((sa) => saMap.set(sa.siswa_id, sa.id));
    }

    const operations: Prisma.PrismaPromise<any>[] = [];
    let transferredCount = 0;
    let skippedCount = 0;

    for (const p of pesertaList) {
      const existing = existingMap.get(p.siswa_id);
      const rawScore = Number(p.nilai_akhir ?? 0);
      const cbtScore = roundInt ? Math.round(rawScore) : Math.round(rawScore * 100) / 100;

      // Cek apakah slot tujuan sudah terisi dan guru memilih tidak menimpa
      if (!overwrite && existing) {
        const currentSlotVal =
          payload.target_slot === 'sumatif_1'
            ? existing.sumatif_1
            : payload.target_slot === 'sumatif_2'
            ? existing.sumatif_2
            : payload.target_slot === 'sumatif_3'
            ? existing.sumatif_3
            : existing.nilai_akhir_sumatif;

        if (currentSlotVal !== null && currentSlotVal !== undefined) {
          skippedCount++;
          continue;
        }
      }

      const sum1 = payload.target_slot === 'sumatif_1' ? cbtScore : (existing?.sumatif_1 ?? null);
      const sum2 = payload.target_slot === 'sumatif_2' ? cbtScore : (existing?.sumatif_2 ?? null);
      const sum3 = payload.target_slot === 'sumatif_3' ? cbtScore : (existing?.sumatif_3 ?? null);
      const nilaiAkhir =
        payload.target_slot === 'sumatif_akhir' ? cbtScore : (existing?.nilai_akhir_sumatif ?? null);

      const sumatifList = [sum1, sum2, sum3].filter(
        (v): v is number => v !== undefined && v !== null && !isNaN(v)
      );

      let rataRataSumatif: number | null = null;
      if (sumatifList.length > 0) {
        const total = sumatifList.reduce((acc, curr) => acc + curr, 0);
        rataRataSumatif = Number((total / sumatifList.length).toFixed(2));
      }

      let nilaiRaporFinal: number | null = null;
      if (activeSumberNilai === 'MURNI_CP_MANUAL') {
        nilaiRaporFinal = existing?.nilai_rapor_final ?? nilaiAkhir ?? rataRataSumatif ?? cbtScore;
      } else {
        if (rataRataSumatif !== null && nilaiAkhir !== null) {
          nilaiRaporFinal = Number(((rataRataSumatif + nilaiAkhir) / 2).toFixed(2));
        } else if (nilaiAkhir !== null) {
          nilaiRaporFinal = nilaiAkhir;
        } else if (rataRataSumatif !== null) {
          nilaiRaporFinal = rataRataSumatif;
        }
      }

      const mainNilai = nilaiRaporFinal ?? cbtScore;
      const saId = saMap.get(p.siswa_id) || null;

      operations.push(
        prisma.nilaiSiswa.upsert({
          where: {
            siswa_id_mapel_id_tahun_pelajaran_id_semester_id: {
              siswa_id: p.siswa_id,
              mapel_id: effectiveMapelId,
              tahun_pelajaran_id: effectiveTpId,
              semester_id: effectiveSemId,
            },
          },
          update: {
            sumatif_1: sum1,
            sumatif_2: sum2,
            sumatif_3: sum3,
            rata_rata_sumatif: rataRataSumatif,
            nilai_akhir_sumatif: nilaiAkhir,
            nilai_rapor_final: nilaiRaporFinal,
            nilai: mainNilai,
            ...(saId ? { siswa_akademik_id: saId } : {}),
          },
          create: {
            tenant_id: tenantId,
            siswa_id: p.siswa_id,
            siswa_akademik_id: saId,
            mapel_id: effectiveMapelId,
            tahun_pelajaran_id: effectiveTpId,
            semester_id: effectiveSemId,
            sumatif_1: sum1,
            sumatif_2: sum2,
            sumatif_3: sum3,
            rata_rata_sumatif: rataRataSumatif,
            nilai_akhir_sumatif: nilaiAkhir,
            nilai_rapor_final: nilaiRaporFinal,
            nilai: mainNilai,
          },
        })
      );

      transferredCount++;
    }

    if (operations.length > 0) {
      await prisma.$transaction(operations);
      void cacheInvalidationService.invalidateRaporCache(tenantId);
    }

    return {
      transferred_count: transferredCount,
      skipped_count: skippedCount,
      total_finished: pesertaList.length,
      target_slot: payload.target_slot,
      mapel_id: effectiveMapelId,
      tahun_pelajaran_id: effectiveTpId,
      semester_id: effectiveSemId,
    };
  }
}
