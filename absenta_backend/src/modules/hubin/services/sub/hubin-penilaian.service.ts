// @ts-nocheck
import { prisma } from '@/utils/prisma';
import crypto from 'crypto';
import { activityLogService } from '@/modules/activity/services/activity-log.service';
import { studentResolverService } from '@/services/student-resolver.service';
import { waGatewayService } from '@/services/wa-gateway.service';
import { getRedisConnection } from '@/queue/redis';
import { cacheService } from '@/utils/cache.service';
import { cacheInvalidationService } from '@/utils/cache-invalidation.service';
import { CACHE_KEYS, CACHE_TTL } from '@/constants/cache-keys';
import { HubinCommonHelper } from './hubin-common.helper';

export class HubinPenilaianService extends HubinCommonHelper {
  async updatePenilaian(tenantId: string, id: string, nilai: any, requesterId?: string, org?: any) {
    if (requesterId) {
      await this.ensureOwnership(tenantId, id, requesterId, org);
    }
    const res = await prisma.siswaPkl.update({
      where: { id, tenant_id: tenantId },
      data: {
        nilai_json: nilai
      }
    });
    await cacheInvalidationService.invalidateHubinCache(tenantId);
    return res;
  }

  private async updateConfig(tenantId: string, key: string, value: string) {
    const existing = await prisma.config.findFirst({
      where: { tenant_id: tenantId, key }
    });
    if (existing) {
      return await prisma.config.update({
        where: { id: existing.id },
        data: { value }
      });
    } else {
      return await prisma.config.create({
        data: { tenant_id: tenantId, key, value }
      });
    }
  }

  async getSettings(tenantId: string, tahunPelajaranId?: string) {
    let targetTpId = tahunPelajaranId;
    if (!targetTpId) {
      const activeTp = await prisma.tahunPelajaran.findFirst({
        where: { tenant_id: tenantId, is_active: true }
      });
      targetTpId = activeTp?.id;
    }

    const [
      configUrl, 
      configMode, 
      configAssessmentMode, 
      configWeightDudi, 
      configWeightLaporan, 
      configWeightSidang,
      tpNomorSurat,
      tpTanggalTerbit,
      tpDurasiJp,
      tpTempatTerbit,
      tpPenandatanganNama,
      tpPenandatanganNip,
      globalNomorSurat,
      globalTanggalTerbit,
      globalDurasiJp,
      sekolah
    ] = await Promise.all([
      prisma.config.findFirst({ where: { tenant_id: tenantId, key: 'HUBIN_GOOGLE_DRIVE_FOLDER_URL' } }),
      prisma.config.findFirst({ where: { tenant_id: tenantId, key: 'HUBIN_GOOGLE_DRIVE_MODE' } }),
      prisma.config.findFirst({ where: { tenant_id: tenantId, key: 'HUBIN_PKL_ASSESSMENT_MODE' } }),
      prisma.config.findFirst({ where: { tenant_id: tenantId, key: 'HUBIN_PKL_WEIGHT_DUDI' } }),
      prisma.config.findFirst({ where: { tenant_id: tenantId, key: 'HUBIN_PKL_WEIGHT_LAPORAN' } }),
      prisma.config.findFirst({ where: { tenant_id: tenantId, key: 'HUBIN_PKL_WEIGHT_SIDANG' } }),
      targetTpId ? prisma.config.findFirst({ where: { tenant_id: tenantId, key: `HUBIN_PKL_NOMOR_SURAT_${targetTpId}` } }) : null,
      targetTpId ? prisma.config.findFirst({ where: { tenant_id: tenantId, key: `HUBIN_PKL_TANGGAL_TERBIT_${targetTpId}` } }) : null,
      targetTpId ? prisma.config.findFirst({ where: { tenant_id: tenantId, key: `HUBIN_PKL_DURASI_JP_${targetTpId}` } }) : null,
      targetTpId ? prisma.config.findFirst({ where: { tenant_id: tenantId, key: `HUBIN_PKL_TEMPAT_TERBIT_${targetTpId}` } }) : null,
      targetTpId ? prisma.config.findFirst({ where: { tenant_id: tenantId, key: `HUBIN_PKL_PENANDATANGAN_NAMA_${targetTpId}` } }) : null,
      targetTpId ? prisma.config.findFirst({ where: { tenant_id: tenantId, key: `HUBIN_PKL_PENANDATANGAN_NIP_${targetTpId}` } }) : null,
      prisma.config.findFirst({ where: { tenant_id: tenantId, key: 'HUBIN_PKL_NOMOR_SURAT' } }),
      prisma.config.findFirst({ where: { tenant_id: tenantId, key: 'HUBIN_PKL_TANGGAL_TERBIT' } }),
      prisma.config.findFirst({ where: { tenant_id: tenantId, key: 'HUBIN_PKL_DURASI_JP' } }),
      prisma.sekolah.findFirst({ where: { tenant_id: tenantId } }),
    ]);

    return {
      folderUrl: configUrl?.value || '',
      driveMode: configMode?.value || 'simulated',
      assessmentMode: (configAssessmentMode?.value as 'DUDI_ONLY' | 'COMPOSITE') || 'DUDI_ONLY',
      weightDudi: configWeightDudi ? Number(configWeightDudi.value) : 70,
      weightLaporan: configWeightLaporan ? Number(configWeightLaporan.value) : 15,
      weightSidang: configWeightSidang ? Number(configWeightSidang.value) : 15,
      tahun_pelajaran_id: targetTpId || null,
      nomorSuratSertifikat: tpNomorSurat?.value || globalNomorSurat?.value || '425.1/0630/SMKN1PLD-KCD Wil.IV',
      tanggalTerbitSertifikat: tpTanggalTerbit?.value || globalTanggalTerbit?.value || '',
      durasiJp: tpDurasiJp?.value || globalDurasiJp?.value || '792',
      tempatTerbit: tpTempatTerbit?.value || sekolah?.kota || 'Purwakarta',
      penandatanganNama: tpPenandatanganNama?.value || sekolah?.kepala_sekolah || '',
      penandatanganNip: tpPenandatanganNip?.value || sekolah?.nip_kepala || '',
    };
  }

  async updateSettings(tenantId: string, payload: any) {
    const data = payload?.data || payload || {};
    if (data.folderUrl !== undefined) await this.updateConfig(tenantId, 'HUBIN_GOOGLE_DRIVE_FOLDER_URL', data.folderUrl);
    if (data.driveMode !== undefined) await this.updateConfig(tenantId, 'HUBIN_GOOGLE_DRIVE_MODE', data.driveMode);
    if (data.assessmentMode !== undefined) await this.updateConfig(tenantId, 'HUBIN_PKL_ASSESSMENT_MODE', data.assessmentMode);
    if (data.weightDudi !== undefined) await this.updateConfig(tenantId, 'HUBIN_PKL_WEIGHT_DUDI', String(data.weightDudi));
    if (data.weightLaporan !== undefined) await this.updateConfig(tenantId, 'HUBIN_PKL_WEIGHT_LAPORAN', String(data.weightLaporan));
    if (data.weightSidang !== undefined) await this.updateConfig(tenantId, 'HUBIN_PKL_WEIGHT_SIDANG', String(data.weightSidang));

    // Scoped Academic Year certificate reference settings
    const tpId = data.tahun_pelajaran_id;
    if (tpId) {
      if (data.nomorSuratSertifikat !== undefined) {
        await this.updateConfig(tenantId, `HUBIN_PKL_NOMOR_SURAT_${tpId}`, data.nomorSuratSertifikat);
        await this.updateConfig(tenantId, 'HUBIN_PKL_NOMOR_SURAT', data.nomorSuratSertifikat);
      }
      if (data.tanggalTerbitSertifikat !== undefined) {
        await this.updateConfig(tenantId, `HUBIN_PKL_TANGGAL_TERBIT_${tpId}`, data.tanggalTerbitSertifikat);
        await this.updateConfig(tenantId, 'HUBIN_PKL_TANGGAL_TERBIT', data.tanggalTerbitSertifikat);
      }
      if (data.durasiJp !== undefined) {
        await this.updateConfig(tenantId, `HUBIN_PKL_DURASI_JP_${tpId}`, String(data.durasiJp));
        await this.updateConfig(tenantId, 'HUBIN_PKL_DURASI_JP', String(data.durasiJp));
      }
      if (data.tempatTerbit !== undefined) {
        await this.updateConfig(tenantId, `HUBIN_PKL_TEMPAT_TERBIT_${tpId}`, data.tempatTerbit);
      }
      if (data.penandatanganNama !== undefined) {
        await this.updateConfig(tenantId, `HUBIN_PKL_PENANDATANGAN_NAMA_${tpId}`, data.penandatanganNama);
      }
      if (data.penandatanganNip !== undefined) {
        await this.updateConfig(tenantId, `HUBIN_PKL_PENANDATANGAN_NIP_${tpId}`, data.penandatanganNip);
      }
    } else {
      if (data.nomorSuratSertifikat !== undefined) await this.updateConfig(tenantId, 'HUBIN_PKL_NOMOR_SURAT', data.nomorSuratSertifikat);
      if (data.tanggalTerbitSertifikat !== undefined) await this.updateConfig(tenantId, 'HUBIN_PKL_TANGGAL_TERBIT', data.tanggalTerbitSertifikat);
      if (data.durasiJp !== undefined) await this.updateConfig(tenantId, 'HUBIN_PKL_DURASI_JP', String(data.durasiJp));
      if (data.tempatTerbit !== undefined) await this.updateConfig(tenantId, 'HUBIN_PKL_TEMPAT_TERBIT', data.tempatTerbit);
      if (data.penandatanganNama !== undefined) await this.updateConfig(tenantId, 'HUBIN_PKL_PENANDATANGAN_NAMA', data.penandatanganNama);
      if (data.penandatanganNip !== undefined) await this.updateConfig(tenantId, 'HUBIN_PKL_PENANDATANGAN_NIP', data.penandatanganNip);
    }

    await cacheInvalidationService.invalidateHubinCache(tenantId);
    return { success: true };
  }

  async verifyAbsensi(tenantId: string, id: string, requesterId?: string, org?: any) {
    if (requesterId) {
      // For absensi, we need to get the SiswaPkl ID first to check ownership
      const absensi = await prisma.absensiPkl.findFirst({
        where: { id, tenant_id: tenantId }
      });
      if (absensi) {
        await this.ensureOwnership(tenantId, absensi.siswa_pkl_id, requesterId, org);
      }
    }
    
    const res = await prisma.absensiPkl.update({
      where: { id },
      data: {
        is_verified: true,
        verified_by: requesterId,
        verifikasi_at: new Date()
      }
    });
    await cacheInvalidationService.invalidateHubinCache(tenantId);
    return res;
  }

  // --- 5. MANAJEMEN RIWAYAT MoU (MoU History) ---

  async getTefaOrders(tenantId: string, params?: { search?: string; statusProyek?: string; page?: number; limit?: number }) {
    const page = params?.page || 1;
    const limit = params?.limit || 100;
    const skip = (page - 1) * limit;

    const where: any = { tenant_id: tenantId, deleted_at: null };
    if (params?.statusProyek) where.status_proyek = params.statusProyek;
    if (params?.search) {
      where.nama_proyek = { contains: params.search, mode: 'insensitive' };
    }

    const [total, data] = await Promise.all([
      prisma.hubinTefaOrder.count({ where }),
      prisma.hubinTefaOrder.findMany({
        where,
        include: {
          Mitra: { select: { nama: true } }
        },
        orderBy: { created_at: 'desc' },
        skip,
        take: limit
      })
    ]);

    return {
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async createTefaOrder(tenantId: string, data: any, actorUserId?: string | null) {
    const result = await prisma.hubinTefaOrder.create({
      data: {
        ...data,
        tenant_id: tenantId,
        nilai_kontrak: data.nilai_kontrak ? parseFloat(data.nilai_kontrak) : null,
        tanggal_mulai: data.tanggal_mulai ? new Date(data.tanggal_mulai) : null,
        tanggal_target: data.tanggal_target ? new Date(data.tanggal_target) : null
      }
    });
    this.log(tenantId, actorUserId || null, 'HUBIN_TEFA_CREATE', 'HubinTefaOrder', result.id, { nama_proyek: result.nama_proyek });
    return result;
  }

  async updateTefaOrder(tenantId: string, id: string, data: any, actorUserId?: string | null) {
    const updateData = { ...data };
    if (data.nilai_kontrak) updateData.nilai_kontrak = parseFloat(data.nilai_kontrak);
    if (data.tanggal_mulai) updateData.tanggal_mulai = new Date(data.tanggal_mulai);
    if (data.tanggal_target) updateData.tanggal_target = new Date(data.tanggal_target);
    
    const result = await prisma.hubinTefaOrder.update({
      where: { id, tenant_id: tenantId },
      data: updateData
    });
    this.log(tenantId, actorUserId || null, 'HUBIN_TEFA_UPDATE', 'HubinTefaOrder', id, { nama_proyek: result.nama_proyek });
    return result;
  }

  async deleteTefaOrder(tenantId: string, id: string, actorUserId?: string | null) {
    const result = await prisma.hubinTefaOrder.update({
      where: { id, tenant_id: tenantId },
      data: { deleted_at: new Date() }
    });
    this.log(tenantId, actorUserId || null, 'HUBIN_TEFA_DELETE', 'HubinTefaOrder', id, { nama_proyek: result.nama_proyek });
    return result;
  }

  /**
   * Helper: Calculate distance between two points in meters (Haversine formula)
   */
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3; // Earth's radius in meters
    const phi1 = (lat1 * Math.PI) / 180;
    const phi2 = (lat2 * Math.PI) / 180;
    const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
    const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
      Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  async getRecentActivity(tenantId: string, limit: number = 15) {
    const logs = await prisma.activityLog.findMany({
      where: {
        tenant_id: tenantId,
        action: { startsWith: 'HUBIN_' }
      },
      orderBy: { created_at: 'desc' },
      take: limit,
      include: {
        User: { select: { full_name: true } }
      }
    });

    return logs.map(log => ({
      id: log.id,
      action: log.action,
      actor: log.User?.full_name || 'System / Anonim',
      entity: log.entity,
      entity_id: log.entity_id,
      metadata: log.metadata ? JSON.parse(log.metadata) : null,
      created_at: log.created_at
    }));
  }

  async verifySiswaPklOwnership(tenantId: string, siswaPklId: string, siswaId: string): Promise<boolean> {
    const pkl = await prisma.siswaPkl.findFirst({
      where: { tenant_id: tenantId, id: siswaPklId, siswa_id: siswaId }
    });
    return !!pkl;
  }

  /**
   * 🏭 BATCH UPSERT NILAI PKL (HARD SKILL, SOFT SKILL, ABSENSI, & CERTIFICATE INFO)
   * Formula: Nilai Akhir PKL = Rata-rata (3 Hard Skills + 5 Soft Skills)
   * Integrasi Otomatis: Menyinkronkan Nilai Akhir & Deskripsi TP ke tabel NilaiSiswa (Mapel PKL)
   */
  async upsertNilaiPklBatch(
    tenantId: string,
    scores: Array<{
      siswa_pkl_id: string;
      instruktur_nama?: string | null;
      penanggung_jawab_nama?: string | null;
      alamat_dudi?: string | null;
      hard_kompetensi_teknis?: number | null;
      hard_sop_k3lh?: number | null;
      hard_alur_bisnis?: number | null;
      soft_kedisiplinan?: number | null;
      soft_kerajinan_inisiatif?: number | null;
      soft_kerjasama?: number | null;
      soft_kejujuran?: number | null;
      soft_tanggung_jawab?: number | null;
      catatan_pkl?: string | null;
      sakit_pkl?: number | null;
      izin_pkl?: number | null;
      alpa_pkl?: number | null;
      nomor_sertifikat?: string | null;
      deskripsi_tp?: string | null;
      tahun_pelajaran_id?: string | null;
      semester_id?: string | null;
      nilai_laporan?: number | null;
      nilai_sidang?: number | null;
      penguji_nama?: string | null;
      penguji_id?: string | null;
      catatan_sidang?: string | null;
      tanggal_sidang?: string | null;
    }>
  ) {
    // 1. Fetch relevant SiswaPkl records to identify Siswa and Academic Context
    const pklIds = scores.map((s) => s.siswa_pkl_id);
    const pklRecords = await prisma.siswaPkl.findMany({
      where: { id: { in: pklIds }, tenant_id: tenantId },
      include: {
        Siswa: { select: { id: true, kelas_id: true, tahun_pelajaran_id: true, semester_id: true } },
        SiswaAkademik: { select: { id: true, kelas_id: true, tahun_pelajaran_id: true, semester_id: true } },
      },
    });
    const pklMap = new Map(pklRecords.map((r) => [r.id, r]));

    // 2. Resolve Mapel PKL for this tenant
    let mapelPkl = await prisma.mapel.findFirst({
      where: {
        tenant_id: tenantId,
        OR: [
          { kode_mapel: { equals: 'PKL', mode: 'insensitive' } },
          { nama_mapel: { contains: 'Praktik Kerja', mode: 'insensitive' } },
        ],
      },
    });

    if (!mapelPkl) {
      try {
        mapelPkl = await prisma.mapel.create({
          data: {
            tenant_id: tenantId,
            nama_mapel: 'Praktik Kerja Lapangan',
            kode_mapel: 'PKL',
            tingkat: 12,
            kelompok_mapel: 'KEJURUAN',
          },
        });
      } catch (err) {
        mapelPkl = await prisma.mapel.findFirst({
          where: { tenant_id: tenantId, kode_mapel: 'PKL' },
        });
      }
    }

    // 3. Fallback active academic context & Assessment Scheme Configurations
    const [
      activeTp, 
      activeSem, 
      configAssessmentMode, 
      configWeightDudi, 
      configWeightLaporan, 
      configWeightSidang
    ] = await Promise.all([
      prisma.tahunPelajaran.findFirst({ where: { tenant_id: tenantId, is_active: true } }),
      prisma.semester.findFirst({ where: { tenant_id: tenantId, is_active: true } }),
      prisma.config.findFirst({ where: { tenant_id: tenantId, key: 'HUBIN_PKL_ASSESSMENT_MODE' } }),
      prisma.config.findFirst({ where: { tenant_id: tenantId, key: 'HUBIN_PKL_WEIGHT_DUDI' } }),
      prisma.config.findFirst({ where: { tenant_id: tenantId, key: 'HUBIN_PKL_WEIGHT_LAPORAN' } }),
      prisma.config.findFirst({ where: { tenant_id: tenantId, key: 'HUBIN_PKL_WEIGHT_SIDANG' } }),
    ]);

    const assessmentMode = (configAssessmentMode?.value as 'DUDI_ONLY' | 'COMPOSITE') || 'DUDI_ONLY';
    const weightDudi = configWeightDudi ? Number(configWeightDudi.value) : 70;
    const weightLaporan = configWeightLaporan ? Number(configWeightLaporan.value) : 15;
    const weightSidang = configWeightSidang ? Number(configWeightSidang.value) : 15;

    const operations: any[] = [];

    for (const item of scores) {
      // 1. Collect non-null grades to compute Nilai DUDI (8 Aspek)
      const dudiGradeList = [
        item.hard_kompetensi_teknis,
        item.hard_sop_k3lh,
        item.hard_alur_bisnis,
        item.soft_kedisiplinan,
        item.soft_kerajinan_inisiatif,
        item.soft_kerjasama,
        item.soft_kejujuran,
        item.soft_tanggung_jawab,
      ].filter((v): v is number => v !== null && v !== undefined && !isNaN(v));

      const dudiAvg = dudiGradeList.length > 0
        ? Number((dudiGradeList.reduce((acc, curr) => acc + curr, 0) / dudiGradeList.length).toFixed(2))
        : null;

      // 2. Resolve Laporan, Sidang, and Penguji from payload or existing nilai_json
      const pklRec = pklMap.get(item.siswa_pkl_id);
      const prevNilaiJson = (pklRec?.nilai_json as Record<string, any>) || {};

      const nilaiLaporan = item.nilai_laporan !== undefined 
        ? item.nilai_laporan 
        : (prevNilaiJson.nilai_laporan ?? null);

      const nilaiSidang = item.nilai_sidang !== undefined 
        ? item.nilai_sidang 
        : (prevNilaiJson.nilai_sidang ?? null);

      const pengujiNama = item.penguji_nama !== undefined 
        ? item.penguji_nama 
        : (prevNilaiJson.penguji_nama ?? null);

      const pengujiId = item.penguji_id !== undefined 
        ? item.penguji_id 
        : (prevNilaiJson.penguji_id ?? null);

      const catatanSidang = item.catatan_sidang !== undefined 
        ? item.catatan_sidang 
        : (prevNilaiJson.catatan_sidang ?? null);

      const tanggalSidang = item.tanggal_sidang !== undefined 
        ? item.tanggal_sidang 
        : (prevNilaiJson.tanggal_sidang ?? null);

      const updatedNilaiJson = {
        ...prevNilaiJson,
        dudi_avg: dudiAvg,
        nilai_laporan: nilaiLaporan,
        nilai_sidang: nilaiSidang,
        penguji_nama: pengujiNama,
        penguji_id: pengujiId,
        catatan_sidang: catatanSidang,
        tanggal_sidang: tanggalSidang,
      };

      // 3. Compute Nilai Akhir with Smart Dynamic Proportional Fallback
      let nilaiAkhir: number | null = null;
      let predikat: string | null = null;

      if (assessmentMode === 'COMPOSITE') {
        let totalWeightedScore = 0;
        let totalActiveWeights = 0;

        if (dudiAvg !== null) {
          totalWeightedScore += dudiAvg * weightDudi;
          totalActiveWeights += weightDudi;
        }
        if (nilaiLaporan !== null && !isNaN(nilaiLaporan)) {
          totalWeightedScore += Number(nilaiLaporan) * weightLaporan;
          totalActiveWeights += weightLaporan;
        }
        if (nilaiSidang !== null && !isNaN(nilaiSidang)) {
          totalWeightedScore += Number(nilaiSidang) * weightSidang;
          totalActiveWeights += weightSidang;
        }

        if (totalActiveWeights > 0) {
          nilaiAkhir = Number((totalWeightedScore / totalActiveWeights).toFixed(2));
        }
      } else {
        // DUDI_ONLY
        nilaiAkhir = dudiAvg;
      }

      if (nilaiAkhir !== null) {
        if (nilaiAkhir >= 90) predikat = 'Sangat Baik';
        else if (nilaiAkhir >= 80) predikat = 'Baik';
        else if (nilaiAkhir >= 70) predikat = 'Cukup';
        else predikat = 'Kurang';
      }

      // 4. Update SiswaPkl record (including nilai_json)
      operations.push(
        prisma.siswaPkl.update({
          where: { id: item.siswa_pkl_id },
          data: {
            instruktur_nama: item.instruktur_nama ?? undefined,
            penanggung_jawab_nama: item.penanggung_jawab_nama ?? undefined,
            alamat_dudi: item.alamat_dudi ?? undefined,
            hard_kompetensi_teknis: item.hard_kompetensi_teknis ?? undefined,
            hard_sop_k3lh: item.hard_sop_k3lh ?? undefined,
            hard_alur_bisnis: item.hard_alur_bisnis ?? undefined,
            soft_kedisiplinan: item.soft_kedisiplinan ?? undefined,
            soft_kerajinan_inisiatif: item.soft_kerajinan_inisiatif ?? undefined,
            soft_kerjasama: item.soft_kerjasama ?? undefined,
            soft_kejujuran: item.soft_kejujuran ?? undefined,
            soft_tanggung_jawab: item.soft_tanggung_jawab ?? undefined,
            nilai_akhir_pkl: nilaiAkhir,
            predikat_pkl: predikat,
            catatan_pkl: item.catatan_pkl ?? undefined,
            sakit_pkl: item.sakit_pkl ?? undefined,
            izin_pkl: item.izin_pkl ?? undefined,
            alpa_pkl: item.alpa_pkl ?? undefined,
            nomor_sertifikat: item.nomor_sertifikat ?? undefined,
            deskripsi_tp: item.deskripsi_tp ?? undefined,
            nilai_json: updatedNilaiJson,
          },
        })
      );

      // Auto-Sync to NilaiSiswa for academic report card
      if (nilaiAkhir !== null && mapelPkl) {
        const pklRec = pklMap.get(item.siswa_pkl_id);
        const targetSiswaId = pklRec?.siswa_id;
        const targetTpId =
          item.tahun_pelajaran_id ||
          pklRec?.SiswaAkademik?.tahun_pelajaran_id ||
          pklRec?.Siswa?.tahun_pelajaran_id ||
          activeTp?.id;
        const targetSemId =
          item.semester_id ||
          pklRec?.SiswaAkademik?.semester_id ||
          pklRec?.Siswa?.semester_id ||
          activeSem?.id;

        if (targetSiswaId && targetTpId && targetSemId) {
          operations.push(
            prisma.nilaiSiswa.upsert({
              where: {
                siswa_id_mapel_id_tahun_pelajaran_id_semester_id: {
                  siswa_id: targetSiswaId,
                  mapel_id: mapelPkl.id,
                  tahun_pelajaran_id: targetTpId,
                  semester_id: targetSemId,
                },
              },
              update: {
                nilai: nilaiAkhir,
                nilai_akhir_sumatif: nilaiAkhir,
                nilai_rapor_final: nilaiAkhir,
                capaian_kompetensi: item.deskripsi_tp ?? undefined,
                catatan_deskripsi: item.catatan_pkl ?? undefined,
              },
              create: {
                tenant_id: tenantId,
                siswa_id: targetSiswaId,
                mapel_id: mapelPkl.id,
                tahun_pelajaran_id: targetTpId,
                semester_id: targetSemId,
                nilai: nilaiAkhir,
                nilai_akhir_sumatif: nilaiAkhir,
                nilai_rapor_final: nilaiAkhir,
                capaian_kompetensi: item.deskripsi_tp ?? null,
                catatan_deskripsi: item.catatan_pkl ?? null,
              },
            })
          );
        }
      }
    }

    const results = await prisma.$transaction(operations);

    // Auto Invalidate PKL, Hubin and Rapor Caches
    void cacheInvalidationService.invalidatePklCache(tenantId);
    void cacheInvalidationService.invalidateHubinCache(tenantId);
    void cacheInvalidationService.invalidateRaporCache(tenantId);
    return results;
  }

  /**
   * ⚡ GET REKAP PKL SISWA (WITH FAST-PATH REDIS CACHING)
   */
  async getRekapPklSiswa(
    tenantId: string,
    params?: { 
      kelas_id?: string; 
      status?: string; 
      search?: string;
      tahun_pelajaran_id?: string;
      semester_id?: string;
      pembimbing_id?: string;
    }
  ) {
    const cacheKey = `hubin:${tenantId}:pkl_rekap:${params?.kelas_id || 'all'}:${params?.tahun_pelajaran_id || 'all'}:${params?.semester_id || 'all'}:${params?.pembimbing_id || 'all'}:${params?.status || 'all'}:${params?.search || 'all'}`;

    return await cacheService.getOrSet(
      cacheKey,
      async () => {
        const where: any = { tenant_id: tenantId };
        if (params?.status) where.status = params.status;
        if (params?.pembimbing_id) where.pembimbing_id = params.pembimbing_id;

        if (params?.kelas_id) {
          where.Siswa = { ...where.Siswa, kelas_id: params.kelas_id };
        }
        if (params?.search) {
          where.Siswa = {
            ...where.Siswa,
            nama_siswa: { contains: params.search, mode: 'insensitive' },
          };
        }

        if (params?.tahun_pelajaran_id || params?.semester_id) {
          const academicCondition: any = {};
          if (params.tahun_pelajaran_id) academicCondition.tahun_pelajaran_id = params.tahun_pelajaran_id;
          if (params.semester_id) academicCondition.semester_id = params.semester_id;

          where.OR = [
            { SiswaAkademik: academicCondition },
            {
              AND: [
                { siswa_akademik_id: null },
                { Siswa: academicCondition }
              ]
            }
          ];
        }

        const list = await prisma.siswaPkl.findMany({
          where,
          include: {
            Siswa: {
              select: {
                id: true,
                nama_siswa: true,
                nis: true,
                nisn: true,
                tempat_lahir: true,
                tanggal_lahir: true,
                kelas_id: true,
                Kelas: { select: { id: true, nama_kelas: true } },
              },
            },
            SiswaAkademik: {
              select: {
                id: true,
                kelas_id: true,
                tahun_pelajaran_id: true,
                semester_id: true,
                kelas: { select: { id: true, nama_kelas: true } },
                tahunPelajaran: { select: { id: true, tahun: true } },
                semester: { select: { id: true, nama_semester: true } },
              },
            },
            Mitra: { select: { id: true, nama: true, alamat: true } },
            Pembimbing: { select: { id: true, nama_guru: true, nip: true } },
          },
          orderBy: { Siswa: { nama_siswa: 'asc' } },
        });

        return list;
      },
      CACHE_TTL.DASHBOARD
    );
  }

  /**
   * 📜 SETTING DESKRIPSI TP DUDI (OLEH KAPROG / KAJUR)
   */
  async upsertSettingDeskripsiPkl(
    tenantId: string,
    data: { mitra_id: string; jurusan_id?: string | null; deskripsi_tp: string }
  ) {
    const result = await prisma.settingDeskripsiPkl.upsert({
      where: {
        tenant_id_mitra_id_jurusan_id: {
          tenant_id: tenantId,
          mitra_id: data.mitra_id,
          jurusan_id: data.jurusan_id || '',
        },
      },
      update: {
        deskripsi_tp: data.deskripsi_tp,
      },
      create: {
        tenant_id: tenantId,
        mitra_id: data.mitra_id,
        jurusan_id: data.jurusan_id || null,
        deskripsi_tp: data.deskripsi_tp,
      },
    });

    void cacheInvalidationService.invalidatePklCache(tenantId);
    return result;
  }

  async getSettingDeskripsiPklList(tenantId: string, mitraId?: string) {
    const where: any = { tenant_id: tenantId };
    if (mitraId) where.mitra_id = mitraId;

    return await prisma.settingDeskripsiPkl.findMany({
      where,
      include: {
        Mitra: { select: { id: true, nama: true } },
        Jurusan: { select: { id: true, nama: true, singkatan: true } },
      },
      orderBy: { Mitra: { nama: 'asc' } },
    });
  }

  /**
   * 📜 GET SERTIFIKAT PKL DATA (HALAMAN DEPAN & BELAKANG)
   */
  async getSertifikatPklData(tenantId: string, siswaPklId: string) {
    const pkl = await prisma.siswaPkl.findFirst({
      where: { id: siswaPklId, tenant_id: tenantId },
      include: {
        Siswa: {
          select: {
            id: true,
            nama_siswa: true,
            nis: true,
            nisn: true,
            tempat_lahir: true,
            tanggal_lahir: true,
            foto: true,
            Kelas: { select: { nama_kelas: true, tingkat: true } },
            Jurusan: {
              select: {
                nama: true,
                singkatan: true,
                ProgramKeahlian: {
                  select: {
                    nama: true,
                    bidang_keahlian: true,
                  },
                },
              },
            },
          },
        },
        Mitra: true,
        Pembimbing: { select: { nama_guru: true, nip: true } },
        Tenant: { select: { name: true, logo_url: true } },
        SiswaAkademik: {
          select: {
            kelas_id: true,
            tahun_pelajaran_id: true,
            semester_id: true,
            kelas: { select: { id: true, nama_kelas: true } },
            tahunPelajaran: { select: { id: true, tahun: true } },
          },
        },
      },
    });

    if (!pkl) throw new Error('Data penempatan PKL tidak ditemukan');

    // Ambil konteks Tahun Pelajaran siswa
    const tpId = pkl.SiswaAkademik?.tahun_pelajaran_id;
    let certNomorConfig = null;
    let certTanggalConfig = null;
    let certDurasiConfig = null;
    let certTempatConfig = null;
    let certPenandatanganNamaConfig = null;
    let certPenandatanganNipConfig = null;

    if (tpId) {
      [
        certNomorConfig,
        certTanggalConfig,
        certDurasiConfig,
        certTempatConfig,
        certPenandatanganNamaConfig,
        certPenandatanganNipConfig
      ] = await Promise.all([
        prisma.config.findFirst({ where: { tenant_id: tenantId, key: `HUBIN_PKL_NOMOR_SURAT_${tpId}` } }),
        prisma.config.findFirst({ where: { tenant_id: tenantId, key: `HUBIN_PKL_TANGGAL_TERBIT_${tpId}` } }),
        prisma.config.findFirst({ where: { tenant_id: tenantId, key: `HUBIN_PKL_DURASI_JP_${tpId}` } }),
        prisma.config.findFirst({ where: { tenant_id: tenantId, key: `HUBIN_PKL_TEMPAT_TERBIT_${tpId}` } }),
        prisma.config.findFirst({ where: { tenant_id: tenantId, key: `HUBIN_PKL_PENANDATANGAN_NAMA_${tpId}` } }),
        prisma.config.findFirst({ where: { tenant_id: tenantId, key: `HUBIN_PKL_PENANDATANGAN_NIP_${tpId}` } }),
      ]);
    }

    if (!certNomorConfig) {
      certNomorConfig = await prisma.config.findFirst({ where: { tenant_id: tenantId, key: 'HUBIN_PKL_NOMOR_SURAT' } });
    }
    if (!certTanggalConfig) {
      certTanggalConfig = await prisma.config.findFirst({ where: { tenant_id: tenantId, key: 'HUBIN_PKL_TANGGAL_TERBIT' } });
    }
    if (!certDurasiConfig) {
      certDurasiConfig = await prisma.config.findFirst({ where: { tenant_id: tenantId, key: 'HUBIN_PKL_DURASI_JP' } });
    }

    const officialNomor = certNomorConfig?.value || '425.1/0630/SMKN1PLD-KCD Wil.IV';

    // Auto-generate / assign nomor sertifikat jika belum ada (gunakan nomor resmi dari TU)
    if (!pkl.nomor_sertifikat) {
      pkl.nomor_sertifikat = officialNomor;
      await prisma.siswaPkl.update({
        where: { id: pkl.id },
        data: { nomor_sertifikat: officialNomor },
      });
    }

    const sekolah = await prisma.sekolah.findFirst({
      where: { tenant_id: tenantId },
    });

    return {
      ...pkl,
      sekolah,
      referensi_sertifikat: {
        nomor_surat: pkl.nomor_sertifikat || officialNomor,
        tanggal_terbit: certTanggalConfig?.value || null,
        durasi_jp: certDurasiConfig?.value || '792',
        tempat_terbit: certTempatConfig?.value || sekolah?.kota || 'Purwakarta',
        penandatangan_nama: certPenandatanganNamaConfig?.value || sekolah?.kepala_sekolah || null,
        penandatangan_nip: certPenandatanganNipConfig?.value || sekolah?.nip_kepala || null,
      }
    };
  }
}
