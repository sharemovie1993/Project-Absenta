import React from 'react';
import { useIsMobile } from '../../../hooks/useIsMobile';
import { 
  formatAccountingReference, 
  humanizeAccountingDescription 
} from '@/utils/cooperative/accountingFormatters';
import { CheckCircle2 } from 'lucide-react';

interface JournalItem {
  id: string;
  type: 'DEBIT' | 'CREDIT';
  amount: string;
  account: {
    code: string;
    name: string;
  };
}

interface JournalEntry {
  id: string;
  date: string;
  description: string;
  reference: string;
  items: JournalItem[];
}

interface JournalTableProps {
  journals: JournalEntry[];
}

export const JournalTable = React.memo<JournalTableProps>(({ journals }) => {
  const isMobile = useIsMobile();

  if (!journals || journals.length === 0) {
    return (
      <div className="p-12 text-center text-slate-400 font-bold uppercase tracking-wider text-xs">
        Belum ada jurnal entri pada periode ini.
      </div>
    );
  }

  if (isMobile) {
    return (
      <div className="p-4 space-y-3">
        {journals.map((journal) => {
          const ref = formatAccountingReference(journal.reference);
          const desc = humanizeAccountingDescription(journal.description);
          const totalDebit = journal.items?.filter(i => i.type === 'DEBIT').reduce((acc, curr) => acc + Number(curr.amount || 0), 0) || 0;

          return (
            <div
              key={journal.id}
              className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3"
            >
              <div className="flex items-start justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
                <div>
                  <span className="text-[10px] text-slate-400 font-mono font-bold uppercase tracking-wider">
                    {new Date(journal.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </span>
                  <h4 className="font-bold text-xs text-slate-800 dark:text-slate-100 mt-0.5">{desc}</h4>
                </div>
                <span 
                  className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded-lg border shrink-0 ${ref.badgeClass}`}
                  title={ref.full}
                >
                  {ref.label}
                </span>
              </div>

              <div className="space-y-1.5">
                {journal.items?.map((item) => (
                  <div
                    key={item.id}
                    className={`p-2 rounded-xl flex items-center justify-between text-xs gap-2 ${
                      item.type === 'DEBIT' 
                        ? 'bg-slate-50 dark:bg-slate-800/60' 
                        : 'bg-slate-50/40 dark:bg-slate-800/30 pl-4 border-l-2 border-indigo-400 dark:border-indigo-500'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className={`px-1.5 py-0.2 text-[8px] font-black rounded uppercase ${
                          item.type === 'DEBIT'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300'
                        }`}>
                          {item.type}
                        </span>
                        <span className="font-mono text-[10px] text-slate-500 dark:text-slate-400 font-semibold">{item.account?.code}</span>
                      </div>
                      <p className="font-medium text-slate-700 dark:text-slate-200 text-xs mt-0.5 truncate">
                        {item.account?.name}
                      </p>
                    </div>
                    <span className="font-mono font-bold text-xs text-slate-900 dark:text-slate-100 shrink-0">
                      Rp {Math.round(Number(item.amount)).toLocaleString('id-ID')}
                    </span>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between pt-1 text-[10px] text-slate-400 font-medium border-t border-slate-100 dark:border-slate-800/60">
                <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold">
                  <CheckCircle2 size={11} /> Seimbang
                </span>
                <span className="font-mono font-bold text-slate-600 dark:text-slate-300">
                  Rp {Math.round(totalDebit).toLocaleString('id-ID')}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse text-xs">
        <thead>
          <tr className="bg-slate-50 dark:bg-slate-955 border-b border-slate-200/80 dark:border-slate-800 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            <th className="p-3.5 w-28">Tanggal</th>
            <th className="p-3.5 min-w-[220px]">Keterangan Transaksi</th>
            <th className="p-3.5 w-32 text-center">No. Referensi</th>
            <th className="p-3.5 min-w-[280px]">Nama Akun (COA)</th>
            <th className="p-3.5 w-36 text-right">Debit (Rp)</th>
            <th className="p-3.5 w-36 text-right">Kredit (Rp)</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
          {journals.map((journal, jIdx) => {
            const ref = formatAccountingReference(journal.reference);
            const desc = humanizeAccountingDescription(journal.description);
            const itemsCount = journal.items?.length || 1;
            const isEvenVoucher = jIdx % 2 === 0;

            return (
              <React.Fragment key={journal.id}>
                {journal.items?.map((item, idx) => {
                  const isFirstRow = idx === 0;
                  const isLastRow = idx === itemsCount - 1;

                  return (
                    <tr 
                      key={item.id} 
                      className={`transition-colors ${
                        isEvenVoucher 
                          ? 'bg-white dark:bg-slate-900/60' 
                          : 'bg-slate-50/50 dark:bg-slate-900/30'
                      } ${isFirstRow ? 'border-t-2 border-slate-200/90 dark:border-slate-800' : ''}`}
                    >
                      {/* Tanggal, Keterangan, Ref di-span sepanjang jumlah baris akun */}
                      {isFirstRow && (
                        <>
                          <td 
                            className="p-3.5 font-mono text-xs font-semibold text-slate-600 dark:text-slate-400 align-top"
                            rowSpan={itemsCount}
                          >
                            {new Date(journal.date).toLocaleDateString('id-ID', { 
                              day: '2-digit', 
                              month: 'short', 
                              year: 'numeric' 
                            })}
                          </td>

                          <td 
                            className="p-3.5 align-top"
                            rowSpan={itemsCount}
                          >
                            <p className="font-bold text-xs text-slate-900 dark:text-slate-100 leading-snug">
                              {desc}
                            </p>
                          </td>

                          <td 
                            className="p-3.5 text-center align-top"
                            rowSpan={itemsCount}
                          >
                            <span 
                              className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[11px] font-mono font-bold border shadow-2xs ${ref.badgeClass}`}
                              title={`Referensi Sistem: ${ref.full}`}
                            >
                              {ref.label}
                            </span>
                          </td>
                        </>
                      )}

                      {/* Baris Akun dengan Indensasi Standar Akuntansi */}
                      <td className="p-3.5 align-middle">
                        {item.type === 'CREDIT' ? (
                          <div className="flex items-center gap-2 pl-7 sm:pl-8 text-slate-600 dark:text-slate-300">
                            <span className="text-indigo-400 dark:text-indigo-500 font-mono text-xs font-bold select-none">↳</span>
                            <span className="font-mono text-[11px] font-bold text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-1.5 py-0.2 rounded border border-indigo-200/60 dark:border-indigo-800/60">
                              {item.account?.code}
                            </span>
                            <span className="font-medium text-xs text-slate-700 dark:text-slate-300">
                              {item.account?.name}
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-slate-100">
                            <span className="font-mono text-[11px] text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.2 rounded border border-emerald-200/60 dark:border-emerald-800/60">
                              {item.account?.code}
                            </span>
                            <span className="text-xs">
                              {item.account?.name}
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Nominal Debit (Rata Kanan) */}
                      <td className="p-3.5 text-right font-mono text-xs align-middle">
                        {item.type === 'DEBIT' ? (
                          <span className="font-bold text-slate-900 dark:text-slate-100">
                            Rp {Math.round(Number(item.amount)).toLocaleString('id-ID')}
                          </span>
                        ) : (
                          <span className="text-slate-300 dark:text-slate-700 select-none">-</span>
                        )}
                      </td>

                      {/* Nominal Kredit (Rata Kanan) */}
                      <td className="p-3.5 text-right font-mono text-xs align-middle">
                        {item.type === 'CREDIT' ? (
                          <span className="font-bold text-slate-900 dark:text-slate-100">
                            Rp {Math.round(Number(item.amount)).toLocaleString('id-ID')}
                          </span>
                        ) : (
                          <span className="text-slate-300 dark:text-slate-700 select-none">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
});

JournalTable.displayName = 'JournalTable';
