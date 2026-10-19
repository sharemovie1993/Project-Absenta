import React from 'react';
import { ArrowRightLeft } from 'lucide-react';
import { Button, Modal, SearchableSelect, Label } from '@/components/ui';

export interface JadwalDelegasiBlockSummary {
  id: string;
  schedule_ids: string[];
  tenant_id: string;
  kelas_id: string;
  hari: string;
  slot_start: number;
  slot_end: number;
  jp_count: number;
  jam_mulai: string;
  jam_selesai: string;
  Mapel?: {
    nama_mapel: string;
    kode_mapel: string;
  };
  Guru?: {
    id: string;
    nama_guru?: string;
    User?: {
      full_name: string;
    };
  };
  GuruPelaksana?: {
    id: string;
    nama_guru?: string;
    User?: {
      full_name: string;
    };
  };
  Kelas?: {
    id: string;
    nama_kelas: string;
  };
}

interface JadwalDelegasiModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedJadwal: JadwalDelegasiBlockSummary | null;
  targetPelaksanaId: string;
  onTargetPelaksanaChange: (val: string) => void;
  onSave: () => void;
  isSaving: boolean;
  guruOptions: { value: string; label: string; jenis_ptk?: string }[];
}

export function JadwalDelegasiModal({
  isOpen,
  onClose,
  selectedJadwal,
  targetPelaksanaId,
  onTargetPelaksanaChange,
  onSave,
  isSaving,
  guruOptions,
}: JadwalDelegasiModalProps) {
  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="md"
      title={
        <div className="flex items-center gap-2">
          <ArrowRightLeft className="w-5 h-5 text-amber-500" />
          <span>Tugaskan Pengajar Pelaksana</span>
        </div>
      }
    >
      <div className="p-6 space-y-4">
        {selectedJadwal && (
          <div className="space-y-4">
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Kelas:</span>
                <span className="font-bold text-slate-700 dark:text-slate-200">{selectedJadwal.Kelas?.nama_kelas}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Mata Pelajaran:</span>
                <span className="font-bold text-slate-700 dark:text-slate-200">{selectedJadwal.Mapel?.nama_mapel}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Jadwal:</span>
                <div className="text-right">
                  <span className="font-semibold text-slate-600 dark:text-slate-300">
                    {selectedJadwal.hari}, {selectedJadwal.slot_start === selectedJadwal.slot_end ? `Jam ke-${selectedJadwal.slot_start}` : `Jam ke-${selectedJadwal.slot_start} s/d ${selectedJadwal.slot_end}`} ({selectedJadwal.jam_mulai} - {selectedJadwal.jam_selesai})
                  </span>
                  <span className="ml-1.5 inline-block text-[9px] px-1.5 py-0 font-extrabold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200/50 dark:border-indigo-800/50 rounded">
                    {selectedJadwal.jp_count} JP
                  </span>
                </div>
              </div>
              <div className="flex justify-between pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                <span className="text-slate-400">Guru SK Resmi:</span>
                <span className="font-black text-indigo-600 dark:text-indigo-400">
                  {selectedJadwal.Guru?.nama_guru || selectedJadwal.Guru?.User?.full_name}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-tighter">
                Pilih Staf / Guru Pengganti Lapangan
              </Label>
              <SearchableSelect
                value={targetPelaksanaId}
                onValueChange={onTargetPelaksanaChange}
                options={[
                  { value: '', label: '-- Kosongkan (Sama dengan Guru SK) --' },
                  ...guruOptions,
                ]}
                placeholder="Cari nama guru atau staf TU..."
                aria-label="Pilih Pengajar Pengganti"
                triggerClassName="h-10 text-xs font-semibold rounded-xl"
              />
              <p className="text-[10px] text-slate-400 leading-relaxed">
                Pengajar yang dipilih akan dapat membuka sesi KBM, mengambil presensi siswa di kelas, dan jadwal otomatis masuk ke aplikasi mereka.
              </p>
            </div>
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            className="rounded-xl font-bold text-xs"
          >
            Batal
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={onSave}
            disabled={isSaving}
            className="rounded-xl font-bold text-xs bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            {isSaving ? 'Menyimpan...' : 'Simpan Delegasi'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export default JadwalDelegasiModal;
