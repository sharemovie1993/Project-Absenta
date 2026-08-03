import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import Modal, { ModalFooter } from '@/components/ui/Modal';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import {
  assignGuruToStruktur,
  removeGuruFromStruktur,
  getStrukturDetail,
  assignSiswaToStruktur,
  removeSiswaFromStruktur,
  type StrukturOrganisasi,
  type GuruStrukturOrganisasi,
  type SiswaStrukturOrganisasi
} from '@/api/academic/strukturOrganisasi.api';
import { getSiswaList } from '@/api/academic/siswa.api';
import type { Siswa } from '@/types/academic';
import { Trash2, Plus, Search, User, Briefcase, GraduationCap, CheckCircle2, ChevronDown } from 'lucide-react';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { useGuruOptions, useKelasOptions, useJurusanOptions, useSiswaOptions, KelasSelect, JurusanSelect } from '@/components/common';
import { SimpleFormField } from '@/components/ui/SimpleFormField';

interface AssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  strukturId: string | null;
  defaultTingkat?: number | null;
  defaultUnitId?: string | null;
  defaultKelasId?: string | null;
  onSuccess?: () => void;
}

export const AssignmentModal: React.FC<AssignmentModalProps> = ({ 
  isOpen, 
  onClose, 
  strukturId, 
  defaultTingkat,
  defaultUnitId,
  defaultKelasId,
  onSuccess 
}) => {
  const [tab, setTab] = useState<'GURU' | 'SISWA'>('GURU');
  const [struktur, setStruktur] = useState<StrukturOrganisasi | null>(null);
  const [guruAssignments, setGuruAssignments] = useState<GuruStrukturOrganisasi[]>([]);
  const [siswaAssignments, setSiswaAssignments] = useState<SiswaStrukturOrganisasi[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [startDate, setStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedKelasId, setSelectedKelasId] = useState<string>('');
  const [selectedUnitId, setSelectedUnitId] = useState<string>('');
  const [selectedKelasIdAssignment, setSelectedKelasIdAssignment] = useState<string>('');

  // Shared reference hooks
  // PENDIDIK-only untuk jabatan akademik yang memerlukan guru pengajar
  // TOOLMAN = Teknisi/Laboran → Tenaga Kependidikan, bukan Pendidik
  const PENDIDIK_ONLY_KODES = ['WALIKELAS', 'KAPROG', 'KABENG', 'PEMBINA_ESKUL'];
  const guruJenisPtk = PENDIDIK_ONLY_KODES.includes(struktur?.kode || '') ? 'PENDIDIK' : 'ALL';
  const { rawList: guruOptions } = useGuruOptions({ jenisPtk: guruJenisPtk });
  const { rawList: jurusanList } = useJurusanOptions();

  const targetKelasId = selectedKelasIdAssignment || selectedKelasId;
  const { rawList: siswaOptions } = useSiswaOptions({ kelasId: targetKelasId, onlyActive: true });
  const [isContextDialogOpen, setIsContextDialogOpen] = useState(false);
  const [pendingGuruId, setPendingGuruId] = useState<string | null>(null);
  const [pendingSiswaId, setPendingSiswaId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && strukturId) {
      // Auto-fill context from diagram if provided
      setSelectedUnitId(defaultUnitId || '');
      setSelectedKelasIdAssignment(defaultKelasId || '');
      loadData();
    }
  }, [isOpen, strukturId, defaultUnitId, defaultKelasId]);

  const loadData = async () => {
    if (!strukturId) return;
    setIsLoading(true);
    try {
      const res = await getStrukturDetail(strukturId);
      if (res.data) {
        setStruktur(res.data);
        if (res.data.kode === 'PETUGAS_KELAS') {
          setTab('SISWA');
        } else {
          setTab('GURU');
        }
        const allAssigns = res.data.organizationalAssigns || [];
        
        // Map assignments to categories
        setGuruAssignments(allAssigns.filter(a => !!a.User?.Guru));
        setSiswaAssignments(allAssigns.filter(a => !!a.User?.Siswa));
        
        if (res.data.kelas_id) {
          setSelectedKelasId(res.data.kelas_id);
        }
      }
    } catch (error) {
      toast.error('Gagal memuat detail struktur');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddGuru = async (guruId: string) => {
    if (!strukturId) return;
    
    // Auto-resolve context: priority 1 (default from diagram), priority 2 (manual selection)
    const activeUnitId = selectedUnitId || defaultUnitId;
    const activeKelasId = selectedKelasIdAssignment || defaultKelasId;

    // Only show dialog if context is missing for roles that require it
    const needsJurusan = ['KAPROG', 'KABENG', 'TOOLMAN'].includes(struktur?.kode || '');
    const needsKelas = ['WALIKELAS'].includes(struktur?.kode || '');

    if ((needsJurusan && !activeUnitId) || (needsKelas && !activeKelasId)) {
      setPendingGuruId(guruId);
      setIsContextDialogOpen(true);
      return;
    }

    setIsSubmitting(true);
    try {
      await assignGuruToStruktur(strukturId, {
        guru_id: guruId,
        unit_id: activeUnitId || struktur?.unit_id,
        kelas_id: activeKelasId || struktur?.kelas_id,
        start_date: startDate
      });
      toast.success('Guru berhasil ditugaskan');
      // Reset pending state
      setPendingGuruId(null);
      setSelectedUnitId('');
      setSelectedKelasIdAssignment('');
      setIsContextDialogOpen(false);
      await loadData();
      onSuccess?.();
    } catch (error: any) {
      toast.error(error?.message || 'Gagal menugaskan guru');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmContext = () => {
    const needsJurusan = ['KAPROG', 'KABENG', 'TOOLMAN'].includes(struktur?.kode || '');
    const needsKelas = ['WALIKELAS'].includes(struktur?.kode || '');

    if (pendingGuruId) {
      if (needsJurusan && !selectedUnitId) {
        toast.error('Silakan pilih jurusan terlebih dahulu');
        return;
      }
      if (needsKelas && !selectedKelasIdAssignment) {
        toast.error('Silakan pilih kelas terlebih dahulu');
        return;
      }
      
      if (pendingGuruId) {
        handleAddGuru(pendingGuruId);
      } else if (pendingSiswaId) {
        handleAddSiswa(pendingSiswaId);
      }
    }
  };

  const handleRemoveGuru = async (guruId: string) => {
    if (!strukturId || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await removeGuruFromStruktur(strukturId, guruId);
      toast.success('Penugasan guru dihapus');
      await loadData();
      onSuccess?.();
    } catch (error: any) {
      toast.error(error?.message || 'Gagal menghapus penugasan');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddSiswa = async (siswaId: string) => {
    if (!strukturId || isSubmitting) return;

    // Use priority: 1. default from diagram, 2. manual filter, 3. struct fixed kelas
    const targetKelasId = defaultKelasId || selectedKelasId || struktur?.kelas_id;

    if (!targetKelasId && struktur?.kode === 'PETUGAS_KELAS') {
      toast.error('Silakan pilih kelas di filter terlebih dahulu');
      return;
    }

    setIsSubmitting(true);
    try {
      await assignSiswaToStruktur(strukturId, {
        siswa_id: siswaId,
        kelas_id: targetKelasId || undefined,
        unit_id: defaultUnitId || selectedUnitId || struktur?.unit_id,
        start_date: startDate
      });
      toast.success('Siswa berhasil ditugaskan');
      await loadData();
      onSuccess?.();
    } catch (error: any) {
      toast.error(error?.message || 'Gagal menugaskan siswa');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveSiswa = async (siswaId: string) => {
    if (!strukturId || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await removeSiswaFromStruktur(strukturId, siswaId);
      toast.success('Penugasan siswa dihapus');
      await loadData();
      onSuccess?.();
    } catch (error: any) {
      toast.error(error?.message || 'Gagal menghapus penugasan');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredOptions = guruOptions.filter(g => 
    !guruAssignments.some(a => a.User?.Guru?.id === g.id) &&
    (g.nama_guru.toLowerCase().includes(search.toLowerCase()) || 
     g.nip?.includes(search))
  );

  const filteredSiswaOptions = siswaOptions.filter(s => 
    !siswaAssignments.some(a => a.User?.Siswa?.id === s.id) &&
    (s.nama_siswa.toLowerCase().includes(search.toLowerCase()) || 
     s.nis?.includes(search))
  );

  const availableJurusanIds = React.useMemo(() => {
    const assignedUnitIds = guruAssignments.map(a => a.unit_id).filter(Boolean) as string[];
    return assignedUnitIds;
  }, [guruAssignments]);

  return (
    <>
    <Modal isOpen={isOpen} onClose={onClose} title={
      <div className="flex items-center gap-2">
        <User className="text-primary" />
        <span>Atur Anggota: <span className="text-slate-500 font-normal">{struktur?.nama}</span></span>
      </div>
    } size="xl">
      <div className="space-y-6 pt-2">
        {/* Info Banner */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex items-center justify-between">
          <div className="flex items-start gap-3">
            <div className="bg-white p-2 rounded-xl shadow-sm">
              <Plus className="w-5 h-5 text-primary" />
            </div>
            <div className="space-y-0.5">
              <p className="text-sm font-bold text-slate-800">Manajemen Personil & Staf</p>
              <p className="text-xs text-slate-500 leading-relaxed">
                Anda dapat menugaskan <span className="font-semibold text-primary">satu atau lebih</span> anggota ke jabatan ini. 
                Misal: 1 orang Waka dan 2 orang Staf Kurikulum tetap menggunakan kartu jabatan yang sama.
              </p>
            </div>
          </div>
          <div className="flex flex-col items-end">
            <SimpleFormField label="Tgl. Penugasan">
              <Input 
                type="date"
                value={startDate}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setStartDate(e.target.value)}
                className="h-8 text-xs py-0 w-32 border-slate-200"
              />
            </SimpleFormField>
          </div>
        </div>

        <Tabs value={tab} onValueChange={(value) => setTab(value as 'GURU' | 'SISWA')}>
          <TabsList className="bg-slate-100/50 p-1 w-full flex">
            {struktur?.kode !== 'PETUGAS_KELAS' ? (
              <TabsTrigger value="GURU" className="flex-1 rounded-lg transition-all data-[state=active]:bg-white data-[state=active]:shadow-sm">
                GURU / STAFF
              </TabsTrigger>
            ) : (
              <TabsTrigger 
                value="SISWA" 
                className="flex-1 rounded-lg transition-all data-[state=active]:bg-white data-[state=active]:shadow-sm"
              >
                SISWA / PETUGAS
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="GURU" className="mt-6 space-y-4">
            {/* Current Assignments */}
            <div className="space-y-3">
              <Label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">Anggota Saat Ini ({guruAssignments.length})</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <AnimatePresence>
                  {guruAssignments.map((a) => (
                    <motion.div 
                      key={a.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-200 shadow-sm hover:border-primary/20 transition-all group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-400">
                          <User size={20} />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-800">{a.User?.Guru?.nama_guru}</p>
                          <p className="text-[10px] text-slate-500 font-mono">{a.User?.Guru?.nip || 'TANPA NIP'}</p>
                        </div>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 w-8 p-0 rounded-lg text-slate-400 hover:text-destructive hover:bg-destructive/10"
                        onClick={() => handleRemoveGuru(a.User?.Guru?.id || '')}
                      >
                        <Trash2 size={16} />
                      </Button>
                    </motion.div>
                  ))}
                </AnimatePresence>
                {guruAssignments.length === 0 && (
                  <div className="col-span-2 py-8 text-center border border-dashed rounded-xl border-slate-200 text-slate-400 text-sm">
                    Belum ada guru yang ditugaskan.
                  </div>
                )}
              </div>
            </div>

            {/* Search & Add */}
            <div className="space-y-4 pt-4 border-t border-slate-100">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input 
                  placeholder="Cari guru untuk ditambahkan..." 
                  className="pl-10 rounded-xl"
                  value={search}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
                />
              </div>

              <div className="max-h-[300px] overflow-y-auto pr-2 custom-scrollbar space-y-2">
                {filteredOptions.map((g) => (
                  <div key={g.id} className="flex items-center justify-between p-3 rounded-xl border border-transparent hover:border-slate-100 hover:bg-slate-50 transition-all group">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 bg-primary/10 rounded-lg flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                        <Briefcase size={16} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-700">{g.nama_guru}</p>
                        <p className="text-[10px] text-slate-400">{g.nip || 'NIP -'}</p>
                      </div>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleAddGuru(g.id)}
                      disabled={isSubmitting}
                      className="rounded-lg h-8 text-xs font-bold border-slate-200 shadow-sm"
                    >
                      Tugaskan
                    </Button>
                  </div>
                ))}
                {search && filteredOptions.length === 0 && (
                  <div className="text-center py-4 text-xs text-slate-400">Guru tidak ditemukan atau sudah ditugaskan.</div>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="SISWA" className="mt-6 space-y-4">
             {/* Current Assignments */}
             <div className="space-y-3">
              <Label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">Petugas (Siswa) ({siswaAssignments.length})</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <AnimatePresence>
                  {siswaAssignments.map((a) => (
                    <motion.div 
                      key={a.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-200 shadow-sm hover:border-primary/20 transition-all group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-400">
                          <GraduationCap size={20} />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-800">{a.User?.Siswa?.nama_siswa}</p>
                          <p className="text-[10px] text-slate-500 font-mono">{a.User?.Siswa?.nis || 'TANPA NIS'}</p>
                        </div>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 w-8 p-0 rounded-lg text-slate-400 hover:text-destructive hover:bg-destructive/10"
                        onClick={() => handleRemoveSiswa(a.User?.Siswa?.id || '')}
                      >
                        <Trash2 size={16} />
                      </Button>
                    </motion.div>
                  ))}
                </AnimatePresence>
                {siswaAssignments.length === 0 && (
                  <div className="col-span-2 py-8 text-center border border-dashed rounded-xl border-slate-200 text-slate-400 text-sm">
                    Belum ada siswa yang ditugaskan sebagai petugas.
                  </div>
                )}
              </div>
            </div>

            {/* Search & Add */}
            <div className="space-y-4 pt-4 border-t border-slate-100">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <SimpleFormField label="Filter Kelas (Akademik)">
                  <KelasSelect
                    value={selectedKelasId}
                    onValueChange={setSelectedKelasId}
                    placeholder="-- Pilih Kelas --"
                    tingkat={defaultTingkat ?? undefined}
                    triggerClassName="h-10 rounded-xl"
                  />
                </SimpleFormField>
                <SimpleFormField label="Pencarian Nama/NIS">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input 
                      placeholder="Cari siswa..." 
                      className="pl-10 h-10 rounded-xl"
                      value={search}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
                    />
                  </div>
                </SimpleFormField>
              </div>

              <div className="max-h-[300px] overflow-y-auto pr-2 custom-scrollbar space-y-2">
                {selectedKelasId ? (
                  <>
                    {filteredSiswaOptions.map((s) => (
                      <div key={s.id} className="flex items-center justify-between p-3 rounded-xl border border-transparent hover:border-slate-100 hover:bg-slate-50 transition-all group">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 bg-purple-100 rounded-lg flex items-center justify-center text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                            <GraduationCap size={16} />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-700">{s.nama_siswa}</p>
                            <p className="text-[10px] text-slate-400">{s.nis || 'NIS -'}</p>
                          </div>
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleAddSiswa(s.id)}
                          disabled={isSubmitting}
                          className="rounded-lg h-8 text-xs font-bold border-slate-200 shadow-sm"
                        >
                          Tugaskan
                        </Button>
                      </div>
                    ))}
                    {search && filteredSiswaOptions.length === 0 && (
                      <div className="text-center py-8 text-xs text-slate-400">Siswa tidak ditemukan atau sudah ditugaskan.</div>
                    )}
                    {!search && filteredSiswaOptions.length === 0 && (
                      <div className="text-center py-8 text-xs text-slate-400 italic">Semua siswa di kelas ini sudah ditugaskan.</div>
                    )}
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-3 border border-dashed rounded-xl">
                    <CheckCircle2 className="w-8 h-8 opacity-20" />
                    <p className="text-sm">Pilih kelas terlebih dahulu untuk melihat daftar siswa.</p>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <ModalFooter className="bg-slate-50/50 border-t border-slate-100 mt-6 rounded-b-3xl">
        <Button 
          variant="ghost" 
          onClick={onClose}
          className="rounded-xl font-semibold text-slate-500 hover:bg-slate-100"
        >
          Batal
        </Button>
        <Button 
          onClick={onClose}
          className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-8 shadow-md shadow-indigo-100 flex items-center gap-2 group transition-all"
        >
          <span>Simpan & Selesai</span>
          <CheckCircle2 className="w-4 h-4 group-hover:scale-110 transition-transform" />
        </Button>
      </ModalFooter>
      </Modal>

      {/* Nested Context Confirmation Dialog */}
      <Modal
        isOpen={isContextDialogOpen}
        onClose={() => setIsContextDialogOpen(false)}
        title={['WALIKELAS', 'PETUGAS_KELAS'].includes(struktur?.kode || '') ? "Pilih Kelas" : "Pilih Jurusan"}
        size="sm"
      >
        <div className="p-4 space-y-4">
          <p className="text-sm text-slate-500">
            Jabatan ini memerlukan pemilihan {['WALIKELAS', 'PETUGAS_KELAS'].includes(struktur?.kode || '') ? "kelas" : "jurusan"}. Silakan pilih untuk {tab === 'GURU' ? 'guru' : 'siswa'} yang bersangkutan.
          </p>
          
          {['WALIKELAS', 'PETUGAS_KELAS'].includes(struktur?.kode || '') ? (
            <SimpleFormField label="Kelas">
              <KelasSelect
                value={selectedKelasIdAssignment}
                onValueChange={setSelectedKelasIdAssignment}
                placeholder="-- Pilih Kelas --"
                tingkat={defaultTingkat ?? undefined}
                triggerClassName="h-10 rounded-xl"
              />
            </SimpleFormField>
          ) : (
            <SimpleFormField label="Jurusan">
              <JurusanSelect
                value={selectedUnitId}
                onValueChange={setSelectedUnitId}
                placeholder="-- Pilih Jurusan --"
                triggerClassName="h-10 rounded-xl"
                excludeIds={availableJurusanIds}
              />
            </SimpleFormField>
          )}
        </div>
        <ModalFooter>
          <Button variant="ghost" onClick={() => setIsContextDialogOpen(false)}>Batal</Button>
          <Button onClick={handleConfirmContext} disabled={isSubmitting || (['WALIKELAS', 'PETUGAS_KELAS'].includes(struktur?.kode || '') ? !selectedKelasIdAssignment : !selectedUnitId)}>
            {isSubmitting ? 'Menyimpan...' : 'Konfirmasi Penugasan'}
          </Button>
        </ModalFooter>
      </Modal>
    </>
  );
};
