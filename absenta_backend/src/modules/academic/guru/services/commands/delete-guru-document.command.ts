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

  if (doc.kategori === 'FOTO') {
    const teacher = await prisma.guru.findUnique({
      where: { id: guruId },
      select: { foto: true }
    });
    
    const downloadUrl = `/academic/guru/${guruId}/documents/${documentId}/download`;
    if (teacher?.foto === downloadUrl) {
      const nextFoto = await prisma.guruDocument.findFirst({
        where: { guru_id: guruId, kategori: 'FOTO', id: { not: documentId } },
        orderBy: { created_at: 'desc' }
      });
      
      const newUrl = nextFoto ? `/academic/guru/${guruId}/documents/${nextFoto.id}/download` : null;
      await prisma.guru.update({
        where: { id: guruId },
        data: { foto: newUrl }
      });
    }
  }

  // 3. Hapus file fisik dari storage
  try {
    await storageService.delete(doc.file_storage_path);
  } catch (err) {
    console.error(`Failed to delete physical file at ${doc.file_storage_path}:`, err);
  }

  return true;
}
