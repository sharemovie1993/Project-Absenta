import React, { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { 
  ShieldAlert, 
  Zap, 
  CheckCircle2,
  Users,
  UserCheck,
  User,
  Plus,
  Trash2,
  Layers,
  Sparkles
} from 'lucide-react';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { Label } from '../../ui/Label';
import { SearchableSelect } from '../../ui/SearchableSelect';
import { kesiswaanApi, type JenisPelanggaran } from '../../../api/kesiswaan.api';
import { Loader } from '../../ui/Loader';

import { useJenisPelanggaranOptions } from '../../../hooks/useJenisPelanggaranOptions';

const Modal = lazy(() => import('../../ui/Modal').then(m => ({ default: m.Modal })));
const SmartStudentPicker = lazy(() => import('../../common/SmartStudentPicker').then(m => ({ default: m.SmartStudentPicker })));

interface StudentItem {
  id: string;
  nama_siswa?: string;
  nis?: string;
  Kelas?: {
    nama_kelas: string;
  };
}

interface CatatPelanggaranModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  defaultSiswaId?: string;
}

const catatSchema = z.object({
  jenis_pelanggaran: z.string().min(1, 'Jenis pelanggaran wajib dipilih'),
  poin: z.number().min(0, 'Poin minimal 0'),
  keterangan: z.string().optional(),
  tanggal: z.string().min(1, 'Tanggal wajib diisi'),
  status: z.string().default('BARU')
});

export const CatatPelanggaranModal: React.FC<CatatPelanggaranModalProps> = React.memo(({
  isOpen,
  onClose,
  onSuccess,
  defaultSiswaId = ''
}) => {
  const queryClient = useQueryClient();
  const [entryMode, setEntryMode] = useState<'single' | 'bulk'>('single');
  const [submitting, setSubmitting] = useState(false);
  const { rawList: jenisList, isLoading: loadingJenis } = useJenisPelanggaranOptions();

  // Single Mode State
  const [selectedSingleSiswa, setSelectedSingleSiswa] = useState<StudentItem | null>(null);

  // Bulk Mode State: Selected student list (Basket)
  const [bulkStudents, setBulkStudents] = useState<StudentItem[]>([]);

  const [formData, setFormData] = useState({
    jenis_pelanggaran: '',
    poin: 10,
    keterangan: '',
    tanggal: new Date().toISOString().split('T')[0],
    status: 'BARU'
  });

  const handleSelectJenis = useCallback((nama: string) => {
    const matched = jenisList.find(j => j.nama_pelanggaran === nama);
    setFormData(prev => ({
      ...prev,
      jenis_pelanggaran: nama,
      poin: matched ? matched.poin : prev.poin
    }));
  }, [jenisList]);

  // Handler Add Student to Bulk List
  const handleAddStudentToBulk = useCallback((siswa: any) => {
    if (!siswa?.id) return;
    const isExist = bulkStudents.some(s => s.id === siswa.id);
    if (isExist) {
      toast.error(`${siswa.nama_siswa || 'Siswa'} sudah ada di dalam daftar masal`);
      return;
    }
    setBulkStudents(prev => [...prev, siswa as StudentItem]);
    toast.success(`+ ${siswa.nama_siswa || 'Siswa'} ditambahkan ke daftar!`);
  }, [bulkStudents]);

  const handleRemoveStudentFromBulk = useCallback((id: string) => {
    setBulkStudents(prev => prev.filter(s => s.id !== id));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const parseResult = catatSchema.safeParse(formData);
    if (!parseResult.success) {
      const firstError = parseResult.error.errors[0]?.message || 'Data form tidak valid';
      toast.error(firstError);
      return;
    }

    if (entryMode === 'single' && !selectedSingleSiswa?.id) {
      toast.error('Pilih 1 siswa yang melanggar');
      return;
    }

    if (entryMode === 'bulk' && bulkStudents.length === 0) {
      toast.error('Tambahkan minimal 1 siswa ke dalam daftar masal');
      return;
    }

    setSubmitting(true);
    try {
      if (entryMode === 'single') {
        const payload = {
          ...parseResult.data,
          siswa_id: selectedSingleSiswa!.id
        };
        await kesiswaanApi.createPelanggaran(payload);
        toast.success('⚡ Pelanggaran siswa berhasil dicatat!');
      } else {
        // Bulk mode: Process all students concurrently
        const payloads = bulkStudents.map(siswa => ({
          ...parseResult.data,
          siswa_id: siswa.id
        }));
        await Promise.all(payloads.map(p => kesiswaanApi.createPelanggaran(p)));
        toast.success(`⚡ Berhasil mencatat pelanggaran masal untuk ${bulkStudents.length} siswa!`);
      }
      
      // Invalidate queries for live updates across displays
      queryClient.invalidateQueries({ queryKey: ['kesiswaan-monitoring-violations'] });
      queryClient.invalidateQueries({ queryKey: ['kesiswaan-analytics'] });
      queryClient.invalidateQueries({ queryKey: ['kesiswaan-pelanggaran'] });
      queryClient.invalidateQueries({ queryKey: ['kesiswaan-pelanggaran-list'] });
      queryClient.invalidateQueries({ queryKey: ['kesiswaan-monitoring-stats'] });

      // Reset form
      setFormData({
        jenis_pelanggaran: '',
        poin: 10,
        keterangan: '',
        tanggal: new Date().toISOString().split('T')[0],
        status: 'BARU'
      });
      setSelectedSingleSiswa(null);
      setBulkStudents([]);

      if (onSuccess) onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal menyimpan catatan pelanggaran';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const jenisOptions = jenisList.map(j => {
    const isAutoLate = j.nama_pelanggaran.toLowerCase().includes('terlambat');
    return {
      value: j.nama_pelanggaran,
      label: isAutoLate 
        ? `${j.nama_pelanggaran} (+${j.poin} Poin) [🤖 Otomatis Tap Gerbang]` 
        : `${j.nama_pelanggaran} (+${j.poin} Poin)`
    };
  });

  const quickChips = [
    { label: '👕 Seragam/Atribut (+5)', name: 'Seragam Tidak Rapi / Tidak Sesuai', poin: 5 },
    { label: '📱 HP saat KBM (+15)', name: 'Menggunakan HP saat KBM', poin: 15 },
    { label: '🏃 Bolos/Keluar (+10)', name: 'Keluar Kelas Tanpa Izin', poin: 10 },
    { label: '🚬 Merokok/Vape (+50)', name: 'Merokok di Lingkungan Sekolah', poin: 50 },
  ];

  return (
    <Suspense fallback={null}>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Pencatatan Pelanggaran Siswa"
        maxWidth="lg"
      >
        <div className="space-y-4 py-1">
          {/* Mode Switcher Tabs */}
          <div className="flex items-center gap-2 p-1 bg-slate-100 dark:bg-slate-900 rounded-xl border border-slate-200/60 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setEntryMode('single')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
                entryMode === 'single'
                  ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
              }`}
            >
              <User size={14} />
              <span>Input Tunggal (1 Siswa)</span>
            </button>
            <button
              type="button"
              onClick={() => setEntryMode('bulk')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
                entryMode === 'bulk'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
              }`}
            >
              <Users size={14} />
              <span>⚡ Input Masal ({bulkStudents.length} Siswa)</span>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Section 1: Jenis Pelanggaran & Quick Chips */}
            <div className="space-y-3 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800">
              <Label className="text-xs font-black uppercase text-slate-700 dark:text-slate-300 tracking-wider flex items-center gap-1.5">
                <Zap size={14} className="text-amber-500" />
                Jenis & Bobot Pelanggaran <span className="text-rose-500">*</span>
              </Label>

              {/* Quick Chips */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mr-1">Quick Select:</span>
                {quickChips.map((chip, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setFormData(prev => ({
                        ...prev,
                        jenis_pelanggaran: chip.name,
                        poin: chip.poin
                      }));
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-black transition-all cursor-pointer border ${
                      formData.jenis_pelanggaran === chip.name
                        ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                <div className="sm:col-span-8">
                  <SearchableSelect
                    options={jenisOptions}
                    value={formData.jenis_pelanggaran}
                    onChange={(val) => handleSelectJenis(String(val))}
                    placeholder={loadingJenis ? "Memuat opsi..." : "-- Pilih Jenis Pelanggaran --"}
                  />
                </div>
                <div className="sm:col-span-4">
                  <Input
                    type="number"
                    label="Poin Pelanggaran"
                    value={formData.poin}
                    onChange={(e) => setFormData(prev => ({ ...prev, poin: Number(e.target.value) || 0 }))}
                    min={0}
                    required
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Mode Selection Siswa */}
            {entryMode === 'single' ? (
              /* Single Mode Selection */
              <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-black uppercase text-slate-700 dark:text-slate-300 tracking-wider flex items-center gap-1.5">
                    <ShieldAlert size={14} className="text-rose-500" />
                    Pilih Siswa <span className="text-rose-500">*</span>
                  </Label>
                  {selectedSingleSiswa?.Kelas?.nama_kelas && (
                    <span className="text-[10px] font-black bg-indigo-100 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-md uppercase">
                      Kelas: {selectedSingleSiswa.Kelas.nama_kelas}
                    </span>
                  )}
                </div>

                <Suspense fallback={<Loader />}>
                  <SmartStudentPicker
                    value={selectedSingleSiswa?.id || ''}
                    onSelect={(siswa) => setSelectedSingleSiswa(siswa as StudentItem)}
                  />
                </Suspense>
              </div>
            ) : (
              /* Bulk Mode Selection & Basket List */
              <div className="p-4 bg-rose-50/20 dark:bg-rose-950/10 rounded-xl border border-rose-100/60 dark:border-rose-900/30 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-xs font-black uppercase text-rose-700 dark:text-rose-400 tracking-wider flex items-center gap-1.5">
                      <Users size={14} className="text-rose-500" />
                      Scan / Tambah Siswa ke Daftar Masal ({bulkStudents.length})
                    </Label>
                    <p className="text-[10px] text-slate-400 leading-normal mt-0.5">Scan kartu RFID/QR siswa satu per satu, seluruh siswa akan otomatis masuk ke daftar bawah ini.</p>
                  </div>
                </div>

                <Suspense fallback={<Loader />}>
                  <SmartStudentPicker
                    onSelect={(siswa) => handleAddStudentToBulk(siswa)}
                  />
                </Suspense>

                {/* Bulk Basket List */}
                {bulkStudents.length > 0 && (
                  <div className="space-y-2 pt-2">
                    <div className="flex items-center justify-between text-[10px] font-black uppercase text-slate-500 tracking-wider">
                      <span>Daftar Siswa Terpilih ({bulkStudents.length})</span>
                      <button
                        type="button"
                        onClick={() => setBulkStudents([])}
                        className="text-rose-500 hover:underline cursor-pointer"
                      >
                        Kosongkan Daftar
                      </button>
                    </div>

                    <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                      {bulkStudents.map((s, idx) => (
                        <div key={s.id || idx} className="flex items-center justify-between p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="w-5 h-5 rounded-full bg-rose-100 dark:bg-rose-950/50 text-rose-600 text-[10px] font-black flex items-center justify-center shrink-0">
                              {idx + 1}
                            </span>
                            <div className="min-w-0">
                              <span className="font-black text-slate-800 dark:text-white uppercase truncate block">{s.nama_siswa}</span>
                              <span className="text-[10px] text-slate-400 font-medium">NIS: {s.nis || '-'} • Kelas: {s.Kelas?.nama_kelas || '-'}</span>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveStudentFromBulk(s.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded-lg cursor-pointer transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Section 3: Tanggal & Catatan Tambahan */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Input
                  type="date"
                  label="Tanggal Kejadian"
                  value={formData.tanggal}
                  onChange={(e) => setFormData(prev => ({ ...prev, tanggal: e.target.value }))}
                  required
                />
              </div>
              <div>
                <Input
                  label="Catatan Tambahan / Lokasi Kejadian"
                  placeholder="Misal: Terlambat Gerbang Pagi"
                  value={formData.keterangan}
                  onChange={(e) => setFormData(prev => ({ ...prev, keterangan: e.target.value }))}
                />
              </div>
            </div>

            {/* Form Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={submitting}
                className="rounded-xl"
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={
                  submitting || 
                  !formData.jenis_pelanggaran || 
                  (entryMode === 'single' ? !selectedSingleSiswa?.id : bulkStudents.length === 0)
                }
                className="bg-rose-600 hover:bg-rose-700 text-white font-black rounded-xl px-6 flex items-center gap-2"
              >
                {submitting ? (
                  <span>Menyimpan...</span>
                ) : (
                  <>
                    <CheckCircle2 size={16} />
                    <span>
                      {entryMode === 'single' 
                        ? 'Simpan Catatan Pelanggaran' 
                        : `Simpan Masal (${bulkStudents.length} Siswa)`
                      }
                    </span>
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      </Modal>
    </Suspense>
  );
});
