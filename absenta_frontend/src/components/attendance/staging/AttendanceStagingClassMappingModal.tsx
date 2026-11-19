import React, { useState, useEffect, useMemo } from 'react';
import {
  Layers,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Search,
  ArrowRight,
  ShieldCheck,
  Check,
  X,
  Sparkles,
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

export interface AttendanceStagingClassMappingModalProps {
  isOpen: boolean;
  onClose: () => void;
  sheets: AttendanceStagingItem[];
  classOptions: Array<{ id: string; nama_kelas: string; tingkat: number; jurusan_nama?: string }>;
  onMappingSaved: () => void;
}

export const AttendanceStagingClassMappingModal: React.FC<AttendanceStagingClassMappingModalProps> = React.memo(({
  isOpen,
  onClose,
  sheets,
  classOptions,
  onMappingSaved,
}) => {
  // Mapping state: { [sheetId]: selectedKelasId }
  const [mappings, setMappings] = useState<Record<string, string>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Inisialisasi mappings dari existing sheets
  useEffect(() => {
    if (isOpen && sheets.length > 0) {
      const initial: Record<string, string> = {};
      sheets.forEach((s) => {
        initial[s.id] = s.kelas_id || '';
      });
      setMappings(initial);
    }
  }, [isOpen, sheets]);

  // Kelompokkan kelas options per tingkat
  const groupedClasses = useMemo(() => {
    const map: Record<number, Array<{ id: string; nama_kelas: string; tingkat: number; jurusan_nama?: string }>> = {};
    classOptions.forEach((c) => {
      const t = c.tingkat || 10;
      if (!map[t]) map[t] = [];
      map[t].push(c);
    });
    return map;
  }, [classOptions]);

  // Filter sheets
  const filteredSheets = useMemo(() => {
    if (!searchQuery.trim()) return sheets;
    const q = searchQuery.toLowerCase();
    return sheets.filter(
      (s) =>
        s.sheet_name.toLowerCase().includes(q) ||
        s.nama_kelas.toLowerCase().includes(q)
    );
  }, [sheets, searchQuery]);

  // Handler ubah mapping per row
  const handleSelectClass = (sheetId: string, kelasId: string) => {
    setMappings((prev) => ({
      ...prev,
      [sheetId]: kelasId,
    }));
  };

  // Simpan pemetaan massal
  const handleSave = async () => {
    setIsSaving(true);
    try {
      const payload = Object.entries(mappings).map(([id, kelasId]) => ({
        id,
        kelasId,
      })).filter((m) => Boolean(m.kelasId));

      if (payload.length === 0) {
        toast.error('Tidak ada pemetaan kelas yang dipilih.');
        setIsSaving(false);
        return;
      }

      const res = await attendanceStagingApi.bulkRemapClasses(payload);
      if (res.success) {
        toast.success(res.message || 'Pemetaan kelas berhasil diperbarui!');
        onMappingSaved();
        onClose();
      } else {
        toast.error(res.message || 'Gagal menyimpan pemetaan kelas.');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Gagal menyimpan pemetaan.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={isSaving ? () => {} : onClose}
      size="4xl"
      title={
        <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100">
          <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-bold leading-tight">
              Pemetaan Lembar Sheet ke Data Master Rombel
            </h3>
            <p className="text-xs text-slate-500 font-normal">
              Hubungkan tab sheet dari Google Spreadsheet ke rombel resmi yang ada di sistem sekolah.
            </p>
          </div>
        </div>
      }
    >
      <div className="space-y-4 text-xs">
        {/* Search & Counter Bar */}
        <div className="flex items-center justify-between gap-3 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
          <div className="relative flex-1 max-w-xs">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari sheet (misal: PHT, TM, TE)..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="text-xs text-slate-500 flex items-center gap-2">
            <span>Total Lembar: <strong>{sheets.length}</strong></span>
            <span>•</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
              Terpetakan: {Object.values(mappings).filter(Boolean).length}
            </span>
          </div>
        </div>

        {/* Mapping Table */}
        <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden max-h-[55vh] overflow-y-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider text-[11px] z-10">
              <tr>
                <th className="py-2.5 px-3 w-8 text-center">#</th>
                <th className="py-2.5 px-3">Nama Sheet Spreadsheet</th>
                <th className="py-2.5 px-3 text-center">Jumlah Siswa</th>
                <th className="py-2.5 px-3 w-64">Rombel Resmi Sekolah (Master)</th>
                <th className="py-2.5 px-3 text-center">Status Kecocokan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredSheets.map((sheet, idx) => {
                const currentKelasId = mappings[sheet.id] || '';
                const selectedClass = classOptions.find((c) => c.id === currentKelasId);
                const isMatched = Boolean(currentKelasId);

                return (
                  <tr
                    key={sheet.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-2.5 px-3 text-center text-slate-400 font-mono text-[11px]">
                      {idx + 1}
                    </td>

                    {/* Sheet Name */}
                    <td className="py-2.5 px-3">
                      <div className="font-bold text-slate-900 dark:text-slate-100 text-xs">
                        Sheet: {sheet.sheet_name}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Label Awal: {sheet.nama_kelas}
                      </div>
                      {sheet.raw_sheet_data?.programKeahlian && (
                        <div className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium truncate max-w-[200px]" title={sheet.raw_sheet_data.programKeahlian}>
                          Program: {sheet.raw_sheet_data.programKeahlian}
                        </div>
                      )}
                    </td>

                    {/* Total Siswa */}
                    <td className="py-2.5 px-3 text-center font-mono font-semibold text-slate-700 dark:text-slate-300">
                      {sheet.total_siswa} Siswa
                    </td>

                    {/* Dropdown Rombel Master */}
                    <td className="py-2.5 px-3">
                      <select
                        value={currentKelasId}
                        onChange={(e) => handleSelectClass(sheet.id, e.target.value)}
                        className={cn(
                          'w-full px-2.5 py-1.5 text-xs rounded-lg border focus:outline-none focus:ring-2 font-medium transition-all',
                          currentKelasId
                            ? 'bg-white dark:bg-slate-900 border-indigo-300 dark:border-indigo-700 text-slate-900 dark:text-slate-100'
                            : 'bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-200'
                        )}
                      >
                        <option value="">-- Pilih Kelas Master --</option>
                        {Object.entries(groupedClasses).map(([tingkat, classes]) => (
                          <optgroup key={tingkat} label={`Tingkat ${tingkat === '10' ? 'X' : tingkat === '11' ? 'XI' : 'XII'}`}>
                            {classes.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.nama_kelas} {c.jurusan_nama ? `(${c.jurusan_nama})` : ''}
                              </option>
                            ))}
                          </optgroup>
                        ))}
                      </select>
                    </td>

                    {/* Status Badge */}
                    <td className="py-2.5 px-3 text-center">
                      {isMatched ? (
                        <span className="inline-flex items-center gap-1 text-[10.5px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                          <CheckCircle2 size={11} />
                          <span>
                            {selectedClass?.nama_kelas || 'Terpetakan'}
                            {selectedClass?.jurusan_nama ? ` • ${selectedClass.jurusan_nama}` : ''}
                          </span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10.5px] font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800">
                          <AlertTriangle size={11} />
                          <span>Belum Dipetakan</span>
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer info & Actions */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-200 dark:border-slate-800">
          <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>Kecocokan NIS siswa akan dihitung ulang secara otomatis begitu pemetaan disimpan.</span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isSaving}
              className="text-xs rounded-xl"
            >
              Batal
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              disabled={isSaving}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-sm"
            >
              {isSaving ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Menyimpan Pemetaan...
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  Simpan Pemetaan Rombel
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
});
