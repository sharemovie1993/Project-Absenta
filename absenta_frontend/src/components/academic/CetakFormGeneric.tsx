import React from 'react';
import { Loader2, Edit3 } from 'lucide-react';
import type { Kelas, Guru, Siswa } from '../../types/academic';

export interface DocOption {
  value: string;
  label: string;
  requireClass?: boolean;
}

interface CetakFormGenericProps {
  selectedPrintType: string;
  setSelectedPrintType: (val: string) => void;
  selectedClassId: string;
  setSelectedClassId: (val: string) => void;
  selectedGuruId?: string;
  setSelectedGuruId?: (val: string) => void;
  selectedStudentId?: string;
  setSelectedStudentId?: (val: string) => void;
  eventDetails?: Record<string, string>;
  setEventDetails?: (val: Record<string, string>) => void;
  includeSchoolLogo: boolean;
  setIncludeSchoolLogo: (val: boolean) => void;
  classes: Kelas[];
  loadingClasses: boolean;
  gurus?: Guru[];
  loadingGurus?: boolean;
  students?: Siswa[];
  loadingStudents?: boolean;
  docOptions: DocOption[];
}

export const CetakFormGeneric: React.FC<CetakFormGenericProps> = ({
  selectedPrintType,
  setSelectedPrintType,
  selectedClassId,
  setSelectedClassId,
  selectedGuruId = '',
  setSelectedGuruId,
  selectedStudentId = '',
  setSelectedStudentId,
  eventDetails = {},
  setEventDetails,
  includeSchoolLogo,
  setIncludeSchoolLogo,
  classes,
  loadingClasses,
  gurus = [],
  loadingGurus = false,
  students = [],
  loadingStudents = false,
  docOptions
}) => {
  const currentDoc = docOptions.find(o => o.value === selectedPrintType);
  
  // Show class selector only if requireClass is true AND it's not the teacher roster
  const showClassSelector = (currentDoc?.requireClass ?? true) && selectedPrintType !== 'roster_teacher';
  
  // Show teacher selector only if it's roster_teacher
  const showTeacherSelector = selectedPrintType === 'roster_teacher';

  const computedTingkatList = React.useMemo(() => {
    const list = classes.map(c => Number(c.tingkat)).filter(t => !isNaN(t) && t > 0);
    return Array.from(new Set(list)).sort((a, b) => a - b);
  }, [classes]);

  return (
    <div className="space-y-4 py-2">
      {/* Document Type Dropdown */}
      <div className="space-y-1">
        <label className="text-xs font-black uppercase text-slate-400 block">Jenis Dokumen Fisik</label>
        <select
          value={selectedPrintType}
          onChange={(e) => {
            const val = e.target.value;
            setSelectedPrintType(val);
          }}
          className="w-full text-xs font-semibold px-3 py-2 border rounded-lg bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {docOptions.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {/* Class/Room Selector */}
      {showClassSelector && (
        <div className="space-y-1">
          <label className="text-xs font-black uppercase text-slate-400 block">
            {selectedPrintType === 'room_inventory' ? 'Pilih Ruangan / Area' : 'Pilih Kelas'}
          </label>
          {loadingClasses ? (
            <div className="text-xs font-semibold text-slate-400 flex items-center gap-1.5 py-1">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> {selectedPrintType === 'room_inventory' ? 'Memuat ruangan...' : 'Memuat kelas...'}
            </div>
          ) : (
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="w-full text-xs font-semibold px-3 py-2 border rounded-lg bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 text-blue-600 dark:text-blue-400 font-bold"
            >
              {computedTingkatList.map(t => (
                <option key={`all_tingkat_${t}`} value={`all_tingkat_${t}`}>
                  🖨️ CETAK TINGKAT {t} (MASAL)
                </option>
              ))}
              <option value="all">
                {selectedPrintType === 'room_inventory' ? '🖨️ CETAK SEMUA RUANGAN' : '🖨️ CETAK SEMUA KELAS (SELURUH SEKOLAH)'}
              </option>
              {classes.map(c => (
                <option key={c.id} value={c.id}>
                  {selectedPrintType === 'room_inventory' ? c.nama_kelas : `${c.nama_kelas} (Tingkat ${c.tingkat})`}
                </option>
              ))}
            </select>
          )}
        </div>
      )}

      {/* Student Selector */}
      {['letter_summons', 'letter_bk_call', 'attendance_warning', 'student_attendance_card', 'bk_consult', 'bk_minutes', 'bk_statement'].includes(selectedPrintType) && selectedClassId !== 'all' && setSelectedStudentId && (
        <div className="space-y-1">
          <label className="text-xs font-black uppercase text-slate-400 block">Pilih Siswa</label>
          {loadingStudents ? (
            <div className="text-xs font-semibold text-slate-400 flex items-center gap-1.5 py-1">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Memuat siswa...
            </div>
          ) : (
            <select
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              className="w-full text-xs font-semibold px-3 py-2 border rounded-lg bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 text-blue-600 dark:text-blue-400 font-bold"
            >
              {students.length === 0 ? (
                <option value="">(Tidak ada siswa di kelas ini)</option>
              ) : (
                students.map(s => (
                  <option key={s.id} value={s.id}>{s.nama_siswa} (NIS. {s.nis})</option>
                ))
              )}
            </select>
          )}
        </div>
      )}

      {/* Teacher Selector */}
      {showTeacherSelector && setSelectedGuruId && (
        <div className="space-y-1">
          <label className="text-xs font-black uppercase text-slate-400 block">Pilih Guru</label>
          {loadingGurus ? (
            <div className="text-xs font-semibold text-slate-400 flex items-center gap-1.5 py-1">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Memuat daftar guru...
            </div>
          ) : (
            <select
              value={selectedGuruId}
              onChange={(e) => setSelectedGuruId(e.target.value)}
              className="w-full text-xs font-semibold px-3 py-2 border rounded-lg bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 text-blue-600 dark:text-blue-400 font-bold"
            >
              <option value="all">🖨️ CETAK SEMUA GURU</option>
              {gurus.map(g => (
                <option key={g.id} value={g.id}>{g.nama_guru} {g.nip ? `(NIP. ${g.nip})` : ''}</option>
              ))}
            </select>
          )}
        </div>
      )}

      {/* Event Details Form (Only for summons & minutes) */}
      {['letter_summons', 'letter_bk_call', 'bk_minutes', 'bk_statement'].includes(selectedPrintType) && setEventDetails && (
        <div className="space-y-3 p-3.5 rounded-xl bg-blue-50/40 dark:bg-blue-950/10 border border-blue-100 dark:border-blue-900/30">
          <div className="flex items-center gap-2 pb-1.5 border-b border-blue-100/60 dark:border-blue-900/20">
            <Edit3 size={13} className="text-blue-600 dark:text-blue-400" />
            <h4 className="text-xs font-bold uppercase text-blue-600 dark:text-blue-400 tracking-wider">Editor Undangan</h4>
          </div>
          
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-slate-400 block">Nomor Surat</label>
            <input
              type="text"
              placeholder="Contoh: 800 / 025 / Kesiswaan / 2026"
              value={eventDetails.nomorSurat || ''}
              onChange={(e) => setEventDetails({ ...eventDetails, nomorSurat: e.target.value })}
              className="w-full text-xs font-semibold px-3 py-2 border rounded-lg bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-slate-400 block">Tanggal Pertemuan</label>
            <input
              type="date"
              value={eventDetails.tanggalPertemuan || ''}
              onChange={(e) => setEventDetails({ ...eventDetails, tanggalPertemuan: e.target.value })}
              className="w-full text-xs font-semibold px-3 py-2 border rounded-lg bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-slate-400 block">Waktu Pertemuan</label>
            <input
              type="text"
              placeholder="Contoh: 08.00 WIB s.d Selesai"
              value={eventDetails.waktuPertemuan || ''}
              onChange={(e) => setEventDetails({ ...eventDetails, waktuPertemuan: e.target.value })}
              className="w-full text-xs font-semibold px-3 py-2 border rounded-lg bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-slate-400 block">Tempat Pertemuan</label>
            <input
              type="text"
              placeholder="Contoh: Ruang Piket / Kesiswaan"
              value={eventDetails.tempatPertemuan || ''}
              onChange={(e) => setEventDetails({ ...eventDetails, tempatPertemuan: e.target.value })}
              className="w-full text-xs font-semibold px-3 py-2 border rounded-lg bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-slate-400 block">Agenda Pertemuan</label>
            <textarea
              rows={2}
              placeholder="Contoh: Klarifikasi & Pembinaan Khusus Siswa"
              value={eventDetails.agendaPertemuan || ''}
              onChange={(e) => setEventDetails({ ...eventDetails, agendaPertemuan: e.target.value })}
              className="w-full text-xs font-semibold px-3 py-2 border rounded-lg bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
        </div>
      )}
      {/* Month Selector for Monthly & Semester Attendance Recap */}
      {(selectedPrintType === 'monthly_recap' || selectedPrintType === 'semester_recap') && eventDetails && setEventDetails && (
        <div className="space-y-1">
          <label className="text-xs font-black uppercase text-slate-400 block">Pilih Bulan & Tahun</label>
          <input
            type="month"
            value={eventDetails.bulanRekap || new Date().toISOString().substring(0, 7)}
            onChange={(e) => setEventDetails({ ...eventDetails, bulanRekap: e.target.value })}
            className="w-full text-xs font-semibold px-3 py-2 border rounded-lg bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 text-blue-600 dark:text-blue-400 font-bold"
          />
        </div>
      )}

      {/* Date Selector for Teacher Attendance */}
      {selectedPrintType === 'teacher_attendance' && eventDetails && setEventDetails && (
        <div className="space-y-1">
          <label className="text-xs font-black uppercase text-slate-400 block">Pilih Tanggal Laporan</label>
          <input
            type="date"
            value={eventDetails.tanggalLaporan || new Date().toISOString().substring(0, 10)}
            onChange={(e) => setEventDetails({ ...eventDetails, tanggalLaporan: e.target.value })}
            className="w-full text-xs font-semibold px-3 py-2 border rounded-lg bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 text-blue-600 dark:text-blue-400 font-bold"
          />
        </div>
      )}

      {/* Checkbox to Toggle Right Logo (Sekolah) */}
      <div className="flex items-center gap-2 pt-2">
        <input
          type="checkbox"
          id="toggle-school-logo"
          checked={includeSchoolLogo}
          onChange={(e) => setIncludeSchoolLogo(e.target.checked)}
          className="w-4 h-4 rounded text-blue-600 border-slate-300 dark:border-slate-800 focus:ring-blue-500 bg-white dark:bg-slate-900"
        />
        <label htmlFor="toggle-school-logo" className="text-xs font-bold text-slate-700 dark:text-slate-300 select-none cursor-pointer">
          Sertakan Logo Sekolah (Kanan)
        </label>
      </div>
    </div>
  );
};
