import React, { useState } from 'react';
import api from '../../../lib/axiosInstance';
import { Button } from '../../ui';
import { AlertCircle, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

interface PeriodFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const PeriodFormModal = React.memo<PeriodFormModalProps>(({ isOpen, onClose, onSuccess }) => {
  const [newPeriodData, setNewPeriodData] = useState({
    year: new Date().getFullYear() - 1,
    startDate: `${new Date().getFullYear() - 1}-01-01`,
    endDate: `${new Date().getFullYear() - 1}-12-31`,
    totalRevenue: '',
    totalExpense: ''
  });
  const [creatingPeriod, setCreatingPeriod] = useState(false);
  const [loadingLabaRugi, setLoadingLabaRugi] = useState(false);

  const fetchLabaRugiData = async () => {
    try {
      setLoadingLabaRugi(true);
      const params = new URLSearchParams();
      if (newPeriodData.startDate) params.append('startDate', new Date(newPeriodData.startDate).toISOString());
      if (newPeriodData.endDate) {
        const endOfDay = new Date(newPeriodData.endDate);
        endOfDay.setHours(23, 59, 59, 999);
        params.append('endDate', endOfDay.toISOString());
      }
      const res = await api.get(`/cooperative/reports/laba-rugi?${params.toString()}`);
      if (res.data?.data?.summary) {
        const { totalRevenue, totalExpense } = res.data.data.summary;
        setNewPeriodData(prev => ({
          ...prev,
          totalRevenue: String(Math.round(totalRevenue) || 0),
          totalExpense: String(Math.round(totalExpense) || 0)
        }));
        const tahun = newPeriodData.year;
        if (totalRevenue > 0 || totalExpense > 0) {
          toast.success(`Data Laba-Rugi Tahun ${tahun} berhasil ditarik! Pendapatan: Rp ${Math.round(totalRevenue).toLocaleString('id-ID')}`);
        } else {
          toast(`Tidak ada transaksi yang tercatat pada periode ${tahun}. Pastikan tahun buku sesuai dengan periode transaksi.`, { icon: 'ℹ️' });
        }
      } else {
        toast.error('Gagal mengambil data Laba-Rugi');
      }
    } catch (err) {
      console.error(err);
      toast.error('Gagal mengambil data Laba-Rugi');
    } finally {
      setLoadingLabaRugi(false);
    }
  };

  const handleCreatePeriodSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingPeriod(true);
    try {
      const payload = {
        year: Number(newPeriodData.year),
        startDate: new Date(newPeriodData.startDate).toISOString(),
        endDate: new Date(newPeriodData.endDate).toISOString(),
        totalRevenue: Number(newPeriodData.totalRevenue),
        totalExpense: Number(newPeriodData.totalExpense)
      };
      const res = await api.post('/cooperative/shu/periods', payload);
      if (res.data?.success) {
        toast.success('Periode SHU berhasil dibuat!');
        onSuccess();
        onClose();
      }
    } catch (err: unknown) {
      console.error(err);
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || 'Gagal membuat periode SHU');
    } finally {
      setCreatingPeriod(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-5 border-b border-slate-100 dark:border-slate-850 bg-slate-50/50 dark:bg-slate-950/20 flex justify-between items-center">
          <div>
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-855 dark:text-slate-100">Buat Periode SHU Baru</h3>
            <p className="text-[10px] text-slate-400">Inisialisasi tahun buku kalkulasi SHU</p>
          </div>
          <button 
            onClick={onClose}
            type="button"
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1"
          >
            <AlertCircle size={18} className="rotate-45" />
          </button>
        </div>

        <form onSubmit={handleCreatePeriodSubmit}>
          <div className="p-6 space-y-4">
            {/* Year */}
            <div className="space-y-1">
              <label htmlFor="modal-year" className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Tahun Buku</label>
              <input
                id="modal-year"
                type="number"
                value={newPeriodData.year}
                onChange={(e) => setNewPeriodData(prev => ({ ...prev, year: Number(e.target.value) }))}
                className="w-full h-9 px-3 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-bold"
                required
                aria-label="Tahun Buku"
              />
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label htmlFor="modal-start-date" className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Tanggal Mulai</label>
                <input
                  id="modal-start-date"
                  type="date"
                  value={newPeriodData.startDate}
                  onChange={(e) => setNewPeriodData(prev => ({ ...prev, startDate: e.target.value }))}
                  className="w-full h-9 px-3 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  required
                  aria-label="Tanggal Mulai"
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="modal-end-date" className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Tanggal Selesai</label>
                <input
                  id="modal-end-date"
                  type="date"
                  value={newPeriodData.endDate}
                  onChange={(e) => setNewPeriodData(prev => ({ ...prev, endDate: e.target.value }))}
                  className="w-full h-9 px-3 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  required
                  aria-label="Tanggal Selesai"
                />
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-850 flex justify-between items-center">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Sumber Nilai SHU</span>
              <button
                type="button"
                onClick={fetchLabaRugiData}
                disabled={loadingLabaRugi}
                className="text-[10px] text-indigo-655 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 font-bold flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                {loadingLabaRugi ? (
                  <span className="w-2.5 h-2.5 border border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin"></span>
                ) : (
                  <RefreshCw size={10} />
                )}
                Tarik data Laba Rugi
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2">
              {/* Revenue */}
              <div className="space-y-1">
                <label htmlFor="modal-revenue" className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Total Pendapatan (Rp)</label>
                <input
                  id="modal-revenue"
                  type="number"
                  value={newPeriodData.totalRevenue}
                  onChange={(e) => setNewPeriodData(prev => ({ ...prev, totalRevenue: e.target.value }))}
                  placeholder="Input pendapatan kotor"
                  className="w-full h-9 px-3 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none"
                  required
                  aria-label="Total Pendapatan"
                />
              </div>
              {/* Expense */}
              <div className="space-y-1">
                <label htmlFor="modal-expense" className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Total Biaya/Beban (Rp)</label>
                <input
                  id="modal-expense"
                  type="number"
                  value={newPeriodData.totalExpense}
                  onChange={(e) => setNewPeriodData(prev => ({ ...prev, totalExpense: e.target.value }))}
                  placeholder="Input biaya operasional"
                  className="w-full h-9 px-3 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none"
                  required
                  aria-label="Total Biaya"
                />
              </div>
            </div>

            {newPeriodData.totalRevenue && newPeriodData.totalExpense && (
              <div className="p-3 bg-indigo-500/5 border border-indigo-500/20 rounded-xl flex justify-between items-center text-xs">
                <span className="font-bold text-slate-500">Estimasi SHU Bersih:</span>
                <span className="font-black text-indigo-650">
                  Rp {(Number(newPeriodData.totalRevenue) - Number(newPeriodData.totalExpense)).toLocaleString('id-ID')}
                </span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="p-5 border-t border-slate-100 dark:border-slate-850 bg-slate-50/50 dark:bg-slate-955/20 flex gap-3 justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="rounded-xl text-xs font-bold text-slate-500"
            >
              Batal
            </Button>
            <Button
              type="submit"
              disabled={creatingPeriod}
              size="sm"
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs"
            >
              {creatingPeriod ? 'Membuat...' : 'Buat Periode'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
});

PeriodFormModal.displayName = 'PeriodFormModal';
