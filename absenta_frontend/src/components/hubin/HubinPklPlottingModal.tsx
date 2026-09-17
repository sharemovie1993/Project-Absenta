import React, { useState, useEffect } from 'react';
import { UserPlus, Calendar } from 'lucide-react';
import { Modal, Button, Input } from '../ui';
import { SearchableSelect, type SearchableSelectOption } from '../ui/SearchableSelect';
import { SimpleFormField } from '../ui/SimpleFormField';
import { SmartStudentPicker, type Student } from '../common/SmartStudentPicker';
import { useTahunPelajaranOptions } from '../../hooks/useTahunPelajaranOptions';
import { useSemesterOptions } from '../../hooks/useSemesterOptions';
import { addPklMonths } from '../../utils/hubinPklLifecycle';

interface HubinPklPlottingModalProps {
  isOpen: boolean;
  onClose: () => void;
  mitraOptions: SearchableSelectOption[];
  guruOptions: SearchableSelectOption[];
  selectedSiswaId: string;
  setSelectedSiswaId: (val: string) => void;
  selectedMitraId: string;
  setSelectedMitraId: (val: string) => void;
  selectedPembimbingId: string;
  setSelectedPembimbingId: (val: string) => void;
  handlePlottingSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  isPending: boolean;
  onGuruSearch?: (val: string) => void;
  onMitraSearch?: (val: string) => void;
  isLoadingGuru?: boolean;
  isLoadingMitra?: boolean;
  editingPkl?: any;
  filterJurusan?: string;
}

export const HubinPklPlottingModal: React.FC<HubinPklPlottingModalProps> = React.memo(({
  isOpen,
  onClose,
  mitraOptions,
  guruOptions,
  selectedSiswaId,
  setSelectedSiswaId,
  selectedMitraId,
  setSelectedMitraId,
  selectedPembimbingId,
  setSelectedPembimbingId,
  handlePlottingSubmit,
  isPending,
  onGuruSearch,
  onMitraSearch,
  isLoadingGuru,
  isLoadingMitra,
  editingPkl,
  filterJurusan,
}) => {
  const { options: tpOptions, activeTahunPelajaran, isLoading: isLoadingTp } = useTahunPelajaranOptions();
  const [selectedTpId, setSelectedTpId] = useState<string>('');

  useEffect(() => {
    if (activeTahunPelajaran?.id && !selectedTpId) {
      setSelectedTpId(activeTahunPelajaran.id);
    }
  }, [activeTahunPelajaran, selectedTpId]);

  const { options: semOptions, activeSemester, isLoading: isLoadingSem } = useSemesterOptions({
    tahunPelajaranId: selectedTpId || activeTahunPelajaran?.id
  });
  const [selectedSemesterId, setSelectedSemesterId] = useState<string>('');

  useEffect(() => {
    if (activeSemester?.id && !selectedSemesterId) {
      setSelectedSemesterId(activeSemester.id);
    }
  }, [activeSemester, selectedSemesterId]);

  useEffect(() => {
    if (!isOpen) {
      if (activeTahunPelajaran?.id) setSelectedTpId(activeTahunPelajaran.id);
      if (activeSemester?.id) setSelectedSemesterId(activeSemester.id);
    }
  }, [isOpen, activeTahunPelajaran, activeSemester]);

  const [tanggalMulai, setTanggalMulai] = useState<string>('');
  const [tanggalSelesai, setTanggalSelesai] = useState<string>('');
  const [status, setStatus] = useState<string>('AKTIF');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setSelectedStudent(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (editingPkl) {
      setTanggalMulai(editingPkl.tanggal_mulai ? new Date(editingPkl.tanggal_mulai).toISOString().substring(0, 10) : '');
      setTanggalSelesai(editingPkl.tanggal_selesai ? new Date(editingPkl.tanggal_selesai).toISOString().substring(0, 10) : '');
      setStatus(editingPkl.status || 'AKTIF');
    } else {
      setTanggalMulai(new Date().toISOString().substring(0, 10));
      setTanggalSelesai('');
      setStatus('AKTIF');
    }
  }, [editingPkl, isOpen]);

  const handleApplyDuration = (months: number) => {
    const base = tanggalMulai || new Date().toISOString().substring(0, 10);
    const result = addPklMonths(base, months);
    setTanggalSelesai(result);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="3xl"
      title={
        <div className="flex items-center gap-2">
          <UserPlus size={20} className="text-blue-605 text-indigo-600" />
          <span>{editingPkl ? 'Edit Detail Penempatan PKL' : 'Plotting Penempatan Baru'}</span>
        </div>
      }
    >
      <form onSubmit={handlePlottingSubmit} className="space-y-4">
        <input type="hidden" name="tahun_pelajaran_id" value={selectedTpId || activeTahunPelajaran?.id || ''} />
        <input type="hidden" name="semester_id" value={selectedSemesterId || activeSemester?.id || ''} />

        {/* Konteks Tahun Pelajaran & Semester */}
        <div className="p-3 bg-slate-50 dark:bg-slate-900/30 rounded-xl border border-slate-200/70 dark:border-slate-800/80 space-y-2.5">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
            <Calendar size={14} className="text-indigo-600" />
            <span>Konteks Tahun Pelajaran & Semester</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SimpleFormField htmlFor="plotting-tp" label="Tahun Pelajaran">
              <SearchableSelect
                id="plotting-tp"
                options={tpOptions}
                placeholder="-- Pilih Tahun Pelajaran --"
                triggerClassName="h-10 text-[13px] w-full rounded-xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 shadow-sm"
                onValueChange={(val) => {
                  setSelectedTpId(val);
                  setSelectedSemesterId('');
                }}
                value={selectedTpId || activeTahunPelajaran?.id || ''}
                isLoading={isLoadingTp}
              />
            </SimpleFormField>
            <SimpleFormField htmlFor="plotting-semester" label="Semester">
              <SearchableSelect
                id="plotting-semester"
                options={semOptions}
                placeholder="-- Pilih Semester --"
                triggerClassName="h-10 text-[13px] w-full rounded-xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 shadow-sm"
                onValueChange={(val) => setSelectedSemesterId(val)}
                value={selectedSemesterId || activeSemester?.id || ''}
                isLoading={isLoadingSem}
              />
            </SimpleFormField>
          </div>
        </div>
        {editingPkl ? (
          <SimpleFormField label="Siswa PKL (Terkunci)">
            <Input 
              value={`${editingPkl.Siswa?.nama_siswa} (${editingPkl.Siswa?.nis})`} 
              disabled 
              className="bg-slate-50 dark:bg-slate-900 text-slate-400 border-slate-200 dark:border-slate-800/80 cursor-not-allowed font-medium"
            />
          </SimpleFormField>
        ) : (
          <SimpleFormField label="Pilih Siswa PKL" required>
            <SmartStudentPicker 
              onSelect={(s: Student) => {
                setSelectedSiswaId(s.id);
                setSelectedStudent(s);
              }}
              scope="global"
              filterJurusan={filterJurusan}
              placeholder={filterJurusan ? `Cari siswa jurusan ${filterJurusan}...` : "Scan RFID, QR, atau ketik nama/NIS..."}
              autoFocus
            />
            {selectedSiswaId && (
              <div className="mt-2 p-3 bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-900/60 rounded-xl flex items-center justify-between gap-3 animate-in fade-in duration-200">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-emerald-100 dark:bg-emerald-900/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                    <UserPlus size={18} />
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-sm text-emerald-900 dark:text-emerald-200 truncate">
                      {selectedStudent?.nama_siswa || selectedStudent?.full_name || 'Siswa Terpilih'}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-emerald-700/90 dark:text-emerald-400/90 font-medium">
                      {selectedStudent?.nis && <span>NIS: {selectedStudent.nis}</span>}
                      {selectedStudent?.Kelas?.nama_kelas && (
                        <>
                          <span>•</span>
                          <span>Kelas: {selectedStudent.Kelas.nama_kelas}</span>
                        </>
                      )}
                      {!selectedStudent?.nis && !selectedStudent?.Kelas?.nama_kelas && (
                        <span>ID: {selectedSiswaId}</span>
                      )}
                    </div>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  onClick={() => {
                    setSelectedSiswaId('');
                    setSelectedStudent(null);
                  }}
                  className="text-xs text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 shrink-0"
                >
                  Ganti
                </Button>
              </div>
            )}
          </SimpleFormField>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SimpleFormField htmlFor="plotting-mitra" label="Mitra Industri" required>
            <SearchableSelect
              id="plotting-mitra"
              options={mitraOptions}
              placeholder="-- Pilih perusahaan --"
              triggerClassName="h-10 text-[13px] w-full rounded-xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 shadow-sm"
              onValueChange={(val) => setSelectedMitraId(val)}
              value={selectedMitraId}
              onSearch={onMitraSearch}
              isLoading={isLoadingMitra}
            />
          </SimpleFormField>

          <SimpleFormField htmlFor="plotting-pembimbing" label="Guru Pembimbing">
            <SearchableSelect
              id="plotting-pembimbing"
              options={guruOptions}
              placeholder="-- Pilih pembimbing --"
              triggerClassName="h-10 text-[13px] w-full rounded-xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 shadow-sm"
              onValueChange={(val) => setSelectedPembimbingId(val)}
              value={selectedPembimbingId}
              onSearch={onGuruSearch}
              isLoading={isLoadingGuru}
            />
          </SimpleFormField>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SimpleFormField htmlFor="plotting-tanggal-mulai" label="Tanggal Mulai PKL" required>
            <Input
              id="plotting-tanggal-mulai"
              type="date"
              name="tanggal_mulai"
              value={tanggalMulai}
              onChange={(e) => setTanggalMulai(e.target.value)}
              required
            />
          </SimpleFormField>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="plotting-tanggal-selesai" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Tanggal Selesai PKL (Estimasi)
              </label>
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-slate-400 font-medium mr-0.5">Preset:</span>
                <button
                  type="button"
                  onClick={() => handleApplyDuration(3)}
                  className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800 cursor-pointer transition-colors"
                  title="Set +3 Bulan dari tanggal mulai"
                >
                  +3 Bln
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyDuration(4)}
                  className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800 cursor-pointer transition-colors"
                  title="Set +4 Bulan dari tanggal mulai"
                >
                  +4 Bln
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyDuration(6)}
                  className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800 cursor-pointer transition-colors"
                  title="Set +6 Bulan dari tanggal mulai"
                >
                  +6 Bln
                </button>
              </div>
            </div>
            <Input
              id="plotting-tanggal-selesai"
              type="date"
              name="tanggal_selesai"
              value={tanggalSelesai}
              onChange={(e) => setTanggalSelesai(e.target.value)}
            />
          </div>
        </div>

        {/* Status Dropdown Khusus Saat Edit Detail Penempatan */}
        {editingPkl && (
          <SimpleFormField htmlFor="plotting-status" label="Status Penempatan Siswa">
            <select
              id="plotting-status"
              name="status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="AKTIF">🟢 AKTIF (Aktif Praktik)</option>
              <option value="SELESAI">🔵 SELESAI (Praktik Tuntas)</option>
              <option value="BATAL">🔴 BATAL (Dibatalkan)</option>
            </select>
          </SimpleFormField>
        )}

        {/* Seksi Geofencing Overrides */}
        <div className="p-4 bg-slate-50 dark:bg-slate-900/30 rounded-xl space-y-3.5 border border-slate-150/50 dark:border-slate-800/40">
          <p className="text-xs font-bold text-slate-400 dark:text-slate-550 uppercase tracking-wider">
            Geofencing Khusus / Overrides (Opsional)
          </p>
          
          <label className="flex items-center gap-2.5 px-3 py-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 rounded-xl cursor-pointer select-none transition-all duration-150 hover:bg-slate-50 dark:hover:bg-slate-900/40">
            <input
              type="checkbox"
              name="is_flexible_location"
              defaultChecked={editingPkl?.is_flexible_location || false}
              className="rounded border-slate-350 text-indigo-650 focus:ring-indigo-500/20 h-4.5 w-4.5 cursor-pointer dark:bg-slate-900 dark:border-slate-700"
            />
            <span className="text-xs font-bold tracking-wide text-slate-700 dark:text-slate-300">
              Lokasi Presensi Fleksibel (Toleransi Geofence dengan Verifikasi)
            </span>
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <SimpleFormField htmlFor="plotting-lat-override" label="Latitude Override">
              <Input
                id="plotting-lat-override"
                name="lat_override"
                type="number"
                step="any"
                defaultValue={editingPkl?.lat_override ?? ''}
                placeholder="Contoh: -6.8914"
                className="text-xs bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800"
              />
            </SimpleFormField>
            <SimpleFormField htmlFor="plotting-lon-override" label="Longitude Override">
              <Input
                id="plotting-lon-override"
                name="lon_override"
                type="number"
                step="any"
                defaultValue={editingPkl?.lon_override ?? ''}
                placeholder="Contoh: 107.6104"
                className="text-xs bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800"
              />
            </SimpleFormField>
            <SimpleFormField htmlFor="plotting-radius-override" label="Radius Override (Meter)">
              <Input
                id="plotting-radius-override"
                name="radius_override"
                type="number"
                defaultValue={editingPkl?.radius_override ?? ''}
                placeholder="Contoh: 50"
                className="text-xs bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800"
              />
            </SimpleFormField>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-150 dark:border-slate-800">
          <Button type="button" variant="outline" onClick={onClose}>
            Batal
          </Button>
          <Button type="submit" variant="primary" isLoading={isPending}>
            {editingPkl ? 'Simpan Perubahan' : 'Simpan Penempatan'}
          </Button>
        </div>
      </form>
    </Modal>
  );
});
