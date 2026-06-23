import { prisma } from '@/utils/prisma';
import { DocumentStorageService } from '../../../../document-center/services/document-storage.service';
import { MultipartFile } from '@fastify/multipart';

const storage = new DocumentStorageService();

export async function completeSiswaExitCommand(params: {
  tenantId: string;
  siswaId: string;
  status: string; // e.g. KELUAR, PINDAH, DO
  alasan?: string;
  actorUserId?: string;
  file: MultipartFile;
}) {
  const { tenantId, siswaId, status, alasan, actorUserId, file } = params;

  // 1. Fetch student
  const student = await prisma.siswa.findFirst({
    where: { id: siswaId, tenant_id: tenantId }
  });
  if (!student) {
    throw new Error('Siswa tidak ditemukan');
  }

  // 2. Save physical file (Dapodik exit proof)
  const category = 'BUKTI_DAPODIK';
  const stored = await storage.saveFile({
    tenantId,
    category,
    file
  });

  // 3. Execute database updates in a transaction
  const result = await prisma.$transaction(async (tx) => {
    // A. Create document entry
    const doc = await tx.siswaDocument.create({
      data: {
        tenant_id: tenantId,
        siswa_id: siswaId,
        judul: 'Bukti Keluar Dapodik',
        kategori: category,
        file_original_name: stored.originalName,
        file_storage_path: stored.relativePath,
        mime_type: stored.mimeType,
        size_bytes: stored.sizeBytes,
        uploaded_by_user_id: actorUserId || null
      }
    });

    // B. Update student status, dates, and clear RFID
    const updatedStudent = await tx.siswa.update({
      where: { id: siswaId },
      data: {
        status,
        tanggal_keluar: new Date(),
        alasan_keluar: alasan || null,
        no_rfid: null // Deactivate RFID card
      }
    });

    // C. Update active academic registration status (SiswaAkademik)
    const activeYear = await tx.tahunPelajaran.findFirst({
      where: { tenant_id: tenantId, is_active: true },
      select: { id: true }
    });

    if (activeYear) {
      const activeSemester = await tx.semester.findFirst({
        where: {
          tenant_id: tenantId,
          is_active: true,
          tahun_pelajaran_id: activeYear.id
        },
        select: { id: true }
      });

      if (activeSemester) {
        let akademikStatus = 'PINDAH';
        if (status === 'LULUS') {
          akademikStatus = 'LULUS';
        } else if (status === 'AKTIF') {
          akademikStatus = 'AKTIF';
        }

        await tx.siswaAkademik.updateMany({
          where: {
            siswa_id: siswaId,
            tahun_pelajaran_id: activeYear.id,
            semester_id: activeSemester.id
          },
          data: {
            status: akademikStatus as any
          }
        });
      }
    }

    // D. Deactivate student's User login account
    if (student.user_id) {
      await tx.user.update({
        where: { id: student.user_id },
        data: { status: 'INACTIVE' }
      });
    }

    return { student: updatedStudent, document: doc };
  });

  return result;
}
