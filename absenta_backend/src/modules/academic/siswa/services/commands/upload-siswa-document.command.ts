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
    where: {
      id: siswaId,
      ...(tenantId && tenantId !== 'system' ? { tenant_id: tenantId } : {})
    }
  });
  if (!student) {
    const notFoundError: any = new Error('Siswa tidak ditemukan');
    notFoundError.statusCode = 404;
    throw notFoundError;
  }

  const effectiveTenantId = student.tenant_id;

  // 2. Simpan file fisik
  const safeName = student.nama_siswa || 'siswa';
  const cleanName = safeName.replace(/[^\w\- ]+/g, '_').replace(/\s+/g, '_').trim();
  const nisSegment = student.nis || 'no-nis';
  const subFolder = `siswa/${nisSegment}_${cleanName}`;

  const stored = await storage.saveFile({
    tenantId: effectiveTenantId,
    category: kategori,
    file,
    subFolder
  });

  // 3. Simpan record di database
  const doc = await prisma.siswaDocument.create({
    data: {
      tenant_id: effectiveTenantId,
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

  if (kategori === 'FOTO') {
    const downloadUrl = `/academic/siswa/${siswaId}/documents/${doc.id}/download`;
    await prisma.siswa.update({
      where: { id: siswaId },
      data: { foto: downloadUrl }
    });
  }

  return doc;
}
