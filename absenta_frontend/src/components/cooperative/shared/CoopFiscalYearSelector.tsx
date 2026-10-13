import React, { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Calendar, CheckCircle2, Lock } from 'lucide-react';
import api from '@/lib/axiosInstance';
import toast from 'react-hot-toast';
import { useCapabilities } from '@/hooks/useCapabilities';

export interface FiscalYearOption {
  id: string;
  year: number;
  startDate: string;
  endDate: string;
  status: 'DRAFT' | 'CALCULATED' | 'APPROVED' | 'DISTRIBUTED';
  isActive?: boolean;
}

interface CoopFiscalYearSelectorProps {
  selectedYearId?: string;
  onSelectYearId?: (id: string) => void;
  showSetDefaultButton?: boolean;
  className?: string;
}

export const CoopFiscalYearSelector: React.FC<CoopFiscalYearSelectorProps> = React.memo(({
  selectedYearId,
  onSelectYearId,
  showSetDefaultButton = false,
  className = '',
}) => {
  const queryClient = useQueryClient();
  const { isKoperasiHead, isAdmin } = useCapabilities();
  const canManage = isKoperasiHead || isAdmin;

  const { data: periods = [], isLoading } = useQuery<FiscalYearOption[]>({
    queryKey: ['koperasi-shu-periods'],
    queryFn: async () => {
      const res = await api.get('/cooperative/shu/periods');
      return (res.data?.success ? res.data.data : []) as FiscalYearOption[];
    },
    staleTime: 5 * 60 * 1000,
  });

  const activeFiscalYear = useMemo(() => {
    return periods.find(p => p.isActive) || periods[0] || null;
  }, [periods]);

  const currentYear = useMemo(() => {
    if (selectedYearId) {
      return periods.find(p => p.id === selectedYearId) || activeFiscalYear;
    }
    return activeFiscalYear;
  }, [selectedYearId, periods, activeFiscalYear]);

  const setActiveMutation = useMutation({
    mutationFn: async (periodId: string) => {
      const res = await api.post(`/cooperative/shu/periods/${periodId}/set-active`);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Tahun Buku aktif berhasil diperbarui!');
      queryClient.invalidateQueries({ queryKey: ['koperasi-shu-periods'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Gagal mengubah Tahun Buku aktif');
    }
  });

  if (isLoading || periods.length === 0) {
    return null;
  }

  const isClosed = currentYear?.status === 'APPROVED' || currentYear?.status === 'DISTRIBUTED';

  return (
    <div className={`flex flex-wrap items-center justify-between gap-3 p-3 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-xs ${className}`}>
      {/* Label & Status */}
      <div className="flex items-center gap-2.5">
        <div className={`p-2 rounded-xl shrink-0 ${isClosed ? 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400' : 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400'}`}>
          {isClosed ? <Lock size={16} /> : <Calendar size={16} />}
        </div>
        <div>
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
            Konteks Tahun Buku Koperasi
          </span>
          <div className="flex items-center gap-2">
            <span className="text-xs font-black text-slate-800 dark:text-slate-100">
              {currentYear ? `Tahun Buku ${currentYear.year}` : 'Tahun Berjalan'}
            </span>
            {currentYear?.isActive && (
              <span className="px-2 py-0.5 text-[9px] font-extrabold bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 rounded-md border border-emerald-500/20">
                AKTIF BERJALAN
              </span>
            )}
            {isClosed ? (
              <span className="px-2 py-0.5 text-[9px] font-extrabold bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 rounded-md">
                TUTUP BUKU (LOCKED)
              </span>
            ) : (
              <span className="px-2 py-0.5 text-[9px] font-extrabold bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 rounded-md">
                {currentYear?.status}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Selector Dropdown & Set Active */}
      <div className="flex items-center gap-2 ml-auto">
        {onSelectYearId && (
          <select
            value={currentYear?.id || ''}
            onChange={(e) => onSelectYearId(e.target.value)}
            className="h-8 px-2.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-bold text-slate-700 dark:text-slate-200 cursor-pointer focus:outline-none focus:ring-1 focus:ring-indigo-500"
            aria-label="Pilih Tahun Buku"
          >
            {periods.map((p) => (
              <option key={p.id} value={p.id}>
                Tahun {p.year} {p.isActive ? '(Aktif)' : `(${p.status})`}
              </option>
            ))}
          </select>
        )}

        {showSetDefaultButton && currentYear && !currentYear.isActive && canManage && (
          <button
            type="button"
            onClick={() => setActiveMutation.mutate(currentYear.id)}
            disabled={setActiveMutation.isPending}
            className="h-8 px-2.5 text-[11px] font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/50 rounded-xl inline-flex items-center gap-1 transition-colors"
          >
            <CheckCircle2 size={13} />
            Jadikan Tahun Aktif
          </button>
        )}
      </div>
    </div>
  );
});

CoopFiscalYearSelector.displayName = 'CoopFiscalYearSelector';
