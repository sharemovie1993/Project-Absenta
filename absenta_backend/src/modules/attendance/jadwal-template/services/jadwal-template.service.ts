import { prisma } from '@/utils/prisma';
import { findBestMatch } from '../../../../utils/normalization';
import { Hari } from '@prisma/client';

export class JadwalTemplateService {
  async importFromExcel(
    data: any[], 
    tenantId: string, 
    tahunPelajaranId: string, 
    semesterId: string
  ): Promise<{ success: number; failed: number; errors: any[] }> {
    let success = 0;
    let failed = 0;
    const errors: any[] = [];

    // Pre-fetch references
    const [gurus, mapels, kelasList] = await Promise.all([
      prisma.guru.findMany({ where: { tenant_id: tenantId }, select: { id: true, nama_guru: true } }),
      prisma.mapel.findMany({ where: { tenant_id: tenantId }, select: { id: true, nama_mapel: true } }),
      prisma.kelas.findMany({ where: { tenant_id: tenantId }, select: { id: true, nama_kelas: true } })
    ]);

    const guruNames = gurus.map(g => g.nama_guru);
    const mapelNames = mapels.map(m => m.nama_mapel);
    const kelasNames = kelasList.map(k => k.nama_kelas);

    for (const [index, row] of data.entries()) {
      const rowNumber = row.__rowNum || (index + 2);
      try {
        const inputHari = String(row.hari || row.Hari || '').toUpperCase();
        const inputMulai = String(row.jam_mulai || row['Jam Mulai'] || '');
        const inputSelesai = String(row.jam_selesai || row['Jam Selesai'] || '');
        const inputKelas = row.nama_kelas || row.kelas;
        const inputMapel = row.nama_mapel || row.mapel;
        const inputGuru = row.nama_guru || row.guru;

        if (!inputHari || !inputMulai || !inputSelesai || !inputKelas || !inputMapel || !inputGuru) {
          throw new Error('Kolom Hari, Jam, Kelas, Mapel, dan Guru wajib diisi.');
        }

        // Validate Hari
        const validHari = Object.values(Hari);
        if (!validHari.includes(inputHari as Hari)) {
          throw new Error(`Hari '${inputHari}' tidak valid. Gunakan: ${validHari.join(', ')}.`);
        }

        // Smart Match References
        const kelasMatch = findBestMatch(String(inputKelas), kelasNames);
        if (!kelasMatch.match) throw new Error(`Kelas '${inputKelas}' tidak ditemukan.`);
        const kelas = kelasList.find(k => k.nama_kelas === kelasMatch.match);

        const mapelMatch = findBestMatch(String(inputMapel), mapelNames);
        if (!mapelMatch.match) throw new Error(`Mapel '${inputMapel}' tidak ditemukan.`);
        const mapel = mapels.find(m => m.nama_mapel === mapelMatch.match);

        const guruMatch = findBestMatch(String(inputGuru), guruNames);
        if (!guruMatch.match) throw new Error(`Guru '${inputGuru}' tidak ditemukan.`);
        const guru = gurus.find(g => g.nama_guru === guruMatch.match);

        if (!kelas || !mapel || !guru) throw new Error('Data referensi tidak valid.');

        // Logic: UPSERT (Find existing first to avoid duplicates)
        const existing = await prisma.jadwalTemplate.findFirst({
          where: {
            tenant_id: tenantId,
            tahun_pelajaran_id: tahunPelajaranId,
            semester_id: semesterId,
            kelas_id: kelas.id,
            hari: inputHari as Hari,
            jam_mulai: inputMulai
          }
        });

        if (existing) {
          // Update existing
          await prisma.jadwalTemplate.update({
            where: { id: existing.id },
            data: {
              mapel_id: mapel.id,
              guru_id: guru.id,
              jam_selesai: inputSelesai,
              jenis_kegiatan: 'KBM'
            }
          });
        } else {
          // Create new
          await prisma.jadwalTemplate.create({
            data: {
              tenant_id: tenantId,
              tahun_pelajaran_id: tahunPelajaranId,
              semester_id: semesterId,
              kelas_id: kelas.id,
              mapel_id: mapel.id,
              guru_id: guru.id,
              hari: inputHari as Hari,
              jam_mulai: inputMulai,
              jam_selesai: inputSelesai,
              jenis_kegiatan: 'KBM'
            }
          });
        }

        success++;
      } catch (err: any) {
        failed++;
        errors.push({
          row: rowNumber,
          message: err.message
        });
      }
    }

    return { success, failed, errors };
  }
}

export const jadwalTemplateService = new JadwalTemplateService();
