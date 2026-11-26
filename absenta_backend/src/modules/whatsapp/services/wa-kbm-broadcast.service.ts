import { prisma } from '@/utils/prisma';
import { waQueueService } from '@/services/wa-queue.service';
import type { Hari } from '@prisma/client';

const DAY_ENUM_BY_UTC_DAY: Hari[] = [
  'MINGGU',
  'SENIN',
  'SELASA',
  'RABU',
  'KAMIS',
  'JUMAT',
  'SABTU',
];

const DAY_LABEL_ID: Record<Hari, string> = {
  MINGGU: 'Minggu',
  SENIN: 'Senin',
  SELASA: 'Selasa',
  RABU: 'Rabu',
  KAMIS: 'Kamis',
  JUMAT: 'Jumat',
  SABTU: 'Sabtu',
};

export interface KbmTeachingTeacherItem {
  guru_id: string;
  nama_guru: string;
  nip: string | null;
  no_hp: string | null;
  normalizedPhone: string;
  hasValidPhone: boolean;
  slots: number[];
  jamRangeLabel: string;
  kelasList: string[];
  mapelList: string[];
  hasInval: boolean;
}

function getTodayWibDateStr(): string {
  return new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10);
}

function getHariEnumFromDate(dateStr: string): Hari {
  const d = new Date(`${dateStr}T12:00:00Z`);
  if (isNaN(d.getTime())) {
    throw new Error('Format tanggal tidak valid (gunakan YYYY-MM-DD)');
  }
  return DAY_ENUM_BY_UTC_DAY[d.getUTCDay()];
}

function formatTanggalId(dateStr: string, hari: Hari): string {
  const d = new Date(`${dateStr}T12:00:00Z`);
  const formatted = d.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
  return `${DAY_LABEL_ID[hari]}, ${formatted}`;
}

function normalizeWaPhone(phone?: string | null): string {
  if (!phone) return '';
  let cleaned = phone.replace(/[^0-9]/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = '62' + cleaned.slice(1);
  }
  return cleaned.length >= 9 ? cleaned : '';
}

function formatSlotRanges(slots: number[]): string {
  if (slots.length === 0) return '-';
  const sorted = Array.from(new Set(slots)).sort((a, b) => a - b);
  const ranges: string[] = [];
  let start = sorted[0];
  let prev = sorted[0];

  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === prev + 1) {
      prev = sorted[i];
    } else {
      ranges.push(start === prev ? `${start}` : `${start}–${prev}`);
      start = sorted[i];
      prev = sorted[i];
    }
  }
  ranges.push(start === prev ? `${start}` : `${start}–${prev}`);
  return `Jam ke-${ranges.join(', ')}`;
}

export function parseKbmSlots(input: {
  slots?: number[] | string;
  slot_start?: number | string;
  slot_end?: number | string;
}): number[] {
  const result = new Set<number>();

  if (Array.isArray(input.slots)) {
    input.slots.forEach((s) => {
      const n = Number(s);
      if (Number.isInteger(n) && n >= 1 && n <= 20) result.add(n);
    });
  } else if (typeof input.slots === 'string' && input.slots.trim()) {
    input.slots.split(',').forEach((part) => {
      const n = Number(part.trim());
      if (Number.isInteger(n) && n >= 1 && n <= 20) result.add(n);
    });
  }

  if (result.size === 0 && input.slot_start !== undefined) {
    const start = Number(input.slot_start);
    const end = input.slot_end !== undefined ? Number(input.slot_end) : start;
    if (Number.isInteger(start) && Number.isInteger(end) && start >= 1 && end >= start && end <= 20) {
      for (let i = start; i <= end; i++) {
        result.add(i);
      }
    }
  }

  return Array.from(result).sort((a, b) => a - b);
}

export const waKbmBroadcastService = {
  async getTeachingTeachers(
    tenantId: string,
    params: { tanggal?: string; slots: number[] }
  ) {
    const tanggal = (params.tanggal || '').trim() || getTodayWibDateStr();
    const hari = getHariEnumFromDate(tanggal);
    const slots = Array.from(new Set(params.slots)).filter((s) => Number.isInteger(s) && s >= 1 && s <= 20).sort((a, b) => a - b);

    if (slots.length === 0) {
      throw new Error('Pilih minimal satu jam KBM ke-n yang valid');
    }

    const dayStart = new Date(`${tanggal}T00:00:00.000+07:00`);
    const dayEnd = new Date(`${tanggal}T23:59:59.999+07:00`);

    const [activeTp, activeSem, tenant] = await Promise.all([
      prisma.tahunPelajaran.findFirst({
        where: { tenant_id: tenantId, is_active: true },
        select: { id: true },
      }),
      prisma.semester.findFirst({
        where: { tenant_id: tenantId, is_active: true },
        select: { id: true },
      }),
      prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { name: true },
      }),
    ]);

    const [jadwalRows, sesiRows] = await Promise.all([
      prisma.jadwalKBM.findMany({
        where: {
          tenant_id: tenantId,
          hari,
          slot_index: { in: slots },
          jenis_kegiatan: 'KBM',
          ...(activeTp ? { tahun_pelajaran_id: activeTp.id } : {}),
          ...(activeSem ? { semester_id: activeSem.id } : {}),
        },
        include: {
          Guru: { select: { id: true, nama_guru: true, nip: true, no_hp: true } },
          GuruPelaksana: { select: { id: true, nama_guru: true, nip: true, no_hp: true } },
          Kelas: { select: { id: true, nama_kelas: true } },
          Mapel: { select: { id: true, nama_mapel: true } },
        },
      }),
      prisma.sesiAbsensi.findMany({
        where: {
          tenant_id: tenantId,
          tanggal: { gte: dayStart, lte: dayEnd },
          slot_kbm: { in: slots },
          jenis_kegiatan: 'KBM',
        },
        include: {
          Guru: { select: { id: true, nama_guru: true, nip: true, no_hp: true } },
          GuruPelaksana: { select: { id: true, nama_guru: true, nip: true, no_hp: true } },
          Kelas: { select: { id: true, nama_kelas: true } },
          Mapel: { select: { id: true, nama_mapel: true } },
        },
      }),
    ]);

    // Map by (kelas_id, slot) so real SesiAbsensi (e.g. Inval) overrides master JadwalKBM
    type SlotEntry = {
      slot: number;
      guru: { id: string; nama_guru: string; nip: string | null; no_hp: string | null };
      kelasNama: string;
      mapelNama: string;
      isInval: boolean;
    };

    const slotEntryMap = new Map<string, SlotEntry>();

    for (const j of jadwalRows) {
      const effectiveGuru = j.GuruPelaksana || j.Guru;
      if (!effectiveGuru) continue;
      const key = `${j.kelas_id}__${j.slot_index}`;
      slotEntryMap.set(key, {
        slot: j.slot_index,
        guru: effectiveGuru,
        kelasNama: j.Kelas?.nama_kelas || '-',
        mapelNama: j.Mapel?.nama_mapel || 'KBM',
        isInval: Boolean(j.guru_pelaksana_id && j.guru_pelaksana_id !== j.guru_id),
      });
    }

    for (const s of sesiRows) {
      if (!s.slot_kbm) continue;
      const effectiveGuru = s.GuruPelaksana || s.Guru;
      if (!effectiveGuru) continue;
      const key = `${s.kelas_id}__${s.slot_kbm}`;
      slotEntryMap.set(key, {
        slot: s.slot_kbm,
        guru: effectiveGuru,
        kelasNama: s.Kelas?.nama_kelas || '-',
        mapelNama: s.Mapel?.nama_mapel || 'KBM',
        isInval: Boolean(s.is_delegasi || (s.guru_pelaksana_id && s.guru_pelaksana_id !== s.guru_id)),
      });
    }

    // Deduplicate by guru_id (1 guru = 1 penerima WA)
    const teacherMap = new Map<
      string,
      {
        guru_id: string;
        nama_guru: string;
        nip: string | null;
        no_hp: string | null;
        slots: Set<number>;
        kelasSet: Set<string>;
        mapelSet: Set<string>;
        hasInval: boolean;
      }
    >();

    for (const entry of slotEntryMap.values()) {
      const g = entry.guru;
      if (!teacherMap.has(g.id)) {
        teacherMap.set(g.id, {
          guru_id: g.id,
          nama_guru: g.nama_guru,
          nip: g.nip,
          no_hp: g.no_hp,
          slots: new Set(),
          kelasSet: new Set(),
          mapelSet: new Set(),
          hasInval: false,
        });
      }
      const agg = teacherMap.get(g.id)!;
      agg.slots.add(entry.slot);
      if (entry.kelasNama && entry.kelasNama !== '-') agg.kelasSet.add(entry.kelasNama);
      if (entry.mapelNama) agg.mapelSet.add(entry.mapelNama);
      if (entry.isInval) agg.hasInval = true;
    }

    const teachers: KbmTeachingTeacherItem[] = Array.from(teacherMap.values())
      .map((t) => {
        const sortedSlots = Array.from(t.slots).sort((a, b) => a - b);
        const normPhone = normalizeWaPhone(t.no_hp);
        return {
          guru_id: t.guru_id,
          nama_guru: t.nama_guru,
          nip: t.nip,
          no_hp: t.no_hp,
          normalizedPhone: normPhone,
          hasValidPhone: Boolean(normPhone),
          slots: sortedSlots,
          jamRangeLabel: formatSlotRanges(sortedSlots),
          kelasList: Array.from(t.kelasSet).sort(),
          mapelList: Array.from(t.mapelSet).sort(),
          hasInval: t.hasInval,
        };
      })
      .sort((a, b) => a.nama_guru.localeCompare(b.nama_guru));

    const validPhoneCount = teachers.filter((t) => t.hasValidPhone).length;

    return {
      tanggal,
      tanggalLabel: formatTanggalId(tanggal, hari),
      hari,
      slots,
      schoolName: tenant?.name || 'Sekolah',
      totalTeachers: teachers.length,
      validPhoneCount,
      missingPhoneCount: teachers.length - validPhoneCount,
      teachers,
    };
  },

  async broadcastToTeachingTeachers(
    tenantId: string,
    payload: {
      tanggal?: string;
      slots: number[];
      message: string;
      guru_ids?: string[];
    }
  ) {
    const rawMessage = (payload.message || '').trim();
    if (!rawMessage) {
      throw new Error('Isi pesan WhatsApp wajib diisi');
    }
    if (rawMessage.length > 4000) {
      throw new Error('Pesan terlalu panjang (maksimal 4000 karakter)');
    }

    const preview = await this.getTeachingTeachers(tenantId, {
      tanggal: payload.tanggal,
      slots: payload.slots,
    });

    const selectedSet =
      Array.isArray(payload.guru_ids) && payload.guru_ids.length > 0
        ? new Set(payload.guru_ids)
        : null;

    const targetTeachers = selectedSet
      ? preview.teachers.filter((t) => selectedSet.has(t.guru_id))
      : preview.teachers;

    if (targetTeachers.length === 0) {
      throw new Error('Tidak ada guru mengajar yang dipilih pada jam KBM tersebut');
    }

    let queuedCount = 0;
    const skippedTeachers: Array<{ guru_id: string; nama_guru: string; reason: string }> = [];

    for (const teacher of targetTeachers) {
      if (!teacher.hasValidPhone) {
        skippedTeachers.push({
          guru_id: teacher.guru_id,
          nama_guru: teacher.nama_guru,
          reason: 'Nomor HP/WA kosong atau tidak valid',
        });
        continue;
      }

      const renderedMessage = rawMessage
        .replace(/\{nama\}/gi, teacher.nama_guru)
        .replace(/\{nip\}/gi, teacher.nip || '-')
        .replace(/\{jam_mengajar\}/gi, teacher.jamRangeLabel)
        .replace(/\{kelas\}/gi, teacher.kelasList.join(', ') || '-')
        .replace(/\{mapel\}/gi, teacher.mapelList.join(', ') || 'KBM')
        .replace(/\{tanggal\}/gi, preview.tanggalLabel)
        .replace(/\{sekolah\}/gi, preview.schoolName);

      await waQueueService.enqueue({
        tenantId,
        nomor: teacher.normalizedPhone,
        pesan: renderedMessage,
        source: 'kbm_slots_teacher_broadcast',
      });
      queuedCount++;
    }

    return {
      tanggal: preview.tanggal,
      tanggalLabel: preview.tanggalLabel,
      slots: preview.slots,
      totalTargeted: targetTeachers.length,
      queuedCount,
      skippedCount: skippedTeachers.length,
      skippedTeachers,
      estimatedSeconds: queuedCount * 3,
    };
  },
};
