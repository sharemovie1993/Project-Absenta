import { PrismaClient, BackupStatus } from '@prisma/client';
import { prisma } from '@/utils/prisma';
import { LocalDiskStorage } from '@/infra/storage/LocalDiskStorage';
import { Readable } from 'stream';
import { BackupStorage } from '@/infra/storage/BackupStorage';
import { auditLogService } from '@/modules/audit/services/audit-log.service';
import { TENANT_MODELS, getDynamicTenantModels } from '@/constants/backup.constants';
import crypto from 'crypto';

export class BackupService {
  private prisma: PrismaClient;
  private storage: BackupStorage;

  // Dynamically retrieved list of models to backup (ordered by dependency)
  private get tenantModels() {
    return getDynamicTenantModels();
  }

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
    this.storage = new LocalDiskStorage();
  }

  async listRecentBackups() {
    return this.prisma.tenantBackup.findMany({
      orderBy: { snapshot_date: 'desc' },
      take: 100,
      include: { Tenant: { select: { name: true, subdomain: true } } }
    });
  }

  async getBackupById(id: string) {
    return this.prisma.tenantBackup.findUnique({ where: { id } });
  }

  async createSnapshot(tenantId: string): Promise<void> {
    // Verify tenant exists
    const tenant = await this.prisma.tenant.findUnique({
        where: { id: tenantId }
    });
    if (!tenant) {
        throw new Error(`Tenant not found: ${tenantId}`);
    }

    // 1. Create a stream that reads from DB and pushes strings (JSON parts)
    const dbStream = new Readable({
      read() {} // Implementation will push data
    });

    // 2. Start the async process to feed the stream
    this.generateBackupStream(tenantId, tenant, dbStream).catch(err => {
      dbStream.destroy(err);
    });

    // 3. Save to storage
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${tenantId}/${timestamp}.json`; // Storage adds .gz if it compresses, but our LocalDiskStorage logic is to use the filename as provided but compress content.
    // Wait, if LocalDiskStorage compresses, the file on disk WILL be gzipped.
    // Ideally the filename should reflect that.
    // I'll append .gz to the filename passed to storage, so it's explicit.
    const storageFilename = `${filename}.gz`;
    
    try {
        const { path, size, checksum } = await this.storage.save(dbStream, storageFilename);
        
        // Phase 1.6: Snapshot Integrity Signing (HMAC)
        const secret = process.env.BACKUP_SIGNING_SECRET;
        if (!secret) {
            throw new Error('BACKUP_SIGNING_SECRET is not configured. Cannot sign backup.');
        }

        const signature = crypto
            .createHmac('sha256', secret)
            .update(checksum)
            .digest('hex');

        const backup = await this.prisma.tenantBackup.create({
            data: {
                tenant_id: tenantId,
                file_path: path, // This is the relative path returned by storage
                file_size_bytes: BigInt(size),
                checksum_sha256: checksum,
                file_signature: signature,
                status: BackupStatus.READY,
                expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 365 days
                snapshot_date: new Date()
            }
        });

        auditLogService.logEvent({
          event_type: 'TENANT_BACKUP_CREATED',
          severity: 'INFO',
          entity_type: 'TENANT_BACKUP',
          entity_id: backup.id,
          tenant_id: tenantId,
          metadata: { size: Number(size), path: path }
        });
    } catch (error) {
        console.error('Backup failed:', error);
        throw error;
    }
  }

  private async generateBackupStream(tenantId: string, tenantData: any, stream: Readable) {
      try {
          // Pre-calculate Row Counts
          const tableRowCounts: Record<string, number> = {};
          let totalRows = 0;

          for (const tableName of this.tenantModels) {
              // @ts-ignore
              const model = this.prisma[tableName];
              if (!model) continue;

              let whereClause: any = { tenant_id: tenantId };
              if (tableName === 'DocumentActivity') {
                  whereClause = { actor_tenant_id: tenantId };
              }

              const count = await model.count({ where: whereClause });
              tableRowCounts[tableName] = count;
              totalRows += count;
          }

          // Meta
          const meta = {
              tenant_id: tenantId,
              version: 1,
              created_at: new Date().toISOString(),
              tenant_data: tenantData,
              table_row_counts: tableRowCounts,
              total_rows: totalRows
          };
          stream.push(`{"meta":${JSON.stringify(meta)},"tables":{`);

          let firstTable = true;
          for (const tableName of this.tenantModels) {
              // @ts-ignore
              const model = this.prisma[tableName];
              if (!model) {
                  // Skip if model not found (maybe renamed or removed)
                  console.warn(`Model ${tableName} not found on Prisma Client`);
                  continue;
              }

              if (!firstTable) stream.push(',');
              firstTable = false;
              
              stream.push(`"${tableName}":[`);
              
              let cursor = undefined;
              let firstRow = true;
              
              while (true) {
                  // Check if model has tenant_id
                  // We assume all in list have tenant_id.
                  // But we should be careful.
                  // We can wrap in try-catch if filter fails? 
                  // No, findMany will throw if field doesn't exist.
                  // We assume the list is correct.
              
              let whereClause: any = { tenant_id: tenantId };
              
              // Handle special cases where field name is different
              if (tableName === 'DocumentActivity') {
                  whereClause = { actor_tenant_id: tenantId };
              }

              const rows: any[] = await model.findMany({
                  where: whereClause,
                  take: 5000,
                  skip: cursor ? 1 : 0,
                  cursor: cursor ? { id: cursor } : undefined,
                  orderBy: { id: 'asc' }
              });

                  if (rows.length === 0) break;

                  for (const row of rows) {
                      if (!firstRow) stream.push(',');
                      stream.push(JSON.stringify(row));
                      firstRow = false;
                  }

                  if (rows.length < 5000) break;
                  cursor = rows[rows.length - 1].id;
              }
              
              stream.push(']');
          }
          
          stream.push('}}');
          stream.push(null); // End of stream
      } catch (err) {
          stream.destroy(err as Error);
      }
  }
}

export const backupService = new BackupService(prisma as any);
