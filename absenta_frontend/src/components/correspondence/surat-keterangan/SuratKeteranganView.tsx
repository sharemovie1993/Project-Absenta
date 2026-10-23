import React, { useState, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  FileText,
  FileCheck,
  ShieldCheck,
  Award,
  History,
  Printer,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Search,
} from 'lucide-react';
import { useAcademicFilter, AcademicFilterToolbar } from '@/components/common/academic-filter';
import { SectionCard, Loader } from '@/components/ui';
import { getSiswaList } from '@/api/academic/siswa.api';
import {
  suratKeteranganApi,
  suratKeteranganQueryKeys,
  type TemplateSuratType,
  type SuratKeteranganHistoryItem,
} from '@/api/correspondence/suratKeterangan.api';
import { SuratKeteranganModal } from './SuratKeteranganModal';

export interface UniversalSuratKeteranganViewProps {
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

type ActiveTab = 'penerbitan' | 'agenda';

export const SuratKeteranganView: React.FC<UniversalSuratKeteranganViewProps> = React.memo(({
  jurusanId,
  jurusanNama,
  kelasId: propKelasId,
  tahunPelajaranId: propTpId,
  hideLayout = false,
  readOnly = false,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('penerbitan');
  const [page, setPage] = useState(1);
  const [historyPage, setHistoryPage] = useState(1);
  const [historySearch, setHistorySearch] = useState('');

  // Modal State
  const [modalSiswaId, setModalSiswaId] = useState<string | null>(null);
  const [modalTemplateType, setModalTemplateType] = useState<TemplateSuratType>('SISWA_AKTIF');

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
  const effectiveStatus = filter.values.statusSiswa;
  const effectiveSearch = filter.debouncedSearchQuery;

  // 1. Query Daftar Siswa untuk Penerbitan Surat
  const { data: siswaRes, isLoading: isSiswaLoading } = useQuery({
    queryKey: ['siswa-surat-keterangan', {
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
    enabled: activeTab === 'penerbitan',
    staleTime: 3 * 60 * 1000,
  });

  // 2. Query Riwayat Surat Keterangan (Buku Agenda Keluar)
  const { data: historyRes, isLoading: isHistoryLoading } = useQuery({
    queryKey: suratKeteranganQueryKeys.history({
      search: historySearch,
      page: historyPage,
    }),
    queryFn: () =>
      suratKeteranganApi.getHistory({
        search: historySearch || undefined,
        page: historyPage,
        limit: 15,
      }),
    enabled: activeTab === 'agenda',
    staleTime: 60 * 1000,
  });

  const siswaList = siswaRes?.data || [];
  const pagination = siswaRes?.pagination;

  const historyList: SuratKeteranganHistoryItem[] = historyRes?.data || [];
  const historyPagination = historyRes?.pagination;

  const handleOpenModal = useCallback((siswaId: string, type: TemplateSuratType) => {
    setModalSiswaId(siswaId);
    setModalTemplateType(type);
  }, []);

  return (
    <div className="space-y-4 w-full min-w-0">
      {/* 1. Header hanya ditampilkan jika bukan tab tersemat dashboard */}
      {!hideLayout && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <FileText className="text-indigo-600 dark:text-indigo-400" size={24} />
              Layanan Surat Keterangan Siswa {jurusanNama ? `• ${jurusanNama}` : ''}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Penerbitan surat resmi siswa aktif, kelakuan baik (SKKB), dan rekomendasi tata usaha
            </p>
          </div>
        </div>
      )}

      {/* 2. Unified Filter Toolbar (Hanya Tampil di Tab Penerbitan) */}
      {activeTab === 'penerbitan' && (
        <AcademicFilterToolbar
          {...filter.toolbarProps}
          hideKelas={Boolean(propKelasId)}
          readOnly={readOnly}
        />
      )}

      {/* 3. Tab Navigasi Mode */}
      <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab('penerbitan')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
            activeTab === 'penerbitan'
              ? 'bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-300 shadow-sm'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <FileCheck size={16} />
          Penerbitan Surat
        </button>
        <button
          onClick={() => setActiveTab('agenda')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
            activeTab === 'agenda'
              ? 'bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-300 shadow-sm'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <History size={16} />
          Buku Agenda Surat Keterangan
        </button>
      </div>

      {/* 4. Konten Tab Penerbitan */}
      {activeTab === 'penerbitan' && (
        <SectionCard fullWidth noPadding className="w-full min-w-0 overflow-hidden">
          {isSiswaLoading ? (
            <div className="flex justify-center items-center py-20">
              <Loader size="lg" />
            </div>
          ) : !siswaList.length ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400 dark:text-slate-600">
              <BookOpen size={48} className="mb-3 opacity-30" />
              <p className="text-sm font-bold">Tidak ada peserta didik ditemukan</p>
              <p className="text-xs mt-1">Sesuaikan filter pencarian di toolbar</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40">
                    <th className="py-3 px-4 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest w-12">No.</th>
                    <th className="py-3 px-4 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">NIS</th>
                    <th className="py-3 px-4 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">Nama Peserta Didik</th>
                    <th className="py-3 px-4 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">Kelas</th>
                    <th className="py-3 px-4 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">Status</th>
                    <th className="py-3 px-4 text-right text-[10px] font-black text-slate-500 uppercase tracking-widest">Opsi Terbitkan Surat</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {siswaList.map((siswa: any, idx: number) => (
                    <tr key={siswa.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="py-3 px-4 text-xs font-mono text-slate-400">
                        {((pagination?.page || 1) - 1) * (pagination?.limit || 15) + idx + 1}
                      </td>
                      <td className="py-3 px-4 text-xs font-mono font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                        {siswa.nis}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white text-[10px] font-black flex items-center justify-center shrink-0">
                            {(siswa.nama_siswa || '?')[0].toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 dark:text-slate-100 leading-tight">{siswa.nama_siswa}</p>
                            <p className="text-[10px] font-mono text-slate-400">{siswa.nisn || '-'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-600 dark:text-slate-400 font-semibold whitespace-nowrap">
                        {siswa.Kelas?.nama_kelas || siswa.kelas?.nama_kelas || '-'}
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300">
                          {siswa.status || 'AKTIF'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          <button
                            type="button"
                            onClick={() => handleOpenModal(siswa.id, 'SISWA_AKTIF')}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 transition-colors"
                            title="Terbitkan Surat Siswa Aktif"
                          >
                            <FileCheck size={13} />
                            Siswa Aktif
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenModal(siswa.id, 'SKKB')}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 hover:bg-amber-100 transition-colors"
                            title="Terbitkan Surat Kelakuan Baik"
                          >
                            <ShieldCheck size={13} />
                            SKKB
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenModal(siswa.id, 'REKOMENDASI')}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/50 hover:bg-purple-100 transition-colors"
                            title="Terbitkan Surat Rekomendasi"
                          >
                            <Award size={13} />
                            Rekomendasi
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {pagination && pagination.totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 dark:border-slate-800">
                  <p className="text-xs text-slate-500">
                    Menampilkan <span className="font-bold text-slate-700 dark:text-slate-300">{siswaList.length}</span> dari{' '}
                    <span className="font-bold text-slate-700 dark:text-slate-300">{pagination.total}</span> data
                  </p>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page <= 1}
                      className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <span className="text-xs font-bold px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-md text-slate-700 dark:text-slate-300">
                      Hal. {page} / {pagination.totalPages}
                    </span>
                    <button
                      onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                      disabled={page >= pagination.totalPages}
                      className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </SectionCard>
      )}

      {/* 5. Konten Tab Buku Agenda Surat Keluar */}
      {activeTab === 'agenda' && (
        <div className="space-y-3">
          {/* Filter Pencarian Agenda */}
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={14} />
            <input
              type="text"
              value={historySearch}
              onChange={(e) => {
                setHistorySearch(e.target.value);
                setHistoryPage(1);
              }}
              placeholder="Cari nomor surat, nama siswa, atau keperluan..."
              className="w-full text-xs pl-8 pr-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
            />
          </div>

          <SectionCard fullWidth noPadding className="w-full min-w-0 overflow-hidden">
            {isHistoryLoading ? (
              <div className="flex justify-center items-center py-20">
                <Loader size="lg" />
              </div>
            ) : !historyList.length ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400 dark:text-slate-600">
                <History size={48} className="mb-3 opacity-30" />
                <p className="text-sm font-bold">Belum ada catatan surat keterangan yang diterbitkan</p>
                <p className="text-xs mt-1">Surat yang diterbitkan akan otomatis masuk ke agenda ini</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40">
                      <th className="py-3 px-4 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest w-12">No.</th>
                      <th className="py-3 px-4 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">Nomor Surat</th>
                      <th className="py-3 px-4 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">Peserta Didik</th>
                      <th className="py-3 px-4 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">Perihal & Keperluan</th>
                      <th className="py-3 px-4 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">Tanggal Terbit</th>
                      <th className="py-3 px-4 text-right text-[10px] font-black text-slate-500 uppercase tracking-widest">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {historyList.map((item, idx) => (
                      <tr key={item.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="py-3 px-4 text-xs font-mono text-slate-400">
                          {((historyPagination?.page || 1) - 1) * (historyPagination?.limit || 15) + idx + 1}
                        </td>
                        <td className="py-3 px-4 text-xs font-mono font-bold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                          {item.nomor_surat}
                        </td>
                        <td className="py-3 px-4">
                          <p className="font-bold text-slate-900 dark:text-slate-100 text-xs">
                            {item.Siswa?.nama_siswa || 'Siswa Umum'}
                          </p>
                          <p className="text-[10px] font-mono text-slate-400">
                            {item.Siswa?.nis} {item.Siswa?.Kelas?.nama_kelas ? `(${item.Siswa.Kelas.nama_kelas})` : ''}
                          </p>
                        </td>
                        <td className="py-3 px-4 max-w-xs truncate">
                          <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">{item.judul}</p>
                          <p className="text-[10px] text-slate-400 truncate">{item.tujuan_surat || '-'}</p>
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-500 whitespace-nowrap font-mono">
                          {new Date(item.tanggal_surat).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {item.siswa_id && (
                            <button
                              type="button"
                              onClick={() => handleOpenModal(item.siswa_id!, 'SISWA_AKTIF')}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 transition-colors"
                            >
                              <Printer size={13} />
                              Cetak Ulang
                            </button>
                          )}
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

      {/* 6. Modal Penerbitan & Cetak Naskah */}
      {modalSiswaId && (
        <SuratKeteranganModal
          isOpen={Boolean(modalSiswaId)}
          onClose={() => setModalSiswaId(null)}
          siswaId={modalSiswaId}
          initialTemplateType={modalTemplateType}
        />
      )}
    </div>
  );
});

SuratKeteranganView.displayName = 'SuratKeteranganView';
