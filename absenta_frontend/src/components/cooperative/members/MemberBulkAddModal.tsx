import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Button, Input, Checkbox } from '../../ui';
import { Modal } from '../ui/Modal';
import { SearchableSelect } from '../../ui/SearchableSelect';
import { Search, ArrowRight, ArrowLeft, Check, Users, AlertCircle, Loader, UserPlus, CheckCircle2 } from 'lucide-react';
import api from '../../../lib/axiosInstance';
import toast from 'react-hot-toast';
import { Table } from '../../ui/Table';

interface MemberBulkAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface NonMember {
  id: string;
  name: string;
  identityNo: string;
  className: string;
  email: string;
  phone: string;
  address: string;
}

export const MemberBulkAddModal: React.FC<MemberBulkAddModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [step, setStep] = useState<number>(1);
  const [memberType, setMemberType] = useState<'STUDENT' | 'TEACHER'>('STUDENT');
  const [kelasId, setKelasId] = useState<string>('ALL');
  const [kelasOptions, setKelasOptions] = useState<{ id: string; nama_kelas: string }[]>([]);
  
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [nonMembers, setNonMembers] = useState<NonMember[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  const [submitLoading, setSubmitLoading] = useState<boolean>(false);
  const [createdCount, setCreatedCount] = useState<number>(0);

  // Reset modal state
  const resetState = useCallback(() => {
    setStep(1);
    setMemberType('STUDENT');
    setKelasId('ALL');
    setSearchQuery('');
    setNonMembers([]);
    setSelectedIds(new Set());
    setCreatedCount(0);
    setSubmitLoading(false);
  }, []);

  const handleClose = () => {
    resetState();
    onClose();
  };

  // Fetch kelas options
  useEffect(() => {
    if (!isOpen) return;
    const fetchKelas = async () => {
      try {
        const response = await api.get('/academic/kelas');
        if (response.data && response.data.data) {
          setKelasOptions(response.data.data);
        }
      } catch (err) {
        console.error('Error loading kelas options:', err);
      }
    };
    fetchKelas();
  }, [isOpen]);

  // Fetch non-members from backend
  const fetchNonMembers = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get('/cooperative/members/non-members', {
        params: {
          type: memberType,
          kelasId: memberType === 'STUDENT' ? kelasId : undefined,
          search: searchQuery,
        },
      });
      if (Array.isArray(response.data)) {
        setNonMembers(response.data);
      }
    } catch (err) {
      console.error('Error fetching non-members:', err);
      toast.error('Gagal mengambil data calon anggota');
    } finally {
      setLoading(false);
    }
  }, [memberType, kelasId, searchQuery]);

  // Load non-members when entering step 2 or changing filters in step 2
  useEffect(() => {
    if (isOpen && step === 2) {
      fetchNonMembers();
    }
  }, [isOpen, step, fetchNonMembers]);

  // Reset selected IDs when member type changes
  useEffect(() => {
    setSelectedIds(new Set());
  }, [memberType]);

  const handleNext = () => {
    if (step === 2 && selectedIds.size === 0) {
      toast.error('Pilih minimal satu calon anggota.');
      return;
    }
    setStep(prev => prev + 1);
  };

  const handlePrev = () => {
    setStep(prev => prev - 1);
  };

  const selectedMembersList = useMemo(() => {
    return nonMembers.filter(m => selectedIds.has(m.id));
  }, [nonMembers, selectedIds]);

  const handleSubmitBulk = async () => {
    setSubmitLoading(true);
    try {
      const response = await api.post('/cooperative/members/bulk-create', {
        type: memberType,
        ids: Array.from(selectedIds),
      });

      if (response.data && response.data.success) {
        toast.success(`Berhasil mendaftarkan ${response.data.count} anggota baru!`);
        setCreatedCount(response.data.count);
        onSuccess();
        setStep(4);
      }
    } catch (err: any) {
      console.error('Bulk registration error:', err);
      const errorMsg = err.response?.data?.message || 'Gagal mendaftarkan anggota secara massal.';
      toast.error(errorMsg);
    } finally {
      setSubmitLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Tambah Anggota Massal (Wizard)"
      size={step === 2 ? 'xl' : 'lg'}
    >
      <div className="space-y-6">
        {/* Step Indicator Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 mb-2 select-none">
          {[
            { num: 1, label: 'Klasifikasi' },
            { num: 2, label: 'Seleksi' },
            { num: 3, label: 'Konfirmasi' },
            { num: 4, label: 'Hasil' }
          ].map(s => (
            <div key={s.num} className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black transition-all ${
                step === s.num
                  ? 'bg-indigo-600 text-white shadow-md ring-2 ring-indigo-100 dark:ring-indigo-950'
                  : step > s.num
                    ? 'bg-emerald-500 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
              }`}>
                {step > s.num ? <Check size={12} strokeWidth={3} /> : s.num}
              </div>
              <span className={`text-xs font-bold ${
                step === s.num
                  ? 'text-indigo-600 dark:text-indigo-400'
                  : step > s.num
                    ? 'text-slate-700 dark:text-slate-300'
                    : 'text-slate-400'
              }`}>
                {s.label}
              </span>
              {s.num < 4 && <ArrowRight size={14} className="text-slate-300 dark:text-slate-700" />}
            </div>
          ))}
        </div>

        {/* STEP 1: PILIH KLASIFIKASI */}
        {step === 1 && (
          <div className="space-y-6 py-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest block">Tipe Calon Anggota</label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setMemberType('STUDENT')}
                  className={`flex flex-col items-center justify-center p-6 border-2 rounded-2xl transition-all gap-2 text-center group ${
                    memberType === 'STUDENT'
                      ? 'border-indigo-600 bg-indigo-50/20 dark:bg-indigo-950/10 text-indigo-600 dark:text-indigo-400'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <Users size={32} className="group-hover:scale-110 transition-transform" />
                  <span className="font-bold text-sm">Siswa Sekolah</span>
                  <span className="text-[10px] text-slate-400">Daftarkan siswa secara massal</span>
                </button>

                <button
                  type="button"
                  onClick={() => setMemberType('TEACHER')}
                  className={`flex flex-col items-center justify-center p-6 border-2 rounded-2xl transition-all gap-2 text-center group ${
                    memberType === 'TEACHER'
                      ? 'border-indigo-600 bg-indigo-50/20 dark:bg-indigo-950/10 text-indigo-600 dark:text-indigo-400'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <UserPlus size={32} className="group-hover:scale-110 transition-transform" />
                  <span className="font-bold text-sm">Guru / Staf</span>
                  <span className="text-[10px] text-slate-400">Daftarkan pendidik secara massal</span>
                </button>
              </div>
            </div>

            {memberType === 'STUDENT' && (
              <div className="space-y-2 animate-in fade-in duration-300">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest block">Filter Kelas (Opsional)</label>
                <SearchableSelect
                  value={kelasId}
                  onValueChange={setKelasId}
                  options={[
                    { label: 'Semua Kelas', value: 'ALL' },
                    ...kelasOptions.map(k => ({ label: k.nama_kelas, value: k.id }))
                  ]}
                  placeholder="Pilih Kelas"
                  triggerClassName="w-full h-11 rounded-xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 shadow-sm"
                />
              </div>
            )}

            <div className="flex justify-end pt-4">
              <Button onClick={handleNext} className="rounded-xl px-8 uppercase font-bold text-[11px] tracking-widest shadow-lg shadow-indigo-600/10">
                Lanjut <ArrowRight size={14} className="ml-1.5" />
              </Button>
            </div>
          </div>
        )}

        {/* STEP 2: SELEKSI ANGGOTA */}
        {step === 2 && (
          <div className="space-y-4 py-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Filter Toolbar */}
            <div className="flex gap-3 items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder={`Cari nama, ${memberType === 'STUDENT' ? 'NIS' : 'NIP'} calon anggota...`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-10 rounded-xl"
                  onKeyDown={(e) => { if (e.key === 'Enter') fetchNonMembers(); }}
                />
              </div>
              <Button variant="outline" className="h-10 rounded-xl text-xs px-5" onClick={fetchNonMembers} disabled={loading}>
                Cari
              </Button>
            </div>

            {/* Table wrapper */}
            <div className="border border-slate-100 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
              <Table
                compact={true}
                columns={[
                  {
                    key: '__select',
                    label: (
                      <Checkbox
                        checked={nonMembers.length > 0 && nonMembers.every(n => selectedIds.has(n.id))}
                        onCheckedChange={(checked) => {
                          const next = new Set<string>(selectedIds);
                          if (checked) {
                            nonMembers.forEach(n => next.add(n.id));
                          } else {
                            nonMembers.forEach(n => next.delete(n.id));
                          }
                          setSelectedIds(next);
                        }}
                        label=""
                      />
                    ),
                    className: 'w-12 text-center',
                    render: (_, row: NonMember) => (
                      <Checkbox
                        checked={selectedIds.has(row.id)}
                        onCheckedChange={(checked) => {
                          const next = new Set<string>(selectedIds);
                          if (checked) next.add(row.id); else next.delete(row.id);
                          setSelectedIds(next);
                        }}
                        label=""
                      />
                    )
                  },
                  { key: 'name', label: 'Nama Lengkap' },
                  { key: 'identityNo', label: memberType === 'STUDENT' ? 'NIS' : 'NIP' },
                  { key: 'className', label: 'Klasifikasi / Kelas' }
                ]}
                data={nonMembers}
                loading={loading}
                emptyMessage="Tidak ada calon anggota ditemukan"
              />
            </div>

            <div className="flex justify-between items-center pt-4">
              <span className="text-xs text-slate-500 font-bold">
                Terpilih: <span className="text-indigo-600 dark:text-indigo-400 font-black">{selectedIds.size} orang</span>
              </span>
              <div className="flex items-center gap-3">
                <Button variant="outline" onClick={handlePrev} className="rounded-xl">
                  <ArrowLeft size={14} className="mr-1.5" /> Kembali
                </Button>
                <Button onClick={handleNext} disabled={selectedIds.size === 0} className="rounded-xl uppercase font-bold text-[11px] tracking-widest shadow-lg shadow-indigo-600/10">
                  Lanjut <ArrowRight size={14} className="ml-1.5" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: KONFIRMASI */}
        {step === 3 && (
          <div className="space-y-6 py-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="p-4 bg-indigo-50/50 dark:bg-indigo-950/15 border border-indigo-100/50 dark:border-indigo-900/30 rounded-2xl flex items-start gap-4">
              <div className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-600/20">
                <Users size={20} />
              </div>
              <div className="space-y-1">
                <h4 className="text-xs font-black text-indigo-950 dark:text-indigo-300 uppercase tracking-wider">Konfirmasi Pendaftaran Anggota</h4>
                <p className="text-xs text-indigo-700/80 dark:text-indigo-400 leading-relaxed">
                  Anda akan mendaftarkan <strong className="text-indigo-900 dark:text-indigo-300 font-black">{selectedIds.size} orang</strong> sebagai anggota baru koperasi sekolah.
                </p>
              </div>
            </div>

            <div className="border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden max-h-56 overflow-y-auto divide-y divide-slate-50 dark:divide-slate-800 scrollbar-thin">
              <div className="bg-slate-50 dark:bg-slate-900 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400">Daftar Calon Anggota Terpilih</div>
              {selectedMembersList.map((m) => (
                <div key={m.id} className="px-4 py-2.5 flex items-center justify-between text-xs hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors">
                  <div className="flex flex-col gap-0.5">
                    <span className="font-bold text-slate-800 dark:text-slate-200">{m.name}</span>
                    <span className="text-[10px] text-slate-400 font-medium">No. Identitas: {m.identityNo}</span>
                  </div>
                  <span className="text-[10px] font-black bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-full border border-indigo-100/20">
                    {m.className}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-3 p-4 bg-amber-50 dark:bg-amber-950/10 border border-amber-100/60 dark:border-amber-900/30 rounded-2xl text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
              <AlertCircle size={18} className="shrink-0 text-amber-500" />
              <span><strong>Catatan:</strong> Setiap anggota baru akan secara otomatis dibuatkan akun Rekening Simpanan dengan saldo <strong>Rp 0</strong> untuk semua jenis simpanan aktif.</span>
            </div>

            <div className="flex justify-between items-center pt-4">
              <Button variant="outline" onClick={handlePrev} className="rounded-xl" disabled={submitLoading}>
                <ArrowLeft size={14} className="mr-1.5" /> Kembali
              </Button>
              <Button onClick={handleSubmitBulk} disabled={submitLoading} className="rounded-xl uppercase font-bold text-[11px] tracking-widest shadow-lg shadow-indigo-600/10">
                {submitLoading ? (
                  <>
                    <Loader className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Sedang Menyimpan...
                  </>
                ) : (
                  <>
                    Daftarkan Sekarang <Check size={14} className="ml-1.5" strokeWidth={3} />
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* STEP 4: HASIL */}
        {step === 4 && (
          <div className="text-center space-y-6 py-6 animate-in zoom-in-95 duration-500">
            <div className="inline-flex p-4 bg-emerald-100 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 rounded-full ring-8 ring-emerald-50 dark:ring-emerald-950/20 shadow-lg">
              <CheckCircle2 size={40} />
            </div>
            
            <div className="space-y-1">
              <h3 className="text-base font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight">Proses Registrasi Massal Selesai</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                Berhasil mendaftarkan sebanyak <strong className="text-emerald-600 dark:text-emerald-400 font-bold">{createdCount} orang</strong> sebagai anggota aktif baru di koperasi sekolah Anda.
              </p>
            </div>

            <div className="pt-4 max-w-xs mx-auto">
              <Button onClick={handleClose} className="w-full rounded-xl uppercase font-bold text-[11px] tracking-widest">
                Tutup Selesai
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
