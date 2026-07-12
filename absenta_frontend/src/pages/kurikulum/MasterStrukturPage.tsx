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
  Info,
  Search
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
    
    const { jenjang, tingkatList, kelompokOptions, isLoading: isLoadingJenjang } = useJenjang();

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

    // Bulk mode states
    const [bulkSelections, setBulkSelections] = useState<Record<string, { jp_per_minggu: number; kelompok: string }>>({});
    const [bulkSearchQuery, setBulkSearchQuery] = useState('');
    
    // Outer table row selections for bulk delete
    const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set());

    const { data: subjects } = useQuery({
        queryKey: ['academic-subjects'],
        queryFn: () => mapelApi.getAll({ limit: 1000 })
    });

    const resetForm = useCallback(() => {
        setFormData({
            mapel_id: '',
            jp_per_minggu: 2,
            kelompok: kelompokOptions?.[0]?.value || 'MATA PELAJARAN UMUM'
        });
        setBulkSelections({});
        setBulkSearchQuery('');
        setSelectedRowIds(new Set());
        setEditingItem(null);
    }, [kelompokOptions]);

    // Reset table row selections when filters change
    React.useEffect(() => {
        setSelectedRowIds(new Set());
    }, [selectedTahunId, selectedTingkat]);

    React.useEffect(() => {
        if (kelompokOptions?.length > 0 && !formData.kelompok) {
            setFormData(prev => ({ ...prev, kelompok: kelompokOptions[0].value }));
        }
    }, [kelompokOptions, formData.kelompok]);

    // Auto-detect kelompok based on selected mapel
    React.useEffect(() => {
        if (!formData.mapel_id || !subjects?.data || !kelompokOptions?.length) return;
        
        const selectedMapel = subjects.data.find((s: Mapel) => s.id === formData.mapel_id);
        if (!selectedMapel) return;
        
        const kode = (selectedMapel.kode_mapel || '').toUpperCase();
        const nama = (selectedMapel.nama_mapel || '').toLowerCase();
        
        let detectedKelompok = 'MATA PELAJARAN UMUM';
        
        // 1. Kejuruan
        const kejuruanSuffixes = ['-RPL', '-TKJ', '-AKL', '-MPLB', '-DKV', '-TBSM', '-TKR', '-TP', '-PH', '-KL', '-TB', '-TAV', '-TOI'];
        const isKejuruan = kode.includes('PKL') || 
                           kode.includes('PKK') || 
                           kode.includes('DAS-') || 
                           kode.endsWith('-K') || 
                           kejuruanSuffixes.some(s => kode.includes(s)) ||
                           nama.includes('praktik kerja lapangan') || 
                           nama.includes('projek kreatif') || 
                           nama.includes('dasar-dasar');
                           
        // 2. Muatan Lokal
        const isMulok = kode.startsWith('M-') || 
                        nama.includes('bahasa sunda') || 
                        nama.includes('bahasa jawa') || 
                        nama.includes('bahasa bali') || 
                        nama.includes('bahasa madura') || 
                        nama.includes('muatan lokal') || 
                        nama.includes('plh') || 
                        nama.includes('kesenian daerah') ||
                        nama.includes('kepariwisataan');
                        
        // 3. Pilihan
        const isPilihan = kode.includes('PILIHAN') || 
                          kode.includes('MAPEL-PILIHAN') || 
                          nama.includes('pilihan') ||
                          nama.includes('tingkat lanjut') ||
                          // mapel peminatan SMA
                          ['FIS', 'KIM', 'BIO', 'EKO', 'SOS', 'GEO', 'ANTRO', 'JPN', 'ZHO', 'DEU', 'FRA', 'KOR', 'KAI'].some(k => kode === k);

        if (isKejuruan) {
            detectedKelompok = 'MATA PELAJARAN KEJURUAN';
        } else if (isMulok) {
            detectedKelompok = 'MUATAN LOKAL';
        } else if (isPilihan) {
            detectedKelompok = 'MATA PELAJARAN PILIHAN';
        } else {
            detectedKelompok = 'MATA PELAJARAN UMUM';
        }
        
        // Pastikan detectedKelompok ada di kelompokOptions sebelum di-set
        const isValidOption = kelompokOptions.some(opt => opt.value === detectedKelompok);
        if (isValidOption) {
            setFormData(prev => ({ ...prev, kelompok: detectedKelompok }));
        }
    }, [formData.mapel_id, subjects?.data, kelompokOptions]);

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

    const detectKelompokForMapel = useCallback((kodeMapel: string, namaMapel: string): string => {
        const kode = (kodeMapel || '').toUpperCase();
        const nama = (namaMapel || '').toLowerCase();
        
        // 1. Kejuruan
        const kejuruanSuffixes = ['-RPL', '-TKJ', '-AKL', '-MPLB', '-DKV', '-TBSM', '-TKR', '-TP', '-PH', '-KL', '-TB', '-TAV', '-TOI'];
        const isDasar = kode.includes('DAS-') || nama.includes('dasar-dasar') || nama.includes('dasar dasar');
        const isPkl = kode.includes('PKL') || nama.includes('praktik kerja lapangan') || nama.includes('praktek kerja lapangan') || nama.includes('pkl');
        const isPkk = kode.includes('PKK') || nama.includes('projek kreatif') || nama.includes('project kreatif') || nama.includes('pkk');

        const isKejuruan = isPkl || 
                           isPkk || 
                           isDasar || 
                           kode.endsWith('-K') || 
                           kejuruanSuffixes.some(s => kode.includes(s));
                           
        // 2. Muatan Lokal
        const isMulok = kode.startsWith('M-') || 
                        nama.includes('bahasa sunda') || 
                        nama.includes('bahasa jawa') || 
                        nama.includes('bahasa bali') || 
                        nama.includes('bahasa madura') || 
                        nama.includes('muatan lokal') || 
                        nama.includes('plh') || 
                        nama.includes('kesenian daerah') ||
                        nama.includes('kepariwisataan');
                        
        // 3. Pilihan
        const isPilihan = kode.includes('PILIHAN') || 
                          kode.includes('MAPEL-PILIHAN') || 
                          nama.includes('pilihan') ||
                          nama.includes('tingkat lanjut') ||
                          ['FIS', 'KIM', 'BIO', 'EKO', 'SOS', 'GEO', 'ANTRO', 'JPN', 'ZHO', 'DEU', 'FRA', 'KOR', 'KAI'].some(k => kode === k);

        if (isKejuruan) return 'MATA PELAJARAN KEJURUAN';
        if (isMulok) return 'MUATAN LOKAL';
        if (isPilihan) return 'MATA PELAJARAN PILIHAN';
        return 'MATA PELAJARAN UMUM';
    }, []);

    const handleAddPreset = useCallback((type: 'UMUM' | 'KEJURUAN' | 'MULOK') => {
        if (!subjects?.data) return;
        
        setBulkSelections(prev => {
            const next = { ...prev };
            subjects.data.forEach((s: Mapel) => {
                // 1. Jangan masukkan mapel yang sudah dipetakan sebelumnya di tingkat kelas ini
                const alreadyMapped = mapping?.data?.some((m: StrukturKurikulum) => m.mapel_id === s.id);
                if (alreadyMapped) return;

                const kode = (s.kode_mapel || '').toUpperCase();
                const nama = (s.nama_mapel || '').toLowerCase();
                
                // 2. Terapkan Smart Filter Relevansi Tingkat yang sama persis
                const isDasar = kode.includes('DAS-') || nama.includes('dasar-dasar') || nama.includes('dasar dasar');
                const isPkl = kode.includes('PKL') || nama.includes('praktik kerja lapangan') || nama.includes('praktek kerja lapangan') || nama.includes('pkl');
                const isPkk = kode.includes('PKK') || nama.includes('projek kreatif') || nama.includes('project kreatif') || nama.includes('pkk');
                
                if (selectedTingkat === 10) {
                    // Kelas 10: Sembunyikan PKL, PKK, dan mapel produktif tingkat lanjut
                    if (isPkl || isPkk) return;
                    
                    const kejuruanSuffixes = ['-RPL', '-TKJ', '-AKL', '-MPLB', '-DKV', '-TBSM', '-TKR', '-TP', '-PH', '-KL', '-TB', '-TAV', '-TOI'];
                    const isProduktifLanjut = kejuruanSuffixes.some(suffix => kode.includes(suffix)) && !isDasar && !isPkl && !isPkk;
                    if (isProduktifLanjut) return;
                } else if (selectedTingkat === 11) {
                    // Kelas 11: Sembunyikan Dasar-dasar dan PKL
                    if (isDasar || isPkl) return;
                } else {
                    // Kelas 12 & 13: Sembunyikan Dasar-dasar
                    if (isDasar) return;
                }

                const group = detectKelompokForMapel(s.kode_mapel || '', s.nama_mapel);
                
                let match = false;
                if (type === 'UMUM' && group === 'MATA PELAJARAN UMUM') match = true;
                if (type === 'KEJURUAN' && group === 'MATA PELAJARAN KEJURUAN') match = true;
                if (type === 'MULOK' && group === 'MUATAN LOKAL') match = true;
                
                if (match) {
                    let defaultJp = 2;
                    const namaLower = s.nama_mapel.toLowerCase();
                    if (namaLower.includes('praktik kerja lapangan') || namaLower.includes('praktek kerja lapangan')) defaultJp = 4;
                    else if (namaLower.includes('matematika') || namaLower.includes('bahasa indonesia')) defaultJp = 4;
                    
                    next[s.id] = {
                        jp_per_minggu: defaultJp,
                        kelompok: group
                    };
                }
            });
            return next;
        });
    }, [subjects?.data, mapping?.data, selectedTingkat, detectKelompokForMapel]);

    const handleSave = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        
        if (editingItem) {
            const data: Partial<StrukturKurikulum> = {
                id: editingItem.id,
                mapel_id: formData.mapel_id,
                tahun_pelajaran_id: selectedTahunId,
                tingkat: selectedTingkat,
                jp_per_minggu: Number(formData.jp_per_minggu),
                kelompok: formData.kelompok
            };
            upsertMutation.mutate(data);
        } else {
            const items = Object.entries(bulkSelections).map(([mapel_id, config]) => ({
                mapel_id,
                tahun_pelajaran_id: selectedTahunId,
                tingkat: selectedTingkat,
                jp_per_minggu: Number(config.jp_per_minggu),
                kelompok: config.kelompok
            }));
            
            if (items.length === 0) {
                toast.error('Pilih minimal satu mata pelajaran');
                return;
            }
            
            try {
                await Promise.all(items.map(item => kurikulumApi.upsertStruktur(item)));
                queryClient.invalidateQueries({ queryKey: ['kurikulum-struktur'] });
                toast.success(`Berhasil memetakan ${items.length} mata pelajaran`);
                closeModal();
            } catch (err) {
                console.error(err);
                toast.error('Gagal menyimpan beberapa pemetaan');
            }
        }
    }, [editingItem, formData, selectedTahunId, selectedTingkat, bulkSelections, upsertMutation, queryClient, closeModal]);

    const handleToggleRowSelect = useCallback((id: string) => {
        setSelectedRowIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    }, []);

    const handleSelectAllRows = useCallback((checked: boolean) => {
        if (checked && mapping?.data) {
            setSelectedRowIds(new Set(mapping.data.map((item: StrukturKurikulum) => item.id)));
        } else {
            setSelectedRowIds(new Set());
        }
    }, [mapping?.data]);

    const handleBulkDelete = useCallback(async () => {
        if (selectedRowIds.size === 0) return;
        
        const count = selectedRowIds.size;
        const confirmDelete = await confirm({
            title: `Hapus ${count} Pemetaan?`,
            description: `Apakah Anda yakin ingin menghapus alokasi jam pelajaran untuk ${count} mata pelajaran terpilih sekaligus?`
        });
        
        if (confirmDelete) {
            try {
                await Promise.all(Array.from(selectedRowIds).map(id => kurikulumApi.deleteStruktur(id)));
                queryClient.invalidateQueries({ queryKey: ['kurikulum-struktur'] });
                setSelectedRowIds(new Set());
                toast.success(`Berhasil menghapus ${count} pemetaan`);
            } catch (err) {
                console.error(err);
                toast.error('Gagal menghapus beberapa pemetaan');
            }
        }
    }, [selectedRowIds, confirm, queryClient]);

    const handleDelete = useCallback(async (id: string) => {
        if (await confirm({ title: 'Hapus Pemetaan?', description: 'Langkah ini akan menghapus alokasi jam pelajaran untuk mata pelajaran ini.' })) {
            deleteMutation.mutate(id);
            setSelectedRowIds(prev => {
                const next = new Set(prev);
                next.delete(id);
                return next;
            });
        }
    }, [confirm, deleteMutation]);

    const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    }, []);

    const totalJp = useMemo(() => {
        return mapping?.data?.reduce((acc: number, curr: StrukturKurikulum) => acc + curr.jp_per_minggu, 0) || 0;
    }, [mapping?.data]);

    // Standar JP kementerian berdasarkan Permendikbudristek No. 12 Tahun 2024
    const STANDAR_JP_CONFIG = useMemo<Record<string, Record<number, number>>>(() => ({
        SD:  { 1: 30, 2: 32, 3: 38, 4: 38, 5: 38, 6: 36 },
        MI:  { 1: 30, 2: 32, 3: 38, 4: 38, 5: 38, 6: 36 },
        SMP: { 7: 41, 8: 41, 9: 38 },
        MTs: { 7: 41, 8: 41, 9: 38 },
        SMA: { 10: 44, 11: 46, 12: 46 },
        MA:  { 10: 44, 11: 46, 12: 46 },
        SMK: { 10: 46, 11: 48, 12: 44, 13: 44 },
        MAK: { 10: 46, 11: 48, 12: 44, 13: 44 }
    }), []);

    const targetJp = useMemo(() => {
        const j = (jenjang || '').toUpperCase();
        const config = STANDAR_JP_CONFIG[j];
        if (config && config[selectedTingkat]) {
            return config[selectedTingkat];
        }
        return 40; // Default fallback
    }, [jenjang, selectedTingkat, STANDAR_JP_CONFIG]);

    const gapJp = useMemo(() => {
        return targetJp - totalJp;
    }, [targetJp, totalJp]);

    const unmappedSubjects = useMemo(() => {
        if (!subjects?.data || !mapping?.data) return [];
        const mappedMapelIds = new Set(mapping.data.map((item: StrukturKurikulum) => item.mapel_id));
        
        return subjects.data.filter((s: Mapel) => {
            if (mappedMapelIds.has(s.id)) return false;
            
            const kode = (s.kode_mapel || '').toUpperCase();
            const nama = (s.nama_mapel || '').toLowerCase();
            
            const isDasar = kode.includes('DAS-') || nama.includes('dasar-dasar') || nama.includes('dasar dasar');
            const isPkl = kode.includes('PKL') || nama.includes('praktik kerja lapangan') || nama.includes('praktek kerja lapangan') || nama.includes('pkl');
            const isPkk = kode.includes('PKK') || nama.includes('projek kreatif') || nama.includes('project kreatif') || nama.includes('pkk');
            
            if (selectedTingkat === 10) {
                // Kelas 10: Sembunyikan PKL, PKK, dan mapel produktif tingkat lanjut
                if (isPkl || isPkk) return false;
                
                const kejuruanSuffixes = ['-RPL', '-TKJ', '-AKL', '-MPLB', '-DKV', '-TBSM', '-TKR', '-TP', '-PH', '-KL', '-TB', '-TAV', '-TOI'];
                const isProduktifLanjut = kejuruanSuffixes.some(suffix => kode.includes(suffix)) && !isDasar && !isPkl && !isPkk;
                if (isProduktifLanjut) return false;
            } else if (selectedTingkat === 11) {
                // Kelas 11: Sembunyikan Dasar-dasar dan PKL
                if (isDasar || isPkl) return false;
            } else {
                // Kelas 12 & 13: Sembunyikan Dasar-dasar
                if (isDasar) return false;
            }
            
            return true;
        });
    }, [subjects?.data, mapping?.data, selectedTingkat]);

    const presetSisaCount = useMemo(() => {
        if (!subjects?.data || !mapping?.data) return { UMUM: 0, KEJURUAN: 0, MULOK: 0 };
        
        const mappedMapelIds = new Set(mapping.data.map((item: StrukturKurikulum) => item.mapel_id));
        let umum = 0;
        let kejuruan = 0;
        let mulok = 0;
        
        subjects.data.forEach((s: Mapel) => {
            if (mappedMapelIds.has(s.id)) return;
            
            const kode = (s.kode_mapel || '').toUpperCase();
            const nama = (s.nama_mapel || '').toLowerCase();
            
            // Terapkan filter tingkat relevansi yang sama persis agar hitungan akurat
            const isDasar = kode.includes('DAS-') || nama.includes('dasar-dasar') || nama.includes('dasar dasar');
            const isPkl = kode.includes('PKL') || nama.includes('praktik kerja lapangan') || nama.includes('praktek kerja lapangan') || nama.includes('pkl');
            const isPkk = kode.includes('PKK') || nama.includes('projek kreatif') || nama.includes('project kreatif') || nama.includes('pkk');
            
            if (selectedTingkat === 10) {
                if (isPkl || isPkk) return;
                const kejuruanSuffixes = ['-RPL', '-TKJ', '-AKL', '-MPLB', '-DKV', '-TBSM', '-TKR', '-TP', '-PH', '-KL', '-TB', '-TAV', '-TOI'];
                const isProduktifLanjut = kejuruanSuffixes.some(suffix => kode.includes(suffix)) && !isDasar && !isPkl && !isPkk;
                if (isProduktifLanjut) return;
            } else if (selectedTingkat === 11) {
                if (isDasar || isPkl) return;
            } else {
                if (isDasar) return;
            }
            
            const group = detectKelompokForMapel(s.kode_mapel || '', s.nama_mapel);
            if (group === 'MATA PELAJARAN UMUM') umum++;
            else if (group === 'MATA PELAJARAN KEJURUAN') kejuruan++;
            else if (group === 'MUATAN LOKAL') mulok++;
        });
        
        return { UMUM: umum, KEJURUAN: kejuruan, MULOK: mulok };
    }, [subjects?.data, mapping?.data, selectedTingkat, detectKelompokForMapel]);

    const handleQuickPlotUnmapped = useCallback((specificSubjectId?: string) => {
        resetForm();
        
        const newSelections: Record<string, { jp_per_minggu: number; kelompok: string }> = {};
        
        if (specificSubjectId) {
            const s = subjects?.data?.find((subj: Mapel) => subj.id === specificSubjectId);
            if (s) {
                const group = detectKelompokForMapel(s.kode_mapel || '', s.nama_mapel);
                let defaultJp = 2;
                const namaLower = s.nama_mapel.toLowerCase();
                if (namaLower.includes('praktik kerja lapangan')) defaultJp = 4;
                else if (namaLower.includes('matematika') || namaLower.includes('bahasa indonesia')) defaultJp = 4;
                
                newSelections[s.id] = { jp_per_minggu: defaultJp, kelompok: group };
            }
        } else {
            unmappedSubjects.forEach((s: Mapel) => {
                const group = detectKelompokForMapel(s.kode_mapel || '', s.nama_mapel);
                let defaultJp = 2;
                const namaLower = s.nama_mapel.toLowerCase();
                if (namaLower.includes('praktik kerja lapangan')) defaultJp = 4;
                else if (namaLower.includes('matematika') || namaLower.includes('bahasa indonesia')) defaultJp = 4;
                
                newSelections[s.id] = { jp_per_minggu: defaultJp, kelompok: group };
            });
        }
        
        setBulkSelections(newSelections);
        setIsModalOpen(true);
    }, [subjects?.data, unmappedSubjects, resetForm, detectKelompokForMapel]);

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
                <div className="lg:col-span-3 space-y-6">
                    {/* JP Tracker & Gap Analysis Dashboard */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Progress JP Card */}
                        <Card className="border-none shadow-sm p-5 bg-gradient-to-br from-indigo-50/20 to-white dark:from-indigo-950/5 dark:to-slate-900 flex flex-col justify-between min-h-[130px]">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Target Kurikulum</span>
                                <Badge className="bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold border-none text-[10px]">
                                    Standar Baku
                                </Badge>
                            </div>
                            <div className="mt-2 flex items-baseline gap-1">
                                <span className="text-3xl font-black text-slate-800 dark:text-white">{totalJp}</span>
                                <span className="text-sm font-bold text-slate-400">/ {targetJp} JP</span>
                            </div>
                            {/* Progress bar */}
                            <div className="mt-3 w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                                <div 
                                    className="bg-indigo-600 h-full rounded-full transition-all duration-500" 
                                    style={{ width: `${Math.min(100, (totalJp / targetJp) * 100)}%` }}
                                ></div>
                            </div>
                            <p className="text-[10px] text-slate-400 mt-2">Beban belajar per minggu tingkat kelas {selectedTingkat}.</p>
                        </Card>

                        {/* Status Gap Card */}
                        <Card className="border-none shadow-sm p-5 bg-gradient-to-br from-slate-50/50 to-white dark:from-slate-950/5 dark:to-slate-900 flex flex-col justify-between min-h-[130px]">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Analisis Selisih</span>
                                {gapJp > 0 ? (
                                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span>
                                ) : gapJp === 0 ? (
                                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                                ) : (
                                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span>
                                )}
                            </div>
                            <div className="mt-2">
                                {gapJp > 0 ? (
                                    <div>
                                        <p className="text-xl font-black text-amber-600 dark:text-amber-400">Kurang {gapJp} JP</p>
                                        <p className="text-[10px] text-slate-400 mt-1">Struktur jam pelajaran masih berada di bawah alokasi standar nasional.</p>
                                    </div>
                                ) : gapJp === 0 ? (
                                    <div>
                                        <p className="text-xl font-black text-emerald-600 dark:text-emerald-450">Sesuai Regulasi</p>
                                        <p className="text-[10px] text-slate-400 mt-1">Alokasi beban belajar telah memenuhi regulasi kementerian.</p>
                                    </div>
                                ) : (
                                    <div>
                                        <p className="text-xl font-black text-indigo-650 dark:text-indigo-400">Otonomi (+{Math.abs(gapJp)} JP)</p>
                                        <p className="text-[10px] text-slate-400 mt-1">Sekolah melakukan penyesuaian mandiri dengan menambah jam belajar.</p>
                                    </div>
                                )}
                            </div>
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-2">
                                Status: {gapJp > 0 ? '⚠️ Kurang Pemetaan' : gapJp === 0 ? '✅ Stabil' : 'ℹ️ Jam Tambahan'}
                            </div>
                        </Card>

                        {/* Unmapped Mapels Card */}
                        <Card className="border-none shadow-sm p-5 bg-gradient-to-br from-slate-50/50 to-white dark:from-slate-950/5 dark:to-slate-900 flex flex-col justify-between min-h-[130px]">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Rekomendasi Mapel</span>
                                <Badge className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold border-none text-[10px]">
                                    {unmappedSubjects.length} Belum Diplot
                                </Badge>
                            </div>
                            <div className="mt-2 min-h-[44px]">
                                {unmappedSubjects.length === 0 ? (
                                    <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">Semua mata pelajaran sekolah telah dipetakan! 🎉</p>
                                ) : (
                                    <div className="flex flex-wrap gap-1.5 max-h-[50px] overflow-hidden">
                                        {unmappedSubjects.slice(0, 2).map((s: Mapel) => (
                                            <button
                                                key={s.id}
                                                onClick={() => handleQuickPlotUnmapped(s.id)}
                                                className="text-[9px] bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 text-slate-600 dark:text-slate-300 hover:text-indigo-650 px-2 py-1 rounded-lg font-bold transition-all truncate max-w-[120px]"
                                                title={`Klik untuk plot ${s.nama_mapel}`}
                                            >
                                                + {s.nama_mapel}
                                            </button>
                                        ))}
                                        {unmappedSubjects.length > 2 && (
                                            <span className="text-[9px] text-slate-400 font-bold self-center">
                                                +{unmappedSubjects.length - 2} lainnya
                                            </span>
                                        )}
                                    </div>
                                )}
                            </div>
                            {unmappedSubjects.length > 0 ? (
                                <button
                                    onClick={() => handleQuickPlotUnmapped()}
                                    className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 hover:text-indigo-705 text-left uppercase tracking-wider mt-3 flex items-center hover:underline"
                                >
                                    Plotting Massal Mapel Sisa &rarr;
                                </button>
                            ) : (
                                <div className="text-[10px] text-slate-400 mt-3 font-bold uppercase tracking-wider">Pemetaan Bersih</div>
                            )}
                        </Card>
                    </div>

                    <Card className="border-none shadow-sm overflow-hidden min-h-[500px]">
                        <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50 flex-wrap gap-2">
                            <div className="flex items-center gap-3">
                                <h3 className="font-black text-gray-900 dark:text-white uppercase tracking-tight flex items-center">
                                    <BookOpen size={18} className="mr-2 text-indigo-500" />
                                    Struktur Kurikulum - Tingkat {selectedTingkat}
                                </h3>
                                <Badge variant="secondary" className="font-bold">{mapping?.data?.length || 0} Mata Pelajaran</Badge>
                            </div>
                            {selectedRowIds.size > 0 && (
                                <button
                                    onClick={handleBulkDelete}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-950/20 dark:text-red-400 text-xs font-black rounded-lg transition-all border border-red-200 dark:border-red-900 shadow-sm"
                                >
                                    <Trash2 size={13} />
                                    HAPUS TERPILIH ({selectedRowIds.size})
                                </button>
                            )}
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50 dark:bg-slate-800/50 text-gray-400 text-[10px] font-black uppercase tracking-widest border-b border-gray-100 dark:border-gray-800">
                                    <tr>
                                        <th className="px-4 py-4 w-10 text-center">
                                            <input 
                                                type="checkbox"
                                                checked={mapping?.data && mapping.data.length > 0 && selectedRowIds.size === mapping.data.length}
                                                onChange={(e) => handleSelectAllRows(e.target.checked)}
                                                className="rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500"
                                            />
                                        </th>
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
                                                <td className="px-6 py-4" colSpan={5}><Skeleton className="h-10 w-full rounded-lg" /></td>
                                            </tr>
                                        ))
                                    ) : !mapping?.data || mapping.data.length === 0 ? (
                                        <tr>
                                            <td className="px-6 py-20 text-center" colSpan={5}>
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
                                        mapping.data.map((item: StrukturKurikulum) => {
                                            const isRowChecked = selectedRowIds.has(item.id);
                                            return (
                                                <tr key={item.id} className={`group transition-colors ${
                                                    isRowChecked 
                                                    ? 'bg-indigo-55/10 dark:bg-indigo-950/20' 
                                                    : 'hover:bg-indigo-50/30 dark:hover:bg-indigo-900/10'
                                                }`}>
                                                    <td className="px-4 py-4 text-center">
                                                        <input 
                                                            type="checkbox"
                                                            checked={isRowChecked}
                                                            onChange={() => handleToggleRowSelect(item.id)}
                                                            className="rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500"
                                                        />
                                                    </td>
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
                                            );
                                        })
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
                    title={editingItem ? 'Edit Alokasi JP' : 'Tambah Alokasi JP (Bulk Plotting)'}
                    size={editingItem ? '2xl' : '5xl'}
                    contentClassName="!overflow-visible"
                >
                    <form onSubmit={handleSave} className="space-y-4 pt-2">
                        {editingItem ? (
                            // SINGLE EDIT MODE (Seperti biasa)
                            <div className="space-y-4 p-1">
                                <div className="space-y-4">
                                    <div className="space-y-1.5">
                                        <label htmlFor="jp_per_minggu" className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Jam Pelajaran Per Minggu (JP)</label>
                                        <input 
                                            type="number" 
                                            id="jp_per_minggu"
                                            name="jp_per_minggu"
                                            value={formData.jp_per_minggu}
                                            onChange={handleInputChange}
                                            min={1}
                                            max={40}
                                            required
                                            className="w-full h-12 px-4 rounded-xl border border-gray-200 dark:border-gray-850 bg-gray-50 dark:bg-slate-900 font-black text-indigo-600 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label htmlFor="kelompok" className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Kelompok Mata Pelajaran</label>
                                        <select 
                                            id="kelompok"
                                            name="kelompok"
                                            value={formData.kelompok}
                                            onChange={handleInputChange}
                                            className="w-full h-12 px-4 rounded-xl border border-gray-200 dark:border-gray-850 bg-gray-50 dark:bg-slate-900 font-bold focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all cursor-pointer"
                                        >
                                            {kelompokOptions?.map(opt => (
                                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            // BULK ADD MODE (Dashboard Dual-Panel Grid)
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[480px]">
                                {/* Panel Kiri: Pemilihan Mapel (Col 5) */}
                                <div className="lg:col-span-5 border-r border-slate-100 dark:border-slate-800 pr-6 flex flex-col space-y-4">
                                    <div className="space-y-1.5">
                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Pencarian Mapel</span>
                                        <div className="relative">
                                            <input
                                                type="text"
                                                value={bulkSearchQuery}
                                                onChange={(e) => setBulkSearchQuery(e.target.value)}
                                                placeholder="Cari mata pelajaran..."
                                                className="w-full h-10 pl-9 pr-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-slate-900 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                                            />
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                                                <Search size={16} />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Presets Button Shortcuts */}
                                    <div className="space-y-1.5">
                                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest pl-1">Paket Cepat (Presets)</span>
                                        <div className="flex flex-wrap gap-2 items-center">
                                            {presetSisaCount.UMUM === 0 ? (
                                                <span className="text-[9px] bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-450 px-2.5 py-1.5 rounded-lg font-black border border-emerald-200 dark:border-emerald-900 shadow-sm cursor-default select-none">
                                                    ✓ Paket Umum Selesai
                                                </span>
                                            ) : (
                                                <button
                                                    type="button"
                                                    onClick={() => handleAddPreset('UMUM')}
                                                    className="text-[10px] bg-slate-150 dark:bg-slate-800 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-950/20 text-slate-700 dark:text-slate-300 px-3 py-1.5 rounded-lg font-bold transition-all"
                                                >
                                                    + Paket Umum ({presetSisaCount.UMUM})
                                                </button>
                                            )}

                                            {presetSisaCount.KEJURUAN === 0 ? (
                                                <span className="text-[9px] bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-450 px-2.5 py-1.5 rounded-lg font-black border border-emerald-200 dark:border-emerald-900 shadow-sm cursor-default select-none">
                                                    ✓ Paket Kejuruan Selesai
                                                </span>
                                            ) : (
                                                <button
                                                    type="button"
                                                    onClick={() => handleAddPreset('KEJURUAN')}
                                                    className="text-[10px] bg-slate-150 dark:bg-slate-800 hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-950/20 text-slate-700 dark:text-slate-300 px-3 py-1.5 rounded-lg font-bold transition-all"
                                                >
                                                    + Paket Kejuruan ({presetSisaCount.KEJURUAN})
                                                </button>
                                            )}

                                            {presetSisaCount.MULOK === 0 ? (
                                                <span className="text-[9px] bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-450 px-2.5 py-1.5 rounded-lg font-black border border-emerald-200 dark:border-emerald-900 shadow-sm cursor-default select-none">
                                                    ✓ Paket Mulok Selesai
                                                </span>
                                            ) : (
                                                <button
                                                    type="button"
                                                    onClick={() => handleAddPreset('MULOK')}
                                                    className="text-[10px] bg-slate-150 dark:bg-slate-800 hover:bg-amber-50 hover:text-amber-600 dark:hover:bg-amber-950/20 text-slate-700 dark:text-slate-300 px-3 py-1.5 rounded-lg font-bold transition-all"
                                                >
                                                    + Paket Mulok ({presetSisaCount.MULOK})
                                                </button>
                                            )}

                                            <button
                                                type="button"
                                                onClick={() => setBulkSelections({})}
                                                className="text-[10px] text-red-500 hover:underline px-2 py-1.5 font-bold ml-auto"
                                            >
                                                Kosongkan
                                            </button>
                                        </div>
                                    </div>

                                    {/* Mapel List Checkboxes */}
                                    <div className="flex-1 overflow-y-auto max-h-[300px] pr-1 space-y-2 border border-slate-100 dark:border-slate-800 rounded-xl p-3 bg-slate-50/50 dark:bg-slate-900/50">
                                        {subjects?.data?.filter((s: Mapel) => {
                                            const kode = (s.kode_mapel || '').toUpperCase();
                                            const nama = (s.nama_mapel || '').toLowerCase();
                                            
                                            // 1. Text Search Filter
                                            const matchesSearch = nama.includes(bulkSearchQuery.toLowerCase()) || 
                                                                  kode.toLowerCase().includes(bulkSearchQuery.toLowerCase());
                                            if (!matchesSearch) return false;
                                            
                                            // 3. Sembunyikan mapel yang sudah di-ploting sebelumnya di tingkat kelas ini
                                            const alreadyMapped = mapping?.data?.some((m: StrukturKurikulum) => m.mapel_id === s.id);
                                            if (alreadyMapped) return false;
                                            
                                            const isDasar = kode.includes('DAS-') || nama.includes('dasar-dasar') || nama.includes('dasar dasar');
                                            const isPkl = kode.includes('PKL') || nama.includes('praktik kerja lapangan') || nama.includes('praktek kerja lapangan') || nama.includes('pkl');
                                            const isPkk = kode.includes('PKK') || nama.includes('projek kreatif') || nama.includes('project kreatif') || nama.includes('pkk');
                                            
                                            // 2. Smart Filter Relevansi Tingkat
                                            if (selectedTingkat === 10) {
                                                // Kelas 10: Sembunyikan PKL, PKK, dan mapel produktif tingkat lanjut
                                                if (isPkl || isPkk) return false;
                                                
                                                const kejuruanSuffixes = ['-RPL', '-TKJ', '-AKL', '-MPLB', '-DKV', '-TBSM', '-TKR', '-TP', '-PH', '-KL', '-TB', '-TAV', '-TOI'];
                                                const isProduktifLanjut = kejuruanSuffixes.some(suffix => kode.includes(suffix)) && !isDasar && !isPkl && !isPkk;
                                                if (isProduktifLanjut) return false;
                                            } else if (selectedTingkat === 11) {
                                                // Kelas 11: Sembunyikan Dasar-dasar dan PKL
                                                if (isDasar || isPkl) return false;
                                            } else {
                                                // Kelas 12 & 13: Sembunyikan Dasar-dasar (PKL dan PKK boleh muncul)
                                                if (isDasar) return false;
                                            }
                                            
                                            return true;
                                        }).map((s: Mapel) => {
                                            const isChecked = !!bulkSelections[s.id];
                                            return (
                                                <div 
                                                    key={s.id}
                                                    onClick={() => {
                                                        const copy = { ...bulkSelections };
                                                        if (isChecked) {
                                                            delete copy[s.id];
                                                        } else {
                                                            copy[s.id] = {
                                                                jp_per_minggu: 2,
                                                                kelompok: detectKelompokForMapel(s.kode_mapel || '', s.nama_mapel)
                                                            };
                                                        }
                                                        setBulkSelections(copy);
                                                    }}
                                                    className={`flex items-center gap-3 p-2.5 rounded-xl border cursor-pointer transition-all ${
                                                        isChecked 
                                                        ? 'bg-indigo-50/20 border-indigo-500 dark:bg-indigo-950/10' 
                                                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-indigo-300'
                                                    }`}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={isChecked}
                                                        onChange={() => {}} // handled by click
                                                        className="rounded text-indigo-600 focus:ring-indigo-500"
                                                    />
                                                    <div className="min-w-0">
                                                        <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">{s.nama_mapel}</p>
                                                        <span className="text-[9px] text-slate-400 font-mono font-bold">{s.kode_mapel}</span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Panel Kanan: Setting JP & Kelompok Massal (Col 7) */}
                                <div className="lg:col-span-7 flex flex-col space-y-4">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Mapel Terpilih ({Object.keys(bulkSelections).length})</span>
                                        {Object.keys(bulkSelections).length > 0 && (
                                            <span className="text-xs bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-black px-2.5 py-1 rounded-lg">
                                                Total JP: {Object.values(bulkSelections).reduce((sum, item) => sum + Number(item.jp_per_minggu), 0)} JP
                                            </span>
                                        )}
                                    </div>

                                    {/* Selected Mapels Table List */}
                                    <div className="flex-1 overflow-y-auto max-h-[350px] border border-slate-100 dark:border-slate-800 rounded-xl p-3 bg-white dark:bg-slate-900 space-y-3">
                                        {Object.keys(bulkSelections).length === 0 ? (
                                            <div className="flex flex-col items-center justify-center py-20 opacity-30 space-y-2">
                                                <BookOpen size={36} />
                                                <p className="text-xs font-bold">Pilih mata pelajaran di panel kiri untuk mulai plotting</p>
                                            </div>
                                        ) : (
                                            Object.entries(bulkSelections).map(([id, config]) => {
                                                const mapelObj = subjects?.data?.find((s: Mapel) => s.id === id);
                                                if (!mapelObj) return null;
                                                
                                                return (
                                                    <div key={id} className="flex flex-col sm:flex-row sm:items-center gap-3 p-3.5 bg-slate-50/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl">
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-xs font-bold text-slate-850 dark:text-slate-200 truncate">{mapelObj.nama_mapel}</p>
                                                            <span className="text-[9px] bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-1.5 py-0.5 rounded font-mono font-bold">{mapelObj.kode_mapel}</span>
                                                        </div>
                                                        <div className="flex items-center gap-3">
                                                            {/* JP Input */}
                                                            <div className="w-20">
                                                                <input
                                                                    type="number"
                                                                    min={1}
                                                                    max={40}
                                                                    value={config.jp_per_minggu}
                                                                    onChange={(e) => {
                                                                        const copy = { ...bulkSelections };
                                                                        copy[id] = { ...copy[id], jp_per_minggu: Number(e.target.value) };
                                                                        setBulkSelections(copy);
                                                                    }}
                                                                    className="w-full h-9 px-2 rounded-lg border border-slate-200 dark:border-slate-850 bg-white dark:bg-slate-950 text-center text-xs font-black text-indigo-600 focus:ring-1 focus:ring-indigo-500"
                                                                    placeholder="JP"
                                                                />
                                                            </div>
                                                            {/* Kelompok Dropdown */}
                                                            <div className="w-40">
                                                                <select
                                                                    value={config.kelompok}
                                                                    onChange={(e) => {
                                                                        const copy = { ...bulkSelections };
                                                                        copy[id] = { ...copy[id], kelompok: e.target.value };
                                                                        setBulkSelections(copy);
                                                                    }}
                                                                    className="w-full h-9 px-2 rounded-lg border border-slate-200 dark:border-slate-850 bg-white dark:bg-slate-950 text-xs font-bold focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                                                                >
                                                                    {kelompokOptions?.map(opt => (
                                                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                                    ))}
                                                                </select>
                                                            </div>
                                                            {/* Delete Button */}
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    const copy = { ...bulkSelections };
                                                                    delete copy[id];
                                                                    setBulkSelections(copy);
                                                                }}
                                                                className="p-1.5 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-lg transition-colors"
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        <ModalFooter className="px-0 pt-4 mt-6">
                            <Button variant="ghost" type="button" onClick={closeModal} className="rounded-xl font-bold">BATAL</Button>
                            <Button 
                                type="submit" 
                                isLoading={upsertMutation.isPending} 
                                className="bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl shadow-lg shadow-indigo-200 dark:shadow-none"
                            >
                                <Save size={18} className="mr-2" />
                                {editingItem ? 'SIMPAN PEMETAAN' : `SIMPAN ${Object.keys(bulkSelections).length} PEMETAAN`}
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
