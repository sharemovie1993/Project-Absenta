import React, { useState } from 'react';
import {
  BookOpen,
  Sparkles,
  Clock,
  CheckCircle2,
  Users,
  Layers,
  GraduationCap,
} from 'lucide-react';
import { PublicCurriculumAndP5 } from '../../../api/public-portal.api';

interface PublicPortalCurriculumP5Props {
  data: PublicCurriculumAndP5 | null;
}

export const PublicPortalCurriculumP5: React.FC<PublicPortalCurriculumP5Props> = ({ data }) => {
  const [selectedTingkat, setSelectedTingkat] = useState<number | 'ALL'>('ALL');
  const [selectedKelompok, setSelectedKelompok] = useState<string>('ALL');

  if (!data || (data.subjects.length === 0 && data.p5_projects.length === 0)) {
    return null;
  }

  const filteredSubjects = data.subjects.filter((s) => {
    const matchTingkat = selectedTingkat === 'ALL' || s.tingkat === selectedTingkat;
    const matchKelompok =
      selectedKelompok === 'ALL' ||
      s.kelompok.toUpperCase().includes(selectedKelompok);
    return matchTingkat && matchKelompok;
  });

  const totalJpDisplayed = filteredSubjects.reduce((sum, s) => sum + s.jp_per_minggu, 0);

  return (
    <section id="kurikulum" className="py-20 bg-slate-50 border-t border-slate-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-20">
        {/* Part 1: Etalase Projek Penguatan Profil Pelajar Pancasila (P5) */}
        {data.p5_projects.length > 0 && (
          <div className="space-y-8">
            <div className="text-center max-w-3xl mx-auto space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-semibold">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Implementasi Autentik Kurikulum Merdeka TP {data.tahun_ajaran}</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Etalase Projek Penguatan Profil Pelajar Pancasila (P5)
              </h2>
              <p className="text-sm text-slate-500">
                Pembelajaran kokurikuler lintas disiplin ilmu untuk membentuk karakter, budaya kerja industri, inovasi rekayasa teknologi, dan kewirausahaan.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {data.p5_projects.map((p5) => (
                <div
                  key={p5.id}
                  className="bg-white rounded-3xl p-6 border border-slate-200/90 hover:border-indigo-400 shadow-sm hover:shadow-lg transition-all flex flex-col justify-between gap-5"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="px-3 py-1 rounded-full text-[10px] font-extrabold bg-indigo-100 text-indigo-800 border border-indigo-200">
                        PROJEK KOKURIKULER P5 • {p5.semester.toUpperCase()}
                      </span>
                      <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-indigo-600" />
                        {p5.jumlah_fasilitator} Guru Fasilitator
                      </span>
                    </div>

                    <h3 className="text-base sm:text-lg font-extrabold text-slate-900 leading-snug">
                      {p5.judul}
                    </h3>

                    {p5.deskripsi && (
                      <p className="text-xs text-slate-600 leading-relaxed">
                        {p5.deskripsi}
                      </p>
                    )}
                  </div>

                  <div className="pt-4 border-t border-slate-100 space-y-2">
                    <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      Dimensi Profil Pelajar Pancasila yang Disasar:
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {p5.dimensi_fokus.map((dim, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-[11px] font-semibold"
                        >
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          {dim}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Part 2: Transparansi Struktur Kurikulum & Sebaran Mata Pelajaran */}
        {data.subjects.length > 0 && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 border-b border-slate-100 pb-5">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-1.5 text-blue-600 text-xs font-bold uppercase tracking-wider">
                  <BookOpen className="w-4 h-4" />
                  <span>Transparansi Kurikulum Operasional Satuan Pendidikan (KOSP)</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900">
                  Struktur Kurikulum & Sebaran Mata Pelajaran
                </h3>
                {data.karakteristik_kosp && (
                  <p className="text-xs text-slate-500 max-w-3xl leading-relaxed">
                    {data.karakteristik_kosp}
                  </p>
                )}
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-2xl px-4 py-2.5 text-right flex-shrink-0">
                <div className="text-[11px] text-blue-700 font-semibold">Total Alokasi Ditampilkan</div>
                <div className="text-lg font-black text-blue-900">{totalJpDisplayed} JP / Minggu</div>
              </div>
            </div>

            {/* Filter Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs font-bold text-slate-500 mr-1">Filter Tingkat:</span>
                {[
                  { id: 'ALL', label: 'Semua Tingkat' },
                  { id: 10, label: 'Kelas X (Fase E)' },
                  { id: 11, label: 'Kelas XI (Fase F)' },
                  { id: 12, label: 'Kelas XII (Fase F)' },
                ].map((t) => (
                  <button
                    key={String(t.id)}
                    onClick={() => setSelectedTingkat(t.id as any)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                      selectedTingkat === t.id
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs font-bold text-slate-500 mr-1">Kelompok:</span>
                {['ALL', 'UMUM', 'KEJURUAN', 'PILIHAN'].map((k) => (
                  <button
                    key={k}
                    onClick={() => setSelectedKelompok(k)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                      selectedKelompok === k
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {k === 'ALL' ? 'Semua Kelompok' : k}
                  </button>
                ))}
              </div>
            </div>

            {/* Subjects Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredSubjects.map((sub) => {
                const isKejuruan = sub.kelompok.toUpperCase().includes('KEJURUAN');
                return (
                  <div
                    key={sub.id}
                    className="p-4 rounded-2xl bg-slate-50/80 hover:bg-white border border-slate-200/80 hover:border-blue-300 transition-all flex flex-col justify-between gap-3"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            isKejuruan
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : 'bg-blue-100 text-blue-800 border border-blue-200'
                          }`}
                        >
                          KELOMPOK {sub.kelompok.toUpperCase()}
                        </span>
                        <span className="text-xs font-extrabold text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200">
                          Kelas {sub.tingkat}
                        </span>
                      </div>

                      <h4 className="text-sm font-bold text-slate-900 leading-snug">
                        {sub.nama_mapel}
                      </h4>
                    </div>

                    <div className="pt-2.5 border-t border-slate-200/70 flex items-center justify-between text-xs">
                      <span className="text-slate-500 flex items-center gap-1 truncate max-w-[65%]">
                        <GraduationCap className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                        <span className="truncate">{sub.nama_jurusan}</span>
                      </span>
                      <span className="font-extrabold text-blue-700 flex items-center gap-1 flex-shrink-0">
                        <Clock className="w-3.5 h-3.5" />
                        {sub.jp_per_minggu} JP/Minggu
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
