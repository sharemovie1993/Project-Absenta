import { prisma } from '@/utils/prisma';
import { Hari } from '@prisma/client';

export interface GenerateAutoJadwalOptions {
  tahun_pelajaran_id: string;
  semester_id: string;
  kelas_ids?: string[];
  overwrite_existing?: boolean;
}

export interface GeneratedSlot {
  kelas_id: string;
  kelas_name: string;
  mapel_id: string;
  mapel_name: string;
  mapel_kode: string;
  guru_id: string | null;
  guru_name: string;
  hari: Hari;
  slot_index: number;
  jam_mulai: string;
  jam_selesai: string;
}

export interface UnplacedCard {
  kelas_id: string;
  kelas_name: string;
  mapel_id: string;
  mapel_name: string;
  guru_id: string | null;
  guru_name: string;
  reason: string;
}

export interface GenerateAutoJadwalResult {
  success: boolean;
  total_cards: number;
  total_placed: number;
  total_unplaced: number;
  success_rate: number;
  generated_schedules: GeneratedSlot[];
  unplaced_cards: UnplacedCard[];
}

const DEFAULT_SLOTS: Record<number, { start: string; end: string }> = {
  1: { start: "07:30", end: "08:15" },
  2: { start: "08:15", end: "09:00" },
  3: { start: "09:00", end: "09:45" },
  4: { start: "09:45", end: "10:30" },
  5: { start: "10:45", end: "11:30" },
  6: { start: "11:30", end: "12:15" },
  7: { start: "13:00", end: "13:45" },
  8: { start: "13:45", end: "14:30" },
  9: { start: "14:30", end: "15:15" },
  10: { start: "15:15", end: "16:00" },
};

export class TimetableSolverService {
  static async generate(tenantId: string, options: GenerateAutoJadwalOptions): Promise<GenerateAutoJadwalResult> {
    const { tahun_pelajaran_id, semester_id, kelas_ids, overwrite_existing } = options;

    // 1. Fetch Target Classes
    const kelasWhere: any = { tenant_id: tenantId };
    if (kelas_ids && kelas_ids.length > 0) {
      kelasWhere.id = { in: kelas_ids };
    }
    const targetClasses = await prisma.kelas.findMany({
      where: kelasWhere,
      orderBy: { nama_kelas: 'asc' }
    });

    if (targetClasses.length === 0) {
      throw new Error('Tidak ada kelas yang ditemukan untuk penjadwalan otomatis.');
    }

    // 2. Fetch Tenant Config (Hari Sekolah & Shift)
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { hari_sekolah: true }
    });
    const daysToSchedule: Hari[] = (tenant?.hari_sekolah && tenant.hari_sekolah.length > 0)
      ? (tenant.hari_sekolah as Hari[])
      : ['SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT'] as Hari[];

    // 3. Fetch Teachers (PENDIDIK)
    const teachers = await prisma.guru.findMany({
      where: { tenant_id: tenantId, jenis_ptk: 'PENDIDIK' },
      select: { id: true, nama_guru: true, max_jp: true }
    });
    const teacherMap = new Map(teachers.map(t => [t.id, t]));

    // 4. Fetch Guru-Mapel Assignments with Scopes (Kelas / Jurusan / Global)
    const guruMapels = await prisma.guruMapel.findMany({
      where: { tenant_id: tenantId },
      select: { guru_id: true, mapel_id: true, kelas_id: true, jurusan_id: true }
    });

    // 5. Fetch Existing JadwalKBM if not overwriting
    const existingJadwal = await prisma.jadwalKBM.findMany({
      where: {
        tenant_id: tenantId,
        tahun_pelajaran_id,
        semester_id,
        ...(kelas_ids && kelas_ids.length > 0 ? { kelas_id: { in: kelas_ids } } : {})
      }
    });

    const classOccupied = new Map<string, boolean>();
    const teacherOccupied = new Map<string, boolean>();
    const teacherJpCount = new Map<string, number>();

    if (!overwrite_existing) {
      existingJadwal.forEach(j => {
        classOccupied.set(`${j.kelas_id}_${j.hari}_${j.slot_index}`, true);
        if (j.guru_id) {
          teacherOccupied.set(`${j.guru_id}_${j.hari}_${j.slot_index}`, true);
          teacherJpCount.set(j.guru_id, (teacherJpCount.get(j.guru_id) || 0) + 1);
        }
      });
    }

    // 6. Fetch Curriculum Structure (StrukturKurikulum)
    const strukturList = await prisma.strukturKurikulum.findMany({
      where: { tenant_id: tenantId, tahun_pelajaran_id },
      include: { Mapel: true }
    });

    // 7. Build Card Deck (Lessons to place)
    interface Card {
      id: string;
      kelas_id: string;
      kelas_name: string;
      mapel_id: string;
      mapel_name: string;
      mapel_kode: string;
      eligible_teacher_ids: string[];
    }

    const cards: Card[] = [];
    let cardCounter = 0;

    for (const kelas of targetClasses) {
      const matchingStruktur = strukturList.filter(s => 
        s.tingkat === kelas.tingkat &&
        (!s.jurusan_id || s.jurusan_id === kelas.jurusan_id)
      );

      for (const st of matchingStruktur) {
        if (!st.Mapel) continue;
        
        // 3-Level Priority Selection for Teachers:
        // Priority 1: Match specific kelas_id
        let eligibleTeachers = guruMapels
          .filter(gm => gm.mapel_id === st.mapel_id && gm.kelas_id === kelas.id)
          .map(gm => gm.guru_id);

        // Priority 2: Match specific jurusan_id
        if (eligibleTeachers.length === 0 && kelas.jurusan_id) {
          eligibleTeachers = guruMapels
            .filter(gm => gm.mapel_id === st.mapel_id && !gm.kelas_id && gm.jurusan_id === kelas.jurusan_id)
            .map(gm => gm.guru_id);
        }

        // Priority 3: Fallback to Global (no kelas_id and no jurusan_id)
        if (eligibleTeachers.length === 0) {
          eligibleTeachers = guruMapels
            .filter(gm => gm.mapel_id === st.mapel_id && !gm.kelas_id && !gm.jurusan_id)
            .map(gm => gm.guru_id);
        }

        const jpCount = st.jp_per_minggu || 2;

        for (let i = 0; i < jpCount; i++) {
          cardCounter++;
          cards.push({
            id: `card_${cardCounter}`,
            kelas_id: kelas.id,
            kelas_name: kelas.nama_kelas,
            mapel_id: st.mapel_id,
            mapel_name: st.Mapel.nama_mapel,
            mapel_kode: st.Mapel.kode_mapel || '',
            eligible_teacher_ids: eligibleTeachers
          });
        }
      }
    }

    // Heuristic sort: Cards with FEWER eligible teachers first (MRV)
    cards.sort((a, b) => {
      const aTeachers = a.eligible_teacher_ids.length || 999;
      const bTeachers = b.eligible_teacher_ids.length || 999;
      return aTeachers - bTeachers;
    });

    // 8. Solvers Placement Loop
    const generatedSlots: GeneratedSlot[] = [];
    const unplacedCards: UnplacedCard[] = [];
    const slotIndices = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

    for (const card of cards) {
      let placed = false;

      let selectedTeacherId: string | null = null;
      let selectedTeacherName = 'Belum Ada Guru';

      if (card.eligible_teacher_ids.length > 0) {
        const sortedTeachers = [...card.eligible_teacher_ids].sort((t1, t2) => {
          const load1 = teacherJpCount.get(t1) || 0;
          const load2 = teacherJpCount.get(t2) || 0;
          return load1 - load2;
        });
        selectedTeacherId = sortedTeachers[0];
        selectedTeacherName = teacherMap.get(selectedTeacherId)?.nama_guru || 'Guru Pengampu';
      }

      for (const day of daysToSchedule) {
        if (placed) break;

        for (const slotIdx of slotIndices) {
          const classKey = `${card.kelas_id}_${day}_${slotIdx}`;
          if (classOccupied.get(classKey)) continue;

          if (selectedTeacherId) {
            const teacherKey = `${selectedTeacherId}_${day}_${slotIdx}`;
            if (teacherOccupied.get(teacherKey)) continue;

            const teacherObj = teacherMap.get(selectedTeacherId);
            const currentLoad = teacherJpCount.get(selectedTeacherId) || 0;
            const maxJp = teacherObj?.max_jp ?? 24;
            if (currentLoad >= maxJp) continue;
          }

          classOccupied.set(classKey, true);
          if (selectedTeacherId) {
            const teacherKey = `${selectedTeacherId}_${day}_${slotIdx}`;
            teacherOccupied.set(teacherKey, true);
            teacherJpCount.set(selectedTeacherId, (teacherJpCount.get(selectedTeacherId) || 0) + 1);
          }

          const slotTime = DEFAULT_SLOTS[slotIdx] || { start: "07:30", end: "08:15" };

          generatedSlots.push({
            kelas_id: card.kelas_id,
            kelas_name: card.kelas_name,
            mapel_id: card.mapel_id,
            mapel_name: card.mapel_name,
            mapel_kode: card.mapel_kode,
            guru_id: selectedTeacherId,
            guru_name: selectedTeacherName,
            hari: day,
            slot_index: slotIdx,
            jam_mulai: slotTime.start,
            jam_selesai: slotTime.end
          });

          placed = true;
          break;
        }
      }

      if (!placed) {
        unplacedCards.push({
          kelas_id: card.kelas_id,
          kelas_name: card.kelas_name,
          mapel_id: card.mapel_id,
          mapel_name: card.mapel_name,
          guru_id: selectedTeacherId,
          guru_name: selectedTeacherName,
          reason: card.eligible_teacher_ids.length === 0 
            ? 'Belum ada guru yang dipetakan untuk mapel ini' 
            : 'Tidak ada slot waktu kosong yang memenuhi kriteria tanpa bentrok'
        });
      }
    }

    const totalCards = cards.length;
    const totalPlaced = generatedSlots.length;
    const totalUnplaced = unplacedCards.length;
    const successRate = totalCards > 0 ? Math.round((totalPlaced / totalCards) * 100) : 0;

    return {
      success: true,
      total_cards: totalCards,
      total_placed: totalPlaced,
      total_unplaced: totalUnplaced,
      success_rate: successRate,
      generated_schedules: generatedSlots,
      unplaced_cards: unplacedCards
    };
  }

  static async apply(tenantId: string, options: {
    tahun_pelajaran_id: string;
    semester_id: string;
    generated_schedules: GeneratedSlot[];
    overwrite_existing?: boolean;
    userId?: string;
  }) {
    const { tahun_pelajaran_id, semester_id, generated_schedules, overwrite_existing, userId } = options;

    return await prisma.$transaction(async (tx) => {
      if (overwrite_existing) {
        const kelasIds = Array.from(new Set(generated_schedules.map(s => s.kelas_id)));
        if (kelasIds.length > 0) {
          await tx.jadwalKBM.deleteMany({
            where: {
              tenant_id: tenantId,
              tahun_pelajaran_id,
              semester_id,
              kelas_id: { in: kelasIds }
            }
          });
        }
      }

      const createdCount = await tx.jadwalKBM.createMany({
        data: generated_schedules.map(s => ({
          tenant_id: tenantId,
          tahun_pelajaran_id,
          semester_id,
          kelas_id: s.kelas_id,
          mapel_id: s.mapel_id,
          guru_id: s.guru_id || undefined,
          hari: s.hari,
          slot_index: s.slot_index,
          jam_mulai: s.jam_mulai,
          jam_selesai: s.jam_selesai,
          jenis_kegiatan: 'KBM',
          created_by_user_id: userId || undefined
        })),
        skipDuplicates: true
      });

      return {
        count: createdCount.count
      };
    });
  }
}
