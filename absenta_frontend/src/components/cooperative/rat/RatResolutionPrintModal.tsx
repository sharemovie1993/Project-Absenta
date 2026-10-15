import React from 'react';
import { Modal, Button, Badge } from '../../ui';
import { Printer, Copy, Check, FileCheck, ShieldCheck, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import type { CoopResolutionItem } from '../../../pages/cooperative/RatMeetingPage';

interface RatResolutionPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  resolution: CoopResolutionItem | null;
  coopName?: string;
  meetingId?: string;
  meetingLocation?: string | null;
  meetingDate?: string | null;
}

export const RatResolutionPrintModal: React.FC<RatResolutionPrintModalProps> = React.memo(({
  isOpen,
  onClose,
  resolution,
  coopName = 'KOPERASI KONSUMEN / SIMPAN PINJAM',
  meetingId,
  meetingLocation,
  meetingDate,
}) => {
  const [copied, setCopied] = React.useState(false);
  const [presidium, setPresidium] = React.useState({
    chairperson: '',
    secretary: '',
    member: '',
  });

  React.useEffect(() => {
    if (meetingId && isOpen) {
      try {
        const saved = localStorage.getItem(`absenta_rat_presidium_${meetingId}`);
        if (saved) {
          const parsed = JSON.parse(saved);
          setPresidium({
            chairperson: parsed.chairperson || '',
            secretary: parsed.secretary || '',
            member: parsed.member || '',
          });
        }
      } catch {
        // ignore localStorage error
      }
    }
  }, [meetingId, isOpen]);

  const handlePresidiumChange = (field: 'chairperson' | 'secretary' | 'member', value: string) => {
    setPresidium((prev) => {
      const next = { ...prev, [field]: value };
      if (meetingId) {
        try {
          localStorage.setItem(`absenta_rat_presidium_${meetingId}`, JSON.stringify(next));
        } catch {
          // ignore
        }
      }
      return next;
    });
  };

  const formattedMeetingDate = React.useMemo(() => {
    if (!meetingDate) return 'Hari ini';
    try {
      return new Date(meetingDate).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return meetingDate;
    }
  }, [meetingDate]);

  if (!isOpen || !resolution) return null;

  const handleCopyText = async () => {
    try {
      const fullText = `
SURAT KETETAPAN RAPAT ANGGOTA TAHUNAN (RAT)
Nomor: ${resolution.resolutionNo}
Tentang: ${resolution.subject}

${resolution.summary}
      `.trim();
      await navigator.clipboard.writeText(fullText);
      setCopied(true);
      toast.success('Naskah ketetapan berhasil disalin ke clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Gagal menyalin naskah');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Salinan Surat Ketetapan Resmi (TAP RAT)"
      size="5xl"
    >
      <div className="space-y-6 max-w-4xl mx-auto w-full">
        {/* ACTION TOOLBAR (HIDDEN ON PRINT) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 print:hidden">
          <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="font-semibold">Dokumen Otentik Hasil Sidang Pleno RAT</span>
            <Badge variant="success" className="text-[10px]">Sah & Mengikat</Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCopyText}
              className="gap-1.5 text-xs"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Tersalin' : 'Salin Naskah'}
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handlePrint}
              className="gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-700"
            >
              <Printer className="w-3.5 h-3.5" />
              Cetak Dokumen
            </Button>
          </div>
        </div>

        {/* PRESIDIUM INTEGRATION BAR (HIDDEN ON PRINT) */}
        <div className="p-3.5 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 space-y-2.5 print:hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Nama Presidium Sidang Terpilih (Tersimpan Otomatis untuk Semua Dokumen TAP):
              </span>
            </div>
            <Badge variant="indigo" className="text-[10px]">Tercetak di Dokumen</Badge>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div>
              <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                Ketua Presidium
              </label>
              <input
                type="text"
                value={presidium.chairperson}
                onChange={(e) => handlePresidiumChange('chairperson', e.target.value)}
                placeholder="Contoh: Drs. H. Ahmad Fauzi"
                className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                Sekretaris Presidium
              </label>
              <input
                type="text"
                value={presidium.secretary}
                onChange={(e) => handlePresidiumChange('secretary', e.target.value)}
                placeholder="Contoh: Dra. Siti Rahmawati"
                className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                Anggota Presidium
              </label>
              <input
                type="text"
                value={presidium.member}
                onChange={(e) => handlePresidiumChange('member', e.target.value)}
                placeholder="Contoh: Budi Santoso, S.Kom."
                className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* PRINTABLE LEGAL DOCUMENT CONTAINER */}
        <div className="p-8 md:p-12 rounded-xl bg-white text-slate-900 border border-slate-200 shadow-sm font-serif space-y-6 print:shadow-none print:border-none print:p-0">
          {/* HEADER */}
          <div className="text-center border-b-2 border-slate-900 pb-5 space-y-1">
            <div className="flex justify-center mb-2">
              <div className="w-12 h-12 rounded-full border-2 border-slate-900 flex items-center justify-center font-bold text-slate-900">
                <FileCheck className="w-6 h-6" />
              </div>
            </div>
            <h2 className="text-base md:text-lg font-black tracking-wider uppercase">
              {coopName}
            </h2>
            <h3 className="text-sm font-bold uppercase tracking-wide">
              RAPAT ANGGOTA TAHUNAN (RAT)
            </h3>
            <p className="text-xs font-sans text-slate-600">
              Berdasarkan Undang-Undang Nomor 25 Tahun 1992 tentang Perkoperasian
            </p>
          </div>

          {/* TAP METADATA */}
          <div className="text-center space-y-1.5 pt-2">
            <h4 className="text-sm md:text-base font-black underline uppercase">
              SURAT KETETAPAN RAPAT ANGGOTA TAHUNAN
            </h4>
            <p className="font-mono text-xs md:text-sm font-bold text-slate-800">
              NOMOR: {resolution.resolutionNo}
            </p>
            <p className="text-xs md:text-sm font-bold uppercase pt-1 text-slate-800">
              TENTANG: {resolution.subject}
            </p>
          </div>

          {/* DOCUMENT BODY */}
          <div className="text-xs md:text-sm leading-relaxed text-justify whitespace-pre-line text-slate-800 pt-3">
            {resolution.summary}
          </div>

          {/* SIGNATURE SECTION */}
          <div className="pt-8 border-t border-slate-200 mt-8 font-sans">
            <div className="text-right text-xs text-slate-700 mb-6 space-y-0.5">
              <div>Ditetapkan di: {meetingLocation || 'Tempat Sidang Pleno RAT'}</div>
              <div>Pada tanggal: {formattedMeetingDate}</div>
            </div>
            <div className="text-center font-bold text-xs uppercase tracking-wider mb-8">
              PRESIDIUM SIDANG RAPAT ANGGOTA TAHUNAN
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 print:grid-cols-3 gap-6 text-center text-xs">
              {/* Ketua Sidang */}
              <div className="flex flex-col justify-between h-28">
                <span className="font-semibold text-slate-700 uppercase tracking-wide">Ketua Sidang</span>
                <div className="space-y-1">
                  <div className="border-b border-slate-900 pb-1 font-bold text-slate-900 text-xs sm:text-sm truncate">
                    {presidium.chairperson.trim() ? `( ${presidium.chairperson.trim()} )` : '( .................................... )'}
                  </div>
                  <span className="text-[10px] text-slate-500">Tanda Tangan & Nama Terang</span>
                </div>
              </div>

              {/* Sekretaris Sidang */}
              <div className="flex flex-col justify-between h-28">
                <span className="font-semibold text-slate-700 uppercase tracking-wide">Sekretaris Sidang</span>
                <div className="space-y-1">
                  <div className="border-b border-slate-900 pb-1 font-bold text-slate-900 text-xs sm:text-sm truncate">
                    {presidium.secretary.trim() ? `( ${presidium.secretary.trim()} )` : '( .................................... )'}
                  </div>
                  <span className="text-[10px] text-slate-500">Tanda Tangan & Nama Terang</span>
                </div>
              </div>

              {/* Anggota Presidium */}
              <div className="flex flex-col justify-between h-28">
                <span className="font-semibold text-slate-700 uppercase tracking-wide">Anggota Presidium</span>
                <div className="space-y-1">
                  <div className="border-b border-slate-900 pb-1 font-bold text-slate-900 text-xs sm:text-sm truncate">
                    {presidium.member.trim() ? `( ${presidium.member.trim()} )` : '( .................................... )'}
                  </div>
                  <span className="text-[10px] text-slate-500">Tanda Tangan & Nama Terang</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
});

RatResolutionPrintModal.displayName = 'RatResolutionPrintModal';
export default RatResolutionPrintModal;
