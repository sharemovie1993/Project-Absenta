import React from 'react';
import { Loader2 } from 'lucide-react';
import { Modal, Button, Input } from '@/components/ui';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  orderError: string | null;
  renewLicenseKey: string;
  setRenewLicenseKey: (v: string) => void;
  subdomainSlug: string;
  setSubdomainSlug: (v: string) => void;
  orderLoading: boolean;
  orderStep: number;
  schoolName: string;
  setSchoolName: (v: string) => void;
  packages: any[];
  selectedPackage: string;
  setSelectedPackage: (v: string) => void;
  paymentChannels: any[];
  selectedPayment: string;
  setSelectedPayment: (v: string) => void;
  showPaymentDropdown: boolean;
  setShowPaymentDropdown: (v: boolean) => void;
  deploymentMode: 'on_premise' | 'local_windows' | 'public_vps';
  handleDeploymentModeChange: (mode: 'on_premise' | 'local_windows' | 'public_vps') => void;
  devPort: number;
  localPort: number;
  setLocalPort: (v: number) => void;
  handleOrderSubmit: (e: React.FormEvent) => void;
  invoice: any;
  onVerifyPayment: () => void;
  onAutoInstall: () => void;
  licenseKey: string;
}

export const EasyTunnelOrderModal: React.FC<Props> = React.memo(({
  isOpen,
  onClose,
  orderError,
  renewLicenseKey,
  setRenewLicenseKey,
  subdomainSlug,
  setSubdomainSlug,
  orderLoading,
  orderStep,
  schoolName,
  setSchoolName,
  packages,
  selectedPackage,
  setSelectedPackage,
  paymentChannels,
  selectedPayment,
  setSelectedPayment,
  showPaymentDropdown,
  setShowPaymentDropdown,
  deploymentMode,
  handleDeploymentModeChange,
  devPort,
  localPort,
  setLocalPort,
  handleOrderSubmit,
  invoice,
  onVerifyPayment,
  onAutoInstall,
  licenseKey
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={renewLicenseKey ? 'Perpanjang Lisensi Easy Tunnel' : 'Beli Lisensi Easy Tunnel'}
      size="lg"
    >
      <div className="space-y-4 py-2 text-xs">
        {orderError && (
          <div className="bg-red-50 dark:bg-red-950 text-red-800 dark:text-red-300 p-3 rounded-xl text-xs border border-red-200 dark:border-red-900">
            ⚠️ {orderError}
          </div>
        )}

        {renewLicenseKey && (
          <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/50 rounded-xl p-3.5 flex items-center justify-between text-xs text-amber-800 dark:text-amber-300">
            <div>
              <div className="font-bold flex items-center gap-1.5">
                <span>✨ Mode Perpanjangan Lisensi (Renewal)</span>
              </div>
              <div className="text-[11px] font-mono mt-0.5">Lisensi: <span className="font-bold">{renewLicenseKey}</span></div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">Subdomain: <strong>{subdomainSlug}.absenta.id</strong> (Terkunci &amp; Tidak Berubah)</div>
            </div>
            <button
              type="button"
              onClick={() => setRenewLicenseKey('')}
              className="px-2.5 py-1 text-[11px] bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-bold"
            >
              Batal
            </button>
          </div>
        )}

        {orderLoading ? (
          <div className="text-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto" />
            <p className="mt-3 text-xs text-slate-500 font-bold">Memproses pesanan...</p>
          </div>
        ) : orderStep === 1 ? (
          <form onSubmit={handleOrderSubmit} className="space-y-4">
            <div className="space-y-1">
              <label htmlFor="order-school-name" className="font-bold text-slate-700 dark:text-slate-300">
                Nama Sekolah / Instansi <span className="text-rose-500">*</span>
              </label>
              <Input
                id="order-school-name"
                aria-label="Nama Sekolah atau Instansi"
                required
                placeholder="Contoh: SMK Negeri 1 Jakarta"
                className="rounded-xl"
                value={schoolName}
                onChange={e => setSchoolName(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Pilih Paket Terowongan <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {(packages ?? [])?.map(p => (
                  <label key={p.id} className={`border rounded-xl p-3 flex flex-col cursor-pointer transition ${
                    selectedPackage === p.id 
                      ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/20' 
                      : 'border-slate-200 dark:border-slate-800'
                  }`}>
                    <input
                      type="radio"
                      name="package"
                      aria-label={p.title}
                      required
                      className="sr-only"
                      value={p.id}
                      onChange={() => setSelectedPackage(p.id)}
                    />
                    <span className="font-bold text-xs text-slate-900 dark:text-white">{p.title}</span>
                    <span className="text-[10px] text-slate-500">{p.duration}</span>
                    <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 mt-2">{p.price}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-1 relative">
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Pilih Metode Pembayaran <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <button
                  type="button"
                  aria-label="Pilih Metode Pembayaran"
                  className="w-full px-3 py-2 border rounded-xl text-xs dark:bg-slate-800 flex items-center justify-between bg-white dark:border-slate-700 text-left hover:bg-slate-50 dark:hover:bg-slate-700/50 transition focus:outline-none"
                  onClick={() => setShowPaymentDropdown(!showPaymentDropdown)}
                >
                  {selectedPayment ? (
                    (() => {
                      const ch = (paymentChannels ?? []).find(c => c.code === selectedPayment);
                      if (ch) {
                        return (
                          <div className="flex items-center gap-2">
                            {ch.icon_url || ch.logo_url || ch.logo ? (
                              <img src={ch.icon_url || ch.logo_url || ch.logo} alt={ch.name} className="h-5 object-contain max-w-full" />
                            ) : (
                              <span>💳</span>
                            )}
                            <span className="font-bold text-slate-900 dark:text-white">{ch.name}</span>
                          </div>
                        );
                      }
                      return <span className="text-slate-500">Pilih Metode</span>;
                    })()
                  ) : (
                    <span className="text-slate-500">-- Pilih Metode Pembayaran --</span>
                  )}
                  <span className="text-slate-400 text-xs">▼</span>
                </button>

                {showPaymentDropdown && (
                  <div className="absolute left-0 right-0 mt-1 z-50 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl max-h-60 overflow-y-auto p-1 space-y-0.5">
                    {paymentChannels.length === 0 ? (
                      <div className="p-2 text-xs text-slate-500 text-center">Memuat metode pembayaran...</div>
                    ) : (
                      (paymentChannels ?? [])?.map(ch => (
                        <button
                          key={ch.code}
                          type="button"
                          className={`w-full px-3 py-2 text-left text-xs rounded-lg flex items-center gap-3 transition hover:bg-slate-100 dark:hover:bg-slate-800 ${
                            selectedPayment === ch.code ? 'bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 font-bold' : 'text-slate-700 dark:text-slate-300'
                          }`}
                          onClick={() => {
                            setSelectedPayment(ch.code);
                            setShowPaymentDropdown(false);
                          }}
                        >
                          {ch.icon_url || ch.logo_url || ch.logo ? (
                            <img src={ch.icon_url || ch.logo_url || ch.logo} alt={ch.name} className="h-5 w-12 object-contain shrink-0" />
                          ) : (
                            <span className="w-12 text-center text-sm shrink-0">💳</span>
                          )}
                          <span className="font-semibold">{ch.name}</span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2 border-t pt-3 border-slate-100 dark:border-slate-800">
              <label className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block text-[10px]">
                Lokasi / Tipe Instalasi Server:
              </label>
              <div className="grid grid-cols-1 gap-2">
                <label className={`border rounded-xl p-2.5 flex items-start gap-3 cursor-pointer transition ${
                  deploymentMode === 'on_premise'
                    ? 'border-indigo-600 bg-indigo-50/40 dark:bg-indigo-950/20'
                    : 'border-slate-200 dark:border-slate-800'
                }`}>
                  <input
                    type="radio"
                    name="deploy_mode_order"
                    aria-label="Server Sekolah on-premise"
                    className="mt-1"
                    checked={deploymentMode === 'on_premise'}
                    onChange={() => handleDeploymentModeChange('on_premise')}
                  />
                  <div>
                    <span className="font-bold text-xs text-slate-900 dark:text-white block">Server Sekolah - On-Premise (Linux / Windows)</span>
                    <span className="text-[10px] text-slate-500 leading-normal block">Aplikasi berjalan di server lokal sekolah (Linux/Windows) menggunakan Caddy (Port 443).</span>
                  </div>
                </label>

                <label className={`border rounded-xl p-2.5 flex items-start gap-3 cursor-pointer transition ${
                  deploymentMode === 'local_windows'
                    ? 'border-indigo-600 bg-indigo-50/40 dark:bg-indigo-950/20'
                    : 'border-slate-200 dark:border-slate-800'
                }`}>
                  <input
                    type="radio"
                    name="deploy_mode_order"
                    aria-label="Mode uji coba developer"
                    className="mt-1"
                    checked={deploymentMode === 'local_windows'}
                    onChange={() => handleDeploymentModeChange('local_windows')}
                  />
                  <div>
                    <span className="font-bold text-xs text-slate-900 dark:text-white block">Uji Coba Pengembang - Developer Mode</span>
                    <span className="text-[10px] text-slate-500 leading-normal block">Untuk keperluan testing lokal langsung pada PC tanpa web server Caddy (Port ${devPort}).</span>
                  </div>
                </label>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label htmlFor="order-subdomain" className="font-bold text-slate-700 dark:text-slate-300">Subdomain:</label>
                <Input
                  id="order-subdomain"
                  aria-label="Subdomain slug"
                  required
                  placeholder="slug"
                  className="rounded-xl"
                  value={subdomainSlug}
                  onChange={e => setSubdomainSlug(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="order-local-port" className="font-bold text-slate-700 dark:text-slate-300">Port Lokal:</label>
                <Input
                  id="order-local-port"
                  aria-label="Port lokal target"
                  type="number"
                  required
                  disabled={deploymentMode === 'on_premise'}
                  className="rounded-xl"
                  value={localPort}
                  onChange={e => setLocalPort(parseInt(e.target.value))}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
              <Button type="button" variant="toolbarOutline" size="toolbar" onClick={onClose}>
                Batal
              </Button>
              <Button type="submit" variant="toolbarPrimary" size="toolbar" className="bg-indigo-600 hover:bg-indigo-700 text-white">
                Buat Invoice Pembayaran
              </Button>
            </div>
          </form>
        ) : orderStep === 2 && invoice ? (
          <div className="text-center space-y-4 py-3">
            <span className="text-4xl">🧾</span>
            <div>
              <h4 className="font-bold text-slate-900 dark:text-white">Selesaikan Pembayaran Anda</h4>
              <p className="text-xs text-slate-500">Nomor Invoice: {invoice.invoice_number}</p>
            </div>

            <div className="p-5 bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/50 rounded-2xl text-center space-y-1 max-w-sm mx-auto shadow-sm">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Total Pembayaran</span>
              <p className="text-xl font-bold text-indigo-600 dark:text-indigo-400 font-mono">
                {invoice.amount_formatted || (invoice.amount ? `Rp ${Number(invoice.amount).toLocaleString('id-ID')}` : '')}
              </p>
            </div>

            {invoice.qr_url ? (
              <div className="flex flex-col items-center py-4">
                <div className="bg-white p-4 rounded-2xl shadow-xl inline-block">
                  <img src={invoice.qr_url} alt="QRIS Code" className="w-44 h-44 block object-contain mx-auto" />
                </div>
                <span className="text-[10px] font-bold text-slate-400 mt-4 text-center max-w-sm leading-relaxed">
                  Pindai kode QRIS di atas menggunakan aplikasi e-wallet Anda.
                </span>
              </div>
            ) : invoice.pay_url ? (
              <a
                href={invoice.pay_url}
                target="_blank"
                rel="noreferrer"
                className="inline-block px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition shadow-md"
              >
                💳 Klik Di Sini Untuk Bayar
              </a>
            ) : (
              <div className="p-5 bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/50 rounded-2xl text-center max-w-sm mx-auto">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">
                  Nomor Virtual Account / Kode Bayar
                </span>
                <div className="flex items-center justify-center gap-3">
                  <strong className="text-xl font-mono font-bold text-slate-800 dark:text-white tracking-widest">
                    {invoice.pay_code || invoice.payment_code}
                  </strong>
                </div>
              </div>
            )}

            <div className="pt-4 border-t flex flex-col gap-2 max-w-sm mx-auto w-full">
              <Button
                type="button"
                variant="toolbarPrimary"
                size="toolbar"
                onClick={onVerifyPayment}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
              >
                🔄 Verifikasi Pembayaran
              </Button>
            </div>
          </div>
        ) : orderStep === 3 ? (
          <div className="text-center space-y-4 py-6">
            <span className="text-5xl text-emerald-500">🎉</span>
            <div>
              <h4 className="font-bold text-slate-900 dark:text-white">Pembayaran Berhasil!</h4>
              <p className="text-xs text-slate-500">Kunci lisensi Easy Tunnel Anda telah aktif.</p>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-800 max-w-sm mx-auto space-y-2">
              <p className="text-xs text-slate-500">License Key Anda:</p>
              <p className="font-mono font-bold text-xs bg-white dark:bg-slate-900 p-2 border rounded-lg text-slate-900 dark:text-white select-all">
                {licenseKey}
              </p>
            </div>

            <Button
              type="button"
              variant="toolbarPrimary"
              size="toolbar"
              onClick={onAutoInstall}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
            >
              🚀 Pasang Tunnel di PC/Server Ini
            </Button>
          </div>
        ) : null}
      </div>
    </Modal>
  );
});

export default EasyTunnelOrderModal;
