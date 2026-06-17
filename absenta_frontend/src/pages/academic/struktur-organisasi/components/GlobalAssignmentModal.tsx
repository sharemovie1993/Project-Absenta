import React, { useState, useEffect } from 'react';
import { 
  UserCheck, 
  RefreshCw 
} from 'lucide-react';
import Modal, { ModalFooter } from '@/components/ui/Modal';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { Label } from '@/components/ui/Label';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { SimpleFormField } from '@/components/ui/SimpleFormField';
import { 
  getGuruList 
} from '@/api/academic/guru.api';
import { getJurusanList } from '@/api/academic/jurusan.api';
import { 
  getSiswaList 
} from '@/api/academic/siswa.api';
import { 
  dropdownApi, 
  type DropdownOption 
} from '@/api/dropdown.api';
import { 
  assignGuruToStruktur, 
  assignSiswaToStruktur,
  createStruktur
} from '@/api/academic/strukturOrganisasi.api';
import type { Guru, Siswa } from '@/types/academic';
import type { StrukturOrganisasi } from '@/api/academic/strukturOrganisasi.api';
import { useToast } from '@/hooks/useToast';

interface GlobalAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: StrukturOrganisasi[];
  kelasOptions: DropdownOption[];
  onSuccess: () => void;
}

export const GlobalAssignmentModal: React.FC<GlobalAssignmentModalProps> = ({
  isOpen,
  onClose,
  data,
  kelasOptions,
  onSuccess
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [jurusanOptions, setJurusanOptions] = useState<{ label: string; value: string }[]>([]);
  const [selectedUnitId, setSelectedUnitId] = useState<string>('');
  const { error: showErrorToast, success: showSuccessToast } = useToast();
  const [assignmentTab, setAssignmentTab] = useState<'GURU' | 'SISWA'>('GURU');
  const [selectedStrukturForForm, setSelectedStrukturForForm] = useState<string>('');
  const [guruOptions, setGuruOptions] = useState<Guru[]>([]);
  const [siswaOptions, setSiswaOptions] = useState<Siswa[]>([]);
  const [selectedGuruIdForForm, setSelectedGuruIdForForm] = useState<string>('');
  const [selectedSiswaIdForForm, setSelectedSiswaIdForForm] = useState<string>('');
  const [assignmentStartDate, setAssignmentStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [isSavingAssignment, setIsSavingAssignment] = useState(false);
  const [selectedKelasIdForSiswaForm, setSelectedKelasIdForSiswaForm] = useState<string>('');
  const [selectedKelasIdForGuruForm, setSelectedKelasIdForGuruForm] = useState<string>('');

  const selectedStruktur = data.find((item) => item.id === selectedStrukturForForm);

  useEffect(() => {
    if (!isOpen) return;

    const loadGuru = async () => {
      try {
        const res = await getGuruList(1, 100, '');
        setGuruOptions(res.data || []);
      } catch (error) {
        console.error(error);
      }
    };

    loadGuru();
    fetchJurusans();
  }, [isOpen]);

  const fetchJurusans = async () => {
    try {
      const res = await getJurusanList();
      if (res.data) {
        setJurusanOptions(res.data.map(j => ({ label: j.nama, value: j.id })));
      }
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    if (!isOpen || assignmentTab !== 'SISWA') return;
    if (!selectedKelasIdForSiswaForm) {
      setSiswaOptions([]);
      setSelectedStrukturForForm('');
      return;
    }

    let struktur = data.find(
      (item) => item.kode === 'PETUGAS_KELAS' && item.kelas_id === selectedKelasIdForSiswaForm
    );
    if (!struktur) {
      struktur = data.find((item) => item.kode === 'PETUGAS_KELAS');
    }
    setSelectedStrukturForForm(struktur?.id || '');

    const loadSiswa = async () => {
      try {
        const res = await getSiswaList(1, 200, '', selectedKelasIdForSiswaForm, 'AKTIF');
        setSiswaOptions(res.data || []);
      } catch (error) {
        console.error(error);
      }
    };

    loadSiswa();
  }, [isOpen, assignmentTab, selectedKelasIdForSiswaForm, data]);

  const handleSaveGlobalAssignment = async () => {
    if (assignmentTab === 'GURU' && !selectedStrukturForForm) {
      showErrorToast('Silakan pilih struktur terlebih dahulu');
      return;
    }

    if (assignmentTab === 'GURU' && !selectedGuruIdForForm) {
      showErrorToast('Silakan pilih guru yang akan ditugaskan');
      return;
    }

    if (assignmentTab === 'GURU' && selectedStruktur?.kode === 'WALIKELAS' && !selectedKelasIdForGuruForm) {
      showErrorToast('Silakan pilih kelas untuk penugasan wali kelas');
      return;
    }

    if (assignmentTab === 'SISWA' && !selectedKelasIdForSiswaForm) {
      showErrorToast('Silakan pilih kelas terlebih dahulu');
      return;
    }

    if (assignmentTab === 'SISWA' && !selectedStrukturForForm) {
      showErrorToast('Struktur Petugas Kelas untuk kelas ini belum tersedia');
      return;
    }

    if (assignmentTab === 'SISWA' && !selectedSiswaIdForForm) {
      showErrorToast('Silakan pilih siswa yang akan ditugaskan');
      return;
    }

    setIsSavingAssignment(true);
    try {
      if (assignmentTab === 'GURU') {
        let targetStrukturId = selectedStrukturForForm;
        if (selectedStruktur?.kode === 'WALIKELAS') {
          const existingWaliKelasStruktur = data.find(
            (item) => item.kode === 'WALIKELAS' && item.kelas_id === selectedKelasIdForGuruForm
          );

          if (existingWaliKelasStruktur) {
            targetStrukturId = existingWaliKelasStruktur.id;
          } else {
            const created = await createStruktur({
              kode: 'WALIKELAS',
              nama: selectedStruktur?.nama || 'Wali Kelas',
              deskripsi: selectedStruktur?.deskripsi || '',
              scope: selectedStruktur?.scope || 'student',
              kelas_id: selectedKelasIdForGuruForm
            });
            targetStrukturId = created.data.id;
          }
        }

        await assignGuruToStruktur(targetStrukturId, {
          guru_id: selectedGuruIdForForm,
          unit_id: selectedUnitId || (selectedStruktur as any)?.unit_id,
          kelas_id: selectedKelasIdForGuruForm || (selectedStruktur as any)?.kelas_id,
          start_date: assignmentStartDate
        });
        showSuccessToast('Penugasan guru berhasil disimpan');
      } else {
        await assignSiswaToStruktur(selectedStrukturForForm, {
          siswa_id: selectedSiswaIdForForm,
          kelas_id: selectedKelasIdForSiswaForm,
          start_date: assignmentStartDate
        });
        showSuccessToast('Penugasan siswa berhasil disimpan');
      }
      onSuccess();
      onClose();
    } catch (error: any) {
      showErrorToast(error?.message || 'Gagal menyimpan penugasan');
    } finally {
      setIsSavingAssignment(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-3">
          <div className="p-3 bg-emerald-50 dark:bg-emerald-900/30 rounded-xl text-emerald-600">
            <UserCheck size={24} />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Penugasan Personil</h2>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Assign Member to Position</p>
          </div>
        </div>
      }
      size="lg"
    >
      <div className="space-y-6">
        <Tabs value={assignmentTab} onValueChange={(v: any) => setAssignmentTab(v)}>
          <TabsList className="grid w-full grid-cols-2 rounded-xl p-1 bg-slate-100 dark:bg-slate-800">
            <TabsTrigger value="GURU" className="rounded-xl font-black uppercase tracking-widest text-[10px]">Tenaga Pendidik</TabsTrigger>
            <TabsTrigger value="SISWA" className="rounded-xl font-black uppercase tracking-widest text-[10px]">Peserta Didik</TabsTrigger>
          </TabsList>

          <div className="mt-6 space-y-6">
            <TabsContent value="GURU" className="space-y-6 m-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <SimpleFormField label="Jabatan Struktur">
                  <SearchableSelect
                    value={selectedStrukturForForm}
                    onValueChange={setSelectedStrukturForForm}
                    options={data.filter(i => i.kode !== 'PETUGAS_KELAS').map(i => ({ label: `${i.kode} - ${i.nama}`, value: i.id }))}
                    placeholder="Pilih Jabatan..."
                  />
                </SimpleFormField>
                
                {/* Specific field for KAPROG/KABENG/TOOLMAN (linked to Jurusan) */}
                {['KAPROG', 'KABENG', 'TOOLMAN'].includes((selectedStruktur as any)?.kode || '') && (
                  <SimpleFormField label="Pilih Jurusan / Unit Kerja">
                    <SearchableSelect
                      value={selectedUnitId}
                      onValueChange={setSelectedUnitId}
                      options={jurusanOptions}
                      placeholder="Pilih Jurusan..."
                    />
                  </SimpleFormField>
                )}

                {(selectedStruktur as any)?.kode === 'WALIKELAS' && (
                  <SimpleFormField label="Pilih Kelas">
                    <SearchableSelect
                      value={selectedKelasIdForGuruForm}
                      onValueChange={setSelectedKelasIdForGuruForm}
                      options={kelasOptions}
                      placeholder="Pilih Kelas..."
                    />
                  </SimpleFormField>
                )}
                <div className="md:col-span-2">
                  <SimpleFormField label="Pilih Guru">
                    <SearchableSelect
                      value={selectedGuruIdForForm}
                      onValueChange={setSelectedGuruIdForForm}
                      options={guruOptions.map(g => ({ label: `${g.nama_guru} (${g.nip || '-'})`, value: g.id }))}
                      placeholder="Cari Nama Guru..."
                    />
                  </SimpleFormField>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="SISWA" className="space-y-6 m-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <SimpleFormField label="Pilih Kelas">
                  <SearchableSelect
                    value={selectedKelasIdForSiswaForm}
                    onValueChange={setSelectedKelasIdForSiswaForm}
                    options={kelasOptions}
                    placeholder="Pilih Kelas..."
                  />
                </SimpleFormField>
                <SimpleFormField label="Pilih Siswa">
                  <SearchableSelect
                    value={selectedSiswaIdForForm}
                    onValueChange={setSelectedSiswaIdForForm}
                    options={siswaOptions.map(s => ({ label: `${s.nama_siswa} (${s.nis || '-'})`, value: s.id }))}
                    placeholder={selectedKelasIdForSiswaForm ? "Pilih Siswa..." : "Pilih kelas dulu"}
                    disabled={!selectedKelasIdForSiswaForm}
                  />
                </SimpleFormField>
              </div>
            </TabsContent>

          <SimpleFormField label="Tanggal Mulai Tugas">
            <Input
              type="date"
              value={assignmentStartDate}
              onChange={(e) => setAssignmentStartDate(e.target.value)}
            />
          </SimpleFormField>
          </div>
        </Tabs>

        <ModalFooter className="pt-6 border-t border-slate-100 dark:border-slate-800">
          <Button variant="ghost" onClick={onClose} className="rounded-xl font-bold uppercase tracking-widest text-[10px]">Batal</Button>
          <Button
            variant="toolbarPrimary"
            onClick={handleSaveGlobalAssignment}
            disabled={isSavingAssignment}
            className="px-10"
          >
            {isSavingAssignment ? <RefreshCw className="animate-spin mr-2" size={16} /> : <UserCheck className="mr-2" size={16} />}
            Simpan Penugasan
          </Button>
        </ModalFooter>
      </div>
    </Modal>
  );
};
