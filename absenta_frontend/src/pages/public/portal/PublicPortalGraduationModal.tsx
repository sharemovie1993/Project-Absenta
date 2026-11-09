import React, { useState } from 'react';
import {
  X,
  GraduationCap,
  Search,
  Sparkles,
  CheckCircle2,
  Award,
  Loader2,
  AlertCircle,
  MailOpen,
  FileText,
} from 'lucide-react';
import { publicPortalApi, PublicGraduationResult } from '../../../api/public-portal.api';

interface PublicPortalGraduationModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenantSlug: string;
  schoolName: string;
}

export const PublicPortalGraduationModal: React.FC<PublicPortalGraduationModalProps> = ({
  isOpen,
  onClose,
  tenantSlug,
  schoolName,
}) => {
  const [nisnInput, setNisnInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PublicGraduationResult | null>(null);
  const [envelopeOpened, setEnvelopeOpened] = useState(false);

  if (!isOpen) return null;

  const handleCheck = async (customQuery?: string) => {
    const q = (customQuery ?? nisnInput).trim();
    if (!q) return;
    if (customQuery) setNisnInput(customQuery);

    setLoading(true);
    setResult(null);
    setEnvelopeOpened(false);

    try {
      const res = await publicPortalApi.checkGraduation(tenantSlug, q);
      if (res.success && res.data) {
        setResult(res.data);
      } else {
        setResult({
          found: false,
          is_open: true,
          release_date: null,
          message: 'Data kelulusan tidak ditemukan.',
        });
      }
    } catch (err: any) {
      setResult({
        found: false,
        is_open: true,
        release_date: null,
        message: err?.response?.data?.message || 'Gagal memeriksa status kelulusan.',
      });
    } finally {
      setLoading(false);
    }
  };

  const sampleNisns =
    tenantSlug === 'dev' || tenantSlug === 'demo'
      ? [
          { label: 'Aditya Pratama (0089123499)', value: '0089123499' },
          { label: 'Nabila Azzahra (0089123498)', value: '0089123498' },
        ]
      : [
          { label: 'Aditya Pratama (0089123456)', value: '0089123456' },
          { label: 'Nabila Azzahra (0089123457)', value: '0089123457' },
        ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Top Gradient Header */}
        <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 p-6 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-400/20 border border-amber-300/30 flex items-center justify-center text-amber-300">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                Portal Pengumuman Resmi Sidang Pleno
              </span>
              <h3 className="text-lg font-extrabold text-white leading-snug">
                Cek Pengumuman Kelulusan Siswa
              </h3>
              <p className="text-xs text-blue-200/80">{schoolName}</p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleCheck();
            }}
            className="space-y-3"
          >
            <label className="block text-xs font-bold text-slate-700">
              Masukkan NISN / NIS / Nomor SKL Peserta Didik Tingkat Akhir
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={nisnInput}
                  onChange={(e) => setNisnInput(e.target.value)}
                  placeholder="Contoh: 0089123456"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
              <button
                type="submit"
                disabled={loading || !nisnInput.trim()}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-2 transition-all"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                <span>Cek Status</span>
              </button>
            </div>

            {/* Quick Demo Buttons for Testing */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[11px] text-slate-400 font-medium">Simulasi Cepat NISN:</span>
              {sampleNisns.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => handleCheck(s.value)}
                  className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-600 font-semibold border border-slate-200 transition-colors"
                >
                  {s.label}
                </button>
              ))}
            </div>
          </form>

          {/* Result Area */}
          {result && !result.found && (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="text-xs font-bold text-amber-900">Informasi Pencarian</div>
                <p className="text-xs text-amber-800 leading-relaxed">{result.message}</p>
              </div>
            </div>
          )}

          {result && result.found && result.data && !envelopeOpened && (
            <div className="bg-gradient-to-br from-slate-900 to-blue-950 rounded-2xl p-6 text-center text-white space-y-4 border border-blue-500/30 shadow-lg">
              <div className="w-16 h-16 rounded-2xl bg-amber-400/20 border border-amber-300/40 flex items-center justify-center mx-auto text-amber-300 animate-bounce">
                <MailOpen className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <span className="text-[11px] uppercase tracking-widest text-blue-300 font-bold">
                  Amplop Digital Tersedia
                </span>
                <h4 className="text-lg font-extrabold text-white">{result.data.nama_siswa}</h4>
                <p className="text-xs text-slate-300">
                  NISN: {result.data.nisn} • {result.data.jurusan}
                </p>
              </div>
              <button
                onClick={() => setEnvelopeOpened(true)}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-extrabold text-xs shadow-lg shadow-amber-500/25 transition-all"
              >
                Buka Amplop Keputusan Kelulusan Sekarang
              </button>
            </div>
          )}

          {result && result.found && result.data && envelopeOpened && (
            <div className="rounded-2xl border-2 border-emerald-500/40 bg-gradient-to-b from-emerald-50/80 to-white p-6 space-y-5 animate-in zoom-in-95">
              <div className="flex items-center justify-between border-b border-emerald-200/70 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md">
                    <CheckCircle2 className="w-7 h-7" />
                  </div>
                  <div>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300">
                      DINYATAKAN {result.data.status_kelulusan}
                    </span>
                    <h4 className="text-lg font-extrabold text-slate-900 mt-1">
                      Selamat! Anda Dinyatakan LULUS
                    </h4>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[11px] text-slate-500 font-medium">Rata-Rata Nilai</div>
                  <div className="text-2xl font-black text-emerald-700">
                    {result.data.rata_rata_nilai}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="bg-white p-3 rounded-xl border border-slate-200">
                  <div className="text-slate-400 font-medium">Nama Lengkap Siswa</div>
                  <div className="font-bold text-slate-900 mt-0.5">{result.data.nama_siswa}</div>
                </div>
                <div className="bg-white p-3 rounded-xl border border-slate-200">
                  <div className="text-slate-400 font-medium">NISN / NIS</div>
                  <div className="font-bold text-slate-900 mt-0.5">
                    {result.data.nisn || '-'} / {result.data.nis}
                  </div>
                </div>
                <div className="bg-white p-3 rounded-xl border border-slate-200">
                  <div className="text-slate-400 font-medium">Nomor Resmi SKL</div>
                  <div className="font-bold text-blue-700 mt-0.5 flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5" />
                    {result.data.nomor_skl}
                  </div>
                </div>
                <div className="bg-white p-3 rounded-xl border border-slate-200">
                  <div className="text-slate-400 font-medium">Tanggal Penetapan Pleno</div>
                  <div className="font-bold text-slate-900 mt-0.5">{result.data.tanggal_lulus}</div>
                </div>
              </div>

              {result.data.catatan && (
                <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 flex items-center gap-2.5 text-xs text-blue-900 font-semibold">
                  <Award className="w-4 h-4 text-blue-600 flex-shrink-0" />
                  <span>{result.data.catatan}</span>
                </div>
              )}

              <p className="text-[11px] text-slate-500 text-center leading-relaxed">
                Surat Keterangan Lulus (SKL) asli bertanda tangan elektronik dapat diunduh melalui akun siswa atau diverifikasi keasliannya menggunakan Nomor SKL di atas.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
