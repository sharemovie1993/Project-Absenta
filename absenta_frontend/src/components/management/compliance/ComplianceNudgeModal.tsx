import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui';
import { AlertTriangle, Send, Smartphone, Copy, Check } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { z } from 'zod';
import { sendWaGreeting } from '@/api/whatsapp.api';

export interface NudgeModalTarget {
  nama: string;
  role: 'GURU' | 'SISWA';
  noWa: string;
  issues: string[];
}

export type ComplianceTemplateKey = 'RFID' | 'LOGIN_PORTAL' | 'JURNAL' | 'KONTAK_WA';

interface ComplianceNudgeModalProps {
  target: NudgeModalTarget;
  onClose: () => void;
}

const nudgeSchema = z.object({
  nama: z.string().min(1, 'Nama tujuan wajib ada'),
  noWa: z.string().min(6, 'Nomor WhatsApp belum terdata atau tidak valid'),
  template: z.enum(['RFID', 'LOGIN_PORTAL', 'JURNAL', 'KONTAK_WA']),
});

function cleanIndonesianPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('0')) return '62' + digits.slice(1);
  if (digits.startsWith('8')) return '62' + digits;
  return digits;
}

const TEMPLATE_OPTIONS: Array<{ id: ComplianceTemplateKey; label: string }> = [
  { id: 'RFID', label: '💳 Pendaftaran Kartu RFID' },
  { id: 'LOGIN_PORTAL', label: '🔑 Aktivasi Login Portal' },
  { id: 'JURNAL', label: '📖 Pengisian Jurnal KBM' },
  { id: 'KONTAK_WA', label: '📱 Pembaruan Nomor WA' },
];

export const ComplianceNudgeModal: React.FC<ComplianceNudgeModalProps> = React.memo(({ target, onClose }) => {
  const [template, setTemplate] = useState<ComplianceTemplateKey>('RFID');
  const [copied, setCopied] = useState(false);
  const [sendingViaBot, setSendingViaBot] = useState(false);

  const getMessageContent = useCallback((tpl: ComplianceTemplateKey) => {
    let body = '';
    if (tpl === 'RFID') {
      body = 'Sistem mencatat Kartu RFID Presensi Anda belum terdaftar. Mohon segera melakukan pairing kartu ke bagian Tata Usaha / IT sekolah untuk kemudahan tap presensi.';
    } else if (tpl === 'JURNAL') {
      body = 'Mengingatkan untuk memeriksa dan melengkapi pengisian Jurnal KBM pada sesi mengajar Anda di sistem.';
    } else if (tpl === 'LOGIN_PORTAL') {
      body = 'Akun Portal mandiri Anda telah disiapkan. Silakan masuk ke aplikasi untuk mengakses jadwal dan informasi presensi.';
    } else {
      body = 'Mengingatkan untuk melengkapi nomor kontak WhatsApp aktif agar notifikasi presensi dan akademik dapat diterima secara otomatis.';
    }

    return `Halo Bpk/Ibu/Sdr *${target.nama}*,\n\n${body}\n\n_Pesan resmi dari Sistem Informasi Sekolah._`;
  }, [target.nama]);

  const handleCopy = useCallback(() => {
    const message = getMessageContent(template);
    navigator.clipboard.writeText(message);
    setCopied(true);
    toast.success('Pesan WhatsApp disalin ke clipboard!');
    setTimeout(() => setCopied(false), 2000);
  }, [getMessageContent, template]);

  const handleDirectWhatsApp = useCallback(() => {
    const parsed = nudgeSchema.safeParse({
      nama: target.nama,
      noWa: target.noWa,
      template,
    });
    if (!parsed.success) {
      toast.error(parsed.error.errors[0]?.message || 'Nomor WhatsApp tidak valid');
      return;
    }

    const cleanPhone = cleanIndonesianPhone(target.noWa);
    const message = getMessageContent(template);
    const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
    window.open(waUrl, '_blank');
    
    toast.success(`Membuka WhatsApp untuk mengirim pesan ke ${target.nama}`);
    onClose();
  }, [target, template, getMessageContent, onClose]);

  const handleSendViaBot = useCallback(async () => {
    const parsed = nudgeSchema.safeParse({
      nama: target.nama,
      noWa: target.noWa,
      template,
    });
    if (!parsed.success) {
      toast.error(parsed.error.errors[0]?.message || 'Nomor WhatsApp tidak valid');
      return;
    }
    setSendingViaBot(true);
    try {
      const cleanPhone = cleanIndonesianPhone(target.noWa);
      const message = getMessageContent(template);
      const res = await sendWaGreeting({
        userType: target.role === 'GURU' ? 'GURU' : 'ORTU',
        nama: target.nama,
        no_hp: cleanPhone,
        detailInfo: 'Pusat Kepatuhan Platform',
        customMessage: message,
      });
      if (res && res.success) {
        toast.success(`Pesan berhasil dikirim via WhatsApp Gateway ke ${target.nama}`);
        onClose();
      } else {
        toast.error(res?.message || 'Gagal mengirim via Gateway. Silakan gunakan tombol WhatsApp Langsung.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gateway WhatsApp tidak aktif. Beralih ke WhatsApp langsung.';
      toast.error(msg);
    } finally {
      setSendingViaBot(false);
    }
  }, [target, template, getMessageContent, onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden flex flex-col">
        <div className="p-4 sm:p-5 bg-emerald-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center text-lg">📲</div>
            <div>
              <h3 className="font-bold text-sm">Kirim Pengingat WhatsApp Resmi</h3>
              <p className="text-[11px] text-emerald-100">
                Kepada: <strong>{target.nama}</strong> ({target.noWa || 'Tanpa No WA'})
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="text-white hover:text-slate-200 text-sm font-bold cursor-pointer p-1">✕</button>
        </div>

        <div className="p-4 sm:p-6 space-y-4 text-xs">
          {/* Detected Issues */}
          {(target.issues ?? []).length > 0 && (
            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 space-y-1">
              <span className="text-[10px] font-bold uppercase text-amber-700 dark:text-amber-300 flex items-center gap-1">
                <AlertTriangle size={12} /> Isu Kelengkapan Terdeteksi:
              </span>
              <ul className="list-disc list-inside text-[11px] text-slate-700 dark:text-slate-300">
                {(target.issues ?? [])?.map((iss, i) => (
                  <li key={i}>{iss}</li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <label htmlFor="pilih-topik-pengingat" className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1.5 uppercase tracking-wider">
              Pilih Topik Pengingat:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {(TEMPLATE_OPTIONS ?? [])?.map((tpl) => (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() => setTemplate(tpl.id)}
                  className={`p-2.5 rounded-xl border text-xs font-bold text-left transition-all cursor-pointer ${
                    template === tpl.id
                      ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-500 text-indigo-700 dark:text-indigo-300 shadow-xs'
                      : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300'
                  }`}
                >
                  {tpl.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase text-slate-400">Preview Pesan WhatsApp:</span>
              <button
                type="button"
                onClick={handleCopy}
                className="text-[11px] font-bold text-indigo-600 hover:text-indigo-500 flex items-center gap-1 cursor-pointer"
              >
                {copied ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                {copied ? 'Tersalin' : 'Salin Teks'}
              </button>
            </div>
            <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 text-xs font-medium text-slate-800 dark:text-slate-200 space-y-2 whitespace-pre-line">
              {getMessageContent(template)}
            </div>
          </div>
        </div>

        <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-end gap-2">
          <Button type="button" variant="toolbarOutline" size="toolbar" onClick={onClose} className="cursor-pointer">
            Batal
          </Button>
          <Button
            type="button"
            size="toolbar"
            variant="toolbarOutline"
            disabled={sendingViaBot}
            onClick={handleSendViaBot}
            className="font-bold cursor-pointer flex items-center gap-1.5 text-indigo-600 border-indigo-200 dark:border-indigo-800 hover:bg-indigo-50"
          >
            <Send size={12} />
            {sendingViaBot ? 'Mengirim...' : 'Kirim via Server WA Bot'}
          </Button>
          <Button
            type="button"
            size="toolbar"
            variant="toolbarPrimary"
            onClick={handleDirectWhatsApp}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold cursor-pointer flex items-center gap-1.5"
          >
            <Smartphone size={12} />
            Buka di WhatsApp Saya
          </Button>
        </div>
      </div>
    </div>
  );
});

ComplianceNudgeModal.displayName = 'ComplianceNudgeModal';
