import React, { useCallback } from 'react';
import { BookOpen, Clock, FileText, Camera, CheckCircle2, Zap } from 'lucide-react';
import { Modal, ModalFooter, Button, Input } from '../ui';
import { HubinGoogleDriveUploader } from './HubinGoogleDriveUploader';
import type { AbsensiPkl } from '../../api/hubin.api';
import { useIsMobile } from '../../hooks/useIsMobile';
import { formatDate } from '../../utils/layoutUtils';
import { getVirtualDate, getTimezoneLabel } from '../../utils/attendance/time';

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

export const HubinLogbookEditModal: React.FC<HubinLogbookEditModalProps> = React.memo(({
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
  const isMobile = useIsMobile();
  const [time, setTime] = React.useState('');
  const [text, setText] = React.useState('');
  const [imageUrl, setImageUrl] = React.useState('');

  // Sinkronisasi state lokal saat modal dibuka
  React.useEffect(() => {
    if (isOpen) {
      const vDate = getVirtualDate();
      const hh = String(vDate.getHours()).padStart(2, '0');
      const mm = String(vDate.getMinutes()).padStart(2, '0');
      setTime(editingActivities?.[0]?.time || `${hh}:${mm}`);
      setText(editingActivities?.[0]?.text || '');
      setImageUrl(editingActivities?.[0]?.image_url || '');
    }
  }, [isOpen, editingActivities]);

  const handleSetCurrentTime = useCallback(() => {
    const vDate = getVirtualDate();
    const hh = String(vDate.getHours()).padStart(2, '0');
    const mm = String(vDate.getMinutes()).padStart(2, '0');
    setTime(`${hh}:${mm}`);
  }, []);

  const handleSaveClick = useCallback(() => {
    if (!text.trim() || !time) return;
    const finalActivities = [{ time, text: text.trim(), image_url: imageUrl }];
    setEditingActivities(finalActivities);
    onSave(finalActivities);
  }, [onSave, setEditingActivities, time, text, imageUrl]);

  if (!editingAbsensi) return null;

  const dateStr = editingAbsensi.tanggal
    ? formatDate(editingAbsensi.tanggal, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    : formatDate(getVirtualDate(), { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const tzLabel = getTimezoneLabel();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="md"
      placement={isMobile ? 'bottom' : 'center'}
      className={isMobile ? 'rounded-t-3xl rounded-b-none sm:rounded-2xl max-h-[92vh] sm:max-h-[85vh] p-0' : 'rounded-2xl'}
      contentClassName={isMobile ? 'p-4 pt-2 pb-5' : 'p-6 pt-3'}
      title={
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900 shrink-0">
            <BookOpen size={16} />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-100 leading-tight">
              Catat Aktivitas PKL
            </h3>
            <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500 leading-tight mt-0.5">
              {dateStr} • {tzLabel}
            </p>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {/* 1. Jam Pelaksanaan */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Clock size={13} className="text-indigo-500" />
              <span>Jam Pelaksanaan</span>
            </label>
            <button
              type="button"
              onClick={handleSetCurrentTime}
              className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 flex items-center gap-1 cursor-pointer bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 px-2 py-0.5 rounded-lg transition-colors"
              title="Gunakan jam tenant saat ini"
            >
              <Zap size={11} className="text-amber-500 fill-amber-500" />
              <span>Jam Sekarang</span>
            </button>
          </div>
          <Input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="font-mono font-bold text-sm h-10 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:bg-white dark:focus:bg-slate-900 rounded-xl"
          />
        </div>

        {/* 2. Deskripsi Pekerjaan */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <FileText size={13} className="text-indigo-500" />
              <span>Deskripsi Pekerjaan / Aktivitas <span className="text-rose-500">*</span></span>
            </label>
            <span className="text-[10px] text-slate-400 font-medium">
              {text.length} karakter
            </span>
          </div>
          <textarea
            rows={isMobile ? 3 : 4}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault();
                if (text.trim() && time && !isPending) {
                  handleSaveClick();
                }
              }
            }}
            placeholder="Jelaskan secara ringkas aktivitas teknis yang Anda kerjakan, peralatan yang digunakan, atau hasil pekerjaannya..."
            className="w-full px-3.5 py-2.5 rounded-xl text-xs sm:text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-900 transition-all outline-none resize-none leading-relaxed"
          />
        </div>

        {/* 3. Foto Bukti Dokumentasi */}
        <div>
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 mb-1.5">
            <Camera size={13} className="text-indigo-500" />
            <span>Foto Bukti Kegiatan <span className="text-slate-400 font-normal text-[11px]">(Opsional)</span></span>
          </label>
          <div className="rounded-xl overflow-hidden">
            <HubinGoogleDriveUploader
              label="Ambil / Unggah Foto Bukti"
              value={imageUrl}
              onChange={setImageUrl}
              studentEmail={userEmail}
              customFileName={generateActivityFileName(time, text)}
              folderName={studentClassName}
              compact
            />
          </div>
        </div>

        {/* Footer Actions (Bawah) */}
        <ModalFooter className="mt-5 pt-3 flex items-center justify-between sm:justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isPending}
            className="h-10 sm:h-9 px-4 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            Batal
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            isLoading={isPending}
            disabled={!text.trim() || !time || isPending}
            onClick={handleSaveClick}
            className="h-10 sm:h-9 px-5 rounded-xl text-xs font-black bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-200/50 dark:shadow-none flex items-center gap-1.5 cursor-pointer flex-1 sm:flex-initial justify-center"
          >
            <CheckCircle2 size={15} />
            <span>Simpan Aktivitas</span>
          </Button>
        </ModalFooter>
      </div>
    </Modal>
  );
});
