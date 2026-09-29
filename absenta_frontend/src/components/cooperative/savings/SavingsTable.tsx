import React, { useMemo } from 'react';
import Table from '../../ui/Table';
import type { Column } from '../../ui/Table';
import Button from '../../ui/Button';
import Input from '../../ui/Input';
import { SearchableSelect } from '../../ui/SearchableSelect';
import { Search, Printer, BookOpen, FileSpreadsheet, Eye, ChevronRight } from 'lucide-react';
import type { Saving, SavingCategory } from './types';
import { useIsMobile } from '../../../hooks/useIsMobile';
import { MobileAcademicList } from '../../academic/shared/MobileAcademicList';

interface StudentData {
  id: string;
  nama_siswa?: string;
  nama_guru?: string;
  nis?: string;
  nip?: string;
}

interface SavingsTableProps {
  savings: Saving[];
  loading: boolean;
  isStudent: boolean;
  categories: SavingCategory[];
  search: string;
  setSearch: (s: string) => void;
  typeFilter: string;
  setTypeFilter: (t: string) => void;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  onSort: (key: string, order: 'asc' | 'desc') => void;
  page: number;
  setPage: (p: number) => void;
  limit: number;
  setLimit: (l: number) => void;
  handleShowTransactions: (row: Saving) => void;
  handleExportSingleSavingPdf: (row: Saving) => void;
  handleExportAllSavingsPdf: (row: Saving) => void;
  handleSelectStudent: (student: StudentData, memberNo?: string) => void;
  onOpenExportModal: () => void;
}

export const SavingsTable = React.memo<SavingsTableProps>(({
  savings,
  loading,
  isStudent,
  categories,
  search,
  setSearch,
  typeFilter,
  setTypeFilter,
  sortBy,
  sortOrder,
  onSort,
  page,
  setPage,
  limit,
  setLimit,
  handleShowTransactions,
  handleExportSingleSavingPdf,
  handleExportAllSavingsPdf,
  handleSelectStudent,
  onOpenExportModal
}) => {
  const isMobile = useIsMobile();

  const finalColumns: Column[] = useMemo(() => {
    if (isStudent) {
      return [
        {
          key: 'type',
          label: 'Jenis Simpanan',
          sortable: true,
          render: (_, row: Saving) => (
            <span className="inline-block px-2.5 py-0.5 text-xs font-bold rounded-lg border border-slate-200/20"
              style={row.category?.color ? { color: row.category.color, borderColor: `${row.category.color}40`, backgroundColor: `${row.category.color}10` } : {
                color: '#475569', borderColor: '#e2e8f0', backgroundColor: '#f8fafc'
              }}
            >
              {row.category?.name || row.type}
            </span>
          )
        },
        {
          key: 'amount',
          label: 'Saldo',
          sortable: true,
          render: (_, row: Saving) => (
            <span className="font-extrabold text-indigo-600 dark:text-indigo-400">
              Rp {parseFloat(row.amount).toLocaleString('id-ID')}
            </span>
          )
        },
        {
          key: 'actions',
          label: 'Riwayat',
          render: (_, row: Saving) => (
            <div className="flex space-x-2">
              <Button
                size="sm"
                onClick={() => handleShowTransactions(row)}
              >
                Lihat Transaksi
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-slate-700 border-slate-300 dark:text-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold flex items-center gap-1.5"
                onClick={(e) => {
                  e.stopPropagation();
                  handleExportSingleSavingPdf(row);
                }}
                title="Cetak Mutasi Rekening Ini"
              >
                <Printer size={12} /> Mutasi
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-indigo-600 border-indigo-200 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 font-bold flex items-center gap-1.5"
                onClick={(e) => {
                  e.stopPropagation();
                  handleExportAllSavingsPdf(row);
                }}
                title="Cetak Rekap Buku Tabungan"
              >
                <Printer size={12} /> Rekap Buku
              </Button>
            </div>
          )
        }
      ];
    }

    return [
      {
        key: 'member',
        label: 'Anggota',
        sortable: true,
        render: (_, row: Saving) => (
          <div>
            <p className="font-semibold text-slate-800 dark:text-slate-200">{row.member.name}</p>
            <p className="text-slate-400 text-xs">{row.member.memberNo}</p>
          </div>
        )
      },
      {
        key: 'type',
        label: 'Jenis Simpanan',
        sortable: true,
        render: (_, row: Saving) => (
          <span className="inline-block px-2.5 py-0.5 text-xs font-bold rounded-lg border border-slate-200/20"
            style={row.category?.color ? { color: row.category.color, borderColor: `${row.category.color}40`, backgroundColor: `${row.category.color}10` } : {
              color: '#475569', borderColor: '#e2e8f0', backgroundColor: '#f8fafc'
            }}
          >
            {row.category?.name || row.type}
          </span>
        )
      },
      {
        key: 'amount',
        label: 'Saldo',
        sortable: true,
        render: (_, row: Saving) => (
          <span className="font-extrabold text-blue-600 dark:text-blue-400">
            Rp {parseFloat(row.amount).toLocaleString('id-ID')}
          </span>
        )
      },
      {
        key: 'actions',
        label: 'Aksi',
        render: (_, row: Saving) => (
          <div className="flex space-x-2">
            <Button
              size="sm"
              variant="outline"
              className="text-slate-700 border-slate-300 dark:text-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold flex items-center gap-1.5"
              onClick={(e) => {
                e.stopPropagation();
                handleExportSingleSavingPdf(row);
              }}
              title="Cetak Mutasi Rekening Ini"
            >
              <Printer size={12} /> Mutasi
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-indigo-600 border-indigo-200 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 font-bold flex items-center gap-1.5"
              onClick={(e) => {
                e.stopPropagation();
                handleExportAllSavingsPdf(row);
              }}
              title="Cetak Rekap Buku Tabungan (Semua Rekening)"
            >
              <Printer size={12} /> Rekap Buku
            </Button>
          </div>
        )
      }
    ];
  }, [isStudent, handleShowTransactions, handleExportAllSavingsPdf, handleExportSingleSavingPdf]);

  const toolbarLeftElement = useMemo(() => {
    if (isStudent) return null;
    return (
      <div className="relative w-48 sm:w-64">
        <Input
          id="search-saving-input"
          name="searchSaving"
          size="sm"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="Cari nama / no. anggota..."
          leftIcon={<Search />}
          className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-gray-800"
        />
      </div>
    );
  }, [isStudent, search, setSearch, setPage]);

  const filterTypeOptions = useMemo(() => {
    const list = [{ label: 'Semua Jenis', value: 'ALL' }];
    categories?.forEach(cat => {
      list.push({ label: cat.name, value: cat.code });
    });
    return list;
  }, [categories]);

  const toolbarRightElement = useMemo(() => {
    if (isStudent) return null;
    return (
      <div className="flex items-center space-x-3 w-auto shrink-0">
        <div className="flex items-center space-x-2 w-48">
          <label htmlFor="filter-saving-type" className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter shrink-0">Jenis:</label>
          <SearchableSelect
            id="filter-saving-type"
            value={typeFilter}
            onValueChange={(val) => {
              setTypeFilter(val);
              setPage(1);
            }}
            options={filterTypeOptions}
            placeholder="Filter Jenis..."
          />
        </div>
        <Button
          size="sm"
          variant="outline"
          className="text-indigo-600 border-indigo-200 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 font-bold flex items-center gap-1.5 h-8 text-[11px]"
          onClick={onOpenExportModal}
        >
          <FileSpreadsheet size={14} /> Rekap Mutasi
        </Button>
      </div>
    );
  }, [isStudent, typeFilter, setTypeFilter, filterTypeOptions, onOpenExportModal, setPage]);

  const filteredSavings = useMemo(() => {
    return (savings || []).filter((s) => {
      const matchSearch =
        s.member.name.toLowerCase().includes(search.toLowerCase()) ||
        s.member.memberNo.toLowerCase().includes(search.toLowerCase());

      const matchType = typeFilter === 'ALL' || s.category?.code === typeFilter || s.type === typeFilter;

      return matchSearch && matchType;
    });
  }, [savings, search, typeFilter]);

  const sortedSavings = useMemo(() => {
    const sorted = [...filteredSavings];
    if (!sortBy) return sorted;

    sorted.sort((a, b) => {
      let valA: string | number = '';
      let valB: string | number = '';

      if (sortBy === 'member') {
        valA = a.member.name || '';
        valB = b.member.name || '';
      } else if (sortBy === 'amount') {
        valA = parseFloat(a.amount) || 0;
        valB = parseFloat(b.amount) || 0;
      } else if (sortBy === 'type') {
        valA = a.category?.name || a.type || '';
        valB = b.category?.name || b.type || '';
      }

      if (typeof valA === 'string' && typeof valB === 'string') {
        return sortOrder === 'asc'
          ? valA.localeCompare(valB)
          : valB.localeCompare(valA);
      }

      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortOrder === 'asc' ? valA - valB : valB - valA;
      }

      return 0;
    });

    return sorted;
  }, [filteredSavings, sortBy, sortOrder]);

  const paginatedSavings = useMemo(() => {
    const start = (page - 1) * limit;
    return sortedSavings.slice(start, start + limit);
  }, [sortedSavings, page, limit]);

  if (isMobile) {
    return (
      <div className="space-y-4">
        {/* Mobile Toolbar */}
        <div className="space-y-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/70 dark:border-slate-800 shadow-sm">
          {toolbarLeftElement}
          <div className="flex flex-wrap gap-2 pt-1">
            {toolbarRightElement}
          </div>
        </div>

        <MobileAcademicList
          title="Daftar Simpanan Anggota"
          data={paginatedSavings}
          loading={loading}
          totalItems={sortedSavings.length}
          emptyMessage="Belum ada data simpanan yang cocok."
          pagination={{
            currentPage: page,
            itemsPerPage: limit,
            totalItems: sortedSavings.length,
            totalPages: Math.ceil(sortedSavings.length / limit) || 1,
            onPageChange: setPage,
            onLimitChange: setLimit,
          }}
          renderCard={(saving: Saving) => {
            const catColor = saving.category?.color || '#4f46e5';
            const catName = saving.category?.name || saving.type || 'Simpanan';
            const balance = parseFloat(saving.amount) || 0;
            const isStudentMember = Boolean(saving.member.siswaId);

            return (
              <div
                key={saving.id}
                onClick={() => {
                  handleShowTransactions(saving);
                  if (!isStudent) {
                    const targetId = saving.member.siswaId || saving.member.guruId;
                    const mockStudent: StudentData = {
                      id: targetId || '',
                      nama_siswa: saving.member.name,
                      nama_guru: saving.member.name
                    };
                    handleSelectStudent(mockStudent, saving.member.memberNo);
                  }
                }}
                className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 shadow-sm active:scale-[0.99] transition-all space-y-3 cursor-pointer"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black shrink-0"
                      style={{ backgroundColor: `${catColor}15`, color: catColor }}
                    >
                      {isStudentMember ? 'SW' : 'GR'}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                        {saving.member.name}
                      </h4>
                      <p className="text-[10px] text-slate-400 font-medium">
                        No. {saving.member.memberNo}
                      </p>
                    </div>
                  </div>

                  <span
                    className="px-2 py-0.5 text-[10px] font-bold rounded-lg uppercase tracking-wider shrink-0"
                    style={{ backgroundColor: `${catColor}15`, color: catColor }}
                  >
                    {catName}
                  </span>
                </div>

                <div className="flex items-end justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Saldo</span>
                    <p className="text-sm font-black text-indigo-600 dark:text-indigo-400">
                      Rp {balance.toLocaleString('id-ID')}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => handleExportSingleSavingPdf(saving)}
                      className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold flex items-center gap-1"
                      title="Cetak Mutasi"
                    >
                      <Printer size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleExportAllSavingsPdf(saving)}
                      className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-355 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold flex items-center gap-1"
                      title="Rekap Buku"
                    >
                      <BookOpen size={13} />
                    </button>
                  </div>
                </div>
              </div>
            );
          }}
        />
      </div>
    );
  }

  return (
    <Table
      columns={finalColumns}
      data={paginatedSavings}
      rowKey="id"
      loading={loading}
      emptyMessage="Belum ada data simpanan."
      toolbarLeft={toolbarLeftElement}
      toolbarRight={toolbarRightElement}
      sortBy={sortBy}
      sortOrder={sortOrder}
      onSort={onSort}
      onRowClick={(row: unknown) => {
        const sRow = row as Saving;
        handleShowTransactions(sRow);
        if (!isStudent) {
          const targetId = sRow.member.siswaId || sRow.member.guruId;
          const mockStudent: StudentData = {
            id: targetId || '',
            nama_siswa: sRow.member.name,
            nama_guru: sRow.member.name
          };
          handleSelectStudent(mockStudent, sRow.member.memberNo);
        }
      }}
      pagination={{
        currentPage: page,
        totalPages: Math.ceil(sortedSavings.length / limit) || 1,
        totalItems: sortedSavings.length,
        itemsPerPage: limit,
        onPageChange: setPage,
        onLimitChange: setLimit
      }}
    />
  );
});

SavingsTable.displayName = 'SavingsTable';
