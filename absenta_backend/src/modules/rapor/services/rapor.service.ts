import { prisma } from '../../../utils/prisma';
import { cacheService } from '../../../utils/cache.service';
import { cacheInvalidationService } from '../../../utils/cache-invalidation.service';
import { CACHE_KEYS, CACHE_TTL } from '../../../constants/cache-keys';

export class RaporService {
  static async upsertRapor(
    tenantId: string,
    data: {
      siswa_id: string;
      kelas_id: string;
      tahun_pelajaran_id: string;
      semester_id: string;
      sakit?: number;
      izin?: number;
      alpa?: number;
      catatan_wali?: string | null;
      keputusan_transisi?: string | null;
      catatan_kokurikuler?: string | null;
    }
  ) {
    const result = await prisma.raporSiswa.upsert({
      where: {
        siswa_id_tahun_pelajaran_id_semester_id: {
          siswa_id: data.siswa_id,
          tahun_pelajaran_id: data.tahun_pelajaran_id,
          semester_id: data.semester_id,
        },
      },
      update: {
        sakit: data.sakit,
        izin: data.izin,
        alpa: data.alpa,
        catatan_wali: data.catatan_wali,
        keputusan_transisi: data.keputusan_transisi,
      },
      create: {
        tenant_id: tenantId,
        siswa_id: data.siswa_id,
        kelas_id: data.kelas_id,
        tahun_pelajaran_id: data.tahun_pelajaran_id,
        semester_id: data.semester_id,
        sakit: data.sakit || 0,
        izin: data.izin || 0,
        alpa: data.alpa || 0,
        catatan_wali: data.catatan_wali,
        keputusan_transisi: data.keputusan_transisi,
      },
    });

    if (data.catatan_kokurikuler !== undefined) {
      await this.updateConfig(
        tenantId,
        `RAPOR_KOKURIKULER_${data.tahun_pelajaran_id}_${data.semester_id}_${data.siswa_id}`,
        data.catatan_kokurikuler || ''
      );
    }

    // Invalidate leger cache for this class
    void cacheInvalidationService.invalidateRaporCache(tenantId);
    return result;
  }

  static async getRaporDetail(
    tenantId: string,
    filter: {
      siswa_id: string;
      tahun_pelajaran_id: string;
      semester_id: string;
    }
  ) {
    // 1. Ambil data siswa & kelas
    const siswa = await prisma.siswa.findFirst({
      where: { id: filter.siswa_id, tenant_id: tenantId },
      include: {
        Kelas: { include: { Jurusan: true } },
      },
    });

    if (!siswa) {
      throw new Error('Siswa tidak ditemukan');
    }
    if (!siswa.Kelas) {
      throw new Error('Siswa belum memiliki kelas');
    }

    // 2. Ambil catatan, kehadiran & kokurikuler rapor
    const [raporSummary, kokurikulerCfg] = await Promise.all([
      prisma.raporSiswa.findFirst({
        where: {
          tenant_id: tenantId,
          siswa_id: filter.siswa_id,
          tahun_pelajaran_id: filter.tahun_pelajaran_id,
          semester_id: filter.semester_id,
        },
      }),
      prisma.config.findFirst({
        where: {
          tenant_id: tenantId,
          key: `RAPOR_KOKURIKULER_${filter.tahun_pelajaran_id}_${filter.semester_id}_${filter.siswa_id}`,
        },
      }),
    ]);

    // 3. Ambil Struktur Kurikulum untuk tingkat & jurusan siswa
    const kelasJurusanId = siswa.Kelas.jurusan_id;
    const kelasTingkat = siswa.Kelas.tingkat;

    let strukturList = await prisma.strukturKurikulum.findMany({
      where: {
        tenant_id: tenantId,
        tahun_pelajaran_id: filter.tahun_pelajaran_id,
        tingkat: kelasTingkat,
        ...(kelasJurusanId
          ? {
              OR: [
                { jurusan_id: null },
                { jurusan_id: kelasJurusanId },
              ],
            }
          : {
              jurusan_id: null,
            }),
      },
      include: {
        Mapel: true,
      },
    });

    // Fallback Struktur Kurikulum: jika di TP ini belum di-generate, periksa apakah ada di TP lain untuk tingkat & jurusan ini
    if (strukturList.length === 0 && kelasTingkat) {
      strukturList = await prisma.strukturKurikulum.findMany({
        where: {
          tenant_id: tenantId,
          tingkat: kelasTingkat,
          ...(kelasJurusanId
            ? {
                OR: [
                  { jurusan_id: null },
                  { jurusan_id: kelasJurusanId },
                ],
              }
            : {
                jurusan_id: null,
              }),
        },
        include: {
          Mapel: true,
        },
        distinct: ['mapel_id'],
      });
    }

    // 4. Ambil seluruh nilai siswa semester ini
    const listNilai = await prisma.nilaiSiswa.findMany({
      where: {
        tenant_id: tenantId,
        siswa_id: filter.siswa_id,
        tahun_pelajaran_id: filter.tahun_pelajaran_id,
        semester_id: filter.semester_id,
      },
      include: {
        Mapel: true,
        JenisNilai: true,
      },
    });

    // 5. Ambil KKM/KKTP mapel untuk tingkat ini
    const listKkm = await prisma.kkmp.findMany({
      where: {
        tenant_id: tenantId,
        tingkat: siswa.Kelas.tingkat,
      },
    });

    const kkmMap = new Map<string, number>();
    listKkm.forEach((k) => kkmMap.set(k.mapel_id, k.kkm_nilai));

    // 6. Inisialisasi daftar mapel: STRUKTUR KURIKULUM SEBAGAI SINGLE SOURCE OF TRUTH
    const mapelGrades: Record<string, {
      mapel_id: string;
      mapel_name: string;
      mapel_code: string;
      kelompok_mapel: string;
      kkm: number;
      nilai_components: Array<{ jenis: string; nilai: number; bobot: number }>;
      nilai_akhir: number;
      predikat: string;
      catatan_kompetensi?: string;
      urutan?: number;
    }> = {};

    // Map nama mapel ternormalisasi -> primary mapel_id untuk mencegah duplikasi jika ada duplikat di DB
    const normNameToPrimaryId = new Map<string, string>();
    const altIdToPrimaryId = new Map<string, string>();

    const registerOrGetMapel = (mId: string, mName: string, mCode: string, grp: string, kkm: number, urutan = 999): string => {
      const normKey = (mName || '').toLowerCase().replace(/[^a-z0-9]/g, '').trim();
      if (!normKey) return mId;

      if (normNameToPrimaryId.has(normKey)) {
        const primaryId = normNameToPrimaryId.get(normKey)!;
        altIdToPrimaryId.set(mId, primaryId);
        if (mapelGrades[primaryId]) {
          if (grp && grp.toLowerCase() !== 'mata pelajaran umum' && grp.toLowerCase() !== 'umum' && mapelGrades[primaryId].kelompok_mapel.toLowerCase().includes('umum')) {
            mapelGrades[primaryId].kelompok_mapel = grp;
          }
          if (urutan < (mapelGrades[primaryId].urutan ?? 999)) {
            mapelGrades[primaryId].urutan = urutan;
          }
        }
        return primaryId;
      }

      normNameToPrimaryId.set(normKey, mId);
      altIdToPrimaryId.set(mId, mId);
      mapelGrades[mId] = {
        mapel_id: mId,
        mapel_name: mName,
        mapel_code: mCode,
        kelompok_mapel: grp,
        kkm: kkm || 75,
        nilai_components: [],
        nilai_akhir: 0,
        predikat: '-',
        catatan_kompetensi: '',
        urutan,
      };
      return mId;
    };

    // 6a. Muat SELURUH mapel MURNI dari Struktur Kurikulum resmi rombel ini
    if (strukturList.length > 0) {
      strukturList.forEach((sk) => {
        if (sk.Mapel) {
          const grp = sk.kelompok || sk.Mapel.kelompok_mapel || 'Mata Pelajaran Umum';
          registerOrGetMapel(
            sk.mapel_id,
            sk.Mapel.nama_mapel,
            sk.Mapel.kode_mapel || 'N/A',
            grp,
            kkmMap.get(sk.mapel_id) || 75,
            (sk as any).urutan ?? (sk.Mapel as any)?.urutan ?? 999
          );
        }
      });
    }

    // 6b. Tautkan nilai siswa (listNilai) ke mapel resmi di Struktur Kurikulum
    listNilai.forEach((n) => {
      const normKey = (n.Mapel?.nama_mapel || '').toLowerCase().replace(/[^a-z0-9]/g, '').trim();
      const primaryId = altIdToPrimaryId.get(n.mapel_id) || normNameToPrimaryId.get(normKey);

      if (primaryId && mapelGrades[primaryId]) {
        mapelGrades[primaryId].nilai_components.push({
          jenis: n.JenisNilai?.nama || 'Sumatif',
          nilai: n.nilai_rapor_final ?? n.nilai,
          bobot: n.JenisNilai?.bobot || 1,
        });
        const note = n.capaian_kompetensi || n.catatan_deskripsi;
        if (note) {
          mapelGrades[primaryId].catatan_kompetensi = note;
        }
      } else if (strukturList.length === 0) {
        // Fallback darurat HANYA jika sekolah sama sekali belum mengonfigurasi StrukturKurikulum
        if (!mapelGrades[n.mapel_id] && n.Mapel) {
          registerOrGetMapel(
            n.mapel_id,
            n.Mapel.nama_mapel,
            n.Mapel.kode_mapel || 'N/A',
            n.Mapel.kelompok_mapel || 'Mata Pelajaran Umum',
            kkmMap.get(n.mapel_id) || 75
          );
        }
        const targetId = altIdToPrimaryId.get(n.mapel_id) || n.mapel_id;
        if (mapelGrades[targetId]) {
          mapelGrades[targetId].nilai_components.push({
            jenis: n.JenisNilai?.nama || 'Sumatif',
            nilai: n.nilai_rapor_final ?? n.nilai,
            bobot: n.JenisNilai?.bobot || 1,
          });
          const note = n.capaian_kompetensi || n.catatan_deskripsi;
          if (note) {
            mapelGrades[targetId].catatan_kompetensi = note;
          }
        }
      }
    });

    // Hitung Nilai Akhir & Predikat
    Object.keys(mapelGrades).forEach((mapelId) => {
      const g = mapelGrades[mapelId];
      if (g.nilai_components.length > 0) {
        let totalWeightedScore = 0;
        let totalBobot = 0;

        g.nilai_components.forEach((c) => {
          totalWeightedScore += c.nilai * c.bobot;
          totalBobot += c.bobot;
        });

        g.nilai_akhir = totalBobot > 0 ? Math.round(totalWeightedScore / totalBobot) : 0;

        const kkm = g.kkm;
        const interval = (100 - kkm) / 3;

        if (g.nilai_akhir >= 100 - interval) {
          g.predikat = 'A';
        } else if (g.nilai_akhir >= 100 - 2 * interval) {
          g.predikat = 'B';
        } else if (g.nilai_akhir >= kkm) {
          g.predikat = 'C';
        } else {
          g.predikat = 'D';
        }
      } else {
        g.nilai_akhir = 0;
        g.predikat = '-';
      }
    });

    // Calculate 1-semester daily attendance reference from SesiAbsensi
    let referensiAbsensiHarian = { sakit: 0, izin: 0, alpa: 0 };
    const dailyLogs = await prisma.absenSiswa.groupBy({
      by: ['status'],
      where: {
        tenant_id: tenantId,
        siswa_id: filter.siswa_id,
        SesiAbsensi: {
          semester_id: filter.semester_id,
          tahun_pelajaran_id: filter.tahun_pelajaran_id,
        },
      },
      _count: { id: true },
    });
    dailyLogs.forEach((item) => {
      const count = typeof item._count === 'number' ? item._count : (item._count?.id || 0);
      const st = (item.status || '').toUpperCase();
      if (st === 'SAKIT' || st === 'S') referensiAbsensiHarian.sakit += count;
      else if (st === 'IZIN' || st === 'I') referensiAbsensiHarian.izin += count;
      else if (st === 'ALPA' || st === 'A') referensiAbsensiHarian.alpa += count;
    });

    // 7. Seluruh mapel yang terhubung ke rombel disajikan lengkap terlepas sudah dinilai atau belum
    const finalAkademikList = Object.values(mapelGrades);

    return {
      siswa: {
        id: siswa.id,
        nis: siswa.nis,
        nisn: siswa.nisn,
        nama_siswa: siswa.nama_siswa,
        kelas: siswa.Kelas.nama_kelas,
        tingkat: siswa.Kelas.tingkat,
        tempat_lahir: (siswa as any).tempat_lahir || null,
        tanggal_lahir: (siswa as any).tanggal_lahir || null,
        jenis_kelamin: (siswa as any).jenis_kelamin || null,
        agama: (siswa as any).agama || null,
        status_dalam_keluarga: (siswa as any).status_dalam_keluarga || 'Anak Kandung',
        anak_ke: (siswa as any).anak_ke || null,
        alamat: (siswa as any).alamat || null,
        dusun: (siswa as any).dusun || null,
        rt: (siswa as any).rt || null,
        rw: (siswa as any).rw || null,
        kelurahan: (siswa as any).kelurahan || null,
        kecamatan: (siswa as any).kecamatan || null,
        kabupaten: (siswa as any).kabupaten || null,
        no_telepon: (siswa as any).no_telepon || (siswa as any).no_hp || null,
        sekolah_asal: (siswa as any).sekolah_asal || null,
        tanggal_masuk: (siswa as any).tanggal_masuk || null,
        nama_ayah: (siswa as any).nama_ayah || null,
        nama_ibu: (siswa as any).nama_ibu || null,
        pekerjaan_ayah: (siswa as any).pekerjaan_ayah || null,
        pekerjaan_ibu: (siswa as any).pekerjaan_ibu || null,
        alamat_ortu: (siswa as any).alamat_ortu || (siswa as any).alamat || null,
        nama_wali: (siswa as any).nama_wali || null,
        pekerjaan_wali: (siswa as any).pekerjaan_wali || null,
        alamat_wali: (siswa as any).alamat_wali || null,
        bidang_keahlian: (siswa.Kelas as any)?.Jurusan?.bidang_keahlian || (siswa as any).bidang_keahlian || null,
        program_keahlian: (siswa.Kelas as any)?.Jurusan?.program_keahlian || (siswa as any).program_keahlian || null,
        konsentrasi_keahlian: (siswa.Kelas as any)?.Jurusan?.nama_jurusan || (siswa as any).konsentrasi_keahlian || null,
      },
      absensi: {
        sakit: raporSummary?.sakit || 0,
        izin: raporSummary?.izin || 0,
        alpa: raporSummary?.alpa || 0,
      },
      referensi_absensi_harian: referensiAbsensiHarian,
      catatan_wali: raporSummary?.catatan_wali || '',
      keputusan_transisi: raporSummary?.keputusan_transisi || '',
      catatan_kokurikuler: kokurikulerCfg?.value || '',
      nilai_akademik: finalAkademikList,
    };
  }

  static async getLegerData(
    tenantId: string,
    params: {
      kelas_id: string;
      tahun_pelajaran_id: string;
      semester_id: string;
    }
  ) {
    const cacheKey = CACHE_KEYS.ACADEMIC.LEGER(tenantId, params.kelas_id, params.tahun_pelajaran_id, params.semester_id);

    return await cacheService.getOrSet(
      cacheKey,
      async () => {
    const kelas = await prisma.kelas.findFirst({ where: { id: params.kelas_id, tenant_id: tenantId } });
    const tp = await prisma.tahunPelajaran.findFirst({ where: { id: params.tahun_pelajaran_id, tenant_id: tenantId } });
    const sem = await prisma.semester.findFirst({ where: { id: params.semester_id, tenant_id: tenantId } });

    if (!kelas || !tp || !sem) {
      throw new Error('Data parameter kelas, tahun pelajaran, atau semester tidak ditemukan');
    }

    const listSiswa = await prisma.siswa.findMany({
      where: { tenant_id: tenantId, kelas_id: params.kelas_id, status: 'AKTIF' },
      orderBy: { nama_siswa: 'asc' },
    });

    const listNilai = await prisma.nilaiSiswa.findMany({
      where: {
        tenant_id: tenantId,
        tahun_pelajaran_id: params.tahun_pelajaran_id,
        semester_id: params.semester_id,
        siswa_id: { in: listSiswa.map((s) => s.id) },
      },
      include: {
        Mapel: true,
        JenisNilai: true,
      },
    });

    const listRaporSummary = await prisma.raporSiswa.findMany({
      where: {
        tenant_id: tenantId,
        kelas_id: params.kelas_id,
        tahun_pelajaran_id: params.tahun_pelajaran_id,
        semester_id: params.semester_id,
      },
    });
    const raporSummaryMap = new Map<string, any>();
    listRaporSummary.forEach((r) => raporSummaryMap.set(r.siswa_id, r));

    // Load kokurikuler configs for students in this semester & TP
    const kokurikulerConfigs = await prisma.config.findMany({
      where: {
        tenant_id: tenantId,
        key: {
          startsWith: `RAPOR_KOKURIKULER_${params.tahun_pelajaran_id}_${params.semester_id}_`,
        },
      },
    });
    const kokurikulerMap = new Map<string, string>();
    kokurikulerConfigs.forEach((c) => {
      const prefix = `RAPOR_KOKURIKULER_${params.tahun_pelajaran_id}_${params.semester_id}_`;
      const sId = c.key.replace(prefix, '');
      kokurikulerMap.set(sId, c.value);
    });

    // Daily attendance reference map (1 semester)
    const referensiMap = new Map<string, { sakit: number; izin: number; alpa: number }>();
    const safeStudentIds = listSiswa.map((s) => s.id).filter((id): id is string => !!id);

    if (safeStudentIds.length > 0) {
      const dailyAttendance = await prisma.absenSiswa.groupBy({
        by: ['siswa_id', 'status'],
        where: {
          tenant_id: tenantId,
          siswa_id: { in: safeStudentIds },
          SesiAbsensi: {
            semester_id: params.semester_id,
            tahun_pelajaran_id: params.tahun_pelajaran_id,
          },
        },
        _count: { id: true },
      });

      dailyAttendance.forEach((item) => {
        if (item.siswa_id) {
          if (!referensiMap.has(item.siswa_id)) {
            referensiMap.set(item.siswa_id, { sakit: 0, izin: 0, alpa: 0 });
          }
          const ref = referensiMap.get(item.siswa_id)!;
          const count = typeof item._count === 'number' ? item._count : (item._count?.id || 0);
          const st = (item.status || '').toUpperCase();
          if (st === 'SAKIT' || st === 'S') ref.sakit += count;
          else if (st === 'IZIN' || st === 'I') ref.izin += count;
          else if (st === 'ALPA' || st === 'A') ref.alpa += count;
        }
      });
    }

    // Ambil Struktur Kurikulum resmi untuk tingkat & jurusan kelas ini sebagai Single Source of Truth
    let strukturList = await prisma.strukturKurikulum.findMany({
      where: {
        tenant_id: tenantId,
        tahun_pelajaran_id: params.tahun_pelajaran_id,
        tingkat: kelas.tingkat,
        ...(kelas.jurusan_id
          ? {
              OR: [
                { jurusan_id: null },
                { jurusan_id: kelas.jurusan_id },
              ],
            }
          : {
              jurusan_id: null,
            }),
      },
      include: {
        Mapel: true,
      },
    });

    if (strukturList.length === 0 && kelas.tingkat) {
      strukturList = await prisma.strukturKurikulum.findMany({
        where: {
          tenant_id: tenantId,
          tingkat: kelas.tingkat,
          ...(kelas.jurusan_id
            ? {
                OR: [
                  { jurusan_id: null },
                  { jurusan_id: kelas.jurusan_id },
                ],
              }
            : {
                jurusan_id: null,
              }),
        },
        include: {
          Mapel: true,
        },
        distinct: ['mapel_id'],
      });
    }

    const listKkm = await prisma.kkmp.findMany({
      where: { tenant_id: tenantId, tingkat: kelas.tingkat },
    });
    const kkmMap = new Map<string, number>();
    listKkm.forEach((k) => kkmMap.set(k.mapel_id, k.kkm_nilai));

    // Register mapel dari StrukturKurikulum (Deduplikasi cerdas by normalized name)
    const mapelMap = new Map<string, { id: string; nama_mapel: string; kode_mapel: string; kelompok_mapel: string; kkm: number; urutan?: number }>();
    const normNameToPrimaryId = new Map<string, string>();
    const altIdToPrimaryId = new Map<string, string>();

    const registerMapel = (mId: string, mName: string, mCode: string, grp: string, kkm: number, urutan = 999): string => {
      const normKey = (mName || '').toLowerCase().replace(/[^a-z0-9]/g, '').trim();
      if (!normKey) return mId;

      if (normNameToPrimaryId.has(normKey)) {
        const primaryId = normNameToPrimaryId.get(normKey)!;
        altIdToPrimaryId.set(mId, primaryId);
        return primaryId;
      }

      normNameToPrimaryId.set(normKey, mId);
      altIdToPrimaryId.set(mId, mId);
      mapelMap.set(mId, {
        id: mId,
        nama_mapel: mName,
        kode_mapel: mCode,
        kelompok_mapel: grp,
        kkm: kkm || 75,
        urutan,
      });
      return mId;
    };

    if (strukturList.length > 0) {
      strukturList.forEach((sk) => {
        if (sk.Mapel) {
          const grp = sk.kelompok || sk.Mapel.kelompok_mapel || 'Mata Pelajaran Umum';
          registerMapel(
            sk.mapel_id,
            sk.Mapel.nama_mapel,
            sk.Mapel.kode_mapel || 'N/A',
            grp,
            kkmMap.get(sk.mapel_id) || 75,
            (sk as any).urutan ?? (sk.Mapel as any)?.urutan ?? 999
          );
        }
      });
    } else {
      // Fallback darurat jika sekolah belum mengonfigurasi Struktur Kurikulum
      listNilai.forEach((n) => {
        if (n.Mapel) {
          registerMapel(
            n.mapel_id,
            n.Mapel.nama_mapel,
            n.Mapel.kode_mapel || 'N/A',
            n.Mapel.kelompok_mapel || 'Mata Pelajaran Umum',
            kkmMap.get(n.mapel_id) || 75
          );
        }
      });
    }

    // Urutan baku e-Rapor Kemendikbud multi-jenjang
    const getMapelPriority = (name: string, grp: string): number => {
      const n = (name || '').toLowerCase();
      const g = (grp || '').toLowerCase();
      if (g.includes('umum')) {
        if (n.includes('agama') || n.includes('budi pekerti') || n.includes('pai')) return 10;
        if (n.includes('pancasila') || n.includes('ppkn')) return 20;
        if (n.includes('bahasa indonesia') || n === 'indonesia') return 30;
        if (n.includes('jasmani') || n.includes('olahraga') || n.includes('pjok')) return 40;
        if (n.includes('sejarah')) return 50;
        if (n.includes('seni') || n.includes('budaya')) return 60;
        if (n.includes('matematika')) return 70;
        if (n.includes('inggris')) return 80;
        return 90;
      }
      if (g.includes('kejuruan')) {
        if (n.includes('matematika')) return 110;
        if (n.includes('inggris')) return 120;
        if (n.includes('informatika')) return 130;
        if (n.includes('ipas')) return 140;
        if (n.includes('dasar') || n.includes('ddpk')) return 150;
        if (n.includes('konsentrasi') || n.includes('kk')) return 160;
        if (n.includes('kreatif') || n.includes('pkk')) return 170;
        if (n.includes('pkl')) return 180;
        return 190;
      }
      if (g.includes('pilihan')) return 200;
      if (g.includes('muatan') || g.includes('lokal')) return 300;
      return 400;
    };

    const mapelList = Array.from(mapelMap.values()).sort((a, b) => {
      const pA = getMapelPriority(a.nama_mapel, a.kelompok_mapel);
      const pB = getMapelPriority(b.nama_mapel, b.kelompok_mapel);
      if (pA !== pB) return pA - pB;
      return a.nama_mapel.localeCompare(b.nama_mapel);
    });

    const studentGradesRaw: Record<
      string,
      Record<string, { finalScore: number; sumatif1?: number; sumatif2?: number; sumatif3?: number; rataSumatif?: number; nilaiAkhir?: number; CP?: string }>
    > = {};

    listSiswa.forEach((s) => {
      studentGradesRaw[s.id] = {};
      mapelList.forEach((m) => {
        studentGradesRaw[s.id][m.id] = { finalScore: 0 };
      });
    });

    listNilai.forEach((n) => {
      const normKey = (n.Mapel?.nama_mapel || '').toLowerCase().replace(/[^a-z0-9]/g, '').trim();
      const primaryId = altIdToPrimaryId.get(n.mapel_id) || normNameToPrimaryId.get(normKey);

      if (primaryId && studentGradesRaw[n.siswa_id] && studentGradesRaw[n.siswa_id][primaryId]) {
        const finalVal = n.nilai_rapor_final ?? n.nilai ?? 0;
        studentGradesRaw[n.siswa_id][primaryId] = {
          finalScore: finalVal,
          sumatif1: n.sumatif_1 ?? undefined,
          sumatif2: n.sumatif_2 ?? undefined,
          sumatif3: n.sumatif_3 ?? undefined,
          rataSumatif: n.rata_rata_sumatif ?? undefined,
          nilaiAkhir: n.nilai_akhir_sumatif ?? undefined,
          CP: n.capaian_kompetensi ?? undefined,
        };
      }
    });

    const studentsData = listSiswa.map((siswa) => {
      const grades: Record<string, number> = {};
      const gradeDetails: Record<string, any> = {};
      let totalScore = 0;
      let mapelCount = 0;

      mapelList.forEach((m) => {
        const details = studentGradesRaw[siswa.id][m.id];
        const score = details ? details.finalScore : 0;
        grades[m.id] = score;
        gradeDetails[m.id] = details;

        if (score > 0) {
          totalScore += score;
          mapelCount++;
        }
      });

      const averageScore = mapelCount > 0 ? Number((totalScore / mapelCount).toFixed(2)) : 0;
      const raporRec = raporSummaryMap.get(siswa.id);
      const refPresensi = referensiMap.get(siswa.id) || { sakit: 0, izin: 0, alpa: 0 };

      return {
        id: siswa.id,
        nama_siswa: siswa.nama_siswa,
        nis: siswa.nis,
        nisn: siswa.nisn || '',
        grades,
        gradeDetails,
        total: totalScore,
        rata_rata: averageScore,
        sakit: raporRec?.sakit || 0,
        izin: raporRec?.izin || 0,
        alpa: raporRec?.alpa || 0,
        catatan_wali: raporRec?.catatan_wali || '',
        keputusan_transisi: raporRec?.keputusan_transisi || '',
        catatan_kokurikuler: kokurikulerMap.get(siswa.id) || '',
        referensi_absensi_harian: refPresensi,
        rank: 0,
      };
    });

    studentsData.sort((a, b) => b.total - a.total);
    studentsData.forEach((student, index) => {
      student.rank = index + 1;
    });

    const studentsSortedByName = [...studentsData].sort((a, b) => a.nama_siswa.localeCompare(b.nama_siswa));

    return {
      kelas: { id: kelas.id, nama_kelas: kelas.nama_kelas },
      tahun_pelajaran: { id: tp.id, tahun: tp.tahun },
      semester: { id: sem.id, nama_semester: sem.nama_semester },
      mapel_list: mapelList,
      students: studentsSortedByName,
    };
      },
      CACHE_TTL.DASHBOARD
    );
  }

  static async exportLegerExcel(
    tenantId: string,
    params: {
      kelas_id: string;
      tahun_pelajaran_id: string;
      semester_id: string;
    }
  ) {
    const XLSX = require('xlsx');
    const data = await this.getLegerData(tenantId, params);

    const headers = ['No', 'NIS', 'NISN', 'Nama Siswa'];
    data.mapel_list.forEach((m) => {
      headers.push(`${m.nama_mapel} (KKM: ${m.kkm})`);
    });
    headers.push('Total', 'Rata-rata', 'Ranking');

    const rows = data.students.map((student, index) => {
      const rowData: Record<string, any> = {
        'No': index + 1,
        'NIS': student.nis,
        'NISN': student.nisn,
        'Nama Siswa': student.nama_siswa,
      };

      data.mapel_list.forEach((m) => {
        const score = student.grades[m.id] || 0;
        rowData[`${m.nama_mapel} (KKM: ${m.kkm})`] = score > 0 ? score : '-';
      });

      rowData['Total'] = student.total;
      rowData['Rata-rata'] = student.rata_rata;
      rowData['Ranking'] = student.rank;

      return rowData;
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows, { header: headers });

    XLSX.utils.book_append_sheet(wb, ws, 'Leger Nilai');

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const filename = `leger_${data.kelas.nama_kelas}_${data.tahun_pelajaran.tahun.replace('/', '-')}_semester_${data.semester.nama_semester}.xlsx`.replace(/\s+/g, '_');

    return {
      filename,
      buffer,
    };
  }

  static async getTranskripNilaiSiswa(tenantId: string, siswaId: string) {
    const cacheKey = CACHE_KEYS.ACADEMIC.TRANSKRIP(tenantId, siswaId);

    return await cacheService.getOrSet(
      cacheKey,
      async () => {
        const siswa = await prisma.siswa.findFirst({
          where: { id: siswaId, tenant_id: tenantId },
          include: { Kelas: true },
        });

        if (!siswa) {
          throw new Error('Siswa tidak ditemukan atau akses lintas tenant ditolak');
        }

        // Fetch all historical grades for this student across all semesters
        const listNilai = await prisma.nilaiSiswa.findMany({
          where: { tenant_id: tenantId, siswa_id: siswaId },
          include: {
            Mapel: true,
            TahunPelajaran: true,
            Semester: true,
          },
          orderBy: [{ Semester: { nama_semester: 'asc' } }],
        });

        // Group by Mapel across all semesters
        const mapelTranskripMap = new Map<
          string,
          {
            mapel_id: string;
            nama_mapel: string;
            kode_mapel: string;
            nilai_per_semester: Record<string, number>;
            rata_rata_kumulatif: number;
          }
        >();

        listNilai.forEach((n) => {
          if (!mapelTranskripMap.has(n.mapel_id)) {
            mapelTranskripMap.set(n.mapel_id, {
              mapel_id: n.mapel_id,
              nama_mapel: n.Mapel.nama_mapel,
              kode_mapel: n.Mapel.kode_mapel || 'N/A',
              nilai_per_semester: {},
              rata_rata_kumulatif: 0,
            });
          }
          const item = mapelTranskripMap.get(n.mapel_id)!;
          const semLabel = `${n.TahunPelajaran.tahun} - ${n.Semester.nama_semester}`;
          const finalVal = n.nilai_rapor_final ?? n.nilai ?? 0;
          item.nilai_per_semester[semLabel] = finalVal;
        });

        // Calculate cumulative average per subject and overall GPA
        let grandTotal = 0;
        let totalSubjects = 0;

        const transkripMapelList = Array.from(mapelTranskripMap.values()).map((m) => {
          const scores = Object.values(m.nilai_per_semester).filter((s) => s > 0);
          const sum = scores.reduce((acc, curr) => acc + curr, 0);
          const avg = scores.length > 0 ? Number((sum / scores.length).toFixed(2)) : 0;
          m.rata_rata_kumulatif = avg;

          if (avg > 0) {
            grandTotal += avg;
            totalSubjects++;
          }
          return m;
        });

        const gpaKumulatif = totalSubjects > 0 ? Number((grandTotal / totalSubjects).toFixed(2)) : 0;

        // Fetch SKL & UKK summary if available
        const skl = await prisma.kelulusanSiswa.findFirst({ where: { tenant_id: tenantId, siswa_id: siswaId } });
        const ukk = await prisma.sertifikatUkk.findFirst({ where: { tenant_id: tenantId, siswa_id: siswaId } });

        return {
          siswa: {
            id: siswa.id,
            nama_siswa: siswa.nama_siswa,
            nis: siswa.nis,
            nisn: siswa.nisn || '',
            kelas: siswa.Kelas?.nama_kelas || '—',
          },
          mata_pelajaran: transkripMapelList,
          rata_rata_ijazah_kumulatif: gpaKumulatif,
          skl_summary: skl ? { nomor_skl: skl.nomor_skl, status: skl.status_kelulusan, rata_rata: skl.rata_rata_nilai } : null,
          ukk_summary: ukk ? { nomor_sertifikat: ukk.nomor_sertifikat, predikat: ukk.predikat, nilai_praktik: ukk.nilai_praktik } : null,
        };
      },
      CACHE_TTL.DASHBOARD
    );
  }

  // === RAPOR SETTINGS & REFERENSI PERSURATAN (SCOPED TO ACADEMIC CONTEXT) ===
  static async getSettings(
    tenantId: string,
    params?: { tahun_pelajaran_id?: string; semester_id?: string }
  ) {
    let tpId = params?.tahun_pelajaran_id;
    let semId = params?.semester_id;

    let tp = null;
    if (tpId) {
      tp = await prisma.tahunPelajaran.findFirst({
        where: { id: tpId, tenant_id: tenantId },
      });
    } else {
      tp = await prisma.tahunPelajaran.findFirst({
        where: { tenant_id: tenantId, is_active: true },
      });
      tpId = tp?.id;
    }

    const tpYearStr = tp?.tahun || '2025/2026';
    const matchYear = tpYearStr.match(/^(\d{4})/);
    const startYear = matchYear ? parseInt(matchYear[1], 10) : 2025;

    // Detect Ganjil & Genap semesters for this TP
    let ganjilSem: any = null;
    let genapSem: any = null;
    if (tpId) {
      const semesters = await prisma.semester.findMany({
        where: { tenant_id: tenantId, tahun_pelajaran_id: tpId },
        orderBy: { created_at: 'asc' },
      });
      ganjilSem = semesters.find(s => 
        (s.nama_semester || '').toLowerCase().includes('ganjil') || 
        (s.nama_semester || '').includes('1')
      ) || semesters[0] || null;

      genapSem = semesters.find(s => 
        (s.nama_semester || '').toLowerCase().includes('genap') || 
        (s.nama_semester || '').includes('2')
      ) || (semesters.length > 1 ? semesters[1] : null);
    }

    const ganjilId = ganjilSem?.id;
    const genapId = genapSem?.id;

    const [
      sekolah,
      tempatTerbitCfg,
      tanggalRaporCfg,
      tanggalP5Cfg,
      tanggalPtsCfg,
      tanggalPlenoCfg,
      // Ganjil
      raporGanjilCfg,
      p5GanjilCfg,
      ptsGanjilCfg,
      // Genap
      raporGenapCfg,
      p5GenapCfg,
      ptsGenapCfg,
      plenoGenapCfg,
      kelulusanCfg,
      // Pejabat
      kepsekStatusCfg,
      kepsekNamaCfg,
      kepsekNipCfg,
      // Format (TP-scoped)
      kertasTpCfg,
      kopTpCfg,
      qrTpCfg,
      kokurikulerTpCfg,
      sumatifArchiveTpCfg,
      // Format (Global Fallback)
      kertasGlobalCfg,
      kopGlobalCfg,
      qrGlobalCfg,
      kokurikulerGlobalCfg,
      sumatifArchiveGlobalCfg,
    ] = await Promise.all([
      prisma.sekolah.findFirst({ where: { tenant_id: tenantId } }),
      tpId ? prisma.config.findFirst({ where: { tenant_id: tenantId, key: `RAPOR_TEMPAT_TERBIT_${tpId}` } }) : null,
      (tpId && semId) ? prisma.config.findFirst({ where: { tenant_id: tenantId, key: `RAPOR_TANGGAL_RAPOR_${tpId}_${semId}` } }) : null,
      (tpId && semId) ? prisma.config.findFirst({ where: { tenant_id: tenantId, key: `RAPOR_TANGGAL_P5_${tpId}_${semId}` } }) : null,
      (tpId && semId) ? prisma.config.findFirst({ where: { tenant_id: tenantId, key: `RAPOR_TANGGAL_PTS_${tpId}_${semId}` } }) : null,
      (tpId && semId) ? prisma.config.findFirst({ where: { tenant_id: tenantId, key: `RAPOR_TANGGAL_PLENO_${tpId}_${semId}` } }) : null,
      // Ganjil
      (tpId && ganjilId) ? prisma.config.findFirst({ where: { tenant_id: tenantId, key: `RAPOR_TANGGAL_RAPOR_${tpId}_${ganjilId}` } }) : null,
      (tpId && ganjilId) ? prisma.config.findFirst({ where: { tenant_id: tenantId, key: `RAPOR_TANGGAL_P5_${tpId}_${ganjilId}` } }) : null,
      (tpId && ganjilId) ? prisma.config.findFirst({ where: { tenant_id: tenantId, key: `RAPOR_TANGGAL_PTS_${tpId}_${ganjilId}` } }) : null,
      // Genap
      (tpId && genapId) ? prisma.config.findFirst({ where: { tenant_id: tenantId, key: `RAPOR_TANGGAL_RAPOR_${tpId}_${genapId}` } }) : null,
      (tpId && genapId) ? prisma.config.findFirst({ where: { tenant_id: tenantId, key: `RAPOR_TANGGAL_P5_${tpId}_${genapId}` } }) : null,
      (tpId && genapId) ? prisma.config.findFirst({ where: { tenant_id: tenantId, key: `RAPOR_TANGGAL_PTS_${tpId}_${genapId}` } }) : null,
      (tpId && genapId) ? prisma.config.findFirst({ where: { tenant_id: tenantId, key: `RAPOR_TANGGAL_PLENO_${tpId}_${genapId}` } }) : null,
      tpId ? prisma.config.findFirst({ where: { tenant_id: tenantId, key: `RAPOR_TANGGAL_KELULUSAN_${tpId}` } }) : null,
      // Pejabat
      tpId ? prisma.config.findFirst({ where: { tenant_id: tenantId, key: `RAPOR_KEPSEK_STATUS_${tpId}` } }) : null,
      tpId ? prisma.config.findFirst({ where: { tenant_id: tenantId, key: `RAPOR_KEPSEK_NAMA_${tpId}` } }) : null,
      tpId ? prisma.config.findFirst({ where: { tenant_id: tenantId, key: `RAPOR_KEPSEK_NIP_${tpId}` } }) : null,
      // Format (TP-scoped)
      tpId ? prisma.config.findFirst({ where: { tenant_id: tenantId, key: `RAPOR_UKURAN_KERTAS_${tpId}` } }) : null,
      tpId ? prisma.config.findFirst({ where: { tenant_id: tenantId, key: `RAPOR_TAMPILKAN_KOP_${tpId}` } }) : null,
      tpId ? prisma.config.findFirst({ where: { tenant_id: tenantId, key: `RAPOR_TAMPILKAN_QR_${tpId}` } }) : null,
      tpId ? prisma.config.findFirst({ where: { tenant_id: tenantId, key: `RAPOR_SHOW_KOKURIKULER_${tpId}` } }) : null,
      tpId ? prisma.config.findFirst({ where: { tenant_id: tenantId, key: `RAPOR_ENABLE_SUMATIF_ARCHIVE_${tpId}` } }) : null,
      // Format (Global Fallback)
      prisma.config.findFirst({ where: { tenant_id: tenantId, key: 'RAPOR_UKURAN_KERTAS' } }),
      prisma.config.findFirst({ where: { tenant_id: tenantId, key: 'RAPOR_TAMPILKAN_KOP' } }),
      prisma.config.findFirst({ where: { tenant_id: tenantId, key: 'RAPOR_TAMPILKAN_QR' } }),
      prisma.config.findFirst({ where: { tenant_id: tenantId, key: 'RAPOR_SHOW_KOKURIKULER' } }),
      prisma.config.findFirst({ where: { tenant_id: tenantId, key: 'RAPOR_ENABLE_SUMATIF_ARCHIVE' } }),
    ]);

    const resolvedUkuranKertas = (kertasTpCfg?.value || kertasGlobalCfg?.value || 'A4') as 'A4' | 'F4';
    const resolvedTampilkanKop = kopTpCfg ? kopTpCfg.value === 'true' : (kopGlobalCfg ? kopGlobalCfg.value === 'true' : true);
    const resolvedTampilkanQr = qrTpCfg ? qrTpCfg.value === 'true' : (qrGlobalCfg ? qrGlobalCfg.value === 'true' : true);

    let resolvedTampilkanKokurikuler: boolean;
    if (kokurikulerTpCfg) {
      resolvedTampilkanKokurikuler = kokurikulerTpCfg.value === 'true';
    } else if (kokurikulerGlobalCfg) {
      resolvedTampilkanKokurikuler = kokurikulerGlobalCfg.value === 'true';
    } else {
      // Smart Academic Default: <= 2024/2025 is false (tanpa kokurikuler), >= 2025/2026 is true
      resolvedTampilkanKokurikuler = startYear >= 2025;
    }

    let resolvedAktifkanSumatifArsip: boolean;
    if (sumatifArchiveTpCfg) {
      resolvedAktifkanSumatifArsip = sumatifArchiveTpCfg.value === 'true';
    } else if (sumatifArchiveGlobalCfg) {
      resolvedAktifkanSumatifArsip = sumatifArchiveGlobalCfg.value === 'true';
    } else {
      resolvedAktifkanSumatifArsip = true;
    }

    return {
      tahun_pelajaran_id: tpId || null,
      semester_id: semId || null,
      tempat_terbit: tempatTerbitCfg?.value || sekolah?.kota || 'Purwakarta',
      tanggal_rapor: tanggalRaporCfg?.value || '',
      tanggal_rapor_p5: tanggalP5Cfg?.value || '',
      tanggal_rapor_pts: tanggalPtsCfg?.value || '',
      tanggal_pleno: tanggalPlenoCfg?.value || '',

      // Explicit Ganjil & Genap
      ganjil_semester_id: ganjilId || null,
      genap_semester_id: genapId || null,
      tanggal_rapor_ganjil: raporGanjilCfg?.value || '',
      tanggal_p5_ganjil: p5GanjilCfg?.value || '',
      tanggal_pts_ganjil: ptsGanjilCfg?.value || '',
      tanggal_rapor_genap: raporGenapCfg?.value || '',
      tanggal_p5_genap: p5GenapCfg?.value || '',
      tanggal_pts_genap: ptsGenapCfg?.value || '',
      tanggal_pleno_genap: plenoGenapCfg?.value || '',
      tanggal_kelulusan: kelulusanCfg?.value || '',

      kepsek_status: (kepsekStatusCfg?.value || 'DEFINITIF') as 'DEFINITIF' | 'PLT',
      kepsek_nama: kepsekNamaCfg?.value || sekolah?.kepala_sekolah || '',
      kepsek_nip: kepsekNipCfg?.value || sekolah?.nip_kepala || '',
      ukuran_kertas: resolvedUkuranKertas,
      tampilkan_kop: resolvedTampilkanKop,
      tampilkan_qr: resolvedTampilkanQr,
      tampilkan_kokurikuler: resolvedTampilkanKokurikuler,
      aktifkan_sumatif_arsip: resolvedAktifkanSumatifArsip,
    };
  }

  static async updateSettings(
    tenantId: string,
    payload: {
      tahun_pelajaran_id?: string;
      semester_id?: string;
      tempat_terbit?: string;
      tanggal_rapor?: string;
      tanggal_rapor_p5?: string;
      tanggal_rapor_pts?: string;
      tanggal_pleno?: string;
      // Ganjil & Genap explicit
      ganjil_semester_id?: string;
      genap_semester_id?: string;
      tanggal_rapor_ganjil?: string;
      tanggal_p5_ganjil?: string;
      tanggal_pts_ganjil?: string;
      tanggal_rapor_genap?: string;
      tanggal_p5_genap?: string;
      tanggal_pts_genap?: string;
      tanggal_pleno_genap?: string;
      tanggal_kelulusan?: string;

      kepsek_status?: 'DEFINITIF' | 'PLT';
      kepsek_nama?: string;
      kepsek_nip?: string;
      ukuran_kertas?: 'A4' | 'F4';
      tampilkan_kop?: boolean;
      tampilkan_qr?: boolean;
      tampilkan_kokurikuler?: boolean;
      aktifkan_sumatif_arsip?: boolean;
    }
  ) {
    const tpId = payload.tahun_pelajaran_id;
    const semId = payload.semester_id;

    if (tpId) {
      if (payload.tempat_terbit !== undefined) {
        await this.updateConfig(tenantId, `RAPOR_TEMPAT_TERBIT_${tpId}`, payload.tempat_terbit);
      }
      if (payload.kepsek_status !== undefined) {
        await this.updateConfig(tenantId, `RAPOR_KEPSEK_STATUS_${tpId}`, payload.kepsek_status);
      }
      if (payload.kepsek_nama !== undefined) {
        await this.updateConfig(tenantId, `RAPOR_KEPSEK_NAMA_${tpId}`, payload.kepsek_nama);
      }
      if (payload.kepsek_nip !== undefined) {
        await this.updateConfig(tenantId, `RAPOR_KEPSEK_NIP_${tpId}`, payload.kepsek_nip);
      }
      if (payload.tanggal_kelulusan !== undefined) {
        await this.updateConfig(tenantId, `RAPOR_TANGGAL_KELULUSAN_${tpId}`, payload.tanggal_kelulusan);
      }

      // 1. Resolve Ganjil & Genap semester IDs if not provided
      let ganjilId = payload.ganjil_semester_id;
      let genapId = payload.genap_semester_id;
      if (!ganjilId || !genapId) {
        const semesters = await prisma.semester.findMany({
          where: { tenant_id: tenantId, tahun_pelajaran_id: tpId },
          orderBy: { created_at: 'asc' },
        });
        if (!ganjilId) {
          const ganjil = semesters.find(s => 
            (s.nama_semester || '').toLowerCase().includes('ganjil') || 
            (s.nama_semester || '').includes('1')
          ) || semesters[0];
          ganjilId = ganjil?.id;
        }
        if (!genapId) {
          const genap = semesters.find(s => 
            (s.nama_semester || '').toLowerCase().includes('genap') || 
            (s.nama_semester || '').includes('2')
          ) || (semesters.length > 1 ? semesters[1] : undefined);
          genapId = genap?.id;
        }
      }

      // Save Ganjil Specifics
      if (ganjilId) {
        if (payload.tanggal_rapor_ganjil !== undefined) {
          await this.updateConfig(tenantId, `RAPOR_TANGGAL_RAPOR_${tpId}_${ganjilId}`, payload.tanggal_rapor_ganjil);
        }
        if (payload.tanggal_p5_ganjil !== undefined) {
          await this.updateConfig(tenantId, `RAPOR_TANGGAL_P5_${tpId}_${ganjilId}`, payload.tanggal_p5_ganjil);
        }
        if (payload.tanggal_pts_ganjil !== undefined) {
          await this.updateConfig(tenantId, `RAPOR_TANGGAL_PTS_${tpId}_${ganjilId}`, payload.tanggal_pts_ganjil);
        }
      }

      // Save Genap Specifics
      if (genapId) {
        if (payload.tanggal_rapor_genap !== undefined) {
          await this.updateConfig(tenantId, `RAPOR_TANGGAL_RAPOR_${tpId}_${genapId}`, payload.tanggal_rapor_genap);
        }
        if (payload.tanggal_p5_genap !== undefined) {
          await this.updateConfig(tenantId, `RAPOR_TANGGAL_P5_${tpId}_${genapId}`, payload.tanggal_p5_genap);
        }
        if (payload.tanggal_pts_genap !== undefined) {
          await this.updateConfig(tenantId, `RAPOR_TANGGAL_PTS_${tpId}_${genapId}`, payload.tanggal_pts_genap);
        }
        if (payload.tanggal_pleno_genap !== undefined) {
          await this.updateConfig(tenantId, `RAPOR_TANGGAL_PLENO_${tpId}_${genapId}`, payload.tanggal_pleno_genap);
        }
      }

      // Legacy fallback per semester_id
      if (semId) {
        if (payload.tanggal_rapor !== undefined) {
          await this.updateConfig(tenantId, `RAPOR_TANGGAL_RAPOR_${tpId}_${semId}`, payload.tanggal_rapor);
        }
        if (payload.tanggal_rapor_p5 !== undefined) {
          await this.updateConfig(tenantId, `RAPOR_TANGGAL_P5_${tpId}_${semId}`, payload.tanggal_rapor_p5);
        }
        if (payload.tanggal_rapor_pts !== undefined) {
          await this.updateConfig(tenantId, `RAPOR_TANGGAL_PTS_${tpId}_${semId}`, payload.tanggal_rapor_pts);
        }
        if (payload.tanggal_pleno !== undefined) {
          await this.updateConfig(tenantId, `RAPOR_TANGGAL_PLENO_${tpId}_${semId}`, payload.tanggal_pleno);
        }
      }

      // Format configs scoped to Academic Year (TP)
      if (payload.ukuran_kertas !== undefined) {
        await this.updateConfig(tenantId, `RAPOR_UKURAN_KERTAS_${tpId}`, payload.ukuran_kertas);
      }
      if (payload.tampilkan_kop !== undefined) {
        await this.updateConfig(tenantId, `RAPOR_TAMPILKAN_KOP_${tpId}`, String(payload.tampilkan_kop));
      }
      if (payload.tampilkan_qr !== undefined) {
        await this.updateConfig(tenantId, `RAPOR_TAMPILKAN_QR_${tpId}`, String(payload.tampilkan_qr));
      }
      if (payload.tampilkan_kokurikuler !== undefined) {
        await this.updateConfig(tenantId, `RAPOR_SHOW_KOKURIKULER_${tpId}`, String(payload.tampilkan_kokurikuler));
      }
      if (payload.aktifkan_sumatif_arsip !== undefined) {
        await this.updateConfig(tenantId, `RAPOR_ENABLE_SUMATIF_ARCHIVE_${tpId}`, String(payload.aktifkan_sumatif_arsip));
      }
    }

    // Always update global config as fallback / new default
    if (payload.ukuran_kertas !== undefined) {
      await this.updateConfig(tenantId, 'RAPOR_UKURAN_KERTAS', payload.ukuran_kertas);
    }
    if (payload.tampilkan_kop !== undefined) {
      await this.updateConfig(tenantId, 'RAPOR_TAMPILKAN_KOP', String(payload.tampilkan_kop));
    }
    if (payload.tampilkan_qr !== undefined) {
      await this.updateConfig(tenantId, 'RAPOR_TAMPILKAN_QR', String(payload.tampilkan_qr));
    }
    if (payload.tampilkan_kokurikuler !== undefined) {
      await this.updateConfig(tenantId, 'RAPOR_SHOW_KOKURIKULER', String(payload.tampilkan_kokurikuler));
    }
    if (payload.aktifkan_sumatif_arsip !== undefined) {
      await this.updateConfig(tenantId, 'RAPOR_ENABLE_SUMATIF_ARCHIVE', String(payload.aktifkan_sumatif_arsip));
    }

    void cacheInvalidationService.invalidateRaporCache(tenantId);
    return { success: true };
  }

  private static async updateConfig(tenantId: string, key: string, value: string) {
    const existing = await prisma.config.findFirst({
      where: { tenant_id: tenantId, key },
    });
    if (existing) {
      await prisma.config.update({
        where: { id: existing.id },
        data: { value },
      });
    } else {
      await prisma.config.create({
        data: {
          tenant_id: tenantId,
          key,
          value,
        },
      });
    }
  }
}
