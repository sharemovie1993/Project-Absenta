import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, AlertCircle } from 'lucide-react';
import {
  publicPortalApi,
  PublicSchoolProfile,
  PublicProgram,
  PublicStaffMember,
  PublicAchievement,
  PublicHubinData,
  PublicFacility,
  PublicArticleSummary,
  PublicLivePulse,
  PublicCalendarAndEkskul,
  PublicCurriculumAndP5,
  PublicScheduleOverview,
  PublicPpidDocument,
} from '../../../api/public-portal.api';

import { PublicPortalNavbar } from './PublicPortalNavbar';
import { PublicPortalHero } from './PublicPortalHero';
import { PublicPortalLivePulse } from './PublicPortalLivePulse';
import { PublicPortalHeadmaster } from './PublicPortalHeadmaster';
import { PublicPortalPrograms } from './PublicPortalPrograms';
import { PublicPortalCurriculumP5 } from './PublicPortalCurriculumP5';
import { PublicPortalCalendarEkskul } from './PublicPortalCalendarEkskul';
import { PublicPortalHubinBkk } from './PublicPortalHubinBkk';
import { PublicPortalSchedulePpid } from './PublicPortalSchedulePpid';
import { PublicPortalArticles } from './PublicPortalArticles';
import { PublicPortalStaff } from './PublicPortalStaff';
import { PublicPortalFacilities } from './PublicPortalFacilities';
import { PublicPortalFooter } from './PublicPortalFooter';
import { PublicPortalVerifyModal } from './PublicPortalVerifyModal';
import { PublicPortalGraduationModal } from './PublicPortalGraduationModal';
import { PublicPortalGuestBookModal } from './PublicPortalGuestBookModal';
import { PublicPortalAspirasiModal } from './PublicPortalAspirasiModal';

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
  const [livePulse, setLivePulse] = useState<PublicLivePulse | null>(null);
  const [calendarEkskul, setCalendarEkskul] = useState<PublicCalendarAndEkskul | null>(null);
  const [curriculumP5, setCurriculumP5] = useState<PublicCurriculumAndP5 | null>(null);
  const [classSchedule, setClassSchedule] = useState<PublicScheduleOverview | null>(null);
  const [ppidDocs, setPpidDocs] = useState<PublicPpidDocument[]>([]);
  const [programs, setPrograms] = useState<PublicProgram[]>([]);
  const [staff, setStaff] = useState<PublicStaffMember[]>([]);
  const [achievements, setAchievements] = useState<PublicAchievement[]>([]);
  const [hubin, setHubin] = useState<PublicHubinData>({ mitra: [], lowongan: [], tefa_projects: [] });
  const [facilities, setFacilities] = useState<PublicFacility[]>([]);
  const [articles, setArticles] = useState<PublicArticleSummary[]>([]);

  // Navigation & Modal State
  const [activeSection, setActiveSection] = useState('beranda');
  const [verifyModalOpen, setVerifyModalOpen] = useState(false);
  const [graduationModalOpen, setGraduationModalOpen] = useState(false);
  const [guestBookModalOpen, setGuestBookModalOpen] = useState(false);
  const [aspirasiModalOpen, setAspirasiModalOpen] = useState(false);

  useEffect(() => {
    if (!resolvedSlug) return;
    setLoading(true);
    setErrorMsg(null);

    Promise.all([
      publicPortalApi.getProfile(resolvedSlug),
      publicPortalApi.getLivePulse(resolvedSlug).catch(() => ({ success: false, data: null as any })),
      publicPortalApi.getCalendarAndEkskul(resolvedSlug).catch(() => ({ success: false, data: null as any })),
      publicPortalApi.getCurriculumAndP5(resolvedSlug).catch(() => ({ success: false, data: null as any })),
      publicPortalApi.getClassSchedule(resolvedSlug).catch(() => ({ success: false, data: null as any })),
      publicPortalApi.getPublicDocuments(resolvedSlug).catch(() => ({ success: false, data: [] as any })),
      publicPortalApi.getPrograms(resolvedSlug),
      publicPortalApi.getStaff(resolvedSlug),
      publicPortalApi.getAchievements(resolvedSlug, 6),
      publicPortalApi.getHubin(resolvedSlug),
      publicPortalApi.getFacilities(resolvedSlug),
      publicPortalApi.getArticles(resolvedSlug, { limit: 6 }),
    ])
      .then(([profRes, pulseRes, calRes, curRes, schRes, docRes, progRes, staffRes, achRes, hubinRes, facRes, artRes]) => {
        if (profRes.success && profRes.data) {
          setProfile(profRes.data);
          document.title = `${profRes.data.nama} - Portal Resmi Sekolah`;
        }
        if (pulseRes.success && pulseRes.data) setLivePulse(pulseRes.data);
        if (calRes.success && calRes.data) setCalendarEkskul(calRes.data);
        if (curRes.success && curRes.data) setCurriculumP5(curRes.data);
        if (schRes.success && schRes.data) setClassSchedule(schRes.data);
        if (docRes.success && docRes.data) setPpidDocs(docRes.data);
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
        onOpenGraduationModal={() => setGraduationModalOpen(true)}
        onOpenGuestBookModal={() => setGuestBookModalOpen(true)}
        onOpenAspirasiModal={() => setAspirasiModalOpen(true)}
        activeSection={activeSection}
        onNavigate={handleNavigate}
      />

      {/* 2. Hero Section */}
      <PublicPortalHero
        profile={profile}
        onExploreClick={() => handleNavigate('profil')}
        onOpenVerifyModal={() => setVerifyModalOpen(true)}
        onOpenGraduationModal={() => setGraduationModalOpen(true)}
        onOpenGuestBookModal={() => setGuestBookModalOpen(true)}
      />

      {/* 3. Live Pulse Real-Time Transparency Strip */}
      <PublicPortalLivePulse pulse={livePulse} />

      {/* 4. Headmaster Speech & Vision/Mission */}
      <PublicPortalHeadmaster profile={profile} />

      {/* 5. Programs / Jurusan */}
      {programs.length > 0 && <PublicPortalPrograms programs={programs} profile={profile} />}

      {/* 6. Etalase Projek P5 & Struktur Kurikulum KOSP */}
      <PublicPortalCurriculumP5 data={curriculumP5} />

      {/* 7. Kalender Akademik & Ekstrakurikuler */}
      <PublicPortalCalendarEkskul data={calendarEkskul} schoolName={profile.nama} />

      {/* 8. Hubin, BKK, Tracer Study BMW, Sebaran PKL & TEFA (Khusus SMK) */}
      {profile.jenjang === 'SMK' && (
        <PublicPortalHubinBkk
          hubin={hubin}
          tefaWhatsapp={profile.web_config?.tefa_whatsapp}
          schoolName={profile.nama}
        />
      )}

      {/* 9. Portal Cek Jadwal Pelajaran Kelas & Pusat Unduhan Dokumen PPID */}
      <PublicPortalSchedulePpid
        initialSchedule={classSchedule}
        ppidDocs={ppidDocs}
        tenantSlug={resolvedSlug}
      />

      {/* 10. Articles & News */}
      <PublicPortalArticles
        articles={articles}
        achievements={achievements}
        tenantSlug={resolvedSlug}
        onSelectArticle={handleSelectArticle}
      />

      {/* 11. Staff & Teachers Directory */}
      {staff.length > 0 && <PublicPortalStaff staff={staff} />}

      {/* 12. Facilities Showcase */}
      {facilities.length > 0 && <PublicPortalFacilities facilities={facilities} />}

      {/* 13. Footer */}
      <PublicPortalFooter
        profile={profile}
        onOpenVerifyModal={() => setVerifyModalOpen(true)}
        onNavigate={handleNavigate}
      />

      {/* 14. Interactive Modals */}
      <PublicPortalVerifyModal
        isOpen={verifyModalOpen}
        onClose={() => setVerifyModalOpen(false)}
        tenantSlug={resolvedSlug}
      />

      <PublicPortalGraduationModal
        isOpen={graduationModalOpen}
        onClose={() => setGraduationModalOpen(false)}
        tenantSlug={resolvedSlug}
        schoolName={profile.nama}
      />

      <PublicPortalGuestBookModal
        isOpen={guestBookModalOpen}
        onClose={() => setGuestBookModalOpen(false)}
        tenantSlug={resolvedSlug}
        schoolName={profile.nama}
      />

      <PublicPortalAspirasiModal
        isOpen={aspirasiModalOpen}
        onClose={() => setAspirasiModalOpen(false)}
        tenantSlug={resolvedSlug}
        schoolName={profile.nama}
      />
    </div>
  );
};
export default PublicPortalPage;
