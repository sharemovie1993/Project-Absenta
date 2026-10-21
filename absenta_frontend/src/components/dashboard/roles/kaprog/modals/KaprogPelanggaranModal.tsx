import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { 
  ShieldAlert, 
  Search, 
  CheckCircle2, 
  AlertCircle, 
  ExternalLink, 
  X,
  Filter,
  User,
  GraduationCap
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { kesiswaanApi } from '@/api/kesiswaan.api';
import { useAcademicContext } from '@/hooks/useAcademicContext';
import { cn } from '@/lib/utils';
import { PelanggaranSiswaItem } from '../types';

export interface KaprogPelanggaranModalProps {
  isOpen: boolean;
  onClose: () => void;
  jurusanId?: string;
  jurusanNama?: string;
  initialPelanggaranList?: PelanggaranSiswaItem[];
  tahunPelajaranId?: string;
  semesterId?: string;
}

export const KaprogPelanggaranModal: React.FC<KaprogPelanggaranModalProps> = ({
  isOpen,
  onClose,
  jurusanId,
  jurusanNama = 'Kejuruan',
  initialPelanggaranList = [],
  tahunPelajaranId: propTpId,
  semesterId: propSemId,
}) => {
  const navigate = useNavigate();
  const academic = useAcademicContext();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');

  const activeTp = propTpId || academic.selectedTahunPelajaran;
  const activeSem = propSemId || academic.selectedSemester;

  // Query data pelanggaran riil tersaring scope jurusan dari API Kesiswaan
  const { data: apiResponse, isLoading } = useQuery({
    queryKey: [
      'kaprog-modal-pelanggaran',
      jurusanId,
      activeTp,
      activeSem,
      selectedStatus,
    ],
    queryFn: () =>
      kesiswaanApi.getPelanggaran({
        page: 1,
        limit: 50,
        status: selectedStatus === 'ALL' ? undefined : selectedStatus,
        jurusan_id: jurusanId,
        tahun_pelajaran_id: activeTp || undefined,
        semester_id: activeSem || undefined,
        elevated_context: 'true',
      }),
    enabled: isOpen,
    staleTime: 60 * 1000,
  });

  // Gabungkan / format data dari API atau fallback ke list kaprog stats (yang memuat tatib & konseling BK)
  const displayList = useMemo(() => {
    const rawApiList = apiResponse?.data?.list || apiResponse?.list;
    if (Array.isArray(rawApiList) && rawApiList.length > 0) {
      return rawApiList.map((item: any) => ({
        id: item.id,
        nama: item.Siswa?.nama_siswa || item.nama_siswa || 'Siswa',
        nis: item.Siswa?.nis || item.nis || '',
        kelas: item.Kelas?.nama_kelas || item.Siswa?.Kelas?.nama_kelas || '-',
        tanggal: typeof item.tanggal === 'string' ? item.tanggal.split('T')[0] : item.tanggal || '',
        jenisPelanggaran: item.jenis_pelanggaran || item.keterangan || '-',
        poin: Number(item.poin || 0),
        status: item.status || 'BARU',
        keterangan: item.keterangan || '',
        sumber: 'Tatib' as const,
      }));
    }

    // Fallback: gunakan data riil dari kaprog stats yang sudah terfilter scope jurusan
    return initialPelanggaranList || [];
  }, [apiResponse, initialPelanggaranList]);

  // Filter lokal berdasarkan search term & status filter
  const filteredList = useMemo(() => {
    return displayList.filter((item) => {
      const matchSearch =
        !searchTerm.trim() ||
        item.nama?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.nis?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.kelas?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.jenisPelanggaran?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchStatus =
        selectedStatus === 'ALL' ||
        item.status?.toUpperCase() === selectedStatus.toUpperCase();

      return matchSearch && matchStatus;
    });
  }, [displayList, searchTerm, selectedStatus]);

  // Statistik Ringkas
  const stats = useMemo(() => {
    const total = displayList.length;
    const baru = displayList.filter((p) => p.status?.toUpperCase() === 'BARU').length;
    const totalPoin = displayList.reduce((acc, curr) => acc + (curr.poin || 0), 0);
    return { total, baru, totalPoin };
  }, [displayList]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="4xl"
      title={
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Kedisiplinan & Pelanggaran Siswa
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/40">
                {jurusanNama}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Monitoring seluruh catatan pelanggaran tata tertib dan konseling siswa jurusan.
            </p>
          </div>
        </div>
      }
    >
      <div className="p-5 space-y-4">
        {/* Ringkasan Metrik Cepat */}
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-800">
            <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
              Total Catatan
            </div>
            <div className="text-xl font-bold text-slate-800 dark:text-slate-100">
              {stats.total}
            </div>
          </div>
          <div className="p-3 rounded-xl bg-rose-50/70 dark:bg-rose-950/40 border border-rose-200/60 dark:border-rose-900/40">
            <div className="text-[11px] font-medium text-rose-600 dark:text-rose-400">
              Perlu Tindak Lanjut (Baru)
            </div>
            <div className="text-xl font-bold text-rose-700 dark:text-rose-300">
              {stats.baru}
            </div>
          </div>
          <div className="p-3 rounded-xl bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-900/40">
            <div className="text-[11px] font-medium text-amber-600 dark:text-amber-400">
              Akumulasi Poin Jurusan
            </div>
            <div className="text-xl font-bold text-amber-700 dark:text-amber-300">
              {stats.totalPoin}
            </div>
          </div>
        </div>

        {/* Toolbar: Search & Filter Status */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari nama siswa, NIS, kelas, atau jenis pelanggaran..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {['ALL', 'BARU', 'PROSES', 'SELESAI'].map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setSelectedStatus(st)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer',
                  selectedStatus === st
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                )}
              >
                {st === 'ALL' ? 'Semua Status' : st}
              </button>
            ))}
          </div>
        </div>

        {/* Tabel Data Pelanggaran */}
        <div className="overflow-x-auto rounded-xl border border-slate-200/80 dark:border-slate-800 max-h-[50vh] overflow-y-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200/80 dark:border-slate-800 sticky top-0 z-10">
              <tr>
                <th className="py-2.5 px-4">Siswa</th>
                <th className="py-2.5 px-4 whitespace-nowrap">Kelas</th>
                <th className="py-2.5 px-4 whitespace-nowrap">Tanggal</th>
                <th className="py-2.5 px-4">Jenis Pelanggaran</th>
                <th className="py-2.5 px-4 text-center whitespace-nowrap">Poin</th>
                <th className="py-2.5 px-4 text-center whitespace-nowrap">Status</th>
                <th className="py-2.5 px-4 text-right whitespace-nowrap">Keterangan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400 text-xs">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                      <span className="font-medium text-slate-600 dark:text-slate-300">
                        Tidak ada data pelanggaran yang cocok dengan kriteria pencarian.
                      </span>
                      <span className="text-[11px] text-slate-400">
                        Kedisiplinan siswa pada jurusan ini terjaga dengan baik.
                      </span>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredList.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-800 dark:text-slate-100 whitespace-nowrap">
                        {p.nama}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                        {p.nis || '-'}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 font-mono text-[11px]">
                        {p.kelas}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500 dark:text-slate-400 font-mono whitespace-nowrap">
                      {p.tanggal}
                    </td>
                    <td className="py-3 px-4 text-slate-700 dark:text-slate-200 max-w-[260px]">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        {p.sumber === 'BK' ? (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 shrink-0">
                            Konseling BK
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 shrink-0">
                            Tatib
                          </span>
                        )}
                        <span className="font-medium truncate" title={p.jenisPelanggaran}>
                          {p.jenisPelanggaran}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <span
                        className={cn(
                          'px-2 py-0.5 rounded-full text-[11px] font-bold font-mono',
                          (p.poin || 0) >= 15
                            ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900'
                            : 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900'
                        )}
                      >
                        +{p.poin || 0} Poin
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <span
                        className={cn(
                          'px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider',
                          p.status === 'BARU'
                            ? 'bg-rose-50 text-rose-600 border border-rose-200 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-400'
                            : p.status === 'PROSES'
                            ? 'bg-blue-50 text-blue-600 border border-blue-200 dark:bg-blue-950/40 dark:border-blue-800 dark:text-blue-400'
                            : 'bg-emerald-50 text-emerald-600 border border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-400'
                        )}
                      >
                        {p.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right text-slate-600 dark:text-slate-300 truncate max-w-[180px]">
                      {p.keterangan || '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              onClose();
              navigate('/kesiswaan/pelanggaran');
            }}
            className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 gap-1.5"
          >
            <span>Buka Modul Kesiswaan Penuh</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            className="text-xs font-semibold rounded-xl"
          >
            Tutup
          </Button>
        </div>
      </div>
    </Modal>
  );
};
