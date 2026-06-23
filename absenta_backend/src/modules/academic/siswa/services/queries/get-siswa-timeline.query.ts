import { prisma } from '@/utils/prisma';

export async function getSiswaTimelineQuery(params: {
  tenantId: string;
  siswaId: string;
}) {
  const { tenantId, siswaId } = params;

  // 1. Fetch student detail
  const student = await prisma.siswa.findFirst({
    where: { id: siswaId, tenant_id: tenantId },
    include: {
      User: { select: { full_name: true } }
    }
  });

  if (!student) {
    throw new Error('Siswa tidak ditemukan');
  }

  // 2. Fetch violations
  const violations = await prisma.pelanggaranSiswa.findMany({
    where: { siswa_id: siswaId, tenant_id: tenantId },
    orderBy: { tanggal: 'asc' }
  });

  // 3. Fetch documents
  const documents = await prisma.siswaDocument.findMany({
    where: { siswa_id: siswaId, tenant_id: tenantId },
    include: {
      UploadedBy: { select: { full_name: true } }
    },
    orderBy: { created_at: 'asc' }
  });

  // 4. Combine into timeline items
  const items: any[] = [];

  // Add registration entry
  if (student.tanggal_masuk) {
    items.push({
      id: `masuk-${student.id}`,
      tanggal: student.tanggal_masuk,
      tipe: 'STATUS_AKADEMIK',
      judul: 'Siswa Terdaftar / Masuk Sekolah',
      keterangan: `Tanggal masuk resmi: ${student.tanggal_masuk.toISOString().slice(0, 10)}`,
      user_name: 'Sistem'
    });
  }

  // Add violations
  violations.forEach((v) => {
    items.push({
      id: v.id,
      tanggal: v.tanggal,
      tipe: 'PELANGGARAN',
      judul: v.jenis_pelanggaran,
      keterangan: v.keterangan || 'Tidak ada keterangan tambahan.',
      poin: v.poin,
      status: v.status,
      user_name: 'Guru/Kesiswaan' // generic or we can trace later
    });
  });

  // Add documents
  documents.forEach((d) => {
    items.push({
      id: d.id,
      tanggal: d.created_at,
      tipe: 'DOKUMEN',
      judul: d.judul,
      keterangan: `Kategori: ${d.kategori}`,
      kategori_dokumen: d.kategori,
      file_name: d.file_original_name,
      file_url: `/academic/siswa/${siswaId}/documents/${d.id}/download`,
      size_bytes: d.size_bytes,
      user_name: d.UploadedBy?.full_name || 'Staf Sekolah'
    });
  });

  // Add exit entry if exists
  if (student.tanggal_keluar) {
    items.push({
      id: `keluar-${student.id}`,
      tanggal: student.tanggal_keluar,
      tipe: 'STATUS_AKADEMIK',
      judul: `Status Keluar Resmi (${student.status})`,
      keterangan: `Alasan: ${student.alasan_keluar || '-'}`,
      user_name: 'Operator Sekolah'
    });
  }

  // Sort chronologically (oldest first or newest first? Let's sort oldest first so it reads like a history book, or newest first for dashboard. Let's do newest first for dashboard, but let the frontend handle sorting. We will sort desc by tanggal here).
  items.sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime());

  return items;
}

// Simple Helper to truncate string
// Extension for String prototype is avoided. Used inline.
