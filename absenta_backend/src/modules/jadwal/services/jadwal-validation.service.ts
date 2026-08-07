import { Hari } from '@prisma/client';
import { prisma } from '@/utils/prisma';

export type ValidationContext = 'TEMPLATE' | 'MANUAL';

export interface ValidationParams {
  tenant_id: string;
  tahun_pelajaran_id: string;
  semester_id: string;
  
  // Waktu
  hari: Hari;
  jam_mulai: string; // Format "HH:mm"
  jam_selesai: string; // Format "HH:mm"
  slot_index?: number;
  tanggal?: Date; // Required for MANUAL context
  
  // Resources
  kelas_id?: string;
  guru_id?: string;
  
  // Exclusions (for edit scenarios)
  exclude_jadwal_kbm_id?: string;
  exclude_sesi_id?: string;
}

export interface ValidationResult {
  is_valid: boolean;
  error?: {
    code: 'KELAS_CONFLICT' | 'GURU_CONFLICT' | 'INVALID_TIME' | 'GURU_MAX_HOURS_EXCEEDED';
    message: string;
    details: any;
  };
}

export class JadwalValidationService {
  /**
   * Validates both Class and Teacher conflicts against:
   * 1. JadwalKBM (Plan)
   * 2. SesiAbsensi (Realization)
   */
  async validateConflict(params: ValidationParams): Promise<ValidationResult> {
    const { jam_mulai, jam_selesai } = params;

    if (jam_mulai >= jam_selesai) {
      return {
        is_valid: false,
        error: {
          code: 'INVALID_TIME',
          message: 'Waktu mulai harus lebih kecil dari waktu selesai',
          details: { jam_mulai, jam_selesai },
        },
      };
    }

    // 1. Check Class Conflict
    if (params.kelas_id) {
      const classConflict = await this.checkClassConflict(params);
      if (classConflict) {
        return {
          is_valid: false,
          error: {
            code: 'KELAS_CONFLICT',
            message: `Kelas memiliki jadwal lain pada slot waktu tersebut`,
            details: classConflict,
          },
        };
      }
    }

    // 2. Check Teacher Conflict
    if (params.guru_id) {
      const teacherConflict = await this.checkTeacherConflict(params);
      if (teacherConflict) {
        return {
          is_valid: false,
          error: {
            code: 'GURU_CONFLICT',
            message: `Guru memiliki jadwal lain pada jam ${jam_mulai} - ${jam_selesai}`,
            details: teacherConflict,
          },
        };
      }

      // 3. Check Teacher Max Hours (Per-day limit: Senin 10 JP, Selasa-Kamis 12 JP, Jumat 6 JP)
      const maxHoursExceeded = await this.checkTeacherMaxHours(params);
      if (maxHoursExceeded) {
        return {
          is_valid: false,
          error: {
            code: 'GURU_MAX_HOURS_EXCEEDED',
            message: `Guru mengajar melebihi batas maksimal ${maxHoursExceeded.max_jp} jam pelajaran (${maxHoursExceeded.max_minutes} menit) pada hari ${params.hari}. Akumulasi saat ini: ${maxHoursExceeded.current_minutes} menit.`,
            details: maxHoursExceeded,
          },
        };
      }
    }

    return { is_valid: true };
  }

  private async checkClassConflict(params: ValidationParams) {
    // A. Check against JadwalKBM
    const whereClause: any = {
      tenant_id: params.tenant_id,
      tahun_pelajaran_id: params.tahun_pelajaran_id,
      semester_id: params.semester_id,
      hari: params.hari,
      kelas_id: params.kelas_id, // Same Class
      id: params.exclude_jadwal_kbm_id ? { not: params.exclude_jadwal_kbm_id } : undefined,
    };

    if (typeof params.slot_index === 'number') {
      whereClause.slot_index = params.slot_index;
    } else {
      // Overlap Logic: (StartA < EndB) && (EndA > StartB)
      whereClause.jam_mulai = { lt: params.jam_selesai };
      whereClause.jam_selesai = { gt: params.jam_mulai };
    }

    const templateConflict = await prisma.jadwalKBM.findFirst({
      where: whereClause,
      include: {
        Mapel: true,
        Guru: true,
      },
    });

    if (templateConflict) {
      return {
        source: 'TEMPLATE',
        id: templateConflict.id,
        mapel: templateConflict.Mapel?.nama_mapel || 'N/A',
        guru: templateConflict.Guru?.nama_guru || 'N/A',
        waktu: `${templateConflict.jam_mulai} - ${templateConflict.jam_selesai}`,
      };
    }

    // B. Check against SesiAbsensi (Only if specific date is provided - MANUAL context)
    if (params.tanggal) {
      // Need to convert string times to DateTimes for comparison within the specific day
      // But SesiAbsensi stores DateTime. 
      // We can query by overlapping time range on that specific date.
      
      const startOfDay = new Date(params.tanggal);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(params.tanggal);
      endOfDay.setHours(23, 59, 59, 999);

      // Construct Check Start/End DateTimes
      const checkStart = this.combineDateAndTime(params.tanggal, params.jam_mulai);
      const checkEnd = this.combineDateAndTime(params.tanggal, params.jam_selesai);

      const sesiConflict = await prisma.sesiAbsensi.findFirst({
        where: {
          tenant_id: params.tenant_id,
          kelas_id: params.kelas_id, // Same Class
          tanggal: {
            gte: startOfDay,
            lte: endOfDay,
          },
          id: params.exclude_sesi_id ? { not: params.exclude_sesi_id } : undefined,
          // Status check? Usually we count BERLANGSUNG/SELESAI/DRAFT as conflict.
          // Maybe exclude cancelled ones if status exists?
          // Assuming all current statuses count as occupied slot.
          
          // Overlap: (StartA < EndB) && (EndA > StartB)
          waktu_mulai: { lt: checkEnd },
          waktu_selesai: { gt: checkStart },
        },
        include: {
          Mapel: true,
          Guru: true,
        },
      });

      if (sesiConflict) {
        return {
          source: 'SESI_ABSENSI',
          id: sesiConflict.id,
          mapel: sesiConflict.Mapel?.nama_mapel || 'N/A',
          guru: sesiConflict.Guru?.nama_guru || 'N/A',
          // Format time for display
          waktu: `${this.formatTime(sesiConflict.waktu_mulai)} - ${this.formatTime(sesiConflict.waktu_selesai!)}`,
        };
      }
    }

    return null;
  }

  private async checkTeacherConflict(params: ValidationParams) {
    // A. Check against JadwalKBM
    const templateConflict = await prisma.jadwalKBM.findFirst({
      where: {
        tenant_id: params.tenant_id,
        tahun_pelajaran_id: params.tahun_pelajaran_id,
        semester_id: params.semester_id,
        hari: params.hari,
        guru_id: params.guru_id, // Same Teacher
        id: params.exclude_jadwal_kbm_id ? { not: params.exclude_jadwal_kbm_id } : undefined,
        // Overlap Logic
        jam_mulai: { lt: params.jam_selesai },
        jam_selesai: { gt: params.jam_mulai },
      },
      include: {
        Kelas: true,
        Mapel: true,
        MasterRuangan: true,
      },
    });

    if (templateConflict) {
      return {
        source: 'TEMPLATE',
        id: templateConflict.id,
        kelas: templateConflict.Kelas.nama_kelas,
        mapel: templateConflict.Mapel?.nama_mapel || 'N/A',
        ruangan: templateConflict.MasterRuangan?.nama_ruangan || 'N/A',
        waktu: `${templateConflict.jam_mulai} - ${templateConflict.jam_selesai}`,
      };
    }

    // B. Check against SesiAbsensi (Only if specific date is provided - MANUAL context)
    if (params.tanggal) {
      const startOfDay = new Date(params.tanggal);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(params.tanggal);
      endOfDay.setHours(23, 59, 59, 999);

      const checkStart = this.combineDateAndTime(params.tanggal, params.jam_mulai);
      const checkEnd = this.combineDateAndTime(params.tanggal, params.jam_selesai);

      const sesiConflict = await prisma.sesiAbsensi.findFirst({
        where: {
          tenant_id: params.tenant_id,
          guru_id: params.guru_id, // Same Teacher
          tanggal: {
            gte: startOfDay,
            lte: endOfDay,
          },
          id: params.exclude_sesi_id ? { not: params.exclude_sesi_id } : undefined,
          // Overlap Logic
          waktu_mulai: { lt: checkEnd },
          waktu_selesai: { gt: checkStart },
        },
        include: {
          Kelas: true,
          Mapel: true,
        },
      });

      if (sesiConflict) {
        return {
          source: 'SESI_ABSENSI',
          id: sesiConflict.id,
          kelas: sesiConflict.Kelas.nama_kelas,
          mapel: sesiConflict.Mapel?.nama_mapel || 'N/A',
          waktu: `${this.formatTime(sesiConflict.waktu_mulai)} - ${this.formatTime(sesiConflict.waktu_selesai!)}`,
        };
      }
    }

    return null;
  }

  private async checkTeacherMaxHours(params: ValidationParams) {
    const DEFAULT_DAILY_MAX_JP: Record<string, number> = {
      SENIN: 10,
      SELASA: 12,
      RABU: 12,
      KAMIS: 12,
      JUMAT: 6,
      SABTU: 6,
      MINGGU: 0,
    };

    let maxJpForDay = DEFAULT_DAILY_MAX_JP[params.hari] ?? 8;
    if (params.tenant_id) {
      try {
        const configRecord = await prisma.config.findFirst({
          where: { tenant_id: params.tenant_id, key: 'shift_jam_pelajaran' },
          select: { value: true },
        });
        if (configRecord?.value) {
          const config = JSON.parse(configRecord.value);
          if (config.daily_max_jp && typeof config.daily_max_jp[params.hari] === 'number') {
            maxJpForDay = config.daily_max_jp[params.hari];
          }
        }
      } catch (err) {
        // Fallback to default mapping if tenant config query fails
      }
    }

    const MAX_TEACHING_MINUTES = maxJpForDay * 45; // JP @ 45 minutes

    const [startH, startM] = params.jam_mulai.split(':').map(Number);
    const [endH, endM] = params.jam_selesai.split(':').map(Number);
    const requestedDuration = (endH * 60 + endM) - (startH * 60 + startM);

    if (requestedDuration <= 0) return null;

    let totalExistingMinutes = 0;

    // A. Check in JadwalKBM
    const templates = await prisma.jadwalKBM.findMany({
      where: {
        tenant_id: params.tenant_id,
        tahun_pelajaran_id: params.tahun_pelajaran_id,
        semester_id: params.semester_id,
        hari: params.hari,
        guru_id: params.guru_id,
        id: params.exclude_jadwal_kbm_id ? { not: params.exclude_jadwal_kbm_id } : undefined,
      },
    });

    for (const temp of templates) {
      const [sH, sM] = temp.jam_mulai.split(':').map(Number);
      const [eH, eM] = temp.jam_selesai.split(':').map(Number);
      const duration = (eH * 60 + eM) - (sH * 60 + sM);
      if (duration > 0) totalExistingMinutes += duration;
    }

    // B. Check in SesiAbsensi (Manual KBM context)
    if (params.tanggal) {
      const startOfDay = new Date(params.tanggal);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(params.tanggal);
      endOfDay.setHours(23, 59, 59, 999);

      const sesis = await prisma.sesiAbsensi.findMany({
        where: {
          tenant_id: params.tenant_id,
          guru_id: params.guru_id,
          tanggal: {
            gte: startOfDay,
            lte: endOfDay,
          },
          id: params.exclude_sesi_id ? { not: params.exclude_sesi_id } : undefined,
        },
      });

      for (const sesi of sesis) {
        if (sesi.waktu_mulai && sesi.waktu_selesai) {
          const duration = Math.round((sesi.waktu_selesai.getTime() - sesi.waktu_mulai.getTime()) / 60000);
          if (duration > 0) totalExistingMinutes += duration;
        }
      }
    }

    const grandTotal = totalExistingMinutes + requestedDuration;

    if (grandTotal > MAX_TEACHING_MINUTES) {
      return {
        requested_minutes: requestedDuration,
        existing_minutes: totalExistingMinutes,
        current_minutes: grandTotal,
        max_minutes: MAX_TEACHING_MINUTES,
        max_jp: maxJpForDay,
      };
    }

    return null;
  }

  // Helper to combine Date object with "HH:mm" string
  private combineDateAndTime(date: Date, timeString: string): Date {
    const [hours, minutes] = timeString.split(':').map(Number);
    const result = new Date(date);
    result.setHours(hours, minutes, 0, 0);
    return result;
  }

  // Helper to format Date to "HH:mm"
  private formatTime(date: Date): string {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  }
}
