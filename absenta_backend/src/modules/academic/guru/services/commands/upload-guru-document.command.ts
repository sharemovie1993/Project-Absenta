import { prisma } from '@/utils/prisma';
import { DocumentStorageService } from '../../../../document-center/services/document-storage.service';
import { MultipartFile } from '@fastify/multipart';

const storage = new DocumentStorageService();

export async function uploadGuruDocumentCommand(params: {
  tenantId: string;
  guruId: string;
  judul: string;
  kategori: string;
  actorUserId?: string;
  file: MultipartFile;
}) {
  const { tenantId, guruId, judul, kategori, actorUserId, file } = params;

  // 1. Validasi Guru
  const teacher = await prisma.guru.findFirst({
    where: { id: guruId, tenant_id: tenantId }
  });
  if (!teacher) {
    throw new Error('Guru tidak ditemukan');
  }

  // 2. Simpan file fisik
  const cleanName = teacher.nama_guru.replace(/[^\w\- ]+/g, '_').replace(/\s+/g, '_').trim();
  const nipSegment = teacher.nip || 'no-nip';
  const subFolder = `guru/${nipSegment}_${cleanName}`;

  const stored = await storage.saveFile({
    tenantId,
    category: kategori,
    file,
    subFolder
  });

  // 3. Simpan record di database
  const doc = await prisma.guruDocument.create({
    data: {
      tenant_id: tenantId,
      guru_id: guruId,
      judul,
      kategori,
      file_original_name: stored.originalName,
      file_storage_path: stored.relativePath,
      mime_type: stored.mimeType,
      size_bytes: stored.sizeBytes,
      uploaded_by_user_id: actorUserId || null
    }
  });

  if (kategori === 'FOTO') {
    const downloadUrl = `/academic/guru/${guruId}/documents/${doc.id}/download`;
    await prisma.guru.update({
      where: { id: guruId },
      data: { foto: downloadUrl }
    });
  }

  return doc;
}
