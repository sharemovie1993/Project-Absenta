import React, { useState, useEffect } from 'react';
import { Server, CheckCircle2, Globe, ArrowRight, RefreshCw, X, AlertCircle, Sparkles } from 'lucide-react';
import { getSavedServerDomain, saveServerDomain, clearServerDomain, normalizeServerUrl } from '../../services/serverConfig';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';

interface ServerDomainSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (domain: string) => void;
}

export const ServerDomainSetupModal: React.FC<ServerDomainSetupModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [domainInput, setDomainInput] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [currentDomain, setCurrentDomain] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const saved = getSavedServerDomain();
      setCurrentDomain(saved);
      if (saved) {
        setDomainInput(saved);
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!domainInput.trim()) {
      toast.error('Silakan masukkan domain sekolah Anda');
      return;
    }

    setIsConnecting(true);
    try {
      const result = await saveServerDomain(domainInput);
      if (result.success) {
        toast.success(result.message);
        const { host } = normalizeServerUrl(domainInput);
        setCurrentDomain(host);
        if (onSuccess) {
          onSuccess(host);
        }
        setTimeout(() => {
          onClose();
          // Reload page to re-initialize all query clients and singletons with new server context
          window.location.reload();
        }, 800);
      } else {
        toast.error(result.message);
      }
    } catch (err: any) {
      toast.error('Gagal menghubungkan ke server sekolah');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleReset = async () => {
    if (window.confirm('Yakin ingin mereset server domain sekolah?')) {
      await clearServerDomain();
      setCurrentDomain(null);
      setDomainInput('');
      toast.success('Server domain berhasil direset');
      setTimeout(() => {
        window.location.reload();
      }, 500);
    }
  };

  const presetExamples = ['smkn1pld.absenta.id', 'demo.absenta.id'];

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-5 relative overflow-hidden">
        {/* Decorative background glow */}
        <div className="absolute -top-16 -right-16 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-100 dark:border-emerald-900 shadow-sm">
              <Server size={24} />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-900 dark:text-slate-100 leading-tight">
                Hubungkan Server Sekolah
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Konfigurasi domain server Absenta Anda
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Current status if already connected */}
        {currentDomain && (
          <div className="bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/60 p-3.5 rounded-2xl flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
              <div className="min-w-0">
                <span className="text-[10px] text-emerald-700 dark:text-emerald-300 font-bold block uppercase tracking-wider">
                  Terhubung Saat Ini:
                </span>
                <span className="font-mono font-bold text-slate-900 dark:text-slate-100 truncate block">
                  {currentDomain}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleReset}
              className="text-[11px] font-bold text-rose-600 hover:text-rose-700 hover:underline shrink-0 ml-2"
            >
              Reset
            </button>
          </div>
        )}

        {/* Input Form */}
        <form onSubmit={handleConnect} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              Domain / Subdomain Sekolah
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Globe size={16} />
              </div>
              <input
                type="text"
                placeholder="Contoh: smkn1pld.absenta.id"
                value={domainInput}
                onChange={(e) => setDomainInput(e.target.value)}
                className="w-full h-12 pl-10 pr-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs font-mono font-bold text-slate-900 dark:text-slate-100 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all"
                disabled={isConnecting}
                autoFocus
              />
            </div>
            <p className="text-[11px] text-slate-400 leading-tight">
              Cukup ketik nama subdomain (misal: <code className="text-emerald-600 font-bold font-mono">smkn1pld</code>) atau domain lengkap sekolah.
            </p>
          </div>

          {/* Quick presets */}
          <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Sparkles size={11} className="text-amber-500" /> Contoh:
            </span>
            {presetExamples.map((ex) => (
              <button
                key={ex}
                type="button"
                onClick={() => setDomainInput(ex)}
                className="text-[11px] font-mono px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-950/40 dark:hover:text-emerald-400 text-slate-600 dark:text-slate-300 transition-all font-semibold"
              >
                {ex}
              </button>
            ))}
          </div>

          {/* Connect Button */}
          <button
            type="submit"
            disabled={isConnecting || !domainInput.trim()}
            className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 active:scale-[0.99] transition-all cursor-pointer"
          >
            {isConnecting ? (
              <>
                <RefreshCw size={16} className="animate-spin" />
                <span>Menghubungkan Server...</span>
              </>
            ) : (
              <>
                <span>Hubungkan ke Server Sekolah</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-center">
          <p className="text-[10px] text-slate-400">
            Aplikasi akan otomatis mengarahkan data dan sesi login ke server sekolah yang dipilih.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ServerDomainSetupModal;
