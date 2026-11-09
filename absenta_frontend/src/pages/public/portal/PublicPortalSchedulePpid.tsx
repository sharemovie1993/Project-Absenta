import React, { useState } from 'react';
import {
  Clock,
  MapPin,
  FileText,
  Download,
  Building2,
  User,
  Calendar,
  ShieldCheck,
  Loader2,
  FolderOpen,
} from 'lucide-react';
import {
  publicPortalApi,
  PublicScheduleOverview,
  PublicPpidDocument,
} from '../../../api/public-portal.api';

interface PublicPortalSchedulePpidProps {
  initialSchedule: PublicScheduleOverview | null;
  ppidDocs: PublicPpidDocument[];
  tenantSlug: string;
}

export const PublicPortalSchedulePpid: React.FC<PublicPortalSchedulePpidProps> = ({
  initialSchedule,
  ppidDocs,
  tenantSlug,
}) => {
  const [scheduleData, setScheduleData] = useState<PublicScheduleOverview | null>(initialSchedule);
  const [loadingClass, setLoadingClass] = useState(false);
  const [selectedDay, setSelectedDay] = useState<string>('ALL');

  const handleClassChange = async (kelasId: string) => {
    setLoadingClass(true);
    try {
      const res = await publicPortalApi.getClassSchedule(tenantSlug, kelasId);
      if (res.success && res.data) {
        setScheduleData(res.data);
      }
    } catch (err) {
      console.error('Failed to switch class schedule:', err);
    } finally {
      setLoadingClass(false);
    }
  };

  const daysOrder = ['SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT'];
  const filteredSlots =
    scheduleData?.schedules.filter((s) =>
      selectedDay === 'ALL' ? true : s.hari === selectedDay
    ) || [];

  return (
    <section id="ppid" className="py-20 bg-white border-t border-slate-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-20">
        {/* Part 1: Portal Cek Jadwal Pelajaran Kelas & Denah Ruangan */}
        {scheduleData && (scheduleData.classes.length > 0 || scheduleData.rooms.length > 0) && (
          <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Pencarian Cepat Jadwal KBM & Lokasi Ruang Praktik</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                  Portal Cek Jadwal Pelajaran Rombongan Belajar
                </h2>
                <p className="text-sm text-slate-500 max-w-2xl">
                  Orang tua dan peserta didik dapat memeriksa jadwal mata pelajaran mingguan beserta lokasi ruangan teori maupun bengkel/laboratorium praktik.
                </p>
              </div>

              {/* Class Selector */}
              {scheduleData.classes.length > 0 && (
                <div className="flex items-center gap-2">
                  <label className="text-xs font-bold text-slate-700 whitespace-nowrap">
                    Pilih Kelas:
                  </label>
                  <select
                    value={scheduleData.selected_class_id || ''}
                    onChange={(e) => handleClassChange(e.target.value)}
                    className="px-4 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  >
                    {scheduleData.classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        Kelas {c.nama_kelas} {c.nama_jurusan ? `(${c.nama_jurusan})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Day Filter Tabs */}
            <div className="flex flex-wrap items-center gap-2">
              {['ALL', ...daysOrder].map((day) => (
                <button
                  key={day}
                  onClick={() => setSelectedDay(day)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                    selectedDay === day
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {day === 'ALL' ? 'Semua Hari (Senin - Jumat)' : day}
                </button>
              ))}
            </div>

            {/* Schedule Cards */}
            {loadingClass ? (
              <div className="py-12 text-center">
                <Loader2 className="w-7 h-7 text-blue-600 animate-spin mx-auto" />
                <p className="text-xs text-slate-500 mt-2">Memuat jadwal pelajaran kelas...</p>
              </div>
            ) : filteredSlots.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredSlots.map((slot) => (
                  <div
                    key={slot.id}
                    className="bg-slate-50/90 hover:bg-white rounded-2xl p-4 border border-slate-200 hover:border-blue-300 transition-all flex flex-col justify-between gap-3"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-100 text-blue-800">
                          HARI {slot.hari} • SESI {slot.slot_index}
                        </span>
                        <span className="text-xs font-bold text-slate-600 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-blue-600" />
                          {slot.jam_mulai} - {slot.jam_selesai}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-slate-900 leading-snug">
                        {slot.nama_mapel}
                      </h4>
                    </div>

                    <div className="pt-2.5 border-t border-slate-200/70 flex items-center justify-between text-[11px] text-slate-600">
                      <span className="flex items-center gap-1 truncate max-w-[55%]">
                        <User className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                        <span className="truncate">{slot.nama_guru}</span>
                      </span>
                      <span className="flex items-center gap-1 font-semibold text-emerald-700 truncate">
                        <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="truncate">{slot.nama_ruangan}</span>
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 rounded-2xl bg-slate-50 border border-slate-200 text-center text-xs text-slate-500">
                Jadwal pelajaran untuk pilihan kelas/hari ini sedang disinkronisasi oleh Wakasek Kurikulum.
              </div>
            )}

            {/* Master Ruangan & Denah Kapasitas Strip */}
            {scheduleData.rooms.length > 0 && (
              <div className="pt-4 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-slate-400" />
                  <span>Direktori Ruangan Belajar, Bengkel & Laboratorium Terdaftar</span>
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                  {scheduleData.rooms.map((rm) => (
                    <div
                      key={rm.id}
                      className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between gap-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-200 text-slate-700">
                          {rm.jenis_ruangan}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">
                          {rm.kode_ruangan || 'RM'}
                        </span>
                      </div>
                      <div className="text-xs font-bold text-slate-800 line-clamp-1 mt-1">
                        {rm.nama_ruangan}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Kapasitas: {rm.kapasitas} Siswa
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Part 2: Pusat Unduhan Dokumen Publik & Keterbukaan Informasi (PPID) */}
        {ppidDocs.length > 0 && (
          <div className="space-y-8 pt-8 border-t border-slate-100">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold">
                  <FolderOpen className="w-3.5 h-3.5" />
                  <span>Pejabat Pengelola Informasi dan Dokumentasi (PPID Sekolah)</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                  Pusat Unduhan Dokumen Resmi & Edaran Publik
                </h2>
                <p className="text-sm text-slate-500 max-w-2xl">
                  Akses terbuka terhadap dokumen pedoman akademik, buku saku tata tertib peserta didik, petunjuk teknis PKL, hingga brosur informasi PPDB.
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3.5 py-2 rounded-xl">
                <ShieldCheck className="w-4 h-4" />
                <span>Zona Integritas Keterbukaan Informasi Publik</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {ppidDocs.map((doc) => (
                <div
                  key={doc.id}
                  className="bg-slate-50/70 hover:bg-white rounded-2xl p-5 border border-slate-200 hover:border-blue-400 shadow-sm hover:shadow-md transition-all flex flex-col justify-between gap-4"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-blue-600/10 border border-blue-600/20 text-blue-600 flex items-center justify-center flex-shrink-0">
                      <FileText className="w-6 h-6" />
                    </div>
                    <div className="space-y-1.5 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-blue-100 text-blue-800">
                          {doc.kategori}
                        </span>
                        <span className="text-[11px] font-mono text-slate-500">
                          No: {doc.nomor_dokumen}
                        </span>
                      </div>
                      <h3 className="text-sm sm:text-base font-bold text-slate-900 leading-snug">
                        {doc.judul}
                      </h3>
                      {doc.ringkasan && (
                        <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">
                          {doc.ringkasan}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-200/70 flex items-center justify-between text-xs">
                    <span className="text-slate-500">
                      Terbit: <strong className="text-slate-700">{doc.tanggal_publikasi}</strong> • {doc.ukuran_info}
                    </span>
                    <button
                      onClick={() => {
                        const content = `DOKUMEN RESMI PPID SEKOLAH\nNomor: ${doc.nomor_dokumen}\nJudul: ${doc.judul}\nKategori: ${doc.kategori}\nTanggal Publikasi: ${doc.tanggal_publikasi}\n\nRingkasan:\n${doc.ringkasan || '-'}`;
                        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `${doc.nomor_dokumen.replace(/[^a-zA-Z0-9_-]/g, '_')}.txt`;
                        a.click();
                        URL.revokeObjectURL(url);
                      }}
                      className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-blue-600 text-white font-bold text-xs flex items-center gap-1.5 transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Unduh Dokumen</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
