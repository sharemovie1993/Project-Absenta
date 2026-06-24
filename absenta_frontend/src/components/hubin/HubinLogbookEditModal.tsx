import React, { useCallback } from 'react';
import { format } from 'date-fns';
import { id as localeID } from 'date-fns/locale';
import { Edit, Plus, Trash2, BookOpen } from 'lucide-react';
import { Modal, Button, Input } from '../ui';
import { HubinGoogleDriveUploader } from './HubinGoogleDriveUploader';
import type { AbsensiPkl } from '../../api/hubin.api';

interface HubinLogbookEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingAbsensi: AbsensiPkl | null;
  editingActivities: { time: string; text: string; image_url?: string }[];
  setEditingActivities: (activities: { time: string; text: string; image_url?: string }[]) => void;
  isPending: boolean;
  onSave: (activities: { time: string; text: string; image_url?: string }[]) => void;
  userEmail?: string;
  studentClassName?: string;
  generateActivityFileName: (time: string, text: string) => string;
}

export const HubinLogbookEditModal: React.FC<HubinLogbookEditModalProps> = ({
  isOpen,
  onClose,
  editingAbsensi,
  editingActivities,
  setEditingActivities,
  isPending,
  onSave,
  userEmail,
  studentClassName,
  generateActivityFileName
}) => {
  const handleAddActivity = useCallback(() => {
    const now = new Date();
    const currentHHmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const newAct = { time: currentHHmm, text: '' };
    setEditingActivities([newAct, ...(editingActivities || [])]);
  }, [editingActivities, setEditingActivities]);

  const handleRemoveActivity = useCallback((idx: number) => {
    const updated = (editingActivities || []).filter((_, i) => i !== idx);
    setEditingActivities(updated);
  }, [editingActivities, setEditingActivities]);

  const handleTimeChange = useCallback((idx: number, val: string) => {
    const updated = [...(editingActivities || [])];
    updated[idx].time = val;
    setEditingActivities(updated);
  }, [editingActivities, setEditingActivities]);

  const handleTextChange = useCallback((idx: number, val: string) => {
    const updated = [...(editingActivities || [])];
    updated[idx].text = val;
    setEditingActivities(updated);
  }, [editingActivities, setEditingActivities]);

  const handleImageChange = useCallback((idx: number, val: string) => {
    const updated = [...(editingActivities || [])];
    updated[idx].image_url = val;
    setEditingActivities(updated);
  }, [editingActivities, setEditingActivities]);

  const handleSaveClick = useCallback(() => {
    onSave(editingActivities);
  }, [onSave, editingActivities]);

  if (!editingAbsensi) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      title={
        <div className="flex items-center gap-2">
          <Edit size={20} className="text-indigo-650 dark:text-indigo-400" />
          <span>Edit Jurnal Kegiatan ({format(new Date(editingAbsensi.tanggal), 'dd MMMM yyyy', { locale: localeID })})</span>
        </div>
      }
    >
      <div className="flex flex-col max-h-[70vh]">
        {/* STICKY HEADER ACTIONS */}
        <div className="sticky top-0 z-20 bg-white dark:bg-slate-900 pb-4 border-b border-slate-100 dark:border-slate-800 space-y-4">
          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
            Sesuaikan jam dan deskripsi pekerjaan Anda. Urutan di bawah ini menampilkan aktivitas terbaru di posisi paling atas.
          </p>
          
          <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
            <Button
              variant="toolbarOutline"
              size="sm"
              onClick={handleAddActivity}
              className="w-full sm:w-auto flex items-center gap-2 font-bold text-xs bg-indigo-50/50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 border-indigo-100 dark:border-indigo-900"
            >
              <Plus size={16} />
              Tambah Baris Aktivitas
            </Button>
 
            <div className="flex gap-2 w-full sm:w-auto">
              <Button
                variant="toolbarOutline"
                size="sm"
                onClick={onClose}
                className="flex-1 sm:flex-initial font-bold text-xs"
              >
                Batal
              </Button>
              <Button
                variant="primary"
                size="sm"
                isLoading={isPending}
                onClick={handleSaveClick}
                className="flex-1 sm:flex-initial font-black text-xs uppercase tracking-widest px-6 shadow-md shadow-indigo-100 dark:shadow-none"
              >
                Simpan Perubahan
              </Button>
            </div>
          </div>
        </div>
 
        {/* SCROLLABLE CONTENT */}
        <div className="flex-1 overflow-y-auto mt-4 pr-2 space-y-4 min-h-[300px]">
          {editingActivities?.map((act, idx) => (
            <div key={idx} className="space-y-3 bg-slate-50/50 dark:bg-slate-900/40 p-4 rounded-xl border border-slate-150 dark:border-slate-800 animate-fadeIn group/edit-item">
              <div className="flex gap-3 items-center">
                <div className="w-24 shrink-0">
                  <Input
                    type="time"
                    value={act.time}
                    onChange={(e) => handleTimeChange(idx, e.target.value)}
                    className="text-center font-mono font-black text-xs h-10 bg-white dark:bg-slate-950"
                  />
                </div>
                <div className="flex-1">
                  <Input
                    type="text"
                    value={act.text}
                    onChange={(e) => handleTextChange(idx, e.target.value)}
                    className="text-xs font-bold h-10 bg-white dark:bg-slate-950"
                    placeholder="Apa yang Anda kerjakan?"
                  />
                </div>
                <button
                  onClick={() => handleRemoveActivity(idx)}
                  className="text-slate-300 hover:text-rose-600 transition-all p-2 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/20"
                  title="Hapus baris"
                >
                  <Trash2 size={16} />
                </button>
              </div>
              
              <div className="sm:pl-24">
                <HubinGoogleDriveUploader
                  label="Foto Bukti (Opsional)"
                  value={act.image_url || ''}
                  onChange={(val) => handleImageChange(idx, val)}
                  studentEmail={userEmail}
                  customFileName={generateActivityFileName(act.time, act.text)}
                  folderName={studentClassName}
                  compact
                />
              </div>
            </div>
          ))}
 
          {(!editingActivities || editingActivities.length === 0) && (
            <div className="text-center py-12 text-slate-400 italic text-xs border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-xl bg-slate-50/30">
              <BookOpen size={24} className="mx-auto mb-2 opacity-20" />
              Tidak ada catatan kegiatan.
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};
