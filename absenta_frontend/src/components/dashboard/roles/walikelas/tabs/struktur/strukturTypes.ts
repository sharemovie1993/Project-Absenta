export interface PengurusPosition {
  id: string;
  roleTitle: string;
  roleCode: string;
  category: 'WALAS' | 'PIMPINAN' | 'ADMINISTRASI' | 'KEUANGAN' | 'SEKSI';
  description: string;
  assignedStudentIds: string[];
  assignedStudentNames: string[];
  maxPersons: number;
}

export interface StrukturOrganisasiKelas {
  kelasId: string;
  waliKelasNama: string;
  waliKelasNip?: string;
  positions: PengurusPosition[];
}

export interface PiketMember {
  siswaId: string;
  nama: string;
  nis?: string;
  gender?: 'L' | 'P';
  isKoordinator?: boolean;
}

export interface PiketDaySlot {
  dayIndex: number; // 1: Senin, 2: Selasa, 3: Rabu, 4: Kamis, 5: Jumat
  dayName: string;
  reguName: string;
  members: PiketMember[];
}

export interface JadwalPiketKelas {
  kelasId: string;
  totalSiswaTerbagi: number;
  slots: PiketDaySlot[];
}
