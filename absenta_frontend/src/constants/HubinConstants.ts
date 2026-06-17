/**
 * HUBIN ECOSYSTEM CONSTANTS
 * Standardized constants for SaaS Enterprise Audit Compliance
 */

export const HubinPklStatus = {
  AKTIF: 'AKTIF',
  SELESAI: 'SELESAI',
  MENUNGGU_PENEMPATAN: 'MENUNGGU_PENEMPATAN'
} as const;
export type HubinPklStatus = typeof HubinPklStatus[keyof typeof HubinPklStatus];

export const HubinAbsensiStatus = {
  HADIR: 'HADIR',
  ALPHA: 'ALPHA',
  IZIN: 'IZIN',
  SAKIT: 'SAKIT'
} as const;
export type HubinAbsensiStatus = typeof HubinAbsensiStatus[keyof typeof HubinAbsensiStatus];

export const HubinJurnalStatus = {
  MENUNGGU_REVIEW: 'MENUNGGU_REVIEW',
  DISETUJUI: 'DISETUJUI',
  REVISI: 'REVISI'
} as const;
export type HubinJurnalStatus = typeof HubinJurnalStatus[keyof typeof HubinJurnalStatus];

export const HUBIN_CONFIG = {
  DEFAULT_RADIUS_METERS: 100,
  EARTH_RADIUS_METERS: 6371e3,
  SCHEDULE: {
    CHECK_IN_TIME: '07:00:00',
    CHECK_OUT_TIME: '16:00:00',
  },
  MIME_TYPES: {
    IMAGES: 'image/*',
  }
};

export const HUBIN_THEME = {
  STATUS_COLORS: {
    [HubinJurnalStatus.MENUNGGU_REVIEW]: 'indigo',
    [HubinJurnalStatus.DISETUJUI]: 'emerald',
    [HubinJurnalStatus.REVISI]: 'rose',
    [HubinAbsensiStatus.HADIR]: 'emerald',
    [HubinAbsensiStatus.ALPHA]: 'rose',
    [HubinAbsensiStatus.IZIN]: 'amber',
    [HubinAbsensiStatus.SAKIT]: 'sky',
  }
};
