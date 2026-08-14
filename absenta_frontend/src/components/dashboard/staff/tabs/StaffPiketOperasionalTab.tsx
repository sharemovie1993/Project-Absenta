import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  ShieldAlert, 
  ShieldCheck, 
  Lock, 
  Unlock, 
  Calendar, 
  UserCheck, 
  RefreshCw, 
  AlertCircle, 
  Users, 
  CheckCircle2, 
  Clock, 
  Briefcase, 
  ChevronRight, 
  Info,
  Building2,
  Scan,
  UserX
} from 'lucide-react';
import { Button, Badge } from '../../../ui';
import { TabSwitcher, type TabOption } from '../../../ui/TabSwitcher';
import { PiketOperations } from '../../../piket/PiketOperations';
import { PiketTeacherMonitoring } from '../../../piket/PiketTeacherMonitoring';
import { PiketPrintSlip } from '../../../piket/PiketPrintSlip';
import { useAuthStore } from '../../../../store/authStore';
import { useGuruMe } from '../../../../hooks/useGuruMe';
import { useCapabilities } from '../../../../hooks/useCapabilities';
import { usePiketGuruOptions } from '../../../../hooks/usePiketGuruOptions';
import { getStrukturList } from '../../../../api/academic/strukturOrganisasi.api';
import { getSesiAbsensiList } from '../../../../api/attendanceGerbang.api';
import { toLocalDate } from '../../../../utils/attendance/time';
import { useQuery } from '@tanstack/react-query';

interface StaffPiketOperasionalTabProps {
  dailyPermits: any[];
  refetchPermits: () => void;
  printedPermit: any;
  setPrintedPermit: (permit: any) => void;
  printPaperSize: string;
  setPrintPaperSize: (size: string) => void;
  tenantInfo: any;
}

export const StaffPiketOperasionalTab: React.FC<StaffPiketOperasionalTabProps> = ({
  dailyPermits,
  refetchPermits,
  printedPermit,
  setPrintedPermit,
  printPaperSize,
  setPrintPaperSize,
  tenantInfo,
}) => {
  const { user } = useAuthStore();
  const { guruProfile } = useGuruMe();
  const { isAdmin, isKesiswaan, isKurikulum, isKepsek, isGerbang, isTU, can } = useCapabilities();

  // Management / Officer roles that have inherent access to Piket
  const isManagement = useMemo(() => {
    if (isAdmin) return true;
    if (can('attendance.piket.manage') || can('attendance.piket.view')) return true;
    return isKesiswaan || isKurikulum || isGerbang || isTU || isKepsek;
  }, [isAdmin, can, isKesiswaan, isKurikulum, isGerbang, isTU, isKepsek]);

  const currentGuruId = guruProfile?.id || (user?.guru_profile as any)?.id || (user as any)?.guru?.id;
  const currentUserId = user?.id;

  // 1. Fetch Today's Scheduled Piket Teachers
  const { 
    guruPiketHariIni, 
    isLoading: loadingPiketJadwal, 
    refetch: refetchPiketJadwal 
  } = usePiketGuruOptions();

  // 2. Check if logged-in teacher is scheduled for piket TODAY (Piket Umum / Piket Jurusan)
  const myPiketScheduleToday = useMemo(() => {
    if (!guruPiketHariIni.length) return null;
    return (
      guruPiketHariIni.find((g: any) => {
        const gGuruId = String(g.guru_id || g.Guru?.id || '');
        const gUserId = String(g.Guru?.user_id || '');
        return (
          (currentGuruId && (gGuruId === String(currentGuruId) || String(g.Guru?.id || '') === String(currentGuruId))) ||
          (currentUserId && (gGuruId === String(currentUserId) || gUserId === String(currentUserId)))
        );
      }) || null
    );
  }, [guruPiketHariIni, currentGuruId, currentUserId]);

  const isAssignedPiketToday = Boolean(myPiketScheduleToday);

  // 3. Check if teacher is assigned to Piket in Organizational Structure (StrukturOrganisasi)
  const { data: isStrukturPiket = false, isLoading: loadingStruktur } = useQuery({
    queryKey: ['guru-piket-struktur-guard', currentGuruId, currentUserId],
    queryFn: async () => {
      if (!currentGuruId && !currentUserId) return false;
      try {
        const res = await getStrukturList({ is_active: true });
        if (!res?.data) return false;
        return res.data.some((s) => {
          const isPiketPosition =
            (s.kode || '').toUpperCase().includes('PIKET') ||
            (s.nama || '').toUpperCase().includes('PIKET');
          if (!isPiketPosition) return false;
          const assigns = s.organizationalAssigns || [];
          return assigns.some((a: any) => {
            const gId = a.User?.Guru?.id || a.guru_id;
            return (currentGuruId && gId === currentGuruId) || (currentUserId && a.user_id === currentUserId);
          });
        });
      } catch {
        return false;
      }
    },
    enabled: !!currentGuruId || !!currentUserId,
    staleTime: 5 * 60 * 1000,
  });

  // State for manual bypass/override by Admin or authorized users
  const [isBypassed, setIsBypassed] = useState(false);

  // Final Guard Access Evaluation
  const isAuthorized = isAssignedPiketToday || isStrukturPiket || isManagement;
  const canAccessPiket = isAuthorized || isBypassed;
  const isLoading = loadingPiketJadwal || loadingStruktur;

  const [activePiketSubTab, setActivePiketSubTab] = useState<'IZIN_SISWA' | 'GURU_KBM'>('IZIN_SISWA');

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

  const piketSubTabs: TabOption[] = useMemo(() => [
    {
      id: 'IZIN_SISWA',
      label: 'Izin Siswa',
      icon: Scan,
      colorClass: 'text-indigo-600 dark:text-indigo-400'
    },
    {
      id: 'GURU_KBM',
      label: (
        <span className="relative flex items-center gap-1.5">
          Pantau Guru KBM
          {pendingTeacherCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[9px] font-black bg-amber-500 text-slate-950 animate-pulse">
              {pendingTeacherCount}
            </span>
          )}
        </span>
      ),
      icon: UserX,
      colorClass: 'text-amber-600 dark:text-amber-400'
    }
  ], [pendingTeacherCount]);

  return (
    <motion.div
      key="tab-kelola"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2 }}
      className="space-y-6"
    >
      {/* ── LOADING SKELETON STATE ────────────────────────────────────────── */}
      {isLoading && (
        <div className="p-8 sm:p-12 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto text-emerald-500 animate-pulse">
            <RefreshCw size={24} className="animate-spin" />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
              Memverifikasi Status Petugas Piket...
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Memeriksa jadwal piket harian dan hak akses struktur organisasi sekolah.
            </p>
          </div>
        </div>
      )}

      {/* ── GUARD LOCK SCREEN (GURU TIDAK TERDAFTAR SEBAGAI PETUGAS PIKET HARI INI) ── */}
      {!isLoading && !canAccessPiket && (
        <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-6">
          {/* Header Guard Banner */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-5 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0 shadow-sm">
                <Lock size={24} />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
                    Akses Operasional Piket Terbatas
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                    Akses Terkunci
                  </span>
                </div>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1.5">
                  <Calendar size={13} className="text-emerald-500" />
                  <span>{formattedTodayDate}</span>
                </p>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={() => refetchPiketJadwal()}
              className="h-9 px-4 rounded-xl text-xs font-bold border-slate-200 dark:border-slate-800 flex items-center gap-1.5 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/60"
            >
              <RefreshCw size={14} />
              <span>Cek Ulang Jadwal</span>
            </Button>
          </div>

          {/* Warning Card Notification */}
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200 space-y-2">
            <div className="flex items-center gap-2 text-xs font-extrabold">
              <ShieldAlert size={16} className="text-amber-600 dark:text-amber-400 shrink-0" />
              <span>Anda Tidak Terdaftar Sebagai Petugas Piket Hari Ini</span>
            </div>
            <p className="text-xs text-amber-800/90 dark:text-amber-300/90 leading-relaxed pl-6">
              Fitur Operasional Piket &amp; Penerbitan Surat Izin Keluar Siswa khusus dioperasikan oleh Guru Petugas Piket (Umum / Jurusan) yang bertugas pada jadwal hari ini atau Pengelola Piket Sekolah.
            </p>
          </div>

          {/* Today's Active Piket Officers Section */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users size={16} className="text-emerald-500" />
                <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                  Daftar Guru Petugas Piket Bertugas Hari Ini ({guruPiketHariIni.length})
                </h3>
              </div>
              <span className="text-[11px] font-bold text-slate-400">
                {formattedTodayDate}
              </span>
            </div>

            {guruPiketHariIni.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {guruPiketHariIni.map((j: any) => {
                  const namaGuru = j.Guru?.nama_guru || 'Guru Piket';
                  const pos = j.pos_piket || 'Piket Umum';
                  const nip = j.Guru?.nip || '-';
                  return (
                    <div
                      key={j.id}
                      className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 flex items-center gap-3"
                    >
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-black text-xs shrink-0">
                        {namaGuru.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <h4 className="text-xs font-extrabold text-slate-900 dark:text-white truncate">
                          {namaGuru}
                        </h4>
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-500 dark:text-slate-400">
                          <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/5">
                            {pos}
                          </Badge>
                          {nip !== '-' && <span className="font-mono text-[9px] truncate">NIP: {nip}</span>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200/60 dark:border-slate-800 text-center space-y-1">
                <Info size={20} className="mx-auto text-slate-400" />
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                  Belum ada jadwal piket guru yang didaftarkan untuk hari ini.
                </p>
                <p className="text-[11px] text-slate-400">
                  Jadwal piket harian diatur oleh Tim Kurikulum / Kesiswaan melalui menu Jadwal Piket.
                </p>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
              <Building2 size={15} className="text-slate-400 shrink-0" />
              <span>Butuh menggantikan tugas piket atau pengawasan darurat?</span>
            </div>
            <Button
              type="button"
              onClick={() => setIsBypassed(true)}
              className="h-9 px-4 rounded-xl text-xs font-extrabold bg-slate-800 hover:bg-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 text-white border-none flex items-center gap-1.5 cursor-pointer shadow-sm shrink-0"
            >
              <Unlock size={14} className="text-amber-400" />
              <span>Buka Akses Pengawas (Bypass)</span>
            </Button>
          </div>
        </div>
      )}

      {!isLoading && canAccessPiket && (
        <>
          <div className="p-5 sm:p-7 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-6">
            <div className="pb-3 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight">
                    Operasional Piket Harian
                  </h2>
                  {myPiketScheduleToday ? (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                      <CheckCircle2 size={11} />
                      <span>Petugas Piket Hari Ini ({myPiketScheduleToday.pos_piket || 'Piket Umum'})</span>
                    </span>
                  ) : isBypassed ? (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 flex items-center gap-1">
                      <Unlock size={11} />
                      <span>Mode Pengawas / Bypass Aktif</span>
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30 flex items-center gap-1">
                      <UserCheck size={11} />
                      <span>Pengelola Piket</span>
                    </span>
                  )}
                </div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1">
                  Kelola izin keluar siswa dan pantau kehadiran guru di kelas secara realtime.
                </p>
              </div>

              {isBypassed && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsBypassed(false)}
                  className="h-8 px-3 rounded-xl text-[11px] font-bold border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 shrink-0 cursor-pointer"
                >
                  Kunci Akses
                </Button>
              )}
            </div>

            <div className="flex items-center justify-between gap-3 flex-wrap">
              <TabSwitcher
                options={piketSubTabs}
                activeTab={activePiketSubTab}
                onChange={(id) => setActivePiketSubTab(id as any)}
              />
            </div>

            {activePiketSubTab === 'IZIN_SISWA' ? (
              <PiketOperations
                dailyPermits={dailyPermits}
                refetchPermits={refetchPermits}
                onPrintPermit={(permit) => setPrintedPermit(permit)}
              />
            ) : (
              <PiketTeacherMonitoring />
            )}
          </div>

          {printedPermit && (
            <PiketPrintSlip
              permit={printedPermit}
              paperSize={printPaperSize}
              onPaperSizeChange={setPrintPaperSize}
              onClose={() => setPrintedPermit(null)}
              tenantInfo={tenantInfo}
            />
          )}
        </>
      )}
    </motion.div>
  );
};
