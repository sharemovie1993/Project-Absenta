import React, { useState, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  LogOut,
  LogIn,
  BookOpen,
  History,
  Printer,
  ChevronLeft,
  ChevronRight,
  Plus,
  Search,
  Building,
  User,
  ArrowRight,
  FileCheck,
} from 'lucide-react';
import { useAcademicFilter, AcademicFilterToolbar } from '@/components/common/academic-filter';
import { SectionCard, Loader } from '@/components/ui';
import { getSiswaList } from '@/api/academic/siswa.api';
import {
  mutasiApi,
  mutasiQueryKeys,
  type BukuRegisterEntry,
  type AgendaMutasiItem,
} from '@/api/correspondence/mutasi.api';
import { MutasiKeluarModal } from './MutasiKeluarModal';
import { MutasiMasukModal } from './MutasiMasukModal';
import { BukuRegisterPrintModal } from './BukuRegisterPrintModal';

export interface UniversalMutasiSiswaViewProps {
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

type ActiveTab = 'keluar' | 'masuk' | 'register' | 'agenda';

export const MutasiSiswaView: React.FC<UniversalMutasiSiswaViewProps> = React.memo(({
  jurusanId,
  jurusanNama,
  kelasId: propKelasId,
  tahunPelajaranId: propTpId,
  hideLayout = false,
  readOnly = false,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('keluar');
  const [page, setPage] = useState(1);
  const [agendaPage, setAgendaPage] = useState(1);
  const [agendaSearch, setAgendaSearch] = useState('');
  const [registerFilterTipe, setRegisterFilterTipe] = useState<'ALL' | 'MASUK' | 'KELUAR'>('ALL');

  // Modals state
  const [keluarSiswaId, setKeluarSiswaId] = useState<string | null>(null);
  const [isMasukModalOpen, setIsMasukModalOpen] = useState(false);
  const [isRegisterPrintOpen, setIsRegisterPrintOpen] = useState(false);

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
  const effectiveStatus = filter.values.statusSiswa || 'AKTIF';
  const effectiveSearch = filter.debouncedSearchQuery;

  // 1. Query Siswa Aktif (Untuk Tab Mutasi Keluar)
  const { data: siswaRes, isLoading: isSiswaLoading, refetch: refetchSiswa } = useQuery({
    queryKey: ['siswa-mutasi-keluar', {
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
        effectiveStatus || 'AKTIF',
        '',
        '',
        '',
        jurusanId || '',
        effectiveTpId || '',
        ''
      ),
    enabled: activeTab === 'keluar',
    staleTime: 2 * 60 * 1000,
  });

  const siswaList = siswaRes?.data ?? [];
  const siswaPagination = siswaRes?.pagination;

  // 2. Query Buku Register Mutasi
  const { data: registerRes, isLoading: isRegisterLoading, refetch: refetchRegister } = useQuery({
    queryKey: mutasiQueryKeys.bukuRegister({
      tp: effectiveTpId,
      tipe: registerFilterTipe,
    }),
    queryFn: () =>
      mutasiApi.getBukuRegister({
        tahun_pelajaran_id: effectiveTpId,
        tipe: registerFilterTipe,
      }),
    enabled: activeTab === 'register' || activeTab === 'masuk',
    staleTime: 60 * 1000,
  });

  const registerData = registerRes?.data;
  const registerEntries: BukuRegisterEntry[] = registerData?.entries || [];
  const registerRekap = registerData?.rekap || { total_masuk: 0, total_keluar: 0, total_mutasi: 0 };

  // 3. Query Agenda Surat Mutasi
  const { data: agendaRes, isLoading: isAgendaLoading } = useQuery({
    queryKey: mutasiQueryKeys.agenda({
      page: agendaPage,
      search: agendaSearch,
    }),
    queryFn: () =>
      mutasiApi.getAgenda({
        page: agendaPage,
        limit: 15,
        search: agendaSearch || undefined,
      }),
    enabled: activeTab === 'agenda',
    staleTime: 60 * 1000,
  });

  const agendaList: AgendaMutasiItem[] = agendaRes?.data || [];
  const agendaPagination = agendaRes?.pagination;

  return (
    <div className="space-y-6">
      {/* Tab Navigation & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('keluar')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all ${
              activeTab === 'keluar'
                ? 'bg-rose-600 text-white shadow-md shadow-rose-600/20'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <LogOut size={16} />
            Mutasi Keluar
          </button>

          <button
            onClick={() => setActiveTab('masuk')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all ${
              activeTab === 'masuk'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <LogIn size={16} />
            Mutasi Masuk
          </button>

          <button
            onClick={() => setActiveTab('register')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all ${
              activeTab === 'register'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <BookOpen size={16} />
            Buku Register Mutasi
          </button>

          <button
            onClick={() => setActiveTab('agenda')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all ${
              activeTab === 'agenda'
                ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900 shadow-md'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <History size={16} />
            Arsip Surat Mutasi
          </button>
        </div>

        {/* Action Button Right */}
        <div className="flex items-center gap-2">
          {activeTab === 'masuk' && !readOnly && (
            <button
              onClick={() => setIsMasukModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-all"
            >
              <Plus size={15} />
              Terbitkan Surat Siswa Masuk
            </button>
          )}

          {activeTab === 'register' && (
            <button
              onClick={() => setIsRegisterPrintOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-all"
            >
              <Printer size={15} />
              Cetak Buku Register (Landscape)
            </button>
          )}
        </div>
      </div>

      {/* ─── TAB 1: MUTASI KELUAR ────────────────────────────────────────── */}
      {activeTab === 'keluar' && (
        <div className="space-y-4">
          <AcademicFilterToolbar {...filter.toolbarProps} />

          <SectionCard fullWidth noPadding className="overflow-hidden">
            {isSiswaLoading ? (
              <div className="py-20 flex justify-center items-center">
                <Loader size="lg" />
              </div>
            ) : siswaList.length === 0 ? (
              <div className="py-16 text-center text-slate-400 dark:text-slate-500 text-xs">
                Tidak ada data peserta didik yang cocok dengan kriteria filter.
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
                      <th className="py-3 px-4">L/P</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {siswaList.map((siswa: any, idx: number) => {
                      const isSudahMutasi = (siswa.status || '').toUpperCase() === 'MUTASI';
                      return (
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
                          <td className="py-3 px-4 text-slate-500">
                            {siswa.jenis_kelamin || siswa.gender || '-'}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                isSudahMutasi
                                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                                  : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                              }`}
                            >
                              {siswa.status || 'AKTIF'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            {!readOnly && (
                              <button
                                onClick={() => setKeluarSiswaId(siswa.id)}
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                                  isSudahMutasi
                                    ? 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                                    : 'bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 dark:hover:bg-rose-900/50'
                                }`}
                              >
                                <LogOut size={13} />
                                {isSudahMutasi ? 'Cetak Ulang Pindah' : 'Proses Mutasi Keluar'}
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
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

      {/* ─── TAB 2: MUTASI MASUK ─────────────────────────────────────────── */}
      {activeTab === 'masuk' && (
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-transparent p-5 rounded-2xl border border-emerald-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-black text-emerald-950 dark:text-emerald-200">
                Layanan Penerimaan Peserta Didik Baru Pindahan
              </h3>
              <p className="text-xs text-emerald-800/80 dark:text-emerald-300/80 mt-1">
                Terbitkan surat keterangan kesediaan menerima siswa pindahan lengkap dengan nomor dinas baku dan ruang stempel basah.
              </p>
            </div>
            {!readOnly && (
              <button
                onClick={() => setIsMasukModalOpen(true)}
                className="shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20 transition-all"
              >
                <Plus size={16} />
                Terbitkan Surat Siswa Masuk
              </button>
            )}
          </div>

          {/* Daftar Siswa Mutasi Masuk Terdaftar */}
          <SectionCard fullWidth noPadding className="overflow-hidden">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Riwayat Siswa Mutasi Masuk yang Telah Diterbitkan Surat
              </h4>
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                Total: {registerRekap.total_masuk} Siswa
              </span>
            </div>

            {isRegisterLoading ? (
              <div className="py-16 flex justify-center">
                <Loader size="md" />
              </div>
            ) : registerEntries.filter((e) => e.tipe === 'MUTASI_MASUK').length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">
                Belum ada surat penerimaan siswa masuk yang diterbitkan.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-[10px] uppercase font-black tracking-wider text-slate-500">
                    <tr>
                      <th className="py-3 px-4 w-12 text-center">No</th>
                      <th className="py-3 px-4">Nama Siswa</th>
                      <th className="py-3 px-4">Sekolah Asal</th>
                      <th className="py-3 px-4">Kelas Tujuan</th>
                      <th className="py-3 px-4">No. Surat Diterima</th>
                      <th className="py-3 px-4">Tanggal Masuk</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {registerEntries
                      .filter((e) => e.tipe === 'MUTASI_MASUK')
                      .map((entry, idx) => (
                        <tr key={entry.id || idx} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50">
                          <td className="py-3 px-4 text-center font-mono text-slate-400">{idx + 1}</td>
                          <td className="py-3 px-4 font-bold text-slate-900 dark:text-slate-100">
                            {entry.nama_siswa}
                          </td>
                          <td className="py-3 px-4 text-slate-700 dark:text-slate-300">
                            {entry.sekolah_asal || '-'}
                          </td>
                          <td className="py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">
                            {entry.kelas}
                          </td>
                          <td className="py-3 px-4 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                            {entry.nomor_surat}
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-500">
                            {new Date(entry.tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
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

      {/* ─── TAB 3: BUKU REGISTER MUTASI AKREDITASI ──────────────────────── */}
      {activeTab === 'register' && (
        <div className="space-y-4">
          {/* Stat Cards Akreditasi */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-slate-50 dark:bg-slate-800/80 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Total Mutasi Masuk</p>
                <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                  {registerRekap.total_masuk}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600">
                <LogIn size={20} />
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/80 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Total Mutasi Keluar</p>
                <p className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">
                  {registerRekap.total_keluar}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-rose-100 dark:bg-rose-950/60 text-rose-600">
                <LogOut size={20} />
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/80 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Total Seluruh Mutasi</p>
                <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1">
                  {registerRekap.total_mutasi}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600">
                <BookOpen size={20} />
              </div>
            </div>
          </div>

          {/* Filter Bar Tipe Register */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-1.5">
              {(['ALL', 'MASUK', 'KELUAR'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setRegisterFilterTipe(t)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                    registerFilterTipe === t
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                  }`}
                >
                  {t === 'ALL' ? 'Semua Jenis' : t === 'MASUK' ? 'Mutasi Masuk Saja' : 'Mutasi Keluar Saja'}
                </button>
              ))}
            </div>

            <button
              onClick={() => setIsRegisterPrintOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
            >
              <Printer size={14} />
              Cetak Register A4 Landscape
            </button>
          </div>

          {/* Tabel Buku Register Mutasi */}
          <SectionCard fullWidth noPadding className="overflow-hidden">
            {isRegisterLoading ? (
              <div className="py-20 flex justify-center">
                <Loader size="lg" />
              </div>
            ) : registerEntries.length === 0 ? (
              <div className="py-16 text-center text-xs text-slate-400">
                Belum ada entri buku register mutasi pada kriteria ini.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-[10px] uppercase font-black tracking-wider text-slate-500">
                    <tr>
                      <th className="py-3 px-4 w-12 text-center">No</th>
                      <th className="py-3 px-4">Tanggal</th>
                      <th className="py-3 px-4">Jenis</th>
                      <th className="py-3 px-4">Nama Siswa</th>
                      <th className="py-3 px-4">NIS / NISN</th>
                      <th className="py-3 px-4">Kelas</th>
                      <th className="py-3 px-4">Sekolah Asal / Tujuan</th>
                      <th className="py-3 px-4">No. Surat Dinas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {registerEntries.map((entry, idx) => {
                      const isKeluar = entry.tipe === 'MUTASI_KELUAR';
                      return (
                        <tr key={entry.id || idx} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50">
                          <td className="py-3 px-4 text-center font-mono text-slate-400">{idx + 1}</td>
                          <td className="py-3 px-4 font-mono text-slate-500 whitespace-nowrap">
                            {new Date(entry.tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                isKeluar
                                  ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                                  : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                              }`}
                            >
                              {isKeluar ? 'KELUAR' : 'MASUK'}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-bold text-slate-900 dark:text-slate-100">
                            {entry.nama_siswa}
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-300">
                            {entry.nis} / {entry.nisn || '-'}
                          </td>
                          <td className="py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">
                            {entry.kelas}
                          </td>
                          <td className="py-3 px-4 text-slate-700 dark:text-slate-300">
                            {isKeluar ? (
                              <div>
                                <span className="font-semibold text-rose-700 dark:text-rose-400">Ke: {entry.sekolah_tujuan}</span>
                                <p className="text-[10px] text-slate-400 mt-0.5">Alasan: {entry.alasan}</p>
                              </div>
                            ) : (
                              <span className="font-semibold text-emerald-700 dark:text-emerald-400">Dari: {entry.sekolah_asal}</span>
                            )}
                          </td>
                          <td className="py-3 px-4 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                            {entry.nomor_surat}
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

      {/* ─── TAB 4: ARSIP SURAT MUTASI (AGENDA) ───────────────────────────── */}
      {activeTab === 'agenda' && (
        <div className="space-y-4">
          {/* Search Bar */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-md">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={agendaSearch}
                onChange={(e) => {
                  setAgendaSearch(e.target.value);
                  setAgendaPage(1);
                }}
                placeholder="Cari nomor surat, perihal, nama sekolah tujuan/asal..."
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <SectionCard fullWidth noPadding className="overflow-hidden">
            {isAgendaLoading ? (
              <div className="py-20 flex justify-center">
                <Loader size="lg" />
              </div>
            ) : agendaList.length === 0 ? (
              <div className="py-16 text-center text-xs text-slate-400">
                Belum ada arsip surat mutasi yang tersimpan di agenda keluar.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-[10px] uppercase font-black tracking-wider text-slate-500">
                    <tr>
                      <th className="py-3 px-4 w-12 text-center">No</th>
                      <th className="py-3 px-4">Nomor Surat</th>
                      <th className="py-3 px-4">Perihal / Judul</th>
                      <th className="py-3 px-4">Tujuan / Asal Sekolah</th>
                      <th className="py-3 px-4">Siswa Terkait</th>
                      <th className="py-3 px-4">Tgl Terbit</th>
                      <th className="py-3 px-4">Penerbit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {agendaList.map((item, idx) => (
                      <tr key={item.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50">
                        <td className="py-3 px-4 text-center font-mono text-slate-400">
                          {(agendaPage - 1) * 15 + idx + 1}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-slate-800 dark:text-slate-200">
                          {item.nomor_surat}
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-900 dark:text-slate-100">
                          {item.judul}
                        </td>
                        <td className="py-3 px-4 text-slate-700 dark:text-slate-300">
                          {item.tujuan_surat || '-'}
                        </td>
                        <td className="py-3 px-4 font-semibold text-indigo-600 dark:text-indigo-400">
                          {item.siswa?.nama_siswa || item.metadata?.nama_siswa || '-'}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-500 whitespace-nowrap">
                          {new Date(item.tanggal_surat).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="py-3 px-4 text-slate-500">{item.created_by}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination Agenda */}
            {agendaPagination && agendaPagination.totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 dark:border-slate-800">
                <span className="text-xs text-slate-500">
                  Halaman {agendaPage} dari {agendaPagination.totalPages} ({agendaPagination.total} arsip)
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setAgendaPage((p) => Math.max(1, p - 1))}
                    disabled={agendaPage <= 1}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    onClick={() => setAgendaPage((p) => Math.min(agendaPagination.totalPages, p + 1))}
                    disabled={agendaPage >= agendaPagination.totalPages}
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

      {/* ─── MODALS ──────────────────────────────────────────────────────── */}
      {keluarSiswaId && (
        <MutasiKeluarModal
          isOpen={Boolean(keluarSiswaId)}
          onClose={() => setKeluarSiswaId(null)}
          siswaId={keluarSiswaId}
          onSuccess={() => {
            refetchSiswa();
            refetchRegister();
          }}
        />
      )}

      {isMasukModalOpen && (
        <MutasiMasukModal
          isOpen={isMasukModalOpen}
          onClose={() => setIsMasukModalOpen(false)}
          onSuccess={() => {
            refetchRegister();
          }}
        />
      )}

      {isRegisterPrintOpen && (
        <BukuRegisterPrintModal
          isOpen={isRegisterPrintOpen}
          onClose={() => setIsRegisterPrintOpen(false)}
          tahunPelajaranId={effectiveTpId}
          tahunPelajaran={filter.activeTpYear?.tahun}
          tipe={registerFilterTipe}
        />
      )}
    </div>
  );
});

MutasiSiswaView.displayName = 'MutasiSiswaView';
