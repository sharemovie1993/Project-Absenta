import React from 'react';
import { useIsMobile } from '../../../hooks/useIsMobile';

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
            <div className="p-8 text-center text-slate-400 font-bold uppercase tracking-wider text-xs">
                Belum ada jurnal entri.
            </div>
        );
    }

    if (isMobile) {
        return (
            <div className="p-4 space-y-3">
                {journals.map((journal) => (
                    <div
                        key={journal.id}
                        className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3"
                    >
                        <div className="flex items-start justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
                            <div>
                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                                    {new Date(journal.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                                </span>
                                <h4 className="font-bold text-xs text-slate-800 dark:text-slate-100 mt-0.5">{journal.description}</h4>
                            </div>
                            <span className="px-2 py-0.5 text-[9px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-md shrink-0">
                                {journal.reference}
                            </span>
                        </div>

                        <div className="space-y-2">
                            {journal.items?.map((item) => (
                                <div
                                    key={item.id}
                                    className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl flex items-center justify-between text-xs gap-2"
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
                                            <span className="font-mono text-[10px] text-slate-400">{item.account?.code}</span>
                                        </div>
                                        <p className="font-semibold text-slate-700 dark:text-slate-200 text-xs mt-0.5 truncate">
                                            {item.account?.name}
                                        </p>
                                    </div>
                                    <span className="font-black text-xs text-slate-800 dark:text-slate-100 shrink-0">
                                        Rp {Math.round(Number(item.amount)).toLocaleString('id-ID')}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
                <thead>
                    <tr className="bg-slate-50 dark:bg-slate-955 border-b border-slate-100 dark:border-slate-850 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                        <th className="p-4">Tanggal</th>
                        <th className="p-4">Keterangan</th>
                        <th className="p-4 text-center">Ref</th>
                        <th className="p-4">Akun</th>
                        <th className="p-4 text-right">Debit</th>
                        <th className="p-4 text-right">Kredit</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
                    {journals.map((journal) => (
                        <React.Fragment key={journal.id}>
                            {journal?.items?.map((item, idx) => (
                                <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-955/20 transition-colors">
                                    {idx === 0 && (
                                        <>
                                            <td className="p-4 font-semibold text-slate-600" rowSpan={journal.items?.length || 1}>
                                                {new Date(journal.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                                            </td>
                                            <td className="p-4" rowSpan={journal.items?.length || 1}>
                                                <p className="font-bold text-slate-800 dark:text-slate-100">{journal.description}</p>
                                            </td>
                                            <td className="p-4 text-center font-mono text-slate-500 font-bold" rowSpan={journal.items?.length || 1}>
                                                {journal.reference}
                                            </td>
                                        </>
                                    )}
                                    <td className={`p-4 font-semibold text-slate-700 dark:text-slate-350 ${item.type === 'CREDIT' ? 'pl-8 text-indigo-650 dark:text-indigo-400' : ''}`}>
                                        {item.account?.code} - {item.account?.name}
                                    </td>
                                    <td className="p-4 text-right font-black text-slate-800 dark:text-slate-200">
                                        {item.type === 'DEBIT' ? `Rp ${Math.round(Number(item.amount)).toLocaleString('id-ID')}` : '-'}
                                    </td>
                                    <td className="p-4 text-right font-black text-slate-800 dark:text-slate-200">
                                        {item.type === 'CREDIT' ? `Rp ${Math.round(Number(item.amount)).toLocaleString('id-ID')}` : '-'}
                                    </td>
                                </tr>
                            ))}
                        </React.Fragment>
                    ))}
                </tbody>
            </table>
        </div>
    );
});

JournalTable.displayName = 'JournalTable';
