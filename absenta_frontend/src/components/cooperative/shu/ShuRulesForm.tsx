import React from 'react';
import { Button, SectionCard } from '../../ui';
import { Percent, AlertCircle, Save } from 'lucide-react';
import type { ShuConfig } from '../../../pages/cooperative/SHU';

interface ShuRulesFormProps {
  config: ShuConfig;
  setConfig: React.Dispatch<React.SetStateAction<ShuConfig>>;
  handleConfigSubmit: (e: React.FormEvent) => Promise<void>;
  savingConfig: boolean;
  sumConfig: number;
  canManageShu: boolean;
}

export const ShuRulesForm = React.memo<ShuRulesFormProps>(({
  config,
  setConfig,
  handleConfigSubmit,
  savingConfig,
  sumConfig,
  canManageShu
}) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in duration-300">
      {/* Rules settings Form */}
      <div className="lg:col-span-7">
        <SectionCard className="p-6 border border-slate-100 dark:border-slate-800 bg-white/70 dark:bg-slate-900/50 backdrop-blur-md rounded-2xl shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-xl">
              <Percent size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">Aturan Persentase Distribusi</h3>
              <p className="text-xs text-slate-400">Tentukan persentase alokasi SHU dari RAT (total harus 100%)</p>
            </div>
          </div>

          <form onSubmit={handleConfigSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {/* Jasa Modal */}
              <div className="space-y-1">
                <label htmlFor="config-jasa-modal" className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">
                  Porsi Jasa Modal (%)
                </label>
                <input
                  id="config-jasa-modal"
                  type="number"
                  value={config.porsiJasaModal}
                  onChange={(e) => setConfig(prev => ({ ...prev, porsiJasaModal: e.target.value }))}
                  className="w-full h-9 px-3 text-xs bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-bold"
                  min={0}
                  max={100}
                  required
                  disabled={!canManageShu}
                  aria-label="Porsi Jasa Modal (%)"
                />
                <span className="text-[9px] text-slate-400">Dibagi proposional berdasar simpanan modal anggota</span>
              </div>

              {/* Jasa Transaksi */}
              <div className="space-y-1">
                <label htmlFor="config-jasa-transaksi" className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">
                  Porsi Jasa Transaksi (%)
                </label>
                <input
                  id="config-jasa-transaksi"
                  type="number"
                  value={config.porsiJasaTransaksi}
                  onChange={(e) => setConfig(prev => ({ ...prev, porsiJasaTransaksi: e.target.value }))}
                  className="w-full h-9 px-3 text-xs bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-bold"
                  min={0}
                  max={100}
                  required
                  disabled={!canManageShu}
                  aria-label="Porsi Jasa Transaksi (%)"
                />
                <span className="text-[9px] text-slate-400">Dibagi proposional berdasar belanja di POS koperasi</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Dana Cadangan */}
              <div className="space-y-1">
                <label htmlFor="config-cadangan" className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">
                  Dana Cadangan Koperasi (%)
                </label>
                <input
                  id="config-cadangan"
                  type="number"
                  value={config.porsiCadangan}
                  onChange={(e) => setConfig(prev => ({ ...prev, porsiCadangan: e.target.value }))}
                  className="w-full h-9 px-3 text-xs bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-bold"
                  min={0}
                  max={105}
                  required
                  disabled={!canManageShu}
                  aria-label="Dana Cadangan Koperasi (%)"
                />
              </div>

              {/* Dana Pengurus */}
              <div className="space-y-1">
                <label htmlFor="config-pengurus" className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">
                  Dana Pengurus / Pengawas (%)
                </label>
                <input
                  id="config-pengurus"
                  type="number"
                  value={config.porsiPengurus}
                  onChange={(e) => setConfig(prev => ({ ...prev, porsiPengurus: e.target.value }))}
                  className="w-full h-9 px-3 text-xs bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-bold"
                  min={0}
                  max={100}
                  required
                  disabled={!canManageShu}
                  aria-label="Dana Pengurus / Pengawas (%)"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Dana Sosial */}
              <div className="space-y-1">
                <label htmlFor="config-sosial" className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">
                  Dana Sosial (%)
                </label>
                <input
                  id="config-sosial"
                  type="number"
                  value={config.porsiSosial}
                  onChange={(e) => setConfig(prev => ({ ...prev, porsiSosial: e.target.value }))}
                  className="w-full h-9 px-3 text-xs bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-bold"
                  min={0}
                  max={100}
                  required
                  disabled={!canManageShu}
                  aria-label="Dana Sosial (%)"
                />
              </div>

              {/* Dana Pembangunan */}
              <div className="space-y-1">
                <label htmlFor="config-pembangunan" className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">
                  Dana Pembangunan Daerah/Kerja (%)
                </label>
                <input
                  id="config-pembangunan"
                  type="number"
                  value={config.porsiPembangunan}
                  onChange={(e) => setConfig(prev => ({ ...prev, porsiPembangunan: e.target.value }))}
                  className="w-full h-9 px-3 text-xs bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-bold"
                  min={0}
                  max={100}
                  required
                  disabled={!canManageShu}
                  aria-label="Dana Pembangunan Daerah/Kerja (%)"
                />
              </div>
            </div>

            <div className="flex justify-between items-center p-3.5 border border-dashed rounded-xl mt-4 bg-slate-50 dark:bg-slate-950/20 border-slate-200">
              <span className="text-[10px] font-bold text-slate-500">Total Persentase:</span>
              <span className={`text-xs font-black ${sumConfig === 100 ? 'text-emerald-500' : 'text-red-500'}`}>
                {sumConfig}% {sumConfig === 100 ? '(Valid)' : `(Harus 100%)`}
              </span>
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                disabled={savingConfig || !canManageShu}
                className="w-full h-10 flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase tracking-wider transition-all duration-300"
              >
                <Save size={14} /> Simpan Konfigurasi SHU
              </Button>
            </div>
          </form>
        </SectionCard>
      </div>

      {/* Guide / Concept of SHU */}
      <div className="lg:col-span-5">
        <SectionCard className="p-6 border border-slate-100 dark:border-slate-800 bg-white/70 dark:bg-slate-900/50 backdrop-blur-md rounded-2xl shadow-sm space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 rounded-xl">
              <AlertCircle size={20} />
            </div>
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">Bagaimana SHU Dibagi?</h3>
          </div>

          <div className="space-y-3 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
            <p>
              SHU dibagikan kepada anggota secara berkeadilan berdasar 2 jenis kontribusi:
            </p>
            <div className="space-y-2 pl-2 border-l-2 border-indigo-500/30">
              <p>
                <strong>1. Jasa Modal (Jasa Simpanan)</strong><br />
                Makin besar saldo simpanan Pokok & Wajib Anda, makin besar porsi jasa modal yang didapat.
              </p>
              <p>
                <strong>2. Jasa Transaksi (Jasa Anggota)</strong><br />
                Makin sering Anda berbelanja di POS Koperasi Sekolah, makin besar porsi jasa transaksi yang didapat.
              </p>
            </div>
            <p className="text-[11px] text-slate-400">
              * Untuk jenis simpanan sukarela atau simpanan khusus (misal SHR), Anda dapat menyertakannya dalam hitungan SHU dengan mengaktifkan opsi "Masuk SHU" di menu Kategori Simpanan.
            </p>
          </div>
        </SectionCard>
      </div>
    </div>
  );
});

ShuRulesForm.displayName = 'ShuRulesForm';
