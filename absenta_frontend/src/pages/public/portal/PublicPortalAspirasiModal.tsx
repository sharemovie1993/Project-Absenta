import React, { useState } from 'react';
import {
  X,
  HeartHandshake,
  ShieldAlert,
  CheckCircle2,
  Loader2,
  Send,
  Lock,
} from 'lucide-react';
import { publicPortalApi, PublicAspirasiTicket } from '../../../api/public-portal.api';

interface PublicPortalAspirasiModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenantSlug: string;
  schoolName: string;
}

export const PublicPortalAspirasiModal: React.FC<PublicPortalAspirasiModalProps> = ({
  isOpen,
  onClose,
  tenantSlug,
  schoolName,
}) => {
  const [namaPengirim, setNamaPengirim] = useState('');
  const [peranPengirim, setPeranPengirim] = useState('Orang Tua / Wali Siswa');
  const [kategoriAspirasi, setKategoriAspirasi] = useState('SARAN_LAYANAN_PENDIDIKAN');
  const [isiLaporan, setIsiLaporan] = useState('');
  const [isAnonim, setIsAnonim] = useState(false);
  const [loading, setLoading] = useState(false);
  const [ticket, setTicket] = useState<PublicAspirasiTicket | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isiLaporan.trim()) return;

    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await publicPortalApi.submitAspirasi(tenantSlug, {
        nama_pengirim: namaPengirim.trim(),
        peran_pengirim: peranPengirim,
        kategori_aspirasi: kategoriAspirasi,
        isi_laporan: isiLaporan.trim(),
        is_anonim: isAnonim,
      });
      if (res.success && res.data) {
        setTicket(res.data);
      }
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.message || 'Gagal mengirim aspirasi/pengaduan.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setTicket(null);
    setNamaPengirim('');
    setIsiLaporan('');
    setIsAnonim(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-950 via-purple-950 to-slate-900 p-6 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-purple-400/20 border border-purple-300/30 flex items-center justify-center text-purple-300">
              <HeartHandshake className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-purple-300">
                Satgas Sekolah Ramah Anak (SRA) & PPID
              </span>
              <h3 className="text-lg font-extrabold text-white leading-snug">
                Kotak Aspirasi & Pengaduan Masyarakat
              </h3>
              <p className="text-xs text-purple-200/80">{schoolName}</p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 max-h-[80vh] overflow-y-auto">
          {!ticket ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium">
                  {errorMsg}
                </div>
              )}

              <div className="p-3.5 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Lock className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                  <div>
                    <div className="text-xs font-bold text-indigo-950">
                      Kirim Sebagai Pelapor Anonim (Rahasia)
                    </div>
                    <div className="text-[11px] text-indigo-700">
                      Identitas Anda disembunyikan sepenuhnya oleh sistem perlindungan SRA.
                    </div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={isAnonim}
                  onChange={(e) => setIsAnonim(e.target.checked)}
                  className="w-5 h-5 rounded cursor-pointer text-indigo-600"
                />
              </div>

              {!isAnonim && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Nama Pengirim
                    </label>
                    <input
                      type="text"
                      value={namaPengirim}
                      onChange={(e) => setNamaPengirim(e.target.value)}
                      placeholder="Nama Anda (Opsional)"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-600"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Peran / Keterkaitan
                    </label>
                    <select
                      value={peranPengirim}
                      onChange={(e) => setPeranPengirim(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
                    >
                      <option value="Orang Tua / Wali Siswa">Orang Tua / Wali Siswa</option>
                      <option value="Peserta Didik">Peserta Didik</option>
                      <option value="Alumni">Alumni</option>
                      <option value="Mitra Industri / DUDIKA">Mitra Industri / DUDIKA</option>
                      <option value="Masyarakat Umum">Masyarakat Umum</option>
                    </select>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Kategori Aspirasi / Laporan *
                </label>
                <select
                  value={kategoriAspirasi}
                  onChange={(e) => setKategoriAspirasi(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs bg-white font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-600"
                >
                  <option value="SARAN_LAYANAN_PENDIDIKAN">
                    💡 Saran Peningkatan Mutu & Layanan Pendidikan
                  </option>
                  <option value="APRESIASI_GURU_STAF">
                    🌟 Apresiasi Kinerja Guru & Tenaga Kependidikan
                  </option>
                  <option value="LAPORAN_SRA_PERUNDUNGAN">
                    🛡️ Laporan Sekolah Ramah Anak (Pencegahan Perundungan)
                  </option>
                  <option value="FASILITAS_SARPRAS">
                    🏫 Masukan Fasilitas, Bengkel & Sarana Sekolah
                  </option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Uraian Aspirasi / Masukan / Laporan *
                </label>
                <textarea
                  required
                  rows={4}
                  value={isiLaporan}
                  onChange={(e) => setIsiLaporan(e.target.value)}
                  placeholder="Tuliskan saran, masukan, atau laporan Anda secara jelas dan santun..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 transition-all"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                <span>Kirim Aspirasi ke Tim SRA & Manajemen Mutu</span>
              </button>
            </form>
          ) : (
            <div className="space-y-5 text-center animate-in zoom-in-95">
              <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div className="space-y-1">
                <span className="px-3 py-1 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800">
                  {ticket.status}
                </span>
                <h4 className="text-lg font-extrabold text-slate-900 mt-2">
                  Terima Kasih Atas Partisipasi Anda
                </h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  {ticket.pesan_konfirmasi}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900 text-white space-y-2">
                <div className="text-[10px] text-purple-300 font-bold uppercase tracking-widest">
                  Nomor Tiket Aspirasi / SRA
                </div>
                <div className="text-xl font-black text-amber-300 font-mono">
                  {ticket.ticket_code}
                </div>
                <div className="text-xs text-slate-300">
                  Pengirim: <strong>{ticket.pengirim}</strong> • {ticket.tanggal}
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleReset}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
                >
                  Kirim Masukan Lain
                </button>
                <button
                  onClick={onClose}
                  className="flex-1 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors"
                >
                  Tutup
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
