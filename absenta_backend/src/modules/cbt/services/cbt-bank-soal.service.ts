import { prisma } from '@/utils/prisma';
import { Prisma } from '@prisma/client';
import { storageService } from '@/infra/storage/storage.service';
import { getRedisConnection } from '@/infra/redis/redisClient';
import axios from 'axios';

export interface QueryBankSoalDto {
  page?: number;
  limit?: number;
  search?: string;
  tingkat?: string;
  status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  mapel_id?: string;
  guru_id?: string;
  tahun_pelajaran_id?: string;
  semester_id?: string;
  event_id?: string;
  unit_pengajaran_id?: string;
  include_shared?: boolean;
  ownership?: 'ALL' | 'OWN' | 'SHARED';
}

export class CbtBankSoalService {
  private static readonly bankInclude = {
    Guru: {
      select: { id: true, nama_guru: true, nip: true },
    },
    Mapel: {
      select: { id: true, nama_mapel: true, kode_mapel: true },
    },
    UnitPengajaran: {
      select: {
        id: true,
        nama_unit: true,
        guru_id: true,
        target_sumatif_slot: true,
        Guru: { select: { id: true, nama_guru: true } },
      },
    },
    TahunPelajaran: {
      select: { id: true, tahun: true },
    },
    Semester: {
      select: { id: true, nama_semester: true },
    },
    Kontributor: {
      include: {
        Guru: { select: { id: true, nama_guru: true, nip: true } },
        UnitPengajaran: { select: { id: true, nama_unit: true, target_sumatif_slot: true } },
      },
      orderBy: { created_at: 'asc' as const },
    },
    _count: {
      select: { Soal: true, JadwalUjian: true },
    },
  };

  private static async resolveAcademicContext(
    tenantId: string,
    tpId?: string | null,
    semId?: string | null
  ): Promise<{ tahun_pelajaran_id: string | null; semester_id: string | null }> {
    let resolvedTpId = tpId || null;
    let resolvedSemId = semId || null;

    if (!resolvedTpId) {
      const activeTp = await prisma.tahunPelajaran.findFirst({
        where: { tenant_id: tenantId, is_active: true },
        select: { id: true },
      });
      resolvedTpId = activeTp?.id || null;
    }

    if (!resolvedSemId && resolvedTpId) {
      const activeSem = await prisma.semester.findFirst({
        where: { tenant_id: tenantId, tahun_pelajaran_id: resolvedTpId, is_active: true },
        select: { id: true },
      });
      resolvedSemId = activeSem?.id || null;
    }

    return { tahun_pelajaran_id: resolvedTpId, semester_id: resolvedSemId };
  }

  private static async enrichBankCollaborationMeta(tenantId: string, banks: any[]) {
    if (!banks || banks.length === 0) return banks;

    const mapelIds = Array.from(new Set(banks.map((b) => b.mapel_id).filter(Boolean)));
    const collabRecords = mapelIds.length > 0
      ? await prisma.guruMapel.findMany({
          where: {
            tenant_id: tenantId,
            mapel_id: { in: mapelIds },
            teaching_mode: 'COLLABORATION',
          },
          select: {
            mapel_id: true,
            tahun_pelajaran_id: true,
            semester_id: true,
            UnitPengajaran: {
              where: { is_active: true },
              orderBy: { urutan: 'asc' },
              select: {
                id: true,
                nama_unit: true,
                guru_id: true,
                target_sumatif_slot: true,
                urutan: true,
                Guru: { select: { id: true, nama_guru: true } },
              },
            },
          },
        })
      : [];

    return banks.map((bank) => {
      const matchingCollab = collabRecords.filter(
        (gm) =>
          gm.mapel_id === bank.mapel_id &&
          (!bank.tahun_pelajaran_id || gm.tahun_pelajaran_id === bank.tahun_pelajaran_id) &&
          (!bank.semester_id || gm.semester_id === bank.semester_id)
      );

      const isCollabMapel = matchingCollab.length > 0;
      const unitsMap = new Map<string, any>();
      for (const gm of matchingCollab) {
        for (const u of gm.UnitPengajaran || []) {
          if (!unitsMap.has(u.id)) {
            unitsMap.set(u.id, u);
          }
        }
      }

      const unitNama = bank.UnitPengajaran?.nama_unit || null;
      const baseMapel = bank.Mapel?.nama_mapel || '-';
      const isKuisUnit = Boolean(bank.unit_pengajaran_id);
      const isKolaborasiResmi = !isKuisUnit && isCollabMapel;

      const isShared =
        Boolean(bank.is_shared) || (bank.Kontributor || []).length > 0;

      return {
        ...bank,
        is_shared: isShared,
        is_kolaborasi_mapel: isCollabMapel,
        is_kolaborasi_resmi: isKolaborasiResmi,
        is_kuis_unit: isKuisUnit,
        display_mapel: isKuisUnit && unitNama ? `${baseMapel} — ${unitNama}` : baseMapel,
        kolaborasi_badge: isKolaborasiResmi ? 'Kolaborasi' : null,
        available_units: Array.from(unitsMap.values()),
      };
    });
  }

  /**
   * Mengambil daftar Bank Soal dengan paginasi dan filter
   * Jika guru_id diberikan dan include_shared !== false, sertakan pula Bank Soal Bersama (PUBLISHED),
   * kontributor kolaborasi DB (`CbtBankSoalKontributor`), serta delegasi `guru_pelaksana_id` aktif.
   */
  static async list(tenantId: string, query: QueryBankSoalDto) {
    const page = Math.max(1, Number(query.page || 1));
    const limit = Math.min(500, Math.max(1, Number(query.limit || 10)));
    const skip = (page - 1) * limit;

    const ROMAN_MAP: Record<string, string> = {
      '1': 'I', '2': 'II', '3': 'III', '4': 'IV', '5': 'V', '6': 'VI',
      '7': 'VII', '8': 'VIII', '9': 'IX',
      '10': 'X', '11': 'XI', '12': 'XII', '13': 'XIII'
    };
    const queryTingkat = query.tingkat ? String(query.tingkat).trim() : undefined;
    const romanTingkat = queryTingkat ? (ROMAN_MAP[queryTingkat] || queryTingkat) : undefined;

    const andConditions: Prisma.CbtBankSoalWhereInput[] = [
      { tenant_id: tenantId },
    ];
    const sharedScopeConditions: Prisma.CbtBankSoalWhereInput[] = [];

    if (query.status) {
      andConditions.push({ status: query.status });
    }
    if (queryTingkat && queryTingkat !== 'SEMUA') {
      andConditions.push({
        OR: [
          { tingkat: queryTingkat },
          ...(romanTingkat && romanTingkat !== queryTingkat ? [{ tingkat: romanTingkat }] : []),
        ],
      });
    }
    if (query.mapel_id) {
      andConditions.push({ mapel_id: query.mapel_id });
    }
    if (query.tahun_pelajaran_id) {
      andConditions.push({
        OR: [{ tahun_pelajaran_id: query.tahun_pelajaran_id }, { tahun_pelajaran_id: null }],
      });
    }
    if (query.semester_id) {
      andConditions.push({
        OR: [{ semester_id: query.semester_id }, { semester_id: null }],
      });
    }
    if (query.event_id) {
      andConditions.push({ event_id: query.event_id });
    }
    if (query.unit_pengajaran_id) {
      andConditions.push({ unit_pengajaran_id: query.unit_pengajaran_id });
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
        andConditions.push({
          OR: [
            { guru_id: query.guru_id },
            { Kontributor: { some: { guru_id: query.guru_id, tenant_id: tenantId } } },
          ],
        });
      } else {
        // Cari mapel, tingkat & jurusan yang diampu guru ini di kurikulum (SK GuruMapel, UnitPengajaran, atau Delegasi Pelaksana)
        const [assignments, unitAssignments, delegatedJadwals] = await Promise.all([
          prisma.guruMapel.findMany({
            where: {
              tenant_id: tenantId,
              guru_id: query.guru_id,
            },
            include: {
              Kelas: {
                select: {
                  tingkat: true,
                  jurusan_id: true,
                  Jurusan: { select: { id: true, nama: true, kode: true, singkatan: true } },
                },
              },
              Jurusan: { select: { id: true, nama: true, kode: true, singkatan: true } },
            },
          }),
          prisma.unitPengajaran.findMany({
            where: {
              tenant_id: tenantId,
              guru_id: query.guru_id,
              is_active: true,
            },
            include: {
              Kelas: {
                select: {
                  tingkat: true,
                  jurusan_id: true,
                  Jurusan: { select: { id: true, nama: true, kode: true, singkatan: true } },
                },
              },
              Jurusan: { select: { id: true, nama: true, kode: true, singkatan: true } },
            },
          }),
          prisma.jadwalKBM.findMany({
            where: {
              tenant_id: tenantId,
              guru_pelaksana_id: query.guru_id,
            },
            include: {
              Kelas: {
                select: {
                  tingkat: true,
                  jurusan_id: true,
                  Jurusan: { select: { id: true, nama: true, kode: true, singkatan: true } },
                },
              },
            },
          }),
        ]);

        // Struktur Penugasan Berpasangan Presisi (Mapel + Tingkat + Jurusan)
        const scopeMap = new Map<
          string,
          {
            mapelId: string;
            tingkatVariants: string[];
            jurusans: Set<string>;
            hasGeneralClass: boolean;
          }
        >();

        const getTingkatVariants = (
          rawTingkatVal: unknown
        ): { normalized: string; variants: string[] } | null => {
          const raw = String(rawTingkatVal || '').toUpperCase().trim();
          if (raw === '10' || raw === 'X') return { normalized: 'X', variants: ['X', '10', 'SEMUA'] };
          if (raw === '11' || raw === 'XI') return { normalized: 'XI', variants: ['XI', '11', 'SEMUA'] };
          if (raw === '12' || raw === 'XII') return { normalized: 'XII', variants: ['XII', '12', 'SEMUA'] };
          if (raw === '13' || raw === 'XIII') return { normalized: 'XIII', variants: ['XIII', '13', 'SEMUA'] };
          if (raw) return { normalized: raw, variants: [raw, 'SEMUA'] };
          return null;
        };

        const registerTeachingScope = (mapelId?: string | null, kelas?: any, directJurusan?: any) => {
          if (!mapelId) return;
          const tingkatInfo = getTingkatVariants(kelas?.tingkat);
          if (!tingkatInfo) return;

          const key = `${mapelId}__${tingkatInfo.normalized}`;
          let entry = scopeMap.get(key);
          if (!entry) {
            entry = {
              mapelId,
              tingkatVariants: tingkatInfo.variants,
              jurusans: new Set<string>(),
              hasGeneralClass: false,
            };
            scopeMap.set(key, entry);
          }

          const jObj = kelas?.Jurusan || directJurusan;
          if (jObj) {
            if (jObj.kode) entry.jurusans.add(jObj.kode.trim());
            if (jObj.singkatan) entry.jurusans.add(jObj.singkatan.trim());
            if (jObj.nama) entry.jurusans.add(jObj.nama.trim());
          } else {
            entry.hasGeneralClass = true;
          }
        };

        assignments.forEach((a: any) => registerTeachingScope(a.mapel_id, a.Kelas, a.Jurusan));
        unitAssignments.forEach((u: any) => registerTeachingScope(u.mapel_id, u.Kelas, u.Jurusan));
        delegatedJadwals.forEach((j: any) => registerTeachingScope(j.mapel_id, j.Kelas));

        // Ambil bank soal milik guru ini sendiri agar bank master MGMP (auto-share) tidak lagi membanjiri radar "Dibagikan Kepada Saya" jika guru sudah membuat bank sendiri
        const ownBanks = await prisma.cbtBankSoal.findMany({
          where: { tenant_id: tenantId, guru_id: query.guru_id },
          select: {
            mapel_id: true,
            tingkat: true,
            tingkat_num: true,
            jurusan: true,
            jurusan_id: true,
            target_jurusan_ids: true,
          },
        });

        // Isi sharedScopeConditions untuk paket Master MGMP se-sekolah yang relevan
        for (const scope of scopeMap.values()) {
          const scopeTingkatNums = scope.tingkatVariants
            .map((tv) => this.parseTingkatNumber(tv))
            .filter((n): n is number => n !== null);

          const scopeJurusansUpper = Array.from(scope.jurusans).map((j) => j.toUpperCase().trim());

          const alreadyHasOwnBank = ownBanks.some((ob) => {
            if (ob.mapel_id !== scope.mapelId) return false;
            const obTingkat = ob.tingkat_num ?? this.parseTingkatNumber(ob.tingkat);
            const matchTingkat =
              (obTingkat !== null && scopeTingkatNums.includes(obTingkat)) ||
              scope.tingkatVariants.includes(String(ob.tingkat || '').toUpperCase().trim());
            if (!matchTingkat) return false;

            const obJurUpper = String(ob.jurusan || '').toUpperCase().trim();
            const isObGeneral =
              !ob.jurusan_id &&
              (!Array.isArray(ob.target_jurusan_ids) || ob.target_jurusan_ids.length === 0) &&
              (!obJurUpper || obJurUpper === 'SEMUA' || obJurUpper === 'UMUM');
            if (isObGeneral) return true;
            if (scopeJurusansUpper.length === 0) return true;

            const obTokens = obJurUpper.split(/[,;/|]+/).map((s) => s.trim()).filter(Boolean);
            return scopeJurusansUpper.some((sj) => obTokens.includes(sj));
          });

          if (alreadyHasOwnBank) {
            continue;
          }

        // Kebijakan share MGMP mutlak: HANYA guru yang eksplisit terdaftar di CbtBankSoalKontributor yang menerima share (tanpa auto-share jurusan maupun Semua Jurusan).
        }

        const orConditions: Prisma.CbtBankSoalWhereInput[] = [
          { guru_id: query.guru_id },
          { Kontributor: { some: { guru_id: query.guru_id, tenant_id: tenantId } } },
          ...sharedScopeConditions,
        ];

        if (query.ownership === 'OWN') {
          andConditions.push({ guru_id: query.guru_id });
        } else if (query.ownership === 'SHARED') {
          andConditions.push({
            guru_id: { not: query.guru_id },
            OR: [
              { Kontributor: { some: { guru_id: query.guru_id, tenant_id: tenantId } } },
              ...sharedScopeConditions,
            ],
          });
        } else {
          andConditions.push({ OR: orConditions });
        }
      }
    }

    const where: Prisma.CbtBankSoalWhereInput =
      andConditions.length === 1 ? andConditions[0] : { AND: andConditions };

    // Metadata counts untuk tabs pemisahan: Soal Buatan Saya (OWN) vs Dibagikan Kepada Saya (SHARED) vs SEMUA
    let countsMeta: { all: number; own: number; shared: number } | undefined;
    if (query.guru_id) {
      const baseConditions = andConditions.slice(0, -1);
      const ownWhere: Prisma.CbtBankSoalWhereInput = {
        AND: [...baseConditions, { guru_id: query.guru_id }],
      };
      const allWhere: Prisma.CbtBankSoalWhereInput = {
        AND: [
          ...baseConditions,
          {
            OR: [
              { guru_id: query.guru_id },
              { Kontributor: { some: { guru_id: query.guru_id, tenant_id: tenantId } } },
              ...sharedScopeConditions,
            ],
          },
        ],
      };

      const [totalOwn, totalAll] = await Promise.all([
        prisma.cbtBankSoal.count({ where: ownWhere }).catch(() => 0),
        prisma.cbtBankSoal.count({ where: allWhere }).catch(() => 0),
      ]);

      countsMeta = {
        all: totalAll,
        own: totalOwn,
        shared: Math.max(0, totalAll - totalOwn),
      };
    }

    const [total, rawItems] = await Promise.all([
      prisma.cbtBankSoal.count({ where }),
      prisma.cbtBankSoal.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
        include: this.bankInclude,
      }),
    ]);

    const items = await this.enrichBankCollaborationMeta(tenantId, rawItems);

    return {
      items,
      pagination: {
        page,
        limit,
        totalItems: total,
        totalPages: Math.ceil(total / limit) || 1,
      },
      counts: countsMeta,
    };
  }

  /**
   * Mengambil detail Bank Soal beserta relasi & kontributor
   */
  static async getById(tenantId: string, id: string) {
    const bankSoal = await prisma.cbtBankSoal.findFirst({
      where: { id, tenant_id: tenantId },
      include: this.bankInclude,
    });

    if (!bankSoal) {
      throw new Error('Bank soal tidak ditemukan');
    }

    const [enriched] = await this.enrichBankCollaborationMeta(tenantId, [bankSoal]);
    return enriched;
  }

  /**
   * Sinkronisasi & Auto-Registrasi Kontributor Bank Soal di Database (`CbtBankSoalKontributor`):
   * - Jika bank adalah bank resmi gabungan/kolaborasi (`unit_pengajaran_id = null`), otomatis mendaftarkan:
   *   1) Semua guru UnitPengajaran aktif pada Mapel Induk + TP/Semester yang sesuai
   *   2) Semua `guru_pelaksana_id` (Delegasi) aktif pada JadwalKBM Mapel tersebut
   *   3) Opsional: daftar kontributor manual tambahan
   */
  static async syncCollaborationContributors(
    tenantId: string,
    bankSoalId: string,
    options?: {
      manualContributors?: Array<{ guru_id: string; unit_pengajaran_id?: string | null }>;
      replaceExisting?: boolean;
    }
  ) {
    const bank = await prisma.cbtBankSoal.findFirst({
      where: { id: bankSoalId, tenant_id: tenantId },
      select: {
        id: true,
        guru_id: true,
        mapel_id: true,
        tahun_pelajaran_id: true,
        semester_id: true,
        unit_pengajaran_id: true,
      },
    });
    if (!bank) {
      throw new Error('Bank soal tidak ditemukan');
    }

    const { tahun_pelajaran_id: tpId, semester_id: semId } = await this.resolveAcademicContext(
      tenantId,
      bank.tahun_pelajaran_id,
      bank.semester_id
    );

    const desiredMap = new Map<string, string | null>(); // guru_id -> unit_pengajaran_id

    if (options?.manualContributors) {
      for (const c of options.manualContributors) {
        if (c.guru_id) {
          desiredMap.set(c.guru_id, c.unit_pengajaran_id ?? null);
        }
      }
    }

    // Auto-registrasi guru UnitPengajaran & Delegasi saat mode Kolaborasi/Combined (unit_pengajaran_id === null)
    if (!bank.unit_pengajaran_id && !options?.replaceExisting) {
      const [collabUnits, activeDelegations] = await Promise.all([
        prisma.unitPengajaran.findMany({
          where: {
            tenant_id: tenantId,
            mapel_id: bank.mapel_id,
            is_active: true,
            ...(tpId ? { tahun_pelajaran_id: tpId } : {}),
            ...(semId ? { semester_id: semId } : {}),
            GuruMapel: { teaching_mode: 'COLLABORATION' },
          },
          select: { id: true, guru_id: true },
        }),
        prisma.jadwalKBM.findMany({
          where: {
            tenant_id: tenantId,
            mapel_id: bank.mapel_id,
            ...(tpId ? { tahun_pelajaran_id: tpId } : {}),
            ...(semId ? { semester_id: semId } : {}),
            guru_pelaksana_id: { not: null },
          },
          select: { guru_pelaksana_id: true, unit_pengajaran_id: true },
        }),
      ]);

      for (const u of collabUnits) {
        if (u.guru_id && !desiredMap.has(u.guru_id)) {
          desiredMap.set(u.guru_id, u.id);
        }
      }
      for (const d of activeDelegations) {
        if (d.guru_pelaksana_id && !desiredMap.has(d.guru_pelaksana_id)) {
          desiredMap.set(d.guru_pelaksana_id, d.unit_pengajaran_id ?? null);
        }
      }
    } else if (bank.unit_pengajaran_id && !options?.replaceExisting) {
      // Kuis Unit: sinkronkan delegasi guru pelaksana pada unit ini (jika ada)
      const [unit, unitDelegations] = await Promise.all([
        prisma.unitPengajaran.findFirst({
          where: { id: bank.unit_pengajaran_id, tenant_id: tenantId },
          select: { id: true, guru_id: true },
        }),
        prisma.jadwalKBM.findMany({
          where: {
            tenant_id: tenantId,
            unit_pengajaran_id: bank.unit_pengajaran_id,
            guru_pelaksana_id: { not: null },
          },
          select: { guru_pelaksana_id: true },
        }),
      ]);
      if (unit?.guru_id && unit.guru_id !== bank.guru_id && !desiredMap.has(unit.guru_id)) {
        desiredMap.set(unit.guru_id, unit.id);
      }
      for (const d of unitDelegations) {
        if (d.guru_pelaksana_id && !desiredMap.has(d.guru_pelaksana_id)) {
          desiredMap.set(d.guru_pelaksana_id, bank.unit_pengajaran_id);
        }
      }
    }

    await prisma.$transaction(async (tx) => {
      if (options?.replaceExisting) {
        const keepGuruIds = Array.from(desiredMap.keys());
        await tx.cbtBankSoalKontributor.deleteMany({
          where: {
            tenant_id: tenantId,
            bank_soal_id: bankSoalId,
            ...(keepGuruIds.length > 0 ? { guru_id: { notIn: keepGuruIds } } : {}),
          },
        });
      }

      for (const [guruId, unitId] of desiredMap.entries()) {
        await tx.cbtBankSoalKontributor.upsert({
          where: {
            bank_soal_id_guru_id: {
              bank_soal_id: bankSoalId,
              guru_id: guruId,
            },
          },
          create: {
            tenant_id: tenantId,
            bank_soal_id: bankSoalId,
            guru_id: guruId,
            unit_pengajaran_id: unitId,
          },
          update: {
            ...(unitId ? { unit_pengajaran_id: unitId } : {}),
          },
        });
      }
    });

    return this.listContributors(tenantId, bankSoalId);
  }

  /**
   * Sync otomatis kontributor CBT ketika `JadwalKBM.guru_pelaksana_id` atau `UnitPengajaran` berubah.
   */
  static async syncContributorsForMapelDelegationChange(
    tenantId: string,
    mapelId: string,
    tahunPelajaranId?: string | null,
    semesterId?: string | null
  ) {
    const banks = await prisma.cbtBankSoal.findMany({
      where: {
        tenant_id: tenantId,
        mapel_id: mapelId,
        ...(tahunPelajaranId
          ? { OR: [{ tahun_pelajaran_id: tahunPelajaranId }, { tahun_pelajaran_id: null }] }
          : {}),
        ...(semesterId
          ? { OR: [{ semester_id: semesterId }, { semester_id: null }] }
          : {}),
      },
      select: { id: true },
    });

    for (const b of banks) {
      await this.syncCollaborationContributors(tenantId, b.id).catch((err) => {
        console.warn('[CbtBankSoalService] Gagal sinkronisasi kontributor bank soal:', b.id, err?.message);
      });
    }
    return { synced_banks: banks.length };
  }

  /**
   * Daftar kontributor DB + kandidat guru UnitPengajaran/Delegasi pada Mapel Bank Soal ini.
   */
  static async listContributors(tenantId: string, bankSoalId: string) {
    const bank = await prisma.cbtBankSoal.findFirst({
      where: { id: bankSoalId, tenant_id: tenantId },
      select: {
        id: true,
        guru_id: true,
        mapel_id: true,
        tahun_pelajaran_id: true,
        semester_id: true,
        unit_pengajaran_id: true,
      },
    });
    if (!bank) {
      throw new Error('Bank soal tidak ditemukan');
    }

    const { tahun_pelajaran_id: tpId, semester_id: semId } = await this.resolveAcademicContext(
      tenantId,
      bank.tahun_pelajaran_id,
      bank.semester_id
    );

    const [contributors, eligibleUnits, delegatedSchedules] = await Promise.all([
      prisma.cbtBankSoalKontributor.findMany({
        where: { tenant_id: tenantId, bank_soal_id: bankSoalId },
        include: {
          Guru: { select: { id: true, nama_guru: true, nip: true } },
          UnitPengajaran: { select: { id: true, nama_unit: true, target_sumatif_slot: true } },
        },
        orderBy: { created_at: 'asc' },
      }),
      prisma.unitPengajaran.findMany({
        where: {
          tenant_id: tenantId,
          mapel_id: bank.mapel_id,
          is_active: true,
          ...(tpId ? { tahun_pelajaran_id: tpId } : {}),
          ...(semId ? { semester_id: semId } : {}),
        },
        include: {
          Guru: { select: { id: true, nama_guru: true, nip: true } },
        },
        orderBy: { urutan: 'asc' },
      }),
      prisma.jadwalKBM.findMany({
        where: {
          tenant_id: tenantId,
          mapel_id: bank.mapel_id,
          ...(tpId ? { tahun_pelajaran_id: tpId } : {}),
          ...(semId ? { semester_id: semId } : {}),
          guru_pelaksana_id: { not: null },
        },
        select: {
          guru_pelaksana_id: true,
          unit_pengajaran_id: true,
          GuruPelaksana: { select: { id: true, nama_guru: true, nip: true } },
        },
      }),
    ]);

    return {
      bank_soal_id: bankSoalId,
      contributors,
      eligible_units: eligibleUnits,
      delegated_teachers: delegatedSchedules
        .filter((d) => Boolean(d.GuruPelaksana))
        .map((d) => ({
          guru_id: d.guru_pelaksana_id!,
          unit_pengajaran_id: d.unit_pengajaran_id,
          Guru: d.GuruPelaksana!,
        })),
    };
  }

  /**
   * Verifikasi apakah user/guru berhak mengelola (tambah/edit/hapus) butir soal pada Bank Soal ini:
   * - ADMIN / SUPERADMIN / KURIKULUM / KEPSEK diizinkan penuh
   * - Pemilik (`CbtBankSoal.guru_id`), Kontributor terdaftar di `CbtBankSoalKontributor`,
   *   guru `UnitPengajaran`, atau guru delegasi (`guru_pelaksana_id`) aktif diizinkan edit soal
   */
  private static async assertQuestionEditAccess(
    tenantId: string,
    bankSoal: { id: string; guru_id: string; mapel_id: string; unit_pengajaran_id?: string | null },
    user?: { roleName?: string; guru_profile?: { id: string } | null }
  ) {
    if (!user) return;
    const roleUpper = String(user.roleName || '').toUpperCase();
    if (['ADMIN', 'SUPERADMIN', 'KURIKULUM', 'KEPSEK'].includes(roleUpper)) return;

    const guruId = user.guru_profile?.id;
    if (!guruId) return;
    if (bankSoal.guru_id === guruId) return;

    const [kontributor, unitTeach, delegated] = await Promise.all([
      prisma.cbtBankSoalKontributor.findFirst({
        where: { tenant_id: tenantId, bank_soal_id: bankSoal.id, guru_id: guruId },
        select: { id: true },
      }),
      bankSoal.unit_pengajaran_id
        ? prisma.unitPengajaran.findFirst({
            where: { id: bankSoal.unit_pengajaran_id, tenant_id: tenantId, guru_id: guruId, is_active: true },
            select: { id: true },
          })
        : Promise.resolve(null),
      prisma.jadwalKBM.findFirst({
        where: { tenant_id: tenantId, mapel_id: bankSoal.mapel_id, guru_pelaksana_id: guruId },
        select: { id: true },
      }),
    ]);

    if (!kontributor && !unitTeach && !delegated) {
      throw new Error(
        'Akses ditolak: Hanya pemilik, kontributor kolaborasi, atau guru delegasi aktif pada mapel ini yang dapat mengelola butir soal.'
      );
    }
  }

  /**
   * Validasi & resolusi `unit_pengajaran_id` untuk sebuah butir soal
   */
  private static async resolveQuestionUnitId(
    tenantId: string,
    bank: { id: string; mapel_id: string; unit_pengajaran_id?: string | null },
    requestedUnitId?: string | null,
    user?: { guru_profile?: { id: string } | null }
  ): Promise<string | null> {
    if (requestedUnitId !== undefined) {
      if (!requestedUnitId) return null;
      const unit = await prisma.unitPengajaran.findFirst({
        where: { id: requestedUnitId, tenant_id: tenantId, mapel_id: bank.mapel_id },
        select: { id: true },
      });
      if (!unit) {
        throw new Error('Unit Pengajaran butir soal tidak valid atau berbeda mata pelajaran.');
      }
      return unit.id;
    }

    if (bank.unit_pengajaran_id) {
      return bank.unit_pengajaran_id;
    }

    const guruId = user?.guru_profile?.id;
    if (guruId) {
      const contrib = await prisma.cbtBankSoalKontributor.findFirst({
        where: { tenant_id: tenantId, bank_soal_id: bank.id, guru_id: guruId },
        select: { unit_pengajaran_id: true },
      });
      if (contrib?.unit_pengajaran_id) {
        return contrib.unit_pengajaran_id;
      }
    }

    return null;
  }

  private static parseTingkatNumber(raw: unknown): number | null {
    if (raw === null || raw === undefined || raw === '') return null;
    const num = Number(raw);
    if (Number.isInteger(num) && num >= 1 && num <= 13) return num;
    if (typeof raw === 'string') {
      const romanMap: Record<string, number> = {
        I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6,
        VII: 7, VIII: 8, IX: 9, X: 10, XI: 11, XII: 12, XIII: 13,
      };
      return romanMap[raw.toUpperCase().trim()] ?? null;
    }
    return null;
  }

  private static async resolveBankPrecisionFields(tenantId: string, data: any) {
    const tingkatNum =
      data.tingkat_num !== undefined
        ? data.tingkat_num
        : data.tingkat !== undefined
        ? this.parseTingkatNumber(data.tingkat)
        : undefined;

    let resolvedJurusan = data.jurusan;
    let resolvedJurusanId = data.jurusan_id;
    let resolvedTargetJurusanIds = data.target_jurusan_ids;

    const explicitIds: string[] | null = Array.isArray(data.target_jurusan_ids)
      ? Array.from(new Set(data.target_jurusan_ids.filter(Boolean)))
      : data.jurusan_id
      ? [data.jurusan_id]
      : null;

    if (explicitIds !== null) {
      if (explicitIds.length === 0) {
        resolvedJurusanId = null;
        resolvedTargetJurusanIds = null;
        if (resolvedJurusan === undefined) resolvedJurusan = null;
      } else {
        const jurRows = await prisma.jurusan.findMany({
          where: { tenant_id: tenantId, id: { in: explicitIds } },
          select: { id: true, kode: true, singkatan: true, nama: true },
        });
        const validIds = jurRows.map((j) => j.id);
        resolvedTargetJurusanIds = validIds.length > 0 ? validIds : null;
        resolvedJurusanId = validIds.length === 1 ? validIds[0] : null;
        if (resolvedJurusan === undefined && jurRows.length > 0) {
          resolvedJurusan = jurRows
            .map((j) => (j.kode || j.singkatan || j.nama).toUpperCase().trim())
            .join(', ');
        }
      }
    } else if (data.jurusan !== undefined) {
      const rawJur = String(data.jurusan || '').trim();
      const upper = rawJur.toUpperCase();
      if (!rawJur || upper === 'SEMUA' || upper === 'UMUM') {
        resolvedJurusanId = null;
        resolvedTargetJurusanIds = null;
      } else {
        const tokens = upper.split(/[,;/|]+/).map((s) => s.trim()).filter(Boolean);
        const allJurusans = await prisma.jurusan.findMany({
          where: { tenant_id: tenantId },
          select: { id: true, kode: true, singkatan: true, nama: true },
        });
        const matchedIds = allJurusans
          .filter((j) => {
            const codes = [j.kode, j.singkatan, j.nama]
              .filter(Boolean)
              .map((s) => String(s).toUpperCase().trim());
            return tokens.some((tok) => codes.includes(tok));
          })
          .map((j) => j.id);
        resolvedTargetJurusanIds = matchedIds.length > 0 ? matchedIds : null;
        resolvedJurusanId = matchedIds.length === 1 ? matchedIds[0] : null;
      }
    }

    return {
      tingkatNum,
      resolvedJurusan,
      resolvedJurusanId,
      resolvedTargetJurusanIds,
    };
  }

  /**
   * Membuat Bank Soal baru (termasuk binding TP/Semester/Unit & Auto-Sync Kontributor DB)
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

    if (data.unit_pengajaran_id) {
      const unit = await prisma.unitPengajaran.findFirst({
        where: { id: data.unit_pengajaran_id, tenant_id: tenantId },
        select: { id: true, mapel_id: true },
      });
      if (!unit) {
        throw new Error('Unit Pengajaran tidak ditemukan pada tenant ini.');
      }
      if (unit.mapel_id !== data.mapel_id) {
        throw new Error('Unit Pengajaran harus berasal dari mata pelajaran induk yang sama.');
      }
    }

    const { tahun_pelajaran_id: resolvedTpId, semester_id: resolvedSemId } =
      await this.resolveAcademicContext(tenantId, data.tahun_pelajaran_id, data.semester_id);

    const resolvedStatus =
      data.status || (data.is_shared ? 'PUBLISHED' : 'DRAFT');

    // 2. Guard Validasi Duplikasi Bank Soal Resmi MGMP / Terpusat
    // Hanya berlaku jika bank soal ini adalah naskah bersama (is_shared: true)
    if (
      !data.bypass_mgmp_guard &&
      Boolean(data.is_shared) &&
      !data.unit_pengajaran_id // Khusus bank soal evaluasi umum/resmi, bukan kuis sub-unit
    ) {
      const rawTingkat = String(data.tingkat || '').trim().toUpperCase();
      const tingkatVariants = [rawTingkat];
      const ROMAN_MAP: Record<string, string> = {
        '10': 'X', '11': 'XI', '12': 'XII', '13': 'XIII',
        'X': '10', 'XI': '11', 'XII': '12', 'XIII': '13',
      };
      if (ROMAN_MAP[rawTingkat]) {
        tingkatVariants.push(ROMAN_MAP[rawTingkat]);
      }

      const targetJurusan = (data.jurusan || '').trim().toUpperCase();

      const existingMgmpBank = await prisma.cbtBankSoal.findFirst({
        where: {
          tenant_id: tenantId,
          mapel_id: data.mapel_id,
          tingkat: { in: tingkatVariants },
          ...(resolvedTpId ? { tahun_pelajaran_id: resolvedTpId } : {}),
          ...(resolvedSemId ? { semester_id: resolvedSemId } : {}),
          ...(data.event_id ? { event_id: data.event_id } : {}),
          status: 'PUBLISHED',
          unit_pengajaran_id: null,
          guru_id: { not: data.guru_id },
          OR: [
            { jurusan: null },
            { jurusan: '' },
            { jurusan: 'SEMUA' },
            ...(targetJurusan ? [{ jurusan: targetJurusan }] : []),
          ],
        },
        include: {
          Guru: { select: { nama_guru: true } },
          Mapel: { select: { nama_mapel: true } },
        },
      });

      if (existingMgmpBank) {
        const author = existingMgmpBank.Guru?.nama_guru || 'Ketua/Rekan MGMP';
        const mapelName = existingMgmpBank.Mapel?.nama_mapel || 'Mata Pelajaran ini';
        throw new Error(
          `Bank Soal resmi untuk ${mapelName} Tingkat ${rawTingkat} sudah disusun oleh ${author} (${existingMgmpBank.kode_bank}). Anda tidak perlu membuat soal baru lagi, silakan gunakan paket tersebut atau hubungi penyusun untuk kolaborasi.`
        );
      }
    }

    const precision = await this.resolveBankPrecisionFields(tenantId, data);

    const created = await prisma.cbtBankSoal.create({
      data: {
        tenant_id: tenantId,
        guru_id: data.guru_id,
        mapel_id: data.mapel_id,
        tahun_pelajaran_id: resolvedTpId,
        semester_id: resolvedSemId,
        event_id: data.event_id || null,
        unit_pengajaran_id: data.unit_pengajaran_id || null,
        kode_bank: data.kode_bank.toUpperCase().trim(),
        judul: data.judul.trim(),
        tingkat: data.tingkat,
        tingkat_num: precision.tingkatNum ?? null,
        jurusan: precision.resolvedJurusan || null,
        jurusan_id: precision.resolvedJurusanId ?? null,
        target_jurusan_ids: precision.resolvedTargetJurusanIds ?? undefined,
        alokasi_menit: data.alokasi_menit ?? 60,
        acak_soal: data.acak_soal ?? true,
        acak_opsi: data.acak_opsi ?? true,
        status: resolvedStatus,
        is_shared: Boolean(data.is_shared),
      },
      include: this.bankInclude,
    });

    const manualContribs: Array<{ guru_id: string; unit_pengajaran_id?: string | null }> = [
      ...(Array.isArray(data.contributors) ? data.contributors : []),
      ...((Array.isArray(data.contributor_guru_ids) ? data.contributor_guru_ids : []).map((gid: string) => ({
        guru_id: gid,
        unit_pengajaran_id: null,
      }))),
    ];

    if (manualContribs.length > 0 || data.auto_sync_kolaborasi !== false) {
      await this.syncCollaborationContributors(tenantId, created.id, {
        manualContributors: manualContribs,
      });
    }

    return this.getById(tenantId, created.id);
  }

  /**
   * Mengupdate Bank Soal
   */
  static async update(tenantId: string, id: string, data: any) {
    const existingBank = await this.getById(tenantId, id);

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

    const effectiveMapelId = data.mapel_id || existingBank.mapel_id;
    if (data.unit_pengajaran_id) {
      const unit = await prisma.unitPengajaran.findFirst({
        where: { id: data.unit_pengajaran_id, tenant_id: tenantId },
        select: { id: true, mapel_id: true },
      });
      if (!unit || unit.mapel_id !== effectiveMapelId) {
        throw new Error('Unit Pengajaran tidak valid untuk mata pelajaran bank soal ini.');
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

    const precision = await this.resolveBankPrecisionFields(tenantId, data);

    await prisma.cbtBankSoal.update({
      where: { id },
      data: {
        ...(data.guru_id ? { guru_id: data.guru_id } : {}),
        ...(data.mapel_id ? { mapel_id: data.mapel_id } : {}),
        ...(data.tahun_pelajaran_id !== undefined ? { tahun_pelajaran_id: data.tahun_pelajaran_id } : {}),
        ...(data.semester_id !== undefined ? { semester_id: data.semester_id } : {}),
        ...(data.unit_pengajaran_id !== undefined ? { unit_pengajaran_id: data.unit_pengajaran_id } : {}),
        ...(data.kode_bank ? { kode_bank: data.kode_bank.toUpperCase().trim() } : {}),
        ...(data.judul ? { judul: data.judul.trim() } : {}),
        ...(data.tingkat ? { tingkat: data.tingkat } : {}),
        ...(precision.tingkatNum !== undefined ? { tingkat_num: precision.tingkatNum } : {}),
        ...(precision.resolvedJurusan !== undefined ? { jurusan: precision.resolvedJurusan } : {}),
        ...(precision.resolvedJurusanId !== undefined ? { jurusan_id: precision.resolvedJurusanId } : {}),
        ...(precision.resolvedTargetJurusanIds !== undefined
          ? { target_jurusan_ids: precision.resolvedTargetJurusanIds === null ? null : precision.resolvedTargetJurusanIds }
          : {}),
        ...(data.alokasi_menit !== undefined ? { alokasi_menit: data.alokasi_menit } : {}),
        ...(data.acak_soal !== undefined ? { acak_soal: data.acak_soal } : {}),
        ...(data.acak_opsi !== undefined ? { acak_opsi: data.acak_opsi } : {}),
        ...(resolvedStatus ? { status: resolvedStatus } : {}),
        ...(data.is_shared !== undefined ? { is_shared: Boolean(data.is_shared) } : {}),
      },
    });

    if (Array.isArray(data.contributors) || Array.isArray(data.contributor_guru_ids)) {
      const manualContribs: Array<{ guru_id: string; unit_pengajaran_id?: string | null }> = [
        ...(Array.isArray(data.contributors) ? data.contributors : []),
        ...((Array.isArray(data.contributor_guru_ids) ? data.contributor_guru_ids : []).map((gid: string) => ({
          guru_id: gid,
          unit_pengajaran_id: null,
        }))),
      ];
      await this.syncCollaborationContributors(tenantId, id, {
        manualContributors: manualContribs,
        replaceExisting: true,
      });
    } else if (data.unit_pengajaran_id !== undefined || data.mapel_id !== undefined) {
      await this.syncCollaborationContributors(tenantId, id);
    }

    // Invalidate Redis bundle cache jadwal aktif agar perubahan parameter langsung berlaku
    await this.invalidateActiveJadwalBundleCaches(tenantId, id);

    return this.getById(tenantId, id);
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
          tahun_pelajaran_id: source.tahun_pelajaran_id,
          semester_id: source.semester_id,
          event_id: source.event_id,
          unit_pengajaran_id: source.unit_pengajaran_id,
          kode_bank: newCode,
          judul: `${source.judul} (Salinan)`,
          tingkat: source.tingkat,
          tingkat_num: source.tingkat_num,
          jurusan: source.jurusan,
          jurusan_id: source.jurusan_id,
          target_jurusan_ids: source.target_jurusan_ids as any,
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
            unit_pengajaran_id: s.unit_pengajaran_id,
            nomor_urut: idx + 1,
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
   * Rollover Bank Soal (beserta seluruh butir soalnya) dari event/TP/semester sebelumnya ke event target
   */
  static async rollover(
    tenantId: string,
    params: {
      bank_soal_ids?: string[];
      source_event_id?: string;
      source_tahun_pelajaran_id?: string;
      source_semester_id?: string;
      target_event_id: string;
      target_tahun_pelajaran_id?: string;
      target_semester_id?: string;
      guru_id?: string;
      keep_status?: boolean;
    }
  ) {
    const { tahun_pelajaran_id: resolvedTargetTpId, semester_id: resolvedTargetSemId } =
      await this.resolveAcademicContext(
        tenantId,
        params.target_tahun_pelajaran_id,
        params.target_semester_id
      );

    const sourceWhere: Prisma.CbtBankSoalWhereInput = {
      tenant_id: tenantId,
      ...(params.guru_id ? { guru_id: params.guru_id } : {}),
    };

    if (Array.isArray(params.bank_soal_ids) && params.bank_soal_ids.length > 0) {
      sourceWhere.id = { in: params.bank_soal_ids };
    } else {
      if (params.source_event_id) sourceWhere.event_id = params.source_event_id;
      if (params.source_tahun_pelajaran_id) sourceWhere.tahun_pelajaran_id = params.source_tahun_pelajaran_id;
      if (params.source_semester_id) sourceWhere.semester_id = params.source_semester_id;
    }

    const sources = await prisma.cbtBankSoal.findMany({
      where: sourceWhere,
      include: {
        Soal: { orderBy: { nomor_urut: 'asc' } },
      },
      orderBy: { created_at: 'asc' },
    });

    if (sources.length === 0) {
      return { created_count: 0, skipped_count: 0, created_ids: [] as string[] };
    }

    // Cek duplikasi yang sudah pernah di-rollover ke event target
    const existingTargetBanks = await prisma.cbtBankSoal.findMany({
      where: {
        tenant_id: tenantId,
        event_id: params.target_event_id,
      },
      select: { guru_id: true, mapel_id: true, judul: true, tingkat: true, jurusan_id: true },
    });

    const existingKeys = new Set(
      existingTargetBanks.map(
        (b) => `${b.guru_id}__${b.mapel_id}__${b.tingkat}__${b.jurusan_id || ''}__${b.judul.trim().toLowerCase()}`
      )
    );

    const createdIds: string[] = [];
    let skippedCount = 0;

    for (const source of sources) {
      const dedupKey = `${source.guru_id}__${source.mapel_id}__${source.tingkat}__${source.jurusan_id || ''}__${source.judul.trim().toLowerCase()}`;
      if (existingKeys.has(dedupKey)) {
        skippedCount++;
        continue;
      }

      const randSuffix = Math.floor(10000 + Math.random() * 90000);
      const newCode = `CBT-${new Date().getFullYear()}-${randSuffix}`;
      const nextStatus =
        params.keep_status !== false && source.status !== 'ARCHIVED' ? source.status : 'DRAFT';

      const cloned = await prisma.$transaction(async (tx) => {
        const bank = await tx.cbtBankSoal.create({
          data: {
            tenant_id: tenantId,
            guru_id: source.guru_id,
            mapel_id: source.mapel_id,
            tahun_pelajaran_id: resolvedTargetTpId,
            semester_id: resolvedTargetSemId,
            event_id: params.target_event_id,
            unit_pengajaran_id: source.unit_pengajaran_id,
            kode_bank: newCode,
            judul: source.judul,
            tingkat: source.tingkat,
            tingkat_num: source.tingkat_num,
            jurusan: source.jurusan,
            jurusan_id: source.jurusan_id,
            target_jurusan_ids: source.target_jurusan_ids as any,
            jumlah_soal: source.Soal.length,
            alokasi_menit: source.alokasi_menit,
            acak_soal: source.acak_soal,
            acak_opsi: source.acak_opsi,
            status: nextStatus,
            is_shared: source.is_shared,
          },
        });

        if (source.Soal.length > 0) {
          await tx.cbtSoal.createMany({
            data: source.Soal.map((s, idx) => ({
              tenant_id: tenantId,
              bank_soal_id: bank.id,
              unit_pengajaran_id: s.unit_pengajaran_id,
              nomor_urut: idx + 1,
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

        return bank;
      });

      existingKeys.add(dedupKey);
      createdIds.push(cloned.id);
    }

    return {
      created_count: createdIds.length,
      skipped_count: skippedCount,
      created_ids: createdIds,
    };
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
   * Helper: Invalidate bundle cache di Redis untuk seluruh jadwal ujian aktif / dijeda / draft
   * yang mereferensikan bank_soal_id ini.
   * Menjamin bahwa saat butir soal, teks, atau gambar stimulus diperbaiki di Bank Soal,
   * siswa yang me-refresh ujian langsung mendapatkan butir soal versi terbaru tanpa menunggu cache TTL 24 jam.
   */
  private static async invalidateActiveJadwalBundleCaches(tenantId: string, bankSoalId: string): Promise<void> {
    try {
      const activeJadwals = await prisma.cbtJadwalUjian.findMany({
        where: {
          tenant_id: tenantId,
          bank_soal_id: bankSoalId,
          status: { in: ['ACTIVE', 'PAUSED', 'DRAFT'] },
        },
        select: { id: true },
      });

      const redis = getRedisConnection();
      if (redis && activeJadwals.length > 0) {
        for (const j of activeJadwals) {
          await redis.del(`cbt:${tenantId}:bundle:${j.id}`).catch(() => null);
        }
      }
    } catch (err) {
      console.warn('[CbtBankSoalService] Gagal invalidate Redis bundle cache:', err);
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
   * Mengambil seluruh butir soal dari suatu Bank Soal (termasuk metadata UnitPengajaran soal)
   */
  static async listQuestions(tenantId: string, bankSoalId: string) {
    await this.getById(tenantId, bankSoalId);

    return prisma.cbtSoal.findMany({
      where: {
        tenant_id: tenantId,
        bank_soal_id: bankSoalId,
      },
      include: {
        UnitPengajaran: {
          select: {
            id: true,
            nama_unit: true,
            guru_id: true,
            target_sumatif_slot: true,
            Guru: { select: { id: true, nama_guru: true } },
          },
        },
      },
      orderBy: { nomor_urut: 'asc' },
    });
  }

  /**
   * Menambahkan satu butir soal ke Bank Soal (mendukung tagging `unit_pengajaran_id` & akses kontributor)
   */
  static async createQuestion(tenantId: string, bankSoalId: string, data: any, user?: any) {
    const bank = await this.getById(tenantId, bankSoalId);
    await this.assertQuestionEditAccess(tenantId, bank, user);
    const resolvedUnitId = await this.resolveQuestionUnitId(
      tenantId,
      bank,
      data.unit_pengajaran_id,
      user
    );

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
          unit_pengajaran_id: resolvedUnitId,
          nomor_urut: nomorUrut,
          jenis_soal: 'PG',
          konten_pertanyaan: data.konten_pertanyaan,
          gambar_stimulus_url: data.gambar_stimulus_url || null,
          bobot: data.bobot ?? 1.0,
          opsi_jawaban_json: data.opsi_jawaban_json,
          kunci_jawaban: data.kunci_jawaban,
          pembahasan: data.pembahasan || null,
        },
        include: {
          UnitPengajaran: {
            select: {
              id: true,
              nama_unit: true,
              guru_id: true,
              Guru: { select: { id: true, nama_guru: true } },
            },
          },
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

    // Invalidate Redis bundle cache jadwal aktif agar penambahan soal baru langsung tersinkron
    await this.invalidateActiveJadwalBundleCaches(tenantId, bankSoalId);

    return created;
  }

  /**
   * Mengupdate butir soal (sekaligus membersihkan file gambar lama jika diganti/dihapus)
   */
  static async updateQuestion(tenantId: string, questionId: string, data: any, user?: any) {
    const existing = await prisma.cbtSoal.findFirst({
      where: { id: questionId, tenant_id: tenantId },
      include: {
        BankSoal: {
          select: { id: true, guru_id: true, mapel_id: true, unit_pengajaran_id: true },
        },
      },
    });

    if (!existing) {
      throw new Error('Butir soal tidak ditemukan');
    }

    await this.assertQuestionEditAccess(tenantId, existing.BankSoal, user);

    let unitUpdate: string | null | undefined = undefined;
    if (data.unit_pengajaran_id !== undefined) {
      unitUpdate = await this.resolveQuestionUnitId(
        tenantId,
        existing.BankSoal,
        data.unit_pengajaran_id,
        user
      );
    }

    const oldUrls = this.extractMediaUrlsFromSoalList([existing]);

    const updated = await prisma.cbtSoal.update({
      where: { id: questionId },
      data: {
        ...(unitUpdate !== undefined ? { unit_pengajaran_id: unitUpdate } : {}),
        ...(data.nomor_urut !== undefined ? { nomor_urut: data.nomor_urut } : {}),
        ...(data.konten_pertanyaan ? { konten_pertanyaan: data.konten_pertanyaan } : {}),
        ...(data.gambar_stimulus_url !== undefined ? { gambar_stimulus_url: data.gambar_stimulus_url } : {}),
        ...(data.bobot !== undefined ? { bobot: data.bobot } : {}),
        ...(data.opsi_jawaban_json ? { opsi_jawaban_json: data.opsi_jawaban_json } : {}),
        ...(data.kunci_jawaban ? { kunci_jawaban: data.kunci_jawaban } : {}),
        ...(data.pembahasan !== undefined ? { pembahasan: data.pembahasan } : {}),
      },
      include: {
        UnitPengajaran: {
          select: {
            id: true,
            nama_unit: true,
            guru_id: true,
            Guru: { select: { id: true, nama_guru: true } },
          },
        },
      },
    });

    const newUrls = new Set(this.extractMediaUrlsFromSoalList([updated]));
    const removedUrls = oldUrls.filter((u) => !newUrls.has(u));

    if (removedUrls.length > 0) {
      await this.cleanupUnusedMediaUrls(tenantId, removedUrls);
    }

    // Invalidate Redis bundle cache jadwal aktif agar koreksi teks/gambar/kunci langsung berlaku seketika
    await this.invalidateActiveJadwalBundleCaches(tenantId, existing.bank_soal_id);

    return updated;
  }

  /**
   * Menghapus butir soal beserta file gambarnya di Storage Engine
   */
  static async deleteQuestion(tenantId: string, questionId: string, user?: any) {
    const existing = await prisma.cbtSoal.findFirst({
      where: { id: questionId, tenant_id: tenantId },
      include: {
        BankSoal: {
          select: { id: true, guru_id: true, mapel_id: true, unit_pengajaran_id: true },
        },
      },
    });

    if (!existing) {
      throw new Error('Butir soal tidak ditemukan');
    }

    await this.assertQuestionEditAccess(tenantId, existing.BankSoal, user);

    const candidateMediaUrls = this.extractMediaUrlsFromSoalList([existing]);

    const result = await prisma.$transaction(async (tx) => {
      await tx.cbtSoal.delete({
        where: { id: questionId },
      });

      // Renormalisasi nomor urut butir soal yang tersisa agar tetap sekuensial (1..N) tanpa celah/lompatan
      const remainingQuestions = await tx.cbtSoal.findMany({
        where: { tenant_id: tenantId, bank_soal_id: existing.bank_soal_id },
        orderBy: [{ nomor_urut: 'asc' }, { created_at: 'asc' }],
        select: { id: true, nomor_urut: true },
      });

      for (let i = 0; i < remainingQuestions.length; i++) {
        const expectedNomor = i + 1;
        if (remainingQuestions[i].nomor_urut !== expectedNomor) {
          await tx.cbtSoal.update({
            where: { id: remainingQuestions[i].id },
            data: { nomor_urut: expectedNomor },
          });
        }
      }

      const totalSoal = remainingQuestions.length;

      await tx.cbtBankSoal.update({
        where: { id: existing.bank_soal_id },
        data: { jumlah_soal: totalSoal },
      });

      return { success: true };
    });

    await this.cleanupUnusedMediaUrls(tenantId, candidateMediaUrls);

    // Invalidate Redis bundle cache jadwal aktif
    await this.invalidateActiveJadwalBundleCaches(tenantId, existing.bank_soal_id);

    return result;
  }

  /**
   * Kosongkan seluruh butir soal dalam 1 Bank Soal (dengan pembersihan media & cache)
   */
  static async clearAllQuestions(tenantId: string, bankSoalId: string, user?: any) {
    const bank = await this.getById(tenantId, bankSoalId);
    await this.assertQuestionEditAccess(tenantId, bank, user);

    const existingList = await prisma.cbtSoal.findMany({
      where: { tenant_id: tenantId, bank_soal_id: bankSoalId },
    });

    if (existingList.length === 0) {
      return { deletedCount: 0 };
    }

    const candidateMediaUrls = this.extractMediaUrlsFromSoalList(existingList);

    const deletedCount = await prisma.$transaction(async (tx) => {
      const del = await tx.cbtSoal.deleteMany({
        where: { tenant_id: tenantId, bank_soal_id: bankSoalId },
      });

      await tx.cbtBankSoal.update({
        where: { id: bankSoalId },
        data: { jumlah_soal: 0 },
      });

      return del.count;
    });

    await this.cleanupUnusedMediaUrls(tenantId, candidateMediaUrls);
    await this.invalidateActiveJadwalBundleCaches(tenantId, bankSoalId);

    return { deletedCount };
  }

  /**
   * Bulk Import butir soal (misal dari hasil parser Excel / Word)
   */
  static async bulkImportQuestions(tenantId: string, bankSoalId: string, items: any[], user?: any) {
    const bank = await this.getById(tenantId, bankSoalId);
    await this.assertQuestionEditAccess(tenantId, bank, user);
    const defaultUnitId = await this.resolveQuestionUnitId(tenantId, bank, undefined, user);

    const result = await prisma.$transaction(async (tx) => {
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
        const itemUnitId = item.unit_pengajaran_id !== undefined
          ? (item.unit_pengajaran_id || null)
          : defaultUnitId;
        const created = await tx.cbtSoal.create({
          data: {
            tenant_id: tenantId,
            bank_soal_id: bankSoalId,
            unit_pengajaran_id: itemUnitId,
            nomor_urut: currentOrder,
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

    // Invalidate Redis bundle cache jadwal aktif
    await this.invalidateActiveJadwalBundleCaches(tenantId, bankSoalId);

    return result;
  }

  /**
   * Mengambil dan mengekstrak butir soal dari tautan Google Form publik
   */
  static async parseGoogleForm(url: string) {
    if (!url || typeof url !== 'string') {
      throw new Error('URL Google Form wajib disertakan.');
    }

    const trimmedUrl = url.trim();

    // Validasi domain dasar
    if (!trimmedUrl.includes('docs.google.com/forms') && !trimmedUrl.includes('forms.gle')) {
      throw new Error('Tautan harus berasal dari Google Form (docs.google.com/forms atau forms.gle).');
    }

    // Normalisasi URL (mendukung /edit, /preview, /prefill, /formResponse, /viewanalytics)
    let targetUrl = trimmedUrl.split('#')[0];
    if (targetUrl.includes('docs.google.com/forms')) {
      targetUrl = targetUrl.replace(
        /\/(edit|preview|prefill|formResponse|viewanalytics)(\?.*)?$/i,
        '/viewform$2'
      );
      if (!targetUrl.includes('/viewform')) {
        const [base, query] = targetUrl.split('?');
        targetUrl = base.replace(/\/$/, '') + '/viewform' + (query ? `?${query}` : '');
      }
    }

    let htmlContent = '';
    let finalUrl = targetUrl;
    try {
      const response = await axios.get(targetUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
        },
        timeout: 15000,
        maxRedirects: 5,
        validateStatus: (status) => status < 400,
      });
      htmlContent = String(response.data || '');
      finalUrl = (response.request as any)?.res?.responseUrl || targetUrl;
    } catch (err: any) {
      if (err.response?.status === 404) {
        throw new Error('Google Form tidak ditemukan (Error 404). Pastikan tautan sudah benar.');
      }
      throw new Error(`Gagal menghubungi server Google Forms: ${err.message}`);
    }

    // Deteksi jika Google Form terkunci login (Google Workspace / Akun Khusus)
    if (finalUrl.includes('accounts.google.com') || htmlContent.includes('ServiceLogin') || htmlContent.includes('Sign in to continue')) {
      throw new Error(
        'Google Form ini dibatasi aksesnya (memerlukan login akun organisasi/sekolah). Buka setelan Google Form Anda, lalu nonaktifkan centang "Batasi untuk pengguna di [Organisasi]" agar form dapat diakses publik.'
      );
    }

    // Ekstrak FB_PUBLIC_LOAD_DATA_
    const match = htmlContent.match(/FB_PUBLIC_LOAD_DATA_\s*=\s*(\[.+?\]);\s*(?:<\/script>|\n)/s)
      || htmlContent.match(/var\s+FB_PUBLIC_LOAD_DATA_\s*=\s*(.+?);\s*<\/script>/s);

    if (!match || !match[1]) {
      throw new Error('Tidak dapat menemukan data butir soal di Google Form ini. Pastikan formulir sudah dipublikasikan.');
    }

    let parsedData: any;
    try {
      parsedData = JSON.parse(match[1]);
    } catch (parseErr) {
      throw new Error('Gagal mem-parsing payload data internal Google Form.');
    }

    // Ekstrak Informasi Form
    const formTitle = String(parsedData[1]?.[8] || parsedData[0] || 'Asesmen Google Form').trim();
    const formDesc = String(parsedData[1]?.[0] || '').trim();
    const rawQuestions = Array.isArray(parsedData[1]?.[1]) ? parsedData[1][1] : [];

    const IDENTITY_TITLES = [
      'nama', 'nama lengkap', 'nama siswa', 'nama peserta',
      'kelas', 'rombel', 'tingkat', 'jurusan',
      'nomor absen', 'no absen', 'absen', 'no urut',
      'nis', 'nisn', 'token', 'email', 'alamat email'
    ];

    const OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
    const parsedQuestions: Array<{
      nomor_urut: number;
      jenis_soal: 'PG';
      konten_pertanyaan: string;
      gambar_stimulus_url: string | null;
      bobot: number;
      opsi_jawaban_json: Array<{ kode: string; teks: string }>;
      kunci_jawaban: string;
      pembahasan: string | null;
    }> = [];

    const extractGoogleImageFromNode = (node: any): string | null => {
      if (!node) return null;
      if (typeof node === 'string') {
        const s = node.trim();
        if (s.startsWith('http://') || s.startsWith('https://')) {
          return s;
        }
        // Google Drive / Forms image ID biasanya alfanumerik + _ - minimal 15 karakter tanpa spasi
        if (/^[A-Za-z0-9_-]{15,}$/.test(s)) {
          return `https://lh3.googleusercontent.com/d/${s}`;
        }
        return null;
      }
      if (Array.isArray(node)) {
        for (const child of node) {
          const found = extractGoogleImageFromNode(child);
          if (found) return found;
        }
      }
      return null;
    };

    // Ekstrak juga daftar URL gambar langsung dari HTML /viewform (lh3/lh4/lh5/lh6/lh7.googleusercontent.com/formsz/...)
    const htmlImageUrls: string[] = [];
    const imgTagRegex = /<img[^>]+src=["'](https:\/\/lh\d+[^"']*googleusercontent\.com\/[^"']+)["']/gi;
    let imgMatch: RegExpExecArray | null;
    while ((imgMatch = imgTagRegex.exec(htmlContent)) !== null) {
      const u = imgMatch[1].replace(/&amp;/g, '&');
      if (!u.includes('a/default') && !htmlImageUrls.includes(u)) {
        htmlImageUrls.push(u);
      }
    }
    let htmlImageCursor = 0;

    let questionIndex = 1;
    let pendingStimulusImage: string | null = null;

    for (const item of rawQuestions) {
      if (!Array.isArray(item)) continue;
      const title = item[1];
      const desc = item[2] || '';
      const fieldType = item[3];

      // Lewati section header (type 6 atau 8)
      if (fieldType === 6 || fieldType === 8) {
        continue;
      }

      // Ekstrak gambar dari item[6] atau item[9] (atau fallback ke urutan HTML image jika hanya ID/kosong)
      let itemImage: string | null =
        extractGoogleImageFromNode(item[6]) || extractGoogleImageFromNode(item[9]);

      if (itemImage && itemImage.includes('lh3.googleusercontent.com/d/') && htmlImageCursor < htmlImageUrls.length) {
        // Prioritaskan URL signed formsz dari HTML jika tersedia agar lebih andal dimuat di browser
        const htmlUrl = htmlImageUrls[htmlImageCursor++];
        if (htmlUrl) itemImage = htmlUrl;
      } else if (!itemImage && fieldType === 11 && htmlImageCursor < htmlImageUrls.length) {
        itemImage = htmlImageUrls[htmlImageCursor++];
      }

      // Blok Gambar Mandiri (fieldType === 11) tanpa opsi: tempelkan gambarnya ke soal berikutnya
      if (fieldType === 11) {
        if (itemImage) {
          pendingStimulusImage = itemImage;
        }
        continue;
      }

      // Cari opsi jawaban di item[4]
      let rawOptions: any[] = [];
      if (item[4] && Array.isArray(item[4])) {
        for (const sub of item[4]) {
          if (sub && Array.isArray(sub[1]) && sub[1].length > 0) {
            rawOptions = sub[1];
            break;
          }
        }
      }

      // Bersihkan opsi (abaikan opsi kosong atau opsi "__other_option__")
      const cleanedOptions = rawOptions
        .map((opt: any) => {
          if (typeof opt === 'string') return opt.trim();
          if (Array.isArray(opt) && opt[0]) return String(opt[0]).trim();
          return '';
        })
        .filter((txt: string) => txt.length > 0 && txt !== '__other_option__');

      // Filter otomatis field identitas responden (Nama, Kelas, No Absen, dsb) tanpa opsi pilihan ganda
      const lowerTitle = String(title || '').trim().toLowerCase();
      if (cleanedOptions.length === 0 && IDENTITY_TITLES.includes(lowerTitle)) {
        continue;
      }

      const stimulusImage: string | null = itemImage || pendingStimulusImage || null;
      pendingStimulusImage = null;

      // Jika judul pertanyaan kosong (misal guru menyisipkan formula matematika murni sebagai gambar), beri penomoran default
      const finalTitle = title && String(title).trim().length > 0
        ? String(title).trim()
        : `Soal Nomor ${questionIndex}`;

      // Gabungkan deskripsi jika ada
      const questionContent = desc ? `${finalTitle}\n\n${String(desc).trim()}` : finalTitle;

      // Format opsi ke JSON A, B, C, D, ...
      const opsiJson = cleanedOptions.length >= 2
        ? cleanedOptions.map((optText: string, idx: number) => ({
            kode: OPTION_LETTERS[idx] || String.fromCharCode(65 + idx),
            teks: optText,
          }))
        : [
            { kode: 'A', teks: 'Benar' },
            { kode: 'B', teks: 'Salah' },
          ];

      parsedQuestions.push({
        nomor_urut: questionIndex++,
        jenis_soal: 'PG',
        konten_pertanyaan: questionContent,
        gambar_stimulus_url: stimulusImage,
        bobot: 1.0,
        opsi_jawaban_json: opsiJson,
        kunci_jawaban: 'A', // Default kunci jawaban A (guru dapat menyesuaikan di modal pratinjau)
        pembahasan: null,
      });
    }

    if (parsedQuestions.length === 0) {
      throw new Error('Tidak ditemukan pertanyaan atau butir soal yang dapat diekstrak dari Google Form tersebut.');
    }

    return {
      title: formTitle,
      description: formDesc,
      total_parsed: parsedQuestions.length,
      items: parsedQuestions,
    };
  }
}
