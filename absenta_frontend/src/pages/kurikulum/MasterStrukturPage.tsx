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
  Search,
  Printer,
  Loader2
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
import { mapelApi, tahunPelajaranApi, jurusanApi } from '../../api/academic.api';
import { useConfirm } from '../../providers/ConfirmProvider';
import { toast } from 'react-hot-toast';
import { useJenjang } from '../../hooks/useJenjang';
import type { Mapel } from '../../types/academic';
import { useAuth } from '../../hooks/useAuth';
import { getTenantById } from '../../api/tenants.api';
import { sekolahApi } from '../../api/academic/sekolah.api';
import { getBase64ImageFromUrl } from '../../utils/cooperative/coopDocUtils';
import { getStrukturList } from '../../api/academic/strukturOrganisasi.api';
import { renderStrukturKurikulumPdf } from '../../utils/print/modules/pdfKurikulum';

const Modal = lazy(() => import('../../components/ui/Modal').then(module => ({ default: module.Modal })));

type StrukturKurikulum = {
  id: string;
  mapel_id: string;
  tahun_pelajaran_id: string;
  tingkat: number;
  jurusan_id?: string;
  jp_per_minggu: number;
  kelompok: string;
  Mapel?: Mapel;
  Jurusan?: {
    nama: string;
  };
};

const MasterStrukturPage: React.FC = () => {
    const queryClient = useQueryClient();
    const { confirm } = useConfirm();
    const { user } = useAuth();
    const { data: tenantRes } = useQuery({
        queryKey: ['tenant-profile', user?.tenant_id],
        queryFn: () => getTenantById(user?.tenant_id || ''),
        enabled: !!user?.tenant_id
    });
    const tenantInfo = tenantRes?.data;
    
    const { jenjang, tingkatList, kelompokOptions, isLoading: isLoadingJenjang } = useJenjang();

    // Filters
    const [selectedTahunId, setSelectedTahunId] = useState<string>('');
    const [selectedTingkat, setSelectedTingkat] = useState<number>(10);
    const [selectedJurusanId, setSelectedJurusanId] = useState<string>('');
    
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

    const { data: jurusans } = useQuery({
        queryKey: ['academic-jurusans'],
        queryFn: () => jurusanApi.getAll()
    });

    const isSmkOrMak = useMemo(() => {
        const j = (jenjang || '').toUpperCase();
        return j === 'SMK' || j === 'MAK';
    }, [jenjang]);

    const selectedJurusanNama = useMemo(() => {
        const j = jurusans?.data?.find(item => item.id === selectedJurusanId);
        return j ? j.nama : '';
    }, [jurusans, selectedJurusanId]);

    const selectedTahunNama = useMemo(() => {
        const t = years?.data?.find(item => item.id === selectedTahunId);
        return t ? t.tahun : '';
    }, [years, selectedTahunId]);

    // Set default jurusan
    React.useEffect(() => {
        if (isSmkOrMak && jurusans?.data && jurusans.data.length > 0 && !selectedJurusanId) {
            setSelectedJurusanId(jurusans.data[0].id);
        }
    }, [isSmkOrMak, jurusans, selectedJurusanId]);

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

    // Reset table row selections when filters change
    React.useEffect(() => {
        setSelectedRowIds(new Set());
    }, [selectedTahunId, selectedTingkat, selectedJurusanId]);

    const { data: mapping, isLoading: isLoadingMapping } = useQuery({
        queryKey: ['kurikulum-struktur', selectedTahunId, selectedJurusanId],
        queryFn: () => kurikulumApi.getStruktur({ 
            tahun_pelajaran_id: selectedTahunId, 
            jurusan_id: isSmkOrMak ? (selectedJurusanId || undefined) : undefined
        }),
        enabled: !!selectedTahunId
    });

    const { data: standardReferences } = useQuery({
        queryKey: ['kurikulum-standard-references', jenjang],
        queryFn: () => kurikulumApi.getStandardReferences(jenjang || 'SMK'),
        enabled: !!jenjang
    });

    const getSubjectSortRank = useCallback((item: any) => {
        const code = (item.Mapel?.kode_mapel || '').toUpperCase();
        const cleanCode = code.split('-')[0];
        const name = (item.Mapel?.nama_mapel || '').toLowerCase();
        const kelompok = (item.kelompok || '').toUpperCase();
        
        if (['PAI', 'PAKB', 'PAKatB', 'PAHB', 'PABB', 'PAKhB', 'PAIBP'].includes(cleanCode) || name.includes('agama')) return 1;
        if (cleanCode === 'PP' || name.includes('pancasila')) return 2;
        if (cleanCode === 'IND' || name.includes('bahasa indonesia')) return 3;
        if (cleanCode === 'PJOK' || name.includes('jasmani') || name.includes('pjok')) return 4;
        if (cleanCode === 'SEJ' || name.includes('sejarah')) return 5;
        if (cleanCode === 'SENI' || name.includes('seni') || name.includes('prakarya')) return 6;
        if (cleanCode === 'MTK' || name.includes('matematika')) return 7;
        if (['IPA', 'IPAS', 'FIS', 'KIM', 'BIO'].includes(cleanCode) || name.includes('projek ipas') || name.includes('ilmu pengetahuan alam')) return 8;
        if (['IPS', 'GEO', 'SOS', 'EKO', 'ANTRO'].includes(cleanCode) || name.includes('ilmu pengetahuan sosial')) return 9;
        if (cleanCode === 'ING' || name.includes('bahasa inggris')) return 10;
        if (cleanCode === 'INF' || name.includes('informatika')) return 11;
        
        if (kelompok === 'MATA PELAJARAN KEJURUAN' || ['DASAR-KEJURUAN', 'KK', 'PKK', 'PKL'].includes(cleanCode) || name.includes('konsentrasi') || name.includes('praktik kerja') || name.includes('dasar-dasar')) return 12;
        if (kelompok === 'MATA PELAJARAN PILIHAN' || cleanCode === 'KODING-AI' || cleanCode === 'PILIHAN' || name.includes('pilihan')) return 13;
        if (kelompok === 'MUATAN LOKAL' || cleanCode === 'MULOK' || name.includes('muatan lokal')) return 14;
        
        return 15;
    }, []);

    const mappingFiltered = useMemo(() => {
        if (!mapping?.data) return [];
        const filtered = mapping.data.filter((item: any) => item.tingkat === selectedTingkat);
        
        return [...filtered].sort((a, b) => {
            const rankA = getSubjectSortRank(a);
            const rankB = getSubjectSortRank(b);
            if (rankA !== rankB) return rankA - rankB;
            return (a.Mapel?.nama_mapel || '').localeCompare(b.Mapel?.nama_mapel || '');
        });
    }, [mapping?.data, selectedTingkat, getSubjectSortRank]);

    const getJpValueForSemester = useCallback((mapelName: string, mapelKode: string, tingkat: number, semesterNum: 1 | 2, baseJp: number): string => {
        const nama = mapelName.toLowerCase();
        const kode = (mapelKode || '').toUpperCase();
        
        // 1. Praktik Kerja Lapangan (PKL) - Hanya di Kelas XII, Semester 1 (Sem 1 = baseJp, Sem 2 = -)
        if (tingkat === 12 && (nama.includes('praktik kerja lapangan') || nama.includes('praktek kerja lapangan') || kode.includes('PKL'))) {
            return semesterNum === 1 ? `${baseJp}` : '-';
        }
        
        // 2. Konsentrasi Keahlian (KK) - Hanya di Kelas XII, Semester 2 (Sem 1 = -, Sem 2 = baseJp)
        if (tingkat === 12 && (nama.includes('konsentrasi keahlian') || kode === 'KK' || kode.startsWith('KK-'))) {
            return semesterNum === 2 ? `${baseJp}` : '-';
        }
        
        // 3. Projek Kreatif dan Kewirausahaan (PKK) - Di Kelas XII, hanya diajarkan di Semester 2 (Sem 1 = -, Sem 2 = baseJp)
        if (tingkat === 12 && (nama.includes('projek kreatif') || nama.includes('project kreatif') || kode.includes('PKK'))) {
            return semesterNum === 2 ? `${baseJp}` : '-';
        }
        
        // 4. Mapel Pilihan - Di Kelas XII, hanya diajarkan di Semester 2 (Sem 1 = -, Sem 2 = baseJp)
        if (tingkat === 12 && (nama.includes('pilihan') || kode.includes('PILIHAN') || kode.includes('MAPEL-PILIHAN'))) {
            return semesterNum === 2 ? `${baseJp}` : '-';
        }
        
        // Default: Tampilkan JP yang sama untuk kedua semester di tingkat tersebut
        return baseJp > 0 ? `${baseJp}` : '-';
    }, []);

    const getSubRowsForMapel = useCallback((namaMapel: string, kodeMapel: string) => {
        const nama = namaMapel.toLowerCase();
        const kode = (kodeMapel || '').toUpperCase();
        
        if (nama.includes('dasar-dasar teknik jaringan') || nama.includes('dasar dasar teknik jaringan') || kode.includes('DAS-TKJ')) {
            return [
                { nama: 'Dasar Program Keahlian 1', jp: { 10: 4, 11: 0, 12: 0 } },
                { nama: 'Dasar Program Keahlian 2', jp: { 10: 4, 11: 0, 12: 0 } },
                { nama: 'Dasar Program Keahlian 3', jp: { 10: 4, 11: 0, 12: 0 } }
            ];
        }
        
        if (nama.includes('konsentrasi keahlian') || kode === 'KK' || kode.startsWith('KK-')) {
            return [
                { nama: 'Perencanaan dan pengalamatan jaringan', jp: { 10: 0, 11: 3, 12: 4 } },
                { nama: 'Teknologi jaringan kabel dan nirkabel', jp: { 10: 0, 11: 3, 12: 4 } },
                { nama: 'Keamanan Jaringan', jp: { 10: 0, 11: 4, 12: 4 } },
                { nama: 'Pemasangan dan Konfigurasi perangkat jaringan', jp: { 10: 0, 11: 4, 12: 6 } },
                { nama: 'Administrasi sistem jaringan', jp: { 10: 0, 11: 4, 12: 4 } }
            ];
        }
        
        return null;
    }, []);

    const printRows = useMemo(() => {
        if (!mapping?.data) return { umum: [], kejuruan: [], mulok: [], pilihan: [] };
        
        const groups = {
            umum: [] as any[],
            kejuruan: [] as any[],
            mulok: [] as any[],
            pilihan: [] as any[]
        };
        
        const mapelMap = new Map<string, {
            id: string;
            nama: string;
            kode: string;
            jp: Record<number, number>;
        }>();
        
        mapping.data.forEach((item: any) => {
            const mapelId = item.mapel_id;
            const tingkat = item.tingkat;
            const jp = item.jp_per_minggu;
            
            if (!mapelMap.has(mapelId)) {
                mapelMap.set(mapelId, {
                    id: mapelId,
                    nama: item.Mapel?.nama_mapel || '',
                    kode: item.Mapel?.kode_mapel || '',
                    jp: { 10: 0, 11: 0, 12: 0 }
                });
            }
            
            const m = mapelMap.get(mapelId)!;
            m.jp[tingkat] = jp;
        });
        
        mapelMap.forEach((m) => {
            const originalItem = mapping.data.find((item: any) => item.mapel_id === m.id);
            const kelompokStr = (originalItem?.kelompok || 'MATA PELAJARAN UMUM').toUpperCase();
            
            if (kelompokStr === 'MATA PELAJARAN UMUM') {
                groups.umum.push(m);
            } else if (kelompokStr === 'MATA PELAJARAN KEJURUAN') {
                groups.kejuruan.push(m);
            } else if (kelompokStr === 'MUATAN LOKAL') {
                groups.mulok.push(m);
            } else if (kelompokStr === 'MATA PELAJARAN PILIHAN') {
                groups.pilihan.push(m);
            } else {
                groups.umum.push(m);
            }
        });
        
        return groups;
    }, [mapping?.data]);

    const getKelompokTotal = useCallback((kelompokList: any[], tingkat: number, semesterNum: 1 | 2) => {
        let sum = 0;
        kelompokList.forEach(m => {
            const baseJp = m.jp[tingkat] || 0;
            if (baseJp === 0) return;
            const jpVal = getJpValueForSemester(m.nama, m.kode, tingkat, semesterNum, baseJp);
            if (jpVal !== '-') {
                sum += Number(jpVal);
            }
        });
        return sum > 0 ? sum : 0;
    }, [getJpValueForSemester]);

    const city = useMemo(() => {
        if (!tenantInfo?.address) return 'Jakarta';
        const addr = tenantInfo.address.toLowerCase();
        if (addr.includes('kediri')) return 'Kediri';
        if (addr.includes('cimahi')) return 'Cimahi';
        if (addr.includes('plered')) return 'Plered';
        if (addr.includes('jakarta')) return 'Jakarta';
        
        const parts = tenantInfo.address.split(',');
        if (parts.length > 1) {
            return parts[parts.length - 2].trim();
        }
        return 'Jakarta';
    }, [tenantInfo?.address]);

    const selectedJurusan = useMemo(() => {
        return jurusans?.data?.find(item => item.id === selectedJurusanId);
    }, [jurusans, selectedJurusanId]);


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

    const isMapelBelongsToOtherJurusan = useCallback((s: Mapel): boolean => {
        if (!isSmkOrMak) return false;
        
        const kode = (s.kode_mapel || '').toUpperCase();
        const nama = (s.nama_mapel || '').toLowerCase();
        
        const otherJurusans = jurusans?.data?.filter(j => j.id !== selectedJurusanId) || [];
        
        return otherJurusans.some(j => {
            const jKode = (j.kode || '').toUpperCase();
            const jSingkatan = (j.singkatan || '').toUpperCase();
            const jNama = (j.nama || '').toLowerCase();
            
            const hasOtherKode = jKode && (kode === jKode || kode.includes(`-${jKode}`) || kode.includes(`KK-${jKode}`));
            const hasOtherSingkatan = jSingkatan && (kode === jSingkatan || kode.includes(`-${jSingkatan}`) || kode.includes(`KK-${jSingkatan}`));
            const hasOtherNama = jNama && nama.includes(jNama);
            
            return hasOtherKode || hasOtherSingkatan || hasOtherNama;
        });
    }, [isSmkOrMak, jurusans?.data, selectedJurusanId]);

    const detectKelompokForMapel = useCallback((kodeMapel: string, namaMapel: string): string => {
        const kode = (kodeMapel || '').toUpperCase();
        const nama = (namaMapel || '').toLowerCase();
        
        // 1. Kejuruan
        const kejuruanSuffixes = ['-RPL', '-TKJ', '-AKL', '-MPLB', '-DKV', '-TBSM', '-TKR', '-TP', '-PH', '-KL', '-TB', '-TAV', '-TOI'];
        const isDasar = kode.includes('DAS-') || nama.includes('dasar-dasar') || nama.includes('dasar dasar');
        const isPkl = kode.includes('PKL') || nama.includes('praktik kerja lapangan') || nama.includes('praktek kerja lapangan') || nama.includes('pkl');
        const isPkk = kode.includes('PKK') || nama.includes('projek kreatif') || nama.includes('project kreatif') || nama.includes('pkk');
        const isKk = kode === 'KK' || kode.startsWith('KK-') || nama.includes('konsentrasi keahlian');

        const isKejuruan = isPkl || 
                           isPkk || 
                           isDasar || 
                           isKk || 
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
                          kode.includes('KAI') ||
                          nama.includes('pilihan') ||
                          nama.includes('tingkat lanjut') ||
                          nama.includes('koding') ||
                          nama.includes('coding') ||
                          ['FIS', 'KIM', 'BIO', 'EKO', 'SOS', 'GEO', 'ANTRO', 'JPN', 'ZHO', 'DEU', 'FRA', 'KOR', 'KAI'].some(k => kode === k);

        if (isKejuruan) return 'MATA PELAJARAN KEJURUAN';
        if (isMulok) return 'MUATAN LOKAL';
        if (isPilihan) return 'MATA PELAJARAN PILIHAN';
        return 'MATA PELAJARAN UMUM';
    }, []);

    const detectDefaultJpForMapel = useCallback((kodeMapel: string, namaMapel: string, tingkat: number): number => {
        const kode = (kodeMapel || '').toUpperCase();
        const nama = (namaMapel || '').toLowerCase();
        
        if (standardReferences?.data && Array.isArray(standardReferences.data)) {
            // 1. Cari berdasarkan kecocokan kode mapel secara eksak terlebih dahulu
            let match = standardReferences.data.find(ref => 
                ref.tingkat === tingkat && 
                (ref.kode_mapel || '').toUpperCase() === kode
            );
            
            // 2. Jika tidak cocok eksak, cari berdasarkan nama mata pelajaran yang mengandung teks acuan
            if (!match) {
                match = standardReferences.data.find(ref => 
                    ref.tingkat === tingkat && 
                    (
                        nama.includes((ref.nama_mapel || '').toLowerCase()) || 
                        (ref.nama_mapel || '').toLowerCase().includes(nama)
                    )
                );
            }
            
            // 3. Aturan khusus untuk mapel SMK yang kodenya dinamis (KK / Dasar-dasar Program Keahlian)
            if (!match && isSmkOrMak) {
                if (kode === 'KK' || kode.startsWith('KK-') || nama.includes('konsentrasi keahlian') || nama.includes('kompetensi keahlian')) {
                    const kkRef = standardReferences.data.find(ref => ref.tingkat === tingkat && ref.kode_mapel === 'KK');
                    if (kkRef) return kkRef.jp_per_minggu;
                }
                if (nama.includes('dasar-dasar') || nama.includes('dasar dasar') || kode.includes('DAS-') || kode.includes('DK-')) {
                    const dkRef = standardReferences.data.find(ref => ref.tingkat === tingkat && ref.kode_mapel === 'DASAR-KEJURUAN');
                    if (dkRef) return dkRef.jp_per_minggu;
                }
            }
            
            if (match) {
                return match.jp_per_minggu;
            }
        }
        
        // Fallback default jika data preset belum ter-seed atau tidak ditemukan di DB
        if (nama.includes('agama') || kode.includes('PAI') || kode.includes('AGAMA')) {
            if (tingkat === 10 || tingkat === 11) return 3;
            if (tingkat === 12) return 2;
        }
        if (nama.includes('bahasa indonesia') || kode.includes('IND')) {
            if (tingkat === 10) return 4;
            if (tingkat === 11) return 3;
            if (tingkat === 12) return 2;
        }
        if (nama.includes('matematika') || kode.includes('MAT') || kode.includes('MTK')) {
            if (tingkat === 10) return 4;
            if (tingkat === 11) return 3;
            if (tingkat === 12) return 2;
        }
        
        return 2;
    }, [standardReferences?.data, isSmkOrMak]);

    const renderJpCalculator = useCallback((jp: number, mapelName: string, mapelKode: string) => {
        const weeks = selectedTingkat === 12 ? 32 : 36;
        const annualIntra = jp * weeks;
        const recommendedJp = detectDefaultJpForMapel(mapelKode, mapelName, selectedTingkat);
        const recommendedAnnual = recommendedJp * weeks;
        
        let statusColor = "text-emerald-650 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/40";
        let statusText = "Sesuai Standar Permendikbud 12/2024";
        
        if (jp > recommendedJp) {
            statusColor = "text-violet-650 dark:text-violet-450 bg-violet-50 dark:bg-violet-950/20 border-violet-100 dark:border-violet-900/40";
            statusText = `Otonomi Sekolah (+${jp - recommendedJp} JP/Minggu)`;
        } else if (jp < recommendedJp) {
            statusColor = "text-amber-650 dark:text-amber-450 bg-amber-50 dark:bg-amber-950/20 border-amber-100 dark:border-amber-900/40";
            statusText = `Di bawah Standar Permendikbud (-${recommendedJp - jp} JP/Minggu)`;
        }
        
        return (
            <div className="mt-2.5 p-3.5 rounded-xl border border-slate-200/60 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-1.5 text-left">
                <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">Kalkulator Konversi JP</span>
                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-lg border ${statusColor}`}>
                        {statusText}
                    </span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs pt-1">
                    <div>
                        <p className="text-gray-400 dark:text-gray-500 font-bold uppercase text-[9px] tracking-wide">Beban Setahun</p>
                        <p className="font-extrabold text-slate-800 dark:text-slate-200 mt-0.5">
                            {annualIntra} JP <span className="text-[10px] font-normal text-gray-400">/ Tahun ({weeks} mg)</span>
                        </p>
                    </div>
                    <div>
                        <p className="text-gray-400 dark:text-gray-500 font-bold uppercase text-[9px] tracking-wide">Acuan Permendikbud</p>
                        <p className="font-bold text-slate-500 dark:text-slate-400 mt-0.5">
                            {recommendedJp} JP/mg <span className="text-[10px] font-normal text-gray-400">({recommendedAnnual} JP/Thn)</span>
                        </p>
                    </div>
                </div>
            </div>
        );
    }, [selectedTingkat, detectDefaultJpForMapel]);

    const handleAddPreset = useCallback((type: 'UMUM' | 'KEJURUAN' | 'MULOK' | 'PILIHAN') => {
        if (!subjects?.data) return;
        
        setBulkSelections(prev => {
            const next = { ...prev };
            subjects.data.forEach((s: Mapel) => {
                // 1. Jangan masukkan mapel yang sudah dipetakan sebelumnya di tingkat kelas ini
                const alreadyMapped = mappingFiltered?.some((m: StrukturKurikulum) => m.mapel_id === s.id);
                if (alreadyMapped) return;

                if (isMapelBelongsToOtherJurusan(s)) return;

                const kode = (s.kode_mapel || '').toUpperCase();
                const nama = (s.nama_mapel || '').toLowerCase();
                
                // 2. Terapkan Smart Filter Relevansi Tingkat yang sama persis
                const isDasar = kode.includes('DAS-') || nama.includes('dasar-dasar') || nama.includes('dasar dasar');
                const isPkl = kode.includes('PKL') || nama.includes('praktik kerja lapangan') || nama.includes('praktek kerja lapangan') || nama.includes('pkl');
                const isPkk = kode.includes('PKK') || nama.includes('projek kreatif') || nama.includes('project kreatif') || nama.includes('pkk');
                const isKoding = nama.includes('koding') || nama.includes('coding') || nama.includes('pemrograman dasar') || nama.includes('programming');
                const isMulok = kode.startsWith('M-') || 
                                 nama.includes('bahasa sunda') || 
                                 nama.includes('bahasa jawa') || 
                                 nama.includes('bahasa bali') || 
                                 nama.includes('bahasa madura') || 
                                 nama.includes('muatan lokal') || 
                                 nama.includes('plh') || 
                                 nama.includes('kesenian daerah') ||
                                 nama.includes('kepariwisataan') ||
                                 nama.includes('sunda');
                
                const isKk = kode === 'KK' || kode.startsWith('KK-') || nama.includes('konsentrasi keahlian');
                
                if (s.tingkat !== null && s.tingkat !== undefined) {
                    if (s.tingkat !== selectedTingkat) return;
                } else {
                    if (selectedTingkat === 10) {
                        // Kelas 10: Sembunyikan PKL, PKK, KK, dan mapel produktif tingkat lanjut
                        if (isPkl || isPkk || isKk) return;
                        
                        const kejuruanSuffixes = ['-RPL', '-TKJ', '-AKL', '-MPLB', '-DKV', '-TBSM', '-TKR', '-TP', '-PH', '-KL', '-TB', '-TAV', '-TOI'];
                        const isProduktifLanjut = kejuruanSuffixes.some(suffix => kode.includes(suffix)) && !isDasar && !isPkl && !isPkk && !isKoding;
                        if (isProduktifLanjut) return;
                    } else if (selectedTingkat === 11) {
                        // Kelas 11: Sembunyikan Dasar-dasar, PKL, Koding, dan Mulok
                        if (isDasar || isPkl || isKoding || isMulok) return;
                    } else {
                        // Kelas 12 & 13: Sembunyikan Dasar-dasar, Koding, dan Mulok
                        if (isDasar || isKoding || isMulok) return;
                    }
                }

                const group = detectKelompokForMapel(s.kode_mapel || '', s.nama_mapel);
                
                let match = false;
                if (type === 'UMUM' && group === 'MATA PELAJARAN UMUM') match = true;
                if (type === 'KEJURUAN' && group === 'MATA PELAJARAN KEJURUAN') match = true;
                if (type === 'MULOK' && group === 'MUATAN LOKAL') match = true;
                if (type === 'PILIHAN' && group === 'MATA PELAJARAN PILIHAN') match = true;
                
                if (match) {
                    const defaultJp = detectDefaultJpForMapel(s.kode_mapel || '', s.nama_mapel, selectedTingkat);
                    next[s.id] = {
                        jp_per_minggu: defaultJp,
                        kelompok: group
                    };
                }
            });
            return next;
        });
    }, [subjects?.data, mappingFiltered, selectedTingkat, detectKelompokForMapel, isMapelBelongsToOtherJurusan, detectDefaultJpForMapel]);

    const handleSave = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        
        if (editingItem) {
            const isKejuruanAtauPilihan = formData.kelompok === 'MATA PELAJARAN KEJURUAN' || formData.kelompok === 'MATA PELAJARAN PILIHAN';
            const data: Partial<StrukturKurikulum> = {
                id: editingItem.id,
                mapel_id: formData.mapel_id,
                tahun_pelajaran_id: selectedTahunId,
                tingkat: selectedTingkat,
                jurusan_id: (isSmkOrMak && isKejuruanAtauPilihan) ? (selectedJurusanId || null) : null,
                jp_per_minggu: Number(formData.jp_per_minggu),
                kelompok: formData.kelompok
            };
            upsertMutation.mutate(data);
        } else {
            const items = Object.entries(bulkSelections).map(([mapel_id, config]) => {
                const isKejuruanAtauPilihan = config.kelompok === 'MATA PELAJARAN KEJURUAN' || config.kelompok === 'MATA PELAJARAN PILIHAN';
                return {
                    mapel_id,
                    tahun_pelajaran_id: selectedTahunId,
                    tingkat: selectedTingkat,
                    jurusan_id: (isSmkOrMak && isKejuruanAtauPilihan) ? (selectedJurusanId || null) : null,
                    jp_per_minggu: Number(config.jp_per_minggu),
                    kelompok: config.kelompok
                };
            });
            
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
    }, [editingItem, formData, selectedTahunId, selectedTingkat, selectedJurusanId, isSmkOrMak, bulkSelections, upsertMutation, queryClient, closeModal]);

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
        if (checked && mappingFiltered) {
            setSelectedRowIds(new Set(mappingFiltered.map((item: StrukturKurikulum) => item.id)));
        } else {
            setSelectedRowIds(new Set());
        }
    }, [mappingFiltered]);

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
        return mappingFiltered?.reduce((acc: number, curr: StrukturKurikulum) => acc + curr.jp_per_minggu, 0) || 0;
    }, [mappingFiltered]);

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
        if (standardReferences?.data && Array.isArray(standardReferences.data)) {
            const filteredRefs = standardReferences.data.filter(ref => ref.tingkat === selectedTingkat);
            if (filteredRefs.length > 0) {
                let sum = 0;
                let addedReligion = false;
                let addedSeni = false;
                let electiveSum = 0;
                
                // Group by kode_mapel to ensure uniqueness
                const uniqueRefs = new Map<string, typeof filteredRefs[0]>();
                filteredRefs.forEach(ref => {
                    uniqueRefs.set(ref.kode_mapel, ref);
                });
                
                uniqueRefs.forEach(ref => {
                    const kode = (ref.kode_mapel || '').toUpperCase();
                    const name = (ref.nama_mapel || '').toLowerCase();
                    const category = (ref.category || '').toUpperCase();
                    
                    const isReligion = ['PAI', 'PAKB', 'PAKatB', 'PAHB', 'PABB', 'PAKhB'].includes(kode) || name.includes('agama');
                    const isSeniOrPrakarya = name.includes('seni ') || name.includes('prakarya');
                    const isPKL = kode === 'PKL' || name.includes('praktik kerja lapangan');
                    const isElective = category === 'PILIHAN';
                    
                    if (isPKL) {
                        return;
                    }
                    
                    if (isReligion) {
                        if (!addedReligion) {
                            sum += ref.jp_per_minggu;
                            addedReligion = true;
                        }
                    } else if (isSeniOrPrakarya) {
                        if (!addedSeni) {
                            sum += ref.jp_per_minggu;
                            addedSeni = true;
                        }
                    } else if (isElective) {
                        electiveSum += ref.jp_per_minggu;
                    } else {
                        sum += ref.jp_per_minggu;
                    }
                });
                
                const cappedElectives = (jenjang === 'SMA' && selectedTingkat > 10) 
                    ? Math.min(20, electiveSum) 
                    : electiveSum;
                    
                return sum + cappedElectives;
            }
        }

        const j = (jenjang || '').toUpperCase();
        const config = STANDAR_JP_CONFIG[j];
        if (config && config[selectedTingkat]) {
            return config[selectedTingkat];
        }
        return 40; // Default fallback
    }, [jenjang, selectedTingkat, standardReferences?.data, STANDAR_JP_CONFIG]);

    const gapJp = useMemo(() => {
        return targetJp - totalJp;
    }, [targetJp, totalJp]);

    const unmappedSubjects = useMemo(() => {
        if (!subjects?.data || !mappingFiltered) return [];
        const mappedMapelIds = new Set(mappingFiltered.map((item: StrukturKurikulum) => item.mapel_id));
        
        return subjects.data.filter((s: Mapel) => {
            if (mappedMapelIds.has(s.id)) return false;
            
            if (isMapelBelongsToOtherJurusan(s)) return false;
            
            const kode = (s.kode_mapel || '').toUpperCase();
            const nama = (s.nama_mapel || '').toLowerCase();
            
            const isDasar = kode.includes('DAS-') || nama.includes('dasar-dasar') || nama.includes('dasar dasar');
            const isPkl = kode.includes('PKL') || nama.includes('praktik kerja lapangan') || nama.includes('praktek kerja lapangan') || nama.includes('pkl');
            const isPkk = kode.includes('PKK') || nama.includes('projek kreatif') || nama.includes('project kreatif') || nama.includes('pkk');
            const isKoding = nama.includes('koding') || nama.includes('coding') || nama.includes('pemrograman dasar') || nama.includes('programming');
            const isMulok = kode.startsWith('M-') || 
                             nama.includes('bahasa sunda') || 
                             nama.includes('bahasa jawa') || 
                             nama.includes('bahasa bali') || 
                             nama.includes('bahasa madura') || 
                             nama.includes('muatan lokal') || 
                             nama.includes('plh') || 
                             nama.includes('kesenian daerah') ||
                             nama.includes('kepariwisataan') ||
                             nama.includes('sunda');
            
            const isKk = kode === 'KK' || kode.startsWith('KK-') || nama.includes('konsentrasi keahlian');
            
            if (s.tingkat !== null && s.tingkat !== undefined) {
                if (s.tingkat !== selectedTingkat) return false;
            } else {
                if (selectedTingkat === 10) {
                    // Kelas 10: Sembunyikan PKL, PKK, KK, dan mapel produktif tingkat lanjut (kecuali koding)
                    if (isPkl || isPkk || isKk) return false;
                    
                    const kejuruanSuffixes = ['-RPL', '-TKJ', '-AKL', '-MPLB', '-DKV', '-TBSM', '-TKR', '-TP', '-PH', '-KL', '-TB', '-TAV', '-TOI'];
                    const isProduktifLanjut = kejuruanSuffixes.some(suffix => kode.includes(suffix)) && !isDasar && !isPkl && !isPkk && !isKoding;
                    if (isProduktifLanjut) return false;
                } else if (selectedTingkat === 11) {
                    // Kelas 11: Sembunyikan Dasar-dasar, PKL, Koding, dan Mulok
                    if (isDasar || isPkl || isKoding || isMulok) return false;
                } else {
                    // Kelas 12 & 13: Sembunyikan Dasar-dasar, Koding, dan Mulok
                    if (isDasar || isKoding || isMulok) return false;
                }
            }
            
            return true;
        });
    }, [subjects?.data, mappingFiltered, selectedTingkat, isMapelBelongsToOtherJurusan]);

    const presetSisaCount = useMemo(() => {
        if (!subjects?.data || !mappingFiltered) return { UMUM: 0, KEJURUAN: 0, MULOK: 0, PILIHAN: 0 };
        
        const mappedMapelIds = new Set(mappingFiltered.map((item: StrukturKurikulum) => item.mapel_id));
        let umum = 0;
        let kejuruan = 0;
        let mulok = 0;
        let pilihan = 0;
        
        subjects.data.forEach((s: Mapel) => {
            if (mappedMapelIds.has(s.id)) return;
            
            if (isMapelBelongsToOtherJurusan(s)) return;
            
            const kode = (s.kode_mapel || '').toUpperCase();
            const nama = (s.nama_mapel || '').toLowerCase();
            
            // Terapkan filter tingkat relevansi yang sama persis agar hitungan akurat
            const isDasar = kode.includes('DAS-') || nama.includes('dasar-dasar') || nama.includes('dasar dasar');
            const isPkl = kode.includes('PKL') || nama.includes('praktik kerja lapangan') || nama.includes('praktek kerja lapangan') || nama.includes('pkl');
            const isPkk = kode.includes('PKK') || nama.includes('projek kreatif') || nama.includes('project kreatif') || nama.includes('pkk');
            const isKoding = nama.includes('koding') || nama.includes('coding') || nama.includes('pemrograman dasar') || nama.includes('programming');
            const isMulok = kode.startsWith('M-') || 
                             nama.includes('bahasa sunda') || 
                             nama.includes('bahasa jawa') || 
                             nama.includes('bahasa bali') || 
                             nama.includes('bahasa madura') || 
                             nama.includes('muatan lokal') || 
                             nama.includes('plh') || 
                             nama.includes('kesenian daerah') ||
                             nama.includes('kepariwisataan') ||
                             nama.includes('sunda');
            
            const isKk = kode === 'KK' || kode.startsWith('KK-') || nama.includes('konsentrasi keahlian');
            
            if (s.tingkat !== null && s.tingkat !== undefined) {
                if (s.tingkat !== selectedTingkat) return;
            } else {
                if (selectedTingkat === 10) {
                    if (isPkl || isPkk || isKk) return;
                    const kejuruanSuffixes = ['-RPL', '-TKJ', '-AKL', '-MPLB', '-DKV', '-TBSM', '-TKR', '-TP', '-PH', '-KL', '-TB', '-TAV', '-TOI'];
                    const isProduktifLanjut = kejuruanSuffixes.some(suffix => kode.includes(suffix)) && !isDasar && !isPkl && !isPkk && !isKoding;
                    if (isProduktifLanjut) return;
                } else if (selectedTingkat === 11) {
                    if (isDasar || isPkl || isKoding || isMulok) return;
                } else {
                    if (isDasar || isKoding || isMulok) return;
                }
            }
            
            const group = detectKelompokForMapel(s.kode_mapel || '', s.nama_mapel);
            if (group === 'MATA PELAJARAN UMUM') umum++;
            else if (group === 'MATA PELAJARAN KEJURUAN') kejuruan++;
            else if (group === 'MUATAN LOKAL') mulok++;
            else if (group === 'MATA PELAJARAN PILIHAN') pilihan++;
        });
        
        return { UMUM: umum, KEJURUAN: kejuruan, MULOK: mulok, PILIHAN: pilihan };
    }, [subjects?.data, mappingFiltered, selectedTingkat, detectKelompokForMapel, isMapelBelongsToOtherJurusan]);

    const handleQuickPlotUnmapped = useCallback((specificSubjectId?: string) => {
        resetForm();
        
        const newSelections: Record<string, { jp_per_minggu: number; kelompok: string }> = {};
        
        if (specificSubjectId) {
            const s = subjects?.data?.find((subj: Mapel) => subj.id === specificSubjectId);
            if (s) {
                const group = detectKelompokForMapel(s.kode_mapel || '', s.nama_mapel);
                const defaultJp = detectDefaultJpForMapel(s.kode_mapel || '', s.nama_mapel, selectedTingkat);
                newSelections[s.id] = { jp_per_minggu: defaultJp, kelompok: group };
            }
        } else {
            unmappedSubjects.forEach((s: Mapel) => {
                const group = detectKelompokForMapel(s.kode_mapel || '', s.nama_mapel);
                const defaultJp = detectDefaultJpForMapel(s.kode_mapel || '', s.nama_mapel, selectedTingkat);
                newSelections[s.id] = { jp_per_minggu: defaultJp, kelompok: group };
            });
        }
        
        setBulkSelections(newSelections);
        setIsModalOpen(true);
    }, [subjects?.data, unmappedSubjects, resetForm, detectKelompokForMapel, selectedTingkat, detectDefaultJpForMapel]);

    // ============ PDF HANDLER ============
    const [isPrinting, setIsPrinting] = useState(false);

    const handleCetakPdf = useCallback(async () => {
        if (!mapping?.data) {
            toast.error('Tidak ada data struktur kurikulum untuk dicetak.');
            return;
        }
        setIsPrinting(true);

        // Buka window SEKARANG (synchronous, dalam event handler) sebelum await
        // agar tidak diblok popup blocker Chrome
        const printWindow = window.open('about:blank', '_blank');

        try {
            // 1. Load sekolah profile
            let sekolah = null;
            try { sekolah = await sekolahApi.getProfile(); } catch(e) {}

            // 2. Load logos
            let logoDaerahBase64: string | null = null;
            let logoSekolahBase64: string | null = null;
            const leftLogoUrl = tenantInfo?.logo_daerah_url || (sekolah as any)?.logo_daerah_url;
            const rightLogoUrl = tenantInfo?.logo_url || sekolah?.logo_url;
            try {
                if (leftLogoUrl) logoDaerahBase64 = await getBase64ImageFromUrl(leftLogoUrl);
                if (rightLogoUrl) logoSekolahBase64 = await getBase64ImageFromUrl(rightLogoUrl);
            } catch(e) {}

            // 3. Get principal name from struktur organisasi
            let principalName = 'Kepala Sekolah';
            let principalNip = '';
            try {
                const strukturRes = await getStrukturList({ is_active: true });
                const kepala = strukturRes.data?.find((s: any) =>
                    (s.jabatan || '').toLowerCase().includes('kepala sekolah') ||
                    (s.jabatan || '').toLowerCase().includes('kepala')
                );
                if (kepala) {
                    principalName = (kepala as any).nama_lengkap || (kepala as any).nama || (kepala as any).User?.Guru?.nama_guru || principalName;
                    principalNip = (kepala as any).nip || '';
                }
            } catch(e) {}

            // 4. Generate PDF blob
            const blob = renderStrukturKurikulumPdf({
                tenantInfo,
                sekolah,
                logoDaerahBase64,
                logoSekolahBase64,
                printRows,
                selectedTahunNama,
                selectedJurusan,
                city,
                principalName,
                principalNip,
                getJpValueForSemester,
                getKelompokTotal
            });

            // 5. Arahkan window yang sudah terbuka ke blob URL PDF
            const blobUrl = URL.createObjectURL(blob);
            if (printWindow && !printWindow.closed) {
                printWindow.location.href = blobUrl;
                setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
            } else {
                // fallback: download jika window di-block
                const link = document.createElement('a');
                link.href = blobUrl;
                link.download = `struktur-kurikulum-${selectedTahunNama || 'tp'}.pdf`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
            }
        } catch (err) {
            console.error('Gagal membuat PDF struktur kurikulum:', err);
            toast.error('Gagal membuat PDF. Silakan coba lagi.');
            if (printWindow && !printWindow.closed) printWindow.close();
        } finally {
            setIsPrinting(false);
        }
    }, [mapping?.data, tenantInfo, printRows, selectedTahunNama, selectedJurusan, city, getJpValueForSemester, getKelompokTotal]);

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
                <div className="flex flex-wrap items-center gap-3 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-xl no-print">
                    <select 
                        value={selectedTahunId}
                        onChange={(e) => setSelectedTahunId(e.target.value)}
                        className="bg-transparent border-none text-sm font-bold focus:ring-0 cursor-pointer px-3"
                    >
                        {years?.data?.map(y => (
                            <option key={y.id} value={y.id}>{y.tahun} {y.is_active ? '(Aktif)' : ''}</option>
                        ))}
                    </select>
                    {isSmkOrMak && (
                        <>
                            <div className="w-px h-4 bg-gray-300 dark:bg-gray-700"></div>
                            <select 
                                value={selectedJurusanId}
                                onChange={(e) => setSelectedJurusanId(e.target.value)}
                                className="bg-transparent border-none text-sm font-bold focus:ring-0 cursor-pointer px-3 animate-in fade-in duration-350"
                            >
                                {jurusans?.data?.map(j => (
                                    <option key={j.id} value={j.id}>{j.nama} ({j.singkatan || j.kode})</option>
                                ))}
                            </select>
                        </>
                    )}
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
                            <Button
                                onClick={handleCetakPdf}
                                disabled={isPrinting || !mapping?.data}
                                className="w-full bg-white/20 hover:bg-white/30 text-white font-black rounded-xl border-none flex items-center justify-center gap-2"
                            >
                                {isPrinting ? <Loader2 size={16} className="animate-spin" /> : <Printer size={16} />}
                                {isPrinting ? 'Menyiapkan PDF...' : 'CETAK STRUKTUR'}
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
                            <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50 flex-wrap gap-2 no-print">
                                <div className="flex items-center gap-3">
                                    <h3 className="font-black text-gray-900 dark:text-white uppercase tracking-tight flex items-center">
                                        <BookOpen size={18} className="mr-2 text-indigo-500" />
                                        Struktur Kurikulum - Tingkat {selectedTingkat}
                                    </h3>
                                    <Badge variant="secondary" className="font-bold">{mappingFiltered.length} Mata Pelajaran</Badge>
                                    

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
                                                checked={mappingFiltered && mappingFiltered.length > 0 && selectedRowIds.size === mappingFiltered.length}
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
                                    ) : !mappingFiltered || mappingFiltered.length === 0 ? (
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
                                        mappingFiltered.map((item: StrukturKurikulum) => {
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
                                                        {(() => {
                                                            const k = (item.kelompok || 'MATA PELAJARAN UMUM').toUpperCase();
                                                            if (k === 'MATA PELAJARAN UMUM') {
                                                                return (
                                                                    <span className="text-[9px] font-black tracking-wider uppercase bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-450 border border-blue-100 dark:border-blue-900/40 px-2.5 py-1 rounded-lg select-none">
                                                                        Umum
                                                                    </span>
                                                                );
                                                            }
                                                            if (k === 'MATA PELAJARAN KEJURUAN') {
                                                                return (
                                                                    <span className="text-[9px] font-black tracking-wider uppercase bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-450 border border-emerald-100 dark:border-emerald-900/40 px-2.5 py-1 rounded-lg select-none">
                                                                        Kejuruan
                                                                    </span>
                                                                );
                                                            }
                                                            if (k === 'MATA PELAJARAN PILIHAN') {
                                                                return (
                                                                    <span className="text-[9px] font-black tracking-wider uppercase bg-violet-50 dark:bg-violet-950/30 text-violet-650 dark:text-violet-400 border border-violet-100 dark:border-violet-900/40 px-2.5 py-1 rounded-lg select-none">
                                                                        Pilihan
                                                                    </span>
                                                                );
                                                            }
                                                            if (k === 'MUATAN LOKAL') {
                                                                return (
                                                                    <span className="text-[9px] font-black tracking-wider uppercase bg-amber-50 dark:bg-amber-950/30 text-amber-650 dark:text-amber-400 border border-amber-100 dark:border-amber-900/40 px-2.5 py-1 rounded-lg select-none">
                                                                        Mulok
                                                                    </span>
                                                                );
                                                            }
                                                            return (
                                                                <span className="text-[9px] font-black tracking-wider uppercase bg-slate-50 dark:bg-slate-900/30 text-slate-650 dark:text-slate-400 border border-slate-100 dark:border-slate-900/40 px-2.5 py-1 rounded-lg select-none">
                                                                    {item.kelompok}
                                                                </span>
                                                            );
                                                        })()}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center justify-between gap-3">
                                                            <div>
                                                                <p className="font-bold text-gray-900 dark:text-white">{item.Mapel?.nama_mapel}</p>
                                                                <p className="text-[10px] font-mono text-gray-400">{item.Mapel?.kode_mapel}</p>
                                                            </div>
                                                            {(() => {
                                                                if (!standardReferences?.data) return null;
                                                                const code = (item.Mapel?.kode_mapel || '').toUpperCase();
                                                                const name = (item.Mapel?.nama_mapel || '').toLowerCase();
                                                                
                                                                let match = standardReferences.data.find(ref => 
                                                                    ref.tingkat === item.tingkat && 
                                                                    (ref.kode_mapel || '').toUpperCase() === code
                                                                );
                                                                
                                                                if (!match) {
                                                                    const cleanCode = code.split('-')[0];
                                                                    match = standardReferences.data.find(ref => 
                                                                        ref.tingkat === item.tingkat && 
                                                                        (ref.kode_mapel || '').toUpperCase() === cleanCode
                                                                    );
                                                                }
                                                                
                                                                if (!match) {
                                                                    match = standardReferences.data.find(ref => 
                                                                        ref.tingkat === item.tingkat && 
                                                                        (
                                                                            name.includes(ref.nama_mapel.toLowerCase()) || 
                                                                            ref.nama_mapel.toLowerCase().includes(name)
                                                                        )
                                                                    );
                                                                }
                                                                
                                                                if (!match) {
                                                                    const isReligion = name.startsWith('pendidikan agama') || name.includes('agama');
                                                                    const isSeniOrPrakarya = name.includes('seni ') || name.includes('seni') || name.includes('prakarya');
                                                                    const isMulok = (item.kelompok || '').toUpperCase() === 'MUATAN LOKAL' || ['sunda', 'jawa', 'bali', 'madura'].some(lang => name.includes(lang));
                                                                    
                                                                    if (isReligion) {
                                                                        match = standardReferences.data.find(ref => ref.tingkat === item.tingkat && (ref.kode_mapel === 'PAI' || (ref.nama_mapel || '').toLowerCase().includes('agama')));
                                                                    } else if (isSeniOrPrakarya) {
                                                                        match = standardReferences.data.find(ref => ref.tingkat === item.tingkat && (ref.kode_mapel === 'SENI' || (ref.nama_mapel || '').toLowerCase().includes('seni')));
                                                                    } else if (isMulok) {
                                                                        match = standardReferences.data.find(ref => ref.tingkat === item.tingkat && ref.kode_mapel === 'MULOK');
                                                                    }
                                                                }
                                                                
                                                                if (!match) {
                                                                    const isKejuruan = code.includes('PKL') || code.includes('PKK') || code.includes('DAS-') || name.includes('praktik kerja') || name.includes('kreatif') || name.includes('dasar-dasar');
                                                                    if (isKejuruan) {
                                                                        if (item.tingkat === 10) {
                                                                            match = standardReferences.data.find(ref => ref.tingkat === item.tingkat && ref.kode_mapel === 'DASAR-KEJURUAN');
                                                                        } else {
                                                                            if (code.includes('PKL') || name.includes('praktik kerja')) {
                                                                                match = standardReferences.data.find(ref => ref.tingkat === item.tingkat && ref.kode_mapel === 'PKL');
                                                                            } else if (code.includes('PKK') || name.includes('kreatif')) {
                                                                                match = standardReferences.data.find(ref => ref.tingkat === item.tingkat && ref.kode_mapel === 'PKK');
                                                                            } else {
                                                                                match = standardReferences.data.find(ref => ref.tingkat === item.tingkat && ref.kode_mapel === 'KK');
                                                                            }
                                                                        }
                                                                    }
                                                                }
                                                                
                                                                if (!match) return null;
                                                                
                                                                const isMatch = item.jp_per_minggu === match.jp_per_minggu;
                                                                if (isMatch) {
                                                                    return (
                                                                        <Badge className="bg-emerald-50/70 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-350 border border-emerald-100/50 dark:border-emerald-900/30 text-[9px] font-black tracking-wider uppercase select-none rounded-lg">
                                                                            ✓ Sesuai Standar
                                                                        </Badge>
                                                                    );
                                                                } else {
                                                                    return (
                                                                        <Badge className="bg-amber-50/70 dark:bg-amber-950/20 text-amber-700 dark:text-amber-350 border border-amber-100/50 dark:border-amber-900/30 text-[9px] font-black tracking-wider uppercase select-none rounded-lg" title={`Standar kementerian: ${match.jp_per_minggu} JP`}>
                                                                            ⚠ Harusnya {match.jp_per_minggu} JP
                                                                        </Badge>
                                                                    );
                                                                }
                                                            })()}
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
                                        {/* JP Calculator & Standard Validator */}
                                        {renderJpCalculator(Number(formData.jp_per_minggu || 0), editingItem?.Mapel?.nama_mapel || '', editingItem?.Mapel?.kode_mapel || '')}
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

                                            {presetSisaCount.PILIHAN === 0 ? (
                                                <span className="text-[9px] bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-450 px-2.5 py-1.5 rounded-lg font-black border border-emerald-200 dark:border-emerald-900 shadow-sm cursor-default select-none">
                                                    ✓ Paket Pilihan Selesai
                                                </span>
                                            ) : (
                                                <button
                                                    type="button"
                                                    onClick={() => handleAddPreset('PILIHAN')}
                                                    className="text-[10px] bg-slate-150 dark:bg-slate-800 hover:bg-violet-50 hover:text-violet-600 dark:hover:bg-violet-950/20 text-slate-700 dark:text-slate-300 px-3 py-1.5 rounded-lg font-bold transition-all"
                                                >
                                                    + Paket Pilihan ({presetSisaCount.PILIHAN})
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
                                            const alreadyMapped = mappingFiltered?.some((m: StrukturKurikulum) => m.mapel_id === s.id);
                                            if (alreadyMapped) return false;
                                            
                                            if (isMapelBelongsToOtherJurusan(s)) return false;
                                            
                                            const isDasar = kode.includes('DAS-') || nama.includes('dasar-dasar') || nama.includes('dasar dasar');
                                            const isPkl = kode.includes('PKL') || nama.includes('praktik kerja lapangan') || nama.includes('praktek kerja lapangan') || nama.includes('pkl');
                                            const isPkk = kode.includes('PKK') || nama.includes('projek kreatif') || nama.includes('project kreatif') || nama.includes('pkk');
                                            const isKoding = nama.includes('koding') || nama.includes('coding') || nama.includes('pemrograman dasar') || nama.includes('programming');
                                            const isMulok = kode.startsWith('M-') || 
                                                             nama.includes('bahasa sunda') || 
                                                             nama.includes('bahasa jawa') || 
                                                             nama.includes('bahasa bali') || 
                                                             nama.includes('bahasa madura') || 
                                                             nama.includes('muatan lokal') || 
                                                             nama.includes('plh') || 
                                                             nama.includes('kesenian daerah') ||
                                                             nama.includes('kepariwisataan') ||
                                                             nama.includes('sunda');
                                            
                                            const isKk = kode === 'KK' || kode.startsWith('KK-') || nama.includes('konsentrasi keahlian');
                                            
                                            // 2. Smart Filter Relevansi Tingkat
                                            if (selectedTingkat === 10) {
                                                // Kelas 10: Sembunyikan PKL, PKK, KK, dan mapel produktif tingkat lanjut (kecuali koding)
                                                if (isPkl || isPkk || isKk) return false;
                                                
                                                const kejuruanSuffixes = ['-RPL', '-TKJ', '-AKL', '-MPLB', '-DKV', '-TBSM', '-TKR', '-TP', '-PH', '-KL', '-TB', '-TAV', '-TOI'];
                                                const isProduktifLanjut = kejuruanSuffixes.some(suffix => kode.includes(suffix)) && !isDasar && !isPkl && !isPkk && !isKoding;
                                                if (isProduktifLanjut) return false;
                                            } else if (selectedTingkat === 11) {
                                                // Kelas 11: Sembunyikan Dasar-dasar, PKL, Koding, dan Mulok
                                                if (isDasar || isPkl || isKoding || isMulok) return false;
                                            } else {
                                                // Kelas 12 & 13: Sembunyikan Dasar-dasar, Koding, dan Mulok (PKL dan PKK boleh muncul)
                                                if (isDasar || isKoding || isMulok) return false;
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
                                                    <div key={id} className="flex flex-col gap-2.5 p-3.5 bg-slate-50/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl">
                                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-xs font-bold text-slate-855 dark:text-slate-200 truncate">{mapelObj.nama_mapel}</p>
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
                                                        {renderJpCalculator(Number(config.jp_per_minggu || 0), mapelObj.nama_mapel, mapelObj.kode_mapel)}
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
