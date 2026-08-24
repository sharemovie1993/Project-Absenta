import React from 'react';
import { AlertCircle, RefreshCw, UserCheck } from 'lucide-react';
import { Modal, Button, SearchableSelect } from '@/components/ui';
import type { Siswa } from '../../../../types/academic';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  selectedSiswa: string[];
  calonList: Siswa[];
  targetKelasId: string;
  setTargetKelasId: (v: string) => void;
  filteredKelasOptions: Array<{ label: string; value: string }>;
  submitLoading: boolean;
  onMapStudents: () => void;
}

export const PpdbMappingModal: React.FC<Props> = React.memo(({
  isOpen,
  onClose,
  selectedSiswa,
  calonList,
  targetKelasId,
  setTargetKelasId,
  filteredKelasOptions,
  submitLoading,
  onMapStudents
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Pilih Kelas Tujuan"
      size="md"
    >
      <div className="space-y-6 py-2 text-xs">
        <div className="p-4 bg-amber-50/50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900 rounded-xl text-xs text-amber-800 dark:text-amber-300 space-y-2">
          <div className="flex items-center gap-2 font-bold">
            <AlertCircle size={14} />
            <span>Informasi Pemetaan</span>
          </div>
          <p>
            Sebanyak <strong>{selectedSiswa?.length || 0} siswa</strong> yang terpilih akan dipindahkan statusnya menjadi <strong>AKTIF</strong>, dikaitkan ke kelas tujuan, dan didaftarkan ke semester/tahun pelajaran aktif secara otomatis.
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label htmlFor="target-kelas-select" className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
              Pilih Kelas Tujuan
            </label>
            <SearchableSelect
              id="target-kelas-select"
              aria-label="Pilih Kelas Tujuan"
              value={targetKelasId}
              onValueChange={(val) => setTargetKelasId(val)}
              options={filteredKelasOptions || []}
              placeholder="-- Pilih Kelas Target --"
              disabled={submitLoading}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
              Daftar Siswa yang Akan Dipetakan ({selectedSiswa?.length || 0})
            </label>
            <div className="max-h-40 overflow-y-auto border border-slate-100 dark:border-slate-800 rounded-xl p-2 divide-y divide-slate-50 dark:divide-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
              {(calonList ?? [])?.filter(s => selectedSiswa?.includes(s.id))?.map(s => (
                <div key={s.id} className="py-1.5 px-2 text-xs font-medium text-slate-700 dark:text-slate-300 flex justify-between">
                  <span>{s.nama_siswa}</span>
                  <span className="text-[10px] text-slate-400 font-mono">{s.nisn || s.nis || '-'}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
          <Button type="button" variant="toolbarOutline" size="toolbar" onClick={onClose} disabled={submitLoading}>
            Batal
          </Button>
          <Button
            type="button"
            variant="toolbarPrimary"
            size="toolbar"
            onClick={onMapStudents}
            disabled={submitLoading || !targetKelasId}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
          >
            {submitLoading ? (
              <>
                <RefreshCw size={14} className="animate-spin mr-1.5" />
                <span>Memproses...</span>
              </>
            ) : (
              <>
                <UserCheck size={14} className="mr-1.5" />
                <span>Proses Pemetaan</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
});

export default PpdbMappingModal;
