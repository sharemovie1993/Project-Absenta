import { prisma } from '@/utils/prisma';
import { waQueueService } from '@/services/wa-queue.service';
import { cacheInvalidationService } from '@/utils/cache-invalidation.service';
import { getRedisConnection } from '@/infra/redis/redisClient';
import crypto from 'crypto';

export interface CbtEventItem {
  id: string;
  tahun_pelajaran_id: string;
  nama_event: string;
  kode_event: string;
  semester: 'GANJIL' | 'GENAP';
  target_tingkat: number[];
  non_kbm_extra_tingkat?: number[];
  suspend_kbm_during_exam?: boolean;
  tipe_pelaksanaan?: 'MASSAL' | 'MANDIRI';
  keterangan?: string;
  days_config?: any[]; // Struktur ExamDayConfig (hari, tanggal, sesi, jam)
  room_mappings?: any[]; // Pemetaan kelas ke ruang ujian (KelasRoomMapping[])
  matrix_draft?: any; // Draft rancangan mapel per sesi & tingkat (TimetableMatrixState)
  pengawas_candidates?: string[]; // Array of guru_id yang menjadi whitelist kandidat pengawas event ini
  lock_teacher_scheduling: boolean;
  token_refresh_interval?: number;
  strict_browser_guard: boolean;
  enable_proctor?: boolean;
  tokenless?: boolean;
  custom_token?: string | null;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface CbtTpEventsSummary {
  tahun_pelajaran_id: string;
  tahun_ajaran: string;
  is_active_tp: boolean;
  events: CbtEventItem[];
}

// NOTE: CBT_EVENTS_CONFIG dan CBT_ACTIVE_EVENT_ID di Config telah diputus dan digantikan penuh oleh tabel relasional `CbtEvent`.
const CBT_NUDGE_HISTORY_KEY = 'CBT_NUDGE_HISTORY';

export class CbtSettingsService {
  private static async setConfig(tenantId: string, key: string, value: string) {
    const existing = await prisma.config.findFirst({
      where: { tenant_id: tenantId, key },
    });
    if (existing) {
      return prisma.config.update({
        where: { id: existing.id },
        data: { value },
      });
    } else {
      return prisma.config.create({
        data: { tenant_id: tenantId, key, value },
      });
    }
  }

  private static mapRowToItem(row: any): CbtEventItem {
    return {
      id: row.id,
      tahun_pelajaran_id: row.tahun_pelajaran_id || '',
      nama_event: row.nama_event,
      kode_event: row.kode_event,
      semester: (row.semester as 'GANJIL' | 'GENAP') || 'GANJIL',
      target_tingkat: Array.isArray(row.target_tingkat) ? row.target_tingkat.map(Number) : [10, 11, 12],
      non_kbm_extra_tingkat: Array.isArray(row.non_kbm_extra_tingkat)
        ? row.non_kbm_extra_tingkat.map(Number).filter((n: number) => Number.isFinite(n))
        : [],
      suspend_kbm_during_exam: row.suspend_kbm_during_exam !== false,
      ...(row.tipe_pelaksanaan ? { tipe_pelaksanaan: row.tipe_pelaksanaan as 'MASSAL' | 'MANDIRI' } : {}),
      ...(row.keterangan !== null && row.keterangan !== undefined ? { keterangan: row.keterangan } : {}),
      ...(Array.isArray(row.days_config) ? { days_config: row.days_config } : {}),
      ...(Array.isArray(row.room_mappings) ? { room_mappings: row.room_mappings } : {}),
      ...(row.matrix_draft !== null && row.matrix_draft !== undefined ? { matrix_draft: row.matrix_draft } : {}),
      ...(Array.isArray(row.pengawas_candidates) ? { pengawas_candidates: row.pengawas_candidates } : {}),
      lock_teacher_scheduling: Boolean(row.lock_teacher_scheduling),
      token_refresh_interval: Number(row.token_refresh_interval ?? 0),
      strict_browser_guard: Boolean(row.strict_browser_guard),
      ...(row.enable_proctor !== null && row.enable_proctor !== undefined ? { enable_proctor: Boolean(row.enable_proctor) } : {}),
      tokenless: Boolean(row.tokenless ?? false),
      custom_token: row.custom_token || null,
      is_active: Boolean(row.is_active),
      created_at: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
      updated_at: row.updated_at instanceof Date ? row.updated_at.toISOString() : row.updated_at,
    };
  }

  private static async invalidateCbtEngineMetaCache(tenantId: string) {
    try {
      const { CbtTestEngineService } = await import('./cbt-test-engine.service');
      CbtTestEngineService.invalidateClassExamsCache(tenantId);
      const redis = getRedisConnection();
      if (redis) {
        const keys = await redis.keys(`cbt:${tenantId}:my-exams-meta:*`).catch(() => [] as string[]);
        if (Array.isArray(keys) && keys.length > 0) {
          for (let i = 0; i < keys.length; i += 200) {
            await redis.del(...keys.slice(i, i + 200)).catch(() => null);
          }
        }
      }
    } catch {
      // Abaikan jika Redis / engine cache tidak tersedia
    }
  }

  private static async upsertRelationalEvent(
    tenantId: string,
    evt: CbtEventItem,
    validTpIds?: Set<string>,
    dbClient: any = prisma
  ) {
    const resolvedTpId =
      evt.tahun_pelajaran_id && (!validTpIds || validTpIds.has(evt.tahun_pelajaran_id))
        ? evt.tahun_pelajaran_id
        : null;
    await dbClient.cbtEvent.upsert({
      where: { tenant_id_id: { tenant_id: tenantId, id: evt.id } },
      update: {
        tahun_pelajaran_id: resolvedTpId,
        nama_event: evt.nama_event,
        kode_event: evt.kode_event,
        semester: evt.semester || 'GANJIL',
        target_tingkat: evt.target_tingkat || [10, 11, 12],
        non_kbm_extra_tingkat: Array.isArray(evt.non_kbm_extra_tingkat) ? evt.non_kbm_extra_tingkat : [],
        suspend_kbm_during_exam: evt.suspend_kbm_during_exam !== false,
        tipe_pelaksanaan: evt.tipe_pelaksanaan ?? null,
        keterangan: evt.keterangan ?? null,
        days_config: evt.days_config !== undefined ? evt.days_config : undefined,
        room_mappings: evt.room_mappings !== undefined ? evt.room_mappings : undefined,
        matrix_draft: evt.matrix_draft !== undefined ? evt.matrix_draft : undefined,
        pengawas_candidates: evt.pengawas_candidates !== undefined ? evt.pengawas_candidates : undefined,
        lock_teacher_scheduling: Boolean(evt.lock_teacher_scheduling),
        token_refresh_interval: Number(evt.token_refresh_interval ?? 0),
        strict_browser_guard: Boolean(evt.strict_browser_guard),
        enable_proctor: evt.enable_proctor !== undefined ? Boolean(evt.enable_proctor) : null,
        tokenless: Boolean(evt.tokenless ?? false),
        custom_token: evt.custom_token ? String(evt.custom_token).trim().toUpperCase().slice(0, 10) : null,
        is_active: Boolean(evt.is_active),
      },
      create: {
        id: evt.id,
        tenant_id: tenantId,
        tahun_pelajaran_id: resolvedTpId,
        nama_event: evt.nama_event,
        kode_event: evt.kode_event,
        semester: evt.semester || 'GANJIL',
        target_tingkat: evt.target_tingkat || [10, 11, 12],
        non_kbm_extra_tingkat: Array.isArray(evt.non_kbm_extra_tingkat) ? evt.non_kbm_extra_tingkat : [],
        suspend_kbm_during_exam: evt.suspend_kbm_during_exam !== false,
        tipe_pelaksanaan: evt.tipe_pelaksanaan ?? null,
        keterangan: evt.keterangan ?? null,
        days_config: evt.days_config !== undefined ? evt.days_config : undefined,
        room_mappings: evt.room_mappings !== undefined ? evt.room_mappings : undefined,
        matrix_draft: evt.matrix_draft !== undefined ? evt.matrix_draft : undefined,
        pengawas_candidates: evt.pengawas_candidates !== undefined ? evt.pengawas_candidates : undefined,
        lock_teacher_scheduling: Boolean(evt.lock_teacher_scheduling),
        token_refresh_interval: Number(evt.token_refresh_interval ?? 0),
        strict_browser_guard: Boolean(evt.strict_browser_guard),
        enable_proctor: evt.enable_proctor !== undefined ? Boolean(evt.enable_proctor) : null,
        tokenless: Boolean(evt.tokenless ?? false),
        custom_token: evt.custom_token ? String(evt.custom_token).trim().toUpperCase().slice(0, 10) : null,
        is_active: Boolean(evt.is_active),
      },
    });
  }

  private static generateDefaultEvents(tpId: string): CbtEventItem[] {
    const now = new Date().toISOString();
    return [
      {
        id: `cbt-event-asas-ganjil-${tpId}`,
        tahun_pelajaran_id: tpId,
        nama_event: 'Penilaian / Asesmen Akhir Semester (ASAS) Ganjil',
        kode_event: 'ASAS-GANJIL',
        semester: 'GANJIL',
        target_tingkat: [10, 11, 12],
        tipe_pelaksanaan: 'MASSAL',
        keterangan: 'Asesmen massal akhir semester ganjil untuk seluruh angkatan.',
        lock_teacher_scheduling: true,
        token_refresh_interval: 0,
        strict_browser_guard: true,
        is_active: true,
        created_at: now,
        updated_at: now,
      },
      {
        id: `cbt-event-asts-ganjil-${tpId}`,
        tahun_pelajaran_id: tpId,
        nama_event: 'Asesmen Sumatif Tengah Semester (ASTS) Ganjil',
        kode_event: 'ASTS-GANJIL',
        semester: 'GANJIL',
        target_tingkat: [10, 11],
        keterangan: 'Asesmen tengah semester ganjil khusus tingkat 10 dan 11.',
        lock_teacher_scheduling: true,
        token_refresh_interval: 0,
        strict_browser_guard: true,
        is_active: false,
        created_at: now,
        updated_at: now,
      },
      {
        id: `cbt-event-asts-genap-${tpId}`,
        tahun_pelajaran_id: tpId,
        nama_event: 'Asesmen Sumatif Tengah Semester (ASTS) Genap',
        kode_event: 'ASTS-GENAP',
        semester: 'GENAP',
        target_tingkat: [10, 11],
        keterangan: 'Asesmen tengah semester genap (kelas 12 sedang persiapan PSAJ / PKL).',
        lock_teacher_scheduling: true,
        token_refresh_interval: 0,
        strict_browser_guard: true,
        is_active: false,
        created_at: now,
        updated_at: now,
      },
      {
        id: `cbt-event-psaj-genap-${tpId}`,
        tahun_pelajaran_id: tpId,
        nama_event: 'Penilaian Sumatif Akhir Jenjang (PSAJ) / Ujian Sekolah',
        kode_event: 'PSAJ-GENAP',
        semester: 'GENAP',
        target_tingkat: [12],
        keterangan: 'Ujian kelulusan akhir jenjang khusus tingkat 12.',
        lock_teacher_scheduling: true,
        token_refresh_interval: 0,
        strict_browser_guard: true,
        is_active: false,
        created_at: now,
        updated_at: now,
      },
      {
        id: `cbt-event-anbk-gladi-${tpId}`,
        tahun_pelajaran_id: tpId,
        nama_event: 'Gladi Bersih ANBK / Tes Kemampuan Akademik (TKA)',
        kode_event: 'ANBK-GLADI',
        semester: 'GANJIL',
        target_tingkat: [11],
        keterangan: 'Simulasi dan gladi bersih asesmen nasional sampling tingkat 11.',
        lock_teacher_scheduling: false,
        token_refresh_interval: 0,
        strict_browser_guard: true,
        is_active: false,
        created_at: now,
        updated_at: now,
      },
    ];
  }

  // NOTE: SSOT Event CBT kini 100% menggunakan tabel relasional `CbtEvent` (fallback & dual-write Config CBT_EVENTS_CONFIG/CBT_ACTIVE_EVENT_ID sudah diputus).
  static async getEventsSummary(tenantId: string) {
    const [tpList, activeSem, dbEvents] = await Promise.all([
      prisma.tahunPelajaran.findMany({
        where: { tenant_id: tenantId },
        orderBy: [{ is_active: 'desc' }, { created_at: 'desc' }],
      }),
      prisma.semester.findFirst({
        where: { tenant_id: tenantId, is_active: true },
        select: { nama_semester: true },
      }),
      prisma.cbtEvent.findMany({
        where: { tenant_id: tenantId },
        orderBy: [{ created_at: 'asc' }],
      }),
    ]);

    let allEvents: CbtEventItem[] = dbEvents.map((row) => this.mapRowToItem(row));
    const activeTp = tpList.find((tp) => tp.is_active);

    // Auto-inisialisasi event bawaan jika belum ada untuk TP aktif
    if (activeTp && !allEvents.some((e) => e.tahun_pelajaran_id === activeTp.id)) {
      const activeSemKeyInit = String(activeSem?.nama_semester || '').toUpperCase().includes('GENAP')
        ? 'GENAP'
        : String(activeSem?.nama_semester || '').toUpperCase().includes('GANJIL')
        ? 'GANJIL'
        : '';
      const defaultEvents = this.generateDefaultEvents(activeTp.id);
      const defaultActiveIdx = activeSemKeyInit
        ? defaultEvents.findIndex((e) => String(e.semester || '').toUpperCase() === activeSemKeyInit)
        : 0;
      const resolvedActiveIdx = defaultActiveIdx >= 0 ? defaultActiveIdx : 0;

      const seededDefaults = defaultEvents.map((evt, idx) => ({
        ...evt,
        is_active: idx === resolvedActiveIdx,
      }));
      allEvents = [...allEvents, ...seededDefaults];

      await Promise.all(
        seededDefaults.map((evt) => this.upsertRelationalEvent(tenantId, evt))
      );
    }

    // Isolasi TP: active_event WAJIB berasal dari Tahun Pelajaran yang sedang aktif
    let activeEventId = '';
    if (activeTp) {
      const tpEvents = allEvents.filter((e) => e.tahun_pelajaran_id === activeTp.id);
      const activeSemKey = String(activeSem?.nama_semester || '').toUpperCase().includes('GENAP')
        ? 'GENAP'
        : String(activeSem?.nama_semester || '').toUpperCase().includes('GANJIL')
        ? 'GANJIL'
        : '';
      activeEventId =
        tpEvents.find((e) => e.is_active)?.id ||
        (activeSemKey ? tpEvents.find((e) => String(e.semester || '').toUpperCase() === activeSemKey)?.id : '') ||
        tpEvents[0]?.id ||
        '';
    } else {
      activeEventId = allEvents.find((e) => e.is_active)?.id || '';
    }

    // Pastikan flag is_active sinkron dengan activeEventId
    allEvents = allEvents.map((evt) => ({
      ...evt,
      is_active: evt.id === activeEventId,
    }));

    const summary: CbtTpEventsSummary[] = tpList.map((tp) => {
      const events = allEvents.filter((e) => e.tahun_pelajaran_id === tp.id);
      return {
        tahun_pelajaran_id: tp.id,
        tahun_ajaran: tp.tahun,
        is_active_tp: tp.is_active,
        events,
      };
    });

    const activeEvent = allEvents.find((e) => e.id === activeEventId) || null;

    return {
      summary,
      active_event: activeEvent,
      total_events: allEvents.length,
    };
  }

  static async getActiveEvent(tenantId: string): Promise<CbtEventItem | null> {
    const summary = await this.getEventsSummary(tenantId);
    return summary.active_event;
  }

  /**
   * SSOT Progres Event CBT & Pengumpulan Bank Soal terscope ke Konteks Akademik Aktif.
   * Menggunakan CbtSettingsService.getActiveEvent sebagai SSOT event aktif per TP & Semester.
   */
  static async getAcademicScopedEventProgress(tenantId: string) {
    const [activeEvent, activeTp, activeSem] = await Promise.all([
      this.getActiveEvent(tenantId),
      prisma.tahunPelajaran.findFirst({
        where: { tenant_id: tenantId, is_active: true },
        select: { id: true, tahun: true },
      }),
      prisma.semester.findFirst({
        where: { tenant_id: tenantId, is_active: true },
        select: { id: true, nama_semester: true },
      }),
    ]);

    const bankWhere: any = {
      tenant_id: tenantId,
      status: { not: 'ARCHIVED' },
    };

    if (activeEvent?.tahun_pelajaran_id || activeTp?.id) {
      bankWhere.tahun_pelajaran_id = activeEvent?.tahun_pelajaran_id || activeTp?.id;
    }
    if (activeSem?.id) {
      bankWhere.OR = [{ semester_id: activeSem.id }, { semester_id: null }];
    }
    if (activeEvent?.id) {
      bankWhere.event_id = activeEvent.id;
    }

    const [bankList, jadwalList, kkmpList] = await Promise.all([
      prisma.cbtBankSoal.findMany({
        where: bankWhere,
        select: {
          id: true,
          status: true,
          jumlah_soal: true,
          _count: { select: { Soal: true } },
        },
      }),
      activeTp?.id && activeSem?.id
        ? prisma.cbtJadwalUjian.findMany({
            where: {
              tenant_id: tenantId,
              tahun_pelajaran_id: activeTp.id,
              semester_id: activeSem.id,
              ...(activeEvent?.id ? { BankSoal: { event_id: activeEvent.id } } : {}),
            },
            select: {
              id: true,
              status: true,
              nama_sesi: true,
              BankSoal: {
                select: {
                  mapel_id: true,
                  tingkat_num: true,
                  Mapel: { select: { nama_mapel: true } },
                },
              },
            },
          })
        : Promise.resolve([]),
      prisma.kkmp.findMany({
        where: { tenant_id: tenantId },
        select: { mapel_id: true, tingkat: true, kkm_nilai: true },
      }),
    ]);

    let totalBank = bankList.length;
    let bankTerisiSoal = 0;
    let bankPublished = 0;
    let totalSoal = 0;

    for (const b of bankList) {
      const soalCount = Math.max(b.jumlah_soal || 0, b._count?.Soal || 0);
      totalSoal += soalCount;
      if (soalCount > 0) bankTerisiSoal++;
      if (b.status === 'PUBLISHED') bankPublished++;
    }

    const jadwalTotal = jadwalList.length;
    const jadwalAktif = jadwalList.filter((j) => j.status === 'ACTIVE').length;

    const kkmMap = new Map<string, number>();
    for (const k of kkmpList) {
      kkmMap.set(`${k.mapel_id}_${k.tingkat}`, k.kkm_nilai);
    }

    const jadwalMetaMap = new Map<string, { kkm: number; namaSesi: string; mapelNama: string }>();
    const jadwalIds: string[] = [];
    for (const j of jadwalList as any[]) {
      jadwalIds.push(j.id);
      const mapelId = j.BankSoal?.mapel_id;
      const tingkatNum = j.BankSoal?.tingkat_num;
      const kkm = (mapelId && tingkatNum ? kkmMap.get(`${mapelId}_${tingkatNum}`) : undefined) ?? 75;
      jadwalMetaMap.set(j.id, {
        kkm,
        namaSesi: j.nama_sesi || 'Ujian CBT',
        mapelNama: j.BankSoal?.Mapel?.nama_mapel || '',
      });
    }

    let totalPeserta = 0;
    let sudahMelaksanakan = 0;
    let sedangMengerjakan = 0;
    let belumMelaksanakan = 0;
    let sumNilai = 0;
    let jumlahKecurangan = 0;
    let totalLogPelanggaran = 0;
    let jumlahRemedial = 0;
    const kecuranganList: Array<{
      namaSiswa: string;
      kelas: string;
      namaSesi: string;
      jumlahPelanggaran: number;
      status: string;
    }> = [];

    if (jadwalIds.length > 0) {
      const pesertaList = await prisma.cbtPesertaUjian.findMany({
        where: {
          tenant_id: tenantId,
          jadwal_ujian_id: { in: jadwalIds },
        },
        select: {
          jadwal_ujian_id: true,
          status: true,
          nilai_akhir: true,
          log_pelanggaran_json: true,
          Siswa: {
            select: {
              nama_siswa: true,
              Kelas: { select: { nama_kelas: true } },
            },
          },
        },
      });

      totalPeserta = pesertaList.length;
      for (const p of pesertaList) {
        if (p.status === 'FINISHED' || p.status === 'DISQUALIFIED') {
          sudahMelaksanakan++;
          const nilai = Number(p.nilai_akhir || 0);
          sumNilai += nilai;
          const meta = jadwalMetaMap.get(p.jadwal_ujian_id);
          const kkm = meta?.kkm ?? 75;
          if (nilai < kkm) {
            jumlahRemedial++;
          }
        } else if (p.status === 'IN_PROGRESS') {
          sedangMengerjakan++;
        } else {
          belumMelaksanakan++;
        }

        const logs = Array.isArray(p.log_pelanggaran_json) ? p.log_pelanggaran_json : [];
        if (logs.length > 0 || p.status === 'DISQUALIFIED') {
          jumlahKecurangan++;
          totalLogPelanggaran += logs.length;
          const meta = jadwalMetaMap.get(p.jadwal_ujian_id);
          kecuranganList.push({
            namaSiswa: p.Siswa?.nama_siswa || 'Siswa',
            kelas: p.Siswa?.Kelas?.nama_kelas || '-',
            namaSesi: meta?.mapelNama || meta?.namaSesi || 'CBT',
            jumlahPelanggaran: logs.length,
            status: p.status,
          });
        }
      }
    }

    kecuranganList.sort((a, b) => b.jumlahPelanggaran - a.jumlahPelanggaran);

    const progresPengumpulanPct =
      totalBank > 0 ? Math.round((bankTerisiSoal / totalBank) * 100) : 0;
    const progresPublikasiPct =
      totalBank > 0 ? Math.round((bankPublished / totalBank) * 100) : 0;
    const progresPelaksanaanPct =
      totalPeserta > 0 ? Math.round((sudahMelaksanakan / totalPeserta) * 100) : 0;
    const rataRataNilai =
      sudahMelaksanakan > 0 ? Number((sumNilai / sudahMelaksanakan).toFixed(1)) : 0;
    const progresTuntasPct =
      sudahMelaksanakan > 0
        ? Math.round(((sudahMelaksanakan - jumlahRemedial) / sudahMelaksanakan) * 100)
        : 0;

    return {
      academicContext: activeTp
        ? `${activeTp.tahun}${activeSem ? ` (${activeSem.nama_semester})` : ''}`
        : 'Konteks Aktif',
      activeEvent: activeEvent
        ? {
            id: activeEvent.id,
            nama_event: activeEvent.nama_event,
            kode_event: activeEvent.kode_event,
            semester: activeEvent.semester,
          }
        : null,
      totalBank,
      bankTerisiSoal,
      bankPublished,
      totalSoal,
      jadwalTotal,
      jadwalAktif,
      progresPengumpulanPct,
      progresPublikasiPct,
      totalPeserta,
      sudahMelaksanakan,
      sedangMengerjakan,
      belumMelaksanakan,
      progresPelaksanaanPct,
      rataRataNilai,
      jumlahKecurangan,
      totalLogPelanggaran,
      kecuranganItems: kecuranganList.slice(0, 5),
      jumlahRemedial,
      progresTuntasPct,
    };
  }

  static async upsertEvent(tenantId: string, payload: Partial<CbtEventItem>) {
    const dbEvents = await prisma.cbtEvent.findMany({
      where: { tenant_id: tenantId },
    });
    const allEvents: CbtEventItem[] = dbEvents.map((r) => this.mapRowToItem(r));

    const now = new Date().toISOString();
    const id = payload.id || `cbt-event-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    const existing = allEvents.find((e) => e.id === id) || null;

    // Resolusi Target Tingkat: Jika ada payload, gunakan payload. Jika tidak ada dan existing ada, gunakan existing. Jika baru, default [10, 11, 12]
    let targetTingkat: number[];
    if (Array.isArray(payload.target_tingkat) && payload.target_tingkat.length > 0) {
      targetTingkat = payload.target_tingkat.map(Number);
    } else if (existing?.target_tingkat && Array.isArray(existing.target_tingkat) && existing.target_tingkat.length > 0) {
      targetTingkat = existing.target_tingkat.map(Number);
    } else {
      targetTingkat = [10, 11, 12];
    }

    // Resolusi is_active:
    // Jika payload secara eksplisit mengirim is_active (boolean), gunakan payload.
    // Jika payload TIDAK mengirim is_active (undefined) dan existing ada, PERTAHANKAN status existing.
    // Jika event baru dan payload tidak ada, default false (kecuali jika allEvents masih kosong, bisa dijadikan active).
    const isActive = payload.is_active !== undefined
      ? Boolean(payload.is_active)
      : (existing ? Boolean(existing.is_active) : (allEvents.length === 0));

    const rawExtraTingkat =
      payload.non_kbm_extra_tingkat !== undefined
        ? (Array.isArray(payload.non_kbm_extra_tingkat) ? payload.non_kbm_extra_tingkat : [])
        : (existing?.non_kbm_extra_tingkat || []);
    const sanitizedExtraTingkat = Array.from(
      new Set(
        rawExtraTingkat
          .map(Number)
          .filter((n) => Number.isFinite(n) && !targetTingkat.includes(n))
      )
    ).sort((a, b) => a - b);

    const suspendKbmDuringExam =
      payload.suspend_kbm_during_exam !== undefined
        ? Boolean(payload.suspend_kbm_during_exam)
        : (existing?.suspend_kbm_during_exam ?? true);

    const updatedEvent: CbtEventItem = {
      id,
      tahun_pelajaran_id: payload.tahun_pelajaran_id !== undefined ? payload.tahun_pelajaran_id : (existing?.tahun_pelajaran_id || ''),
      nama_event: payload.nama_event !== undefined ? payload.nama_event.trim() : (existing?.nama_event || 'Event Ujian Baru'),
      kode_event: payload.kode_event !== undefined
        ? payload.kode_event.trim().toUpperCase().replace(/\s+/g, '-')
        : (existing?.kode_event || (payload.nama_event || 'EVENT').trim().toUpperCase().replace(/\s+/g, '-')),
      semester: payload.semester !== undefined ? payload.semester : (existing?.semester || 'GANJIL'),
      target_tingkat: targetTingkat,
      non_kbm_extra_tingkat: sanitizedExtraTingkat,
      suspend_kbm_during_exam: suspendKbmDuringExam,
      tipe_pelaksanaan: payload.tipe_pelaksanaan !== undefined ? payload.tipe_pelaksanaan : (existing?.tipe_pelaksanaan || 'MASSAL'),
      keterangan: payload.keterangan !== undefined ? payload.keterangan : (existing?.keterangan || ''),
      // Hanya timpa field JSON kolaboratif jika eksplisit dikirim pada payload (mencegah clobber antar-fase/tab)
      days_config: Array.isArray(payload.days_config) ? payload.days_config : undefined,
      room_mappings: Array.isArray(payload.room_mappings) ? payload.room_mappings : undefined,
      matrix_draft: payload.matrix_draft !== undefined ? payload.matrix_draft : undefined,
      pengawas_candidates: Array.isArray(payload.pengawas_candidates) ? payload.pengawas_candidates : undefined,
      lock_teacher_scheduling: payload.lock_teacher_scheduling !== undefined ? payload.lock_teacher_scheduling : (existing?.lock_teacher_scheduling ?? true),
      token_refresh_interval: payload.token_refresh_interval !== undefined ? payload.token_refresh_interval : (existing?.token_refresh_interval ?? 0),
      strict_browser_guard: payload.strict_browser_guard !== undefined ? payload.strict_browser_guard : (existing?.strict_browser_guard ?? true),
      enable_proctor: payload.enable_proctor !== undefined ? payload.enable_proctor : (existing?.enable_proctor ?? false),
      tokenless: payload.tokenless !== undefined ? Boolean(payload.tokenless) : (existing?.tokenless ?? false),
      custom_token:
        payload.custom_token !== undefined
          ? (payload.custom_token ? String(payload.custom_token).trim().toUpperCase().slice(0, 10) : null)
          : (existing?.custom_token ?? null),
      is_active: isActive,
      created_at: existing?.created_at || payload.created_at || now,
      updated_at: now,
    };

    await prisma.$transaction(async (tx) => {
      if (updatedEvent.is_active) {
        await tx.cbtEvent.updateMany({
          where: { tenant_id: tenantId, id: { not: id } },
          data: { is_active: false },
        });
      }
      await this.upsertRelationalEvent(tenantId, updatedEvent, undefined, tx);
    });

    const savedRow = await prisma.cbtEvent.findFirst({
      where: { tenant_id: tenantId, id },
    });
    const hydratedEvent = savedRow ? this.mapRowToItem(savedRow) : updatedEvent;

    await cacheInvalidationService.invalidateAttendanceCache(tenantId).catch(() => {});
    await this.invalidateCbtEngineMetaCache(tenantId);

    // Sinkronkan token_ujian pada jadwal event ini jika custom_token diisi
    if (hydratedEvent.custom_token) {
      await prisma.cbtJadwalUjian.updateMany({
        where: {
          tenant_id: tenantId,
          OR: [
            { setting_keamanan: { path: ['event_id'], equals: hydratedEvent.id } },
            { BankSoal: { event_id: hydratedEvent.id } },
          ],
        },
        data: { token_ujian: hydratedEvent.custom_token },
      });
    }

    return hydratedEvent;
  }

  static async setActiveEvent(tenantId: string, eventId: string) {
    const [targetRow, activeTp] = await Promise.all([
      prisma.cbtEvent.findFirst({
        where: { tenant_id: tenantId, id: eventId },
      }),
      prisma.tahunPelajaran.findFirst({
        where: { tenant_id: tenantId, is_active: true },
        select: { id: true, tahun: true },
      }),
    ]);
    if (!targetRow) {
      throw new Error('Event CBT tidak ditemukan');
    }
    if (activeTp && targetRow.tahun_pelajaran_id && targetRow.tahun_pelajaran_id !== activeTp.id) {
      throw new Error(
        `Tidak dapat mengaktifkan event dari Tahun Pelajaran lain karena Tahun Pelajaran aktif saat ini adalah ${activeTp.tahun}. Gunakan pemilih Event di Meja Kerja Panitia untuk persiapan.`
      );
    }

    await prisma.$transaction([
      prisma.cbtEvent.updateMany({
        where: { tenant_id: tenantId },
        data: { is_active: false },
      }),
      prisma.cbtEvent.updateMany({
        where: { tenant_id: tenantId, id: eventId },
        data: { is_active: true },
      }),
    ]);
    await cacheInvalidationService.invalidateAttendanceCache(tenantId).catch(() => {});
    await this.invalidateCbtEngineMetaCache(tenantId);

    return { ...this.mapRowToItem(targetRow), is_active: true };
  }

  static async deleteEvent(tenantId: string, eventId: string) {
    const dbTarget = await prisma.cbtEvent.findFirst({
      where: { tenant_id: tenantId, id: eventId },
    });

    if (dbTarget?.is_active) {
      throw new Error('Event ini sedang aktif di Meja Kerja Panitia dan tidak dapat dihapus. Silakan aktifkan event lain terlebih dahulu.');
    }

    await prisma.cbtEvent.deleteMany({ where: { tenant_id: tenantId, id: eventId } });

    return { success: true, message: 'Event CBT berhasil dihapus' };
  }

  // ── SINKRONISASI RIWAYAT COLEK WHATSAPP MULTI-DEVICE ──
  static async getNudgeHistory(tenantId: string): Promise<Record<string, { sent_at: string; sent_by: string }>> {
    const configRow = await prisma.config.findFirst({
      where: { tenant_id: tenantId, key: CBT_NUDGE_HISTORY_KEY },
    });

    if (!configRow?.value) return {};

    try {
      const parsed = JSON.parse(configRow.value);
      return typeof parsed === 'object' && parsed !== null ? parsed : {};
    } catch {
      return {};
    }
  }

  static async recordNudge(
    tenantId: string,
    targetKey: string,
    senderName: string
  ): Promise<Record<string, { sent_at: string; sent_by: string }>> {
    if (!targetKey) {
      throw new Error('target_key wajib disertakan');
    }

    const currentHistory = await this.getNudgeHistory(tenantId);
    currentHistory[targetKey] = {
      sent_at: new Date().toISOString(),
      sent_by: senderName || 'Panitia CBT',
    };

    await this.setConfig(tenantId, CBT_NUDGE_HISTORY_KEY, JSON.stringify(currentHistory));
    return currentHistory;
  }

  // ── BROADCAST PESAN MASSAL WA GATEWAY KE KANDIDAT PENGAWAS ──
  private static normalizeWaPhone(phone?: string | null): string {
    if (!phone) return '';
    let cleaned = phone.replace(/[^0-9]/g, '');
    if (cleaned.startsWith('0')) {
      cleaned = '62' + cleaned.slice(1);
    }
    return cleaned.length >= 9 ? cleaned : '';
  }

  static async broadcastKandidatWa(
    tenantId: string,
    eventId: string,
    payload: { message: string; guru_ids?: string[] }
  ) {
    const rawMessage = (payload.message || '').trim();
    if (!rawMessage) {
      throw new Error('Pesan WhatsApp wajib diisi');
    }
    if (rawMessage.length > 4000) {
      throw new Error('Pesan terlalu panjang (maksimal 4000 karakter)');
    }

    const dbEventRow = await prisma.cbtEvent.findFirst({
      where: { tenant_id: tenantId, id: eventId },
    });
    if (!dbEventRow) {
      throw new Error('Event CBT tidak ditemukan');
    }
    const targetEvent = this.mapRowToItem(dbEventRow);

    const candidateIds = Array.isArray(payload.guru_ids) && payload.guru_ids.length > 0
      ? Array.from(new Set(payload.guru_ids))
      : Array.from(new Set(targetEvent.pengawas_candidates || []));

    if (candidateIds.length === 0) {
      throw new Error('Belum ada kandidat pengawas yang dipilih pada event ini');
    }

    const [teachers, tenant] = await Promise.all([
      prisma.guru.findMany({
        where: {
          tenant_id: tenantId,
          id: { in: candidateIds },
        },
        select: {
          id: true,
          nama_guru: true,
          nip: true,
          no_hp: true,
        },
        orderBy: { nama_guru: 'asc' },
      }),
      prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { name: true },
      }),
    ]);

    if (teachers.length === 0) {
      throw new Error('Data guru kandidat pengawas tidak ditemukan');
    }

    const schoolName = tenant?.name || 'Sekolah';
    const eventName = targetEvent.nama_event || 'Ujian CBT';

    let queuedCount = 0;
    const skippedTeachers: Array<{ id: string; nama_guru: string; reason: string }> = [];

    for (const teacher of teachers) {
      const normPhone = this.normalizeWaPhone(teacher.no_hp);
      if (!normPhone) {
        skippedTeachers.push({
          id: teacher.id,
          nama_guru: teacher.nama_guru,
          reason: 'Nomor HP/WA kosong atau tidak valid',
        });
        continue;
      }

      const renderedMessage = rawMessage
        .replace(/\{nama\}/gi, teacher.nama_guru || '')
        .replace(/\{nip\}/gi, teacher.nip || '-')
        .replace(/\{event\}/gi, eventName)
        .replace(/\{sekolah\}/gi, schoolName);

      await waQueueService.enqueue({
        tenantId,
        nomor: normPhone,
        pesan: renderedMessage,
        source: 'cbt_kandidat_pengawas_broadcast',
      });
      queuedCount++;
    }

    return {
      queuedCount,
      skippedCount: skippedTeachers.length,
      skippedTeachers,
      totalCandidates: teachers.length,
      estimatedSeconds: queuedCount * 3,
    };
  }

  /**
   * Rollover konfigurasi Event CBT (ploting ruang, kandidat pengawas, days_config, & opsional bank soal)
   */
  static async rolloverEvent(
    tenantId: string,
    params: {
      source_event_id: string;
      target_event_id: string;
      include_room_mappings?: boolean;
      include_days_config?: boolean;
      include_pengawas_candidates?: boolean;
      include_bank_soal?: boolean;
    }
  ) {
    const [sourceRow, targetRow] = await Promise.all([
      prisma.cbtEvent.findFirst({ where: { tenant_id: tenantId, id: params.source_event_id } }),
      prisma.cbtEvent.findFirst({ where: { tenant_id: tenantId, id: params.target_event_id } }),
    ]);

    if (!sourceRow) throw new Error('Event CBT sumber tidak ditemukan');
    if (!targetRow) throw new Error('Event CBT tujuan tidak ditemukan');

    const source = this.mapRowToItem(sourceRow);
    const target = this.mapRowToItem(targetRow);

    const updatedTarget = await this.upsertEvent(tenantId, {
      ...target,
      ...(params.include_room_mappings !== false ? { room_mappings: source.room_mappings || [] } : {}),
      ...(params.include_days_config ? { days_config: source.days_config || [] } : {}),
      ...(params.include_pengawas_candidates !== false
        ? { pengawas_candidates: source.pengawas_candidates || [] }
        : {}),
      target_tingkat:
        Array.isArray(target.target_tingkat) && target.target_tingkat.length > 0
          ? target.target_tingkat
          : source.target_tingkat,
      lock_teacher_scheduling: source.lock_teacher_scheduling,
      strict_browser_guard: source.strict_browser_guard,
      enable_proctor: source.enable_proctor,
      token_refresh_interval: source.token_refresh_interval,
    });

    let bankRolloverResult: any = null;
    if (params.include_bank_soal) {
      const { CbtBankSoalService } = await import('./cbt-bank-soal.service');
      let targetSemId: string | undefined;
      if (target.tahun_pelajaran_id) {
        const sems = await prisma.semester.findMany({
          where: { tenant_id: tenantId, tahun_pelajaran_id: target.tahun_pelajaran_id },
          select: { id: true, nama_semester: true, is_active: true },
        });
        const semTarget = String(target.semester || '').toUpperCase().trim();
        const matched = sems.find((s) => String(s.nama_semester || '').toUpperCase().includes(semTarget));
        targetSemId = matched?.id || sems.find((s) => s.is_active)?.id;
      }
      bankRolloverResult = await CbtBankSoalService.rollover(tenantId, {
        source_event_id: source.id,
        source_tahun_pelajaran_id: source.tahun_pelajaran_id || undefined,
        target_event_id: target.id,
        target_tahun_pelajaran_id: target.tahun_pelajaran_id || undefined,
        target_semester_id: targetSemId,
      });
    }

    return {
      event: updatedTarget,
      bank_rollover: bankRolloverResult,
    };
  }
}
