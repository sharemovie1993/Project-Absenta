import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { 
  Sparkles, 
  Calendar, 
  Users, 
  Crown, 
  Trash2, 
  Plus, 
  Share2, 
  Check, 
  RotateCcw, 
  Clock, 
  Flame, 
  ShieldAlert,
  ArrowRightLeft
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { toast } from 'sonner';
import type { Siswa } from '@/types/academic';
import type { PiketDaySlot, PiketMember } from './strukturTypes';

interface JadwalPiketPintarProps {
  kelasId?: string;
  kelasNama?: string;
  studentsList: Siswa[];
  isLoadingStudents?: boolean;
}

const DEFAULT_DAYS = [
  { dayIndex: 1, dayName: 'Senin', reguName: 'Regu A' },
  { dayIndex: 2, dayName: 'Selasa', reguName: 'Regu B' },
  { dayIndex: 3, dayName: 'Rabu', reguName: 'Regu C' },
  { dayIndex: 4, dayName: 'Kamis', reguName: 'Regu D' },
  { dayIndex: 5, dayName: 'Jumat', reguName: 'Regu E' },
];

export const JadwalPiketPintar: React.FC<JadwalPiketPintarProps> = React.memo(({
  kelasId = 'default',
  kelasNama = 'Kelas',
  studentsList = [],
  isLoadingStudents = false,
}) => {
  const storageKey = `absenta_walas_piket_${kelasId}`;

  // Deteksi Hari Ini (1: Senin, 2: Selasa, 3: Rabu, 4: Kamis, 5: Jumat)
  const currentDayOfWeek = useMemo(() => {
    const d = new Date().getDay();
    return d === 0 || d === 6 ? 1 : d; // Weekend default ke Senin
  }, []);

  // Mobile View State: Default ke hari ini untuk akses instan tanpa scroll boros
  const [selectedMobileDay, setSelectedMobileDay] = useState<number>(() => {
    const d = new Date().getDay();
    return d === 0 || d === 6 ? 1 : d;
  });
  const [mobileViewAll, setMobileViewAll] = useState<boolean>(false);

  // Algorithm pintar: Membagi rata seluruh siswa rombel ke 5 hari aktif
  const generateBalancedSlots = useCallback((students: Siswa[]): PiketDaySlot[] => {
    const total = students.length;
    if (total === 0) {
      return DEFAULT_DAYS.map((d) => ({
        ...d,
        members: [],
      }));
    }

    const baseCount = Math.floor(total / 5);
    const remainder = total % 5;

    let currentIndex = 0;
    return DEFAULT_DAYS.map((d, dayIdx) => {
      // Hari 0 s/d (remainder-1) mendapatkan baseCount + 1
      const countForThisDay = dayIdx < remainder ? baseCount + 1 : baseCount;
      const slice = students.slice(currentIndex, currentIndex + countForThisDay);
      currentIndex += countForThisDay;

      const members: PiketMember[] = slice.map((s, mIdx) => ({
        siswaId: s.id,
        nama: s.nama_siswa,
        nis: s.nis,
        gender: s.jenis_kelamin,
        isKoordinator: mIdx === 0, // Siswa pertama dijadikan koordinator regu
      }));

      return {
        ...d,
        members,
      };
    });
  }, []);

  // State Jadwal Piket
  const [slots, setSlots] = useState<PiketDaySlot[]>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length === 5) return parsed;
      }
    } catch {
      // ignore
    }
    return DEFAULT_DAYS.map((d) => ({ ...d, members: [] }));
  });

  // Otomatis generate jika baru pertama kali atau slots kosong dan studentsList tersedia
  useEffect(() => {
    if (studentsList.length > 0) {
      const isCompletelyEmpty = slots.every((s) => s.members.length === 0);
      if (isCompletelyEmpty) {
        const balanced = generateBalancedSlots(studentsList);
        setSlots(balanced);
        try {
          localStorage.setItem(storageKey, JSON.stringify(balanced));
        } catch {
          // ignore
        }
      }
    }
  }, [studentsList, slots, generateBalancedSlots, storageKey]);

  // Save to state & storage
  const handleSaveSlots = useCallback((newSlots: PiketDaySlot[]) => {
    setSlots(newSlots);
    try {
      localStorage.setItem(storageKey, JSON.stringify(newSlots));
    } catch {
      // ignore
    }
  }, [storageKey]);

  // Aksi Cepat: Bagi Rata Otomatis Ulang
  const handleAutoDistribute = useCallback(() => {
    if (studentsList.length === 0) {
      toast.error('Daftar siswa belum dimuat. Silakan tunggu sebentar.');
      return;
    }
    const balanced = generateBalancedSlots(studentsList);
    handleSaveSlots(balanced);
    const base = Math.floor(studentsList.length / 5);
    const rem = studentsList.length % 5;
    toast.success(
      `Pintar: Berhasil membagi rata ${studentsList.length} siswa ke 5 regu (${base}${rem > 0 ? `-${base + 1}` : ''} siswa/hari)!`
    );
  }, [studentsList, generateBalancedSlots, handleSaveSlots]);

  // Modal Tambah Anggota ke Hari Tertentu
  const [targetDayIndex, setTargetDayIndex] = useState<number | null>(null);
  const [selectedStudentToAdd, setSelectedStudentToAdd] = useState<string>('');

  const handleAddMember = () => {
    if (!targetDayIndex || !selectedStudentToAdd) return;
    const found = studentsList.find((s) => s.id === selectedStudentToAdd);
    if (!found) return;

    const newSlots = slots.map((slot) => {
      if (slot.dayIndex === targetDayIndex) {
        // Cek apakah siswa sudah ada di hari ini
        if (slot.members.some((m) => m.siswaId === found.id)) {
          toast.warning(`${found.nama_siswa} sudah terdaftar di regu ini.`);
          return slot;
        }
        const newMember: PiketMember = {
          siswaId: found.id,
          nama: found.nama_siswa,
          nis: found.nis,
          gender: found.jenis_kelamin,
          isKoordinator: slot.members.length === 0,
        };
        return {
          ...slot,
          members: [...slot.members, newMember],
        };
      }
      return slot;
    });

    handleSaveSlots(newSlots);
    setTargetDayIndex(null);
    setSelectedStudentToAdd('');
    toast.success(`${found.nama_siswa} berhasil ditambahkan ke regu piket.`);
  };

  // Hapus Siswa dari Slot
  const handleRemoveMember = (dayIndex: number, siswaId: string) => {
    const newSlots = slots.map((slot) => {
      if (slot.dayIndex === dayIndex) {
        const filtered = slot.members.filter((m) => m.siswaId !== siswaId);
        // Jika koordinator dihapus, tunjuk siswa pertama berikutnya sebagai koordinator
        if (filtered.length > 0 && !filtered.some((m) => m.isKoordinator)) {
          filtered[0].isKoordinator = true;
        }
        return { ...slot, members: filtered };
      }
      return slot;
    });
    handleSaveSlots(newSlots);
    toast.info('Siswa dihapus dari regu piket.');
  };

  // Toggle Koordinator Regu
  const handleToggleKoordinator = (dayIndex: number, siswaId: string) => {
    const newSlots = slots.map((slot) => {
      if (slot.dayIndex === dayIndex) {
        const updated = slot.members.map((m) => ({
          ...m,
          isKoordinator: m.siswaId === siswaId,
        }));
        return { ...slot, members: updated };
      }
      return slot;
    });
    handleSaveSlots(newSlots);
    toast.success('Koordinator regu piket berhasil diperbarui.');
  };

  // Salin Format Pengumuman WhatsApp
  const handleCopyWhatsApp = () => {
    const totalTerbagi = slots.reduce((acc, s) => acc + s.members.length, 0);
    let text = `🧹 *JADWAL REGU PIKET KEBERSIHAN KELAS ${kelasNama.toUpperCase()}*\n`;
    text += `Total Peserta: ${totalTerbagi} Siswa (${slots.length} Regu Kerja)\n`;
    text += `──────────────────────\n\n`;

    slots.forEach((s) => {
      text += `📅 *${s.dayName.toUpperCase()} (${s.reguName})* - ${s.members.length} Siswa\n`;
      const koord = s.members.find((m) => m.isKoordinator);
      if (koord) {
        text += `👑 *Koordinator:* ${koord.nama}\n`;
      }
      text += `Anggota:\n`;
      s.members.forEach((m, idx) => {
        text += `  ${idx + 1}. ${m.nama} (${m.gender || 'Siswa'})\n`;
      });
      text += `\n`;
    });

    text += `_Mohon hadir 15 menit sebelum bel masuk dan menjaga ketertiban 5R kelas._\n`;
    text += `*Wali Kelas ${kelasNama}*`;

    navigator.clipboard.writeText(text);
    toast.success('Teks jadwal piket berhasil disalin untuk broadcast WhatsApp!');
  };

  const totalAssignedStudents = useMemo(() => {
    return slots.reduce((acc, s) => acc + s.members.length, 0);
  }, [slots]);

  // Renderer kartu piket per hari (reusable antara mobile & desktop)
  const renderDayCard = (slot: PiketDaySlot) => {
    const isToday = slot.dayIndex === currentDayOfWeek;
    const maleCount = slot.members.filter((m) => m.gender === 'L').length;
    const femaleCount = slot.members.filter((m) => m.gender === 'P').length;

    return (
      <div
        key={slot.dayIndex}
        className={`rounded-2xl border transition-all flex flex-col justify-between overflow-hidden shadow-xs ${
          isToday
            ? 'border-emerald-500 dark:border-emerald-500 bg-white dark:bg-slate-900 ring-2 ring-emerald-500/20'
            : 'border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900'
        }`}
      >
        {/* Card Header */}
        <div
          className={`p-2.5 sm:p-3 border-b flex items-center justify-between ${
            isToday
              ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-100 dark:border-emerald-900'
              : 'bg-slate-50/80 dark:bg-slate-850 border-slate-100 dark:border-slate-800'
          }`}
        >
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-black text-slate-800 dark:text-slate-100">
                {slot.dayName}
              </span>
              {isToday && (
                <span className="px-1.5 py-0.2 bg-emerald-600 text-white text-[9px] font-black rounded-md flex items-center gap-0.5">
                  <Flame className="w-2.5 h-2.5" /> Hari Ini
                </span>
              )}
            </div>
            <span className="text-[10px] text-slate-400 font-semibold">
              {slot.reguName}
            </span>
          </div>

          <div className="text-right">
            <span className="text-[11px] font-black text-slate-700 dark:text-slate-200">
              {slot.members.length} Siswa
            </span>
            {(maleCount > 0 || femaleCount > 0) && (
              <div className="text-[9px] text-slate-400 font-bold">
                {maleCount}L • {femaleCount}P
              </div>
            )}
          </div>
        </div>

        {/* Member List */}
        <div className="p-2 sm:p-2.5 space-y-1 sm:space-y-1.5 flex-1 min-h-[130px] max-h-[300px] overflow-y-auto no-scrollbar">
          {slot.members.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center p-4 text-center text-slate-400">
              <Users className="w-5 h-5 mb-1 opacity-40" />
              <p className="text-[10px]">Belum ada regu</p>
            </div>
          ) : (
            slot.members.map((member, mIdx) => (
              <div
                key={member.siswaId || mIdx}
                className={`flex items-center justify-between p-1.5 rounded-xl border text-xs transition-colors ${
                  member.isKoordinator
                    ? 'bg-amber-50/50 dark:bg-amber-950/30 border-amber-200/80 dark:border-amber-900/60'
                    : 'bg-slate-50/50 dark:bg-slate-800/30 border-slate-100 dark:border-slate-800/80'
                }`}
              >
                <div className="min-w-0 flex items-center gap-1.5 flex-1 mr-1">
                  <span className="text-[10px] font-bold text-slate-400 w-3.5 text-center shrink-0">
                    {mIdx + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1">
                      <span className="font-semibold text-slate-800 dark:text-slate-200 text-[11px] truncate block" title={member.nama}>
                        {member.nama}
                      </span>
                      {member.isKoordinator && (
                        <Crown className="w-3 h-3 text-amber-500 shrink-0" title="Koordinator Regu" />
                      )}
                    </div>
                    {member.nis && (
                      <span className="text-[9px] text-slate-400 truncate block">
                        NIS: {member.nis}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-0.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleToggleKoordinator(slot.dayIndex, member.siswaId)}
                    className={`p-1 rounded-md cursor-pointer transition-colors ${
                      member.isKoordinator
                        ? 'text-amber-500 bg-amber-100/50 dark:bg-amber-900/40'
                        : 'text-slate-300 hover:text-amber-500'
                    }`}
                    title={member.isKoordinator ? 'Koordinator Regu' : 'Jadikan Koordinator'}
                  >
                    <Crown className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemoveMember(slot.dayIndex, member.siswaId)}
                    className="p-1 text-slate-300 hover:text-red-500 rounded-md cursor-pointer"
                    title="Hapus dari regu"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Card Footer: Add member button */}
        <div className="p-2 border-t border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setTargetDayIndex(slot.dayIndex)}
            className="w-full h-7 text-[11px] font-bold text-slate-600 dark:text-slate-400 hover:text-emerald-600 flex items-center justify-center gap-1 rounded-lg"
          >
            <Plus className="w-3 h-3" />
            <span>Tambah Siswa</span>
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4 w-full">
      {/* Top Smart Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 sm:p-3.5 bg-gradient-to-r from-emerald-50/80 via-teal-50/50 to-white dark:from-emerald-950/30 dark:via-slate-900 dark:to-slate-900 rounded-2xl border border-emerald-200/80 dark:border-emerald-800/60 shadow-2xs">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-2 sm:p-2.5 rounded-xl bg-emerald-600 text-white shadow-xs shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                Jadwal Piket Pintar
              </h4>
              <Badge variant="outline" className="text-[9px] sm:text-[10px] px-1.5 py-0 bg-emerald-100/60 text-emerald-800 dark:text-emerald-300 border-emerald-300">
                {totalAssignedStudents} Siswa
              </Badge>
            </div>
            <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 truncate">
              Membagi rata slot 5 hari ({studentsList.length > 0 ? `${Math.floor(studentsList.length / 5)}-${Math.ceil(studentsList.length / 5)} siswa/hari` : 'Senin s/d Jumat'})
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 self-end sm:self-auto w-full sm:w-auto justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyWhatsApp}
            className="h-7 sm:h-8 px-2 sm:px-2.5 text-xs text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 bg-white dark:bg-slate-900 rounded-xl flex items-center gap-1"
            title="Salin untuk WhatsApp"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span className="text-[11px]">Salin WA</span>
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={handleAutoDistribute}
            className="h-7 sm:h-8 px-2.5 sm:px-3 text-xs bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs flex items-center gap-1"
            title="Bagi rata seluruh siswa rombel ke 5 hari"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span className="text-[11px]">Bagi Rata</span>
          </Button>
        </div>
      </div>

      {/* ── TAMPILAN MOBILE: SHOPEE-GRADE DAY SELECTOR BAR (< 768px) ── */}
      <div className="block md:hidden space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Pilih Hari Piket
          </span>
          <button
            type="button"
            onClick={() => setMobileViewAll((v) => !v)}
            className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
          >
            {mobileViewAll ? 'Tampilkan Tab Harian' : 'Lihat Semua 5 Hari'}
          </button>
        </div>

        {!mobileViewAll && (
          <div className="grid grid-cols-5 gap-1.5">
            {slots.map((slot) => {
              const isToday = slot.dayIndex === currentDayOfWeek;
              const isSelected = selectedMobileDay === slot.dayIndex;
              return (
                <button
                  key={slot.dayIndex}
                  type="button"
                  onClick={() => setSelectedMobileDay(slot.dayIndex)}
                  className={`py-1.5 px-1 rounded-xl text-center transition-all cursor-pointer border ${
                    isSelected
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                      : isToday
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                      : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200/80 dark:border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-center gap-0.5 text-[11px] font-black">
                    <span>{slot.dayName.slice(0, 3)}</span>
                    {isToday && <Flame className="w-2.5 h-2.5 text-amber-400 shrink-0" />}
                  </div>
                  <div className="text-[9px] font-semibold opacity-85">
                    {slot.members.length}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Mobile Content Display */}
        {!mobileViewAll ? (
          <div>
            {slots
              .filter((s) => s.dayIndex === selectedMobileDay)
              .map(renderDayCard)}
          </div>
        ) : (
          <div className="space-y-3">
            {slots.map(renderDayCard)}
          </div>
        )}
      </div>

      {/* ── TAMPILAN DESKTOP / TABLET (>= 768px): GRID 5 KOLOM SIDE-BY-SIDE ── */}
      <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-5 gap-3">
        {slots.map(renderDayCard)}
      </div>

      {/* Modal Tambah Siswa ke Regu */}
      {targetDayIndex !== null && (
        <Modal
          isOpen={targetDayIndex !== null}
          onClose={() => {
            setTargetDayIndex(null);
            setSelectedStudentToAdd('');
          }}
          title={`Tambah Siswa ke Regu ${slots.find((s) => s.dayIndex === targetDayIndex)?.dayName}`}
          size="md"
        >
          <div className="p-4 space-y-4">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Pilih siswa rombel {kelasNama} untuk dimasukkan ke jadwal piket hari{' '}
              {slots.find((s) => s.dayIndex === targetDayIndex)?.dayName}.
            </p>

            <div>
              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Pilih Nama Siswa
              </label>
              <SearchableSelect
                options={studentsList.map((s) => ({
                  value: s.id,
                  label: `${s.nama_siswa} (${s.nis || 'Tanpa NIS'})`,
                }))}
                value={selectedStudentToAdd}
                onValueChange={setSelectedStudentToAdd}
                placeholder="Cari nama atau NIS siswa..."
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setTargetDayIndex(null);
                  setSelectedStudentToAdd('');
                }}
              >
                Batal
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleAddMember}
                disabled={!selectedStudentToAdd}
                className="bg-emerald-600 text-white"
              >
                Tambahkan ke Regu
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
});

JadwalPiketPintar.displayName = 'JadwalPiketPintar';
