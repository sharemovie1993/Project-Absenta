import { prisma } from '@/utils/prisma';

export async function getSiswaTimelineQuery(params: {
  tenantId: string;
  siswaId: string;
  userContext?: { id: string; capabilities: string[] };
}) {
  const { tenantId, siswaId, userContext } = params;

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

  // 1.5. Calculate visibility context
  let hasSensitive = true;
  let isWali = true;

  if (userContext) {
    hasSensitive = userContext.capabilities.includes('bk.counseling.view.sensitive') ||
                   userContext.capabilities.includes('system.platform.full_access');
    
    const assignment = await prisma.organizationalAssignment.findFirst({
      where: {
        tenant_id: tenantId,
        user_id: userContext.id,
        kelas_id: student.kelas_id,
        is_active: true,
        Position: { code: 'WALIKELAS' }
      }
    });
    isWali = !!assignment;
  }

  const filterByVisibility = <T extends { visibility?: string }>(items: T[]): T[] => {
    return items.filter(item => {
      const vis = item.visibility || 'PUBLIC';
      if (vis === 'SENSITIVE') return hasSensitive;
      if (vis === 'LIMITED') return hasSensitive || isWali;
      return true;
    });
  };

  // 2. Fetch all timeline sources in parallel
  const [
    violations,
    documents,
    achievements,
    counselings,
    summons,
    homeVisits,
    assessments,
    referrals,
    academicHistory
  ] = await Promise.all([
    prisma.pelanggaranSiswa.findMany({
      where: { siswa_id: siswaId, tenant_id: tenantId },
      orderBy: { tanggal: 'asc' }
    }),
    prisma.siswaDocument.findMany({
      where: { siswa_id: siswaId, tenant_id: tenantId },
      include: { UploadedBy: { select: { full_name: true } } },
      orderBy: { created_at: 'asc' }
    }),
    prisma.prestasiSiswa.findMany({
      where: { siswa_id: siswaId, tenant_id: tenantId },
      orderBy: { tanggal: 'asc' }
    }),
    prisma.konselingSiswa.findMany({
      where: { siswa_id: siswaId, tenant_id: tenantId },
      include: { Petugas: { select: { full_name: true } } },
      orderBy: { tanggal: 'asc' }
    }),
    prisma.pemanggilanOrangTua.findMany({
      where: { siswa_id: siswaId, tenant_id: tenantId },
      include: { Dokumen: true },
      orderBy: { tanggal_pemanggilan: 'asc' }
    }),
    prisma.homeVisit.findMany({
      where: { siswa_id: siswaId, tenant_id: tenantId },
      include: { Dokumen: true },
      orderBy: { tanggal: 'asc' }
    }),
    prisma.asesmenSiswa.findMany({
      where: { siswa_id: siswaId, tenant_id: tenantId },
      include: { Dokumen: true },
      orderBy: { tanggal: 'asc' }
    }),
    prisma.rujukanKasus.findMany({
      where: { siswa_id: siswaId, tenant_id: tenantId },
      orderBy: { tanggal: 'asc' }
    }),
    prisma.siswaAkademik.findMany({
      where: { siswa_id: siswaId },
      include: {
        kelas: { select: { nama_kelas: true } },
        tahunPelajaran: { select: { tahun: true } },
        semester: { select: { nama_semester: true } }
      },
      orderBy: { created_at: 'asc' }
    })
  ]);

  // Filter BK items by visibility
  const filteredCounselings = filterByVisibility(counselings);
  const filteredSummons = filterByVisibility(summons);
  const filteredHomeVisits = filterByVisibility(homeVisits);
  const filteredAssessments = filterByVisibility(assessments);
  const filteredReferrals = filterByVisibility(referrals);

  // 3. Combine into timeline items
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
      user_name: 'Guru/Kesiswaan'
    });
  });

  // Add achievements
  achievements.forEach((a) => {
    items.push({
      id: a.id,
      tanggal: a.tanggal,
      tipe: 'PRESTASI',
      judul: `Prestasi: ${a.nama_prestasi}`,
      keterangan: a.keterangan || 'Tidak ada keterangan tambahan.',
      poin: a.poin,
      user_name: 'Guru/BK'
    });
  });

  // Add counselings
  filteredCounselings.forEach((c) => {
    items.push({
      id: c.id,
      tanggal: c.tanggal,
      tipe: 'KONSELING',
      judul: `Konseling ${c.tipe}`,
      keterangan: `Masalah: ${c.masalah}\nSolusi: ${c.solusi || '-'}`,
      status: c.status,
      user_name: c.Petugas?.full_name || 'Guru BK'
    });
  });

  // Add summons
  filteredSummons.forEach((s) => {
    items.push({
      id: s.id,
      tanggal: s.tanggal_pemanggilan,
      tipe: 'PEMANGGILAN',
      judul: 'Pemanggilan Orang Tua',
      keterangan: `Alasan: ${s.alasan}\nStatus: ${s.status}`,
      file_name: s.Dokumen?.file_original_name,
      file_url: s.Dokumen ? `/academic/siswa/${siswaId}/documents/${s.Dokumen.id}/download` : undefined,
      document_id: s.Dokumen?.id,
      user_name: 'Guru BK'
    });
  });

  // Add home visits
  filteredHomeVisits.forEach((h) => {
    items.push({
      id: h.id,
      tanggal: h.tanggal,
      tipe: 'HOME_VISIT',
      judul: 'Home Visit',
      keterangan: `Alasan: ${h.alasan}\nHasil: ${h.hasil || '-'}`,
      file_name: h.Dokumen?.file_original_name,
      file_url: h.Dokumen ? `/academic/siswa/${siswaId}/documents/${h.Dokumen.id}/download` : undefined,
      document_id: h.Dokumen?.id,
      user_name: 'Guru BK'
    });
  });

  // Add assessments
  filteredAssessments.forEach((a) => {
    items.push({
      id: a.id,
      tanggal: a.tanggal,
      tipe: 'ASESMEN',
      judul: `Asesmen: ${a.nama_asesmen}`,
      keterangan: `Skor/Hasil: ${a.hasil_skor || '-'}\nKeterangan: ${a.keterangan || '-'}`,
      file_name: a.Dokumen?.file_original_name,
      file_url: a.Dokumen ? `/academic/siswa/${siswaId}/documents/${a.Dokumen.id}/download` : undefined,
      document_id: a.Dokumen?.id,
      user_name: 'Guru BK'
    });
  });

  // Add referrals
  filteredReferrals.forEach((r) => {
    items.push({
      id: r.id,
      tanggal: r.tanggal,
      tipe: 'RUJUKAN',
      judul: `Rujukan Kasus ke ${r.rujukan_ke}`,
      keterangan: `Alasan: ${r.alasan}\nStatus: ${r.status}`,
      user_name: 'Guru BK'
    });
  });

  // Collect all document IDs that are already linked to prevent duplication
  const linkedDocIds = new Set<string>();
  summons.forEach(s => { if (s.Dokumen?.id) linkedDocIds.add(s.Dokumen.id); });
  homeVisits.forEach(h => { if (h.Dokumen?.id) linkedDocIds.add(h.Dokumen.id); });
  assessments.forEach(a => { if (a.Dokumen?.id) linkedDocIds.add(a.Dokumen.id); });

  // Add documents (exclude ones already linked to events)
  documents.forEach((d) => {
    if (linkedDocIds.has(d.id)) return;
    
    items.push({
      id: d.id,
      tanggal: d.created_at,
      tipe: 'DOKUMEN',
      judul: d.judul,
      keterangan: `Kategori: ${d.kategori}`,
      kategori_dokumen: d.kategori,
      file_name: d.file_original_name,
      file_url: `/academic/siswa/${siswaId}/documents/${d.id}/download`,
      document_id: d.id,
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

  // Add academic history entries (classes and semesters)
  academicHistory.forEach((ah) => {
    items.push({
      id: `akademik-${ah.id}`,
      tanggal: ah.created_at,
      tipe: 'STATUS_AKADEMIK',
      judul: `Penempatan Kelas: ${ah.kelas?.nama_kelas || '-'}`,
      keterangan: `Tahun Pelajaran: ${ah.tahunPelajaran?.tahun || '-'} | Semester: ${ah.semester?.nama_semester || '-'} | Status Keaktifan: ${ah.status}`,
      user_name: 'Sistem Akademik'
    });
  });

  // Sort chronologically (newest first)
  items.sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime());

  return items;
}

// Simple Helper to truncate string
// Extension for String prototype is avoided. Used inline.
