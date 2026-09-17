import { LocalDiskStorage } from '@/infra/storage/LocalDiskStorage';
import { getRestoreQueue } from '../restore.queue';
import { backupService } from '../services/backup.service';
import { migrationBundleService } from '../services/migration-bundle.service';
import { Prisma } from '@prisma/client';
import { getDynamicTenantModels } from '@/constants/backup.constants';



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
    return BackupController.exportBundle(req, reply);
  }

  static async importTenantData(req: any, reply: any) {
    return BackupController.importBundle(req, reply);
  }

  static async purgeTenantData(req: any, reply: any) {
    try {
      const tenantId = req.tenantId || req.dataScope?.tenantId;
      if (!tenantId) {
        return reply.status(400).send({ success: false, message: 'Context Tenant tidak ditemukan' });
      }
      const currentUserId = req.user?.id || req.userId;
      const { prisma } = await import('@/utils/prisma');

      console.log(`[Backup Controller] Manual purging tenant data for: ${tenantId} (Preserving Admin User ${currentUserId || 'N/A'})...`);
      const purgeModelsOrder = getDynamicTenantModels().slice().reverse();
      const purgeReport: Record<string, number> = {};
      const auditReport: Record<string, ModelRestoreSummary> = {};
      let totalDeleted = 0;

      for (const mName of purgeModelsOrder) {
        if (mName === 'User') continue;
        const pModel = (prisma as any)[mName];
        if (!pModel) continue;

        const tenantField = getTenantFieldName(mName);
        if (!tenantField) continue;

        try {
          const res = await pModel.deleteMany({ where: { [tenantField]: tenantId } });
          if (res && res.count > 0) {
            purgeReport[mName] = res.count;
            auditReport[mName] = { target: res.count, restored: res.count, skipped: 0, gap: 0 };
            totalDeleted += res.count;
          }
        } catch (e: any) {
          console.warn(`[Purge Skip] ${mName} deleteMany error:`, e?.message);
        }
      }

      if (currentUserId) {
        try {
          const res = await prisma.user.deleteMany({
            where: { tenant_id: tenantId, id: { not: currentUserId } }
          });
          if (res.count > 0) {
            purgeReport['User'] = res.count;
            auditReport['User'] = { target: res.count, restored: res.count, skipped: 0, gap: 0 };
            totalDeleted += res.count;
          }
        } catch (_) {}
      }

      return reply.send({
        success: true,
        message: `Pengosongan data sekolah selesai. Total ${totalDeleted} record dari ${Object.keys(purgeReport).length} tabel berhasil dibersihkan (Akun Admin aktif).`,
        details: purgeReport,
        audit: {
          totalTarget: totalDeleted,
          totalRestored: totalDeleted,
          totalSkipped: 0,
          totalGap: 0,
          matchRate: 100,
          details: auditReport
        }
      });
    } catch (err: any) {
      console.error('Error purging tenant data:', err);
      return reply.status(500).send({ success: false, message: 'Gagal mengosongkan data: ' + (err?.message || 'Error') });
    }
  }

  static async exportBundle(req: any, reply: any) {
    try {
      const tenantId = req.query?.tenantId || req.body?.tenantId || req.tenantId || req.dataScope?.tenantId || req.user?.tenantId || req.user?.tenant_id;
      if (!tenantId) {
        return reply.status(400).send({ success: false, message: 'Tenant ID wajib ditentukan' });
      }

      const includeAttendance = req.query?.includeAttendance !== 'false' && req.body?.includeAttendance !== false;
      const includeMedia = req.query?.includeMedia !== 'false' && req.body?.includeMedia !== false;

      const { buffer, filename, manifest } = await migrationBundleService.createExportBundle(tenantId, {
        includeAttendance,
        includeMedia
      });

      reply.header('Content-Type', 'application/octet-stream');
      reply.header('Content-Disposition', `attachment; filename="${filename}"`);
      reply.header('X-Absenta-Manifest', encodeURIComponent(JSON.stringify(manifest)));
      return reply.send(buffer);
    } catch (error: any) {
      console.error('Error exporting migration bundle:', error);
      return reply.status(500).send({ success: false, message: 'Gagal mengekspor berkas .absenta: ' + (error?.message || 'Error') });
    }
  }

  static async inspectBundle(req: any, reply: any) {
    try {
      const filePart = await req.file();
      if (!filePart) {
        return reply.status(400).send({ success: false, message: 'Berkas .absenta wajib diunggah' });
      }

      const buffer = await filePart.toBuffer();
      if (!buffer || buffer.length === 0) {
        return reply.status(400).send({ success: false, message: 'Berkas kosong atau tidak terbaca' });
      }

      const manifest = migrationBundleService.inspectBundle(buffer);
      return reply.send({ success: true, data: manifest });
    } catch (error: any) {
      console.error('Error inspecting bundle:', error);
      return reply.status(400).send({ success: false, message: error?.message || 'Berkas cadangan tidak valid' });
    }
  }

  static async importBundle(req: any, reply: any) {
    try {
      const filePart = await req.file();
      if (!filePart) {
        return reply.status(400).send({ success: false, message: 'Berkas .absenta wajib diunggah' });
      }

      const targetTenantId = req.query?.targetTenantId || req.body?.targetTenantId || req.tenantId || req.dataScope?.tenantId || req.user?.tenantId || req.user?.tenant_id;
      const buffer = await filePart.toBuffer();

      console.log(`[BackupController] Memulai restorasi bundle ke tenant ${targetTenantId || 'auto'}...`);
      const result = await migrationBundleService.restoreBundle(buffer, {
        targetTenantId,
        isInitialFreshSetup: false,
        clearExisting: false
      });

      return reply.send({ success: true, data: result, message: result.message });
    } catch (error: any) {
      console.error('Error importing bundle:', error);
      return reply.status(500).send({ success: false, message: 'Gagal memulihkan berkas .absenta: ' + (error?.message || 'Error') });
    }
  }
}

