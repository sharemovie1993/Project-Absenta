import React, { useMemo } from 'react';
import { JadwalPiketGuru } from '@/api/piketGuru.api';
import { Button, Badge } from '@/components/ui';
import { Edit, Trash2, ShieldCheck, Wrench, Building2, Clock, CheckCircle } from 'lucide-react';

interface PiketTableViewProps {
  schedules: JadwalPiketGuru[];
  currentGuruId?: string;
  isKurikulumAdmin: boolean;
  onEdit: (item: JadwalPiketGuru) => void;
  onDelete: (id: string) => void;
}

interface PiketGroup {
  key: string;
  title: string;
  description: string;
  badgeClass: string;
  headerBorderClass: string;
  iconBgClass: string;
  iconColorClass: string;
  icon: React.ReactNode;
  items: JadwalPiketGuru[];
}

export const PiketTableView: React.FC<PiketTableViewProps> = React.memo(({
  schedules,
  currentGuruId,
  isKurikulumAdmin,
  onEdit,
  onDelete,
}) => {
  // Helper deteksi shift
  const getShiftBadge = (slotMulai?: number | null, slotSelesai?: number | null) => {
    const start = slotMulai || 1;
    const end = slotSelesai || 10;
    const diff = end - start;

    if (diff >= 8) {
      return {
        label: 'Full Day',
        className: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/50 dark:text-indigo-300 dark:border-indigo-800',
        icon: '⚡'
      };
    }
    if (start <= 2 && end <= 7) {
      return {
        label: 'Shift Pagi',
        className: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/50 dark:text-sky-300 dark:border-sky-800',
        icon: '🌅'
      };
    }
    if (start >= 6) {
      return {
        label: 'Shift Siang',
        className: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800',
        icon: '☀️'
      };
    }
    return {
      label: 'Sesi Khusus',
      className: 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
      icon: '⏰'
    };
  };

  // Pengelompokan cerdas berdasarkan jenis piket
  const groupedSections: PiketGroup[] = useMemo(() => {
    const umum: JadwalPiketGuru[] = [];
    const jurusan: JadwalPiketGuru[] = [];
    const khusus: JadwalPiketGuru[] = [];

    (schedules ?? []).forEach((item) => {
      const pos = (item.pos_piket || '').trim().toLowerCase();
      if (!pos || pos.includes('umum') || pos.includes('gerbang') || pos.includes('kbm') || pos.includes('utama')) {
        umum.push(item);
      } else if (
        pos.includes('jurusan') ||
        pos.includes('bengkel') ||
        pos.includes('lab') ||
        pos.includes('prodi') ||
        pos.includes('kejuruan')
      ) {
        jurusan.push(item);
      } else {
        khusus.push(item);
      }
    });

    const sortBySlot = (a: JadwalPiketGuru, b: JadwalPiketGuru) => (a.slot_mulai || 1) - (b.slot_mulai || 1);
    umum.sort(sortBySlot);
    jurusan.sort(sortBySlot);
    khusus.sort(sortBySlot);

    const groups: PiketGroup[] = [];

    if (umum.length > 0) {
      groups.push({
        key: 'umum',
        title: 'Piket Umum / KBM & Lingkungan',
        description: 'Pengawasan gerbang utama, ketertiban siswa, dan kelancaran KBM harian sekolah',
        badgeClass: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/70 dark:text-indigo-300',
        headerBorderClass: 'border-l-4 border-l-indigo-600',
        iconBgClass: 'bg-indigo-50 dark:bg-indigo-950/60',
        iconColorClass: 'text-indigo-600 dark:text-indigo-400',
        icon: <ShieldCheck className="w-4 h-4" />,
        items: umum,
      });
    }

    if (jurusan.length > 0) {
      groups.push({
        key: 'jurusan',
        title: 'Piket Jurusan / Bengkel & Praktik',
        description: 'Pengawasan lab kejuruan, bengkel industri, dan inventaris praktik siswa',
        badgeClass: 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300',
        headerBorderClass: 'border-l-4 border-l-amber-500',
        iconBgClass: 'bg-amber-50 dark:bg-amber-950/60',
        iconColorClass: 'text-amber-600 dark:text-amber-400',
        icon: <Wrench className="w-4 h-4" />,
        items: jurusan,
      });
    }

    if (khusus.length > 0) {
      groups.push({
        key: 'khusus',
        title: 'Piket Pos Khusus / Penugasan Lainnya',
        description: 'Penugasan pos tematik atau wilayah operasional khusus',
        badgeClass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300',
        headerBorderClass: 'border-l-4 border-l-emerald-500',
        iconBgClass: 'bg-emerald-50 dark:bg-emerald-950/60',
        iconColorClass: 'text-emerald-600 dark:text-emerald-400',
        icon: <Building2 className="w-4 h-4" />,
        items: khusus,
      });
    }

    if (groups.length === 0 && (schedules ?? []).length > 0) {
      groups.push({
        key: 'semua',
        title: 'Daftar Penugasan Guru Piket',
        description: 'Daftar seluruh guru yang ditugaskan pada hari ini',
        badgeClass: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200',
        headerBorderClass: 'border-l-4 border-l-slate-500',
        iconBgClass: 'bg-slate-100 dark:bg-slate-800',
        iconColorClass: 'text-slate-600 dark:text-slate-300',
        icon: <Clock className="w-4 h-4" />,
        items: schedules,
      });
    }

    return groups;
  }, [schedules]);

  if ((schedules ?? []).length === 0) {
    return (
      <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 text-xs text-slate-400">
        Belum ada guru piket yang ditugaskan pada hari ini.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {groupedSections.map((group) => (
        <div
          key={group.key}
          className={`rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs ${group.headerBorderClass}`}
        >
          {/* Header Kelompok */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-slate-50/70 dark:bg-slate-800/40 border-b border-slate-200/70 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className={`p-2 rounded-xl ${group.iconBgClass} ${group.iconColorClass}`}>
                {group.icon}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-extrabold text-slate-800 dark:text-slate-100">
                    {group.title}
                  </h3>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${group.badgeClass}`}>
                    {group.items.length} Guru
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  {group.description}
                </p>
              </div>
            </div>
          </div>

          {/* Tabel / List Terstruktur */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800/80 text-[11px] font-bold text-slate-400 bg-slate-50/30 dark:bg-slate-900/50">
                  <th className="py-2.5 px-4 w-12 text-center">NO</th>
                  <th className="py-2.5 px-4">GURU BERTUGAS</th>
                  <th className="py-2.5 px-4">SHIFT & WAKTU PIKET</th>
                  <th className="py-2.5 px-4">POS / WILAYAH TUGAS</th>
                  <th className="py-2.5 px-4">CATATAN</th>
                  <th className="py-2.5 px-4 text-right w-24">AKSI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {group.items.map((item, idx) => {
                  const isMe = currentGuruId && item.guru_id === currentGuruId;
                  const shift = getShiftBadge(item.slot_mulai, item.slot_selesai);

                  return (
                    <tr
                      key={item.id}
                      className={`transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-800/40 ${
                        isMe ? 'bg-indigo-50/30 dark:bg-indigo-950/20 font-medium' : ''
                      }`}
                    >
                      {/* No */}
                      <td className="py-3 px-4 text-center text-slate-400 text-[11px] font-bold">
                        {idx + 1}
                      </td>

                      {/* Guru Bertugas */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-bold text-[10px] shrink-0">
                            {item.Guru?.nama_guru?.substring(0, 2).toUpperCase() || 'GP'}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-extrabold text-slate-900 dark:text-slate-100 text-xs">
                                {item.Guru?.nama_guru || '-'}
                              </span>
                              {isMe && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-indigo-600 text-white">
                                  Saya
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-400">
                              NIP: {item.Guru?.nip || '-'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Shift & Waktu */}
                      <td className="py-3 px-4">
                        <div className="flex flex-col gap-1 items-start">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${shift.className}`}
                            >
                              <span>{shift.icon}</span>
                              <span>{shift.label}</span>
                            </span>
                            <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300">
                              Slot Jam {item.slot_mulai || 1} s/d {item.slot_selesai || 10}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {item.jam_mulai} - {item.jam_selesai} WIB
                          </span>
                        </div>
                      </td>

                      {/* Pos / Wilayah Tugas */}
                      <td className="py-3 px-4">
                        <Badge
                          variant="secondary"
                          className="text-[10px] font-bold px-2.5 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200/60 dark:border-slate-700"
                        >
                          {item.pos_piket || 'Piket Umum'}
                        </Badge>
                      </td>

                      {/* Catatan */}
                      <td className="py-3 px-4">
                        {item.catatan ? (
                          <span className="text-[11px] text-slate-500 dark:text-slate-400 italic line-clamp-1">
                            "{item.catatan}"
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-300 dark:text-slate-600">-</span>
                        )}
                      </td>

                      {/* Aksi */}
                      <td className="py-3 px-4 text-right">
                        {isKurikulumAdmin ? (
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => onEdit(item)}
                              className="w-7 h-7 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
                              title="Edit Penugasan Piket"
                            >
                              <Edit size={13} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => onDelete(item.id)}
                              className="w-7 h-7 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                              title="Hapus Penugasan Piket"
                            >
                              <Trash2 size={13} />
                            </Button>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                            <CheckCircle size={12} /> Terjadwal
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
});

export default PiketTableView;
