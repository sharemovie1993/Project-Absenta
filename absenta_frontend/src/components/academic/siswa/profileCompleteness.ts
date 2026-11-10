export type SectionEditType = 'pribadi' | 'ekskul' | 'alamat' | 'orangtua' | 'all';

export interface CompletenessResult {
  percent: number;
  isComplete: boolean;
  missingFields: string[];
}

export function calculateProfileCompleteness(siswa: any): CompletenessResult {
  if (!siswa) return { percent: 0, isComplete: false, missingFields: ['Semua data'] };

  const fieldChecks = [
    { key: 'nik', label: 'NIK (Nomor Induk Kependudukan)', isFilled: !!siswa.nik?.trim() },
    { key: 'nisn', label: 'NISN', isFilled: !!siswa.nisn?.trim() },
    { key: 'tempat_lahir', label: 'Tempat Lahir', isFilled: !!siswa.tempat_lahir?.trim() },
    { key: 'tanggal_lahir', label: 'Tanggal Lahir', isFilled: !!siswa.tanggal_lahir },
    { key: 'no_hp', label: 'Nomor HP / WhatsApp', isFilled: !!siswa.no_hp?.trim() },
    { key: 'alamat', label: 'Alamat Tempat Tinggal', isFilled: !!siswa.alamat?.trim() },
    { key: 'tinggi_badan', label: 'Tinggi Badan (cm)', isFilled: siswa.tinggi_badan !== null && siswa.tinggi_badan !== undefined && siswa.tinggi_badan !== '' },
    { key: 'berat_badan', label: 'Berat Badan (kg)', isFilled: siswa.berat_badan !== null && siswa.berat_badan !== undefined && siswa.berat_badan !== '' },
    { key: 'nama_ayah', label: 'Nama Ayah Kandung', isFilled: !!siswa.nama_ayah?.trim() },
    { key: 'nama_ibu', label: 'Nama Ibu Kandung', isFilled: !!siswa.nama_ibu?.trim() },
  ];

  const filledCount = fieldChecks.filter(f => f.isFilled).length;
  const percent = Math.round((filledCount / fieldChecks.length) * 100);
  const missingFields = fieldChecks.filter(f => !f.isFilled).map(f => f.label);

  return {
    percent,
    isComplete: percent === 100,
    missingFields,
  };
}
