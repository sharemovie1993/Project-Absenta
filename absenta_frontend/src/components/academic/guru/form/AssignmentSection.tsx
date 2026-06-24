import React from 'react';
import { Layers } from 'lucide-react';
import { Checkbox } from '../../../ui/Checkbox';
import { Label } from '../../../ui/Label';
import { Loader } from '../../../ui/Loader';
import { SectionCard } from './FormShared';

interface AssignmentSectionProps {
  loadingMapel: boolean;
  loadingAssignments: boolean;
  mapelList: any[];
  selectedMapelIds: string[];
  setValue: (field: any, value: any, options?: any) => void;
  isViewMode: boolean;
}

export const AssignmentSection = React.memo<AssignmentSectionProps>(({
  loadingMapel,
  loadingAssignments,
  mapelList = [],
  selectedMapelIds = [],
  setValue,
  isViewMode
}) => {
  return (
    <SectionCard title="Mata Pelajaran Diampu" icon={Layers} fullWidth>
      <div className="md:col-span-2">
        {loadingMapel || loadingAssignments ? (
          <div className="flex items-center py-8 justify-center">
            <Loader size="sm" className="mr-2" />
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sinkronisasi Data...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {mapelList?.map((mapel) => {
              const isChecked = selectedMapelIds?.includes(mapel.id);
              return (
                <div key={mapel.id} className={`flex items-center p-3 rounded-xl border-2 transition-all duration-300 ${isChecked ? 'bg-indigo-50/50 border-indigo-200 dark:bg-indigo-900/20 dark:border-indigo-800' : 'bg-slate-50/50 border-slate-100 dark:bg-slate-950 dark:border-slate-800 hover:border-slate-200'}`}>
                  <Checkbox 
                    id={`mapel-${mapel.id}`} 
                    checked={isChecked} 
                    disabled={isViewMode} 
                    onCheckedChange={(checked) => {
                      const updated = checked ? [...selectedMapelIds, mapel.id] : selectedMapelIds.filter(id => id !== mapel.id);
                      setValue('mapel_ids', updated, { shouldDirty: true });
                    }} 
                    className="mr-3 w-5 h-5 rounded-md border-2 border-slate-300 data-[state=checked]:bg-indigo-500 data-[state=checked]:border-indigo-500" 
                  />
                  <Label htmlFor={`mapel-${mapel.id}`} className={`text-[11px] font-black uppercase tracking-tight leading-tight transition-colors ${isChecked ? 'text-indigo-900 dark:text-indigo-400' : 'text-slate-500'}`}>
                    {mapel.nama_mapel}
                  </Label>
                </div>
              );
            })}
          </div>
        )}
        {(!mapelList || mapelList.length === 0) && !loadingMapel && (
          <div className="text-center py-12 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-2xl">
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest italic">Data Tidak Tersedia</p>
          </div>
        )}
      </div>
    </SectionCard>
  );
});

AssignmentSection.displayName = 'AssignmentSection';
