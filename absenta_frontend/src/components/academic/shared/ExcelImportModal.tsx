import React, { useState } from 'react';
import { Download, Upload, X, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { Modal } from '../../ui/Modal';
import { Button } from '../../ui/Button';
import { Alert } from '../../ui/Alert';
import ImportResultStats from './ImportResultStats';

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
  onImport: (file: File, onProgress: (progress: number) => void) => Promise<{ success: boolean; data?: any; errors?: any[] } | any>;
  onDownloadTemplate: () => Promise<void>;
  onSuccess?: () => void;
  sampleDataHint?: string;
  templateName?: string;
  description?: string;
  children?: React.ReactNode;
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
  sampleDataHint = "Pastikan format file sesuai dengan template yang disediakan."
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const resetState = () => {
    setFile(null);
    setProgress(0);
    setLoading(false);
    setResult(null);
    setError(null);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleImport = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    setResult(null);
    
    try {
      const res = await onImport(file, (p) => setProgress(p));
      setResult(res.data || res);
      if (onSuccess) onSuccess();
    } catch (e: any) {
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
        )}

        {/* 3.5 Extra Fields (Selection for year, etc) */}
        {!result && children && (
          <div className="bg-slate-50/50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-xl p-4 space-y-4">
            {children}
          </div>
        )}

        {/* Progress Bar with label */}
        {loading && (
          <div className="space-y-3 animate-in fade-in zoom-in-95 duration-500 py-2">
            <div className="flex justify-between items-center bg-blue-50/80 dark:bg-blue-900/20 px-4 py-2 rounded-xl border border-blue-100 dark:border-blue-800/30 shadow-sm">
              <span className="text-[10px] font-black text-blue-700 dark:text-blue-400 uppercase tracking-widest flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-ping" />
                Sedang Memproses: {progress}%
              </span>
              <span className="text-[10px] font-black text-blue-600 dark:text-blue-400">
                Jangan tutup halaman ini
              </span>
            </div>
            <div className="relative h-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden shadow-inner p-0.5">
              <div 
                className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-blue-600 transition-all duration-500 ease-out rounded-full shadow-lg relative" 
                style={{ width: `${progress}%` }} 
              >
                <div className="absolute inset-0 bg-white/20 animate-pulse" />
              </div>
            </div>
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
              className="rounded-xl px-8 text-[11px] font-black uppercase tracking-widest shadow-lg shadow-blue-500/20"
            >
              {loading ? 'Sedang Impor...' : 'Mulai Impor'}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
});

ExcelImportModal.displayName = 'ExcelImportModal';

