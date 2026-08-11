/**
 * memberDocs.api.ts
 * API client untuk Arsip Berkas Warga Sekolah.
 *
 * Siswa: endpoint sudah ada di /api/academic/siswa/:id/documents
 * Guru:  endpoint akan ditambahkan di /api/academic/guru/:id/documents (struktur sama)
 */
import axiosInstance from '@/lib/axiosInstance';
import { requestWithFallback } from './apiUtils';

// ─── Types ────────────────────────────────────────────────────────────────────

export type MemberDocEntityType = 'SISWA' | 'GURU';

export type MemberDocKategori =
  | 'KK'
  | 'IJAZAH_SMP'
  | 'IJAZAH_SD'
  | 'AKTA'
  | 'SKHUN'
  | 'FOTO'
  | 'KTP'
  | 'NISN'
  | 'KIP'
  | 'BPJS'
  | 'SERTIFIKAT'
  | 'SK'
  | 'LAINNYA';

export interface MemberDoc {
  id: string;
  siswa_id?: string;
  guru_id?: string;
  judul: string;
  kategori: MemberDocKategori | string;
  file_original_name: string;
  mime_type: string;
  size_bytes: number;
  uploaded_by_user_id: string | null;
  created_at: string;
  updated_at: string;
  // Joined (populated by backend)
  entity_name?: string;
  entity_photo?: string;
  entity_no_hp?: string;
}

export interface MemberDocListResponse {
  success: boolean;
  data: MemberDoc[];
}

export interface MemberDocUploadResponse {
  success: boolean;
  message: string;
  data: MemberDoc;
}

// ─── Label maps ───────────────────────────────────────────────────────────────

export const KATEGORI_LABELS: Record<MemberDocKategori, string> = {
  KK:          'Kartu Keluarga (KK)',
  IJAZAH_SMP:  'Ijazah SMP',
  IJAZAH_SD:   'Ijazah SD',
  AKTA:        'Akta Kelahiran',
  SKHUN:       'SKHUN',
  FOTO:        'Foto Formal',
  KTP:         'KTP / Identitas',
  NISN:        'Kartu NISN',
  KIP:         'Kartu Indonesia Pintar (KIP)',
  BPJS:        'Kartu Kesehatan / BPJS',
  SERTIFIKAT:  'Sertifikat',
  SK:          'Surat Keterangan',
  LAINNYA:     'Lainnya',
};

export const KATEGORI_OPTIONS = (Object.entries(KATEGORI_LABELS) as [MemberDocKategori, string][]).map(
  ([value, label]) => ({ value, label }),
);

// ─── Utility ──────────────────────────────────────────────────────────────────

import { resolveProfilePhotoUrl } from '@/lib/utils';

/** Kembalikan URL untuk stream/preview berkas secara inline (local & S3) */
export function getMemberDocPreviewUrl(entityType: MemberDocEntityType, entityId: string, docId: string): string {
  const relative = entityType === 'SISWA'
    ? `/api/academic/siswa/${entityId}/documents/${docId}/download`
    : `/api/academic/guru/${entityId}/documents/${docId}/download`;

  return resolveProfilePhotoUrl(relative);
}

/** Format bytes ke string human-readable */
export function formatBytes(bytes: number): string {
  if (bytes < 1024)        return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ─── SISWA endpoints ──────────────────────────────────────────────────────────

export async function listSiswaDocuments(siswaId: string): Promise<MemberDocListResponse> {
  return requestWithFallback<MemberDocListResponse>('get', `/academic/siswa/${siswaId}/documents`, {
    headers: { 'X-Skip-403-Redirect': 'true' },
  });
}

export async function uploadSiswaDocument(params: {
  siswaId: string;
  file: File;
  judul: string;
  kategori: string;
  onProgress?: (pct: number) => void;
}): Promise<MemberDocUploadResponse> {
  const fd = new FormData();
  fd.append('judul', params.judul);
  fd.append('kategori', params.kategori);
  fd.append('file', params.file);

  return requestWithFallback<MemberDocUploadResponse>('post', `/academic/siswa/${params.siswaId}/documents`, {
    data: fd,
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (evt: ProgressEvent) => {
      if (!params.onProgress || !evt.total) return;
      params.onProgress(Math.round((evt.loaded * 100) / evt.total));
    },
  });
}

export async function deleteSiswaDocument(siswaId: string, docId: string): Promise<{ success: boolean }> {
  return requestWithFallback('delete', `/academic/siswa/${siswaId}/documents/${docId}`);
}

// ─── GURU endpoints ───────────────────────────────────────────────────────────

export async function listGuruDocuments(guruId: string): Promise<MemberDocListResponse> {
  return requestWithFallback<MemberDocListResponse>('get', `/academic/guru/${guruId}/documents`, {
    headers: { 'X-Skip-403-Redirect': 'true' },
  });
}

export async function uploadGuruDocument(params: {
  guruId: string;
  file: File;
  judul: string;
  kategori: string;
  onProgress?: (pct: number) => void;
}): Promise<MemberDocUploadResponse> {
  const fd = new FormData();
  fd.append('judul', params.judul);
  fd.append('kategori', params.kategori);
  fd.append('file', params.file);

  return requestWithFallback<MemberDocUploadResponse>('post', `/academic/guru/${params.guruId}/documents`, {
    data: fd,
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (evt: ProgressEvent) => {
      if (!params.onProgress || !evt.total) return;
      params.onProgress(Math.round((evt.loaded * 100) / evt.total));
    },
  });
}

export async function deleteGuruDocument(guruId: string, docId: string): Promise<{ success: boolean }> {
  return requestWithFallback('delete', `/academic/guru/${guruId}/documents/${docId}`);
}

// ─── Cross-entity: list semua berkas (untuk halaman arsip) ───────────────────

export interface AllMemberDocsParams {
  entityType: MemberDocEntityType;
  entityId?: string;   // jika undefined → semua siswa/guru
  kategori?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface AllMemberDocsResponse {
  success: boolean;
  data: Array<MemberDoc & {
    entity_type: MemberDocEntityType;
    entity_id: string;
    entity_name: string;
    entity_no_hp?: string;
  }>;
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

/** Endpoint agregasi semua berkas (akan dibuat di backend) */
export async function listAllMemberDocs(params: AllMemberDocsParams): Promise<AllMemberDocsResponse> {
  return requestWithFallback<AllMemberDocsResponse>('get', '/academic/member-docs', {
    params: {
      entity_type: params.entityType,
      entity_id:   params.entityId,
      kategori:    params.kategori,
      search:      params.search,
      page:        params.page ?? 1,
      limit:       params.limit ?? 20,
    },
    headers: { 'X-Skip-403-Redirect': 'true' },
  });
}

// ─── Notifikasi WA rescan ─────────────────────────────────────────────────────

export async function notifyRescanDoc(params: {
  entityType: MemberDocEntityType;
  entityId: string;
  docId: string;
  pesan?: string;
}): Promise<{ success: boolean; message: string }> {
  return requestWithFallback('post', `/academic/member-docs/${params.docId}/notify-rescan`, {
    data: {
      entity_type: params.entityType,
      entity_id:   params.entityId,
      pesan:       params.pesan,
    },
  });
}
