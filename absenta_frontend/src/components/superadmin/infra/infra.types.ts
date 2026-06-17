// ─── INFRA TYPES ──────────────────────────────────────────────────────────────
// File ini hanya berisi type/interface — tidak ada import React.

export type JobHealth = 'ok' | 'stale' | 'never' | 'stuck';

export type GradeInfo = {
  letter: string;
  badgeText: string;
  badgeClass: string;
  pingClass: string;
  pingDotClass: string;
  ringClass: string;
  ringPulse: string;
  headerGlow: string; // warna header modal adaptif
};

// ② Typed interface untuk live audit result (ganti `any`)
export interface LiveAuditResult {
  usesLayout: boolean;
  usesUiComponents?: boolean;
  safeMapping: boolean;
  usesMemo: boolean;
  noAnyType: boolean;
  safeEffect: boolean;
  strictColors: boolean;
  tableSorting: boolean | undefined;
  emptyState: boolean | undefined;
  loadingGuard: boolean | undefined;
  formA11y: boolean | undefined;
  performanceOptimization: boolean | undefined;
  userGuidance: boolean | undefined;
  tablePagination: boolean | undefined;
  standardToolbar: boolean | undefined;
  standardFeedback: boolean | undefined;
  standardContainer: boolean | undefined;
  advancedSelect: boolean | undefined;
  tableToolbar: boolean | undefined;
  issues: string[];
  refactorPrompt: string;
}

export interface HardeningInspectorProps {
  pageName: string;
  standards: {
    id: string;
    name: string;
    description: string;
    status: 'VERIFIED' | 'WARNING' | 'FAILED';
    details: string;
  }[];
  moduleKey?: string;
}

export interface LighthouseResult {
  performance: number;
  accessibility: number;
  bestPractices: number;
  seo: number;
  metrics: {
    lcp: string;
    cls: string;
    tbt: string;
    speedIndex: string;
  };
  suggestions: {
    category: string;
    title: string;
    description: string;
    displayValue: string;
  }[];
}
