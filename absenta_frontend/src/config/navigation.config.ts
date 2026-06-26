import { 
  GraduationCap, 
  Clock, 
  Wallet, 
  Briefcase, 
  Building2, 
  HeartHandshake,
  BookOpen,
  Users,
  FileText,
  Laptop
} from 'lucide-react';
import type { HubType } from '../store/navStore';

export interface HubConfig {
  id: HubType;
  label: string;
  icon: any;
  color: string;
  bg: string;
  solidBg: string; // Used for Desktop/Solid active states
  desc: string;
  keywords: string[]; // Keywords to match with API group names
}

export const MASTER_HUBS: HubConfig[] = [
  { 
    id: 'AKADEMIK', 
    label: 'Master', 
    icon: GraduationCap, 
    color: 'text-blue-600', 
    bg: 'bg-blue-50',
    solidBg: 'bg-blue-600',
    desc: 'Data Referensi Sekolah',
    keywords: ['AKADEMIK', 'DATA MASTER', 'MASTER']
  },
  {
    id: 'KURIKULUM',
    label: 'Kurikulum',
    icon: BookOpen,
    color: 'text-teal-600',
    bg: 'bg-teal-50',
    solidBg: 'bg-teal-600',
    desc: 'Jadwal & Pembelajaran',
    keywords: ['KURIKULUM', 'JADWAL', 'MAPEL', 'PELAJARAN']
  },
  {
    id: 'KESISWAAN',
    label: 'Kesiswaan',
    icon: Users,
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    solidBg: 'bg-amber-600',
    desc: 'Ekskul & Kedisiplinan',
    keywords: ['KESISWAAN', 'EKSKUL', 'OSIS', 'SISWA']
  },
  { 
    id: 'SARPRAS', 
    label: 'Sarpras', 
    icon: Building2, 
    color: 'text-indigo-600', 
    bg: 'bg-indigo-50',
    solidBg: 'bg-indigo-600',
    desc: 'Aset & Inventaris',
    keywords: ['SARPRAS', 'SARANA PRASARANA', 'INVENTORY', 'ASET']
  },
  { 
    id: 'HUBIN', 
    label: 'Hubin', 
    icon: Briefcase, 
    color: 'text-purple-600', 
    bg: 'bg-purple-50',
    solidBg: 'bg-purple-600',
    desc: 'PKL & Industri',
    keywords: ['HUBIN', 'PKL', 'MITRA', 'INDUSTRI']
  },
  {
    id: 'BPBK',
    label: 'BP/BK',
    icon: HeartHandshake,
    color: 'text-rose-600',
    bg: 'bg-rose-50',
    solidBg: 'bg-rose-600',
    desc: 'Bimbingan Konseling',
    keywords: ['BP/BK', 'BPBK', 'BK']
  },
  { 
    id: 'KOPERASI', 
    label: 'Koperasi', 
    icon: Wallet, 
    color: 'text-orange-600', 
    bg: 'bg-orange-50',
    solidBg: 'bg-orange-600',
    desc: 'Koperasi & Kantin',
    keywords: ['KOPERASI', 'KANTIN', 'COOPERATIVE']
  },
  { 
    id: 'ABSENSI', 
    label: 'Absensi', 
    icon: Clock, 
    color: 'text-emerald-600', 
    bg: 'bg-emerald-50',
    solidBg: 'bg-emerald-600',
    desc: 'Kehadiran Realtime',
    keywords: ['ABSENSI', 'ATTENDANCE']
  },
  { 
    id: 'RAPOR', 
    label: 'Rapor', 
    icon: FileText, 
    color: 'text-sky-600', 
    bg: 'bg-sky-50',
    solidBg: 'bg-sky-600',
    desc: 'E-Rapor & Nilai',
    keywords: ['RAPOR', 'RAPORT', 'ERAPOR', 'NILAI']
  },
  { 
    id: 'CBT', 
    label: 'CBT', 
    icon: Laptop, 
    color: 'text-violet-600', 
    bg: 'bg-violet-50',
    solidBg: 'bg-violet-600',
    desc: 'Ujian & Bank Soal',
    keywords: ['CBT', 'UJIAN', 'TEST', 'EXAM']
  }
];

export const getHubByLabel = (label: string): HubType | undefined => {
  const cleanLabel = label.trim().toUpperCase();
  const hub = MASTER_HUBS.find(h => 
    h.id === cleanLabel || h.keywords.some(k => cleanLabel.includes(k))
  );
  return hub?.id;
};
