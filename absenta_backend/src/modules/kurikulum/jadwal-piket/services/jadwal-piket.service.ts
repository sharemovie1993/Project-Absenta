import { prisma } from '../../../../utils/prisma';
import { Hari } from '@prisma/client';
import { cacheInvalidationService } from '../../../../utils/cache-invalidation.service';

export class JadwalPiketService {
  /**
   * Helper untuk mendapatkan nama Hari Enum dari Javascript Date berbasis Timezone Tenant
   */
  private getHariEnum(date: Date = new Date(), timezone: string = 'Asia/Jakarta'): Hari {
    const dayName = new Intl.DateTimeFormat('en-US', { timeZone: timezone, weekday: 'short' }).format(date);
    const dayMap: Record<string, Hari> = {
      Sun: 'MINGGU',
      Mon: 'SENIN',
      Tue: 'SELASA',
      Wed: 'RABU',
      Thu: 'KAMIS',
      Fri: 'JUMAT',
      Sat: 'SABTU'
    };
    return dayMap[dayName] || 'SENIN';
  }

  /**
   * Helper untuk mengambil timezone tenant (default: Asia/Jakarta)
   */
  async getTenantTimezone(tenantId: string): Promise<string> {
    try {
      const config = await prisma.config.findFirst({
        where: { tenant_id: tenantId, key: 'TIMEZONE' }
      });
      if (config?.value) return config.value;
    } catch (_) {}
    return 'Asia/Jakarta';
  }

  /**
   * 1. Ambil Semua Jadwal Piket Guru dengan Filter
   */
  async getJadwalPiketList(tenantId: string, filter: {
    tahun_pelajaran_id?: string;
    semester_id?: string;
    hari?: Hari;
    guru_id?: string;
  }) {
    // Jika tahun_pelajaran_id / semester_id tidak diberikan, coba ambil yang aktif
    let tpId = filter.tahun_pelajaran_id;
    let semId = filter.semester_id;

    if (!tpId) {
      const activeTp = await prisma.tahunPelajaran.findFirst({
        where: { tenant_id: tenantId, is_active: true }
      });
      if (activeTp) tpId = activeTp.id;
    }

    if (!semId) {
      const activeSem = await prisma.semester.findFirst({
        where: { tenant_id: tenantId, is_active: true }
      });
      if (activeSem) semId = activeSem.id;
    }

    const whereCondition: Record<string, unknown> = {
      tenant_id: tenantId,
    };

    if (tpId) whereCondition.tahun_pelajaran_id = tpId;
    if (semId) whereCondition.semester_id = semId;
    if (filter.hari) whereCondition.hari = filter.hari;
    if (filter.guru_id) whereCondition.guru_id = filter.guru_id;

    return await prisma.jadwalPiketGuru.findMany({
      where: whereCondition,
      include: {
        Guru: {
          select: {
            id: true,
            nama_guru: true,
            nip: true,
            foto: true,
            no_hp: true,
            jenis_ptk: true,
          }
        },
        TahunPelajaran: { select: { tahun: true, is_active: true } },
        Semester: { select: { nama_semester: true, is_active: true } }
      },
      orderBy: [
        { hari: 'asc' },
        { created_at: 'asc' }
      ]
    });
  }

  /**
   * 2. Ambil Guru Piket Bertugas Hari Ini (Resolusi Otomatis untuk Modul Piket Kesiswaan)
   */
  async getJadwalPiketHariIni(tenantId: string) {
    const today = new Date();
    const hariIni = this.getHariEnum(today);

    // Ambil TP & Semester Aktif
    const activeTp = await prisma.tahunPelajaran.findFirst({
      where: { tenant_id: tenantId, is_active: true }
    });

    const activeSem = await prisma.semester.findFirst({
      where: { tenant_id: tenantId, is_active: true }
    });

    const whereClause: Record<string, unknown> = {
      tenant_id: tenantId,
      hari: hariIni
    };

    if (activeTp) whereClause.tahun_pelajaran_id = activeTp.id;
    if (activeSem) whereClause.semester_id = activeSem.id;

    const list = await prisma.jadwalPiketGuru.findMany({
      where: whereClause,
      include: {
        Guru: {
          select: {
            id: true,
            nama_guru: true,
            nip: true,
            foto: true,
            no_hp: true,
          }
        }
      },
      orderBy: { created_at: 'asc' }
    });

    return {
      hari: hariIni,
      tanggal: today.toISOString().split('T')[0],
      total_guru_piket: list.length,
      guru_piket: list
    };
  }

  /**
   * 3. Buat Penugasan Piket Baru Single Guru
   */
  async createJadwalPiket(tenantId: string, data: {
    tahun_pelajaran_id: string;
    semester_id: string;
    guru_id: string;
    hari: Hari;
    pos_piket?: string;
    slot_mulai?: number;
    slot_selesai?: number;
    jam_mulai?: string;
    jam_selesai?: string;
    catatan?: string;
  }) {
    // Cek duplikasi penugasan guru di hari dan semester yang sama
    const existing = await prisma.jadwalPiketGuru.findFirst({
      where: {
        tenant_id: tenantId,
        tahun_pelajaran_id: data.tahun_pelajaran_id,
        semester_id: data.semester_id,
        guru_id: data.guru_id,
        hari: data.hari
      }
    });

    if (existing) {
      throw new Error(`Guru tersebut sudah memiliki jadwal piket pada hari ${data.hari}`);
    }

    const created = await prisma.jadwalPiketGuru.create({
      data: {
        tenant_id: tenantId,
        tahun_pelajaran_id: data.tahun_pelajaran_id,
        semester_id: data.semester_id,
        guru_id: data.guru_id,
        hari: data.hari,
        pos_piket: data.pos_piket || 'Piket Umum',
        slot_mulai: data.slot_mulai ?? 1,
        slot_selesai: data.slot_selesai ?? 10,
        jam_mulai: data.jam_mulai,
        jam_selesai: data.jam_selesai,
        catatan: data.catatan
      },
      include: {
        Guru: { select: { nama_guru: true, nip: true } }
      }
    });

    await cacheInvalidationService.invalidateJadwalKbmCache(tenantId);
    return created;
  }

  /**
   * 4. Buat Penugasan Piket Massal (Bulk Assign)
   */
  async bulkAssignJadwalPiket(tenantId: string, data: {
    tahun_pelajaran_id: string;
    semester_id: string;
    hari: Hari;
    guru_ids: string[];
    pos_piket?: string;
    slot_mulai?: number;
    slot_selesai?: number;
    jam_mulai?: string;
    jam_selesai?: string;
  }) {
    const createdItems = [];
    for (const guruId of data.guru_ids) {
      const existing = await prisma.jadwalPiketGuru.findFirst({
        where: {
          tenant_id: tenantId,
          tahun_pelajaran_id: data.tahun_pelajaran_id,
          semester_id: data.semester_id,
          guru_id: guruId,
          hari: data.hari
        }
      });

      if (!existing) {
        const created = await prisma.jadwalPiketGuru.create({
          data: {
            tenant_id: tenantId,
            tahun_pelajaran_id: data.tahun_pelajaran_id,
            semester_id: data.semester_id,
            guru_id: guruId,
            hari: data.hari,
            pos_piket: data.pos_piket || 'Piket Umum',
            slot_mulai: data.slot_mulai ?? 1,
            slot_selesai: data.slot_selesai ?? 10,
            jam_mulai: data.jam_mulai,
            jam_selesai: data.jam_selesai
          }
        });
        createdItems.push(created);
      }
    }
    if (createdItems.length > 0) {
      await cacheInvalidationService.invalidateJadwalKbmCache(tenantId);
    }
    return createdItems;
  }

  /**
   * 5. Update Penugasan Piket
   */
  async updateJadwalPiket(tenantId: string, id: string, data: {
    hari?: Hari;
    pos_piket?: string;
    slot_mulai?: number;
    slot_selesai?: number;
    jam_mulai?: string;
    jam_selesai?: string;
    catatan?: string;
  }) {
    const updated = await prisma.jadwalPiketGuru.update({
      where: { id, tenant_id: tenantId },
      data
    });

    await cacheInvalidationService.invalidateJadwalKbmCache(tenantId);
    return updated;
  }

  /**
   * 6. Hapus Penugasan Piket
   */
  async deleteJadwalPiket(tenantId: string, id: string) {
    const deleted = await prisma.jadwalPiketGuru.delete({
      where: { id, tenant_id: tenantId }
    });

    await cacheInvalidationService.invalidateJadwalKbmCache(tenantId);
    return deleted;
  }

  /**
   * 7. Ambil Peta Beban Mengajar (Jadwal KBM) Guru per Hari untuk Validasi Piket
   */
  async getGuruTeachingLoadMap(tenantId: string, tahunPelajaranId: string, semesterId: string, hari?: Hari) {
    const whereClause: Record<string, unknown> = {
      tenant_id: tenantId,
      guru_id: { not: null }
    };

    if (tahunPelajaranId) whereClause.tahun_pelajaran_id = tahunPelajaranId;
    if (semesterId) whereClause.semester_id = semesterId;
    if (hari) whereClause.hari = hari;

    const kbmList = await prisma.jadwalKBM.findMany({
      where: whereClause,
      include: {
        Kelas: { select: { nama_kelas: true } },
        Mapel: { select: { nama_mapel: true } }
      }
    });

    const loadMap: Record<string, { total_jp: number; busy_slots: number[]; detail: Array<{ kelas: string; mapel: string; slot_index?: number; jam: string }> }> = {};

    for (const kbm of kbmList) {
      if (!kbm.guru_id) continue;
      if (!loadMap[kbm.guru_id]) {
        loadMap[kbm.guru_id] = { total_jp: 0, busy_slots: [], detail: [] };
      }
      loadMap[kbm.guru_id].total_jp += 1;
      if (typeof kbm.slot_index === 'number' && !loadMap[kbm.guru_id].busy_slots.includes(kbm.slot_index)) {
        loadMap[kbm.guru_id].busy_slots.push(kbm.slot_index);
      }
      loadMap[kbm.guru_id].detail.push({
        kelas: kbm.Kelas?.nama_kelas || 'Kelas',
        mapel: kbm.Mapel?.nama_mapel || 'Mapel',
        slot_index: kbm.slot_index,
        jam: `${kbm.jam_mulai} - ${kbm.jam_selesai}`
      });
    }

    return loadMap;
  }

  /**
   * 7. Ambil Konfigurasi Notifikasi WA Group Piket
   */
  async getPiketNotifConfig(tenantId: string) {
    const configRow = await prisma.config.findFirst({
      where: { tenant_id: tenantId, key: 'PIKET_WA_NOTIF_CONFIG' }
    });

    const defaultConfig = {
      enabled: false,
      targetGroupId: '',
      targetGroupName: '',
      nightEnabled: true,
      nightTime: '23:00',
      morningEnabled: true,
      morningTime: '05:00',
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
  }

  /**
   * 8. Simpan Konfigurasi Notifikasi WA Group Piket
   */
  async savePiketNotifConfig(tenantId: string, payload: any) {
    const existing = await this.getPiketNotifConfig(tenantId);
    const updated = { ...existing, ...payload };

    const existingRow = await prisma.config.findFirst({
      where: { tenant_id: tenantId, key: 'PIKET_WA_NOTIF_CONFIG' }
    });

    if (existingRow) {
      await prisma.config.update({
        where: { id: existingRow.id },
        data: { value: JSON.stringify(updated) }
      });
    } else {
      await prisma.config.create({
        data: {
          tenant_id: tenantId,
          key: 'PIKET_WA_NOTIF_CONFIG',
          value: JSON.stringify(updated)
        }
      });
    }

    return updated;
  }


  /**
   * 9. Format Pesan WhatsApp Jadwal Piket Guru (Dikelompokkan berdasarkan Jam & Pos Piket dengan Divider)
   */
  async formatPiketScheduleMessage(tenantId: string, dateTarget: Date, isNightReminder: boolean): Promise<string> {
    const timezone = await this.getTenantTimezone(tenantId);
    const hariTarget = this.getHariEnum(dateTarget, timezone);

    const activeTp = await prisma.tahunPelajaran.findFirst({
      where: { tenant_id: tenantId, is_active: true }
    });
    const activeSem = await prisma.semester.findFirst({
      where: { tenant_id: tenantId, is_active: true }
    });

    const whereClause: Record<string, unknown> = {
      tenant_id: tenantId,
      hari: hariTarget
    };
    if (activeTp) whereClause.tahun_pelajaran_id = activeTp.id;
    if (activeSem) whereClause.semester_id = activeSem.id;

    const list = await prisma.jadwalPiketGuru.findMany({
      where: whereClause,
      include: {
        Guru: {
          select: {
            nama_guru: true,
            nip: true,
            no_hp: true
          }
        }
      },
      orderBy: [
        { jam_mulai: 'asc' },
        { pos_piket: 'asc' },
        { created_at: 'asc' }
      ]
    });

    const tglStr = dateTarget.toLocaleDateString('id-ID', {
      timeZone: timezone,
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

    const hariStatus = isNightReminder ? `BESOK HARI (${tglStr})` : `HARI INI (${tglStr})`;

    let msg = `🛡️ *SISTEM PENGINGAT JADWAL PIKET GURU*\n📅 *${hariStatus}*\n\n`;

    if (list.length === 0) {
      msg += `ℹ️ Tidak ada jadwal penugasan piket guru untuk ${isNightReminder ? 'besok hari' : 'hari ini'}. Libur atau belum diset di sistem Absenta.\n`;
    } else {
      // Helper untuk membangun header waktu secara dinamis dari data DB tanpa hardcoded string
      const buildWaktuHeader = (items: typeof list) => {
        let minSlot: number | null = null;
        let maxSlot: number | null = null;
        let minJamMulai: string | null = null;
        let maxJamSelesai: string | null = null;

        items.forEach((item) => {
          if (typeof item.slot_mulai === 'number') {
            if (minSlot === null || item.slot_mulai < minSlot) minSlot = item.slot_mulai;
          }
          if (typeof item.slot_selesai === 'number') {
            if (maxSlot === null || item.slot_selesai > maxSlot) maxSlot = item.slot_selesai;
          }
          if (item.jam_mulai) {
            if (minJamMulai === null || item.jam_mulai < minJamMulai) minJamMulai = item.jam_mulai;
          }
          if (item.jam_selesai) {
            if (maxJamSelesai === null || item.jam_selesai > maxJamSelesai) maxJamSelesai = item.jam_selesai;
          }
        });

        let slotLabel = '';
        if (minSlot !== null && maxSlot !== null) {
          slotLabel = minSlot === maxSlot ? `Jam Ke ${minSlot}` : `Jam Ke ${minSlot} - ${maxSlot}`;
        } else if (minSlot !== null) {
          slotLabel = `Jam Ke ${minSlot}`;
        }

        let jamLabel = '';
        if (minJamMulai && maxJamSelesai) {
          jamLabel = `(${minJamMulai} s/d ${maxJamSelesai})`;
        } else if (minJamMulai) {
          jamLabel = `(${minJamMulai})`;
        }

        const fullTimeStr = [slotLabel, jamLabel].filter(Boolean).join(' ');
        return fullTimeStr ? `⏰ *WAKTU : ${fullTimeStr}*\n` : '';
      };

      // Pisahkan Piket Umum (dikelompokkan dinamis berdasar rentang slot/shift) & Piket Jurusan
      const piketUmumGroupsMap = new Map<string, { slotMulai: number; items: typeof list }>();
      const piketJurusan: typeof list = [];

      list.forEach((item) => {
        const posKey = (item.pos_piket || '').toUpperCase().trim();
        const isJurusan = posKey.includes('JURUSAN');

        if (isJurusan) {
          piketJurusan.push(item);
        } else {
          const slotM = item.slot_mulai ?? 1;
          const slotS = item.slot_selesai ?? 10;
          const key = `${slotM}-${slotS}`;

          if (!piketUmumGroupsMap.has(key)) {
            piketUmumGroupsMap.set(key, { slotMulai: slotM, items: [] });
          }
          piketUmumGroupsMap.get(key)!.items.push(item);
        }
      });

      // Sort kelompok Piket Umum berdasarkan slotMulai terkecil
      const sortedUmumGroups = Array.from(piketUmumGroupsMap.values()).sort((a, b) => a.slotMulai - b.slotMulai);
      const sections: string[] = [];

      // Render setiap kelompok Piket Umum
      sortedUmumGroups.forEach((group) => {
        const waktuHeader = buildWaktuHeader(group.items);
        let sec = `${waktuHeader}📌 *PIKET UMUM*\n`;
        group.items.forEach((item) => {
          const namaGuru = item.Guru?.nama_guru || '-';
          sec += `* 👨‍🏫 ${namaGuru}\n`;
        });
        sections.push(sec);
      });

      // Render kelompok Piket Jurusan
      if (piketJurusan.length > 0) {
        let sec = `📌 *PIKET JURUSAN*\n`;
        piketJurusan.forEach((item) => {
          const namaGuru = item.Guru?.nama_guru || '-';
          let detail = (item.catatan || '').trim();
          if (!detail) {
            const posClean = (item.pos_piket || '').replace(/^piket\s+jurusan\s*/i, '').trim();
            if (posClean) detail = posClean;
          }
          const detailStr = detail ? (detail.startsWith('(') ? ` ${detail}` : ` (${detail})`) : '';
          sec += `* 👨‍🏫 ${namaGuru}${detailStr}\n`;
        });
        sections.push(sec);
      }

      msg += sections.join('\n') + '\n';
      msg += `💡 Mohon Bapak/Ibu Petugas Piket hadir tepat waktu dan menjalankan tugas dengan penuh tanggung jawab. Terima kasih! 😊\n\n`;
      msg += `🤖 _Pesan pengingat otomatis ini dikirimkan oleh *Sistem Absenta*._\n`;
    }

    return msg;
  }




  /**
   * 10. Kirim Pengingat Piket ke WA Group
   */
  async sendPiketReminderToGroup(tenantId: string, isNightReminder: boolean, overrideTargetGroupId?: string): Promise<{ success: boolean; message: string }> {
    const config = await this.getPiketNotifConfig(tenantId);
    const targetGroupId = overrideTargetGroupId || config.targetGroupId;

    if (!targetGroupId) {
      throw new Error('Group WA tujuan belum ditentukan. Silakan atur Group Tujuan di Pengaturan Notifikasi Piket.');
    }

    const timezone = await this.getTenantTimezone(tenantId);

    // Tentukan tanggal target sesuai timezone tenant:
    // Format YYYY-MM-DD lokal tenant
    const nowStr = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
    const dateTarget = new Date(`${nowStr}T12:00:00Z`);

    if (isNightReminder) {
      dateTarget.setDate(dateTarget.getDate() + 1);
    }

    const messageText = await this.formatPiketScheduleMessage(tenantId, dateTarget, isNightReminder);

    const { waGatewayService } = await import('../../../../services/wa-gateway.service');
    await waGatewayService.sendMessageToJid(tenantId, targetGroupId, messageText);

    return {
      success: true,
      message: `Pengingat piket guru berhasil dikirimkan ke Group WA (${targetGroupId})`
    };
  }
}

