import React, { useState } from 'react';
import {
  Calendar as CalendarIcon,
  Trophy,
  Users,
  Clock,
  Download,
  Sparkles,
  CheckCircle2,
  BookOpen,
} from 'lucide-react';
import { PublicCalendarAndEkskul } from '../../../api/public-portal.api';

interface PublicPortalCalendarEkskulProps {
  data: PublicCalendarAndEkskul | null;
  schoolName: string;
}

export const PublicPortalCalendarEkskul: React.FC<PublicPortalCalendarEkskulProps> = ({
  data,
  schoolName,
}) => {
  const [selectedType, setSelectedType] = useState<string>('ALL');

  if (!data || (data.calendar.length === 0 && data.ekskul.length === 0)) {
    return null;
  }

  const filteredCalendar =
    selectedType === 'ALL'
      ? data.calendar
      : data.calendar.filter((c) => c.jenis === selectedType);

  const getBadgeStyle = (jenis: string) => {
    const j = jenis.toUpperCase();
    if (j.includes('UJIAN')) {
      return 'bg-rose-50 text-rose-700 border-rose-200';
    }
    if (j.includes('LIBUR')) {
      return 'bg-amber-50 text-amber-700 border-amber-200';
    }
    if (j.includes('PENGUMUMAN')) {
      return 'bg-purple-50 text-purple-700 border-purple-200';
    }
    return 'bg-blue-50 text-blue-700 border-blue-200';
  };

  const formatJenisLabel = (jenis: string) => {
    return jenis.replace(/_/g, ' ');
  };

  const handleDownloadIcs = () => {
    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      `PRODID:-//${schoolName}//Kalender Akademik//ID`,
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
    ];

    for (const ev of data.calendar) {
      const dtStart = ev.tanggal_mulai.replace(/-/g, '');
      const dtEnd = ev.tanggal_selesai.replace(/-/g, '');
      lines.push('BEGIN:VEVENT');
      lines.push(`UID:${ev.id}@absenta.id`);
      lines.push(`DTSTART;VALUE=DATE:${dtStart}`);
      lines.push(`DTEND;VALUE=DATE:${dtEnd}`);
      lines.push(`SUMMARY:${ev.judul}`);
      if (ev.keterangan) {
        lines.push(`DESCRIPTION:${ev.keterangan.replace(/\n/g, ' ')}`);
      }
      lines.push('END:VEVENT');
    }

    lines.push('END:VCALENDAR');
    const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Kalender-Akademik-${schoolName.replace(/\s+/g, '-')}.ics`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section id="kalender" className="py-20 bg-white border-t border-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-20">
        {/* Part 1: Kalender Akademik Interaktif */}
        {data.calendar.length > 0 && (
          <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold">
                  <CalendarIcon className="w-3.5 h-3.5" />
                  <span>Agenda Resmi Tahun Pelajaran {data.tahun_ajaran}</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                  Kalender Akademik & Kegiatan Sekolah
                </h2>
                <p className="text-sm text-slate-500 max-w-2xl">
                  Jadwal resmi pelaksanaan ujian, kegiatan pembelajaran, praktik industri, hingga libur akademik bagi siswa dan orang tua.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handleDownloadIcs}
                  className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-2 shadow-sm transition-all"
                >
                  <Download className="w-3.5 h-3.5 text-blue-400" />
                  <span>Sinkronkan ke Google Calendar (.ics)</span>
                </button>
              </div>
            </div>

            {/* Filter Pills */}
            <div className="flex flex-wrap items-center gap-2">
              {['ALL', 'KEGIATAN_SEKOLAH', 'UJIAN', 'PENGUMUMAN', 'LIBUR_AKADEMIK'].map((t) => (
                <button
                  key={t}
                  onClick={() => setSelectedType(t)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                    selectedType === t
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {t === 'ALL' ? 'Semua Agenda' : formatJenisLabel(t)}
                </button>
              ))}
            </div>

            {/* Calendar Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredCalendar.map((item) => (
                <div
                  key={item.id}
                  className="bg-slate-50/70 hover:bg-white rounded-2xl p-5 border border-slate-200/80 hover:border-blue-300 hover:shadow-md transition-all flex flex-col justify-between gap-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getBadgeStyle(
                          item.jenis
                        )}`}
                      >
                        {formatJenisLabel(item.jenis)}
                      </span>
                      <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                        <CalendarIcon className="w-3.5 h-3.5 text-blue-600" />
                        {item.tanggal_mulai === item.tanggal_selesai
                          ? item.tanggal_mulai
                          : `${item.tanggal_mulai} s/d ${item.tanggal_selesai}`}
                      </span>
                    </div>

                    <h3 className="text-sm sm:text-base font-bold text-slate-900 leading-snug">
                      {item.judul}
                    </h3>

                    {item.keterangan && (
                      <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">
                        {item.keterangan}
                      </p>
                    )}
                  </div>

                  <div className="pt-3 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-500">
                    <span className="flex items-center gap-1 font-medium text-emerald-700">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Terjadwal di Kurikulum
                    </span>
                    <span>TP {data.tahun_ajaran}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Part 2: Ekstrakurikuler & Pengembangan Karakter Siswa */}
        {data.ekskul.length > 0 && (
          <div className="space-y-8 pt-6 border-t border-slate-100">
            <div className="text-center max-w-2xl mx-auto space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold">
                <Trophy className="w-3.5 h-3.5" />
                <span>Pengembangan Bakat, Minat & Karakter</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Unit Kegiatan Ekstrakurikuler & Pembiasaan
              </h2>
              <p className="text-sm text-slate-500">
                Wadah aktualisasi talenta kepemimpinan, sains terapan, olahraga, seni budaya, dan ketakwaan peserta didik.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {data.ekskul.map((ek) => {
                const isPembiasaan = ek.tipe === 'PEMBIASAAN';
                return (
                  <div
                    key={ek.id}
                    className="group bg-white rounded-2xl p-5 border border-slate-200 hover:border-blue-400 shadow-sm hover:shadow-lg transition-all flex flex-col justify-between gap-4"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                            isPembiasaan
                              ? 'bg-amber-50 text-amber-600 border border-amber-200'
                              : 'bg-blue-50 text-blue-600 border border-blue-200'
                          }`}
                        >
                          {isPembiasaan ? (
                            <Sparkles className="w-5 h-5" />
                          ) : (
                            <BookOpen className="w-5 h-5" />
                          )}
                        </div>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            isPembiasaan
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {isPembiasaan ? 'PEMBIASAAN KARAKTER' : 'EKSTRAKURIKULER'}
                        </span>
                      </div>

                      <h3 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors leading-snug">
                        {ek.nama}
                      </h3>

                      <div className="space-y-1.5 text-xs text-slate-600">
                        <div className="flex items-center gap-1.5">
                          <CalendarIcon className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                          <span className="truncate font-medium">
                            Hari: {ek.jadwal_hari.join(', ')}
                          </span>
                        </div>
                        {ek.waktu_mulai && (
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                            <span>
                              Pukul {ek.waktu_mulai} - {ek.waktu_selesai || 'Selesai'} WIB
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                      <span className="text-slate-500 flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-blue-600" />
                        Anggota Aktif
                      </span>
                      <span className="font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md">
                        {ek.jumlah_anggota}+ Siswa
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
