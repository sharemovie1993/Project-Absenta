import { prisma } from '../../../utils/prisma';
import { randomUUID } from 'crypto';

export interface CreateMinuteDTO {
  agendaId?: string | null;
  authorId?: string | null;
  timeRecord?: string | null;
  speakerName?: string | null;
  speakerRole?: string | null;
  category?: 'OPENING' | 'DISCUSSION' | 'SUGGESTION' | 'OBJECTION' | 'CONCLUSION' | 'ANNOUNCEMENT';
  topic: string;
  content: string;
  actionItem?: string | null;
  isPublic?: boolean;
}

export interface UpdateMinuteDTO {
  agendaId?: string | null;
  timeRecord?: string | null;
  speakerName?: string | null;
  speakerRole?: string | null;
  category?: string;
  topic?: string;
  content?: string;
  actionItem?: string | null;
  isPublic?: boolean;
}

export class RatMinuteService {
  /**
   * Ambil daftar notulensi sidang (dapat difilter per-agenda)
   */
  static async getMeetingMinutes(meetingId: string, tenantId: string, agendaId?: string) {
    const meeting = await prisma.coopMeeting.findFirst({
      where: { id: meetingId, tenantId },
      select: { id: true }
    });

    if (!meeting) {
      throw new Error('Sidang RAT tidak ditemukan.');
    }

    let query = `
      SELECT m.*, a.title as "agendaTitle", a."order" as "agendaOrder"
      FROM "CoopMeetingMinute" m
      LEFT JOIN "CoopMeetingAgenda" a ON m."agendaId" = a.id
      WHERE m."meetingId" = $1
    `;
    const params: any[] = [meetingId];

    if (agendaId) {
      params.push(agendaId);
      query += ` AND m."agendaId" = $${params.length}`;
    }

    query += ` ORDER BY m."orderIndex" ASC, m."createdAt" ASC`;

    const rawMinutes: any = await prisma.$queryRawUnsafe(query, ...params);

    return (rawMinutes || []).map((row: any) => ({
      id: row.id,
      meetingId: row.meetingId,
      agendaId: row.agendaId,
      authorId: row.authorId,
      timeRecord: row.timeRecord,
      speakerName: row.speakerName,
      speakerRole: row.speakerRole,
      category: row.category,
      topic: row.topic,
      content: row.content,
      actionItem: row.actionItem,
      isPublic: row.isPublic,
      orderIndex: row.orderIndex,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      agenda: row.agendaTitle ? {
        id: row.agendaId,
        title: row.agendaTitle,
        order: row.agendaOrder,
      } : null,
    }));
  }

  /**
   * Tambah butir notulensi / dinamika sidang baru
   */
  static async createMeetingMinute(meetingId: string, tenantId: string, data: CreateMinuteDTO) {
    const meeting = await prisma.coopMeeting.findFirst({
      where: { id: meetingId, tenantId },
      select: { id: true }
    });

    if (!meeting) {
      throw new Error('Sidang RAT tidak ditemukan.');
    }

    if (!data.topic || !data.topic.trim()) {
      throw new Error('Topik bahasan notulensi wajib diisi.');
    }
    if (!data.content || !data.content.trim()) {
      throw new Error('Isi catatan dinamika sidang wajib diisi.');
    }

    const id = randomUUID();
    const countResult: any = await prisma.$queryRawUnsafe(
      `SELECT COUNT(*)::int as count FROM "CoopMeetingMinute" WHERE "meetingId" = $1`,
      meetingId
    );
    const orderIndex = (countResult[0]?.count || 0) + 1;

    const timeRecord = data.timeRecord || new Date().toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short'
    });

    await prisma.$executeRawUnsafe(
      `INSERT INTO "CoopMeetingMinute" (
        "id", "meetingId", "agendaId", "authorId", "timeRecord", "speakerName", "speakerRole",
        "category", "topic", "content", "actionItem", "isPublic", "orderIndex", "createdAt", "updatedAt"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW())`,
      id,
      meetingId,
      data.agendaId || null,
      data.authorId || null,
      timeRecord,
      data.speakerName || null,
      data.speakerRole || 'Anggota',
      data.category || 'DISCUSSION',
      data.topic.trim(),
      data.content.trim(),
      data.actionItem ? data.actionItem.trim() : null,
      data.isPublic !== undefined ? data.isPublic : true,
      orderIndex
    );

    return {
      id,
      meetingId,
      agendaId: data.agendaId || null,
      timeRecord,
      speakerName: data.speakerName || null,
      speakerRole: data.speakerRole || 'Anggota',
      category: data.category || 'DISCUSSION',
      topic: data.topic.trim(),
      content: data.content.trim(),
      actionItem: data.actionItem || null,
      isPublic: data.isPublic !== undefined ? data.isPublic : true,
      orderIndex,
      createdAt: new Date(),
    };
  }

  /**
   * Perbarui butir notulensi sidang
   */
  static async updateMeetingMinute(minuteId: string, tenantId: string, data: UpdateMinuteDTO) {
    const existing: any = await prisma.$queryRawUnsafe(
      `SELECT m.* FROM "CoopMeetingMinute" m
       INNER JOIN "CoopMeeting" cm ON m."meetingId" = cm.id
       WHERE m.id = $1 AND cm."tenantId" = $2`,
      minuteId,
      tenantId
    );

    if (!existing || existing.length === 0) {
      throw new Error('Notulensi sidang tidak ditemukan.');
    }

    const current = existing[0];
    const agendaId = data.agendaId !== undefined ? data.agendaId : current.agendaId;
    const timeRecord = data.timeRecord !== undefined ? data.timeRecord : current.timeRecord;
    const speakerName = data.speakerName !== undefined ? data.speakerName : current.speakerName;
    const speakerRole = data.speakerRole !== undefined ? data.speakerRole : current.speakerRole;
    const category = data.category !== undefined ? data.category : current.category;
    const topic = data.topic !== undefined ? data.topic.trim() : current.topic;
    const content = data.content !== undefined ? data.content.trim() : current.content;
    const actionItem = data.actionItem !== undefined ? (data.actionItem ? data.actionItem.trim() : null) : current.actionItem;
    const isPublic = data.isPublic !== undefined ? data.isPublic : current.isPublic;

    await prisma.$executeRawUnsafe(
      `UPDATE "CoopMeetingMinute"
       SET "agendaId" = $1, "timeRecord" = $2, "speakerName" = $3, "speakerRole" = $4,
           "category" = $5, "topic" = $6, "content" = $7, "actionItem" = $8, "isPublic" = $9, "updatedAt" = NOW()
       WHERE id = $10`,
      agendaId,
      timeRecord,
      speakerName,
      speakerRole,
      category,
      topic,
      content,
      actionItem,
      isPublic,
      minuteId
    );

    return {
      id: minuteId,
      meetingId: current.meetingId,
      agendaId,
      timeRecord,
      speakerName,
      speakerRole,
      category,
      topic,
      content,
      actionItem,
      isPublic,
      updatedAt: new Date(),
    };
  }

  /**
   * Hapus butir notulensi sidang
   */
  static async deleteMeetingMinute(minuteId: string, tenantId: string) {
    const existing: any = await prisma.$queryRawUnsafe(
      `SELECT m.id, m."meetingId" FROM "CoopMeetingMinute" m
       INNER JOIN "CoopMeeting" cm ON m."meetingId" = cm.id
       WHERE m.id = $1 AND cm."tenantId" = $2`,
      minuteId,
      tenantId
    );

    if (!existing || existing.length === 0) {
      throw new Error('Notulensi sidang tidak ditemukan.');
    }

    await prisma.$executeRawUnsafe(
      `DELETE FROM "CoopMeetingMinute" WHERE id = $1`,
      minuteId
    );

    return { success: true, id: minuteId };
  }

  /**
   * Agregasi Dokumen Berita Acara & Risalah Lengkap Sidang RAT
   */
  static async getProceedingsDocument(meetingId: string, tenantId: string) {
    const meeting = await prisma.coopMeeting.findFirst({
      where: { id: meetingId, tenantId },
      include: {
        agendas: { orderBy: { order: 'asc' } },
        resolutions: { orderBy: { approvedAt: 'asc' } },
        votingSessions: {
          include: {
            options: { orderBy: { order: 'asc' } }
          }
        },
        _count: {
          select: { attendances: true }
        }
      }
    });

    if (!meeting) {
      throw new Error('Sidang RAT tidak ditemukan.');
    }

    const minutes = await this.getMeetingMinutes(meetingId, tenantId);

    // Group minutes by agendaId
    const minutesByAgenda = (meeting.agendas || []).map((ag: any) => {
      const relatedMinutes = minutes.filter((m: any) => m.agendaId === ag.id);
      const relatedVoting = (meeting.votingSessions || []).find((v: any) => v.agendaId === ag.id || v.title.includes(ag.title));
      const relatedResolution = (meeting.resolutions || []).find((r: any) => r.title.includes(ag.title));

      return {
        agenda: {
          id: ag.id,
          order: ag.order,
          title: ag.title,
          presenter: ag.presenter,
          durationMin: ag.durationMin,
          status: ag.status,
          isCompleted: ag.isCompleted,
        },
        minutes: relatedMinutes,
        votingSession: relatedVoting || null,
        resolution: relatedResolution || null,
      };
    });

    // General minutes not tied to specific agenda
    const generalMinutes = minutes.filter((m: any) => !m.agendaId);

    return {
      meeting: {
        id: meeting.id,
        title: meeting.title,
        fiscalYear: meeting.fiscalYear,
        date: meeting.date,
        startTime: meeting.startTime,
        endTime: meeting.endTime,
        location: meeting.location,
        status: meeting.status,
        totalActiveMembers: meeting.totalActiveMembers,
        quorumTarget: meeting.quorumTarget,
        actualAttendance: meeting._count?.attendances || 0,
        isQuorumReached: (meeting._count?.attendances || 0) >= meeting.quorumTarget,
      },
      minutesByAgenda,
      generalMinutes,
      totalMinutesCount: minutes.length,
      totalResolutionsCount: (meeting.resolutions || []).length,
    };
  }
}
