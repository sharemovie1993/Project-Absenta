import { 
  GraduationCap, 
  Clock, 
  Wallet, 
  Briefcase, 
  Building2, 
  Settings 
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
    label: 'Akademik', 
    icon: GraduationCap, 
    color: 'text-blue-600', 
    bg: 'bg-blue-50',
    solidBg: 'bg-blue-600',
    desc: 'Kurikulum & Siswa',
    keywords: ['AKADEMIK', 'KESISWAAN', 'KURIKULUM']
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
    id: 'KOPERASI', 
    label: 'Koperasi', 
    icon: Wallet, 
    color: 'text-orange-600', 
    bg: 'bg-orange-50',
    solidBg: 'bg-orange-600',
    desc: 'Koperasi & Kantin',
    keywords: ['KEUANGAN', 'BILLING', 'KOPERASI', 'KANTIN', 'TAGIHAN', 'SPP']
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
    id: 'MANAGEMENT', 
    label: 'Management', 
    icon: Settings, 
    color: 'text-slate-600', 
    bg: 'bg-slate-50',
    solidBg: 'bg-slate-600',
    desc: 'Sistem & User',
    keywords: ['MANAGEMENT', 'ADMIN', 'PENGATURAN', 'KONFIGURASI']
  }
];

export const getHubByLabel = (label: string): HubType | undefined => {
  const cleanLabel = label.trim().toUpperCase();
  const hub = MASTER_HUBS.find(h => 
    h.id === cleanLabel || h.keywords.some(k => cleanLabel.includes(k))
  );
  return hub?.id;
};
