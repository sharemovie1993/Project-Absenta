import { prisma } from '@/utils/prisma';
import { storageService } from '@/infra/storage/storage.service';

export async function deleteGuruDocumentCommand(params: {
  tenantId: string;
  guruId: string;
  documentId: string;
}) {
  const { tenantId, guruId, documentId } = params;

  // 1. Cari dokumen
  const doc = await prisma.guruDocument.findFirst({
    where: { id: documentId, guru_id: guruId, tenant_id: tenantId }
  });
  if (!doc) {
    throw new Error('Dokumen tidak ditemukan');
  }

  // 2. Hapus record dari database terlebih dahulu
  await prisma.guruDocument.delete({
    where: { id: documentId }
  });

  // 3. Hapus file fisik dari storage
  try {
    await storageService.delete(doc.file_storage_path);
  } catch (err) {
    console.error(`Failed to delete physical file at ${doc.file_storage_path}:`, err);
  }

  return true;
}
