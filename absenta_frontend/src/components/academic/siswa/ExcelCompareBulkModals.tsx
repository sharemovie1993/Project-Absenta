import React, { useState, useEffect } from 'react';
import {
  Users,
  LogOut,
  GraduationCap,
  RefreshCw,
  CheckSquare,
  AlertTriangle
} from 'lucide-react';
import toast from 'react-hot-toast';

import { Modal, ModalFooter, Button, Input, Label, Textarea, Alert, AlertDescription } from '../../ui';
import { SearchableSelect } from '../../ui/SearchableSelect';
import { bulkUpdateStatus, updateSiswa } from '../../../api/academic/siswa.api';
import type { Kelas } from '../../../types/academic';

export type CompareBulkModalType = 'PINDAH_KELAS' | 'MUTASI' | 'LULUS' | null;

interface ExcelCompareBulkModalsProps {
  activeModal: CompareBulkModalType;
  onClose: () => void;
  selectedSiswaIds: string[];
  kelasList: Kelas[];
  currentKelasId?: string;
  onSuccess: () => Promise<void> | void;
}

const MUTATION_STATUS_OPTIONS = [
  { label: 'Pindah Sekolah', value: 'PINDAH' },
  { label: 'Undur Diri (Keluar)', value: 'KELUAR' },
  { label: 'Dikeluarkan (DO)', value: 'DO' },
  { label: 'Meninggal Dunia', value: 'MENINGGAL' },
];

export const ExcelCompareBulkModals: React.FC<ExcelCompareBulkModalsProps> = ({
  activeModal,
  onClose,
  selectedSiswaIds,
  kelasList,
  currentKelasId,
  onSuccess,
}) => {
  const [targetKelasId, setTargetKelasId] = useState('');
  const [mutationStatus, setMutationStatus] = useState('PINDAH');
  const [mutationDate, setMutationDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [mutationReason, setMutationReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!activeModal) return;
    setTargetKelasId('');
    setMutationStatus('PINDAH');
    setMutationDate(new Date().toISOString().split('T')[0]);
    setMutationReason('');
  }, [activeModal]);

  const handleBulkClassSubmit = async () => {
    if (!targetKelasId) {
      toast.error('Pilih kelas tujuan terlebih dahulu.');
      return;
    }

    setSubmitting(true);
    let successCount = 0;
    let failCount = 0;
    try {
      for (const siswaId of selectedSiswaIds) {
        try {
          const res = await updateSiswa(siswaId, { kelas_id: targetKelasId });
          if (res.success === false) failCount++;
          else successCount++;
        } catch {
          failCount++;
        }
      }

      const targetName = kelasList.find((k) => k.id === targetKelasId)?.nama_kelas || '';
      if (successCount > 0) {
        toast.success(`${successCount} siswa berhasil dipindahkan ke kelas ${targetName}.`);
        await onSuccess();
        onClose();
      }
      if (failCount > 0) {
        toast.error(`${failCount} siswa gagal dipindahkan.`);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleBulkStatusSubmit = async (type: 'MUTASI' | 'LULUS') => {
    if (!mutationDate) {
      toast.error('Tanggal wajib diisi.');
      return;
    }
    if (type === 'MUTASI' && !mutationReason.trim()) {
      toast.error('Alasan/keterangan mutasi wajib diisi.');
      return;
    }

    setSubmitting(true);
    try {
      const status = type === 'LULUS' ? 'LULUS' : mutationStatus;
      const keterangan = type === 'LULUS' ? 'Lulus Sekolah' : mutationReason.trim();
      await bulkUpdateStatus({
        ids: selectedSiswaIds,
        status,
        tanggal: new Date(mutationDate),
        keterangan,
      });
      toast.success(`Berhasil memproses ${selectedSiswaIds.length} siswa.`);
      await onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Gagal memproses mutasi siswa.');
    } finally {
      setSubmitting(false);
    }
  };

  const kelasOptions = kelasList
    .filter((k) => k.id !== currentKelasId)
    .map((k) => ({ label: `${k.nama_kelas} (Tingkat ${k.tingkat})`, value: k.id }));

  return (
    <>
      {/* Modal Pindah Kelas Massal */}
      <Modal
        isOpen={activeModal === 'PINDAH_KELAS'}
        onClose={onClose}
        zIndex={70}
        size="md"
        title={
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-50 dark:bg-blue-900/30 rounded-xl text-blue-600">
              <Users size={20} />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight">
                Pindah Kelas Massal
              </h2>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                {selectedSiswaIds.length} Siswa Terpilih
              </p>
            </div>
          </div>
        }
      >
        <div className="space-y-5">
          <div className="space-y-2">
            <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
              Kelas Tujuan Baru
            </Label>
            <SearchableSelect
              value={targetKelasId}
              onValueChange={setTargetKelasId}
              options={kelasOptions}
              placeholder="Pilih Kelas Tujuan..."
              searchPlaceholder="Cari Kelas..."
              triggerClassName="h-11 rounded-xl font-bold bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800"
            />
          </div>

          <ModalFooter className="pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={submitting}
              className="rounded-xl font-bold uppercase tracking-widest text-[10px]"
            >
              Batal
            </Button>
            <Button
              type="button"
              onClick={handleBulkClassSubmit}
              disabled={submitting || !targetKelasId}
              className="rounded-xl px-8 bg-blue-600 hover:bg-blue-700 text-white"
            >
              {submitting ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Users className="w-4 h-4 mr-2" />}
              Pindahkan Sekarang
            </Button>
          </ModalFooter>
        </div>
      </Modal>

      {/* Modal Mutasi Siswa */}
      <Modal
        isOpen={activeModal === 'MUTASI'}
        onClose={onClose}
        zIndex={70}
        size="lg"
        title={
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-orange-50 dark:bg-orange-900/30 rounded-xl text-orange-600">
              <LogOut size={20} />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight">
                Proses Mutasi Siswa
              </h2>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                {selectedSiswaIds.length} Siswa Terpilih
              </p>
            </div>
          </div>
        }
      >
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
                Jenis Mutasi / Keluar
              </Label>
              <SearchableSelect
                triggerClassName="h-10 rounded-xl"
                value={mutationStatus}
                onValueChange={setMutationStatus}
                options={MUTATION_STATUS_OPTIONS}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
                Tanggal Efektif
              </Label>
              <Input
                type="date"
                value={mutationDate}
                onChange={(e) => setMutationDate(e.target.value)}
                className="h-10 rounded-xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
              Alasan / Keterangan <span className="text-red-500">*</span>
            </Label>
            <Textarea
              placeholder="Berikan alasan detail mutasi atau nomor surat pindah..."
              value={mutationReason}
              onChange={(e) => setMutationReason(e.target.value)}
              rows={3}
              className="text-xs rounded-xl border-slate-200 dark:border-slate-800 focus:ring-orange-500"
            />
          </div>

          <ModalFooter className="pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={submitting}
              className="rounded-xl font-bold uppercase tracking-widest text-[10px]"
            >
              Batal
            </Button>
            <Button
              type="button"
              variant="danger"
              onClick={() => handleBulkStatusSubmit('MUTASI')}
              disabled={submitting || !mutationReason.trim()}
              className="rounded-xl px-8"
            >
              {submitting ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <LogOut className="w-4 h-4 mr-2" />}
              Konfirmasi Mutasi
            </Button>
          </ModalFooter>
        </div>
      </Modal>

      {/* Modal Kelulusan Massal */}
      <Modal
        isOpen={activeModal === 'LULUS'}
        onClose={onClose}
        zIndex={70}
        size="md"
        title={
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-50 dark:bg-emerald-900/30 rounded-xl text-emerald-600">
              <GraduationCap size={20} />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight">
                Proses Kelulusan Massal
              </h2>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                {selectedSiswaIds.length} Siswa Terpilih
              </p>
            </div>
          </div>
        }
      >
        <div className="space-y-5">
          <div className="space-y-2">
            <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
              Tanggal Kelulusan (Ijazah/SKL)
            </Label>
            <Input
              type="date"
              value={mutationDate}
              onChange={(e) => setMutationDate(e.target.value)}
              className="h-11 rounded-xl font-bold bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800"
            />
          </div>

          <Alert className="bg-amber-50/50 border-amber-100 rounded-xl py-3">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-[10px] font-bold text-amber-700 leading-normal ml-1">
              Siswa yang diluluskan tidak dapat lagi melakukan absensi harian dan statusnya berubah menjadi LULUS.
            </AlertDescription>
          </Alert>

          <ModalFooter className="pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={submitting}
              className="rounded-xl font-bold uppercase tracking-widest text-[10px]"
            >
              Batal
            </Button>
            <Button
              type="button"
              onClick={() => handleBulkStatusSubmit('LULUS')}
              disabled={submitting}
              className="rounded-xl px-8 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {submitting ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <CheckSquare className="w-4 h-4 mr-2" />}
              Luluskan Sekarang
            </Button>
          </ModalFooter>
        </div>
      </Modal>
    </>
  );
};
