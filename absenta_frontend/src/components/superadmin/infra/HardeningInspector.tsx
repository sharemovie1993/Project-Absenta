import React from 'react';
import { AlertTriangle, Sparkles, X, Check, Zap, Gauge, FileCode, Copy } from 'lucide-react';
import type { HardeningInspectorProps, LiveAuditResult, LighthouseResult } from './infra.types';
import { CRITICAL_PILLAR_IDS, getGradeInfo } from './infra.utils';

// ─── Radial Progress Component for Lighthouse ────────────────────────────
const RadialProgress: React.FC<{ score: number; label: string }> = ({ score, label }) => {
  const radius = 20;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  
  let colorClass = 'text-rose-500';
  if (score >= 90) {
    colorClass = 'text-emerald-400';
  } else if (score >= 50) {
    colorClass = 'text-amber-400';
  }
  
  return (
    <div className="flex flex-col items-center gap-1.5 flex-1 min-w-[70px] bg-slate-950/40 border border-slate-900 p-2.5 rounded-xl">
      <div className="relative flex items-center justify-center">
        <svg className="w-12 h-12 transform -rotate-90">
          <circle
            cx="24"
            cy="24"
            r={radius}
            className="text-slate-800"
            strokeWidth="3.5"
            stroke="currentColor"
            fill="transparent"
          />
          <circle
            cx="24"
            cy="24"
            r={radius}
            className={colorClass}
            strokeWidth="3.5"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            stroke="currentColor"
            fill="transparent"
          />
        </svg>
        <span className="absolute text-[11px] font-black font-mono text-white">{score}</span>
      </div>
      <span className="text-[8px] font-black text-slate-400 uppercase text-center tracking-wide block truncate w-full">{label}</span>
    </div>
  );
};

// ─── PREMIUM DEV-ONLY HARDENING COMPLIANCE INSPECTOR ──────────────────────────

export const HardeningInspector: React.FC<HardeningInspectorProps> = ({ pageName, standards, moduleKey }) => {
  const [isOpen, setIsOpen]               = React.useState(false);
  const [isAuditing, setIsAuditing]       = React.useState(false);
  const [liveAuditResult, setLiveAudit]   = React.useState<LiveAuditResult | null>(null);
  const [copiedText, setCopiedText]       = React.useState(false);
  const [auditError, setAuditError]       = React.useState<string | null>(null);

  // Lighthouse States
  const [activeTab, setActiveTab]         = React.useState<'code' | 'lighthouse'>('code');
  const [lhResult, setLhResult]           = React.useState<LighthouseResult | null>(null);
  const [isLhAuditing, setIsLhAuditing]   = React.useState(false);
  const [lhError, setLhError]             = React.useState<string | null>(null);

  // Jangan render apapun di mode produksi
  if (typeof window !== 'undefined' && !import.meta.env.DEV) return null;

  // ③ useCallback pada semua handler agar referensi stabil lintas render
  const handleRunLiveAudit = React.useCallback(async () => {
    if (!moduleKey) return;
    setIsAuditing(true);
    setAuditError(null);
    try {
      const res = await fetch(`http://localhost:9999/api/audit?key=${encodeURIComponent(moduleKey)}`);
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP ${res.status}`);
      }
      const data: LiveAuditResult = await res.json();
      setLiveAudit(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error tidak dikenal';
      setAuditError(msg || 'Gagal terhubung ke Dev Audit Server (pastikan port 9999 berjalan)');
    } finally {
      setIsAuditing(false);
    }
  }, [moduleKey]);

  const handleRunLighthouse = React.useCallback(async () => {
    setIsLhAuditing(true);
    setLhError(null);
    try {
      const currentUrl = window.location.href;
      const res = await fetch(`http://localhost:9999/api/lighthouse?url=${encodeURIComponent(currentUrl)}`);
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP ${res.status}`);
      }
      const data: LighthouseResult = await res.json();
      setLhResult(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error tidak dikenal';
      setLhError(msg || 'Gagal terhubung ke Dev Audit Server (pastikan port 9999 berjalan)');
    } finally {
      setIsLhAuditing(false);
    }
  }, []);

  const handleCopyPrompt = React.useCallback(() => {
    if (!liveAuditResult?.refactorPrompt) return;
    navigator.clipboard.writeText(liveAuditResult.refactorPrompt).catch(console.error);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  }, [liveAuditResult]);

  // ④ displayedStandards: mapper live audit ke checklist + tambah Pilar 5 safeEffect
  const displayedStandards = React.useMemo(() => {
    if (!liveAuditResult) return standards;

    const safe = (val: boolean | undefined, fallback: boolean = true) =>
      val !== undefined ? val : fallback;

    return standards.map(std => {
      switch (std.id) {
        case 'architectural_layout_standard':
          return { ...std,
            status: liveAuditResult.usesLayout ? 'VERIFIED' as const : 'FAILED' as const,
            details: liveAuditResult.usesLayout
              ? 'Tervalidasi: Halaman dibungkus dengan AcademicPageLayout.'
              : 'Gagal: Halaman tidak menggunakan AcademicPageLayout.' };

        case 'architectural_shared_components':
          return { ...std,
            status: safe(liveAuditResult.usesUiComponents) ? 'VERIFIED' as const : 'FAILED' as const,
            details: safe(liveAuditResult.usesUiComponents)
              ? 'Tervalidasi: Mengimpor shared UI components terstandar.'
              : 'Gagal: Halaman ini menggunakan elemen HTML mentah atau belum mengimpor standard UI.' };

        case 'architectural_safe_mapping':
          return { ...std,
            status: liveAuditResult.safeMapping ? 'VERIFIED' as const : 'FAILED' as const,
            details: liveAuditResult.safeMapping
              ? 'Tervalidasi: Semua .map menggunakan optional chaining ?.'
              : 'Gagal: .map digunakan tanpa pertahanan ?. – risiko crash jika data null.' };

        case 'architectural_memoization':
          return { ...std,
            status: liveAuditResult.usesMemo ? 'VERIFIED' as const : 'WARNING' as const,
            details: liveAuditResult.usesMemo
              ? 'Tervalidasi: useMemo dan useCallback terdeteksi.'
              : 'Peringatan: Hook memoization tidak ditemukan – DOM churn tinggi.' };

        case 'architectural_strict_typing':
          return { ...std,
            status: liveAuditResult.noAnyType ? 'VERIFIED' as const : 'WARNING' as const,
            details: liveAuditResult.noAnyType
              ? 'Tervalidasi: Bersih dari tipe data longgar ": any".'
              : 'Peringatan: Tipe ": any" terdeteksi – keamanan TypeScript melemah.' };

        // ④ Pilar 5: safeEffect – sebelumnya TIDAK ada mapper ini!
        case 'architectural_safe_effect':
        case 'memory_leak_safeguards':
          return { ...std,
            status: liveAuditResult.safeEffect ? 'VERIFIED' as const : 'FAILED' as const,
            details: liveAuditResult.safeEffect
              ? 'Tervalidasi: Cleanup listener/timer terdefinisi dengan return () => {...}.'
              : 'Gagal: useEffect memiliki listener/timer tanpa cleanup – kebocoran memori!' };

        case 'architectural_strict_colors':
          return { ...std,
            status: liveAuditResult.strictColors ? 'VERIFIED' as const : 'WARNING' as const,
            details: liveAuditResult.strictColors
              ? 'Tervalidasi: Konsisten dengan palet warna terpusat.'
              : 'Peringatan: Warna heksadesimal keras atau bracket Tailwind terdeteksi.' };

        case 'architectural_table_sorting':
          return { ...std,
            status: safe(liveAuditResult.tableSorting) ? 'VERIFIED' as const : 'WARNING' as const,
            details: safe(liveAuditResult.tableSorting)
              ? 'Tervalidasi: Tabel memiliki implementasi sorting.'
              : 'Peringatan: <Table> tanpa props sortable/onSort/sortKey.' };

        case 'architectural_empty_state':
          return { ...std,
            status: safe(liveAuditResult.emptyState) ? 'VERIFIED' as const : 'WARNING' as const,
            details: safe(liveAuditResult.emptyState)
              ? 'Tervalidasi: Empty state handler terpasang.'
              : 'Peringatan: Tidak ada fallback tampilan saat data kosong.' };

        case 'architectural_loading_guard':
          return { ...std,
            status: safe(liveAuditResult.loadingGuard) ? 'VERIFIED' as const : 'WARNING' as const,
            details: safe(liveAuditResult.loadingGuard)
              ? 'Tervalidasi: Guard isLoading/Skeleton terpasang.'
              : 'Peringatan: Tidak ada guard loading – risiko flash konten kosong.' };

        case 'architectural_form_a11y':
          return { ...std,
            status: safe(liveAuditResult.formA11y) ? 'VERIFIED' as const : 'WARNING' as const,
            details: safe(liveAuditResult.formA11y)
              ? 'Tervalidasi: Form memiliki aria-label/htmlFor.'
              : 'Peringatan: Input tanpa aria-label/htmlFor – aksesibilitas rendah.' };

        case 'architectural_performance_optimization':
        case 'code_splitting':
          return { ...std,
            status: safe(liveAuditResult.performanceOptimization) ? 'VERIFIED' as const : 'FAILED' as const,
            details: safe(liveAuditResult.performanceOptimization)
              ? 'Tervalidasi: Komponen berat dimuat secara asinkron (lazy).'
              : 'Gagal: Modal/Form terdeteksi tetapi tidak menggunakan lazy() & Suspense.' };

        case 'architectural_user_guidance':
          return { ...std,
            status: safe(liveAuditResult.userGuidance) ? 'VERIFIED' as const : 'WARNING' as const,
            details: safe(liveAuditResult.userGuidance)
              ? 'Tervalidasi: Halaman memiliki sistem panduan instruksi.'
              : 'Peringatan: Halaman tidak menyediakan properti "instruction" pada layout.' };

        case 'architectural_table_pagination':
          return { ...std,
            status: safe(liveAuditResult.tablePagination) ? 'VERIFIED' as const : 'FAILED' as const,
            details: safe(liveAuditResult.tablePagination)
              ? 'Tervalidasi: Tabel memiliki implementasi pagination.'
              : 'Gagal: <Table> ditemukan tanpa pagination – risiko crash pada dataset besar.' };

        case 'architectural_toolbar_standard':
          return { ...std,
            status: safe(liveAuditResult.standardToolbar) ? 'VERIFIED' as const : 'WARNING' as const,
            details: safe(liveAuditResult.standardToolbar)
              ? 'Tervalidasi: Aksi utama halaman menggunakan properti toolbar layout.'
              : 'Peringatan: Aksi utama belum menggunakan standar toolbar layout.' };

        case 'architectural_feedback_standard':
          return { ...std,
            status: safe(liveAuditResult.standardFeedback) ? 'VERIFIED' as const : 'FAILED' as const,
            details: safe(liveAuditResult.standardFeedback)
              ? 'Tervalidasi: Menggunakan sistem feedback modern (Toast/Confirm).'
              : 'Gagal: Masih menggunakan alert/confirm bawaan browser.' };

        case 'architectural_container_consistency':
          return { ...std,
            status: safe(liveAuditResult.standardContainer) ? 'VERIFIED' as const : 'WARNING' as const,
            details: safe(liveAuditResult.standardContainer)
              ? 'Tervalidasi: Menggunakan SectionCard/Card untuk kontainer UI.'
              : 'Peringatan: Layout belum menggunakan kontainer terstandar.' };

        case 'architectural_advanced_select':
          return { ...std,
            status: safe(liveAuditResult.advancedSelect) ? 'VERIFIED' as const : 'WARNING' as const,
            details: safe(liveAuditResult.advancedSelect)
              ? 'Tervalidasi: Menggunakan SearchableSelect untuk input pilihan.'
              : 'Peringatan: Ditemukan dropdown yang belum menggunakan SearchableSelect.' };

        case 'architectural_table_toolbar_standard':
          return { ...std,
            status: safe(liveAuditResult.tableToolbar) ? 'VERIFIED' as const : 'FAILED' as const,
            details: safe(liveAuditResult.tableToolbar)
              ? 'Tervalidasi: Menggunakan properti toolbarLeft/Right untuk aksi kontekstual tabel.'
              : 'Gagal: Aksi operasional tabel diletakkan di luar slot resmi toolbar Table.' };

        case 'architectural_breadcrumb_navigation':
          return { ...std,
            status: safe((liveAuditResult as any).breadcrumbNavigation) ? 'VERIFIED' as const : 'WARNING' as const,
            details: safe((liveAuditResult as any).breadcrumbNavigation)
              ? 'Tervalidasi: Navigasi Breadcrumb terdeteksi.'
              : 'Peringatan: Halaman tidak melampirkan properti breadcrumbs pada layout.' };

        case 'architectural_pdf_print':
          return { ...std,
            status: safe((liveAuditResult as any).standardPdfPrint) ? 'VERIFIED' as const : 'WARNING' as const,
            details: safe((liveAuditResult as any).standardPdfPrint)
              ? 'Tervalidasi: Menggunakan modul cetak PDF terstandar.'
              : 'Peringatan: Mendeteksi ekspor PDF manual/mentah. Gunakan modul cetak PDF terstandar di \'src/utils/print/\'.' };

        case 'architectural_zod_validation':
          return { ...std,
            status: safe((liveAuditResult as any).zodValidationGuard) ? 'VERIFIED' as const : 'WARNING' as const,
            details: safe((liveAuditResult as any).zodValidationGuard)
              ? 'Tervalidasi: Form dilindungi oleh skema validasi Zod.'
              : 'Peringatan: Terdeteksi elemen form input tanpa skema validasi Zod.' };

        default:
          return std;
      }
    });
  }, [standards, liveAuditResult]);

  // ─── Weighted Scoring Engine (v2 – Hardened) ───────────────────────────────
  // Pilar kritis memiliki bobot 3x, pilar advisory bobotnya 1x
  const CRITICAL_PILLAR_IDS_ARRAY = [
    'architectural_layout_standard',
    'architectural_safe_mapping',
    'architectural_memoization',
    'fault_tolerance',
    'memory_leak_safeguards',
    'architectural_performance_optimization',
    'architectural_table_pagination',
    'code_splitting',
  ];

  const totalWeight = displayedStandards.reduce((sum, std) => {
    return sum + (CRITICAL_PILLAR_IDS_ARRAY.includes(std.id) ? 3 : 1);
  }, 0) || 1;

  const earnedWeight = displayedStandards.reduce((sum, std) => {
    const w = CRITICAL_PILLAR_IDS_ARRAY.includes(std.id) ? 3 : 1;
    if (std.status === 'VERIFIED') return sum + w;
    if (std.status === 'WARNING') return sum + w * 0.5;
    return sum; // FAILED = 0
  }, 0);

  const verifiedCount = displayedStandards.filter((s) => s.status === 'VERIFIED').length;
  const warningCount  = displayedStandards.filter((s) => s.status === 'WARNING').length;
  const failedCount   = displayedStandards.filter((s) => s.status === 'FAILED').length;
  const totalCount    = displayedStandards.length || 1;

  // Base weighted score
  const rawScore = Math.round((earnedWeight / totalWeight) * 100);

  // Grade cap: setiap FAILED kritis memblokir grade tinggi
  let cappedScore = rawScore;
  if (failedCount >= 3) cappedScore = Math.min(cappedScore, 24);  // Paksa F
  else if (failedCount >= 2) cappedScore = Math.min(cappedScore, 39); // Paksa D
  else if (failedCount >= 1) cappedScore = Math.min(cappedScore, 59); // Blokir A & B → max C
  cappedScore = Math.max(0, cappedScore);

  // ⑤ getGradeInfo sudah dipindah ke luar komponen – tinggal panggil
  const grade = React.useMemo(() => getGradeInfo(cappedScore), [cappedScore]);


  return (
    <>
      {/* Clickable DEV badge */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={`inline-flex items-center gap-2 px-3 py-1 border rounded-full select-none shadow-sm animate-in fade-in slide-in-from-top-2 duration-300 hover:scale-[1.03] active:scale-[0.98] transition-all cursor-pointer group ${grade.badgeClass}`}
      >
        <span className="flex h-2.5 w-2.5 relative shrink-0">
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${grade.pingClass}`}></span>
          <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${grade.pingDotClass}`}></span>
        </span>
        <span className="text-[10px] font-black uppercase tracking-wider font-sans flex items-center gap-1">
          {grade.badgeText}
        </span>
      </button>

      {/* Glassmorphism Interactive Certificate Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/60 backdrop-blur-md animate-in fade-in duration-200">
          <div
            className="bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 border border-slate-800 rounded-2xl max-w-3xl w-full h-full max-h-[90vh] sm:max-h-[82vh] flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* ⑥ Header Banner – warna adaptif sesuai grade */}
            <div className={`relative p-4 bg-gradient-to-r ${grade.headerGlow} border-b border-slate-800 overflow-hidden flex items-center justify-between gap-6`}>
              {/* Abstract glowing orbs */}
              <div className="absolute -top-12 -left-12 w-32 h-32 bg-current opacity-5 rounded-full blur-2xl pointer-events-none" />
              <div className="absolute -bottom-12 -right-12 w-32 h-32 bg-current opacity-5 rounded-full blur-2xl pointer-events-none" />

              {/* Left: Title Area */}
              <div className="space-y-0.5 z-10 flex-shrink-0">
                <span className="inline-flex items-center gap-1 text-[8px] font-extrabold text-emerald-400 tracking-widest uppercase bg-emerald-950/60 border border-emerald-900/40 px-2 py-0.5 rounded">
                  <Sparkles className="h-2 w-2" /> Dev-Mode Certification
                </span>
                <h3 className="text-base font-black text-white tracking-tight flex items-center gap-1.5 mt-0.5">
                  Sertifikat Standar Hardening
                </h3>
                <p className="text-[10px] text-slate-400 font-medium font-sans">
                  Halaman: <code className="text-emerald-300 font-bold font-mono">{pageName}</code>
                </p>
              </div>

              {/* Right: Persistant Score Widget Area */}
              <div className="flex-1 z-10 max-w-xs hidden sm:flex items-center gap-3 bg-slate-950/40 border border-slate-800/50 p-2.5 rounded-xl backdrop-blur-sm mr-12">
                {/* Grade ring */}
                <div className="relative flex items-center justify-center shrink-0">
                  <div className={`w-10 h-10 rounded-full border-[2.5px] ${grade.ringClass} flex items-center justify-center text-center`}>
                    <span className="text-[12px] font-black font-mono text-white">{grade.letter}</span>
                  </div>
                  <div className={`absolute -inset-0.5 rounded-full border ${grade.ringPulse} animate-ping opacity-15 pointer-events-none`} />
                </div>

                {/* Score details */}
                <div className="flex-1 min-w-0 space-y-0.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[9px] font-bold text-slate-200 truncate">Hardening: {cappedScore}%</span>
                    <span className="text-[7.5px] font-black text-slate-500 font-mono shrink-0">{verifiedCount}/{totalCount}</span>
                  </div>
                  {/* Mini animated score bar */}
                  <div className="h-0.5 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ease-out ${
                        cappedScore >= 80 ? 'bg-emerald-500' :
                        cappedScore >= 60 ? 'bg-yellow-500' :
                        cappedScore >= 40 ? 'bg-orange-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${cappedScore}%` }}
                    />
                  </div>
                  {/* Compact Stats */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-[7.5px] font-black text-emerald-400">✓ {verifiedCount}</span>
                    {warningCount > 0 && <span className="text-[7.5px] font-black text-yellow-400">⚠ {warningCount}</span>}
                    {failedCount > 0 && <span className="text-[7.5px] font-black text-red-400 animate-pulse">✗ {failedCount}</span>}
                  </div>
                </div>
              </div>

              {/* Floating Close Button - Absolute Positioned for Visibility */}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="absolute top-4 right-4 p-2 rounded-xl bg-slate-900/50 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition-all cursor-pointer z-50 flex items-center justify-center shadow-lg backdrop-blur-md group"
                title="Tutup Sertifikat"
              >
                <X className="h-5 w-5 group-hover:rotate-90 transition-transform duration-300" />
              </button>
            </div>

            {/* Tab Switcher */}
            <div className="flex border-b border-slate-800 bg-slate-950/60 px-6 pt-1">
              <button
                type="button"
                onClick={() => setActiveTab('code')}
                className={`py-2 px-4 text-[10px] font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
                  activeTab === 'code'
                    ? 'border-emerald-500 text-emerald-400 font-extrabold font-sans'
                    : 'border-transparent text-slate-400 hover:text-slate-200 font-sans'
                }`}
              >
                🛡️ Audit Kode
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('lighthouse')}
                className={`py-2 px-4 text-[10px] font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
                  activeTab === 'lighthouse'
                    ? 'border-indigo-500 text-indigo-400 font-extrabold font-sans'
                    : 'border-transparent text-slate-400 hover:text-slate-200 font-sans'
                }`}
              >
                🧭 Performa & A11y
              </button>
            </div>

            <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
              {activeTab === 'code' && (
                <>
                  {/* Dynamic Real-time Audit Trigger Button */}
                  {moduleKey && (
                    <div className="px-6 py-3 bg-slate-900/60 border-b border-slate-950/50 flex flex-col gap-2">
                      <button
                        type="button"
                        onClick={handleRunLiveAudit}
                        disabled={isAuditing}
                        className="w-full h-10 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-md shadow-indigo-600/10 cursor-pointer active:scale-[0.98] disabled:opacity-50"
                      >
                        {isAuditing ? '🔄 Sedang Menganalisis Kode Sumber...' : '🔍 Jalankan Audit Kode Sumber Riil'}
                      </button>
                      {auditError && (
                        <p className="text-[10px] text-rose-400 font-bold font-sans">⚠️ {auditError}</p>
                      )}
                    </div>
                  )}

                {/* Compliance Report Checklists – Hardened v2 */}
                <div className="px-6 pt-3 pb-1.5">
                  <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest font-sans">
                    📋 Laporan Audit Kode Sumber ({totalCount} Pilar):
                  </div>
                </div>
                  <div className="px-6 pb-5 space-y-2">
                    {displayedStandards.map((std) => {
                      const isVerified = std.status === 'VERIFIED';
                      const isWarning  = std.status === 'WARNING';
                      const isFailed   = std.status === 'FAILED';
                      const isCritical = CRITICAL_PILLAR_IDS.has(std.id);

                      let cardClass = 'p-2 rounded-lg border transition-all space-y-1 ';
                      let iconContainerClass = '';
                      let statusBadgeClass = '';
                      let IconComponent = X;

                      if (isVerified) {
                        cardClass += 'bg-emerald-950/10 border-emerald-900/30 hover:border-emerald-800/50';
                        iconContainerClass = 'p-1 rounded bg-emerald-950/40 text-emerald-400 border border-emerald-900/40';
                        statusBadgeClass = 'bg-emerald-950/50 text-emerald-400 border border-emerald-900/40';
                        IconComponent = Check;
                      } else if (isWarning) {
                        cardClass += 'bg-yellow-950/10 border-yellow-900/30 hover:border-yellow-800/50';
                        iconContainerClass = 'p-1 rounded bg-yellow-950/40 text-yellow-400 border border-yellow-900/40';
                        statusBadgeClass = 'bg-yellow-950/50 text-yellow-400 border border-yellow-900/40';
                        IconComponent = AlertTriangle;
                      } else {
                        // FAILED – tampilkan lebih mencolok, terutama jika CRITICAL
                        cardClass += isCritical
                          ? 'bg-red-950/20 border-red-700/50 ring-1 ring-red-700/30 hover:border-red-600/50'
                          : 'bg-red-950/10 border-red-900/40 hover:border-red-800/50';
                        iconContainerClass = 'p-1 rounded bg-red-950/50 text-red-400 border border-red-800/50';
                        statusBadgeClass = 'bg-red-950/60 text-red-400 border border-red-800/50';
                        IconComponent = X;
                      }

                      return (
                        <div key={std.id} className={cardClass}>
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className={`${iconContainerClass} shrink-0`}>
                            <IconComponent className="h-3 w-3" />
                          </div>
                          <div className="min-w-0">
                            <span className="text-[11px] font-bold text-slate-200 leading-tight block truncate">{std.name}</span>
                            {!isVerified && isCritical && (
                              <span className="text-[7px] font-black text-red-400/80 uppercase tracking-wider">
                                ⚡ CRITICAL
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {isCritical && (
                            <span className="text-[7px] font-black px-1 py-0.25 rounded bg-slate-800 text-slate-500 border border-slate-700 uppercase tracking-wide">3×</span>
                          )}
                          <span className={`inline-flex items-center text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-wide ${statusBadgeClass}`}>
                            {isFailed ? '✗ FAILED' : isWarning ? '⚠ WARN' : '✓ OK'}
                          </span>
                        </div>
                      </div>
                      {!isVerified && (
                        <div className="pl-7">
                          <p className="text-[9px] text-slate-400 font-medium font-sans leading-tight">
                            {std.description}
                          </p>
                          <div className={`text-[8px] font-mono font-medium mt-0.5 ${isFailed ? 'text-red-400/70' : 'text-yellow-400/70'}`}>
                            {isFailed ? '✗' : '⚠'} {std.details}
                          </div>
                        </div>
                      )}
                      {isVerified && (
                        <div className="pl-7 text-[8px] text-emerald-400/70 font-mono font-medium">
                          ✓ {std.details}
                        </div>
                      )}
                    </div>
                      );
                    })}
                  </div>

                  {/* Dynamic Copyable Refactoring Instruction Area */}
                  {liveAuditResult && (
                    <div className="p-4 bg-slate-950/40 border-t border-slate-900 space-y-2">
                    <div className="flex items-center gap-1.5 px-1">
                      <FileCode className="h-3 w-3 text-slate-400" />
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Preview Instruksi:</span>
                    </div>
                    <textarea
                      readOnly
                      value={liveAuditResult.refactorPrompt}
                      className="w-full h-16 p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-300 text-[9px] font-mono leading-tight focus:outline-none resize-none scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent"
                    />
                  </div>
                  )}
                </>
              )}

              {activeTab === 'lighthouse' && (
                <div className="flex flex-col flex-1">
                  {/* Trigger Button */}
                  <div className="px-6 py-4 bg-slate-900/60 border-b border-slate-950/50 flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={handleRunLighthouse}
                      disabled={isLhAuditing}
                      className="w-full h-10 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-md shadow-indigo-600/10 cursor-pointer active:scale-[0.98] disabled:opacity-50"
                    >
                      {isLhAuditing ? (
                        <span className="flex items-center gap-2">
                          <span className="h-3 w-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Sedang Menganalisis Lighthouse... (Butuh ~15 detik)
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5">
                          <Gauge className="h-4 w-4" /> Jalankan Analisis Kinerja Lighthouse
                        </span>
                      )}
                    </button>
                    {lhError && (
                      <p className="text-[10px] text-rose-400 font-bold font-sans">⚠️ {lhError}</p>
                    )}
                  </div>

                  {/* Lighthouse Results Content */}
                  {lhResult ? (
                    <div className="flex-1">
                      {/* 4 Radial Scores */}
                      <div className="p-5 bg-slate-950/20 border-b border-slate-900/60">
                        <div className="flex justify-between items-center gap-2">
                          <RadialProgress score={lhResult.performance} label="Performa" />
                          <RadialProgress score={lhResult.accessibility} label="Aksesbilitas" />
                          <RadialProgress score={lhResult.bestPractices} label="Praktik Baik" />
                          <RadialProgress score={lhResult.seo} label="SEO" />
                        </div>
                      </div>

                      {/* Core Web Vitals Metrics */}
                      <div className="px-5 py-4 border-b border-slate-900/60 bg-slate-900/10">
                        <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest font-sans mb-3">
                          ⏱️ Metrik Inti Browser (Core Web Vitals):
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                          <div className="bg-slate-950/40 border border-slate-900/85 p-2.5 rounded-xl space-y-1">
                            <span className="text-[7.5px] font-bold text-slate-400 uppercase tracking-wider block">LCP (Paint)</span>
                            <span className="text-xs font-black text-white block font-mono">{lhResult.metrics.lcp}</span>
                          </div>
                          <div className="bg-slate-950/40 border border-slate-900/85 p-2.5 rounded-xl space-y-1">
                            <span className="text-[7.5px] font-bold text-slate-400 uppercase tracking-wider block">CLS (Shift)</span>
                            <span className="text-xs font-black text-white block font-mono">{lhResult.metrics.cls}</span>
                          </div>
                          <div className="bg-slate-950/40 border border-slate-900/85 p-2.5 rounded-xl space-y-1">
                            <span className="text-[7.5px] font-bold text-slate-400 uppercase tracking-wider block">TBT (Blocking)</span>
                            <span className="text-xs font-black text-white block font-mono">{lhResult.metrics.tbt}</span>
                          </div>
                          <div className="bg-slate-950/40 border border-slate-900/85 p-2.5 rounded-xl space-y-1">
                            <span className="text-[7.5px] font-bold text-slate-400 uppercase tracking-wider block">Speed Index</span>
                            <span className="text-xs font-black text-white block font-mono">{lhResult.metrics.speedIndex}</span>
                          </div>
                        </div>
                      </div>

                      {/* Recommendations List */}
                      <div className="p-5 space-y-3">
                        <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest font-sans">
                          📋 Saran Perbaikan Diagnostik ({lhResult.suggestions.length} Temuan):
                        </div>
                        
                        {lhResult.suggestions.length === 0 ? (
                          <div className="p-4 rounded-xl border border-emerald-900/30 bg-emerald-950/10 text-center text-xs font-semibold text-emerald-400 font-sans">
                            🎉 Sempurna! Tidak ada masalah penting yang terdeteksi oleh Lighthouse.
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {lhResult.suggestions.map((sug, idx) => (
                              <div key={idx} className="p-3 rounded-xl border border-slate-900 bg-slate-900/10 space-y-1 hover:border-slate-800 transition-all text-left">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="inline-flex text-[7.5px] font-black px-1.5 py-0.5 rounded bg-indigo-950/50 text-indigo-400 border border-indigo-900/40 uppercase tracking-wider">
                                    {sug.category}
                                  </span>
                                  {sug.displayValue && (
                                    <span className="text-[8.5px] font-mono font-bold text-rose-400">{sug.displayValue}</span>
                                  )}
                                </div>
                                <h4 className="text-[11px] font-bold text-slate-200">{sug.title}</h4>
                                <p className="text-[9.5px] text-slate-400 font-medium font-sans leading-relaxed">{sug.description}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="py-16 flex flex-col items-center justify-center gap-3 text-center px-6">
                      <div className="p-4 rounded-full bg-slate-900/40 border border-slate-800 text-slate-500">
                        <Zap className="h-6 w-6 animate-pulse text-indigo-400" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-xs font-bold text-slate-300">Belum Ada Laporan Lighthouse</h4>
                        <p className="text-[10px] text-slate-500 max-w-xs font-medium font-sans leading-relaxed">
                          Klik tombol di atas untuk menjalankan audit kecepatan, aksesibilitas, dan SEO langsung dari browser Chrome headless.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Certificate Footer */}
            <div className="p-3 bg-slate-900/40 border-t border-slate-900 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="text-[8px] font-bold text-slate-500 tracking-wider hidden md:inline">
                  VALIDATED BY DEEPMIND ANTIGRAVITY
                </span>
                
                {/* Always visible copy button in footer if result exists and on code tab */}
                {activeTab === 'code' && liveAuditResult && (
                  <button
                    type="button"
                    onClick={handleCopyPrompt}
                    className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all shadow-md active:scale-95 border ${
                      copiedText 
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' 
                        : 'bg-indigo-600 hover:bg-indigo-500 text-white border-indigo-400/30'
                    }`}
                  >
                    {copiedText ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    {copiedText ? 'Tersalin!' : 'Salin Perintah'}
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-[10px] font-black uppercase tracking-widest shadow transition-colors cursor-pointer active:scale-95 border border-slate-700"
              >
                Selesai Inspeksi
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
