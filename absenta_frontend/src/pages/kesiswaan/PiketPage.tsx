import React, { useState, useMemo, useCallback } from 'react';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';
import { z } from 'zod';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Tabs, TabsContent } from '../../components/ui/Tabs';
import { TabSwitcher } from '../../components/ui/TabSwitcher';
import {
  Scan,
  Clock,
  History,
  ShieldCheck,
  FileText,
  CheckCircle,
  Lock,
  UserCheck,
  UserX,
  Calendar,
  Briefcase
} from 'lucide-react';
import { piketApi, piketQueryKeys } from '../../api/piket.api';
import type { IzinKeluarSiswa } from '../../api/piket.api';
import { type JadwalPiketGuru } from '../../api/piketGuru.api';
import { getSesiAbsensiList } from '../../api/attendanceGerbang.api';
import { toLocalDate } from '../../utils/attendance/time';
import { useAuthStore } from '../../store/authStore';
import { useCapabilities } from '../../hooks/useCapabilities';
import { usePiketGuruOptions } from '../../hooks/usePiketGuruOptions';
import { usePiketIzinKeluarOptions } from '../../hooks/usePiketIzinKeluarOptions';
import { usePiketGateStore } from '../../hooks/usePiketGateStore';
import { calculatePiketAnalytics, getPiketPersonaConfig, type PiketPersonaMode } from '../../utils/piketStatusHelper';
import { tenantApi } from '../../api/tenants.api';
import { fetchActiveSystemConfig } from '../../services/systemConfig';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { AcademicPageLayout } from '../../components/academic/AcademicPageLayout';

// Import modular components
import { PiketOperations } from '../../components/piket/PiketOperations';
import { PiketMonitoring } from '../../components/piket/PiketMonitoring';
import { PiketHistory } from '../../components/piket/PiketHistory';
import { PiketRecap } from '../../components/piket/PiketRecap';
import { PiketTeacherMonitoring } from '../../components/piket/PiketTeacherMonitoring';
import { PiketTeacherLeavePanel } from '../../components/piket/PiketTeacherLeavePanel';
import { guruIzinApi } from '../../api/guruIzin.api';
import { PiketPrintSlip } from '../../components/piket/PiketPrintSlip';
import { PiketPrintRecap } from '../../components/piket/PiketPrintRecap';

// ── ZOD VALIDATION SCHEMA FOR HARDENING ──────────────────────────────────────
export const piketPersonaConfigSchema = z.object({
  personaMode: z.enum(['UTAMA', 'JURUSAN']),
  selectedJurusanNama: z.string().max(50, 'Kode/Nama jurusan maksimal 50 karakter').optional()
});

export type PiketPersonaConfigInput = z.infer<typeof piketPersonaConfigSchema>;

export interface PrintPreset {
  id: string;
  name: string;
  width: string;
  pageSize: string;
  padding: string;
  fontSize: string;
}

export const PRINT_PRESETS: PrintPreset[] = [
  { id: '58mm', name: 'Thermal Mini (58mm)', width: '58mm', pageSize: '58mm auto', padding: '6px', fontSize: '9px' },
  { id: '80mm', name: 'Thermal Standard (80mm)', width: '80mm', pageSize: '80mm auto', padding: '12px', fontSize: '11px' },
  { id: 'a6', name: 'Compact Slip (A6)', width: '105mm', pageSize: '105mm 148mm', padding: '16px', fontSize: '12px' },
  { id: 'a5', name: 'Administrative Slip (A5)', width: '148mm', pageSize: '148mm 210mm', padding: '20px', fontSize: '13px' },
  { id: 'a4', name: 'Official Letter (A4)', width: '210mm', pageSize: 'A4 portrait', padding: '15mm', fontSize: '14px' },
];

interface ExtendedJadwalPiketGuru extends JadwalPiketGuru {
  Jurusan?: {
    id?: string;
    nama_jurusan?: string;
    kode?: string;
    singkatan?: string;
    nama?: string;
  };
}

interface GuruProfileWithJurusan {
  id?: string;
  jurusan?: {
    singkatan?: string;
    nama_jurusan?: string;
  };
}

export default function PiketPage() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const { isKesiswaan, isKurikulum, isGerbang, isTU, isKepsek, isAdmin, can } = useCapabilities();
  const currentGuruId = (user?.guru_profile as { id?: string })?.id;

  // Management and Guru roles who ALWAYS have access to Meja Piket
  const isManagement = useMemo(() => {
    if (isAdmin) return true;
    if (can('attendance.piket.manage') || can('attendance.piket.view')) return true;
    return isKesiswaan || isKurikulum || isGerbang || isTU || isKepsek || !!user?.isTeacher;
  }, [isAdmin, can, isKesiswaan, isKurikulum, isGerbang, isTU, isKepsek, user?.isTeacher]);

  // ── Custom Hook: Guru Piket Hari Ini (Jadwal Piket Guru) ───────────────────
  const { guruPiketHariIni } = usePiketGuruOptions();

  // Logged-in teacher's piket schedule for today
  const myPiketScheduleToday = useMemo(() => {
    if (!guruPiketHariIni.length || !user) return null;
    const guruProfileId = currentGuruId;
    const userId = user.id;
    return (
      guruPiketHariIni.find((g: JadwalPiketGuru) => {
        const gGuruId = String(g.guru_id || '');
        const gUserId = String(g.Guru?.user_id || '');
        const gGuruProfileId = String(g.Guru?.id || '');
        return (
          (guruProfileId && (gGuruId === String(guruProfileId) || gGuruProfileId === String(guruProfileId))) ||
          (userId && (gGuruId === String(userId) || gUserId === String(userId)))
        );
      }) || null
    );
  }, [user, currentGuruId, guruPiketHariIni]);

  // Is logged-in teacher assigned to Piket TODAY?
  const isAssignedPiketToday = Boolean(myPiketScheduleToday);

  // Final permission check to operate Meja Piket (open to management, on-duty teachers, and all authenticated teachers)
  const canOperatePiket = isManagement || isAssignedPiketToday || Boolean(user);

  // Active persona mode state (Piket Utama vs Piket Jurusan/Lab)
  const [personaMode, setPersonaMode] = useState<PiketPersonaMode>('UTAMA');
  const [selectedJurusanNama, setSelectedJurusanNama] = useState<string>('');

  // Handler input nama/kode jurusan dengan Zod Validation Guard
  const handleJurusanNamaChange = useCallback((value: string) => {
    const parseResult = piketPersonaConfigSchema.safeParse({
      personaMode,
      selectedJurusanNama: value
    });

    if (parseResult.success) {
      setSelectedJurusanNama(value);
    } else {
      // Jika string terlalu panjang, pangkas sesuai batasan schema (max 50)
      setSelectedJurusanNama(value.slice(0, 50));
    }
  }, [personaMode]);

  // Smart Auto-switch persona mode based on logged-in teacher's piket schedule or profile
  React.useEffect(() => {
    if (myPiketScheduleToday) {
      const pos = (myPiketScheduleToday.pos_piket || '').trim();
      const posUpper = pos.toUpperCase();
      const extSchedule = myPiketScheduleToday as ExtendedJadwalPiketGuru;
      const jObj = extSchedule.Jurusan;

      const isJurusanKeyword =
        posUpper.includes('JURUSAN') ||
        posUpper.includes('LAB') ||
        posUpper.includes('BENGKEL') ||
        Boolean(jObj);

      if (isJurusanKeyword) {
        setPersonaMode('JURUSAN');

        let extractedJurusan = jObj?.singkatan || jObj?.kode || jObj?.nama_jurusan || jObj?.nama || '';

        if (!extractedJurusan) {
          const match = pos.match(/(?:Piket\s+)?(?:Jurusan|Lab|Bengkel)\s+(.+)/i);
          if (match && match[1]) {
            extractedJurusan = match[1].trim();
          } else if (!['PIKET JURUSAN', 'JURUSAN', 'LAB', 'BENGKEL'].includes(posUpper)) {
            extractedJurusan = pos.replace(/piket/gi, '').replace(/jurusan/gi, '').replace(/lab/gi, '').replace(/bengkel/gi, '').trim();
          }
        }

        if (extractedJurusan) {
          setSelectedJurusanNama(extractedJurusan);
        }
        return;
      }

      if (posUpper.includes('UMUM') || posUpper.includes('UTAMA')) {
        setPersonaMode('UTAMA');
        return;
      }
    }

    // Fallback: Check profile guru
    const guruProf = user?.guru_profile as GuruProfileWithJurusan | undefined;
    const guruJurusan = guruProf?.jurusan?.singkatan || guruProf?.jurusan?.nama_jurusan || '';
    if (guruJurusan && !selectedJurusanNama) {
      setSelectedJurusanNama(guruJurusan);
    }
  }, [myPiketScheduleToday, user, selectedJurusanNama]);

  const personaConfig = useMemo(() => {
    return getPiketPersonaConfig(personaMode, selectedJurusanNama);
  }, [personaMode, selectedJurusanNama]);

  // Tab Active State
  const [activeTab, setActiveTab] = useState('scan');

  // Printing States
  const [printedPermit, setPrintedPermit] = useState<(IzinKeluarSiswa & { qrCodeUrl?: string }) | null>(null);
  const [printPaperSize, setPrintPaperSize] = useState<string>('80mm');
  const [isPrintingRekap, setIsPrintingRekap] = useState(false);
  const [recapPermits, setRecapPermits] = useState<IzinKeluarSiswa[]>([]);
  const [recapDateLabel, setRecapDateLabel] = useState<string>('');
  const [recapSignatureDate, setRecapSignatureDate] = useState<string>('');

  // Search/Filter states
  const [historySearch, setHistorySearch] = useState('');

  // Confirmation dialog states
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [permitToDelete, setPermitToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // ── useQuery: Tenant & System Config ────────────────────────────────────
  const { data: tenantRes } = useQuery({
    queryKey: ['my-tenant'],
    queryFn: () => tenantApi.getMyTenant().catch(() => null),
    staleTime: 10 * 60 * 1000,
  });
  const tenantInfo = tenantRes?.success ? tenantRes.data : null;

  const { data: systemConfigData } = useQuery({
    queryKey: ['system-config'],
    queryFn: () => fetchActiveSystemConfig().catch(() => null),
    staleTime: 10 * 60 * 1000,
  });
  const systemConfig = systemConfigData || null;

  // ── Custom Hook: Daily Permits (Izin Keluar Siswa) ────────────────────────
  const { rawList: dailyPermits, loadingPermits, refetch: refetchPermits } = usePiketIzinKeluarOptions();

  // Shared Action: Mark returned (Siswa Kembali)
  const handleMarkReturned = useCallback(async (id: string, namaSiswa: string): Promise<boolean> => {
    try {
      const res = await piketApi.markReturned(id);
      if (res.success) {
        toast.success(`Siswa ${namaSiswa} dinyatakan telah kembali ke sekolah`);
        queryClient.invalidateQueries({ queryKey: piketQueryKeys.all });
        queryClient.invalidateQueries({ queryKey: ['piket-harian-list'] });
        queryClient.invalidateQueries({ queryKey: ['piket-harian'] });
        queryClient.invalidateQueries({ queryKey: ['piket-range'] });
        queryClient.invalidateQueries({ queryKey: ['attendance-sessions'] });
        queryClient.invalidateQueries({ queryKey: ['kesiswaan-stats'] });
        refetchPermits();
        return true;
      }
      return false;
    } catch (err: unknown) {
      console.error(err);
      const e = err as { message?: string };
      toast.error(e.message || 'Gagal memproses kepulangan siswa');
      return false;
    }
  }, [queryClient, refetchPermits]);

  // Shared Action: Delete/Cancel permit (Batal Izin)
  const handleDeletePermit = useCallback(async (id: string) => {
    setPermitToDelete(id);
    setDeleteConfirmOpen(true);
  }, []);

  // Memos
  const activeOutStudents = useMemo(() => {
    return dailyPermits.filter(p => p.status === 'DISETUJUI');
  }, [dailyPermits]);

  const today = toLocalDate();
  const { data: sesiDataToday } = useQuery({
    queryKey: ['monitoring-sesi-absensi-piket', today],
    queryFn: () => getSesiAbsensiList({ tanggal: today, include_scheduled: true, summary: true, status_filter: 'READY_UNOPENED', limit: 500 }),
    refetchInterval: 15000,
  });

  const pendingTeacherCount = useMemo(() => {
    const rawData = (sesiDataToday as any)?.data;
    const rawSessions: any[] = Array.isArray(rawData)
      ? rawData
      : Array.isArray(rawData?.data)
      ? rawData.data
      : Array.isArray(rawData?.sessions)
      ? rawData.sessions
      : Array.isArray((sesiDataToday as any)?.sessions)
      ? (sesiDataToday as any).sessions
      : [];
    return Array.isArray(rawSessions) ? rawSessions.length : 0;
  }, [sesiDataToday]);

  // Fetch pending teacher leave count for badge indicator
  const { data: pendingLeaveRes } = useQuery({
    queryKey: ['guru-izin-pending-count'],
    queryFn: () => guruIzinApi.getAll({ status: 'PENDING', limit: 100 }).catch(() => null),
    refetchInterval: 30000
  });

  const pendingLeaveCount = useMemo(() => {
    const raw = (pendingLeaveRes as any)?.data;
    return Array.isArray(raw) ? raw.length : 0;
  }, [pendingLeaveRes]);

  const tabOptions = useMemo(() => [
    { id: 'scan', label: 'Operasional Piket', icon: Scan, colorClass: 'text-indigo-600 dark:text-indigo-400' },
    {
      id: 'guru_kbm',
      label: (
        <span className="relative flex items-center">
          Guru Belum Masuk
          {pendingTeacherCount > 0 && (
            <Badge variant="outline" className="ml-1.5 px-1.5 py-0.5 rounded-full text-[9px] font-black bg-amber-500 text-slate-950 animate-pulse border-none">
              {pendingTeacherCount}
            </Badge>
          )}
        </span>
      ),
      icon: UserX,
      colorClass: 'text-amber-600 dark:text-amber-400'
    },
    {
      id: 'guru_izin',
      label: (
        <span className="relative flex items-center">
          Izin/Dinas Guru
          {pendingLeaveCount > 0 && (
            <Badge variant="outline" className="ml-1.5 px-1.5 py-0.5 rounded-full text-[9px] font-black bg-rose-500 text-white animate-pulse border-none">
              {pendingLeaveCount}
            </Badge>
          )}
        </span>
      ),
      icon: Briefcase,
      colorClass: 'text-purple-600 dark:text-purple-400'
    },
    {
      id: 'monitoring',
      label: (
        <span className="relative flex items-center">
          Monitoring Siswa
          {activeOutStudents.length > 0 && (
            <Badge variant="outline" className="ml-1.5 px-1.5 py-0.5 rounded-full text-[9px] font-black bg-rose-500 text-white animate-bounce border-none">
              {activeOutStudents.length}
            </Badge>
          )}
        </span>
      ),
      icon: Clock,
      colorClass: 'text-rose-600 dark:text-rose-400'
    },
    { id: 'history', label: 'Riwayat Hari Ini', icon: History, colorClass: 'text-blue-600 dark:text-blue-400' },
    { id: 'rekap', label: 'Rekap Harian', icon: FileText, colorClass: 'text-violet-600 dark:text-violet-400' }
  ], [activeOutStudents, pendingTeacherCount, pendingLeaveCount]);

  const filteredHistory = useMemo(() => {
    if (!historySearch.trim()) return dailyPermits;
    const s = historySearch.toLowerCase();
    return dailyPermits.filter(
      p => (p.SiswaAkademik?.siswa?.nama_siswa || '').toLowerCase().includes(s) ||
        (p.SiswaAkademik?.siswa?.nis || '').includes(s) ||
        p.alasan.toLowerCase().includes(s)
    );
  }, [dailyPermits, historySearch]);

  const currentPreset = useMemo(() => {
    return PRINT_PRESETS.find(p => p.id === printPaperSize) || PRINT_PRESETS[1];
  }, [printPaperSize]);

  const { exitedGateIds } = usePiketGateStore();

  const piketStats = useMemo(() => {
    const { countSedangDiLuar, countSudahKembali, countPulangAwal, totalPermitsToday } = calculatePiketAnalytics(dailyPermits, exitedGateIds);

    return [
      {
        title: 'Siswa di Luar (Aktif)',
        value: countSedangDiLuar,
        icon: <Clock size={14} />,
        gradient: 'from-amber-500 to-orange-600',
        subtitle: 'Izin keluar yang masih aktif'
      },
      {
        title: 'Total Izin Terbit',
        value: totalPermitsToday,
        icon: <FileText size={14} />,
        gradient: 'from-indigo-500 to-blue-600',
        subtitle: `${countPulangAwal} izin pulang awal`
      },
      {
        title: 'Siswa Sudah Kembali',
        value: countSudahKembali,
        icon: <CheckCircle size={14} />,
        gradient: 'from-emerald-500 to-teal-600',
        subtitle: 'Izin sementara kembali ke sekolah'
      },
      {
        title: 'Status Gerbang',
        value: 'Siaga',
        icon: <ShieldCheck size={14} />,
        gradient: 'from-rose-500 to-pink-600',
        subtitle: 'Pos satpam terkoneksi real-time'
      }
    ];
  }, [dailyPermits, exitedGateIds]);

  const piketInstruction = useMemo(() => ({
    title: "Panduan Penggunaan Meja Piket & Kedisiplinan",
    description: "Gunakan menu navigasi (tab) untuk mengakses fitur operasional piket, pemantauan, dan riwayat.",
    items: [
      { text: "Operasional Piket: Untuk melakukan proses scan RFID/QR dan mencetak izin siswa keluar." },
      { text: "Monitoring Siswa: Untuk memantau daftar siswa yang sedang berada di luar sekolah." },
      { text: "Pos Keamanan: Dipergunakan oleh pos satpam untuk validasi izin ketika siswa akan keluar/masuk." },
      { text: "Rekap Harian: Untuk melihat rekapitulasi izin keluar pada hari ini atau rentang tanggal tertentu." }
    ]
  }), []);

  return (
    <AcademicPageLayout
      title="Meja Piket"
      description="Kesiswaan & Kedisiplinan"
      stats={[]}
      hardeningModuleKey="kesiswaan_piket"
      instruction={piketInstruction}
    >
      <div className="space-y-6 pb-12 relative">
        {!canOperatePiket ? (
          /* RESTRICTED ACCESS SCREEN FOR REGULAR TEACHERS NOT ON DUTY TODAY */
          <Card className="p-8 text-center max-w-2xl mx-auto shadow-md border border-slate-200 dark:border-slate-800">
            <div className="w-16 h-16 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto mb-4 border border-rose-200 dark:border-rose-800">
              <Lock size={32} />
            </div>
            <h3 className="text-lg font-black text-slate-900 dark:text-slate-100 mb-1">
              Akses Meja Piket Dibatasi
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-6 leading-relaxed">
              Halaman Meja Piket &amp; Operasional Kesiswaan khusus digunakan oleh <strong>Guru Bertugas Piket Hari Ini</strong> dan <strong>Tim Manajemen Sekolah</strong> (Kurikulum, Kesiswaan, Kepsek &amp; Admin).
            </p>

            {/* Info Box Guru Bertugas Hari Ini */}
            <div className="bg-slate-50 dark:bg-slate-900/60 rounded-xl p-4 text-left border border-slate-200 dark:border-slate-700/60 mb-6 space-y-3 text-xs">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
                <span className="font-bold text-slate-600 dark:text-slate-300">📅 Hari Ini:</span>
                <span className="font-black text-indigo-600 dark:text-indigo-400 uppercase">
                  {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </span>
              </div>
              <div>
                <span className="font-bold text-slate-600 dark:text-slate-300 block mb-1.5">
                  👥 Guru Bertugas Piket Resmi Hari Ini:
                </span>
                {(guruPiketHariIni || []).length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {guruPiketHariIni?.map((g: JadwalPiketGuru) => (
                      <span key={g.id} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60">
                        <UserCheck size={13} /> {g.Guru?.nama_guru || 'Guru Piket'} ({g.pos_piket || 'Piket Umum'})
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-400 italic text-xs">Belum ada alokasi guru piket yang diset untuk hari ini.</p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-center gap-3">
              <Link
                to="/kurikulum/jadwal-piket"
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition"
                aria-label="Lihat Jadwal Piket Guru Saya"
              >
                <Calendar size={14} />
                <span>Lihat Jadwal Piket Guru Saya</span>
              </Link>
            </div>
          </Card>
        ) : (
          /* FULL MEJA PIKET INTERFACE FOR AUTHORIZED DUTY TEACHERS & MANAGEMENT */
          <>
            {/* TABS & COMPACT PERSONA SWITCHER BAR */}
            <div className="print:hidden">
              <Card className="p-4 sm:p-5 shadow-sm overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 rounded-2xl">
                <Tabs value={activeTab} onValueChange={setActiveTab} color="indigo" variant="soft" className="w-full">
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4 mb-4">
                    <TabSwitcher
                      options={tabOptions}
                      activeTab={activeTab}
                      onChange={setActiveTab}
                      className="justify-start overflow-x-auto scrollbar-none"
                    />

                    {/* Auto-Detected Persona Indicator Badge */}
                    <div className="flex items-center gap-2 shrink-0 self-end md:self-auto">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-black uppercase tracking-wide border ${
                        personaMode === 'JURUSAN'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800'
                          : 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/50 dark:text-indigo-300 dark:border-indigo-800'
                      }`}>
                        {personaMode === 'JURUSAN' ? '🛠️ Piket Jurusan' : '🌐 Piket Utama'}
                        {selectedJurusanNama && personaMode === 'JURUSAN' && (
                          <span className="font-extrabold text-emerald-600 dark:text-emerald-400">
                            ({selectedJurusanNama})
                          </span>
                        )}
                      </span>
                    </div>
                  </div>

                  {/* TAB 1: OPERASIONAL SCANNER */}
                  <TabsContent value="scan" className="mt-4 space-y-8">
                    <PiketOperations
                      dailyPermits={dailyPermits}
                      fetchPermits={refetchPermits}
                      tenantInfo={tenantInfo}
                      user={user}
                      setPrintedPermit={setPrintedPermit}
                      printPaperSize={printPaperSize}
                      setPrintPaperSize={setPrintPaperSize}
                      personaMode={personaMode}
                      namaJurusan={selectedJurusanNama}
                    />
                  </TabsContent>

                  {/* TAB: PANTAU GURU KBM (SIAP MULAI TAPI BELUM TAP) */}
                  <TabsContent value="guru_kbm" className="mt-4 space-y-6">
                    <PiketTeacherMonitoring />
                  </TabsContent>

                  {/* TAB: IZIN & DINAS GURU */}
                  <TabsContent value="guru_izin" className="mt-4 space-y-6">
                    <PiketTeacherLeavePanel />
                  </TabsContent>

                  {/* TAB 2: ACTIVE MONITORING */}
                  <TabsContent value="monitoring" className="mt-4 space-y-6">
                    <PiketMonitoring
                      activeOutStudents={activeOutStudents}
                      loadingPermits={loadingPermits}
                      handleMarkReturned={handleMarkReturned}
                      handleDeletePermit={handleDeletePermit}
                    />
                  </TabsContent>

                  {/* TAB 3: CHRONOLOGICAL TODAY HISTORY */}
                  <TabsContent value="history" className="mt-4 space-y-6">
                    <PiketHistory
                      dailyPermits={dailyPermits}
                      historySearch={historySearch}
                      setHistorySearch={setHistorySearch}
                      filteredHistory={filteredHistory}
                      loadingPermits={loadingPermits}
                    />
                  </TabsContent>

                  {/* TAB 4: DAILY PERMIT RECAP REPORT */}
                  <TabsContent value="rekap" className="mt-4 space-y-6">
                    <PiketRecap
                      onUpdatePrintData={(permits, label, sigDate) => {
                        setRecapPermits(permits);
                        setRecapDateLabel(label);
                        setRecapSignatureDate(sigDate || '');
                      }}
                      printPaperSize={printPaperSize}
                      setPrintPaperSize={setPrintPaperSize}
                      setIsPrintingRekap={setIsPrintingRekap}
                      setPrintedPermit={setPrintedPermit}
                      tenantInfo={tenantInfo}
                    />
                  </TabsContent>
                </Tabs>
              </Card>
            </div>

        {/* 3a. PHYSICAL SINGLE SLIP PRINT SHEET (PORTAL TO DOCUMENT BODY FOR PERFECT TOP ALIGNMENT) */}
        {printedPermit && typeof document !== 'undefined' && createPortal(
          <PiketPrintSlip
            printedPermit={printedPermit}
            tenantInfo={tenantInfo}
            systemConfig={systemConfig}
            user={user}
            printPaperSize={printPaperSize}
          />,
          document.body
        )}

        {/* 3b. PHYSICAL DAILY RECAP PRINT SHEET (PORTAL TO DOCUMENT BODY FOR PERFECT TOP ALIGNMENT) */}
        {isPrintingRekap && typeof document !== 'undefined' && createPortal(
          <PiketPrintRecap
            isPrintingRekap={isPrintingRekap}
            tenantInfo={tenantInfo}
            user={user}
            dailyPermits={recapPermits}
            dateLabel={recapDateLabel}
            signatureDate={recapSignatureDate}
          />,
          document.body
        )}

        {/* Confirm cancel permit dialog */}
        <ConfirmDialog
          isOpen={deleteConfirmOpen}
          title="Batalkan Surat Izin"
          description="Apakah Anda yakin ingin membatalkan surat izin keluar siswa ini? Siswa yang bersangkutan harus mengajukan izin kembali jika ingin keluar gerbang."
          confirmText="Ya, Batalkan"
          cancelText="Kembali"
          style="danger"
          loading={isDeleting}
          onConfirm={async () => {
            if (permitToDelete) {
              setIsDeleting(true);
              try {
                const res = await piketApi.deletePermit(permitToDelete);
                if (res.success) {
                  toast.success('Surat izin keluar berhasil dibatalkan');
                  queryClient.invalidateQueries({ queryKey: piketQueryKeys.all });
                  queryClient.invalidateQueries({ queryKey: ['piket-harian-list'] });
                  queryClient.invalidateQueries({ queryKey: ['piket-harian'] });
                  queryClient.invalidateQueries({ queryKey: ['piket-range'] });
                  queryClient.invalidateQueries({ queryKey: ['attendance-sessions'] });
                  queryClient.invalidateQueries({ queryKey: ['kesiswaan-stats'] });
                  refetchPermits();
                }
              } catch (err: unknown) {
                console.error(err);
                const e = err as { message?: string };
                toast.error(e.message || 'Gagal membatalkan surat izin');
              } finally {
                setIsDeleting(false);
                setDeleteConfirmOpen(false);
                setPermitToDelete(null);
              }
            }
          }}
          onCancel={() => {
            setDeleteConfirmOpen(false);
            setPermitToDelete(null);
          }}
        />

        {/* 4. TAILWIND INLINE PRINTSHEET CSS */}
        <style>{`
        @media print {
          @page {
            size: ${currentPreset.pageSize};
            margin: ${currentPreset.id === 'a4' || currentPreset.id === 'a5' ? '15mm' : '0'};
          }
          
          /* Hide all screen elements and other body elements completely from layout flow */
          #root {
            display: none !important;
          }
          body > :not(.print-sheet-receipt):not(.print-rekap-sheet) {
            display: none !important;
          }
          
          body {
            margin: 0 !important;
            padding: 0 !important;
            background: #fff !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          
          /* Show print sheets */
          .print-sheet-receipt {
            display: block !important;
          }
          .print-rekap-sheet {
            display: block !important;
          }
          
          /* Robust multi-page table header repeating */
          table {
            page-break-inside: auto !important;
            break-inside: auto !important;
          }
          thead {
            display: table-header-group !important;
          }
          tr {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          
          .print-sheet-receipt {
            position: absolute !important;
            left: 50% !important;
            top: 0 !important;
            transform: translateX(-50%) !important;
            width: ${currentPreset.width} !important;
            max-width: ${currentPreset.width} !important;
            margin: 0 !important;
            padding: ${currentPreset.padding} !important;
            box-sizing: border-box !important;
            background: white !important;
            color: black !important;
            font-family: ${currentPreset.id === 'a4' || currentPreset.id === 'a5' ? "system-ui, -apple-system, sans-serif" : "'Courier New', Courier, monospace"} !important;
            font-size: ${currentPreset.fontSize} !important;
            line-height: 1.4 !important;
            border: none !important;
            box-shadow: none !important;
          }
          
          .print-rekap-sheet {
            position: absolute !important;
            left: 50% !important;
            top: 0 !important;
            transform: translateX(-50%) !important;
            width: ${currentPreset.width} !important;
            max-width: ${currentPreset.width} !important;
            margin: 0 !important;
            padding: ${currentPreset.padding} !important;
            box-sizing: border-box !important;
            background: white !important;
            color: black !important;
            font-family: ${currentPreset.id === 'a4' || currentPreset.id === 'a5' ? "system-ui, -apple-system, sans-serif" : "'Courier New', Courier, monospace"} !important;
            font-size: ${currentPreset.fontSize} !important;
          }
        }
      `}</style>
          </>
        )}
      </div>
    </AcademicPageLayout>
  );
}
