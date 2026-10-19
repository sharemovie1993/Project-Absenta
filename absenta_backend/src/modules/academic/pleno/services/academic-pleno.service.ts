import { prisma } from '@/utils/prisma';
import { AcademicPlenoStatus, PlenoDecisionType, PlenoTriageZone } from '@prisma/client';
import {
  CreateSessionDTO,
  UpdateSessionDTO,
  TapAttendanceDTO,
  DecideStudentDTO,
  CreateMinuteDTO,
  StudentDossier360,
} from '../types/pleno.types';

export class AcademicPlenoService {
  /**
   * 1. List Sessions
   */
  async listSessions(tenant_id: string, query: {
    tahun_pelajaran_id?: string;
    semester_id?: string;
    status?: AcademicPlenoStatus;
  }) {
    const where: any = { tenant_id };
    if (query.tahun_pelajaran_id) where.tahun_pelajaran_id = query.tahun_pelajaran_id;
    if (query.semester_id) where.semester_id = query.semester_id;
    if (query.status) where.status = query.status;

    const sessions = await prisma.academicPlenoSession.findMany({
      where,
      include: {
        TahunPelajaran: { select: { id: true, tahun: true } },
        Semester: { select: { id: true, nama_semester: true } },
        _count: {
          select: {
            attendances: true,
            rombels: true,
            decisions: true,
            minutes: true,
          },
        },
      },
      orderBy: { date: 'desc' },
    });

    return sessions;
  }

  /**
   * 2. Create Session
   */
  async createSession(tenant_id: string, data: CreateSessionDTO) {
    // 1. Fetch only teachers and administrators (exclude regular students!)
    const teachers = await prisma.user.findMany({
      where: {
        tenant_id,
        status: 'ACTIVE',
        Role: { name: { in: ['GURU', 'ADMIN', 'SUPERADMIN'] } },
      },
      select: {
        id: true,
        full_name: true,
        Role: { select: { name: true } },
      },
    });

    const eligibleVoters = teachers.length > 0 ? teachers.length : 10;
    const quorumTarget = data.quorum_target && data.quorum_target > 0
      ? data.quorum_target
      : Math.ceil((eligibleVoters * 2) / 3);

    // 2. Create session
    const session = await prisma.academicPlenoSession.create({
      data: {
        tenant_id,
        tahun_pelajaran_id: data.tahun_pelajaran_id,
        semester_id: data.semester_id,
        title: data.title,
        date: new Date(data.date),
        start_time: data.start_time,
        end_time: data.end_time,
        location: data.location,
        description: data.description,
        total_eligible_voters: eligibleVoters,
        quorum_target: quorumTarget,
        leader_user_id: data.leader_user_id,
        secretary_user_id: data.secretary_user_id,
        status: AcademicPlenoStatus.DRAFT,
      },
    });

    // 3. Pre-fetch Wali Kelas mapping from OrganizationalAssignment
    const walikelasAssignments = await prisma.organizationalAssignment.findMany({
      where: {
        tenant_id,
        is_active: true,
        Position: { code: 'WALIKELAS' },
        kelas_id: { not: null },
      },
      select: {
        kelas_id: true,
        user_id: true,
      },
    });

    const walikelasMap = new Map<string, string>();
    for (const a of walikelasAssignments) {
      if (a.kelas_id) walikelasMap.set(a.kelas_id, a.user_id);
    }

    // 4. Auto-populate Rombels for active Kelas in tenant
    const activeClasses = await prisma.kelas.findMany({
      where: { tenant_id, is_active: true },
      orderBy: [{ tingkat: 'asc' }, { nama_kelas: 'asc' }],
    });

    for (const cls of activeClasses) {
      await prisma.academicPlenoRombel.create({
        data: {
          session_id: session.id,
          kelas_id: cls.id,
          wali_kelas_user_id: walikelasMap.get(cls.id) || undefined,
          status: 'PENDING',
        },
      });
    }

    // 5. Auto-populate attendance list exclusively with teachers and administrators
    for (const t of teachers) {
      let role = 'GURU_MAPEL';
      if (t.id === data.leader_user_id) role = 'PIMPINAN_SIDANG';
      else if (t.id === data.secretary_user_id) role = 'NOTULIS';
      else if (t.Role?.name === 'ADMIN') role = 'ADMIN_SEKOLAH';

      await prisma.academicPlenoAttendance.create({
        data: {
          session_id: session.id,
          user_id: t.id,
          role_in_meeting: role,
          is_present: false,
        },
      });
    }

    // 6. Automatically compute initial triage across all rombels!
    try {
      await this.calculateTriage(tenant_id, session.id);
    } catch (e: any) {
      console.warn('Auto-triage on session creation warning:', e.message);
    }

    return session;
  }

  /**
   * 3. Get Session Detail
   */
  async getSessionDetail(tenant_id: string, sessionId: string) {
    const session = await prisma.academicPlenoSession.findFirst({
      where: { id: sessionId, tenant_id },
      include: {
        TahunPelajaran: true,
        Semester: true,
        attendances: {
          include: {
            User: {
              select: {
                id: true,
                full_name: true,
                email: true,
                Role: { select: { name: true } },
                Guru: { select: { nip: true } },
              },
            },
          },
          orderBy: { role_in_meeting: 'asc' },
        },
        rombels: {
          include: {
            Kelas: true,
          },
          orderBy: { Kelas: { nama_kelas: 'asc' } },
        },
        _count: {
          select: {
            decisions: true,
            minutes: true,
          },
        },
      },
    });

    if (!session) {
      throw new Error('Sesi sidang pleno tidak ditemukan');
    }

    const presentCount = session.attendances.filter((a: any) => a.is_present).length;
    const isQuorumReached = presentCount >= session.quorum_target;

    // Leader & Secretary info
    let leader = null;
    let secretary = null;
    if (session.leader_user_id) {
      const u = await prisma.user.findUnique({
        where: { id: session.leader_user_id },
        select: { id: true, full_name: true, Guru: { select: { nip: true } } },
      });
      if (u) {
        leader = { id: u.id, nama_lengkap: u.full_name, nip: u.Guru?.nip };
      }
    }
    if (session.secretary_user_id) {
      const u = await prisma.user.findUnique({
        where: { id: session.secretary_user_id },
        select: { id: true, full_name: true, Guru: { select: { nip: true } } },
      });
      if (u) {
        secretary = { id: u.id, nama_lengkap: u.full_name, nip: u.Guru?.nip };
      }
    }

    // Overall summary of decisions
    const decisionsCount = await prisma.academicPlenoDecision.groupBy({
      by: ['keputusan_akhir'],
      where: { session_id: sessionId },
      _count: true,
    });

    const triageSummary = await prisma.academicPlenoDecision.groupBy({
      by: ['triage_zone'],
      where: { session_id: sessionId },
      _count: true,
    });

    return {
      ...session,
      leader,
      secretary,
      present_count: presentCount,
      is_quorum_reached: isQuorumReached,
      decisions_breakdown: decisionsCount,
      triage_breakdown: triageSummary,
    };
  }

  /**
   * 4. Update Session
   */
  async updateSession(tenant_id: string, sessionId: string, data: UpdateSessionDTO) {
    const session = await prisma.academicPlenoSession.findFirst({
      where: { id: sessionId, tenant_id },
    });

    if (!session) throw new Error('Sesi sidang pleno tidak ditemukan');
    if (session.status === AcademicPlenoStatus.FINALIZED) {
      throw new Error('Sesi sidang pleno yang sudah difinalisasi tidak dapat diubah.');
    }

    const updated = await prisma.academicPlenoSession.update({
      where: { id: sessionId },
      data: {
        title: data.title,
        date: data.date ? new Date(data.date) : undefined,
        start_time: data.start_time,
        end_time: data.end_time,
        location: data.location,
        description: data.description,
        quorum_target: data.quorum_target,
        leader_user_id: data.leader_user_id,
        secretary_user_id: data.secretary_user_id,
        closing_notes: data.closing_notes,
      },
    });

    return updated;
  }

  /**
   * 5. Start Session
   */
  async startSession(tenant_id: string, sessionId: string) {
    const session = await prisma.academicPlenoSession.findFirst({
      where: { id: sessionId, tenant_id },
      include: { attendances: true },
    });

    if (!session) throw new Error('Sesi sidang pleno tidak ditemukan');
    if (session.status === AcademicPlenoStatus.FINALIZED) {
      throw new Error('Sesi sudah selesai dan difinalisasi.');
    }

    return prisma.academicPlenoSession.update({
      where: { id: sessionId },
      data: {
        status: AcademicPlenoStatus.IN_PROGRESS,
      },
    });
  }

  /**
   * 6. Pause Session
   */
  async pauseSession(tenant_id: string, sessionId: string) {
    const session = await prisma.academicPlenoSession.findFirst({
      where: { id: sessionId, tenant_id },
    });

    if (!session) throw new Error('Sesi sidang pleno tidak ditemukan');
    if (session.status === AcademicPlenoStatus.FINALIZED) {
      throw new Error('Sesi sudah selesai dan difinalisasi.');
    }

    return prisma.academicPlenoSession.update({
      where: { id: sessionId },
      data: {
        status: AcademicPlenoStatus.PRE_TRIAGE,
      },
    });
  }

  /**
   * 7. Finalize Session (Generate BAP & Lock)
   */
  async finalizeSession(tenant_id: string, sessionId: string, userId: string, closingNotes?: string) {
    const session = await prisma.academicPlenoSession.findFirst({
      where: { id: sessionId, tenant_id },
      include: {
        TahunPelajaran: true,
        Semester: true,
        decisions: true,
      },
    });

    if (!session) throw new Error('Sesi sidang pleno tidak ditemukan');
    if (session.status === AcademicPlenoStatus.FINALIZED) {
      throw new Error('Sesi sidang pleno ini sudah difinalisasi sebelumnya.');
    }

    // Generate unique official BAP number
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const bapNumber = `BAP-PLENO/${year}/${month}/${randomSuffix}`;

    const finalized = await prisma.academicPlenoSession.update({
      where: { id: sessionId },
      data: {
        status: AcademicPlenoStatus.FINALIZED,
        nomor_bap: bapNumber,
        finalized_at: now,
        finalized_by: userId,
        closing_notes: closingNotes || session.closing_notes,
      },
    });

    return finalized;
  }

  /**
   * 8. Attendance Management
   */
  async listAttendance(tenant_id: string, sessionId: string) {
    const session = await prisma.academicPlenoSession.findFirst({
      where: { id: sessionId, tenant_id },
    });
    if (!session) throw new Error('Sesi sidang pleno tidak ditemukan');

    const attendances = await prisma.academicPlenoAttendance.findMany({
      where: { session_id: sessionId },
      include: {
        User: {
          select: {
            id: true,
            full_name: true,
            email: true,
            Role: { select: { name: true } },
            Guru: { select: { nip: true } },
          },
        },
      },
      orderBy: [
        { is_present: 'desc' },
        { User: { full_name: 'asc' } },
      ],
    });

    return attendances.map((a: any) => ({
      ...a,
      User: {
        id: a.User.id,
        nama_lengkap: a.User.full_name,
        email: a.User.email,
        nip: a.User.Guru?.nip || null,
        role: a.User.Role?.name || 'GURU',
      },
    }));
  }

  async tapAttendance(tenant_id: string, sessionId: string, data: TapAttendanceDTO, currentUserId: string) {
    const session = await prisma.academicPlenoSession.findFirst({
      where: { id: sessionId, tenant_id },
    });
    if (!session) throw new Error('Sesi sidang pleno tidak ditemukan');

    const targetUserId = data.user_id || currentUserId;
    const isPresent = data.is_present !== undefined ? data.is_present : true;

    const record = await prisma.academicPlenoAttendance.upsert({
      where: {
        session_id_user_id: {
          session_id: sessionId,
          user_id: targetUserId,
        },
      },
      update: {
        is_present: isPresent,
        attended_at: isPresent ? new Date() : null,
        role_in_meeting: data.role_in_meeting || undefined,
        signature_url: data.signature_url || undefined,
        notes: data.notes || undefined,
      },
      create: {
        session_id: sessionId,
        user_id: targetUserId,
        is_present: isPresent,
        attended_at: isPresent ? new Date() : null,
        role_in_meeting: data.role_in_meeting || 'GURU_MAPEL',
        signature_url: data.signature_url,
        notes: data.notes,
      },
    });

    return record;
  }

  async bulkInviteAttendance(tenant_id: string, sessionId: string) {
    const session = await prisma.academicPlenoSession.findFirst({
      where: { id: sessionId, tenant_id },
    });
    if (!session) throw new Error('Sesi sidang pleno tidak ditemukan');

    const teachers = await prisma.user.findMany({
      where: {
        tenant_id,
        status: 'ACTIVE',
        Role: { name: { in: ['GURU', 'ADMIN', 'SUPERADMIN'] } },
      },
      select: { id: true },
    });

    let added = 0;
    for (const u of teachers) {
      const exists = await prisma.academicPlenoAttendance.findUnique({
        where: {
          session_id_user_id: {
            session_id: sessionId,
            user_id: u.id,
          },
        },
      });

      if (!exists) {
        await prisma.academicPlenoAttendance.create({
          data: {
            session_id: sessionId,
            user_id: u.id,
            role_in_meeting: 'GURU_MAPEL',
            is_present: false,
          },
        });
        added++;
      }
    }

    return { total_teachers: teachers.length, added };
  }

  /**
   * 9. List Rombels
   */
  async listRombels(tenant_id: string, sessionId: string) {
    const session = await prisma.academicPlenoSession.findFirst({
      where: { id: sessionId, tenant_id },
    });
    if (!session) throw new Error('Sesi sidang pleno tidak ditemukan');

    const rombels = await prisma.academicPlenoRombel.findMany({
      where: { session_id: sessionId },
      include: {
        Kelas: {
          select: {
            id: true,
            nama_kelas: true,
            tingkat: true,
          },
        },
      },
      orderBy: [
        { Kelas: { tingkat: 'asc' } },
        { Kelas: { nama_kelas: 'asc' } },
      ],
    });

    // Populate wali kelas from OrganizationalAssignment
    const assignments = await prisma.organizationalAssignment.findMany({
      where: {
        tenant_id,
        is_active: true,
        Position: { code: 'WALIKELAS' },
        kelas_id: { not: null },
      },
      include: {
        User: {
          select: { id: true, full_name: true, Guru: { select: { nip: true } } },
        },
      },
    });

    const walikelasMap = new Map<string, { id: string; nama_lengkap: string; nip?: string | null }>();
    for (const a of assignments) {
      if (a.kelas_id && a.User) {
        walikelasMap.set(a.kelas_id, {
          id: a.User.id,
          nama_lengkap: a.User.full_name,
          nip: a.User.Guru?.nip || null,
        });
      }
    }

    const enrichedRombels = await Promise.all(
      rombels.map(async (r: any) => {
        let waliKelas = walikelasMap.get(r.kelas_id) || null;
        if (!waliKelas && r.wali_kelas_user_id) {
          const u = await prisma.user.findUnique({
            where: { id: r.wali_kelas_user_id },
            select: { id: true, full_name: true, Guru: { select: { nip: true } } },
          });
          if (u) {
            waliKelas = { id: u.id, nama_lengkap: u.full_name, nip: u.Guru?.nip };
          }
        }
        return {
          ...r,
          wali_kelas: waliKelas,
        };
      })
    );

    return enrichedRombels;
  }

  /**
   * 10. Smart Auto-Triage Engine
   */
  async calculateTriage(tenant_id: string, sessionId: string, rombelId?: string) {
    const session = await prisma.academicPlenoSession.findFirst({
      where: { id: sessionId, tenant_id },
    });
    if (!session) throw new Error('Sesi sidang pleno tidak ditemukan');

    const rombelFilter: any = { session_id: sessionId };
    if (rombelId) rombelFilter.id = rombelId;

    const rombels = await prisma.academicPlenoRombel.findMany({
      where: rombelFilter,
      include: { Kelas: true },
    });

    const triageResults: any[] = [];

    for (const r of rombels) {
      // Find students in this class
      const studentsInClass = await prisma.siswa.findMany({
        where: {
          tenant_id,
          kelas_id: r.kelas_id,
          status: 'AKTIF',
        },
        select: {
          id: true,
          nis: true,
          nama_siswa: true,
          jenis_kelamin: true,
        },
      });

      let greenCount = 0;
      let yellowCount = 0;
      let redCount = 0;

      for (const s of studentsInClass) {
        const reasons: string[] = [];
        let zone: PlenoTriageZone = PlenoTriageZone.GREEN;
        let recommendation: PlenoDecisionType = PlenoDecisionType.NAIK;

        // A. Cek Nilai Akademik
        const nilaiList = await prisma.nilaiSiswa.findMany({
          where: {
            tenant_id,
            siswa_id: s.id,
            tahun_pelajaran_id: session.tahun_pelajaran_id,
            semester_id: session.semester_id,
          },
        });

        const kktp = 75; // Default standar ketuntasan KKTP
        let belowKktpCount = 0;
        for (const n of nilaiList) {
          const finalScore = n.nilai_rapor_final ?? n.nilai_akhir_sumatif ?? n.nilai ?? 0;
          if (finalScore < kktp) {
            belowKktpCount++;
          }
        }

        if (belowKktpCount >= 3) {
          reasons.push(`${belowKktpCount} mata pelajaran di bawah KKTP (${kktp})`);
        } else if (belowKktpCount > 0) {
          reasons.push(`${belowKktpCount} mata pelajaran belum tuntas KKTP`);
        }

        // B. Cek Kehadiran (Absensi)
        const attendanceLogs = await prisma.absenSiswa.findMany({
          where: {
            tenant_id,
            siswa_id: s.id,
          },
          select: { status: true },
        });

        const totalDays = attendanceLogs.length;
        let hadir = 0;
        let alpa = 0;

        for (const a of attendanceLogs) {
          const st = (a.status || '').toUpperCase();
          if (st === 'HADIR') hadir++;
          else if (st === 'ALPA' || st === 'A') alpa++;
        }

        const alpaPercent = totalDays > 0 ? (alpa / totalDays) * 100 : 0;
        const presencePercent = totalDays > 0 ? (hadir / totalDays) * 100 : 100;

        if (alpaPercent > 15 || alpa >= 10) {
          reasons.push(`Alpa tinggi: ${alpa} hari (${alpaPercent.toFixed(1)}%)`);
        } else if (presencePercent < 80) {
          reasons.push(`Kehadiran di bawah 80% (${presencePercent.toFixed(1)}%)`);
        }

        // C. Cek Pelanggaran Kesiswaan
        const violations = await prisma.pelanggaranSiswa.findMany({
          where: {
            tenant_id,
            siswa_id: s.id,
          },
          select: { poin: true, jenis_pelanggaran: true },
        });

        const totalPoin = violations.reduce((acc: number, v: any) => acc + (v.poin || 0), 0);
        if (totalPoin >= 50) {
          reasons.push(`Akumulasi poin pelanggaran berat: ${totalPoin} poin`);
        } else if (totalPoin >= 20) {
          reasons.push(`Akumulasi poin pelanggaran sedang: ${totalPoin} poin`);
        }

        // D. Cek Kasus BK
        const bkCases = await prisma.konselingSiswa.count({
          where: {
            tenant_id,
            siswa_id: s.id,
            status: 'PROSES',
          },
        });
        if (bkCases > 0) {
          reasons.push(`${bkCases} kasus konseling BK masih aktif`);
        }

        // Evaluate Triage Zone & Recommendation
        if (alpaPercent > 15 || totalPoin >= 50 || belowKktpCount >= 3) {
          zone = PlenoTriageZone.RED;
          recommendation = PlenoDecisionType.TINGGAL_KELAS;
          redCount++;
        } else if (belowKktpCount > 0 || totalPoin >= 20 || presencePercent < 85 || bkCases > 0) {
          zone = PlenoTriageZone.YELLOW;
          recommendation = PlenoDecisionType.NAIK_BERSYARAT;
          yellowCount++;
        } else {
          zone = PlenoTriageZone.GREEN;
          recommendation = PlenoDecisionType.NAIK;
          greenCount++;
        }

        // Upsert decision record
        await prisma.academicPlenoDecision.upsert({
          where: {
            session_id_siswa_id: {
              session_id: sessionId,
              siswa_id: s.id,
            },
          },
          update: {
            rombel_id: r.id,
            triage_zone: zone,
            triage_reasons: reasons.join('; '),
            rekomendasi_awal: recommendation,
          },
          create: {
            session_id: sessionId,
            rombel_id: r.id,
            siswa_id: s.id,
            triage_zone: zone,
            triage_reasons: reasons.join('; '),
            rekomendasi_awal: recommendation,
            keputusan_akhir: recommendation,
            alasan_keputusan: reasons.length > 0 ? reasons.join('; ') : 'Memenuhi seluruh kriteria ketuntasan',
          },
        });
      }

      // Update Rombel stats
      const updatedRombel = await prisma.academicPlenoRombel.update({
        where: { id: r.id },
        data: {
          total_students: studentsInClass.length,
          green_count: greenCount,
          yellow_count: yellowCount,
          red_count: redCount,
          status: 'TRIAGED',
        },
      });

      triageResults.push(updatedRombel);
    }

    return triageResults;
  }

  /**
   * 11. Get Rombel Candidates
   */
  async getRombelCandidates(tenant_id: string, sessionId: string, rombelId: string) {
    const rombel = await prisma.academicPlenoRombel.findFirst({
      where: { id: rombelId, session_id: sessionId },
      include: {
        Kelas: true,
        Session: { select: { tenant_id: true } },
      },
    });
    if (!rombel) throw new Error('Rombel pleno tidak ditemukan');

    let decisions = await prisma.academicPlenoDecision.findMany({
      where: {
        session_id: sessionId,
        rombel_id: rombelId,
      },
      include: {
        Siswa: {
          select: {
            id: true,
            nis: true,
            nama_siswa: true,
            jenis_kelamin: true,
            foto: true,
          },
        },
      },
      orderBy: [
        { triage_zone: 'desc' }, // RED, YELLOW, GREEN
        { Siswa: { nama_siswa: 'asc' } },
      ],
    });

    // Auto-calculate on-the-fly if empty!
    if (decisions.length === 0) {
      const tid = rombel.Session?.tenant_id || tenant_id;
      await this.calculateTriage(tid, sessionId, rombelId);
      decisions = await prisma.academicPlenoDecision.findMany({
        where: {
          session_id: sessionId,
          rombel_id: rombelId,
        },
        include: {
          Siswa: {
            select: {
              id: true,
              nis: true,
              nama_siswa: true,
              jenis_kelamin: true,
              foto: true,
            },
          },
        },
        orderBy: [
          { triage_zone: 'desc' },
          { Siswa: { nama_siswa: 'asc' } },
        ],
      });
    }

    return {
      rombel,
      candidates: decisions.map((d: any) => ({
        ...d,
        Siswa: {
          ...d.Siswa,
          nama_lengkap: d.Siswa.nama_siswa,
        },
      })),
    };
  }

  /**
   * 12. Batch Approve Green (Aklamasi Zona Hijau)
   */
  async batchApproveGreen(_tenant_id: string, sessionId: string, rombelId: string, userId: string) {
    const rombel = await prisma.academicPlenoRombel.findFirst({
      where: { id: rombelId, session_id: sessionId },
    });
    if (!rombel) throw new Error('Rombel pleno tidak ditemukan');

    const result = await prisma.academicPlenoDecision.updateMany({
      where: {
        session_id: sessionId,
        rombel_id: rombelId,
        triage_zone: PlenoTriageZone.GREEN,
      },
      data: {
        keputusan_akhir: PlenoDecisionType.NAIK,
        alasan_keputusan: 'Aklamasi Sidang Pleno: Memenuhi kriteria ketuntasan KKTP dan kehadiran prima',
        decided_by_user_id: userId,
        decided_at: new Date(),
        voted_by_consensus: true,
      },
    });

    await prisma.academicPlenoRombel.update({
      where: { id: rombelId },
      data: {
        reviewed_at: new Date(),
        status: 'REVIEWED',
      },
    });

    return {
      success: true,
      approved_count: result.count,
    };
  }

  /**
   * 13. Student Dossier 360°
   */
  async getStudentDossier(tenant_id: string, sessionId: string, siswaId: string): Promise<StudentDossier360> {
    const session = await prisma.academicPlenoSession.findFirst({
      where: { id: sessionId, tenant_id },
    });
    if (!session) throw new Error('Sesi sidang pleno tidak ditemukan');

    const siswa = await prisma.siswa.findFirst({
      where: { id: siswaId, tenant_id },
      include: { Kelas: true },
    });
    if (!siswa) throw new Error('Data siswa tidak ditemukan');

    const decision = await prisma.academicPlenoDecision.findFirst({
      where: { session_id: sessionId, siswa_id: siswaId },
    });

    // 1. Akademik: Nilai Siswa
    const nilaiList = await prisma.nilaiSiswa.findMany({
      where: {
        tenant_id,
        siswa_id: siswaId,
        tahun_pelajaran_id: session.tahun_pelajaran_id,
        semester_id: session.semester_id,
      },
      include: { Mapel: true },
    });

    const kktp = 75;
    let totalScore = 0;
    let tuntas = 0;
    let belumTuntas = 0;

    const formattedMapel = nilaiList.map((n: any) => {
      const score = n.nilai_rapor_final ?? n.nilai_akhir_sumatif ?? n.nilai ?? 0;
      totalScore += score;
      const isPass = score >= kktp;
      if (isPass) tuntas++;
      else belumTuntas++;

      return {
        mapel_id: n.mapel_id,
        nama_mapel: n.Mapel?.nama_mapel || 'Mata Pelajaran',
        kkm: kktp,
        nilai_akhir: score,
        is_tuntas: isPass,
        deskripsi: n.capaian_kompetensi,
      };
    });

    const rataRata = nilaiList.length > 0 ? totalScore / nilaiList.length : 0;

    // Nilai Ekskul
    const ekskulList = await prisma.nilaiEskul.findMany({
      where: {
        tenant_id,
        siswa_id: siswaId,
        tahun_pelajaran_id: session.tahun_pelajaran_id,
        semester_id: session.semester_id,
      },
      include: { JenisKegiatanMaster: true },
    });

    const formattedEkskul = ekskulList.map((e: any) => ({
      nama_kegiatan: e.JenisKegiatanMaster?.nama_kegiatan || 'Ekstrakurikuler',
      predikat: e.predikat || 'B',
      keterangan: e.keterangan,
    }));

    // 2. Kehadiran
    const absensiLogs = await prisma.absenSiswa.findMany({
      where: { tenant_id, siswa_id: siswaId },
      select: { status: true, is_terlambat: true },
    });

    let hadir = 0;
    let sakit = 0;
    let izin = 0;
    let alpa = 0;
    let terlambat = 0;

    for (const a of absensiLogs) {
      const st = (a.status || '').toUpperCase();
      if (st === 'HADIR') hadir++;
      else if (st === 'SAKIT' || st === 'S') sakit++;
      else if (st === 'IZIN' || st === 'I') izin++;
      else if (st === 'ALPA' || st === 'A') alpa++;
      if (a.is_terlambat) terlambat++;
    }

    const totalHari = absensiLogs.length;
    const persentaseKehadiran = totalHari > 0 ? (hadir / totalHari) * 100 : 100;

    // 3. Kesiswaan & Pelanggaran
    const violations = await prisma.pelanggaranSiswa.findMany({
      where: { tenant_id, siswa_id: siswaId },
      orderBy: { tanggal: 'desc' },
    });

    const totalPoin = violations.reduce((acc: number, v: any) => acc + (v.poin || 0), 0);
    const formattedViolations = violations.map((v: any) => ({
      tanggal: v.tanggal,
      kategori: v.jenis_pelanggaran,
      deskripsi: v.keterangan || '-',
      poin: v.poin,
      sanksi: v.status,
    }));

    // Prestasi
    const prestasiList = await prisma.prestasiSiswa.findMany({
      where: { tenant_id, siswa_id: siswaId },
      orderBy: { tanggal: 'desc' },
    });

    const formattedPrestasi = prestasiList.map((p: any) => ({
      tanggal: p.tanggal,
      nama_prestasi: p.nama_prestasi,
      tingkat: p.tingkat,
      peringkat: p.peringkat,
    }));

    // 4. Bimbingan Konseling (BK)
    const bkKonseling = await prisma.konselingSiswa.findMany({
      where: { tenant_id, siswa_id: siswaId },
      orderBy: { tanggal: 'desc' },
    });

    const formattedBk = bkKonseling.map((b: any) => ({
      tanggal: b.tanggal,
      judul: b.masalah.substring(0, 50) + '...',
      status: b.status,
      tindakan_lanjut: b.solusi,
    }));

    const homeVisits = await prisma.homeVisit.findMany({
      where: { tenant_id, siswa_id: siswaId },
      orderBy: { tanggal: 'desc' },
    });

    const formattedHomeVisits = homeVisits.map((h: any) => ({
      tanggal: h.tanggal,
      tujuan: h.tujuan,
      hasil: h.hasil,
    }));

    return {
      siswa: {
        id: siswa.id,
        nis: siswa.nis,
        nisn: siswa.nisn,
        nama_lengkap: siswa.nama_siswa,
        jenis_kelamin: siswa.jenis_kelamin,
        kelas_nama: siswa.Kelas?.nama_kelas,
        foto: siswa.foto,
      },
      triage: {
        zone: decision?.triage_zone || PlenoTriageZone.GREEN,
        reasons: decision?.triage_reasons ? decision.triage_reasons.split('; ') : [],
        rekomendasi_awal: decision?.rekomendasi_awal || PlenoDecisionType.NAIK,
      },
      decision: decision
        ? {
            id: decision.id,
            keputusan_akhir: decision.keputusan_akhir,
            target_kelas_id: decision.target_kelas_id,
            alasan_keputusan: decision.alasan_keputusan,
            catatan_pendampingan: decision.catatan_pendampingan,
            is_disputed: decision.is_disputed,
            voted_by_consensus: decision.voted_by_consensus,
            voting_yes: decision.voting_yes,
            voting_no: decision.voting_no,
            decided_at: decision.decided_at,
            decided_by: decision.decided_by_user_id,
          }
        : null,
      akademik: {
        kktp_threshold: kktp,
        total_mapel: nilaiList.length,
        mapel_tuntas: tuntas,
        mapel_belum_tuntas: belumTuntas,
        rata_rata_nilai: Math.round(rataRata * 10) / 10,
        mata_pelajaran: formattedMapel,
        ekskul: formattedEkskul,
      },
      kehadiran: {
        total_hari_efektif: totalHari,
        persentase_kehadiran: Math.round(persentaseKehadiran * 10) / 10,
        hadir,
        sakit,
        izin,
        alpa,
        terlambat,
      },
      kesiswaan: {
        total_poin_pelanggaran: totalPoin,
        pelanggaran: formattedViolations,
        prestasi: formattedPrestasi,
      },
      bk: {
        total_kasus: bkKonseling.length,
        kasus: formattedBk,
        home_visit: formattedHomeVisits,
      },
    };
  }

  /**
   * 14. Decide Single Student
   */
  async decideStudent(
    tenant_id: string,
    sessionId: string,
    siswaId: string,
    data: DecideStudentDTO,
    userId: string
  ) {
    const session = await prisma.academicPlenoSession.findFirst({
      where: { id: sessionId, tenant_id },
    });
    if (!session) throw new Error('Sesi sidang pleno tidak ditemukan');
    if (session.status === AcademicPlenoStatus.FINALIZED) {
      throw new Error('Sesi sudah difinalisasi. Putusan terkunci.');
    }

    const siswa = await prisma.siswa.findFirst({
      where: { id: siswaId, tenant_id },
    });
    if (!siswa) throw new Error('Siswa tidak ditemukan');

    // Find existing decision or create
    const existing = await prisma.academicPlenoDecision.findFirst({
      where: { session_id: sessionId, siswa_id: siswaId },
    });

    if (existing) {
      const updated = await prisma.academicPlenoDecision.update({
        where: { id: existing.id },
        data: {
          keputusan_akhir: data.keputusan_akhir,
          target_kelas_id: data.target_kelas_id,
          alasan_keputusan: data.alasan_keputusan,
          catatan_pendampingan: data.catatan_pendampingan,
          is_disputed: data.is_disputed !== undefined ? data.is_disputed : false,
          voted_by_consensus: data.voted_by_consensus !== undefined ? data.voted_by_consensus : true,
          voting_yes: data.voting_yes,
          voting_no: data.voting_no,
          decided_by_user_id: userId,
          decided_at: new Date(),
        },
      });
      return updated;
    } else {
      // Find rombel
      const rombel = await prisma.academicPlenoRombel.findFirst({
        where: { session_id: sessionId, kelas_id: siswa.kelas_id || '' },
      });

      const created = await prisma.academicPlenoDecision.create({
        data: {
          session_id: sessionId,
          rombel_id: rombel?.id || '',
          siswa_id: siswaId,
          triage_zone: PlenoTriageZone.YELLOW,
          rekomendasi_awal: data.keputusan_akhir,
          keputusan_akhir: data.keputusan_akhir,
          target_kelas_id: data.target_kelas_id,
          alasan_keputusan: data.alasan_keputusan,
          catatan_pendampingan: data.catatan_pendampingan,
          is_disputed: data.is_disputed || false,
          voted_by_consensus: data.voted_by_consensus !== undefined ? data.voted_by_consensus : true,
          voting_yes: data.voting_yes,
          voting_no: data.voting_no,
          decided_by_user_id: userId,
          decided_at: new Date(),
        },
      });
      return created;
    }
  }

  /**
   * 15. Minutes of Meeting (Notulensi)
   */
  async listMinutes(tenant_id: string, sessionId: string) {
    const session = await prisma.academicPlenoSession.findFirst({
      where: { id: sessionId, tenant_id },
    });
    if (!session) throw new Error('Sesi sidang pleno tidak ditemukan');

    return prisma.academicPlenoMinute.findMany({
      where: { session_id: sessionId },
      orderBy: { created_at: 'asc' },
    });
  }

  async createMinute(tenant_id: string, sessionId: string, data: CreateMinuteDTO, userId: string) {
    const session = await prisma.academicPlenoSession.findFirst({
      where: { id: sessionId, tenant_id },
    });
    if (!session) throw new Error('Sesi sidang pleno tidak ditemukan');

    const author = await prisma.user.findUnique({
      where: { id: userId },
      select: { full_name: true },
    });

    const minute = await prisma.academicPlenoMinute.create({
      data: {
        session_id: sessionId,
        rombel_id: data.rombel_id,
        author_id: userId,
        speaker_name: data.speaker_name || author?.full_name || 'Notulis',
        speaker_role: data.speaker_role || 'Peserta Sidang',
        topic: data.topic,
        content: data.content,
        action_item: data.action_item,
      },
    });

    return minute;
  }

  /**
   * 16. Sync Finalized Decisions to Transition / Database Class Placement
   */
  async syncToTransition(tenant_id: string, sessionId: string, targetTahunPelajaranId: string) {
    const session = await prisma.academicPlenoSession.findFirst({
      where: { id: sessionId, tenant_id },
      include: {
        decisions: {
          include: {
            Siswa: true,
            Rombel: { include: { Kelas: true } },
          },
        },
      },
    });

    if (!session) throw new Error('Sesi sidang pleno tidak ditemukan');
    if (session.status !== AcademicPlenoStatus.FINALIZED) {
      throw new Error('Hanya sesi yang sudah difinalisasi yang dapat disinkronkan ke transisi kelas.');
    }

    let promotedCount = 0;
    let retainedCount = 0;
    let conditionalCount = 0;

    for (const d of session.decisions) {
      if (d.keputusan_akhir === PlenoDecisionType.NAIK || d.keputusan_akhir === PlenoDecisionType.NAIK_BERSYARAT) {
        if (d.target_kelas_id) {
          // Update student current class
          await prisma.siswa.update({
            where: { id: d.siswa_id },
            data: {
              kelas_id: d.target_kelas_id,
              tahun_pelajaran_id: targetTahunPelajaranId,
            },
          });
        }
        if (d.keputusan_akhir === PlenoDecisionType.NAIK) promotedCount++;
        else conditionalCount++;
      } else if (d.keputusan_akhir === PlenoDecisionType.TINGGAL_KELAS) {
        // Retained in same class level
        retainedCount++;
      }
    }

    return {
      success: true,
      promoted_count: promotedCount,
      conditional_count: conditionalCount,
      retained_count: retainedCount,
    };
  }

  /**
   * 17. Export BAP Data
   */
  async getBapData(tenant_id: string, sessionId: string) {
    const session = await this.getSessionDetail(tenant_id, sessionId);
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenant_id },
      select: {
        name: true,
        logo_url: true,
        subdomain: true,
      },
    });

    const attendances = await this.listAttendance(tenant_id, sessionId);
    const rombels = await this.listRombels(tenant_id, sessionId);
    const minutes = await this.listMinutes(tenant_id, sessionId);

    return {
      school: tenant,
      session,
      attendances,
      rombels,
      minutes,
    };
  }
}

export const academicPlenoService = new AcademicPlenoService();
