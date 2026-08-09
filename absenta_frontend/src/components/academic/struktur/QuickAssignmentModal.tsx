import React, { useState } from 'react';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import Modal from '@/components/ui/Modal';
import { assignGuruToStruktur, assignSiswaToStruktur } from '@/api/academic/strukturOrganisasi.api';
import { useGuruOptions, useSiswaOptions } from '@/components/common';
import toast from 'react-hot-toast';
import { User, Search, Loader2 } from 'lucide-react';

interface QuickAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  strukturId: string;
  type: 'unit' | 'kelas';
  contextId: string;
  roleCode: string;
  onSuccess: () => void;
}

export const QuickAssignmentModal: React.FC<QuickAssignmentModalProps> = React.memo(({
  isOpen,
  onClose,
  strukturId,
  type,
  contextId,
  roleCode,
  onSuccess
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSiswaRole = roleCode === 'PETUGAS_KELAS';

  const { options: guruOptions, isLoading: loadingGuru } = useGuruOptions({ jenisPtk: 'PENDIDIK' });
  const { options: siswaOptions, isLoading: loadingSiswa } = useSiswaOptions({ 
    kelasId: isSiswaRole ? contextId : undefined, 
    onlyActive: true 
  });

  const options = isSiswaRole ? siswaOptions : guruOptions;
  const isLoading = isSiswaRole ? loadingSiswa : loadingGuru;

  const handleSelect = async (id: string) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      if (isSiswaRole) {
        await assignSiswaToStruktur(strukturId, {
          siswa_id: id,
          kelas_id: contextId,
          start_date: new Date().toISOString().split('T')[0]
        });
      } else {
        await assignGuruToStruktur(strukturId, {
          guru_id: id,
          unit_id: type === 'unit' ? contextId : undefined,
          kelas_id: type === 'kelas' ? contextId : undefined,
          start_date: new Date().toISOString().split('T')[0]
        });
      }
      toast.success('Penugasan berhasil disimpan');
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(error?.message || 'Gagal menyimpan penugasan');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Cepat: Pilih ${isSiswaRole ? 'Siswa' : 'Guru'}`}
      size="sm"
    >
      <div className="p-6 space-y-4">
        <div className="flex items-center gap-3 p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl border border-indigo-100 dark:border-indigo-800">
          <div className="p-2 bg-white dark:bg-slate-800 rounded-lg shadow-sm text-indigo-600">
            <User size={18} />
          </div>
          <div>
            <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest leading-none">Konfigurasi Cepat</p>
            <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
              {isSiswaRole ? 'Petugas Absensi' : 'Penugasan Jabatan'}
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">
            Cari {isSiswaRole ? 'Siswa' : 'Guru'}
          </label>
          <SearchableSelect
            options={options}
            onValueChange={handleSelect}
            placeholder={`Ketik nama ${isSiswaRole ? 'siswa' : 'guru'}...`}
            isLoading={isLoading || isSubmitting}
          />
          <p className="text-[10px] text-slate-400 italic ml-1">
            *Pencarian otomatis akan mencari data aktif di sistem.
          </p>
        </div>

        {isSubmitting && (
          <div className="flex items-center justify-center gap-2 py-2 text-indigo-600">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-xs font-bold">Menyimpan...</span>
          </div>
        )}
      </div>
    </Modal>
  );
});
