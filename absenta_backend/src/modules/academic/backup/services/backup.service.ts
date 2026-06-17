
import { prisma } from '../../../../utils/prisma';

export const backupService = {
  async exportData(tenantId: string) {
    // Fetch all relevant academic data for the tenant
    const [
      sekolah,
      tahunPelajaran,
      semester,
      jurusan,
      kelas,
      mapel,
      guru,
      siswa,

      guruMapel,
      kelasMapel,
      siswaAkademik,
      jenisKegiatanMaster,
      organizationalPositions,
      organizationalAssignments,
      organizationalCapabilities,
      jadwalTemplate,
      pelanggaranSiswa,
      supervisiGuru
    ] = await Promise.all([
      prisma.sekolah.findMany({ where: { tenant_id: tenantId } }),
      prisma.tahunPelajaran.findMany({ where: { tenant_id: tenantId } }),
      prisma.semester.findMany({ where: { tenant_id: tenantId } }),
      prisma.jurusan.findMany({ where: { tenant_id: tenantId } }),
      prisma.kelas.findMany({ where: { tenant_id: tenantId } }),
      prisma.mapel.findMany({ where: { tenant_id: tenantId } }),
      prisma.guru.findMany({ where: { tenant_id: tenantId } }),
      prisma.siswa.findMany({ where: { tenant_id: tenantId } }),

      prisma.guruMapel.findMany({ where: { tenant_id: tenantId } }),
      prisma.kelasMapel.findMany({ where: { tenant_id: tenantId } }),
      prisma.siswaAkademik.findMany({ 
        where: { 
          siswa: { tenant_id: tenantId } 
        } 
      }),
      prisma.jenisKegiatanMaster.findMany({ where: { tenant_id: tenantId } }),
      prisma.organizationalPosition.findMany({ where: { tenant_id: tenantId } }),
      prisma.organizationalAssignment.findMany({ where: { tenant_id: tenantId } }),
      prisma.organizationalCapability.findMany({
        where: { Position: { tenant_id: tenantId } },
      }),
      prisma.jadwalTemplate.findMany({ where: { tenant_id: tenantId } }),
      prisma.pelanggaranSiswa.findMany({ where: { tenant_id: tenantId } }),
      prisma.supervisiGuru.findMany({ where: { tenant_id: tenantId } }),
    ]);

    return {
      version: '1.0',
      timestamp: new Date().toISOString(),
      tenantId,
      data: {
        sekolah,
        tahunPelajaran,
        semester,
        jurusan,
        kelas,
        mapel,
        guru,
        siswa,

        guruMapel,
        kelasMapel,
        siswaAkademik,
        jenisKegiatanMaster,
        organizationalPositions,
        organizationalAssignments,
        organizationalCapabilities,
        jadwalTemplate,
        pelanggaranSiswa,
        supervisiGuru
      }
    };
  },

  async importData(tenantId: string, backupData: any) {
    if (!backupData || !backupData.data) {
      throw new Error('Invalid backup data format');
    }

    const {
      sekolah,
      tahunPelajaran,
      semester,
      jurusan,
      kelas,
      mapel,
      guru,
      siswa,

      guruMapel,
      kelasMapel,
      siswaAkademik,
      jenisKegiatanMaster,
      organizationalPositions,
      organizationalAssignments,
      organizationalCapabilities,
      jadwalTemplate,
      pelanggaranSiswa,
      supervisiGuru
    } = backupData.data;

    // Helper to sanitize array data for createMany
    const sanitize = (data: any[]) => {
      if (!data || !Array.isArray(data)) return [];
      return data.map(item => {
        // Remove fields that might cause issues or shouldn't be imported strictly as is if needed
        // For now, we assume schema matches. 
        // We ensure tenant_id matches the target tenant to prevent cross-tenant injection
        // although usually we want to restore to the same tenant.
        return { ...item, tenant_id: tenantId };
      });
    };

    const sanitizeWithUpdatedAt = (data: any[]) => {
      return sanitize(data).map((item) => ({
        ...item,
        updated_at: item.updated_at ? new Date(item.updated_at) : new Date(),
      }));
    };

    // Transactional import to ensure order and consistency
    // We use createMany with skipDuplicates to restore missing records.
    // NOTE: This does NOT update existing records.
    
    // Track import counts
    const counts = {
      sekolah: 0,
      tahunPelajaran: 0,
      semester: 0,
      jurusan: 0,
      mapel: 0,
      jenisKegiatan: 0,
      organizationalPositions: 0,
      organizationalAssignments: 0,
      organizationalCapabilities: 0,
      kelas: 0,
      guru: 0,
      siswa: 0,

      guruMapel: 0,
      kelasMapel: 0,
      jadwalTemplate: 0,
      pelanggaran: 0,
      supervisi: 0,
      siswaAkademik: 0
    };

    await prisma.$transaction(async (tx) => {
      // 1. Independent Masters
      if (sekolah?.length) { const res = await tx.sekolah.createMany({ data: sanitize(sekolah), skipDuplicates: true }); counts.sekolah = res.count; }
      if (tahunPelajaran?.length) { const res = await tx.tahunPelajaran.createMany({ data: sanitize(tahunPelajaran), skipDuplicates: true }); counts.tahunPelajaran = res.count; }
      if (jurusan?.length) { const res = await tx.jurusan.createMany({ data: sanitize(jurusan), skipDuplicates: true }); counts.jurusan = res.count; }
      if (mapel?.length) { const res = await tx.mapel.createMany({ data: sanitize(mapel), skipDuplicates: true }); counts.mapel = res.count; }
      if (jenisKegiatanMaster?.length) { const res = await tx.jenisKegiatanMaster.createMany({ data: sanitize(jenisKegiatanMaster), skipDuplicates: true }); counts.jenisKegiatan = res.count; }
      if (organizationalPositions?.length) {
        const res = await tx.organizationalPosition.createMany({ data: sanitizeWithUpdatedAt(organizationalPositions), skipDuplicates: true });
        counts.organizationalPositions = res.count;
      }

      // 2. Dependent Level 1
      if (semester?.length) { const res = await tx.semester.createMany({ data: sanitize(semester), skipDuplicates: true }); counts.semester = res.count; }
      
      // Kelas depends on TahunPelajaran, Jurusan
      if (kelas?.length) { const res = await tx.kelas.createMany({ data: sanitize(kelas), skipDuplicates: true }); counts.kelas = res.count; }

      // 3. Users dependent (Guru, Siswa)
      // We need to handle user_id. If the User doesn't exist in target, set user_id to null.
      const validUserIds = new Set((await tx.user.findMany({ where: { tenant_id: tenantId }, select: { id: true } })).map(u => u.id));

      const sanitizeWithUserCheck = (items: any[]) => {
        return sanitize(items).map(item => ({
          ...item,
          user_id: item.user_id && validUserIds.has(item.user_id) ? item.user_id : null
        }));
      };

      if (guru?.length) { const res = await tx.guru.createMany({ data: sanitizeWithUserCheck(guru), skipDuplicates: true }); counts.guru = res.count; }
      if (siswa?.length) { const res = await tx.siswa.createMany({ data: sanitizeWithUserCheck(siswa), skipDuplicates: true }); counts.siswa = res.count; }

      // 4. Dependent Level 2

      if (guruMapel?.length) { const res = await tx.guruMapel.createMany({ data: sanitize(guruMapel), skipDuplicates: true }); counts.guruMapel = res.count; }
      if (kelasMapel?.length) { const res = await tx.kelasMapel.createMany({ data: sanitize(kelasMapel), skipDuplicates: true }); counts.kelasMapel = res.count; }
      if (jadwalTemplate?.length) { const res = await tx.jadwalTemplate.createMany({ data: sanitize(jadwalTemplate), skipDuplicates: true }); counts.jadwalTemplate = res.count; }
      if (organizationalAssignments?.length) {
        const res = await tx.organizationalAssignment.createMany({ data: sanitizeWithUpdatedAt(organizationalAssignments), skipDuplicates: true });
        counts.organizationalAssignments = res.count;
      }
      if (organizationalCapabilities?.length) {
        const caps = organizationalCapabilities.map((item: any) => {
          const { tenant_id, ...rest } = item;
          return rest;
        });
        const res = await tx.organizationalCapability.createMany({ data: caps, skipDuplicates: true });
        counts.organizationalCapabilities = res.count;
      }
      if (pelanggaranSiswa?.length) { const res = await tx.pelanggaranSiswa.createMany({ data: sanitize(pelanggaranSiswa), skipDuplicates: true }); counts.pelanggaran = res.count; }
      if (supervisiGuru?.length) { const res = await tx.supervisiGuru.createMany({ data: sanitize(supervisiGuru), skipDuplicates: true }); counts.supervisi = res.count; }
      
      // SiswaAkademik doesn't have tenant_id directly, it links via relationships.
      // But prisma createMany requires data matching the model. 
      // SiswaAkademik model: id, siswa_id, kelas_id, tahun_pelajaran_id, semester_id, status.
      // It does NOT have tenant_id.
      if (siswaAkademik?.length) {
         // Filter out tenant_id if it was wrongly added by sanitize (though sanitize adds it)
         // Wait, sanitize adds tenant_id. SiswaAkademik DOES NOT have tenant_id.
         // We must NOT use generic sanitize for SiswaAkademik.
         const cleanSiswaAkademik = siswaAkademik.map((item: any) => {
             const { tenant_id, ...rest } = item; // Remove tenant_id if present
             return rest;
         });
         const res = await tx.siswaAkademik.createMany({ data: cleanSiswaAkademik, skipDuplicates: true });
         counts.siswaAkademik = res.count;
      }
    });

    return {
      success: true,
      message: 'Academic data imported successfully (skipped duplicates).',
      details: counts
    };
  }
};
