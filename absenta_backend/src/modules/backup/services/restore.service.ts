import { PrismaClient, BackupStatus, RestoreStatus } from '@prisma/client';
import { LocalDiskStorage } from '@/infra/storage/LocalDiskStorage';
import zlib from 'zlib';
import Parser from 'stream-json/Parser';
import { auditLogService } from '@/modules/audit/services/audit-log.service';
import { TENANT_MODELS } from '@/constants/backup.constants';
import { redisLockService } from '@/infra/lock/redis-lock.service';
import { getRedisConnection } from '@/queue/redis';
import crypto from 'crypto';

export class RestoreService {
  private prisma: PrismaClient;
  private storage: LocalDiskStorage;
  private redisPub: any;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
    this.storage = new LocalDiskStorage();
    this.redisPub = getRedisConnection();
  }

  private async publishProgress(backupId: string, table: string, processed: number, total: number) {
      const percentage = total > 0 ? Math.round((processed / total) * 100) : 0;
      const message = JSON.stringify({
          table,
          processed,
          total,
          percentage,
          eta_seconds: 0 // TODO: Implement ETA calculation
      });
      try {
        await this.redisPub.publish(`restore:progress:${backupId}`, message);
      } catch {}
  }

  async restoreBackup(backupId: string, newTenantId: string, _adminId: string): Promise<void> {
      // 0. Distributed Locking Strategy
      // We use Redis Distributed Lock to ensure safety across multiple backend instances.
      const restoreLockKey = `lock:restore:backup:${backupId}`;
      const targetLockKey = `lock:restore:target:${newTenantId}`;
      const LOCK_TTL = 1800000; // 30 minutes
      const HEARTBEAT_INTERVAL = 60000; // 60 seconds
      
      let restoreLockToken: string | undefined;
      let targetLockToken: string | undefined;
      let heartbeatInterval: NodeJS.Timeout | null = null;
      let lockLost = false;

      try {
          // Acquire Backup Lock
          const restoreLock = await redisLockService.acquire(restoreLockKey, LOCK_TTL);
          if (!restoreLock.success) {
              throw new Error('Restore already in progress for this backup (Locked)'); // 409 Conflict
          }
          restoreLockToken = restoreLock.token;

          // Acquire Target Lock
          const targetLock = await redisLockService.acquire(targetLockKey, LOCK_TTL);
          if (!targetLock.success) {
              throw new Error('Restore already in progress for this target tenant (Locked)'); // 409 Conflict
          }
          targetLockToken = targetLock.token;

          // Start Heartbeat
          heartbeatInterval = setInterval(async () => {
              try {
                  if (lockLost) return;
                  if (restoreLockToken) await redisLockService.extend(restoreLockKey, restoreLockToken, LOCK_TTL);
                  if (targetLockToken) await redisLockService.extend(targetLockKey, targetLockToken, LOCK_TTL);
              } catch (e) {
                  console.error('[RESTORE] Heartbeat failed (Lock potentially lost):', e);
                  lockLost = true;
                  // We cannot throw here as it's async callback. 
                  // The main loop checks `lockLost`.
              }
          }, HEARTBEAT_INTERVAL); 

          // 1. Validation
          const backup = await this.prisma.tenantBackup.findUnique({
              where: { id: backupId }
          });
          
          if (!backup) throw new Error('Backup not found');
          if (backup.status !== BackupStatus.READY) throw new Error(`Backup status is ${backup.status}, cannot restore`);
          
          // Phase 1.5: Check Restore Status
          if (backup.restore_status === RestoreStatus.COMPLETED) {
              throw new Error('Backup already successfully restored');
          }
          
          // 1.3 Target tenant must be empty (ALL TABLES)
          // Exception: If we are RESUMING (IN_PROGRESS or FAILED), we expect some tables to have data.
          // We only check for empty tenant if starting FRESH (NONE).
          const isResuming = backup.restore_status === RestoreStatus.IN_PROGRESS || backup.restore_status === RestoreStatus.FAILED;
          
          // Hardening 1: Early Target Binding
          // We ensure restored_to_tenant_id is set BEFORE any processing.
          if (!isResuming) {
              await this.prisma.tenantBackup.update({
                  where: { id: backupId },
                  data: {
                      restore_status: RestoreStatus.IN_PROGRESS,
                      restored_to_tenant_id: newTenantId,
                      progress_table: null
                  }
              });
          } else {
              // Safety Check for Resume
              if (!backup.restored_to_tenant_id) {
                  // This is a corrupted state (IN_PROGRESS but no target).
                  // We must fail it.
                  await this.prisma.tenantBackup.update({
                      where: { id: backupId },
                      data: { restore_status: RestoreStatus.FAILED }
                  });
                  throw new Error('CRITICAL: Resume attempted but restored_to_tenant_id is missing. Backup state corrupted.');
              }
              
              // Ensure we are resuming to the SAME target
              if (backup.restored_to_tenant_id !== newTenantId) {
                   throw new Error(`Resume target mismatch. Original: ${backup.restored_to_tenant_id}, New: ${newTenantId}`);
              }
          }

          if (!isResuming) {
              for (const modelName of TENANT_MODELS) {
                  // @ts-ignore
                  const model = this.prisma[modelName];
                  if (!model) continue;
                  
                  let whereClause: any = { tenant_id: newTenantId };
                  // Handle special cases where field name is different
                  if (modelName === 'DocumentActivity') {
                      whereClause = { actor_tenant_id: newTenantId };
                  }

                  const count = await model.count({ where: whereClause });
                  if (count > 0) {
                      throw new Error(`Target tenant is not empty (${modelName} found)`);
                  }
              }
              
              // We already updated status to IN_PROGRESS above.
          }

          // 2. Prepare restore
          const filePath = backup.file_path;
          
          // Phase 1.6: Strict Integrity Verification
          // We must read the COMPRESSED file stream to calculate checksum.
          // The LocalDiskStorage calculates hash on the COMPRESSED stream.
          console.log('[RESTORE] Verifying backup integrity...');
          
          // Step A: Recalculate SHA256 (Using compressed stream)
          // Wait, LocalDiskStorage.read() returns a stream of the file content.
          // The file IS compressed on disk.
          // So verificationStream will be compressed data.
          // This matches BackupService logic which hashed the output of gzip.
          
          const verificationStream = this.storage.read(filePath);
          const hash = crypto.createHash('sha256');
          
          await new Promise<void>((resolve, reject) => {
              verificationStream.on('data', (chunk) => hash.update(chunk));
              verificationStream.on('end', () => resolve());
              verificationStream.on('error', (err) => reject(err));
          });
          
          const calculatedChecksum = hash.digest('hex');
          
          if (calculatedChecksum !== backup.checksum_sha256) {
             // Log Integrity Failure
             auditLogService.logEvent({
                 event_type: 'TENANT_BACKUP_INTEGRITY_FAILED',
                 severity: 'CRITICAL',
                 entity_type: 'TENANT_BACKUP',
                 entity_id: backupId,
                 tenant_id: newTenantId,
                 metadata: { reason: 'SHA256 mismatch' }
             });
             // Mark as failed
             await this.prisma.tenantBackup.update({
                 where: { id: backupId },
                 data: { restore_status: RestoreStatus.FAILED }
             });
             throw new Error('Backup integrity check failed: SHA256 mismatch');
          }
          
          // Step B: Verify Signature
          const secret = process.env.BACKUP_SIGNING_SECRET;
          if (!secret) throw new Error('BACKUP_SIGNING_SECRET missing during restore verification');
          
          if (!backup.file_signature) {
              auditLogService.logEvent({
                 event_type: 'TENANT_BACKUP_INTEGRITY_FAILED',
                 severity: 'CRITICAL',
                 entity_type: 'TENANT_BACKUP',
                 entity_id: backupId,
                 tenant_id: newTenantId,
                 metadata: { reason: 'Missing Signature' }
              });
              await this.prisma.tenantBackup.update({
                 where: { id: backupId },
                 data: { restore_status: RestoreStatus.FAILED }
              });
              throw new Error('Backup signature missing. Cannot restore unsigned backup in strict mode.');
          }
          
          const expectedSignature = crypto
              .createHmac('sha256', secret)
              .update(backup.checksum_sha256)
              .digest('hex');
              
          if (expectedSignature !== backup.file_signature) {
              auditLogService.logEvent({
                 event_type: 'TENANT_BACKUP_INTEGRITY_FAILED',
                 severity: 'CRITICAL',
                 entity_type: 'TENANT_BACKUP',
                 entity_id: backupId,
                 tenant_id: newTenantId,
                 metadata: { reason: 'Signature Mismatch' }
              });
              await this.prisma.tenantBackup.update({
                 where: { id: backupId },
                 data: { restore_status: RestoreStatus.FAILED }
              });
              throw new Error('Backup signature invalid: HMAC mismatch');
          }
          
          console.log('[RESTORE] Integrity check passed.');

          // 3. Parse and Restore
          const restoreFileStream = this.storage.read(filePath);
          const gunzip = zlib.createGunzip();
          const parser = restoreFileStream.pipe(gunzip).pipe(new Parser({ streamValues: false }));
          const iterator = parser[Symbol.asyncIterator]();
          
          let processingTables = false;
          let processingMeta = false;
          let currentTableName = '';
          let oldTenantId = backup.tenant_id;
          let tableRowCounts: Record<string, number> = {};
          
          // Resume Logic: Determine which tables to skip
          // If resuming, we skip all tables up to (and including) progress_table
          // Because progress_table means "Successfully Completed".
          let skipMode = isResuming && !!backup.progress_table;
          let lastCompletedTable = backup.progress_table;
          
          let result = await iterator.next();
          while (!result.done) {
              const token = result.value;
              
              if (!processingTables) {
                  // Scan for metadata
                  if (token.name === 'keyValue' && token.value === 'tables') {
                      processingTables = true;
                      processingMeta = false;
                      console.log('[RESTORE] Found tables section, starting restore...');
                  } else if (token.name === 'keyValue' && token.value === 'meta') {
                      processingMeta = true;
                  } else if (processingMeta) {
                      if (token.name === 'keyValue' && token.value === 'tenant_id') {
                          result = await iterator.next();
                          if (!result.done && result.value.name === 'stringValue') {
                              oldTenantId = result.value.value;
                              console.log(`[RESTORE] Found source tenant_id in metadata: ${oldTenantId}`);
                          }
                      } else if (token.name === 'keyValue' && token.value === 'table_row_counts') {
                          // Parse table_row_counts object
                          result = await iterator.next(); // startObject
                          if (!result.done && result.value.name === 'startObject') {
                              while (true) {
                                  result = await iterator.next();
                                  if (result.done) break;
                                  const t = result.value;
                                  if (t.name === 'endObject') break;
                                  if (t.name === 'keyValue') {
                                      const tName = t.value;
                                      result = await iterator.next();
                                      if (!result.done && (t.name === 'numberValue' || result.value.name === 'numberValue')) {
                                          tableRowCounts[tName] = Number(result.value.value);
                                      }
                                  }
                              }
                          }
                      }
                  }
                  
                  // Always advance
                  result = await iterator.next();
                  continue;
              }
              
              if (token.name === 'keyValue') {
                      currentTableName = token.value;
                      
                      // CRITICAL: Verify Lock before processing table
                      if (lockLost) {
                          throw new Error('Lock lost during restore (Heartbeat failed). Aborting.');
                      }
                      
                      const isLockValid = await redisLockService.verify(restoreLockKey, restoreLockToken!) && 
                                          await redisLockService.verify(targetLockKey, targetLockToken!);
                                          
                      if (!isLockValid) {
                          lockLost = true;
                          throw new Error('Lock lost during restore (Verification failed). Aborting.');
                      }

                      // Resume Logic
                      if (skipMode) {
                      if (currentTableName === lastCompletedTable) {
                          // We found the last completed table.
                      }
                  }

                  // Expect startArray next
                  result = await iterator.next(); 
                  if (!result.done && result.value.name === 'startArray') {
                      
                      let shouldProcess = true;
                      
                      if (skipMode) {
                          console.log(`Skipping table ${currentTableName} (Already restored)`);
                          shouldProcess = false;
                      }

                      // WRAP EACH TABLE IN TRANSACTION
                      // We must await the entire table processing
                      if (shouldProcess) {
                          const totalRows = tableRowCounts[currentTableName] || 0;
                          await this.prisma.$transaction(async (tx) => {
                              await this.processTableRows(iterator, currentTableName, newTenantId, oldTenantId!, tx, false, backupId, totalRows);
                          }, { timeout: 600000 }); // 10 minutes timeout for heavy tables
                          
                          // Update progress AFTER successful transaction
                          await this.prisma.tenantBackup.update({
                              where: { id: backupId },
                              data: { progress_table: currentTableName }
                          });
                          
                          // MEMORY LOGGING & CRASH SIMULATION
                          const mem = process.memoryUsage();
                          console.log(`[RESTORE] Finished ${currentTableName}. Heap: ${Math.round(mem.heapUsed / 1024 / 1024)}MB`);
                          
                          if (process.env.CRASH_AFTER_TABLE === currentTableName) {
                              console.error(`[SIMULATION] Crashing after table ${currentTableName}...`);
                              throw new Error('SIMULATED CRASH');
                          }
                      } else {
                           // Consume tokens without inserting
                           // We still need to pass row counts for progress?
                           // No, if skipping, we don't publish progress.
                           await this.processTableRows(iterator, currentTableName, newTenantId, oldTenantId!, this.prisma, true, backupId, 0);
                      }
                      
                      // If we just finished skipping the lastCompletedTable, turn off skipMode
                      if (skipMode && currentTableName === lastCompletedTable) {
                          skipMode = false;
                          console.log(`Resume point reached. Next tables will be processed.`);
                      }

                      currentTableName = '';
                  }
                  // After processTableRows, we are past endArray.
                  // Next token should be keyValue or endObject.
                  result = await iterator.next();
                  continue;
              }
              
              if (token.name === 'endObject') {
                  // End of tables object
                  break;
              }
              
              result = await iterator.next();
          }

          // Update backup status
          await this.prisma.tenantBackup.update({
              where: { id: backupId },
              data: {
                  status: BackupStatus.RESTORED,
                  restore_status: RestoreStatus.COMPLETED,
                  restored_at: new Date(),
                  restored_to_tenant_id: newTenantId
              }
          });
          
          auditLogService.logEvent({
              event_type: 'TENANT_BACKUP_RESTORED',
              severity: 'WARNING',
              entity_type: 'TENANT_BACKUP',
              entity_id: backupId,
              tenant_id: newTenantId,
              metadata: { restored_from_backup: backupId }
          });
      } catch (e) {
          // Update status to FAILED
          // Only update if it's NOT a locking error (we don't want to mark failed if we just couldn't get lock)
          // But wait, if we got lock and then failed, we mark failed.
          // If we failed TO get lock, we threw error before validation.
          // Check if restoreLockToken was set (meaning we started).
          if (restoreLockToken) {
              await this.prisma.tenantBackup.update({
                  where: { id: backupId },
                  data: { restore_status: RestoreStatus.FAILED }
              });
          }
          throw e;
      } finally {
          // Clear Heartbeat
          if (heartbeatInterval) clearInterval(heartbeatInterval);
          
          // Release Locks Safely
          if (restoreLockToken) await redisLockService.release(restoreLockKey, restoreLockToken);
          if (targetLockToken) await redisLockService.release(targetLockKey, targetLockToken);
      }
  }

  private async processTableRows(
      iterator: AsyncIterator<any>,
      tableName: string,
      newTenantId: string,
      oldTenantId: string,
      tx: any,
      skip: boolean,
      backupId: string,
      totalRows: number
  ) {
      let buffer: any[] = [];
      let processed = 0;
      const BATCH_SIZE = 2000;
      let lastProgressUpdate = Date.now();
      const UPDATE_INTERVAL = 1000; // 1 second

      // Simple implementation of stream-json object iteration
      while (true) {
          const result = await iterator.next();
          if (result.done) break;

          const token = result.value;

          if (token.name === 'endObject' || token.name === 'endArray') break; // End of table array

          if (token.name === 'startObject') {
              // Read row object manually
              let row: any = {};
              while (true) {
                  const r = await iterator.next();
                  if (r.done) break;
                  
                  if (r.value.name === 'endObject') break;
                  
                  if (r.value.name === 'keyValue') {
                      const key = r.value.value;
                      const valRes = await iterator.next();
                      let val = valRes.value.value;
                      
                      // Value transformation (dates, etc)
                      if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(val)) {
                           val = new Date(val);
                      }
                      row[key] = val;
                  }
              }

              if (!skip) {
                  // Transform Tenant ID
                  if (row.tenant_id === oldTenantId) row.tenant_id = newTenantId;
                  if (tableName === 'DocumentActivity' && row.actor_tenant_id === oldTenantId) {
                      row.actor_tenant_id = newTenantId;
                  }
                  
                  buffer.push(row);

                  if (buffer.length >= BATCH_SIZE) {
                      // Batch Insert
                      // @ts-ignore
                      if (tx[tableName]) {
                        // @ts-ignore
                        await tx[tableName].createMany({ data: buffer });
                      }
                      
                      processed += buffer.length;
                      buffer = [];
                      
                      // Publish Progress (Rate Limited)
                      const now = Date.now();
                      if (now - lastProgressUpdate > UPDATE_INTERVAL) {
                          await this.publishProgress(backupId, tableName, processed, totalRows);
                          lastProgressUpdate = now;
                      }
                  }
              }
          }
      }

      // Flush remaining
      if (!skip && buffer.length > 0) {
          // @ts-ignore
          if (tx[tableName]) {
            // @ts-ignore
            await tx[tableName].createMany({ data: buffer });
          }
          processed += buffer.length;
          // Final Progress Update
          await this.publishProgress(backupId, tableName, processed, totalRows);
      }
  }
}
