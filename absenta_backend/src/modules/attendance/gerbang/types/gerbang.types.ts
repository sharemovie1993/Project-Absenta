import { JenisTap, AbsensiMode, AbsenStatus } from '@/constants/enums';

// Input interfaces
export interface GerbangTapInput {
  siswa_id?: string | null;
  arah: JenisTap;
  device_id?: string | null;
  rfid?: string | null;
  waktu_tap?: string | Date | null;
  is_offline_sync?: boolean;
}

export interface GerbangTapInputWithMode extends GerbangTapInput {
  attendance_mode?: AbsensiMode;
}

// Response interfaces
export interface GerbangTapResponse {
  success: boolean;
  message: string;
  data?: GerbangTapData;
  metadata?: GerbangTapMetadata;
  error_details?: GerbangErrorDetails;
}

export interface GerbangTapData {
  id: string;
  tenant_id: string;
  sesi_gerbang_id: string;
  siswa_id?: string;
  guru_id?: string;
  arah: JenisTap;
  status: AbsenStatus;
  waktu_tap: Date;
  created_at: Date;
  updated_at: Date;
  // Enhanced data from service
  attendance_mode?: AbsensiMode;
  siswa_info?: {
    id: string;
    nama: string;
    nis?: string | null;
    foto_url?: string | null;
    nama_kelas?: string | null;
  };
  guru_info?: {
    id: string;
    nama: string;
    nip?: string | null;
    jenis_ptk?: string | null;
  };
  session_info?: {
    sesi_gerbang_id: string;
    tanggal: Date;
  };
  tap_info?: {
    arah: JenisTap;
    waktu_tap: Date;
    device_id?: string | null;
    rfid?: string | null;
  };
}

// Metadata interfaces for enhanced responses
export interface GerbangTapMetadata {
  attendance_mode: AbsensiMode;
  mode_features: GerbangModeFeatures;
  integration_status: GerbangIntegrationStatus;
  session_info: GerbangSessionInfo;
  tap_details: GerbangTapDetails;
  processing_info: GerbangProcessingInfo;
}

export interface GerbangModeFeatures {
  simple_mode: boolean;
  multi_sesi_mode: boolean;
  supports_kegiatan_integration: boolean;
}

export interface GerbangIntegrationStatus {
  gerbang_module: 'active' | 'inactive';
  kegiatan_integration: 'enabled' | 'disabled';
  prerequisite_for_kegiatan: boolean;
}

export interface GerbangSessionInfo {
  session_type: 'gerbang_default';
  auto_session_creation: boolean;
  daily_session_scope: boolean;
  supports_multiple_taps: boolean;
}

export interface GerbangTapDetails {
  direction: JenisTap;
  is_entry: boolean;
  is_exit: boolean;
  device_tracked: boolean;
  rfid_tracked: boolean;
}

export interface GerbangProcessingInfo {
  processed_at?: string;
  tenant_id: string;
  user_id: string;
  start_time?: Date;
  end_time?: Date;
  mode?: AbsensiMode;
  validation_steps?: string[];
  processing_steps?: string[];
}

// Error interfaces
export interface GerbangErrorDetails {
  error_type: GerbangErrorType;
  message: string;
  description?: string;
  suggested_action?: string;
  details?: any;
}

export type GerbangErrorType = 
  | 'STUDENT_NOT_FOUND'
  | 'DUPLICATE_TAP'
  | 'TENANT_NOT_FOUND'
  | 'INVALID_DIRECTION'
  | 'VALIDATION_ERROR'
  | 'INTERNAL_SERVER_ERROR';

// Validation interfaces
export interface GerbangValidationErrors {
  siswa_id?: string | null;
  arah?: string | null;
  device_id?: string | null;
  rfid?: string | null;
}

// Mode-specific interfaces
export interface SimpleModeTapData extends GerbangTapData {
  attendance_mode: 'SIMPLE';
}

export interface MultiSesiModeTapData extends GerbangTapData {
  attendance_mode: 'MULTI_SESI';
  kegiatan_integration_context?: {
    enables_kegiatan_attendance: boolean;
    prerequisite_completed: boolean;
    pending_sessions_count: number;
  };
}

export interface FaceVerifyInput {
  siswa_id?: string | null;
  arah: JenisTap;
  image_base64: string;
  embedding?: number[] | null;
  liveness_score?: number | string | null;
}
export interface FaceEnrollInput {
  siswa_id: string;
  image_base64: string;
  embedding?: number[] | null;
  source?: string | null;
  embedding_type?: string | null;
  model_name?: string | null;
}

// Session management interfaces
export interface SesiGerbangInfo {
  id: string;
  tenant_id: string;
  sekolah_id: string;
  tanggal: Date;
  waktu_mulai: Date;
  waktu_selesai: Date;
  created_at: Date;
  updated_at: Date;
}

// Activity log interfaces
export interface GerbangActivityLogMetadata {
  description: string;
  arah: JenisTap;
  siswa_id: string;
  siswa_nama: string;
  attendance_mode: AbsensiMode;
  sesi_gerbang_id: string;
  device_id?: string | null;
  rfid?: string | null;
  processing_timestamp?: string;
  integration_context: {
    supports_kegiatan: boolean;
    prerequisite_for_kegiatan: boolean;
    mode_features?: GerbangModeFeatures;
  };
}

// Service interfaces
export interface GerbangServiceResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: any;
  metadata?: any;
}

// Utility types
export type GerbangDirection = JenisTap.GERBANG_DATANG | JenisTap.GERBANG_PULANG;

export const VALID_GERBANG_DIRECTIONS: GerbangDirection[] = [
  JenisTap.GERBANG_DATANG,
  JenisTap.GERBANG_PULANG
];

// Type guards
export function isValidGerbangDirection(arah: JenisTap): arah is GerbangDirection {
  return VALID_GERBANG_DIRECTIONS.includes(arah as GerbangDirection);
}

export function isSimpleMode(mode: AbsensiMode): mode is 'SIMPLE' {
  return mode === 'SIMPLE';
}

export function isMultiSesiMode(mode: AbsensiMode): mode is 'MULTI_SESI' {
  return mode === 'MULTI_SESI';
}
