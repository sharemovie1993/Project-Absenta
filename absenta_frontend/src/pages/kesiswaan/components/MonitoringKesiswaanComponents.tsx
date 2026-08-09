import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Calendar, Users, ShieldAlert, Award, CheckCircle2, Clock, LogOut, FileText } from 'lucide-react';
import { piketGuruApi } from '../../../api/piketGuru.api';
import { kurikulumApi } from '../../../api/kurikulum.api';
import { usePiketIzinKeluarOptions } from '../../../hooks/usePiketIzinKeluarOptions';
import { usePiketGateStore } from '../../../hooks/usePiketGateStore';
import { calculatePiketAnalytics, getPermitGateStage, getPermitStatusBadge } from '../../../utils/piketStatusHelper';

interface PelanggaranItem {
  id: string;
  poin: number;
  Siswa?: {
    nama_siswa?: string;
    Kelas?: {
      nama_kelas?: string;
    };
  };
}

export interface GuruPiketItem {
  id?: string;
  pos_piket?: string;
  nama_guru?: string;
  Guru?: {
    nama_guru?: string;
  };
}

export interface KalenderEventRaw {
  id?: string;
  nama_kegiatan?: string;
  title?: string;
  event?: string;
  tanggal?: string;
  tanggal_str?: string;
  keterangan?: string;
  deskripsi?: string;
}

export interface RombelDisiplinItem {
  nama_kelas?: string;
  name?: string;
  status?: string;
  points?: number;
}

export interface KesiswaanAnalyticsData {
  data?: {
    rombel_disiplin?: RombelDisiplinItem[];
  };
}

// Safe Array Helper
const safeArr = <T,>(v: unknown): T[] => {
  if (!v) return [];
  if (Array.isArray(v)) return v as T[];
  const o = v as { data?: unknown };
  if (Array.isArray(o?.data)) return o.data as T[];
  const od = o?.data as { list?: unknown; data?: unknown };
  if (Array.isArray(od?.list)) return od.list as T[];
  if (Array.isArray(od?.data)) return od.data as T[];
  return [];
};

/* ── Piket & Agenda Panel (Real Live API Connected) ── */
export const PiketAgendaPanel = React.memo(function PiketAgendaPanel() {
  const { data: piketRes, isLoading: isLoadingPiket } = useQuery({
    queryKey: ['piket-guru-hari-ini'],
    queryFn: () => piketGuruApi.getHariIni().catch(() => null),
    staleTime: 5 * 60 * 1000
  });

  const { data: kalenderRes, isLoading: isLoadingKalender } = useQuery({
    queryKey: ['kalender-akademik-upcoming'],
    queryFn: () => kurikulumApi.getKalenderAkademik().catch(() => null),
    staleTime: 5 * 60 * 1000
  });

  // Custom hook untuk data Siswa Izin Keluar dari Meja Piket dengan sinkronisasi 3-detik real-time
  const { activeOutList, rawList: dailyPermits, isLoading: isLoadingPermits } = usePiketIzinKeluarOptions({ refetchInterval: 3000 });

  const guruPiketList: GuruPiketItem[] = piketRes?.data?.guru_piket || [];

  const rawEvents = (kalenderRes?.data?.list || kalenderRes?.data || (Array.isArray(kalenderRes) ? kalenderRes : [])) as KalenderEventRaw[];
  const upcomingEvents = Array.isArray(rawEvents) 
    ? rawEvents.slice(0, 3)?.map((e) => ({
        event: e.nama_kegiatan || e.title || e.event || 'Kegiatan Sekolah',
        tanggal: e.tanggal ? new Date(e.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : (e.tanggal_str || 'Hari ini'),
        desc: e.keterangan || e.deskripsi || 'Agenda kesiswaan & akademik sekolah.'
      }))
    : [];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-full">
      {/* 1. Guru Piket */}
      <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-2xl flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Users size={16} className="text-indigo-500" />
            <h4 className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">Guru Piket Aktif Hari Ini</h4>
          </div>
          <p className="text-[10px] text-slate-400 leading-normal mb-4">Guru bertugas piket ketertiban gerbang & lingkungan sekolah hari ini.</p>
          <div className="space-y-2">
            {isLoadingPiket ? (
              <div className="text-xs text-slate-400 font-medium py-2">Memuat data guru piket...</div>
            ) : guruPiketList.length > 0 ? (
              guruPiketList?.map((g, i: number) => (
                <div key={g.id || i} className="flex items-center justify-between p-2 px-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl">
                  <div className="flex items-center gap-2.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                    <span className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-tight">
                      {g.Guru?.nama_guru || g.nama_guru || 'Guru Piket'}
                    </span>
                  </div>
                  {g.pos_piket && (
                    <span className="text-[9px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded-md uppercase">
                      {g.pos_piket}
                    </span>
                  )}
                </div>
              ))
            ) : (
              <div className="p-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl text-center text-xs text-slate-400 font-medium">
                Belum ada jadwal piket guru yang ditentukan hari ini.
              </div>
            )}
          </div>
        </div>
        <div className="mt-4 p-2 px-3 bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/30 rounded-xl flex items-center justify-between">
          <span className="text-[9px] font-black text-indigo-700 dark:text-indigo-400 uppercase tracking-wider">Petugas Piket Gerbang</span>
          <span className="text-[9px] font-bold text-slate-400">{guruPiketList.length} Guru Siaga</span>
        </div>
      </div>

      {/* 2. Siswa Izin Keluar Hari Ini (Meja Piket) */}
      {(() => {
        const { exitedGateIds } = usePiketGateStore();
        const { countSedangDiLuar, countPulangAwal, totalPermitsToday } = calculatePiketAnalytics(dailyPermits, exitedGateIds);

        return (
          <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-2xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <LogOut size={16} className="text-rose-500" />
                  <h4 className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">Siswa Izin Keluar (Meja Piket)</h4>
                </div>
                {countSedangDiLuar > 0 && (
                  <span className="text-[9px] font-black bg-rose-500 text-white px-2 py-0.5 rounded-full animate-pulse">
                    {countSedangDiLuar} Di Luar
                  </span>
                )}
              </div>
              <p className="text-[10px] text-slate-400 leading-normal mb-4">Pantauan live status perizinan siswa dari Meja Piket & Pos Satpam Gerbang.</p>

              <div className="space-y-2">
                {isLoadingPermits ? (
                  <div className="text-xs text-slate-400 font-medium py-2">Memuat data izin siswa...</div>
                ) : dailyPermits.length > 0 ? (
                  dailyPermits.slice(0, 3).map((p) => {
                    const namaSiswa = p.SiswaAkademik?.siswa?.nama_siswa || (p as any).Siswa?.nama_siswa || (p as any).siswa?.nama_siswa || (p as any).nama_siswa || 'Siswa';
                    const namaKelas = p.SiswaAkademik?.kelas?.nama_kelas || (p as any).Siswa?.Kelas?.nama_kelas || (p as any).kelas?.nama_kelas || (p as any).nama_kelas || '-';
                    const stage = getPermitGateStage(p, exitedGateIds);
                    const badgeConfig = getPermitStatusBadge(stage);

                    return (
                      <div key={p.id} className="p-2 px-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl flex items-center justify-between">
                        <div className="min-w-0 pr-2">
                          <span className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-tight block truncate">
                            {namaSiswa}
                          </span>
                          <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block truncate">
                            {namaKelas} • {p.alasan}
                          </span>
                        </div>
                        <span className={`text-[9px] font-black px-2 py-0.5 rounded-md uppercase shrink-0 ${badgeConfig.badgeClass}`}>
                          {badgeConfig.label}
                        </span>
                      </div>
                    );
                  })
                ) : (
                  <div className="p-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl text-center text-xs text-slate-400 font-medium">
                    Tidak ada siswa yang diterbitkan izin hari ini.
                  </div>
                )}
              </div>
            </div>
            <div className="mt-4 p-2 px-3 bg-slate-100/70 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-800 rounded-xl flex items-center justify-between text-[9px] font-bold text-slate-500">
              <span>{countSedangDiLuar} Di Luar</span>
              <span>•</span>
              <span>{countPulangAwal} Pulang Awal</span>
              <span>•</span>
              <span className="font-black text-slate-700 dark:text-slate-300">{totalPermitsToday} Total Izin</span>
            </div>
          </div>
        );
      })()}

      {/* 3. Agenda Kesiswaan */}
      <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-2xl flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Calendar size={16} className="text-indigo-500" />
            <h4 className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">Agenda & Kalender Kesiswaan</h4>
          </div>
          <div className="space-y-2.5">
            {isLoadingKalender ? (
              <div className="text-xs text-slate-400 font-medium py-2">Memuat agenda sekolah...</div>
            ) : upcomingEvents.length > 0 ? (
              upcomingEvents?.map((item, i: number) => (
                <div key={i} className="space-y-0.5 border-b border-slate-100 dark:border-slate-800/60 pb-2 last:border-none">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase">{item.event}</span>
                    <span className="text-[8px] text-slate-400 font-bold">{item.tanggal}</span>
                  </div>
                  <p className="text-[9px] text-slate-500 dark:text-slate-400 leading-normal font-medium">{item.desc}</p>
                </div>
              ))
            ) : (
              <div className="text-xs text-slate-400 font-medium py-2">
                Tidak ada agenda kegiatan khusus kesiswaan mendatang.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

/* ── Rombel Disiplin & Rawan Panel (Real Live Dynamic Data) ── */
export const RombelDisiplinPanel = React.memo(function RombelDisiplinPanel({ violations, analytics }: { violations: unknown; analytics?: KesiswaanAnalyticsData }) {
  const list = safeArr<PelanggaranItem>(violations);
  
  // Aggregate points per class dynamically
  const pointsMap: Record<string, number> = {};
  list.forEach(v => {
    const className = v.Siswa?.Kelas?.nama_kelas;
    if (className) {
      pointsMap[className] = (pointsMap[className] || 0) + (v.poin || 0);
    }
  });

  const sortedRombel = Object.entries(pointsMap)
    ?.map(([name, points]) => ({ name, points }))
    .sort((a, b) => b.points - a.points);

  const rombelRawan = sortedRombel.filter(r => r.points > 0).slice(0, 3);
  const rombelDisiplin = analytics?.data?.rombel_disiplin || [];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Rombel Terdisiplin */}
      <div className="p-4 bg-emerald-50/10 dark:bg-emerald-950/5 border border-emerald-100/50 dark:border-emerald-900/10 rounded-2xl">
        <div className="flex items-center gap-2 mb-3">
          <Award size={16} className="text-emerald-500" />
          <h4 className="text-xs font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">Rombel Terdisiplin</h4>
        </div>
        <div className="space-y-2">
          {rombelDisiplin.length > 0 ? (
            rombelDisiplin?.map((r, i: number) => (
              <div key={i} className="flex items-center justify-between p-2.5 bg-emerald-500/5 dark:bg-emerald-950/20 border border-emerald-100/20 dark:border-emerald-900/20 rounded-xl">
                <div>
                  <span className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-tight block leading-none mb-1">
                    {r.nama_kelas || r.name || 'Kelas Terdisiplin'}
                  </span>
                  <span className="text-[8px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                    {r.status || `${r.points || 0} Poin Pelanggaran`}
                  </span>
                </div>
                <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
              </div>
            ))
          ) : (
            <div className="text-xs text-emerald-600 dark:text-emerald-400 font-bold p-3 text-center bg-emerald-50/50 dark:bg-emerald-950/20 rounded-xl border border-emerald-200/40">
              🎉 Seluruh rombel menjaga kedisiplinan dengan sangat baik!
            </div>
          )}
        </div>
      </div>

      {/* Rombel Butuh Pembinaan */}
      <div className="p-4 bg-rose-50/10 dark:bg-rose-950/5 border border-rose-100/50 dark:border-rose-900/10 rounded-2xl">
        <div className="flex items-center gap-2 mb-3">
          <ShieldAlert size={16} className="text-rose-500" />
          <h4 className="text-xs font-black text-rose-700 dark:text-rose-400 uppercase tracking-wider">Rombel Butuh Pembinaan</h4>
        </div>
        <div className="space-y-2">
          {rombelRawan.length > 0 ? (
            rombelRawan?.map((r, i: number) => (
              <div key={i} className="flex items-center justify-between p-2.5 bg-rose-500/5 dark:bg-rose-950/20 border border-rose-100/20 dark:border-rose-900/20 rounded-xl">
                <div>
                  <span className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-tight block leading-none mb-1">
                    {r.name}
                  </span>
                  <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">
                    Total {r.points} Poin Pelanggaran
                  </span>
                </div>
                <span className="text-xs font-black text-rose-600 dark:text-rose-400 bg-rose-100 dark:bg-rose-950 px-2 py-0.5 rounded-md">
                  +{r.points}
                </span>
              </div>
            ))
          ) : (
            <div className="text-xs text-slate-400 font-medium p-3 text-center">
              Tidak ada kelas dengan akumulasi poin pelanggaran tinggi hari ini.
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
