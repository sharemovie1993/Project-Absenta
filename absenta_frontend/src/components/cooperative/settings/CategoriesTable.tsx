import React from 'react';
import { Plus, Edit, Trash2, Eye, EyeOff } from 'lucide-react';
import { Button } from '../../ui';
import type { SavingCategory } from './types';

interface CategoriesTableProps {
  categories: SavingCategory[];
  loadingCategories: boolean;
  onToggleActive: (id: string) => void;
  onEdit: (cat: SavingCategory) => void;
  onDelete: (id: string) => void;
  onOpenCreate: () => void;
  canEditCategories: boolean;
}

export const CategoriesTable: React.FC<CategoriesTableProps> = ({
  categories,
  loadingCategories,
  onToggleActive,
  onEdit,
  onDelete,
  onOpenCreate,
  canEditCategories
}) => {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">Kategori Simpanan Koperasi</h3>
          <p className="text-xs text-slate-400">Daftar jenis simpanan yang berlaku di koperasi saat ini</p>
        </div>
        {canEditCategories && (
          <Button
            onClick={onOpenCreate}
            size="sm"
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold flex items-center gap-1.5 rounded-xl text-xs"
          >
            <Plus size={14} /> Tambah Jenis Simpanan
          </Button>
        )}
      </div>

      {loadingCategories ? (
        <div className="flex items-center justify-center min-h-[200px]">
          <div className="w-8 h-8 border-4 border-indigo-600/20 border-t-indigo-600 rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="border border-slate-150 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-100 dark:border-slate-850 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                  <th className="p-4 w-12 text-center">No</th>
                  <th className="p-4">Kode / Jenis Simpanan</th>
                  <th className="p-4 text-center">Akun Jurnal</th>
                  <th className="p-4 text-center">Mandatori (Bulanan)?</th>
                  <th className="p-4 text-center">Bisa Ditarik?</th>
                  <th className="p-4 text-center">Masuk SHU?</th>
                  <th className="p-4 text-center">Status</th>
                  {canEditCategories && <th className="p-4 text-center">Aksi</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-850 text-xs">
                {categories.length === 0 ? (
                  <tr>
                    <td colSpan={canEditCategories ? 8 : 7} className="p-8 text-center text-slate-400 font-bold uppercase tracking-wider">
                      Belum ada kategori simpanan kustom
                    </td>
                  </tr>
                ) : (
                  categories?.map((cat, idx) => (
                    <tr key={cat.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/20 transition-colors">
                      <td className="p-4 text-center font-bold text-slate-400">{idx + 1}</td>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <span 
                            className="w-3 h-3 rounded-full shrink-0 shadow-sm border border-black/10" 
                            style={{ backgroundColor: cat.color || '#6B7280' }}
                          />
                          <div>
                            <p className="font-bold text-slate-800 dark:text-slate-100">{cat.name}</p>
                            <span className="inline-block px-1.5 py-0.5 mt-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 font-mono text-[9px] font-black rounded uppercase">
                              {cat.code}
                            </span>
                            {cat.defaultAmount && (
                              <p className="text-[10px] text-indigo-500 font-medium mt-0.5">
                                Default: Rp {cat.defaultAmount.toLocaleString('id-ID')}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-center font-mono text-slate-500 font-bold">{cat.accountCode}</td>
                      <td className="p-4 text-center">
                        <span className={`inline-block px-2 py-0.5 text-[9px] font-bold rounded-full ${
                          cat.isMandatory 
                            ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/30 dark:text-indigo-400' 
                            : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                        }`}>
                          {cat.isMandatory ? 'YA (Wajib)' : 'TIDAK'}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <div>
                          <span className={`inline-block px-2 py-0.5 text-[9px] font-bold rounded-full ${
                            cat.isWithdrawable 
                              ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400' 
                              : 'bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400'
                          }`}>
                            {cat.isWithdrawable ? 'BISA' : 'TIDAK'}
                          </span>
                          {cat.withdrawRule && (
                            <p className="text-[9px] text-slate-400 mt-0.5 font-bold uppercase tracking-tight">
                              {cat.withdrawRule}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        <span className={`inline-block px-2 py-0.5 text-[9px] font-bold rounded-full ${
                          cat.isIncludedInShu 
                            ? 'bg-blue-50 text-blue-650 dark:bg-blue-950/30 dark:text-blue-450' 
                            : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                        }`}>
                          {cat.isIncludedInShu ? 'Dihitung SHU' : 'Bukan SHU'}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <button
                          onClick={() => onToggleActive(cat.id)}
                          disabled={!canEditCategories}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider transition-all border ${
                            cat.isActive
                              ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/20'
                              : 'bg-slate-100 text-slate-400 border-slate-200 dark:bg-slate-800 dark:border-slate-700 hover:bg-slate-200/50'
                          } ${!canEditCategories ? 'opacity-70 cursor-not-allowed' : ''}`}
                          title={!canEditCategories ? 'Aksi tidak diizinkan' : (cat.isActive ? 'Klik untuk nonaktifkan' : 'Klik untuk aktifkan')}
                        >
                          {cat.isActive ? (
                            <>
                              <Eye size={10} /> Aktif
                            </>
                          ) : (
                            <>
                              <EyeOff size={10} /> Nonaktif
                            </>
                          )}
                        </button>
                      </td>
                      {canEditCategories && (
                        <td className="p-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <Button
                              onClick={() => onEdit(cat)}
                              size="xs"
                              variant="outline"
                              className="text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 font-bold inline-flex items-center gap-1 text-[10px]"
                            >
                              <Edit size={10} /> Edit
                            </Button>
                            
                            <Button
                              onClick={() => onToggleActive(cat.id)}
                              size="xs"
                              variant="outline"
                              className={`font-bold inline-flex items-center gap-1 text-[10px] ${
                                cat.isActive 
                                  ? 'text-amber-600 hover:bg-amber-55 dark:text-amber-400 dark:hover:bg-amber-950/20' 
                                  : 'text-emerald-600 hover:bg-emerald-55 dark:text-emerald-400 dark:hover:bg-emerald-950/20'
                              }`}
                              title={cat.isActive ? 'Nonaktifkan kategori' : 'Aktifkan kategori'}
                            >
                              {cat.isActive ? <EyeOff size={10} /> : <Eye size={10} />}
                              {cat.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                            </Button>

                            <Button
                              onClick={() => onDelete(cat.id)}
                              size="xs"
                              variant="outline"
                              className="text-red-650 hover:bg-red-55 dark:text-red-405 dark:hover:bg-red-950/20 font-bold inline-flex items-center gap-1 text-[10px]"
                            >
                              <Trash2 size={10} /> Hapus
                            </Button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
