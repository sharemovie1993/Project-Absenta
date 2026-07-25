import React, { useState, useEffect } from 'react';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import Modal from '@/components/ui/Modal';
import { getGuruList } from '@/api/academic/guru.api';
import { getSiswaList } from '@/api/academic/siswa.api';
import { assignGuruToStruktur, assignSiswaToStruktur } from '@/api/academic/strukturOrganisasi.api';
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

export const QuickAssignmentModal: React.FC<QuickAssignmentModalProps> = ({
  isOpen,
  onClose,
  strukturId,
  type,
  contextId,
  roleCode,
  onSuccess
}) => {
  const [options, setOptions] = useState<{ label: string; value: string }[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);


  const isSiswaRole = roleCode === 'PETUGAS_KELAS';

  useEffect(() => {
    if (isOpen) {
      loadOptions();
    }
  }, [isOpen, contextId]);

  const loadOptions = async (search = '') => {
    setIsLoading(true);
    try {
      if (isSiswaRole) {
        const res = await getSiswaList(1, 100, search, contextId, 'AKTIF');
        setOptions((res.data || []).map(s => ({ 
          label: `${s.nama_siswa} (${s.nis || 'No NIS'})`, 
          value: s.id 
        })));
      } else {
        const res = await getGuruList(1, 100, search);
        setOptions((res.data || []).map(g => ({ 
          label: `${g.nama_guru} (${g.nip || 'No NIP'})`, 
          value: g.id 
        })));
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

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
};
