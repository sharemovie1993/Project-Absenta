import { requestWithFallback } from './apiUtils';
import type { User, Kelas, TahunPelajaran, Semester, Jurusan } from '../types/academic';

// Interface untuk dropdown options
export interface DropdownOption {
  value: string;
  label: string;
  tingkat?: number;
  warna?: string | null;
  jurusan_id?: string | null;
  siswa_count?: number;
}

// Interface untuk response dropdown
export interface DropdownResponse<T> {
  success: boolean;
  message: string;
  data: T[];
}

// Get Users for Siswa dropdown - GET /api/users (filtered for users without siswa profile)
export async function getUsersForSiswa(): Promise<DropdownOption[]> {
  try {
    const response = await requestWithFallback<{ success: boolean; data: { users: User[] } | User[] }>('get', "/users", { params: { available_for_siswa: true } });
    const users: User[] = (response as any)?.data?.users || (response as any)?.data || [];
    
    return users.map(user => ({
      value: user.id,
      label: `${user.full_name} (${user.email})`
    }));
  } catch (error) {
    console.error('Error fetching users for siswa:', error);
    return [];
  }
}

// Get All Users for dropdown - GET /api/users
export async function getAllUsersForDropdown(): Promise<DropdownOption[]> {
  try {
    const response = await requestWithFallback<{ success: boolean; data: { users: User[] } | User[] }>('get', "/users", { params: { limit: 1000 } });
    const users: User[] = (response as any)?.data?.users || (response as any)?.data || [];
    
    return users.map(user => ({
      value: user.id,
      label: `${user.full_name} (${user.email})`
    }));
  } catch (error) {
    console.error('Error fetching all users:', error);
    return [];
  }
}

// Get Kelas for dropdown - GET /api/academic/kelas
export async function getKelasForDropdown(): Promise<DropdownOption[]> {
  try {
    const tenantId = (typeof window !== 'undefined') ? (localStorage.getItem('tenant_id') || undefined) : undefined;
    const headers: Record<string, string> = {};
    if (tenantId) headers['X-Tenant-ID'] = tenantId;
    const response: any = await requestWithFallback<any>('get', "/academic/kelas", { params: { limit: 1000, elevated_context: 'true' }, headers: { ...headers, 'X-Skip-403-Redirect': 'true' } });
    const rawData = response?.data ?? response;
    const kelasList: Kelas[] = Array.isArray(rawData?.data)
      ? rawData.data
      : Array.isArray(rawData)
      ? rawData
      : Array.isArray(rawData?.items)
      ? rawData.items
      : [];
    
    return kelasList.map(kelas => ({
      value: kelas.id,
      label: `${kelas.nama_kelas} - Tingkat ${kelas.tingkat}`,
      nama_kelas: kelas.nama_kelas,
      tingkat: kelas.tingkat,
      jurusan_id: kelas.jurusan_id,
      jurusan_nama: (kelas as any).Jurusan?.nama || (kelas as any).Jurusan?.nama_jurusan || '',
      Jurusan: (kelas as any).Jurusan || ((kelas as any).jurusan_id ? { id: (kelas as any).jurusan_id, nama: (kelas as any).Jurusan?.nama || '' } : null),
      is_active: (kelas as any).is_active !== false,
      siswa_count: (kelas as any)._count?.Siswa || 0
    }));
  } catch (error) {
    console.error('Error fetching kelas for dropdown:', error);
    return [
      { value: 'X-RPL-1', label: 'X RPL 1' },
      { value: 'X-RPL-2', label: 'X RPL 2' },
      { value: 'XI-TKJ-1', label: 'XI TKJ 1' },
      { value: 'XI-TKJ-2', label: 'XI TKJ 2' },
      { value: 'XII-BDP-1', label: 'XII BDP 1' }
    ];
  }
}

// Get Jurusan for dropdown - GET /api/academic/jurusan
export async function getJurusanForDropdown(): Promise<DropdownOption[]> {
  try {
    const response = await requestWithFallback<{ success: boolean; data: Jurusan[] }>('get', "/academic/jurusan", { params: { limit: 1000 } });
    const jurusanList: Jurusan[] = (response as any).data || [];
    return jurusanList.map((jurusan) => ({
      value: jurusan.id,
      label: jurusan.nama,
      warna: (jurusan as any).warna || null
    }));
  } catch (error) {
    console.error('Error fetching jurusan for dropdown:', error);
    return [];
  }
}

// Get Tahun Pelajaran for dropdown - GET /api/academic/tahun-pelajaran
export async function getTahunPelajaranForDropdown(): Promise<DropdownOption[]> {
  try {
    const response = await requestWithFallback<{ success: boolean; data: TahunPelajaran[] }>('get', "/academic/tahun-pelajaran", { params: { limit: 1000 } });
    
    // Robust data extraction handling various response structures
    const rawData = (response as any)?.data ?? response;
    const tahunPelajaranList: TahunPelajaran[] = Array.isArray(rawData) 
      ? rawData 
      : Array.isArray(rawData?.data)
        ? rawData.data
        : Array.isArray(rawData?.items)
          ? rawData.items
          : [];
    
    return tahunPelajaranList.map(tahun => ({
      value: tahun.id,
      label: `${tahun.tahun} ${tahun.is_active ? '(Aktif)' : ''}`
    }));
  } catch (error) {
    console.error('Error fetching tahun pelajaran for dropdown:', error);
    return [];
  }
}

// Get Active Tahun Pelajaran - GET /api/academic/tahun-pelajaran/active
export async function getActiveTahunPelajaran(): Promise<TahunPelajaran | null> {
  try {
    const response = await requestWithFallback<{ success: boolean; data: TahunPelajaran[] | TahunPelajaran }>('get', "/academic/tahun-pelajaran/active");
    const data = (response as any).data;
    if (Array.isArray(data)) {
      return data[0] || null;
    }
    return data || null;
  } catch (error) {
    console.error('Error fetching active tahun pelajaran:', error);
    return null;
  }
}

// Get Semester for dropdown - GET /api/academic/semester
export async function getSemesterForDropdown(): Promise<DropdownOption[]> {
  try {
    const response = await requestWithFallback<{ success: boolean; data: Semester[] }>('get', "/academic/semester", { params: { limit: 1000 } });
    
    // Robust data extraction handling various response structures
    const rawData = (response as any)?.data ?? response;
    const semesterList: Semester[] = Array.isArray(rawData) 
      ? rawData 
      : Array.isArray(rawData?.data)
        ? rawData.data
        : Array.isArray(rawData?.items)
          ? rawData.items
          : [];
    
    return semesterList.map(semester => ({
      value: semester.id,
      label: `${semester.nama_semester} ${semester.is_active ? '(Aktif)' : ''}`
    }));
  } catch (error) {
    console.error('Error fetching semester for dropdown:', error);
    return [];
  }
}

// Get Semester by Tahun Pelajaran for dropdown - GET /api/academic/semester/by-tahun-pelajaran/:tahun_pelajaran_id
export async function getSemesterByTahunPelajaranForDropdown(tahunPelajaranId: string): Promise<DropdownOption[]> {
  try {
    const response = await requestWithFallback<{ success: boolean; data: Semester[] }>('get', `/academic/semester/tahun-pelajaran/${tahunPelajaranId}`);
    
    // Robust data extraction handling various response structures
    const rawData = (response as any)?.data ?? response;
    const semesterList: Semester[] = Array.isArray(rawData) 
      ? rawData 
      : Array.isArray(rawData?.data)
        ? rawData.data
        : Array.isArray(rawData?.items)
          ? rawData.items
          : [];
    
    return semesterList.map(semester => ({
      value: semester.id,
      label: `${semester.nama_semester} ${semester.is_active ? '(Aktif)' : ''}`
    }));
  } catch (error) {
    console.error('Error fetching semester by tahun pelajaran for dropdown:', error);
    return [];
  }
}

// Get Active Semester - GET /api/academic/semester/active
export async function getActiveSemester(): Promise<Semester | null> {
  try {
    const activeYear = await getActiveTahunPelajaran();
    if (activeYear?.id) {
      const byYear = await requestWithFallback<{ success: boolean; data: Semester[] }>('get', `/academic/semester/tahun-pelajaran/${activeYear.id}`);
      const semesterList: Semester[] = (byYear as any).data || [];
      const activeSem = semesterList.find(s => s.is_active);
      if (activeSem) return activeSem;
    }
    const response = await requestWithFallback<{ success: boolean; data: Semester[] | Semester }>('get', "/academic/semester/active");
    const data = (response as any).data;
    if (Array.isArray(data)) {
      return data[0] || null;
    }
    return (data as Semester) || null;
  } catch (error) {
    console.error('Error fetching active semester:', error);
    return null;
  }
}

// Get Siswa for dropdown - GET /api/academic/siswa
export async function getSiswaForDropdown(): Promise<DropdownOption[]> {
  try {
    const response = await requestWithFallback<{ success: boolean; data: any[] }>('get', "/academic/siswa", { params: { limit: 1000 } });
    const siswaList: any[] = (response as any).data || [];
    
    return siswaList.map(siswa => ({
      value: siswa.id,
      label: `${siswa.nama_siswa} - ${siswa.nis}`
    }));
  } catch (error) {
    console.error('Error fetching siswa for dropdown:', error);
    return [];
  }
}

// Import reference API functions
import { referenceApi } from './reference.api';

// Static options as fallback - these are now fetched from API with fallback to static data
export const jenisKelaminOptions: DropdownOption[] = [
  { value: 'L', label: 'Laki-laki' },
  { value: 'P', label: 'Perempuan' }
];

export const AGAMA_OPTIONS: DropdownOption[] = [
  { value: 'ISLAM', label: 'Islam' },
  { value: 'KRISTEN', label: 'Kristen' },
  { value: 'KATOLIK', label: 'Katolik' },
  { value: 'HINDU', label: 'Hindu' },
  { value: 'BUDDHA', label: 'Buddha' },
  { value: 'KONGHUCU', label: 'Konghucu' },
  { value: 'LAINNYA', label: 'Lainnya' }
];

export const PROVINSI_INDONESIA_OPTIONS: DropdownOption[] = [
  { value: 'ACEH', label: 'Aceh' },
  { value: 'SUMATERA_UTARA', label: 'Sumatera Utara' },
  { value: 'SUMATERA_BARAT', label: 'Sumatera Barat' },
  { value: 'RIAU', label: 'Riau' },
  { value: 'KEPULAUAN_RIAU', label: 'Kepulauan Riau' },
  { value: 'JAMBI', label: 'Jambi' },
  { value: 'BENGKULU', label: 'Bengkulu' },
  { value: 'SUMATERA_SELATAN', label: 'Sumatera Selatan' },
  { value: 'KEPULAUAN_BANGKA_BELITUNG', label: 'Kepulauan Bangka Belitung' },
  { value: 'LAMPUNG', label: 'Lampung' },
  { value: 'BANTEN', label: 'Banten' },
  { value: 'DKI_JAKARTA', label: 'DKI Jakarta' },
  { value: 'JAWA_BARAT', label: 'Jawa Barat' },
  { value: 'JAWA_TENGAH', label: 'Jawa Tengah' },
  { value: 'DI_YOGYAKARTA', label: 'DI Yogyakarta' },
  { value: 'JAWA_TIMUR', label: 'Jawa Timur' },
  { value: 'BALI', label: 'Bali' },
  { value: 'NUSA_TENGGARA_BARAT', label: 'Nusa Tenggara Barat' },
  { value: 'NUSA_TENGGARA_TIMUR', label: 'Nusa Tenggara Timur' },
  { value: 'KALIMANTAN_BARAT', label: 'Kalimantan Barat' },
  { value: 'KALIMANTAN_TENGAH', label: 'Kalimantan Tengah' },
  { value: 'KALIMANTAN_SELATAN', label: 'Kalimantan Selatan' },
  { value: 'KALIMANTAN_TIMUR', label: 'Kalimantan Timur' },
  { value: 'KALIMANTAN_UTARA', label: 'Kalimantan Utara' },
  { value: 'SULAWESI_UTARA', label: 'Sulawesi Utara' },
  { value: 'GORONTALO', label: 'Gorontalo' },
  { value: 'SULAWESI_TENGAH', label: 'Sulawesi Tengah' },
  { value: 'SULAWESI_BARAT', label: 'Sulawesi Barat' },
  { value: 'SULAWESI_SELATAN', label: 'Sulawesi Selatan' },
  { value: 'SULAWESI_TENGGARA', label: 'Sulawesi Tenggara' },
  { value: 'MALUKU', label: 'Maluku' },
  { value: 'MALUKU_UTARA', label: 'Maluku Utara' },
  { value: 'PAPUA', label: 'Papua' },
  { value: 'PAPUA_BARAT', label: 'Papua Barat' },
  { value: 'PAPUA_SELATAN', label: 'Papua Selatan' },
  { value: 'PAPUA_TENGAH', label: 'Papua Tengah' },
  { value: 'PAPUA_PEGUNUNGAN', label: 'Papua Pegunungan' },
  { value: 'PAPUA_BARAT_DAYA', label: 'Papua Barat Daya' }
];

export async function getProvinsiOptions(): Promise<DropdownOption[]> {
  try {
    const response = await requestWithFallback<{ success: boolean; data: DropdownOption[] }>('get', '/wilayah/provinsi');
    const list = (response as any)?.data || [];
    if (Array.isArray(list) && list.length > 0) return list;
  } catch (error) {
    console.warn('Error fetching provinsi from API, using fallback:', error);
  }
  return PROVINSI_INDONESIA_OPTIONS;
}

export async function getKabupatenOptions(provinsiNama?: string): Promise<DropdownOption[]> {
  try {
    const params = provinsiNama ? { provinsi_nama: provinsiNama } : undefined;
    const response = await requestWithFallback<{ success: boolean; data: DropdownOption[] }>('get', '/wilayah/kabupaten', { params });
    return (response as any)?.data || [];
  } catch (error) {
    console.warn('Error fetching kabupaten from API:', error);
    return [];
  }
}

export async function getKecamatanOptions(kabupatenNama?: string): Promise<DropdownOption[]> {
  try {
    const params = kabupatenNama ? { kabupaten_nama: kabupatenNama } : undefined;
    const response = await requestWithFallback<{ success: boolean; data: DropdownOption[] }>('get', '/wilayah/kecamatan', { params });
    return (response as any)?.data || [];
  } catch (error) {
    console.warn('Error fetching kecamatan from API:', error);
    return [];
  }
}

export async function getKelurahanOptions(kecamatanNama?: string, kabupatenNama?: string): Promise<DropdownOption[]> {
  try {
    if (!kecamatanNama) return [];
    const params = { kecamatan_nama: kecamatanNama, kabupaten_nama: kabupatenNama };
    const response = await requestWithFallback<{ success: boolean; data: DropdownOption[] }>('get', '/wilayah/kelurahan', { params });
    return (response as any)?.data || [];
  } catch (error) {
    console.warn('Error fetching kelurahan from API:', error);
    return [];
  }
}

export async function getSmartKodePos(kecamatanNama?: string, kelurahanNama?: string, kabupatenNama?: string): Promise<string> {
  try {
    if (!kecamatanNama && !kelurahanNama) return '';
    const params = { kecamatan_nama: kecamatanNama, kelurahan_nama: kelurahanNama, kabupaten_nama: kabupatenNama };
    const response = await requestWithFallback<{ success: boolean; data: { kode_pos: string } }>('get', '/wilayah/kodepos', { params });
    return (response as any)?.data?.kode_pos || '';
  } catch (error) {
    console.warn('Error detecting smart kode pos:', error);
    return '';
  }
}

export const statusSiswaOptions: DropdownOption[] = [
  { value: 'AKTIF', label: 'Aktif' },
  { value: 'TIDAK_AKTIF', label: 'Tidak Aktif' },
  { value: 'LULUS', label: 'Lulus' },
  { value: 'PINDAH', label: 'Pindah' },
  { value: 'KELUAR', label: 'Keluar' }
];

export const transportasiOptions: DropdownOption[] = [
  { value: 'JALAN_KAKI', label: 'Jalan Kaki' },
  { value: 'SEPEDA', label: 'Sepeda' },
  { value: 'SEPEDA_MOTOR', label: 'Sepeda Motor' },
  { value: 'MOBIL', label: 'Mobil' },
  { value: 'ANGKUTAN_UMUM', label: 'Angkutan Umum' },
  { value: 'ANTAR_JEMPUT', label: 'Antar Jemput' }
];

export const pendidikanOptions: DropdownOption[] = [
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

export const penghasilanOptions: DropdownOption[] = [
  { value: 'KURANG_1_JUTA', label: 'Kurang dari Rp 1.000.000' },
  { value: '1_2_JUTA', label: 'Rp 1.000.000 - Rp 2.000.000' },
  { value: '2_3_JUTA', label: 'Rp 2.000.000 - Rp 3.000.000' },
  { value: '3_5_JUTA', label: 'Rp 3.000.000 - Rp 5.000.000' },
  { value: '5_10_JUTA', label: 'Rp 5.000.000 - Rp 10.000.000' },
  { value: 'LEBIH_10_JUTA', label: 'Lebih dari Rp 10.000.000' },
  { value: 'TIDAK_BERPENGHASILAN', label: 'Tidak Berpenghasilan' }
];

export const pekerjaanOptions: DropdownOption[] = [
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

export const hubunganWaliOptions: DropdownOption[] = [
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

// API-based functions with fallback to static data
export const getJenisKelaminOptions = referenceApi.getJenisKelaminOptions;
export const getAgamaOptions = referenceApi.getAgamaOptions;
export const getStatusSiswaOptions = referenceApi.getStatusSiswaOptions;
export const getTransportasiOptions = referenceApi.getTransportasiOptions;
export const getPendidikanOptions = referenceApi.getPendidikanOptions;
export const getPenghasilanOptions = referenceApi.getPenghasilanOptions;
export const getPekerjaanOptions = referenceApi.getPekerjaanOptions;
export const getHubunganWaliOptions = referenceApi.getHubunganWaliOptions;

// Aliases for backward compatibility (static)
export const JENIS_KELAMIN_OPTIONS = jenisKelaminOptions;
export const HUBUNGAN_WALI_OPTIONS = hubunganWaliOptions;
export const STATUS_SISWA_OPTIONS = statusSiswaOptions;
export const TRANSPORTASI_OPTIONS = transportasiOptions;
export const PENDIDIKAN_OPTIONS = pendidikanOptions;
export const PENGHASILAN_OPTIONS = penghasilanOptions;
export const PEKERJAAN_OPTIONS = pekerjaanOptions;

// Export all functions for easy access
export const dropdownApi = {
  getUsersForSiswa,
  getAllUsersForDropdown,
  getKelasForDropdown,
  getJurusanForDropdown,
  getTahunPelajaranForDropdown,
  getActiveTahunPelajaran,
  getSemesterForDropdown,
  getSemesterByTahunPelajaranForDropdown,
  getActiveSemester,
  getSiswaForDropdown,
  getJenisKegiatanMasterForDropdown: async (): Promise<DropdownOption[]> => {
    try {
      const response = await requestWithFallback<{ success: boolean; data: any[] }>(
        'get',
        "/academic/jenis-kegiatan-master",
        { params: { limit: 1000 }, headers: { 'X-Skip-403-Redirect': 'true' } }
      );
      const list: any[] = (response as any).data || [];
      return list.map((jk: any) => ({ value: jk.id, label: jk.nama }));
    } catch (error) {
      console.error('Error fetching jenis kegiatan master for dropdown:', error);
      return [];
    }
  },
  getMapelForDropdown: async (): Promise<DropdownOption[]> => {
    try {
      const response = await requestWithFallback<{ success: boolean; data: any[] }>(
        'get',
        "/academic/mapel",
        { params: { limit: 1000 }, headers: { 'X-Skip-403-Redirect': 'true' } }
      );
      const list: any[] = (response as any)?.data?.data || (response as any)?.data || [];
      return (Array.isArray(list) ? list : []).map((m: any) => ({
        value: m.id,
        label: m.kode_mapel ? `${m.nama_mapel} (${m.kode_mapel})` : m.nama_mapel,
      }));
    } catch (error) {
      console.error('Error fetching mapel for dropdown:', error);
      return [];
    }
  },
  // Reference data functions
  getJenisKelaminOptions,
  getAgamaOptions,
  getStatusSiswaOptions,
  getTransportasiOptions,
  getPendidikanOptions,
  getPenghasilanOptions,
  getPekerjaanOptions,
  getHubunganWaliOptions
};
