import { prisma } from '@/utils/prisma';
import { waQueueService } from '@/services/wa-queue.service';
import crypto from 'crypto';

export interface CbtEventItem {
  id: string;
  tahun_pelajaran_id: string;
  nama_event: string;
  kode_event: string;
  semester: 'GANJIL' | 'GENAP';
  target_tingkat: number[];
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
      is_active: Boolean(row.is_active),
      created_at: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
      updated_at: row.updated_at instanceof Date ? row.updated_at.toISOString() : row.updated_at,
    };
  }

  private static async upsertRelationalEvent(tenantId: string, evt: CbtEventItem, validTpIds?: Set<string>) {
    const resolvedTpId =
      evt.tahun_pelajaran_id && (!validTpIds || validTpIds.has(evt.tahun_pelajaran_id))
        ? evt.tahun_pelajaran_id
        : null;
    await prisma.cbtEvent.upsert({
      where: { tenant_id_id: { tenant_id: tenantId, id: evt.id } },
      update: {
        tahun_pelajaran_id: resolvedTpId,
        nama_event: evt.nama_event,
        kode_event: evt.kode_event,
        semester: evt.semester || 'GANJIL',
        target_tingkat: evt.target_tingkat || [10, 11, 12],
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
      const defaultEvents = this.generateDefaultEvents(activeTp.id);
      const seededDefaults = defaultEvents.map((evt) => ({
        ...evt,
        is_active: false,
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

    const updatedEvent: CbtEventItem = {
      id,
      tahun_pelajaran_id: payload.tahun_pelajaran_id !== undefined ? payload.tahun_pelajaran_id : (existing?.tahun_pelajaran_id || ''),
      nama_event: payload.nama_event !== undefined ? payload.nama_event.trim() : (existing?.nama_event || 'Event Ujian Baru'),
      kode_event: payload.kode_event !== undefined
        ? payload.kode_event.trim().toUpperCase().replace(/\s+/g, '-')
        : (existing?.kode_event || (payload.nama_event || 'EVENT').trim().toUpperCase().replace(/\s+/g, '-')),
      semester: payload.semester !== undefined ? payload.semester : (existing?.semester || 'GANJIL'),
      target_tingkat: targetTingkat,
      tipe_pelaksanaan: payload.tipe_pelaksanaan !== undefined ? payload.tipe_pelaksanaan : (existing?.tipe_pelaksanaan || 'MASSAL'),
      keterangan: payload.keterangan !== undefined ? payload.keterangan : (existing?.keterangan || ''),
      days_config: Array.isArray(payload.days_config) ? payload.days_config : (existing?.days_config || []),
      room_mappings: Array.isArray(payload.room_mappings) ? payload.room_mappings : (existing?.room_mappings || []),
      matrix_draft: payload.matrix_draft !== undefined ? payload.matrix_draft : (existing?.matrix_draft || {}),
      pengawas_candidates: Array.isArray(payload.pengawas_candidates)
        ? payload.pengawas_candidates
        : (existing?.pengawas_candidates || []),
      lock_teacher_scheduling: payload.lock_teacher_scheduling !== undefined ? payload.lock_teacher_scheduling : (existing?.lock_teacher_scheduling ?? true),
      token_refresh_interval: payload.token_refresh_interval !== undefined ? payload.token_refresh_interval : (existing?.token_refresh_interval ?? 0),
      strict_browser_guard: payload.strict_browser_guard !== undefined ? payload.strict_browser_guard : (existing?.strict_browser_guard ?? true),
      enable_proctor: payload.enable_proctor !== undefined ? payload.enable_proctor : (existing?.enable_proctor ?? false),
      is_active: isActive,
      created_at: existing?.created_at || payload.created_at || now,
      updated_at: now,
    };

    if (updatedEvent.is_active) {
      await prisma.cbtEvent.updateMany({
        where: { tenant_id: tenantId, id: { not: id } },
        data: { is_active: false },
      });
    }

    await this.upsertRelationalEvent(tenantId, updatedEvent);

    return updatedEvent;
  }

  static async setActiveEvent(tenantId: string, eventId: string) {
    const targetRow = await prisma.cbtEvent.findFirst({
      where: { tenant_id: tenantId, id: eventId },
    });
    if (!targetRow) {
      throw new Error('Event CBT tidak ditemukan');
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
}
