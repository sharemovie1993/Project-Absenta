// ─── INFRA UTILS ──────────────────────────────────────────────────────────────
// Utility functions, icon mappings, dan konstanta untuk komponen infrastruktur.

import React from 'react';
import {
  CalendarCheck, CreditCard, Bell, BarChart3, Wrench, Cog,
  CalendarClock, Mail, Cpu, Server,
} from 'lucide-react';
import type { GradeInfo, HardeningStandard, LiveAuditResult } from './infra.types';

// ─── ICON MAPPINGS ────────────────────────────────────────────────────────────

export const getNodeIcon = (nodeId: string): React.ComponentType<any> => {
  const id = String(nodeId || '').toLowerCase();
  if (id.includes('billing')) return CreditCard;
  if (id.includes('attendance')) return CalendarCheck;
  if (id.includes('api')) return Server;
  return Cpu;
};

export const getWorkerIcon = (workerType: string): React.ComponentType<any> => {
  const t = String(workerType || '').toLowerCase();
  if (t === 'attendance') return CalendarCheck;
  if (t === 'billing') return CreditCard;
  if (t === 'notification') return Bell;
  if (t === 'analytics') return BarChart3;
  if (t === 'maintenance') return Wrench;
  if (t === 'infra') return Cog;
  if (t === 'recurring') return CalendarClock;
  if (t === 'email') return Mail;
  return Cpu;
};

// ─── TIME & DURATION FORMATTERS ───────────────────────────────────────────────

export const getServerTimeOffset = (): number => {
  if (typeof window !== 'undefined') {
    return (window as any).__SERVER_TIME_OFFSET__ || 0;
  }
  return 0;
};

export const fmtDuration = (val: number | null | undefined): string | null => {
  if (val === null || val === undefined) return null;
  const n = Number(val);
  if (Number.isNaN(n)) return null;
  if (n >= 60_000) return `${(n / 60_000).toFixed(1)} menit`;
  if (n >= 1_000) return `${(n / 1000).toFixed(2)} detik`;
  return `${n} ms`;
};

export const fmtAge = (ts: number | null | undefined): string => {
  if (!ts || !Number.isFinite(ts)) return '-';
  const offset = getServerTimeOffset();
  const delta = Math.max(0, (Date.now() - offset) - ts);
  const sec = Math.floor(delta / 1000);
  if (sec < 20) return 'Baru saja';
  if (sec < 60) return `${sec} detik lalu`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} menit lalu`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} jam lalu`;
  return `${Math.floor(hr / 24)} hari lalu`;
};

export const fmtClock = (ts: number | null | undefined): string => {
  if (!ts || !Number.isFinite(ts)) return '-';
  try {
    return new Date(ts).toLocaleTimeString(undefined, {
      hour: '2-digit',
      hour12: false,
      minute: '2-digit',
      second: '2-digit'
    });
  } catch {
    return String(ts);
  }
};

// ─── HIGH-PERFORMANCE THROTTLE UTILITY ────────────────────────────────────────

export function throttle<T extends (...args: any[]) => void>(func: T, limit: number): T {
  let inThrottle = false;
  let lastArgs: any[] | null = null;

  return function (this: any, ...args: any[]) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
        if (lastArgs) {
          func.apply(this, lastArgs);
          lastArgs = null;
        }
      }, limit);
    } else {
      lastArgs = args;
    }
  } as unknown as T;
}

// ─── HARDENING CONSTANTS ───────────────────────────────────────────────────────

// ① CRITICAL_PILLAR_IDS dipindah ke luar komponen agar tidak dibuat ulang setiap render
export const CRITICAL_PILLAR_IDS = new Set([
  'architectural_layout_standard',
  'architectural_safe_mapping',
  'architectural_memoization',
  'fault_tolerance',
  'memory_leak_safeguards',
  'architectural_performance_optimization',
  'architectural_table_pagination',
  'code_splitting',
]);

// ─── GRADE INFO ───────────────────────────────────────────────────────────────

export function getGradeInfo(scoreValue: number): GradeInfo {
  if (scoreValue >= 95) return {
    letter: 'A+',
    badgeText: '🛡️ Hardened (DEV AUDIT A+)',
    badgeClass: 'from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/15 border-emerald-250 dark:border-emerald-900/30 text-emerald-800 dark:text-emerald-400',
    pingClass: 'bg-emerald-400', pingDotClass: 'bg-emerald-500',
    ringClass: 'border-emerald-500/20 text-emerald-400', ringPulse: 'border-emerald-400/40',
    headerGlow: 'from-emerald-950/40 via-teal-950/30 to-slate-900'
  };
  if (scoreValue >= 80) return {
    letter: 'A',
    badgeText: '🛡️ Hardened (DEV AUDIT A)',
    badgeClass: 'from-emerald-50 to-green-50 dark:from-emerald-950/15 dark:to-green-950/10 border-emerald-200 dark:border-emerald-900/20 text-emerald-700 dark:text-emerald-400',
    pingClass: 'bg-green-400', pingDotClass: 'bg-green-500',
    ringClass: 'border-green-500/20 text-green-400', ringPulse: 'border-green-400/30',
    headerGlow: 'from-emerald-950/40 via-teal-950/20 to-slate-900'
  };
  if (scoreValue >= 60) return {
    letter: 'B',
    badgeText: '⚠️ Partial (DEV AUDIT B)',
    badgeClass: 'from-yellow-50 to-amber-50 dark:from-yellow-950/20 dark:to-amber-950/10 border-yellow-250 dark:border-yellow-900/30 text-yellow-800 dark:text-yellow-400',
    pingClass: 'bg-yellow-400', pingDotClass: 'bg-yellow-500',
    ringClass: 'border-yellow-500/20 text-yellow-450', ringPulse: 'border-yellow-400/30',
    headerGlow: 'from-yellow-950/30 via-amber-950/20 to-slate-900'
  };
  if (scoreValue >= 45) return {
    letter: 'C',
    badgeText: '⚠️ Partial (DEV AUDIT C)',
    badgeClass: 'from-orange-50 to-amber-50 dark:from-orange-950/20 dark:to-amber-950/10 border-orange-250 dark:border-orange-900/30 text-orange-800 dark:text-orange-400',
    pingClass: 'bg-orange-400', pingDotClass: 'bg-orange-500',
    ringClass: 'border-orange-500/20 text-orange-450', ringPulse: 'border-orange-400/30',
    headerGlow: 'from-orange-950/35 via-amber-950/20 to-slate-900'
  };
  if (scoreValue >= 25) return {
    letter: 'D',
    badgeText: '🚨 Vulnerable (DEV AUDIT D)',
    badgeClass: 'from-red-50 to-orange-50 dark:from-red-950/15 dark:to-orange-950/10 border-red-200 dark:border-red-900/20 text-red-750 dark:text-red-400',
    pingClass: 'bg-orange-500 animate-pulse', pingDotClass: 'bg-orange-600',
    ringClass: 'border-orange-500/20 text-red-450', ringPulse: 'border-orange-400/30',
    headerGlow: 'from-red-950/30 via-orange-950/20 to-slate-900'
  };
  return {
    letter: 'F',
    badgeText: '🚨 Unhardened (DEV AUDIT F)',
    badgeClass: 'from-red-50 to-rose-50 dark:from-red-950/20 dark:to-rose-950/15 border-red-250 dark:border-red-900/30 text-red-800 dark:text-red-400',
    pingClass: 'bg-red-400 animate-pulse', pingDotClass: 'bg-red-500',
    ringClass: 'border-red-550/25 text-red-500 bg-red-950/10', ringPulse: 'border-red-400/40',
    headerGlow: 'from-red-950/40 via-rose-950/25 to-slate-900'
  };
}

export function mapLiveAuditToStandards(standards: HardeningStandard[], liveAuditResult: LiveAuditResult | null): HardeningStandard[] {
  if (!liveAuditResult) return standards;

  const safe = (val: boolean | undefined, fallback: boolean = false) =>
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
          status: safe(liveAuditResult.breadcrumbNavigation) ? 'VERIFIED' as const : 'WARNING' as const,
          details: safe(liveAuditResult.breadcrumbNavigation)
            ? 'Tervalidasi: Navigasi Breadcrumb terdeteksi.'
            : 'Peringatan: Halaman tidak melampirkan properti breadcrumbs pada layout.' };

      case 'architectural_pdf_print':
        return { ...std,
          status: safe(liveAuditResult.standardPdfPrint) ? 'VERIFIED' as const : 'WARNING' as const,
          details: safe(liveAuditResult.standardPdfPrint)
            ? 'Tervalidasi: Menggunakan modul cetak PDF terstandar.'
            : 'Peringatan: Mendeteksi ekspor PDF manual/mentah. Gunakan modul cetak PDF terstandar di \'src/utils/print/\'.' };

      case 'architectural_zod_validation':
        return { ...std,
          status: safe(liveAuditResult.zodValidationGuard) ? 'VERIFIED' as const : 'WARNING' as const,
          details: safe(liveAuditResult.zodValidationGuard)
            ? 'Tervalidasi: Form dilindungi oleh skema validasi Zod.'
            : 'Peringatan: Terdeteksi elemen form input tanpa skema validasi Zod.' };

      case 'architectural_layout_flow_consistency':
        return { ...std,
          status: safe(liveAuditResult.layoutFlowConsistency) ? 'VERIFIED' as const : 'WARNING' as const,
          details: safe(liveAuditResult.layoutFlowConsistency)
            ? 'Tervalidasi: Aliran tata letak halaman konsisten dengan filter dan statistik berada di atas tabel.'
            : 'Peringatan: Tata letak tidak konsisten. Terdeteksi komponen filter atau kartu statistik diletakkan di bawah tabel data.' };

      // ─── Pilar Tambahan (Pilar 20–27) ──────────────────────────────────────
      case 'architectural_premium_gate':
        return { ...std,
          status: liveAuditResult.premiumFeatureGate == null
            ? std.status  // null = tidak berlaku (bukan modul berbayar), biarkan status lama
            : liveAuditResult.premiumFeatureGate ? 'VERIFIED' as const : 'FAILED' as const,
          details: liveAuditResult.premiumFeatureGate == null
            ? std.details
            : liveAuditResult.premiumFeatureGate
              ? 'Tervalidasi: Halaman dilindungi oleh gerbang lisensi PremiumFeatureGate.'
              : 'Gagal: Halaman ini berada di modul berbayar tetapi belum dipasangi PremiumFeatureGate.' };

      case 'architectural_god_file':
        return { ...std,
          status: safe(liveAuditResult.godFileGuard, true) ? 'VERIFIED' as const : 'WARNING' as const,
          details: safe(liveAuditResult.godFileGuard, true)
            ? 'Tervalidasi: Ukuran berkas kode sumber ringkas dan terkelola secara modular.'
            : 'Peringatan: Berkas terlalu besar (God File). Didekonsolidasi ke beberapa subkomponen.' };

      case 'architectural_hardcoded_configs':
        return { ...std,
          status: safe(liveAuditResult.hardcodedConfig, true) ? 'VERIFIED' as const : 'FAILED' as const,
          details: safe(liveAuditResult.hardcodedConfig, true)
            ? 'Tervalidasi: Bersih dari mock data statis lokal dan URL API ter-hardcode.'
            : 'Gagal: Terdeteksi data tiruan (mock) atau alamat API statis keras di dalam kode.' };

      case 'architectural_analytics_card':
        return { ...std,
          status: safe(liveAuditResult.analyticsCardGuard, true) ? 'VERIFIED' as const : 'FAILED' as const,
          details: safe(liveAuditResult.analyticsCardGuard, true)
            ? 'Tervalidasi: Menggunakan komponen AnalyticsCard terstandarisasi varian premium.'
            : 'Gagal: Kartu statistik kustom lokal terdeteksi. Gunakan AnalyticsCard dari @/components/ui/.' };

      case 'architectural_import_export':
        return { ...std,
          status: safe(liveAuditResult.importExportGuard, true) ? 'VERIFIED' as const : 'FAILED' as const,
          details: safe(liveAuditResult.importExportGuard, true)
            ? 'Tervalidasi: Fitur impor/ekspor data aman dengan loading guard dan penanganan kesalahan.'
            : 'Gagal: Fitur ekspor/impor tanpa loading guard, try-catch, atau generateImportTemplate standar.' };

      case 'architectural_tab_switcher':
        return { ...std,
          status: safe(liveAuditResult.standardTabSwitcher, true) ? 'VERIFIED' as const : 'FAILED' as const,
          details: safe(liveAuditResult.standardTabSwitcher, true)
            ? 'Tervalidasi: Navigasi tab menggunakan komponen standard TabSwitcher.'
            : 'Gagal: Terdeteksi tombol switcher manual. Wajib menggunakan komponen <TabSwitcher />.' };

      // Alias pilar breadcrumbs (ID lama di modul-modul sebelum Pilar 19 distandarisasi)
      case 'architectural_breadcrumbs':
        return { ...std,
          status: safe(liveAuditResult.breadcrumbNavigation, true) ? 'VERIFIED' as const : 'WARNING' as const,
          details: safe(liveAuditResult.breadcrumbNavigation, true)
            ? 'Tervalidasi: Navigasi Breadcrumb terdeteksi pada layout.'
            : 'Peringatan: Halaman tidak melampirkan properti breadcrumbs pada layout.' };

      default:
        return std;
    }
  });
}
