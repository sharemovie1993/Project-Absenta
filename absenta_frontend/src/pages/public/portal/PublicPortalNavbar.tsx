import React, { useState } from 'react';
import {
  GraduationCap,
  Award,
  BookOpen,
  Users,
  Building2,
  Briefcase,
  Newspaper,
  Phone,
  ShieldCheck,
  Menu,
  X,
  ExternalLink,
} from 'lucide-react';
import { PublicSchoolProfile } from '../../../api/public-portal.api';

interface PublicPortalNavbarProps {
  profile: PublicSchoolProfile;
  onOpenVerifyModal: () => void;
  activeSection: string;
  onNavigate: (sectionId: string) => void;
}

export const PublicPortalNavbar: React.FC<PublicPortalNavbarProps> = ({
  profile,
  onOpenVerifyModal,
  activeSection,
  onNavigate,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isSmk = profile.jenjang === 'SMK';
  const themeColor = profile.web_config?.theme_color || '#2563EB';

  const navItems = [
    { id: 'beranda', label: 'Beranda', icon: GraduationCap },
    { id: 'profil', label: 'Profil & Visi', icon: BookOpen },
    { id: 'program', label: isSmk ? 'Kompetensi Keahlian' : 'Program Akademik', icon: Award },
    { id: 'berita', label: 'Berita & Info', icon: Newspaper },
    ...(isSmk ? [{ id: 'bkk', label: 'BKK & Industri', icon: Briefcase }] : []),
    { id: 'guru', label: 'Guru & Staf', icon: Users },
    { id: 'fasilitas', label: 'Fasilitas', icon: Building2 },
    { id: 'kontak', label: 'Kontak', icon: Phone },
  ];

  const handleNavClick = (id: string) => {
    onNavigate(id);
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-sm transition-all duration-200">
      {/* Top Banner Bar */}
      <div className="bg-slate-900 text-slate-300 text-xs py-1.5 px-4 sm:px-8 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1 font-medium text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Portal Resmi Institusi
          </span>
          <span className="hidden sm:inline text-slate-600">|</span>
          <span className="hidden sm:inline text-slate-400">NPSN: {profile.npsn || '-'}</span>
          {profile.akreditasi && (
            <span className="bg-amber-400/20 text-amber-300 border border-amber-400/30 px-1.5 py-0.5 rounded text-[10px] font-semibold">
              Akreditasi {profile.akreditasi}
            </span>
          )}
        </div>
        <div className="flex items-center gap-4">
          {profile.web_config?.ppdb_active && (
            <a
              href={profile.web_config.ppdb_url || '#ppdb'}
              className="text-amber-300 hover:text-amber-200 font-semibold flex items-center gap-1 transition-colors"
            >
              🚀 PPDB Dibuka!
            </a>
          )}
          <button
            onClick={onOpenVerifyModal}
            className="flex items-center gap-1 text-slate-300 hover:text-white transition-colors"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden sm:inline">Verifikasi Dokumen Kelulusan</span>
            <span className="sm:hidden">Verifikasi</span>
          </button>
        </div>
      </div>

      {/* Main Nav Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        {/* Brand Logo & Name */}
        <div
          onClick={() => handleNavClick('beranda')}
          className="flex items-center gap-3 cursor-pointer group"
        >
          {profile.logo_url ? (
            <img
              src={profile.logo_url}
              alt={profile.nama}
              className="w-12 h-12 rounded-xl object-contain shadow-sm border border-slate-100 group-hover:scale-105 transition-transform"
            />
          ) : (
            <div
              style={{ backgroundColor: themeColor }}
              className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-md group-hover:scale-105 transition-transform"
            >
              {profile.nama.charAt(0)}
            </div>
          )}
          <div>
            <h1 className="text-base sm:text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors leading-tight line-clamp-1">
              {profile.nama}
            </h1>
            <p className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
              <span>{profile.kurikulum || 'Kurikulum Merdeka'}</span>
              <span>•</span>
              <span className="font-semibold text-blue-600">{profile.jenjang}</span>
            </p>
          </div>
        </div>

        {/* Desktop Navigation Links */}
        <nav className="hidden lg:flex items-center gap-1">
          {navItems.map((item) => {
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'text-blue-600 bg-blue-50/80 font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* CTA Buttons */}
        <div className="hidden sm:flex items-center gap-2.5">
          <button
            onClick={onOpenVerifyModal}
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1.5 border border-slate-200"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            Cek Ijazah / SKL
          </button>
          {profile.web_config?.ppdb_active && (
            <a
              href={profile.web_config.ppdb_url || '#ppdb'}
              style={{ backgroundColor: themeColor }}
              className="px-4 py-2 text-xs font-semibold text-white rounded-lg shadow-sm hover:opacity-95 transition-all flex items-center gap-1.5"
            >
              <span>Daftar PPDB</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>

        {/* Mobile Hamburger Toggle */}
        <div className="lg:hidden flex items-center gap-2">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
            aria-label="Toggle Navigation"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Dropdown Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-6 shadow-xl space-y-1 animate-in slide-in-from-top-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-600 font-semibold'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                {item.label}
              </button>
            );
          })}
          <div className="pt-3 border-t border-slate-100 flex flex-col gap-2">
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenVerifyModal();
              }}
              className="w-full py-2.5 px-3 bg-slate-100 text-slate-700 font-medium text-sm rounded-lg flex items-center justify-center gap-2"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Verifikasi Dokumen Kelulusan
            </button>
            {profile.web_config?.ppdb_active && (
              <a
                href={profile.web_config.ppdb_url || '#ppdb'}
                style={{ backgroundColor: themeColor }}
                className="w-full py-2.5 px-3 text-white font-medium text-sm rounded-lg flex items-center justify-center gap-2 shadow-sm"
              >
                Daftar PPDB Online Sekarang
              </a>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
