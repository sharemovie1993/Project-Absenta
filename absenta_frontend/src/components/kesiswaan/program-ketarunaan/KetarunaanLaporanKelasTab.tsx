import React, { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { LayoutList, Printer, ChevronUp, ChevronDown, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { getKetarunaanLaporanKelas } from '@/api/kesiswaan/programKetarunaan.api';

interface KetarunaanLaporanKelasTabProps {
  jadwalKegiatanId: string | null;
  sesiId: string | null;
}

function formatWaktu(w?: string | null) {
  if (!w) return '—';
  return w.length === 5 ? w : w.slice(0, 5);
}

function statusBadge(status: string) {
  if (status === 'HADIR') return <Badge variant="success" className="text-[10px]">Hadir</Badge>;
  if (status === 'IZIN') return <Badge variant="warning" className="text-[10px]">Izin</Badge>;
  if (status === 'SAKIT') return <Badge variant="warning" className="text-[10px]">Sakit</Badge>;
  if (status === 'ALPA') return <Badge variant="error" className="text-[10px]">Alpa</Badge>;
  return <Badge variant="outline" className="text-[10px]">Belum</Badge>;
}

export const KetarunaanLaporanKelasTab: React.FC<KetarunaanLaporanKelasTabProps> = ({
  jadwalKegiatanId,
  sesiId,
}) => {
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [expandedKelas, setExpandedKelas] = useState<Set<string>>(new Set());

  const { data, isLoading } = useQuery({
    queryKey: ['ketarunaan-laporan-kelas', selectedDate, jadwalKegiatanId],
    queryFn: () => getKetarunaanLaporanKelas({
      tanggal: selectedDate,
      jadwal_kegiatan_id: jadwalKegiatanId ?? undefined,
      sesi_id: sesiId ?? undefined,
    }),
    staleTime: 60_000,
  });

  const rows = data?.data ?? [];

  const toggleKelas = useCallback((kelasId: string) => {
    setExpandedKelas(prev => {
      const next = new Set(prev);
      if (next.has(kelasId)) {
        next.delete(kelasId);
      } else {
        next.add(kelasId);
      }
      return next;
    });
  }, []);

  return (
    <div className="space-y-5 p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div>
          <h4 className="text-sm font-black text-slate-800 dark:text-slate-100">Laporan Per Rombongan Belajar (Kelas)</h4>
          <p className="text-xs text-slate-500 dark:text-slate-400">Kehadiran siswa per rombel pada sesi program Ketarunaan</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
            className="text-xs border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-amber-400 outline-none"
          />
          <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-1.5 text-xs">
            <Printer className="w-3.5 h-3.5" /> Cetak
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-2xl" />)}</div>
      ) : rows.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <LayoutList className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-bold">Tidak ada data untuk tanggal ini</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map(kelas => {
            const isExpanded = expandedKelas.has(kelas.kelas_id);
            const persen = kelas.rekap.total > 0
              ? Math.round((kelas.rekap.hadir / kelas.rekap.total) * 100)
              : 0;
            return (
              <div key={kelas.kelas_id} className="rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
                {/* Header kelas */}
                <button
                  onClick={() => toggleKelas(kelas.kelas_id)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <BookOpen className="w-4 h-4 text-amber-500" />
                    <span className="text-sm font-black text-slate-800 dark:text-slate-100">{kelas.kelas_nama}</span>
                    <Badge
                      variant={persen >= 80 ? "success" : persen >= 60 ? "warning" : "error"}
                      className="text-[10px]"
                    >
                      {persen}% ({kelas.rekap.hadir}/{kelas.rekap.total})
                    </Badge>
                  </div>
                  {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                </button>

                {/* Daftar siswa */}
                {isExpanded && (
                  <div>
                    {/* Rekap singkat guru pendamping/wali kelas/kaprog */}
                    {(kelas.kaprog || kelas.wali_kelas || (kelas.guru_mapel_beririsan && kelas.guru_mapel_beririsan.length > 0)) && (
                      <div className="px-4 py-2.5 bg-amber-50/50 dark:bg-amber-900/10 border-b border-slate-100 dark:border-slate-800 flex flex-wrap gap-3 text-xs">
                        {kelas.kaprog && (
                          <span className="text-slate-600 dark:text-slate-300">
                            <span className="font-bold">Kaprog:</span> {kelas.kaprog.nama_guru} — {kelas.kaprog.status}
                          </span>
                        )}
                        {kelas.wali_kelas && (
                          <span className="text-slate-600 dark:text-slate-300">
                            <span className="font-bold">Wali Kelas:</span> {kelas.wali_kelas.nama_guru} — {kelas.wali_kelas.status}
                          </span>
                        )}
                        {kelas.guru_mapel_beririsan?.map((g, i) => (
                          <span key={i} className="text-slate-600 dark:text-slate-300">
                            <span className="font-bold">{g.mapel}:</span> {g.nama_guru} — {g.status}
                          </span>
                        ))}
                      </div>
                    )}
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
                          <th className="text-center px-3 py-2 text-[10px] font-black text-slate-400 uppercase w-8">No</th>
                          <th className="text-left px-4 py-2 text-[10px] font-black text-slate-400 uppercase">Nama Siswa</th>
                          <th className="text-left px-4 py-2 text-[10px] font-black text-slate-400 uppercase">NIS</th>
                          <th className="text-center px-4 py-2 text-[10px] font-black text-slate-400 uppercase">Status</th>
                          <th className="text-center px-4 py-2 text-[10px] font-black text-slate-400 uppercase">Waktu</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                        {kelas.siswa.map(s => (
                          <tr key={s.no} className="hover:bg-slate-50/30 dark:hover:bg-slate-800/10 transition-colors">
                            <td className="px-3 py-2 text-center text-slate-400 text-xs">{s.no}</td>
                            <td className="px-4 py-2 text-slate-700 dark:text-slate-200 text-xs font-medium">
                              {s.nama_siswa}
                              {s.catatan && (
                                <span className="ml-1 text-[10px] text-emerald-500 italic">({s.catatan})</span>
                              )}
                            </td>
                            <td className="px-4 py-2 text-slate-400 text-xs">{s.nis}</td>
                            <td className="px-4 py-2 text-center">{statusBadge(s.status)}</td>
                            <td className="px-4 py-2 text-center text-xs text-slate-400">
                              {s.waktu_tap ? formatWaktu(s.waktu_tap) : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {/* Rekap */}
                    <div className="flex gap-4 px-4 py-2.5 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 text-xs font-bold">
                      <span className="text-emerald-600">Hadir: {kelas.rekap.hadir}</span>
                      <span className="text-amber-600">Sakit: {kelas.rekap.sakit}</span>
                      <span className="text-blue-600">Izin: {kelas.rekap.izin}</span>
                      <span className="text-rose-600">Alpa: {kelas.rekap.alpa}</span>
                      <span className="text-slate-500">Total: {kelas.rekap.total}</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
