import { ATTENDANCE_POINTS } from '../../constants/attendance-points';

export interface GateTapItem {
  arah: string;
  status: string;
  is_terlambat?: boolean;
  waktu_tap?: Date | string | null;
}

export interface ClassTapItem {
  status: string;
  is_terlambat?: boolean;
  waktu_tap?: Date | string | null;
}

export interface CalculatedHybridResult {
  status: string;
  isLate: boolean;
  points: number;
}

/**
 * AttendanceRuleEngine (Pure Business Domain Engine)
 * Centralized Single Source of Truth for hybrid attendance status resolution and point calculations.
 * Completely pure (Zero DB I/O) for lightning fast execution and 100% deterministic results.
 */
export class AttendanceRuleEngine {
  /**
   * Resolves hybrid attendance status across Gate, Classroom, and PKL taps.
   */
  public static calculateHybridStatus(
    gateTaps: GateTapItem[] = [],
    classTaps: ClassTapItem[] = [],
    pklAbsen?: { status: string } | null
  ): CalculatedHybridResult {
    const hasGateHadir = gateTaps.some(g => g.status === 'HADIR');
    const hasGateLate = gateTaps.some(g => g.is_terlambat === true);

    const hasClassHadir = classTaps.some(c => c.status === 'HADIR');
    const hasClassLate = classTaps.some(c => c.is_terlambat === true);

    const hasClassSakit = classTaps.some(c => c.status === 'SAKIT');
    const hasClassIzin = classTaps.some(c => c.status === 'IZIN');
    const hasGateSakit = gateTaps.some(g => g.status === 'SAKIT');
    const hasGateIzin = gateTaps.some(g => g.status === 'IZIN');

    let finalStatus = 'ALPA';
    let isLate = false;

    if (hasGateHadir || hasClassHadir || (pklAbsen && pklAbsen.status === 'HADIR')) {
      finalStatus = 'HADIR';
      if (hasGateLate || hasClassLate) {
        isLate = true;
      }
    } else if (hasGateSakit || hasClassSakit || (pklAbsen && pklAbsen.status === 'SAKIT')) {
      finalStatus = 'SAKIT';
    } else if (hasGateIzin || hasClassIzin || (pklAbsen && pklAbsen.status === 'IZIN')) {
      finalStatus = 'IZIN';
    }

    const points = this.calculateAttendancePoints(finalStatus, isLate);

    return {
      status: finalStatus,
      isLate,
      points
    };
  }

  /**
   * Calculates attendance point weight based on status and late flags.
   */
  public static calculateAttendancePoints(status: string, isLate: boolean = false): number {
    switch (status) {
      case 'HADIR':
        return isLate ? ATTENDANCE_POINTS.HADIR_TERLAMBAT : ATTENDANCE_POINTS.HADIR_TEPAT_WAKTU;
      case 'SAKIT':
        return ATTENDANCE_POINTS.SAKIT;
      case 'IZIN':
        return ATTENDANCE_POINTS.IZIN;
      case 'ALPA':
      default:
        return ATTENDANCE_POINTS.ALPA;
    }
  }
}
