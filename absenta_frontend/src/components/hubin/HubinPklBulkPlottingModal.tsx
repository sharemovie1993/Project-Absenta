import React, { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Users, CheckSquare, Square, Calendar, Building2, User } from 'lucide-react';
import { Modal, Button, Input } from '../ui';
import { SearchableSelect, type SearchableSelectOption } from '../ui/SearchableSelect';
import { SimpleFormField } from '../ui/SimpleFormField';
import { kelasApi, siswaApi } from '../../api/academic.api';
import { toast } from 'react-hot-toast';

interface HubinPklBulkPlottingModalProps {
  isOpen: boolean;
  onClose: () => void;
  mitraOptions: SearchableSelectOption[];
  guruOptions: SearchableSelectOption[];
  placedStudentIds: Set<string>;
  onSubmit: (data: {
    siswa_ids: string[];
    mitra_id: string;
    pembimbing_id: string | null;
    tanggal_mulai: string;
    tanggal_selesai: string | null;
  }) => void;
  isPending: boolean;
  onGuruSearch?: (val: string) => void;
  onMitraSearch?: (val: string) => void;
  isLoadingGuru?: boolean;
  isLoadingMitra?: boolean;
}

export const HubinPklBulkPlottingModal: React.FC<HubinPklBulkPlottingModalProps> = ({
  isOpen,
  onClose,
  mitraOptions,
  guruOptions,
  placedStudentIds,
  onSubmit,
  isPending,
  onGuruSearch,
  onMitraSearch,
  isLoadingGuru,
  isLoadingMitra,
}) => {
  const [selectedKelasId, setSelectedKelasId] = useState('');
  const [selectedSiswaIds, setSelectedSiswaIds] = useState<string[]>([]);
  const [selectedMitraId, setSelectedMitraId] = useState('');
  const [selectedPembimbingId, setSelectedPembimbingId] = useState('');

  // Reset state on open/close
  useEffect(() => {
    if (!isOpen) {
      setSelectedKelasId('');
      setSelectedSiswaIds([]);
      setSelectedMitraId('');
      setSelectedPembimbingId('');
    }
  }, [isOpen]);

  // Fetch Classes
  const { data: kelasResponse, isLoading: isLoadingKelas } = useQuery({
    queryKey: ['kelas-bulk-list'],
    queryFn: () => kelasApi.getAll({ limit: 500 }),
    enabled: isOpen,
  });

  const kelasList = useMemo(() => {
    const dataObj = kelasResponse as { data?: any[] } | undefined;
    return Array.isArray(kelasResponse?.data) ? kelasResponse.data : dataObj?.data || [];
  }, [kelasResponse]);

  const kelasOptions = useMemo(() => {
    return kelasList.map((k: any) => ({
      label: k.nama_kelas,
      value: k.id,
    }));
  }, [kelasList]);

  // Fetch Students for selected Class
  const { data: siswaResponse, isLoading: isLoadingSiswa } = useQuery({
    queryKey: ['siswa-by-kelas', selectedKelasId],
    queryFn: () => siswaApi.getAll({ kelas_id: selectedKelasId, limit: 200 }),
    enabled: isOpen && !!selectedKelasId,
  });

  const siswaListRaw = useMemo(() => {
    const dataObj = siswaResponse as { data?: any[] } | undefined;
    return Array.isArray(siswaResponse?.data) ? siswaResponse.data : dataObj?.data || [];
  }, [siswaResponse]);

  // Filter students who are NOT currently placed in active PKL
  const filteredStudents = useMemo(() => {
    return siswaListRaw.filter((s: any) => !placedStudentIds.has(s.id));
  }, [siswaListRaw, placedStudentIds]);

  // Handle select/deselect student
  const handleToggleSiswa = (siswaId: string) => {
    setSelectedSiswaIds((prev) =>
      prev.includes(siswaId) ? prev.filter((id) => id !== siswaId) : [...prev, siswaId]
    );
  };

  // Handle select all / deselect all
  const handleToggleSelectAll = () => {
    if (selectedSiswaIds.length === filteredStudents.length) {
      setSelectedSiswaIds([]);
    } else {
      setSelectedSiswaIds(filteredStudents.map((s: any) => s.id));
    }
  };

  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    if (selectedSiswaIds.length === 0) {
      toast.error('Mohon pilih minimal satu siswa untuk di-plot');
      return;
    }
    if (!selectedMitraId) {
      toast.error('Mohon pilih mitra industri');
      return;
    }

    const tMulai = formData.get('tanggal_mulai') as string;
    const tSelesai = formData.get('tanggal_selesai') as string;

    onSubmit({
      siswa_ids: selectedSiswaIds,
      mitra_id: selectedMitraId,
      pembimbing_id: selectedPembimbingId || null,
      tanggal_mulai: tMulai ? new Date(tMulai).toISOString() : new Date().toISOString(),
      tanggal_selesai: tSelesai ? new Date(tSelesai).toISOString() : null,
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="5xl"
      title={
        <div className="flex items-center gap-2">
          <Users size={20} className="text-indigo-600" />
          <span>Plotting Penempatan PKL Kolektif (Bulk)</span>
        </div>
      }
    >
      <form onSubmit={handleFormSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Rombel / Kelas Selector */}
          <div className="md:col-span-1 border-r border-slate-150 dark:border-slate-800 pr-4 space-y-4">
            <SimpleFormField htmlFor="bulk-kelas" label="Pilih Kelas / Rombel" required>
              <SearchableSelect
                id="bulk-kelas"
                options={kelasOptions}
                placeholder="-- Pilih Kelas --"
                triggerClassName="h-10 text-[13px] w-full rounded-xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 shadow-sm"
                onValueChange={(val) => {
                  setSelectedKelasId(val);
                  setSelectedSiswaIds([]);
                }}
                value={selectedKelasId}
                isLoading={isLoadingKelas}
              />
            </SimpleFormField>

            {/* Students List Container */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  Daftar Siswa ({filteredStudents.length} Belum PKL)
                </span>
                {filteredStudents.length > 0 && (
                  <button
                    type="button"
                    onClick={handleToggleSelectAll}
                    className="text-[10px] font-bold text-indigo-650 hover:text-indigo-755 dark:text-indigo-400 dark:hover:text-indigo-300"
                  >
                    {selectedSiswaIds.length === filteredStudents.length ? 'Batal Semua' : 'Pilih Semua'}
                  </button>
                )}
              </div>

              <div className="h-[380px] overflow-y-auto overflow-x-hidden border border-slate-150 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-950/20 p-2 space-y-1.5">
                {isLoadingSiswa ? (
                  <div className="h-full flex items-center justify-center text-xs text-slate-400">
                    Memuat data siswa...
                  </div>
                ) : !selectedKelasId ? (
                  <div className="h-full flex items-center justify-center text-xs text-slate-400 text-center px-4 italic">
                    Silakan pilih kelas terlebih dahulu untuk memuat daftar siswa.
                  </div>
                ) : filteredStudents.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-xs text-emerald-600 dark:text-emerald-400 text-center px-4 font-medium italic">
                    Semua siswa di kelas ini sudah memiliki plotting penempatan aktif!
                  </div>
                ) : (
                  filteredStudents.map((siswa: any) => {
                    const isChecked = selectedSiswaIds.includes(siswa.id);
                    return (
                      <div
                        key={siswa.id}
                        onClick={() => handleToggleSiswa(siswa.id)}
                        className={`flex items-center gap-2.5 px-2.5 py-2 border rounded-lg cursor-pointer select-none transition-all duration-100 ${
                          isChecked
                            ? 'border-indigo-400 bg-indigo-50/20 dark:bg-indigo-950/10 text-indigo-650 dark:text-indigo-400'
                            : 'border-slate-100 dark:border-slate-800/40 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-900'
                        }`}
                      >
                        {isChecked ? (
                          <CheckSquare size={15} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
                        ) : (
                          <Square size={15} className="text-slate-400 shrink-0" />
                        )}
                        <div className="text-left leading-tight min-w-0 flex-1">
                          <p className="text-xs font-bold truncate text-slate-850 dark:text-slate-200" title={siswa.nama_siswa}>{siswa.nama_siswa}</p>
                          <p className="text-[10px] text-slate-400 dark:text-slate-500 font-mono mt-0.5">{siswa.nis}</p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {selectedSiswaIds.length > 0 && (
                <div className="p-2 bg-indigo-50/40 dark:bg-indigo-950/10 border border-indigo-100/50 dark:border-indigo-900/30 rounded-xl text-center">
                  <p className="text-[11px] font-bold text-indigo-750 dark:text-indigo-400">
                    {selectedSiswaIds.length} Siswa Terpilih
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Placement Details (Mitra, Guru, Dates) */}
          <div className="md:col-span-2 space-y-4 pl-0 md:pl-2">
            <p className="text-xs font-bold text-slate-400 dark:text-slate-550 uppercase tracking-wider">
              Detail Penempatan Kolektif
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <SimpleFormField htmlFor="bulk-mitra" label="Mitra Industri DU/DI" required>
                <SearchableSelect
                  id="bulk-mitra"
                  options={mitraOptions}
                  placeholder="-- Pilih perusahaan --"
                  triggerClassName="h-10 text-[13px] w-full rounded-xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 shadow-sm"
                  onValueChange={(val) => setSelectedMitraId(val)}
                  value={selectedMitraId}
                  onSearch={onMitraSearch}
                  isLoading={isLoadingMitra}
                />
              </SimpleFormField>

              <SimpleFormField htmlFor="bulk-pembimbing" label="Guru Pembimbing Lapangan">
                <SearchableSelect
                  id="bulk-pembimbing"
                  options={guruOptions}
                  placeholder="-- Pilih guru pembimbing --"
                  triggerClassName="h-10 text-[13px] w-full rounded-xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 shadow-sm"
                  onValueChange={(val) => setSelectedPembimbingId(val)}
                  value={selectedPembimbingId}
                  onSearch={onGuruSearch}
                  isLoading={isLoadingGuru}
                />
              </SimpleFormField>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <SimpleFormField htmlFor="bulk-tanggal-mulai" label="Tanggal Mulai PKL" required>
                <Input
                  id="bulk-tanggal-mulai"
                  type="date"
                  name="tanggal_mulai"
                  required
                />
              </SimpleFormField>
              <SimpleFormField htmlFor="bulk-tanggal-selesai" label="Tanggal Selesai PKL (Estimasi)">
                <Input
                  id="bulk-tanggal-selesai"
                  type="date"
                  name="tanggal_selesai"
                />
              </SimpleFormField>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-900/30 border border-slate-150/40 dark:border-slate-800/40 rounded-xl flex gap-3 items-start mt-6">
              <Building2 className="text-indigo-500 shrink-0 mt-0.5" size={18} />
              <div className="text-xs text-slate-550 dark:text-slate-400 leading-relaxed">
                <span className="font-bold text-slate-750 dark:text-slate-350">Catatan Plotting Kolektif</span>: Semua siswa terpilih akan di-plot secara serentak ke mitra industri dan pembimbing yang sama. Status penempatan akan langsung disetel menjadi <span className="font-semibold text-indigo-650 dark:text-indigo-400">AKTIF</span>.
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-150 dark:border-slate-800">
          <Button type="button" variant="outline" onClick={onClose}>
            Batal
          </Button>
          <Button type="submit" variant="primary" isLoading={isPending} disabled={selectedSiswaIds.length === 0}>
            Terapkan Plotting Kolektif
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default HubinPklBulkPlottingModal;
