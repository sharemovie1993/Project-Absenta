import { PrismaClient, RestoreStatus } from '@prisma/client';
import { RestoreService } from '../src/modules/backup/services/restore.service';

const prisma = new PrismaClient();

// Parse CLI args
const args = process.argv.slice(2);
const backupId = args[0];
const targetTenantId = args[1];

if (!backupId || !targetTenantId) {
    console.error('Usage: npx ts-node scripts/resume_restore.ts <backupId> <targetTenantId>');
    process.exit(1);
}

async function runResumeRestore() {
    console.log(`=== RESUME RESTORE CLI ===`);
    console.log(`Backup ID: ${backupId}`);
    console.log(`Target Tenant: ${targetTenantId}`);

    try {
        const backup = await prisma.tenantBackup.findUnique({
            where: { id: backupId }
        });

        if (!backup) {
            console.error('Error: Backup not found');
            process.exit(1);
        }

        console.log(`\n[STATUS CHECK]`);
        console.log(`Current Status: ${backup.restore_status}`);
        console.log(`Progress Table: ${backup.progress_table || 'None'}`);

        if (backup.restore_status === RestoreStatus.COMPLETED) {
            console.log('Restore is already COMPLETED. Nothing to resume.');
            process.exit(0);
        }

        if (backup.restore_status === RestoreStatus.NONE) {
            console.log('Restore has not started yet. Starting fresh...');
        } else {
            console.log('Resuming restore process...');
        }

        const restoreService = new RestoreService(prisma);
        
        const startTime = Date.now();
        await restoreService.restoreBackup(backupId, targetTenantId, 'cli-resume');
        const duration = (Date.now() - startTime) / 1000;

        console.log(`\n[SUCCESS] Restore completed successfully in ${duration.toFixed(2)}s`);
        process.exit(0);

    } catch (e: any) {
        console.error('\n[FAILED] Restore failed:', e.message);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

runResumeRestore();
