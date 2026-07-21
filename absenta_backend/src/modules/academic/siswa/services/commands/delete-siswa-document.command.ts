import { prisma } from '@/utils/prisma';
import { storageService } from '@/infra/storage/storage.service';

export async function deleteSiswaDocumentCommand(params: {
  tenantId: string;
  siswaId: string;
  documentId: string;
}) {
  const { tenantId, siswaId, documentId } = params;

  const doc = await prisma.siswaDocument.findFirst({
    where: { id: documentId, siswa_id: siswaId, tenant_id: tenantId }
  });

  if (!doc) {
    throw new Error('Dokumen tidak ditemukan');
  }

  // 1. Hapus record database
  await prisma.siswaDocument.delete({
    where: { id: documentId }
  });

  if (doc.kategori === 'FOTO') {
    const student = await prisma.siswa.findUnique({
      where: { id: siswaId },
      select: { foto: true }
    });
    
    const downloadUrl = `/academic/siswa/${siswaId}/documents/${documentId}/download`;
    if (student?.foto === downloadUrl) {
      const nextFoto = await prisma.siswaDocument.findFirst({
        where: { siswa_id: siswaId, kategori: 'FOTO', id: { not: documentId } },
        orderBy: { created_at: 'desc' }
      });
      
      const newUrl = nextFoto ? `/academic/siswa/${siswaId}/documents/${nextFoto.id}/download` : null;
      await prisma.siswa.update({
        where: { id: siswaId },
        data: { foto: newUrl }
      });
    }
  }

  // 2. Hapus file fisik
  try {
    await storageService.delete(doc.file_storage_path);
  } catch (err) {
    console.error(`Failed to delete physical file ${doc.file_storage_path}:`, err);
  }

  return { success: true };
}
