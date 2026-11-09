import type { CbtJadwalUjian } from '@/types/cbt.types';
import type { AutoPlotConfigOptions } from './CbtAutoPlotConfigModal';

export interface PlottingDraftRow {
  jadwal_id: string;
  ruang_ujian: string;
  pengawas_1_id: string;
  proktor_id: string;
  dirty: boolean;
}

export interface CandidateTeacher {
  id: string;
  nama_guru: string;
  nip?: string;
  jenis_ptk?: string;
  [key: string]: any;
}

export interface AutoPlotResult {
  nextDrafts: Record<string, PlottingDraftRow>;
  assignedCount: number;
}

/**
 * Enterprise-Grade Anti-Conflict CBT Supervisor Auto-Plotting Engine
 * Mendukung 3 Strategi Alokasi Ruang:
 * 1. STAY_ROOM: 1 Guru mengawas di 1 kelas/ruang seharian (Full Day per Ruang)
 * 2. MAX_N_SESSION_PER_ROOM: Guru bertahan maks N sesi di 1 kelas lalu rolling ke kelas lain
 * 3. ROLLING_SESSION: Guru berpindah kelas setiap sesi baru (Pengawasan silang)
 * Dilengkapi Dynamic Load-Balancer (Pemerataan Jam) & Strict Anti-Conflict Overlap Checking.
 */
export function executeAutoPlotSupervisors(
  jadwalList: CbtJadwalUjian[],
  currentDrafts: Record<string, PlottingDraftRow>,
  candidates: CandidateTeacher[],
  config: AutoPlotConfigOptions
): AutoPlotResult {
  if (!jadwalList.length || !candidates.length) {
    return { nextDrafts: currentDrafts, assignedCount: 0 };
  }

  const nextDrafts: Record<string, PlottingDraftRow> = { ...currentDrafts };
  let assignedCount = 0;

  // ── 1. Inisialisasi Struktur State Beban Kerja & Waktu Sibuk ──
  const teacherTotalSessions = new Map<string, number>();
  const teacherDailySessions = new Map<string, Map<string, number>>(); // dateKey -> (teacherId -> count)
  const teacherBusyIntervals = new Map<string, Array<{ start: number; end: number }>>(); // teacherId -> intervals
  const roomLastTeacher = new Map<string, string>(); // roomKey -> lastAssignedTeacherId

  // Helper untuk mengambil tanggal (YYYY-MM-DD)
  const getDateKey = (isoString: string): string => {
    return isoString ? isoString.split('T')[0] : 'default_date';
  };

  // Helper untuk mengambil ruang ujian
  const getRoomKey = (jadwal: CbtJadwalUjian): string => {
    const draft = nextDrafts[jadwal.id];
    const fromDraft = (draft?.ruang_ujian || '').trim();
    if (fromDraft) return fromDraft;
    const fromSecurity = (jadwal.setting_keamanan?.ruang_ujian || '').trim();
    if (fromSecurity) return fromSecurity;
    return 'R.01';
  };

  // ── 2. Pre-Populasi Jadwal yang Sudah Memiliki Pengawas (Agar Tidak Terjadi Bentrok) ──
  jadwalList.forEach((j) => {
    const draft = nextDrafts[j.id];
    const existingPengawas = draft?.pengawas_1_id || j.setting_keamanan?.pengawas_1_id;
    const existingProktor = draft?.proktor_id || j.setting_keamanan?.proktor_id;

    // Jika mode onlyUnassigned, kita pertahankan pengawas lama dan kunci interval waktunya
    if (config.onlyUnassigned && existingPengawas) {
      const dateKey = getDateKey(j.tanggal_mulai);
      const startMs = new Date(j.tanggal_mulai).getTime();
      const endMs = new Date(j.tanggal_selesai).getTime();

      // Register pengawas 1
      teacherTotalSessions.set(existingPengawas, (teacherTotalSessions.get(existingPengawas) || 0) + 1);
      if (!teacherDailySessions.has(dateKey)) {
        teacherDailySessions.set(dateKey, new Map<string, number>());
      }
      const dayMap = teacherDailySessions.get(dateKey)!;
      dayMap.set(existingPengawas, (dayMap.get(existingPengawas) || 0) + 1);

      if (!teacherBusyIntervals.has(existingPengawas)) {
        teacherBusyIntervals.set(existingPengawas, []);
      }
      teacherBusyIntervals.get(existingPengawas)!.push({ start: startMs, end: endMs });
    }

    // Proktor juga dikunci agar tidak bentrok mengawas di sesi lain
    if (existingProktor) {
      const startMs = new Date(j.tanggal_mulai).getTime();
      const endMs = new Date(j.tanggal_selesai).getTime();
      if (!teacherBusyIntervals.has(existingProktor)) {
        teacherBusyIntervals.set(existingProktor, []);
      }
      teacherBusyIntervals.get(existingProktor)!.push({ start: startMs, end: endMs });
    }
  });

  // ── 3. Helper Cek Ketersediaan Guru (Strict Anti-Conflict & Load Limits) ──
  const isTeacherAvailable = (
    teacherId: string,
    dateKey: string,
    startMs: number,
    endMs: number,
    additionalCheck?: (tId: string) => boolean
  ): boolean => {
    // A. Cek batasan harian jika ditentukan
    if (config.maxSessionsPerDay > 0) {
      const dayMap = teacherDailySessions.get(dateKey);
      const currentDayCount = dayMap ? dayMap.get(teacherId) || 0 : 0;
      if (currentDayCount >= config.maxSessionsPerDay) {
        return false;
      }
    }

    // B. Cek irisan waktu (Overlap Check): start1 < end2 && start2 < end1
    const intervals = teacherBusyIntervals.get(teacherId) || [];
    const hasOverlap = intervals.some((inv) => startMs < inv.end && inv.start < endMs);
    if (hasOverlap) {
      return false;
    }

    // C. Pengecekan kustom tambahan
    if (additionalCheck && !additionalCheck(teacherId)) {
      return false;
    }

    return true;
  };

  // ── 4. Helper Assign Guru ke Baris Jadwal ──
  const assignSupervisorToJadwal = (jadwal: CbtJadwalUjian, teacherId: string) => {
    const dateKey = getDateKey(jadwal.tanggal_mulai);
    const startMs = new Date(jadwal.tanggal_mulai).getTime();
    const endMs = new Date(jadwal.tanggal_selesai).getTime();
    const roomKey = getRoomKey(jadwal);

    // Update draft
    const curr = nextDrafts[jadwal.id] || {
      jadwal_id: jadwal.id,
      ruang_ujian: roomKey,
      pengawas_1_id: '',
      proktor_id: '',
      dirty: false,
    };

    nextDrafts[jadwal.id] = {
      ...curr,
      ruang_ujian: roomKey,
      pengawas_1_id: teacherId,
      dirty: true,
    };

    // Update state tracking
    teacherTotalSessions.set(teacherId, (teacherTotalSessions.get(teacherId) || 0) + 1);

    if (!teacherDailySessions.has(dateKey)) {
      teacherDailySessions.set(dateKey, new Map<string, number>());
    }
    const dayMap = teacherDailySessions.get(dateKey)!;
    dayMap.set(teacherId, (dayMap.get(teacherId) || 0) + 1);

    if (!teacherBusyIntervals.has(teacherId)) {
      teacherBusyIntervals.set(teacherId, []);
    }
    teacherBusyIntervals.get(teacherId)!.push({ start: startMs, end: endMs });

    roomLastTeacher.set(roomKey, teacherId);
    assignedCount++;
  };

  // ── 5. Helper Memilih Guru Terbaik Berdasarkan Load-Balancing (Beban Terendah) ──
  const pickBestCandidate = (
    dateKey: string,
    startMs: number,
    endMs: number,
    additionalCheck?: (tId: string) => boolean,
    preferredTeacherId?: string
  ): CandidateTeacher | null => {
    // Jika ada guru preferensi (misal guru yang sudah memegang sesi sebelumnya di ruang yang sama)
    if (
      preferredTeacherId &&
      isTeacherAvailable(preferredTeacherId, dateKey, startMs, endMs, additionalCheck)
    ) {
      const found = candidates.find((c) => c.id === preferredTeacherId);
      if (found) return found;
    }

    // Filter kandidat yang valid dan tidak bentrok
    const eligible = candidates.filter((c) =>
      isTeacherAvailable(c.id, dateKey, startMs, endMs, additionalCheck)
    );

    if (eligible.length === 0) return null;

    // Urutkan berdasarkan total beban kerja tersedikit (Pemerataan Jam)
    eligible.sort((a, b) => {
      const loadA = teacherTotalSessions.get(a.id) || 0;
      const loadB = teacherTotalSessions.get(b.id) || 0;
      if (loadA !== loadB) return loadA - loadB;

      const dayLoadA = teacherDailySessions.get(dateKey)?.get(a.id) || 0;
      const dayLoadB = teacherDailySessions.get(dateKey)?.get(b.id) || 0;
      return dayLoadA - dayLoadB;
    });

    return eligible[0] || null;
  };

  // ── 6. Filter & Kelompokkan Jadwal yang Membutuhkan Ploting ──
  const schedulesToProcess = jadwalList.filter((j) => {
    const draft = nextDrafts[j.id];
    if (config.onlyUnassigned) {
      return !draft?.pengawas_1_id;
    }
    return true;
  });

  if (schedulesToProcess.length === 0) {
    return { nextDrafts, assignedCount: 0 };
  }

  // Kelompokkan jadwal per tanggal (Hari)
  const schedulesByDate = new Map<string, CbtJadwalUjian[]>();
  schedulesToProcess.forEach((j) => {
    const dKey = getDateKey(j.tanggal_mulai);
    if (!schedulesByDate.has(dKey)) {
      schedulesByDate.set(dKey, []);
    }
    schedulesByDate.get(dKey)!.push(j);
  });

  // Urutkan tanggal secara kronologis
  const sortedDateKeys = Array.from(schedulesByDate.keys()).sort();

  // ── 7. EKSEKUSI DISTRIBUSI BERDASARKAN STRATEGI RUANG ──

  sortedDateKeys.forEach((dateKey) => {
    const daySchedules = schedulesByDate.get(dateKey) || [];

    // Kelompokkan berdasarkan ruang pada hari ini
    const daySchedulesByRoom = new Map<string, CbtJadwalUjian[]>();
    daySchedules.forEach((j) => {
      const rKey = getRoomKey(j);
      if (!daySchedulesByRoom.has(rKey)) {
        daySchedulesByRoom.set(rKey, []);
      }
      daySchedulesByRoom.get(rKey)!.push(j);
    });

    // Urutkan nama ruang (misal R.01, R.02, dst)
    const sortedRoomKeys = Array.from(daySchedulesByRoom.keys()).sort((a, b) =>
      a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
    );

    // ─────────────────────────────────────────────────────────────
    // STRATEGI 1: STAY_ROOM (Full Day per Ruang Kelas)
    // ─────────────────────────────────────────────────────────────
    if (config.roomStrategy === 'STAY_ROOM') {
      sortedRoomKeys.forEach((roomKey) => {
        const roomSessions = daySchedulesByRoom.get(roomKey) || [];
        // Urutkan sesi dalam ruang berdasarkan waktu mulai
        roomSessions.sort(
          (a, b) => new Date(a.tanggal_mulai).getTime() - new Date(b.tanggal_mulai).getTime()
        );

        let activeRoomTeacherId: string | null = null;
        let consecutiveCount = 0;

        roomSessions.forEach((session) => {
          const startMs = new Date(session.tanggal_mulai).getTime();
          const endMs = new Date(session.tanggal_selesai).getTime();

          // Cek apakah guru yang sedang memegang ruang ini masih dapat lanjut
          let canContinue = false;
          if (activeRoomTeacherId) {
            canContinue = isTeacherAvailable(activeRoomTeacherId, dateKey, startMs, endMs);
          }

          if (canContinue && activeRoomTeacherId) {
            assignSupervisorToJadwal(session, activeRoomTeacherId);
            consecutiveCount++;
          } else {
            // Cari guru baru yang lowong untuk sesi ini dan utamakan beban terendah
            const picked = pickBestCandidate(dateKey, startMs, endMs);
            if (picked) {
              activeRoomTeacherId = picked.id;
              consecutiveCount = 1;
              assignSupervisorToJadwal(session, picked.id);
            }
          }
        });
      });
    }

    // ─────────────────────────────────────────────────────────────
    // STRATEGI 2: MAX_N_SESSION_PER_ROOM (Maks N Sesi Lalu Rotasi)
    // ─────────────────────────────────────────────────────────────
    else if (config.roomStrategy === 'MAX_N_SESSION_PER_ROOM') {
      const limit = Math.max(1, config.maxSessionsPerRoom || 2);

      sortedRoomKeys.forEach((roomKey) => {
        const roomSessions = daySchedulesByRoom.get(roomKey) || [];
        roomSessions.sort(
          (a, b) => new Date(a.tanggal_mulai).getTime() - new Date(b.tanggal_mulai).getTime()
        );

        let currentTeacherId: string | null = null;
        let sessionsInThisRoom = 0;

        roomSessions.forEach((session) => {
          const startMs = new Date(session.tanggal_mulai).getTime();
          const endMs = new Date(session.tanggal_selesai).getTime();

          // Cek apakah guru saat ini masih boleh lanjut di kelas ini
          const withinLimit = sessionsInThisRoom < limit;
          let canContinue = false;
          if (currentTeacherId && withinLimit) {
            canContinue = isTeacherAvailable(currentTeacherId, dateKey, startMs, endMs);
          }

          if (canContinue && currentTeacherId) {
            assignSupervisorToJadwal(session, currentTeacherId);
            sessionsInThisRoom++;
          } else {
            // Batas tercapai atau guru bentrok: wajib rotasi ke guru lain
            const forbiddenTeacherId = currentTeacherId;
            const picked = pickBestCandidate(dateKey, startMs, endMs, (tId) => {
              if (forbiddenTeacherId && tId === forbiddenTeacherId && roomSessions.length > 1) {
                return false; // Jangan gunakan guru yang sama jika masih ada opsi lain
              }
              return true;
            });

            if (picked) {
              currentTeacherId = picked.id;
              sessionsInThisRoom = 1;
              assignSupervisorToJadwal(session, picked.id);
            } else if (currentTeacherId && isTeacherAvailable(currentTeacherId, dateKey, startMs, endMs)) {
              // Fallback jika tidak ada guru lain yang available, guru lama terpaksa lanjut
              assignSupervisorToJadwal(session, currentTeacherId);
              sessionsInThisRoom++;
            }
          }
        });
      });
    }

    // ─────────────────────────────────────────────────────────────
    // STRATEGI 3: ROLLING_SESSION (Rotasi Tiap Sesi / Pengawas Silang)
    // ─────────────────────────────────────────────────────────────
    else {
      // Urutkan seluruh sesi hari itu berdasarkan waktu mulai
      const allSessionsToday = [...daySchedules].sort(
        (a, b) => new Date(a.tanggal_mulai).getTime() - new Date(b.tanggal_mulai).getTime()
      );

      allSessionsToday.forEach((session) => {
        const startMs = new Date(session.tanggal_mulai).getTime();
        const endMs = new Date(session.tanggal_selesai).getTime();
        const roomKey = getRoomKey(session);
        const lastTeacherInRoom = roomLastTeacher.get(roomKey);

        // Jangan gunakan guru yang baru saja mengawas di ruangan ini pada sesi sebelumnya
        const picked = pickBestCandidate(dateKey, startMs, endMs, (tId) => {
          if (lastTeacherInRoom && tId === lastTeacherInRoom) {
            return false;
          }
          return true;
        });

        if (picked) {
          assignSupervisorToJadwal(session, picked.id);
        } else {
          // Fallback jika semua guru lain bentrok, izinkan guru yang sama
          const fallback = pickBestCandidate(dateKey, startMs, endMs);
          if (fallback) {
            assignSupervisorToJadwal(session, fallback.id);
          }
        }
      });
    }
  });

  return {
    nextDrafts,
    assignedCount,
  };
}
