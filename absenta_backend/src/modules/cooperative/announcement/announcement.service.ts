// @ts-nocheck
import { appLogger } from '@/utils/app-logger';
import { prisma } from '../../../utils/prisma';
import { activityLogService } from '../../activity/services/activity-log.service';

export class AnnouncementService {
    static async getAnnouncements(tenantId: string) {
        return await prisma.announcement.findMany({
            where: { tenantId, isActive: true },
            orderBy: { createdAt: 'desc' }
        });
    }

    static async getAnnouncementById(id: string, tenantId?: string) {
        const announcement = await prisma.announcement.findFirst({
            where: { id, ...(tenantId ? { tenantId } : {}), isActive: true }
        });
        if (!announcement) {
            throw new Error('Pengumuman tidak ditemukan');
        }
        return announcement;
    }

    static async createAnnouncement(tenantId: string, data: any, operatorId?: string | null) {
        if (!data?.title || !data.title.trim()) {
            throw new Error('Judul pengumuman wajib diisi.');
        }
        if (!data?.content || !data.content.trim()) {
            throw new Error('Konten pengumuman wajib diisi.');
        }

        const announcement = await prisma.announcement.create({
            data: {
                tenantId,
                title: data.title.trim(),
                content: data.content.trim(),
                isActive: true
            }
        });

        try {
            activityLogService.logEvent({
                event_type: 'COOP_ANNOUNCEMENT_CREATED',
                tenant_id: tenantId,
                user_id: operatorId || null,
                entity: 'Announcement',
                entity_id: announcement.id,
                metadata: {
                    title: announcement.title,
                    description: `Membuat pengumuman baru "${announcement.title}"`
                }
            });
        } catch (logErr) {
            appLogger.warn({ err: logErr }, 'Gagal mencatat log aktivitas pengumuman');
        }

        return announcement;
    }

    static async deleteAnnouncement(id: string, tenantId?: string, operatorId?: string | null) {
        const existing = await prisma.announcement.findFirst({
            where: { id, ...(tenantId ? { tenantId } : {}) }
        });

        if (!existing) {
            throw new Error('Pengumuman tidak ditemukan');
        }

        const result = await prisma.announcement.deleteMany({
            where: { id, ...(tenantId ? { tenantId } : {}) }
        });

        try {
            activityLogService.logEvent({
                event_type: 'COOP_ANNOUNCEMENT_DELETED',
                tenant_id: tenantId || existing.tenantId,
                user_id: operatorId || null,
                entity: 'Announcement',
                entity_id: id,
                metadata: {
                    title: existing.title,
                    description: `Menghapus pengumuman "${existing.title}"`
                }
            });
        } catch (logErr) {
            appLogger.warn({ err: logErr }, 'Gagal mencatat log aktivitas hapus pengumuman');
        }

        return result;
    }
}
