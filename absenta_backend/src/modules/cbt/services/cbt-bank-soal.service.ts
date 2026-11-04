import { prisma } from '@/utils/prisma';
import { Prisma } from '@prisma/client';
import { storageService } from '@/infra/storage/storage.service';

export interface QueryBankSoalDto {
  page?: number;
  limit?: number;
  search?: string;
  tingkat?: string;
  status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  mapel_id?: string;
  guru_id?: string;
  include_shared?: boolean;
}

export class CbtBankSoalService {
  /**
   * Mengambil daftar Bank Soal dengan paginasi dan filter
   * Jika guru_id diberikan dan include_shared !== false, sertakan pula Bank Soal Bersama (PUBLISHED)
   * dari guru lain yang se-mapel dan setingkat.
   */
  static async list(tenantId: string, query: QueryBankSoalDto) {
    const page = Math.max(1, Number(query.page || 1));
    const limit = Math.min(100, Math.max(1, Number(query.limit || 10)));
    const skip = (page - 1) * limit;

    let normalizedTingkat = query.tingkat;
    if (normalizedTingkat === '10') normalizedTingkat = 'X';
    else if (normalizedTingkat === '11') normalizedTingkat = 'XI';
    else if (normalizedTingkat === '12') normalizedTingkat = 'XII';

    const andConditions: Prisma.CbtBankSoalWhereInput[] = [
      { tenant_id: tenantId },
    ];

    if (query.status) {
      andConditions.push({ status: query.status });
    }
    if (normalizedTingkat && normalizedTingkat !== 'SEMUA') {
      andConditions.push({ tingkat: normalizedTingkat });
    }
    if (query.mapel_id) {
      andConditions.push({ mapel_id: query.mapel_id });
    }
    if (query.search) {
      andConditions.push({
        OR: [
          { judul: { contains: query.search, mode: 'insensitive' } },
          { kode_bank: { contains: query.search, mode: 'insensitive' } },
        ],
      });
    }

    if (query.guru_id) {
      if (query.include_shared === false) {
        andConditions.push({ guru_id: query.guru_id });
      } else {
        // Cari mapel & tingkat yang diampu guru ini di kurikulum
        const assignments = await prisma.guruMapel.findMany({
          where: {
            tenant_id: tenantId,
            guru_id: query.guru_id,
          },
          include: {
            Kelas: {
              select: { tingkat: true },
            },
          },
        });

        const assignedMapelIds = Array.from(
          new Set(assignments.map((a) => a.mapel_id).filter(Boolean))
        );

        const assignedTingkats = new Set<string>(['SEMUA']);
        for (const a of assignments) {
          const rawTingkat = String(a.Kelas?.tingkat || '').toUpperCase().trim();
          if (rawTingkat === '10' || rawTingkat === 'X') assignedTingkats.add('X');
          else if (rawTingkat === '11' || rawTingkat === 'XI') assignedTingkats.add('XI');
          else if (rawTingkat === '12' || rawTingkat === 'XII') assignedTingkats.add('XII');
        }

        if (assignedMapelIds.length > 0) {
          const sharedCondition: Prisma.CbtBankSoalWhereInput = {
            status: 'PUBLISHED',
            mapel_id: { in: assignedMapelIds },
            ...(assignedTingkats.size > 1
              ? { tingkat: { in: Array.from(assignedTingkats) } }
              : {}),
          };
          andConditions.push({
            OR: [{ guru_id: query.guru_id }, sharedCondition],
          });
        } else {
          andConditions.push({ guru_id: query.guru_id });
        }
      }
    }

    const where: Prisma.CbtBankSoalWhereInput =
      andConditions.length === 1 ? andConditions[0] : { AND: andConditions };

    const [total, items] = await Promise.all([
      prisma.cbtBankSoal.count({ where }),
      prisma.cbtBankSoal.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
        include: {
          Guru: {
            select: { id: true, nama_guru: true, nip: true },
          },
          Mapel: {
            select: { id: true, nama_mapel: true, kode_mapel: true },
          },
          _count: {
            select: { Soal: true, JadwalUjian: true },
          },
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
   * Mengambil detail Bank Soal beserta relasi
   */
  static async getById(tenantId: string, id: string) {
    const bankSoal = await prisma.cbtBankSoal.findFirst({
      where: { id, tenant_id: tenantId },
      include: {
        Guru: {
          select: { id: true, nama_guru: true, nip: true },
        },
        Mapel: {
          select: { id: true, nama_mapel: true, kode_mapel: true },
        },
        _count: {
          select: { Soal: true, JadwalUjian: true },
        },
      },
    });

    if (!bankSoal) {
      throw new Error('Bank soal tidak ditemukan');
    }

    return bankSoal;
  }

  /**
   * Membuat Bank Soal baru
   */
  static async create(tenantId: string, data: any) {
    // Validasi duplikasi kode bank dalam tenant yang sama
    const existing = await prisma.cbtBankSoal.findFirst({
      where: {
        tenant_id: tenantId,
        kode_bank: data.kode_bank,
      },
    });

    if (existing) {
      throw new Error(`Kode bank soal '${data.kode_bank}' sudah digunakan.`);
    }

    const resolvedStatus =
      data.status || (data.is_shared ? 'PUBLISHED' : 'DRAFT');

    return prisma.cbtBankSoal.create({
      data: {
        tenant_id: tenantId,
        guru_id: data.guru_id,
        mapel_id: data.mapel_id,
        kode_bank: data.kode_bank.toUpperCase().trim(),
        judul: data.judul.trim(),
        tingkat: data.tingkat,
        jurusan: data.jurusan || null,
        alokasi_menit: data.alokasi_menit ?? 90,
        acak_soal: data.acak_soal ?? true,
        acak_opsi: data.acak_opsi ?? true,
        status: resolvedStatus,
      },
      include: {
        Guru: { select: { nama_guru: true } },
        Mapel: { select: { nama_mapel: true } },
      },
    });
  }

  /**
   * Mengupdate Bank Soal
   */
  static async update(tenantId: string, id: string, data: any) {
    await this.getById(tenantId, id);

    if (data.kode_bank) {
      const duplicate = await prisma.cbtBankSoal.findFirst({
        where: {
          tenant_id: tenantId,
          kode_bank: data.kode_bank.toUpperCase().trim(),
          NOT: { id },
        },
      });
      if (duplicate) {
        throw new Error(`Kode bank soal '${data.kode_bank}' sudah digunakan.`);
      }
    }

    const resolvedStatus =
      data.status !== undefined
        ? data.status
        : data.is_shared !== undefined
        ? data.is_shared
          ? 'PUBLISHED'
          : 'DRAFT'
        : undefined;

    return prisma.cbtBankSoal.update({
      where: { id },
      data: {
        ...(data.guru_id ? { guru_id: data.guru_id } : {}),
        ...(data.mapel_id ? { mapel_id: data.mapel_id } : {}),
        ...(data.kode_bank ? { kode_bank: data.kode_bank.toUpperCase().trim() } : {}),
        ...(data.judul ? { judul: data.judul.trim() } : {}),
        ...(data.tingkat ? { tingkat: data.tingkat } : {}),
        ...(data.jurusan !== undefined ? { jurusan: data.jurusan } : {}),
        ...(data.alokasi_menit !== undefined ? { alokasi_menit: data.alokasi_menit } : {}),
        ...(data.acak_soal !== undefined ? { acak_soal: data.acak_soal } : {}),
        ...(data.acak_opsi !== undefined ? { acak_opsi: data.acak_opsi } : {}),
        ...(resolvedStatus ? { status: resolvedStatus } : {}),
      },
    });
  }

  /**
   * Menduplikasi (Copy) Bank Soal beserta seluruh butir soalnya ke akun Guru peminta
   */
  static async duplicate(tenantId: string, sourceBankSoalId: string, targetGuruId?: string) {
    const source = await prisma.cbtBankSoal.findFirst({
      where: { id: sourceBankSoalId, tenant_id: tenantId },
      include: {
        Soal: {
          orderBy: { nomor_urut: 'asc' },
        },
      },
    });

    if (!source) {
      throw new Error('Bank soal sumber tidak ditemukan');
    }

    const ownerGuruId = targetGuruId || source.guru_id;
    const newCode = `CBT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    return prisma.$transaction(async (tx) => {
      const clonedBank = await tx.cbtBankSoal.create({
        data: {
          tenant_id: tenantId,
          guru_id: ownerGuruId,
          mapel_id: source.mapel_id,
          kode_bank: newCode,
          judul: `${source.judul} (Salinan)`,
          tingkat: source.tingkat,
          jurusan: source.jurusan,
          jumlah_soal: source.Soal.length,
          alokasi_menit: source.alokasi_menit,
          acak_soal: source.acak_soal,
          acak_opsi: source.acak_opsi,
          status: 'DRAFT',
        },
        include: {
          Guru: { select: { id: true, nama_guru: true } },
          Mapel: { select: { id: true, nama_mapel: true } },
        },
      });

      if (source.Soal.length > 0) {
        await tx.cbtSoal.createMany({
          data: source.Soal.map((s, idx) => ({
            tenant_id: tenantId,
            bank_soal_id: clonedBank.id,
            nomor_urut: s.nomor_urut || idx + 1,
            jenis_soal: s.jenis_soal,
            konten_pertanyaan: s.konten_pertanyaan,
            gambar_stimulus_url: s.gambar_stimulus_url,
            bobot: s.bobot,
            opsi_jawaban_json: s.opsi_jawaban_json as any,
            kunci_jawaban: s.kunci_jawaban,
            pembahasan: s.pembahasan,
          })),
        });
      }

      return clonedBank;
    });
  }

  /**
   * Helper: Ekstrak seluruh URL gambar (stimulus & opsi A-E) dari daftar butir soal
   */
  private static extractMediaUrlsFromSoalList(
    soalItems: Array<{ gambar_stimulus_url?: string | null; opsi_jawaban_json?: any }>
  ): string[] {
    const urls = new Set<string>();
    for (const s of soalItems || []) {
      if (s?.gambar_stimulus_url && typeof s.gambar_stimulus_url === 'string') {
        urls.add(s.gambar_stimulus_url.trim());
      }
      const opsiList = Array.isArray(s?.opsi_jawaban_json) ? s.opsi_jawaban_json : [];
      for (const opt of opsiList) {
        if (opt?.gambar_url && typeof opt.gambar_url === 'string') {
          urls.add(opt.gambar_url.trim());
        }
      }
    }
    return Array.from(urls).filter(Boolean);
  }

  /**
   * Helper: Konversi URL publik (/api/uploads/... atau /uploads/...) menjadi storageKey (uploads/...)
   */
  private static urlToStorageKey(url: string): string | null {
    const trimmed = String(url || '').trim();
    if (!trimmed) return null;
    if (trimmed.startsWith('/api/uploads/')) {
      return `uploads/${trimmed.slice('/api/uploads/'.length)}`;
    }
    if (trimmed.startsWith('/uploads/')) {
      return `uploads/${trimmed.slice('/uploads/'.length)}`;
    }
    if (trimmed.startsWith('uploads/')) {
      return trimmed;
    }
    return null;
  }

  /**
   * Reference-Counted Media Cleanup:
   * Menghancurkan file gambar fisik di Storage Engine (Local Disk / S3 / MinIO)
   * HANYA JIKA gambar tersebut sudah tidak dipakai lagi oleh butir soal lain di tenant tersebut
   * (aman untuk Bank Soal hasil duplikasi maupun gambar tabel yang dipakai bersama di beberapa soal).
   */
  private static async cleanupUnusedMediaUrls(
    tenantId: string,
    candidateUrls: string[]
  ): Promise<void> {
    const uniqueCandidates = Array.from(new Set(candidateUrls.filter(Boolean)));
    if (uniqueCandidates.length === 0) return;

    try {
      // Ambil seluruh butir soal yang masih tersisa milik tenant ini untuk mengecek referensi aktif
      const remainingQuestions = await prisma.cbtSoal.findMany({
        where: { tenant_id: tenantId },
        select: {
          gambar_stimulus_url: true,
          opsi_jawaban_json: true,
        },
      });

      const stillReferencedUrls = new Set(this.extractMediaUrlsFromSoalList(remainingQuestions));

      for (const url of uniqueCandidates) {
        if (stillReferencedUrls.has(url)) {
          // Masih digunakan oleh soal lain / bank soal hasil duplikasi -> jangan dihapus
          continue;
        }
        const storageKey = this.urlToStorageKey(url);
        if (storageKey) {
          await storageService.delete(storageKey).catch(() => null);
        }
      }
    } catch (err) {
      console.warn('[CbtBankSoalService] Gagal membersihkan media yatim (orphan media):', err);
    }
  }

  /**
   * Menghapus Bank Soal beserta pembersihan media gambar di Storage Engine
   */
  static async delete(tenantId: string, id: string) {
    await this.getById(tenantId, id);

    // Cek apakah ada jadwal ujian terkait yang aktif
    const activeJadwal = await prisma.cbtJadwalUjian.findFirst({
      where: {
        tenant_id: tenantId,
        bank_soal_id: id,
        status: { in: ['ACTIVE', 'PAUSED'] },
      },
    });

    if (activeJadwal) {
      throw new Error('Bank soal tidak dapat dihapus karena masih digunakan pada jadwal ujian aktif.');
    }

    // Kumpulkan semua URL gambar dari soal-soal di dalam Bank Soal ini sebelum dihapus dari DB
    const questionsToDelete = await prisma.cbtSoal.findMany({
      where: { tenant_id: tenantId, bank_soal_id: id },
      select: {
        gambar_stimulus_url: true,
        opsi_jawaban_json: true,
      },
    });
    const candidateMediaUrls = this.extractMediaUrlsFromSoalList(questionsToDelete);

    const deletedBank = await prisma.cbtBankSoal.delete({
      where: { id },
    });

    // Hancurkan file fisik di Storage Engine jika sudah tidak direferensikan soal lain
    await this.cleanupUnusedMediaUrls(tenantId, candidateMediaUrls);

    return deletedBank;
  }

  // ==========================================
  // SOAL (ITEM PERTANYAAN PG) MANAGEMENT
  // ==========================================

  /**
   * Mengambil seluruh butir soal dari suatu Bank Soal
   */
  static async listQuestions(tenantId: string, bankSoalId: string) {
    await this.getById(tenantId, bankSoalId);

    return prisma.cbtSoal.findMany({
      where: {
        tenant_id: tenantId,
        bank_soal_id: bankSoalId,
      },
      orderBy: { nomor_urut: 'asc' },
    });
  }

  /**
   * Menambahkan satu butir soal ke Bank Soal
   */
  static async createQuestion(tenantId: string, bankSoalId: string, data: any) {
    await this.getById(tenantId, bankSoalId);

    // Dapatkan nomor urut tertinggi jika nomor_urut tidak ditentukan
    let nomorUrut = data.nomor_urut;
    if (!nomorUrut) {
      const last = await prisma.cbtSoal.findFirst({
        where: { tenant_id: tenantId, bank_soal_id: bankSoalId },
        orderBy: { nomor_urut: 'desc' },
        select: { nomor_urut: true },
      });
      nomorUrut = (last?.nomor_urut || 0) + 1;
    }

    const created = await prisma.$transaction(async (tx) => {
      const soal = await tx.cbtSoal.create({
        data: {
          tenant_id: tenantId,
          bank_soal_id: bankSoalId,
          nomor_urut: nomorUrut,
          jenis_soal: 'PG',
          konten_pertanyaan: data.konten_pertanyaan,
          gambar_stimulus_url: data.gambar_stimulus_url || null,
          bobot: data.bobot ?? 1.0,
          opsi_jawaban_json: data.opsi_jawaban_json,
          kunci_jawaban: data.kunci_jawaban,
          pembahasan: data.pembahasan || null,
        },
      });

      // Update counter jumlah_soal di CbtBankSoal
      const totalSoal = await tx.cbtSoal.count({
        where: { tenant_id: tenantId, bank_soal_id: bankSoalId },
      });

      await tx.cbtBankSoal.update({
        where: { id: bankSoalId },
        data: { jumlah_soal: totalSoal },
      });

      return soal;
    });

    return created;
  }

  /**
   * Mengupdate butir soal (sekaligus membersihkan file gambar lama jika diganti/dihapus)
   */
  static async updateQuestion(tenantId: string, questionId: string, data: any) {
    const existing = await prisma.cbtSoal.findFirst({
      where: { id: questionId, tenant_id: tenantId },
    });

    if (!existing) {
      throw new Error('Butir soal tidak ditemukan');
    }

    const oldUrls = this.extractMediaUrlsFromSoalList([existing]);

    const updated = await prisma.cbtSoal.update({
      where: { id: questionId },
      data: {
        ...(data.nomor_urut !== undefined ? { nomor_urut: data.nomor_urut } : {}),
        ...(data.konten_pertanyaan ? { konten_pertanyaan: data.konten_pertanyaan } : {}),
        ...(data.gambar_stimulus_url !== undefined ? { gambar_stimulus_url: data.gambar_stimulus_url } : {}),
        ...(data.bobot !== undefined ? { bobot: data.bobot } : {}),
        ...(data.opsi_jawaban_json ? { opsi_jawaban_json: data.opsi_jawaban_json } : {}),
        ...(data.kunci_jawaban ? { kunci_jawaban: data.kunci_jawaban } : {}),
        ...(data.pembahasan !== undefined ? { pembahasan: data.pembahasan } : {}),
      },
    });

    const newUrls = new Set(this.extractMediaUrlsFromSoalList([updated]));
    const removedUrls = oldUrls.filter((u) => !newUrls.has(u));

    if (removedUrls.length > 0) {
      await this.cleanupUnusedMediaUrls(tenantId, removedUrls);
    }

    return updated;
  }

  /**
   * Menghapus butir soal beserta file gambarnya di Storage Engine
   */
  static async deleteQuestion(tenantId: string, questionId: string) {
    const existing = await prisma.cbtSoal.findFirst({
      where: { id: questionId, tenant_id: tenantId },
    });

    if (!existing) {
      throw new Error('Butir soal tidak ditemukan');
    }

    const candidateMediaUrls = this.extractMediaUrlsFromSoalList([existing]);

    const result = await prisma.$transaction(async (tx) => {
      await tx.cbtSoal.delete({
        where: { id: questionId },
      });

      const totalSoal = await tx.cbtSoal.count({
        where: { tenant_id: tenantId, bank_soal_id: existing.bank_soal_id },
      });

      await tx.cbtBankSoal.update({
        where: { id: existing.bank_soal_id },
        data: { jumlah_soal: totalSoal },
      });

      return { success: true };
    });

    await this.cleanupUnusedMediaUrls(tenantId, candidateMediaUrls);

    return result;
  }

  /**
   * Bulk Import butir soal (misal dari hasil parser Excel / Word)
   */
  static async bulkImportQuestions(tenantId: string, bankSoalId: string, items: any[]) {
    await this.getById(tenantId, bankSoalId);

    return prisma.$transaction(async (tx) => {
      // Dapatkan nomor urut awal
      const last = await tx.cbtSoal.findFirst({
        where: { tenant_id: tenantId, bank_soal_id: bankSoalId },
        orderBy: { nomor_urut: 'desc' },
        select: { nomor_urut: true },
      });

      let currentOrder = last?.nomor_urut || 0;

      const createdItems = [];
      for (const item of items) {
        currentOrder++;
        const created = await tx.cbtSoal.create({
          data: {
            tenant_id: tenantId,
            bank_soal_id: bankSoalId,
            nomor_urut: item.nomor_urut || currentOrder,
            jenis_soal: 'PG',
            konten_pertanyaan: item.konten_pertanyaan,
            gambar_stimulus_url: item.gambar_stimulus_url || null,
            bobot: item.bobot ?? 1.0,
            opsi_jawaban_json: item.opsi_jawaban_json,
            kunci_jawaban: item.kunci_jawaban,
            pembahasan: item.pembahasan || null,
          },
        });
        createdItems.push(created);
      }

      const totalSoal = await tx.cbtSoal.count({
        where: { tenant_id: tenantId, bank_soal_id: bankSoalId },
      });

      await tx.cbtBankSoal.update({
        where: { id: bankSoalId },
        data: { jumlah_soal: totalSoal },
      });

      return {
        importedCount: createdItems.length,
        totalSoal,
      };
    });
  }
}
