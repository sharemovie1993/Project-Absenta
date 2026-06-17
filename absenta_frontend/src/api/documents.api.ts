import axiosInstance, { resolvePublicApiBaseUrl } from '@/lib/axiosInstance';
import { requestWithFallback } from './apiUtils';

export type DocumentCategory = 'ADMINISTRATIVE' | 'BILLING' | 'LEGAL' | 'MANUAL' | 'OTHER';
export type DocumentAction = 'UPLOAD' | 'DOWNLOAD' | 'DELETE';

export interface DocumentItem {
  id: string;
  tenant_id: string | null;
  title: string;
  category: DocumentCategory;
  description: string | null;
  file_original_name: string;
  mime_type: string;
  size_bytes: number;
  current_version: number;
  is_active: boolean;
  created_by_user_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface DocumentListResponse {
  success: boolean;
  message: string;
  data: DocumentItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface DocumentUploadResponse {
  success: boolean;
  message: string;
  data: DocumentItem;
}

export interface DocumentUpdatePayload {
  title?: string;
  category?: DocumentCategory;
  description?: string | null;
}

export interface DocumentUpdateResponse {
  success: boolean;
  message: string;
  data: DocumentItem;
}

export interface DocumentDeleteResponse {
  success: boolean;
  message: string;
  data: DocumentItem;
}

export interface DocumentActivityItem {
  id: string;
  document_id: string;
  action: DocumentAction;
  actor_user_id: string | null;
  actor_tenant_id: string | null;
  created_at: string;
  Document: {
    id: string;
    title: string;
    category: DocumentCategory;
    tenant_id: string | null;
  };
  ActorUser: {
    id: string;
    full_name: string;
    email: string;
  } | null;
}

export interface DocumentActivityListResponse {
  success: boolean;
  message: string;
  data: DocumentActivityItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export async function listDocuments(params?: {
  page?: number;
  limit?: number;
  category?: DocumentCategory | string;
  search?: string;
  is_active?: boolean;
}): Promise<DocumentListResponse> {
  return requestWithFallback<DocumentListResponse>('get', '/documents', {
    params: {
      page: params?.page,
      limit: params?.limit,
      category: params?.category,
      search: params?.search,
      is_active: typeof params?.is_active === 'boolean' ? String(params.is_active) : undefined,
    },
    headers: { 'X-Skip-403-Redirect': 'true' },
  });
}

export async function listDocumentActivities(params?: {
  tenant_id?: string;
  document_id?: string;
  actor_user_id?: string;
  action?: DocumentAction | string;
  date_from?: string;
  date_to?: string;
  page?: number;
  limit?: number;
}): Promise<DocumentActivityListResponse> {
  return requestWithFallback<DocumentActivityListResponse>('get', '/documents/activities', {
    params: {
      tenant_id: params?.tenant_id,
      document_id: params?.document_id,
      actor_user_id: params?.actor_user_id,
      action: params?.action,
      date_from: params?.date_from,
      date_to: params?.date_to,
      page: params?.page,
      limit: params?.limit,
    },
    headers: { 'X-Skip-403-Redirect': 'true' },
  });
}

export async function uploadDocument(payload: {
  file: File;
  title: string;
  category: DocumentCategory;
  description?: string;
  onProgress?: (percent: number) => void;
}): Promise<DocumentUploadResponse> {
  const formData = new FormData();
  formData.append('file', payload.file);
  formData.append('title', payload.title);
  formData.append('category', payload.category);
  if (typeof payload.description !== 'undefined') formData.append('description', payload.description);

  return requestWithFallback<DocumentUploadResponse>('post', '/documents', {
    data: formData,
    headers: { 'Content-Type': 'multipart/form-data', 'X-Skip-403-Redirect': 'true' },
    onUploadProgress: (evt: any) => {
      if (!payload.onProgress) return;
      const total = Number(evt?.total || 0);
      const loaded = Number(evt?.loaded || 0);
      if (total > 0) payload.onProgress(Math.round((loaded * 100) / total));
    },
  });
}

export async function updateDocumentMetadata(id: string, payload: DocumentUpdatePayload): Promise<DocumentUpdateResponse> {
  return requestWithFallback<DocumentUpdateResponse>('patch', `/documents/${encodeURIComponent(id)}`, {
    data: payload,
    headers: { 'X-Skip-403-Redirect': 'true' },
  });
}

export async function softDeleteDocument(id: string): Promise<DocumentDeleteResponse> {
  return requestWithFallback<DocumentDeleteResponse>('delete', `/documents/${encodeURIComponent(id)}`, {
    headers: { 'X-Skip-403-Redirect': 'true' },
  });
}

function parseFilenameFromContentDisposition(raw: string | undefined): string | null {
  if (!raw) return null;
  const value = String(raw);
  const matchStar = value.match(/filename\*\s*=\s*UTF-8''([^;]+)/i);
  if (matchStar?.[1]) {
    try {
      return decodeURIComponent(matchStar[1].trim());
    } catch {
      return matchStar[1].trim();
    }
  }
  const match = value.match(/filename\s*=\s*"([^"]+)"/i) || value.match(/filename\s*=\s*([^;]+)/i);
  if (!match?.[1]) return null;
  return match[1].trim().replace(/^"|"$/g, '');
}

export async function downloadDocumentFile(id: string): Promise<{ blob: Blob; filename: string }> {
  const res = await axiosInstance.get(`/documents/${encodeURIComponent(id)}/download`, {
    responseType: 'blob',
    headers: { 'X-Skip-403-Redirect': 'true' },
  });
  const cd = String((res.headers as any)?.['content-disposition'] || '');
  const filename = parseFilenameFromContentDisposition(cd) || 'document';
  return { blob: res.data as Blob, filename };
}

export interface DocumentSignedUrlResponse {
  success: boolean;
  message: string;
  data: {
    token: string;
    expires_at: string;
  };
}

export async function createDocumentSignedUrl(
  id: string,
  params?: { version?: number }
): Promise<{ download_url: string; expires_at: string }> {
  const res = await requestWithFallback<DocumentSignedUrlResponse>('get', `/documents/${encodeURIComponent(id)}/signed-url`, {
    params: typeof params?.version === 'number' ? { version: params.version } : undefined,
    headers: { 'X-Skip-403-Redirect': 'true' },
  });
  const token = String(res?.data?.token || '').trim();
  const expires_at = String(res?.data?.expires_at || '').trim();
  if (!token) {
    throw new Error(res?.message || 'Signed URL token tidak tersedia');
  }
  const apiRoot = String(resolvePublicApiBaseUrl() || '').replace(/\/+$/, '');
  const t = encodeURIComponent(token);
  const download_url = `${apiRoot}/documents/public/${t}/download`;
  return { download_url, expires_at };
}

export interface DocumentVersionItem {
  id: string;
  document_id: string;
  version: number;
  file_original_name: string;
  mime_type: string;
  size_bytes: number;
  created_by_user_id: string | null;
  created_at: string;
}

export interface DocumentVersionListResponse {
  success: boolean;
  message: string;
  data: DocumentVersionItem[];
}

export async function listDocumentVersions(id: string): Promise<DocumentVersionListResponse> {
  return requestWithFallback<DocumentVersionListResponse>('get', `/documents/${encodeURIComponent(id)}/versions`, {
    headers: { 'X-Skip-403-Redirect': 'true' },
  });
}

export interface DocumentUploadVersionResponse {
  success: boolean;
  message: string;
  data: DocumentItem;
}

export async function uploadDocumentVersion(payload: {
  id: string;
  file: File;
  onProgress?: (percent: number) => void;
}): Promise<DocumentUploadVersionResponse> {
  const formData = new FormData();
  formData.append('file', payload.file);

  return requestWithFallback<DocumentUploadVersionResponse>('post', `/documents/${encodeURIComponent(payload.id)}/versions`, {
    data: formData,
    headers: { 'Content-Type': 'multipart/form-data', 'X-Skip-403-Redirect': 'true' },
    onUploadProgress: (evt: any) => {
      if (!payload.onProgress) return;
      const total = Number(evt?.total || 0);
      const loaded = Number(evt?.loaded || 0);
      if (total > 0) payload.onProgress(Math.round((loaded * 100) / total));
    },
  });
}

export interface GenerateMouPayload {
  title?: string;
  description?: string;
  tanggal?: string;
  nomor?: string;
  pihak_kedua_nama?: string;
  pihak_kedua_alamat?: string;
}

export interface GenerateMouResponse {
  success: boolean;
  message: string;
  data: DocumentItem;
}

export async function generateMouDocument(payload: GenerateMouPayload): Promise<GenerateMouResponse> {
  return requestWithFallback<GenerateMouResponse>('post', '/documents/mou', {
    data: payload,
    headers: { 'X-Skip-403-Redirect': 'true' },
  });
}
