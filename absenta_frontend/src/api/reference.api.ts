import { requestWithFallback } from "./apiUtils";

// Interface untuk dropdown options
export interface DropdownOption {
  value: string;
  label: string;
}

export interface ReferenceDataResponse {
  success: boolean;
  message: string;
  data: DropdownOption[];
}

// API Functions untuk data referensi
export async function getJenisKelaminOptions(): Promise<DropdownOption[]> {
  try {
    const response = await requestWithFallback<ReferenceDataResponse>('get', '/reference/jenis-kelamin');
    if (response.success) {
      return response.data;
    }
    return [
      { value: 'L', label: 'Laki-laki' },
      { value: 'P', label: 'Perempuan' }
    ];
  } catch {
    return [
      { value: 'L', label: 'Laki-laki' },
      { value: 'P', label: 'Perempuan' }
    ];
  }
}

export async function getAgamaOptions(): Promise<DropdownOption[]> {
  try {
    const response = await requestWithFallback<ReferenceDataResponse>('get', '/reference/agama');
    if (response.success) {
      return response.data;
    }
    return [
      { value: 'ISLAM', label: 'Islam' },
      { value: 'KRISTEN', label: 'Kristen' },
      { value: 'KATOLIK', label: 'Katolik' },
      { value: 'HINDU', label: 'Hindu' },
      { value: 'BUDDHA', label: 'Buddha' },
      { value: 'KONGHUCU', label: 'Konghucu' },
      { value: 'LAINNYA', label: 'Lainnya' }
    ];
  } catch {
    return [
      { value: 'ISLAM', label: 'Islam' },
      { value: 'KRISTEN', label: 'Kristen' },
      { value: 'KATOLIK', label: 'Katolik' },
      { value: 'HINDU', label: 'Hindu' },
      { value: 'BUDDHA', label: 'Buddha' },
      { value: 'KONGHUCU', label: 'Konghucu' },
      { value: 'LAINNYA', label: 'Lainnya' }
    ];
  }
}

export async function getStatusSiswaOptions(): Promise<DropdownOption[]> {
  try {
    const response = await requestWithFallback<ReferenceDataResponse>('get', '/reference/status-siswa');
    if (response.success) {
      return response.data;
    }
    return [
      { value: 'AKTIF', label: 'Aktif' },
      { value: 'TIDAK_AKTIF', label: 'Tidak Aktif' },
      { value: 'LULUS', label: 'Lulus' },
      { value: 'PINDAH', label: 'Pindah' },
      { value: 'KELUAR', label: 'Keluar' }
    ];
  } catch {
    return [
      { value: 'AKTIF', label: 'Aktif' },
      { value: 'TIDAK_AKTIF', label: 'Tidak Aktif' },
      { value: 'LULUS', label: 'Lulus' },
      { value: 'PINDAH', label: 'Pindah' },
      { value: 'KELUAR', label: 'Keluar' }
    ];
  }
}

export async function getTransportasiOptions(): Promise<DropdownOption[]> {
  try {
    const response = await requestWithFallback<ReferenceDataResponse>('get', '/reference/transportasi');
    if (response.success) {
      return response.data;
    }
    return [
      { value: 'JALAN_KAKI', label: 'Jalan Kaki' },
      { value: 'SEPEDA', label: 'Sepeda' },
      { value: 'SEPEDA_MOTOR', label: 'Sepeda Motor' },
      { value: 'MOBIL', label: 'Mobil' },
      { value: 'ANGKUTAN_UMUM', label: 'Angkutan Umum' },
      { value: 'ANTAR_JEMPUT', label: 'Antar Jemput' }
    ];
  } catch {
    return [
      { value: 'JALAN_KAKI', label: 'Jalan Kaki' },
      { value: 'SEPEDA', label: 'Sepeda' },
      { value: 'SEPEDA_MOTOR', label: 'Sepeda Motor' },
      { value: 'MOBIL', label: 'Mobil' },
      { value: 'ANGKUTAN_UMUM', label: 'Angkutan Umum' },
      { value: 'ANTAR_JEMPUT', label: 'Antar Jemput' }
    ];
  }
}

export async function getPendidikanOptions(): Promise<DropdownOption[]> {
  try {
    const response = await requestWithFallback<ReferenceDataResponse>('get', '/reference/pendidikan');
    if (response.success) {
      return response.data;
    }
    return [
      { value: 'SD', label: 'SD/Sederajat' },
      { value: 'SMP', label: 'SMP/Sederajat' },
      { value: 'SMA', label: 'SMA/Sederajat' },
      { value: 'D1', label: 'Diploma 1' },
      { value: 'D2', label: 'Diploma 2' },
      { value: 'D3', label: 'Diploma 3' },
      { value: 'S1', label: 'Sarjana (S1)' },
      { value: 'S2', label: 'Magister (S2)' },
      { value: 'S3', label: 'Doktor (S3)' },
      { value: 'TIDAK_SEKOLAH', label: 'Tidak Sekolah' }
    ];
  } catch {
    return [
      { value: 'SD', label: 'SD/Sederajat' },
      { value: 'SMP', label: 'SMP/Sederajat' },
      { value: 'SMA', label: 'SMA/Sederajat' },
      { value: 'D1', label: 'Diploma 1' },
      { value: 'D2', label: 'Diploma 2' },
      { value: 'D3', label: 'Diploma 3' },
      { value: 'S1', label: 'Sarjana (S1)' },
      { value: 'S2', label: 'Magister (S2)' },
      { value: 'S3', label: 'Doktor (S3)' },
      { value: 'TIDAK_SEKOLAH', label: 'Tidak Sekolah' }
    ];
  }
}

export async function getPenghasilanOptions(): Promise<DropdownOption[]> {
  try {
    const response = await requestWithFallback<ReferenceDataResponse>('get', '/reference/penghasilan');
    if (response.success) {
      return response.data;
    }
    return [
      { value: 'KURANG_1_JUTA', label: 'Kurang dari Rp 1.000.000' },
      { value: '1_2_JUTA', label: 'Rp 1.000.000 - Rp 2.000.000' },
      { value: '2_3_JUTA', label: 'Rp 2.000.000 - Rp 3.000.000' },
      { value: '3_5_JUTA', label: 'Rp 3.000.000 - Rp 5.000.000' },
      { value: '5_10_JUTA', label: 'Rp 5.000.000 - Rp 10.000.000' },
      { value: 'LEBIH_10_JUTA', label: 'Lebih dari Rp 10.000.000' },
      { value: 'TIDAK_BERPENGHASILAN', label: 'Tidak Berpenghasilan' }
    ];
  } catch {
    return [
      { value: 'KURANG_1_JUTA', label: 'Kurang dari Rp 1.000.000' },
      { value: '1_2_JUTA', label: 'Rp 1.000.000 - Rp 2.000.000' },
      { value: '2_3_JUTA', label: 'Rp 2.000.000 - Rp 3.000.000' },
      { value: '3_5_JUTA', label: 'Rp 3.000.000 - Rp 5.000.000' },
      { value: '5_10_JUTA', label: 'Rp 5.000.000 - Rp 10.000.000' },
      { value: 'LEBIH_10_JUTA', label: 'Lebih dari Rp 10.000.000' },
      { value: 'TIDAK_BERPENGHASILAN', label: 'Tidak Berpenghasilan' }
    ];
  }
}

export async function getPekerjaanOptions(): Promise<DropdownOption[]> {
  try {
    const response = await requestWithFallback<ReferenceDataResponse>('get', '/reference/pekerjaan');
    if (response.success) {
      return response.data;
    }
    return [
      { value: 'PNS', label: 'PNS' },
      { value: 'TNI_POLRI', label: 'TNI/Polri' },
      { value: 'GURU', label: 'Guru' },
      { value: 'DOSEN', label: 'Dosen' },
      { value: 'DOKTER', label: 'Dokter' },
      { value: 'BIDAN', label: 'Bidan' },
      { value: 'PERAWAT', label: 'Perawat' },
      { value: 'PENGUSAHA', label: 'Pengusaha' },
      { value: 'PEDAGANG', label: 'Pedagang' },
      { value: 'PETANI', label: 'Petani' },
      { value: 'PETERNAK', label: 'Peternak' },
      { value: 'NELAYAN', label: 'Nelayan' },
      { value: 'BURUH', label: 'Buruh' },
      { value: 'KARYAWAN_SWASTA', label: 'Karyawan Swasta' },
      { value: 'WIRASWASTA', label: 'Wiraswasta' },
      { value: 'PENSIUNAN', label: 'Pensiunan' },
      { value: 'IRT', label: 'Ibu Rumah Tangga' },
      { value: 'TIDAK_BEKERJA', label: 'Tidak Bekerja' },
      { value: 'LAINNYA', label: 'Lainnya' }
    ];
  } catch {
    return [
      { value: 'PNS', label: 'PNS' },
      { value: 'TNI_POLRI', label: 'TNI/Polri' },
      { value: 'GURU', label: 'Guru' },
      { value: 'DOSEN', label: 'Dosen' },
      { value: 'DOKTER', label: 'Dokter' },
      { value: 'BIDAN', label: 'Bidan' },
      { value: 'PERAWAT', label: 'Perawat' },
      { value: 'PENGUSAHA', label: 'Pengusaha' },
      { value: 'PEDAGANG', label: 'Pedagang' },
      { value: 'PETANI', label: 'Petani' },
      { value: 'PETERNAK', label: 'Peternak' },
      { value: 'NELAYAN', label: 'Nelayan' },
      { value: 'BURUH', label: 'Buruh' },
      { value: 'KARYAWAN_SWASTA', label: 'Karyawan Swasta' },
      { value: 'WIRASWASTA', label: 'Wiraswasta' },
      { value: 'PENSIUNAN', label: 'Pensiunan' },
      { value: 'IRT', label: 'Ibu Rumah Tangga' },
      { value: 'TIDAK_BEKERJA', label: 'Tidak Bekerja' },
      { value: 'LAINNYA', label: 'Lainnya' }
    ];
  }
}

export async function getHubunganWaliOptions(): Promise<DropdownOption[]> {
  try {
    const response = await requestWithFallback<ReferenceDataResponse>('get', '/reference/hubungan-wali');
    if (response.success) {
      return response.data;
    }
    return [
      { value: 'AYAH_KANDUNG', label: 'Ayah Kandung' },
      { value: 'IBU_KANDUNG', label: 'Ibu Kandung' },
      { value: 'KAKEK', label: 'Kakek' },
      { value: 'NENEK', label: 'Nenek' },
      { value: 'PAMAN', label: 'Paman' },
      { value: 'BIBI', label: 'Bibi' },
      { value: 'KAKAK', label: 'Kakak' },
      { value: 'ADIK', label: 'Adik' },
      { value: 'LAINNYA', label: 'Lainnya' }
    ];
  } catch {
    return [
      { value: 'AYAH_KANDUNG', label: 'Ayah Kandung' },
      { value: 'IBU_KANDUNG', label: 'Ibu Kandung' },
      { value: 'KAKEK', label: 'Kakek' },
      { value: 'NENEK', label: 'Nenek' },
      { value: 'PAMAN', label: 'Paman' },
      { value: 'BIBI', label: 'Bibi' },
      { value: 'KAKAK', label: 'Kakak' },
      { value: 'ADIK', label: 'Adik' },
      { value: 'LAINNYA', label: 'Lainnya' }
    ];
  }
}

// Export semua fungsi dalam satu objek untuk kemudahan penggunaan
export const referenceApi = {
  getJenisKelaminOptions,
  getAgamaOptions,
  getStatusSiswaOptions,
  getTransportasiOptions,
  getPendidikanOptions,
  getPenghasilanOptions,
  getPekerjaanOptions,
  getHubunganWaliOptions
};
