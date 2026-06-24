import React from 'react';
import { 
  Briefcase, 
  FileText, 
  Package, 
  ChevronRight,
  ClipboardCheck,
  Clock
} from 'lucide-react';
import { Card } from '../../ui/Card';
import { Badge } from '../../ui/Badge';
import { CompactSectionCard } from '../shared/CompactSectionCard';
import { cn } from '../../../lib/utils';

interface AdminDutyWidgetProps {
  roleType: 'TU' | 'HUBIN' | 'SARPRAS' | 'KAPROG';
  stats: {
    pendingCount: number;
    activeCount: number;
    totalCount: number;
  };
  onAction?: () => void;
}

export const AdminDutyWidget: React.FC<AdminDutyWidgetProps> = ({
  roleType,
  stats,
  onAction
}) => {
  const config = {
    TU: {
      title: 'Administrasi & Persuratan',
      icon: FileText,
      color: 'blue',
      label: 'Permohonan Dokumen',
      activeLabel: 'Selesai'
    },
    HUBIN: {
      title: 'Hubungan Industri (PKL)',
      icon: Briefcase,
      color: 'indigo',
      label: 'Siswa Magang',
      activeLabel: 'Mitra Aktif'
    },
    SARPRAS: {
      title: 'Inventaris & Sarana',
      icon: Package,
      color: 'emerald',
      label: 'Peminjaman Alat',
      activeLabel: 'Aset Tersedia'
    },
    KAPROG: {
      title: 'Manajemen Jurusan',
      icon: ClipboardCheck,
      color: 'purple',
      label: 'Monitoring Praktikum',
      activeLabel: 'Guru Jurusan'
    }
  }[roleType];

  const Icon = config.icon;

  return (
    <CompactSectionCard title={config.title} icon={Icon} iconColor={config.color as any}>
       <div className="space-y-4 py-1">
          <div className="flex items-center justify-between">
             <div className="flex flex-col">
                <span className="text-2xl font-black text-gray-900 dark:text-white">{stats.pendingCount}</span>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Pending / Menunggu</span>
             </div>
             <Badge variant="outline" className={cn("text-[9px] font-black h-5", `text-${config.color}-600 border-${config.color}-200 bg-${config.color}-50/50`)}>
                {roleType} Duty
             </Badge>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-3 border-t border-gray-50 dark:border-slate-700/50">
             <div className="flex items-center gap-2">
                <Clock size={12} className="text-gray-300" />
                <div className="flex flex-col">
                   <span className="text-[10px] font-bold text-gray-800 dark:text-gray-200">{stats.activeCount}</span>
                   <span className="text-[8px] text-gray-400 uppercase font-medium">{config.activeLabel}</span>
                </div>
             </div>
             <div className="flex items-center gap-2 justify-end">
                <button 
                  onClick={onAction}
                  className="flex items-center gap-1 text-[9px] font-black text-blue-600 hover:text-blue-700 uppercase tracking-tighter"
                >
                   Kelola <ChevronRight size={10} />
                </button>
             </div>
          </div>
       </div>
    </CompactSectionCard>
  );
};

