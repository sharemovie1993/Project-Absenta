import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/axiosInstance';
import { 
  BookOpen, 
  Search, 
  Printer, 
  Calendar, 
  Filter, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Scale,
  RefreshCw
} from 'lucide-react';
import Table from '../../ui/Table';
import Button from '../../ui/Button';
import { SearchableSelect } from '../../ui/SearchableSelect';
import { AnalyticsCard } from '../../ui/AnalyticsCard';
import { coopAccountApi } from '@/api/coopAccount.api';
import { formatDate } from '@/utils/date.utils';
import { 
  formatAccountingReference, 
  humanizeAccountingDescription 
} from '@/utils/cooperative/accountingFormatters';
import { useIsMobile } from '../../../hooks/useIsMobile';

const POPULAR_COOP_ACCOUNTS = [
  { value: '1010', label: '1010 - Kas Koperasi (Kas Tunai)' },
  { value: '1011', label: '1011 - Kas Bank Koperasi' },
  { value: '1020', label: '1020 - Piutang Anggota' },
  { value: '1030', label: '1030 - Persediaan Barang Toko' },
  { value: '1510', label: '1510 - Aktiva Tetap & Peralatan Koperasi' },
  { value: '1520', label: '1520 - Akumulasi Penyusutan Aktiva Tetap' },
  { value: '2010', label: '2010 - Tabungan Sukarela Anggota' },
  { value: '3010', label: '3010 - Ekuitas Koperasi' },
  { value: '3020', label: '3020 - Dana Cadangan Koperasi' },
  { value: '4010', label: '4010 - Pendapatan Toko Koperasi' },
  { value: '4020', label: '4020 - Pendapatan Bunga Pinjaman' },
  { value: '4030', label: '4030 - Pendapatan Sewa & Kerjasama' },
  { value: '4040', label: '4040 - Pendapatan Jasa Giro & Bank' },
  { value: '5010', label: '5010 - Beban Pokok Penjualan (HPP)' },
  { value: '5020', label: '5020 - Beban Administrasi Koperasi' },
  { value: '5021', label: '5021 - Beban Listrik, Air & Utilitas' },
  { value: '5022', label: '5022 - Beban Komunikasi & Internet' },
  { value: '5023', label: '5023 - Beban Aplikasi & TI' },
  { value: '5024', label: '5024 - Beban ATK & Perlengkapan' },
  { value: '5025', label: '5025 - Beban Pemeliharaan Sarana' },
  { value: '5026', label: '5026 - Beban Operasional Pengurus' },
  { value: '5030', label: '5030 - Beban Penyusutan Aktiva Tetap' },
];

export const GeneralLedgerSection: React.FC = React.memo(() => {
  const isMobile = useIsMobile();
  const [selectedAccountCode, setSelectedAccountCode] = useState('1010');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [periodPreset, setPeriodPreset] = useState<'year' | 'custom'>('year');
  const [customStartDate, setCustomStartDate] = useState(`${new Date().getFullYear()}-01-01`);
  const [customEndDate, setCustomEndDate] = useState(`${new Date().getFullYear()}-12-31`);

  const effectiveStartDate = periodPreset === 'year' ? `${selectedYear}-01-01` : customStartDate;
  const effectiveEndDate = periodPreset === 'year' ? `${selectedYear}-12-31` : customEndDate;

  const { data: coaAccountsData } = useQuery({
    queryKey: ['cooperative-coa-accounts', 'flat'],
    queryFn: () => coopAccountApi.getAccounts({ tree: false }),
    staleTime: 60 * 1000,
  });

  const accountOptions = useMemo(() => {
    const list = Array.isArray(coaAccountsData) ? coaAccountsData : (coaAccountsData?.flat || []);
    if (list.length === 0) {
      return POPULAR_COOP_ACCOUNTS;
    }
    return list
      .filter((acc) => !acc.isHeader)
      .map((acc) => ({
        value: acc.code,
        label: `${acc.code} - ${acc.name}`,
      }));
  }, [coaAccountsData]);

  const { data, isLoading, isRefetching, refetch } = useQuery<{
    account: { id: string; code: string; name: string; type: string };
    openingBalance: number;
    totalDebit: number;
    totalCredit: number;
    endingBalance: number;
    entries: {
      id: string;
      date: string;
      reference: string;
      description: string;
      type: 'DEBIT' | 'CREDIT';
      debit: number;
      credit: number;
      runningBalance: number;
    }[];
  }>({
    queryKey: ['cooperative-general-ledger', selectedAccountCode, effectiveStartDate, effectiveEndDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (effectiveStartDate) params.append('startDate', effectiveStartDate);
      if (effectiveEndDate) params.append('endDate', effectiveEndDate);
      const res = await api.get(`/cooperative/reports/ledger/${selectedAccountCode}?${params.toString()}`);
      return res.data?.data;
    },
    staleTime: 30 * 1000,
  });

  const ledger = data || {
    account: { id: '', code: selectedAccountCode, name: 'Memuat...', type: 'ASSET' },
    openingBalance: 0,
    totalDebit: 0,
    totalCredit: 0,
    endingBalance: 0,
    entries: []
  };

  const columns = useMemo(() => [
    {
      label: 'Tanggal',
      key: 'date',
      className: 'w-28',
      render: (d: string) => (
        <span className="font-mono text-xs font-semibold text-slate-600 dark:text-slate-400">
          {formatDate(d)}
        </span>
      ),
    },
    {
      label: <div className="text-center w-full">No. Referensi</div>,
      key: 'reference',
      className: 'w-32 text-center',
      render: (ref: string) => {
        const fRef = formatAccountingReference(ref);
        return (
          <span 
            className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[11px] font-mono font-bold border shadow-2xs ${fRef.badgeClass}`}
            title={`Referensi Sistem: ${fRef.full}`}
          >
            {fRef.label}
          </span>
        );
      },
    },
    {
      label: 'Keterangan Transaksi',
      key: 'description',
      className: 'min-w-[220px]',
      render: (desc: string) => (
        <span className="text-xs font-bold text-slate-900 dark:text-slate-100 line-clamp-1">
          {humanizeAccountingDescription(desc)}
        </span>
      ),
    },
    {
      label: <div className="text-right w-full">Debit (Rp)</div>,
      key: 'debit',
      className: 'text-right w-36',
      render: (d: number) => (
        <div className="text-right font-mono text-xs">
          {d > 0 ? (
            <span className="font-bold text-slate-900 dark:text-slate-100">
              Rp {Math.round(d).toLocaleString('id-ID')}
            </span>
          ) : (
            <span className="text-slate-300 dark:text-slate-700 select-none">-</span>
          )}
        </div>
      ),
    },
    {
      label: <div className="text-right w-full">Kredit (Rp)</div>,
      key: 'credit',
      className: 'text-right w-36',
      render: (c: number) => (
        <div className="text-right font-mono text-xs">
          {c > 0 ? (
            <span className="font-bold text-slate-900 dark:text-slate-100">
              Rp {Math.round(c).toLocaleString('id-ID')}
            </span>
          ) : (
            <span className="text-slate-300 dark:text-slate-700 select-none">-</span>
          )}
        </div>
      ),
    },
    {
      label: <div className="text-right w-full">Saldo Berjalan (Rp)</div>,
      key: 'runningBalance',
      className: 'text-right w-40',
      render: (b: number) => (
        <div className="text-right font-mono text-xs font-black text-indigo-700 dark:text-indigo-400">
          Rp {Math.round(b).toLocaleString('id-ID')}
        </div>
      ),
    },
  ], []);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Toolbar Filter & Pemilihan Akun */}
      <div className="print:hidden flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 p-4 bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 rounded-2xl">
        <div className="flex flex-wrap items-center gap-3">
          <div className="w-72">
            <SearchableSelect
              id="gl-account-select"
              value={selectedAccountCode}
              onChange={(val) => setSelectedAccountCode(String(val))}
              options={accountOptions}
              placeholder="Pilih Nomor Akun Buku Besar..."
              aria-label="Pilih Akun Buku Besar"
            />
          </div>

          <div className="inline-flex rounded-xl bg-slate-200/70 dark:bg-slate-800 p-0.5 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setPeriodPreset('year')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                periodPreset === 'year'
                  ? 'bg-white dark:bg-slate-950 text-indigo-600 dark:text-indigo-400 font-bold shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Tahun Buku
            </button>
            <button
              type="button"
              onClick={() => setPeriodPreset('custom')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                periodPreset === 'custom'
                  ? 'bg-white dark:bg-slate-950 text-indigo-600 dark:text-indigo-400 font-bold shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Kustom
            </button>
          </div>

          {periodPreset === 'year' ? (
            <input
              type="number"
              aria-label="Tahun Buku Besar"
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              min="2020"
              max="2035"
              className="w-24 px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200"
            />
          ) : (
            <div className="flex items-center gap-2">
              <input
                type="date"
                aria-label="Tanggal Mulai"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="px-2.5 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
              <span className="text-xs text-slate-400">s/d</span>
              <input
                type="date"
                aria-label="Tanggal Akhir"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="px-2.5 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </div>
          )}

          <Button
            size="sm"
            variant="outline"
            onClick={() => refetch()}
            disabled={isRefetching}
            className="gap-1.5 border-slate-300 dark:border-slate-700 text-xs"
          >
            <RefreshCw size={13} className={isRefetching ? 'animate-spin' : ''} />
            <span>Segarkan</span>
          </Button>
        </div>

        <Button
          size="sm"
          variant="primary"
          onClick={handlePrint}
          className="gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs shrink-0"
        >
          <Printer size={14} />
          <span>Cetak Buku Besar</span>
        </Button>
      </div>

      {/* Metric Cards Saldo Akun */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <AnalyticsCard
          title="Saldo Awal"
          value={`Rp ${Math.round(ledger.openingBalance).toLocaleString('id-ID')}`}
          icon={Scale}
          description="Posisi saldo sebelum awal periode"
          variant="card"
          gradient="from-slate-500 to-slate-700"
        />
        <AnalyticsCard
          title="Total Mutasi Debit"
          value={`Rp ${Math.round(ledger.totalDebit).toLocaleString('id-ID')}`}
          icon={TrendingUp}
          description="Akumulasi penambahan debit"
          variant="card"
          gradient="from-emerald-500 to-teal-600"
        />
        <AnalyticsCard
          title="Total Mutasi Kredit"
          value={`Rp ${Math.round(ledger.totalCredit).toLocaleString('id-ID')}`}
          icon={TrendingDown}
          description="Akumulasi pengurangan kredit"
          variant="card"
          gradient="from-rose-500 to-amber-600"
        />
        <AnalyticsCard
          title="Saldo Akhir Berjalan"
          value={`Rp ${Math.round(ledger.endingBalance).toLocaleString('id-ID')}`}
          icon={DollarSign}
          description={`Posisi saldo per ${effectiveEndDate}`}
          variant="card"
          gradient="from-indigo-600 to-blue-600"
        />
      </div>

      {/* Main Table Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 sm:p-6 space-y-4 shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="font-black text-sm text-slate-900 dark:text-white">
              Buku Besar: {ledger.account.code} - {ledger.account.name}
            </h3>
            <span className="text-[11px] font-mono text-slate-400">
              Klasifikasi: {ledger.account.type} | Total {ledger.entries.length} baris mutasi
            </span>
          </div>
        </div>

        {isMobile ? (
          <div className="space-y-3">
            {ledger.entries.length === 0 ? (
              <div className="p-8 text-center text-slate-400 font-bold uppercase tracking-wider text-xs">
                Belum ada mutasi pembukuan pada rekening {ledger.account.code}.
              </div>
            ) : (
              ledger.entries.map((entry) => (
                <div
                  key={entry.id}
                  className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/60 dark:border-slate-800 space-y-2 text-xs"
                >
                  <div className="flex justify-between items-start gap-2">
                    <div className="min-w-0">
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">
                        {formatDate(entry.date)}
                      </span>
                      <p className="font-bold text-slate-800 dark:text-slate-100 truncate mt-0.5">
                        {entry.description}
                      </p>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 bg-slate-200/70 dark:bg-slate-700 rounded-md font-bold text-slate-600 dark:text-slate-300 shrink-0">
                      {entry.reference}
                    </span>
                  </div>

                  <div className="flex justify-between items-center pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                    <div className="flex gap-2 font-mono font-bold text-[11px]">
                      {entry.debit > 0 && (
                        <span className="text-emerald-600 dark:text-emerald-400">
                          D: Rp {Math.round(entry.debit).toLocaleString('id-ID')}
                        </span>
                      )}
                      {entry.credit > 0 && (
                        <span className="text-rose-600 dark:text-rose-400">
                          K: Rp {Math.round(entry.credit).toLocaleString('id-ID')}
                        </span>
                      )}
                    </div>
                    <div className="text-right">
                      <span className="text-[9px] text-slate-400 font-medium block">Saldo Berjalan</span>
                      <span className="font-mono font-bold text-slate-900 dark:text-white">
                        Rp {Math.round(entry.runningBalance).toLocaleString('id-ID')}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          <Table
            data={ledger.entries}
            columns={columns}
            loading={isLoading}
            emptyMessage={`Belum ada mutasi pembukuan pada rekening ${ledger.account.code} untuk periode yang dipilih.`}
          />
        )}
      </div>
    </div>
  );
});
