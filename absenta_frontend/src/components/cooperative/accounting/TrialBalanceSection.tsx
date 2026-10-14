import React, { useState, useMemo, useCallback } from 'react';
import Table, { type Column } from '../../ui/Table';
import { MobileAcademicList } from '../../academic/shared/MobileAcademicList';
import type { BalanceSheetItem } from './types';
import { useIsMobile } from '../../../hooks/useIsMobile';

interface TrialBalanceSectionProps {
  balanceSheet: BalanceSheetItem[];
  loading: boolean;
}

export const TrialBalanceSection: React.FC<TrialBalanceSectionProps> = React.memo(({
  balanceSheet,
  loading,
}) => {
  const isMobile = useIsMobile();
  const [balanceSortBy, setBalanceSortBy] = useState<string>('code');
  const [balanceSortOrder, setBalanceSortOrder] = useState<'asc' | 'desc'>('asc');
  const [balancePage, setBalancePage] = useState<number>(1);
  const [balanceLimit, setBalanceLimit] = useState<number>(10);

  const handleBalanceSort = useCallback((key: string, order: 'asc' | 'desc') => {
    setBalanceSortBy(key);
    setBalanceSortOrder(order);
  }, []);

  const balanceColumns: Column[] = useMemo(() => [
    {
      key: 'code',
      label: 'Kode Akun',
      sortable: true
    },
    {
      key: 'name',
      label: 'Nama Akun',
      sortable: true
    },
    {
      key: 'type',
      label: 'Tipe',
      sortable: true
    },
    {
      key: 'balance',
      label: 'Saldo Neraca',
      sortable: true,
      render: (_, row: unknown) => {
        const item = row as BalanceSheetItem;
        return (
          <span className="font-black text-slate-800 dark:text-white">
            Rp {Math.round(Number(item.balance)).toLocaleString('id-ID')}
          </span>
        );
      }
    }
  ], []);

  const sortedBalanceSheet = useMemo(() => {
    const sorted = [...balanceSheet];
    if (!balanceSortBy) return sorted;

    sorted.sort((a, b) => {
      const valA = a[balanceSortBy as keyof BalanceSheetItem] ?? '';
      const valB = b[balanceSortBy as keyof BalanceSheetItem] ?? '';

      if (typeof valA === 'string' && typeof valB === 'string') {
        return balanceSortOrder === 'asc'
          ? valA.localeCompare(valB)
          : valB.localeCompare(valA);
      }

      if (typeof valA === 'number' && typeof valB === 'number') {
        return balanceSortOrder === 'asc' ? valA - valB : valB - valA;
      }

      return 0;
    });

    return sorted;
  }, [balanceSheet, balanceSortBy, balanceSortOrder]);

  const paginatedBalanceSheet = useMemo(() => {
    const start = (balancePage - 1) * balanceLimit;
    return sortedBalanceSheet.slice(start, start + balanceLimit);
  }, [sortedBalanceSheet, balancePage, balanceLimit]);

  const balanceToolbarLeft = useMemo(() => (
    <div className="text-xs font-bold text-slate-500 uppercase tracking-wider pl-2">
      Neraca Saldo (Trial Balance) Koperasi
    </div>
  ), []);

  const balanceToolbarRight = useMemo(() => (
    <div className="text-[10px] text-slate-400 font-semibold pr-2">
      Status: Aktif | Terstandarisasi
    </div>
  ), []);

  const renderMobileBalanceCard = useCallback((item: BalanceSheetItem) => {
    return (
      <div
        key={item.code}
        className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-2.5"
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <span className="text-[10px] font-mono font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded-md">
              {item.code}
            </span>
            <h4 className="font-bold text-xs text-slate-800 dark:text-slate-100 mt-1">{item.name}</h4>
          </div>
          <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 shrink-0">
            {item.category}
          </span>
        </div>

        <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
          <div>
            <span className="text-[9px] text-slate-400 block font-medium">Debit</span>
            <span className="font-semibold text-slate-700 dark:text-slate-200 text-[11px]">
              Rp {Math.round(Number(item.debit)).toLocaleString('id-ID')}
            </span>
          </div>
          <div>
            <span className="text-[9px] text-slate-400 block font-medium">Kredit</span>
            <span className="font-semibold text-slate-700 dark:text-slate-200 text-[11px]">
              Rp {Math.round(Number(item.credit)).toLocaleString('id-ID')}
            </span>
          </div>
          <div>
            <span className="text-[9px] text-slate-400 block font-medium">Saldo</span>
            <span className="font-black text-slate-800 dark:text-white text-[11px]">
              Rp {Math.round(Number(item.balance)).toLocaleString('id-ID')}
            </span>
          </div>
        </div>
      </div>
    );
  }, []);

  if (isMobile) {
    return (
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          {balanceToolbarLeft}
          {balanceToolbarRight}
        </div>
        <MobileAcademicList
          title="Neraca Saldo"
          data={paginatedBalanceSheet}
          loading={loading}
          totalItems={sortedBalanceSheet.length}
          emptyMessage="Data neraca saldo tidak ditemukan."
          pagination={{
            currentPage: balancePage,
            totalPages: Math.ceil(sortedBalanceSheet.length / balanceLimit) || 1,
            totalItems: sortedBalanceSheet.length,
            itemsPerPage: balanceLimit,
            onPageChange: setBalancePage,
            onLimitChange: setBalanceLimit
          }}
          renderCard={renderMobileBalanceCard}
        />
      </div>
    );
  }

  return (
    <Table
      data={paginatedBalanceSheet}
      columns={balanceColumns}
      rowKey="code"
      loading={loading}
      emptyMessage="Data neraca saldo tidak ditemukan."
      sortBy={balanceSortBy}
      sortOrder={balanceSortOrder}
      onSort={handleBalanceSort}
      toolbarLeft={balanceToolbarLeft}
      toolbarRight={balanceToolbarRight}
      pagination={{
        currentPage: balancePage,
        totalPages: Math.ceil(sortedBalanceSheet.length / balanceLimit) || 1,
        totalItems: sortedBalanceSheet.length,
        itemsPerPage: balanceLimit,
        onPageChange: setBalancePage,
        onLimitChange: setBalanceLimit
      }}
    />
  );
});

TrialBalanceSection.displayName = 'TrialBalanceSection';
export default TrialBalanceSection;
