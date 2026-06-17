export interface Transaction {
  id: string;
  savingId: string;
  type: 'DEPOSIT' | 'WITHDRAWAL' | 'INTEREST' | 'FEE';
  amount: number;
  date: string;
  description?: string;
  savingType?: 'POKOK' | 'WAJIB' | 'SUKARELA' | 'LAINNYA';
}

export interface Saving {
  id: string;
  type: 'POKOK' | 'WAJIB' | 'SUKARELA' | 'LAINNYA';
  amount: number;
  transactions?: Transaction[];
}

export interface Member {
  id: string;
  memberNo: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  status: string;
  createdAt: string;
  type: 'STUDENT' | 'TEACHER';
  siswaId?: string;
  guruId?: string;
  userId?: string;
  pin?: string;
  Siswa?: {
    kelas_id?: string;
    Kelas?: {
      nama_kelas: string;
    };
  };
  savings?: Saving[];
}

export interface CoopProfile {
  legalNo: string;
  address: string;
  phone: string;
  email: string;
  website: string;
}
