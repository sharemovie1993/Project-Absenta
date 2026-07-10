import React, { useState, useEffect } from 'react';
import { Download, Upload, X, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { Modal } from '../../ui/Modal';
import { Button } from '../../ui/Button';
import { Alert } from '../../ui/Alert';
import ImportResultStats from './ImportResultStats';
import { useSocket } from '../../../hooks/useSocket';

interface ImportResult {
  created?: number;
  updated?: number;
  skipped?: number;
  data?: unknown;
  errors?: Array<{
    row: number;
    message: string;
  }>;
}

interface ExcelImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  onImport: (file: File, onProgress: (progress: number) => void, socketId?: string) => Promise<{ success: boolean; data?: any; errors?: any[] } | any>;
  onDownloadTemplate: () => Promise<void>;
  onSuccess?: () => void;
  sampleDataHint?: string;
  templateName?: string;
  description?: string;
  children?: React.ReactNode;
  /** Pesan tips yang muncul SETELAH import berhasil — berguna untuk mengingatkan langkah selanjutnya */
  successHint?: {
    icon?: React.ReactNode;
    title: string;
    message: string;
    actionLabel?: string;
    onAction?: () => void;
  };
}

export const ExcelImportModal: React.FC<ExcelImportModalProps> = React.memo(({
  isOpen,
  onClose,
  title,
  onImport,
  onDownloadTemplate,
  onSuccess,
  templateName,
  description,
  children,
  successHint,
  sampleDataHint = "Pastikan format file sesuai dengan template yang disediakan."
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [importStatus, setImportStatus] = useState<'idle' | 'uploading' | 'processing' | 'success' | 'error'>('idle');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [realtimeDetails, setRealtimeDetails] = useState<{
    current?: number;
    total?: number;
    created?: number;
    updated?: number;
    failed?: number;
  } | null>(null);
  const [isRealtimeActive, setIsRealtimeActive] = useState(false);

  const resetState = () => {
    setFile(null);
    setProgress(0);
    setUploadProgress(0);
    setProcessingProgress(0);
    setRealtimeDetails(null);
    setIsRealtimeActive(false);
    setImportStatus('idle');
    setLoading(false);
    setResult(null);
    setError(null);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  let socketContext: any = null;
  try {
    socketContext = useSocket();
  } catch (e) {
    // SocketContext not found
  }
  const socket = socketContext?.socket;

  useEffect(() => {
    if (!socket || !loading) return;

    const handleImportProgress = (data: any) => {
      if (data && typeof data.progress === 'number') {
        setIsRealtimeActive(true);
        setProcessingProgress(data.progress);
        
        // Calculate/retrieve total
        const total = data.total || (data.current ? Math.round(data.current / (data.progress / 100)) : undefined);
        setRealtimeDetails({
          current: data.current || Math.round((data.progress / 100) * (total || 0)),
          total: total,
          created: data.created,
          updated: data.updated,
          failed: data.failed
        });
      }
    };

    socket.on('import_progress', handleImportProgress);

    return () => {
      socket.off('import_progress', handleImportProgress);
    };
  }, [socket, loading]);

  const handleImport = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setImportStatus('uploading');
    setUploadProgress(0);
    setProcessingProgress(0);
    setIsRealtimeActive(false);
    setRealtimeDetails(null);

    let intervalId: any = null;
    let currentProcessing = 0;

    const updateProgress = (p: number) => {
      setUploadProgress(p);
      if (p >= 100) {
        setImportStatus('processing');
        // Start fallback trickling after 1.5 seconds if no socket updates are received
        setTimeout(() => {
          if (!isRealtimeActive && !intervalId) {
            intervalId = setInterval(() => {
              if (currentProcessing < 98) {
                const increment = Math.max(1, Math.round((98 - currentProcessing) * 0.05));
                currentProcessing += increment;
                setProcessingProgress(currentProcessing);
              } else {
                if (intervalId) clearInterval(intervalId);
              }
            }, 500);
          }
        }, 1500);
      }
    };

    try {
      const res = await onImport(file, updateProgress, socket?.id);
      if (intervalId) clearInterval(intervalId);
      setProcessingProgress(100);
      setImportStatus('success');
      
      // Delay slightly for visual feedback
      await new Promise(r => setTimeout(r, 400));
      
      setResult(res.data || res);
      if (onSuccess) onSuccess();
    } catch (e: any) {
      if (intervalId) clearInterval(intervalId);
      setImportStatus('error');
      setProcessingProgress(0);
      setError(e?.response?.data?.message || e?.message || 'Proses impor gagal.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={title}
      size="lg"
      disableClose={loading}
    >
      <div className="space-y-6 p-1">
        {/* 1. Header Info & Template Download */}
        <div className="bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-xl p-4 flex items-start gap-4">
          <div className="bg-blue-100 dark:bg-blue-900/50 p-2 rounded-xl text-blue-600 dark:text-blue-400">
            <Download size={20} />
          </div>
          <div className="flex-1 space-y-1">
            <h4 className="text-xs font-black text-blue-900 dark:text-blue-300 uppercase tracking-tight">
              {description || 'Gunakan Template Standar'}
            </h4>
            <p className="text-[11px] text-blue-700 dark:text-blue-400 leading-relaxed">{sampleDataHint}</p>
            <button 
              onClick={onDownloadTemplate}
              className="text-[11px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest hover:underline pt-1 flex items-center gap-1.5"
            >
              {templateName ? `Unduh ${templateName}` : 'Unduh Template Excel'} <Download size={12} />
            </button>
          </div>
        </div>

        {/* 2. Error Message */}
        {error && (
          <Alert variant="destructive" className="rounded-xl py-3">
            <div className="flex items-center gap-2">
              <AlertCircle size={14} />
              <span className="text-[11px] font-medium whitespace-pre-wrap">{error}</span>
            </div>
          </Alert>
        )}

        {/* 3. Results Summary */}
        {result && (
          <>
            <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
              <ImportResultStats result={result} />
              
              {result.errors && result.errors.length > 0 && (
                <div className="border border-slate-100 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
                  <div className="bg-slate-50 dark:bg-slate-900 px-4 py-2 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] font-black text-rose-600 uppercase tracking-widest">Detail Kesalahan Data</span>
                  </div>
                  <div className="max-h-48 overflow-y-auto scrollbar-thin">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50/50 dark:bg-slate-900/50 sticky top-0 backdrop-blur-sm">
                        <tr>
                          <th className="p-3 text-[10px] font-black text-slate-400 uppercase tracking-widest w-16">Baris</th>
                          <th className="p-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Pesan Kesalahan</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                        {(result.errors || []).map((err, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors">
                            <td className="p-3 font-mono text-[10px] text-slate-500">#{err.row}</td>
                            <td className="p-3 text-[11px] font-medium text-rose-600 dark:text-rose-400 leading-relaxed">{err.message}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Success Hint — ditampilkan hanya setelah import selesai */}
            {successHint && (
              <div className="flex items-start gap-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 rounded-xl p-4 animate-in fade-in slide-in-from-bottom-2 duration-400">
                <div className="shrink-0 mt-0.5 w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center text-amber-600 dark:text-amber-400">
                  {successHint.icon || (
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                      <line x1="12" y1="9" x2="12" y2="13"/>
                      <line x1="12" y1="17" x2="12.01" y2="17"/>
                    </svg>
                  )}
                </div>
                <div className="flex-1 space-y-1">
                  <p className="text-[11px] font-black text-amber-900 dark:text-amber-300 uppercase tracking-tight">
                    {successHint.title}
                  </p>
                  <p className="text-[11px] text-amber-700 dark:text-amber-400 leading-relaxed font-medium">
                    {successHint.message}
                  </p>
                  {successHint.actionLabel && successHint.onAction && (
                    <button
                      onClick={successHint.onAction}
                      className="mt-1 text-[11px] font-black text-amber-700 dark:text-amber-300 uppercase tracking-widest hover:underline flex items-center gap-1"
                    >
                      {successHint.actionLabel}
                      <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                    </button>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        {/* 3.5 Extra Fields (Selection for year, etc) */}
        {!result && children && (
          <div className="bg-slate-50/50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-xl p-4 space-y-4">
            {children}
          </div>
        )}

        {/* Progress Bar with label */}
        {loading && (
          <div className="space-y-4 animate-in fade-in zoom-in-95 duration-500 py-2">
            {/* Status Header */}
            <div className="flex flex-col gap-2 bg-blue-50/60 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800/30 shadow-sm">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black text-blue-700 dark:text-blue-400 uppercase tracking-widest flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-ping" />
                  {importStatus === 'uploading' ? 'Mengunggah Berkas...' : 'Memproses di Database...'}
                </span>
                <span className="text-[10px] font-black text-blue-600 dark:text-blue-400">
                  {importStatus === 'uploading' ? `${uploadProgress}%` : `${processingProgress}%`}
                </span>
              </div>

              {/* Real-time counters if available */}
              {importStatus === 'processing' && realtimeDetails && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-2 border-t border-blue-100/50 dark:border-blue-800/30 text-[10px] font-bold text-slate-600 dark:text-slate-400">
                  {realtimeDetails.current !== undefined && realtimeDetails.total !== undefined && (
                    <div className="flex flex-col">
                      <span className="text-slate-400 uppercase text-[9px] font-black tracking-wider">Progress Baris</span>
                      <span className="text-slate-900 dark:text-slate-200">{realtimeDetails.current} / {realtimeDetails.total} baris</span>
                    </div>
                  )}
                  {realtimeDetails.created !== undefined && (
                    <div className="flex flex-col">
                      <span className="text-emerald-500 uppercase text-[9px] font-black tracking-wider">Data Baru</span>
                      <span className="text-emerald-600 dark:text-emerald-400">+{realtimeDetails.created}</span>
                    </div>
                  )}
                  {realtimeDetails.updated !== undefined && (
                    <div className="flex flex-col">
                      <span className="text-blue-500 uppercase text-[9px] font-black tracking-wider">Pembalikan/Update</span>
                      <span className="text-blue-600 dark:text-blue-400">+{realtimeDetails.updated}</span>
                    </div>
                  )}
                  {realtimeDetails.failed !== undefined && (
                    <div className="flex flex-col">
                      <span className="text-rose-500 uppercase text-[9px] font-black tracking-wider">Gagal</span>
                      <span className="text-rose-600 dark:text-rose-400">+{realtimeDetails.failed}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Visual Progress Bar */}
            <div className="relative h-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden shadow-inner p-0.5">
              <div 
                className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-blue-600 transition-all duration-500 ease-out rounded-full shadow-lg relative" 
                style={{ width: `${importStatus === 'uploading' ? uploadProgress : processingProgress}%` }} 
              >
                <div className="absolute inset-0 bg-white/20 animate-pulse" />
              </div>
            </div>
            
            <p className="text-center text-[10px] font-medium text-slate-400">
              Jangan tutup halaman ini atau berpindah menu sampai proses selesai.
            </p>
          </div>
        )}

        {/* 4. Upload Area */}
        <div className={`relative group transition-all ${loading ? 'opacity-30 blur-[1px] pointer-events-none' : ''}`}>
          <div className={`border-2 border-dashed rounded-xl p-8 transition-all flex flex-col items-center justify-center gap-4 ${
            file 
              ? 'border-blue-500 bg-blue-500/5 dark:bg-blue-500/10' 
              : 'border-slate-200 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-500 bg-slate-50/50 dark:bg-slate-900/50'
          }`}>
            <div className={`p-4 rounded-xl shadow-xl transition-transform group-hover:scale-110 ${
              file ? 'bg-blue-500 text-white' : 'bg-white dark:bg-slate-800 text-slate-400'
            }`}>
              {file ? <CheckCircle2 size={32} /> : <Upload size={32} />}
            </div>
            
            <div className="text-center space-y-1">
              <p className="text-xs font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight">
                {file ? file.name : 'Pilih File Excel Anda'}
              </p>
              <p className="text-[10px] text-slate-400 font-medium">Format: .xlsx (Maks 10MB)</p>
            </div>

            <input 
              type="file" 
              accept=".xlsx" 
              className="absolute inset-0 opacity-0 cursor-pointer" 
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              disabled={loading}
            />
            
            {file && (
              <button 
                onClick={(e) => { e.stopPropagation(); setFile(null); setResult(null); }}
                className="absolute top-4 right-4 p-2 text-slate-400 hover:text-rose-500 transition-colors"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>

        {/* 5. Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button 
            variant="outline" 
            onClick={handleClose}
            className="rounded-xl px-6 text-[11px] font-black uppercase tracking-widest"
          >
            {result ? 'Tutup' : 'Batal'}
          </Button>
          {!result && (
            <Button 
              onClick={handleImport}
              disabled={!file || loading}
              className={`rounded-xl px-8 text-[11px] font-black uppercase tracking-widest shadow-lg transition-all duration-300 ${
                file && !loading
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/30 scale-[1.02]'
                  : 'shadow-blue-500/20'
              }`}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-3.5 w-3.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Sedang Impor...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  {file && <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
                  Mulai Impor
                </span>
              )}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
});

ExcelImportModal.displayName = 'ExcelImportModal';

