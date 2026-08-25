// @ts-nocheck
import { appLogger } from '@/utils/app-logger';
import { getTenantTimezone } from '@/utils/timezone.utils';
import { prisma } from '../../../utils/prisma';

export class AnnouncementService {
    static async getAnnouncements(tenantId: string) {
        return await prisma.announcement.findMany({
            where: { tenantId, isActive: true },
            orderBy: { createdAt: 'desc' }
        });
    }

    static async createAnnouncement(tenantId: string, data: any) {
        return await prisma.announcement.create({
            data: {
                tenantId,
                title: data.title,
                content: data.content,
                isActive: true
            }
        });
    }

    static async deleteAnnouncement(id: string, tenantId?: string) {
        return await prisma.announcement.deleteMany({
            where: { id, ...(tenantId ? { tenantId } : {}) }
        });
    }
}
