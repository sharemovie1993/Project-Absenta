import React from 'react';
import { Button, SectionCard, Input, Label } from '../../ui';
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
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start animate-in fade-in duration-300">
      {/* Rules settings Form */}
      <div className="lg:col-span-7">
        <SectionCard fullWidth className="p-6 md:p-8 border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/90 rounded-2xl shadow-sm space-y-6">
          <div className="flex items-center justify-between pb-5 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-xl shrink-0">
                <Percent size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">Aturan Persentase Distribusi</h3>
                <p className="text-xs text-slate-400">Tentukan persentase alokasi SHU dari RAT (total harus 100%)</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleConfigSubmit} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* Jasa Modal */}
              <div className="space-y-1.5">
                <Label htmlFor="config-jasa-modal" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Porsi Jasa Modal (%)
                </Label>
                <Input
                  id="config-jasa-modal"
                  type="number"
                  value={config.porsiJasaModal}
                  onChange={(e) => setConfig(prev => ({ ...prev, porsiJasaModal: e.target.value }))}
                  min={0}
                  max={100}
                  required
                  disabled={!canManageShu}
                  aria-label="Porsi Jasa Modal (%)"
                  className="font-bold h-10 text-sm"
                />
                <span className="text-[10px] text-slate-400 block">Dibagi proporsional berdasar simpanan modal anggota</span>
              </div>

              {/* Jasa Transaksi */}
              <div className="space-y-1.5">
                <Label htmlFor="config-jasa-transaksi" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Porsi Jasa Transaksi (%)
                </Label>
                <Input
                  id="config-jasa-transaksi"
                  type="number"
                  value={config.porsiJasaTransaksi}
                  onChange={(e) => setConfig(prev => ({ ...prev, porsiJasaTransaksi: e.target.value }))}
                  min={0}
                  max={100}
                  required
                  disabled={!canManageShu}
                  aria-label="Porsi Jasa Transaksi (%)"
                  className="font-bold h-10 text-sm"
                />
                <span className="text-[10px] text-slate-400 block">Dibagi proporsional berdasar belanja di POS koperasi</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* Dana Cadangan */}
              <div className="space-y-1.5">
                <Label htmlFor="config-cadangan" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Dana Cadangan Koperasi (%)
                </Label>
                <Input
                  id="config-cadangan"
                  type="number"
                  value={config.porsiCadangan}
                  onChange={(e) => setConfig(prev => ({ ...prev, porsiCadangan: e.target.value }))}
                  min={0}
                  max={100}
                  required
                  disabled={!canManageShu}
                  aria-label="Dana Cadangan Koperasi (%)"
                  className="font-bold h-10 text-sm"
                />
              </div>

              {/* Dana Pengurus */}
              <div className="space-y-1.5">
                <Label htmlFor="config-pengurus" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Dana Pengurus / Pengawas (%)
                </Label>
                <Input
                  id="config-pengurus"
                  type="number"
                  value={config.porsiPengurus}
                  onChange={(e) => setConfig(prev => ({ ...prev, porsiPengurus: e.target.value }))}
                  min={0}
                  max={100}
                  required
                  disabled={!canManageShu}
                  aria-label="Dana Pengurus / Pengawas (%)"
                  className="font-bold h-10 text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* Dana Sosial */}
              <div className="space-y-1.5">
                <Label htmlFor="config-sosial" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Dana Sosial (%)
                </Label>
                <Input
                  id="config-sosial"
                  type="number"
                  value={config.porsiSosial}
                  onChange={(e) => setConfig(prev => ({ ...prev, porsiSosial: e.target.value }))}
                  min={0}
                  max={100}
                  required
                  disabled={!canManageShu}
                  aria-label="Dana Sosial (%)"
                  className="font-bold h-10 text-sm"
                />
              </div>

              {/* Dana Pembangunan */}
              <div className="space-y-1.5">
                <Label htmlFor="config-pembangunan" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Dana Pembangunan Daerah/Kerja (%)
                </Label>
                <Input
                  id="config-pembangunan"
                  type="number"
                  value={config.porsiPembangunan}
                  onChange={(e) => setConfig(prev => ({ ...prev, porsiPembangunan: e.target.value }))}
                  min={0}
                  max={100}
                  required
                  disabled={!canManageShu}
                  aria-label="Dana Pembangunan Daerah/Kerja (%)"
                  className="font-bold h-10 text-sm"
                />
              </div>
            </div>

            {/* Komponen Pembentuk Jasa Transaksi (Transparansi Aturan Usaha) */}
            <div className="p-4 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl space-y-3">
              <div>
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Percent size={13} className="text-indigo-600 dark:text-indigo-400" />
                  Komponen Pembentuk Jasa Transaksi (Jasa Usaha)
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Pilih transaksi apa saja yang diakui sebagai volume partisipasi anggota untuk pembagian Jasa Transaksi:
                </p>
              </div>

              <div className="space-y-2.5 pt-1">
                {/* 1. Belanja Toko */}
                <label className="flex items-start gap-3 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 cursor-pointer hover:border-indigo-300 dark:hover:border-indigo-800 transition-colors">
                  <input
                    type="checkbox"
                    checked={config.includeStorePurchases ?? true}
                    onChange={(e) => setConfig(prev => ({ ...prev, includeStorePurchases: e.target.checked }))}
                    disabled={!canManageShu}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                  <div className="text-xs">
                    <span className="font-bold text-slate-800 dark:text-slate-200 block">Belanja di Toko / POS Koperasi</span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
                      Menghitung total nilai transaksi pembelian barang/kantin oleh anggota terdaftar di kasir POS koperasi.
                    </span>
                  </div>
                </label>

                {/* 2. Pinjaman Anggota */}
                <label className="flex items-start gap-3 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 cursor-pointer hover:border-indigo-300 dark:hover:border-indigo-800 transition-colors">
                  <input
                    type="checkbox"
                    checked={config.includeLoans ?? true}
                    onChange={(e) => setConfig(prev => ({ ...prev, includeLoans: e.target.checked }))}
                    disabled={!canManageShu}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                  <div className="text-xs">
                    <span className="font-bold text-slate-800 dark:text-slate-200 block">Plafon Pinjaman Anggota (Kredit KSP)</span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
                      Standar KSP Indonesia (UU 25/1992): Peminjam berpartisipasi dalam usaha koperasi & jasa bunga yang dibayar membentuk laba koperasi.
                    </span>
                  </div>
                </label>

                {/* 3. Setoran Simpanan (Deposit) */}
                <label className="flex items-start gap-3 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 cursor-pointer hover:border-indigo-300 dark:hover:border-indigo-800 transition-colors">
                  <input
                    type="checkbox"
                    checked={config.includeSavingsDeposit ?? false}
                    onChange={(e) => setConfig(prev => ({ ...prev, includeSavingsDeposit: e.target.checked }))}
                    disabled={!canManageShu}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                  <div className="text-xs">
                    <span className="font-bold text-slate-800 dark:text-slate-200 block">Setoran Simpanan Baru (Deposit)</span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
                      Catatan: Saldo simpanan anggota normalnya sudah mendapatkan porsi di Jasa Modal. Aktifkan hanya jika RAT menetapkan transaksi setoran tabungan diakui ganda ke Jasa Transaksi.
                    </span>
                  </div>
                </label>
              </div>
            </div>

            {/* Hak Akses & Visibilitas Estimasi SHU Berjalan (Ketua Koperasi) */}
            <div className="p-4 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200/60 dark:border-indigo-900/40 rounded-xl space-y-3">
              <div>
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Percent size={13} className="text-indigo-600 dark:text-indigo-400" />
                  Visibilitas Simulasi / Estimasi SHU Berjalan
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Kendali khusus Ketua Koperasi untuk memotivasi keaktifan belanja & menabung anggota:
                </p>
              </div>

              <label className="flex items-start gap-3 p-2.5 rounded-lg border border-indigo-200 dark:border-indigo-900/50 bg-white dark:bg-slate-900 cursor-pointer hover:border-indigo-400 transition-colors">
                <input
                  type="checkbox"
                  checked={config.enableLiveEstimation ?? false}
                  onChange={(e) => setConfig(prev => ({ ...prev, enableLiveEstimation: e.target.checked }))}
                  disabled={!canManageShu}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
                <div className="text-xs">
                  <span className="font-bold text-slate-800 dark:text-slate-200 block">
                    Tampilkan Simulasi & Estimasi SHU Berjalan di Tab &quot;SHU Saya&quot;
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
                    Jika dicentang, anggota (siswa/guru) dapat melihat perkiraan perolehan SHU sementara tahun ini secara real-time. Jika tidak dicentang, anggota hanya melihat riwayat tahun lalu yang sudah disahkan.
                  </span>
                </div>
              </label>
            </div>

            <div className="flex justify-between items-center p-4 border border-dashed rounded-xl bg-slate-50 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800">
              <span className="text-xs font-bold text-slate-600 dark:text-slate-400">Total Akumulasi Persentase:</span>
              <span className={`text-sm font-black ${sumConfig === 100 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
                {sumConfig}% {sumConfig === 100 ? '(Valid 100%)' : `(Wajib 100%)`}
              </span>
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                disabled={savingConfig || !canManageShu}
                className="w-full h-10 flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase tracking-wider transition-all duration-300 shadow-md shadow-indigo-600/20"
              >
                <Save size={15} /> Simpan Konfigurasi SHU
              </Button>
            </div>
          </form>
        </SectionCard>
      </div>

      {/* Guide / Concept of SHU */}
      <div className="lg:col-span-5">
        <SectionCard fullWidth className="p-6 border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/90 rounded-2xl shadow-sm space-y-5">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="p-2.5 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 rounded-xl shrink-0">
              <AlertCircle size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">Bagaimana SHU Dibagi?</h3>
              <p className="text-xs text-slate-400">Prinsip proporsionalitas keanggotaan</p>
            </div>
          </div>

          <div className="space-y-4 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
            <p>
              SHU dibagikan kepada anggota secara berkeadilan berdasar 2 jenis kontribusi:
            </p>
            <div className="space-y-3 pl-3 border-l-2 border-indigo-500/40">
              <div>
                <p className="font-bold text-slate-800 dark:text-slate-200">1. Jasa Modal (Jasa Simpanan)</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Makin besar saldo simpanan Pokok & Wajib Anda, makin besar porsi jasa modal yang didapat.
                </p>
              </div>
              <div>
                <p className="font-bold text-slate-800 dark:text-slate-200">2. Jasa Transaksi (Jasa Usaha)</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Makin aktif Anda bertransaksi pada unit usaha koperasi, makin besar dividen jasa transaksi yang didapat. Komponen yang diakui dapat diatur secara transparan di atas (Belanja POS, Pinjaman, dan/atau Setoran Tabungan).
                </p>
              </div>
            </div>
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-[11px] text-amber-800 dark:text-amber-300">
              * Pengaturan komponen ini sepenuhnya transparan dan langsung diterapkan saat Bendahara melakukan perhitungan ("Hitung Alokasi SHU") pada periode bersangkutan.
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  );
});

ShuRulesForm.displayName = 'ShuRulesForm';
