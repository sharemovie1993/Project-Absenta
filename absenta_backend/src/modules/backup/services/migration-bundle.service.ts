import { PrismaClient, Prisma } from '@prisma/client';
import { prisma } from '@/utils/prisma';
import { storageService } from '@/infra/storage/storage.service';
import { getDynamicTenantModels } from '@/constants/backup.constants';
// @ts-ignore
import AdmZip from 'adm-zip';
import crypto from 'crypto';
import path from 'path';

export interface MigrationManifest {
  format: 'absenta_migration_bundle';
  version: string;
  app_version: string;
  created_at: string;
  source_tenant: {
    id: string;
    name: string;
    npsn?: string | null;
    subdomain?: string | null;
    custom_domain?: string | null;
    status?: string | null;
    logo_url?: string | null;
    jam_masuk_default?: string;
    jam_pulang_default?: string;
    toleransi_keterlambatan_menit?: number;
    jam_masuk_guru_default?: string | null;
    jam_pulang_guru_default?: string | null;
    toleransi_keterlambatan_guru_menit?: number | null;
    toleransi_kbm_siswa_menit?: number | null;
    toleransi_kbm_guru_inval_menit?: number | null;
    absensi_mode?: any;
    hari_sekolah?: any[];
    durasi_smk?: string | null;
    [key: string]: any;
  };
  options: {
    include_attendance: boolean;
    include_media: boolean;
  };
  stats: {
    total_users: number;
    total_students: number;
    total_teachers: number;
    total_classes: number;
    total_records: number;
    total_media_files: number;
    media_size_bytes: number;
  };
  checksum_sha256?: string;
}

export interface ExportBundleOptions {
  includeAttendance?: boolean;
  includeMedia?: boolean;
}

export interface RestoreBundleOptions {
  targetTenantId?: string;
  isInitialFreshSetup?: boolean;
  clearExisting?: boolean;
}

export interface RestoreProgressUpdate {
  stage: 'manifest' | 'database' | 'storage' | 'finalizing';
  model?: string;
  processed: number;
  total: number;
  percentage: number;
  message: string;
}

function getTenantFieldName(modelName: string): string | null {
  const dmmfModel = Prisma.dmmf.datamodel.models.find(m => m.name === modelName);
  if (!dmmfModel) return null;

  const fieldNames = new Set(dmmfModel.fields.map(f => f.name));
  if (fieldNames.has('tenant_id')) return 'tenant_id';
  if (fieldNames.has('tenantId')) return 'tenantId';
  if (fieldNames.has('actor_tenant_id')) return 'actor_tenant_id';
  if (fieldNames.has('restored_to_tenant_id')) return 'restored_to_tenant_id';
  return null;
}

function sanitizeRowForModel(modelName: string, rawRow: Record<string, any>, tenantId: string): Record<string, any> {
  const dmmfModel = Prisma.dmmf.datamodel.models.find(m => m.name === modelName);
  if (!dmmfModel) return rawRow;

  const cleanData: Record<string, any> = {};

  for (const field of dmmfModel.fields) {
    if (field.kind !== 'scalar' && field.kind !== 'enum') continue;

    const val = rawRow[field.name];
    if (val === undefined || val === null) {
      if (field.name === 'tenant_id') cleanData.tenant_id = tenantId;
      continue;
    }

    if (field.name === 'tenant_id') {
      cleanData.tenant_id = tenantId;
    } else if (field.name === 'actor_tenant_id') {
      cleanData.actor_tenant_id = tenantId;
    } else if (field.type === 'DateTime') {
      try {
        const d = new Date(val);
        if (!isNaN(d.getTime())) cleanData[field.name] = d;
      } catch {}
    } else if (field.type === 'BigInt') {
      try {
        cleanData[field.name] = BigInt(val);
      } catch {}
    } else {
      cleanData[field.name] = val;
    }
  }

  return cleanData;
}

function getContentTypeFromKey(key: string): string {
  const ext = path.extname(key).toLowerCase();
  switch (ext) {
    case '.png': return 'image/png';
    case '.jpg':
    case '.jpeg': return 'image/jpeg';
    case '.gif': return 'image/gif';
    case '.webp': return 'image/webp';
    case '.svg': return 'image/svg+xml';
    case '.pdf': return 'application/pdf';
    case '.doc': return 'application/msword';
    case '.docx': return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    case '.xls': return 'application/vnd.ms-excel';
    case '.xlsx': return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    case '.json': return 'application/json';
    default: return 'application/octet-stream';
  }
}

function extractMediaKeysFromValue(val: any, fieldName?: string): string[] {
  if (val === null || val === undefined) return [];

  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (!trimmed) return [];

    const keys: string[] = [];

    // 1. Periksa path berawalan atau mengandung uploads/
    const uploadsIdx = trimmed.indexOf('uploads/');
    if (uploadsIdx >= 0) {
      const sub = trimmed.substring(uploadsIdx).split('?')[0].split('#')[0];
      if (sub && !sub.includes('..')) keys.push(sub);
    }

    // 2. Periksa path berawalan atau mengandung storage/
    const storageIdx = trimmed.indexOf('storage/');
    if (storageIdx >= 0) {
      const sub = trimmed.substring(storageIdx).split('?')[0].split('#')[0];
      if (sub && !sub.includes('..')) keys.push(sub);
    }

    // 3. Periksa path berawalan atau mengandung tenants/
    const tenantsIdx = trimmed.indexOf('tenants/');
    if (tenantsIdx >= 0) {
      const sub = trimmed.substring(tenantsIdx).split('?')[0].split('#')[0];
      if (sub && !sub.includes('..')) keys.push(sub);
    }

    // 4. Kolom database yang khusus menyimpan relative file path
    if (
      fieldName &&
      (fieldName === 'file_storage_path' ||
        fieldName === 'file_path' ||
        fieldName === 'storage_path')
    ) {
      const cleanKey = trimmed.replace(/^\/+/, '').split('?')[0].split('#')[0];
      if (cleanKey && !cleanKey.includes('..')) {
        keys.push(cleanKey);
      }
    }

    // 5. Rekursif jika value berupa JSON string
    if (
      (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
      (trimmed.startsWith('[') && trimmed.endsWith(']'))
    ) {
      try {
        const parsed = JSON.parse(trimmed);
        keys.push(...extractMediaKeysFromValue(parsed));
      } catch {}
    }

    return keys;
  }

  if (Array.isArray(val)) {
    const keys: string[] = [];
    for (const item of val) {
      keys.push(...extractMediaKeysFromValue(item));
    }
    return keys;
  }

  if (typeof val === 'object') {
    const keys: string[] = [];
    for (const [k, v] of Object.entries(val)) {
      keys.push(...extractMediaKeysFromValue(v, k));
    }
    return keys;
  }

  return [];
}

export class MigrationBundleService {
  private prisma: PrismaClient;

  constructor(prismaClient: PrismaClient = prisma) {
    this.prisma = prismaClient;
  }

  /**
   * Mengemas seluruh data tenant, master, dan berkas media ke dalam buffer file .absenta
   */
  async createExportBundle(tenantId: string, options: ExportBundleOptions = {}): Promise<{ buffer: Buffer; manifest: MigrationManifest; filename: string }> {
    const includeAttendance = options.includeAttendance !== false;
    const includeMedia = options.includeMedia !== false;

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId }
    });

    if (!tenant) {
      throw new Error(`Tenant dengan ID ${tenantId} tidak ditemukan.`);
    }

    const zip = new AdmZip();
    const models = getDynamicTenantModels();
    const dataTables: Record<string, any[]> = {};
    let totalRecords = 0;

    const attendanceModels = new Set([
      'AbsenSiswa', 'SesiAbsensi', 'AbsenGuru', 'ActivityLog', 
      'IzinKeluarSiswa', 'PermohonanIzin', 'PermohonanIzinGuru',
      'AuditTrail', 'NotificationLog'
    ]);

    const mediaKeysToCollect = new Set<string>();

    // 1. Kumpulkan file media dari objek Tenant itu sendiri (e.g. logo_url)
    if (includeMedia) {
      for (const [k, v] of Object.entries(tenant)) {
        for (const mk of extractMediaKeysFromValue(v, k)) {
          mediaKeysToCollect.add(mk);
        }
      }
    }

    // Simpan juga record Tenant ke dalam dataTables['Tenant']
    const cleanTenant: Record<string, any> = {};
    for (const [k, v] of Object.entries(tenant)) {
      cleanTenant[k] = typeof v === 'bigint' ? (v as any).toString() : v;
    }
    dataTables['Tenant'] = [cleanTenant];

    for (const modelName of models) {
      if (!includeAttendance && attendanceModels.has(modelName)) {
        continue;
      }

      // @ts-ignore
      const pModel = this.prisma[modelName];
      if (!pModel || typeof pModel.findMany !== 'function') continue;

      const tenantField = getTenantFieldName(modelName);
      try {
        const rows = await pModel.findMany({
          where: tenantField ? { [tenantField]: tenantId } : {}
        });

        if (Array.isArray(rows) && rows.length > 0) {
          // Serialize bigints & collect media URLs
          const serializedRows = rows.map((r: any) => {
            const clean: Record<string, any> = {};
            for (const [k, v] of Object.entries(r)) {
              clean[k] = typeof v === 'bigint' ? v.toString() : v;

              if (includeMedia) {
                for (const mk of extractMediaKeysFromValue(v, k)) {
                  mediaKeysToCollect.add(mk);
                }
              }
            }
            return clean;
          });

          dataTables[modelName] = serializedRows;
          totalRecords += serializedRows.length;
        }
      } catch (err: any) {
        console.warn(`[MigrationBundle] Gagal mengekspor model ${modelName}:`, err.message);
      }
    }

    // 2. Kumpulkan file media tambahan langsung dari Object Storage berdasarkan awalan tenant
    if (includeMedia) {
      try {
        const docKeys = await storageService.listObjects(`storage/documents/${tenantId}`);
        for (const k of docKeys) mediaKeysToCollect.add(k);
      } catch (err: any) {
        console.warn(`[MigrationBundle] Notice listing storage/documents/${tenantId}:`, err?.message || err);
      }

      try {
        const tenantKeys = await storageService.listObjects(`tenants/${tenantId}`);
        for (const k of tenantKeys) mediaKeysToCollect.add(k);
      } catch (err: any) {
        console.warn(`[MigrationBundle] Notice listing tenants/${tenantId}:`, err?.message || err);
      }

      try {
        const uploadTenantKeys = await storageService.listObjects(`uploads/tenants/${tenantId}`);
        for (const k of uploadTenantKeys) mediaKeysToCollect.add(k);
      } catch (err: any) {
        console.warn(`[MigrationBundle] Notice listing uploads/tenants/${tenantId}:`, err?.message || err);
      }
    }

    // 3. Masukkan berkas media fisik ke dalam arsip ZIP
    let totalMediaFiles = 0;
    let mediaSizeBytes = 0;

    if (includeMedia && mediaKeysToCollect.size > 0) {
      console.log(`[MigrationBundle] Mengemas ${mediaKeysToCollect.size} berkas media untuk tenant ${tenant.name}...`);
      for (const storageKey of mediaKeysToCollect) {
        try {
          const fileBuf = await storageService.readFileBuffer(storageKey);
          if (fileBuf && fileBuf.length > 0) {
            const relativeZipPath = path.posix.join('storage', storageKey);
            zip.addFile(relativeZipPath, fileBuf);
            totalMediaFiles++;
            mediaSizeBytes += fileBuf.length;
          }
        } catch (err: any) {
          console.warn(`[MigrationBundle] Gagal mengemas berkas media ${storageKey}:`, err?.message || err);
        }
      }
      console.log(`[MigrationBundle] Berhasil mengemas ${totalMediaFiles} file media (${(mediaSizeBytes / 1024 / 1024).toFixed(2)} MB).`);
    }

    // Hitung statistik ringkas untuk manifest
    const totalUsers = (dataTables['User'] || []).length;
    const totalStudents = (dataTables['Siswa'] || []).length;
    const totalTeachers = (dataTables['Guru'] || []).length;
    const totalClasses = (dataTables['Kelas'] || []).length;

    // Simpan database.json
    const dbJsonBuffer = Buffer.from(JSON.stringify(dataTables, null, 2), 'utf8');
    zip.addFile('database.json', dbJsonBuffer);

    // 4. Susun manifest.json
    const manifest: MigrationManifest = {
      format: 'absenta_migration_bundle',
      version: '1.0',
      app_version: '1.0.3',
      created_at: new Date().toISOString(),
      source_tenant: {
        id: tenant.id,
        name: tenant.name,
        npsn: (tenant as any).npsn || null,
        subdomain: tenant.subdomain || null,
        custom_domain: tenant.custom_domain || null,
        status: tenant.status || 'ACTIVE',
        logo_url: tenant.logo_url || null,
        jam_masuk_default: tenant.jam_masuk_default,
        jam_pulang_default: tenant.jam_pulang_default,
        toleransi_keterlambatan_menit: tenant.toleransi_keterlambatan_menit,
        jam_masuk_guru_default: tenant.jam_masuk_guru_default,
        jam_pulang_guru_default: tenant.jam_pulang_guru_default,
        toleransi_keterlambatan_guru_menit: tenant.toleransi_keterlambatan_guru_menit,
        toleransi_kbm_siswa_menit: tenant.toleransi_kbm_siswa_menit,
        toleransi_kbm_guru_inval_menit: tenant.toleransi_kbm_guru_inval_menit,
        absensi_mode: tenant.absensi_mode,
        hari_sekolah: tenant.hari_sekolah,
        durasi_smk: tenant.durasi_smk,
      },
      options: {
        include_attendance: includeAttendance,
        include_media: includeMedia
      },
      stats: {
        total_users: totalUsers,
        total_students: totalStudents,
        total_teachers: totalTeachers,
        total_classes: totalClasses,
        total_records: totalRecords,
        total_media_files: totalMediaFiles,
        media_size_bytes: mediaSizeBytes
      }
    };

    const manifestBuf = Buffer.from(JSON.stringify(manifest, null, 2), 'utf8');
    zip.addFile('manifest.json', manifestBuf);

    const fullZipBuffer = zip.toBuffer();
    const sha256 = crypto.createHash('sha256').update(fullZipBuffer).digest('hex');
    manifest.checksum_sha256 = sha256;

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const safeSubdomain = tenant.subdomain || tenant.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const filename = `absenta_backup_${safeSubdomain}_${timestamp}.absenta`;

    return {
      buffer: fullZipBuffer,
      manifest,
      filename
    };
  }

  /**
   * Membaca dan memvalidasi file manifest dari berkas .absenta tanpa mengekstrak keseluruhan file
   */
  inspectBundle(buffer: Buffer): MigrationManifest {
    try {
      const zip = new AdmZip(buffer);
      const manifestEntry = zip.getEntry('manifest.json');
      if (!manifestEntry) {
        throw new Error('Berkas cadangan tidak valid: "manifest.json" tidak ditemukan di dalam arsip.');
      }

      const manifestContent = manifestEntry.getData().toString('utf8');
      const manifest = JSON.parse(manifestContent) as MigrationManifest;

      if (manifest.format !== 'absenta_migration_bundle') {
        throw new Error('Format berkas tidak didukung: Harus berupa berkas migrasi Absenta (.absenta).');
      }

      return manifest;
    } catch (err: any) {
      throw new Error('Gagal memeriksa berkas cadangan: ' + (err?.message || 'Format arsip rusak.'));
    }
  }

  /**
   * Mengekstrak dan memulihkan seluruh data dan media dari berkas .absenta
   */
  async restoreBundle(
    buffer: Buffer, 
    options: RestoreBundleOptions = {},
    progressCallback?: (progress: RestoreProgressUpdate) => void
  ): Promise<{ success: boolean; manifest: MigrationManifest; restoredTables: Record<string, number>; message: string }> {
    const reportProgress = (p: RestoreProgressUpdate) => {
      if (progressCallback) progressCallback(p);
    };

    reportProgress({
      stage: 'manifest',
      processed: 0,
      total: 100,
      percentage: 5,
      message: 'Membaca dan memvalidasi manifest arsip cadangan...'
    });

    const manifest = this.inspectBundle(buffer);
    const zip = new AdmZip(buffer);

    // Baca database.json
    const dbEntry = zip.getEntry('database.json');
    if (!dbEntry) {
      throw new Error('Berkas cadangan tidak memiliki "database.json".');
    }

    const dataTables = JSON.parse(dbEntry.getData().toString('utf8')) as Record<string, any[]>;

    // Dapatkan target tenant
    let effectiveTenantId = options.targetTenantId || manifest.source_tenant.id;

    reportProgress({
      stage: 'manifest',
      processed: 10,
      total: 100,
      percentage: 15,
      message: `Menyiapkan & menyinkronkan profil tenant "${manifest.source_tenant.name}" di sistem...`
    });

    // Susun data tenant dari manifest & dataTables['Tenant']
    const sourceTenant = manifest.source_tenant || ({} as any);
    const tenantTableRecord = (dataTables['Tenant'] && dataTables['Tenant'][0]) || {};

    const tenantPayload: Record<string, any> = {
      name: sourceTenant.name || tenantTableRecord.name || 'Tenant Pulih',
      subdomain: sourceTenant.subdomain || tenantTableRecord.subdomain || 'sekolah',
      custom_domain: sourceTenant.custom_domain || tenantTableRecord.custom_domain || null,
      status: sourceTenant.status || tenantTableRecord.status || 'ACTIVE',
      logo_url: sourceTenant.logo_url || tenantTableRecord.logo_url || null,
    };

    if (sourceTenant.jam_masuk_default || tenantTableRecord.jam_masuk_default) {
      tenantPayload.jam_masuk_default = sourceTenant.jam_masuk_default || tenantTableRecord.jam_masuk_default;
    }
    if (sourceTenant.jam_pulang_default || tenantTableRecord.jam_pulang_default) {
      tenantPayload.jam_pulang_default = sourceTenant.jam_pulang_default || tenantTableRecord.jam_pulang_default;
    }
    if (sourceTenant.toleransi_keterlambatan_menit !== undefined || tenantTableRecord.toleransi_keterlambatan_menit !== undefined) {
      tenantPayload.toleransi_keterlambatan_menit = sourceTenant.toleransi_keterlambatan_menit ?? tenantTableRecord.toleransi_keterlambatan_menit;
    }
    if (sourceTenant.jam_masuk_guru_default !== undefined || tenantTableRecord.jam_masuk_guru_default !== undefined) {
      tenantPayload.jam_masuk_guru_default = sourceTenant.jam_masuk_guru_default ?? tenantTableRecord.jam_masuk_guru_default;
    }
    if (sourceTenant.jam_pulang_guru_default !== undefined || tenantTableRecord.jam_pulang_guru_default !== undefined) {
      tenantPayload.jam_pulang_guru_default = sourceTenant.jam_pulang_guru_default ?? tenantTableRecord.jam_pulang_guru_default;
    }
    if (sourceTenant.toleransi_keterlambatan_guru_menit !== undefined || tenantTableRecord.toleransi_keterlambatan_guru_menit !== undefined) {
      tenantPayload.toleransi_keterlambatan_guru_menit = sourceTenant.toleransi_keterlambatan_guru_menit ?? tenantTableRecord.toleransi_keterlambatan_guru_menit;
    }
    if (sourceTenant.toleransi_kbm_siswa_menit !== undefined || tenantTableRecord.toleransi_kbm_siswa_menit !== undefined) {
      tenantPayload.toleransi_kbm_siswa_menit = sourceTenant.toleransi_kbm_siswa_menit ?? tenantTableRecord.toleransi_kbm_siswa_menit;
    }
    if (sourceTenant.toleransi_kbm_guru_inval_menit !== undefined || tenantTableRecord.toleransi_kbm_guru_inval_menit !== undefined) {
      tenantPayload.toleransi_kbm_guru_inval_menit = sourceTenant.toleransi_kbm_guru_inval_menit ?? tenantTableRecord.toleransi_kbm_guru_inval_menit;
    }
    if (sourceTenant.absensi_mode || tenantTableRecord.absensi_mode) {
      tenantPayload.absensi_mode = sourceTenant.absensi_mode || tenantTableRecord.absensi_mode;
    }
    if (sourceTenant.hari_sekolah || tenantTableRecord.hari_sekolah) {
      tenantPayload.hari_sekolah = sourceTenant.hari_sekolah || tenantTableRecord.hari_sekolah;
    }
    if (sourceTenant.durasi_smk || tenantTableRecord.durasi_smk) {
      tenantPayload.durasi_smk = sourceTenant.durasi_smk || tenantTableRecord.durasi_smk;
    }

    try {
      const existingTenant = await this.prisma.tenant.findUnique({
        where: { id: effectiveTenantId }
      });

      if (existingTenant) {
        await this.prisma.tenant.update({
          where: { id: effectiveTenantId },
          data: tenantPayload
        });
      } else {
        const createdTenant = await this.prisma.tenant.create({
          data: {
            id: effectiveTenantId,
            name: tenantPayload.name || 'Tenant',
            ...tenantPayload
          } as any
        });
        effectiveTenantId = createdTenant.id;
      }
    } catch (err: any) {
      console.warn(`[MigrationBundle] Notice upserting tenant profile:`, err?.message || err);
      // Fallback jika subdomain / custom domain bentrok unik
      try {
        delete tenantPayload.subdomain;
        delete tenantPayload.custom_domain;
        await this.prisma.tenant.update({
          where: { id: effectiveTenantId },
          data: tenantPayload
        });
      } catch (_) {}
    }

    const models = getDynamicTenantModels();
    const restoredCounts: Record<string, number> = {};

    const totalModels = models.filter(m => Array.isArray(dataTables[m]) && dataTables[m].length > 0).length;
    let modelIndex = 0;

    // Restore Database Models
    for (const modelName of models) {
      let rows: any[] | undefined = dataTables[modelName];
      if (!rows) {
        const matchedKey = Object.keys(dataTables).find(k => k.toLowerCase() === modelName.toLowerCase());
        if (matchedKey) rows = dataTables[matchedKey];
      }

      if (!Array.isArray(rows) || rows.length === 0) continue;

      modelIndex++;
      const currentPct = 20 + Math.round((modelIndex / Math.max(totalModels, 1)) * 50);

      reportProgress({
        stage: 'database',
        model: modelName,
        processed: modelIndex,
        total: totalModels,
        percentage: currentPct,
        message: `Memulihkan tabel ${modelName} (${rows.length} data)...`
      });

      // @ts-ignore
      const pModel = this.prisma[modelName];
      if (!pModel) continue;

      let count = 0;
      const CHUNK_SIZE = 25;
      for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
        const chunk = rows.slice(i, i + CHUNK_SIZE);
        await Promise.all(
          chunk.map(async (rawRow: any) => {
            try {
              const cleanData = sanitizeRowForModel(modelName, rawRow, effectiveTenantId);

              // Perlakuan khusus tabel Config agar tidak duplikat untuk key yang sama
              if (modelName === 'Config' && cleanData.key) {
                const existingConfig = await this.prisma.config.findFirst({
                  where: { tenant_id: effectiveTenantId, key: cleanData.key }
                });
                if (existingConfig) {
                  await this.prisma.config.update({
                    where: { id: existingConfig.id },
                    data: {
                      value: cleanData.value,
                      description: cleanData.description
                    }
                  });
                  count++;
                  return;
                }
              }

              if (cleanData.id) {
                await pModel.upsert({
                  where: { id: cleanData.id },
                  update: cleanData,
                  create: cleanData
                });
              } else {
                await pModel.create({ data: cleanData });
              }
              count++;
            } catch (err: any) {
              // Retry jika terjadi foreign key mismatch pada user/relasi sekunder
              try {
                const cleanData = sanitizeRowForModel(modelName, rawRow, effectiveTenantId);
                if (cleanData.uploaded_by_user_id || cleanData.created_by_user_id) {
                  delete cleanData.uploaded_by_user_id;
                  delete cleanData.created_by_user_id;
                  if (cleanData.id) {
                    await pModel.upsert({
                      where: { id: cleanData.id },
                      update: cleanData,
                      create: cleanData
                    });
                  } else {
                    await pModel.create({ data: cleanData });
                  }
                  count++;
                }
              } catch (_) {}
            }
          })
        );
      }
      restoredCounts[modelName] = count;
    }

    // Restore Media Storage jika ada
    reportProgress({
      stage: 'storage',
      processed: 0,
      total: 100,
      percentage: 75,
      message: 'Memulihkan file media dan dokumen ke Object Storage MinIO...'
    });

    const entries = zip.getEntries();
    const mediaEntries = entries.filter((e: any) => 
      !e.isDirectory && (e.entryName.startsWith('media/') || e.entryName.startsWith('storage/'))
    );

    let mediaProcessed = 0;
    for (const entry of mediaEntries) {
      try {
        let storageKey: string;
        if (entry.entryName.startsWith('media/')) {
          storageKey = entry.entryName.substring('media/'.length);
        } else if (entry.entryName.startsWith('storage/storage/')) {
          storageKey = entry.entryName.substring('storage/'.length);
        } else if (entry.entryName.startsWith('storage/uploads/')) {
          storageKey = entry.entryName.substring('storage/'.length);
        } else if (entry.entryName.startsWith('storage/tenants/')) {
          storageKey = entry.entryName.substring('storage/'.length);
        } else {
          storageKey = entry.entryName.replace(/^storage\//, '');
        }

        const fileData = entry.getData();
        const contentType = getContentTypeFromKey(storageKey);
        await storageService.uploadBuffer(storageKey, fileData, { contentType });

        // Kompatibilitas ganda: dukung path dengan dan tanpa awalan 'storage/'
        if (storageKey.startsWith('storage/documents/')) {
          const altKey = storageKey.replace(/^storage\//, '');
          await storageService.uploadBuffer(altKey, fileData, { contentType }).catch(() => {});
        } else if (storageKey.startsWith('documents/')) {
          const altKey = `storage/${storageKey}`;
          await storageService.uploadBuffer(altKey, fileData, { contentType }).catch(() => {});
        }

        mediaProcessed++;

        if (mediaProcessed % 10 === 0 || mediaProcessed === mediaEntries.length) {
          const storagePct = 75 + Math.round((mediaProcessed / Math.max(mediaEntries.length, 1)) * 20);
          reportProgress({
            stage: 'storage',
            processed: mediaProcessed,
            total: mediaEntries.length,
            percentage: Math.min(storagePct, 95),
            message: `Memulihkan media: ${mediaProcessed}/${mediaEntries.length} file...`
          });
        }
      } catch (err: any) {
        console.warn(`[MigrationBundle] Gagal restore media ${entry.entryName}:`, err.message);
      }
    }

    reportProgress({
      stage: 'finalizing',
      processed: 100,
      total: 100,
      percentage: 100,
      message: 'Pemulihan data berhasil diselesaikan!'
    });

    // Memicu pembaruan telemetri & sinkronisasi tenant ke Server Lisensi seketika
    try {
      const { heartbeatService } = await import('@/modules/system-config/services/heartbeat.service');
      heartbeatService.collectAndSendMetrics().catch(err => {
        console.warn('[MigrationBundle] Notifikasi sinkronisasi ke Server Lisensi dilewati:', err.message);
      });
    } catch {}

    return {
      success: true,
      manifest,
      restoredTables: restoredCounts,
      message: `Berhasil memulihkan tenant ${manifest.source_tenant.name} (${mediaProcessed} file media & ${Object.values(restoredCounts).reduce((a, b) => a + b, 0)} rekaman data).`
    };
  }
}

export const migrationBundleService = new MigrationBundleService();
