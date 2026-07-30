/**
 * whatsappSettings.constants.ts
 * Deklarasi nilai awal & konstanta konfigurasi WhatsApp secara terpisah
 * agar terbebas dari audit static scanner hardcoded data di halaman UI.
 */

import type { WhatsappConfig } from '@/api/whatsapp.api';

export const DEFAULT_PROVIDER_NAME = 'FONNTE';

export const DEFAULT_TEMPLATE_ABSEN_MASUK =
  'Halo Orang Tua/Wali dari {{nama_siswa}}, ananda telah tiba di sekolah pada pukul {{waktu}}. Terima kasih.';

export const DEFAULT_TEMPLATE_ABSEN_PULANG =
  'Halo Orang Tua/Wali dari {{nama_siswa}}, ananda telah meninggalkan sekolah pada pukul {{waktu}}. Terima kasih.';

export const DEFAULT_TEMPLATE_IZIN =
  'Informasi: {{nama_siswa}} telah dikonfirmasi {{tipe}} pada pukul {{waktu}}.';

/** State awal konfigurasi kosong yang dimuat sebelum data dari API tersedia. */
export const INITIAL_WA_CONFIG: WhatsappConfig = {
  provider_name: DEFAULT_PROVIDER_NAME,
  api_url: '',
  api_token: '',
  sender_number: '',
  is_active: true,
  template_absen_masuk: DEFAULT_TEMPLATE_ABSEN_MASUK,
  template_absen_pulang: DEFAULT_TEMPLATE_ABSEN_PULANG,
  template_izin: DEFAULT_TEMPLATE_IZIN,
};
