import React, { useState, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { getSiswaList, type Siswa, siswaQueryKeys } from '../../../api/academic/siswa.api';
import { getKelasForDropdown, type DropdownOption } from '../../../api/dropdown.api';
import { Card } from '../../../components/ui/Card';
import { Table } from '../../../components/ui/Table';
import type { Column } from '../../../components/ui/Table';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { SearchableSelect } from '../../../components/ui/SearchableSelect';
import { Loader } from '../../../components/ui/Loader';
import { Badge } from '../../../components/ui/Badge';
import { Search, Info, Plus } from 'lucide-react';
import { useDebounce } from '../../../hooks/useDebounce';
import { formatDate } from '../../../utils/layoutUtils';
import { useIsMobile } from '../../../hooks/useIsMobile';
import { MobileAcademicList } from '../../../components/academic/shared/MobileAcademicList';

const siswaKasusFilterSchema = z.object({
  search: z.string().optional(),
  selectedKelas: z.string().optional(),
  selectedStatus: z.string().optional()
});

interface SiswaKasusSectionProps {
  onViewSiswaDetail?: (siswaId: string) => void;
}

export const SiswaKasusSection: React.FC<SiswaKasusSectionProps> = React.memo(({ onViewSiswaDetail }) => {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 500);

  const [selectedKelas, setSelectedKelas] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('AKTIF');

  // Pagination
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const [sortBy, setSortBy] = useState<string | undefined>(undefined);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const handleSort = useCallback((key: string, order: 'asc' | 'desc') => {
    setSortBy(key);
    setSortOrder(order);
  }, []);

  // ── useQuery: Dropdown Kelas ──────────────────────────────────────────────
  const { data: kelasOptionsData } = useQuery({
    queryKey: ['dropdown-kelas'],
    queryFn: getKelasForDropdown,
    staleTime: 10 * 60 * 1000,
  });
  const kelasOptions = kelasOptionsData || [];

  // ── useQuery: Siswa Roster List ──────────────────────────────────────────
  const { data: siswaRes, isLoading: loading } = useQuery({
    queryKey: siswaQueryKeys.list({ page, limit, search: debouncedSearch, kelas_id: selectedKelas, status: selectedStatus }),
    queryFn: () => {
      siswaKasusFilterSchema.safeParse({ search: debouncedSearch, selectedKelas, selectedStatus });
      return getSiswaList(page, limit, debouncedSearch, selectedKelas, selectedStatus);
    },
    staleTime: 5 * 60 * 1000,
  });

  const siswa = useMemo(() => siswaRes?.data || [], [siswaRes]);
  const totalPages = siswaRes?.pagination?.totalPages || 1;

  const columns: Column[] = useMemo(() => [
    {
      key: 'nama',
      label: 'Profil Siswa',
      sortable: true,
      render: (_: unknown, item: unknown) => {
        const row = item as Siswa;
        return (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 flex items-center justify-center font-black text-xs text-slate-400">
              {row.nama_siswa?.charAt(0)}
            </div>
            <div>
              <div className="font-bold text-slate-800 dark:text-white text-xs">{row.nama_siswa}</div>
              <div className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{row.nis}</div>
            </div>
          </div>
        );
      }
    },
    {
      key: 'kelas',
      label: 'Kelas',
      render: (_: unknown, item: unknown) => {
        const row = item as Siswa;
        return (
          <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
            {row.Kelas?.nama_kelas || '-'}
          </span>
        );
      }
    },
    {
      key: 'poin_pelanggaran',
      label: 'Pelanggaran',
      render: (_: unknown, item: unknown) => {
        const row = item as Siswa;
        return (
          <span className="text-xs font-black text-rose-500">
            +{row.poin_pelanggaran || 0} Poin
          </span>
        );
      }
    },
    {
      key: 'poin_prestasi',
      label: 'Prestasi',
      render: (_: unknown, item: unknown) => {
        const row = item as Siswa;
        return (
          <span className="text-xs font-black text-emerald-500">
            -{row.poin_prestasi || 0} Poin
          </span>
        );
      }
    },
    {
      key: 'net_poin',
      label: 'Net Poin',
      render: (_: unknown, item: unknown) => {
        const row = item as Siswa;
        const net = (row.poin_pelanggaran || 0) - (row.poin_prestasi || 0);
        return (
          <Badge variant={net > 75 ? "error" : net > 30 ? "warning" : "success"} className="text-[10px] font-black uppercase">
            {net} Poin
          </Badge>
        );
      }
    },
    {
      key: 'actions',
      label: 'Tindakan',
      render: (_: unknown, item: unknown) => {
        const row = item as Siswa;
        return (
          <div className="flex gap-2 justify-end">
            <Button
              variant="toolbarOutline"
              size="toolbar"
              onClick={() => onViewSiswaDetail?.(row.id)}
              className="text-[10px] h-8 font-bold"
            >
              <Info className="w-3.5 h-3.5 mr-1" />
              Detail & Linimasa
            </Button>
          </div>
        );
      }
    }
  ], [onViewSiswaDetail]);

  const isMobile = useIsMobile();

  const renderMobileCard = (row: Siswa) => {
    const net = (row.poin_pelanggaran || 0) - (row.poin_prestasi || 0);

    return (
      <div
        key={row.id}
        className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 flex items-center justify-center font-black text-xs text-slate-500 shrink-0">
              {row.nama_siswa?.charAt(0)}
            </div>
            <div className="space-y-0.5 min-w-0">
              <h4 className="font-extrabold text-xs text-slate-900 dark:text-white uppercase tracking-tight truncate">
                {row.nama_siswa}
              </h4>
              <p className="text-[10px] font-bold text-slate-400 font-mono">
                NIS: {row.nis || '-'} • {row.Kelas?.nama_kelas || '-'}
              </p>
            </div>
          </div>
          <Badge variant={net > 75 ? "error" : net > 30 ? "warning" : "success"} className="text-[10px] font-black uppercase shrink-0">
            {net} Poin
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-2 p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400">Pelanggaran:</span>
            <span className="font-black text-rose-500 font-mono">+{row.poin_pelanggaran || 0}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400">Prestasi:</span>
            <span className="font-black text-emerald-500 font-mono">-{row.poin_prestasi || 0}</span>
          </div>
        </div>

        <div className="flex items-center justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
          <Button
            variant="toolbarOutline"
            size="sm"
            onClick={() => onViewSiswaDetail?.(row.id)}
            className="text-[10px] h-8 font-bold w-full sm:w-auto"
          >
            <Info className="w-3.5 h-3.5 mr-1" />
            Detail & Linimasa
          </Button>
        </div>
      </div>
    );
  };

  return (
    <Card className="border border-slate-200/50 dark:border-slate-800/50 bg-white/50 dark:bg-slate-900/50 p-6 rounded-2xl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white">Roster Kasus & Bimbingan Siswa</h3>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Daftar siswa beserta rekapitulasi kedisiplinan dan prestasi</p>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="relative md:col-span-2">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            aria-label="Cari nama atau nomor induk siswa"
            placeholder="Cari nama atau nomor induk siswa..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10 text-xs border-slate-200/60 dark:border-slate-800 rounded-xl"
          />
        </div>
        <div>
          <SearchableSelect
            options={[{ value: '', label: 'Semua Kelas' }, ...kelasOptions]}
            value={selectedKelas}
            onValueChange={setSelectedKelas}
            placeholder="Pilih Kelas"
            className="h-10 text-xs border-slate-200/60 dark:border-slate-800 rounded-xl"
          />
        </div>
        <div>
          <SearchableSelect
            options={[
              { value: 'AKTIF', label: 'Aktif' },
              { value: 'KELUAR', label: 'Keluar' },
              { value: 'MUTASI', label: 'Mutasi' },
              { value: 'DO', label: 'Drop Out' }
            ]}
            value={selectedStatus}
            onValueChange={setSelectedStatus}
            placeholder="Filter Status"
            className="h-10 text-xs border-slate-200/60 dark:border-slate-800 rounded-xl"
          />
        </div>
      </div>

      {/* Roster Table / Mobile Cards */}
      {loading && siswa.length === 0 ? (
        <div className="py-20 flex flex-col items-center justify-center">
          <Loader className="mb-4" />
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest animate-pulse">Menghubungkan Database Siswa...</p>
        </div>
      ) : isMobile ? (
        <div className="space-y-4">
          <MobileAcademicList
            title="Daftar Siswa"
            data={siswa}
            loading={loading}
            totalItems={totalPages * limit}
            emptyMessage="Tidak ada data siswa yang sesuai filter."
            pagination={{
              currentPage: page,
              itemsPerPage: limit,
              totalItems: totalPages * limit,
              totalPages,
              onPageChange: setPage,
              onLimitChange: (limitVal) => {
                setLimit(limitVal);
                setPage(1);
              }
            }}
            renderCard={renderMobileCard}
          />
        </div>
      ) : (
        <div className="space-y-4">
          <Table
            columns={columns}
            data={siswa}
            sortBy={sortBy}
            sortOrder={sortOrder}
            onSort={handleSort}
            pagination={{
              currentPage: page,
              itemsPerPage: limit,
              totalItems: totalPages * limit,
              totalPages,
              onPageChange: setPage,
              onLimitChange: (limitVal) => {
                setLimit(limitVal);
                setPage(1);
              }
            }}
          />
        </div>
      )}
    </Card>
  );
});


