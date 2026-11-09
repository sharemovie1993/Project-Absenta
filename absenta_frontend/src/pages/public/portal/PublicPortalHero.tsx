import React from 'react';
import {
  Users,
  GraduationCap,
  Building2,
  Briefcase,
  Award,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  BookUser,
} from 'lucide-react';
import { PublicSchoolProfile } from '../../../api/public-portal.api';

interface PublicPortalHeroProps {
  profile: PublicSchoolProfile;
  onExploreClick: () => void;
  onOpenVerifyModal: () => void;
  onOpenGraduationModal: () => void;
  onOpenGuestBookModal: () => void;
}

export const PublicPortalHero: React.FC<PublicPortalHeroProps> = ({
  profile,
  onExploreClick,
  onOpenVerifyModal,
  onOpenGraduationModal,
  onOpenGuestBookModal,
}) => {
  const isSmk = profile.jenjang === 'SMK';
  const heroImage =
    profile.web_config?.hero_images?.[0] ||
    'https://images.unsplash.com/photo-1580582932707-520aed937b7b?auto=format&fit=crop&w=1600&q=80';

  const statsList = [
    {
      label: 'Siswa Aktif',
      value: profile.stats.total_siswa.toLocaleString('id-ID'),
      icon: Users,
      color: 'from-blue-500 to-indigo-600',
    },
    {
      label: 'Guru & Tenaga Pendidik',
      value: profile.stats.total_guru.toLocaleString('id-ID'),
      icon: GraduationCap,
      color: 'from-emerald-500 to-teal-600',
    },
    {
      label: isSmk ? 'Kompetensi Keahlian' : 'Rombongan Belajar',
      value: profile.stats.total_jurusan.toLocaleString('id-ID'),
      icon: Award,
      color: 'from-amber-500 to-orange-600',
    },
    ...(isSmk && profile.stats.total_mitra_industri > 0
      ? [
          {
            label: 'Mitra Industri (DUDI)',
            value: profile.stats.total_mitra_industri.toLocaleString('id-ID'),
            icon: Briefcase,
            color: 'from-purple-500 to-pink-600',
          },
        ]
      : [
          {
            label: 'Fasilitas & Lab',
            value: profile.stats.total_fasilitas.toLocaleString('id-ID'),
            icon: Building2,
            color: 'from-sky-500 to-blue-600',
          },
        ]),
  ];

  return (
    <section id="beranda" className="relative bg-slate-950 text-white overflow-hidden">
      {/* Background Hero Image with Deep Modern Gradient Overlay */}
      <div className="absolute inset-0 z-0">
        <img
          src={heroImage}
          alt={profile.nama}
          className="w-full h-full object-cover opacity-25 scale-105 filter blur-[1px] animate-pulse-slow"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent" />
        <div className="absolute inset-0 bg-radial-gradient from-blue-900/30 to-transparent opacity-60" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-28 lg:pt-28 lg:pb-36">
        <div className="max-w-3xl space-y-6">
          {/* Institutional Status Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs sm:text-sm font-medium text-blue-200">
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>Pendidikan Terakreditasi Berstandar Nasional</span>
            <span className="w-1 h-1 rounded-full bg-slate-400" />
            <span className="font-semibold text-white">{profile.jenjang}</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-tight">
            {profile.web_config?.hero_title || `Selamat Datang di ${profile.nama}`}
          </h1>

          {/* Subtitle */}
          <p className="text-base sm:text-lg lg:text-xl text-slate-300 font-normal leading-relaxed">
            {profile.web_config?.hero_subtitle ||
              'Membangun ekosistem belajar transformatif dengan mengintegrasikan keunggulan karakter, penguasaan sains teknologi terapan, dan kemitraan dunia usaha.'}
          </p>

          {/* CTA Buttons */}
          <div className="pt-4 flex flex-wrap items-center gap-3">
            <button
              onClick={onExploreClick}
              className="px-5 py-3.5 rounded-xl font-semibold text-xs sm:text-sm bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/30 transition-all flex items-center gap-2 group"
            >
              <span>Jelajahi Profil Sekolah</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>

            <button
              onClick={onOpenGraduationModal}
              className="px-5 py-3.5 rounded-xl font-semibold text-xs sm:text-sm bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-lg shadow-amber-500/20 transition-all flex items-center gap-2"
            >
              <GraduationCap className="w-4 h-4" />
              <span>Amplop Pengumuman Kelulusan</span>
            </button>

            <button
              onClick={onOpenGuestBookModal}
              className="px-4 py-3.5 rounded-xl font-semibold text-xs sm:text-sm bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 border border-emerald-400/30 backdrop-blur-sm transition-all flex items-center gap-2"
            >
              <BookUser className="w-4 h-4 text-emerald-400" />
              <span>Buku Tamu PTSP</span>
            </button>

            <button
              onClick={onOpenVerifyModal}
              className="px-4 py-3.5 rounded-xl font-semibold text-xs sm:text-sm bg-white/10 hover:bg-white/20 text-white border border-white/20 backdrop-blur-sm transition-all flex items-center gap-2"
            >
              <ShieldCheck className="w-4 h-4 text-blue-400" />
              <span>Verifikasi SKL / UKK</span>
            </button>
          </div>
        </div>
      </div>

      {/* Floating High-Density Stats Bar */}
      <div className="relative z-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-16 sm:-mt-20">
        <div className="bg-white rounded-2xl shadow-xl shadow-slate-900/10 border border-slate-100 p-4 sm:p-6 grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {statsList.map((stat, idx) => {
            const Icon = stat.icon;
            return (
              <div
                key={idx}
                className="flex items-center gap-3.5 p-2 rounded-xl hover:bg-slate-50 transition-colors"
              >
                <div
                  className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center text-white shadow-sm flex-shrink-0`}
                >
                  <Icon className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                    {stat.value}
                  </div>
                  <div className="text-xs text-slate-500 font-medium leading-snug">
                    {stat.label}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
