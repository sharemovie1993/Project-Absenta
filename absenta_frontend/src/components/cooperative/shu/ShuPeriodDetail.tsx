import React, { useMemo } from 'react';
import { Button, SectionCard } from '../../ui';
import { AcademicPageLayout } from '../../academic/AcademicPageLayout';
import { ArrowLeft, AlertCircle, RefreshCw, CheckCircle, Send, Eye, Trash2 } from 'lucide-react';
import PremiumFeatureGate from '../../auth/PremiumFeatureGate';
import { useCapabilities } from '../../../hooks/useCapabilities';
import type { ShuPeriod, ShuAllocation, ShuConfig } from '../../../pages/cooperative/SHU';

interface ShuPeriodDetailProps {
  selectedPeriodId: string;
  periodDetail: ShuPeriod;
  allocations: ShuAllocation[];
  config: ShuConfig;
  searchMember: string;
  setSearchMember: (val: string) => void;
  loadingDetail: boolean;
  loadingSync: boolean;
  canCalculate: boolean;
  canApprove: boolean;
  canDistribute: boolean;
  canManageShu: boolean;
  user: { role?: { name?: string } } | null;
  handleSyncFinancials: () => Promise<void>;
  handleCalculateShu: () => Promise<void>;
  handleApproveShu: () => Promise<void>;
  handleDistributeShu: () => Promise<void>;
  setSelectedPeriodId: (id: string | null) => void;
  isOperator: boolean;
  hardeningModuleKey: string;
  adminInstruction: {
    title: string;
    description: string;
    items: { text: string }[];
  };
}

export const ShuPeriodDetail = React.memo<ShuPeriodDetailProps>(({
  selectedPeriodId,
  periodDetail,
  allocations,
  config,
  searchMember,
  setSearchMember,
  loadingDetail,
  loadingSync,
  canCalculate,
  canApprove,
  canDistribute,
  canManageShu,
  user,
  handleSyncFinancials,
  handleCalculateShu,
  handleApproveShu,
  handleDistributeShu,
  setSelectedPeriodId,
  isOperator,
  hardeningModuleKey,
  adminInstruction
}) => {
  const totalDistributedAllocations = useMemo(() => {
    return (allocations || []).reduce((sum, item) => sum + Number(item.totalShu), 0);
  }, [allocations]);

  const filteredAllocations = useMemo(() => {
    return (allocations || []).filter(a => 
      a.Member?.name?.toLowerCase().includes(searchMember.toLowerCase()) ||
      a.Member?.memberNo?.toLowerCase().includes(searchMember.toLowerCase())
    );
  }, [allocations, searchMember]);

  return (
    <PremiumFeatureGate moduleName="KOPERASI" featureName="Manajemen SHU">
      <AcademicPageLayout
        title={`SHU Tahun Buku: ${periodDetail.year}`}
        description={`Manajemen kalkulasi, persetujuan, dan distribusi SHU Tahun ${periodDetail.year}`}
        hardeningModuleKey={hardeningModuleKey}
        breadcrumbs={[
          { label: 'Koperasi', path: '/cooperative' },
          { label: 'SHU', path: isOperator ? '/cooperative/shu/manage' : '/cooperative/shu' },
          { label: `Tahun ${periodDetail.year}`, path: isOperator ? '/cooperative/shu/manage' : '/cooperative/shu' }
        ]}
        instruction={adminInstruction}
      >
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Back button */}
          <div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedPeriodId(null)}
              className="text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 font-bold inline-flex items-center gap-1.5 rounded-xl h-8"
            >
              <ArrowLeft size={14} /> Kembali ke Daftar Periode
            </Button>
          </div>

          {/* Period Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <SectionCard className="p-5 border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl relative overflow-hidden flex flex-col justify-between">
              <div>
                <p className="text-[10px] text-slate-455 font-bold uppercase tracking-wider">Total SHU Bersih</p>
                <h3 className="text-xl font-extrabold text-slate-850 dark:text-slate-100 mt-1">
                  Rp {Number(periodDetail.totalShu).toLocaleString('id-ID')}
                </h3>
              </div>
              <p className="text-[9px] text-slate-400 mt-4">
                Pendapatan: Rp {Number(periodDetail.totalRevenue).toLocaleString('id-ID')} <br/>
                Biaya: Rp {Number(periodDetail.totalExpense).toLocaleString('id-ID')}
              </p>
            </SectionCard>

            <SectionCard className="p-5 border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl relative overflow-hidden flex flex-col justify-between">
              <div>
                <p className="text-[10px] text-slate-455 font-bold uppercase tracking-wider">Total Distribusi Anggota</p>
                <h3 className="text-xl font-extrabold text-indigo-650 dark:text-indigo-400 mt-1">
                  Rp {totalDistributedAllocations.toLocaleString('id-ID')}
                </h3>
              </div>
              <p className="text-[9px] text-slate-400 mt-4">
                Porsi Jasa Modal: {config.porsiJasaModal}% <br/>
                Porsi Jasa Transaksi: {config.porsiJasaTransaksi}%
              </p>
            </SectionCard>

            <SectionCard className="p-5 border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl relative overflow-hidden flex flex-col justify-between">
              <div>
                <p className="text-[10px] text-slate-455 font-bold uppercase tracking-wider">Alokasi Kas Cadangan & Sosial</p>
                <h3 className="text-xl font-extrabold text-amber-650 dark:text-amber-400 mt-1">
                  Rp {(Number(periodDetail.totalShu) * (Number(config.porsiCadangan) + Number(config.porsiSosial) + Number(config.porsiPengurus) + Number(config.porsiPembangunan)) / 100).toLocaleString('id-ID')}
                </h3>
              </div>
              <p className="text-[9px] text-slate-400 mt-4">
                Cadangan: {config.porsiCadangan}% | Pembangunan: {config.porsiPembangunan}% <br/>
                Pengurus: {config.porsiPengurus}% | Sosial: {config.porsiSosial}%
              </p>
            </SectionCard>

            <SectionCard className="p-5 border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl relative overflow-hidden flex flex-col justify-between">
              <div>
                <p className="text-[10px] text-slate-455 font-bold uppercase tracking-wider">Status Laporan</p>
                <div className="mt-1">
                  <span className={`inline-block px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider rounded-full border ${
                    periodDetail.status === 'DISTRIBUTED' 
                      ? 'bg-emerald-50 text-emerald-600 border-emerald-500/20' 
                      : periodDetail.status === 'APPROVED' 
                      ? 'bg-blue-50 text-blue-650 border-blue-500/20' 
                      : periodDetail.status === 'CALCULATED' 
                      ? 'bg-purple-50 text-purple-650 border-purple-500/20' 
                      : 'bg-slate-50 text-slate-500 border-slate-200'
                  }`}>
                    {periodDetail.status}
                  </span>
                </div>
              </div>
              {periodDetail.approvedAt && (
                <p className="text-[9px] text-slate-400 mt-4">
                  Disetujui Ketua pada: <br/>
                  {new Date(periodDetail.approvedAt).toLocaleDateString('id-ID', { hour: '2-digit', minute: '2-digit' } as Intl.DateTimeFormatOptions)}
                </p>
              )}
            </SectionCard>
          </div>

          {/* Action Row */}
          <SectionCard className="p-4 border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 rounded-2xl flex flex-wrap gap-4 items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="text-indigo-600 dark:text-indigo-400" size={18} />
              <p className="text-xs text-slate-550 dark:text-slate-400 font-bold">
                Alur Kerja SHU: Hitung Alokasi (Bendahara) &rarr; Setujui (Ketua) &rarr; Distribusi ke Rekening (Bendahara)
              </p>
            </div>
            
            <div className="flex gap-2">
              {/* Sync Button (DRAFT, CALCULATED) */}
              {(periodDetail.status === 'DRAFT' || periodDetail.status === 'CALCULATED') && (
                <Button
                  onClick={handleSyncFinancials}
                  variant="outline"
                  size="sm"
                  className="text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 font-bold flex items-center gap-1.5 rounded-xl text-xs h-9"
                  disabled={loadingSync || !canManageShu}
                  title={!canManageShu ? "Aksi ini memerlukan hak akses manajemen SHU" : ""}
                >
                  <RefreshCw size={14} className={loadingSync ? 'animate-spin' : ''} /> Sinkronisasi Keuangan
                </Button>
              )}

              {/* Calculate Button (DRAFT, CALCULATED) */}
              {(periodDetail.status === 'DRAFT' || periodDetail.status === 'CALCULATED') && (
                <Button
                  onClick={handleCalculateShu}
                  size="sm"
                  className={`bg-purple-600 hover:bg-purple-700 text-white font-bold flex items-center gap-1.5 rounded-xl text-xs h-9 shadow-md shadow-purple-600/10 ${!canCalculate ? 'opacity-50 cursor-not-allowed' : ''}`}
                  disabled={!canCalculate}
                  title={!canCalculate ? "Aksi ini hanya dapat dilakukan oleh Bendahara Koperasi" : ""}
                >
                  <RefreshCw size={14} /> Hitung Alokasi SHU
                </Button>
              )}

              {/* Approve Button (CALCULATED, must be Ketua capability) */}
              {periodDetail.status === 'CALCULATED' && (
                <Button
                  onClick={handleApproveShu}
                  size="sm"
                  className={`bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center gap-1.5 rounded-xl text-xs h-9 shadow-md shadow-blue-650/10 ${!canApprove ? 'opacity-50 cursor-not-allowed' : ''}`}
                  disabled={!canApprove}
                  title={!canApprove ? "Aksi ini hanya dapat dilakukan oleh Ketua Koperasi" : ""}
                >
                  <CheckCircle size={14} /> Setujui Pembagian (Ketua)
                </Button>
              )}

              {/* Distribute Button (APPROVED) */}
              {periodDetail.status === 'APPROVED' && (
                <Button
                  onClick={handleDistributeShu}
                  size="sm"
                  className={`bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1.5 rounded-xl text-xs h-9 shadow-md shadow-emerald-600/10 ${!canDistribute ? 'opacity-50 cursor-not-allowed' : ''}`}
                  disabled={!canDistribute}
                  title={!canDistribute ? "Aksi ini hanya dapat dilakukan oleh Bendahara Koperasi" : ""}
                >
                  <Send size={14} /> Distribusikan ke Tabungan
                </Button>
              )}
            </div>
          </SectionCard>

          {/* Allocation Table */}
          <SectionCard className="p-6 border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-sm">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-slate-100">Daftar Penerimaan SHU Anggota</h3>
                <p className="text-[10px] text-slate-400">Jasa Modal = proporsi simpanan pokok/wajib | Jasa Transaksi = proporsi gabungan deposit simpanan + volume pinjaman (standar KSP Indonesia)</p>
              </div>
              <div className="w-full md:w-64">
                <input
                  type="text"
                  value={searchMember}
                  onChange={(e) => setSearchMember(e.target.value)}
                  placeholder="Cari anggota / no. anggota..."
                  className="w-full h-9 px-3 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium"
                  aria-label="Cari anggota / nomor anggota"
                />
              </div>
            </div>

            {loadingDetail ? (
              <div className="flex items-center justify-center min-h-[200px]">
                <div className="w-8 h-8 border-4 border-indigo-600/20 border-t-indigo-600 rounded-full animate-spin"></div>
              </div>
            ) : (filteredAllocations || []).length === 0 ? (
              <div className="p-12 text-center text-slate-400 font-bold uppercase tracking-wider text-xs border border-slate-150 dark:border-slate-800 rounded-2xl">
                Tidak ada data alokasi anggota (Silakan lakukan kalkulasi terlebih dahulu)
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-150 dark:border-slate-800 rounded-2xl">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-100 dark:border-slate-850 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                      <th className="p-4 text-center w-12">No</th>
                      <th className="p-4">Anggota</th>
                      <th className="p-4 text-right">Simpanan Modal (Rp)</th>
                      <th className="p-4 text-right">Vol. Transaksi Gabungan (Rp)
                        <span className="block text-[8px] font-normal text-slate-400 normal-case">Deposit Simpanan + Pinjaman</span>
                      </th>
                      <th className="p-4 text-right">Jasa Modal (Rp)</th>
                      <th className="p-4 text-right">Jasa Transaksi (Rp)</th>
                      <th className="p-4 text-right font-black text-indigo-600 dark:text-indigo-400">Total SHU (Rp)</th>
                      <th className="p-4 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-850 text-xs">
                    {(filteredAllocations || []).map((a, idx) => (
                      <tr key={a.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/20 transition-colors">
                        <td className="p-4 text-center font-bold text-slate-400">{idx + 1}</td>
                        <td className="p-4">
                          <div>
                            <p className="font-bold text-slate-800 dark:text-slate-100">{a.Member.name}</p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">{a.Member.memberNo}</p>
                          </div>
                        </td>
                        <td className="p-4 text-right font-medium">Rp {Number(a.totalSimpananModal).toLocaleString('id-ID')}</td>
                        <td className="p-4 text-right font-medium">Rp {Number(a.totalTransaksi).toLocaleString('id-ID')}</td>
                        <td className="p-4 text-right font-medium text-emerald-600 dark:text-emerald-400">Rp {Number(a.jasaModal).toLocaleString('id-ID')}</td>
                        <td className="p-4 text-right font-medium text-sky-600 dark:text-sky-400">Rp {Number(a.jasaTransaksi).toLocaleString('id-ID')}</td>
                        <td className="p-4 text-right font-extrabold text-indigo-655 dark:text-indigo-400 bg-indigo-500/5">
                          Rp {Number(a.totalShu).toLocaleString('id-ID')}
                        </td>
                        <td className="p-4 text-center">
                          <span className={`inline-block px-2 py-0.5 text-[9px] font-bold rounded-full ${
                            a.status === 'DISTRIBUTED' 
                              ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400' 
                              : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                          }`}>
                            {a.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>
        </div>
      </AcademicPageLayout>
    </PremiumFeatureGate>
  );
});

ShuPeriodDetail.displayName = 'ShuPeriodDetail';
