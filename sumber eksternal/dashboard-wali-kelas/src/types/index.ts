export type AttendanceStatus = 'Hadir' | 'Sakit' | 'Izin' | 'Alpha' | 'Bolos' | 'Dispensasi';

export type LeaveType = 'Sakit' | 'Izin Keluarga' | 'Dispensasi' | 'Pulang Awal';

export type ApprovalStatus = 'Pending' | 'Disetujui' | 'Ditolak';

export type SeverityLevel = 'Ringan' | 'Sedang' | 'Berat';

export type BKStatus = 'Konseling BK' | 'Home Visit' | 'Pemanggilan Ortu' | 'Surat Peringatan 1' | 'Surat Peringatan 2' | 'Dalam Pemantauan' | 'Selesai';

export interface Student {
  id: string;
  nis: string;
  name: string;
  gender: 'L' | 'P';
  avatar: string;
  parentName: string;
  parentPhone: string;
  todayStatus: AttendanceStatus;
  todayTime?: string;
  attendanceRate: number; // e.g. 96.5%
  alphaCount: number;
  sakitCount: number;
  izinCount: number;
  violationPoints: number;
  goodDeedsPoints: number;
  academicAverage: number;
  isStarStudent?: boolean;
  starRank?: number;
  badges: StudentBadge[];
  atRiskReason?: string;
}

export interface LeaveRequest {
  id: string;
  studentId: string;
  studentName: string;
  nis: string;
  studentAvatar: string;
  parentName: string;
  parentPhone: string;
  type: LeaveType;
  startDate: string;
  endDate: string;
  reason: string;
  status: ApprovalStatus;
  submittedAt: string;
  attachmentUrl?: string;
  attachmentType?: 'doctor_note' | 'family_letter' | 'photo';
  attachmentTitle?: string;
  doctorDetails?: {
    clinicName: string;
    doctorName: string;
    diagnosis: string;
    restDays: number;
  };
  rejectionReason?: string;
  processedAt?: string;
}

export interface AtRiskStudent {
  studentId: string;
  studentName: string;
  nis: string;
  avatar: string;
  gender: 'L' | 'P';
  riskCategory: 'Alpha Tinggi (≥3 Hari)' | 'Sakit/Izin Beruntun (≥5 Hari)' | 'Poin Pelanggaran Meningkat' | 'Penurunan Kehadiran Drastis';
  consecutiveDays: number;
  totalAlphaThisMonth: number;
  recommendation: 'Perlu Pemanggilan Ortu' | 'Koordinasi Guru BK' | 'Kunjungan Rumah (Home Visit)';
  status: 'Perlu Tindakan' | 'Dalam Proses Pembinaan' | 'Selesai Teratasi';
  lastIntervention?: string;
}

export interface ViolationRecord {
  id: string;
  studentId: string;
  studentName: string;
  nis: string;
  category: string;
  points: number;
  severity: SeverityLevel;
  date: string;
  reporter: 'Guru Piket' | 'Guru BK' | 'Guru Mapel' | 'Wali Kelas';
  description: string;
  bkStatus: BKStatus;
  followUpNotes?: string;
}

export interface AchievementRecord {
  id: string;
  studentId: string;
  studentName: string;
  nis: string;
  avatar: string;
  title: string;
  category: 'Akademik' | 'Non-Akademik' | 'Kedisiplinan' | 'Karakter & Sosial';
  level: 'Sekolah' | 'Kota/Kab' | 'Provinsi' | 'Nasional' | 'Internasional';
  date: string;
  points: number;
  description: string;
  certificateUrl?: string;
}

export interface StudentBadge {
  id: string;
  badgeName: string;
  icon: string; // lucide icon name or emoji
  category: string;
  awardedBy: string;
  awardedAt: string;
  note: string;
}

export interface JournalEntry {
  id: string;
  date: string;
  time: string;
  category: 'Rapat Ortu' | 'Kasus Teratasi' | 'Pembinaan Kelas' | 'Catatan Khusus' | 'Agenda Jam Walas' | 'Koordinasi BK';
  title: string;
  content: string;
  author: string;
  tags: string[];
  attachedStudents?: string[];
}

export interface ClassHealthMetric {
  overallScore: number; // 0-100
  attendancePercentage: number;
  activeRequestsCount: number;
  atRiskCount: number;
  totalViolationPoints: number;
  parentResponseRate: number; // %
  zeroSevereViolations: boolean;
}

export interface ClassInfo {
  className: string;
  academicYear: string;
  semester: string;
  homeroomTeacher: string;
  nip: string;
  totalStudents: number;
  maleCount: number;
  femaleCount: number;
  roomNumber: string;
  major: string;
}
