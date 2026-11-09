import React, { useState } from 'react';
import {
  X,
  BookUser,
  CheckCircle2,
  Loader2,
  QrCode,
  Building2,
  UserCheck,
  Phone,
  FileText,
} from 'lucide-react';
import { publicPortalApi, PublicGuestBookTicket } from '../../../api/public-portal.api';

interface PublicPortalGuestBookModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenantSlug: string;
  schoolName: string;
}

export const PublicPortalGuestBookModal: React.FC<PublicPortalGuestBookModalProps> = ({
  isOpen,
  onClose,
  tenantSlug,
  schoolName,
}) => {
  const [namaTamu, setNamaTamu] = useState('');
  const [instansiTamu, setInstansiTamu] = useState('');
  const [kontakTamu, setKontakTamu] = useState('');
  const [pejabatDituju, setPejabatDituju] = useState('Layanan Terpadu Satu Pintu (PTSP / Tata Usaha)');
  const [kategoriBuku, setKategoriBuku] = useState<'UMUM' | 'KHUSUS'>('UMUM');
  const [keperluanTamu, setKeperluanTamu] = useState('');
  const [loading, setLoading] = useState(false);
  const [ticket, setTicket] = useState<PublicGuestBookTicket | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!namaTamu.trim() || !keperluanTamu.trim()) return;

    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await publicPortalApi.submitGuestBook(tenantSlug, {
        nama_tamu: namaTamu.trim(),
        instansi_tamu: instansiTamu.trim() || 'Masyarakat Umum / Wali Siswa',
        kontak_tamu: kontakTamu.trim(),
        pejabat_dituju: pejabatDituju,
        kategori_buku: kategoriBuku,
        keperluan_tamu: keperluanTamu.trim(),
      });
      if (res.success && res.data) {
        setTicket(res.data);
      }
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.message || 'Gagal mengirim registrasi kunjungan.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setTicket(null);
    setNamaTamu('');
    setInstansiTamu('');
    setKontakTamu('');
    setKeperluanTamu('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 p-6 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-400/20 border border-emerald-300/30 flex items-center justify-center text-emerald-300">
              <BookUser className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-300">
                Pelayanan Terpadu Satu Pintu (PTSP)
              </span>
              <h3 className="text-lg font-extrabold text-white leading-snug">
                Buku Tamu Digital & Janji Temu
              </h3>
              <p className="text-xs text-emerald-100/80">{schoolName}</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[80vh] overflow-y-auto">
          {!ticket ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium">
                  {errorMsg}
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => setKategoriBuku('UMUM')}
                  className={`py-2 rounded-lg text-xs font-bold transition-all ${
                    kategoriBuku === 'UMUM'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Tamu Umum / Orang Tua
                </button>
                <button
                  type="button"
                  onClick={() => setKategoriBuku('KHUSUS')}
                  className={`py-2 rounded-lg text-xs font-bold transition-all ${
                    kategoriBuku === 'KHUSUS'
                      ? 'bg-white text-emerald-700 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Tamu Kedinasan / Mitra DUDI
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nama Lengkap Tamu *
                  </label>
                  <input
                    type="text"
                    required
                    value={namaTamu}
                    onChange={(e) => setNamaTamu(e.target.value)}
                    placeholder="Nama lengkap Anda"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Asal Instansi / Wali Dari
                  </label>
                  <div className="relative">
                    <Building2 className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={instansiTamu}
                      onChange={(e) => setInstansiTamu(e.target.value)}
                      placeholder="Perusahaan / Dinas / Orang Tua"
                      className="w-full pl-8 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nomor WhatsApp / HP
                  </label>
                  <div className="relative">
                    <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={kontakTamu}
                      onChange={(e) => setKontakTamu(e.target.value)}
                      placeholder="0812xxxx"
                      className="w-full pl-8 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Unit / Pejabat Dituju
                  </label>
                  <div className="relative">
                    <UserCheck className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <select
                      value={pejabatDituju}
                      onChange={(e) => setPejabatDituju(e.target.value)}
                      className="w-full pl-8 pr-3 py-2.5 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-600 bg-white"
                    >
                      <option value="Layanan Terpadu Satu Pintu (PTSP / Tata Usaha)">PTSP / Tata Usaha</option>
                      <option value="Kepala Sekolah">Kepala Sekolah</option>
                      <option value="Wakasek Kurikulum">Wakasek Kurikulum</option>
                      <option value="Wakasek Hubin & BKK">Wakasek Hubin & BKK Industri</option>
                      <option value="Wakasek Kesiswaan">Wakasek Kesiswaan</option>
                      <option value="Bimbingan Konseling (BP/BK)">Bimbingan Konseling (BP/BK)</option>
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Keperluan Kunjungan / Layanan *
                </label>
                <div className="relative">
                  <FileText className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                  <textarea
                    required
                    rows={3}
                    value={keperluanTamu}
                    onChange={(e) => setKeperluanTamu(e.target.value)}
                    placeholder="Jelaskan keperluan kunjungan, legalisir dokumen, atau agenda pertemuan..."
                    className="w-full pl-8 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <QrCode className="w-4 h-4" />}
                <span>Terbitkan Tiket Kunjungan Digital (PTSP)</span>
              </button>
            </form>
          ) : (
            <div className="space-y-5 text-center animate-in zoom-in-95">
              <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div>
                <span className="px-3 py-1 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800">
                  TERCATAT DI LOG GERBANG & PTSP SEKOLAH
                </span>
                <h4 className="text-lg font-extrabold text-slate-900 mt-2">
                  Tiket Kunjungan Tamu Resmi
                </h4>
                <p className="text-xs text-slate-500">
                  Tunjukkan kode tiket ini kepada petugas keamanan gerbang atau resepsionis PTSP.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-slate-900 text-white space-y-3 border border-slate-800">
                <div className="text-[11px] text-emerald-400 font-bold uppercase tracking-widest">
                  Kode Tiket Buku Tamu
                </div>
                <div className="text-2xl font-black tracking-wider text-amber-300 font-mono">
                  {ticket.ticket_code}
                </div>
                <div className="pt-3 border-t border-slate-800 grid grid-cols-2 gap-2 text-left text-xs">
                  <div>
                    <div className="text-slate-400 text-[10px]">Nama Tamu</div>
                    <div className="font-bold text-white truncate">{ticket.nama_tamu}</div>
                  </div>
                  <div>
                    <div className="text-slate-400 text-[10px]">Instansi</div>
                    <div className="font-bold text-white truncate">{ticket.instansi_tamu}</div>
                  </div>
                  <div className="col-span-2">
                    <div className="text-slate-400 text-[10px]">Unit Dituju</div>
                    <div className="font-bold text-emerald-300">{ticket.pejabat_dituju}</div>
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleReset}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
                >
                  Isi Tamu Baru
                </button>
                <button
                  onClick={onClose}
                  className="flex-1 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors"
                >
                  Selesai & Tutup
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
