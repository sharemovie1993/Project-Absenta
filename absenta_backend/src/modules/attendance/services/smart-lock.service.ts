import { appLogger } from '@/utils/app-logger';
import { prisma } from '@/utils/prisma';

export class SmartLockService {
    /**
     * Trigger smart lock based on attendance event
     */
    static async triggerLock(tenantId: string, deviceId: string, action: 'UNLOCK' | 'LOCK') {
        try {
            // In a real implementation, this would call an IoT Gateway API
            // For now, we log the event and simulate the trigger
            appLogger.info({ 
                tenant_id: tenantId, 
                device_id: deviceId, 
                action, 
                timestamp: new Date() 
            }, `[SMART_LOCK] Triggering ${action} for device ${deviceId}`);

            // Update lock status in DB if model exists
            // await prisma.smartLockDevice.update({ where: { id: deviceId }, data: { status: action === 'UNLOCK' ? 'OPEN' : 'CLOSED' } });

            return { success: true, deviceId, action };
        } catch (error) {
            appLogger.error({ error }, `[SMART_LOCK] Failed to trigger lock for ${deviceId}`);
            return { success: false, error };
        }
    }

    /**
     * Handle room unlock based on session start
     */
    static async handleSessionStart(tenantId: string, sessionId: string) {
        const session = await prisma.sesiAbsensi.findUnique({
            where: { id: sessionId },
            include: { Kelas: true }
        });

        if (session && session.Kelas) {
            // Find smart lock associated with the class/room
            // For now, we assume a naming convention or a metadata field
            const lockDeviceId = `LOCK-${session.Kelas.id}`;
            await this.triggerLock(tenantId, lockDeviceId, 'UNLOCK');
        }
    }
}
