import { prisma } from '@/utils/prisma';
import { DataScope } from '@/types/fastify';
import { StatusPelaksanaanUpacara, Hari } from '@prisma/client';
import { appLogger } from '@/utils/app-logger';
import { getTenantTimezone, getTimezoneLabel } from '@/utils/timezone.utils';
import { getHariEnum, isSchoolDay } from '@/utils/school-day.utils';
import { STRUKTUR_CODES } from '@/config/organization-structure';

export interface CreatePembinaUpacaraDto {
  tahun_pelajaran_id: string;
  semester_id?: string | null;
  tanggal: string; // ISO date YYYY-MM-DD
  guru_id: string;
  guru_pengganti_id?: string | null;
  kelas_petugas_id?: string | null;
  jadwal_kegiatan_id?: string | null;
  tema_amanat?: string | null;
  catatan?: string | null;
  status?: StatusPelaksanaanUpacara;
}

export interface AutoGenerateUpacaraDto {
  tahun_pelajaran_id: string;
  semester_id?: string | null;
  tanggal_mulai?: string; // YYYY-MM-DD (default: semester start or today)
  tanggal_selesai?: string; // YYYY-MM-DD (default: semester end or +6 months)
  guru_ids?: string[];
  kelas_ids?: string[];
  rotasi_pairs?: Array<{ guru_id: string; kelas_id?: string | null }>;
  tema_presets?: string[];
}

export const pembinaUpacaraService = {
  async getAll(
    scope: DataScope,
    filters?: {
      tahun_pelajaran_id?: string;
      semester_id?: string;
      startDate?: string;
      endDate?: string;
    }
  ) {
    const tenantId = scope.tenantId;
    const where: any = { tenant_id: tenantId };

    if (filters?.tahun_pelajaran_id) {
      where.tahun_pelajaran_id = filters.tahun_pelajaran_id;
    }
    if (filters?.semester_id) {
      where.semester_id = filters.semester_id;
    }
    if (filters?.startDate || filters?.endDate) {
      where.tanggal = {};
      if (filters.startDate) where.tanggal.gte = new Date(filters.startDate);
      if (filters.endDate) where.tanggal.lte = new Date(filters.endDate);
    }

    return prisma.jadwalPembinaUpacara.findMany({
      where,
      include: {
        GuruUtama: {
          select: {
            id: true,
            nama_guru: true,
            nip: true,
          },
        },
        GuruPengganti: {
          select: {
            id: true,
            nama_guru: true,
            nip: true,
          },
        },
        KelasPetugas: {
          select: {
            id: true,
            nama_kelas: true,
          },
        },
        TahunPelajaran: {
          select: {
            id: true,
            tahun: true,
          },
        },
        Semester: {
          select: {
            id: true,
            nama_semester: true,
          },
        },
      },
      orderBy: {
        tanggal: 'asc',
      },
    });
  },

  async getById(scope: DataScope, id: string) {
    return prisma.jadwalPembinaUpacara.findFirst({
      where: {
        id,
        tenant_id: scope.tenantId,
      },
      include: {
        GuruUtama: true,
        GuruPengganti: true,
        KelasPetugas: true,
        TahunPelajaran: true,
        Semester: true,
      },
    });
  },

  async create(scope: DataScope, data: CreatePembinaUpacaraDto, userId?: string) {
    if (!scope.tenantId) throw new Error('Tenant ID diperlukan');
    const tenantId = scope.tenantId;
    const dateObj = new Date(data.tanggal);

    return prisma.jadwalPembinaUpacara.create({
      data: {
        tenant_id: tenantId,
        tahun_pelajaran_id: data.tahun_pelajaran_id,
        semester_id: data.semester_id || null,
        tanggal: dateObj,
        guru_id: data.guru_id,
        guru_pengganti_id: data.guru_pengganti_id || null,
        kelas_petugas_id: data.kelas_petugas_id || null,
        jadwal_kegiatan_id: data.jadwal_kegiatan_id || null,
        tema_amanat: data.tema_amanat || null,
        catatan: data.catatan || null,
        status: data.status || StatusPelaksanaanUpacara.DIJADWALKAN,
        created_by: userId || null,
      },
      include: {
        GuruUtama: {
          select: { id: true, nama_guru: true, nip: true },
        },
        GuruPengganti: {
          select: { id: true, nama_guru: true, nip: true },
        },
        KelasPetugas: {
          select: { id: true, nama_kelas: true },
        },
      },
    });
  },

  async update(scope: DataScope, id: string, data: Partial<CreatePembinaUpacaraDto>) {
    const existing = await prisma.jadwalPembinaUpacara.findFirst({
      where: { id, tenant_id: scope.tenantId },
    });
    if (!existing) throw new Error('Jadwal pembina upacara tidak ditemukan');

    const updateData: any = { ...data };
    if (data.tanggal) {
      updateData.tanggal = new Date(data.tanggal);
    }

    return prisma.jadwalPembinaUpacara.update({
      where: { id },
      data: updateData,
      include: {
        GuruUtama: {
          select: { id: true, nama_guru: true, nip: true },
        },
        GuruPengganti: {
          select: { id: true, nama_guru: true, nip: true },
        },
        KelasPetugas: {
          select: { id: true, nama_kelas: true },
        },
      },
    });
  },

  async delete(scope: DataScope, id: string) {
    const existing = await prisma.jadwalPembinaUpacara.findFirst({
      where: { id, tenant_id: scope.tenantId },
    });
    if (!existing) throw new Error('Jadwal pembina upacara tidak ditemukan');

    return prisma.jadwalPembinaUpacara.delete({
      where: { id },
    });
  },

  /**
   * Mengambil kandidat pembina upacara yang dipisahkan ke dalam 3 kelompok terstruktur:
   * 1. Kelompok Waka (Wakil Kepala Sekolah / Pimpinan)
   * 2. Kelompok Wali Kelas (Wali Kelas pada tahun ajaran / semester aktif)
   * 3. Kelompok Guru Biasa (Guru aktif lainnya yang bukan Waka & bukan Wali Kelas)
   */
  async getCandidateGroups(
    scope: DataScope,
    tahunPelajaranId?: string,
    _semesterId?: string
  ) {
    const tenantId = scope.tenantId;
    if (!tenantId) throw new Error('Tenant ID diperlukan');

    // ── 1. AMBIL PARA WAKA ──────────────────────────────────────────────
    const wakaAssignments = await prisma.organizationalAssignment.findMany({
      where: {
        tenant_id: tenantId,
        is_active: true,
        Position: {
          is_active: true,
          OR: [
            {
              code: {
                in: [
                  STRUKTUR_CODES.KURIKULUM,
                  STRUKTUR_CODES.KESISWAAN,
                  STRUKTUR_CODES.HUBIN,
                  STRUKTUR_CODES.SARPRAS,
                  'WAKASEK',
                  'WAKA',
                ],
              },
            },
            { code: { contains: 'WAKA', mode: 'insensitive' } },
            { name: { contains: 'Waka', mode: 'insensitive' } },
            { name: { contains: 'Wakil', mode: 'insensitive' } },
          ],
        },
      },
      include: {
        Position: {
          select: { id: true, code: true, name: true, order: true },
        },
        User: {
          include: {
            Guru: {
              select: { id: true, nama_guru: true, nip: true, no_hp: true },
            },
          },
        },
      },
      orderBy: [{ Position: { order: 'asc' } }, { created_at: 'asc' }],
    });

    const wakaList: Array<{
      id: string;
      guru_id: string;
      nama_guru: string;
      nip: string | null;
      no_hp: string | null;
      jabatan: string;
      kode_jabatan: string;
    }> = [];
    const wakaGuruIds = new Set<string>();

    for (const asg of wakaAssignments) {
      const guru = asg.User?.Guru;
      if (guru && !wakaGuruIds.has(guru.id)) {
        wakaGuruIds.add(guru.id);
        wakaList.push({
          id: asg.id,
          guru_id: guru.id,
          nama_guru: guru.nama_guru,
          nip: guru.nip || null,
          no_hp: guru.no_hp || null,
          jabatan: asg.Position?.name || 'Wakil Kepala Sekolah',
          kode_jabatan: asg.Position?.code || 'WAKA',
        });
      }
    }

    // ── 2. AMBIL PARA WALI KELAS ────────────────────────────────────────
    const waliWhere: any = {
      tenant_id: tenantId,
      is_active: true,
      Position: {
        code: STRUKTUR_CODES.WALIKELAS,
      },
      kelas_id: { not: null },
    };

    if (tahunPelajaranId) {
      waliWhere.Kelas = {
        tahun_pelajaran_id: tahunPelajaranId,
      };
    }

    const waliAssignments = await prisma.organizationalAssignment.findMany({
      where: waliWhere,
      include: {
        Kelas: { select: { id: true, nama_kelas: true, tingkat: true } },
        User: {
          include: {
            Guru: {
              select: { id: true, nama_guru: true, nip: true, no_hp: true },
            },
          },
        },
      },
      orderBy: [
        { Kelas: { tingkat: 'asc' } },
        { Kelas: { nama_kelas: 'asc' } },
      ],
    });

    const waliKelasList: Array<{
      id: string;
      guru_id: string;
      nama_guru: string;
      nip: string | null;
      no_hp: string | null;
      kelas_id: string | null;
      nama_kelas: string;
      tingkat: number;
    }> = [];
    const waliGuruIds = new Set<string>();

    for (const asg of waliAssignments) {
      const guru = asg.User?.Guru;
      if (guru && !waliGuruIds.has(guru.id)) {
        waliGuruIds.add(guru.id);
        waliKelasList.push({
          id: asg.id,
          guru_id: guru.id,
          nama_guru: guru.nama_guru,
          nip: guru.nip || null,
          no_hp: guru.no_hp || null,
          kelas_id: asg.Kelas?.id || asg.kelas_id || null,
          nama_kelas: asg.Kelas?.nama_kelas || 'Kelas Binaan',
          tingkat: asg.Kelas?.tingkat || 10,
        });
      }
    }

    // ── 3. AMBIL GURU BIASA (BUKAN WAKA & BUKAN WALI KELAS) ──────────────
    const allGurus = await prisma.guru.findMany({
      where: {
        tenant_id: tenantId,
        User: { status: 'ACTIVE' },
      },
      select: {
        id: true,
        nama_guru: true,
        nip: true,
        no_hp: true,
      },
      orderBy: {
        nama_guru: 'asc',
      },
    });

    const guruBiasaList: Array<{
      guru_id: string;
      nama_guru: string;
      nip: string | null;
      no_hp: string | null;
    }> = [];

    for (const g of allGurus) {
      if (!wakaGuruIds.has(g.id) && !waliGuruIds.has(g.id)) {
        guruBiasaList.push({
          guru_id: g.id,
          nama_guru: g.nama_guru,
          nip: g.nip || null,
          no_hp: g.no_hp || null,
        });
      }
    }

    return {
      waka: wakaList,
      waliKelas: waliKelasList,
      guruBiasa: guruBiasaList,
      counts: {
        totalWaka: wakaList.length,
        totalWaliKelas: waliKelasList.length,
        totalGuruBiasa: guruBiasaList.length,
        totalKeseluruhan: wakaList.length + waliKelasList.length + guruBiasaList.length,
      },
    };
  },

  async autoGenerate(scope: DataScope, dto: AutoGenerateUpacaraDto, userId?: string) {
    if (!scope.tenantId) throw new Error('Tenant ID diperlukan');
    const tenantId = scope.tenantId;

    const hasPairs = dto.rotasi_pairs && dto.rotasi_pairs.length > 0;
    const hasGurus = dto.guru_ids && dto.guru_ids.length > 0;

    if (!hasPairs && !hasGurus) {
      throw new Error('Daftar guru pembina atau rotasi wali kelas tidak boleh kosong.');
    }

    // Tentukan rentang tanggal
    let start = dto.tanggal_mulai ? new Date(dto.tanggal_mulai) : new Date();
    let end: Date;

    if (dto.tanggal_selesai) {
      end = new Date(dto.tanggal_selesai);
    } else {
      // Default rentang 1 semester (sekitar 22 minggu)
      end = new Date(start);
      end.setMonth(end.getMonth() + 5);
    }

    // Kumpulkan seluruh hari Senin dalam rentang
    const mondays: Date[] = [];
    const current = new Date(start);
    // Normalisasi jam
    current.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    while (current <= end) {
      if (current.getDay() === 1) { // 1 = Senin
        mondays.push(new Date(current));
      }
      current.setDate(current.getDate() + 1);
    }

    if (mondays.length === 0) {
      throw new Error('Tidak ditemukan hari Senin dalam rentang tanggal yang dipilih.');
    }

    // Ambil slot JadwalKegiatan Upacara jika ada
    const masterUpacara = await prisma.jadwalKegiatan.findFirst({
      where: {
        tenant_id: tenantId,
        nama: { contains: 'Upacara', mode: 'insensitive' },
        aktif: true,
      },
    });

    const results = [];
    for (let i = 0; i < mondays.length; i++) {
      const tgl = mondays[i];
      let guruId: string;
      let kelasId: string | null = null;

      if (hasPairs) {
        const pair = dto.rotasi_pairs![i % dto.rotasi_pairs!.length];
        guruId = pair.guru_id;
        kelasId = pair.kelas_id || null;
      } else {
        guruId = dto.guru_ids![i % dto.guru_ids!.length];
        kelasId = dto.kelas_ids && dto.kelas_ids.length > 0
          ? dto.kelas_ids[i % dto.kelas_ids.length]
          : null;
      }

      const tema = dto.tema_presets && dto.tema_presets.length > 0
        ? dto.tema_presets[i % dto.tema_presets.length]
        : null;

      const record = await prisma.jadwalPembinaUpacara.upsert({
        where: {
          tenant_id_tanggal: {
            tenant_id: tenantId,
            tanggal: tgl,
          },
        },
        update: {
          tahun_pelajaran_id: dto.tahun_pelajaran_id,
          semester_id: dto.semester_id || null,
          guru_id: guruId,
          kelas_petugas_id: kelasId,
          tema_amanat: tema,
          jadwal_kegiatan_id: masterUpacara?.id || null,
        },
        create: {
          tenant_id: tenantId,
          tahun_pelajaran_id: dto.tahun_pelajaran_id,
          semester_id: dto.semester_id || null,
          tanggal: tgl,
          guru_id: guruId,
          kelas_petugas_id: kelasId,
          tema_amanat: tema,
          jadwal_kegiatan_id: masterUpacara?.id || null,
          status: StatusPelaksanaanUpacara.DIJADWALKAN,
          created_by: userId || null,
        },
        include: {
          GuruUtama: { select: { id: true, nama_guru: true, nip: true } },
          KelasPetugas: { select: { id: true, nama_kelas: true } },
        },
      });

      results.push(record);
    }

    return {
      count: results.length,
      items: results,
    };
  },

  /**
   * ─────────────────────────────────────────────────────────────────────────────
   * 📱 OTOMASI PENGINGAT WHATSAPP UPACARA BENDERA (SENIN PAGI & JUM'AT GLADI)
   * ─────────────────────────────────────────────────────────────────────────────
   */

  async getTenantTimezone(tenantId: string): Promise<string> {
    return getTenantTimezone(tenantId);
  },

  async getWaNotifConfig(tenantId: string) {
    const configRow = await prisma.config.findFirst({
      where: { tenant_id: tenantId, key: 'UPACARA_WA_NOTIF_CONFIG' },
    });

    const defaultConfig = {
      enabled: false,
      targetGroupId: '',
      targetGroupName: '',
      seninJam: '06:00',
      seninEnabled: true,
      jumatReminderEnabled: true,
      jumatJam: '13:30',
      includeTema: true,
    };

    if (!configRow || !configRow.value) {
      return defaultConfig;
    }

    try {
      const parsed = JSON.parse(configRow.value);
      return { ...defaultConfig, ...parsed };
    } catch {
      return defaultConfig;
    }
  },

  async saveWaNotifConfig(tenantId: string, payload: any) {
    const existing = await this.getWaNotifConfig(tenantId);
    const updated = { ...existing, ...payload };

    const existingRow = await prisma.config.findFirst({
      where: { tenant_id: tenantId, key: 'UPACARA_WA_NOTIF_CONFIG' },
    });

    if (existingRow) {
      await prisma.config.update({
        where: { id: existingRow.id },
        data: { value: JSON.stringify(updated) },
      });
    } else {
      await prisma.config.create({
        data: {
          tenant_id: tenantId,
          key: 'UPACARA_WA_NOTIF_CONFIG',
          value: JSON.stringify(updated),
        },
      });
    }

    return updated;
  },

  /**
   * Format pesan resmi siaran ke Group WhatsApp Dewan Guru (Hari H Senin Pagi)
   */
  async formatUpacaraGroupMessage(
    _tenantId: string,
    schedule: any,
    tanggalTarget: Date,
    timezone: string
  ): Promise<string> {
    const tglStr = tanggalTarget.toLocaleDateString('id-ID', {
      timeZone: timezone,
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    const isReplaced = !!schedule.guru_pengganti_id;
    const guruUtamaNama = schedule.GuruUtama?.nama_guru || '-';
    const guruUtamaNip = schedule.GuruUtama?.nip ? ` (NIP. ${schedule.GuruUtama.nip})` : '';
    const guruPenggantiNama = schedule.GuruPengganti?.nama_guru || '-';
    const guruPenggantiNip = schedule.GuruPengganti?.nip ? ` (NIP. ${schedule.GuruPengganti.nip})` : '';
    const kelasPetugasNama = schedule.KelasPetugas?.nama_kelas || '-';
    const temaAmanat = schedule.tema_amanat ? `"${schedule.tema_amanat}"` : '_Umum / Amanat Kedisiplinan_';
    const tzLabel = getTimezoneLabel(timezone);

    let pembinaSection = `👨‍🏫 *Pembina Upacara:*\n• *${guruUtamaNama}*${guruUtamaNip}`;
    if (isReplaced) {
      pembinaSection += `\n  ↳ ⚠️ *Digantikan oleh:* *${guruPenggantiNama}*${guruPenggantiNip} *(Tugas Handover)*`;
    }

    let msg = `🇮🇩 *PELAKSANAAN UPACARA BENDERA HARI SENIN*\n`;
    msg += `📅 *${tglStr}*\n`;
    msg += `⏰ *Pukul 07.00 ${tzLabel}* (Lapangan Upacara)\n\n`;

    msg += `${pembinaSection}\n\n`;
    msg += `👥 *Petugas Upacara:*\n• Kelas: *${kelasPetugasNama}*\n\n`;
    msg += `🎙️ *Tema Amanat Upacara:*\n• ${temaAmanat}\n\n`;

    msg += `📌 *Himbauan Dewan Guru & Wali Kelas:*\n`;
    msg += `1. Seluruh Bapak/Ibu Guru dan Tenaga Kependidikan dimohon hadir di lapangan tepat waktu mengenakan seragam dinas harian upacara lengkap.\n`;
    msg += `2. Bapak/Ibu Wali Kelas dimohon mendampingi barisan rombel binaannya demi ketertiban upacara.\n\n`;
    msg += `Selamat bertugas dan mari kita sambut awal pekan ini dengan penuh semangat pengabdian! 🇮🇩✨\n\n`;
    msg += `🤖 _Pesan otomatis ini disiarkan oleh *Sistem Presensi & Kesiswaan Absenta*._`;

    return msg;
  },

  /**
   * Format pesan pengingat personal ke Pembina / Wali Kelas (Hari Jum'at Persiapan Gladi)
   */
  async formatUpacaraPersonalMessage(
    _tenantId: string,
    schedule: any,
    tanggalSenin: Date,
    timezone: string,
    namaPenerima: string
  ): Promise<string> {
    const tglStr = tanggalSenin.toLocaleDateString('id-ID', {
      timeZone: timezone,
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    const isReplaced = !!schedule.guru_pengganti_id;
    const kelasPetugasNama = schedule.KelasPetugas?.nama_kelas || '-';
    const temaAmanat = schedule.tema_amanat ? `"${schedule.tema_amanat}"` : '_Belum ditentukan_';

    let msg = `🇮🇩 *PENGINGAT PERSIAPAN UPACARA BENDERA*\n`;
    msg += `Yth. Bapak/Ibu *${namaPenerima}*,\n\n`;
    msg += `Berdasarkan jadwal kesiswaan sekolah, berikut agenda penugasan upacara bendera untuk hari Senin mendatang:\n\n`;
    msg += `📅 *Hari/Tanggal:* ${tglStr}\n`;
    msg += `👥 *Kelas Petugas:* ${kelasPetugasNama}\n`;
    msg += `🎙️ *Tema/Amanat:* ${temaAmanat}\n`;

    if (isReplaced) {
      msg += `⚠️ *Status Tugas:* Handover (Guru Pengganti)\n`;
    }

    msg += `\n💡 *Himbauan Gladi Bersih & Latihan:*\n`;
    msg += `Mohon dapat mengoordinasikan latihan/gladi upacara bersama siswa rombel petugas sebelum hari Senin agar upacara berlangsung khidmat dan tertib.\n\n`;
    msg += `Apabila Bapak/Ibu berhalangan hadir atau ada penugasan dinas luar pada hari Senin, mohon segera memberitahu Tim Kesiswaan untuk penetapan Guru Pengganti di sistem.\n\n`;
    msg += `Terima kasih atas dedikasi dan kerjasamanya! 🙏\n\n`;
    msg += `🤖 _Pesan otomatis Sistem Absenta Kesiswaan_`;

    return msg;
  },

  /**
   * Eksekusi Pengiriman Pesan Hari Senin Pagi ke Group WA
   */
  async sendSeninGroupReminder(
    tenantId: string,
    forceSend: boolean = false,
    overrideGroupId?: string
  ): Promise<{ success: boolean; skipped?: boolean; message: string }> {
    const config = await this.getWaNotifConfig(tenantId);
    const targetGroupId = overrideGroupId || config.targetGroupId;

    if (!targetGroupId) {
      throw new Error('Group WA tujuan belum ditentukan. Silakan atur Group Tujuan di Pengaturan Notifikasi Upacara.');
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true, status: true, name: true },
    });

    if (!tenant || tenant.status !== 'ACTIVE') {
      return { success: false, skipped: true, message: 'Tenant tidak aktif' };
    }

    const timezone = await getTenantTimezone(tenantId);

    // Ambil tanggal hari ini dalam zona waktu lokal tenant (YYYY-MM-DD)
    const now = new Date();
    const targetDateStr = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(now);

    const dateTarget = new Date(`${targetDateStr}T12:00:00Z`);
    const startOfDay = new Date(`${targetDateStr}T00:00:00.000Z`);
    const endOfDay = new Date(`${targetDateStr}T23:59:59.999Z`);
    const idempotencyRelatedId = `UPACARA:${targetDateStr}:GROUP`;

    // 🛡️ 1. Idempotency Outbox Guard: Cek apakah hari ini sudah pernah terkirim di database
    if (!forceSend) {
      const existingSentLog = await prisma.notificationLog.findFirst({
        where: {
          tenant_id: tenantId,
          event: 'UPACARA_REMINDER_GROUP',
          related_id: idempotencyRelatedId,
          recipient: targetGroupId,
          status: 'SENT',
        },
      });

      if (existingSentLog) {
        return {
          success: true,
          skipped: true,
          message: `Pengumuman upacara sudah pernah terkirim untuk tanggal ${targetDateStr} (Idempotency Skip)`,
        };
      }
    }

    // 🔍 2. Kalender & Hari Operasional Guard: Cek apakah hari ini hari kerja sekolah aktif
    const workingDayCheck = await isSchoolDay(tenantId, dateTarget, timezone);
    if (!workingDayCheck.isWorkingDay && !forceSend) {
      appLogger.info(
        { tenantId, targetDateStr, reason: workingDayCheck.reason },
        'Pengumuman upacara bendera dilewati (Hari Libur / Non-Hari Kerja Sekolah)'
      );
      return {
        success: true,
        skipped: true,
        message: `Pengumuman upacara dilewati: ${workingDayCheck.reason || 'Bukan hari sekolah'}`,
      };
    }

    // 🔍 3. Ambil jadwal upacara hari ini dengan query rentang tanggal aman
    const schedule = await prisma.jadwalPembinaUpacara.findFirst({
      where: {
        tenant_id: tenantId,
        tanggal: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      include: {
        GuruUtama: { select: { id: true, nama_guru: true, nip: true, no_hp: true } },
        GuruPengganti: { select: { id: true, nama_guru: true, nip: true, no_hp: true } },
        KelasPetugas: { select: { id: true, nama_kelas: true } },
      },
    });

    if (!schedule && !forceSend) {
      return {
        success: true,
        skipped: true,
        message: `Tidak ada jadwal upacara yang terdaftar pada ${targetDateStr}`,
      };
    }

    // Jika forceSend (Uji Coba) dan belum ada schedule, buat sampel data realistis
    const activeSchedule = schedule || {
      tanggal: startOfDay,
      GuruUtama: { nama_guru: 'Contoh Guru Pembina, S.Pd', nip: '198501012010011001' },
      KelasPetugas: { nama_kelas: 'X RPL 1' },
      tema_amanat: 'Disiplin dan Tanggung Jawab Generasi Muda',
    };

    const messageText = await this.formatUpacaraGroupMessage(tenantId, activeSchedule, dateTarget, timezone);

    const { waGatewayService } = await import('@/services/wa-gateway.service');
    await waGatewayService.sendMessageToJid(tenantId, targetGroupId, messageText);

    // 📝 4. Rekam ke NotificationLog untuk Garansi Anti-Duplikasi Persisten
    if (!forceSend) {
      try {
        await prisma.notificationLog.create({
          data: {
            tenant_id: tenantId,
            type: 'WHATSAPP',
            event: 'UPACARA_REMINDER_GROUP',
            recipient: targetGroupId,
            subject: `Pengumuman Upacara Bendera - ${targetDateStr}`,
            message: messageText,
            status: 'SENT',
            related_id: idempotencyRelatedId,
          },
        });
      } catch (err: any) {
        appLogger.warn({ tenantId, idempotencyRelatedId, err: err?.message }, 'Warning saat mencatat NotificationLog upacara group');
      }
    }

    return {
      success: true,
      message: `Pengumuman upacara bendera berhasil dikirim ke group WA (${targetDateStr})`,
    };
  },

  /**
   * Eksekusi Pengingat Gladi/Persiapan Hari Jum'at ke Nomor Personal Pembina & Wali Kelas
   */
  async sendJumatPreparationReminder(
    tenantId: string,
    forceSend: boolean = false
  ): Promise<{ success: boolean; skipped?: boolean; message: string; sentCount?: number }> {
    const config = await this.getWaNotifConfig(tenantId);
    if (!config.enabled || !config.jumatReminderEnabled) {
      return { success: false, skipped: true, message: 'Notifikasi Jum\'at upacara tidak aktif' };
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true, status: true, name: true },
    });

    if (!tenant || tenant.status !== 'ACTIVE') {
      return { success: false, skipped: true, message: 'Tenant tidak aktif' };
    }

    const timezone = await getTenantTimezone(tenantId);

    // Ambil tanggal hari ini dalam timezone tenant
    const now = new Date();
    const todayDateStr = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(now);

    // Hitung tanggal Senin berikutnya dari hari Jum'at (H+3) secara deterministik
    const [y, m, d] = todayDateStr.split('-').map(Number);
    const hariIni = getHariEnum(now, timezone);
    let daysUntilMonday = 3;
    if (hariIni === Hari.SABTU) daysUntilMonday = 2;
    else if (hariIni === Hari.MINGGU) daysUntilMonday = 1;
    else if (hariIni !== Hari.JUMAT) daysUntilMonday = 7;

    const nextMondayDate = new Date(Date.UTC(y, m - 1, d + daysUntilMonday));
    const nextMondayStr = nextMondayDate.toISOString().split('T')[0];
    const startOfMonday = new Date(`${nextMondayStr}T00:00:00.000Z`);
    const endOfMonday = new Date(`${nextMondayStr}T23:59:59.999Z`);
    const idempotencyRelatedId = `UPACARA:${nextMondayStr}:JUMAT_GLADI`;

    // 🛡️ 1. Idempotency Outbox Guard
    if (!forceSend) {
      const existingSentLog = await prisma.notificationLog.findFirst({
        where: {
          tenant_id: tenantId,
          event: 'UPACARA_REMINDER_JUMAT',
          related_id: idempotencyRelatedId,
          status: 'SENT',
        },
      });

      if (existingSentLog) {
        return {
          success: true,
          skipped: true,
          message: `Pengingat Jum'at untuk upacara ${nextMondayStr} sudah pernah terkirim (Idempotency Skip).`,
        };
      }
    }

    // 🔍 2. Cari jadwal penugasan hari Senin depan
    const schedule: any = await prisma.jadwalPembinaUpacara.findFirst({
      where: {
        tenant_id: tenantId,
        tanggal: {
          gte: startOfMonday,
          lte: endOfMonday,
        },
      },
      include: {
        GuruUtama: { select: { id: true, nama_guru: true, nip: true, no_hp: true } },
        GuruPengganti: { select: { id: true, nama_guru: true, nip: true, no_hp: true } },
        KelasPetugas: {
          select: {
            id: true,
            nama_kelas: true,
          },
        },
      },
    });

    if (!schedule) {
      return {
        success: true,
        skipped: true,
        message: `Tidak ada jadwal upacara untuk Senin depan (${nextMondayStr})`,
      };
    }

    const { waGatewayService } = await import('@/services/wa-gateway.service');
    let sentCount = 0;

    // 1. Kirim ke Pembina Utama / Guru Pengganti
    const activeGuru = schedule.GuruPengganti || schedule.GuruUtama;
    if (activeGuru?.no_hp) {
      const personalMsg = await this.formatUpacaraPersonalMessage(
        tenantId,
        schedule,
        nextMondayDate,
        timezone,
        activeGuru.nama_guru
      );
      try {
        await waGatewayService.sendMessage(tenantId, activeGuru.no_hp, personalMsg);
        sentCount++;
      } catch (err: any) {
        appLogger.warn({ tenantId, guru: activeGuru.nama_guru, err: err?.message }, 'Gagal kirim WA personal upacara');
      }
    }

    // 2. Kirim juga ke Wali Kelas Petugas jika berbeda nomor HP dengan Pembina
    if (schedule.kelas_petugas_id) {
      const waliAssignment: any = await prisma.organizationalAssignment.findFirst({
        where: {
          tenant_id: tenantId,
          kelas_id: schedule.kelas_petugas_id,
          is_active: true,
        },
        include: {
          User: {
            select: {
              full_name: true,
              no_hp: true,
              Guru: { select: { nama_guru: true, no_hp: true } },
            },
          },
        },
      });

      const waliGuru = waliAssignment?.User?.Guru || (waliAssignment?.User ? { nama_guru: waliAssignment.User.full_name, no_hp: waliAssignment.User.no_hp } : null);
      if (waliGuru?.no_hp && waliGuru.no_hp !== activeGuru?.no_hp) {
        const waliMsg = await this.formatUpacaraPersonalMessage(
          tenantId,
          schedule,
          nextMondayDate,
          timezone,
          waliGuru.nama_guru
        );
        try {
          await waGatewayService.sendMessage(tenantId, waliGuru.no_hp, waliMsg);
          sentCount++;
        } catch (err: any) {
          appLogger.warn({ tenantId, wali: waliGuru.nama_guru, err: err?.message }, 'Gagal kirim WA wali kelas upacara');
        }
      }
    }

    // 📝 3. Catat log persisten ke NotificationLog
    if (!forceSend) {
      try {
        await prisma.notificationLog.create({
          data: {
            tenant_id: tenantId,
            type: 'WHATSAPP',
            event: 'UPACARA_REMINDER_JUMAT',
            recipient: activeGuru?.nama_guru || 'Pembina Upacara',
            subject: `Pengingat Gladi Upacara - ${nextMondayStr}`,
            message: `Terkirim ke ${sentCount} personil penugasan upacara`,
            status: 'SENT',
            related_id: idempotencyRelatedId,
          },
        });
      } catch (err: any) {
        appLogger.warn({ tenantId, idempotencyRelatedId, err: err?.message }, 'Warning saat mencatat NotificationLog upacara jumat');
      }
    }

    return {
      success: true,
      sentCount,
      message: `Pengingat persiapan upacara berhasil dikirim ke ${sentCount} penerima`,
    };
  },

  /**
   * 🚀 SaaS Dynamic Minute Dispatcher untuk Jadwal Pembina Upacara
   * Dipanggil setiap 1 menit oleh cron job: upacaraScheduleDispatcher.job.ts
   * 
   * 🛡️ Reboot Server Resilience & Timezone Alignment:
   * 1. Menggunakan engine timezone terpusat tenant (WIB / WITA / WIT).
   * 2. Menghindari exact minute match (`===`). Menggunakan Scheduled Window (`>= targetJam && <= cutoffJam`).
   * 3. Jika server di-reboot kapan saja dalam rentang waktu pagi/siang, dispatcher akan otomatis catch-up
   *    mengirim pengumuman yang belum terkirim.
   * 4. Garansi Strict Idempotency via `NotificationLog` persisten di database: reboot server berkali-kali
   *    tidak akan pernah memicu pengiriman ganda.
   */
  async dispatchDueTenantReminders(): Promise<{ processedCount: number; sentCount: number; skippedCount: number }> {
    const configRows = await prisma.config.findMany({
      where: {
        key: 'UPACARA_WA_NOTIF_CONFIG',
        Tenant: { status: 'ACTIVE' },
      },
      include: {
        Tenant: { select: { id: true, name: true, status: true } },
      },
    });

    let processedCount = 0;
    let sentCount = 0;
    let skippedCount = 0;

    const now = new Date();

    for (const row of configRows) {
      try {
        if (!row.value) continue;
        const config = JSON.parse(row.value);
        if (!config.enabled) continue;

        processedCount++;
        const timezone = await getTenantTimezone(row.tenant_id);

        // Ambil waktu lokal tenant dalam format HH:mm
        const localTimeStr = new Intl.DateTimeFormat('en-GB', {
          timeZone: timezone,
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        }).format(now);

        // Dapatkan nama hari saat ini berbasis zona waktu lokal tenant
        const hariEnum = getHariEnum(now, timezone);

        // Tanggal hari ini di timezone tenant (YYYY-MM-DD)
        const todayDateStr = new Intl.DateTimeFormat('en-CA', {
          timeZone: timezone,
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        }).format(now);

        // ── 1. EVALUASI SIARAN RESMI HARI SENIN PAGI (GROUP WA DEWAN GURU) ─────
        // Cutoff Jam 09:30: Toleransi catch-up jika server di-reboot antara jam target (misal 06:00) hingga 09:30
        if (hariEnum === Hari.SENIN && config.seninEnabled && config.targetGroupId) {
          const targetSeninJam = (config.seninJam || '06:00').trim();
          const cutoffSeninJam = '09:30';

          if (localTimeStr >= targetSeninJam && localTimeStr <= cutoffSeninJam) {
            const idempotencyRelatedId = `UPACARA:${todayDateStr}:GROUP`;
            const alreadySent = await prisma.notificationLog.findFirst({
              where: {
                tenant_id: row.tenant_id,
                event: 'UPACARA_REMINDER_GROUP',
                related_id: idempotencyRelatedId,
                status: 'SENT',
              },
              select: { id: true },
            });

            if (!alreadySent) {
              appLogger.info(
                { tenantId: row.tenant_id, tenantName: row.Tenant?.name, localTimeStr, targetSeninJam, timezone },
                '[UpacaraDispatcher] Memicu siaran pengumuman Upacara Senin Pagi (Catch-up / Scheduled window)'
              );
              const res = await this.sendSeninGroupReminder(row.tenant_id, false);
              if (res.success && !res.skipped) sentCount++;
              else if (res.skipped) skippedCount++;
            }
          }
        }

        // ── 2. EVALUASI PENGINGAT GLADI HARI JUM'AT SIANG (PERSONAL WA) ─────────
        // Cutoff Jam 20:00: Toleransi catch-up jika server di-reboot antara jam target (misal 13:30) hingga 20:00
        if (hariEnum === Hari.JUMAT && config.jumatReminderEnabled) {
          const targetJumatJam = (config.jumatJam || '13:30').trim();
          const cutoffJumatJam = '20:00';

          if (localTimeStr >= targetJumatJam && localTimeStr <= cutoffJumatJam) {
            // Hitung tanggal hari Senin depan
            const [y, m, d] = todayDateStr.split('-').map(Number);
            const targetMonday = new Date(Date.UTC(y, m - 1, d + 3));
            const nextMondayStr = targetMonday.toISOString().split('T')[0];

            const idempotencyRelatedId = `UPACARA:${nextMondayStr}:JUMAT_GLADI`;
            const alreadySent = await prisma.notificationLog.findFirst({
              where: {
                tenant_id: row.tenant_id,
                event: 'UPACARA_REMINDER_JUMAT',
                related_id: idempotencyRelatedId,
                status: 'SENT',
              },
              select: { id: true },
            });

            if (!alreadySent) {
              appLogger.info(
                { tenantId: row.tenant_id, tenantName: row.Tenant?.name, localTimeStr, targetJumatJam, timezone },
                '[UpacaraDispatcher] Memicu pengingat gladi persiapan Upacara Jum\'at (Catch-up / Scheduled window)'
              );
              const res = await this.sendJumatPreparationReminder(row.tenant_id, false);
              if (res.success && !res.skipped) sentCount++;
              else if (res.skipped) skippedCount++;
            }
          }
        }
      } catch (err: any) {
        appLogger.error(
          { tenantId: row.tenant_id, error: err?.message },
          '[UpacaraDispatcher] Gagal mengevaluasi pengingat upacara untuk tenant'
        );
      }
    }

    return { processedCount, sentCount, skippedCount };
  },
};

