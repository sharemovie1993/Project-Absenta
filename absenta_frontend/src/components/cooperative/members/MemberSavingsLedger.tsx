import React from 'react';
import type { Saving, Transaction } from './types';

interface MemberSavingsLedgerProps {
  savings?: Saving[];
}

const formatIndonesianDateTime = (dateInput: Date | string | number | undefined | null): string => {
  if (!dateInput) return '-';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '-';
  
  const day = String(d.getDate()).padStart(2, '0');
  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  
  return `${day} ${month} ${year}, ${hours}:${minutes}`;
};

export const MemberSavingsLedger: React.FC<MemberSavingsLedgerProps> = ({ savings }) => {
  // Extract and flat all transactions with dynamic association to their parent saving types
  const ledgerTransactions: Transaction[] = React.useMemo(() => {
    if (!savings) return [];
    return savings
      .flatMap(s => 
        (s.transactions || []).map(t => ({
          ...t,
          savingType: s.type
        }))
      )
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10);
  }, [savings]);

  return (
    <div className="space-y-3 pt-2">
      <h5 className="text-xs font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800/80 pb-2">
        Mutasi Rekening & Riwayat Transaksi
      </h5>
      
      <div className="max-h-40 overflow-y-auto border border-slate-100 dark:border-slate-800 rounded-xl">
        <table className="w-full text-left border-collapse text-[11px]">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 text-[10px] font-black text-slate-400 uppercase tracking-wider">
              <th className="p-2">Tanggal</th>
              <th className="p-2">Tabungan</th>
              <th className="p-2">Tipe</th>
              <th className="p-2 text-right">Nominal</th>
              <th className="p-2">Keterangan</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {ledgerTransactions.length > 0 ? (
              ledgerTransactions.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                  <td className="p-2 text-slate-500 font-medium">
                    {formatIndonesianDateTime(t.date)}
                  </td>
                  <td className="p-2 font-bold text-slate-700 dark:text-slate-300">
                    {t.savingType}
                  </td>
                  <td className="p-2">
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black tracking-wide uppercase ${
                      t.type === 'DEPOSIT' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                      t.type === 'WITHDRAWAL' ? 'bg-rose-100 text-rose-800 border border-rose-200' :
                      t.type === 'INTEREST' ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                      'bg-amber-100 text-amber-800 border border-amber-200'
                    }`}>
                      {t.type === 'DEPOSIT' ? 'SETOR' :
                       t.type === 'WITHDRAWAL' ? 'TARIK' :
                       t.type === 'INTEREST' ? 'BUNGA' : 'BIAYA'}
                    </span>
                  </td>
                  <td className={`p-2 text-right font-black ${
                    t.type === 'DEPOSIT' || t.type === 'INTEREST' ? 'text-emerald-600' : 'text-rose-600'
                  }`}>
                    {t.type === 'DEPOSIT' || t.type === 'INTEREST' ? '+' : '-'}Rp {Number(t.amount).toLocaleString('id-ID')}
                  </td>
                  <td className="p-2 text-slate-500 max-w-[120px] truncate" title={t.description || '-'}>
                    {t.description || '-'}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="p-4 text-center text-slate-400 italic">
                  Belum ada riwayat transaksi tabungan.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
