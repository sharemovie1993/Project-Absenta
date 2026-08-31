import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Calendar, Users, ShieldAlert, Award, CheckCircle2, Clock, LogOut, FileText } from 'lucide-react';
import { piketGuruApi } from '../../../api/piketGuru.api';
import { kurikulumApi } from '../../../api/kurikulum.api';
import { usePiketIzinKeluarOptions } from '../../../hooks/usePiketIzinKeluarOptions';
import { usePiketGateStore } from '../../../hooks/usePiketGateStore';
import { calculatePiketAnalytics, getPermitGateStage, getPermitStatusBadge } from '../../../utils/piketStatusHelper';
import { formatDate } from '../../../utils/layoutUtils';
import { Card } from '../../../components/ui/Card';

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
        tanggal: e.tanggal ? formatDate(e.tanggal, { day: '2-digit', month: 'short', year: 'numeric' }) : (e.tanggal_str || 'Hari ini'),
        desc: e.keterangan || e.deskripsi || 'Agenda kesiswaan & akademik sekolah.'
      }))
    : [];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      {/* 1. Guru Piket */}
      <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
                <Users size={16} />
              </div>
              <div>
                <h4 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">Guru Piket Hari Ini</h4>
                <p className="text-[10px] text-slate-400 font-medium">Petugas ketertiban & gerbang</p>
              </div>
            </div>
            <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/40">
              {guruPiketList.length} Siaga
            </span>
          </div>

          <div className="mt-3 space-y-2 max-h-60 overflow-y-auto pr-1">
            {isLoadingPiket ? (
              <div className="text-xs text-slate-400 font-medium py-4 text-center">Memuat data guru piket...</div>
            ) : guruPiketList.length > 0 ? (
              guruPiketList?.map((g, i: number) => {
                const nama = g.Guru?.nama_guru || g.nama_guru || 'Guru Piket';
                const initial = nama.charAt(0).toUpperCase();
                return (
                  <div key={g.id || i} className="flex items-center justify-between p-2.5 px-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60 rounded-xl hover:bg-slate-100/70 dark:hover:bg-slate-800 transition-colors">
                    <div className="flex items-center gap-2.5 min-w-0 pr-2">
                      <div className="w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-black text-[11px] flex items-center justify-center shrink-0">
                        {initial}
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate block">
                          {nama}
                        </span>
                      </div>
                    </div>
                    {g.pos_piket ? (
                      <span className="text-[9px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded-md uppercase shrink-0 border border-indigo-100 dark:border-indigo-900/30">
                        {g.pos_piket}
                      </span>
                    ) : (
                      <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md uppercase shrink-0">
                        Piket Umum
                      </span>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="p-6 bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-center text-xs text-slate-400 font-medium">
                Belum ada jadwal piket guru yang ditentukan hari ini.
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px] font-bold text-slate-400">
          <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Pos Keamanan & Gerbang
          </span>
          <span>{guruPiketList.length} Petugas</span>
        </div>
      </div>

      {/* 2. Siswa Izin Keluar Hari Ini (Meja Piket) */}
      {(() => {
        const { exitedGateIds } = usePiketGateStore();
        const { countSedangDiLuar, countPulangAwal, totalPermitsToday } = calculatePiketAnalytics(dailyPermits, exitedGateIds);

        return (
          <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400">
                    <LogOut size={16} />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">Siswa Izin Keluar</h4>
                    <p className="text-[10px] text-slate-400 font-medium">Monitoring Meja Piket & Gerbang</p>
                  </div>
                </div>
                {countSedangDiLuar > 0 ? (
                  <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-rose-500 text-white animate-pulse">
                    {countSedangDiLuar} Di Luar
                  </span>
                ) : (
                  <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                    {totalPermitsToday} Izin
                  </span>
                )}
              </div>

              <div className="mt-3 space-y-2 max-h-60 overflow-y-auto pr-1">
                {isLoadingPermits ? (
                  <div className="text-xs text-slate-400 font-medium py-4 text-center">Memuat data izin siswa...</div>
                ) : dailyPermits.length > 0 ? (
                  dailyPermits?.map((p) => {
                    const namaSiswa = p.SiswaAkademik?.siswa?.nama_siswa || p.Siswa?.nama_siswa || 'Siswa';
                    const namaKelas = p.SiswaAkademik?.kelas?.nama_kelas || p.Siswa?.Kelas?.nama_kelas || '-';
                    const stage = getPermitGateStage(p, exitedGateIds);
                    const badgeConfig = getPermitStatusBadge(stage);

                    return (
                      <div key={p.id} className="p-2.5 px-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60 rounded-xl flex items-center justify-between hover:bg-slate-100/70 dark:hover:bg-slate-800 transition-colors">
                        <div className="min-w-0 pr-2">
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate block">
                            {namaSiswa}
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium truncate block mt-0.5">
                            {namaKelas} • {p.alasan || 'Izin keluar'}
                          </span>
                        </div>
                        <span className={`text-[9px] font-black px-2 py-0.5 rounded-md uppercase shrink-0 ${badgeConfig.badgeClass}`}>
                          {badgeConfig.label}
                        </span>
                      </div>
                    );
                  })
                ) : (
                  <div className="p-6 bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-center text-xs text-slate-400 font-medium">
                    Tidak ada siswa yang diterbitkan izin keluar hari ini.
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px] font-bold text-slate-500">
              <span>{countSedangDiLuar} Di Luar</span>
              <span>•</span>
              <span>{countPulangAwal} Pulang Awal</span>
              <span>•</span>
              <span className="font-black text-slate-800 dark:text-slate-200">{totalPermitsToday} Total Izin</span>
            </div>
          </div>
        );
      })()}

      {/* 3. Agenda Kesiswaan */}
      <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400">
                <Calendar size={16} />
              </div>
              <div>
                <h4 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">Agenda Kesiswaan</h4>
                <p className="text-[10px] text-slate-400 font-medium">Kegiatan & kalender sekolah</p>
              </div>
            </div>
            <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 border border-purple-100 dark:border-purple-900/40">
              {upcomingEvents.length} Agenda
            </span>
          </div>

          <div className="mt-3 space-y-2 max-h-60 overflow-y-auto pr-1">
            {isLoadingKalender ? (
              <div className="text-xs text-slate-400 font-medium py-4 text-center">Memuat agenda sekolah...</div>
            ) : upcomingEvents.length > 0 ? (
              upcomingEvents?.map((item, i: number) => (
                <div key={i} className="p-2.5 px-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60 rounded-xl space-y-1 hover:bg-slate-100/70 dark:hover:bg-slate-800 transition-colors">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-purple-700 dark:text-purple-300 truncate">{item.event}</span>
                    <span className="text-[9px] text-slate-400 font-bold shrink-0">{item.tanggal}</span>
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-normal line-clamp-2">{item.desc}</p>
                </div>
              ))
            ) : (
              <div className="p-6 bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-center text-xs text-slate-400 font-medium">
                Tidak ada agenda kegiatan khusus kesiswaan mendatang.
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px] font-bold text-slate-400">
          <span>Kalender Akademik</span>
          <span className="text-purple-600 dark:text-purple-400 font-bold">Kegiatan Aktif</span>
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

  const rombelRawan = sortedRombel.filter(r => r.points > 0).slice(0, 4);
  const rombelDisiplin = analytics?.data?.rombel_disiplin || [];

  return (
    <Card className="p-6 rounded-2xl border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex flex-col justify-between w-full">
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
              <Award size={18} />
            </div>
            <div>
              <h3 className="text-base font-black text-gray-900 dark:text-white tracking-tight leading-none">Rombel Disiplin & Perlu Pembinaan</h3>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-1">Evaluasi kedisiplinan per rombongan belajar</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Rombel Terdisiplin */}
          <div className="p-4 bg-emerald-50/20 dark:bg-emerald-950/10 border border-emerald-100 dark:border-emerald-900/30 rounded-2xl">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Award size={14} className="text-emerald-600 dark:text-emerald-400" />
                <h4 className="text-xs font-black text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">Terdisiplin</h4>
              </div>
              <span className="text-[9px] font-bold text-emerald-600 bg-emerald-100 dark:bg-emerald-950 px-2 py-0.5 rounded-full">Top</span>
            </div>
            <div className="space-y-2">
              {rombelDisiplin.length > 0 ? (
                rombelDisiplin.slice(0, 4)?.map((r, i: number) => (
                  <div key={i} className="flex items-center justify-between p-2.5 bg-white dark:bg-slate-900 border border-emerald-100 dark:border-emerald-900/20 rounded-xl">
                    <div className="min-w-0 pr-2">
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate block">
                        {r.nama_kelas || r.name || 'Kelas Terdisiplin'}
                      </span>
                      <span className="text-[9px] font-semibold text-emerald-600 dark:text-emerald-400">
                        {r.status || `${r.points || 0} Poin Pelanggaran`}
                      </span>
                    </div>
                    <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                  </div>
                ))
              ) : (
                <div className="text-xs text-emerald-700 dark:text-emerald-300 font-bold p-4 text-center bg-emerald-50 dark:bg-emerald-950/30 rounded-xl">
                  🎉 Seluruh rombel menjaga kedisiplinan dengan sangat baik!
                </div>
              )}
            </div>
          </div>

          {/* Rombel Butuh Pembinaan */}
          <div className="p-4 bg-rose-50/20 dark:bg-rose-950/10 border border-rose-100 dark:border-rose-900/30 rounded-2xl">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <ShieldAlert size={14} className="text-rose-600 dark:text-rose-400" />
                <h4 className="text-xs font-black text-rose-800 dark:text-rose-300 uppercase tracking-wider">Perlu Perhatian</h4>
              </div>
              <span className="text-[9px] font-bold text-rose-600 bg-rose-100 dark:bg-rose-950 px-2 py-0.5 rounded-full">Perhatian</span>
            </div>
            <div className="space-y-2">
              {rombelRawan.length > 0 ? (
                rombelRawan?.map((r, i: number) => (
                  <div key={i} className="flex items-center justify-between p-2.5 bg-white dark:bg-slate-900 border border-rose-100 dark:border-rose-900/20 rounded-xl">
                    <div className="min-w-0 pr-2">
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate block">
                        {r.name}
                      </span>
                      <span className="text-[9px] font-semibold text-slate-400">
                        Akumulasi Kasus
                      </span>
                    </div>
                    <span className="text-xs font-black text-rose-600 dark:text-rose-400 bg-rose-100 dark:bg-rose-950/60 px-2 py-0.5 rounded-md shrink-0">
                      +{r.points} Poin
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-xs text-slate-400 font-medium p-4 text-center bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                  Tidak ada kelas dengan akumulasi poin pelanggaran tinggi.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
});
