import React from 'react';
import { SectionCard } from '../../ui';
import { AcademicPageLayout } from '../../academic/AcademicPageLayout';
import { TrendingUp, Award, DollarSign, AlertCircle } from 'lucide-react';
import PremiumFeatureGate from '../../auth/PremiumFeatureGate';
import { NonMemberBanner } from '../shared/NonMemberBanner';
import type { MyShuHistory } from '../../../pages/cooperative/SHU';

interface ShuMemberViewProps {
  memberStatus: 'loading' | 'member' | 'non-member';
  myHistory: MyShuHistory[];
  loadingHistory: boolean;
  hardeningModuleKey: string;
  memberInstruction: {
    title: string;
    description: string;
    items: { text: string }[];
  };
}

export const ShuMemberView: React.FC<ShuMemberViewProps> = ({
  memberStatus,
  myHistory,
  loadingHistory,
  hardeningModuleKey,
  memberInstruction
}) => {
  if (memberStatus === 'loading') {
    return (
      <PremiumFeatureGate moduleName="KOPERASI" featureName="Manajemen SHU">
        <AcademicPageLayout
          title="SHU Saya"
          description="Riwayat penerimaan pembagian Sisa Hasil Usaha (SHU) Koperasi"
          hardeningModuleKey={hardeningModuleKey}
          breadcrumbs={[
            { label: 'Koperasi', path: '/cooperative' },
            { label: 'SHU Saya', path: '/cooperative/shu' }
          ]}
          instruction={memberInstruction}
        >
          <div className="flex justify-center items-center h-64">
            <div className="w-8 h-8 border-4 border-indigo-650/20 border-t-indigo-650 rounded-full animate-spin"></div>
          </div>
        </AcademicPageLayout>
      </PremiumFeatureGate>
    );
  }

  if (memberStatus === 'non-member') {
    return (
      <PremiumFeatureGate moduleName="KOPERASI" featureName="Manajemen SHU">
        <AcademicPageLayout
          title="SHU Saya"
          description="Riwayat penerimaan pembagian Sisa Hasil Usaha (SHU) Koperasi"
          hardeningModuleKey={hardeningModuleKey}
          breadcrumbs={[
            { label: 'Koperasi', path: '/cooperative' },
            { label: 'SHU Saya', path: '/cooperative/shu' }
          ]}
          instruction={memberInstruction}
        >
          <NonMemberBanner 
            description="Laporan pembagian SHU personal hanya tersedia bagi anggota aktif koperasi. Hubungi Bendahara atau Pengurus Koperasi sekolah untuk melakukan pendaftaran anggota."
          />
        </AcademicPageLayout>
      </PremiumFeatureGate>
    );
  }

  return (
    <PremiumFeatureGate moduleName="KOPERASI" featureName="Manajemen SHU">
      <AcademicPageLayout
        title="SHU Saya"
        description="Riwayat penerimaan pembagian Sisa Hasil Usaha (SHU) Koperasi"
        hardeningModuleKey={hardeningModuleKey}
        breadcrumbs={[
          { label: 'Koperasi', path: '/cooperative' },
          { label: 'SHU Saya', path: '/cooperative/shu' }
        ]}
        instruction={memberInstruction}
      >
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <SectionCard className="p-6 border border-slate-100 dark:border-slate-800 shadow-sm rounded-2xl bg-white/70 dark:bg-slate-900/50 backdrop-blur-md relative overflow-hidden flex items-center gap-4">
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 rounded-2xl">
                <DollarSign size={24} />
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total SHU Diterima</p>
                <h3 className="text-xl font-extrabold text-slate-800 dark:text-slate-100">
                  Rp {myHistory.reduce((sum, h) => sum + Number(h.totalShu), 0).toLocaleString('id-ID')}
                </h3>
              </div>
              <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl" />
            </SectionCard>

            <SectionCard className="p-6 border border-slate-100 dark:border-slate-800 shadow-sm rounded-2xl bg-white/70 dark:bg-slate-900/50 backdrop-blur-md relative overflow-hidden flex items-center gap-4">
              <div className="p-3 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-2xl">
                <Award size={24} />
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Penerimaan Terakhir</p>
                <h3 className="text-xl font-extrabold text-slate-800 dark:text-slate-100">
                  {myHistory.length > 0 
                    ? `Rp ${Number(myHistory[0].totalShu).toLocaleString('id-ID')} (${myHistory[0].Period.year})`
                    : 'Belum ada data'
                  }
                </h3>
              </div>
              <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-xl" />
            </SectionCard>

            <SectionCard className="p-6 border border-slate-100 dark:border-slate-800 shadow-sm rounded-2xl bg-white/70 dark:bg-slate-900/50 backdrop-blur-md relative overflow-hidden flex items-center gap-4">
              <div className="p-3 bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 rounded-2xl">
                <TrendingUp size={24} />
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Status Anggota</p>
                <h3 className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400">
                  AKTIF & BERHAK
                </h3>
              </div>
              <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-xl" />
            </SectionCard>
          </div>

          {/* History Table */}
          <SectionCard className="p-6 border border-slate-100 dark:border-slate-800 shadow-sm rounded-2xl bg-white/70 dark:bg-slate-900/50 backdrop-blur-md">
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-850 dark:text-slate-150 mb-4">Riwayat Distribusi SHU</h3>
            {loadingHistory ? (
              <div className="flex items-center justify-center min-h-[150px]">
                <div className="w-8 h-8 border-4 border-indigo-600/20 border-t-indigo-600 rounded-full animate-spin"></div>
              </div>
            ) : myHistory.length === 0 ? (
              <div className="p-12 text-center text-slate-400 font-bold uppercase tracking-wider text-xs">
                Belum ada data riwayat penerimaan SHU.
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-150 dark:border-slate-800 rounded-2xl">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-100 dark:border-slate-850 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                      <th className="p-4 text-center w-12">No</th>
                      <th className="p-4">Tahun Buku</th>
                      <th className="p-4 text-right">Simpanan Modal Saya</th>
                      <th className="p-4 text-right">Vol. Transaksi Saya (Rp)
                        <span className="block text-[8px] font-normal text-slate-400 normal-case">Deposit + Pinjaman</span>
                      </th>
                      <th className="p-4 text-right">Jasa Modal (Rp)</th>
                      <th className="p-4 text-right">Jasa Transaksi (Rp)</th>
                      <th className="p-4 text-right font-black text-indigo-600 dark:text-indigo-400">Total SHU (Rp)</th>
                      <th className="p-4 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-850 text-xs">
                    {myHistory?.map((item, idx) => (
                      <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/20 transition-colors">
                        <td className="p-4 text-center font-bold text-slate-400">{idx + 1}</td>
                        <td className="p-4 font-bold text-slate-800 dark:text-slate-200">{item.Period.year}</td>
                        <td className="p-4 text-right font-medium">Rp {Number(item.totalSimpananModal).toLocaleString('id-ID')}</td>
                        <td className="p-4 text-right font-medium">Rp {Number(item.totalTransaksi).toLocaleString('id-ID')}</td>
                        <td className="p-4 text-right font-medium text-emerald-600 dark:text-emerald-400">Rp {Number(item.jasaModal).toLocaleString('id-ID')}</td>
                        <td className="p-4 text-right font-medium text-sky-600 dark:text-sky-400">Rp {Number(item.jasaTransaksi).toLocaleString('id-ID')}</td>
                        <td className="p-4 text-right font-extrabold text-indigo-650 dark:text-indigo-400 bg-indigo-500/5">
                          Rp {Number(item.totalShu).toLocaleString('id-ID')}
                        </td>
                        <td className="p-4 text-center">
                          <span className={`inline-block px-2 py-0.5 text-[9px] font-bold rounded-full ${
                            item.status === 'DISTRIBUTED' 
                              ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400' 
                              : 'bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400'
                          }`}>
                            {item.status === 'DISTRIBUTED' ? 'DIDISTRIBUSIKAN' : 'DRAFT'}
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
};
