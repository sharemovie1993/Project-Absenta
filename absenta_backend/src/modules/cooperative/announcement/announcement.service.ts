// @ts-nocheck
import { prisma } from '../../../utils/prisma';

export class AnnouncementService {
    
    // Get all announcements
    static async getAnnouncements(tenantId: string) {
        return await prisma.announcement.findMany({
            where: { tenantId, isActive: true },
            orderBy: { createdAt: 'desc' }
        });
    }

    // Create announcement
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

    // Delete announcement
    static async deleteAnnouncement(id: string) {
        return await prisma.announcement.delete({
            where: { id }
        });
    }
}



