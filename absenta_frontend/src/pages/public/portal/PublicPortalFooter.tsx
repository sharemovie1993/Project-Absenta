import React from 'react';
import {
  MapPin,
  Phone,
  Mail,
  Globe,
  Instagram,
  Facebook,
  Youtube,
  ShieldCheck,
  GraduationCap,
} from 'lucide-react';
import { PublicSchoolProfile } from '../../../api/public-portal.api';

interface PublicPortalFooterProps {
  profile: PublicSchoolProfile;
  onOpenVerifyModal: () => void;
  onNavigate: (sectionId: string) => void;
}

export const PublicPortalFooter: React.FC<PublicPortalFooterProps> = ({
  profile,
  onOpenVerifyModal,
  onNavigate,
}) => {
  const currentYear = new Date().getFullYear();
  const addressParts = [
    profile.alamat,
    profile.kelurahan ? `Kel. ${profile.kelurahan}` : null,
    profile.kecamatan ? `Kec. ${profile.kecamatan}` : null,
    profile.kota,
    profile.provinsi,
    profile.kode_pos,
  ].filter(Boolean);

  const social = profile.web_config?.social_links || {};

  return (
    <footer id="kontak" className="bg-slate-950 text-slate-300 pt-16 pb-12 border-t border-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8">
          {/* Institutional Info (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="flex items-center gap-3">
              {profile.logo_url ? (
                <img
                  src={profile.logo_url}
                  alt={profile.nama}
                  className="w-12 h-12 rounded-xl object-contain bg-white p-1"
                />
              ) : (
                <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold text-xl">
                  {profile.nama.charAt(0)}
                </div>
              )}
              <div>
                <h3 className="text-base font-bold text-white">{profile.nama}</h3>
                <p className="text-xs text-slate-400">NPSN: {profile.npsn || '-'}</p>
              </div>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed max-w-sm">
              Lembaga pendidikan formal terakreditasi berstandar nasional yang berkomitmen
              mengembangkan potensi generasi penerus bangsa yang unggul, berkarakter, dan berdaya
              saing global.
            </p>

            {/* Social Media Links */}
            <div className="flex items-center gap-2 pt-2">
              {social.instagram && (
                <a
                  href={social.instagram}
                  target="_blank"
                  rel="noreferrer"
                  className="w-9 h-9 rounded-xl bg-slate-900 hover:bg-pink-600 text-slate-300 hover:text-white flex items-center justify-center transition-colors"
                >
                  <Instagram className="w-4 h-4" />
                </a>
              )}
              {social.facebook && (
                <a
                  href={social.facebook}
                  target="_blank"
                  rel="noreferrer"
                  className="w-9 h-9 rounded-xl bg-slate-900 hover:bg-blue-600 text-slate-300 hover:text-white flex items-center justify-center transition-colors"
                >
                  <Facebook className="w-4 h-4" />
                </a>
              )}
              {social.youtube && (
                <a
                  href={social.youtube}
                  target="_blank"
                  rel="noreferrer"
                  className="w-9 h-9 rounded-xl bg-slate-900 hover:bg-red-600 text-slate-300 hover:text-white flex items-center justify-center transition-colors"
                >
                  <Youtube className="w-4 h-4" />
                </a>
              )}
            </div>
          </div>

          {/* Quick Nav Links (3 cols) */}
          <div className="lg:col-span-3 space-y-3">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider">Akses Cepat</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <button
                  onClick={() => onNavigate('beranda')}
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  Beranda Utama
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('profil')}
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  Profil & Visi Misi
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('program')}
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  Program & Kejuruan
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('guru')}
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  Direktori Pendidik & Tendik
                </button>
              </li>
              <li>
                <button
                  onClick={onOpenVerifyModal}
                  className="text-emerald-400 hover:text-emerald-300 font-semibold transition-colors flex items-center gap-1"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Verifikasi Ijazah / SKL</span>
                </button>
              </li>
            </ul>
          </div>

          {/* Contact Details (4 cols) */}
          <div className="lg:col-span-4 space-y-3">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider">Kontak & Lokasi</h4>
            <div className="space-y-2.5 text-xs text-slate-400">
              <div className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                <span>{addressParts.join(', ') || 'Alamat sekolah belum diperbarui'}</span>
              </div>
              {profile.telepon && (
                <div className="flex items-center gap-2.5">
                  <Phone className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span>{profile.telepon}</span>
                </div>
              )}
              {profile.email && (
                <div className="flex items-center gap-2.5">
                  <Mail className="w-4 h-4 text-amber-400 flex-shrink-0" />
                  <span>{profile.email}</span>
                </div>
              )}
              {profile.website && (
                <div className="flex items-center gap-2.5">
                  <Globe className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                  <span>{profile.website}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Copyright */}
        <div className="pt-8 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>© {currentYear} {profile.nama}. Hak cipta dilindungi undang-undang.</p>
          <p className="flex items-center gap-1">
            <span>Powered by</span>
            <span className="font-semibold text-slate-300">Absenta Educational Ecosystem</span>
          </p>
        </div>
      </div>
    </footer>
  );
};
