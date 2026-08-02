import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, RefreshCw, X } from 'lucide-react';
import { Button, ModalFooter } from '../../ui';
import { assignWaliKelasStruktur } from '../../../api/kurikulum/waliKelas.api';
import toast from 'react-hot-toast';

// Modular Sections
import { AssignmentSection } from './form/AssignmentSection';

interface WaliKelasFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
  preset?: { guru_id?: string; kelas_id?: string };
}

export const WaliKelasForm = React.memo<WaliKelasFormProps>(({
  onSuccess,
  onCancel,
  preset
}) => {
  const queryClient = useQueryClient();
  const [assigning, setAssigning] = useState(false);
  const [selectedGuruId, setSelectedGuruId] = useState(preset?.guru_id || '');
  const [selectedKelasId, setSelectedKelasId] = useState(preset?.kelas_id || '');

  const handleSave = async () => {
    if (!selectedGuruId || !selectedKelasId) {
      toast('Guru dan kelas wajib dipilih', { icon: '⚠️' });
      return;
    }
    try {
      setAssigning(true);
      const res = await assignWaliKelasStruktur({ guru_id: selectedGuruId, kelas_id: selectedKelasId });
      if (!res.success) {
        toast.error(res.message || 'Gagal menyimpan penugasan');
        return;
      }
      toast.success('Berhasil menyimpan penugasan wali kelas');
      queryClient.invalidateQueries({ queryKey: ['wali-kelas-options-list'] });
      queryClient.invalidateQueries({ queryKey: ['kurikulum-struktur'] });
      queryClient.invalidateQueries({ queryKey: ['academic-stats'] });
      queryClient.invalidateQueries({ queryKey: ['guru-options-list'] });
      onSuccess?.();
    } catch (e: any) {
      toast.error(e?.message || 'Gagal menyimpan penugasan');
    } finally {
      setAssigning(false);
    }
  };

  return (
    <div className="space-y-6">
      <AssignmentSection 
        selectedGuruId={selectedGuruId}
        setSelectedGuruId={setSelectedGuruId}
        selectedKelasId={selectedKelasId}
        setSelectedKelasId={setSelectedKelasId}
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
});

WaliKelasForm.displayName = 'WaliKelasForm';

export default WaliKelasForm;
