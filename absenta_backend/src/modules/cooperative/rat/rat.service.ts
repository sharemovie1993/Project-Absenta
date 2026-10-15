// @ts-nocheck
import { prisma } from '../../../utils/prisma';
import { appLogger } from '../../../utils/app-logger';
import crypto from 'crypto';

export class RatService {
  /**
   * Helper menghasilkan voterHash anonim berbasis HMAC-SHA256
   * Mencegah pelacakan suara anggota demi asas Langsung, Umum, Bebas, Rahasia (Luber)
   */
  private static generateVoterHash(tenantId: string, sessionId: string, memberId: string): string {
    const secret = process.env.JWT_SECRET || 'coop-rat-secret-salt-key';
    return crypto
      .createHmac('sha256', secret)
      .update(`${tenantId}:${sessionId}:${memberId}`)
      .digest('hex');
  }

  /**
   * Ambil daftar sidang RAT untuk tenant
   */
  static async getMeetings(tenantId: string) {
    const meetings = await prisma.coopMeeting.findMany({
      where: { tenantId },
      include: {
        agendas: { orderBy: { order: 'asc' } },
        _count: {
          select: {
            attendances: true,
            votingSessions: true,
            resolutions: true,
          },
        },
      },
      orderBy: { date: 'desc' },
    });

    return meetings.map((m) => {
      const actualAttendance = m._count?.attendances ?? 0;
      const isQuorumReached = m.quorumTarget > 0 ? actualAttendance >= m.quorumTarget : false;
      return {
        ...m,
        year: m.fiscalYear,
        meetingDate: m.date ? m.date.toISOString() : '',
        totalEligibleMembers: m.totalActiveMembers,
        actualAttendance,
        isQuorumReached,
      };
    });
  }

  /**
   * Ambil detail sidang RAT spesifik
   */
  static async getMeetingById(id: string, tenantId: string) {
    const meeting = await prisma.coopMeeting.findFirst({
      where: { id, tenantId },
      include: {
        agendas: { orderBy: { order: 'asc' } },
        attendances: {
          include: {
            Member: {
              select: {
                id: true,
                memberNo: true,
                type: true,
                status: true,
                User: { select: { full_name: true, email: true } },
                Siswa: { select: { nama_siswa: true, nisn: true } },
                Guru: { select: { nama_guru: true, nip: true } },
              },
            },
          },
          orderBy: { attendedAt: 'desc' },
        },
        votingSessions: {
          include: {
            options: { orderBy: { order: 'asc' } },
          },
          orderBy: { openedAt: 'asc' },
        },
        resolutions: { orderBy: { approvedAt: 'asc' } },
      },
    });

    if (!meeting) {
      throw new Error('Sidang RAT tidak ditemukan.');
    }

    // Hitung status kuorum terkini di backend
    const totalAttended = meeting.attendances.length;
    const isQuorumReached = meeting.quorumTarget > 0 ? totalAttended >= meeting.quorumTarget : false;
    const percentage = meeting.totalActiveMembers > 0
      ? Math.round((totalAttended / meeting.totalActiveMembers) * 100)
      : 0;
    const quorumPercentage = meeting.quorumTarget > 0
      ? Math.min(100, Math.round((totalAttended / meeting.quorumTarget) * 100))
      : 0;
    const remainingNeeded = Math.max(0, meeting.quorumTarget - totalAttended);

    // Format agendas dan resolutions agar konsisten dengan frontend
    const mappedAgendas = (meeting.agendas || []).map((ag: any) => ({
      ...ag,
      orderIndex: ag.order,
      durationMinutes: ag.durationMin,
      description: ag.presenter ? `Penyaji / Narasumber: ${ag.presenter}` : undefined,
      status: ag.status || (ag.isCompleted ? 'COMPLETED' : 'PENDING'),
    }));

    const mappedResolutions = (meeting.resolutions || []).map((res: any) => ({
      ...res,
      resolutionNo: res.number,
      subject: res.title,
      summary: res.content,
      status: 'PASSED' as const,
    }));

    const activeAgenda = mappedAgendas.find((ag: any) => ag.status === 'IN_PROGRESS') || null;
    const completedAgendasCount = mappedAgendas.filter((ag: any) => ag.status === 'COMPLETED').length;
    const totalAgendasCount = mappedAgendas.length;
    const agendaProgressPercentage = totalAgendasCount > 0
      ? Math.round((completedAgendasCount / totalAgendasCount) * 100)
      : 0;

    return {
      ...meeting,
      year: meeting.fiscalYear,
      meetingDate: meeting.date ? meeting.date.toISOString() : '',
      totalEligibleMembers: meeting.totalActiveMembers,
      actualAttendance: totalAttended,
      isQuorumReached,
      agendas: mappedAgendas,
      resolutions: mappedResolutions,
      quorumStats: {
        totalActiveMembers: meeting.totalActiveMembers,
        totalEligibleMembers: meeting.totalActiveMembers,
        quorumTarget: meeting.quorumTarget,
        totalAttended,
        actualAttendance: totalAttended,
        percentage,
        quorumPercentage,
        remainingNeeded,
        isQuorumReached,
        statusText: isQuorumReached ? 'MEMENUHI SYARAT' : 'BELUM KUORUM',
        statusHeadline: isQuorumReached ? 'Kuorum Sidang Sah Terpenuhi' : 'Menunggu Kuorum Kehadiran Peserta',
        activeAgenda,
        completedAgendasCount,
        totalAgendasCount,
        agendaProgressPercentage,
      },
    };
  }

  /**
   * Buat sesi sidang RAT baru (Ketua/Sekretaris)
   */
  static async createMeeting(tenantId: string, data: any, _operatorId?: string) {
    if (!data.title) throw new Error('Judul agenda sidang wajib diisi.');
    if (!data.date) throw new Error('Tanggal sidang wajib diisi.');

    // Hitung snapshot anggota aktif saat ini
    const totalActiveMembers = await prisma.member.count({
      where: { tenantId, status: 'ACTIVE' },
    });

    // Kuorum sah undang-undang: 50% + 1
    const quorumTarget = Math.floor(totalActiveMembers / 2) + 1;

    return prisma.coopMeeting.create({
      data: {
        tenantId,
        title: data.title,
        meetingType: data.meetingType || 'RAT',
        fiscalYear: Number(data.fiscalYear || new Date().getFullYear() - 1),
        date: new Date(data.date),
        startTime: data.startTime || '08:00',
        endTime: data.endTime || null,
        location: data.location || 'Aula Sekolah & Daring Web Absenta',
        description: data.description || null,
        totalActiveMembers,
        quorumTarget,
        status: 'DRAFT',
        lpjDocumentUrl: data.lpjDocumentUrl || null,
        auditDocumentUrl: data.auditDocumentUrl || null,
        agendas: data.agendas && Array.isArray(data.agendas) ? {
          create: data.agendas.map((ag: any, idx: number) => ({
            order: ag.order || idx + 1,
            title: ag.title,
            presenter: ag.presenter || null,
            durationMin: Number(ag.durationMin || 30),
          })),
        } : undefined,
      },
      include: {
        agendas: true,
      },
    });
  }

  /**
   * Perbarui status sidang RAT
   */
  static async updateMeetingStatus(id: string, tenantId: string, status: string) {
    const validStatuses = [
      'DRAFT',
      'SCHEDULED',
      'REGISTRATION_OPEN',
      'QUORUM_REACHED',
      'IN_SESSION',
      'ADJOURNED',
      'RATIFIED',
      'CLOSED',
    ];

    if (!validStatuses.includes(status)) {
      throw new Error(`Status ${status} tidak valid.`);
    }

    return prisma.coopMeeting.update({
      where: { id },
      data: { status: status as any },
    });
  }

  /**
   * Cari / Deteksi Anggota berdasarkan RFID atau No Anggota / NISN / NIP / Nama
   */
  static async resolveMember(tenantId: string, identifier: string) {
    if (!identifier) return null;
    const clean = identifier.trim();

    const memberSelect = {
      id: true,
      memberNo: true,
      type: true,
      status: true,
      User: { select: { full_name: true, email: true } },
      Siswa: { select: { nama_siswa: true, nis: true, nisn: true, no_rfid: true } },
      Guru: { select: { nama_guru: true, nip: true, no_rfid: true } },
    };

    // 1. Direct memberId
    let member = await prisma.member.findFirst({
      where: { id: clean, tenantId, status: 'ACTIVE' },
      select: memberSelect,
    });
    if (member) return member;

    // 2. By memberNo (e.g. ANG-001)
    member = await prisma.member.findFirst({
      where: { tenantId, memberNo: { equals: clean, mode: 'insensitive' }, status: 'ACTIVE' },
      select: memberSelect,
    });
    if (member) return member;

    // 3. By RFID on Siswa or Guru
    const studentByRfid = await prisma.siswa.findFirst({
      where: { tenant_id: tenantId, no_rfid: clean },
      select: { id: true },
    });
    if (studentByRfid) {
      member = await prisma.member.findFirst({
        where: { tenantId, siswaId: studentByRfid.id, status: 'ACTIVE' },
        select: memberSelect,
      });
      if (member) return member;
    }

    const teacherByRfid = await prisma.guru.findFirst({
      where: { tenant_id: tenantId, no_rfid: clean },
      select: { id: true },
    });
    if (teacherByRfid) {
      member = await prisma.member.findFirst({
        where: { tenantId, guruId: teacherByRfid.id, status: 'ACTIVE' },
        select: memberSelect,
      });
      if (member) return member;
    }

    // 4. By NIS / NISN or NIP or Name
    member = await prisma.member.findFirst({
      where: {
        tenantId,
        status: 'ACTIVE',
        OR: [
          { Siswa: { nis: clean } },
          { Siswa: { nisn: clean } },
          { Siswa: { nama_siswa: { contains: clean, mode: 'insensitive' } } },
          { Guru: { nip: clean } },
          { Guru: { nama_guru: { contains: clean, mode: 'insensitive' } } },
          { User: { full_name: { contains: clean, mode: 'insensitive' } } },
        ],
      },
      select: memberSelect,
    });

    return member;
  }

  /**
   * Cari daftar anggota aktif untuk kebutuhan presensi RAT manual / terminal
   */
  static async searchMembersForAttendance(meetingId: string, tenantId: string, query?: string) {
    const clean = query?.trim() || '';

    const memberSelect = {
      id: true,
      memberNo: true,
      type: true,
      status: true,
      User: { select: { full_name: true, email: true } },
      Siswa: { select: { nama_siswa: true, nis: true, nisn: true, no_rfid: true } },
      Guru: { select: { nama_guru: true, nip: true, no_rfid: true } },
    };

    const whereClause: any = {
      tenantId,
      status: 'ACTIVE',
    };

    if (clean) {
      whereClause.OR = [
        { memberNo: { contains: clean, mode: 'insensitive' } },
        { Siswa: { nama_siswa: { contains: clean, mode: 'insensitive' } } },
        { Siswa: { nis: { contains: clean } } },
        { Siswa: { nisn: { contains: clean } } },
        { Siswa: { no_rfid: { equals: clean } } },
        { Guru: { nama_guru: { contains: clean, mode: 'insensitive' } } },
        { Guru: { nip: { contains: clean } } },
        { Guru: { no_rfid: { equals: clean } } },
        { User: { full_name: { contains: clean, mode: 'insensitive' } } },
      ];
    }

    const members = await prisma.member.findMany({
      where: whereClause,
      select: memberSelect,
      take: 20,
      orderBy: { memberNo: 'asc' },
    });

    const attendances = await prisma.coopMeetingAttendance.findMany({
      where: {
        meetingId,
        memberId: { in: members.map((m) => m.id) },
      },
      select: {
        memberId: true,
        attendedAt: true,
        method: true,
      },
    });

    const attendedMap = new Map(attendances.map((a) => [a.memberId, a]));

    const memberResults = members.map((m) => ({
      ...m,
      isMember: true,
      displayName: m.Siswa?.nama_siswa || m.Guru?.nama_guru || m.User?.full_name || 'Anggota Koperasi',
      identityCode: m.Siswa?.nis ? `NIS: ${m.Siswa.nis}` : m.Guru?.nip ? `NIP: ${m.Guru.nip}` : m.User?.email || '-',
      isAttended: attendedMap.has(m.id),
      attendanceDetail: attendedMap.get(m.id) || null,
    }));

    // Cek juga direktori sekolah jika pencarian nama belum terdaftar sebagai anggota koperasi
    if (clean.length >= 2 && memberResults.length < 15) {
      const nonMemberStudents = await prisma.siswa.findMany({
        where: {
          tenant_id: tenantId,
          Member: null,
          OR: [
            { nama_siswa: { contains: clean, mode: 'insensitive' } },
            { nis: { contains: clean } },
            { nisn: { contains: clean } },
          ],
        },
        select: {
          id: true,
          nama_siswa: true,
          nis: true,
          nisn: true,
        },
        take: 5,
      });

      const nonMemberTeachers = await prisma.guru.findMany({
        where: {
          tenant_id: tenantId,
          Member: null,
          OR: [
            { nama_guru: { contains: clean, mode: 'insensitive' } },
            { nip: { contains: clean } },
          ],
        },
        select: {
          id: true,
          nama_guru: true,
          nip: true,
        },
        take: 5,
      });

      const nonMembers = [
        ...nonMemberStudents.map((s) => ({
          id: `non-member-${s.id}`,
          memberNo: '-',
          type: 'STUDENT',
          status: 'NON_MEMBER',
          displayName: s.nama_siswa,
          identityCode: `NIS: ${s.nis || '-'}${s.nisn ? ` / NISN: ${s.nisn}` : ''}`,
          isMember: false,
          isAttended: false,
          attendanceDetail: null,
        })),
        ...nonMemberTeachers.map((g) => ({
          id: `non-member-${g.id}`,
          memberNo: '-',
          type: 'TEACHER',
          status: 'NON_MEMBER',
          displayName: g.nama_guru,
          identityCode: `NIP: ${g.nip || '-'}`,
          isMember: false,
          isAttended: false,
          attendanceDetail: null,
        })),
      ];

      return [...memberResults, ...nonMembers];
    }

    return memberResults;
  }

  /**
   * Catat presensi kehadiran peserta RAT
   */
  static async recordAttendance(
    meetingId: string,
    tenantId: string,
    memberId: string,
    method: string = 'ONLINE_SELF',
    verifiedBy?: string
  ) {
    const meeting = await prisma.coopMeeting.findFirst({
      where: { id: meetingId, tenantId },
    });

    if (!meeting) throw new Error('Sidang RAT tidak ditemukan.');

    const allowedStatuses = ['SCHEDULED', 'REGISTRATION_OPEN', 'QUORUM_REACHED', 'IN_SESSION'];
    if (!allowedStatuses.includes(meeting.status)) {
      throw new Error(`Presensi tidak dapat dilakukan karena sidang berstatus ${meeting.status}.`);
    }

    const memberSelect = {
      id: true,
      memberNo: true,
      type: true,
      status: true,
      User: { select: { full_name: true, email: true } },
      Siswa: { select: { nama_siswa: true, nis: true, nisn: true } },
      Guru: { select: { nama_guru: true, nip: true } },
    };

    // Cek apakah anggota aktif
    const member = await prisma.member.findFirst({
      where: { id: memberId, tenantId, status: 'ACTIVE' },
      select: memberSelect,
    });

    if (!member) throw new Error('Anggota tidak terdaftar atau non-aktif.');

    // Cek apakah sudah pernah presensi
    const existing = await prisma.coopMeetingAttendance.findUnique({
      where: {
        meetingId_memberId: {
          meetingId,
          memberId,
        },
      },
      include: {
        Member: { select: memberSelect },
      },
    });

    if (existing) {
      return {
        success: true,
        alreadyAttended: true,
        attendance: existing,
        member,
        message: 'Kehadiran telah tercatat sebelumnya.',
      };
    }

    const attendance = await prisma.coopMeetingAttendance.create({
      data: {
        meetingId,
        memberId,
        method: (method as any) || 'ONLINE_SELF',
        verifiedBy: verifiedBy || null,
      },
      include: {
        Member: { select: memberSelect },
      },
    });

    // Hitung total kehadiran baru dan update status kuorum jika tercapai
    const currentAttendanceCount = await prisma.coopMeetingAttendance.count({
      where: { meetingId },
    });

    let newStatus = meeting.status;
    if (
      currentAttendanceCount >= meeting.quorumTarget &&
      (meeting.status === 'REGISTRATION_OPEN' || meeting.status === 'SCHEDULED')
    ) {
      newStatus = 'QUORUM_REACHED';
      await prisma.coopMeeting.update({
        where: { id: meetingId },
        data: { status: 'QUORUM_REACHED' },
      });
      appLogger.info({
        event: 'RAT_QUORUM_ATTAINED',
        meetingId,
        tenantId,
        currentAttendanceCount,
        quorumTarget: meeting.quorumTarget,
        timestamp: new Date().toISOString(),
      });
    }

    appLogger.info({
      event: 'RAT_ATTENDANCE_VERIFIED',
      meetingId,
      tenantId,
      memberId,
      method,
      totalAttended: currentAttendanceCount,
      timestamp: new Date().toISOString(),
    });

    return {
      success: true,
      alreadyAttended: false,
      attendance,
      member,
      totalAttended: currentAttendanceCount,
      quorumTarget: meeting.quorumTarget,
      isQuorumReached: currentAttendanceCount >= meeting.quorumTarget,
      meetingStatus: newStatus,
    };
  }

  /**
   * Buka sesi e-Voting baru untuk butir agenda tertentu
   */
  static async createVotingSession(meetingId: string, tenantId: string, data: any) {
    const meeting = await prisma.coopMeeting.findFirst({
      where: { id: meetingId, tenantId },
    });

    if (!meeting) throw new Error('Sidang RAT tidak ditemukan.');
    if (!data.title) throw new Error('Judul pemungutan suara wajib diisi.');

    const options = data.options && Array.isArray(data.options) && data.options.length > 0
      ? data.options
      : ['SETUJU', 'MENOLAK', 'ABSTAIN'];

    return prisma.coopVotingSession.create({
      data: {
        meetingId,
        agendaId: data.agendaId || null,
        title: data.title,
        category: data.category || 'RESOLUTION',
        status: 'ACTIVE',
        openedAt: new Date(),
        options: {
          create: options.map((opt: any, idx: number) => ({
            label: typeof opt === 'string' ? opt : opt.label,
            description: typeof opt === 'object' ? opt.description : null,
            order: idx + 1,
            voteCount: 0,
          })),
        },
      },
      include: {
        options: { orderBy: { order: 'asc' } },
      },
    });
  }

  /**
   * Ubah status sesi e-Voting (ACTIVE, PAUSED, CLOSED)
   */
  static async updateVotingSessionStatus(sessionId: string, tenantId: string, status: string) {
    const session = await prisma.coopVotingSession.findFirst({
      where: { id: sessionId, Meeting: { tenantId } },
    });

    if (!session) throw new Error('Sesi pemungutan suara tidak ditemukan.');

    return prisma.coopVotingSession.update({
      where: { id: sessionId },
      data: {
        status: status as any,
        closedAt: status === 'CLOSED' ? new Date() : undefined,
      },
      include: {
        options: { orderBy: { order: 'asc' } },
      },
    });
  }

  /**
   * Kirim Surat Suara Rahasia (*Cast Vote*) - 1 Anggota 1 Suara
   */
  static async castVote(sessionId: string, tenantId: string, memberId: string, optionId: string) {
    const session = await prisma.coopVotingSession.findFirst({
      where: { id: sessionId, Meeting: { tenantId } },
      include: { Meeting: true },
    });

    if (!session) throw new Error('Sesi voting tidak ditemukan.');
    if (session.status !== 'ACTIVE') {
      throw new Error('Sesi pemungutan suara sedang ditutup atau belum dibuka.');
    }

    // Validasi presensi: Hanya anggota yang sudah presensi yang berhak memberikan suara
    const attendance = await prisma.coopMeetingAttendance.findUnique({
      where: {
        meetingId_memberId: {
          meetingId: session.meetingId,
          memberId,
        },
      },
    });

    if (!attendance) {
      throw new Error('Anda belum terdaftar hadir dalam sidang RAT ini.');
    }

    // Generate voter hash anonim
    const voterHash = this.generateVoterHash(tenantId, sessionId, memberId);

    // Cek apakah suara sudah pernah terkirim (Double-voting check)
    const existingBallot = await prisma.coopVotingBallot.findUnique({
      where: {
        sessionId_voterHash: {
          sessionId,
          voterHash,
        },
      },
    });

    if (existingBallot) {
      throw new Error('Hak suara Anda telah digunakan untuk sesi agenda ini.');
    }

    try {
      // Transaksi atomik: Simpan surat suara dan increment vote counter opsi terpilih
      const result = await prisma.$transaction(async (tx) => {
        const ballot = await tx.coopVotingBallot.create({
          data: {
            sessionId,
            voterHash,
            optionId,
          },
        });

        await tx.coopVotingOption.update({
          where: { id: optionId },
          data: { voteCount: { increment: 1 } },
        });

        return ballot;
      });

      appLogger.info({
        event: 'RAT_VOTE_CAST_SUCCESS',
        tenantId,
        sessionId,
        optionId,
        auditProof: result.id,
        timestamp: result.castAt,
      });

      return {
        success: true,
        message: 'Suara Anda berhasil tercatat secara sah dan rahasia.',
        auditProof: result.id,
        castAt: result.castAt,
      };
    } catch (err: any) {
      if (err?.code === 'P2002') {
        throw new Error('Hak suara Anda telah digunakan untuk sesi agenda ini.');
      }
      throw err;
    }
  }

  /**
   * Periksa apakah seorang anggota sudah memilih pada sesi ini
   */
  static async checkMemberVoted(sessionId: string, tenantId: string, memberId: string) {
    const voterHash = this.generateVoterHash(tenantId, sessionId, memberId);
    const ballot = await prisma.coopVotingBallot.findUnique({
      where: {
        sessionId_voterHash: {
          sessionId,
          voterHash,
        },
      },
    });

    return {
      hasVoted: !!ballot,
      votedAt: ballot?.castAt || null,
    };
  }

  /**
   * Rekapitulasi hasil pemungutan suara
   */
  static async getVotingResults(sessionId: string, tenantId: string) {
    const session = await prisma.coopVotingSession.findFirst({
      where: { id: sessionId, Meeting: { tenantId } },
      include: {
        options: { orderBy: { order: 'asc' } },
      },
    });

    if (!session) throw new Error('Sesi voting tidak ditemukan.');

    const totalVotes = session.options.reduce((sum, opt) => sum + opt.voteCount, 0);

    const formattedOptions = session.options.map((opt) => ({
      id: opt.id,
      label: opt.label,
      description: opt.description,
      voteCount: opt.voteCount,
      percentage: totalVotes > 0 ? Number(((opt.voteCount / totalVotes) * 100).toFixed(1)) : 0,
    }));

    return {
      sessionId: session.id,
      title: session.title,
      category: session.category,
      status: session.status,
      totalVotes,
      options: formattedOptions,
    };
  }

  /**
   * Simpan risalah putusan / ketetapan resmi RAT
   */
  static async createResolution(meetingId: string, tenantId: string, data: any) {
    const meeting = await prisma.coopMeeting.findFirst({
      where: { id: meetingId, tenantId },
    });

    if (!meeting) throw new Error('Sidang RAT tidak ditemukan.');
    const title = data.title || data.subject;
    const content = data.content || data.summary;
    if (!title) throw new Error('Judul/perihal ketetapan keputusan wajib diisi.');
    if (!content) throw new Error('Naskah/ringkasan isi ketetapan wajib diisi.');

    const count = await prisma.coopMeetingResolution.count({ where: { meetingId } });
    const number = data.number || data.resolutionNo || `TAP/RAT-${String(count + 1).padStart(2, '0')}/${meeting.fiscalYear}`;

    return prisma.coopMeetingResolution.create({
      data: {
        meetingId,
        number,
        title,
        content,
      },
    });
  }

  /**
   * Perbarui surat ketetapan putusan (Resolution)
   */
  static async updateResolution(meetingId: string, resolutionId: string, tenantId: string, data: any) {
    const meeting = await prisma.coopMeeting.findFirst({
      where: { id: meetingId, tenantId },
    });
    if (!meeting) throw new Error('Sidang RAT tidak ditemukan.');

    const res = await prisma.coopMeetingResolution.findFirst({
      where: { id: resolutionId, meetingId },
    });
    if (!res) throw new Error('Ketetapan keputusan tidak ditemukan.');

    return prisma.coopMeetingResolution.update({
      where: { id: resolutionId },
      data: {
        number: data.number || data.resolutionNo || res.number,
        title: data.title || data.subject || res.title,
        content: data.content || data.summary || res.content,
      },
    });
  }

  /**
   * Hapus surat ketetapan putusan
   */
  static async deleteResolution(meetingId: string, resolutionId: string, tenantId: string) {
    const meeting = await prisma.coopMeeting.findFirst({
      where: { id: meetingId, tenantId },
    });
    if (!meeting) throw new Error('Sidang RAT tidak ditemukan.');

    const res = await prisma.coopMeetingResolution.findFirst({
      where: { id: resolutionId, meetingId },
    });
    if (!res) throw new Error('Ketetapan keputusan tidak ditemukan.');

    return prisma.coopMeetingResolution.delete({
      where: { id: resolutionId },
    });
  }

  /**
   * Tambah butir acara sidang (Agenda)
   */
  static async addAgenda(meetingId: string, tenantId: string, data: any) {
    const meeting = await prisma.coopMeeting.findFirst({
      where: { id: meetingId, tenantId },
    });
    if (!meeting) throw new Error('Sidang RAT tidak ditemukan.');

    const count = await prisma.coopMeetingAgenda.count({ where: { meetingId } });
    const order = data.order ?? count + 1;

    return prisma.coopMeetingAgenda.create({
      data: {
        meetingId,
        order,
        title: data.title,
        presenter: data.presenter || null,
        durationMin: Number(data.durationMin || data.durationMinutes || 30),
        isCompleted: false,
        status: data.status || 'PENDING',
      },
    });
  }

  /**
   * Perbarui butir acara sidang
   */
  static async updateAgenda(meetingId: string, agendaId: string, tenantId: string, data: any) {
    const meeting = await prisma.coopMeeting.findFirst({
      where: { id: meetingId, tenantId },
    });
    if (!meeting) throw new Error('Sidang RAT tidak ditemukan.');

    const agenda = await prisma.coopMeetingAgenda.findFirst({
      where: { id: agendaId, meetingId },
    });
    if (!agenda) throw new Error('Butir acara agenda tidak ditemukan.');

    let isCompleted = agenda.isCompleted;
    let newStatus = (agenda as any).status || (agenda.isCompleted ? 'COMPLETED' : 'PENDING');

    if (data.status === 'IN_PROGRESS') {
      newStatus = 'IN_PROGRESS';
      isCompleted = false;

      // Alihkan butir agenda lain dalam sidang ini yang tadinya IN_PROGRESS kembali ke PENDING
      await prisma.coopMeetingAgenda.updateMany({
        where: {
          meetingId,
          id: { not: agendaId },
          status: 'IN_PROGRESS',
        },
        data: { status: 'PENDING' },
      });
    } else if (data.status === 'COMPLETED' || data.isCompleted === true) {
      newStatus = 'COMPLETED';
      isCompleted = true;
    } else if (data.status === 'PENDING' || data.isCompleted === false) {
      newStatus = 'PENDING';
      isCompleted = false;
    }

    return prisma.coopMeetingAgenda.update({
      where: { id: agendaId },
      data: {
        title: data.title !== undefined ? data.title : agenda.title,
        presenter: data.presenter !== undefined ? data.presenter : agenda.presenter,
        durationMin: data.durationMin !== undefined ? Number(data.durationMin) : (data.durationMinutes !== undefined ? Number(data.durationMinutes) : agenda.durationMin),
        order: data.order !== undefined ? Number(data.order) : agenda.order,
        isCompleted,
        status: newStatus,
      },
    });
  }

  /**
   * Hapus butir acara sidang
   */
  static async deleteAgenda(meetingId: string, agendaId: string, tenantId: string) {
    const meeting = await prisma.coopMeeting.findFirst({
      where: { id: meetingId, tenantId },
    });
    if (!meeting) throw new Error('Sidang RAT tidak ditemukan.');

    const agenda = await prisma.coopMeetingAgenda.findFirst({
      where: { id: agendaId, meetingId },
    });
    if (!agenda) throw new Error('Butir acara agenda tidak ditemukan.');

    return prisma.coopMeetingAgenda.delete({
      where: { id: agendaId },
    });
  }

  /**
   * Muat susunan butir acara standar RAT Koperasi (UU No. 25/1992 & Permenkop UKM)
   * Dilengkapi proteksi keamanan statuter dan idempotensi (zero duplication)
   */
  static async loadPresetAgendas(meetingId: string, tenantId: string, options?: { forceReset?: boolean }) {
    const meeting = await prisma.coopMeeting.findFirst({
      where: { id: meetingId, tenantId },
    });
    if (!meeting) throw new Error('Sidang RAT tidak ditemukan.');

    const standardPresets = [
      { order: 1, title: 'Registrasi, Verifikasi Kehadiran, & Pengesahan Kuorum Sidang', presenter: 'Panitia & Sekretaris', durationMin: 30 },
      { order: 2, title: 'Pembukaan Sidang Pleno & Pengesahan Tata Tertib RAT', presenter: 'Pimpinan Sidang Sementara', durationMin: 20 },
      { order: 3, title: 'Laporan Pertanggungjawaban (LPJ) Pengurus Tahun Buku Berjalan', presenter: 'Ketua & Pengurus Koperasi', durationMin: 45 },
      { order: 4, title: 'Laporan Hasil Pengawasan (LHP) Badan Pengawas Koperasi', presenter: 'Ketua Badan Pengawas', durationMin: 30 },
      { order: 5, title: 'Pandangan Umum, Tanya Jawab, & Tanggapan Anggota', presenter: 'Peserta Sidang Pleno', durationMin: 40 },
      { order: 6, title: 'Pengesahan LPJ Pengurus & Hasil Pengawasan Menjadi Ketetapan', presenter: 'Pimpinan Sidang Pleno', durationMin: 15 },
      { order: 7, title: 'Pembahasan & Pengesahan Rencana Kerja (RK) dan RAPBK', presenter: 'Pengurus Koperasi', durationMin: 35 },
      { order: 8, title: 'Pemilihan & Penetapan Pengurus/Pengawas (Bila Ada Formatur)', presenter: 'Tim Formatur / Presidium', durationMin: 30 },
      { order: 9, title: 'Pembacaan Surat Ketetapan Resmi (TAP RAT) & Penutupan Sidang', presenter: 'Sekretaris Sidang', durationMin: 15 },
    ];

    const existingAgendas = await prisma.coopMeetingAgenda.findMany({
      where: { meetingId },
      orderBy: { order: 'asc' },
    });

    // 1. STATUTORY SAFETY LOCK: Jangan pernah ubah susunan jika ada agenda yang sedang / sudah berjalan
    const hasActiveOrCompleted = existingAgendas.some(
      (a: any) => a.status === 'IN_PROGRESS' || a.status === 'COMPLETED' || a.isCompleted === true
    );
    if (hasActiveOrCompleted) {
      throw new Error(
        'Sidang memiliki tahapan agenda yang sedang berlangsung atau telah diselesaikan. Susunan acara terkunci demi kepastian hukum persidangan.'
      );
    }

    // 2. IDEMPOTENCY GUARD: Jika sudah ada dan tidak meminta forceReset
    if (existingAgendas.length > 0 && !options?.forceReset) {
      const existingTitles = new Set(existingAgendas.map((a: any) => a.title.trim().toLowerCase()));
      const isStandardFullyPresent = standardPresets.every((p) =>
        existingTitles.has(p.title.trim().toLowerCase())
      );

      // Jika 9 preset standar sudah terpasang lengkap, return existing secara idempotent tanpa menduplikasi
      if (isStandardFullyPresent && existingAgendas.length === standardPresets.length) {
        return existingAgendas;
      }

      // Jika ada duplikasi sebelumnya atau susunan custom, tolak dan minta opsi forceReset
      throw new Error(
        `Sidang ini sudah memiliki ${existingAgendas.length} butir acara. Gunakan konfirmasi reset untuk mengembalikan ke susunan 9 agenda standar resmi.`
      );
    }

    // 3. CLEAN RESET / SEED: Jika forceReset diminta atau belum ada agenda sama sekali
    if (existingAgendas.length > 0 && options?.forceReset) {
      await prisma.coopMeetingAgenda.deleteMany({
        where: { meetingId },
      });
    }

    await prisma.coopMeetingAgenda.createMany({
      data: standardPresets.map((p) => ({
        meetingId,
        order: p.order,
        title: p.title,
        presenter: p.presenter,
        durationMin: p.durationMin,
        isCompleted: false,
        status: 'PENDING',
      })),
    });

    return prisma.coopMeetingAgenda.findMany({
      where: { meetingId },
      orderBy: { order: 'asc' },
    });
  }

  /**
   * Perbarui naskah tata tertib / catatan khusus sidang RAT
   */
  static async updateMeetingRules(meetingId: string, tenantId: string, description: string) {
    const meeting = await prisma.coopMeeting.findFirst({
      where: { id: meetingId, tenantId },
    });
    if (!meeting) throw new Error('Sidang RAT tidak ditemukan.');

    return prisma.coopMeeting.update({
      where: { id: meetingId },
      data: { description },
    });
  }

  /**
   * Muat 5 Draf Surat Ketetapan Resmi (TAP RAT) Standar Statuter Perkoperasian (UU No. 25/1992)
   * Dilengkapi proteksi keamanan idempotensi (zero duplication) dan opsi forceReset
   */
  static async loadPresetResolutions(meetingId: string, tenantId: string, options?: { forceReset?: boolean }) {
    const meeting = await prisma.coopMeeting.findFirst({
      where: { id: meetingId, tenantId },
    });
    if (!meeting) throw new Error('Sidang RAT tidak ditemukan.');

    const year = meeting.fiscalYear || new Date().getFullYear();
    const nextYear = Number(year) + 1;

    const standardPresets = [
      {
        number: `TAP/RAT-01/${year}`,
        title: `Pengesahan Jadwal Acara dan Tata Tertib Sidang RAT Tahun Buku ${year}`,
        content: `MEMUTUSKAN:\nPERTAMA: Mengesahkan Jadwal Acara dan Peraturan Tata Tertib Sidang Rapat Anggota Tahunan (RAT) Tahun Buku ${year} sebagai pedoman persidangan yang sah dan mengikat.\nKEDUA: Seluruh peserta, peninjau, dan pimpinan sidang berkewajiban mentaati tata tertib ini demi kelancaran dan ketertiban musyawarah.\nKETIGA: Ketetapan ini berlaku sejak tanggal ditetapkan dalam Sidang Pleno RAT.`,
      },
      {
        number: `TAP/RAT-02/${year}`,
        title: `Pengesahan Laporan Pertanggungjawaban (LPJ) Pengurus Tahun Buku ${year}`,
        content: `MEMUTUSKAN:\nPERTAMA: Menerima dan mengesahkan secara paripurna Laporan Pertanggungjawaban (LPJ) Pengurus Koperasi Tahun Buku ${year} serta memberikan pelunasan dan pembebasan tanggung jawab sepenuhnya (acquit et decharge) kepada seluruh jajaran Pengurus.\nKEDUA: Memberikan apresiasi setinggi-tingginya atas dedikasi dan kinerja Pengurus dalam mengelola usaha koperasi.\nKETIGA: Ketetapan ini berlaku sejak tanggal ditetapkan dalam Sidang Pleno RAT.`,
      },
      {
        number: `TAP/RAT-03/${year}`,
        title: `Pengesahan Laporan Hasil Pengawasan (LHP) Pengawas Tahun Buku ${year}`,
        content: `MEMUTUSKAN:\nPERTAMA: Menerima dan menyetujui Laporan Hasil Pengawasan (LHP) Badan Pengawas Koperasi Tahun Buku ${year}.\nKEDUA: Menugaskan Pengurus dan Pengawas untuk menindaklanjuti rekomendasi serta catatan perbaikan dalam LHP demi peningkatan tata kelola koperasi yang sehat dan akuntabel.\nKETIGA: Ketetapan ini berlaku sejak tanggal ditetapkan dalam Sidang Pleno RAT.`,
      },
      {
        number: `TAP/RAT-04/${year}`,
        title: `Penetapan Pembagian dan Alokasi Sisa Hasil Usaha (SHU) Tahun Buku ${year}`,
        content: `MEMUTUSKAN:\nPERTAMA: Menetapkan pembagian dan alokasi Sisa Hasil Usaha (SHU) Tahun Buku ${year} sesuai porsi anggaran dasar (Dana Cadangan, Jasa Modal, Jasa Usaha/Anggota, Dana Pendidikan, dan Dana Pengurus/Karyawan).\nKEDUA: Memberikan mandat kepada Pengurus untuk mendistribusikan hak SHU kepada seluruh anggota secara transparan dan tertib administrasi.\nKETIGA: Ketetapan ini berlaku sejak tanggal ditetapkan dalam Sidang Pleno RAT.`,
      },
      {
        number: `TAP/RAT-05/${year}`,
        title: `Pengesahan Rencana Kerja (RK) dan RAPBK Tahun Anggaran ${nextYear}`,
        content: `MEMUTUSKAN:\nPERTAMA: Mengesahkan Rencana Kerja (RK) dan Rencana Anggaran Pendapatan dan Belanja Koperasi (RAPBK) Tahun Anggaran ${nextYear} sebagai arah operasional dan batas plafon belanja koperasi.\nKEDUA: Menugaskan Pengurus untuk merealisasikan rencana kerja dengan prinsip kehati-hatian, efisiensi, dan keadilan usaha bagi kemakmuran anggota.\nKETIGA: Ketetapan ini berlaku sejak tanggal ditetapkan dalam Sidang Pleno RAT.`,
      },
    ];

    const existingResolutions = await prisma.coopMeetingResolution.findMany({
      where: { meetingId },
      orderBy: { number: 'asc' },
    });

    // 1. IDEMPOTENCY GUARD: Jika sudah ada dan tidak meminta forceReset
    if (existingResolutions.length > 0 && !options?.forceReset) {
      const existingTitles = new Set(existingResolutions.map((r: any) => r.title.trim().toLowerCase()));
      const isStandardFullyPresent = standardPresets.every((p) =>
        existingTitles.has(p.title.trim().toLowerCase())
      );

      // Jika 5 preset standar sudah terpasang lengkap, kembalikan data existing tanpa duplikasi
      if (isStandardFullyPresent && existingResolutions.length === standardPresets.length) {
        return existingResolutions;
      }

      throw new Error(
        `Sidang ini sudah memiliki ${existingResolutions.length} surat ketetapan (TAP RAT). Gunakan konfirmasi reset untuk menimpa dengan 5 draf standar resmi.`
      );
    }

    // 2. CLEAN RESET / SEED
    if (existingResolutions.length > 0 && options?.forceReset) {
      await prisma.coopMeetingResolution.deleteMany({
        where: { meetingId },
      });
    }

    await prisma.coopMeetingResolution.createMany({
      data: standardPresets.map((p) => ({
        meetingId,
        number: p.number,
        title: p.title,
        content: p.content,
      })),
    });

    return prisma.coopMeetingResolution.findMany({
      where: { meetingId },
      orderBy: { number: 'asc' },
    });
  }

  /**
   * Otomasi Pembuatan Draf Surat Ketetapan (TAP RAT) dari Butir Acara Sidang yang Diselesaikan
   * Menginjeksi data musyawarah dan hasil e-Voting bila terdapat pemungutan suara resmi
   */
  static async generateResolutionFromAgenda(meetingId: string, agendaId: string, tenantId: string) {
    const meeting = await prisma.coopMeeting.findFirst({
      where: { id: meetingId, tenantId },
      include: {
        _count: {
          select: {
            attendances: true,
          },
        },
      },
    });
    if (!meeting) throw new Error('Sidang RAT tidak ditemukan.');

    const agenda = await prisma.coopMeetingAgenda.findFirst({
      where: { id: agendaId, meetingId },
    });
    if (!agenda) throw new Error('Butir acara agenda tidak ditemukan.');

    // 1. Cek apakah sudah pernah dibuatkan TAP RAT untuk agenda ini
    const existing = await prisma.coopMeetingResolution.findFirst({
      where: {
        meetingId,
        title: { contains: agenda.title },
      },
    });
    if (existing) {
      return existing; // Idempotent: return yang sudah ada
    }

    // 2. Cek apakah ada sesi e-Voting terkait agenda ini
    const votingSession = await prisma.coopVotingSession.findFirst({
      where: {
        meetingId,
        OR: [
          { agendaId },
          { title: { contains: agenda.title } },
        ],
      },
      include: {
        options: { orderBy: { order: 'asc' } },
      },
    });

    const year = meeting.fiscalYear || new Date().getFullYear();
    const count = await prisma.coopMeetingResolution.count({ where: { meetingId } });
    const tapNumber = `TAP/RAT-${String(count + 1).padStart(2, '0')}/${year}`;

    const actualAttendance = meeting._count?.attendances ?? 0;
    const totalMembers = meeting.totalActiveMembers || 1;
    const attendancePct = ((actualAttendance / totalMembers) * 100).toFixed(1);

    let votingText = 'Disetujui secara aklamasi/musyawarah mufakat oleh seluruh anggota peserta sidang yang hadir.';
    if (votingSession) {
      const totalVotes = votingSession.options.reduce((acc: number, curr: any) => acc + curr.voteCount, 0);
      const optionsBreakdown = votingSession.options
        .map((opt: any) => {
          const pct = totalVotes > 0 ? ((opt.voteCount / totalVotes) * 100).toFixed(1) : '0';
          return `   - ${opt.label}: ${opt.voteCount} suara (${pct}%)`;
        })
        .join('\n');

      votingText = `Disahkan melalui pemungutan suara digital (e-Voting) resmi "${votingSession.title}":\n` +
        `Total Suara Masuk: ${totalVotes} suara\n` +
        optionsBreakdown;
    }

    const meetingDate = meeting.date ? new Date(meeting.date).toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }) : 'Hari ini';

    const resolutionTitle = `Pengesahan Ketetapan Sidang Mengenai ${agenda.title}`;
    const resolutionContent = 
`SURAT KETETAPAN RAPAT ANGGOTA TAHUNAN (RAT)
Nomor: ${tapNumber}
Tentang: ${agenda.title.toUpperCase()}

DENGAN RAHMAT TUHAN YANG MAHA ESA
RAPAT ANGGOTA TAHUNAN KOPERASI TAHUN BUKU ${year}

MENIMBANG:
a. Bahwa Rapat Anggota Tahunan merupakan pemegang kekuasaan tertinggi dalam tata kehidupan perkoperasian sesuai Pasal 22 UU No. 25 Tahun 1992 tentang Perkoperasian.
b. Bahwa agenda "${agenda.title}" telah dipresentasikan, dibahas, dan dimusyawarahkan dalam Sidang Pleno RAT Tahun Buku ${year}.

MENGINGAT:
1. Undang-Undang Republik Indonesia Nomor 25 Tahun 1992 tentang Perkoperasian.
2. Peraturan Menteri Koperasi dan UKM Republik Indonesia.
3. Anggaran Dasar dan Anggaran Rumah Tangga (AD/ART) Koperasi.
4. Peraturan Tata Tertib Sidang Rapat Anggota Tahunan Tahun Buku ${year}.

MEMPERHATIKAN:
1. Kuorum kehadiran sah peserta rapat pleno sebanyak ${actualAttendance} anggota (${attendancePct}% dari total ${meeting.totalActiveMembers} anggota terdaftar).
2. ${votingText}

MEMUTUSKAN:
MENETAPKAN:
PERTAMA: Menerima, menyetujui, dan mengesahkan secara paripurna: "${agenda.title}".
KEDUA: Menginstruksikan kepada Pengurus dan Pengawas Koperasi untuk melaksanakan amanat ketetapan ini dengan itikad baik dan penuh tanggung jawab.
KETIGA: Ketetapan ini memiliki kekuatan hukum sah yang mengikat seluruh jajaran koperasi dan berlaku sejak tanggal ditetapkan.

Ditetapkan di: ${meeting.location || 'Ruang Sidang Pleno'}
Pada tanggal: ${meetingDate}

PIMPINAN / PRESIDIUM SIDANG RAT`;

    return prisma.coopMeetingResolution.create({
      data: {
        meetingId,
        number: tapNumber,
        title: resolutionTitle,
        content: resolutionContent,
      },
    });
  }
}
