import React, { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  X, 
  Clock, 
  MapPin, 
  MessageSquare, 
  CheckCircle2, 
  AlertCircle, 
  ChevronRight, 
  ChevronDown, 
  Calendar,
  Sparkles,
  Phone,
  User
} from 'lucide-react';
import { getTeacherLocatorApi } from '../../api/attendanceGerbang.api';
import { useAuthStore } from '../../store/authStore';
import { cn } from '../../lib/utils';
import toast from 'react-hot-toast';

interface TeacherLocatorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TeacherLocatorModal: React.FC<TeacherLocatorModalProps> = ({ isOpen, onClose }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedTeacherId, setExpandedTeacherId] = useState<string | null>(null);
  const { user } = useAuthStore();
  const rawRole = typeof user?.role === 'object' ? (user?.role as any)?.name : user?.role;
  const isStudent = String(rawRole || '').toUpperCase() === 'SISWA';

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Reset search when modal opens
  useEffect(() => {
    if (isOpen) {
      setSearchTerm('');
      setExpandedTeacherId(null);
    }
  }, [isOpen]);

  // Query teachers locator
  const { data: locatorRes, isLoading, refetch } = useQuery({
    queryKey: ['teacher-locator', searchTerm],
    queryFn: () => getTeacherLocatorApi({ q: searchTerm }),
    enabled: isOpen,
    staleTime: 10 * 1000,
    refetchInterval: isOpen ? 15 * 1000 : false,
  });

  const teacherList = useMemo(() => {
    return Array.isArray(locatorRes?.data) ? locatorRes.data : [];
  }, [locatorRes]);

  const handleOpenWa = (phone: string | null, teacherName: string) => {
    if (!phone) {
      toast.error('Nomor WhatsApp belum terdaftar untuk guru ini.');
      return;
    }
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const formattedPhone = cleanPhone.startsWith('0') ? '62' + cleanPhone.slice(1) : cleanPhone;
    const message = encodeURIComponent(`Halo Bapak/Ibu ${teacherName}, mohon konfirmasi terkait jam KBM sekolah hari ini.`);
    window.open(`https://wa.me/${formattedPhone}?text=${message}`, '_blank');
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-start justify-center pt-12 sm:pt-20 px-4 pb-6 overflow-y-auto bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
        {/* Backdrop Click */}
        <div className="fixed inset-0" onClick={onClose} />

        {/* Modal Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: -20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -20 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-2xl overflow-hidden z-10 flex flex-col max-h-[85vh]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* TOP SEARCH HEADER */}
          <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-1">
              <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                <Search size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <span>Cari Posisi Guru</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                    Real-Time
                  </span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                  Temukan lokasi kelas, jadwal aktif, dan status mengajar guru saat ini.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-2xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* SEARCH INPUT BAR */}
          <div className="p-4 border-b border-slate-100 dark:border-slate-800">
            <div className="relative">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                autoFocus
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Ketik nama guru, NIP, atau mata pelajaran..."
                className="w-full pl-11 pr-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-sm font-semibold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/40"
              />
            </div>
          </div>

          {/* RESULTS SCROLLABLE LIST */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 divide-y divide-slate-100 dark:divide-slate-800/60">
            {isLoading ? (
              <div className="py-12 text-center space-y-2">
                <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-xs text-slate-400 font-bold">Mencari posisi guru saat ini...</p>
              </div>
            ) : teacherList.length === 0 ? (
              <div className="py-12 text-center space-y-2">
                <User size={36} className="text-slate-300 dark:text-slate-600 mx-auto" />
                <h4 className="text-sm font-extrabold text-slate-700 dark:text-slate-300">
                  Guru Tidak Ditemukan
                </h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Pastikan ejaan nama guru atau mata pelajaran sudah sesuai.
                </p>
              </div>
            ) : (
              teacherList.map((teacher) => {
                const isExpanded = expandedTeacherId === teacher.guru_id;
                const pos = teacher.status_posisi;

                return (
                  <div
                    key={teacher.guru_id}
                    className="pt-3 first:pt-0 rounded-2xl transition-all"
                  >
                    <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-800 hover:border-indigo-500/40 dark:hover:border-indigo-500/40 transition-all space-y-3">
                      {/* TEACHER PROFILE & REAL-TIME STATUS BADGE */}
                      <div className="flex items-start justify-between gap-3 flex-wrap sm:flex-nowrap">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-11 h-11 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-black text-sm shrink-0 border border-indigo-500/20">
                            👨‍🏫
                          </div>
                          <div className="min-w-0 flex-1">
                            <h4 className="text-sm font-black text-slate-900 dark:text-white truncate">
                              {teacher.nama_guru}
                            </h4>
                            <p className="text-[11px] font-mono text-slate-400 truncate">
                              NIP: {teacher.nip || '-'}
                            </p>
                          </div>
                        </div>

                        {/* STATUS PILL */}
                        <div className="self-start">
                          {pos === 'SEDANG_MENGAJAR' ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-black text-xs border border-emerald-500/30 animate-pulse">
                              ● SEDANG MENGAJAR
                            </span>
                          ) : pos === 'BELUM_BUKA_KELAS' ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-500/15 text-amber-700 dark:text-amber-300 font-black text-xs border border-amber-500/30">
                              ● BELUM BUKA KELAS
                            </span>
                          ) : pos === 'IZIN_SAKIT' ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-rose-500/15 text-rose-700 dark:text-rose-300 font-black text-xs border border-rose-500/30">
                              ● {teacher.status_label}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold text-xs border border-slate-200 dark:border-slate-700">
                              STANDBY / KOSONG
                            </span>
                          )}
                        </div>
                      </div>

                      {/* CURRENT ACTIVE LOCATION BANNER */}
                      {teacher.current_session && (
                        <div className="p-3 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                          <div className="space-y-0.5 min-w-0">
                            <p className="text-[10px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                              Lokasi Kelas Saat Ini:
                            </p>
                            <p className="text-xs font-black text-slate-900 dark:text-white">
                              📍 Kelas <strong className="text-indigo-600 dark:text-indigo-400">{teacher.current_session.kelas_nama}</strong> • {teacher.current_session.mapel_nama}
                            </p>
                          </div>
                          <div className="flex items-center gap-1 font-mono text-xs font-bold text-slate-600 dark:text-slate-300 shrink-0">
                            <Clock size={12} className="text-indigo-500" />
                            <span>{teacher.current_session.jam_mulai} – {teacher.current_session.jam_selesai} WIB</span>
                          </div>
                        </div>
                      )}

                      {/* ACTION BAR: TIMELINE TOGGLE & WHATSAPP BUTTON */}
                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 flex-wrap">
                        <button
                          type="button"
                          onClick={() => setExpandedTeacherId(isExpanded ? null : teacher.guru_id)}
                          className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
                        >
                          <Calendar size={13} />
                          <span>Timeline Jadwal Hari Ini ({teacher.today_timeline.length})</span>
                          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </button>

                        {!isStudent && teacher.no_hp && (
                          <button
                            type="button"
                            onClick={() => handleOpenWa(teacher.no_hp, teacher.nama_guru)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-xs transition-all cursor-pointer"
                          >
                            <MessageSquare size={12} />
                            <span>Chat WhatsApp</span>
                          </button>
                        )}
                      </div>

                      {/* EXPANDABLE TODAY TIMELINE */}
                      {isExpanded && (
                        <div className="pt-2 space-y-1.5 border-t border-slate-100 dark:border-slate-800 animate-in fade-in duration-150">
                          {teacher.today_timeline.length === 0 ? (
                            <p className="text-xs text-slate-400 italic py-1">
                              Tidak ada jadwal KBM terjadwal untuk hari ini.
                            </p>
                          ) : (
                            teacher.today_timeline.map((s, idx) => (
                              <div
                                key={s.id || idx}
                                className={cn(
                                  "p-2 rounded-xl text-xs flex items-center justify-between gap-2",
                                  s.is_live
                                    ? "bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200"
                                    : "bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300"
                                )}
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className="font-mono font-bold text-[11px] shrink-0">
                                    {s.jam_mulai} – {s.jam_selesai}
                                  </span>
                                  <span className="font-extrabold truncate">
                                    {s.kelas_nama} • {s.mapel_nama}
                                  </span>
                                </div>
                                <span className="text-[10px] font-black uppercase shrink-0">
                                  {s.is_live ? 'Sedang Berlangsung' : s.is_finished ? 'Selesai' : s.is_ready ? 'Siap Dimulai' : 'Mendatang'}
                                </span>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* FOOTER SHORTCUT HINT */}
          <div className="px-5 py-3 bg-slate-50 dark:bg-slate-900/80 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400 font-medium">
            <span>💡 Tekan <kbd className="px-1.5 py-0.5 rounded-md bg-slate-200 dark:bg-slate-800 font-mono text-[10px] font-bold text-slate-700 dark:text-slate-300">ESC</kbd> untuk menutup</span>
            <span>Shortcut: <kbd className="px-1.5 py-0.5 rounded-md bg-slate-200 dark:bg-slate-800 font-mono text-[10px] font-bold text-slate-700 dark:text-slate-300">Ctrl + G</kbd></span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
