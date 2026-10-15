// @ts-nocheck
import { prisma } from '../../../utils/prisma';
import { appLogger } from '../../../utils/app-logger';
import { ShuService } from '../shu/shu.service';

export class RatClosureService {
  /**
   * 1. Audit Kesiapan Penutupan Sidang RAT (Pre-Closure Validation)
   */
  static async checkClosureReadiness(meetingId: string, tenantId: string) {
    const meeting = await prisma.coopMeeting.findFirst({
      where: { id: meetingId, tenantId },
      include: {
        agendas: { orderBy: { order: 'asc' } },
        _count: {
          select: {
            attendances: true,
            resolutions: true,
            minutes: true,
            votingSessions: true,
          },
        },
      },
    });

    if (!meeting) {
      throw new Error('Data sidang RAT tidak ditemukan.');
    }

    // A. Audit Kuorum Kehadiran
    const totalActiveMembers = meeting.totalActiveMembers || 1;
    const attendanceCount = meeting._count.attendances;
    const quorumTarget = meeting.quorumTarget || Math.ceil(totalActiveMembers / 2);
    const quorumPercent = Math.min(100, Math.round((attendanceCount / totalActiveMembers) * 100));
    const isQuorumAchieved = attendanceCount >= quorumTarget;

    // B. Audit Rundown & Butir Acara
    const totalAgendas = meeting.agendas.length;
    const completedAgendas = meeting.agendas.filter(
      (a) => a.isCompleted || a.status === 'COMPLETED'
    );
    const incompleteAgendas = meeting.agendas
      .filter((a) => !a.isCompleted && a.status !== 'COMPLETED')
      .map((a) => ({
        id: a.id,
        order: a.order,
        title: a.title,
        status: a.status,
      }));
    const isAllAgendasCompleted = incompleteAgendas.length === 0;

    // C. Audit Notulensi & Ketetapan (TAP RAT)
    const resolutionsCount = meeting._count.resolutions;
    const minutesCount = meeting._count.minutes;
    const votingSessionsCount = meeting._count.votingSessions;

    // D. Audit Periode SHU Tahun Buku Terkait
    const shuPeriod = await prisma.shuPeriod.findFirst({
      where: { tenantId, year: meeting.fiscalYear },
      include: {
        _count: {
          select: { Allocations: true },
        },
      },
    });

    const shuStatus = shuPeriod ? {
      id: shuPeriod.id,
      year: shuPeriod.year,
      status: shuPeriod.status, // DRAFT | CALCULATED | APPROVED | DISTRIBUTED
      totalShu: Number(shuPeriod.totalShu),
      totalMembersAllocated: shuPeriod._count.Allocations,
      isDistributed: shuPeriod.status === 'DISTRIBUTED',
    } : null;

    // E. Analisis & Rekomendasi Kesiapan
    const warnings: string[] = [];
    if (!isQuorumAchieved) {
      warnings.push(`Kuorum kehadiran belum memenuhi target minimum (${attendanceCount}/${quorumTarget} anggota - ${quorumPercent}%).`);
    }
    if (!isAllAgendasCompleted) {
      warnings.push(`Terdapat ${incompleteAgendas.length} butir acara yang belum diselesaikan.`);
    }
    if (resolutionsCount === 0) {
      warnings.push('Belum ada Surat Ketetapan (TAP RAT) yang diterbitkan untuk mengesahkan putusan sidang.');
    }
    if (!shuStatus) {
      warnings.push(`Periode SHU untuk Tahun Buku ${meeting.fiscalYear} belum dibuat di sistem.`);
    } else if (shuStatus.status === 'DRAFT') {
      warnings.push(`Kalkulasi alokasi SHU Tahun Buku ${meeting.fiscalYear} masih berstatus DRAFT.`);
    }

    const isReadyToClose = isQuorumAchieved && isAllAgendasCompleted;

    return {
      meeting: {
        id: meeting.id,
        title: meeting.title,
        fiscalYear: meeting.fiscalYear,
        status: meeting.status,
        closedAt: meeting.closedAt,
        closedBy: meeting.closedBy,
        proceedingsDocNo: meeting.proceedingsDocNo,
        isShuDistributed: meeting.isShuDistributed,
      },
      audit: {
        quorum: {
          totalActiveMembers,
          attendanceCount,
          quorumTarget,
          quorumPercent,
          isQuorumAchieved,
        },
        agendas: {
          total: totalAgendas,
          completed: completedAgendas.length,
          incomplete: incompleteAgendas,
          isAllCompleted: isAllAgendasCompleted,
        },
        records: {
          minutesCount,
          resolutionsCount,
          votingSessionsCount,
        },
        shu: shuStatus,
      },
      evaluation: {
        isReadyToClose,
        warnings,
        canDistributeShu: Boolean(shuStatus && (shuStatus.status === 'CALCULATED' || shuStatus.status === 'APPROVED' || shuStatus.status === 'DISTRIBUTED')),
      },
    };
  }

  /**
   * 2. Penutupan Resmi Sidang RAT (Statutory Freeze / Ketuk Palu)
   */
  static async closeMeeting(
    meetingId: string,
    tenantId: string,
    payload: {
      closedBy: string;
      closingNotes?: string | null;
      proceedingsDocNo?: string | null;
    }
  ) {
    const meeting = await prisma.coopMeeting.findFirst({
      where: { id: meetingId, tenantId },
    });

    if (!meeting) {
      throw new Error('Data sidang RAT tidak ditemukan.');
    }

    if (meeting.status === 'CLOSED') {
      return {
        success: true,
        message: 'Sidang RAT telah berstatus DITUTUP (CLOSED) sebelumnya.',
        data: meeting,
      };
    }

    const docNo =
      payload.proceedingsDocNo?.trim() ||
      `BA-RAT/${meeting.fiscalYear}/${new Date().getFullYear()}/${meeting.id.slice(-4).toUpperCase()}`;

    const closedMeeting = await prisma.coopMeeting.update({
      where: { id: meetingId },
      data: {
        status: 'CLOSED',
        closedAt: new Date(),
        closedBy: payload.closedBy.trim(),
        closingNotes: payload.closingNotes?.trim() || null,
        proceedingsDocNo: docNo,
      },
    });

    // Catat log kepatuhan persidangan
    try {
      await prisma.coopAuditLog.create({
        data: {
          tenantId,
          eventType: 'COOP_RAT_MEETING_CLOSED',
          description: `Sidang RAT Tahun Buku ${meeting.fiscalYear} ditutup resmi oleh ${payload.closedBy} dengan No. BA: ${docNo}`,
          metadata: {
            meetingId,
            closedBy: payload.closedBy,
            proceedingsDocNo: docNo,
            closedAt: closedMeeting.closedAt,
          },
        },
      });
    } catch (auditErr) {
      appLogger.warn({ err: auditErr }, 'Gagal mencatat audit log penutupan sidang RAT');
    }

    return {
      success: true,
      message: 'Sidang RAT resmi ditutup. Status dan hasil persidangan telah dikunci secara statuter.',
      data: closedMeeting,
    };
  }

  /**
   * 3. Eksekusi Distribusi SHU Atomik Pasca-Penutupan Sidang
   */
  static async distributeMeetingShu(
    meetingId: string,
    tenantId: string,
    operatorId?: string | null
  ) {
    const meeting = await prisma.coopMeeting.findFirst({
      where: { id: meetingId, tenantId },
    });

    if (!meeting) {
      throw new Error('Data sidang RAT tidak ditemukan.');
    }

    // Cari periode SHU untuk tahun buku RAT
    const period = await prisma.shuPeriod.findFirst({
      where: { tenantId, year: meeting.fiscalYear },
    });

    if (!period) {
      throw new Error(`Periode SHU untuk Tahun Buku ${meeting.fiscalYear} belum dibuat di sistem.`);
    }

    // Jika sudah didistribusikan, kembalikan status idempotent
    if (period.status === 'DISTRIBUTED' || meeting.isShuDistributed) {
      return {
        success: true,
        alreadyDistributed: true,
        message: `SHU Tahun Buku ${period.year} sudah selesai didistribusikan sebelumnya.`,
        year: period.year,
        totalShu: Number(period.totalShu),
      };
    }

    // Jika masih CALCULATED, setujui secara statuter atas dasar Ketuk Palu RAT
    if (period.status === 'CALCULATED' || period.status === 'DRAFT') {
      await prisma.shuPeriod.update({
        where: { id: period.id },
        data: {
          status: 'APPROVED',
          approvedBy: meeting.closedBy || 'Presidium Sidang RAT',
          approvedAt: new Date(),
        },
      });
    }

    // Eksekusi distribusi melalui ShuService berstandar transaksional atomik
    const distributionResult = await ShuService.distributeShu(
      period.id,
      tenantId,
      `RAT-CLOSE-${meeting.id}`,
      operatorId
    );

    // Tandai sidang bahwa SHU telah didistribusikan
    await prisma.coopMeeting.update({
      where: { id: meetingId },
      data: {
        isShuDistributed: true,
        shuPeriodId: period.id,
      },
    });

    return {
      success: true,
      message: `Distribusi SHU Tahun Buku ${period.year} berhasil disalurkan ke ${distributionResult.distributed} anggota koperasi.`,
      distributedCount: distributionResult.distributed,
      totalMembers: distributionResult.totalMembers,
      year: period.year,
      totalShu: Number(period.totalShu),
    };
  }

  /**
   * 4. Kompilasi Berkas Dokumen Dinas Lengkap (Official RAT Dossier)
   */
  static async getOfficialDossierData(meetingId: string, tenantId: string) {
    const meeting = await prisma.coopMeeting.findFirst({
      where: { id: meetingId, tenantId },
      include: {
        agendas: { orderBy: { order: 'asc' } },
        resolutions: { orderBy: { approvedAt: 'asc' } },
        attendances: {
          include: {
            Member: {
              select: { id: true, memberNumber: true, name: true, phone: true },
            },
          },
          orderBy: { attendedAt: 'asc' },
        },
        votingSessions: {
          include: {
            options: { orderBy: { order: 'asc' } },
          },
          orderBy: { openedAt: 'asc' },
        },
        minutes: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!meeting) {
      throw new Error('Data sidang RAT tidak ditemukan.');
    }

    // Profil tenant/koperasi
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        name: true,
        address: true,
        phone: true,
        email: true,
        logo: true,
      },
    });

    // Data SHU tahun buku
    const shuPeriod = await prisma.shuPeriod.findFirst({
      where: { tenantId, year: meeting.fiscalYear },
      include: {
        _count: { select: { Allocations: true } },
      },
    });

    return {
      tenant,
      meeting: {
        id: meeting.id,
        title: meeting.title,
        meetingType: meeting.meetingType,
        fiscalYear: meeting.fiscalYear,
        date: meeting.date,
        startTime: meeting.startTime,
        endTime: meeting.endTime,
        location: meeting.location,
        status: meeting.status,
        closedAt: meeting.closedAt,
        closedBy: meeting.closedBy,
        proceedingsDocNo: meeting.proceedingsDocNo,
        closingNotes: meeting.closingNotes,
        isShuDistributed: meeting.isShuDistributed,
        totalActiveMembers: meeting.totalActiveMembers,
        quorumTarget: meeting.quorumTarget,
      },
      summary: {
        totalAttendance: meeting.attendances.length,
        totalAgendas: meeting.agendas.length,
        totalResolutions: meeting.resolutions.length,
        totalMinutes: meeting.minutes.length,
        totalVotingSessions: meeting.votingSessions.length,
        shuPeriod: shuPeriod ? {
          year: shuPeriod.year,
          totalShu: Number(shuPeriod.totalShu),
          status: shuPeriod.status,
          totalMembersAllocated: shuPeriod._count.Allocations,
        } : null,
      },
      agendas: meeting.agendas,
      resolutions: meeting.resolutions,
      votingSessions: meeting.votingSessions,
      minutes: meeting.minutes,
      attendances: meeting.attendances.slice(0, 500), // Batasi payload presensi agar efisien
    };
  }
}
