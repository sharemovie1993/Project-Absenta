import React, { useRef, useState, useCallback } from 'react';
import { Cloud, Lock, UploadCloud, CheckCircle, AlertCircle, RefreshCw, Trash2, ExternalLink } from 'lucide-react';
import axiosInstance from '../../lib/axiosInstance';
import { Button } from '../ui';
import { hubinApi } from '../../api/hubin.api';
import { toast } from 'react-hot-toast';

interface HubinGoogleDriveUploaderProps {
  value: string;
  onChange: (val: string) => void;
  studentEmail?: string;
  label?: string;
  customFileName?: string;
  compact?: boolean;
  folderName?: string;
}

export const HubinGoogleDriveUploader: React.FC<HubinGoogleDriveUploaderProps> = ({
  value,
  onChange,
  label = 'Foto Bukti Kegiatan',
  customFileName,
  compact = false,
  folderName
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isMounted = useRef(true);
  const [status, setStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [isDeleting, setIsDeleting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const [fileName, setFileName] = useState('');

  React.useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(customFileName || file.name);
    setErrorMsg('');
    
    try {
      setStatus('uploading');
      setProgress(10);

      const formData = new FormData();
      
      if (folderName) {
        formData.append('folder_name', folderName);
      }

      if (customFileName) {
        formData.append('file', file, customFileName);
      } else {
        formData.append('file', file);
      }

      const res = await axiosInstance.post('/hubin/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          if (isMounted.current && progressEvent.total) {
            const pct = Math.round((progressEvent.loaded * 90) / progressEvent.total);
            setProgress(Math.max(10, pct));
          }
        }
      });

      if (!isMounted.current) return;
      const uploadedUrl = res.data?.data?.url || res.data?.url || res.data?.data || '';
      if (!uploadedUrl) {
        throw new Error('Gagal mengunggah foto. Server tidak mengembalikan URL berkas.');
      }

      setProgress(100);
      setStatus('success');
      onChange(uploadedUrl);
    } catch (err: unknown) {
      const error = err as Error;
      console.error(error);
      if (isMounted.current) {
        setErrorMsg(error.message || 'Terjadi kesalahan saat mengunggah.');
        setStatus('error');
      }
    }
  }, [customFileName, folderName, onChange]);

  const handleReset = useCallback(async () => {
    if (value) {
      setIsDeleting(true);
      const deleteToast = toast.loading('Menghapus file permanen...');
      try {
        await hubinApi.deletePhoto(value);
        toast.success('File berhasil dihapus.', { id: deleteToast });
      } catch (err: unknown) {
        const error = err as Error;
        console.error('Failed to delete file:', error);
        toast.error('Gagal menghapus file dari penyimpanan, tapi tautan dilepas.', { id: deleteToast });
      } finally {
        if (isMounted.current) {
          setIsDeleting(false);
        }
      }
    }
    
    if (isMounted.current) {
      onChange('');
      setFileName('');
      setStatus('idle');
      setProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }, [value, onChange]);

  return (
    <div className={compact ? "space-y-1.5" : "space-y-2"}>
      {!compact && (
        <div className="flex justify-between items-center">
          <label className="text-xs font-bold text-slate-450 dark:text-slate-400 uppercase tracking-widest">
            {label}
          </label>
          {value && (
            <span className="flex items-center gap-1 text-[9px] font-black text-emerald-650 bg-emerald-50 dark:bg-emerald-950/20 px-2 py-0.5 rounded-full border border-emerald-100/50">
              <CheckCircle size={10} /> Tersimpan
            </span>
          )}
        </div>
      )}

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
      />

      {status === 'idle' && !value && (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className={`w-full flex ${compact ? 'flex-row p-3' : 'flex-col p-6'} items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-900/20 hover:bg-indigo-50/20 hover:border-indigo-300 dark:hover:bg-slate-900/40 dark:hover:border-indigo-950/40 transition-all group`}
        >
          <div className="flex items-center gap-3">
            <div className={`${compact ? 'p-1.5' : 'p-3'} bg-white dark:bg-slate-950 rounded-xl shadow-sm border border-slate-100 dark:border-slate-850 flex items-center justify-center`}>
              <Cloud className={`${compact ? 'w-4 h-4' : 'w-6 h-6'} text-indigo-500`} />
            </div>
            {!compact && (
              <div className="p-3 bg-indigo-50 dark:bg-indigo-950/20 rounded-xl text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <UploadCloud size={20} className="group-hover:translate-y-[-2px] transition-transform" />
              </div>
            )}
          </div>
          <div className={compact ? "ml-3 text-left" : "text-center"}>
            <p className="text-xs font-bold text-slate-700 dark:text-slate-350 mt-0">
              {compact ? (label === 'Foto Bukti Kegiatan' ? 'Upload Foto' : label) : 'Upload Foto Kegiatan'}
            </p>
            {!compact && (
              <p className="text-[10px] text-slate-400 font-semibold mt-1">
                Menyimpan otomatis ke penyimpanan sistem
              </p>
            )}
          </div>
        </button>
      )}

      {status === 'uploading' && (
        <div className={`w-full ${compact ? 'p-3' : 'p-5'} border border-slate-100 dark:border-slate-850 rounded-xl bg-white dark:bg-slate-900 shadow-sm space-y-4`}>
          <div className="flex items-center gap-3">
            <div className={`${compact ? 'w-7 h-7' : 'w-9 h-9'} rounded-lg bg-slate-50 dark:bg-slate-950 flex items-center justify-center animate-spin`}>
              <RefreshCw size={compact ? 12 : 16} className="text-indigo-650" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                {fileName || 'Menyiapkan berkas...'}
              </p>
              {!compact && (
                <p className="text-[10px] text-indigo-600 dark:text-indigo-400 font-black uppercase tracking-wider mt-0.5">
                  ☁️ Mengunggah ke penyimpanan...
                </p>
              )}
            </div>
            <span className="text-xs font-mono font-black text-slate-500">{progress}%</span>
          </div>

          <div className={`w-full bg-slate-100 dark:bg-slate-950 ${compact ? 'h-1' : 'h-2'} rounded-full overflow-hidden`}>
            <div
              className="bg-gradient-to-r from-indigo-500 to-indigo-600 h-full rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {value && (() => {
        return (
          <div className={`w-full ${compact ? 'p-2' : 'p-4'} border border-indigo-100/50 dark:border-indigo-950/30 rounded-xl bg-indigo-50/10 dark:bg-slate-900/20 shadow-sm flex items-center gap-4 animate-fadeIn`}>
            <div className={`${compact ? 'w-10 h-10' : 'w-14 h-14'} relative group overflow-hidden rounded-xl border border-indigo-100/50 dark:border-slate-850 flex items-center justify-center shrink-0 bg-white dark:bg-slate-950 shadow-sm`}>
              <img 
                src={value} 
                alt="Preview" 
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover transition-transform group-hover:scale-110"
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-black text-slate-800 dark:text-slate-200 truncate flex items-center gap-1.5">
                <span>{fileName || 'foto_kegiatan.jpg'}</span>
              </p>
              <div className="flex items-center gap-2 mt-1">
                <a
                  href={value}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-650 dark:text-indigo-400 hover:underline"
                >
                  <ExternalLink size={10} /> Lihat Foto
                </a>
              </div>
            </div>
            <button
              type="button"
              onClick={handleReset}
              disabled={isDeleting}
              className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-xl transition-colors shrink-0 disabled:opacity-50"
            >
              {isDeleting ? <RefreshCw size={compact ? 14 : 16} className="animate-spin" /> : <Trash2 size={compact ? 14 : 16} />}
            </button>
          </div>
        );
      })()}

      {status === 'error' && (
        <div className="p-4 border border-rose-100 dark:border-rose-950/30 rounded-xl bg-rose-50/30 dark:bg-rose-950/10 flex items-start gap-3">
          <AlertCircle className="text-rose-500 shrink-0 mt-0.5" size={16} />
          <div className="flex-1">
            <p className="text-xs font-bold text-rose-800 dark:text-rose-450">Gagal Mengunggah</p>
            <p className="text-[10px] text-slate-500 mt-1">{errorMsg}</p>
            <Button
              type="button"
              variant="toolbarOutline"
              size="xs"
              onClick={handleReset}
              className="mt-2 text-[10px] font-bold text-rose-600 border-rose-200 hover:bg-rose-50"
            >
              Coba Lagi
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
