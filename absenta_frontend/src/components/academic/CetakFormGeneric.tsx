import React from 'react';
import { Loader2 } from 'lucide-react';
import type { Kelas, Guru } from '../../types/academic';

export interface DocOption {
  value: string;
  label: string;
  requireClass?: boolean;
}

interface CetakFormGenericProps {
  selectedPrintType: string;
  setSelectedPrintType: (val: string) => void;
  selectedClassId: string;
  setSelectedClassId: (val: string) => void;
  selectedGuruId?: string;
  setSelectedGuruId?: (val: string) => void;
  includeSchoolLogo: boolean;
  setIncludeSchoolLogo: (val: boolean) => void;
  classes: Kelas[];
  loadingClasses: boolean;
  gurus?: Guru[];
  loadingGurus?: boolean;
  docOptions: DocOption[];
}

export const CetakFormGeneric: React.FC<CetakFormGenericProps> = ({
  selectedPrintType,
  setSelectedPrintType,
  selectedClassId,
  setSelectedClassId,
  selectedGuruId = '',
  setSelectedGuruId,
  includeSchoolLogo,
  setIncludeSchoolLogo,
  classes,
  loadingClasses,
  gurus = [],
  loadingGurus = false,
  docOptions
}) => {
  const currentDoc = docOptions.find(o => o.value === selectedPrintType);
  
  // Show class selector only if requireClass is true AND it's not the teacher roster
  const showClassSelector = (currentDoc?.requireClass ?? true) && selectedPrintType !== 'roster_teacher';
  
  // Show teacher selector only if it's roster_teacher
  const showTeacherSelector = selectedPrintType === 'roster_teacher';

  return (
    <div className="space-y-4 py-2">
      {/* Document Type Dropdown */}
      <div className="space-y-1">
        <label className="text-xs font-black uppercase text-slate-400 block">Jenis Dokumen Fisik</label>
        <select
          value={selectedPrintType}
          onChange={(e) => {
            const val = e.target.value;
            setSelectedPrintType(val);
          }}
          className="w-full text-xs font-semibold px-3 py-2 border rounded-lg bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {docOptions.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {/* Class Selector */}
      {showClassSelector && (
        <div className="space-y-1">
          <label className="text-xs font-black uppercase text-slate-400 block">Pilih Kelas</label>
          {loadingClasses ? (
            <div className="text-xs font-semibold text-slate-400 flex items-center gap-1.5 py-1">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Memuat kelas...
            </div>
          ) : (
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="w-full text-xs font-semibold px-3 py-2 border rounded-lg bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 text-blue-600 dark:text-blue-400 font-bold"
            >
              <option value="all">🖨️ CETAK SEMUA KELAS</option>
              {classes.map(c => (
                <option key={c.id} value={c.id}>{c.nama_kelas} (Tingkat {c.tingkat})</option>
              ))}
            </select>
          )}
        </div>
      )}

      {/* Teacher Selector */}
      {showTeacherSelector && setSelectedGuruId && (
        <div className="space-y-1">
          <label className="text-xs font-black uppercase text-slate-400 block">Pilih Guru</label>
          {loadingGurus ? (
            <div className="text-xs font-semibold text-slate-400 flex items-center gap-1.5 py-1">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Memuat daftar guru...
            </div>
          ) : (
            <select
              value={selectedGuruId}
              onChange={(e) => setSelectedGuruId(e.target.value)}
              className="w-full text-xs font-semibold px-3 py-2 border rounded-lg bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 text-blue-600 dark:text-blue-400 font-bold"
            >
              <option value="all">🖨️ CETAK SEMUA GURU</option>
              {gurus.map(g => (
                <option key={g.id} value={g.id}>{g.nama_guru} {g.nip ? `(NIP. ${g.nip})` : ''}</option>
              ))}
            </select>
          )}
        </div>
      )}

      {/* Checkbox to Toggle Right Logo (Sekolah) */}
      <div className="flex items-center gap-2 pt-2">
        <input
          type="checkbox"
          id="toggle-school-logo"
          checked={includeSchoolLogo}
          onChange={(e) => setIncludeSchoolLogo(e.target.checked)}
          className="w-4 h-4 rounded text-blue-600 border-slate-300 dark:border-slate-800 focus:ring-blue-500 bg-white dark:bg-slate-900"
        />
        <label htmlFor="toggle-school-logo" className="text-xs font-bold text-slate-700 dark:text-slate-300 select-none cursor-pointer">
          Sertakan Logo Sekolah (Kanan)
        </label>
      </div>
    </div>
  );
};
