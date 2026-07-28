import { prisma } from '@/utils/prisma';
import { Hari } from '@prisma/client';
import { calculatePositionEquivalency } from './struktur-kurikulum.service';

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
  11: { start: "16:00", end: "16:45" },
  12: { start: "16:45", end: "17:30" },
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
    // 3. Fetch Teachers (PENDIDIK) with Position Equivalency Adjustment
    const teachers = await prisma.guru.findMany({
      where: { tenant_id: tenantId, jenis_ptk: 'PENDIDIK' },
      select: {
        id: true,
        nama_guru: true,
        max_jp: true,
        User: {
          select: {
            organizationalAssignments: {
              where: { is_active: true },
              select: {
                Position: {
                  select: { code: true, name: true }
                }
              }
            }
          }
        }
      }
    });

    const teacherMap = new Map<string, any>();
    teachers.forEach((t: any) => {
      const posEquiv = (t.User?.organizationalAssignments || []).reduce((acc: number, oa: any) => {
        return acc + calculatePositionEquivalency(oa.Position?.code, oa.Position?.name);
      }, 0);

      const effectiveMaxKbmJp = Math.max(0, (t.max_jp ?? 24) - posEquiv);
      teacherMap.set(t.id, {
        ...t,
        max_jp: effectiveMaxKbmJp
      });
    });

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

    // 3.5 Fetch & Apply Teacher Time-Off Constraints (Time-Off / Constraints)
    const guruTimeOffs = await prisma.guruTimeOff.findMany({
      where: { tenant_id: tenantId }
    });

    guruTimeOffs.forEach(to => {
      if (to.slot_index === null || to.slot_index === undefined) {
        // Full Day Time-Off: Lock all slots 1..12 for this teacher on this day
        for (let s = 1; s <= 12; s++) {
          teacherOccupied.set(`${to.guru_id}_${to.hari}_${s}`, true);
        }
      } else {
        // Specific Slot Time-Off: Lock specific slot for this teacher
        teacherOccupied.set(`${to.guru_id}_${to.hari}_${to.slot_index}`, true);
      }
    });

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

    // 7. Build Subject-Class Decks (Grouping total JP per subject per class)
    interface SubjectDeck {
      id: string;
      kelas_id: string;
      kelas_name: string;
      mapel_id: string;
      mapel_name: string;
      mapel_kode: string;
      total_jp: number;
      eligible_teacher_ids: string[];
    }

    const decks: SubjectDeck[] = [];
    let deckCounter = 0;

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

        const totalJp = st.jp_per_minggu || 2;
        deckCounter++;

        decks.push({
          id: `deck_${deckCounter}`,
          kelas_id: kelas.id,
          kelas_name: kelas.nama_kelas,
          mapel_id: st.mapel_id,
          mapel_name: st.Mapel.nama_mapel,
          mapel_kode: st.Mapel.kode_mapel || '',
          total_jp: totalJp,
          eligible_teacher_ids: eligibleTeachers
        });
      }
    }

    // Sort decks by Most Restricted Variable (MRV) heuristic:
    // Decks with FEWER eligible teachers first, then by highest total_jp
    decks.sort((a, b) => {
      const aTeachers = a.eligible_teacher_ids.length || 999;
      const bTeachers = b.eligible_teacher_ids.length || 999;
      if (aTeachers !== bTeachers) return aTeachers - bTeachers;
      return b.total_jp - a.total_jp;
    });

    // 8. Solvers Placement Loop
    const generatedSlots: GeneratedSlot[] = [];
    const unplacedCards: UnplacedCard[] = [];
    const maxSlotsPerDay = 12;
    let totalCardsCount = 0;

    // Track teacher assigned JP count per jurusan for Major Focus strategy
    const teacherJurusanJp = new Map<string, number>();

    for (const deck of decks) {
      totalCardsCount += deck.total_jp;

      // Select ONE single teacher for all JPs of this subject in this class
      let assignedTeacherId: string | null = null;
      let assignedTeacherName = 'Belum Ada Guru';

      if (deck.eligible_teacher_ids.length > 0) {
        const deckClass = targetClasses.find(c => c.id === deck.kelas_id);
        const currentJurusanId = deckClass?.jurusan_id || 'GENERAL';

        const sortedTeachers = [...deck.eligible_teacher_ids].sort((t1, t2) => {
          // 1. Major Focus: Prioritize teachers who ALREADY teach in this same jurusan
          const jJp1 = teacherJurusanJp.get(`${t1}_${currentJurusanId}`) || 0;
          const jJp2 = teacherJurusanJp.get(`${t2}_${currentJurusanId}`) || 0;

          if (jJp1 !== jJp2) {
            return jJp2 - jJp1; // Higher assigned JP in this jurusan comes first!
          }

          // 2. Secondary: Lowest total workload across all jurusans
          const load1 = teacherJpCount.get(t1) || 0;
          const load2 = teacherJpCount.get(t2) || 0;
          return load1 - load2;
        });

        // Pick teacher with available max_jp capacity
        for (const tId of sortedTeachers) {
          const teacherObj = teacherMap.get(tId);
          const currentLoad = teacherJpCount.get(tId) || 0;
          const maxJp = teacherObj?.max_jp ?? 24;
          if (currentLoad + deck.total_jp <= maxJp) {
            assignedTeacherId = tId;
            break;
          }
        }

        // Fallback to teacher with lowest load if all exceed max_jp
        if (!assignedTeacherId) {
          assignedTeacherId = sortedTeachers[0];
        }

        assignedTeacherName = teacherMap.get(assignedTeacherId)?.nama_guru || 'Guru Pengampu';
      }

      // Split total_jp into consecutive blocks (e.g. 4 -> [2, 2], 3 -> [2, 1], 5 -> [2, 2, 1])
      const blocks: number[] = [];
      let rem = deck.total_jp;
      while (rem > 0) {
        if (rem >= 2) {
          blocks.push(2);
          rem -= 2;
        } else {
          blocks.push(1);
          rem -= 1;
        }
      }

      const daysUsedForSubject = new Set<Hari>();

      for (const blockSize of blocks) {
        let blockPlaced = false;

        interface PlacementCandidate {
          day: Hari;
          startSlot: number;
          gapPenalty: number;
          usedDay: number;
        }

        const candidates: PlacementCandidate[] = [];

        for (const day of daysToSchedule) {
          const usedDay = daysUsedForSubject.has(day) ? 1 : 0;

          // Get teacher's existing slots on this day to calculate gap penalty
          const existingTeacherSlots: number[] = [];
          if (assignedTeacherId) {
            for (let s = 1; s <= maxSlotsPerDay; s++) {
              if (teacherOccupied.get(`${assignedTeacherId}_${day}_${s}`)) {
                existingTeacherSlots.push(s);
              }
            }
          }

          for (let startSlot = 1; startSlot <= maxSlotsPerDay - blockSize + 1; startSlot++) {
            let canFit = true;

            for (let b = 0; b < blockSize; b++) {
              const slotIdx = startSlot + b;
              const classKey = `${deck.kelas_id}_${day}_${slotIdx}`;
              if (classOccupied.get(classKey)) {
                canFit = false;
                break;
              }

              if (assignedTeacherId) {
                const teacherKey = `${assignedTeacherId}_${day}_${slotIdx}`;
                if (teacherOccupied.get(teacherKey)) {
                  canFit = false;
                  break;
                }
              }
            }

            if (canFit) {
              // Calculate gap penalty: prefer adjacent slots (gap = 0) over isolated slots
              let gapPenalty = 0;
              if (existingTeacherSlots.length > 0) {
                const blockEnd = startSlot + blockSize - 1;
                const minExisting = Math.min(...existingTeacherSlots);
                const maxExisting = Math.max(...existingTeacherSlots);

                if (startSlot > maxExisting) {
                  gapPenalty = startSlot - maxExisting - 1;
                } else if (blockEnd < minExisting) {
                  gapPenalty = minExisting - blockEnd - 1;
                }
              }

              candidates.push({
                day,
                startSlot,
                gapPenalty,
                usedDay
              });
            }
          }
        }

        // Sort candidates: lowest usedDay first, then lowest gapPenalty, then earlier slot
        candidates.sort((a, b) => {
          if (a.usedDay !== b.usedDay) return a.usedDay - b.usedDay;
          if (a.gapPenalty !== b.gapPenalty) return a.gapPenalty - b.gapPenalty;
          return a.startSlot - b.startSlot;
        });

        if (candidates.length > 0) {
          const best = candidates[0];
          const day = best.day;
          const startSlot = best.startSlot;

          // Reserve all slots in this block
          for (let b = 0; b < blockSize; b++) {
            const slotIdx = startSlot + b;
            const classKey = `${deck.kelas_id}_${day}_${slotIdx}`;
            classOccupied.set(classKey, true);

            if (assignedTeacherId) {
              const teacherKey = `${assignedTeacherId}_${day}_${slotIdx}`;
              teacherOccupied.set(teacherKey, true);
              teacherJpCount.set(assignedTeacherId, (teacherJpCount.get(assignedTeacherId) || 0) + 1);

              const deckClass = targetClasses.find(c => c.id === deck.kelas_id);
              const currentJurusanId = deckClass?.jurusan_id || 'GENERAL';
              const jKey = `${assignedTeacherId}_${currentJurusanId}`;
              teacherJurusanJp.set(jKey, (teacherJurusanJp.get(jKey) || 0) + 1);
            }

            const slotTime = DEFAULT_SLOTS[slotIdx] || { start: "07:30", end: "08:15" };

            generatedSlots.push({
              kelas_id: deck.kelas_id,
              kelas_name: deck.kelas_name,
              mapel_id: deck.mapel_id,
              mapel_name: deck.mapel_name,
              mapel_kode: deck.mapel_kode,
              guru_id: assignedTeacherId,
              guru_name: assignedTeacherName,
              hari: day,
              slot_index: slotIdx,
              jam_mulai: slotTime.start,
              jam_selesai: slotTime.end
            });
          }

          daysUsedForSubject.add(day);
          blockPlaced = true;
        }

        // Fallback: If consecutive block didn't fit, try placing as individual 1-JP slots
        if (!blockPlaced) {
          let unplacedCount = blockSize;

          for (const day of daysToSchedule) {
            if (unplacedCount === 0) break;

            for (let slotIdx = 1; slotIdx <= maxSlotsPerDay; slotIdx++) {
              if (unplacedCount === 0) break;

              const classKey = `${deck.kelas_id}_${day}_${slotIdx}`;
              if (classOccupied.get(classKey)) continue;

              if (assignedTeacherId) {
                const teacherKey = `${assignedTeacherId}_${day}_${slotIdx}`;
                if (teacherOccupied.get(teacherKey)) continue;
              }

              classOccupied.set(classKey, true);
              if (assignedTeacherId) {
                const teacherKey = `${assignedTeacherId}_${day}_${slotIdx}`;
                teacherOccupied.set(teacherKey, true);
                teacherJpCount.set(assignedTeacherId, (teacherJpCount.get(assignedTeacherId) || 0) + 1);

                const deckClass = targetClasses.find(c => c.id === deck.kelas_id);
                const currentJurusanId = deckClass?.jurusan_id || 'GENERAL';
                const jKey = `${assignedTeacherId}_${currentJurusanId}`;
                teacherJurusanJp.set(jKey, (teacherJurusanJp.get(jKey) || 0) + 1);
              }

              const slotTime = DEFAULT_SLOTS[slotIdx] || { start: "07:30", end: "08:15" };

              generatedSlots.push({
                kelas_id: deck.kelas_id,
                kelas_name: deck.kelas_name,
                mapel_id: deck.mapel_id,
                mapel_name: deck.mapel_name,
                mapel_kode: deck.mapel_kode,
                guru_id: assignedTeacherId,
                guru_name: assignedTeacherName,
                hari: day,
                slot_index: slotIdx,
                jam_mulai: slotTime.start,
                jam_selesai: slotTime.end
              });

              unplacedCount--;
            }
          }

          // Record unplaced JPs if any remained
          for (let u = 0; u < unplacedCount; u++) {
            unplacedCards.push({
              kelas_id: deck.kelas_id,
              kelas_name: deck.kelas_name,
              mapel_id: deck.mapel_id,
              mapel_name: deck.mapel_name,
              guru_id: assignedTeacherId,
              guru_name: assignedTeacherName,
              reason: deck.eligible_teacher_ids.length === 0 
                ? 'Belum ada guru yang dipetakan untuk mapel ini' 
                : 'Tidak ada slot waktu kosong yang memenuhi kriteria tanpa bentrok'
            });
          }
        }
      }
    }

    const totalCards = totalCardsCount;
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
