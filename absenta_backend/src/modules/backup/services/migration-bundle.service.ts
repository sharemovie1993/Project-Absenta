import { PrismaClient, Prisma } from '@prisma/client';
import { prisma } from '@/utils/prisma';
import { storageService } from '@/infra/storage/storage.service';
import { getDynamicTenantModels } from '@/constants/backup.constants';
import { getDeployScenario } from '@/utils/deployScenario';
import { fetchTenantProducts, rebindTenantEntitlements, provisionCloneTenantOnLicenseServer, checkLicenseServerConnection } from '@/services/licenseClient';
import fs from 'fs';
import os from 'os';
// @ts-ignore
import AdmZip from 'adm-zip';
import crypto from 'crypto';
import path from 'path';

export interface MigrationManifest {
  format: 'absenta_migration_bundle';
  version: string;
  app_version: string;
  created_at: string;
  source_scenario?: string;
  entitlements_count?: number;
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
  backup_mode?: BackupBundleMode;
  options: {
    backup_mode?: BackupBundleMode;
    include_database?: boolean;
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

export type BackupBundleMode = 'FULL' | 'DATABASE_ONLY' | 'MEDIA_ONLY';

export interface ExportBundleOptions {
  mode?: BackupBundleMode;
  includeDatabase?: boolean;
  includeAttendance?: boolean;
  includeMedia?: boolean;
}

export interface ExportBundleResult {
  filepath: string;
  manifest: MigrationManifest;
  filename: string;
  size: number;
}

export interface ExportProgressUpdate {
  stage: 'init' | 'database' | 'media' | 'packaging' | 'finalizing';
  processed: number;
  total: number;
  percentage: number;
  message: string;
}

export type RestoreBundleMode = 'AUTO' | 'FULL' | 'DATABASE_ONLY' | 'MEDIA_ONLY';

export interface RestoreBundleOptions {
  targetTenantId?: string;
  targetSubdomain?: string;
  targetName?: string;
  cloneMode?: boolean;
  restoreMode?: RestoreBundleMode;
  isInitialFreshSetup?: boolean;
  clearExisting?: boolean;
}

interface CloneContext {
  isCloning: boolean;
  effectiveTenantId: string;
  sourceTenantId: string;
  idMap: Map<string, string>;
  cloneTag: string;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface RestoreProgressUpdate {
  stage: 'manifest' | 'database' | 'storage' | 'finalizing';
  model?: string;
  processed: number;
  total: number;
  percentage: number;
  message: string;
}

function getTenantWhereClause(modelName: string, tenantId: string, depth = 0): Record<string, any> | null {
  if (depth > 2) return null;
  const dmmfModel = Prisma.dmmf.datamodel.models.find(m => m.name === modelName);
  if (!dmmfModel) return null;

  const fieldNames = new Set(dmmfModel.fields.map(f => f.name));
  if (fieldNames.has('tenant_id')) return { tenant_id: tenantId };
  if (fieldNames.has('tenantId')) return { tenantId: tenantId };
  if (fieldNames.has('actor_tenant_id')) return { actor_tenant_id: tenantId };
  if (fieldNames.has('restored_to_tenant_id')) return { restored_to_tenant_id: tenantId };

  // Traverse foreign relations toward a parent model with tenant field
  for (const f of dmmfModel.fields) {
    if (f.kind === 'object' && f.relationFromFields && f.relationFromFields.length > 0) {
      const parentFilter = getTenantWhereClause(f.type, tenantId, depth + 1);
      if (parentFilter) {
        return { [f.name]: parentFilter };
      }
    }
  }

  return null;
}

function sanitizeRowForModel(
  modelName: string,
  rawRow: Record<string, any>,
  tenantId: string,
  cloneCtx?: CloneContext
): Record<string, any> {
  const dmmfModel = Prisma.dmmf.datamodel.models.find(m => m.name === modelName);
  if (!dmmfModel) return rawRow;

  const cleanData: Record<string, any> = {};
  const isCloning = cloneCtx?.isCloning || false;
  const idMap = cloneCtx?.idMap;
  const sourceTenantId = cloneCtx?.sourceTenantId;
  const cloneTag = cloneCtx?.cloneTag || 'clone';

  for (const field of dmmfModel.fields) {
    if (field.kind !== 'scalar' && field.kind !== 'enum') continue;

    let val = rawRow[field.name];
    if (val === undefined || val === null) {
      if (field.name === 'tenant_id' || field.name === 'tenantId') {
        cleanData[field.name] = tenantId;
      }
      continue;
    }

    if (field.name === 'tenant_id' || field.name === 'tenantId') {
      cleanData[field.name] = tenantId;
      continue;
    } else if (field.name === 'actor_tenant_id') {
      cleanData.actor_tenant_id = tenantId;
      continue;
    } else if (field.name === 'restored_to_tenant_id') {
      cleanData.restored_to_tenant_id = tenantId;
      continue;
    }

    if (isCloning) {
      // 1. Remap UUID primary & foreign keys via idMap
      if (typeof val === 'string' && idMap?.has(val)) {
        val = idMap.get(val)!;
      }

      // 2. Rewrite tenant-scoped storage/media paths referencing sourceTenantId
      if (typeof val === 'string' && sourceTenantId && UUID_PATTERN.test(sourceTenantId) && val.includes(sourceTenantId)) {
        val = val.split(sourceTenantId).join(tenantId);
      }

      // 3. Suffix global @unique non-UUID columns to prevent cross-tenant collisions on shared DB
      if (modelName === 'SarprasAsset' && field.name === 'kode' && typeof val === 'string' && val.trim()) {
        val = `${val.trim()}-${cloneTag}`;
      } else if (modelName === 'AttendanceDevice' && field.name === 'device_id' && typeof val === 'string' && val.trim()) {
        val = `${val.trim()}-${cloneTag}`;
      } else if (modelName === 'SertifikatUkk' && field.name === 'nomor_sertifikat' && typeof val === 'string' && val.trim()) {
        val = `${val.trim()}-${cloneTag}`;
      } else if (modelName === 'KelulusanSiswa' && field.name === 'nomor_skl' && typeof val === 'string' && val.trim()) {
        val = `${val.trim()}-${cloneTag}`;
      } else if (modelName === 'ParentAccessToken' && field.name === 'token' && typeof val === 'string') {
        val = crypto.randomBytes(32).toString('hex');
      }
    }

    if (field.type === 'DateTime') {
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

function buildModelUniqueWhere(modelName: string, cleanData: Record<string, any>): Record<string, any> | null {
  const dmmfModel = Prisma.dmmf.datamodel.models.find(m => m.name === modelName);
  if (!dmmfModel) return cleanData.id ? { id: cleanData.id } : null;

  // Composite primary keys, e.g. @@id([id, created_at]) for AbsenSiswa / AbsenGerbangSiswa
  if (dmmfModel.primaryKey && Array.isArray(dmmfModel.primaryKey.fields) && dmmfModel.primaryKey.fields.length > 0) {
    const fields = dmmfModel.primaryKey.fields;
    const compoundKeyName = dmmfModel.primaryKey.name || fields.join('_');
    const compoundVal: Record<string, any> = {};
    let allPresent = true;
    for (const f of fields) {
      if (cleanData[f] === undefined || cleanData[f] === null) {
        allPresent = false;
        break;
      }
      compoundVal[f] = cleanData[f];
    }
    if (allPresent) {
      return { [compoundKeyName]: compoundVal };
    }
  }

  if (cleanData.id) {
    return { id: cleanData.id };
  }

  return null;
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
   * Mengemas seluruh data tenant, master, dan berkas media ke dalam file sementara .absenta di disk (streaming-friendly)
   */
  async createExportBundleFile(
    tenantId: string, 
    options: ExportBundleOptions = {},
    progressCallback?: (progress: ExportProgressUpdate) => void
  ): Promise<ExportBundleResult> {
    const reportProgress = (p: ExportProgressUpdate) => {
      if (progressCallback) {
        try { progressCallback(p); } catch (_) {}
      }
    };

    const mode: BackupBundleMode = options.mode || (
      options.includeMedia === false ? 'DATABASE_ONLY' :
      options.includeDatabase === false ? 'MEDIA_ONLY' : 'FULL'
    );
    const includeDatabase = options.includeDatabase ?? (mode !== 'MEDIA_ONLY');
    const includeMedia = options.includeMedia ?? (mode !== 'DATABASE_ONLY');
    const includeAttendance = options.includeAttendance !== false;

    reportProgress({
      stage: 'init',
      processed: 0,
      total: 100,
      percentage: 5,
      message: mode === 'DATABASE_ONLY'
        ? 'Menyiapkan metadata pencadangan Basis Data...'
        : mode === 'MEDIA_ONLY'
          ? 'Menyiapkan metadata pencadangan Berkas Media...'
          : 'Menyiapkan metadata pencadangan Lengkap...'
    });

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId }
    });

    if (!tenant) {
      throw new Error(`Tenant dengan ID ${tenantId} tidak ditemukan.`);
    }

    const sekolah = await this.prisma.sekolah.findFirst({
      where: { tenant_id: tenantId }
    });
    const effectiveNpsn = sekolah?.npsn || (tenant as any).npsn || null;

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

    // Simpan selalu record Tenant ke dalam dataTables['Tenant'] sebagai identitas paket
    const cleanTenant: Record<string, any> = {};
    for (const [k, v] of Object.entries(tenant)) {
      cleanTenant[k] = typeof v === 'bigint' ? (v as any).toString() : v;
    }
    dataTables['Tenant'] = [cleanTenant];
    totalRecords += 1;

    let modelIdx = 0;
    const totalModels = models.length;

    for (const modelName of models) {
      modelIdx++;
      if (modelIdx % 4 === 0 || modelIdx === totalModels) {
        const pct = 5 + Math.round((modelIdx / Math.max(totalModels, 1)) * 30);
        reportProgress({
          stage: 'database',
          processed: modelIdx,
          total: totalModels,
          percentage: pct,
          message: includeDatabase
            ? `Mengekstrak data tabel ${modelName} (${modelIdx}/${totalModels})...`
            : `Memindai referensi berkas ${modelName} (${modelIdx}/${totalModels})...`
        });
      }

      if (!includeAttendance && attendanceModels.has(modelName)) {
        continue;
      }

      // @ts-ignore
      const pModel = this.prisma[modelName];
      if (!pModel || typeof pModel.findMany !== 'function') continue;

      const tenantWhere = getTenantWhereClause(modelName, tenantId);
      if (!tenantWhere) continue;

      try {
        const rows = await pModel.findMany({
          where: tenantWhere
        });

        if (Array.isArray(rows) && rows.length > 0) {
          if (includeDatabase) {
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
          } else if (includeMedia) {
            // Mode MEDIA_ONLY: hanya kumpulkan URL media tanpa menyimpan data tabel ke zip
            for (const r of rows) {
              for (const [k, v] of Object.entries(r)) {
                for (const mk of extractMediaKeysFromValue(v, k)) {
                  mediaKeysToCollect.add(mk);
                }
              }
            }
          }
        }
      } catch (err: any) {
        console.warn(`[MigrationBundle] Gagal memproses model ${modelName}:`, err.message);
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
      let mediaProcessed = 0;
      const totalMedia = mediaKeysToCollect.size;

      for (const storageKey of mediaKeysToCollect) {
        mediaProcessed++;
        if (mediaProcessed % 15 === 0 || mediaProcessed === totalMedia) {
          const pct = 35 + Math.round((mediaProcessed / Math.max(totalMedia, 1)) * 45);
          reportProgress({
            stage: 'media',
            processed: mediaProcessed,
            total: totalMedia,
            percentage: Math.min(pct, 80),
            message: `Mengemas berkas media ${mediaProcessed}/${totalMedia} (${(mediaSizeBytes / 1024 / 1024).toFixed(1)} MB)...`
          });
        }

        try {
          const fileBuf = await storageService.readFileBuffer(storageKey);
          if (fileBuf && fileBuf.length > 0) {
            // Guard: Lewati file rusak / over-limit (> 25MB) agar memori V8 tetap stabil
            if (fileBuf.length > 25 * 1024 * 1024) {
              console.warn(`[MigrationBundle] Berkas media dilewati karena melebihi batas 25MB: ${storageKey} (${(fileBuf.length / 1024 / 1024).toFixed(2)} MB)`);
              continue;
            }
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

    // Simpan database.json (compact JSON untuk menghemat memori V8 heap secara drastis)
    const dbJsonBuffer = Buffer.from(JSON.stringify(dataTables), 'utf8');
    zip.addFile('database.json', dbJsonBuffer);

    // 3.5. Kumpulkan lisensi produk / entitlements milik tenant dari server lisensi
    let entitlements: any[] = [];
    try {
      const serverKey = process.env.LICENSE_KEY || '';
      entitlements = await fetchTenantProducts({
        server_license_key: serverKey,
        tenant_slug: tenant.subdomain || undefined,
        npsn: effectiveNpsn || undefined,
        deploy_scenario: getDeployScenario()
      });
      if (Array.isArray(entitlements) && entitlements.length > 0) {
        zip.addFile('entitlements.json', Buffer.from(JSON.stringify(entitlements), 'utf8'));
        console.log(`[MigrationBundle] Mengemas ${entitlements.length} lisensi produk ke entitlements.json.`);
      }
    } catch (entErr: any) {
      console.warn('[MigrationBundle] Gagal mengambil entitlements untuk bundle:', entErr.message);
    }

    // 4. Susun manifest.json
    const currentScenario = getDeployScenario();
    const manifest: MigrationManifest = {
      format: 'absenta_migration_bundle',
      version: '1.0',
      app_version: '1.0.3',
      created_at: new Date().toISOString(),
      source_scenario: currentScenario,
      entitlements_count: entitlements.length,
      source_tenant: {
        id: tenant.id,
        name: tenant.name,
        npsn: effectiveNpsn || null,
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
      backup_mode: mode,
      options: {
        backup_mode: mode,
        include_database: includeDatabase,
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

    const manifestBuf = Buffer.from(JSON.stringify(manifest), 'utf8');
    zip.addFile('manifest.json', manifestBuf);

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const safeSubdomain = tenant.subdomain || tenant.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const modeSuffix = mode === 'DATABASE_ONLY' ? 'db' : mode === 'MEDIA_ONLY' ? 'media' : 'full';
    const filename = `absenta_backup_${safeSubdomain}_${modeSuffix}_${timestamp}.absenta`;
    const tempFilePath = path.join(os.tmpdir(), `${filename}_${crypto.randomBytes(4).toString('hex')}.tmp`);

    reportProgress({
      stage: 'packaging',
      processed: 85,
      total: 100,
      percentage: 85,
      message: 'Menulis arsip ZIP cadangan ke disk server...'
    });

    console.log(`[MigrationBundle] Menulis arsip ZIP ke berkas sementara di disk: ${tempFilePath}...`);
    await zip.writeZipPromise(tempFilePath);

    reportProgress({
      stage: 'packaging',
      processed: 95,
      total: 100,
      percentage: 95,
      message: 'Menghitung checksum SHA-256 integritas berkas...'
    });

    // Hitung SHA-256 via stream baca berkas di disk tanpa memuat seluruh berkas ke RAM
    const hash = crypto.createHash('sha256');
    const fileStream = fs.createReadStream(tempFilePath);
    for await (const chunk of fileStream) {
      hash.update(chunk);
    }
    const sha256 = hash.digest('hex');
    manifest.checksum_sha256 = sha256;

    const stat = await fs.promises.stat(tempFilePath);
    console.log(`[MigrationBundle] Sukses mengemas ${filename} (${(stat.size / 1024 / 1024).toFixed(2)} MB), SHA-256: ${sha256}`);

    reportProgress({
      stage: 'finalizing',
      processed: 100,
      total: 100,
      percentage: 100,
      message: 'Paket cadangan selesai dikemas dan siap diunduh!'
    });

    return {
      filepath: tempFilePath,
      manifest,
      filename,
      size: stat.size
    };
  }

  /**
   * Mengemas seluruh data tenant, master, dan berkas media ke dalam buffer file .absenta
   * (Dipertahankan untuk kompatibilitas ke belakang)
   */
  async createExportBundle(tenantId: string, options: ExportBundleOptions = {}): Promise<{ buffer: Buffer; manifest: MigrationManifest; filename: string }> {
    const res = await this.createExportBundleFile(tenantId, options);
    try {
      const buffer = await fs.promises.readFile(res.filepath);
      return {
        buffer,
        manifest: res.manifest,
        filename: res.filename
      };
    } finally {
      await fs.promises.unlink(res.filepath).catch(() => {});
    }
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
  ): Promise<{
    success: boolean;
    manifest: MigrationManifest;
    restoredTables: Record<string, number>;
    targetSubdomain?: string;
    targetTenantId?: string;
    isCloned?: boolean;
    message: string;
  }> {
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

    const manifestMode: BackupBundleMode = 
      manifest.backup_mode || 
      manifest.options?.backup_mode || 
      (manifest.stats?.total_media_files > 0 ? (manifest.stats?.total_records > 1 ? 'FULL' : 'MEDIA_ONLY') : 'DATABASE_ONLY');

    const requestedRestoreMode = options.restoreMode || 'AUTO';
    let effectiveRestoreMode: 'FULL' | 'DATABASE_ONLY' | 'MEDIA_ONLY';

    if (requestedRestoreMode === 'AUTO') {
      effectiveRestoreMode = manifestMode;
    } else {
      if (requestedRestoreMode === 'MEDIA_ONLY' && manifestMode === 'DATABASE_ONLY') {
        const err: any = new Error('Paket cadangan ini hanya berisi "Basis Data" (DATABASE_ONLY) dan tidak memiliki berkas media fisik untuk dipulihkan.');
        err.statusCode = 400;
        throw err;
      }
      if (requestedRestoreMode === 'DATABASE_ONLY' && manifestMode === 'MEDIA_ONLY') {
        const err: any = new Error('Paket cadangan ini hanya berisi "Berkas Media" (MEDIA_ONLY) dan tidak memiliki tabel basis data untuk dipulihkan.');
        err.statusCode = 400;
        throw err;
      }
      effectiveRestoreMode = requestedRestoreMode;
    }

    const shouldRestoreDatabase = effectiveRestoreMode === 'FULL' || effectiveRestoreMode === 'DATABASE_ONLY';
    const shouldRestoreMedia = effectiveRestoreMode === 'FULL' || effectiveRestoreMode === 'MEDIA_ONLY';

    console.log(`[MigrationBundle] Memulai pemulihan (mode paket: ${manifestMode}, mode pemulihan: ${effectiveRestoreMode}).`);

    const sourceTenant = manifest.source_tenant || ({} as any);
    const tenantTableRecord = (dataTables['Tenant'] && dataTables['Tenant'][0]) || {};
    const sourceTenantId = sourceTenant.id || tenantTableRecord.id;
    const sourceSubdomain = (sourceTenant.subdomain || tenantTableRecord.subdomain || '').trim().toLowerCase();

    const requestedSubdomain = options.targetSubdomain?.trim().toLowerCase();
    const requestedName = options.targetName?.trim();
    const isExplicitClone = options.cloneMode === true;

    const isCloning =
      isExplicitClone ||
      (!!requestedSubdomain && requestedSubdomain !== sourceSubdomain) ||
      (!!options.targetTenantId && options.targetTenantId !== sourceTenantId);

    // Validasi subdomain target ketika cloning
    let effectiveSubdomain = requestedSubdomain || sourceSubdomain || 'sekolah';
    if (isCloning) {
      if (!requestedSubdomain) {
        effectiveSubdomain = `${sourceSubdomain || 'tenant'}-demo`;
      }
      if (!/^[a-z0-9-]+$/.test(effectiveSubdomain)) {
        const err: any = new Error('Format subdomain tidak valid. Hanya huruf kecil, angka, dan tanda hubung (-) yang diperbolehkan.');
        err.statusCode = 400;
        throw err;
      }
      if (sourceSubdomain && effectiveSubdomain === sourceSubdomain) {
        const err: any = new Error(`Subdomain untuk kloning tidak boleh sama dengan subdomain asal ("${sourceSubdomain}"). Gunakan subdomain baru seperti "${sourceSubdomain}-demo".`);
        err.statusCode = 400;
        throw err;
      }

      const conflictingTenant = await this.prisma.tenant.findUnique({
        where: { subdomain: effectiveSubdomain }
      });
      if (conflictingTenant && conflictingTenant.id !== options.targetTenantId) {
        const err: any = new Error(`Subdomain "${effectiveSubdomain}" sudah terdaftar untuk tenant "${conflictingTenant.name}". Gunakan subdomain lain yang masih tersedia.`);
        err.statusCode = 400;
        throw err;
      }
    }

    // Dapatkan target tenant ID
    let effectiveTenantId = isCloning
      ? (options.targetTenantId && options.targetTenantId !== sourceTenantId ? options.targetTenantId : crypto.randomUUID())
      : (options.targetTenantId || sourceTenantId);

    const effectiveName = isCloning
      ? (requestedName || (sourceTenant.name ? `${sourceTenant.name} (Demo)` : 'Tenant Demo'))
      : (requestedName || sourceTenant.name || tenantTableRecord.name || 'Tenant Pulih');

    // 🛡️ STRICT PRE-FLIGHT: Validasi koneksi & terbitkan lisensi di Server Lisensi SEBELUM eksekusi database
    let preProvisionedEntitlements: any[] | null = null;
    if (isCloning) {
      reportProgress({
        stage: 'manifest',
        processed: 8,
        total: 100,
        percentage: 10,
        message: `[Strict Mode] Menguji konektivitas ke Server Lisensi...`
      });

      console.log(`[MigrationBundle] 🛡️ [Strict Mode] Menguji koneksi pre-flight ke Server Lisensi...`);
      try {
        await checkLicenseServerConnection(8000);
      } catch (connErr: any) {
        const err: any = new Error(`Kloning dibatalkan: Server Lisensi tidak dapat dihubungi (${connErr.message}). Kloning tenant wajib terhubung dengan Server Lisensi untuk penerbitan TLS & hak akses.`);
        err.statusCode = 503;
        throw err;
      }

      reportProgress({
        stage: 'manifest',
        processed: 12,
        total: 100,
        percentage: 12,
        message: `[Strict Mode] Menerbitkan lisensi kloning "${effectiveSubdomain}" di Server Lisensi...`
      });

      const targetHostKey = process.env.LICENSE_KEY || '';
      if (!targetHostKey) {
        const err: any = new Error('LICENSE_KEY server tidak ditemukan pada konfigurasi environment. Kloning dibatalkan.');
        err.statusCode = 500;
        throw err;
      }

      console.log(`[MigrationBundle] 🧬 [Strict Mode] Menerbitkan lisensi mandiri baru untuk tenant kloning "${effectiveSubdomain}" di Server Lisensi...`);
      try {
        const targetScenario = getDeployScenario();
        const cloneRes = await provisionCloneTenantOnLicenseServer({
          server_license_key: targetHostKey,
          source_slug: sourceSubdomain,
          target_slug: effectiveSubdomain,
          target_name: effectiveName,
          duration_days: 14, // Standar Trial 14 Hari (mencegah kerugian komersial 1 tahun)
          deploy_scenario: targetScenario as any
        });

        if (!cloneRes.success || !Array.isArray(cloneRes.data) || cloneRes.data.length === 0) {
          const err: any = new Error(`Server Lisensi menolak penerbitan lisensi kloning: ${cloneRes.message || 'Tidak ada hak produk yang diberikan.'}`);
          err.statusCode = 502;
          throw err;
        }

        preProvisionedEntitlements = cloneRes.data;
        console.log(`[MigrationBundle] ✅ Pre-flight Provisioning Berhasil (${preProvisionedEntitlements.length} produk resmi):`, cloneRes.message);
      } catch (provErr: any) {
        const err: any = new Error(`Kloning dibatalkan: Gagal menerbitkan lisensi di Server Lisensi (${provErr.message}).`);
        err.statusCode = provErr.statusCode || 502;
        throw err;
      }
    }

    reportProgress({
      stage: 'manifest',
      processed: 10,
      total: 100,
      percentage: 15,
      message: isCloning
        ? `Menyiapkan tenant kloning "${effectiveName}" (${effectiveSubdomain}.absenta.id)...`
        : `Menyiapkan & menyinkronkan profil tenant "${effectiveName}" di sistem...`
    });

    const rewritePathIfClone = (val: any) => {
      if (isCloning && typeof val === 'string' && sourceTenantId && UUID_PATTERN.test(sourceTenantId) && val.includes(sourceTenantId)) {
        return val.split(sourceTenantId).join(effectiveTenantId);
      }
      return val;
    };

    const tenantPayload: Record<string, any> = {
      name: effectiveName,
      subdomain: effectiveSubdomain,
      custom_domain: isCloning ? null : (sourceTenant.custom_domain || tenantTableRecord.custom_domain || null),
      status: sourceTenant.status || tenantTableRecord.status || 'ACTIVE',
      logo_url: rewritePathIfClone(sourceTenant.logo_url || tenantTableRecord.logo_url || null),
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
      let existingTenant = await this.prisma.tenant.findUnique({
        where: { id: effectiveTenantId }
      });

      // Pada mode restore biasa (non-cloning), jika ID tidak ditemukan, cari berdasarkan subdomain
      if (!isCloning && !existingTenant && tenantPayload.subdomain) {
        existingTenant = await this.prisma.tenant.findUnique({
          where: { subdomain: tenantPayload.subdomain }
        });
        if (existingTenant) {
          effectiveTenantId = existingTenant.id;
        }
      }

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
      if (isCloning) {
        throw new Error(`Gagal membuat tenant kloning "${effectiveSubdomain}": ${err?.message || 'Error database'}`);
      }
      try {
        delete tenantPayload.subdomain;
        delete tenantPayload.custom_domain;
        await this.prisma.tenant.update({
          where: { id: effectiveTenantId },
          data: tenantPayload
        });
      } catch (_) {}
    }

    // Pre-pass UUID remapper untuk mode kloning agar seluruh PK & FK antar-tabel konsisten
    const idMap = new Map<string, string>();
    if (isCloning) {
      for (const [tableName, rows] of Object.entries(dataTables)) {
        if (tableName === 'Tenant') continue;
        if (!Array.isArray(rows)) continue;
        for (const r of rows) {
          if (typeof r?.id === 'string' && UUID_PATTERN.test(r.id) && !idMap.has(r.id)) {
            idMap.set(r.id, crypto.randomUUID());
          }
        }
      }
      console.log(`[MigrationBundle] 🧬 Clone mode aktif -> ${effectiveSubdomain} (${effectiveTenantId}). Memetakan ${idMap.size} UUID baru...`);
    }

    const cloneCtx: CloneContext | undefined = isCloning
      ? {
          isCloning: true,
          effectiveTenantId,
          sourceTenantId,
          idMap,
          cloneTag: effectiveSubdomain.replace(/[^a-z0-9-]/g, '').slice(0, 24) || 'clone'
        }
      : undefined;

    const skipModelsOnClone = new Set(['Tenant', 'RefreshToken', 'ParentPushSubscription']);

    const models = getDynamicTenantModels();
    const restoredCounts: Record<string, number> = {};

    const totalModels = shouldRestoreDatabase
      ? models.filter(m => Array.isArray(dataTables[m]) && dataTables[m].length > 0).length
      : 0;
    let modelIndex = 0;

    // Restore Database Models jika mode mengizinkan
    if (shouldRestoreDatabase) {
      (globalThis as any).__bypassPrismaTrialLimit = true;
      try {
        for (const modelName of models) {
        if (isCloning && skipModelsOnClone.has(modelName)) continue;

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
                // Penanganan khusus Role saat cloning: gunakan ulang role jika nama sudah ada pada tenant target
                if (isCloning && modelName === 'Role' && rawRow.name) {
                  const existingRole = await this.prisma.role.findFirst({
                    where: {
                      OR: [
                        { tenant_id: effectiveTenantId, name: rawRow.name },
                        { tenant_id: null, name: rawRow.name }
                      ]
                    }
                  });
                  if (existingRole) {
                    if (typeof rawRow.id === 'string') {
                      idMap.set(rawRow.id, existingRole.id);
                    }
                    count++;
                    return;
                  }
                }

                const cleanData = sanitizeRowForModel(modelName, rawRow, effectiveTenantId, cloneCtx);

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

                // Perlakuan khusus model 1:1 per tenant saat cloning ke tenant yang sudah sempat terinisialisasi
                if (isCloning && modelName === 'StudentCardConfig') {
                  await this.prisma.studentCardConfig.upsert({
                    where: { tenant_id: effectiveTenantId },
                    update: cleanData,
                    create: cleanData as any
                  });
                  count++;
                  return;
                }
                if (isCloning && modelName === 'ShuConfig') {
                  await this.prisma.shuConfig.upsert({
                    where: { tenantId: effectiveTenantId },
                    update: cleanData,
                    create: cleanData as any
                  });
                  count++;
                  return;
                }

                if (isCloning) {
                  await pModel.create({ data: cleanData });
                } else {
                  const uniqueWhere = buildModelUniqueWhere(modelName, cleanData);
                  if (uniqueWhere) {
                    await pModel.upsert({
                      where: uniqueWhere,
                      update: cleanData,
                      create: cleanData
                    });
                  } else {
                    await pModel.create({ data: cleanData });
                  }
                }
                count++;
              } catch (err: any) {
                // Retry jika terjadi foreign key mismatch pada user/relasi sekunder
                try {
                  const cleanData = sanitizeRowForModel(modelName, rawRow, effectiveTenantId, cloneCtx);
                  if (cleanData.uploaded_by_user_id || cleanData.created_by_user_id || cleanData.supervisor_id) {
                    delete cleanData.uploaded_by_user_id;
                    delete cleanData.created_by_user_id;
                    delete cleanData.supervisor_id;
                    if (isCloning) {
                      await pModel.create({ data: cleanData });
                    } else {
                      const retryWhere = buildModelUniqueWhere(modelName, cleanData);
                      if (retryWhere) {
                        await pModel.upsert({
                          where: retryWhere,
                          update: cleanData,
                          create: cleanData
                        });
                      } else {
                        await pModel.create({ data: cleanData });
                      }
                    }
                    count++;
                  } else {
                    console.warn(`[MigrationBundle] Notice inserting ${modelName}:`, err?.message);
                  }
                } catch (retryErr: any) {
                  console.warn(`[MigrationBundle] Notice retry ${modelName}:`, retryErr?.message);
                }
              }
            })
          );
        }
        restoredCounts[modelName] = count;
      }
    } finally {
      (globalThis as any).__bypassPrismaTrialLimit = false;
    }
  } else {
      console.log(`[MigrationBundle] Melewati pemulihan model database (mode: ${effectiveRestoreMode}). Profil tenant tetap terverifikasi.`);
    }

    // Restore Media Storage jika ada dan mode mengizinkan
    const entries = zip.getEntries();
    const mediaEntries = shouldRestoreMedia
      ? entries.filter((e: any) => 
          !e.isDirectory && (e.entryName.startsWith('media/') || e.entryName.startsWith('storage/'))
        )
      : [];

    let mediaProcessed = 0;
    if (shouldRestoreMedia && mediaEntries.length > 0) {
      reportProgress({
        stage: 'storage',
        processed: 0,
        total: 100,
        percentage: 75,
        message: 'Memulihkan file media dan dokumen ke Object Storage MinIO...'
      });

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

          if (isCloning && sourceTenantId && UUID_PATTERN.test(sourceTenantId) && storageKey.includes(sourceTenantId)) {
            storageKey = storageKey.split(sourceTenantId).join(effectiveTenantId);
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
    } else {
      console.log(`[MigrationBundle] Melewati pemulihan berkas media storage (mode: ${effectiveRestoreMode}, mediaEntries: ${mediaEntries.length}).`);
    }

    reportProgress({
      stage: 'finalizing',
      processed: 100,
      total: 100,
      percentage: 100,
      message: 'Pemulihan data berhasil diselesaikan!'
    });

    // 1. 🔄 Re-bind / Provision Lisensi Produk / Entitlements secara otomatis ke Server Lisensi
    let bundledEntitlements: any[] = [];
    let liveEntitlements: any[] = [];

    if (!isCloning) {
      try {
        const entEntry = zip.getEntry('entitlements.json');
        if (entEntry) {
          const entJsonStr = entEntry.getData().toString('utf8');
          bundledEntitlements = JSON.parse(entJsonStr);
          if (Array.isArray(bundledEntitlements) && bundledEntitlements.length > 0) {
            const targetHostKey = process.env.LICENSE_KEY || '';
            const targetScenario = getDeployScenario();
            const sourceScenario = manifest.source_scenario || 'unknown';
            const tenantSlug = effectiveSubdomain || manifest.source_tenant.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
            const npsn = manifest.source_tenant.npsn || undefined;
            const entitlementKeys = bundledEntitlements.map((e: any) => e.license_key).filter(Boolean);

            console.log(`[MigrationBundle] 🔄 Memulai re-binding ${entitlementKeys.length} lisensi produk ke server tujuan (${targetScenario})...`);
            const rebindRes = await rebindTenantEntitlements({
              target_host_key: targetHostKey,
              tenant_slug: tenantSlug,
              npsn,
              target_scenario: targetScenario as any,
              source_scenario: sourceScenario,
              entitlement_keys: entitlementKeys
            });
            console.log(`[MigrationBundle] ✅ Re-binding berhasil:`, rebindRes.message);
          }
        }
      } catch (rebindErr: any) {
        console.warn('[MigrationBundle] Re-binding lisensi produk pasca-restore notice:', rebindErr.message);
      }
    } else {
      // Clone mode: entitlements diambil langsung dari preProvisionedEntitlements hasil pre-flight Server Lisensi
      if (preProvisionedEntitlements && preProvisionedEntitlements.length > 0) {
        liveEntitlements = preProvisionedEntitlements;
        console.log(`[MigrationBundle] 🧬 [Strict Mode] Menggunakan ${liveEntitlements.length} entitlement resmi dari Server Lisensi.`);
      }
    }

    // 2. 🛡️ Sinkronisasi Subscription Patuh Model Komersial (Tanpa Bypass 2030)
    try {
      // Ambil data lisensi terkini langsung dari Server Lisensi jika belum didapat saat clone provisioning
      if (liveEntitlements.length === 0) {
        try {
          const targetHostKey = process.env.LICENSE_KEY || '';
          const tenantSlug = effectiveSubdomain || effectiveName.toLowerCase().replace(/[^a-z0-9]/g, '-');
          const npsn = isCloning ? undefined : (manifest.source_tenant.npsn || undefined);
          liveEntitlements = await fetchTenantProducts({
            server_license_key: targetHostKey,
            tenant_slug: tenantSlug,
            npsn,
            deploy_scenario: getDeployScenario()
          });
        } catch (liveErr: any) {
          console.warn('[MigrationBundle] Gagal fetchTenantProducts live saat pemulihan:', liveErr.message);
        }
      }

      const allEntitlements = isCloning ? liveEntitlements : [...bundledEntitlements, ...liveEntitlements];

      // Periksa apakah tenant memiliki paket lengkap yang aktif
      const paketLengkapEnt = allEntitlements.find((e: any) => {
        const pid = String(e.product_id || '').toLowerCase();
        const pname = String(e.product_name || e.package_title || '').toLowerCase();
        return pid === 'paket-lengkap' || pname.includes('paket lengkap');
      });

      let defaultPlan = await this.prisma.plan.findFirst({});
      if (!defaultPlan) {
        try {
          const LICENSE_SERVER_URL = process.env.LICENSE_SERVER_URL || 'https://api.absenta.id';
          const axios = require('axios');
          const res = await axios.get(`${LICENSE_SERVER_URL}/api/license/packages?product_id=cakola`, { timeout: 8000 });
          if (res.data?.success && Array.isArray(res.data.data) && res.data.data.length > 0) {
            const p = res.data.data[0];
            await this.prisma.module.upsert({
              where: { id: p.module_id || 'CORE' },
              update: {},
              create: { id: p.module_id || 'CORE', name: p.module_id || 'CORE', is_active: true }
            });
            defaultPlan = await this.prisma.plan.create({
              data: {
                id: p.id,
                code: p.id,
                service_code: p.service_code || 'CORE',
                module_id: p.module_id || 'CORE',
                name: p.name || p.title,
                price_monthly: p.price_monthly || 0,
                price_yearly: p.price_yearly || 0,
                max_user: p.device_limit || null,
                features_json: [],
                description: p.description || '',
                billing_period: p.billing_period || 'YEAR',
                is_active: true,
                is_public: true,
                currency: 'IDR'
              }
            });
          }
        } catch (e: any) {
          console.warn('[MIGRATION BUNDLE] Gagal fetch default plan dari License Server:', e.message);
        }
      }
      const now = new Date();

      // A. MODUL FREE (HANYA CORE DAN ACADEMIC) -> Selalu Aktif Permanen
      const freeModules = ['CORE', 'ACADEMIC'];
      const permanentDate = new Date('2099-12-31T23:59:59.000Z');

      for (const freeCode of freeModules) {
        const planForFree = await this.prisma.plan.findFirst({
          where: { service_code: freeCode }
        }) || defaultPlan;

        if (planForFree) {
          const existing = await this.prisma.subscription.findFirst({
            where: { tenant_id: effectiveTenantId, service_code: freeCode }
          });

          if (!existing) {
            await this.prisma.subscription.create({
              data: {
                tenant_id: effectiveTenantId,
                plan_id: planForFree.id,
                service_code: freeCode,
                status: 'ACTIVE',
                start_date: new Date(),
                end_date: permanentDate,
              }
            });
          } else if (existing.status !== 'ACTIVE' || !existing.end_date || existing.end_date < now) {
            await this.prisma.subscription.update({
              where: { id: existing.id },
              data: { status: 'ACTIVE', end_date: permanentDate }
            });
          }
        }
      }

      // B. MODUL BERBAYAR (COMMERCIAL PAID ADD-ONS)
      // Modul: ABSENSI, KESISWAAN, HUBIN, SARPRAS, COOPERATIVE, WHATSAPP, EASY_TUNNEL
      const paidModuleSpecs = [
        { code: 'ABSENSI', keywords: ['absensi', 'attendance'] },
        { code: 'KESISWAAN', keywords: ['kesiswaan', 'bpbk'] },
        { code: 'HUBIN', keywords: ['hubin', 'bkk', 'prakerin'] },
        { code: 'SARPRAS', keywords: ['sarpras', 'asset'] },
        { code: 'COOPERATIVE', keywords: ['koperasi', 'cooperative'] },
        { code: 'WHATSAPP', keywords: ['whatsapp', 'wa'] },
        { code: 'EASY_TUNNEL', keywords: ['easy-tunnel', 'tunnel'] },
      ];

      for (const mod of paidModuleSpecs) {
        let matchedEnt = paketLengkapEnt;
        if (!matchedEnt) {
          matchedEnt = allEntitlements.find((e: any) => {
            const pid = String(e.product_id || '').toLowerCase();
            const pname = String(e.product_name || e.package_title || '').toLowerCase();
            return mod.keywords.some(k => pid.includes(k) || pname.includes(k));
          });
        }

        const existingSub = await this.prisma.subscription.findFirst({
          where: { tenant_id: effectiveTenantId, service_code: mod.code }
        });

        if (matchedEnt) {
          // Ada lisensi resmi dari Server Lisensi
          const expDate = matchedEnt.expires_at ? new Date(matchedEnt.expires_at) : null;
          const isExpValid = expDate && !isNaN(expDate.getTime());
          const isNotExpired = isExpValid && expDate.getTime() > now.getTime();
          const isLicenseActive = matchedEnt.status === 'ACTIVE' || matchedEnt.is_active === 1 || matchedEnt.is_active === true;
          const status = (isNotExpired && isLicenseActive) ? 'ACTIVE' : 'EXPIRED';
          const targetEndDate = isExpValid ? expDate : new Date(now.getTime() - 24 * 3600 * 1000);

          const planForPaid = await this.prisma.plan.findFirst({
            where: { service_code: mod.code }
          }) || defaultPlan;

          if (existingSub) {
            await this.prisma.subscription.update({
              where: { id: existingSub.id },
              data: {
                status: status as any,
                end_date: targetEndDate
              }
            });
          } else if (planForPaid) {
            await this.prisma.subscription.create({
              data: {
                tenant_id: effectiveTenantId,
                plan_id: planForPaid.id,
                service_code: mod.code,
                status: status as any,
                start_date: new Date(),
                end_date: targetEndDate
              }
            });
          }
        } else if (existingSub) {
          // Tidak ada lisensi resmi di Server Lisensi, tapi ada record dari data backup asli
          // Hormati status asli; tandai EXPIRED jika masa aktifnya sudah lewat atau lisensi tidak ada di Server Lisensi
          if (isCloning || (existingSub.end_date && new Date(existingSub.end_date).getTime() <= now.getTime())) {
            await this.prisma.subscription.update({
              where: { id: existingSub.id },
              data: { status: 'EXPIRED' }
            });
          }
        }
        // [Strict Mode] Jika tidak ada lisensi di Server Lisensi, modul TIDAK diinisiasi/diaktifkan secara lokal. Modul tetap terkunci.
        // Jika tidak ada lisensi di Server Lisensi dan tidak ada di backup, modul tetap LOCKED (tanpa subscription).
      }

      // Bersihkan cache entitlement tenant di Redis
      try {
        const { tenantEntitlementService } = await import('@/modules/billing/services/tenant-entitlement.service');
        await tenantEntitlementService.invalidateTenantFeaturesCache(effectiveTenantId);
      } catch {}

      // 🌟 SINKRONISASI RESMI LANGGANAN DARI SERVER LISENSI (Master Authority)
      try {
        const { syncLocalSubscriptionsWithLicensingServer } = await import('@/modules/billing/controllers/sub/subscription-query.controller');
        await syncLocalSubscriptionsWithLicensingServer(effectiveTenantId);
        console.log(`[MigrationBundle] ✅ Berhasil menyinkronkan status langganan resmi untuk tenant ${effectiveTenantId}`);
      } catch (syncErr: any) {
        console.warn('[MigrationBundle] Gagal sinkronisasi resmi subscription pasca-restore:', syncErr.message);
      }

    } catch (subErr: any) {
      console.warn('[MigrationBundle] Gagal rekonsiliasi subscription pasca restore:', subErr.message);
    }

    // Memicu pembaruan telemetri & sinkronisasi tenant ke Server Lisensi seketika
    try {
      const { heartbeatService } = await import('@/modules/system-config/services/heartbeat.service');
      heartbeatService.collectAndSendMetrics().catch(err => {
        console.warn('[MigrationBundle] Notifikasi sinkronisasi ke Server Lisensi dilewati:', err.message);
      });
    } catch {}

    const totalRestoredRecords = Object.values(restoredCounts).reduce((a, b) => a + b, 0);

    let summaryMessage: string;
    if (isCloning) {
      if (effectiveRestoreMode === 'DATABASE_ONLY') {
        summaryMessage = `Berhasil mengkloning basis data tenant "${manifest.source_tenant.name}" ke "${effectiveName}" (${effectiveSubdomain}.absenta.id) dengan ${totalRestoredRecords} rekaman data. Berkas media dilewati.`;
      } else if (effectiveRestoreMode === 'MEDIA_ONLY') {
        summaryMessage = `Berhasil mengkloning berkas media tenant "${manifest.source_tenant.name}" ke "${effectiveName}" (${effectiveSubdomain}.absenta.id) dengan ${mediaProcessed} file MinIO. Tabel database dilewati.`;
      } else {
        summaryMessage = `Berhasil mengkloning tenant "${manifest.source_tenant.name}" ke tenant baru "${effectiveName}" (${effectiveSubdomain}.absenta.id) dengan ${mediaProcessed} file media & ${totalRestoredRecords} rekaman data.`;
      }
    } else {
      if (effectiveRestoreMode === 'DATABASE_ONLY') {
        summaryMessage = `Berhasil memulihkan basis data ${manifest.source_tenant.name} (${totalRestoredRecords} rekaman data dipulihkan). Berkas media tidak diubah.`;
      } else if (effectiveRestoreMode === 'MEDIA_ONLY') {
        summaryMessage = `Berhasil memulihkan berkas media ${manifest.source_tenant.name} (${mediaProcessed} berkas MinIO dipulihkan). Tabel database tidak diubah.`;
      } else {
        summaryMessage = `Berhasil memulihkan tenant ${manifest.source_tenant.name} (${mediaProcessed} file media & ${totalRestoredRecords} rekaman data dipulihkan).`;
      }
    }

    return {
      success: true,
      manifest,
      restoredTables: restoredCounts,
      targetSubdomain: effectiveSubdomain,
      targetTenantId: effectiveTenantId,
      isCloned: isCloning,
      message: summaryMessage
    };
  }
}

export const migrationBundleService = new MigrationBundleService();
