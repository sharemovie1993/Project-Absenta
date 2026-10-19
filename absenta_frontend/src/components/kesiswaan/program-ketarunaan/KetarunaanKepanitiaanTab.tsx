import React, { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Users,
  CheckCircle2,
  RefreshCw,
  UserCheck,
  Shield,
  Loader2,
  Zap,
  Clock,
  BookOpen,
  Info,
  CalendarCheck,
  Building2,
  GraduationCap,
  Scan,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import toast from 'react-hot-toast';
import {
  getKetarunaanPendamping,
  tapKetarunaanPendamping,
  type KetarunaanPendamping,
} from '@/api/kesiswaan/programKetarunaan.api';
import { UnifiedKegiatanRfidScanModal } from '@/components/attendance/unified-kegiatan/UnifiedKegiatanRfidScanModal';

interface KetarunaanKepanitiaanTabProps {
  jadwalKegiatanId: string | null;
  sesiId: string | null;
  refetchSesi: () => void;
  guard?: any;
}

function statusBadge(status: string) {
  if (status === 'HADIR') return <Badge variant="success" className="text-[10px]">Hadir</Badge>;
  if (status === 'IZIN') return <Badge variant="warning" className="text-[10px]">Izin</Badge>;
  if (status === 'SAKIT') return <Badge variant="warning" className="text-[10px]">Sakit</Badge>;
  if (status === 'ALPA') return <Badge variant="error" className="text-[10px]">Alpa</Badge>;
  return <Badge variant="outline" className="text-[10px]">Belum Tap</Badge>;
}

function jabatanLabel(kode: string) {
  const map: Record<string, string> = {
    KETUA_PEMBINA_TARUNA: '🎖️ Pembina Taruna & Staf',
    KAPROG: '🏛️ Kepala Program Keahlian (Kajur)',
    WALIKELAS: '🏫 Wali Kelas',
    GURU_MAPEL: '📚 Guru Mapel KBM Beririsan (1 Tap 2 Record)',
    KEPALA_SEKOLAH: '👑 Kepala Sekolah',
    KESISWAAN: '🧑‍🎓 Waka Kesiswaan',
    PEMBINA_ESKUL: '🚩 Pembina OSIS / Ekstrakurikuler',
  };
  return map[kode] || kode;
}

export const KetarunaanKepanitiaanTab: React.FC<KetarunaanKepanitiaanTabProps> = ({
  jadwalKegiatanId,
  sesiId,
  refetchSesi,
  guard,
}) => {
  const qc = useQueryClient();
  const [rfidModalOpen, setRfidModalOpen] = useState(false);
  const [forceIncidentalMode, setForceIncidentalMode] = useState(false);

  const isScheduledDay = guard?.is_today_scheduled_day ?? true;

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['ketarunaan-pendamping', sesiId, jadwalKegiatanId],
    queryFn: () => getKetarunaanPendamping({
      sesi_id: sesiId ?? undefined,
      jadwal_kegiatan_id: jadwalKegiatanId ?? undefined,
    }),
    staleTime: 30_000,
  });

  const pendamping = useMemo(() => data?.data ?? [], [data?.data]);
  const realSesiId = data?.sesi_id ?? sesiId;

  const tapMutation = useMutation({
    mutationFn: (payload: { guru_id: string; status: 'HADIR' | 'IZIN' | 'SAKIT' | 'DINAS_LUAR' | 'ALPA' }) =>
      tapKetarunaanPendamping({
        guru_id: payload.guru_id,
        sesi_id: realSesiId!,
        status: payload.status,
        catatan: payload.status === 'HADIR' ? 'Hadir via Terminal Khusus Ketarunaan' : undefined,
      }),
    onSuccess: (res) => {
      toast.success(res?.message || 'Presensi dicatat');
      if (res?.synced_kbm) {
        toast.success('⚡ 1 Tap 2 Record Berhasil: Sesi KBM reguler telah dibuka otomatis!', { duration: 5000 });
      }
      refetch();
      qc.invalidateQueries({ queryKey: ['ketarunaan-stats'] });
      qc.invalidateQueries({ queryKey: ['unified-kbm-sessions'] });
      qc.invalidateQueries({ queryKey: ['attendance-dashboard-live'] });
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Gagal mencatat presensi');
    },
  });

  const handleRefresh = useCallback(() => {
    refetch();
    refetchSesi();
  }, [refetch, refetchSesi]);

  const handleOpenRfid = useCallback(() => {
    if (!isScheduledDay && !forceIncidentalMode) {
      toast.error('Hari ini di luar jadwal reguler Ketarunaan. Klik "Buka Sesi Khusus / Insidental" terlebih dahulu jika ingin merekam absensi hari ini.');
      return;
    }
    setRfidModalOpen(true);
  }, [isScheduledDay, forceIncidentalMode]);

  const handleTap = useCallback((guruId: string, status: 'HADIR' | 'IZIN' | 'SAKIT' | 'DINAS_LUAR' | 'ALPA' = 'HADIR') => {
    if (!isScheduledDay && !forceIncidentalMode) {
      toast.error('Hari ini di luar jadwal reguler Ketarunaan. Aktifkan Mode Sesi Khusus / Insidental terlebih dahulu.');
      return;
    }
    tapMutation.mutate({ guru_id: guruId, status });
  }, [tapMutation, isScheduledDay, forceIncidentalMode]);

  // Pisahkan Guru Mapel Beririsan dengan Unsur Pembina/Struktural
  const guruMapelList = useMemo(() => {
    return pendamping.filter(p => p.jabatan_kode === 'GURU_MAPEL');
  }, [pendamping]);

  const strukturalGroups = useMemo(() => {
    const g: Record<string, KetarunaanPendamping[]> = {};
    pendamping
      .filter(p => p.jabatan_kode !== 'GURU_MAPEL')
      .forEach(p => {
        const key = p.jabatan_kode;
        if (!g[key]) g[key] = [];
        g[key].push(p);
      });
    return g;
  }, [pendamping]);

  const strukturalGroupEntries = useMemo(() => Object.entries(strukturalGroups), [strukturalGroups]);
  const hadirCount = useMemo(() => pendamping.filter(p => p.status === 'HADIR').length, [pendamping]);
  const guruMapelHadirCount = useMemo(() => guruMapelList.filter(p => p.status === 'HADIR').length, [guruMapelList]);

  if (isLoading) {
    return (
      <div className="space-y-3 p-4">
        {[1, 2, 3, 4, 5].map((itemKey) => (
          <Skeleton key={itemKey} className="h-16 rounded-2xl" />
        ))}
      </div>
    );
  }

  if (!realSesiId && pendamping.length === 0) {
    return (
      <div className="text-center py-16 text-slate-400 dark:text-slate-500">
        <Shield className="w-10 h-10 mx-auto mb-3 opacity-30" />
        <p className="text-sm font-bold">Belum ada sesi Ketarunaan aktif hari ini</p>
        <p className="text-xs mt-1">Sesi otomatis aktif saat rentang jam kegiatan berlangsung</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Header Info & Ringkasan */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0 shadow-sm border border-amber-200/50 dark:border-amber-700/30">
            <Users className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-black text-slate-800 dark:text-slate-100">Presensi Kepanitiaan & Pendamping</h3>
              <Badge variant="outline" className="text-[10px] font-bold border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300">
                Unified Engine
              </Badge>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Total {hadirCount} dari {pendamping.length} pendamping telah hadir di lapangan hari ini
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="default"
            size="sm"
            onClick={handleOpenRfid}
            className={`gap-2 text-xs font-black text-white shadow-sm ${
              !isScheduledDay && !forceIncidentalMode
                ? 'bg-slate-600 hover:bg-slate-700 opacity-90'
                : 'bg-gradient-to-r from-amber-600 to-indigo-600 hover:from-amber-700 hover:to-indigo-700'
            }`}
          >
            <Scan className="w-4 h-4" /> Mode Scan RFID (POS)
            {!isScheduledDay && !forceIncidentalMode && (
              <span className="text-[10px] bg-slate-800/80 px-1.5 py-0.5 rounded font-mono ml-1">Siaga</span>
            )}
          </Button>
          <Button variant="ghost" size="sm" onClick={handleRefresh} className="gap-1.5 text-xs font-bold">
            <RefreshCw className="w-3.5 h-3.5" /> Refresh Status
          </Button>
        </div>
      </div>

      {/* Banner Siaga Saat Di Luar Hari Pelaksanaan */}
      {!isScheduledDay && (
        <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200 dark:bg-amber-950/20 dark:border-amber-900/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-amber-500 text-white shrink-0 mt-0.5">
              <Clock className="w-4 h-4" />
            </div>
            <div className="text-xs text-amber-900 dark:text-amber-200">
              <span className="font-black uppercase tracking-wider block mb-0.5">
                Mode Siaga (Standby) — Di Luar Hari Pelaksanaan Reguler
              </span>
              <p className="leading-relaxed">
                Hari ini bukan jadwal reguler Ketarunaan. Kartu di bawah menyajikan <strong>pratinjau guru mapel yang mengajar pada hari pelaksanaan ({guard?.hari_aktif?.join(', ') || "Rabu"})</strong>.
              </p>
              {!forceIncidentalMode ? (
                <p className="text-amber-700 dark:text-amber-300 mt-1 font-medium">
                  Terminal RFID dan tombol presensi berada dalam kondisi siaga terkunci agar tidak mengganggu KBM normal hari ini.
                </p>
              ) : (
                <p className="text-emerald-700 dark:text-emerald-300 font-bold mt-1">
                  ● Mode Sesi Khusus / Insidental Aktif: Terminal RFID dan tombol presensi dibuka untuk sesi hari ini.
                </p>
              )}
            </div>
          </div>

          <div className="shrink-0 self-end sm:self-center">
            <Button
              variant={forceIncidentalMode ? "default" : "outline"}
              size="sm"
              onClick={() => setForceIncidentalMode(prev => !prev)}
              className={`text-xs font-bold gap-1.5 ${
                forceIncidentalMode
                  ? 'bg-amber-600 hover:bg-amber-700 text-white'
                  : 'border-amber-300 text-amber-800 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-300'
              }`}
            >
              {forceIncidentalMode ? 'Kunci Kembali Siaga' : 'Buka Sesi Khusus / Insidental'}
            </Button>
          </div>
        </div>
      )}

      {/* Banner Penjelasan 1 Tap 2 Record */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-50/70 via-purple-50/40 to-slate-50 border border-indigo-100 dark:from-indigo-950/20 dark:via-purple-950/10 dark:to-slate-900 dark:border-indigo-900/40 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-indigo-600 text-white shrink-0 mt-0.5 shadow-sm">
            <Zap className="w-4 h-4" />
          </div>
          <div className="space-y-1">
            <h4 className="text-xs font-black uppercase tracking-wider text-indigo-900 dark:text-indigo-200">
              Mekanisme Dual-Presence (1 Tap 2 Record)
            </h4>
            <p className="text-xs text-indigo-700 dark:text-indigo-300 leading-relaxed">
              Guru mapel yang jadwal KBM-nya beririsan jam dengan kegiatan ini, saat melakukan presensi di sini otomatis akan:
              <strong className="font-bold"> (1) Hadir di kegiatan</strong> dan 
              <strong className="font-bold"> (2) Sesi KBM regulernya otomatis dibuka berstatus Berlangsung</strong> dengan catatan resmi pendampingan.
            </p>
          </div>
        </div>
      </div>

      {/* SECTION 1: GURU MAPEL KBM BERIRISAN (1 TAP 2 RECORD) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <h4 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">
              Guru Mapel KBM yang Beririsan Jam
            </h4>
            <Badge variant="neutral" className="text-[10px]">
              {guruMapelHadirCount}/{guruMapelList.length} Hadir
            </Badge>
          </div>
        </div>

        {guruMapelList.length === 0 ? (
          <div className="p-6 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
            <p className="text-xs text-slate-400 font-medium">Tidak ada jadwal KBM guru mapel yang beririsan waktu dengan sesi kegiatan hari ini.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {guruMapelList.map((p) => {
              const isKbmActive = p.kbm_status === 'BERLANGSUNG';
              const isHadir = p.status === 'HADIR';

              return (
                <div
                  key={p.guru_id}
                  className={`p-4 rounded-2xl border transition-all duration-200 bg-white dark:bg-slate-900 shadow-sm flex flex-col justify-between gap-4 ${
                    isHadir
                      ? 'border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/10'
                      : 'border-slate-200 dark:border-slate-800 hover:border-indigo-200 dark:hover:border-indigo-800'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                        isHadir ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600' : 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600'
                      }`}>
                        <UserCheck className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-black text-slate-800 dark:text-slate-100 truncate">
                          {p.nama_guru}
                        </p>
                        <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400 mt-0.5">
                          {p.mapel_nama || 'Mapel KBM'} • {p.kelas_nama || 'Kelas'}
                        </p>
                        <div className="flex items-center gap-2 mt-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>Jam KBM: {p.jam_kbm || '07:15 - 11:05'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0 flex flex-col items-end gap-1.5">
                      {statusBadge(p.status)}
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isKbmActive
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300'
                          : 'bg-amber-100 text-amber-700 dark:bg-amber-950/80 dark:text-amber-300'
                      }`}>
                        {isKbmActive ? '● Sesi KBM Berlangsung' : '○ Sesi KBM Menunggu'}
                      </span>
                    </div>
                  </div>

                  {p.catatan && (
                    <div className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-300 italic">
                      {p.catatan}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                    <span className="text-[11px] text-slate-400 font-medium">
                      {p.waktu_tap ? `Tap: ${p.waktu_tap.slice(11, 16)} WIB` : 'Belum presensi'}
                    </span>

                    {p.status === 'BELUM_TAP' ? (
                      <div className="flex items-center gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 px-2 text-[11px] text-slate-500 hover:text-slate-800"
                          disabled={tapMutation.isPending || (!isScheduledDay && !forceIncidentalMode)}
                          onClick={() => handleTap(p.guru_id, 'IZIN')}
                        >
                          Izin
                        </Button>
                        <Button
                          size="sm"
                          variant="default"
                          className={`h-8 px-3 text-xs font-bold gap-1.5 shadow-sm ${
                            !isScheduledDay && !forceIncidentalMode
                              ? 'bg-slate-300 text-slate-500 dark:bg-slate-800 dark:text-slate-400 cursor-not-allowed'
                              : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                          }`}
                          disabled={tapMutation.isPending || (!isScheduledDay && !forceIncidentalMode)}
                          onClick={() => handleTap(p.guru_id, 'HADIR')}
                        >
                          {tapMutation.isPending ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Zap className="w-3.5 h-3.5 text-amber-300" />
                          )}
                          {!isScheduledDay && !forceIncidentalMode ? 'Siaga' : 'Tap Hadir & Buka KBM'}
                        </Button>
                      </div>
                    ) : (
                      <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4" /> 1 Tap 2 Record Aktif
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* SECTION 2: TIM PEMBINA & PIMPINAN JURUSAN (KAJUR/KAPROG) */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          <h4 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">
            Pimpinan Jurusan (Kajur/Kaprog), Wali Kelas & Tim Pembina
          </h4>
        </div>

        <div className="space-y-4">
          {strukturalGroupEntries.map(([kode, list]) => (
            <div key={kode} className="rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900 shadow-sm">
              <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span className="text-xs font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider">
                  {jabatanLabel(kode)}
                </span>
                <span className="text-[10px] font-bold text-slate-400">
                  {list.filter(x => x.status === 'HADIR').length}/{list.length} Hadir
                </span>
              </div>

              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {list.map(p => (
                  <div key={p.guru_id} className="flex items-center justify-between px-4 py-3 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-amber-100/70 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
                        <UserCheck className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">{p.nama_guru}</p>
                        {p.kelas_nama && <p className="text-[11px] text-slate-400 font-medium">Binaan: {p.kelas_nama}</p>}
                        {p.catatan && (
                          <p className="text-[10px] text-emerald-600 dark:text-emerald-400 italic truncate mt-0.5">
                            {p.catatan}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {statusBadge(p.status)}
                      {p.status === 'BELUM_TAP' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-2.5 text-[11px] font-bold border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-400"
                          disabled={tapMutation.isPending || (!isScheduledDay && !forceIncidentalMode)}
                          onClick={() => handleTap(p.guru_id, 'HADIR')}
                        >
                          {tapMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Reusable Universal RFID Scanner Modal */}
      <UnifiedKegiatanRfidScanModal
        isOpen={rfidModalOpen}
        onClose={() => setRfidModalOpen(false)}
        jenisKegiatan="KETARUNAAN"
        title="Terminal RFID — Program Ketarunaan"
        subtitle="Tempelkan kartu RFID Pembina, Wali Kelas, Kajur, atau Guru Mapel"
        sesiId={realSesiId}
        jadwalKegiatanId={jadwalKegiatanId}
        onSuccessTap={() => {
          handleRefresh();
          qc.invalidateQueries({ queryKey: ['ketarunaan-stats'] });
          qc.invalidateQueries({ queryKey: ['unified-kbm-sessions'] });
          qc.invalidateQueries({ queryKey: ['attendance-dashboard-live'] });
        }}
      />
    </div>
  );
};
