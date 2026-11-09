import React from 'react';
import { Award, BookOpen, Layers, Users, Sparkles } from 'lucide-react';
import { PublicProgram, PublicSchoolProfile } from '../../../api/public-portal.api';

interface PublicPortalProgramsProps {
  programs: PublicProgram[];
  profile: PublicSchoolProfile;
}

export const PublicPortalPrograms: React.FC<PublicPortalProgramsProps> = ({ programs, profile }) => {
  const isSmk = profile.jenjang === 'SMK';

  return (
    <section id="program" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-semibold">
            <Award className="w-3.5 h-3.5" />
            <span>{isSmk ? 'Kompetensi Keahlian Unggulan' : 'Program Pembelajaran'}</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            {isSmk ? 'Pilihan Jurusan & Keahlian Masa Depan' : 'Struktur Kurikulum & Peminatan'}
          </h2>
          <p className="text-sm text-slate-500">
            {isSmk
              ? `Tersedia ${programs.length} konsentrasi keahlian berstandar industri dengan sertifikasi resmi`
              : 'Pembelajaran komprehensif mengintegrasikan kurikulum nasional dan penguatan karakter'}
          </p>
        </div>

        {/* Programs Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {programs.map((prog) => {
            const cardColor = prog.warna || '#2563EB';
            return (
              <div
                key={prog.id}
                className="group relative bg-white rounded-2xl p-6 border border-slate-200/90 hover:border-slate-300 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between overflow-hidden"
              >
                {/* Accent Top Border */}
                <div
                  style={{ backgroundColor: cardColor }}
                  className="absolute top-0 left-0 right-0 h-1.5 opacity-90 group-hover:h-2 transition-all"
                />

                <div className="space-y-4">
                  {/* Badge & Code */}
                  <div className="flex items-center justify-between">
                    <span
                      style={{ color: cardColor, backgroundColor: `${cardColor}15` }}
                      className="px-2.5 py-1 rounded-lg text-xs font-extrabold tracking-wide uppercase"
                    >
                      {prog.kode || prog.singkatan || 'JURUSAN'}
                    </span>
                    <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1">
                      <Layers className="w-3.5 h-3.5" />
                      {prog.durasi_jurusan === '4_TAHUN' ? 'Program 4 Tahun' : 'Program 3 Tahun'}
                    </span>
                  </div>

                  {/* Program Title */}
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors leading-snug">
                      {prog.nama}
                    </h3>
                    {prog.program_keahlian && (
                      <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                        <BookOpen className="w-3 h-3 text-slate-400" />
                        <span>Bidang: {prog.program_keahlian}</span>
                      </p>
                    )}
                  </div>

                  {/* Highlights */}
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Mempersiapkan lulusan yang terampil, menguasai teknologi praktis, siap kerja, dan
                    memiliki daya saing wirausaha mandiri.
                  </p>
                </div>

                {/* Footer Strip */}
                <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium">
                  <span className="flex items-center gap-1 text-slate-600 font-semibold">
                    <Users className="w-3.5 h-3.5 text-blue-500" />
                    <span>{prog.jumlah_kelas} Rombel Aktif</span>
                  </span>
                  <span className="text-blue-600 group-hover:translate-x-1 transition-transform inline-flex items-center gap-0.5 font-semibold text-[11px]">
                    Kurikulum Industri &rarr;
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Kurikulum Merdeka Badge Note */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100 text-center flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-left">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center flex-shrink-0 shadow-sm">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900">Kurikulum Merdeka Terintegrasi</h4>
              <p className="text-xs text-slate-600">
                Dilengkapi Projek Penguatan Profil Pelajar Pancasila (P5) dan sinkronisasi standar kompetensi nasional.
              </p>
            </div>
          </div>
          <span className="px-3.5 py-1.5 rounded-lg bg-white border border-blue-200 text-blue-700 font-semibold text-xs shadow-2xs whitespace-nowrap">
            Standar Kemendikbudristek
          </span>
        </div>
      </div>
    </section>
  );
};
