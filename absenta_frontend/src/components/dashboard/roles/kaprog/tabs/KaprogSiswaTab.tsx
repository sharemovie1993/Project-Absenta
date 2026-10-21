import React, { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Users, 
  ChevronLeft, 
  ChevronRight, 
  GraduationCap, 
  User, 
  Phone, 
  Building2, 
  Eye, 
  Layers
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button, Badge, Modal, Loader } from '@/components/ui';
import { getSiswaList } from '@/api/academic/siswa.api';
import { getKelasList } from '@/api/academic/kelas.api';
import { AcademicFilterToolbar } from '@/components/common/academic-filter';
import { resolveProfilePhotoUrl, cn } from '@/lib/utils';
import { KelasKehadiranItem } from '../types';
import { SiswaDetailView } from '@/components/academic/siswa/SiswaDetailView';
import type { Siswa } from '@/types/academic';

interface KaprogSiswaTabProps {
  jurusanId?: string;
  jurusanNama?: string;
  kelasList?: KelasKehadiranItem[];
  tahunPelajaranId?: string;
  semesterId?: string;
}

export const KaprogSiswaTab: React.FC<KaprogSiswaTabProps> = React.memo(({
  jurusanId,
  jurusanNama = 'Kejuruan',
  kelasList = [],
  tahunPelajaranId,
  semesterId
}) => {
  // Filter & Search states
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedKelasId, setSelectedKelasId] = useState('');
  const [selectedTingkat, setSelectedTingkat] = useState('');
  const [selectedGender, setSelectedGender] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('AKTIF');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Student Detail Modal state
  const [selectedSiswaId, setSelectedSiswaId] = useState<string | null>(null);

  // Debounce search input
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Reset pagination when academic year/semester context changes
  React.useEffect(() => {
    setPage(1);
  }, [tahunPelajaranId, semesterId]);

  // Fetch classes for this jurusan dynamically
  const { data: kelasRes, isLoading: isKelasLoading } = useQuery({
    queryKey: ['kaprog-kelas-options', jurusanId, selectedTingkat],
    queryFn: () => getKelasList(1, 100, '', selectedTingkat, jurusanId || ''),
    enabled: Boolean(jurusanId),
    staleTime: 5 * 60 * 1000,
  });

  const availableKelasList = useMemo(() => {
    if (kelasRes?.data && kelasRes.data.length > 0) {
      return kelasRes.data.map((k) => ({
        id: k.id,
        namaKelas: k.nama_kelas,
        tingkat: k.tingkat,
      }));
    }
    // Fallback to kelasList from prop if API is loading or empty
    if (selectedTingkat) {
      return kelasList.filter((k) => String((k as any).tingkat || '') === String(selectedTingkat));
    }
    return kelasList;
  }, [kelasRes, kelasList, selectedTingkat]);

  const handleResetFilters = useCallback(() => {
    setSearchTerm('');
    setDebouncedSearch('');
    setSelectedKelasId('');
    setSelectedTingkat('');
    setSelectedGender('');
    setSelectedStatus('AKTIF');
    setPage(1);
  }, []);

  // Fetch Siswa scoped to Jurusan & Academic Context
  const { data: siswaRes, isLoading, isFetching } = useQuery({
    queryKey: [
      'kaprog-siswa-list',
      jurusanId,
      page,
      pageSize,
      debouncedSearch,
      selectedKelasId,
      selectedTingkat,
      selectedGender,
      selectedStatus,
      tahunPelajaranId,
      semesterId,
    ],
    queryFn: () => getSiswaList(
      page,
      pageSize,
      debouncedSearch,
      selectedKelasId,
      selectedStatus === 'ALL' ? '' : selectedStatus,
      selectedGender,
      '',
      selectedTingkat,
      jurusanId,
      tahunPelajaranId,
      semesterId
    ),
    enabled: Boolean(jurusanId),
    staleTime: 60 * 1000
  });

  const siswaList = useMemo(() => siswaRes?.data || [], [siswaRes]);
  const totalItems = siswaRes?.pagination?.total || 0;
  const totalPages = siswaRes?.pagination?.totalPages || Math.ceil(totalItems / pageSize) || 1;

  // Breakdown statistics (gender counts from loaded list or classes)
  const totalSiswaRombel = useMemo(() => {
    return kelasList.reduce((acc, k) => acc + (k.totalSiswa || 0), 0);
  }, [kelasList]);

  return (
    <div className="space-y-5">
      {/* 1. Header Overview & KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="text-lg font-black text-slate-900 dark:text-slate-100 leading-tight">
              {totalItems || totalSiswaRombel}
            </div>
            <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
              Total Siswa Jurusan
            </div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <User className="w-5 h-5" />
          </div>
          <div>
            <div className="text-lg font-black text-slate-900 dark:text-slate-100 leading-tight">
              {siswaList.filter((s: Siswa) => (s as any).jenis_kelamin === 'L').length}
            </div>
            <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
              Laki-laki (Hal. ini)
            </div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-pink-50 dark:bg-pink-950/60 text-pink-600 dark:text-pink-400 flex items-center justify-center shrink-0">
            <User className="w-5 h-5" />
          </div>
          <div>
            <div className="text-lg font-black text-slate-900 dark:text-slate-100 leading-tight">
              {siswaList.filter((s: Siswa) => (s as any).jenis_kelamin === 'P').length}
            </div>
            <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
              Perempuan (Hal. ini)
            </div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="text-lg font-black text-slate-900 dark:text-slate-100 leading-tight">
              {kelasList.length}
            </div>
            <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
              Rombel Kejuruan
            </div>
          </div>
        </div>
      </div>

      {/* 2. Standardized Central AcademicFilterToolbar Engine */}
      <AcademicFilterToolbar
        variant="card"
        enableSearch={true}
        searchPlaceholder={`Cari nama, NIS, atau NISN siswa ${jurusanNama}...`}
        enableTingkat={true}
        enableKelas={true}
        enableGender={true}
        enableStatusSiswa={true}
        enableTp={false}
        enableSemester={false}
        enableCohort={false}
        values={{
          tahunPelajaranId: tahunPelajaranId || '',
          semesterId: semesterId || '',
          tingkat: selectedTingkat ? parseInt(selectedTingkat, 10) : '',
          kelasId: selectedKelasId,
          mitraId: '',
          mapelId: '',
          bulan: '',
          tanggal: '',
          guruId: '',
          siswaId: '',
          searchQuery: searchTerm,
          gender: selectedGender,
          statusSiswa: selectedStatus,
        }}
        setSearchQuery={(q) => setSearchTerm(q)}
        setTingkat={(t) => {
          setSelectedTingkat(t ? String(t) : '');
          setSelectedKelasId('');
          setPage(1);
        }}
        setKelasId={(id) => {
          setSelectedKelasId(id);
          setPage(1);
        }}
        setGender={(g) => {
          setSelectedGender(g);
          setPage(1);
        }}
        setStatusSiswa={(s) => {
          setSelectedStatus(s);
          setPage(1);
        }}
        tingkatOptions={[
          { value: '10', label: 'Kelas X' },
          { value: '11', label: 'Kelas XI' },
          { value: '12', label: 'Kelas XII' },
          { value: '13', label: 'Kelas XIII (4 Thn)' },
        ]}
        kelasOptions={[
          { value: '', label: 'Semua' },
          ...availableKelasList.map((k) => ({
            value: k.id,
            label: k.namaKelas,
          })),
        ]}
        genderOptions={[
          { value: '', label: 'Semua' },
          { value: 'L', label: 'Laki-laki (L)' },
          { value: 'P', label: 'Perempuan (P)' },
        ]}
        statusSiswaOptions={[
          { value: 'AKTIF', label: 'Siswa Aktif' },
          { value: 'LULUS', label: 'Lulus (Alumni)' },
          { value: 'ALL', label: 'Semua' },
        ]}
        isLoadingKelas={isKelasLoading}
        onReset={
          searchTerm || selectedKelasId || selectedTingkat || selectedGender || selectedStatus !== 'AKTIF'
            ? handleResetFilters
            : undefined
        }
      />

      {/* 3. Main Data Table */}
      <Card noPadding className="rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs bg-white dark:bg-slate-900 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
            <thead className="bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200/80 dark:border-slate-800 text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Siswa</th>
                <th className="py-3 px-4">Kelas / Rombel</th>
                <th className="py-3 px-4">Gender</th>
                <th className="py-3 px-4">NIS / NISN</th>
                <th className="py-3 px-4">Orang Tua / Wali</th>
                <th className="py-3 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Loader size="sm" />
                      <span>Memuat data siswa jurusan {jurusanNama}...</span>
                    </div>
                  </td>
                </tr>
              ) : siswaList.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <GraduationCap className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                      <p className="font-semibold text-slate-700 dark:text-slate-300">
                        Tidak Ada Data Siswa
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {debouncedSearch || selectedKelasId || selectedTingkat || selectedGender
                          ? 'Tidak ada siswa yang sesuai dengan filter pencarian.'
                          : `Belum ada siswa yang terdaftar pada jurusan ${jurusanNama}.`}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                siswaList.map((siswa: Siswa) => {
                  const s = siswa as any;
                  const kelasName = s.Kelas?.nama_kelas || s.nama_kelas || '-';
                  const namaOrtu = s.nama_wali || s.nama_ayah || s.nama_ibu || '-';
                  const noWa = s.no_hp_ortu || s.no_telepon_ortu || s.telepon_wali;

                  return (
                    <tr
                      key={s.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {/* Siswa Identitas */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3 min-w-[200px]">
                          <img
                            src={resolveProfilePhotoUrl(s.foto)}
                            alt={s.nama_siswa}
                            onError={(e) => {
                              e.currentTarget.onerror = null;
                              e.currentTarget.src = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80&auto=format&fit=crop&q=80';
                            }}
                            className="w-9 h-9 rounded-xl object-cover bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 shrink-0"
                          />
                          <div className="min-w-0">
                            <div className="font-bold text-slate-900 dark:text-slate-100 truncate">
                              {s.nama_siswa}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono truncate">
                              {s.email || `${s.nis || s.nisn || 'Siswa Aktif'}`}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Kelas */}
                      <td className="py-3 px-4">
                        <div className="flex flex-col gap-1 items-start">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60">
                            {kelasName}
                          </span>
                          {s.status && s.status !== 'AKTIF' && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border border-amber-200/60 dark:border-amber-800/60">
                              {s.status}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Gender */}
                      <td className="py-3 px-4">
                        <span
                          className={cn(
                            'inline-flex items-center justify-center w-6 h-6 rounded-md text-[11px] font-black',
                            s.jenis_kelamin === 'L'
                              ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                              : 'bg-pink-100 text-pink-700 dark:bg-pink-950 dark:text-pink-300'
                          )}
                        >
                          {s.jenis_kelamin || '-'}
                        </span>
                      </td>

                      {/* NIS / NISN */}
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                        <div>NIS: {s.nis || '-'}</div>
                        <div className="text-[10px] text-slate-400">NISN: {s.nisn || '-'}</div>
                      </td>

                      {/* Orang Tua / Kontak */}
                      <td className="py-3 px-4">
                        <div className="min-w-[140px]">
                          <div className="font-medium text-slate-800 dark:text-slate-200">
                            {namaOrtu}
                          </div>
                          {noWa ? (
                            <a
                              href={`https://wa.me/${String(noWa).replace(/[^0-9]/g, '')}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 hover:underline font-mono mt-0.5"
                            >
                              <Phone className="w-2.5 h-2.5" />
                              <span>{noWa}</span>
                            </a>
                          ) : (
                            <span className="text-[10px] text-slate-400">-</span>
                          )}
                        </div>
                      </td>

                      {/* Aksi */}
                      <td className="py-3 px-4 text-center">
                        <Button
                          type="button"
                          size="xs"
                          variant="outline"
                          onClick={() => setSelectedSiswaId(s.id)}
                          className="rounded-xl h-7 px-2.5 text-xs font-semibold gap-1.5"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Biodata</span>
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* 4. Pagination Bar */}
        {totalItems > 0 && (
          <div className="p-3.5 bg-slate-50/60 dark:bg-slate-800/40 border-t border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <span className="text-slate-500 dark:text-slate-400 font-medium">
              Menampilkan {Math.min((page - 1) * pageSize + 1, totalItems)} - {Math.min(page * pageSize, totalItems)} dari {totalItems} siswa
            </span>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="xs"
                variant="outline"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded-xl h-7 px-2"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Prev</span>
              </Button>

              <span className="font-mono text-xs font-bold text-slate-700 dark:text-slate-300 px-2">
                Hal {page} / {totalPages}
              </span>

              <Button
                type="button"
                size="xs"
                variant="outline"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="rounded-xl h-7 px-2"
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* 5. Modal Detail Biodata Siswa */}
      {selectedSiswaId && (
        <Modal
          isOpen={!!selectedSiswaId}
          onClose={() => setSelectedSiswaId(null)}
          title="Profil & Biodata Siswa"
          size="xl"
        >
          <div className="py-2">
            <SiswaDetailView
              siswaId={selectedSiswaId}
              isModal={true}
              onClose={() => setSelectedSiswaId(null)}
            />
          </div>
        </Modal>
      )}
    </div>
  );
});

KaprogSiswaTab.displayName = 'KaprogSiswaTab';
