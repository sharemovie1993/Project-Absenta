import React from 'react';
import { X, MessageCircle, Copy, ExternalLink, Check } from 'lucide-react';
interface WhatsAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  parentName: string;
  parentPhone: string;
  studentName: string;
  reasonText: string;
}
export const WhatsAppModal: React.FC<WhatsAppModalProps> = ({
  isOpen,
  onClose,
  parentName,
  parentPhone,
  studentName,
  reasonText
}) => {
  const [copied, setCopied] = React.useState(false);
  if (!isOpen) return null;
  const cleanPhone = parentPhone.replace(/\D/g, '');
  const formattedPhone = cleanPhone.startsWith('0') ? '62' + cleanPhone.slice(1) : cleanPhone;
  const formattedMessage = `Assalamu'alaikum Wr. Wb. Yth. Bapak/Ibu ${parentName},

Saya Drs. Budi Santoso, M.Pd. (Wali Kelas XI RPL 1 SMKN 1 Tech Center).

Menindaklanjuti permohonan ananda *${studentName}* mengenai (${reasonText}). Terima kasih atas konfirmasinya, catatan presensi ananda di sistem sekolah telah kami perbarui.

Jika ada informasi tambahan, Bapak/Ibu dapat membalas pesan ini. Terima kasih atas kerja samanya.

Wassalamu'alaikum Wr. Wb.`;
  const waUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(formattedMessage)}`;
  const handleCopy = () => {
    navigator.clipboard.writeText(formattedMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 relative overflow-hidden">
        {/* Header */}
        <div className="bg-emerald-700 text-white p-5 rounded-t-3xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-emerald-200" />
            <div>
              <h3 className="font-bold text-sm text-white">Direct Chat Ortu via WhatsApp</h3>
              <p className="text-xs text-emerald-100">Ortu: {parentName} ({parentPhone})</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-emerald-200 hover:text-white cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
            Template Pesan Wali Kelas (Otomatis & Santun):
          </label>

          <div className="bg-emerald-50/60 p-4 rounded-2xl border border-emerald-200 text-xs font-sans text-slate-800 leading-relaxed whitespace-pre-line shadow-inner">
            {formattedMessage}
          </div>

          <div className="flex items-center justify-between gap-3 pt-2">
            <button onClick={handleCopy} className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 px-4 py-2.5 rounded-xl transition-colors cursor-pointer">
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Tersalin!' : 'Salin Pesan'}
            </button>

            <a href={waUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-md transition-all cursor-pointer active:scale-95">
              <ExternalLink className="w-4 h-4" />
              Buka WhatsApp Sekarang
            </a>
          </div>
        </div>
      </div>
    </div>;
};