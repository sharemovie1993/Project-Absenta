import React from 'react';
import { User, School } from 'lucide-react';
import { Label } from '../../../ui/Label';
import { SearchableSelect } from '../../../ui/SearchableSelect';
import { SectionCard } from './FormShared';

interface AssignmentSectionProps {
  selectedGuruId: string;
  setSelectedGuruId: (id: string) => void;
  selectedKelasId: string;
  setSelectedKelasId: (id: string) => void;
  guruOptions: any[];
  kelasOptions: any[];
  assigning: boolean;
  isViewMode?: boolean;
}

export const AssignmentSection: React.FC<AssignmentSectionProps> = ({
  selectedGuruId,
  setSelectedGuruId,
  selectedKelasId,
  setSelectedKelasId,
  guruOptions,
  kelasOptions,
  assigning,
  isViewMode = false
}) => {
  return (
    <SectionCard title="Data Penugasan" icon={User} fullWidth>
      <div className="space-y-6">
        <div className="space-y-2 group">
          <Label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-tighter">
            Pilih Guru <span className="text-rose-500">*</span>
          </Label>
          <SearchableSelect
            value={selectedGuruId}
            onValueChange={setSelectedGuruId}
            options={guruOptions.map(g => ({ label: g.nama_guru, value: g.id }))}
            placeholder="Cari guru yang tersedia..."
            searchPlaceholder="Cari Nama Guru..."
            disabled={assigning || isViewMode}
            triggerClassName="h-10 text-[13px] font-bold bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-xl"
          />
        </div>

        <div className="space-y-2 group">
          <Label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-tighter">
            Pilih Kelas <span className="text-rose-500">*</span>
          </Label>
          <SearchableSelect
            value={selectedKelasId}
            onValueChange={setSelectedKelasId}
            options={kelasOptions.map(k => ({ label: `${k.nama_kelas} (Tingkat ${k.tingkat})`, value: k.id }))}
            placeholder="Cari kelas yang tersedia..."
            searchPlaceholder="Cari Nama Kelas..."
            disabled={assigning || isViewMode}
            triggerClassName="h-10 text-[13px] font-bold bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-xl"
          />
        </div>
      </div>
    </SectionCard>
  );
};
