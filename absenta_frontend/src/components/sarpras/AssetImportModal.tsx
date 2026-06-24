import React, { useState, useRef, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  FileUp, 
  Download, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  FileSpreadsheet,
  UploadCloud,
  Loader2
} from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { sarprasApi } from '../../api/sarpras.api';
import { useToast } from '../../hooks/useToast';
import { motion, AnimatePresence } from 'framer-motion';

interface AssetImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ImportResult {
  created: number;
  updated: number;
  failed: number;
  errors: string[];
}

const AssetImportModal: React.FC<AssetImportModalProps> = ({ isOpen, onClose }) => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  const mutation = useMutation({
    mutationFn: (formData: FormData) => sarprasApi.importAssets(formData),
    onSuccess: (res: { message?: string; data: ImportResult }) => {
      showToast(res.message || 'Import berhasil', 'success');
      setImportResult(res.data);
      queryClient.invalidateQueries({ queryKey: ['sarpras-assets'] });
      queryClient.invalidateQueries({ queryKey: ['sarpras-stats'] });
    },
    onError: (err: unknown) => {
      let errMsg = 'Gagal melakukan import';
      if (err && typeof err === 'object' && 'response' in err) {
        const resErr = err as { response?: { data?: { message?: string } } };
        if (resErr.response?.data?.message) {
          errMsg = resErr.response.data.message;
        }
      } else if (err instanceof Error) {
        errMsg = err.message;
      }
      showToast(errMsg, 'error');
    }
  });

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (!selectedFile.name.match(/\.(xlsx|xls)$/)) {
        showToast('Format file harus Excel (.xlsx atau .xls)', 'error');
        return;
      }
      setFile(selectedFile);
      setImportResult(null);
    }
  }, [showToast]);

  const handleUpload = useCallback(() => {
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    mutation.mutate(formData);
  }, [file, mutation]);

  const handleDownloadTemplate = useCallback(async () => {
    try {
      const blob = await sarprasApi.downloadImportTemplate();
      
      // Re-wrap blob with explicit MIME type to ensure browser recognition
      const excelBlob = new Blob([blob], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      
      const url = window.URL.createObjectURL(excelBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'template_import_aset.xlsx';
      
      // Append to body is important for some browsers
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      setTimeout(() => {
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }, 100);
    } catch (error) {
      showToast('Gagal mengunduh template', 'error');
    }
  }, [showToast]);

  const reset = useCallback(() => {
    setFile(null);
    setImportResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={() => { onClose(); reset(); }} 
      title="Import Aset Massal"
      size="lg"
    >
      <div className="space-y-6">
        {/* Step 1: Download Template */}
        <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 shrink-0">
              <Download size={20} />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-slate-800 dark:text-slate-200">Langkah 1: Unduh Template</h4>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Gunakan format Excel standar kami agar data dapat terbaca dengan sempurna oleh sistem.
              </p>
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-3" 
                onClick={handleDownloadTemplate}
              >
                <FileSpreadsheet size={16} className="mr-2 text-green-600" />
                Unduh Template .xlsx
              </Button>
            </div>
          </div>
        </div>

        {/* Step 2: Upload File */}
        {!importResult ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-indigo-600 font-semibold text-sm uppercase tracking-wider">
              <UploadCloud size={16} /> Langkah 2: Unggah File
            </div>
            
            <div 
              className={`
                border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center transition-all cursor-pointer
                ${file ? 'border-indigo-400 bg-indigo-50/30' : 'border-slate-200 dark:border-slate-800 hover:border-indigo-300 hover:bg-slate-50'}
              `}
              onClick={() => fileInputRef.current?.click()}
            >
              <input 
                type="file" 
                className="hidden" 
                ref={fileInputRef} 
                onChange={handleFileChange}
                accept=".xlsx, .xls"
              />
              
              <div className={`w-16 h-16 rounded-xl mb-4 flex items-center justify-center transition-transform ${file ? 'bg-indigo-600 text-white scale-110 shadow-lg shadow-indigo-200' : 'bg-slate-100 text-slate-400'}`}>
                <FileUp size={32} />
              </div>

              {file ? (
                <div className="text-center">
                  <p className="font-medium text-slate-800 dark:text-slate-200">{file.name}</p>
                  <p className="text-xs text-slate-500 mt-1">{(file.size / 1024).toFixed(1)} KB</p>
                  <button 
                    className="text-xs text-red-500 mt-2 font-semibold hover:underline"
                    onClick={(e) => { e.stopPropagation(); reset(); }}
                  >
                    Ganti File
                  </button>
                </div>
              ) : (
                <div className="text-center">
                  <p className="font-medium text-slate-700 dark:text-slate-300">Klik atau geser file ke sini</p>
                  <p className="text-xs text-slate-400 mt-1">Mendukung file Excel (.xlsx, .xls)</p>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={onClose} disabled={mutation.isPending}>
                <X size={16} className="mr-2" /> Batal
              </Button>
              <Button 
                onClick={handleUpload} 
                disabled={!file || mutation.isPending}
                className="bg-indigo-600 hover:bg-indigo-700 text-white min-w-[120px]"
              >
                {mutation.isPending ? (
                  <Loader2 size={16} className="mr-2 animate-spin" />
                ) : (
                  <CheckCircle2 size={16} className="mr-2" />
                )}
                {mutation.isPending ? 'Memproses...' : 'Proses Import'}
              </Button>
            </div>
          </div>
        ) : (
          /* Step 3: Result Summary */
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-6 rounded-xl text-center">
              <div className="w-16 h-16 bg-green-500 text-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-green-200">
                <CheckCircle2 size={32} />
              </div>
              <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 italic">Import Selesai!</h3>
              <p className="text-slate-600 dark:text-slate-400 mt-2">Data inventaris Anda telah diperbarui.</p>
              
              <div className="grid grid-cols-3 gap-4 mt-6">
                <div className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm">
                  <div className="text-2xl font-bold text-indigo-600">{importResult.created}</div>
                  <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mt-1">Baru</div>
                </div>
                <div className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm">
                  <div className="text-2xl font-bold text-teal-600">{importResult.updated}</div>
                  <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mt-1">Update</div>
                </div>
                <div className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm">
                  <div className="text-2xl font-bold text-red-500">{importResult.failed}</div>
                  <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mt-1">Gagal</div>
                </div>
              </div>
            </div>

            {importResult.errors?.length > 0 && (
              <div className="max-h-40 overflow-y-auto p-4 bg-red-50 dark:bg-red-900/10 rounded-xl border border-red-100 dark:border-red-900/30">
                <div className="flex items-center gap-2 text-red-600 font-bold text-xs uppercase mb-2">
                  <AlertCircle size={14} /> Detail Kesalahan:
                </div>
                <ul className="text-xs text-red-500 space-y-1 list-disc list-inside">
                  {importResult?.errors?.slice(0, 50)?.map((err: string, i: number) => (
                    <li key={i}>{err}</li>
                  ))}
                  {importResult?.errors && importResult.errors.length > 50 && <li>... dan {importResult.errors.length - 50} error lainnya</li>}
                </ul>
              </div>
            )}

            <div className="flex justify-center pt-2">
              <Button onClick={() => { reset(); onClose(); }} className="bg-slate-800 hover:bg-slate-900 text-white rounded-xl px-8">
                Tutup Selesai
              </Button>
            </div>
          </motion.div>
        )}
      </div>
    </Modal>
  );
};

export default AssetImportModal;
