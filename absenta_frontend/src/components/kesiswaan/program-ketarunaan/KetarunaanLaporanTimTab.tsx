import React, { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FileText, Printer } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { getKetarunaanLaporanTim } from '@/api/kesiswaan/programKetarunaan.api';

interface KetarunaanLaporanTimTabProps {
  jadwalKegiatanId: string | null;
  sesiId: string | null;
}

function formatWaktu(w?: string | null) {
  if (!w) return '-';
  return w.length === 5 ? w : w.slice(0, 5);
}

function formatTanggal(d?: string) {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
}

function statusBadge(status: string) {
  if (status === 'HADIR') return <Badge variant="success" className="text-[10px]">Hadir</Badge>;
  if (status === 'IZIN') return <Badge variant="warning" className="text-[10px]">Izin</Badge>;
  if (status === 'SAKIT') return <Badge variant="warning" className="text-[10px]">Sakit</Badge>;
  if (status === 'ALPA') return <Badge variant="error" className="text-[10px]">Alpa</Badge>;
  return <Badge variant="outline" className="text-[10px]">Belum</Badge>;
}

export const KetarunaanLaporanTimTab: React.FC<KetarunaanLaporanTimTabProps> = ({
  jadwalKegiatanId,
  sesiId,
}) => {
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);

  const { data, isLoading } = useQuery({
    queryKey: ['ketarunaan-laporan-tim', selectedDate, sesiId],
    queryFn: () => getKetarunaanLaporanTim({
      tanggal: selectedDate,
      sesi_id: sesiId ?? undefined,
      jadwal_kegiatan_id: jadwalKegiatanId ?? undefined,
    }),
    staleTime: 60_000,
  });

  const rows = data?.data ?? [];
  const tanggalDisplay = formatTanggal(data?.tanggal || selectedDate);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  return (
    <div className="space-y-5 p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div>
          <h4 className="text-sm font-black text-slate-800 dark:text-slate-100">Laporan Tim Ketarunaan</h4>
          <p className="text-xs text-slate-500 dark:text-slate-400">Daftar hadir fisik & tanda tangan pendamping sekolah</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
            className="text-xs border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-amber-400 outline-none"
          />
          <Button variant="outline" size="sm" onClick={handlePrint} className="gap-1.5 text-xs">
            <Printer className="w-3.5 h-3.5" /> Cetak
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-2xl" />)}</div>
      ) : rows.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-bold">Tidak ada data untuk tanggal ini</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900 shadow-sm print:border-none print:shadow-none">
          {/* Print header */}
          <div className="hidden print:block text-center py-4 border-b border-slate-200">
            <h2 className="text-lg font-black uppercase">Daftar Hadir Tim Ketarunaan</h2>
            <p className="text-sm">{tanggalDisplay}</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 print:bg-slate-100">
                  <th className="text-center px-3 py-3 text-[11px] font-black text-slate-500 uppercase tracking-wider w-10">No</th>
                  <th className="text-left px-4 py-3 text-[11px] font-black text-slate-500 uppercase tracking-wider">Nama</th>
                  <th className="text-left px-4 py-3 text-[11px] font-black text-slate-500 uppercase tracking-wider">Jabatan / Bidang</th>
                  <th className="text-center px-4 py-3 text-[11px] font-black text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="text-center px-4 py-3 text-[11px] font-black text-slate-500 uppercase tracking-wider">Waktu Tap</th>
                  <th className="text-left px-4 py-3 text-[11px] font-black text-slate-500 uppercase tracking-wider print:block">Tanda Tangan / Ket.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {rows.map(row => (
                  <tr key={row.no} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                    <td className="px-3 py-3 text-center text-slate-500 font-bold">{row.no}</td>
                    <td className="px-4 py-3 font-bold text-slate-800 dark:text-slate-100">{row.nama_guru}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">{row.jabatan}</td>
                    <td className="px-4 py-3 text-center">{statusBadge(row.status)}</td>
                    <td className="px-4 py-3 text-center text-xs text-slate-500">
                      {row.waktu_tap ? formatWaktu(row.waktu_tap) : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400 print:border-b print:border-slate-200 print:h-10">
                      {row.keterangan || ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
