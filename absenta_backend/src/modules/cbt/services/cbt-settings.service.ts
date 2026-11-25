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

const CBT_CONFIG_KEY = 'CBT_EVENTS_CONFIG';
const CBT_ACTIVE_KEY = 'CBT_ACTIVE_EVENT_ID';
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

  static async getEventsSummary(tenantId: string) {
    const tpList = await prisma.tahunPelajaran.findMany({
      where: { tenant_id: tenantId },
      orderBy: [{ is_active: 'desc' }, { created_at: 'desc' }],
    });

    const [configRow, activeRow] = await Promise.all([
      prisma.config.findFirst({
        where: { tenant_id: tenantId, key: CBT_CONFIG_KEY },
      }),
      prisma.config.findFirst({
        where: { tenant_id: tenantId, key: CBT_ACTIVE_KEY },
      }),
    ]);

    let allEvents: CbtEventItem[] = [];
    if (configRow?.value) {
      try {
        allEvents = JSON.parse(configRow.value);
      } catch {
        allEvents = [];
      }
    }

    let activeEventId = activeRow?.value || '';

    // Auto-inisialisasi event bawaan jika belum ada untuk TP aktif
    const activeTp = tpList.find((tp) => tp.is_active);
    if (activeTp && !allEvents.some((e) => e.tahun_pelajaran_id === activeTp.id)) {
      const defaultEvents = this.generateDefaultEvents(activeTp.id);
      allEvents = [...allEvents, ...defaultEvents];
      if (!activeEventId) {
        activeEventId = defaultEvents[0].id;
      }

      // Simpan inisialisasi default
      await Promise.all([
        this.setConfig(tenantId, CBT_CONFIG_KEY, JSON.stringify(allEvents)),
        this.setConfig(tenantId, CBT_ACTIVE_KEY, activeEventId),
      ]);
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
    const configRow = await prisma.config.findFirst({
      where: { tenant_id: tenantId, key: CBT_CONFIG_KEY },
    });

    let allEvents: CbtEventItem[] = [];
    if (configRow?.value) {
      try {
        allEvents = JSON.parse(configRow.value);
      } catch {
        allEvents = [];
      }
    }

    const now = new Date().toISOString();
    const id = payload.id || `cbt-event-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    const existingIndex = allEvents.findIndex((e) => e.id === id);
    const existing = existingIndex >= 0 ? allEvents[existingIndex] : null;

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

    if (existingIndex >= 0) {
      allEvents[existingIndex] = updatedEvent;
    } else {
      allEvents.push(updatedEvent);
    }

    if (updatedEvent.is_active) {
      allEvents = allEvents.map((e) => ({
        ...e,
        is_active: e.id === id,
      }));
      await this.setConfig(tenantId, CBT_ACTIVE_KEY, id);
    }

    await this.setConfig(tenantId, CBT_CONFIG_KEY, JSON.stringify(allEvents));

    return updatedEvent;
  }

  static async setActiveEvent(tenantId: string, eventId: string) {
    const configRow = await prisma.config.findFirst({
      where: { tenant_id: tenantId, key: CBT_CONFIG_KEY },
    });

    let allEvents: CbtEventItem[] = [];
    if (configRow?.value) {
      try {
        allEvents = JSON.parse(configRow.value);
      } catch {
        allEvents = [];
      }
    }

    const targetEvent = allEvents.find((e) => e.id === eventId);
    if (!targetEvent) {
      throw new Error('Event CBT tidak ditemukan');
    }

    allEvents = allEvents.map((e) => ({
      ...e,
      is_active: e.id === eventId,
    }));

    await Promise.all([
      this.setConfig(tenantId, CBT_CONFIG_KEY, JSON.stringify(allEvents)),
      this.setConfig(tenantId, CBT_ACTIVE_KEY, eventId),
    ]);

    return { ...targetEvent, is_active: true };
  }

  static async deleteEvent(tenantId: string, eventId: string) {
    const [configRow, activeRow] = await Promise.all([
      prisma.config.findFirst({
        where: { tenant_id: tenantId, key: CBT_CONFIG_KEY },
      }),
      prisma.config.findFirst({
        where: { tenant_id: tenantId, key: CBT_ACTIVE_KEY },
      }),
    ]);

    if (activeRow?.value === eventId) {
      throw new Error('Event ini sedang aktif di Meja Kerja Panitia dan tidak dapat dihapus. Silakan aktifkan event lain terlebih dahulu.');
    }

    let allEvents: CbtEventItem[] = [];
    if (configRow?.value) {
      try {
        allEvents = JSON.parse(configRow.value);
      } catch {
        allEvents = [];
      }
    }

    allEvents = allEvents.filter((e) => e.id !== eventId);

    await this.setConfig(tenantId, CBT_CONFIG_KEY, JSON.stringify(allEvents));

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

    const configRow = await prisma.config.findFirst({
      where: { tenant_id: tenantId, key: CBT_CONFIG_KEY },
    });

    let allEvents: CbtEventItem[] = [];
    if (configRow?.value) {
      try {
        allEvents = JSON.parse(configRow.value);
      } catch {
        allEvents = [];
      }
    }

    const targetEvent = allEvents.find((e) => e.id === eventId);
    if (!targetEvent) {
      throw new Error('Event CBT tidak ditemukan');
    }

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
