import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '../../../lib/axiosInstance';
import { Button, SectionCard } from '../../ui';
import { formatDate } from '../../../utils/layoutUtils';
import { Calendar, Plus, CheckCircle2, ArrowUpRight, Trash2, Info } from 'lucide-react';
import toast from 'react-hot-toast';
import useConfirm from '../../../hooks/useConfirm';
import { COOP_QUERY_KEYS, invalidateShuCaches } from '../../../lib/coopQueryKeys';
import { PeriodFormModal } from '../shu/PeriodFormModal';
import type { ShuPeriod } from '../../../pages/cooperative/SHU';

interface ShuPeriodsSettingTableProps {
  canManageShu: boolean;
}

export const ShuPeriodsSettingTable: React.FC<ShuPeriodsSettingTableProps> = React.memo(({ canManageShu }) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const [showPeriodModal, setShowPeriodModal] = useState(false);

  // 1. Fetch Periods
  const periodsQuery = useQuery({
    queryKey: COOP_QUERY_KEYS.shuPeriods,
    queryFn: async () => {
      const res = await api.get('/cooperative/shu/periods');
      return (res.data?.data || []) as ShuPeriod[];
    },
    staleTime: 5 * 60 * 1000
  });

  const periods = periodsQuery.data || [];
  const loadingPeriods = periodsQuery.isLoading;

  // 2. Set active fiscal year mutation
  const setActiveFiscalYearMutation = useMutation({
    mutationFn: async ({ id, year }: { id: string; year: number }) => {
      const res = await api.post(`/cooperative/shu/periods/${id}/set-active`);
      return { data: res.data, year };
    },
    onSuccess: ({ year }) => {
      toast.success(`Tahun Buku ${year} berhasil diset sebagai Tahun Aktif!`);
      invalidateShuCaches(queryClient);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Gagal mengubah tahun aktif');
    }
  });

  // 3. Delete Period Mutation
  const deletePeriodMutation = useMutation({
    mutationFn: async ({ id }: { id: string; year: number }) => {
      const res = await api.delete(`/cooperative/shu/periods/${id}`);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Periode SHU berhasil dihapus!');
      invalidateShuCaches(queryClient);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Gagal menghapus periode SHU');
    }
  });

  const handleDelete = async (id: string, year: number) => {
    const isConfirmed = await confirm({
      title: 'Hapus Periode Tahun Buku',
      description: `Apakah Anda yakin ingin menghapus Tahun Buku ${year}? Data kalkulasi yang belum dibagikan akan terhapus.`,
      style: 'danger'
    });
    if (!isConfirmed) return;
    await deletePeriodMutation.mutateAsync({ id, year });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Informational Guidance Banner */}
      <div className="bg-indigo-50/70 dark:bg-slate-900/60 border border-indigo-100 dark:border-indigo-900/40 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-start gap-3">
          <div className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-xs shrink-0 mt-0.5 sm:mt-0">
            <Info size={18} />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">
              Pengaturan Tahun Buku & Siklus Fiskal
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
              Tahun buku aktif menentukan rentang transaksi yang dihitung. Untuk menghitung alokasi per anggota, persetujuan Ketua, dan pencairan dana ke simpanan, buka menu operasional SHU.
            </p>
          </div>
        </div>
        <Button
          onClick={() => navigate('/cooperative/shu')}
          variant="outline"
          size="sm"
          className="text-indigo-600 border-indigo-200 hover:bg-indigo-50 dark:text-indigo-400 dark:border-indigo-800 font-bold shrink-0 flex items-center gap-1.5 rounded-xl text-xs"
        >
          Buka Operasional SHU <ArrowUpRight size={13} />
        </Button>
      </div>

      {/* Top Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Calendar className="text-indigo-600 dark:text-indigo-400 w-5 h-5" />
            Daftar Tahun Buku & Periode SHU
          </h3>
          <p className="text-xs text-slate-400">Master data siklus tutup buku tahunan koperasi</p>
        </div>
        {canManageShu && (
          <Button
            onClick={() => setShowPeriodModal(true)}
            size="sm"
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold flex items-center justify-center gap-1.5 rounded-xl shadow-xs"
          >
            <Plus size={15} /> Buat Periode Baru
          </Button>
        )}
      </div>

      {/* Table / Empty State */}
      {loadingPeriods ? (
        <div className="flex items-center justify-center min-h-[200px]">
          <div className="w-8 h-8 border-4 border-indigo-600/20 border-t-indigo-600 rounded-full animate-spin" />
        </div>
      ) : periods.length === 0 ? (
        <div className="p-10 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl bg-white dark:bg-slate-900/60 shadow-xs flex flex-col items-center justify-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-xs">
            <Calendar size={24} />
          </div>
          <div className="max-w-md">
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">Belum Ada Periode Tahun Buku</h4>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Tambahkan tahun buku pertama untuk menentukan periode tutup buku dan pembagian SHU koperasi.
            </p>
          </div>
          {canManageShu && (
            <Button
              onClick={() => setShowPeriodModal(true)}
              size="sm"
              className="mt-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold flex items-center gap-1.5 rounded-xl shadow-xs"
            >
              <Plus size={15} /> Buat Periode Sekarang
            </Button>
          )}
        </div>
      ) : (
        <SectionCard fullWidth className="p-0 border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                  <th className="p-3.5 w-12 text-center">No</th>
                  <th className="p-3.5 text-center">Tahun Buku</th>
                  <th className="p-3.5">Rentang Tanggal</th>
                  <th className="p-3.5 text-right">Total SHU Bersih</th>
                  <th className="p-3.5 text-center">Status</th>
                  <th className="p-3.5 text-center">Tindakan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {periods.map((p, idx) => (
                  <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/20 transition-colors">
                    <td className="p-3.5 text-center font-bold text-slate-400">{idx + 1}</td>
                    <td className="p-3.5 text-center">
                      <span className="font-extrabold text-slate-800 dark:text-slate-100 text-sm block">
                        {p.year}
                      </span>
                      {p.isActive && (
                        <span className="inline-block mt-0.5 px-2 py-0.2 text-[8px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-500/20 rounded-md">
                          TAHUN BUKU AKTIF
                        </span>
                      )}
                    </td>
                    <td className="p-3.5 font-medium text-slate-600 dark:text-slate-400">
                      {formatDate(p.startDate, { day: '2-digit', month: 'short' })} s.d{' '}
                      {formatDate(p.endDate, { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="p-3.5 text-right font-black text-slate-800 dark:text-slate-100">
                      Rp {Number(p.totalShu).toLocaleString('id-ID')}
                    </td>
                    <td className="p-3.5 text-center">
                      <span className={`inline-block px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider rounded-full border ${
                        p.status === 'DISTRIBUTED' 
                          ? 'bg-emerald-50 text-emerald-600 border-emerald-500/20 dark:bg-emerald-950/20' 
                          : p.status === 'APPROVED' 
                          ? 'bg-blue-50 text-blue-600 border-blue-500/20 dark:bg-blue-950/20' 
                          : p.status === 'CALCULATED' 
                          ? 'bg-purple-50 text-purple-600 border-purple-500/20 dark:bg-purple-950/20' 
                          : 'bg-slate-50 text-slate-500 border-slate-200'
                      }`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="p-3.5 text-center">
                      <div className="flex justify-center items-center gap-1.5 flex-wrap">
                        {canManageShu && !p.isActive && (
                          <Button
                            onClick={() => setActiveFiscalYearMutation.mutate({ id: p.id, year: p.year })}
                            disabled={setActiveFiscalYearMutation.isPending}
                            size="xs"
                            variant="outline"
                            className="text-emerald-700 border-emerald-200 hover:bg-emerald-50 font-bold inline-flex items-center gap-1 text-[10px]"
                          >
                            <CheckCircle2 size={11} /> Set Aktif
                          </Button>
                        )}

                        <Button
                          onClick={() => navigate('/cooperative/shu')}
                          size="xs"
                          variant="outline"
                          className="text-indigo-600 border-indigo-200 hover:bg-indigo-50 font-bold inline-flex items-center gap-1 text-[10px]"
                        >
                          Kelola di SHU <ArrowUpRight size={10} />
                        </Button>

                        {canManageShu && p.status === 'DRAFT' && (
                          <Button
                            onClick={() => handleDelete(p.id, p.year)}
                            disabled={deletePeriodMutation.isPending}
                            size="xs"
                            variant="ghost"
                            className="text-rose-600 hover:bg-rose-50 p-1 rounded-lg"
                            title="Hapus Periode Draf"
                          >
                            <Trash2 size={13} />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}

      {/* Period Creation Modal */}
      {showPeriodModal && (
        <PeriodFormModal
          isOpen={showPeriodModal}
          onClose={() => setShowPeriodModal(false)}
          onSuccess={() => {
            setShowPeriodModal(false);
            invalidateShuCaches(queryClient);
          }}
        />
      )}
    </div>
  );
});

ShuPeriodsSettingTable.displayName = 'ShuPeriodsSettingTable';
