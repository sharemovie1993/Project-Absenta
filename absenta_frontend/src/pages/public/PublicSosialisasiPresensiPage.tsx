import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  CheckCircle2,
  QrCode,
  Calendar,
  Clock,
  MapPin,
  Search,
  UserCheck,
  AlertCircle,
  Building,
  Sparkles,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Button, Input } from '@/components/ui';
import { sosialisasiApi, type RapatSosialisasiSession } from '@/api/academic/sosialisasi.api';

export const PublicSosialisasiPresensiPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const tenantId = searchParams.get('tenantId') || '';
  const qrToken = searchParams.get('token') || '';

  const [isLoading, setIsLoading] = useState(true);
  const [session, setSession] = useState<Partial<RapatSosialisasiSession> | null>(null);
  const [teachers, setTeachers] = useState<
    Array<{ id: string; nama: string; nip: string; mapel_jabatan: string; is_hadir: boolean }>
  >([]);
  const [errorMsg, setErrorMsg] = useState<string>('');

  // Form Submission
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmedSuccess, setConfirmedSuccess] = useState<{
    nama: string;
    nip: string;
    jabatan: string;
    waktuHadir: string;
  } | null>(null);

  // Ambil verifikasi sesi dari backend
  useEffect(() => {
    async function loadSession() {
      try {
        setIsLoading(true);
        setErrorMsg('');

        const res = await sosialisasiApi.verifyPublicSession({
          tenantId,
          qrToken,
        });

        if (res?.session) {
          setSession(res.session);
          setTeachers(res.teachers || []);
        } else {
          setErrorMsg('Sesi rapat sosialisasi tidak ditemukan.');
        }
      } catch (err: any) {
        setErrorMsg(
          err.response?.data?.message ||
            'Kode QR presensi rapat tidak valid atau sesi rapat telah ditutup oleh panitia.'
        );
      } finally {
        setIsLoading(false);
      }
    }

    loadSession();
  }, [tenantId, qrToken]);

  // Filter daftar guru untuk autocomplete dropdown
  const filteredTeachers = useMemo(() => {
    if (!searchTerm.trim()) return [];
    const term = searchTerm.toLowerCase();
    return teachers
      .filter(
        (t) =>
          t.nama.toLowerCase().includes(term) ||
          t.nip.includes(term) ||
          t.mapel_jabatan.toLowerCase().includes(term)
      )
      .slice(0, 10);
  }, [teachers, searchTerm]);

  const selectedTeacher = useMemo(() => {
    return teachers.find((t) => t.id === selectedTeacherId);
  }, [teachers, selectedTeacherId]);

  const handleSelectTeacher = (t: { id: string; nama: string; nip: string }) => {
    setSelectedTeacherId(t.id);
    setSearchTerm(`${t.nama} (${t.nip})`);
  };

  const handleConfirmAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeacherId) {
      toast.error('Silakan cari dan pilih nama Anda terlebih dahulu');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await sosialisasiApi.submitPublicSelfAttend({
        tenantId,
        qrToken,
        guruIdOrNip: selectedTeacherId,
      });

      if (res.success && res.guru) {
        setConfirmedSuccess(res.guru);
        toast.success(res.message);
      } else {
        toast.error(res.message || 'Gagal mencatat kehadiran');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Gagal mengonfirmasi presensi');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white flex flex-col justify-between p-4 sm:p-6">
      <div className="w-full max-w-md mx-auto my-auto space-y-4">
        {/* Brand / Logo Top */}
        <div className="text-center space-y-1">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-indigo-600/80 border border-indigo-400/40 shadow-lg mb-1">
            <QrCode size={26} className="text-white" />
          </div>
          <h1 className="text-lg font-black tracking-wide text-white uppercase">
            Presensi Digital Rapat Sosialisasi
          </h1>
          <p className="text-xs text-indigo-200">Sistem Informasi Manajemen Sekolah • Absenta</p>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="p-8 rounded-3xl bg-white/10 backdrop-blur-md border border-white/10 text-center space-y-3">
            <div className="w-8 h-8 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin mx-auto" />
            <p className="text-xs text-indigo-100">Memverifikasi kode QR presensi rapat...</p>
          </div>
        )}

        {/* Error State */}
        {!isLoading && errorMsg && (
          <div className="p-6 rounded-3xl bg-rose-950/60 backdrop-blur-md border border-rose-500/40 text-center space-y-3">
            <AlertCircle size={36} className="text-rose-400 mx-auto" />
            <h3 className="text-sm font-bold text-rose-200">Presensi Tidak Dapat Diproses</h3>
            <p className="text-xs text-rose-300 leading-relaxed">{errorMsg}</p>
          </div>
        )}

        {/* Success Confirmation Card */}
        {!isLoading && confirmedSuccess && (
          <div className="p-6 rounded-3xl bg-emerald-950/70 backdrop-blur-md border border-emerald-400/40 text-center space-y-4 animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-400/30 flex items-center justify-center mx-auto">
              <CheckCircle2 size={36} />
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-400/20 text-emerald-300 border border-emerald-400/30">
                Kehadiran Terverifikasi
              </span>
              <h2 className="text-base font-black text-white pt-1">{confirmedSuccess.nama}</h2>
              <p className="text-xs text-emerald-200 font-mono">NIP: {confirmedSuccess.nip}</p>
              <p className="text-xs text-slate-300">{confirmedSuccess.jabatan}</p>
            </div>

            <div className="p-3 rounded-2xl bg-white/5 border border-white/10 text-xs text-slate-300 space-y-1 text-left">
              <div className="flex justify-between">
                <span className="text-slate-400">Acara:</span>
                <span className="font-semibold text-white text-right truncate max-w-[200px]">
                  {session?.nama_acara}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Waktu Presensi:</span>
                <span className="font-bold text-emerald-300">
                  {new Date(confirmedSuccess.waktuHadir).toLocaleTimeString('id-ID', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}{' '}
                  WIB
                </span>
              </div>
            </div>

            <p className="text-[11px] text-emerald-200/80 leading-relaxed">
              Terima kasih telah berpartisipasi dalam rapat sosialisasi hari ini. Status Anda telah langsung masuk ke
              Berita Acara Rapat panitia.
            </p>
          </div>
        )}

        {/* Form State (Sebelum Submit) */}
        {!isLoading && !errorMsg && !confirmedSuccess && session && (
          <div className="p-5 sm:p-6 rounded-3xl bg-white/10 backdrop-blur-md border border-white/15 shadow-2xl space-y-4">
            {/* Header Acara */}
            <div className="border-b border-white/10 pb-3 space-y-1">
              <h2 className="text-sm font-bold text-white">{session.nama_acara}</h2>
              <div className="grid grid-cols-2 gap-2 text-[11px] text-indigo-200 pt-1">
                <span className="flex items-center gap-1">
                  <Calendar size={12} className="text-indigo-400" />
                  <span>{session.tanggal}</span>
                </span>
                <span className="flex items-center gap-1">
                  <Clock size={12} className="text-indigo-400" />
                  <span>
                    {session.waktu_mulai} - {session.waktu_selesai} WIB
                  </span>
                </span>
                <span className="flex items-center gap-1 col-span-2 truncate">
                  <MapPin size={12} className="text-indigo-400 shrink-0" />
                  <span className="truncate">{session.tempat || 'Ruang Rapat'}</span>
                </span>
              </div>
            </div>

            {/* Input Form Pencarian Nama */}
            <form onSubmit={handleConfirmAttendance} className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-indigo-200 block">
                  Cari Nama atau NIP Anda:
                </label>
                <div className="relative">
                  <Input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setSelectedTeacherId('');
                    }}
                    placeholder="Ketik nama lengkap atau NIP..."
                    leftIcon={<Search className="h-4 w-4 text-slate-400" />}
                    className="h-10 text-xs rounded-xl bg-white/90 text-slate-900 border-none placeholder:text-slate-400"
                  />
                </div>

                {/* Dropdown Suggestions */}
                {filteredTeachers.length > 0 && !selectedTeacherId && (
                  <div className="rounded-xl bg-white text-slate-900 shadow-xl overflow-hidden divide-y divide-slate-100 max-h-48 overflow-y-auto text-xs animate-in fade-in">
                    {filteredTeachers.map((t) => (
                      <button
                        type="button"
                        key={t.id}
                        onClick={() => handleSelectTeacher(t)}
                        className="w-full text-left p-2.5 hover:bg-indigo-50 flex items-center justify-between gap-2 cursor-pointer transition-colors"
                      >
                        <div>
                          <p className="font-bold text-slate-900">{t.nama}</p>
                          <p className="text-[10px] text-slate-500 font-mono">
                            NIP: {t.nip} • {t.mapel_jabatan}
                          </p>
                        </div>
                        {t.is_hadir ? (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                            Sudah Hadir
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-indigo-600">Pilih</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Status Peserta Terpilih */}
              {selectedTeacher && (
                <div className="p-3 rounded-2xl bg-indigo-950/60 border border-indigo-400/40 text-xs space-y-1">
                  <p className="text-[10px] uppercase font-bold text-indigo-300">Peserta Terpilih:</p>
                  <p className="font-bold text-white text-sm">{selectedTeacher.nama}</p>
                  <p className="text-[11px] text-indigo-200 font-mono">
                    NIP: {selectedTeacher.nip} • {selectedTeacher.mapel_jabatan}
                  </p>
                  {selectedTeacher.is_hadir && (
                    <p className="text-[11px] text-amber-300 font-semibold pt-1">
                      ⚠️ Anda sudah tercatat hadir. Menekan konfirmasi akan memperbarui waktu scan Anda.
                    </p>
                  )}
                </div>
              )}

              <Button
                type="submit"
                variant="primary"
                size="lg"
                disabled={!selectedTeacherId || isSubmitting}
                className="w-full font-bold h-11 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white cursor-pointer shadow-lg disabled:opacity-50"
              >
                {isSubmitting ? (
                  <span>Mencatat Kehadiran...</span>
                ) : (
                  <span className="flex items-center justify-center gap-1.5">
                    <CheckCircle2 size={16} />
                    <span>Konfirmasi Kehadiran Saya</span>
                  </span>
                )}
              </Button>
            </form>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="text-center text-[10px] text-indigo-300/60 pb-2">
        Absenta Education Ecosystem • Presensi Resmi Sosialisasi Platform
      </div>
    </div>
  );
};

export default PublicSosialisasiPresensiPage;
