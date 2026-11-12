import { prisma } from '@/utils/prisma';
import { Prisma } from '@prisma/client';
import { getRedisConnection } from '@/infra/redis/redisClient';
import { cacheInvalidationService } from '@/utils/cache-invalidation.service';
import { CbtSettingsService } from './cbt-settings.service';
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
    const limit = Math.min(500, Math.max(1, Number(query.limit || 10)));
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
      // Dapatkan penugasan kelas dan mapel guru (GuruMapel, UnitPengajaran, maupun Delegasi Pelaksana)
      const [assignedGuruMapel, assignedUnits, delegatedJadwals] = await Promise.all([
        prisma.guruMapel.findMany({
          where: { tenant_id: tenantId, guru_id: query.guru_id },
          select: { mapel_id: true, kelas_id: true },
        }),
        prisma.unitPengajaran.findMany({
          where: { tenant_id: tenantId, guru_id: query.guru_id, is_active: true },
          select: { mapel_id: true, kelas_id: true },
        }),
        prisma.jadwalKBM.findMany({
          where: { tenant_id: tenantId, guru_pelaksana_id: query.guru_id },
          select: { mapel_id: true, kelas_id: true },
        }),
      ]);

      const orConditions: Prisma.CbtJadwalUjianWhereInput[] = [
        { BankSoal: { guru_id: query.guru_id } },
        { BankSoal: { Kontributor: { some: { guru_id: query.guru_id, tenant_id: tenantId } } } },
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
      ];

      const pushMapelKelasFilter = (rows: Array<{ mapel_id?: string | null; kelas_id?: string | null }>) => {
        for (const row of rows) {
          if (row.mapel_id && row.kelas_id) {
            orConditions.push({
              BankSoal: { mapel_id: row.mapel_id },
              target_kelas_ids: { array_contains: [row.kelas_id] },
            });
          } else if (row.mapel_id) {
            orConditions.push({
              BankSoal: { mapel_id: row.mapel_id },
            });
          }
        }
      };

      pushMapelKelasFilter(assignedGuruMapel);
      pushMapelKelasFilter(assignedUnits);
      pushMapelKelasFilter(delegatedJadwals);

      andConditions.push({
        OR: orConditions,
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

    const [total, rawItems] = await Promise.all([
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
              unit_pengajaran_id: true,
              tahun_pelajaran_id: true,
              semester_id: true,
              Mapel: { select: { id: true, nama_mapel: true } },
              Guru: { select: { id: true, nama_guru: true, nip: true } },
              UnitPengajaran: {
                select: {
                  id: true,
                  nama_unit: true,
                  guru_id: true,
                  Guru: { select: { id: true, nama_guru: true } },
                },
              },
              Kontributor: {
                select: { guru_id: true, unit_pengajaran_id: true },
              },
            },
          },
          TahunPelajaran: { select: { id: true, tahun: true, is_active: true } },
          Semester: { select: { id: true, nama_semester: true, is_active: true } },
          _count: { select: { Peserta: true } },
        },
      }),
    ]);

    const mapelIds = Array.from(new Set(rawItems.map((it) => it.BankSoal?.mapel_id).filter(Boolean) as string[]));
    const collabGm = mapelIds.length > 0
      ? await prisma.guruMapel.findMany({
          where: { tenant_id: tenantId, mapel_id: { in: mapelIds }, teaching_mode: 'COLLABORATION' },
          select: { mapel_id: true, tahun_pelajaran_id: true, semester_id: true },
        })
      : [];

    const items = rawItems.map((it) => {
      const bank = it.BankSoal;
      const isCollabMapel = Boolean(
        bank?.mapel_id &&
          collabGm.some(
            (gm) =>
              gm.mapel_id === bank.mapel_id &&
              (!it.tahun_pelajaran_id || gm.tahun_pelajaran_id === it.tahun_pelajaran_id)
          )
      );
      const isKuisUnit = Boolean(bank?.unit_pengajaran_id);
      const unitNama = bank?.UnitPengajaran?.nama_unit || null;
      const baseMapel = bank?.Mapel?.nama_mapel || '-';
      const isKolaborasiResmi = !isKuisUnit && isCollabMapel;
      return {
        ...it,
        is_kolaborasi: isKolaborasiResmi,
        kolaborasi_badge: isKolaborasiResmi ? 'Kolaborasi' : null,
        display_mapel: isKuisUnit && unitNama ? `${baseMapel} — ${unitNama}` : baseMapel,
        unit_nama: unitNama,
      };
    });

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
            UnitPengajaran: {
              select: {
                id: true,
                nama_unit: true,
                guru_id: true,
                target_sumatif_slot: true,
                Guru: { select: { id: true, nama_guru: true } },
              },
            },
            Kontributor: {
              select: { guru_id: true, unit_pengajaran_id: true },
            },
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
  static async create(tenantId: string, data: any, userRole?: string) {
    // 1. Guard Kunci Jadwal Guru Mandiri saat Event Massal Aktif
    const normalizedRole = (userRole || '').toUpperCase();
    if (normalizedRole === 'GURU') {
      const activeEvent = await CbtSettingsService.getActiveEvent(tenantId);
      if (activeEvent && activeEvent.lock_teacher_scheduling) {
        throw new Error(
          `Pembuatan jadwal ujian mandiri guru dikunci selama event ujian massal (${activeEvent.nama_event}) berlangsung. Silakan hubungi Panitia CBT / Bidang Kurikulum.`
        );
      }
    }

    // Pastikan bank soal valid dan memiliki butir soal
    const bankSoal = await prisma.cbtBankSoal.findFirst({
      where: { id: data.bank_soal_id, tenant_id: tenantId },
      include: { _count: { select: { Soal: true } } },
    });

    if (!bankSoal) {
      throw new Error('Bank soal tidak ditemukan');
    }
    // Catatan: Memperbolehkan penjadwalan ujian lebih awal meskipun naskah butir soal
    // masih dalam proses penyusunan oleh guru (cangkang draft bank soal).
    // Validasi kelengkapan soal ditegakkan saat siswa mulai mengerjakan ujian di test-engine.

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

    // Update status di PostgreSQL + catat waktu pengawas mengaktifkan sesi
    return prisma.cbtJadwalUjian.update({
      where: { id },
      data: {
        status: 'ACTIVE',
        waktu_diaktifkan: new Date(), // ← Toleransi keterlambatan dihitung dari sini
      },
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
   * Menghapus Jadwal Ujian / Sesi CBT beserta relasi peserta secara permanen
   */
  static async delete(tenantId: string, id: string) {
    const jadwal = await prisma.cbtJadwalUjian.findFirst({
      where: { id, tenant_id: tenantId },
      select: { id: true, bank_soal_id: true, token_ujian: true },
    });

    if (!jadwal) {
      throw new Error('Jadwal ujian tidak ditemukan');
    }

    const redis = getRedisConnection();
    if (redis) {
      await redis.del(`cbt:${tenantId}:bundle:${jadwal.id}`).catch(() => null);
      if (jadwal.token_ujian) {
        await redis.del(`cbt:${tenantId}:token:${jadwal.token_ujian}`).catch(() => null);
      }
    }

    // Cascade delete relasi peserta otomatis
    await prisma.cbtPesertaUjian.deleteMany({
      where: { tenant_id: tenantId, jadwal_ujian_id: id },
    });

    // Cascade delete jadwal
    await prisma.cbtJadwalUjian.delete({
      where: { id },
    });

    // Bersihkan cangkang draft bank soal kosong jika tidak ada jadwal lain dan belum berisi butir soal
    if (jadwal.bank_soal_id) {
      const emptyOrphaned = await prisma.cbtBankSoal.findFirst({
        where: {
          tenant_id: tenantId,
          id: jadwal.bank_soal_id,
          jumlah_soal: 0,
          Soal: { none: {} },
          JadwalUjian: { none: {} },
        },
        select: { id: true },
      });

      if (emptyOrphaned) {
        await prisma.cbtBankSoalKontributor.deleteMany({
          where: { bank_soal_id: emptyOrphaned.id },
        });
        await prisma.cbtBankSoal.delete({
          where: { id: emptyOrphaned.id },
        });
      }
    }

    return { id, message: 'Jadwal ujian berhasil dihapus permanen' };
  }

  /**
   * Menghapus massal Jadwal Ujian (Misal: reset jadwal event untuk diterbitkan ulang dari nol)
   */
  static async bulkDelete(
    tenantId: string,
    params: {
      ids?: string[];
      event_id?: string;
      tahun_pelajaran_id?: string;
      semester_id?: string;
      target_tingkat?: number[];
      force?: boolean;
    }
  ) {
    const whereClause: any = { tenant_id: tenantId };

    if (Array.isArray(params.ids) && params.ids.length > 0) {
      whereClause.id = { in: params.ids };
    } else {
      if (params.tahun_pelajaran_id) whereClause.tahun_pelajaran_id = params.tahun_pelajaran_id;
      if (params.semester_id) whereClause.semester_id = params.semester_id;
    }

    const schedules = await prisma.cbtJadwalUjian.findMany({
      where: whereClause,
      select: {
        id: true,
        bank_soal_id: true,
        token_ujian: true,
        status: true,
        setting_keamanan: true,
      },
    });

    // Saring jadwal yang sesuai event (jika disimpan di setting_keamanan)
    const targetSchedules = schedules.filter((s) => {
      if (params.event_id) {
        const schedEventId = (s.setting_keamanan as any)?.event_id;
        if (schedEventId && schedEventId !== params.event_id) return false;
      }
      // Jangan hapus jadwal yang sudah selesai (COMPLETED) atau aktif kecuali diminta paksa
      if (!params.force && (s.status === 'COMPLETED' || s.status === 'ACTIVE')) {
        return false;
      }
      return true;
    });

    if (targetSchedules.length === 0) {
      return { deleted_count: 0, message: 'Tidak ada jadwal ujian berstatus draft yang dapat dihapus.' };
    }

    const targetIds = targetSchedules.map((s) => s.id);
    const candidateBankIds = Array.from(
      new Set(
        targetSchedules
          .map((s) => s.bank_soal_id)
          .filter((id): id is string => Boolean(id))
      )
    );

    const redis = getRedisConnection();

    if (redis) {
      for (const s of targetSchedules) {
        await redis.del(`cbt:${tenantId}:bundle:${s.id}`).catch(() => null);
        if (s.token_ujian) {
          await redis.del(`cbt:${tenantId}:token:${s.token_ujian}`).catch(() => null);
        }
      }
    }

    // Cascade delete peserta jika ada
    await prisma.cbtPesertaUjian.deleteMany({
      where: {
        tenant_id: tenantId,
        jadwal_ujian_id: { in: targetIds },
      },
    });

    // Hapus jadwal
    const deleteRes = await prisma.cbtJadwalUjian.deleteMany({
      where: {
        tenant_id: tenantId,
        id: { in: targetIds },
      },
    });

    // Cek dan bersihkan cangkang draft Bank Soal kosong yang tidak memiliki butir soal (jumlah_soal === 0 & Soal kosong)
    // dan sudah tidak digunakan oleh jadwal ujian manapun lagi (JadwalUjian kosong).
    let cleanedEmptyBanksCount = 0;
    if (candidateBankIds.length > 0) {
      const emptyOrphanedBanks = await prisma.cbtBankSoal.findMany({
        where: {
          tenant_id: tenantId,
          id: { in: candidateBankIds },
          jumlah_soal: 0,
          Soal: { none: {} },
          JadwalUjian: { none: {} },
        },
        select: { id: true },
      });

      if (emptyOrphanedBanks.length > 0) {
        const bankIdsToDelete = emptyOrphanedBanks.map((b) => b.id);

        await prisma.cbtBankSoalKontributor.deleteMany({
          where: {
            bank_soal_id: { in: bankIdsToDelete },
          },
        });

        const delBankRes = await prisma.cbtBankSoal.deleteMany({
          where: {
            tenant_id: tenantId,
            id: { in: bankIdsToDelete },
          },
        });
        cleanedEmptyBanksCount = delBankRes.count;
      }
    }

    const bankCleanupMsg =
      cleanedEmptyBanksCount > 0
        ? ` serta membersihkan ${cleanedEmptyBanksCount} cangkang draft Bank Soal kosong otomatis.`
        : '.';

    return {
      deleted_count: deleteRes.count,
      cleaned_empty_banks_count: cleanedEmptyBanksCount,
      message: `Berhasil menghapus ${deleteRes.count} sesi jadwal ujian${bankCleanupMsg} Matriks kini bersih dan siap diterbitkan ulang.`,
    };
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
      | 'sumatif_4'
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
    const sum4 = targetSlot === 'sumatif_4' ? cbtScore : (existing?.sumatif_4 ?? null);
    const nilaiAkhir =
      targetSlot === 'sumatif_akhir' ? cbtScore : (existing?.nilai_akhir_sumatif ?? null);

    const sumatifList = [sum1, sum2, sum3, sum4].filter(
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
        sumatif_4: sum4,
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
        sumatif_4: sum4,
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
   * Monitoring Peserta Ujian (Proctor Live View) dengan Kalkulasi Waktu Dinamis & Auto-Finalize
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

    const [items, jadwal] = await Promise.all([
      prisma.cbtPesertaUjian.findMany({
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
      }),
      prisma.cbtJadwalUjian.findFirst({
        where: { id: jadwalId, tenant_id: tenantId },
        select: {
          bank_soal_id: true,
          durasi_menit: true,
          tanggal_selesai: true,
          setting_keamanan: true,
          target_kelas_ids: true,
          tanggal_mulai: true,
        },
      }),
    ]);

    const now = new Date();
    const durasiTotalDetik = (jadwal?.durasi_menit || 90) * 60;
    const tanggalSelesai = jadwal?.tanggal_selesai ? new Date(jadwal.tanggal_selesai) : null;
    const secondsUntilScheduleEnd = tanggalSelesai
      ? Math.max(0, Math.floor((tanggalSelesai.getTime() - now.getTime()) / 1000))
      : 999999;
    const allowFloating = Boolean((jadwal?.setting_keamanan as any)?.floating_duration);

    // Ambil data sesi Redis secara batch (O(1) Redis Pipeline) untuk peserta yang sedang mengerjakan
    // Memungkinkan pengawas ruang melihat jumlah butir soal terjawab secara langsung (live-sync)
    const redis = getRedisConnection();
    const inProgressSiswaIds = items.filter((it) => it.status === 'IN_PROGRESS').map((it) => it.siswa_id);
    const redisSessionMap = new Map<string, { jawaban: any[]; last_sync: number }>();

    if (redis && inProgressSiswaIds.length > 0) {
      try {
        const pipeline = redis.pipeline();
        inProgressSiswaIds.forEach((sId) => {
          pipeline.hgetall(`cbt:${tenantId}:session:${sId}`);
        });
        const results = await pipeline.exec();
        if (Array.isArray(results)) {
          results.forEach((res: any, idx: number) => {
            const err = res[0];
            const data = res[1];
            if (!err && data && data.jawaban) {
              try {
                const parsedAnswers = JSON.parse(data.jawaban);
                const sId = inProgressSiswaIds[idx];
                redisSessionMap.set(sId, {
                  jawaban: parsedAnswers,
                  last_sync: Number(data.last_sync) || 0,
                });
              } catch {}
            }
          });
        }
      } catch {}
    }

    // Ambil struktur butir soal per UnitPengajaran (untuk breakdown nilai per unit pada ujian kolaborasi)
    const bankSoalQuestions = jadwal?.bank_soal_id
      ? await prisma.cbtSoal.findMany({
          where: {
            tenant_id: tenantId,
            bank_soal_id: jadwal.bank_soal_id,
            unit_pengajaran_id: { not: null },
          },
          select: {
            id: true,
            bobot: true,
            kunci_jawaban: true,
            unit_pengajaran_id: true,
            UnitPengajaran: {
              select: {
                id: true,
                nama_unit: true,
                guru_id: true,
                Guru: { select: { nama_guru: true } },
              },
            },
          },
        })
      : [];

    const hasUnitTaggedQuestions = bankSoalQuestions.length > 0;
    const soalMetaById = new Map(
      bankSoalQuestions.map((q) => [
        q.id,
        {
          unitId: q.unit_pengajaran_id!,
          unitName: q.UnitPengajaran?.nama_unit || 'Unit',
          guruName: q.UnitPengajaran?.Guru?.nama_guru || null,
          bobot: Number(q.bobot) || 1,
          kunci: String(q.kunci_jawaban || '').trim().toUpperCase(),
        },
      ])
    );

    const processedItems = await Promise.all(
      items.map(async (item) => {
        let dynamicSisaWaktu = item.sisa_waktu_detik;
        let durasiPengerjaanDetik = 0;

        if (item.waktu_mulai) {
          const startMs = new Date(item.waktu_mulai).getTime();
          const endMs = item.waktu_selesai ? new Date(item.waktu_selesai).getTime() : now.getTime();
          durasiPengerjaanDetik = Math.max(0, Math.floor((endMs - startMs) / 1000));
        }

        if (item.status === 'IN_PROGRESS' && item.waktu_mulai) {
          const elapsed = Math.floor((now.getTime() - new Date(item.waktu_mulai).getTime()) / 1000);
          const remainingByDuration = Math.max(0, durasiTotalDetik - elapsed);
          dynamicSisaWaktu = allowFloating
            ? remainingByDuration
            : Math.min(remainingByDuration, secondsUntilScheduleEnd);

          // Auto-Finalize jika waktu siswa sudah habis di server
          if (dynamicSisaWaktu <= 0) {
            await prisma.cbtPesertaUjian.update({
              where: { id: item.id },
              data: { status: 'FINISHED', sisa_waktu_detik: 0, waktu_selesai: now },
            });
            item.status = 'FINISHED';
            dynamicSisaWaktu = 0;
            item.waktu_selesai = now;
          }
        }

        let effectiveJawabanJson = item.jawaban_json;
        let liveStatusSinkron = item.status_sinkron;
        let lastSyncTimestamp: number | null = null;

        if (item.status === 'IN_PROGRESS' && redisSessionMap.has(item.siswa_id)) {
          const rSession = redisSessionMap.get(item.siswa_id)!;
          effectiveJawabanJson = rSession.jawaban;
          liveStatusSinkron = 'SYNCED';
          lastSyncTimestamp = rSession.last_sync;
        }

        // Hitung breakdown skor per UnitPengajaran (khusus ujian kolaborasi dengan soal tagged unit)
        let unitScores: Array<{
          unit_pengajaran_id: string;
          nama_unit: string;
          guru_nama: string | null;
          benar: number;
          total_soal: number;
          bobot_diperoleh: number;
          bobot_total: number;
          skor: number;
        }> | undefined = undefined;

        if (hasUnitTaggedQuestions) {
          const answerMap = new Map<string, string>();
          if (Array.isArray(effectiveJawabanJson)) {
            for (const ans of effectiveJawabanJson as any[]) {
              if (ans?.soal_id) {
                answerMap.set(ans.soal_id, String(ans.jawaban_siswa || '').trim().toUpperCase());
              }
            }
          }

          const agg = new Map<
            string,
            { nama_unit: string; guru_nama: string | null; benar: number; total_soal: number; bobot_diperoleh: number; bobot_total: number }
          >();

          for (const [soalId, meta] of soalMetaById.entries()) {
            const bucket = agg.get(meta.unitId) || {
              nama_unit: meta.unitName,
              guru_nama: meta.guruName,
              benar: 0,
              total_soal: 0,
              bobot_diperoleh: 0,
              bobot_total: 0,
            };
            bucket.total_soal += 1;
            bucket.bobot_total += meta.bobot;
            const studentAns = answerMap.get(soalId) || '';
            if (studentAns && studentAns === meta.kunci) {
              bucket.benar += 1;
              bucket.bobot_diperoleh += meta.bobot;
            }
            agg.set(meta.unitId, bucket);
          }

          unitScores = Array.from(agg.entries()).map(([unitId, b]) => ({
            unit_pengajaran_id: unitId,
            nama_unit: b.nama_unit,
            guru_nama: b.guru_nama,
            benar: b.benar,
            total_soal: b.total_soal,
            bobot_diperoleh: Number(b.bobot_diperoleh.toFixed(2)),
            bobot_total: Number(b.bobot_total.toFixed(2)),
            skor: b.bobot_total > 0 ? Number(((b.bobot_diperoleh / b.bobot_total) * 100).toFixed(2)) : 0,
          }));
        }

        return {
          ...item,
          sisa_waktu_detik: dynamicSisaWaktu,
          durasi_pengerjaan_detik: durasiPengerjaanDetik,
          status_sinkron: liveStatusSinkron,
          last_sync_timestamp: lastSyncTimestamp,
          jawaban_json: effectiveJawabanJson,
          ...(unitScores ? { unit_scores: unitScores } : {}),
          Siswa: item.Siswa
            ? {
                ...item.Siswa,
                nama_lengkap: item.Siswa.nama_siswa,
              }
            : undefined,
        };
      })
    );

    // ── PRE-POPULASI SISWA STANDBY (BELUM MASUK UJIAN) ──
    // Menampilkan seluruh siswa terdaftar pada kelas/sesi agar Meja Pengawas & Cetak Berita Acara/Daftar Hadir
    // tidak kosong melompong (0 siswa) sebelum siswa memasukkan token.
    const targetClassIds: string[] = Array.isArray(jadwal?.target_kelas_ids)
      ? (jadwal.target_kelas_ids as string[])
      : [];
    const targetSiswaIds: string[] = Array.isArray((jadwal?.setting_keamanan as any)?.target_siswa_ids)
      ? (jadwal?.setting_keamanan as any).target_siswa_ids
      : [];

    let enrolledStudents: any[] = [];
    if (targetSiswaIds.length > 0) {
      enrolledStudents = await prisma.siswa.findMany({
        where: {
          tenant_id: tenantId,
          id: { in: targetSiswaIds },
          status: 'AKTIF',
        },
        select: {
          id: true,
          nama_siswa: true,
          nis: true,
          nisn: true,
          kelas_id: true,
          Kelas: { select: { id: true, nama_kelas: true } },
        },
        orderBy: { nama_siswa: 'asc' },
      });
    } else if (targetClassIds.length > 0) {
      enrolledStudents = await prisma.siswa.findMany({
        where: {
          tenant_id: tenantId,
          kelas_id: { in: targetClassIds },
          status: 'AKTIF',
        },
        select: {
          id: true,
          nama_siswa: true,
          nis: true,
          nisn: true,
          kelas_id: true,
          Kelas: { select: { id: true, nama_kelas: true } },
        },
        orderBy: { nama_siswa: 'asc' },
      });
    }

    if (query?.search && typeof query.search === 'string' && query.search.trim()) {
      const q = query.search.trim().toLowerCase();
      enrolledStudents = enrolledStudents.filter(
        (s) =>
          (s.nama_siswa && s.nama_siswa.toLowerCase().includes(q)) ||
          (s.nis && s.nis.toLowerCase().includes(q)) ||
          (s.nisn && s.nisn.toLowerCase().includes(q))
      );
    }

    const existingSiswaIds = new Set(processedItems.map((it) => it.siswa_id));
    const standbyItems = enrolledStudents
      .filter((s) => !existingSiswaIds.has(s.id))
      .map((s) => ({
        id: `standby-${s.id}`,
        tenant_id: tenantId,
        jadwal_ujian_id: jadwalId,
        siswa_id: s.id,
        token_masuk: '-',
        waktu_mulai: null,
        waktu_selesai: null,
        sisa_waktu_detik: durasiTotalDetik,
        status: 'STANDBY' as const,
        status_sinkron: 'IDLE',
        jawaban_json: null,
        jumlah_benar: 0,
        jumlah_salah: 0,
        nilai_akhir: 0,
        log_pelanggaran_json: null,
        metadata_perangkat: null,
        created_at: jadwal?.tanggal_mulai || now,
        updated_at: jadwal?.tanggal_mulai || now,
        durasi_pengerjaan_detik: 0,
        Siswa: {
          id: s.id,
          nama_siswa: s.nama_siswa,
          nama_lengkap: s.nama_siswa,
          nis: s.nis,
          nisn: s.nisn,
          kelas_id: s.kelas_id,
          Kelas: s.Kelas,
        },
      }));

    const shouldIncludeStandby = !query?.status || query.status === 'ALL' || query.status === 'STANDBY';
    const combined = shouldIncludeStandby ? [...processedItems, ...standbyItems] : processedItems;

    return combined;
  }

  /**
   * Reset Sesi Peserta (Jika terjadi mati listrik, kendala laptop rusak, dsb.)
   */
  static async resetPeserta(tenantId: string, jadwalId: string, siswaId: string, mode?: 'reconnect' | 'retake') {
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

    // Berikan dispensasi keterlambatan otomatis pada setting_keamanan agar siswa tidak terblokir
    const jadwal = await prisma.cbtJadwalUjian.findFirst({
      where: { id: jadwalId, tenant_id: tenantId },
      select: { setting_keamanan: true },
    });
    if (jadwal) {
      const currentSetting = (jadwal.setting_keamanan as any) || {};
      const currentDispensasi = Array.isArray(currentSetting.dispensasi_terlambat_siswa_ids)
        ? currentSetting.dispensasi_terlambat_siswa_ids
        : [];
      if (!currentDispensasi.includes(siswaId)) {
        await prisma.cbtJadwalUjian.update({
          where: { id: jadwalId },
          data: {
            setting_keamanan: {
              ...currentSetting,
              dispensasi_terlambat_siswa_ids: [...currentDispensasi, siswaId],
            },
          },
        });
      }
    }

    if (mode === 'retake') {
      return prisma.cbtPesertaUjian.update({
        where: { id: peserta.id },
        data: {
          status: 'STANDBY',
          status_sinkron: 'IDLE',
          waktu_mulai: null,
          waktu_selesai: null,
          jawaban_json: [],
          jumlah_benar: 0,
          jumlah_salah: 0,
          nilai_akhir: 0,
          log_pelanggaran_json: [],
        },
      });
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
   * Beri dispensasi keterlambatan siswa oleh Pengawas
   */
  static async grantDispensasiTerlambat(tenantId: string, jadwalId: string, siswaId: string) {
    const jadwal = await prisma.cbtJadwalUjian.findFirst({
      where: { id: jadwalId, tenant_id: tenantId },
      select: { id: true, setting_keamanan: true },
    });
    if (!jadwal) throw new Error('Jadwal tidak ditemukan');

    const currentSetting = (jadwal.setting_keamanan as any) || {};
    const currentDispensasi = Array.isArray(currentSetting.dispensasi_terlambat_siswa_ids)
      ? currentSetting.dispensasi_terlambat_siswa_ids
      : [];
    if (!currentDispensasi.includes(siswaId)) {
      await prisma.cbtJadwalUjian.update({
        where: { id: jadwalId },
        data: {
          setting_keamanan: {
            ...currentSetting,
            dispensasi_terlambat_siswa_ids: [...currentDispensasi, siswaId],
          },
        },
      });
    }
    return { success: true };
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
      target_slot: 'sumatif_1' | 'sumatif_2' | 'sumatif_3' | 'sumatif_4' | 'sumatif_akhir';
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
            : payload.target_slot === 'sumatif_4'
            ? existing.sumatif_4
            : existing.nilai_akhir_sumatif;

        if (currentSlotVal !== null && currentSlotVal !== undefined) {
          skippedCount++;
          continue;
        }
      }

      const sum1 = payload.target_slot === 'sumatif_1' ? cbtScore : (existing?.sumatif_1 ?? null);
      const sum2 = payload.target_slot === 'sumatif_2' ? cbtScore : (existing?.sumatif_2 ?? null);
      const sum3 = payload.target_slot === 'sumatif_3' ? cbtScore : (existing?.sumatif_3 ?? null);
      const sum4 = payload.target_slot === 'sumatif_4' ? cbtScore : (existing?.sumatif_4 ?? null);
      const nilaiAkhir =
        payload.target_slot === 'sumatif_akhir' ? cbtScore : (existing?.nilai_akhir_sumatif ?? null);

      const sumatifList = [sum1, sum2, sum3, sum4].filter(
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
            sumatif_4: sum4,
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
            sumatif_4: sum4,
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

  /**
   * Ploting massal Ruang, Pengawas Ruang, dan Proktor pada banyak Jadwal Ujian sekaligus (Oleh Kurikulum / Panitia)
   */
  static async bulkUpdatePlotting(tenantId: string, items: any[]) {
    const jadwalIds = items.map((i) => i.jadwal_id);
    const existingList = await prisma.cbtJadwalUjian.findMany({
      where: {
        tenant_id: tenantId,
        id: { in: jadwalIds },
      },
      select: {
        id: true,
        setting_keamanan: true,
      },
    });

    const existingMap = new Map(existingList.map((j) => [j.id, j.setting_keamanan as Record<string, any>]));
    const operations: any[] = [];

    for (const item of items) {
      const currentSetting = existingMap.get(item.jadwal_id);
      if (!currentSetting && !existingList.some((j) => j.id === item.jadwal_id)) continue;

      const mergedSetting = {
        ...(currentSetting || {}),
        ...(item.ruang_ujian !== undefined ? { ruang_ujian: item.ruang_ujian } : {}),
        ...(item.pengawas_1_id !== undefined ? { pengawas_1_id: item.pengawas_1_id } : {}),
        ...(item.pengawas_1_nama !== undefined ? { pengawas_1_nama: item.pengawas_1_nama } : {}),
        ...(item.pengawas_1_nip !== undefined ? { pengawas_1_nip: item.pengawas_1_nip } : {}),
        ...(item.pengawas_2_id !== undefined ? { pengawas_2_id: item.pengawas_2_id } : {}),
        ...(item.pengawas_2_nama !== undefined ? { pengawas_2_nama: item.pengawas_2_nama } : {}),
        ...(item.pengawas_2_nip !== undefined ? { pengawas_2_nip: item.pengawas_2_nip } : {}),
        ...(item.proktor_id !== undefined ? { proktor_id: item.proktor_id } : {}),
        ...(item.proktor_nama !== undefined ? { proktor_nama: item.proktor_nama } : {}),
        ...(item.proktor_nip !== undefined ? { proktor_nip: item.proktor_nip } : {}),
      };

      const updateData: any = {
        setting_keamanan: mergedSetting,
      };
      if (item.tanggal_mulai) updateData.tanggal_mulai = new Date(item.tanggal_mulai);
      if (item.tanggal_selesai) updateData.tanggal_selesai = new Date(item.tanggal_selesai);

      operations.push(
        prisma.cbtJadwalUjian.update({
          where: { id: item.jadwal_id },
          data: updateData,
        })
      );
    }

    if (operations.length > 0) {
      await prisma.$transaction(operations);
    }

    return {
      updated_count: operations.length,
    };
  }

  /**
   * Merangkai / Membuat Banyak Jadwal Ujian Serentak Sekaligus dari Daftar Bank Soal (Oleh Kurikulum / Panitia)
   * Idempoten: Tidak akan membuat duplikasi sesi ujian jika kombinasi bank_soal, waktu, dan rombel sudah ada.
   */
  static async bulkCreate(tenantId: string, items: any[]) {
    const bankIds = Array.from(new Set(items.map((i) => i.bank_soal_id)));
    const banks = await prisma.cbtBankSoal.findMany({
      where: {
        tenant_id: tenantId,
        id: { in: bankIds },
      },
      include: { _count: { select: { Soal: true } } },
    });

    const bankMap = new Map(banks.map((b) => [b.id, b]));

    // 1. Ambil jadwal yang sudah ada untuk bank soal terkait di tenant ini agar IDEMPOTEN
    const existingJadwal = await prisma.cbtJadwalUjian.findMany({
      where: {
        tenant_id: tenantId,
        bank_soal_id: { in: bankIds },
      },
      select: {
        id: true,
        bank_soal_id: true,
        tanggal_mulai: true,
        tanggal_selesai: true,
        durasi_menit: true,
        nama_sesi: true,
        status: true,
        target_kelas_ids: true,
        setting_keamanan: true,
      },
    });

    const operations: any[] = [];
    const claimedExistingIds = new Set<string>();
    const updatedBankSoalIds = new Set<string>();
    let skippedCount = 0;
    let updatedCount = 0;
    let createdCount = 0;

    for (const data of items) {
      const bankSoal = bankMap.get(data.bank_soal_id);
      // Mendukung penjadwalan ujian lebih awal (cangkang bank soal) tanpa harus menunggu butir soal selesai
      if (!bankSoal) continue;

      const itemStartDate = new Date(data.tanggal_mulai);
      const itemDateStr = itemStartDate.toISOString().split('T')[0];
      const itemTargetKelas: string[] = Array.isArray(data.target_kelas_ids) ? data.target_kelas_ids : [];

      // Sinkronisasi alokasi_menit pada Bank Soal jika durasi di jadwal/sesi ujian diubah atau berbeda
      if (
        data.durasi_menit &&
        bankSoal.alokasi_menit !== data.durasi_menit &&
        !updatedBankSoalIds.has(bankSoal.id)
      ) {
        operations.push(
          prisma.cbtBankSoal.update({
            where: { id: bankSoal.id },
            data: { alokasi_menit: data.durasi_menit },
          })
        );
        updatedBankSoalIds.add(bankSoal.id);
        bankSoal.alokasi_menit = data.durasi_menit;
      }

      // Cari jadwal eksisting yang cocok (Idempoten & Proteksi Terhadap Perubahan Jadwal)
      // Prioritas 1: Cocok pada hari yang sama untuk bank soal dan rombel target yang sama
      let matchedExisting = existingJadwal.find((exist) => {
        if (claimedExistingIds.has(exist.id)) return false;
        if (exist.bank_soal_id !== data.bank_soal_id) return false;
        const existDateStr = new Date(exist.tanggal_mulai).toISOString().split('T')[0];
        if (existDateStr !== itemDateStr) return false;

        const existTargetKelas: string[] = Array.isArray(exist.target_kelas_ids)
          ? (exist.target_kelas_ids as string[])
          : [];

        return itemTargetKelas.some((kId: string) => existTargetKelas.includes(kId));
      });

      // Prioritas 2: Jika hari pelaksanaan dipindahkan (reschedule), cocokkan jadwal DRAFT pada bank soal & rombel yang sama
      if (!matchedExisting) {
        matchedExisting = existingJadwal.find((exist) => {
          if (claimedExistingIds.has(exist.id)) return false;
          if (exist.bank_soal_id !== data.bank_soal_id) return false;
          // Jangan geser jadwal yang sedang berlangsung atau sudah selesai
          if (exist.status && exist.status !== 'DRAFT') return false;

          const existEventId = (exist.setting_keamanan as any)?.event_id;
          const itemEventId = (data.setting_keamanan as any)?.event_id;
          if (existEventId && itemEventId && existEventId !== itemEventId) return false;

          const existTargetKelas: string[] = Array.isArray(exist.target_kelas_ids)
            ? (exist.target_kelas_ids as string[])
            : [];

          return itemTargetKelas.some((kId: string) => existTargetKelas.includes(kId));
        });
      }

      if (matchedExisting) {
        claimedExistingIds.add(matchedExisting.id);
        const existStartMs = new Date(matchedExisting.tanggal_mulai).getTime();
        const itemStartMs = itemStartDate.getTime();
        const existEndMs = new Date(matchedExisting.tanggal_selesai).getTime();
        const itemEndMs = new Date(data.tanggal_selesai).getTime();
        const targetDuration = data.durasi_menit ?? bankSoal.alokasi_menit;
        const isDurationDiff = (matchedExisting.durasi_menit || 0) !== targetDuration;
        const isNameDiff = (matchedExisting.nama_sesi || '').trim() !== (data.nama_sesi || '').trim();
        const existDateStr = new Date(matchedExisting.tanggal_mulai).toISOString().split('T')[0];
        const isDateDiff = existDateStr !== itemDateStr;

        const existSecurity = (matchedExisting.setting_keamanan as Record<string, any>) || {};
        const newSecurity = (data.setting_keamanan as Record<string, any>) || {};
        const existRuang = String(existSecurity.ruang_ujian || '').trim();
        const newRuang = String(newSecurity.ruang_ujian || '').trim();
        const isRoomDiff = newRuang.length > 0 && existRuang !== newRuang;
        const isRoomNamaDiff =
          String(newSecurity.ruang_ujian_nama || '').trim().length > 0 &&
          String(newSecurity.ruang_ujian_nama || '').trim() !== String(existSecurity.ruang_ujian_nama || '').trim();

        // Jika jam mulai/selesai (selisih > 60 detik), tanggal, durasi, nama sesi, atau pemetaan ruang diedit:
        if (
          Math.abs(existStartMs - itemStartMs) > 60000 ||
          Math.abs(existEndMs - itemEndMs) > 60000 ||
          isDateDiff ||
          isDurationDiff ||
          isNameDiff ||
          isRoomDiff ||
          isRoomNamaDiff
        ) {
          const mergedSecurity = {
            ...existSecurity,
            ...newSecurity,
            // Pertahankan pengawas & proktor eksisting jika sudah ada di database
            pengawas_1_id: newSecurity.pengawas_1_id || existSecurity.pengawas_1_id,
            pengawas_1_nama: newSecurity.pengawas_1_nama || existSecurity.pengawas_1_nama,
            pengawas_1_nip: newSecurity.pengawas_1_nip || existSecurity.pengawas_1_nip,
            tanda_tangan_pengawas_1: newSecurity.tanda_tangan_pengawas_1 || existSecurity.tanda_tangan_pengawas_1,
            pengawas_2_id: newSecurity.pengawas_2_id || existSecurity.pengawas_2_id,
            pengawas_2_nama: newSecurity.pengawas_2_nama || existSecurity.pengawas_2_nama,
            pengawas_2_nip: newSecurity.pengawas_2_nip || existSecurity.pengawas_2_nip,
            tanda_tangan_pengawas_2: newSecurity.tanda_tangan_pengawas_2 || existSecurity.tanda_tangan_pengawas_2,
            proktor_id: newSecurity.proktor_id || existSecurity.proktor_id,
            proktor_nama: newSecurity.proktor_nama || existSecurity.proktor_nama,
            proktor_nip: newSecurity.proktor_nip || existSecurity.proktor_nip,
            tanda_tangan_proktor: newSecurity.tanda_tangan_proktor || existSecurity.tanda_tangan_proktor,
            ruang_ujian: newSecurity.ruang_ujian || existSecurity.ruang_ujian,
            ruang_ujian_nama: newSecurity.ruang_ujian_nama || existSecurity.ruang_ujian_nama,
          };

          operations.push(
            prisma.cbtJadwalUjian.update({
              where: { id: matchedExisting.id },
              data: {
                tanggal_mulai: new Date(data.tanggal_mulai),
                tanggal_selesai: new Date(data.tanggal_selesai),
                durasi_menit: targetDuration,
                nama_sesi: data.nama_sesi.trim(),
                setting_keamanan: mergedSecurity,
              },
            })
          );
          updatedCount++;
        } else {
          skippedCount++;
        }
        continue;
      }

      // Jika belum ada jadwal pada hari dan rombel tersebut, buat jadwal baru
      const token = this.generateToken();
      operations.push(
        prisma.cbtJadwalUjian.create({
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
              block_tab_switch: true,
              max_violations: 3,
              shuffle_questions: true,
              shuffle_options: true,
              show_result_instant: false,
            },
            status: 'DRAFT',
          },
        })
      );
      createdCount++;
    }

    if (operations.length === 0) {
      if (skippedCount > 0) {
        return {
          created_count: 0,
          updated_count: 0,
          skipped_count: skippedCount,
          items: [],
          message: `Seluruh ${skippedCount} jadwal ujian yang dipilih sudah sesuai di database (idempoten). Tidak ada jadwal duplikat yang dibuat.`,
        };
      }
      throw new Error('Tidak ada bank soal valid yang memiliki butir soal untuk dijadwalkan');
    }

    const results = await prisma.$transaction(operations);
    return {
      created_count: createdCount,
      updated_count: updatedCount,
      skipped_count: skippedCount,
      items: results,
    };
  }
}
