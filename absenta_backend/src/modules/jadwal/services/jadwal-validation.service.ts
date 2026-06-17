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
  tanggal?: Date; // Required for MANUAL context
  
  // Resources
  kelas_id?: string;
  guru_id?: string;
  
  // Exclusions (for edit scenarios)
  exclude_jadwal_template_id?: string;
  exclude_sesi_id?: string;
}

export interface ValidationResult {
  is_valid: boolean;
  error?: {
    code: 'KELAS_CONFLICT' | 'GURU_CONFLICT' | 'INVALID_TIME';
    message: string;
    details: any;
  };
}

export class JadwalValidationService {
  /**
   * Validates both Class and Teacher conflicts against:
   * 1. JadwalTemplate (Plan)
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
            message: `Kelas memiliki jadwal lain pada jam ${jam_mulai} - ${jam_selesai}`,
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
    }

    return { is_valid: true };
  }

  private async checkClassConflict(params: ValidationParams) {
    // A. Check against JadwalTemplate
    const templateConflict = await prisma.jadwalTemplate.findFirst({
      where: {
        tenant_id: params.tenant_id,
        tahun_pelajaran_id: params.tahun_pelajaran_id,
        semester_id: params.semester_id,
        hari: params.hari,
        kelas_id: params.kelas_id, // Same Class
        id: params.exclude_jadwal_template_id ? { not: params.exclude_jadwal_template_id } : undefined,
        // Overlap Logic: (StartA < EndB) && (EndA > StartB)
        jam_mulai: { lt: params.jam_selesai },
        jam_selesai: { gt: params.jam_mulai },
      },
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
    // A. Check against JadwalTemplate
    const templateConflict = await prisma.jadwalTemplate.findFirst({
      where: {
        tenant_id: params.tenant_id,
        tahun_pelajaran_id: params.tahun_pelajaran_id,
        semester_id: params.semester_id,
        hari: params.hari,
        guru_id: params.guru_id, // Same Teacher
        id: params.exclude_jadwal_template_id ? { not: params.exclude_jadwal_template_id } : undefined,
        // Overlap Logic
        jam_mulai: { lt: params.jam_selesai },
        jam_selesai: { gt: params.jam_mulai },
      },
      include: {
        Kelas: true,
        Mapel: true,
      },
    });

    if (templateConflict) {
      return {
        source: 'TEMPLATE',
        id: templateConflict.id,
        kelas: templateConflict.Kelas.nama_kelas,
        mapel: templateConflict.Mapel?.nama_mapel || 'N/A',
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
