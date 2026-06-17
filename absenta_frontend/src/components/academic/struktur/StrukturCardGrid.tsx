import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trophy, 
  Briefcase, 
  Activity, 
  Crown, 
  BookOpen, 
  HeartHandshake, 
  Building2, 
  HardHat, 
  Monitor, 
  User as UserIcon, 
  FileText, 
  Laptop, 
  Fingerprint, 
  ClipboardCheck, 
  ShieldCheck, 
  Users, 
  Settings,
  Pencil,
  Trash2,
  Plus,
  LayoutGrid
} from 'lucide-react';
import { Button, Badge, SectionCard } from '@/components/ui';
import type { StrukturOrganisasi } from '@/api/academic/strukturOrganisasi.api';

interface StrukturCardGridProps {
  data: StrukturOrganisasi[];
  user: any;
  isGlobalStrukturAdmin: boolean;
  onOpenAssignment: (id: string) => void;
  onOpenEdit: (item: StrukturOrganisasi) => void;
  onOpenDelete: (id: string) => void;
}

const CATEGORIES = [
  {
    id: 'pimpinan',
    label: 'Grup I: Pimpinan & Manajemen',
    icon: Trophy,
    color: 'indigo',
    codes: ['KEPALA_SEKOLAH', 'KURIKULUM', 'KESISWAAN', 'HUBIN', 'SARPRAS', 'TU']
  },
  {
    id: 'staff',
    label: 'Grup II: Administrasi & Teknis',
    icon: Briefcase,
    color: 'amber',
    codes: ['KAPROG', 'KABENG', 'BPBK', 'BKK', 'WALIKELAS', 'GERBANG', 'TOOLMAN']
  },
  {
    id: 'operasional',
    label: 'Grup III: Petugas Khusus (Siswa)',
    icon: Activity,
    color: 'emerald',
    codes: ['PETUGAS_KELAS']
  }
];

const getPositionIcon = (code: string) => {
  switch (code) {
    case 'KEPALA_SEKOLAH': return Crown;
    case 'KURIKULUM': return BookOpen;
    case 'KESISWAAN': return HeartHandshake;
    case 'HUBIN': return Building2;
    case 'SARPRAS': return HardHat;
    case 'KAPROG': return Monitor;
    case 'WALIKELAS': return UserIcon;
    case 'TU': return FileText;
    case 'TOOLMAN': return Laptop;
    case 'GERBANG': return Fingerprint;
    case 'PETUGAS_KELAS': return ClipboardCheck;
    case 'BPBK': return ShieldCheck;
    case 'BKK': return Users;
    case 'KABENG': return Settings;
    default: return ShieldCheck;
  }
};

const getContextualHint = (code: string) => {
  switch (code) {
    case 'KEPALA_SEKOLAH': return 'Pimpinan tertinggi satuan pendidikan.';
    case 'KURIKULUM': return 'Pengelola sistem KBM, jadwal, dan nilai.';
    case 'KESISWAAN': return 'Pembina kesiswaan, tata tertib, dan OSIS.';
    case 'HUBIN': return 'Hubungan industri, prakerin, dan humas.';
    case 'SARPRAS': return 'Pengelola aset, gedung, dan inventaris.';
    case 'TU': return 'Kepala staf administrasi dan persuratan.';
    case 'KAPROG': return 'Ketua Jurusan / Ketua Program Keahlian.';
    case 'KABENG': return 'Pengelola fasilitas bengkel/lab praktik.';
    case 'BPBK': return 'Layanan bimbingan konseling & karier.';
    case 'BKK': return 'Penyaluran tamatan ke dunia kerja.';
    case 'WALIKELAS': return 'Guru pembina dan wali bagi satu kelas.';
    case 'TOOLMAN': return 'Staf teknisi penunjang operasional praktik.';
    case 'GERBANG': return 'Guru atau Staf yang bertugas mengelola absensi di gerbang sekolah.';
    case 'PETUGAS_KELAS': return 'Siswa yang ditugaskan mencatat kehadiran di kelas.';
    default: return 'Tugaskan personil sesuai fungsi jabatan.';
  }
};

export const StrukturCardGrid: React.FC<StrukturCardGridProps> = ({
  data,
  user,
  isGlobalStrukturAdmin,
  onOpenAssignment,
  onOpenEdit,
  onOpenDelete
}) => {
  return (
    <div className="space-y-12 pb-20">
      {CATEGORIES.map((cat, catIdx) => {
        let items = data.filter(item => cat.codes.includes(item.kode));

        if (!isGlobalStrukturAdmin && cat.id === 'pimpinan') {
          items = items.filter(item => {
            return item.organizationalAssigns?.some((m: any) => m.user_id === user?.id);
          });
        }

        if (items.length === 0) return null;

        return (
          <SectionCard
            key={cat.id}
            title={cat.label}
            icon={cat.icon}
            fullWidth
            noPadding
            className="bg-transparent border-none shadow-none"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-4">
              <AnimatePresence mode="popLayout">
                {items.map((item, index) => {
                  const IconComponent = getPositionIcon(item.kode);
                  const canManageThis = isGlobalStrukturAdmin || item.organizationalAssigns?.some((m: any) => m.user_id === user?.id);
                  
                  return (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: (catIdx * 0.1) + (index * 0.05) }}
                      whileHover={{ scale: 1.02, y: -4 }}
                      className="group relative"
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-white/10 dark:from-white/5 dark:to-transparent rounded-xl blur-xl transition-all group-hover:blur-2xl opacity-50" />
                      <div 
                        onClick={() => canManageThis && onOpenAssignment(item.id)}
                        className={`relative h-full bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-8 shadow-sm flex flex-col justify-between overflow-hidden group-hover:shadow-2xl group-hover:shadow-indigo-500/10 transition-all border-b-8 ${canManageThis ? 'cursor-pointer' : 'cursor-default opacity-90'}`}
                        style={{ borderBottomColor: cat.id === 'pimpinan' ? '#6366f1' : cat.id === 'staff' ? '#f59e0b' : '#10b981' }}
                      >
                        {/* Premium BG Accents */}
                        <div className={`absolute -right-8 -top-8 w-32 h-32 rounded-full blur-3xl opacity-5 transition-all group-hover:opacity-20 ${
                          cat.id === 'pimpinan' ? 'bg-indigo-500' : cat.id === 'staff' ? 'bg-amber-500' : 'bg-emerald-500'
                        }`} />

                        <div>
                          <div className="flex justify-between items-start mb-6">
                            <div className={`p-4 rounded-xl shadow-xl shadow-current/20 transition-all group-hover:scale-110 group-hover:rotate-6 ${
                              cat.id === 'staff' ? 'bg-gradient-to-br from-amber-400 to-amber-600' :
                              cat.id === 'pimpinan' ? 'bg-gradient-to-br from-indigo-500 to-indigo-700' :
                              'bg-gradient-to-br from-emerald-400 to-emerald-600'
                            } text-white`}>
                              <IconComponent size={28} />
                            </div>
                            <div className="flex flex-col items-end gap-2">
                              <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0 transition-all duration-300">
                                {isGlobalStrukturAdmin && (
                                  <>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={(e) => { e.stopPropagation(); onOpenEdit(item); }}
                                      className="h-8 w-8 p-0 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-white shadow-sm border border-slate-100 dark:border-slate-700"
                                      aria-label="Edit Struktur"
                                    >
                                      <Pencil className="w-3.5 h-3.5 text-amber-500" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={(e) => { e.stopPropagation(); onOpenDelete(item.id); }}
                                      className="h-8 w-8 p-0 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-white shadow-sm border border-slate-100 dark:border-slate-700 text-destructive"
                                      aria-label="Hapus Struktur"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </Button>
                                  </>
                                )}
                              </div>
                              {item.is_active && (
                                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.8)] animate-pulse mt-1 shrink-0" />
                              )}
                            </div>
                          </div>

                          <div className="space-y-2.5 min-h-[85px]">
                            <h3 className="font-black text-[18px] text-slate-900 dark:text-white leading-[1.2] tracking-tight uppercase">{item.nama}</h3>
                            <p className="text-[11px] font-bold text-slate-400 italic line-clamp-2 mb-3 tracking-tight leading-normal opacity-80">{getContextualHint(item.kode)}</p>
                            <div className="flex items-center gap-2">
                              <div className="bg-slate-50 dark:bg-slate-800 px-3 py-1 rounded-full border border-slate-100 dark:border-slate-700">
                                <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 tracking-widest uppercase">{item.kode}</p>
                              </div>
                              <span className="text-slate-300">•</span>
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest opacity-70">{item.scope}</p>
                            </div>
                          </div>

                          <div className="mt-5 flex flex-wrap gap-2">
                            {item.scope_type === 'unit' && (
                              <Badge variant="info" className="text-[9px] uppercase font-black tracking-widest py-1 px-2.5 rounded-lg">
                                <Building2 className="w-3 h-3 mr-1.5" />
                                Unit-Based
                              </Badge>
                            )}
                            {item.scope_type === 'kelas' && (
                              <Badge variant="secondary" className="text-[9px] uppercase font-black tracking-widest py-1 px-2.5 rounded-lg">
                                <LayoutGrid className="w-3 h-3 mr-1.5" />
                                Kelas-Based
                              </Badge>
                            )}
                          </div>
                        </div>

                        <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                          <div className="flex items-center -space-x-3">
                            {item._count?.organizationalAssigns ? (
                              Array.from({ length: Math.min(item._count.organizationalAssigns, 3) }).map((_, i) => (
                                <div key={i} className="w-9 h-9 rounded-full border-2 border-white dark:border-slate-900 bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-400 shadow-sm overflow-hidden z-[1] transition-transform hover:translate-y-[-2px]">
                                  <Users size={14} className="text-slate-300" />
                                </div>
                              ))
                            ) : (
                              <div className="text-[9px] text-slate-400 font-black uppercase tracking-widest bg-slate-50/50 dark:bg-slate-800/30 px-3 py-1.5 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">Kosong</div>
                            )}
                            {item._count?.organizationalAssigns && item._count.organizationalAssigns > 3 && (
                              <div className="w-9 h-9 rounded-full border-2 border-white dark:border-slate-900 bg-indigo-50 dark:bg-indigo-900/30 shadow-md flex items-center justify-center text-[10px] font-black text-indigo-600 dark:text-indigo-400 z-[2] relative">
                                +{item._count.organizationalAssigns - 3}
                              </div>
                            )}
                          </div>

                          {canManageThis && (
                            <div className="text-[10px] font-black text-blue-600 dark:text-blue-400 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0 flex items-center gap-1.5 uppercase tracking-widest bg-blue-50 dark:bg-blue-900/20 px-3 py-1.5 rounded-xl border border-blue-100 dark:border-blue-800">
                              Kelola <Plus className="w-3 h-3" />
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </SectionCard>
        );
      })}
    </div>
  );
};
