import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  FileSpreadsheet,
  Send,
  Archive,
  Printer,
  Search,
  CheckCircle2,
  AlertCircle,
  Award,
  ChevronLeft,
  ChevronRight,
  FileText,
  Calendar,
} from 'lucide-react';
import { useAcademicFilter, AcademicFilterToolbar } from '@/components/common/academic-filter';
import { SectionCard, Loader } from '@/components/ui';
import {
  dknApi,
  dknQueryKeys,
  type DknMatriksData,
  type DknArsipItem,
} from '@/api/correspondence/dkn.api';
import { DknPrintModal } from './DknPrintModal';
import { SuratPengantarModal } from './SuratPengantarModal';
import { Button } from '@/components/ui/button';

export interface UniversalDknViewProps {
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

type ActiveTab = 'matriks' | 'pengantar' | 'arsip';

export const DknView: React.FC<UniversalDknViewProps> = React.memo(({
  jurusanId,
  jurusanNama,
  kelasId: propKelasId,
  tahunPelajaranId: propTpId,
  hideLayout = false,
  readOnly = false,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('matriks');
  const [arsipPage, setArsipPage] = useState(1);
  const [arsipSearch, setArsipSearch] = useState('');

  // Modals state
  const [isDknPrintOpen, setIsDknPrintOpen] = useState(false);
  const [isPengantarModalOpen, setIsPengantarModalOpen] = useState(false);

  // Unified Academic Filter
  const filter = useAcademicFilter({
    enableTp: true,
    enableKelas: !propKelasId,
    enableSearch: true,
    allowAllKelas: true,
    jurusanId,
  });

  const effectiveTpId = propTpId || filter.values.tahunPelajaranId;
  const effectiveKelasId = propKelasId || filter.values.kelasId;
  const effectiveSearch = filter.debouncedSearchQuery;

  // 1. Query Matriks DKN (Tab 1 & Tab 2 preview)
  const {
    data: matriksRes,
    isLoading: isMatriksLoading,
    refetch: refetchMatriks,
  } = useQuery({
    queryKey: dknQueryKeys.matriks({
      tpId: effectiveTpId,
      kelasId: effectiveKelasId,
      jurusanId,
      search: effectiveSearch,
    }),
    queryFn: () =>
      dknApi.getMatriks({
        tahun_pelajaran_id: effectiveTpId,
        kelas_id: effectiveKelasId,
        jurusan_id: jurusanId,
        search: effectiveSearch,
      }),
  });

  const matriksData: DknMatriksData | undefined = matriksRes?.data;

  // 2. Query Arsip DKN (Tab 3)
  const {
    data: arsipRes,
    isLoading: isArsipLoading,
  } = useQuery({
    queryKey: dknQueryKeys.arsip({ page: arsipPage, search: arsipSearch }),
    queryFn: () =>
      dknApi.getArsip({
        page: arsipPage,
        limit: 15,
        search: arsipSearch || undefined,
      }),
    enabled: activeTab === 'arsip',
  });

  const arsipList: DknArsipItem[] = arsipRes?.data || [];
  const arsipPagination = arsipRes?.pagination || { page: 1, limit: 15, total: 0, totalPages: 1 };

  return (
    <div className="space-y-4">
      {/* HEADER TABS & ACTIONS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-2 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('matriks')}
            className={`px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-lg flex items-center gap-2 transition-all whitespace-nowrap ${
              activeTab === 'matriks'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            Matriks Nilai DKN
            {matriksData?.rekapitulasi?.total_siswa !== undefined && (
              <span className={`px-1.5 py-0.2 text-[10px] rounded-full font-bold ${
                activeTab === 'matriks' ? 'bg-blue-700 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
              }`}>
                {matriksData.rekapitulasi.total_siswa}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('pengantar')}
            className={`px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-lg flex items-center gap-2 transition-all whitespace-nowrap ${
              activeTab === 'pengantar'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Send className="w-4 h-4" />
            Surat Pengantar Dinas
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('arsip')}
            className={`px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-lg flex items-center gap-2 transition-all whitespace-nowrap ${
              activeTab === 'arsip'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Archive className="w-4 h-4" />
            Buku Arsip DKN Dinas
          </button>
        </div>

        {/* TOP ACTION BUTTONS */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          {activeTab === 'matriks' && (
            <Button
              onClick={() => setIsDknPrintOpen(true)}
              className="bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:bg-slate-800 text-xs sm:text-sm font-semibold flex items-center gap-1.5"
            >
              <Printer className="w-4 h-4" />
              Cetak Lembar DKN
            </Button>
          )}

          {activeTab === 'pengantar' && (
            <Button
              onClick={() => setIsPengantarModalOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-semibold flex items-center gap-1.5"
            >
              <Send className="w-4 h-4" />
              Terbitkan Surat Pengantar
            </Button>
          )}
        </div>
      </div>

      {/* ─── TAB 1: MATRIKS NILAI DKN ────────────────────────────────────── */}
      {activeTab === 'matriks' && (
        <div className="space-y-4">
          <SectionCard>
            <AcademicFilterToolbar {...filter.toolbarProps} />
          </SectionCard>

          {/* SUMMARY CARDS */}
          {matriksData?.rekapitulasi && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Total Peserta DKN</span>
                <p className="text-xl font-black text-slate-800 dark:text-slate-100 mt-1">
                  {matriksData.rekapitulasi.total_siswa} Siswa
                </p>
              </div>

              <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Lulus</span>
                <p className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                  {matriksData.rekapitulasi.total_lulus} Siswa
                </p>
              </div>

              <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <span className="text-xs text-rose-600 dark:text-rose-400 font-medium">Belum Lulus</span>
                <p className="text-xl font-black text-rose-600 dark:text-rose-400 mt-1">
                  {matriksData.rekapitulasi.total_tidak_lulus} Siswa
                </p>
              </div>

              <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">Rata-Rata Angkatan</span>
                <p className="text-xl font-black text-amber-600 dark:text-amber-400 mt-1">
                  {matriksData.rekapitulasi.rata_rata_angkatan}
                </p>
              </div>
            </div>
          )}

          {/* MATRIKS TABLE */}
          <SectionCard title="Matriks Nilai Peserta Didik" description="Kompilasi nilai rapor akhir per kelompok mapel dan nilai uji kompetensi keahlian">
            {isMatriksLoading ? (
              <div className="py-20 flex justify-center">
                <Loader />
              </div>
            ) : !matriksData || matriksData.rows.length === 0 ? (
              <div className="py-16 text-center text-slate-500">
                Tidak ada data peserta didik pada filter yang dipilih.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 uppercase tracking-wider font-semibold">
                      <th className="py-2.5 px-3 text-center w-10">No</th>
                      <th className="py-2.5 px-3">NIS / NISN</th>
                      <th className="py-2.5 px-3 min-w-[180px]">Nama Siswa</th>
                      <th className="py-2.5 px-2 text-center">L/P</th>
                      <th className="py-2.5 px-3">Kelas / Rombel</th>
                      <th className="py-2.5 px-3 text-center bg-blue-50 dark:bg-blue-950/30">UKK</th>
                      <th className="py-2.5 px-3 text-center bg-amber-50 dark:bg-amber-950/30">Rata-Rata</th>
                      <th className="py-2.5 px-2 text-center">Rank</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {matriksData.rows.map((row) => (
                      <tr key={row.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="py-2.5 px-3 text-center font-medium text-slate-500">{row.nomor_urut}</td>
                        <td className="py-2.5 px-3">
                          <div className="font-mono font-medium text-slate-800 dark:text-slate-200">{row.nis}</div>
                          <div className="font-mono text-[10px] text-slate-400">{row.nisn}</div>
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="font-semibold text-slate-900 dark:text-white">{row.nama_siswa}</div>
                          <div className="text-[10px] text-slate-400">{row.jurusan}</div>
                        </td>
                        <td className="py-2.5 px-2 text-center text-slate-600 dark:text-slate-400 font-medium">
                          {row.gender}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">{row.kelas}</td>
                        <td className="py-2.5 px-3 text-center bg-blue-50/50 dark:bg-blue-950/20">
                          {row.nilai_ukk !== null ? (
                            <div className="font-bold text-blue-600 dark:text-blue-400">
                              {row.nilai_ukk}{' '}
                              <span className="text-[10px] font-normal text-slate-500">({row.predikat_ukk || '-'})</span>
                            </div>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center font-bold text-amber-700 dark:text-amber-400 bg-amber-50/50 dark:bg-amber-950/20">
                          {row.rata_rata_nilai}
                        </td>
                        <td className="py-2.5 px-2 text-center font-semibold text-slate-700 dark:text-slate-300">
                          #{row.rank}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              row.status_kelulusan === 'LULUS'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                            }`}
                          >
                            {row.status_kelulusan}
                          </span>
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

      {/* ─── TAB 2: SURAT PENGANTAR DINAS ─────────────────────────────────── */}
      {activeTab === 'pengantar' && (
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white p-6 rounded-2xl shadow-md">
            <div className="max-w-2xl space-y-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-700/80 text-blue-100 border border-blue-500/30">
                <Send className="w-3.5 h-3.5" /> SOP Kelulusan Dinas Pendidikan
              </span>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight">
                Surat Pengantar Penyerahan Berkas Kelulusan & DKN
              </h2>
              <p className="text-sm text-blue-150 leading-relaxed text-blue-100/90">
                Dokumen pengantar resmi dari Kepala Sekolah kepada Kepala Cabang Dinas Pendidikan Wilayah (KCD) sebagai dasar legalitas penyerahan DKN, Berita Acara Rapat Kelulusan, dan penerbitan Blangko Ijazah Nasional.
              </p>
              <div className="pt-2">
                <Button
                  onClick={() => setIsPengantarModalOpen(true)}
                  className="bg-white text-blue-900 hover:bg-blue-50 font-bold text-sm shadow-sm"
                >
                  <Send className="w-4 h-4 mr-2" />
                  Buka Formulir & Terbitkan Surat Pengantar
                </Button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
              <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-sm">
                1
              </div>
              <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100">Berkas DKN Asli</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Daftar Kolektif Nilai rangkap 2 yang telah ditandatangani oleh Waka Kurikulum, Pengawas Pembina, dan Kepala Sekolah.
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-sm">
                2
              </div>
              <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100">Berita Acara Kelulusan</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Risalah hasil rapat pleno dewan pendidik beserta daftar presensi resmi rapat kelulusan peserta didik.
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-sm">
                3
              </div>
              <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100">Pengarsipan Digital</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Surat yang diterbitkan secara otomatis dicatat dalam Agenda Surat Keluar dan dapat diunduh kembali kapan saja.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 3: BUKU ARSIP DKN DINAS ──────────────────────────────────── */}
      {activeTab === 'arsip' && (
        <div className="space-y-4">
          {/* SEARCH BAR ARSIP */}
          <div className="flex items-center gap-3 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={arsipSearch}
                onChange={(e) => {
                  setArsipSearch(e.target.value);
                  setArsipPage(1);
                }}
                placeholder="Cari berdasarkan nomor surat, perihal, atau tujuan cabang dinas..."
                className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <SectionCard title="Buku Arsip Permanen Penyerahan DKN" description="Dokumen statis agenda surat keluar resmi untuk verifikasi ijazah dan audit dinas">
            {isArsipLoading ? (
              <div className="py-20 flex justify-center">
                <Loader />
              </div>
            ) : arsipList.length === 0 ? (
              <div className="py-16 text-center text-slate-500">
                Belum ada arsip surat pengantar DKN yang diterbitkan.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 uppercase tracking-wider font-semibold">
                      <th className="py-2.5 px-3">Nomor Surat Dinas</th>
                      <th className="py-2.5 px-3">Perihal / Judul</th>
                      <th className="py-2.5 px-3">Tujuan Instansi</th>
                      <th className="py-2.5 px-3 text-center">Tahun Ajaran</th>
                      <th className="py-2.5 px-3 text-center">Total Siswa</th>
                      <th className="py-2.5 px-3 text-center">Tanggal Diterbitkan</th>
                      <th className="py-2.5 px-3 text-center">Petugas TU</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {arsipList.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-3 font-mono font-bold text-blue-600 dark:text-blue-400">
                          {item.nomor_surat}
                        </td>
                        <td className="py-3 px-3 max-w-[240px]">
                          <div className="font-semibold text-slate-800 dark:text-slate-200 truncate" title={item.judul}>
                            {item.judul}
                          </div>
                          <div className="text-[10px] text-slate-400">{item.program_keahlian}</div>
                        </td>
                        <td className="py-3 px-3 text-slate-600 dark:text-slate-300 font-medium">
                          {item.tujuan_surat}
                        </td>
                        <td className="py-3 px-3 text-center font-semibold text-slate-700 dark:text-slate-300">
                          {item.tahun_pelajaran}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className="font-bold text-slate-900 dark:text-white">{item.total_siswa}</span>{' '}
                          <span className="text-[10px] text-emerald-600">({item.total_lulus} Lulus)</span>
                        </td>
                        <td className="py-3 px-3 text-center text-slate-500">
                          {new Date(item.tanggal_surat).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </td>
                        <td className="py-3 px-3 text-center text-slate-600 dark:text-slate-400">
                          {item.created_by_name}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                            {item.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* ARSIP PAGINATION */}
            {arsipPagination.totalPages > 1 && (
              <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800 text-xs">
                <span className="text-slate-500">
                  Halaman {arsipPagination.page} dari {arsipPagination.totalPages} ({arsipPagination.total} berkas)
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={arsipPage <= 1}
                    onClick={() => setArsipPage((p) => p - 1)}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={arsipPage >= arsipPagination.totalPages}
                    onClick={() => setArsipPage((p) => p + 1)}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </SectionCard>
        </div>
      )}

      {/* ─── MODALS ──────────────────────────────────────────────────────── */}
      {isDknPrintOpen && (
        <DknPrintModal
          isOpen={isDknPrintOpen}
          onClose={() => setIsDknPrintOpen(false)}
          data={matriksData}
          isLoading={isMatriksLoading}
          tahunPelajaran={filter.selectedTpNama}
        />
      )}

      {isPengantarModalOpen && (
        <SuratPengantarModal
          isOpen={isPengantarModalOpen}
          onClose={() => setIsPengantarModalOpen(false)}
          tahunPelajaranId={effectiveTpId || ''}
          jurusanId={jurusanId}
          kelasId={effectiveKelasId}
          tahunPelajaran={filter.selectedTpNama}
        />
      )}
    </div>
  );
});

DknView.displayName = 'DknView';
