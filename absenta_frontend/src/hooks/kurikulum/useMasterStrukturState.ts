import { useState, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { kurikulumApi } from '../../api/kurikulum.api';
import { mapelApi, tahunPelajaranApi, jurusanApi } from '../../api/academic.api';
import { useConfirm } from '../../providers/ConfirmProvider';
import { toast } from 'react-hot-toast';
import { useJenjang } from '../../hooks/useJenjang';
import { useAuth } from '../../hooks/useAuth';
import type { Mapel } from '../../types/academic';
import React from 'react';
import { getTenantById } from '../../api/tenants.api';
import {
  StrukturKurikulum,
  STANDAR_JP_CONFIG,
  detectKelompokForMapel,
  detectDefaultJpForMapel,
  isMapelBelongsToOtherJurusan,
  isMapelRelevantForTingkat,
  performStrukturPrint
} from '../../utils/kurikulum/masterStrukturHelper';

export const getSubjectSortRank = (item: StrukturKurikulum) => {
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
};

export const useMasterStrukturState = () => {
  const queryClient = useQueryClient();
  const { confirm } = useConfirm();
  const { user } = useAuth();
  const { data: tenantRes } = useQuery({
    queryKey: ['tenant-profile', user?.tenant_id],
    queryFn: () => getTenantById(user?.tenant_id || ''),
    enabled: !!user?.tenant_id
  });
  const tenantInfo = tenantRes?.data;
  
  const { jenjang, kurikulum, tingkatList, kelompokOptions } = useJenjang();

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

  // Add Modes: 'manual' (satu per satu) vs 'massal' (bulk)
  const [addMode, setAddMode] = useState<'manual' | 'massal'>('massal');
  const [showAddOptions, setShowAddOptions] = useState(false);

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

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  }, []);

  // Reset table row selections when filters change
  React.useEffect(() => {
    setSelectedRowIds(new Set());
  }, [selectedTahunId, selectedTingkat]);

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

  const { data: jurusans } = useQuery({
    queryKey: ['academic-jurusans'],
    queryFn: () => jurusanApi.getAll()
  });

  const isSmkOrMak = useMemo(() => {
    const j = (jenjang || '').toUpperCase();
    return j === 'SMK' || j === 'MAK';
  }, [jenjang]);

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

  const mappingFiltered = useMemo(() => {
    if (!mapping?.data) return [];
    const filtered = mapping.data.filter((item: StrukturKurikulum) => item.tingkat === selectedTingkat);
    
    return [...filtered].sort((a, b) => {
      const rankA = getSubjectSortRank(a);
      const rankB = getSubjectSortRank(b);
      if (rankA !== rankB) return rankA - rankB;
      return (a.Mapel?.nama_mapel || '').localeCompare(b.Mapel?.nama_mapel || '');
    });
  }, [mapping?.data, selectedTingkat]);

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

  const detectDefaultJp = useCallback((kode: string, nama: string, tingkat: number) => {
    return detectDefaultJpForMapel(kode, nama, tingkat, standardReferences?.data || [], isSmkOrMak);
  }, [standardReferences?.data, isSmkOrMak]);

  const isMapelBelongsToOtherJurusanLocal = useCallback((s: Mapel) => {
    return isMapelBelongsToOtherJurusan(s, isSmkOrMak, jurusans?.data || [], selectedJurusanId);
  }, [isSmkOrMak, jurusans?.data, selectedJurusanId]);

  // Auto-detect kelompok based on selected mapel
  React.useEffect(() => {
    if (!formData.mapel_id || !subjects?.data || !kelompokOptions?.length) return;
    
    const selectedMapel = subjects.data.find((s: Mapel) => s.id === formData.mapel_id);
    if (!selectedMapel) return;
    
    const detectedKelompok = detectKelompokForMapel(selectedMapel.kode_mapel || '', selectedMapel.nama_mapel);
    
    // Pastikan detectedKelompok ada di kelompokOptions sebelum di-set
    const isValidOption = kelompokOptions.some(opt => opt.value === detectedKelompok);
    if (isValidOption) {
      setFormData(prev => ({ ...prev, kelompok: detectedKelompok }));
    }
  }, [formData.mapel_id, subjects?.data, kelompokOptions]);

  // Auto-detect default JP based on selected mapel and tingkat (for manual single add)
  React.useEffect(() => {
    if (!formData.mapel_id || !subjects?.data || !standardReferences?.data || editingItem) return;
    
    const selectedMapel = subjects.data.find((s: Mapel) => s.id === formData.mapel_id);
    if (!selectedMapel) return;
    
    const defaultJp = detectDefaultJp(selectedMapel.kode_mapel || '', selectedMapel.nama_mapel, selectedTingkat);
    setFormData(prev => ({ ...prev, jp_per_minggu: defaultJp }));
  }, [formData.mapel_id, subjects?.data, standardReferences?.data, selectedTingkat, detectDefaultJp, editingItem]);

  const handleAddPreset = useCallback((type: 'UMUM' | 'KEJURUAN' | 'MULOK' | 'PILIHAN') => {
    if (!subjects?.data) return;
    
    setBulkSelections(prev => {
      const next = { ...prev };
      subjects.data.forEach((s: Mapel) => {
        const alreadyMapped = mappingFiltered?.some((m: StrukturKurikulum) => m.mapel_id === s.id);
        if (alreadyMapped) return;

        if (isMapelBelongsToOtherJurusanLocal(s)) return;

        if (!isMapelRelevantForTingkat(s, selectedTingkat, isSmkOrMak, isMapelBelongsToOtherJurusanLocal)) return;

        const group = detectKelompokForMapel(s.kode_mapel || '', s.nama_mapel);
        
        let match = false;
        if (type === 'UMUM' && group === 'MATA PELAJARAN UMUM') match = true;
        if (type === 'KEJURUAN' && group === 'MATA PELAJARAN KEJURUAN') match = true;
        if (type === 'MULOK' && group === 'MUATAN LOKAL') match = true;
        if (type === 'PILIHAN' && group === 'MATA PELAJARAN PILIHAN') match = true;
        
        if (match) {
          const defaultJp = detectDefaultJp(s.kode_mapel || '', s.nama_mapel, selectedTingkat);
          next[s.id] = {
            jp_per_minggu: defaultJp,
            kelompok: group
          };
        }
      });
      return next;
    });
  }, [subjects?.data, mappingFiltered, selectedTingkat, isSmkOrMak, isMapelBelongsToOtherJurusanLocal, detectDefaultJp]);

  const handleSave = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (editingItem || addMode === 'manual') {
      if (addMode === 'manual' && !formData.mapel_id) {
        toast.error('Pilih mata pelajaran terlebih dahulu');
        return;
      }
      const isKejuruanAtauPilihan = formData.kelompok === 'MATA PELAJARAN KEJURUAN' || formData.kelompok === 'MATA PELAJARAN PILIHAN';
      const data: Partial<StrukturKurikulum> = {
        id: editingItem?.id,
        mapel_id: formData.mapel_id,
        tahun_pelajaran_id: selectedTahunId,
        tingkat: selectedTingkat,
        jurusan_id: (isSmkOrMak && isKejuruanAtauPilihan) ? (selectedJurusanId || null) : null,
        jp_per_minggu: Number(formData.jp_per_minggu),
        kelompok: formData.kelompok
      };
      upsertMutation.mutate(data);
    } else {
      const selections = Object.entries(bulkSelections);
      if (selections.length === 0) {
        toast.error('Pilih minimal satu mata pelajaran untuk di-plot');
        return;
      }
      
      const promises = selections.map(([mapelId, config]) => {
        const isKejuruanAtauPilihan = config.kelompok === 'MATA PELAJARAN KEJURUAN' || config.kelompok === 'MATA PELAJARAN PILIHAN';
        return kurikulumApi.upsertStruktur({
          mapel_id: mapelId,
          tahun_pelajaran_id: selectedTahunId,
          tingkat: selectedTingkat,
          jurusan_id: (isSmkOrMak && isKejuruanAtauPilihan) ? (selectedJurusanId || null) : null,
          jp_per_minggu: config.jp_per_minggu,
          kelompok: config.kelompok
        });
      });
      
      try {
        await Promise.all(promises);
        queryClient.invalidateQueries({ queryKey: ['kurikulum-struktur'] });
        toast.success(`Berhasil memetakan ${selections.length} mata pelajaran`);
        closeModal();
      } catch (err) {
        toast.error('Beberapa pemetaan gagal disimpan');
      }
    }
  }, [editingItem, addMode, formData, selectedTahunId, selectedTingkat, isSmkOrMak, selectedJurusanId, bulkSelections, upsertMutation, queryClient, closeModal]);

  const handleSelectAllRows = useCallback((checked: boolean) => {
    if (checked && mappingFiltered) {
      setSelectedRowIds(new Set(mappingFiltered.map((item: StrukturKurikulum) => item.id)));
    } else {
      setSelectedRowIds(new Set());
    }
  }, [mappingFiltered]);

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

  const handleBulkDelete = useCallback(async () => {
    const count = selectedRowIds.size;
    const confirmDelete = await confirm({
      title: 'Hapus Pemetaan Massal',
      description: `Apakah Anda yakin ingin menghapus ${count} pemetaan struktur kurikulum terpilih?`
    });
    
    if (confirmDelete) {
      const promises = Array.from(selectedRowIds).map(id => kurikulumApi.deleteStruktur(id));
      try {
        await Promise.all(promises);
        queryClient.invalidateQueries({ queryKey: ['kurikulum-struktur'] });
        toast.success(`Berhasil menghapus ${count} pemetaan`);
        setSelectedRowIds(new Set());
      } catch (err) {
        toast.error('Beberapa data gagal dihapus');
      }
    }
  }, [selectedRowIds, confirm, queryClient]);

  const handleDelete = useCallback(async (id: string) => {
    const confirmDelete = await confirm({
      title: 'Hapus Pemetaan',
      description: 'Apakah Anda yakin ingin menghapus pemetaan mata pelajaran ini?'
    });
    if (confirmDelete) {
      deleteMutation.mutate(id);
      setSelectedRowIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }, [confirm, deleteMutation]);

  const unmappedSubjects = useMemo(() => {
    if (!subjects?.data || !mappingFiltered) return [];
    const mappedMapelIds = new Set(mappingFiltered.map((item: StrukturKurikulum) => item.mapel_id));
    return subjects.data.filter((s: Mapel) => {
      if (mappedMapelIds.has(s.id)) return false;

      // Filter out based on active kurikulum
      const kode = (s.kode_mapel || '').toUpperCase();
      const name = (s.nama_mapel || '').toLowerCase();
      
      if (kurikulum === 'K13') {
        // K13 does not have Seni Pilihan
        const isSeniPilihan = ['SENI_MUSIK', 'SENI_RUPA', 'SENI_TARI', 'SENI_TEATER'].includes(kode) ||
          ['seni musik', 'seni rupa', 'seni tari', 'seni teater'].some(t => name.includes(t));
        if (isSeniPilihan) return false;
      } else if (kurikulum === 'MERDEKA') {
        // Merdeka does not use general Seni Budaya for SD, SMP, SMA (only SMK/MAK uses it)
        if (!isSmkOrMak) {
          const isGeneralSeniBudaya = kode === 'SENI' || name === 'seni budaya';
          if (isGeneralSeniBudaya) return false;
        }
      }

      return isMapelRelevantForTingkat(s, selectedTingkat, isSmkOrMak, isMapelBelongsToOtherJurusanLocal);
    });
  }, [subjects?.data, mappingFiltered, selectedTingkat, isSmkOrMak, isMapelBelongsToOtherJurusanLocal, kurikulum]);

  const presetSisaCount = useMemo(() => {
    if (!subjects?.data || !mappingFiltered) return { UMUM: 0, KEJURUAN: 0, MULOK: 0, PILIHAN: 0 };
    
    const mappedMapelIds = new Set(mappingFiltered.map((item: StrukturKurikulum) => item.mapel_id));
    let umum = 0;
    let kejuruan = 0;
    let mulok = 0;
    let pilihan = 0;
    
    subjects.data.forEach((s: Mapel) => {
      if (mappedMapelIds.has(s.id)) return;
      
      if (!isMapelRelevantForTingkat(s, selectedTingkat, isSmkOrMak, isMapelBelongsToOtherJurusanLocal)) return;
      
      const group = detectKelompokForMapel(s.kode_mapel || '', s.nama_mapel);
      if (group === 'MATA PELAJARAN UMUM') umum++;
      else if (group === 'MATA PELAJARAN KEJURUAN') kejuruan++;
      else if (group === 'MUATAN LOKAL') mulok++;
      else if (group === 'MATA PELAJARAN PILIHAN') pilihan++;
    });
    
    return { UMUM: umum, KEJURUAN: kejuruan, MULOK: mulok, PILIHAN: pilihan };
  }, [subjects?.data, mappingFiltered, selectedTingkat, isSmkOrMak, isMapelBelongsToOtherJurusanLocal]);

  const handleQuickPlotUnmapped = useCallback((specificSubjectId?: string) => {
    resetForm();
    const newSelections: Record<string, { jp_per_minggu: number; kelompok: string }> = {};
    
    if (specificSubjectId) {
      const s = subjects?.data?.find((subj: Mapel) => subj.id === specificSubjectId);
      if (s) {
        const group = detectKelompokForMapel(s.kode_mapel || '', s.nama_mapel);
        const defaultJp = detectDefaultJp(s.kode_mapel || '', s.nama_mapel, selectedTingkat);
        newSelections[s.id] = { jp_per_minggu: defaultJp, kelompok: group };
      }
    } else {
      unmappedSubjects.forEach((s: Mapel) => {
        const group = detectKelompokForMapel(s.kode_mapel || '', s.nama_mapel);
        const defaultJp = detectDefaultJp(s.kode_mapel || '', s.nama_mapel, selectedTingkat);
        newSelections[s.id] = { jp_per_minggu: defaultJp, kelompok: group };
      });
    }
    
    setBulkSelections(newSelections);
    setIsModalOpen(true);
  }, [subjects?.data, unmappedSubjects, resetForm, selectedTingkat, detectDefaultJp]);

  const [isPrinting, setIsPrinting] = useState(false);

  const handleCetakPdf = useCallback(async () => {
    if (!mapping?.data) {
      toast.error('Tidak ada data struktur kurikulum untuk dicetak.');
      return;
    }
    const selectedJurusan = jurusans?.data?.find(item => item.id === selectedJurusanId);
    await performStrukturPrint({
      tenantInfo,
      selectedTingkat,
      selectedTahunNama,
      selectedJurusan,
      mappingData: mapping.data,
      setIsPrinting
    });
  }, [tenantInfo, selectedTingkat, selectedTahunNama, jurusans?.data, selectedJurusanId, mapping?.data]);

  const totalJp = useMemo(() => {
    if (!mappingFiltered) return 0;
    return mappingFiltered.reduce((sum, item) => sum + item.jp_per_minggu, 0);
  }, [mappingFiltered]);

  const targetJp = useMemo(() => {
    if (standardReferences?.data && Array.isArray(standardReferences.data)) {
      const filteredRefs = standardReferences.data.filter(ref => ref.tingkat === selectedTingkat);
      if (filteredRefs.length > 0) {
        const uniqueRefs = new Map<string, typeof filteredRefs[0]>();
        filteredRefs.forEach(ref => {
          const kode = (ref.kode_mapel || '').toUpperCase();
          const name = (ref.nama_mapel || '').toLowerCase();
          const category = (ref.category || '').toUpperCase();
          
          const isReligion = ['PAI', 'PAKB', 'PAKatB', 'PAHB', 'PABB', 'PAKhB'].includes(kode) || name.includes('agama');
          const isSeniOrPrakarya = name.includes('seni ') || name.includes('prakarya');
          const isPKL = kode === 'PKL' || name.includes('praktik kerja lapangan');
          const isElective = category === 'PILIHAN';
          
          if (isReligion) {
            uniqueRefs.set('RELIGION', ref);
          } else if (isSeniOrPrakarya) {
            uniqueRefs.set('ART_CRAFT', ref);
          } else if (isPKL) {
            if (selectedTingkat === 12) {
              uniqueRefs.set(kode, ref);
            }
          } else if (isElective) {
            uniqueRefs.set(kode, ref);
          } else {
            uniqueRefs.set(kode, ref);
          }
        });
        
        let sum = 0;
        uniqueRefs.forEach(ref => {
          sum += ref.jp_per_minggu;
        });
        
        return sum;
      }
    }
    const j = (jenjang || '').toUpperCase();
    const config = STANDAR_JP_CONFIG[j];
    return config ? (config[selectedTingkat] || 40) : 40;
  }, [jenjang, selectedTingkat, standardReferences?.data]);

  const gapJp = useMemo(() => {
    return targetJp - totalJp;
  }, [targetJp, totalJp]);

  return {
    selectedTahunId, setSelectedTahunId,
    selectedTingkat, setSelectedTingkat,
    selectedJurusanId, setSelectedJurusanId,
    isModalOpen, setIsModalOpen,
    editingItem, setEditingItem,
    formData, setFormData,
    addMode, setAddMode,
    showAddOptions, setShowAddOptions,
    bulkSelections, setBulkSelections,
    bulkSearchQuery, setBulkSearchQuery,
    selectedRowIds, setSelectedRowIds,
    subjects,
    years,
    jurusans,
    isSmkOrMak,
    selectedTahunNama,
    mappingFiltered,
    standardReferences,
    isLoadingMapping,
    isPrinting,
    totalJp,
    targetJp,
    gapJp,
    unmappedSubjects,
    presetSisaCount,
    openCreateModal,
    openEditModal,
    closeModal,
    handleSave,
    handleSelectAllRows,
    handleToggleRowSelect,
    handleBulkDelete,
    handleDelete,
    handleAddPreset,
    handleQuickPlotUnmapped,
    handleCetakPdf,
    handleInputChange,
    detectDefaultJp,
    isMapelBelongsToOtherJurusanLocal,
    tingkatList,
    kelompokOptions,
    upsertMutation
  };
};
