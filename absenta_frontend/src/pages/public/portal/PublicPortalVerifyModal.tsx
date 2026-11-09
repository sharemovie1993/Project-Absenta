import React, { useState } from 'react';
import {
  ShieldCheck,
  X,
  Search,
  CheckCircle2,
  AlertCircle,
  FileCheck2,
  Calendar,
  Award,
  Loader2,
} from 'lucide-react';
import { publicPortalApi, DocumentVerificationResult } from '../../../api/public-portal.api';

interface PublicPortalVerifyModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenantSlug: string;
}

export const PublicPortalVerifyModal: React.FC<PublicPortalVerifyModalProps> = ({
  isOpen,
  onClose,
  tenantSlug,
}) => {
  const [docType, setDocType] = useState<'SKL' | 'UKK'>('SKL');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DocumentVerificationResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;

    setLoading(true);
    setResult(null);
    setErrorMsg(null);

    try {
      const res = await publicPortalApi.verifyDocument(tenantSlug, docType, code.trim());
      if (res.success && res.data) {
        setResult(res.data);
      } else {
        setErrorMsg('Dokumen tidak ditemukan dalam arsip resmi sekolah.');
      }
    } catch (err: any) {
      setErrorMsg(
        err?.response?.data?.message || 'Nomor dokumen tidak valid atau belum terdaftar dalam sistem.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Modal Header */}
        <div className="bg-slate-900 text-white p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/30 border border-blue-400/40 flex items-center justify-center text-blue-400">
              <ShieldCheck className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Verifikasi Keaslian Dokumen</h3>
              <p className="text-xs text-slate-400">Pusat Validasi Digital Ijazah & Sertifikat</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6">
          <form onSubmit={handleVerify} className="space-y-4">
            {/* Document Type Selector */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setDocType('SKL');
                  setResult(null);
                  setErrorMsg(null);
                }}
                className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-all ${
                  docType === 'SKL'
                    ? 'bg-blue-50 border-blue-600 text-blue-700 shadow-xs'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Surat Keterangan Lulus (SKL)
              </button>
              <button
                type="button"
                onClick={() => {
                  setDocType('UKK');
                  setResult(null);
                  setErrorMsg(null);
                }}
                className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-all ${
                  docType === 'UKK'
                    ? 'bg-blue-50 border-blue-600 text-blue-700 shadow-xs'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Sertifikat Uji Kompetensi (UKK)
              </button>
            </div>

            {/* Input Code */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">
                Nomor Dokumen / Kode Verifikasi QR:
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder={docType === 'SKL' ? 'Contoh: 421.5/082/SMK/2026' : 'Contoh: UKK-TKJ-2026-0012'}
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 uppercase"
                />
                <button
                  type="submit"
                  disabled={loading || !code.trim()}
                  className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold transition-colors flex items-center gap-1.5"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Search className="w-3.5 h-3.5" />
                      <span>Cek</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>

          {/* Error Alert */}
          {errorMsg && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-3 animate-in fade-in">
              <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Verifikasi Gagal</p>
                <p className="mt-0.5">{errorMsg}</p>
              </div>
            </div>
          )}

          {/* Success Result Card */}
          {result && (
            <div className="p-5 rounded-2xl bg-emerald-50/90 border-2 border-emerald-500/80 space-y-4 animate-in zoom-in-95">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center flex-shrink-0 shadow-sm">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-emerald-200 text-emerald-900 tracking-wider">
                    TERVERIFIKASI SAH
                  </span>
                  <h4 className="text-sm font-bold text-slate-900 mt-1 leading-snug">
                    {result.jenis_dokumen}
                  </h4>
                </div>
              </div>

              <div className="bg-white rounded-xl p-3.5 border border-emerald-200/80 space-y-2 text-xs text-slate-700">
                <div className="flex justify-between border-b border-slate-100 pb-1.5">
                  <span className="text-slate-400 font-medium">Nomor Dokumen:</span>
                  <span className="font-bold text-slate-900">{result.nomor_dokumen}</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-1.5">
                  <span className="text-slate-400 font-medium">Nama Peserta Didik:</span>
                  <span className="font-bold text-slate-900">{result.nama_siswa}</span>
                </div>
                {result.nisn && (
                  <div className="flex justify-between border-b border-slate-100 pb-1.5">
                    <span className="text-slate-400 font-medium">NISN:</span>
                    <span className="font-semibold text-slate-800">{result.nisn}</span>
                  </div>
                )}
                {result.status_kelulusan && (
                  <div className="flex justify-between border-b border-slate-100 pb-1.5">
                    <span className="text-slate-400 font-medium">Status Kelulusan:</span>
                    <span className="font-extrabold text-emerald-700">{result.status_kelulusan}</span>
                  </div>
                )}
                {result.predikat && (
                  <div className="flex justify-between border-b border-slate-100 pb-1.5">
                    <span className="text-slate-400 font-medium">Predikat UKK:</span>
                    <span className="font-extrabold text-amber-700">{result.predikat}</span>
                  </div>
                )}
                {result.mitra_penguji && (
                  <div className="flex justify-between border-b border-slate-100 pb-1.5">
                    <span className="text-slate-400 font-medium">Mitra Penguji:</span>
                    <span className="font-medium text-slate-700">{result.mitra_penguji}</span>
                  </div>
                )}
                <div className="flex justify-between pt-1 text-[11px] text-slate-400">
                  <span>Tanggal Terbit Resmi:</span>
                  <span>{result.tanggal_terbit || result.tanggal_lulus || '-'}</span>
                </div>
              </div>

              <p className="text-[10px] text-emerald-800 text-center font-medium">
                Dokumen ini terdaftar secara sah dan otentik dalam pangkalan data arsip digital sekolah.
              </p>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 text-center">
          <p className="text-[11px] text-slate-400">
            Sistem Verifikasi Digital Terpusat • Absenta Ecosystem
          </p>
        </div>
      </div>
    </div>
  );
};
