import { LocalDiskStorage } from '@/infra/storage/LocalDiskStorage';
import { getRestoreQueue } from '../restore.queue';
import { backupService } from '../services/backup.service';

export class BackupController {
  static async list(_req: any, reply: any) {
      const backups = await backupService.listRecentBackups();
      // Handle BigInt serialization
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
          // Guard: Check if backup is already being restored
          const backup = await backupService.getBackupById(id);
          if (!backup) return reply.status(404).send({ success: false, message: 'Backup not found' });
          
          if (backup.restore_status === 'IN_PROGRESS') {
              return reply.status(409).send({ success: false, message: 'Restore already in progress for this backup' });
          }

          const restoreQueue = getRestoreQueue();
          
          // Deduplication: Use backupId as jobId to prevent duplicate queuing
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
              jobId: id, // Explicit Job ID for deduplication
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

      const timestamp = new Date().toISOString().split('T')[0];
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
      const dataTables = payload.data || payload.tables || {};
      const models = getDynamicTenantModels();

      const details: Record<string, number> = {};
      let totalInserted = 0;

      for (const modelName of models) {
        const rows = dataTables[modelName];
        if (!Array.isArray(rows) || rows.length === 0) continue;

        // @ts-ignore
        const prismaModel = prisma[modelName];
        if (!prismaModel) continue;

        let insertedCount = 0;
        for (const row of rows) {
          try {
            const rowData = { ...row, tenant_id: tenantId };
            delete rowData.created_at;
            delete rowData.updated_at;

            if (rowData.id) {
              await prismaModel.upsert({
                where: { id: rowData.id },
                create: rowData,
                update: rowData,
              });
            } else {
              await prismaModel.create({ data: rowData });
            }
            insertedCount++;
          } catch (err) {
            // Idempotent skip for duplicates
          }
        }
        details[modelName] = insertedCount;
        totalInserted += insertedCount;
      }

      return reply.send({
        success: true,
        message: `Pemulihan data selesai. Berhasil menyinkronkan ${totalInserted} record.`,
        details,
      });
    } catch (error: any) {
      console.error('Error importing tenant backup:', error);
      return reply.status(500).send({ success: false, message: 'Gagal memulihkan data: ' + (error?.message || 'Error') });
    }
  }
}
