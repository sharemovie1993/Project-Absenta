// @ts-nocheck
import { prisma } from '@/utils/prisma';
import { DashboardCommonHelper } from './dashboard-common.helper';
import { Hari } from '@prisma/client';
import { NilaiService } from '@/modules/rapor/services/nilai.service';

export interface UnifiedActionItem {
  id: string;
  division: 'KURIKULUM' | 'RAPOR' | 'KESISWAAN' | 'PIKET' | 'HUBIN' | 'SARPRAS' | 'BPBK' | 'TU' | 'KOPERASI';
  urgency: 'CRITICAL' | 'TODAY' | 'UPCOMING' | 'INFO';
  title: string;
  subtitle: string;
  badgeText: string;
  deadline?: string | null;
  progress?: {
    current: number;
    total: number;
    percent: number;
    label: string;
  };
  action: {
    label: string;
    type: 'NAVIGATE' | 'MODAL';
    target: string;
    payload?: Record<string, any>;
  };
  sourceModule: {
    table: string;
    entityId: string;
  };
}

export interface ActionHubSummary {
  total: number;
  critical: number;
  today: number;
  upcoming: number;
}

export interface ActionHubResult {
  summary: ActionHubSummary;
  actions: UnifiedActionItem[];
}

interface CacheEntry {
  data: ActionHubResult;
  expiresAt: number;
}

const actionHubCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 10 * 1000; // 10 detik in-memory TTL

export class DashboardActionHubService {
  private helper = new DashboardCommonHelper();

  async getMyActionHub(tenantId: string, userId: string): Promise<ActionHubResult> {
    const cacheKey = `${tenantId}:${userId}`;
    const nowTimestamp = Date.now();
    const cached = actionHubCache.get(cacheKey);

    if (cached && cached.expiresAt > nowTimestamp) {
      return cached.data;
    }

    // 1. Resolve Guru Profile
    const guru = await prisma.guru.findFirst({
      where: { user_id: userId, tenant_id: tenantId },
      select: { id: true, nama_guru: true, nip: true }
    });
    const guruId = guru?.id;

    const { startOfDay, endOfDay, dateStr, timeZone } = await this.helper.resolveDayRange(tenantId);

    // 2. Query seluruh modul secara paralel (Promise.allSettled)
    const results = await Promise.allSettled([
      guruId ? this.detectKbmJournalDebts(tenantId, guruId, startOfDay, endOfDay) : Promise.resolve([]),
      guruId ? this.detectPiketDuty(tenantId, guruId, dateStr, timeZone) : Promise.resolve([]),
      guruId ? this.detectUpacaraDuty(tenantId, guruId, startOfDay) : Promise.resolve([]),
      guruId ? this.detectPklTasks(tenantId, guruId) : Promise.resolve([]),
      this.detectRaporTasks(tenantId, userId, guruId),
      this.detectSarprasLoanTasks(tenantId, userId, startOfDay)
    ]);

    // 3. Konsolidasi seluruh item yang sukses diambil
    let allActions: UnifiedActionItem[] = [];
    results.forEach((res) => {
      if (res.status === 'fulfilled' && Array.isArray(res.value)) {
        allActions = allActions.concat(res.value);
      }
    });

    // 4. Urutkan berdasarkan bobot urgensi: CRITICAL > TODAY > UPCOMING > INFO
    const urgencyOrder: Record<string, number> = {
      CRITICAL: 1,
      TODAY: 2,
      UPCOMING: 3,
      INFO: 4,
    };
    allActions.sort((a, b) => (urgencyOrder[a.urgency] ?? 5) - (urgencyOrder[b.urgency] ?? 5));

    // 5. Hitung ringkasan
    const summary: ActionHubSummary = {
      total: allActions.length,
      critical: allActions.filter(a => a.urgency === 'CRITICAL').length,
      today: allActions.filter(a => a.urgency === 'TODAY').length,
      upcoming: allActions.filter(a => a.urgency === 'UPCOMING' || a.urgency === 'INFO').length,
    };

    const finalResult: ActionHubResult = {
      summary,
      actions: allActions,
    };

    actionHubCache.set(cacheKey, {
      data: finalResult,
      expiresAt: nowTimestamp + CACHE_TTL_MS,
    });

    return finalResult;
  }

  // --- DETECTOR 1: Hutang Jurnal KBM (Modul Kurikulum/Absensi) ---
  private async detectKbmJournalDebts(
    tenantId: string, 
    guruId: string, 
    startOfDay: Date, 
    endOfDay: Date
  ): Promise<UnifiedActionItem[]> {
    try {
      // Periksa sesi mengajar hari ini atau 2 hari ke belakang yang belum memiliki ProgresMateri
      const pastThreeDays = new Date(startOfDay.getTime() - (2 * 24 * 60 * 60 * 1000));
      
      const unjournaledSessions = await prisma.sesiAbsensi.findMany({
        where: {
          tenant_id: tenantId,
          OR: [
            { guru_id: guruId },
            { guru_pelaksana_id: guruId }
          ],
          tanggal: { gte: pastThreeDays, lte: endOfDay },
          ProgresMateri: { is: null }
        },
        include: {
          Kelas: { select: { id: true, nama_kelas: true } },
          Mapel: { select: { id: true, nama_mapel: true } }
        },
        orderBy: { tanggal: 'desc' },
        take: 3
      });

      return unjournaledSessions.map(sesi => ({
        id: `kbm_journal_${sesi.id}`,
        division: 'KURIKULUM',
        urgency: 'CRITICAL',
        title: 'Hutang Jurnal KBM',
        subtitle: `${sesi.Mapel?.nama_mapel || 'KBM'} • ${sesi.Kelas?.nama_kelas || 'Kelas'} (Slot ${sesi.slot_kbm || '-'})`,
        badgeText: 'Perlu Diisi',
        action: {
          label: 'Isi Jurnal ➔',
          type: 'MODAL',
          target: 'JURNAL_KBM_MODAL',
          payload: {
            id: sesi.id,
            kelas_nama: sesi.Kelas?.nama_kelas,
            mapel_nama: sesi.Mapel?.nama_mapel,
            kegiatan: `${sesi.Mapel?.nama_mapel || 'KBM'} di ${sesi.Kelas?.nama_kelas || 'Kelas'}`
          }
        },
        sourceModule: {
          table: 'SesiAbsensi',
          entityId: sesi.id
        }
      }));
    } catch (e) {
      return [];
    }
  }

  // --- DETECTOR 2: Piket KBM Harian & Mingguan (Modul Kesiswaan/Piket) ---
  private async detectPiketDuty(
    tenantId: string, 
    guruId: string, 
    dateStr: string, 
    timeZone?: string
  ): Promise<UnifiedActionItem[]> {
    try {
      // 1. Dapatkan periode Tahun Pelajaran & Semester aktif
      const [activeTp, activeSem] = await Promise.all([
        prisma.tahunPelajaran.findFirst({
          where: { tenant_id: tenantId, is_active: true },
          select: { id: true }
        }),
        prisma.semester.findFirst({
          where: { tenant_id: tenantId, is_active: true },
          select: { id: true }
        })
      ]);

      const whereCondition: any = {
        tenant_id: tenantId,
        guru_id: guruId,
      };
      if (activeTp?.id) whereCondition.tahun_pelajaran_id = activeTp.id;
      if (activeSem?.id) whereCondition.semester_id = activeSem.id;

      let piketList = await prisma.jadwalPiketGuru.findMany({
        where: whereCondition,
      });

      // Fallback jika belum tersinkronisasi semester aktif
      if (piketList.length === 0 && (activeTp?.id || activeSem?.id)) {
        piketList = await prisma.jadwalPiketGuru.findMany({
          where: {
            tenant_id: tenantId,
            guru_id: guruId,
          }
        });
      }

      if (!piketList || piketList.length === 0) return [];

      const dayMap: Record<Hari, number> = {
        [Hari.MINGGU]: 0,
        [Hari.SENIN]: 1,
        [Hari.SELASA]: 2,
        [Hari.RABU]: 3,
        [Hari.KAMIS]: 4,
        [Hari.JUMAT]: 5,
        [Hari.SABTU]: 6,
      };

      const dayDisplayNames: Record<Hari, string> = {
        [Hari.MINGGU]: 'Minggu',
        [Hari.SENIN]: 'Senin',
        [Hari.SELASA]: 'Selasa',
        [Hari.RABU]: 'Rabu',
        [Hari.KAMIS]: 'Kamis',
        [Hari.JUMAT]: 'Jumat',
        [Hari.SABTU]: 'Sabtu',
      };

      // Hitung indeks hari saat ini sesuai tanggal operasional sekolah
      const targetDate = new Date(`${dateStr}T12:00:00Z`);
      const currentDayIndex = targetDate.getUTCDay();

      const actionItems: UnifiedActionItem[] = [];

      for (const piket of piketList) {
        const piketDayIndex = dayMap[piket.hari];
        if (piketDayIndex === undefined) continue;

        // Jarak hari ke depan (0 = hari ini, 1 = besok, ..., 6 = 6 hari lagi)
        const diffDays = (piketDayIndex - currentDayIndex + 7) % 7;
        const hariLabel = dayDisplayNames[piket.hari] || piket.hari;

        // Susun format waktu operasional piket (Jam & Slot)
        const timeStr = piket.jam_mulai && piket.jam_selesai 
          ? `Pukul ${piket.jam_mulai} - ${piket.jam_selesai} WIB`
          : piket.jam_mulai 
          ? `Mulai ${piket.jam_mulai} WIB`
          : null;
        const slotStr = piket.slot_mulai && piket.slot_selesai
          ? `Slot ${piket.slot_mulai} - ${piket.slot_selesai}`
          : null;
        const posText = piket.pos_piket || 'Pos Piket Utama';

        let dutySubtitle = posText;
        if (timeStr && slotStr) {
          dutySubtitle += ` • ${timeStr} (${slotStr})`;
        } else if (timeStr) {
          dutySubtitle += ` • ${timeStr}`;
        } else if (slotStr) {
          dutySubtitle += ` • ${slotStr}`;
        } else {
          dutySubtitle += ' • Sepanjang Hari';
        }

        if (diffDays === 0) {
          // Bertugas Hari Ini (TODAY)
          actionItems.push({
            id: `piket_duty_today_${piket.id}`,
            division: 'PIKET',
            urgency: 'TODAY',
            title: 'Jadwal Piket KBM Hari Ini',
            subtitle: dutySubtitle,
            badgeText: 'Hari Ini',
            deadline: piket.jam_selesai ? `${piket.jam_selesai} WIB` : null,
            action: {
              label: 'Buka Piket ➔',
              type: 'NAVIGATE',
              target: '/kesiswaan/piket'
            },
            sourceModule: {
              table: 'JadwalPiketGuru',
              entityId: piket.id
            }
          });
        } else {
          // Jadwal Bertugas Mendatang (UPCOMING)
          const relativeText = diffDays === 1 ? 'Besok' : `${diffDays} hari lagi`;
          actionItems.push({
            id: `piket_duty_upcoming_${piket.id}`,
            division: 'PIKET',
            urgency: 'UPCOMING',
            title: `Jadwal Piket: ${hariLabel}`,
            subtitle: dutySubtitle,
            badgeText: `${hariLabel} (${relativeText})`,
            deadline: piket.jam_mulai ? `${piket.jam_mulai} WIB` : null,
            action: {
              label: 'Buka Piket ➔',
              type: 'NAVIGATE',
              target: '/kesiswaan/piket'
            },
            sourceModule: {
              table: 'JadwalPiketGuru',
              entityId: piket.id
            }
          });
        }
      }

      // Urutkan item piket: TODAY duluan, lalu UPCOMING terdekat
      actionItems.sort((a, b) => {
        if (a.urgency === 'TODAY' && b.urgency !== 'TODAY') return -1;
        if (b.urgency === 'TODAY' && a.urgency !== 'TODAY') return 1;
        return 0;
      });

      return actionItems;
    } catch (e) {
      return [];
    }
  }

  // --- DETECTOR 3: Pembina Upacara Terdekat (Modul Kesiswaan) ---
  private async detectUpacaraDuty(tenantId: string, guruId: string, startOfDay: Date): Promise<UnifiedActionItem[]> {
    try {
      const nextWeek = new Date(startOfDay.getTime() + (7 * 24 * 60 * 60 * 1000));

      const upacara = await prisma.jadwalPembinaUpacara.findFirst({
        where: {
          tenant_id: tenantId,
          guru_id: guruId,
          tanggal: { gte: startOfDay, lte: nextWeek },
          status: 'DIJADWALKAN'
        },
        include: {
          KelasPetugas: { select: { nama_kelas: true } }
        },
        orderBy: { tanggal: 'asc' }
      });

      if (!upacara) return [];

      const tglFormatted = new Date(upacara.tanggal).toLocaleDateString('id-ID', {
        weekday: 'short',
        day: '2-digit',
        month: 'short'
      });

      return [{
        id: `upacara_duty_${upacara.id}`,
        division: 'KESISWAAN',
        urgency: 'UPCOMING',
        title: 'Petugas Pembina Upacara',
        subtitle: `Tema: ${upacara.tema_amanat || 'Kedisiplinan'} • ${upacara.KelasPetugas?.nama_kelas ? 'Petugas: ' + upacara.KelasPetugas.nama_kelas : 'Upacara Bendera'}`,
        badgeText: tglFormatted,
        action: {
          label: 'Detail Upacara ➔',
          type: 'NAVIGATE',
          target: '/kesiswaan/program-ketarunaan?tab=upacara'
        },
        sourceModule: {
          table: 'JadwalPembinaUpacara',
          entityId: upacara.id
        }
      }];
    } catch (e) {
      return [];
    }
  }

  // --- DETECTOR 4: Bimbingan Siswa PKL (Modul Hubin) ---
  private async detectPklTasks(tenantId: string, guruId: string): Promise<UnifiedActionItem[]> {
    try {
      const activePklStudents = await prisma.siswaPkl.findMany({
        where: {
          tenant_id: tenantId,
          pembimbing_id: guruId,
          status: 'AKTIF'
        },
        select: {
          id: true,
          nilai_akhir_pkl: true,
          tanggal_selesai: true,
        }
      });

      if (!activePklStudents.length) return [];

      const unassessedCount = activePklStudents.filter(s => s.nilai_akhir_pkl === null).length;

      return [{
        id: `pkl_guidance_${guruId}`,
        division: 'HUBIN',
        urgency: unassessedCount > 0 ? 'UPCOMING' : 'INFO',
        title: 'Bimbingan Siswa PKL',
        subtitle: `${activePklStudents.length} Siswa bimbingan PKL aktif di DUDI (${unassessedCount} belum dinilai)`,
        badgeText: `${activePklStudents.length} Siswa`,
        progress: {
          current: activePklStudents.length - unassessedCount,
          total: activePklStudents.length,
          percent: Math.round(((activePklStudents.length - unassessedCount) / activePklStudents.length) * 100),
          label: `${activePklStudents.length - unassessedCount}/${activePklStudents.length} Dinilai`
        },
        action: {
          label: 'Kelola PKL ➔',
          type: 'NAVIGATE',
          target: '/dashboard?tab=pembimbing_pkl'
        },
        sourceModule: {
          table: 'SiswaPkl',
          entityId: guruId
        }
      }];
    } catch (e) {
      return [];
    }
  }

  // --- DETECTOR 5: Rapor & Penginputan Nilai (Modul Rapor) ---
  private async detectRaporTasks(tenantId: string, userId: string, guruId?: string): Promise<UnifiedActionItem[]> {
    try {
      // Panggil engine resmi yang sama persis dengan halaman /rapor/input-nilai
      const progress = await NilaiService.getTeacherProgress(
        tenantId,
        { id: userId, roleName: 'GURU' },
        {}
      );

      if (progress && progress.tasks && progress.total_tasks > 0) {
        const tasks = progress.tasks;
        const uniqueMapelNames = Array.from(new Set(tasks.map((t: any) => t.nama_mapel).filter(Boolean)));
        const mapelLabel = uniqueMapelNames.length === 1 
          ? uniqueMapelNames[0] 
          : uniqueMapelNames.length > 1 
          ? `${uniqueMapelNames.length} Mata Pelajaran`
          : 'Akademik';

        const uncompletedCount = (progress.empty_tasks || 0) + (progress.partial_tasks || 0);

        return [{
          id: `rapor_task_${userId}`,
          division: 'RAPOR',
          urgency: uncompletedCount > 0 ? 'UPCOMING' : 'INFO',
          title: 'Penginputan Nilai Rapor & Formatif',
          subtitle: `Mengampu ${progress.total_tasks} rombel kelas binaan (${mapelLabel})`,
          badgeText: `${progress.total_tasks} Rombel`,
          progress: {
            current: progress.completed_tasks || 0,
            total: progress.total_tasks,
            percent: progress.percentage || 0,
            label: `${progress.completed_tasks || 0}/${progress.total_tasks} Dinilai`
          },
          action: {
            label: 'Input Nilai ➔',
            type: 'NAVIGATE',
            target: '/rapor/input-nilai'
          },
          sourceModule: {
            table: 'NilaiSiswa',
            entityId: userId
          }
        }];
      }

      // STRICT: Tidak menggunakan fallback. Jika tidak ada tugas aktif dari NilaiService, return empty.
      return [];
    } catch (e) {
      return [];
    }
  }

  // --- DETECTOR 6: Peminjaman Aset Sarpras (Modul Sarpras) ---
  private async detectSarprasLoanTasks(tenantId: string, userId: string, startOfDay: Date): Promise<UnifiedActionItem[]> {
    try {
      const tomorrow = new Date(startOfDay.getTime() + (24 * 60 * 60 * 1000));

      const loans = await prisma.sarprasLoan.findMany({
        where: {
          tenant_id: tenantId,
          peminjam_id: userId,
          status: { in: ['APPROVED', 'DIPINJAM', 'ACTIVE', 'OVERDUE'] }
        },
        include: {
          Asset: { select: { nama_barang: true, kode_barang: true } }
        },
        take: 2
      });

      return loans.map(loan => {
        const isOverdue = loan.status === 'OVERDUE' || (loan.tanggal_kembali_plan && new Date(loan.tanggal_kembali_plan) < startOfDay);
        return {
          id: `sarpras_loan_${loan.id}`,
          division: 'SARPRAS',
          urgency: isOverdue ? 'CRITICAL' : 'TODAY',
          title: 'Pengembalian Aset Sarpras',
          subtitle: `Aset: ${loan.Asset?.nama_barang || 'Barang Sekolah'} (${loan.Asset?.kode_barang || '-'})`,
          badgeText: isOverdue ? 'Terlambat' : 'Jatuh Tempo',
          action: {
            label: 'Lihat Aset ➔',
            type: 'NAVIGATE',
            target: '/sarpras/inventory'
          },
          sourceModule: {
            table: 'SarprasLoan',
            entityId: loan.id
          }
        };
      });
    } catch (e) {
      return [];
    }
  }
}

export const dashboardActionHubService = new DashboardActionHubService();
