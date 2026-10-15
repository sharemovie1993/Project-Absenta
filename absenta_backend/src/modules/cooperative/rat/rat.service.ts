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

    // Hitung status kuorum terkini
    const totalAttended = meeting.attendances.length;
    const isQuorumReached = meeting.quorumTarget > 0 ? totalAttended >= meeting.quorumTarget : false;
    const percentage = meeting.totalActiveMembers > 0
      ? Number(((totalAttended / meeting.totalActiveMembers) * 100).toFixed(1))
      : 0;

    return {
      ...meeting,
      year: meeting.fiscalYear,
      meetingDate: meeting.date ? meeting.date.toISOString() : '',
      totalEligibleMembers: meeting.totalActiveMembers,
      actualAttendance: totalAttended,
      isQuorumReached,
      quorumStats: {
        totalActiveMembers: meeting.totalActiveMembers,
        totalEligibleMembers: meeting.totalActiveMembers,
        quorumTarget: meeting.quorumTarget,
        totalAttended,
        actualAttendance: totalAttended,
        percentage,
        isQuorumReached,
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
    if (!data.title) throw new Error('Judul ketetapan keputusan wajib diisi.');
    if (!data.content) throw new Error('Naskah isi ketetapan wajib diisi.');

    const count = await prisma.coopMeetingResolution.count({ where: { meetingId } });
    const number = data.number || `TAP/RAT-${String(count + 1).padStart(2, '0')}/${meeting.fiscalYear}`;

    return prisma.coopMeetingResolution.create({
      data: {
        meetingId,
        number,
        title: data.title,
        content: data.content,
      },
    });
  }
}
