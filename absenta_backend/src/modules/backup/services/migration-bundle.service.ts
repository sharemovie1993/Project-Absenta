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

              // Check if value is a media path/URL in uploads/
              if (includeMedia && typeof v === 'string' && (v.includes('/uploads/') || v.startsWith('uploads/'))) {
                const marker = v.indexOf('uploads/');
                if (marker >= 0) {
                  const subKey = v.substring(marker);
                  mediaKeysToCollect.add(subKey);
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

    // 2. Kumpulkan file media
    let totalMediaFiles = 0;
    let mediaSizeBytes = 0;

    if (includeMedia && mediaKeysToCollect.size > 0) {
      for (const storageKey of mediaKeysToCollect) {
        try {
          const stream = storageService.createReadStream(storageKey);
          const chunks: Buffer[] = [];
          for await (const chunk of stream) {
            chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
          }
          const fileBuf = Buffer.concat(chunks);
          if (fileBuf.length > 0) {
            const relativeZipPath = path.posix.join('storage', storageKey);
            zip.addFile(relativeZipPath, fileBuf);
            totalMediaFiles++;
            mediaSizeBytes += fileBuf.length;
          }
        } catch (_) {
          // Skip missing files gracefully
        }
      }
    }

    // Hitung statistik ringkas untuk manifest
    const totalUsers = (dataTables['User'] || []).length;
    const totalStudents = (dataTables['Siswa'] || []).length;
    const totalTeachers = (dataTables['Guru'] || []).length;
    const totalClasses = (dataTables['Kelas'] || []).length;

    // Simpan database.json
    const dbJsonBuffer = Buffer.from(JSON.stringify(dataTables, null, 2), 'utf8');
    zip.addFile('database.json', dbJsonBuffer);

    // 3. Susun manifest.json
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
        status: tenant.status || 'ACTIVE'
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

    // Dapatkan target tenant
    let effectiveTenantId = options.targetTenantId || manifest.source_tenant.id;

    if (options.isInitialFreshSetup) {
      reportProgress({
        stage: 'manifest',
        processed: 10,
        total: 100,
        percentage: 15,
        message: `Menyiapkan tenant "${manifest.source_tenant.name}" di sistem...`
      });

      // Buat atau perbarui tenant dari manifest
      const upsertedTenant = await this.prisma.tenant.upsert({
        where: { id: effectiveTenantId },
        update: {
          name: manifest.source_tenant.name,
          subdomain: manifest.source_tenant.subdomain || 'sekolah',
          custom_domain: manifest.source_tenant.custom_domain || null,
          status: 'ACTIVE'
        },
        create: {
          id: effectiveTenantId,
          name: manifest.source_tenant.name,
          subdomain: manifest.source_tenant.subdomain || 'sekolah',
          custom_domain: manifest.source_tenant.custom_domain || null,
          status: 'ACTIVE'
        }
      });
      effectiveTenantId = upsertedTenant.id;
    }

    // Baca database.json
    const dbEntry = zip.getEntry('database.json');
    if (!dbEntry) {
      throw new Error('Berkas cadangan tidak memiliki "database.json".');
    }

    const dataTables = JSON.parse(dbEntry.getData().toString('utf8')) as Record<string, any[]>;
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
              // Lanjutkan proses jika ada baris berkonflik
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
    const mediaEntries = entries.filter((e: any) => !e.isDirectory && e.entryName.startsWith('storage/'));

    let mediaProcessed = 0;
    for (const entry of mediaEntries) {
      try {
        const storageKey = entry.entryName.replace(/^storage\//, '');
        const fileData = entry.getData();
        await storageService.uploadBuffer(storageKey, fileData);
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

    return {
      success: true,
      manifest,
      restoredTables: restoredCounts,
      message: `Berhasil memulihkan tenant ${manifest.source_tenant.name} (${mediaProcessed} file media & ${Object.values(restoredCounts).reduce((a, b) => a + b, 0)} rekaman data).`
    };
  }
}

export const migrationBundleService = new MigrationBundleService();
