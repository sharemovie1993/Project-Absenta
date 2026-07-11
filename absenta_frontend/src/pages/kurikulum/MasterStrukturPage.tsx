import React, { useState, useMemo, useCallback, lazy, Suspense } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Plus, 
  Trash2, 
  Save, 
  BookOpen, 
  Layers,
  Settings,
  ChevronRight,
  Info
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Skeleton } from '../../components/ui/Skeleton';
import { ModalFooter } from '../../components/ui/Modal';
import { SearchableSelect } from '../../components/ui/SearchableSelect';
import { AcademicPageLayout } from '../../components/academic/AcademicPageLayout';
import { Loader } from '../../components/ui/Loader';
import { kurikulumApi } from '../../api/kurikulum.api';
import { mapelApi, tahunPelajaranApi } from '../../api/academic.api';
import { useConfirm } from '../../providers/ConfirmProvider';
import { toast } from 'react-hot-toast';
import { useJenjang } from '../../hooks/useJenjang';
import type { Mapel } from '../../types/academic';

const Modal = lazy(() => import('../../components/ui/Modal').then(module => ({ default: module.Modal })));

type StrukturKurikulum = {
  id: string;
  mapel_id: string;
  tahun_pelajaran_id: string;
  tingkat: number;
  jp_per_minggu: number;
  kelompok: string;
  Mapel?: Mapel;
};

const MasterStrukturPage: React.FC = () => {
    const queryClient = useQueryClient();
    const { confirm } = useConfirm();
    
    const { tingkatList, kelompokOptions, isLoading: isLoadingJenjang } = useJenjang();

    // Filters
    const [selectedTahunId, setSelectedTahunId] = useState<string>('');
    const [selectedTingkat, setSelectedTingkat] = useState<number>(10);
    
    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<StrukturKurikulum | null>(null);

    const [formData, setFormData] = useState<{mapel_id: string, jp_per_minggu: number, kelompok: string}>({
        mapel_id: '',
        jp_per_minggu: 2,
        kelompok: ''
    });

    const resetForm = useCallback(() => {
        setFormData({
            mapel_id: '',
            jp_per_minggu: 2,
            kelompok: kelompokOptions?.[0]?.value || 'UMUM'
        });
        setEditingItem(null);
    }, [kelompokOptions]);

    React.useEffect(() => {
        if (kelompokOptions?.length > 0 && !formData.kelompok) {
            setFormData(prev => ({ ...prev, kelompok: kelompokOptions[0].value }));
        }
    }, [kelompokOptions, formData.kelompok]);

    const openCreateModal = useCallback(() => {
        resetForm();
        setIsModalOpen(true);
    }, [resetForm]);

    const openEditModal = useCallback((item: StrukturKurikulum) => {
        setEditingItem(item);
        setFormData({
            mapel_id: item.mapel_id,
            jp_per_minggu: item.jp_per_minggu,
            kelompok: item.kelompok
        });
        setIsModalOpen(true);
    }, []);

    const closeModal = useCallback(() => {
        setIsModalOpen(false);
        resetForm();
    }, [resetForm]);

    // Data Fetching
    const { data: years } = useQuery({
        queryKey: ['academic-years'],
        queryFn: () => tahunPelajaranApi.getAll()
    });

    const activeYear = useMemo(() => 
        years?.data?.find(y => y.is_active) || years?.data?.[0], 
    [years]);

    // Set default year
    React.useEffect(() => {
        if (activeYear && !selectedTahunId) {
            setSelectedTahunId(activeYear.id);
        }
    }, [activeYear, selectedTahunId]);


    // Set selectedTingkat ke tingkat terendah yang valid jika belum dipilih atau tidak ada dalam list
    React.useEffect(() => {
        if (tingkatList.length > 0 && !tingkatList.includes(selectedTingkat)) {
            setSelectedTingkat(tingkatList[0]);
        }
    }, [tingkatList, selectedTingkat]);

    const { data: mapping, isLoading: isLoadingMapping } = useQuery({
        queryKey: ['kurikulum-struktur', selectedTahunId, selectedTingkat],
        queryFn: () => kurikulumApi.getStruktur({ 
            tahun_pelajaran_id: selectedTahunId, 
            tingkat: selectedTingkat 
        }),
        enabled: !!selectedTahunId
    });

    const { data: subjects } = useQuery({
        queryKey: ['academic-subjects'],
        queryFn: () => mapelApi.getAll()
    });

    // Mutations
    const upsertMutation = useMutation({
        mutationFn: (data: Partial<StrukturKurikulum>) => kurikulumApi.upsertStruktur(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['kurikulum-struktur'] });
            toast.success('Struktur kurikulum berhasil disimpan');
            closeModal();
        },
        onError: () => toast.error('Gagal menyimpan data')
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => kurikulumApi.deleteStruktur(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['kurikulum-struktur'] });
            toast.success('Data dihapus');
        }
    });

    const handleSave = useCallback((e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const data: Partial<StrukturKurikulum> = {
            mapel_id: formData.mapel_id,
            tahun_pelajaran_id: selectedTahunId,
            tingkat: selectedTingkat,
            jp_per_minggu: Number(formData.jp_per_minggu),
            kelompok: formData.kelompok
        };
        upsertMutation.mutate(data);
    }, [formData, selectedTahunId, selectedTingkat, upsertMutation]);

    const handleDelete = useCallback(async (id: string) => {
        if (await confirm({ title: 'Hapus Pemetaan?', description: 'Langkah ini akan menghapus alokasi jam pelajaran untuk mata pelajaran ini.' })) {
            deleteMutation.mutate(id);
        }
    }, [confirm, deleteMutation]);

    const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    }, []);

    const totalJp = useMemo(() => {
        return mapping?.data?.reduce((acc: number, curr: StrukturKurikulum) => acc + curr.jp_per_minggu, 0) || 0;
    }, [mapping?.data]);

    const breadcrumbs = useMemo(() => [
        { label: 'Kurikulum' },
        { label: 'Struktur Kurikulum' }
    ], []);

    return (
        <AcademicPageLayout
            title="Master Struktur Kurikulum"
            description="Plotting alokasi Jam Pelajaran (JP) per tingkat."
            breadcrumbs={breadcrumbs}
            hardeningModuleKey="masterstrukturpage"
            instruction={{
                title: 'Panduan Master Struktur Kurikulum',
                description: 'Kelola alokasi jam pelajaran (JP) per mata pelajaran untuk setiap tingkat kelas sesuai kurikulum yang berlaku.',
                items: [
                    { text: 'Pilih tahun ajaran dan tingkat kelas (10/11/12) untuk melihat dan mengedit struktur kurikulum.' },
                    { text: 'Klik sel pada tabel untuk mengubah jumlah jam pelajaran per minggu.' },
                    { text: 'Pastikan total JP per tingkat sesuai dengan ketentuan kurikulum yang berlaku.' }
                ]
            }}
        >
            <div className="space-y-6 animate-in fade-in duration-500 pb-20">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white hidden md:block">Struktur Kurikulum</h1>
                </div>
                <div className="flex flex-wrap items-center gap-3 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-xl">
                    <select 
                        value={selectedTahunId}
                        onChange={(e) => setSelectedTahunId(e.target.value)}
                        className="bg-transparent border-none text-sm font-bold focus:ring-0 cursor-pointer px-3"
                    >
                        {years?.data?.map(y => (
                            <option key={y.id} value={y.id}>{y.tahun} {y.is_active ? '(Aktif)' : ''}</option>
                        ))}
                    </select>
                    <div className="w-px h-4 bg-gray-300 dark:bg-gray-700 hidden md:block"></div>
                    <div className="flex gap-1 p-1">
                        {tingkatList.map((t) => (
                            <button
                                key={t}
                                onClick={() => setSelectedTingkat(t)}
                                className={`px-4 py-1.5 rounded-xl text-xs font-black transition-all ${
                                    selectedTingkat === t 
                                    ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600 dark:text-indigo-400' 
                                    : 'text-gray-500 hover:bg-white/50 dark:hover:bg-slate-700/50'
                                }`}
                            >
                                KELAS {t}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Stats / Info Side */}
                <div className="space-y-4">
                    <Card className="p-5 border-none shadow-sm bg-gradient-to-br from-indigo-600 to-violet-700 text-white overflow-hidden relative">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 blur-3xl -mr-16 -mt-16"></div>
                        <div className="relative z-10 space-y-4">
                            <div className="p-3 bg-white/20 rounded-xl w-fit">
                                <Layers size={24} />
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest opacity-70">Total Beban Belajar</p>
                                <p className="text-4xl font-black">
                                    {totalJp}
                                    <span className="text-sm font-medium ml-2 opacity-80 uppercase tracking-widest">JP / Minggu</span>
                                </p>
                            </div>
                            <Button 
                                onClick={openCreateModal}
                                className="w-full bg-white text-indigo-600 hover:bg-indigo-50 font-black rounded-xl border-none"
                            >
                                <Plus size={18} className="mr-2" />
                                TAMBAH MAPEL
                            </Button>
                        </div>
                    </Card>

                    <Card className="p-5 border-none shadow-sm space-y-3">
                        <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center">
                            <Info size={14} className="mr-2" />
                            Panduan Plotting
                        </h4>
                        <ul className="space-y-2">
                            {[
                                'Pilih Tahun Pelajaran yang aktif.',
                                'Plotting dilakukan per tingkat (10, 11, 12).',
                                'Pastikan total JP sesuai dengan regulasi kurikulum.',
                                'Gunakan kelompok "Pilihan" untuk mapel peminatan.'
                            ].map((text, i) => (
                                <li key={i} className="text-xs text-gray-600 dark:text-gray-400 flex items-start">
                                    <ChevronRight size={14} className="mr-1 text-indigo-500 flex-shrink-0 mt-0.5" />
                                    {text}
                                </li>
                            ))}
                        </ul>
                    </Card>
                </div>

                {/* Main Table View */}
                <div className="lg:col-span-3">
                    <Card className="border-none shadow-sm overflow-hidden min-h-[500px]">
                        <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
                            <h3 className="font-black text-gray-900 dark:text-white uppercase tracking-tight flex items-center">
                                <BookOpen size={18} className="mr-2 text-indigo-500" />
                                Struktur Kurikulum - Tingkat {selectedTingkat}
                            </h3>
                            <Badge variant="secondary" className="font-bold">{mapping?.data?.length || 0} Mata Pelajaran</Badge>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50 dark:bg-slate-800/50 text-gray-400 text-[10px] font-black uppercase tracking-widest border-b border-gray-100 dark:border-gray-800">
                                    <tr>
                                        <th className="px-6 py-4">Kelompok</th>
                                        <th className="px-6 py-4">Mata Pelajaran</th>
                                        <th className="px-6 py-4 text-center">Beban (JP)</th>
                                        <th className="px-6 py-4 text-right">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                                    {isLoadingMapping ? (
                                        [1,2,3,4,5].map(i => (
                                            <tr key={i}>
                                                <td className="px-6 py-4" colSpan={4}><Skeleton className="h-10 w-full rounded-lg" /></td>
                                            </tr>
                                        ))
                                    ) : !mapping?.data || mapping.data.length === 0 ? (
                                        <tr>
                                            <td className="px-6 py-20 text-center" colSpan={4}>
                                                <div className="flex flex-col items-center justify-center space-y-3 opacity-30">
                                                    <BookOpen size={48} />
                                                    <p className="text-sm font-bold">Belum ada data struktur kurikulum untuk tingkat ini</p>
                                                    <Button 
                                                        variant="outline" 
                                                        onClick={openCreateModal}
                                                        className="mt-4"
                                                    >
                                                        Tambah Pemetaan Sekarang
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        mapping.data.map((item: StrukturKurikulum) => (
                                            <tr key={item.id} className="group hover:bg-indigo-50/30 dark:hover:bg-indigo-900/10 transition-colors">
                                                <td className="px-6 py-4">
                                                    <Badge className="bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold border-none">
                                                        {item.kelompok || 'UMUM'}
                                                    </Badge>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div>
                                                        <p className="font-bold text-gray-900 dark:text-white">{item.Mapel?.nama_mapel}</p>
                                                        <p className="text-[10px] font-mono text-gray-400">{item.Mapel?.kode_mapel}</p>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className="text-lg font-black text-indigo-600 dark:text-indigo-400">{item.jp_per_minggu}</span>
                                                    <span className="text-[10px] font-bold text-gray-400 ml-1">JP</span>
                                                </td>
                                                <td className="px-6 py-4 text-right space-x-2">
                                                    <button 
                                                        onClick={() => openEditModal(item)}
                                                        className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-lg text-gray-400 hover:text-indigo-600 transition-all shadow-sm opacity-0 group-hover:opacity-100"
                                                        aria-label="Edit Alokasi"
                                                    >
                                                        <Settings size={16} />
                                                    </button>
                                                    <button 
                                                        onClick={() => handleDelete(item.id)}
                                                        className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-lg text-gray-400 hover:text-red-600 transition-all shadow-sm opacity-0 group-hover:opacity-100"
                                                        aria-label="Hapus Pemetaan"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </div>
            </div>

            {/* Upsert Modal */}
            <Suspense fallback={<Loader />}>
                {isModalOpen && (
                <Modal
                    isOpen={isModalOpen}
                    onClose={closeModal}
                    title={editingItem ? 'Edit Alokasi JP' : 'Tambah Alokasi JP'}
                    size="md"
                >
                    <form onSubmit={handleSave} className="space-y-4 pt-2">
                        <div className="space-y-4 p-1">
                            {!editingItem && (
                                <div className="space-y-1.5">
                                    <label htmlFor="mapel_id" className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Mata Pelajaran</label>
                                    <SearchableSelect 
                                        value={formData.mapel_id}
                                        onValueChange={(val: string) => setFormData(prev => ({ ...prev, mapel_id: val }))}
                                        options={subjects?.data?.map((s: Mapel) => ({ value: s.id, label: `${s.nama_mapel} (${s.kode_mapel})` })) || []}
                                        placeholder="Pilih Mata Pelajaran..."
                                    />
                                </div>
                            )}
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label htmlFor="jp_per_minggu" className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Jam Per Minggu (JP)</label>
                                    <input 
                                        type="number" 
                                        id="jp_per_minggu"
                                        name="jp_per_minggu"
                                        value={formData.jp_per_minggu}
                                        onChange={handleInputChange}
                                        min={1}
                                        max={40}
                                        required
                                        className="w-full h-12 px-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-slate-900 font-black text-indigo-600 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label htmlFor="kelompok" className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Kelompok</label>
                                    <select 
                                        id="kelompok"
                                        name="kelompok"
                                        value={formData.kelompok}
                                        onChange={handleInputChange}
                                        className="w-full h-12 px-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-slate-900 font-bold focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                                    >
                                        {kelompokOptions?.map(opt => (
                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                        </div>

                        <ModalFooter className="px-0 pt-4 mt-6">
                            <Button variant="ghost" type="button" onClick={closeModal} className="rounded-xl font-bold">BATAL</Button>
                            <Button type="submit" isLoading={upsertMutation.isPending} className="bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl shadow-lg shadow-indigo-200 dark:shadow-none">
                            <Save size={18} className="mr-2" />
                            SIMPAN PEMETAAN
                            </Button>
                        </ModalFooter>
                    </form>
                </Modal>
                )}
            </Suspense>
            </div>
        </AcademicPageLayout>
    );
};

export default MasterStrukturPage;
