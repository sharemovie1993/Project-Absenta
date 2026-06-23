import { prisma } from '@/utils/prisma';
import { DocumentStorageService } from '../../../../document-center/services/document-storage.service';
import { MultipartFile } from '@fastify/multipart';

const storage = new DocumentStorageService();

export async function uploadSiswaDocumentCommand(params: {
  tenantId: string;
  siswaId: string;
  judul: string;
  kategori: string;
  actorUserId?: string;
  file: MultipartFile;
}) {
  const { tenantId, siswaId, judul, kategori, actorUserId, file } = params;

  // 1. Validasi Siswa
  const student = await prisma.siswa.findFirst({
    where: { id: siswaId, tenant_id: tenantId }
  });
  if (!student) {
    throw new Error('Siswa tidak ditemukan');
  }

  // 2. Simpan file fisik
  const stored = await storage.saveFile({
    tenantId,
    category: kategori,
    file
  });

  // 3. Simpan record di database
  const doc = await prisma.siswaDocument.create({
    data: {
      tenant_id: tenantId,
      siswa_id: siswaId,
      judul,
      kategori,
      file_original_name: stored.originalName,
      file_storage_path: stored.relativePath,
      mime_type: stored.mimeType,
      size_bytes: stored.sizeBytes,
      uploaded_by_user_id: actorUserId || null
    }
  });

  return doc;
}
