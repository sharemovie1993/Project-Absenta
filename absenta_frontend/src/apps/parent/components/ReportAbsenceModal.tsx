import { useState } from 'react';
import { X, Send, AlertCircle } from 'lucide-react';
import { reportStudentAbsence } from '../../../api/parent.api';

interface ReportAbsenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentId: string;
  onSuccess: () => void;
}

export default function ReportAbsenceModal({ isOpen, onClose, studentId, onSuccess }: ReportAbsenceModalProps) {
  const [status, setStatus] = useState<'SAKIT' | 'IZIN'>('SAKIT');
  const [keterangan, setKeterangan] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keterangan.trim()) {
      setError('Keterangan wajib diisi');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await reportStudentAbsence(studentId, { status, keterangan });
      onSuccess();
      onClose();
      // Reset form
      setKeterangan('');
      setStatus('SAKIT');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Gagal mengirim laporan. Coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl w-full max-w-md shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
          <h3 className="font-bold text-gray-800 text-lg">Lapor Ketidakhadiran</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-200 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm flex items-start">
              <AlertCircle className="w-4 h-4 mr-2 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Status Kehadiran</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setStatus('SAKIT')}
                className={`p-3 rounded-xl border flex items-center justify-center transition-all ${
                  status === 'SAKIT' 
                    ? 'bg-blue-50 border-blue-200 text-blue-700 font-bold shadow-sm' 
                    : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                SAKIT
              </button>
              <button
                type="button"
                onClick={() => setStatus('IZIN')}
                className={`p-3 rounded-xl border flex items-center justify-center transition-all ${
                  status === 'IZIN' 
                    ? 'bg-purple-50 border-purple-200 text-purple-700 font-bold shadow-sm' 
                    : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                IZIN
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Keterangan / Alasan</label>
            <textarea
              value={keterangan}
              onChange={(e) => setKeterangan(e.target.value)}
              placeholder="Contoh: Demam tinggi, ada acara keluarga, dll..."
              className="w-full p-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition min-h-[100px] text-sm"
              required
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-blue-200 active:scale-[0.98] transition-all flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Kirim Laporan
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
