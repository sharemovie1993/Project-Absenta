import React, { useState } from 'react';
import {
  X,
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileSearch,
  Sparkles,
  UserCheck,
  Building2,
} from 'lucide-react';
import { publicPortalApi, PublicTicketTrackResult } from '../../../api/public-portal.api';

interface PublicPortalTicketTrackerModalProps {
  isOpen: boolean;
  onClose: () => void;
  slug: string;
  schoolName: string;
}

export const PublicPortalTicketTrackerModal: React.FC<PublicPortalTicketTrackerModalProps> = ({
  isOpen,
  onClose,
  slug,
  schoolName,
}) => {
  const [ticketCode, setTicketCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PublicTicketTrackResult | null>(null);

  if (!isOpen) return null;

  const handleTrack = async (codeOverride?: string) => {
    const targetCode = (codeOverride ?? ticketCode).trim().toUpperCase();
    if (!targetCode) return;
    if (codeOverride) setTicketCode(targetCode);

    setLoading(true);
    try {
      const res = await publicPortalApi.trackTicket(slug, targetCode);
      if (res?.data) {
        setResult(res.data);
      }
    } catch {
      setResult({
        found: false,
        ticket_code: targetCode,
        jenis_layanan: '-',
        nama_pemohon: '-',
        unit_tujuan: '-',
        tanggal_pengajuan: '-',
        status_terkini: 'TIDAK DITEMUKAN',
        tahapan: [],
        catatan_tindak_lanjut: `Nomor tiket "${targetCode}" tidak ditemukan. Pastikan format kode sesuai tanda bukti PTSP atau SRA.`,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-900 via-blue-900 to-slate-900 text-white px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center">
              <FileSearch className="w-6 h-6 text-sky-300" />
            </div>
            <div>
              <h3 className="font-bold text-lg leading-tight">
                Lacak Status Tiket Layanan Publik
              </h3>
              <p className="text-xs text-sky-200/90 mt-0.5">
                PTSP Buku Tamu & Kotak Aspirasi SRA • {schoolName}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
              Masukkan Nomor Tiket Layanan (PTSP-... atau SRA-...)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={ticketCode}
                onChange={(e) => setTicketCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === 'Enter' && handleTrack()}
                placeholder="Contoh: PTSP-20261109-DEMO atau SRA-20261109-DEMO"
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-indigo-600"
              />
              <button
                type="button"
                disabled={loading || !ticketCode.trim()}
                onClick={() => handleTrack()}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-bold flex items-center gap-2 transition-colors shrink-0"
              >
                <Search className="w-4 h-4" />
                <span>{loading ? 'Melacak...' : 'Lacak'}</span>
              </button>
            </div>

            {/* Quick Demo Buttons */}
            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              <span className="text-[11px] text-slate-500 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-500" />
                Coba Kode Demo:
              </span>
              <button
                type="button"
                onClick={() => handleTrack('PTSP-20261109-DEMO')}
                className="px-2.5 py-1 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 text-[11px] font-mono font-bold transition-colors"
              >
                PTSP-20261109-DEMO
              </button>
              <button
                type="button"
                onClick={() => handleTrack('SRA-20261109-DEMO')}
                className="px-2.5 py-1 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-[11px] font-mono font-bold transition-colors"
              >
                SRA-20261109-DEMO
              </button>
            </div>
          </div>

          {/* Hasil Pelacakan */}
          {result && (
            <div
              className={`rounded-2xl border p-5 ${
                result.found
                  ? 'bg-slate-50 border-indigo-200'
                  : 'bg-rose-50/70 border-rose-200'
              }`}
            >
              {!result.found ? (
                <div className="flex items-start gap-3 text-rose-800">
                  <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-sm">Tiket Tidak Ditemukan</h4>
                    <p className="text-xs text-rose-700 mt-1">{result.catatan_tindak_lanjut}</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200">
                    <div>
                      <span className="text-[11px] text-slate-500 font-mono">
                        NOMOR TIKET: <strong className="text-slate-900">{result.ticket_code}</strong>
                      </span>
                      <h4 className="font-bold text-slate-900 text-base mt-0.5">
                        {result.jenis_layanan}
                      </h4>
                    </div>
                    <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-extrabold">
                      {result.status_terkini}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="bg-white p-3 rounded-xl border border-slate-200/80 flex items-start gap-2.5">
                      <UserCheck className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">
                          Pemohon / Pengirim
                        </span>
                        <span className="font-semibold text-slate-800">{result.nama_pemohon}</span>
                      </div>
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-slate-200/80 flex items-start gap-2.5">
                      <Building2 className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">
                          Unit Tujuan Disposisi
                        </span>
                        <span className="font-semibold text-slate-800">{result.unit_tujuan}</span>
                      </div>
                    </div>
                  </div>

                  {/* Tahapan Progres */}
                  <div>
                    <h5 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                      Linimasa Penyelesaian Layanan
                    </h5>
                    <div className="space-y-2.5">
                      {result.tahapan.map((step, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between gap-3 bg-white px-3.5 py-2.5 rounded-xl border border-slate-200/80"
                        >
                          <div className="flex items-center gap-2.5">
                            {step.selesai ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            ) : (
                              <Clock className="w-4 h-4 text-amber-500 shrink-0" />
                            )}
                            <span className="text-xs font-semibold text-slate-800">
                              {step.label}
                            </span>
                          </div>
                          <span className="text-[11px] font-mono text-slate-500 shrink-0">
                            {step.waktu}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-indigo-50/80 border border-indigo-200/80 text-xs text-indigo-950">
                    <strong>Catatan Tindak Lanjut:</strong> {result.catatan_tindak_lanjut}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
