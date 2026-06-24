import React from 'react';

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
                    {!journals || journals.length === 0 ? (
                        <tr>
                            <td colSpan={6} className="p-8 text-center text-slate-450 font-bold uppercase tracking-wider">Belum ada jurnal entri.</td>
                        </tr>
                    ) : (
                        journals?.map((journal) => (
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
                        ))
                    )}
                </tbody>
            </table>
        </div>
    );
});

JournalTable.displayName = 'JournalTable';
