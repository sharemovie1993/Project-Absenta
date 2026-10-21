import type React from 'react';
import type { SearchableSelectOption } from '@/components/ui/SearchableSelect';
import type { CohortLineageStage } from '@/api/attendanceGerbang.api';

export interface AcademicFilterValues {
  tahunPelajaranId: string;
  semesterId: string;
  tingkat: number | '';
  kelasId: string;
  mapelId: string;
  bulan: string;
  tanggal: string;
  guruId: string;
  siswaId: string;
  searchQuery: string;
}

export interface UseAcademicFilterOptions {
  // Feature flags
  enableTp?: boolean;
  enableSemester?: boolean;
  enableTingkat?: boolean;
  enableKelas?: boolean;
  enableCohort?: boolean;
  enableMapel?: boolean;
  enableBulan?: boolean;
  enableTanggal?: boolean;
  enableGuru?: boolean;
  enableSiswa?: boolean;
  enableSearch?: boolean;

  // Initial values
  initialTpId?: string;
  initialSemesterId?: string;
  initialTingkat?: number | '';
  initialKelasId?: string;
  initialMapelId?: string;
  initialBulan?: string;
  initialTanggal?: string;
  initialGuruId?: string;
  initialSiswaId?: string;
  initialSearch?: string;

  // Scope & constraints
  jurusanId?: string;
  searchDebounceMs?: number;

  // Callbacks
  onFilterChange?: (values: AcademicFilterValues) => void;
  onTpChange?: (newTpId: string) => void;
  onKelasChange?: (newKelasId: string) => void;
  onMapelChange?: (newMapelId: string) => void;
}

export interface UseAcademicFilterReturn {
  // Current values
  values: AcademicFilterValues;
  debouncedSearchQuery: string;

  // Setters
  setTahunPelajaranId: (id: string) => void;
  setSemesterId: (id: string) => void;
  setTingkat: (tingkat: number | '') => void;
  setKelasId: (id: string) => void;
  setMapelId: (id: string) => void;
  setBulan: (bulan: string) => void;
  setTanggal: (tanggal: string) => void;
  setGuruId: (id: string) => void;
  setSiswaId: (id: string) => void;
  setSearchQuery: (query: string) => void;
  resetFilters: () => void;

  // Handlers
  handleTpChange: (newTpId: string) => void;
  handleKelasChange: (newKelasId: string) => void;
  handleMapelChange: (newMapelId: string) => void;
  handleJumpCohortStage: (stage: CohortLineageStage) => void;

  // Options for Dropdowns
  tpOptions: SearchableSelectOption[];
  semesterOptions: SearchableSelectOption[];
  tingkatOptions: SearchableSelectOption[];
  kelasOptions: SearchableSelectOption[];
  mapelOptions: SearchableSelectOption[];
  guruOptions: SearchableSelectOption[];
  siswaOptions: SearchableSelectOption[];

  // Loading states
  isLoadingTp: boolean;
  isLoadingSem: boolean;
  isLoadingKelas: boolean;
  isLoadingMapel: boolean;
  isLoadingGuru: boolean;
  isLoadingSiswa: boolean;
  isLoadingCohort: boolean;

  // Derived objects & Cohort Lineage
  activeTpYear: { id: string; tahun: string; nama?: string; is_active?: boolean } | null;
  activeSemester: { id: string; nama_semester: string; is_active: boolean } | null;
  selectedKelasLabel: string;
  selectedMapelLabel: string;
  cohortStages: CohortLineageStage[];
  suggestedStage: CohortLineageStage | null;
  jenjang?: string;
  isJenjangSmk?: boolean;

  // Props ready to spread directly into <AcademicFilterToolbar />
  toolbarProps: AcademicFilterToolbarProps;
}

export interface AcademicFilterToolbarProps {
  // Feature flags
  enableTp?: boolean;
  enableSemester?: boolean;
  enableTingkat?: boolean;
  enableKelas?: boolean;
  enableCohort?: boolean;
  enableMapel?: boolean;
  enableBulan?: boolean;
  enableTanggal?: boolean;
  enableGuru?: boolean;
  enableSiswa?: boolean;
  enableSearch?: boolean;

  // Values
  values: AcademicFilterValues;

  // Setters
  setTahunPelajaranId: (id: string) => void;
  setSemesterId: (id: string) => void;
  setTingkat: (tingkat: number | '') => void;
  setKelasId: (id: string) => void;
  setMapelId: (id: string) => void;
  setBulan: (bulan: string) => void;
  setTanggal: (tanggal: string) => void;
  setGuruId: (id: string) => void;
  setSiswaId: (id: string) => void;
  setSearchQuery: (query: string) => void;

  // Options
  tpOptions: SearchableSelectOption[];
  semesterOptions: SearchableSelectOption[];
  tingkatOptions: SearchableSelectOption[];
  kelasOptions: SearchableSelectOption[];
  mapelOptions: SearchableSelectOption[];
  guruOptions: SearchableSelectOption[];
  siswaOptions: SearchableSelectOption[];

  // Loading
  isLoadingTp?: boolean;
  isLoadingSem?: boolean;
  isLoadingKelas?: boolean;
  isLoadingMapel?: boolean;
  isLoadingGuru?: boolean;
  isLoadingSiswa?: boolean;
  isLoadingCohort?: boolean;

  // Cohort Lineage
  cohortStages?: CohortLineageStage[];
  suggestedStage?: CohortLineageStage | null;
  onJumpCohortStage?: (stage: CohortLineageStage) => void;

  // Standard CRUD / Action buttons
  onAdd?: () => void;
  addLabel?: string;
  onImport?: () => void;
  importLabel?: string;
  onExportExcel?: () => void;
  onExportPdf?: () => void;

  // Custom slots
  actionsLeft?: React.ReactNode;
  actionsRight?: React.ReactNode;
  bottomContent?: React.ReactNode;
  children?: React.ReactNode;

  // Presentation variants
  variant?: 'card' | 'plain' | 'compact';
  className?: string;
  searchPlaceholder?: string;
}
