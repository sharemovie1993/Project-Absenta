import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  X,
  Users,
  Calendar,
  Clock,
  Sparkles,
  UserCheck,
  Link2,
  Search,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { toast } from 'react-hot-toast';
import {
  attendanceStagingApi,
  type AttendanceStagingItem,
} from '@/api/attendance-staging.api';

export interface AttendanceStagingDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: AttendanceStagingItem | null;
  onSync: (id: string) => void;
  isSyncing?: boolean;
  onMappingSaved?: () => void;
}

export const AttendanceStagingDetailModal: React.FC<AttendanceStagingDetailModalProps> = React.memo(({
  isOpen,
  onClose,
  item,
  onSync,
  isSyncing = false,
  onMappingSaved,
}) => {
  const [searchFilter, setSearchFilter] = useState('');
  const [showOnlyUnmatched, setShowOnlyUnmatched] = useState(false);
  const [mappingData, setMappingData] = useState<any>(null);
  const [isLoadingMapping, setIsLoadingMapping] = useState(false);
  const [mappingTargetStudent, setMappingTargetStudent] = useState<any | null>(null);
  const [selectedMasterStudentId, setSelectedMasterStudentId] = useState('');
  const [isSavingMapping, setIsSavingMapping] = useState(false);

  // Load student mapping data
  const loadMappingData = useCallback(async () => {
    if (!item?.id) return;
    setIsLoadingMapping(true);
    try {
      const res = await attendanceStagingApi.getStudentsMapping(item.id);
      if (res.success) {
        setMappingData(res.data);
      }
    } catch (err) {
      console.error('Failed to load students mapping:', err);
    } finally {
      setIsLoadingMapping(false);
    }
  }, [item?.id]);

  useEffect(() => {
    if (isOpen && item?.id) {
      loadMappingData();
      setShowOnlyUnmatched(false);
      setSearchFilter('');
      setMappingTargetStudent(null);
    }
  }, [isOpen, item?.id, loadMappingData]);

  const rawData = item?.raw_sheet_data;
  const sessions = rawData?.sessions || [];
  const students = rawData?.students || [];

  // Map student matching status by sheetNo
  const studentMatchMap = useMemo(() => {
    const map = new Map<number, { isMatched: boolean; matchedStudent: any }>();
    if (mappingData?.sheetStudents) {
      for (const st of mappingData.sheetStudents) {
        map.set(st.no, {
          isMatched: st.isMatched,
          matchedStudent: st.matchedStudent,
        });
      }
    }
    return map;
  }, [mappingData]);

  // Unmatched count
  const unmatchedCount = useMemo(() => {
    if (!mappingData?.sheetStudents) return 0;
    return mappingData.sheetStudents.filter((s: any) => !s.isMatched).length;
  }, [mappingData]);

  // Filter students based on search and unmatched toggle
  const filteredStudents = useMemo(() => {
    let list = students;
    if (showOnlyUnmatched) {
      list = list.filter((s) => {
        const matchInfo = studentMatchMap.get(s.no);
        return matchInfo ? !matchInfo.isMatched : false;
      });
    }
    if (!searchFilter.trim()) return list;
    const q = searchFilter.toLowerCase();
    return list.filter(
      (s) =>
        s.nama.toLowerCase().includes(q) ||
        s.nis.toLowerCase().includes(q) ||
        s.nisn.toLowerCase().includes(q)
    );
  }, [students, searchFilter, showOnlyUnmatched, studentMatchMap]);

  // Handle single student mapping save
  const handleSaveStudentMapping = async () => {
    if (!item?.id || !mappingTargetStudent || !selectedMasterStudentId) {
      toast.error('Pilih siswa master terlebih dahulu.');
      return;
    }

    setIsSavingMapping(true);
    try {
      const res = await attendanceStagingApi.mapStudents(item.id, [
        { sheetNo: mappingTargetStudent.no, siswaId: selectedMasterStudentId },
      ]);
      if (res.success) {
        toast.success(`Siswa ${mappingTargetStudent.nama} berhasil dipetakan.`);
        setMappingTargetStudent(null);
        setSelectedMasterStudentId('');
        await loadMappingData();
        onMappingSaved?.();
      } else {
        toast.error(res.message || 'Gagal memetakan siswa.');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Gagal memetakan siswa.');
    } finally {
      setIsSavingMapping(false);
    }
  };

  if (!isOpen || !item) return null;

  const currentMatched = mappingData?.totalMatchedSiswa ?? item.total_matched_siswa;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="5xl"
      title={
        <div className="flex flex-col sm:flex-row sm:items-center justify-between w-full pr-6 sm:pr-8 gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <FileSpreadsheet size={18} className="text-indigo-600 shrink-0" />
            <span className="truncate">
              Pratinjau Data Kelas: <strong className="text-slate-900 dark:text-white">{item.nama_kelas}</strong>
            </span>
            <Badge variant="outline" className="text-[10px] font-mono shrink-0">
              {item.sheet_name}
            </Badge>
          </div>
          <Button
            size="sm"
            type="button"
            disabled={isSyncing}
            onClick={() => {
              onSync(item.id);
            }}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs rounded-xl gap-1.5 shadow-xs font-semibold shrink-0"
          >
            <RefreshCw size={12} className={cn(isSyncing && 'animate-spin')} />
            <span>{isSyncing ? 'Menyinkronkan...' : 'Sinkronkan Rombel Ini'}</span>
          </Button>
        </div>
      }
      description={`Periode: ${item.rentang_tanggal || '1 Minggu'} • Total: ${item.total_siswa} Siswa (${currentMatched} Cocok di Absenta) • ${sessions.length} Sesi Terdeteksi`}
    >
      <div className="p-4 sm:p-6 pt-2 max-h-[75vh] overflow-y-auto space-y-4 w-full min-w-0">
        {/* Smart Day & Column Dispatcher Preview Chips */}
        <div className="p-3.5 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 space-y-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="text-xs font-bold text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5">
              <Sparkles size={14} className="text-indigo-600 dark:text-indigo-400" />
              <span>Smart Dispatcher: Pemetaan Otomatis Sesi Berdasarkan Hari & Kolom</span>
            </span>
            <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold">
              Terdistribusi ke Multi-Agenda
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
            <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
              <div className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase">🟦 Senin Pagi (UP)</div>
              <div className="text-xs font-black text-slate-800 dark:text-slate-200 mt-0.5">Upacara Bendera</div>
              <div className="text-[9.5px] text-slate-400">1 Sesi Mingguan</div>
            </div>

            <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
              <div className="text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase">🟥 Sel, Rab, Kam (AP)</div>
              <div className="text-xs font-black text-slate-800 dark:text-slate-200 mt-0.5">Latihan Ketarunaan</div>
              <div className="text-[9.5px] text-slate-400">3 Sesi Mingguan</div>
            </div>

            <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
              <div className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase">🟩 Jum'at Pagi (AP)</div>
              <div className="text-xs font-black text-slate-800 dark:text-slate-200 mt-0.5">Pembiasaan Dhuha</div>
              <div className="text-[9.5px] text-slate-400">1 Sesi Mingguan</div>
            </div>

            <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
              <div className="text-[10px] font-bold text-purple-600 dark:text-purple-400 uppercase">🟪 Sore Hari (AS)</div>
              <div className="text-xs font-black text-slate-800 dark:text-slate-200 mt-0.5">Apel Pulang Siswa</div>
              <div className="text-[9.5px] text-slate-400">Semua Hari Sore</div>
            </div>
          </div>
        </div>

        {/* Unmatched Alert Banner & Action */}
        {unmatchedCount > 0 && (
          <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span className="text-xs font-medium text-amber-800 dark:text-amber-200">
                Terdapat <strong>{unmatchedCount} siswa</strong> yang belum terhubung ke database master (misal karena NIS kosong atau salah ketik nama).
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowOnlyUnmatched(!showOnlyUnmatched)}
              className="text-xs font-bold text-amber-700 dark:text-amber-300 hover:underline px-2.5 py-1 rounded-lg bg-amber-100 dark:bg-amber-900/50"
            >
              {showOnlyUnmatched ? 'Tampilkan Semua Siswa' : `Filter ${unmatchedCount} Siswa Belum Cocok`}
            </button>
          </div>
        )}

        {/* Search bar & info */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <input
            type="text"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            placeholder="Cari nama siswa, NIS, atau NISN..."
            className="text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white w-full sm:w-72 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span>Menampilkan <strong>{filteredStudents.length}</strong> dari <strong>{students.length}</strong> siswa</span>
          </div>
        </div>

        {/* Matrix Tabel Presensi */}
        <div className="border border-slate-200/80 dark:border-slate-800 rounded-2xl overflow-hidden shadow-2xs">
          <div className="overflow-x-auto max-h-[50vh] no-scrollbar">
            <table className="w-full text-left border-collapse text-[11px]">
              <thead className="bg-slate-50 dark:bg-slate-800/80 sticky top-0 z-10 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="p-2.5 font-bold text-slate-700 dark:text-slate-300 w-10 text-center">No</th>
                  <th className="p-2.5 font-bold text-slate-700 dark:text-slate-300 w-24">NIS</th>
                  <th className="p-2.5 font-bold text-slate-700 dark:text-slate-300 min-w-[200px]">Nama Siswa & Status DB</th>
                  {sessions.map((sess, sIdx) => (
                    <th key={sIdx} className="p-2 font-bold text-center border-l border-slate-200 dark:border-slate-700 whitespace-nowrap min-w-[48px]">
                      <div className="text-[9px] text-slate-400 font-semibold">{sess.day.slice(0, 3)}</div>
                      <div className={cn(
                        'text-[10px] font-black',
                        sess.sessionCode === 'UP' ? 'text-blue-600' : sess.sessionCode === 'AS' ? 'text-purple-600' : 'text-slate-700 dark:text-slate-200'
                      )}>
                        {sess.sessionCode}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={3 + sessions.length} className="p-8 text-center text-slate-400">
                      Tidak ada siswa yang cocok dengan pencarian
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((st) => {
                    const matchInfo = studentMatchMap.get(st.no);
                    const isMatched = matchInfo?.isMatched ?? false;

                    return (
                      <tr key={st.no} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="p-2 text-center text-slate-400 font-mono text-[10px]">{st.no}</td>
                        <td className="p-2 font-mono text-[10px] text-slate-600 dark:text-slate-300">
                          {st.nis || matchInfo?.matchedStudent?.nis || '-'}
                        </td>
                        <td className="p-2 max-w-[220px]">
                          <div className="font-semibold text-slate-900 dark:text-white truncate" title={st.nama}>
                            {st.nama}
                          </div>
                          
                          {/* Status DB & Action Pemetaan Manual */}
                          <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                            {isMatched ? (
                              <span className="inline-flex items-center gap-1 text-[9.5px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
                                <CheckCircle2 size={10} />
                                <span>Cocok di DB</span>
                              </span>
                            ) : (
                              <div className="flex items-center gap-1.5">
                                <span className="inline-flex items-center gap-1 text-[9.5px] font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-md border border-amber-200 dark:border-amber-800">
                                  <AlertTriangle size={10} />
                                  <span>Belum Terhubung</span>
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setMappingTargetStudent(st);
                                    setSelectedMasterStudentId('');
                                  }}
                                  className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-200 underline inline-flex items-center gap-0.5"
                                  title="Petakan siswa ini ke data master secara manual"
                                >
                                  <Link2 size={10} /> Petakan
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                        {sessions.map((sess, sIdx) => {
                          const status = st.attendance[`${sess.dateIso}_${sess.sessionCode}`] || 'HADIR';
                          return (
                            <td key={sIdx} className="p-1.5 text-center border-l border-slate-100 dark:border-slate-800">
                              <span
                                className={cn(
                                  'inline-block w-6 h-6 leading-6 text-center text-[10px] font-black rounded-lg',
                                  status === 'HADIR' && 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800',
                                  status === 'SAKIT' && 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800',
                                  status === 'IZIN' && 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800',
                                  status === 'ALPA' && 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800',
                                  status === 'DISPENSASI' && 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
                                )}
                                title={`${sess.day} (${sess.dateStr}) [${sess.sessionCode}]: ${status}`}
                              >
                                {status === 'HADIR' ? 'H' : status === 'SAKIT' ? 'S' : status === 'IZIN' ? 'I' : status === 'ALPA' ? 'A' : 'D'}
                              </span>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal Dialog Pemetaan Siswa Manual */}
      {mappingTargetStudent && (
        <Modal
          isOpen={Boolean(mappingTargetStudent)}
          onClose={() => setMappingTargetStudent(null)}
          size="md"
          title={
            <div className="flex items-center gap-2">
              <UserCheck size={18} className="text-indigo-600" />
              <span>Petakan Siswa ke Database Master</span>
            </div>
          }
          description={`Hubungkan data siswa dari Google Sheet dengan siswa resmi di rombel ${item.nama_kelas}.`}
        >
          <div className="p-5 space-y-4">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-1">
              <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Data di Google Sheet:</div>
              <div className="text-sm font-bold text-slate-800 dark:text-slate-100">
                {mappingTargetStudent.no}. {mappingTargetStudent.nama}
              </div>
              <div className="text-xs font-mono text-slate-500">
                NIS: {mappingTargetStudent.nis || '(Kosong di Sheet)'}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Pilih Siswa Master yang Sesuai:
              </label>
              <select
                value={selectedMasterStudentId}
                onChange={(e) => setSelectedMasterStudentId(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="">-- Pilih Siswa Master di Rombel Ini --</option>
                {(mappingData?.classStudents || []).map((cs: any) => (
                  <option key={cs.siswaId} value={cs.siswaId}>
                    {cs.nama} {cs.nis ? `(NIS: ${cs.nis})` : ''}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-slate-400">
                Pilihan menampilkan seluruh siswa aktif yang terdaftar di kelas master ini.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setMappingTargetStudent(null)}
              >
                Batal
              </Button>
              <Button
                size="sm"
                disabled={!selectedMasterStudentId || isSavingMapping}
                onClick={handleSaveStudentMapping}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
              >
                {isSavingMapping ? 'Menyimpan...' : 'Simpan Pemetaan'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </Modal>
  );
});

AttendanceStagingDetailModal.displayName = 'AttendanceStagingDetailModal';

AttendanceStagingDetailModal.displayName = 'AttendanceStagingDetailModal';
