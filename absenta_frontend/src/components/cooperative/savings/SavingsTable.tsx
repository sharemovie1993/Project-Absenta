import React, { useMemo } from 'react';
import Table from '../../ui/Table';
import type { Column } from '../../ui/Table';
import Button from '../../ui/Button';
import Input from '../../ui/Input';
import { SearchableSelect } from '../../ui/SearchableSelect';
import { Search, Printer, BookOpen, FileSpreadsheet, Eye, Zap } from 'lucide-react';
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

export interface GroupedMemberSaving {
  id: string;
  memberId: string;
  member: {
    id?: string;
    name: string;
    memberNo: string;
    userId?: string;
    siswaId?: string;
    guruId?: string;
  };
  pokokAmount: number;
  wajibAmount: number;
  sukarelaAmount: number;
  otherAmount: number;
  totalAmount: number;
  pokokSaving?: Saving;
  wajibSaving?: Saving;
  sukarelaSaving?: Saving;
  savings: Saving[];
  primarySaving: Saving;
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
  onOpenCashierModal?: () => void;
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
  onOpenExportModal,
  onOpenCashierModal,
}) => {
  const isMobile = useIsMobile();

  // Pengelompokan Data per Anggota (1 Anggota = 1 Baris Utama)
  const groupedList = useMemo(() => {
    if (isStudent) return [];
    const map = new Map<string, GroupedMemberSaving>();

    for (const s of (savings || [])) {
      const key = s.memberId || s.member.memberNo || s.member.name;
      if (!map.has(key)) {
        map.set(key, {
          id: key,
          memberId: s.memberId,
          member: s.member,
          pokokAmount: 0,
          wajibAmount: 0,
          sukarelaAmount: 0,
          otherAmount: 0,
          totalAmount: 0,
          savings: [],
          primarySaving: s,
        });
      }

      const grp = map.get(key)!;
      grp.savings.push(s);
      const amt = parseFloat(s.amount) || 0;
      grp.totalAmount += amt;

      const code = (s.category?.code || s.type || '').toUpperCase();
      if (code === 'POKOK') {
        grp.pokokAmount += amt;
        grp.pokokSaving = s;
      } else if (code === 'WAJIB') {
        grp.wajibAmount += amt;
        grp.wajibSaving = s;
      } else if (code === 'SUKARELA') {
        grp.sukarelaAmount += amt;
        grp.sukarelaSaving = s;
      } else {
        grp.otherAmount += amt;
      }

      // Prioritas primarySaving: rekening yang memiliki saldo tertinggi / ada transaksi
      if (amt > 0 && (parseFloat(grp.primarySaving.amount) || 0) === 0) {
        grp.primarySaving = s;
      }
    }

    return Array.from(map.values());
  }, [savings, isStudent]);

  // Cek apakah ada kategori tambahan di luar POKOK, WAJIB, SUKARELA
  const hasOtherCategories = useMemo(() => {
    return categories?.some(c => !['POKOK', 'WAJIB', 'SUKARELA'].includes(c.code.toUpperCase()));
  }, [categories]);

  const finalColumns: Column[] = useMemo(() => {
    if (isStudent) {
      return [
        {
          key: 'type',
          label: 'Jenis Simpanan',
          sortable: true,
          render: (_, row: Saving) => (
            <span
              className="inline-block px-2.5 py-0.5 text-xs font-bold rounded-lg border border-slate-200/20"
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

    // Tampilan Tabel Operator: Dikelompokkan per Anggota (1 Anggota = 1 Baris)
    return [
      {
        key: 'member',
        label: 'Anggota',
        sortable: true,
        render: (_, row: any) => {
          const item = row as GroupedMemberSaving;
          return (
            <div>
              <p className="font-bold text-slate-800 dark:text-slate-100 text-xs sm:text-sm">{item.member.name}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="font-mono text-[10px] text-slate-400 font-semibold">No. {item.member.memberNo}</span>
                <span className="text-[9px] px-1.5 py-0.2 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 font-medium">
                  {item.member.siswaId ? 'Siswa' : item.member.guruId ? 'Guru' : 'Umum'}
                </span>
              </div>
            </div>
          );
        }
      },
      {
        key: 'pokok',
        label: 'Simp. Pokok',
        sortable: true,
        render: (_, row: any) => {
          const item = row as GroupedMemberSaving;
          const isLunas = item.pokokAmount > 0;
          return (
            <div className="flex flex-col items-start gap-0.5">
              <span className="font-bold font-mono text-xs text-slate-800 dark:text-slate-200">
                Rp {item.pokokAmount.toLocaleString('id-ID')}
              </span>
              {isLunas ? (
                <span className="inline-flex items-center text-[9px] font-black px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60">
                  ✓ Lunas
                </span>
              ) : (
                <span className="inline-flex items-center text-[9px] font-black px-1.5 py-0.2 rounded bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/60">
                  ⚠️ Belum
                </span>
              )}
            </div>
          );
        }
      },
      {
        key: 'wajib',
        label: 'Simp. Wajib',
        sortable: true,
        render: (_, row: any) => {
          const item = row as GroupedMemberSaving;
          const isLunas = item.wajibAmount > 0;
          return (
            <div className="flex flex-col items-start gap-0.5">
              <span className="font-bold font-mono text-xs text-slate-800 dark:text-slate-200">
                Rp {item.wajibAmount.toLocaleString('id-ID')}
              </span>
              {isLunas ? (
                <span className="inline-flex items-center text-[9px] font-black px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60">
                  ✓ Lunas
                </span>
              ) : (
                <span className="inline-flex items-center text-[9px] font-black px-1.5 py-0.2 rounded bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/60">
                  ⚠️ Belum
                </span>
              )}
            </div>
          );
        }
      },
      {
        key: 'sukarela',
        label: 'Simp. Sukarela',
        sortable: true,
        render: (_, row: any) => {
          const item = row as GroupedMemberSaving;
          return (
            <span className={`font-bold font-mono text-xs ${item.sukarelaAmount > 0 ? 'text-emerald-600 dark:text-emerald-400 font-black' : 'text-slate-400'}`}>
              Rp {item.sukarelaAmount.toLocaleString('id-ID')}
            </span>
          );
        }
      },
      ...(hasOtherCategories ? [{
        key: 'other',
        label: 'Lainnya',
        sortable: true,
        render: (_, row: any) => {
          const item = row as GroupedMemberSaving;
          return (
            <span className="font-bold font-mono text-xs text-slate-500">
              Rp {item.otherAmount.toLocaleString('id-ID')}
            </span>
          );
        }
      }] : []),
      {
        key: 'amount',
        label: 'Total Saldo',
        sortable: true,
        render: (_, row: any) => {
          const item = row as GroupedMemberSaving;
          return (
            <span className="font-black font-mono text-xs sm:text-sm text-indigo-600 dark:text-indigo-400">
              Rp {item.totalAmount.toLocaleString('id-ID')}
            </span>
          );
        }
      },
      {
        key: 'actions',
        label: 'Aksi',
        render: (_, row: any) => {
          const item = row as GroupedMemberSaving;
          return (
            <div className="flex items-center space-x-1.5">
              <Button
                size="sm"
                variant="primary"
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold flex items-center gap-1 shadow-sm px-2.5 py-1 text-xs rounded-xl"
                onClick={(e) => {
                  e.stopPropagation();
                  const member = item.member;
                  const studentObj: any = {
                    id: member.siswaId || member.guruId || item.memberId,
                    nama_siswa: member.name,
                    nama_guru: member.name,
                    nis: member.memberNo,
                    nip: member.memberNo,
                  };
                  handleSelectStudent(studentObj, member.memberNo);
                }}
                title="Buka Loket Transaksi Kasir untuk Anggota ini"
              >
                <Zap size={12} className="text-amber-300" /> Kasir
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-slate-700 border-slate-300 dark:text-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold flex items-center gap-1 px-2 py-1 text-xs rounded-xl"
                onClick={(e) => {
                  e.stopPropagation();
                  handleShowTransactions(item.primarySaving);
                }}
                title="Lihat Riwayat Transaksi"
              >
                <Eye size={12} />
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-indigo-600 border-indigo-200 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 font-bold flex items-center gap-1 px-2.5 py-1 text-xs rounded-xl"
                onClick={(e) => {
                  e.stopPropagation();
                  handleExportAllSavingsPdf(item.primarySaving);
                }}
                title="Cetak Rekap Buku Tabungan Anggota"
              >
                <Printer size={12} /> Buku
              </Button>
            </div>
          );
        }
      }
    ];
  }, [isStudent, hasOtherCategories, handleShowTransactions, handleExportAllSavingsPdf, handleExportSingleSavingPdf, handleSelectStudent]);

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
        {onOpenCashierModal && (
          <Button
            size="sm"
            variant="primary"
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold flex items-center gap-1.5 h-8 text-[11px] shadow-sm rounded-xl"
            onClick={onOpenCashierModal}
            title="Buka Loket Kasir Terpadu (Pindai RFID / QR)"
          >
            <Zap size={13} className="text-amber-300 fill-amber-300" /> Loket Kasir
          </Button>
        )}
      </div>
    );
  }, [isStudent, typeFilter, setTypeFilter, filterTypeOptions, onOpenExportModal, onOpenCashierModal, setPage]);

  // Mode Mahasiswa/Personal (Flat)
  const filteredSavings = useMemo(() => {
    if (!isStudent) return [];
    return (savings || []).filter((s) => {
      const matchSearch =
        s.member.name.toLowerCase().includes(search.toLowerCase()) ||
        s.member.memberNo.toLowerCase().includes(search.toLowerCase());

      const matchType = typeFilter === 'ALL' || s.category?.code === typeFilter || s.type === typeFilter;

      return matchSearch && matchType;
    });
  }, [savings, search, typeFilter, isStudent]);

  const sortedSavings = useMemo(() => {
    if (!isStudent) return [];
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
  }, [filteredSavings, sortBy, sortOrder, isStudent]);

  const paginatedSavings = useMemo(() => {
    if (!isStudent) return [];
    const start = (page - 1) * limit;
    return sortedSavings.slice(start, start + limit);
  }, [sortedSavings, page, limit, isStudent]);

  // Mode Operator/Admin: Filter & Sorting Grouped Members
  const filteredGroupedSavings = useMemo(() => {
    if (isStudent) return [];
    return groupedList.filter((item) => {
      const matchSearch =
        item.member.name.toLowerCase().includes(search.toLowerCase()) ||
        item.member.memberNo.toLowerCase().includes(search.toLowerCase());

      if (!matchSearch) return false;

      if (typeFilter === 'ALL') return true;
      const code = typeFilter.toUpperCase();
      if (code === 'POKOK') return item.pokokAmount > 0;
      if (code === 'WAJIB') return item.wajibAmount > 0;
      if (code === 'SUKARELA') return item.sukarelaAmount > 0;
      return item.otherAmount > 0;
    });
  }, [groupedList, search, typeFilter, isStudent]);

  const sortedGroupedSavings = useMemo(() => {
    if (isStudent) return [];
    const sorted = [...filteredGroupedSavings];
    if (!sortBy) return sorted;

    sorted.sort((a, b) => {
      let valA: string | number = '';
      let valB: string | number = '';

      if (sortBy === 'member') {
        valA = a.member.name || '';
        valB = b.member.name || '';
      } else if (sortBy === 'pokok') {
        valA = a.pokokAmount;
        valB = b.pokokAmount;
      } else if (sortBy === 'wajib') {
        valA = a.wajibAmount;
        valB = b.wajibAmount;
      } else if (sortBy === 'sukarela') {
        valA = a.sukarelaAmount;
        valB = b.sukarelaAmount;
      } else if (sortBy === 'amount' || sortBy === 'total') {
        valA = a.totalAmount;
        valB = b.totalAmount;
      }

      if (typeof valA === 'string' && typeof valB === 'string') {
        return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortOrder === 'asc' ? valA - valB : valB - valA;
      }
      return 0;
    });

    return sorted;
  }, [filteredGroupedSavings, sortBy, sortOrder, isStudent]);

  const paginatedGroupedSavings = useMemo(() => {
    if (isStudent) return [];
    const start = (page - 1) * limit;
    return sortedGroupedSavings.slice(start, start + limit);
  }, [sortedGroupedSavings, page, limit, isStudent]);

  const activeTotalItems = isStudent ? sortedSavings.length : sortedGroupedSavings.length;
  const activeData = isStudent ? paginatedSavings : paginatedGroupedSavings;

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
          data={activeData}
          loading={loading}
          totalItems={activeTotalItems}
          emptyMessage="Belum ada data simpanan yang cocok."
          pagination={{
            currentPage: page,
            itemsPerPage: limit,
            totalItems: activeTotalItems,
            totalPages: Math.ceil(activeTotalItems / limit) || 1,
            onPageChange: setPage,
            onLimitChange: setLimit,
          }}
          renderCard={(item: any) => {
            if (isStudent) {
              const saving = item as Saving;
              const catColor = saving.category?.color || '#4f46e5';
              const catName = saving.category?.name || saving.type || 'Simpanan';
              const balance = parseFloat(saving.amount) || 0;

              return (
                <div
                  key={saving.id}
                  onClick={() => handleShowTransactions(saving)}
                  className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 shadow-sm active:scale-[0.99] transition-all space-y-3 cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span
                      className="px-2.5 py-1 text-xs font-bold rounded-lg uppercase tracking-wider"
                      style={{ backgroundColor: `${catColor}15`, color: catColor }}
                    >
                      {catName}
                    </span>
                    <p className="text-sm font-black text-indigo-600 dark:text-indigo-400">
                      Rp {balance.toLocaleString('id-ID')}
                    </p>
                  </div>
                </div>
              );
            }

            const grp = item as GroupedMemberSaving;
            return (
              <div
                key={grp.id}
                onClick={() => {
                  handleShowTransactions(grp.primarySaving);
                  const targetId = grp.member.siswaId || grp.member.guruId || grp.memberId;
                  const mockStudent: StudentData = {
                    id: targetId || '',
                    nama_siswa: grp.member.name,
                    nama_guru: grp.member.name
                  };
                  handleSelectStudent(mockStudent, grp.member.memberNo);
                }}
                className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 shadow-sm active:scale-[0.99] transition-all space-y-3 cursor-pointer"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400 flex items-center justify-center text-xs font-black shrink-0">
                      {grp.member.siswaId ? 'SW' : grp.member.guruId ? 'GR' : 'UM'}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100 truncate">
                        {grp.member.name}
                      </h4>
                      <p className="text-[10px] text-slate-400 font-medium font-mono">
                        No. {grp.member.memberNo}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider block">Total Saldo</span>
                    <span className="text-sm font-black text-indigo-600 dark:text-indigo-400 font-mono">
                      Rp {grp.totalAmount.toLocaleString('id-ID')}
                    </span>
                  </div>
                </div>

                {/* Breakdown Mini Grid */}
                <div className="grid grid-cols-3 gap-1.5 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-[11px]">
                  <div>
                    <span className="text-[9px] text-slate-400 uppercase font-semibold block">Pokok</span>
                    <span className="font-bold font-mono text-slate-700 dark:text-slate-300">
                      Rp {grp.pokokAmount.toLocaleString('id-ID')}
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 uppercase font-semibold block">Wajib</span>
                    <span className="font-bold font-mono text-slate-700 dark:text-slate-300">
                      Rp {grp.wajibAmount.toLocaleString('id-ID')}
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 uppercase font-semibold block">Sukarela</span>
                    <span className={`font-bold font-mono ${grp.sukarelaAmount > 0 ? 'text-emerald-600 dark:text-emerald-400 font-black' : 'text-slate-500'}`}>
                      Rp {grp.sukarelaAmount.toLocaleString('id-ID')}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400">Klik kartu untuk transaksi</span>
                  <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => {
                        const targetId = grp.member.siswaId || grp.member.guruId || grp.memberId;
                        const mockStudent: StudentData = {
                          id: targetId || '',
                          nama_siswa: grp.member.name,
                          nama_guru: grp.member.name
                        };
                        handleSelectStudent(mockStudent, grp.member.memberNo);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-indigo-600 text-white text-[11px] font-bold flex items-center gap-1 shadow-xs"
                      title="Kasir"
                    >
                      <Zap size={11} className="text-amber-300" /> Kasir
                    </button>
                    <button
                      type="button"
                      onClick={() => handleExportAllSavingsPdf(grp.primarySaving)}
                      className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold flex items-center gap-1"
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
      data={activeData}
      rowKey="id"
      loading={loading}
      emptyMessage="Belum ada data simpanan."
      toolbarLeft={toolbarLeftElement}
      toolbarRight={toolbarRightElement}
      sortBy={sortBy}
      sortOrder={sortOrder}
      onSort={onSort}
      onRowClick={(row: unknown) => {
        if (isStudent) {
          const sRow = row as Saving;
          handleShowTransactions(sRow);
        } else {
          const gRow = row as GroupedMemberSaving;
          handleShowTransactions(gRow.primarySaving);
          const targetId = gRow.member.siswaId || gRow.member.guruId || gRow.memberId;
          const mockStudent: StudentData = {
            id: targetId || '',
            nama_siswa: gRow.member.name,
            nama_guru: gRow.member.name
          };
          handleSelectStudent(mockStudent, gRow.member.memberNo);
        }
      }}
      pagination={{
        currentPage: page,
        totalPages: Math.ceil(activeTotalItems / limit) || 1,
        totalItems: activeTotalItems,
        itemsPerPage: limit,
        onPageChange: setPage,
        onLimitChange: setLimit
      }}
    />
  );
});

SavingsTable.displayName = 'SavingsTable';
