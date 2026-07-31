import React from 'react';
import { User, School } from 'lucide-react';
import { Label } from '../../../ui/Label';
import { SectionCard } from './FormShared';
import { GuruSelect, KelasSelect } from '../../../../components/common';

interface AssignmentSectionProps {
  selectedGuruId: string;
  setSelectedGuruId: (id: string) => void;
  selectedKelasId: string;
  setSelectedKelasId: (id: string) => void;
  assigning: boolean;
  isViewMode?: boolean;
  // Legacy props kept for backwards compatibility (no longer used internally)
  guruOptions?: any[];
  kelasOptions?: any[];
}

export const AssignmentSection = React.memo<AssignmentSectionProps>(({
  selectedGuruId,
  setSelectedGuruId,
  selectedKelasId,
  setSelectedKelasId,
  assigning,
  isViewMode = false
}) => {
  return (
    <SectionCard title="Data Penugasan" icon={User} fullWidth>
      <div className="space-y-6">
        <div className="space-y-2 group">
          <Label htmlFor="guru_id" className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-tighter">
            Pilih Guru <span className="text-rose-500">*</span>
          </Label>
          <GuruSelect
            id="guru_id"
            value={selectedGuruId}
            onValueChange={setSelectedGuruId}
            placeholder="-- Cari & Pilih Guru Pendidik --"
            searchPlaceholder="Cari Nama Guru / NIP..."
            disabled={assigning || isViewMode}
            triggerClassName="h-10 text-[13px] font-bold bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-xl"
          />
        </div>

        <div className="space-y-2 group">
          <Label htmlFor="kelas_id" className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-tighter">
            Pilih Kelas <span className="text-rose-500">*</span>
          </Label>
          <KelasSelect
            id="kelas_id"
            value={selectedKelasId}
            onValueChange={setSelectedKelasId}
            placeholder="-- Cari & Pilih Kelas / Rombel --"
            searchPlaceholder="Cari Nama Kelas..."
            disabled={assigning || isViewMode}
            triggerClassName="h-10 text-[13px] font-bold bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-xl"
          />
        </div>
      </div>
    </SectionCard>
  );
});

AssignmentSection.displayName = 'AssignmentSection';
