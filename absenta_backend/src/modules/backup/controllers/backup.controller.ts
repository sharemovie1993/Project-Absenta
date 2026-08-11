import { LocalDiskStorage } from '@/infra/storage/LocalDiskStorage';
import { getRestoreQueue } from '../restore.queue';
import { backupService } from '../services/backup.service';
import { Prisma } from '@prisma/client';
import crypto from 'crypto';

function sanitizeRowForModel(modelName: string, rawRow: Record<string, any>, tenantId: string): Record<string, any> {
  const dmmfModel = Prisma.dmmf.datamodel.models.find(m => m.name === modelName);
  if (!dmmfModel) return rawRow;

  const cleanData: Record<string, any> = {};

  for (const field of dmmfModel.fields) {
    if (field.kind !== 'scalar' && field.kind !== 'enum') continue;

    const val = rawRow[field.name];
    if (val === undefined || val === null) {
      if (field.name === 'tenant_id') {
        cleanData.tenant_id = tenantId;
      }
      continue;
    }

    if (field.name === 'tenant_id') {
      cleanData.tenant_id = tenantId;
    } else if (field.name === 'actor_tenant_id') {
      cleanData.actor_tenant_id = tenantId;
    } else if (field.type === 'DateTime') {
      try {
        const d = new Date(val);
        if (!isNaN(d.getTime())) {
          cleanData[field.name] = d;
        }
      } catch {
        // Skip invalid date
      }
    } else if (field.type === 'BigInt') {
      try {
        cleanData[field.name] = BigInt(val);
      } catch {
        // Skip invalid bigint
      }
    } else {
      cleanData[field.name] = val;
    }
  }

  return cleanData;
}

export interface ModelRestoreSummary {
  target: number;
  restored: number;
  skipped: number;
  gap: number;
}

export class BackupController {
  static async list(req: any, reply: any) {
      const tenantId = req.tenantId || req.dataScope?.tenantId;
      const backups = await backupService.listRecentBackups(tenantId);
      const data = JSON.parse(JSON.stringify(backups, (_key, value) => 
          typeof value === 'bigint' ? value.toString() : value
      ));
      return reply.send({ success: true, data });
  }

  static async download(req: any, reply: any) {
      const { id } = req.params;
      const backup = await backupService.getBackupById(id);
      if (!backup) return reply.status(404).send({ success: false, message: 'Backup not found' });

      const storage = new LocalDiskStorage();
      try {
          const stream = storage.read(backup.file_path);
          reply.header('Content-Type', 'application/gzip');
          reply.header('Content-Disposition', `attachment; filename="${id}.json.gz"`);
          return reply.send(stream);
      } catch (e) {
          return reply.status(500).send({ success: false, message: 'File not found on disk' });
      }
  }

  static async restore(req: any, reply: any) {
      const { id } = req.params;
      const { newTenantId } = req.body;
      
      if (!newTenantId) return reply.status(400).send({ success: false, message: 'newTenantId is required' });

      try {
          const backup = await backupService.getBackupById(id);
          if (!backup) return reply.status(404).send({ success: false, message: 'Backup not found' });
          
          if (backup.restore_status === 'IN_PROGRESS') {
              return reply.status(409).send({ success: false, message: 'Restore already in progress for this backup' });
          }

          const restoreQueue = getRestoreQueue();
          
          const job = await restoreQueue.getJob(id);
          if (job) {
              const state = await job.getState();
              if (state === 'active' || state === 'waiting' || state === 'delayed') {
                  return reply.status(409).send({ success: false, message: 'Restore already queued or running' });
              }
          }

          await restoreQueue.add('restore-job', {
              backupId: id,
              targetTenantId: newTenantId,
              initiatedBy: req.user?.id ?? 'system'
          }, {
              jobId: id,
              attempts: 3,
              backoff: { type: 'exponential', delay: 5000 }
          });

          return reply.send({ 
              success: true, 
              message: 'Restore job queued',
              jobId: id 
          });
      } catch (e: any) {
          return reply.status(500).send({ success: false, message: 'Failed to queue restore job: ' + e.message });
      }
  }

  static async exportTenantData(req: any, reply: any) {
    try {
      const tenantId = req.tenantId || req.dataScope?.tenantId;
      if (!tenantId) {
        return reply.status(400).send({ success: false, message: 'Context Tenant tidak ditemukan' });
      }

      const { prisma } = await import('@/utils/prisma');
      const { getDynamicTenantModels } = await import('@/constants/backup.constants');

      const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
      if (!tenant) {
        return reply.status(404).send({ success: false, message: 'Tenant not found' });
      }

      const models = getDynamicTenantModels();
      const exportData: Record<string, any[]> = {};
      const tableRowCounts: Record<string, number> = {};
      let totalRows = 0;

      for (const modelName of models) {
        // @ts-ignore
        const prismaModel = prisma[modelName];
        if (!prismaModel) continue;

        let whereClause: any = { tenant_id: tenantId };
        if (modelName === 'DocumentActivity') {
          whereClause = { actor_tenant_id: tenantId };
        }

        try {
          const rows = await prismaModel.findMany({ where: whereClause });
          exportData[modelName] = rows;
          tableRowCounts[modelName] = rows.length;
          totalRows += rows.length;
        } catch (e) {
          // Ignore if model does not have tenant_id filter directly
        }
      }

      const payload = {
        meta: {
          tenant_id: tenantId,
          version: 2,
          created_at: new Date().toISOString(),
          tenant_data: tenant,
          table_row_counts: tableRowCounts,
          total_rows: totalRows,
        },
        data: exportData,
      };

      const jsonString = JSON.stringify(payload, (_key, value) =>
        typeof value === 'bigint' ? value.toString() : value
      );

      const fileSize = Buffer.byteLength(jsonString);
      const checksum = crypto.createHash('sha256').update(jsonString).digest('hex');
      const timestamp = new Date().toISOString().split('T')[0];

      // Record snapshot entry into TenantBackup table
      try {
        await prisma.tenantBackup.create({
          data: {
            tenant_id: tenantId,
            file_path: `exports/backup-${tenantId}-${timestamp}.json`,
            file_size_bytes: BigInt(fileSize),
            checksum_sha256: checksum,
            expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            status: 'READY',
          }
        });
      } catch (err) {
        console.warn('Failed to record TenantBackup log entry:', err);
      }

      reply.header('Content-Type', 'application/json');
      reply.header('Content-Disposition', `attachment; filename="academic-backup-${timestamp}.json"`);
      return reply.send(jsonString);
    } catch (error: any) {
      console.error('Error exporting tenant backup:', error);
      return reply.status(500).send({ success: false, message: 'Gagal mengekspor data: ' + (error?.message || 'Error') });
    }
  }

  static async importTenantData(req: any, reply: any) {
    try {
      const tenantId = req.tenantId || req.dataScope?.tenantId;
      if (!tenantId) {
        return reply.status(400).send({ success: false, message: 'Context Tenant tidak ditemukan' });
      }

      const { prisma } = await import('@/utils/prisma');
      const { getDynamicTenantModels } = await import('@/constants/backup.constants');

      const body = req.body || {};
      const payload = body.data || body;

      let dataTables: Record<string, any[]> = {};
      if (payload.data && typeof payload.data === 'object') {
        dataTables = payload.data;
      } else if (payload.tables && typeof payload.tables === 'object') {
        dataTables = payload.tables;
      } else {
        dataTables = payload;
      }

      const models = getDynamicTenantModels();
      const auditReport: Record<string, ModelRestoreSummary> = {};
      const legacyDetails: Record<string, number> = {};
      
      let grandTarget = 0;
      let grandRestored = 0;
      let grandSkipped = 0;
      const shouldClearExisting = Boolean(body.clear_existing || body.clearExisting || payload.clear_existing || payload.clearExisting);

      if (shouldClearExisting) {
        console.log(`[Backup Controller] Purging existing trial data for tenant: ${tenantId}...`);
        const purgeModelsOrder = [
          'AbsenSiswa', 'AbsenGuru', 'AbsenGerbangSiswa', 'AbsenGerbangGuru',
          'NilaiSiswa', 'RaporSiswa', 'PelanggaranSiswa', 'SupervisiGuru',
          'KonselingSiswa', 'PemanggilanOrangTua', 'HomeVisit', 'AsesmenSiswa', 'RujukanKasus', 'KasusBK',
          'SiswaDocument', 'GuruDocument', 'PrestasiSiswa', 'SiswaFaceTemplate',
          'JadwalKBM', 'GuruMapel', 'KelasMapel', 'JadwalPiketGuru', 'JadwalKegiatan', 'AnggotaKegiatanEskul',
          'SiswaAkademik', 'GuruTimeOff', 'StrukturKurikulum',
          'OrganizationalAssignment', 'OrganizationalCapability', 'OrganizationalPosition', 'PositionJobdesk',
          'IzinKeluarSiswa', 'SiswaPkl', 'AbsensiPkl', 'HubinLamaran', 'HubinTracerStudy',
          'SesiAbsensi', 'SesiGerbang', 'JenisKegiatanMaster', 'JenisPelanggaran', 'JenisPrestasi',
          'Member', 'Saving', 'Loan', 'Sale', 'SavingTransaction',
          'Siswa', 'Guru', 'OrangTua', 'OrangTuaSiswa',
          'Kelas', 'Jurusan', 'ProgramKeahlian', 'Mapel',
          'Semester', 'TahunPelajaran', 'Sekolah',
          'WaAuthSession', 'WaChatLog'
        ];

        for (const mName of purgeModelsOrder) {
          // @ts-ignore
          const pModel = prisma[mName];
          if (!pModel) continue;
          try {
            await pModel.deleteMany({ where: { tenant_id: tenantId } });
          } catch (e) {
            try {
              await pModel.deleteMany({ where: { tenantId: tenantId } });
            } catch (_) {}
          }
        }
      }

      for (const modelName of models) {
        let rows: any[] | undefined = dataTables[modelName];
        if (!rows) {
          const matchedKey = Object.keys(dataTables).find(k => k.toLowerCase() === modelName.toLowerCase());
          if (matchedKey) rows = dataTables[matchedKey];
        }
        if (!Array.isArray(rows) || rows.length === 0) continue;

        const targetCount = rows.length;
        grandTarget += targetCount;

        // @ts-ignore
        const prismaModel = prisma[modelName];
        if (!prismaModel) {
          auditReport[modelName] = { target: targetCount, restored: 0, skipped: targetCount, gap: targetCount };
          legacyDetails[modelName] = 0;
          grandSkipped += targetCount;
          continue;
        }

        let restoredCount = 0;
        let skippedCount = 0;

        for (const rawRow of rows) {
          try {
            const cleanData = sanitizeRowForModel(modelName, rawRow, tenantId);
            const dmmfModel = Prisma.dmmf.datamodel.models.find(m => m.name === modelName);

            let whereInput: any = null;
            if (dmmfModel?.primaryKey) {
              const pkName = dmmfModel.primaryKey.name || dmmfModel.primaryKey.fields.join('_');
              const pkValue: Record<string, any> = {};
              let validPk = true;

              for (const fieldName of dmmfModel.primaryKey.fields) {
                if (cleanData[fieldName] !== undefined && cleanData[fieldName] !== null) {
                  pkValue[fieldName] = cleanData[fieldName];
                } else {
                  validPk = false;
                }
              }

              if (validPk) {
                whereInput = { [pkName]: pkValue };
              }
            }

            if (!whereInput && dmmfModel?.uniqueIndexes && dmmfModel.uniqueIndexes.length > 0) {
              for (const uIdx of dmmfModel.uniqueIndexes) {
                const uName = uIdx.name || uIdx.fields.join('_');
                const uValue: Record<string, any> = {};
                let validU = true;
                for (const fName of uIdx.fields) {
                  if (cleanData[fName] !== undefined && cleanData[fName] !== null) {
                    uValue[fName] = cleanData[fName];
                  } else {
                    validU = false;
                  }
                }
                if (validU) {
                  whereInput = { [uName]: uValue };
                  break;
                }
              }
            }

            if (!whereInput && cleanData.id) {
              whereInput = { id: cleanData.id };
            }

            if (whereInput) {
              await prismaModel.upsert({
                where: whereInput,
                create: cleanData,
                update: cleanData,
              });
            } else {
              await prismaModel.create({ data: cleanData });
            }
            restoredCount++;
          } catch (err: any) {
            skippedCount++;
            console.warn(`[Restore Skip] ${modelName} row error:`, err?.message);
          }
        }

        const gap = Math.max(0, targetCount - restoredCount);
        auditReport[modelName] = {
          target: targetCount,
          restored: restoredCount,
          skipped: skippedCount,
          gap: gap
        };
        legacyDetails[modelName] = restoredCount;
        grandRestored += restoredCount;
        grandSkipped += skippedCount;
      }

      const totalGap = Math.max(0, grandTarget - grandRestored);
      const matchRate = grandTarget > 0 ? Math.round((grandRestored / grandTarget) * 100) : 100;
      const jsonStr = JSON.stringify(body);

      // Record restore history entry in TenantBackup table
      try {
        await prisma.tenantBackup.create({
          data: {
            tenant_id: tenantId,
            file_path: `imports/restore-${tenantId}-${new Date().toISOString().split('T')[0]}.json`,
            file_size_bytes: BigInt(Buffer.byteLength(jsonStr)),
            checksum_sha256: crypto.createHash('sha256').update(jsonStr).digest('hex'),
            expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            status: 'READY',
            restore_status: 'COMPLETED',
            restored_at: new Date(),
            restored_to_tenant_id: tenantId
          }
        });
      } catch (err) {
        console.warn('Failed to record TenantBackup restore log entry:', err);
      }

      return reply.send({
        success: true,
        message: `Pemulihan data selesai. Target: ${grandTarget}, Berhasil: ${grandRestored}, Gap: ${totalGap}.`,
        details: legacyDetails,
        audit: {
          totalTarget: grandTarget,
          totalRestored: grandRestored,
          totalSkipped: grandSkipped,
          totalGap: totalGap,
          matchRate: matchRate,
          details: auditReport
        }
      });
    } catch (error: any) {
      console.error('Error importing tenant backup:', error);
      return reply.status(500).send({ success: false, message: 'Gagal memulihkan data: ' + (error?.message || 'Error') });
    }
  }
}
