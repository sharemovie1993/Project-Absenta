/**
 * DapodikConnectionModal.tsx
 * Modal Pengaturan Koneksi & Autentikasi Web Service Dapodik Lokal port 5774
 * Dikemas elegan dalam Modal untuk meminimalkan noise visual pada workspace audit.
 */

import React, { useState } from 'react';
import { 
  Key, Server, Copy, Check, Eye, EyeOff, RefreshCw, 
  HelpCircle, ShieldAlert, CheckCircle2, AlertTriangle, ExternalLink
} from 'lucide-react';
import { toast } from 'sonner';

import { Modal, Button, Input } from '@/components/ui';
import type { DapodikConfig, TestConnectionResponse } from '@/api/dapodik.api';

interface DapodikConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  configForm: DapodikConfig;
  setConfigForm: React.Dispatch<React.SetStateAction<DapodikConfig>>;
  primaryServerIp: string;
  onSave: () => void;
  isSaving: boolean;
  testResult: TestConnectionResponse | null;
  isTesting: boolean;
  onTestConnection: () => void;
}

export const DapodikConnectionModal: React.FC<DapodikConnectionModalProps> = ({
  isOpen,
  onClose,
  configForm,
  setConfigForm,
  primaryServerIp,
  onSave,
  isSaving,
  testResult,
  isTesting,
  onTestConnection,
}) => {
  const [showToken, setShowToken] = useState(false);
  const [copiedIp, setCopiedIp] = useState(false);
  const [activeTab, setActiveTab] = useState<'form' | 'guide'>('form');

  const handleCopyIp = () => {
    if (primaryServerIp) {
      navigator.clipboard.writeText(primaryServerIp);
      setCopiedIp(true);
      toast.success(`IP Server Absenta (${primaryServerIp}) berhasil disalin!`);
      setTimeout(() => setCopiedIp(false), 2500);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="2xl"
      title={
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <Key className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Pengaturan Koneksi Web Service Dapodik
            </h3>
            <p className="text-[11px] font-normal text-slate-500 dark:text-slate-400">
              Konfigurasi host URL, token autentikasi, dan whitelist IP server
            </p>
          </div>
        </div>
      }
    >
      <div className="space-y-4 text-xs">
        {/* Sub-Tabs Navigasi dalam Modal */}
        <div className="flex items-center gap-1 border-b border-slate-200 dark:border-slate-800 pb-2">
          <button
            type="button"
            onClick={() => setActiveTab('form')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'form'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            Formulir Koneksi
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('guide')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === 'guide'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            Panduan &amp; Troubleshooting
          </button>
        </div>

        {activeTab === 'form' ? (
          <div className="space-y-4">
            {/* Whitelist IP Server Banner */}
            <div className="p-3 bg-gradient-to-r from-indigo-50/70 to-slate-50 dark:from-indigo-950/30 dark:to-slate-900/40 rounded-xl border border-indigo-200/80 dark:border-indigo-900/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-slate-100">
                  <Server className="w-3.5 h-3.5 text-indigo-600" />
                  <span>IP Whitelist Server Absenta</span>
                  <span className="text-[10px] font-semibold px-1.5 py-0.2 bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 rounded-full">
                    Wajib Didaftarkan
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                  Dapodik hanya menerima panggilan dari IP ini di menu <strong>Pengaturan &gt; Web Service</strong>.
                </p>
              </div>

              <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 px-2 py-1 rounded-lg border border-indigo-200/60 dark:border-indigo-800/60 shrink-0">
                <code className="font-mono text-xs font-bold text-indigo-700 dark:text-indigo-400">
                  {primaryServerIp}
                </code>
                <button
                  type="button"
                  onClick={handleCopyIp}
                  title="Salin IP"
                  className="text-slate-400 hover:text-indigo-600 transition-colors ml-1 p-0.5"
                >
                  {copiedIp ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Input Host URL */}
            <div className="space-y-1">
              <label className="font-semibold text-slate-700 dark:text-slate-300">
                Host / Alamat Web Service Dapodik
              </label>
              <Input
                placeholder="http://10.10.10.50:5774"
                value={configForm.dapodik_host}
                onChange={(e) => setConfigForm({ ...configForm, dapodik_host: e.target.value })}
                className="font-mono text-xs h-8.5"
              />
              <p className="text-[11px] text-slate-400">
                Masukkan URL komputer operator Dapodik lengkap dengan port 5774.
              </p>
            </div>

            {/* Input NPSN */}
            <div className="space-y-1">
              <label className="font-semibold text-slate-700 dark:text-slate-300">
                NPSN Sekolah
              </label>
              <Input
                placeholder="Contoh: 20229659"
                value={configForm.npsn}
                onChange={(e) => setConfigForm({ ...configForm, npsn: e.target.value })}
                className="font-mono text-xs h-8.5"
              />
              <p className="text-[11px] text-slate-400">
                Nomor Pokok Sekolah Nasional sebagai kunci data lembaga.
              </p>
            </div>

            {/* Input Token */}
            <div className="space-y-1">
              <label className="font-semibold text-slate-700 dark:text-slate-300">
                Token Web Service Dapodik
              </label>
              <div className="relative">
                <Input
                  type={showToken ? 'text' : 'password'}
                  placeholder="Masukkan Token Web Service Dapodik..."
                  value={configForm.api_token}
                  onChange={(e) => setConfigForm({ ...configForm, api_token: e.target.value })}
                  className="font-mono text-xs pr-10 h-8.5"
                />
                <button
                  type="button"
                  onClick={() => setShowToken(!showToken)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showToken ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
              <p className="text-[11px] text-slate-400">
                Kunci otorisasi unik yang dibuat saat menambahkan aplikasi Absenta di menu Web Service Dapodik.
              </p>
            </div>

            {/* Hasil Uji Koneksi */}
            {testResult && (
              <div
                className={`p-3 rounded-xl border space-y-2 text-xs ${
                  testResult.success
                    ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/40 text-emerald-900 dark:text-emerald-200'
                    : 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800/40 text-rose-900 dark:text-rose-200'
                }`}
              >
                <div className="flex items-center gap-2 font-bold text-xs">
                  {testResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  )}
                  <span>{testResult.message}</span>
                </div>

                {testResult.schoolInfo && (
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-emerald-200/60 dark:border-emerald-800/40 text-[11px]">
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase font-semibold">Nama Sekolah:</span>
                      <div className="font-bold">{testResult.schoolInfo.nama}</div>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase font-semibold">NPSN:</span>
                      <div className="font-mono font-bold">{testResult.schoolInfo.npsn}</div>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase font-semibold">Bentuk / Status:</span>
                      <div>{testResult.schoolInfo.bentuk_pendidikan} ({testResult.schoolInfo.status_sekolah})</div>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase font-semibold">Kecamatan:</span>
                      <div>{testResult.schoolInfo.kecamatan}</div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
              <Button
                type="button"
                variant="outline"
                onClick={onTestConnection}
                disabled={isTesting || !configForm.dapodik_host || !configForm.npsn || !configForm.api_token}
                className="gap-2 font-semibold text-xs h-8"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
                {isTesting ? 'Menguji...' : 'Uji Koneksi (Handshake)'}
              </Button>

              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" onClick={onClose} className="h-8 text-xs">
                  Tutup
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  onClick={onSave}
                  disabled={isSaving || !configForm.dapodik_host || !configForm.npsn || !configForm.api_token}
                  className="gap-2 font-semibold text-xs h-8"
                >
                  {isSaving && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  {isSaving ? 'Menyimpan...' : 'Simpan Konfigurasi'}
                </Button>
              </div>
            </div>
          </div>
        ) : (
          /* Panduan & Troubleshooting Tab */
          <div className="space-y-3.5">
            <div className="space-y-2.5">
              <div className="flex items-start gap-2.5 p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center shrink-0 text-[10px]">
                  1
                </span>
                <div className="space-y-0.5">
                  <strong className="text-slate-900 dark:text-white">Buka Aplikasi Dapodik Lokal</strong>
                  <p className="text-slate-600 dark:text-slate-400 text-[11px]">
                    Buka browser di PC operator Dapodik ke <code className="bg-slate-200 dark:bg-slate-700 px-1 py-0.5 rounded">http://localhost:5774</code> dan login akun Operator.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center shrink-0 text-[10px]">
                  2
                </span>
                <div className="space-y-0.5">
                  <strong className="text-slate-900 dark:text-white">Daftarkan Web Service</strong>
                  <p className="text-slate-600 dark:text-slate-400 text-[11px]">
                    Menu <strong>Pengaturan</strong> &gt; <strong>Web Service</strong> &gt; klik <strong>Tambah</strong>.
                  </p>
                  <p className="text-[11px] text-slate-500 pt-0.5">
                    Nama: <strong>Absenta Platform</strong> • IP: <strong className="text-indigo-600 dark:text-indigo-400 font-mono">{primaryServerIp}</strong>
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center shrink-0 text-[10px]">
                  3
                </span>
                <div className="space-y-0.5">
                  <strong className="text-slate-900 dark:text-white">Salin Token Key</strong>
                  <p className="text-slate-600 dark:text-slate-400 text-[11px]">
                    Salin Token Key yang digenerate oleh sistem Dapodik dan tempelkan di formulir pengaturan ini.
                  </p>
                </div>
              </div>
            </div>

            {/* Troubleshooting Alert Box */}
            <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-800/40 space-y-1">
              <h4 className="text-xs font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                Troubleshooting &amp; Solusi:
              </h4>
              <ul className="list-disc list-inside space-y-0.5 text-[11px] text-amber-800 dark:text-amber-300">
                <li>Pastikan Service <strong>DapodikDB</strong> dan <strong>DapodikWebSvc</strong> di Windows operator berstatus <em>Running</em>.</li>
                <li>Jika gagal terhubung, buka port 5774 di Windows Firewall komputer operator untuk IP {primaryServerIp}.</li>
                <li>Jika status 401/403, periksa kembali kecocokan Token dan IP Whitelist.</li>
              </ul>
            </div>

            <div className="flex justify-end pt-2">
              <Button type="button" variant="outline" onClick={() => setActiveTab('form')} className="h-8 text-xs">
                Kembali ke Formulir
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
