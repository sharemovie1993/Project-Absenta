import { prisma } from '../../../../utils/prisma';
import { Hari } from '@prisma/client';

export class JadwalPiketService {
  /**
   * Helper untuk mendapatkan nama Hari Enum dari Javascript Date
   */
  private getHariEnum(date: Date = new Date()): Hari {
    const days: Hari[] = ['MINGGU', 'SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU'];
    return days[date.getDay()];
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

    return await prisma.jadwalPiketGuru.create({
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
    return await prisma.jadwalPiketGuru.update({
      where: { id, tenant_id: tenantId },
      data
    });
  }

  /**
   * 6. Hapus Penugasan Piket
   */
  async deleteJadwalPiket(tenantId: string, id: string) {
    return await prisma.jadwalPiketGuru.delete({
      where: { id, tenant_id: tenantId }
    });
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
}
