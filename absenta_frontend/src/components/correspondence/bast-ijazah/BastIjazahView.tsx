import React, { useState, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ShieldCheck,
  Award,
  BookOpen,
  Printer,
  ChevronLeft,
  ChevronRight,
  Search,
  CheckCircle2,
  Clock,
  Archive,
  CheckCheck,
} from 'lucide-react';
import { useAcademicFilter, AcademicFilterToolbar } from '@/components/common/academic-filter';
import { SectionCard, Loader } from '@/components/ui';
import { getSiswaList } from '@/api/academic/siswa.api';
import {
  bastIjazahApi,
  bastIjazahQueryKeys,
  type BukuEkspedisiEntry,
} from '@/api/correspondence/bastIjazah.api';
import { BebasAdministrasiModal } from './BebasAdministrasiModal';
import { BastIjazahModal } from './BastIjazahModal';
import { BukuEkspedisiPrintModal } from './BukuEkspedisiPrintModal';

export interface UniversalBastIjazahViewProps {
  jurusanId?: string;
  jurusanNama?: string;
  kelasId?: string;
  kelasNama?: string;
  tahunPelajaranId?: string;
  tahunAjaran?: string;
  isModal?: boolean;
  hideLayout?: boolean;
  readOnly?: boolean;
  onClose?: () => void;
}

type ActiveTab = 'clearance' | 'bast' | 'ekspedisi';

export const BastIjazahView: React.FC<UniversalBastIjazahViewProps> = React.memo(({
  jurusanId,
  jurusanNama,
  kelasId: propKelasId,
  tahunPelajaranId: propTpId,
  hideLayout = false,
  readOnly = false,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('clearance');
  const [page, setPage] = useState(1);
  const [statusAmbilFilter, setStatusAmbilFilter] = useState<'ALL' | 'DIAMBIL' | 'BELUM'>('ALL');
  const [ekspedisiSearch, setEkspedisiSearch] = useState('');

  // Modals state
  const [clearanceSiswaId, setClearanceSiswaId] = useState<string | null>(null);
  const [bastSiswaId, setBastSiswaId] = useState<string | null>(null);
  const [isEkspedisiPrintOpen, setIsEkspedisiPrintOpen] = useState(false);

  // Unified Academic Filter
  const filter = useAcademicFilter({
    enableTp: true,
    enableKelas: !propKelasId,
    enableSearch: true,
    enableStatusSiswa: true,
    allowAllKelas: true,
    jurusanId,
    onFilterChange: () => setPage(1),
  });

  const effectiveTpId = propTpId || filter.values.tahunPelajaranId;
  const effectiveKelasId = propKelasId || filter.values.kelasId;
  const effectiveStatus = filter.values.statusSiswa || '';
  const effectiveSearch = filter.debouncedSearchQuery;

  // 1. Query Siswa (Tab 1 & Tab 2)
  const { data: siswaRes, isLoading: isSiswaLoading, refetch: refetchSiswa } = useQuery({
    queryKey: ['siswa-clearance-bast', {
      tp: effectiveTpId,
      kelas: effectiveKelasId,
      status: effectiveStatus,
      search: effectiveSearch,
      page,
    }],
    queryFn: () =>
      getSiswaList(
        page,
        15,
        effectiveSearch,
        effectiveKelasId || '',
        effectiveStatus || '',
        '',
        '',
        '',
        jurusanId || '',
        effectiveTpId || '',
        ''
      ),
    enabled: activeTab === 'clearance' || activeTab === 'bast',
    staleTime: 2 * 60 * 1000,
  });

  const siswaList = siswaRes?.data ?? [];
  const siswaPagination = siswaRes?.pagination;

  // 2. Query Buku Ekspedisi
  const { data: ekspedisiRes, isLoading: isEkspedisiLoading, refetch: refetchEkspedisi } = useQuery({
    queryKey: bastIjazahQueryKeys.bukuEkspedisi({
      tp: effectiveTpId,
      status: statusAmbilFilter,
      search: ekspedisiSearch,
    }),
    queryFn: () =>
      bastIjazahApi.getBukuEkspedisi({
        tahun_pelajaran_id: effectiveTpId,
        status_ambil: statusAmbilFilter,
        search: ekspedisiSearch || undefined,
      }),
    enabled: activeTab === 'ekspedisi',
    staleTime: 60 * 1000,
  });

  const ekspedisiData = ekspedisiRes?.data;
  const ekspedisiEntries: BukuEkspedisiEntry[] = ekspedisiData?.entries || [];
  const ekspedisiRekap = ekspedisiData?.rekap || { total_lulusan: 0, total_sudah_diambil: 0, total_di_brankas: 0 };

  return (
    <div className="space-y-6">
      {/* Top Tab Bar & Global Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('clearance')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all ${
              activeTab === 'clearance'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <ShieldCheck size={16} />
            Bebas Administrasi (5 Pos)
          </button>

          <button
            onClick={() => setActiveTab('bast')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all ${
              activeTab === 'bast'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Award size={16} />
            Penyerahan Ijazah & BAST
          </button>

          <button
            onClick={() => setActiveTab('ekspedisi')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all ${
              activeTab === 'ekspedisi'
                ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900 shadow-md'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <BookOpen size={16} />
            Buku Ekspedisi Ijazah
          </button>
        </div>

        {/* Action Button Right */}
        {activeTab === 'ekspedisi' && (
          <button
            onClick={() => setIsEkspedisiPrintOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-all"
          >
            <Printer size={15} />
            Cetak Register Ekspedisi (Landscape)
          </button>
        )}
      </div>

      {/* ─── TAB 1: BEBAS ADMINISTRASI (CLEARANCE 5 POS) ────────────────── */}
      {activeTab === 'clearance' && (
        <div className="space-y-4">
          <AcademicFilterToolbar {...filter.toolbarProps} />

          <SectionCard fullWidth noPadding className="overflow-hidden">
            {isSiswaLoading ? (
              <div className="py-20 flex justify-center items-center">
                <Loader size="lg" />
              </div>
            ) : siswaList.length === 0 ? (
              <div className="py-16 text-center text-slate-400 text-xs">
                Tidak ada data peserta didik yang cocok dengan filter.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-[10px] uppercase font-black tracking-wider text-slate-500">
                    <tr>
                      <th className="py-3 px-4 w-12 text-center">No</th>
                      <th className="py-3 px-4">Nama Peserta Didik</th>
                      <th className="py-3 px-4">NIS / NISN</th>
                      <th className="py-3 px-4">Kelas</th>
                      <th className="py-3 px-4">Status Siswa</th>
                      <th className="py-3 px-4 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {siswaList.map((siswa: any, idx: number) => (
                      <tr key={siswa.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="py-3 px-4 text-center font-mono text-slate-400">
                          {(page - 1) * 15 + idx + 1}
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-900 dark:text-slate-100">
                          {siswa.nama_siswa}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-300">
                          {siswa.nis} / {siswa.nisn || '-'}
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">
                          {siswa.Kelas?.nama_kelas || siswa.kelas?.nama_kelas || '-'}
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                            {siswa.status || 'AKTIF'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => setClearanceSiswaId(siswa.id)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-900/50 transition-all"
                          >
                            <ShieldCheck size={13} />
                            Verifikasi & Cetak Bebas
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {siswaPagination && siswaPagination.totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 dark:border-slate-800">
                <span className="text-xs text-slate-500">
                  Halaman {page} dari {siswaPagination.totalPages} ({siswaPagination.total} total data)
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(siswaPagination.totalPages, p + 1))}
                    disabled={page >= siswaPagination.totalPages}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </SectionCard>
        </div>
      )}

      {/* ─── TAB 2: PENYERAHAN IJAZAH & BAST ─────────────────────────────── */}
      {activeTab === 'bast' && (
        <div className="space-y-4">
          <AcademicFilterToolbar {...filter.toolbarProps} />

          <SectionCard fullWidth noPadding className="overflow-hidden">
            {isSiswaLoading ? (
              <div className="py-20 flex justify-center items-center">
                <Loader size="lg" />
              </div>
            ) : siswaList.length === 0 ? (
              <div className="py-16 text-center text-slate-400 text-xs">
                Tidak ada data peserta didik yang cocok.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-[10px] uppercase font-black tracking-wider text-slate-500">
                    <tr>
                      <th className="py-3 px-4 w-12 text-center">No</th>
                      <th className="py-3 px-4">Nama Peserta Didik</th>
                      <th className="py-3 px-4">NIS / NISN</th>
                      <th className="py-3 px-4">Kelas</th>
                      <th className="py-3 px-4">Status Siswa</th>
                      <th className="py-3 px-4 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {siswaList.map((siswa: any, idx: number) => (
                      <tr key={siswa.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="py-3 px-4 text-center font-mono text-slate-400">
                          {(page - 1) * 15 + idx + 1}
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-900 dark:text-slate-100">
                          {siswa.nama_siswa}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-300">
                          {siswa.nis} / {siswa.nisn || '-'}
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">
                          {siswa.Kelas?.nama_kelas || siswa.kelas?.nama_kelas || '-'}
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                            {siswa.status || 'AKTIF'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => setBastSiswaId(siswa.id)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 dark:hover:bg-indigo-900/50 transition-all"
                          >
                            <Award size={13} />
                            Buat BAST & Serah Terima
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>
        </div>
      )}

      {/* ─── TAB 3: BUKU EKSPEDISI IJAZAH (ARSIP BRANKAS) ────────────────── */}
      {activeTab === 'ekspedisi' && (
        <div className="space-y-4">
          {/* Stat Cards Brankas */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-slate-50 dark:bg-slate-800/80 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Total Blangko Ijazah</p>
                <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                  {ekspedisiRekap.total_lulusan}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200">
                <BookOpen size={20} />
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/80 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Sudah Diserahkan (BAST)</p>
                <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                  {ekspedisiRekap.total_sudah_diambil}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600">
                <CheckCheck size={20} />
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/80 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Sisa di Brankas Sekolah</p>
                <p className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
                  {ekspedisiRekap.total_di_brankas}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-600">
                <Archive size={20} />
              </div>
            </div>
          </div>

          {/* Filter & Search Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-1.5">
              {(['ALL', 'DIAMBIL', 'BELUM'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setStatusAmbilFilter(t)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                    statusAmbilFilter === t
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                  }`}
                >
                  {t === 'ALL' ? 'Semua Ijazah' : t === 'DIAMBIL' ? 'Sudah Diambil' : 'Sisa di Brankas'}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-64">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={ekspedisiSearch}
                onChange={(e) => setEkspedisiSearch(e.target.value)}
                placeholder="Cari siswa, NIS, atau no seri..."
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
              />
            </div>
          </div>

          {/* Table Ekspedisi */}
          <SectionCard fullWidth noPadding className="overflow-hidden">
            {isEkspedisiLoading ? (
              <div className="py-20 flex justify-center">
                <Loader size="lg" />
              </div>
            ) : ekspedisiEntries.length === 0 ? (
              <div className="py-16 text-center text-xs text-slate-400">
                Tidak ada data ekspedisi ijazah yang cocok.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-[10px] uppercase font-black tracking-wider text-slate-500">
                    <tr>
                      <th className="py-3 px-4 w-12 text-center">No</th>
                      <th className="py-3 px-4">Nama Peserta Didik</th>
                      <th className="py-3 px-4">NIS / NISN</th>
                      <th className="py-3 px-4">Kelas</th>
                      <th className="py-3 px-4">No. Seri Ijazah</th>
                      <th className="py-3 px-4">Status Pengambilan</th>
                      <th className="py-3 px-4">Penerima & Tanggal</th>
                      <th className="py-3 px-4 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {ekspedisiEntries.map((entry, idx) => {
                      const isDiambil = entry.status_ambil === 'DIAMBIL';
                      return (
                        <tr key={entry.siswa_id || idx} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50">
                          <td className="py-3 px-4 text-center font-mono text-slate-400">{idx + 1}</td>
                          <td className="py-3 px-4 font-bold text-slate-900 dark:text-slate-100">
                            {entry.nama_siswa}
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-300">
                            {entry.nis} / {entry.nisn || '-'}
                          </td>
                          <td className="py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">
                            {entry.kelas}
                          </td>
                          <td className="py-3 px-4 font-mono font-bold text-slate-800 dark:text-slate-200">
                            {entry.nomor_seri_ijazah}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                isDiambil
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                  : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                              }`}
                            >
                              {isDiambil ? 'SUDAH DIAMBIL' : 'DI BRANKAS'}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            {isDiambil ? (
                              <div>
                                <span className="font-semibold text-slate-800 dark:text-slate-200">{entry.penerima_nama}</span>
                                <p className="text-[10px] text-slate-400">
                                  {new Date(entry.tanggal_ambil!).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                                </p>
                              </div>
                            ) : (
                              <span className="text-slate-400 italic">Belum diserahkan</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => setBastSiswaId(entry.siswa_id)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/50"
                            >
                              <Award size={12} />
                              {isDiambil ? 'Cetak Ulang BAST' : 'Serahkan Ijazah'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>
        </div>
      )}

      {/* ─── MODALS ──────────────────────────────────────────────────────── */}
      {clearanceSiswaId && (
        <BebasAdministrasiModal
          isOpen={Boolean(clearanceSiswaId)}
          onClose={() => setClearanceSiswaId(null)}
          siswaId={clearanceSiswaId}
          onSuccess={() => {
            refetchSiswa();
            refetchEkspedisi();
          }}
        />
      )}

      {bastSiswaId && (
        <BastIjazahModal
          isOpen={Boolean(bastSiswaId)}
          onClose={() => setBastSiswaId(null)}
          siswaId={bastSiswaId}
          onSuccess={() => {
            refetchEkspedisi();
          }}
        />
      )}

      {isEkspedisiPrintOpen && (
        <BukuEkspedisiPrintModal
          isOpen={isEkspedisiPrintOpen}
          onClose={() => setIsEkspedisiPrintOpen(false)}
          tahunPelajaranId={effectiveTpId}
          tahunPelajaran={filter.activeTpYear?.tahun}
        />
      )}
    </div>
  );
});

BastIjazahView.displayName = 'BastIjazahView';
