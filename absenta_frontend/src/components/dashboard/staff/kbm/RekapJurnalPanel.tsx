import React, { useState, useMemo } from 'react';
import { 
  FileText, Search, Calendar, Download, Eye, 
  CheckCircle2, BookOpen, Clock, Filter, Sparkles, ChevronRight 
} from 'lucide-react';
import { cn } from '../../../../lib/utils';
import toast from 'react-hot-toast';

interface JurnalRecord {
  id: string;
  tanggal: string;
  kelas: string;
  mapel: string;
  jamKe: string;
  materiPokok: string;
  capaianPembelajaran: string;
  catatanKelas: string;
  kehadiranSiswa: {
    hadir: number;
    sakit: number;
    izin: number;
    alpa: number;
    total: number;
  };
  statusSesi: 'SELESAI' | 'BERLANGSUNG';
}

const MOCK_JURNAL_LIST: JurnalRecord[] = [
  {
    id: 'j-1',
    tanggal: '2026-08-18',
    kelas: 'X AKL 1',
    mapel: 'Akuntansi Dasar',
    jamKe: '1 - 2 (07:00 - 08:30)',
    materiPokok: 'Konsep Dasar Persamaan Dasar Akuntansi (PDA)',
    capaianPembelajaran: 'Memahami prinsip debit-kredit dan analisis transaksi keuangan sederhana.',
    catatanKelas: 'Siswa sangat antusias dalam mengerjakan studi kasus transaksi kas dan piutang.',
    kehadiranSiswa: { hadir: 34, sakit: 2, izin: 0, alpa: 0, total: 36 },
    statusSesi: 'SELESAI',
  },
  {
    id: 'j-2',
    tanggal: '2026-08-17',
    kelas: 'XI AKL 2',
    mapel: 'Praktikum Akuntansi Perusahaan Jasa',
    jamKe: '3 - 4 (08:30 - 10:00)',
    materiPokok: 'Pencatatan Jurnal Umum & Buku Besar',
    capaianPembelajaran: 'Mampu menyusun jurnal penyesuaian dan memposting ke buku besar pembantu.',
    catatanKelas: 'Semua kelompok menyelesaikan neraca saldo sebelum jam KBM berakhir.',
    kehadiranSiswa: { hadir: 35, sakit: 0, izin: 1, alpa: 0, total: 36 },
    statusSesi: 'SELESAI',
  },
  {
    id: 'j-3',
    tanggal: '2026-08-15',
    kelas: 'XII AKL 1',
    mapel: 'Komputer Akuntansi (MYOB/Accurate)',
    jamKe: '5 - 6 (10:15 - 11:45)',
    materiPokok: 'Setup Database Awal Perusahaan Dagang',
    capaianPembelajaran: 'Setup bagan akun (COA) dan input saldo awal persediaan barang dagang.',
    catatanKelas: 'Praktikum di Lab Komputer 1 berjalan lancar tanpa kendala perangkat.',
    kehadiranSiswa: { hadir: 36, sakit: 0, izin: 0, alpa: 0, total: 36 },
    statusSesi: 'SELESAI',
  },
  {
    id: 'j-4',
    tanggal: '2026-08-14',
    kelas: 'X AKL 2',
    mapel: 'Akuntansi Dasar',
    jamKe: '1 - 2 (07:00 - 08:30)',
    materiPokok: 'Bukti Transaksi & Dokumen Sumber',
    capaianPembelajaran: 'Mengidentifikasi jenis-jenis nota, kuitansi, cek, dan faktur pajak.',
    catatanKelas: 'Latihan verifikasi keabsahan bukti kas masuk dan kas keluar.',
    kehadiranSiswa: { hadir: 33, sakit: 1, izin: 1, alpa: 1, total: 36 },
    statusSesi: 'SELESAI',
  },
];

export const RekapJurnalPanel: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedKelas, setSelectedKelas] = useState('ALL');
  const [selectedJurnal, setSelectedJurnal] = useState<JurnalRecord | null>(null);

  const filteredJurnal = useMemo(() => {
    return MOCK_JURNAL_LIST.filter(j => {
      const matchSearch = j.materiPokok.toLowerCase().includes(searchTerm.toLowerCase()) ||
        j.kelas.toLowerCase().includes(searchTerm.toLowerCase()) ||
        j.mapel.toLowerCase().includes(searchTerm.toLowerCase());
      const matchKelas = selectedKelas === 'ALL' || j.kelas === selectedKelas;
      return matchSearch && matchKelas;
    });
  }, [searchTerm, selectedKelas]);

  const handleExport = () => {
    toast.success('Laporan Rekapitulasi Jurnal Mengajar siap diunduh (PDF)!', { icon: '📄' });
  };

  return (
    <div className="space-y-4">
      <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
      {/* ── HEADER BANNER & FILTERS ── */}
      <div className="p-4 sm:p-5 bg-gradient-to-r from-blue-50/80 via-slate-50 to-indigo-50/50 dark:from-slate-800/80 dark:via-slate-900 dark:to-slate-900 border-b border-slate-200/80 dark:border-slate-800 space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-blue-500/25">
              <FileText size={18} />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                Buku Jurnal Mengajar Harian
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Histori materi, capaian pembelajaran (TP/CP), dan presensi siswa per pertemuan
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleExport}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-500 text-white text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-2 shadow-sm active:scale-95 shrink-0"
          >
            <Download size={14} />
            <span>Ekspor PDF Jurnal</span>
          </button>
        </div>

        {/* Filters Bar */}
        <div className="flex flex-wrap items-center gap-2.5 pt-2 border-t border-slate-200/60 dark:border-slate-800">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Cari materi pokok, kelas, atau mapel..."
              className="w-full h-9.5 pl-9 pr-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 text-xs font-medium text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            />
          </div>

          <select
            value={selectedKelas}
            onChange={e => setSelectedKelas(e.target.value)}
            className="h-9.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 text-xs font-black text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 cursor-pointer"
          >
            <option value="ALL">Semua Rombel Kelas</option>
            <option value="X AKL 1">Kelas X AKL 1</option>
            <option value="X AKL 2">Kelas X AKL 2</option>
            <option value="XI AKL 2">Kelas XI AKL 2</option>
            <option value="XII AKL 1">Kelas XII AKL 1</option>
          </select>
        </div>
      </div>

      {/* ── JURNAL RECORDS LIST (UNIFIED ROWS) ── */}
      <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
        {filteredJurnal.length === 0 ? (
          <div className="py-12 text-center space-y-2">
            <FileText className="text-slate-300 dark:text-slate-600 mx-auto" size={32} />
            <p className="text-xs font-bold text-slate-500">Tidak ada jurnal mengajar yang sesuai filter.</p>
          </div>
        ) : (
          filteredJurnal.map((jurnal) => (
            <div
              key={jurnal.id}
              onClick={() => setSelectedJurnal(jurnal)}
              className="p-3.5 sm:p-4.5 hover:bg-blue-50/40 dark:hover:bg-slate-800/50 transition-colors space-y-2 cursor-pointer group"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-950 text-blue-900 dark:text-blue-300 font-black text-[11px] font-mono border border-blue-200 dark:border-blue-800">
                    {jurnal.kelas}
                  </span>
                  <span className="font-black text-xs sm:text-sm text-slate-900 dark:text-white">
                    {jurnal.mapel}
                  </span>
                  <span className="text-slate-300 dark:text-slate-600">•</span>
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 font-mono">
                    {jurnal.tanggal} ({jurnal.jamKe})
                  </span>
                </div>

                <div className="flex items-center gap-1 text-xs font-bold text-blue-600 dark:text-blue-400 group-hover:translate-x-0.5 transition-transform self-start sm:self-auto">
                  <span>Detail Jurnal</span>
                  <ChevronRight size={14} />
                </div>
              </div>

              <div className="space-y-0.5">
                <h4 className="text-xs font-extrabold text-slate-800 dark:text-slate-100">
                  {jurnal.materiPokok}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">
                  {jurnal.capaianPembelajaran}
                </p>
              </div>

              {/* Presensi Siswa Status Pills */}
              <div className="flex items-center justify-between pt-1 text-[11px] font-medium text-slate-400">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-[10px] font-black border border-emerald-200 dark:border-emerald-800">
                    Hadir: {jurnal.kehadiranSiswa.hadir}/{jurnal.kehadiranSiswa.total}
                  </span>
                  {jurnal.kehadiranSiswa.sakit > 0 && (
                    <span className="px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 text-[10px] font-bold">
                      Sakit: {jurnal.kehadiranSiswa.sakit}
                    </span>
                  )}
                  {jurnal.kehadiranSiswa.izin > 0 && (
                    <span className="px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 text-[10px] font-bold">
                      Izin: {jurnal.kehadiranSiswa.izin}
                    </span>
                  )}
                  {jurnal.kehadiranSiswa.alpa > 0 && (
                    <span className="px-1.5 py-0.5 rounded bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-[10px] font-bold">
                      Alpa: {jurnal.kehadiranSiswa.alpa}
                    </span>
                  )}
                </div>

                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                  {jurnal.statusSesi}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>

      {/* Modal Detail Jurnal */}
      {selectedJurnal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs"
          onClick={() => setSelectedJurnal(null)}
        >
          <div
            className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden p-6 space-y-4 text-slate-800 dark:text-slate-100"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <span className="px-2 py-0.5 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 font-extrabold text-[11px]">
                  {selectedJurnal.kelas} • {selectedJurnal.mapel}
                </span>
                <h3 className="text-sm font-bold mt-1 text-slate-900 dark:text-white">
                  Detail Jurnal Mengajar
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedJurnal(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Waktu Pertemuan</label>
                <p className="font-semibold text-slate-700 dark:text-slate-200 mt-0.5">
                  {selectedJurnal.tanggal} — Jam Ke: {selectedJurnal.jamKe}
                </p>
              </div>

              <div>
                <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Materi Pokok</label>
                <p className="font-bold text-slate-900 dark:text-white mt-0.5">
                  {selectedJurnal.materiPokok}
                </p>
              </div>

              <div>
                <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Capaian Pembelajaran / Indikator</label>
                <p className="text-slate-600 dark:text-slate-300 mt-0.5 leading-relaxed">
                  {selectedJurnal.capaianPembelajaran}
                </p>
              </div>

              <div>
                <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Catatan & Dinamika Kelas</label>
                <p className="text-slate-600 dark:text-slate-300 mt-0.5 leading-relaxed bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200/60 dark:border-slate-800 italic">
                  "{selectedJurnal.catatanKelas}"
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedJurnal(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
