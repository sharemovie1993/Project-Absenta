import React, { useState, useEffect, useCallback } from 'react';
import { CheckCircle2, RefreshCw, X } from 'lucide-react';
import { Button, Loader, ModalFooter } from '../../ui';
import { getGuruList } from '../../../api/academic/guru.api';
import { getKelasList } from '../../../api/academic/kelas.api';
import { assignWaliKelasStruktur } from '../../../api/academic/waliKelas.api';
import { useToast } from '../../../hooks/useToast';

// Modular Sections
import { AssignmentSection } from './form/AssignmentSection';

interface WaliKelasFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
  preset?: { guru_id?: string; kelas_id?: string };
}

export const WaliKelasForm: React.FC<WaliKelasFormProps> = ({
  onSuccess,
  onCancel,
  preset
}) => {
  const { showToast } = useToast();
  const [assignLoading, setAssignLoading] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [guruOptions, setGuruOptions] = useState<Array<{ id: string; nama_guru: string }>>([]);
  const [kelasOptions, setKelasOptions] = useState<Array<{ id: string; nama_kelas: string; tingkat: number }>>([]);
  const [selectedGuruId, setSelectedGuruId] = useState(preset?.guru_id || '');
  const [selectedKelasId, setSelectedKelasId] = useState(preset?.kelas_id || '');

  const loadAssignOptions = useCallback(async () => {
    try {
      setAssignLoading(true);
      const [gurusRes, kelasRes] = await Promise.all([
        getGuruList(1, 200, ''),
        getKelasList(1, 200, ''),
      ]);

      if (gurusRes.success) {
        setGuruOptions((gurusRes.data || []).map((g: any) => ({ id: g.id, nama_guru: g.nama_guru })));
      }
      if (kelasRes.success) {
        setKelasOptions((kelasRes.data || []).map((k: any) => ({ id: k.id, nama_kelas: k.nama_kelas, tingkat: k.tingkat })));
      }
    } catch (e: any) {
      showToast('Gagal memuat data dropdown', 'error');
    } finally {
      setAssignLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadAssignOptions();
  }, [loadAssignOptions]);

  const handleSave = async () => {
    if (!selectedGuruId || !selectedKelasId) {
      showToast('Guru dan kelas wajib dipilih', 'warning');
      return;
    }
    try {
      setAssigning(true);
      const res = await assignWaliKelasStruktur({ guru_id: selectedGuruId, kelas_id: selectedKelasId });
      if (!res.success) {
        showToast(res.message || 'Gagal menyimpan penugasan', 'error');
        return;
      }
      showToast('Berhasil menyimpan penugasan wali kelas', 'success');
      onSuccess?.();
    } catch (e: any) {
      showToast(e?.message || 'Gagal menyimpan penugasan', 'error');
    } finally {
      setAssigning(false);
    }
  };

  if (assignLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader size="lg" />
        <p className="mt-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest italic animate-pulse">Menyiapkan data penugasan...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AssignmentSection 
        selectedGuruId={selectedGuruId}
        setSelectedGuruId={setSelectedGuruId}
        selectedKelasId={selectedKelasId}
        setSelectedKelasId={setSelectedKelasId}
        guruOptions={guruOptions}
        kelasOptions={kelasOptions}
        assigning={assigning}
      />

      <ModalFooter className="pt-6 border-t border-slate-100 dark:border-slate-800 gap-3">
        <Button 
          variant="toolbarOutline" 
          size="toolbar"
          onClick={onCancel} 
          disabled={assigning}
        >
          <X className="w-3.5 h-3.5 mr-2" />
          Batalkan
        </Button>
        <Button 
          variant="toolbarPrimary"
          size="toolbar"
          onClick={handleSave} 
          disabled={assigning || !selectedGuruId || !selectedKelasId}
          className="px-8"
        >
          {assigning ? (
            <RefreshCw size={14} className="mr-2 animate-spin" />
          ) : (
            <CheckCircle2 className="w-3.5 h-3.5 mr-2" />
          )}
          Simpan Penugasan
        </Button>
      </ModalFooter>
    </div>
  );
};

export default WaliKelasForm;
