import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, AlertCircle, Building2 } from 'lucide-react';
import {
  publicPortalApi,
  PublicSchoolProfile,
  PublicProgram,
  PublicStaffMember,
  PublicAchievement,
  PublicHubinData,
  PublicFacility,
  PublicArticleSummary,
} from '../../../api/public-portal.api';

import { PublicPortalNavbar } from './PublicPortalNavbar';
import { PublicPortalHero } from './PublicPortalHero';
import { PublicPortalHeadmaster } from './PublicPortalHeadmaster';
import { PublicPortalPrograms } from './PublicPortalPrograms';
import { PublicPortalHubinBkk } from './PublicPortalHubinBkk';
import { PublicPortalArticles } from './PublicPortalArticles';
import { PublicPortalStaff } from './PublicPortalStaff';
import { PublicPortalFacilities } from './PublicPortalFacilities';
import { PublicPortalFooter } from './PublicPortalFooter';
import { PublicPortalVerifyModal } from './PublicPortalVerifyModal';

export const PublicPortalPage: React.FC = () => {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const navigate = useNavigate();

  // Active Slug fallback (if accessed without param, try query or window.location.hostname)
  const queryParams = new URLSearchParams(window.location.search);
  const querySlug = queryParams.get('tenant') || queryParams.get('sekolah') || queryParams.get('slug');

  const resolvedSlug =
    tenantSlug ||
    querySlug ||
    (window.location.hostname.includes('smkn1pld') ? 'smkn1pld' : null) ||
    (window.location.hostname.includes('.absenta.id')
      ? window.location.hostname.split('.')[0]
      : 'smkn1pld') ||
    'smkn1pld';

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Aggregated Data State
  const [profile, setProfile] = useState<PublicSchoolProfile | null>(null);
  const [programs, setPrograms] = useState<PublicProgram[]>([]);
  const [staff, setStaff] = useState<PublicStaffMember[]>([]);
  const [achievements, setAchievements] = useState<PublicAchievement[]>([]);
  const [hubin, setHubin] = useState<PublicHubinData>({ mitra: [], lowongan: [], tefa_projects: [] });
  const [facilities, setFacilities] = useState<PublicFacility[]>([]);
  const [articles, setArticles] = useState<PublicArticleSummary[]>([]);

  // Navigation & Modal State
  const [activeSection, setActiveSection] = useState('beranda');
  const [verifyModalOpen, setVerifyModalOpen] = useState(false);

  useEffect(() => {
    if (!resolvedSlug) return;
    setLoading(true);
    setErrorMsg(null);

    Promise.all([
      publicPortalApi.getProfile(resolvedSlug),
      publicPortalApi.getPrograms(resolvedSlug),
      publicPortalApi.getStaff(resolvedSlug),
      publicPortalApi.getAchievements(resolvedSlug, 6),
      publicPortalApi.getHubin(resolvedSlug),
      publicPortalApi.getFacilities(resolvedSlug),
      publicPortalApi.getArticles(resolvedSlug, { limit: 6 }),
    ])
      .then(([profRes, progRes, staffRes, achRes, hubinRes, facRes, artRes]) => {
        if (profRes.success && profRes.data) {
          setProfile(profRes.data);
          document.title = `${profRes.data.nama} - Portal Resmi Sekolah`;
        }
        if (progRes.success) setPrograms(progRes.data || []);
        if (staffRes.success) setStaff(staffRes.data || []);
        if (achRes.success) setAchievements(achRes.data || []);
        if (hubinRes.success) setHubin(hubinRes.data || { mitra: [], lowongan: [], tefa_projects: [] });
        if (facRes.success) setFacilities(facRes.data || []);
        if (artRes.success) setArticles(artRes.data || []);
      })
      .catch((err) => {
        console.error('Failed to load public portal data:', err);
        setErrorMsg(
          err?.response?.data?.message || 'Gagal memuat portal sekolah. Pastikan tautan atau domain benar.'
        );
      })
      .finally(() => {
        setLoading(false);
      });
  }, [resolvedSlug]);

  const handleNavigate = (sectionId: string) => {
    setActiveSection(sectionId);
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleSelectArticle = (articleSlug: string) => {
    navigate(`/portal/${resolvedSlug}/berita/${articleSlug}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center mx-auto">
            <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white tracking-wide">
              Menghubungkan ke Portal Sekolah...
            </h2>
            <p className="text-xs text-slate-400 mt-1">Mengambil data resmi terintegrasi Absenta</p>
          </div>
        </div>
      </div>
    );
  }

  if (errorMsg || !profile) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 text-center space-y-4 border border-slate-200 shadow-xl">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">Portal Tidak Ditemukan</h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            {errorMsg || `Institusi dengan subdomain atau pengenal '${resolvedSlug}' belum terdaftar atau tidak aktif.`}
          </p>
          <button
            onClick={() => navigate('/')}
            className="px-5 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors"
          >
            Kembali ke Beranda Utama
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-slate-800 font-sans antialiased selection:bg-blue-600 selection:text-white">
      {/* 1. Header / Navbar */}
      <PublicPortalNavbar
        profile={profile}
        onOpenVerifyModal={() => setVerifyModalOpen(true)}
        activeSection={activeSection}
        onNavigate={handleNavigate}
      />

      {/* 2. Hero Section */}
      <PublicPortalHero
        profile={profile}
        onExploreClick={() => handleNavigate('profil')}
        onOpenVerifyModal={() => setVerifyModalOpen(true)}
      />

      {/* 3. Headmaster Speech & Vision/Mission */}
      <PublicPortalHeadmaster profile={profile} />

      {/* 4. Programs / Jurusan */}
      {programs.length > 0 && <PublicPortalPrograms programs={programs} profile={profile} />}

      {/* 5. Hubin, BKK & Industri (Khusus SMK) */}
      {profile.jenjang === 'SMK' && <PublicPortalHubinBkk hubin={hubin} />}

      {/* 6. Articles & News */}
      <PublicPortalArticles
        articles={articles}
        achievements={achievements}
        tenantSlug={resolvedSlug}
        onSelectArticle={handleSelectArticle}
      />

      {/* 7. Staff & Teachers Directory */}
      {staff.length > 0 && <PublicPortalStaff staff={staff} />}

      {/* 8. Facilities Showcase */}
      {facilities.length > 0 && <PublicPortalFacilities facilities={facilities} />}

      {/* 9. Footer */}
      <PublicPortalFooter
        profile={profile}
        onOpenVerifyModal={() => setVerifyModalOpen(true)}
        onNavigate={handleNavigate}
      />

      {/* 10. Document Verification Modal */}
      <PublicPortalVerifyModal
        isOpen={verifyModalOpen}
        onClose={() => setVerifyModalOpen(false)}
        tenantSlug={resolvedSlug}
      />
    </div>
  );
};
export default PublicPortalPage;
