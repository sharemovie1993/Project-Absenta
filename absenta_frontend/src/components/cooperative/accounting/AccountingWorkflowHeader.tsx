import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowDownLeft, 
  ArrowUpRight, 
  ArrowRightLeft, 
  Printer, 
  ChevronRight, 
  ChevronDown, 
  ChevronUp, 
  Receipt, 
  BookOpen, 
  FileText, 
  Scale, 
  TrendingUp, 
  Activity, 
  Calendar, 
  FileSpreadsheet,
  FolderTree,
  Sparkles,
  HelpCircle,
  ExternalLink
} from 'lucide-react';

export type AccountingTabId = 
  | 'income-statement' 
  | 'neraca' 
  | 'cash-flow' 
  | 'ledger' 
  | 'journal' 
  | 'balance' 
  | 'payroll'
  | 'coa';

interface AccountingWorkflowHeaderProps {
  activeTab: AccountingTabId;
  onSelectTab: (tabId: AccountingTabId) => void;
}

export const AccountingWorkflowHeader: React.FC<AccountingWorkflowHeaderProps> = React.memo(({
  activeTab,
  onSelectTab
}) => {
  const navigate = useNavigate();
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className="w-full space-y-4">
      {/* ─── BARIS AKSI CEPAT (QUICK ACTIONS FOR NON-ACCOUNTANTS) ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Tombol Catat Pengeluaran (BKK) */}
        <button
          type="button"
          onClick={() => navigate('/cooperative/cash-bank?action=expense')}
          className="group relative flex items-center justify-between p-3.5 bg-gradient-to-br from-rose-50/90 to-rose-100/40 dark:from-rose-950/30 dark:to-rose-900/10 border border-rose-200/80 dark:border-rose-900/50 rounded-2xl hover:shadow-md hover:border-rose-300 dark:hover:border-rose-700 transition-all text-left"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
              <ArrowDownLeft size={20} className="stroke-[2.5]" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 block">
                Uang Keluar
              </span>
              <span className="text-xs font-black text-slate-800 dark:text-slate-100 block">
                Catat Pengeluaran
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                Listrik, belanja, ATK (BKK)
              </span>
            </div>
          </div>
          <span className="text-rose-500 dark:text-rose-400 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all">
            <ChevronRight size={18} />
          </span>
        </button>

        {/* Tombol Catat Pemasukan (BKM) */}
        <button
          type="button"
          onClick={() => navigate('/cooperative/cash-bank?action=deposit')}
          className="group relative flex items-center justify-between p-3.5 bg-gradient-to-br from-emerald-50/90 to-emerald-100/40 dark:from-emerald-950/30 dark:to-emerald-900/10 border border-emerald-200/80 dark:border-emerald-900/50 rounded-2xl hover:shadow-md hover:border-emerald-300 dark:hover:border-emerald-700 transition-all text-left"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
              <ArrowUpRight size={20} className="stroke-[2.5]" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block">
                Uang Masuk
              </span>
              <span className="text-xs font-black text-slate-800 dark:text-slate-100 block">
                Catat Penerimaan
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                Sewa, pendapatan lain (BKM)
              </span>
            </div>
          </div>
          <span className="text-emerald-500 dark:text-emerald-400 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all">
            <ChevronRight size={18} />
          </span>
        </button>

        {/* Tombol Pindah Kas/Bank (Transfer) */}
        <button
          type="button"
          onClick={() => navigate('/cooperative/cash-bank?action=transfer')}
          className="group relative flex items-center justify-between p-3.5 bg-gradient-to-br from-sky-50/90 to-sky-100/40 dark:from-sky-950/30 dark:to-sky-900/10 border border-sky-200/80 dark:border-sky-900/50 rounded-2xl hover:shadow-md hover:border-sky-300 dark:hover:border-sky-700 transition-all text-left"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-600 text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
              <ArrowRightLeft size={20} className="stroke-[2.5]" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400 block">
                Mutasi Rekening
              </span>
              <span className="text-xs font-black text-slate-800 dark:text-slate-100 block">
                Pindah Kas & Bank
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                Setor / tarik kas tunai
              </span>
            </div>
          </div>
          <span className="text-sky-500 dark:text-sky-400 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all">
            <ChevronRight size={18} />
          </span>
        </button>

        {/* Tombol Buka Laporan Resmi */}
        <button
          type="button"
          onClick={() => onSelectTab('income-statement')}
          className="group relative flex items-center justify-between p-3.5 bg-gradient-to-br from-indigo-50/90 to-indigo-100/40 dark:from-indigo-950/30 dark:to-indigo-900/10 border border-indigo-200/80 dark:border-indigo-900/50 rounded-2xl hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-700 transition-all text-left"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
              <Printer size={20} className="stroke-[2.5]" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 block">
                Output Resmi
              </span>
              <span className="text-xs font-black text-slate-800 dark:text-slate-100 block">
                Laporan Keuangan
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                PHU, Neraca, Arus Kas
              </span>
            </div>
          </div>
          <span className="text-indigo-500 dark:text-indigo-400 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all">
            <ChevronRight size={18} />
          </span>
        </button>
      </div>

      {/* ─── PETA ALUR SIKLUS KERJA (INTERACTIVE WORKFLOW LIFECYCLE) ─── */}
      <div className="bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
        {/* Header Toggle Alur */}
        <div className="px-4 py-2.5 bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-200/60 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles size={15} className="text-indigo-500 animate-pulse" />
            <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
              Peta Alur Siklus Akuntansi Koperasi
            </span>
            <span className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-semibold bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400 rounded-md">
              Panduan Pemula (3 Langkah Kerja)
            </span>
          </div>

          <button
            type="button"
            onClick={() => setIsExpanded(prev => !prev)}
            className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
          >
            <span>{isExpanded ? 'Sembunyikan Alur' : 'Buka Alur Kerja'}</span>
            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>

        {/* Content Alur 3 Langkah */}
        {isExpanded && (
          <div className="p-3.5 sm:p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 relative">
              
              {/* ─── LANGKAH 1: INPUT TRANSAKSI ─── */}
              <div className="flex flex-col p-3 rounded-xl bg-slate-50/60 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-200/50 dark:border-slate-800">
                  <div className="flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-black text-[10px] flex items-center justify-center">
                      1
                    </span>
                    <span className="text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-200">
                      Transaksi Uang Masuk / Keluar
                    </span>
                  </div>
                  <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded">
                    Input Data
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  Catat bukti kas keluar operasional, penerimaan kas, mutasi bank, dan rekap potongan gaji.
                </p>

                <div className="space-y-1.5 pt-1">
                  <button
                    type="button"
                    onClick={() => navigate('/cooperative/cash-bank')}
                    className="w-full flex items-center justify-between p-2 rounded-lg text-left transition-all bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-indigo-400 group/btn"
                  >
                    <div className="flex items-center gap-2">
                      <Receipt size={14} className="text-rose-500 group-hover/btn:scale-110 transition-transform" />
                      <span className="text-xs font-semibold">Kas & Bank (BKK / BKM)</span>
                    </div>
                    <span className="text-[9px] text-indigo-600 dark:text-indigo-400 font-bold bg-indigo-50 dark:bg-indigo-950/40 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                      Buka ➔
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onSelectTab('payroll')}
                    className={`w-full flex items-center justify-between p-2 rounded-lg text-left transition-all ${
                      activeTab === 'payroll'
                        ? 'bg-indigo-600 text-white font-bold shadow-xs'
                        : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-indigo-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Calendar size={14} className={activeTab === 'payroll' ? 'text-white' : 'text-sky-500'} />
                      <span className="text-xs font-semibold">Rekap Potongan Gaji</span>
                    </div>
                    <span className={`text-[9px] ${activeTab === 'payroll' ? 'text-indigo-100' : 'text-slate-400'}`}>
                      Bulanan
                    </span>
                  </button>
                </div>
              </div>

              {/* ─── LANGKAH 2: PEMBUKUAN OTOMATIS ─── */}
              <div className="flex flex-col p-3 rounded-xl bg-slate-50/60 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-200/50 dark:border-slate-800">
                  <div className="flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-black text-[10px] flex items-center justify-center">
                      2
                    </span>
                    <span className="text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-200">
                      Pencatatan Otomatis
                    </span>
                  </div>
                  <span className="text-[9px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-1.5 py-0.5 rounded">
                    Sistem Otomatis
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  Sistem otomatis mencatat Debit/Kredit, menghitung saldo berjalan, dan merangkum neraca saldo.
                </p>

                <div className="space-y-1.5 pt-1">
                  <button
                    type="button"
                    onClick={() => onSelectTab('coa')}
                    className={`w-full flex items-center justify-between p-2 rounded-lg text-left transition-all ${
                      activeTab === 'coa'
                        ? 'bg-indigo-600 text-white font-bold shadow-xs'
                        : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-indigo-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <FolderTree size={14} className={activeTab === 'coa' ? 'text-white' : 'text-emerald-500'} />
                      <span className="text-xs font-semibold">Bagan Akun (COA)</span>
                    </div>
                    <span className={`text-[9px] ${activeTab === 'coa' ? 'text-indigo-100' : 'text-slate-400'}`}>
                      Hierarki
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onSelectTab('ledger')}
                    className={`w-full flex items-center justify-between p-2 rounded-lg text-left transition-all ${
                      activeTab === 'ledger'
                        ? 'bg-indigo-600 text-white font-bold shadow-xs'
                        : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-indigo-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <BookOpen size={14} className={activeTab === 'ledger' ? 'text-white' : 'text-indigo-500'} />
                      <span className="text-xs font-semibold">Buku Besar per Rekening</span>
                    </div>
                    <span className={`text-[9px] ${activeTab === 'ledger' ? 'text-indigo-100' : 'text-slate-400'}`}>
                      Saldo Kas
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onSelectTab('journal')}
                    className={`w-full flex items-center justify-between p-2 rounded-lg text-left transition-all ${
                      activeTab === 'journal'
                        ? 'bg-indigo-600 text-white font-bold shadow-xs'
                        : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-indigo-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <FileText size={14} className={activeTab === 'journal' ? 'text-white' : 'text-slate-500'} />
                      <span className="text-xs font-semibold">Jurnal Umum Transaksi</span>
                    </div>
                    <span className={`text-[9px] ${activeTab === 'journal' ? 'text-indigo-100' : 'text-slate-400'}`}>
                      Audit Trail
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onSelectTab('balance')}
                    className={`w-full flex items-center justify-between p-2 rounded-lg text-left transition-all ${
                      activeTab === 'balance'
                        ? 'bg-indigo-600 text-white font-bold shadow-xs'
                        : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-indigo-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <FileSpreadsheet size={14} className={activeTab === 'balance' ? 'text-white' : 'text-amber-500'} />
                      <span className="text-xs font-semibold">Neraca Saldo Koperasi</span>
                    </div>
                    <span className={`text-[9px] ${activeTab === 'balance' ? 'text-indigo-100' : 'text-slate-400'}`}>
                      Kontrol
                    </span>
                  </button>
                </div>
              </div>

              {/* ─── LANGKAH 3: LAPORAN RESMI SIAP CETAK ─── */}
              <div className="flex flex-col p-3 rounded-xl bg-slate-50/60 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-200/50 dark:border-slate-800">
                  <div className="flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-black text-[10px] flex items-center justify-center">
                      3
                    </span>
                    <span className="text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-200">
                      Laporan Resmi (Siap Cetak)
                    </span>
                  </div>
                  <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.5 rounded">
                    Output RAT/Pimpinan
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  Laporan formal berstandar akuntansi lengkap dengan kop surat dan lembar tanda tangan pengurus.
                </p>

                <div className="space-y-1.5 pt-1">
                  <button
                    type="button"
                    onClick={() => onSelectTab('income-statement')}
                    className={`w-full flex items-center justify-between p-2 rounded-lg text-left transition-all ${
                      activeTab === 'income-statement'
                        ? 'bg-indigo-600 text-white font-bold shadow-xs'
                        : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-indigo-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <TrendingUp size={14} className={activeTab === 'income-statement' ? 'text-white' : 'text-emerald-500'} />
                      <span className="text-xs font-semibold">Laba Rugi (PHU / SHU)</span>
                    </div>
                    <span className={`text-[9px] ${activeTab === 'income-statement' ? 'text-indigo-100' : 'text-slate-400'}`}>
                      Keuntungan
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onSelectTab('neraca')}
                    className={`w-full flex items-center justify-between p-2 rounded-lg text-left transition-all ${
                      activeTab === 'neraca'
                        ? 'bg-indigo-600 text-white font-bold shadow-xs'
                        : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-indigo-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Scale size={14} className={activeTab === 'neraca' ? 'text-white' : 'text-indigo-500'} />
                      <span className="text-xs font-semibold">Neraca (Posisi Keuangan)</span>
                    </div>
                    <span className={`text-[9px] ${activeTab === 'neraca' ? 'text-indigo-100' : 'text-slate-400'}`}>
                      Kekayaan
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onSelectTab('cash-flow')}
                    className={`w-full flex items-center justify-between p-2 rounded-lg text-left transition-all ${
                      activeTab === 'cash-flow'
                        ? 'bg-indigo-600 text-white font-bold shadow-xs'
                        : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-indigo-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Activity size={14} className={activeTab === 'cash-flow' ? 'text-white' : 'text-sky-500'} />
                      <span className="text-xs font-semibold">Arus Kas (Cash Flow)</span>
                    </div>
                    <span className={`text-[9px] ${activeTab === 'cash-flow' ? 'text-indigo-100' : 'text-slate-400'}`}>
                      Uang Riil
                    </span>
                  </button>
                </div>
              </div>

            </div>
          </div>
        )}
      </div>
    </div>
  );
});

AccountingWorkflowHeader.displayName = 'AccountingWorkflowHeader';
