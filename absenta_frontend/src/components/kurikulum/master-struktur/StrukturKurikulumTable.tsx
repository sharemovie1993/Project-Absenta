import React from 'react';
import { Settings, Trash2, BookOpen } from 'lucide-react';
import { Skeleton } from '../../ui/Skeleton';
import { Button } from '../../ui/Button';
import { Badge } from '../../ui/Badge';
import type { Mapel } from '../../../types/academic';

import { StrukturKurikulum } from '../../../utils/kurikulum/masterStrukturHelper';

interface TableProps {
  isLoadingMapping: boolean;
  mappingFiltered: StrukturKurikulum[];
  selectedRowIds: Set<string>;
  handleSelectAllRows: (checked: boolean) => void;
  handleToggleRowSelect: (id: string) => void;
  standardReferences: any;
  openEditModal: (item: StrukturKurikulum) => void;
  handleDelete: (id: string) => void;
  openCreateModal: () => void;
}

export const StrukturKurikulumTable: React.FC<TableProps> = ({
  isLoadingMapping,
  mappingFiltered,
  selectedRowIds,
  handleSelectAllRows,
  handleToggleRowSelect,
  standardReferences,
  openEditModal,
  handleDelete,
  openCreateModal
}) => {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <thead className="bg-slate-50 dark:bg-slate-800/50 text-gray-400 text-[10px] font-black uppercase tracking-widest border-b border-gray-100 dark:border-gray-800">
          <tr>
            <th className="px-4 py-4 w-10 text-center">
              <input 
                type="checkbox"
                checked={mappingFiltered && mappingFiltered.length > 0 && selectedRowIds.size === mappingFiltered.length}
                onChange={(e) => handleSelectAllRows(e.target.checked)}
                className="rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500"
              />
            </th>
            <th className="px-6 py-4">Kelompok</th>
            <th className="px-6 py-4">Mata Pelajaran</th>
            <th className="px-6 py-4 text-center">Beban (JP)</th>
            <th className="px-6 py-4 text-right">Aksi</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
          {isLoadingMapping ? (
            [1, 2, 3, 4, 5].map(i => (
              <tr key={i}>
                <td className="px-6 py-4" colSpan={5}><Skeleton className="h-10 w-full rounded-lg" /></td>
              </tr>
            ))
          ) : !mappingFiltered || mappingFiltered.length === 0 ? (
            <tr>
              <td className="px-6 py-20 text-center" colSpan={5}>
                <div className="flex flex-col items-center justify-center space-y-3 opacity-30">
                  <BookOpen size={48} />
                  <p className="text-sm font-bold">Belum ada data struktur kurikulum untuk tingkat ini</p>
                  <Button 
                    variant="outline" 
                    onClick={openCreateModal}
                    className="mt-4"
                  >
                    Tambah Pemetaan Sekarang
                  </Button>
                </div>
              </td>
            </tr>
          ) : (
            mappingFiltered.map((item: StrukturKurikulum) => {
              const isRowChecked = selectedRowIds.has(item.id);
              return (
                <tr key={item.id} className={`group transition-colors ${
                  isRowChecked 
                  ? 'bg-indigo-55/10 dark:bg-indigo-950/20' 
                  : 'hover:bg-indigo-50/30 dark:hover:bg-indigo-900/10'
                }`}>
                  <td className="px-4 py-4 text-center">
                    <input 
                      type="checkbox"
                      checked={isRowChecked}
                      onChange={() => handleToggleRowSelect(item.id)}
                      className="rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500"
                    />
                  </td>
                  <td className="px-6 py-4">
                    {(() => {
                      const k = (item.kelompok || 'MATA PELAJARAN UMUM').toUpperCase();
                      if (k === 'MATA PELAJARAN UMUM') {
                        return (
                          <span className="text-[9px] font-black tracking-wider uppercase bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-450 border border-blue-100 dark:border-blue-900/40 px-2.5 py-1 rounded-lg select-none">
                            Umum
                          </span>
                        );
                      }
                      if (k === 'MATA PELAJARAN KEJURUAN') {
                        return (
                          <span className="text-[9px] font-black tracking-wider uppercase bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-450 border border-emerald-100 dark:border-emerald-900/40 px-2.5 py-1 rounded-lg select-none">
                            Kejuruan
                          </span>
                        );
                      }
                      if (k === 'MATA PELAJARAN PILIHAN') {
                        return (
                          <span className="text-[9px] font-black tracking-wider uppercase bg-violet-50 dark:bg-violet-950/30 text-violet-650 dark:text-violet-400 border border-violet-100 dark:border-violet-900/40 px-2.5 py-1 rounded-lg select-none">
                            Pilihan
                          </span>
                        );
                      }
                      if (k === 'MUATAN LOKAL') {
                        return (
                          <span className="text-[9px] font-black tracking-wider uppercase bg-amber-50 dark:bg-amber-950/30 text-amber-650 dark:text-amber-400 border border-amber-100 dark:border-amber-900/40 px-2.5 py-1 rounded-lg select-none">
                            Mulok
                          </span>
                        );
                      }
                      return (
                        <span className="text-[9px] font-black tracking-wider uppercase bg-slate-50 dark:bg-slate-900/30 text-slate-650 dark:text-slate-400 border border-slate-100 dark:border-slate-900/40 px-2.5 py-1 rounded-lg select-none">
                          {item.kelompok}
                        </span>
                      );
                    })()}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-bold text-gray-900 dark:text-white">{item.Mapel?.nama_mapel}</p>
                        <p className="text-[10px] font-mono text-gray-400">{item.Mapel?.kode_mapel}</p>
                      </div>
                      {(() => {
                        if (!standardReferences?.data) return null;
                        const code = (item.Mapel?.kode_mapel || '').toUpperCase();
                        const name = (item.Mapel?.nama_mapel || '').toLowerCase();
                        
                        let match = standardReferences.data.find((ref: any) => 
                          ref.tingkat === item.tingkat && 
                          (ref.kode_mapel || '').toUpperCase() === code
                        );
                        
                        if (!match) {
                          const cleanCode = code.split('-')[0];
                          match = standardReferences.data.find((ref: any) => 
                            ref.tingkat === item.tingkat && 
                            (ref.kode_mapel || '').toUpperCase() === cleanCode
                          );
                        }
                        
                        if (!match) {
                          match = standardReferences.data.find((ref: any) => 
                            ref.tingkat === item.tingkat && 
                            (
                              name.includes(ref.nama_mapel.toLowerCase()) || 
                              ref.nama_mapel.toLowerCase().includes(name)
                            )
                          );
                        }
                        
                        if (!match) {
                          const isReligion = name.startsWith('pendidikan agama') || name.includes('agama');
                          const isSeniOrPrakarya = name.includes('seni ') || name.includes('seni') || name.includes('prakarya');
                          const isMulok = (item.kelompok || '').toUpperCase() === 'MUATAN LOKAL' || ['sunda', 'jawa', 'bali', 'madura'].some(lang => name.includes(lang));
                          
                          if (isReligion) {
                            match = standardReferences.data.find((ref: any) => ref.tingkat === item.tingkat && (ref.kode_mapel === 'PAI' || (ref.nama_mapel || '').toLowerCase().includes('agama')));
                          } else if (isSeniOrPrakarya) {
                            match = standardReferences.data.find((ref: any) => ref.tingkat === item.tingkat && (ref.kode_mapel === 'SENI' || (ref.nama_mapel || '').toLowerCase().includes('seni')));
                          } else if (isMulok) {
                            match = standardReferences.data.find((ref: any) => ref.tingkat === item.tingkat && ref.kode_mapel === 'MULOK');
                          }
                        }
                        
                        if (!match) {
                          const isKejuruan = code.includes('PKL') || code.includes('PKK') || code.includes('DAS-') || name.includes('praktik kerja') || name.includes('kreatif') || name.includes('dasar-dasar');
                          if (isKejuruan) {
                            if (item.tingkat === 10) {
                              match = standardReferences.data.find((ref: any) => ref.tingkat === item.tingkat && ref.kode_mapel === 'DASAR-KEJURUAN');
                            } else {
                              if (code.includes('PKL') || name.includes('praktik kerja')) {
                                match = standardReferences.data.find((ref: any) => ref.tingkat === item.tingkat && ref.kode_mapel === 'PKL');
                              } else if (code.includes('PKK') || name.includes('kreatif')) {
                                match = standardReferences.data.find((ref: any) => ref.tingkat === item.tingkat && ref.kode_mapel === 'PKK');
                              } else {
                                match = standardReferences.data.find((ref: any) => ref.tingkat === item.tingkat && ref.kode_mapel === 'KK');
                              }
                            }
                          }
                        }
                        
                        if (!match) {
                          return (
                            <Badge className="bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-800 text-[9px] font-black tracking-wider uppercase select-none rounded-lg" title="Mata pelajaran ini tidak diatur dalam standar nasional tingkat kelas ini. Beban JP sepenuhnya ditentukan oleh kebijakan sekolah.">
                              Otonomi Sekolah
                            </Badge>
                          );
                        }
                        
                        const isMatch = item.jp_per_minggu === match.jp_per_minggu;
                        if (isMatch) {
                          return (
                            <Badge className="bg-emerald-50/70 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-350 border border-emerald-100/50 dark:border-emerald-900/30 text-[9px] font-black tracking-wider uppercase select-none rounded-lg">
                              ✓ Sesuai Standar
                            </Badge>
                          );
                        } else {
                          return (
                            <Badge className="bg-amber-50/70 dark:bg-amber-950/20 text-amber-700 dark:text-amber-350 border border-amber-100/50 dark:border-amber-900/30 text-[9px] font-black tracking-wider uppercase select-none rounded-lg" title={`Standar kementerian: ${match.jp_per_minggu} JP`}>
                              ⚠ Harusnya {match.jp_per_minggu} JP
                            </Badge>
                          );
                        }
                      })()}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="text-lg font-black text-indigo-600 dark:text-indigo-400">{item.jp_per_minggu}</span>
                    <span className="text-[10px] font-bold text-gray-400 ml-1">JP</span>
                  </td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <button 
                      type="button"
                      onClick={() => openEditModal(item)}
                      className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-lg text-gray-400 hover:text-indigo-600 transition-all shadow-sm opacity-0 group-hover:opacity-100"
                      aria-label="Edit Alokasi"
                    >
                      <Settings size={16} />
                    </button>
                    <button 
                      type="button"
                      onClick={() => handleDelete(item.id)}
                      className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-lg text-gray-400 hover:text-red-600 transition-all shadow-sm opacity-0 group-hover:opacity-100"
                      aria-label="Hapus Pemetaan"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
};
export default StrukturKurikulumTable;
