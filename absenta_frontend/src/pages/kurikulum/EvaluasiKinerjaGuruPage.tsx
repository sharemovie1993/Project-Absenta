import React from 'react';
import {
  EvaluasiKinerjaGuruView,
  type UniversalEvaluasiKinerjaGuruViewProps,
  type TeacherEvaluationRecord,
  type EvaluasiPillarScores,
  type EvaluasiMetrics,
} from '@/components/kurikulum/evaluasi-kinerja';

export type {
  UniversalEvaluasiKinerjaGuruViewProps,
  TeacherEvaluationRecord,
  EvaluasiPillarScores,
  EvaluasiMetrics,
};

/**
 * EvaluasiKinerjaGuruPage - Thin Wrapper Page
 * Menggunakan Universal Role-Ready View (DRY Pattern)
 */
export const EvaluasiKinerjaGuruPage: React.FC = React.memo(() => {
  return <EvaluasiKinerjaGuruView />;
});

EvaluasiKinerjaGuruPage.displayName = 'EvaluasiKinerjaGuruPage';

export default EvaluasiKinerjaGuruPage;
