import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Modal, Button } from '../../ui';
import { getPresetsByJenjang, initializeMapelPreset, getMapelList, type GlobalMapelPreset } from '../../../api/academic/mapel.api';
import { getJurusanList } from '../../../api/academic/jurusan.api';
import { BookOpen, GraduationCap, ChevronRight, ChevronLeft, Save, RefreshCw, Layers, Check, ChevronDown, ChevronUp, Compass, Flag } from 'lucide-react';
import toast from 'react-hot-toast';
import { useJenjang } from '../../../hooks/useJenjang';
import { useAuth } from '../../../hooks/useAuth';

interface PresetWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  jenjang: string;
  onSuccess: () => void;
}

interface WizardStep {
  label: string;
  categoryType: 'umum' | 'kejuruan' | 'pilihan' | 'mulok' | 'summary';
}

export const PresetWizardModal: React.FC<PresetWizardModalProps> = React.memo(({
  isOpen,
  onClose,
  jenjang,
  onSuccess
}) => {
  const queryClient = useQueryClient();
  // Track step dynamically using index
  const [stepIndex, setStepIndex] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Data presets from DB
  const [presets, setPresets] = useState<GlobalMapelPreset[]>([]);
  
  // Vocational specific data
  const [jurusans, setJurusans] = useState<any[]>([]);
  const [expandedJurusanId, setExpandedJurusanId] = useState<string | null>(null);
  const [vocationalPresets, setVocationalPresets] = useState<Record<string, GlobalMapelPreset[]>>({});
  const [loadingVocational, setLoadingVocational] = useState(false);

  // Selection states
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const { kurikulum } = useJenjang();
  const { user } = useAuth();
  
  // Existing mapels state
  const [existingMapels, setExistingMapels] = useState<any[]>([]);

  // Computed set of already added mapel codes and names
  const existingMapelCodesAndNames = useMemo(() => {
    const shortTenantId = user?.tenant_id ? user.tenant_id.substring(0, 4).toUpperCase() : '';
    const set = new Set<string>();
    existingMapels.forEach((m: any) => {
      if (m.kode_mapel) set.add(m.kode_mapel.toUpperCase());
      if (m.nama_mapel) set.add(m.nama_mapel.toLowerCase().trim());
      // Also add the base code if it has tenant suffix (e.g. "MAT-DEMO" -> "MAT")
      if (m.kode_mapel && m.kode_mapel.endsWith(`-${shortTenantId}`)) {
        const baseKode = m.kode_mapel.substring(0, m.kode_mapel.length - (shortTenantId.length + 1));
        set.add(baseKode.toUpperCase());
      }
    });
    return set;
  }, [existingMapels, user?.tenant_id]);

  const isPresetAlreadyAdded = useCallback((p: GlobalMapelPreset) => {
    const pKode = p.kode_mapel.toUpperCase();
    const pName = p.nama_mapel.toLowerCase().trim();
    return existingMapelCodesAndNames.has(pKode) || existingMapelCodesAndNames.has(pName);
  }, [existingMapelCodesAndNames]);

  const isSmkMak = jenjang === 'SMK' || jenjang === 'MAK';

  // Define steps dynamically based on school type and curriculum
  const steps = useMemo<WizardStep[]>(() => {
    const isSmaOrKejuruan = ['SMA', 'MA', 'SMK', 'MAK'].includes(jenjang?.toUpperCase() || '');
    const isK13 = kurikulum === 'K13';
    
    // For K13 SD/SMP, there is NO choices/Seni Pilihan (since it's SBdP in Mapel Umum)
    const hasPilihanStep = isSmaOrKejuruan || (!isK13 && ['SD', 'MI', 'SMP', 'MTs'].includes(jenjang?.toUpperCase() || ''));
    
    const pilihanLabel = isSmaOrKejuruan ? 'Mapel Pilihan' : 'Seni Pilihan';

    if (isSmkMak) {
      const baseSteps: WizardStep[] = [
        { label: 'Mapel Umum', categoryType: 'umum' },
        { label: 'Mapel Kejuruan', categoryType: 'kejuruan' }
      ];
      if (hasPilihanStep) {
        baseSteps.push({ label: pilihanLabel, categoryType: 'pilihan' });
      }
      baseSteps.push(
        { label: 'Muatan Lokal', categoryType: 'mulok' },
        { label: 'Ringkasan', categoryType: 'summary' }
      );
      return baseSteps;
    } else {
      const baseSteps: WizardStep[] = [
        { label: 'Mapel Umum', categoryType: 'umum' }
      ];
      if (hasPilihanStep) {
        baseSteps.push({ label: pilihanLabel, categoryType: 'pilihan' });
      }
      baseSteps.push(
        { label: 'Muatan Lokal', categoryType: 'mulok' },
        { label: 'Ringkasan', categoryType: 'summary' }
      );
      return baseSteps;
    }
  }, [isSmkMak, jenjang, kurikulum]);

  const currentStepType = steps[stepIndex]?.categoryType || 'umum';

  // Helper to extract matched key for a department
  const getMatchedKey = (jur: any) => {
    const fields = [
      jur.singkatan || '',
      jur.kode || '',
      jur.nama || ''
    ].map(f => f.toLowerCase());

    const checks = [
      { key: 'RPL', regex: /rpl|rekayasa.*perangkat.*lunak/i },
      { key: 'TKJ', regex: /tkj|komputer.*jaringan/i },
      { key: 'AKL', regex: /akl|akuntansi/i },
      { key: 'MPLB', regex: /mplb|perkantoran|administrasi.*perkantoran/i },
      { key: 'DKV', regex: /dkv|multimedia|desain.*komunikasi.*visual/i },
      { key: 'TBSM', regex: /tbsm|sepeda.*motor/i },
      { key: 'TKR', regex: /tkr|kendaraan.*ringan/i },
      { key: 'TP', regex: /\btp\b|pemesinan|mesin/i },
      { key: 'PH', regex: /\bph\b|perhotelan/i },
      { key: 'KL', regex: /\bkl\b|kuliner|jasa.*boga/i },
      { key: 'TB', regex: /\btb\b|tata.*busana|busana/i },
      { key: 'TAV', regex: /tav|audio.*video/i },
      { key: 'TOI', regex: /toi|otomasi.*industri/i }
    ];

    for (const check of checks) {
      if (fields.some(field => check.regex.test(field))) {
        return check.key;
      }
    }
    return '';
  };

  // Load presets & jurusans
  useEffect(() => {
    if (!isOpen) return;
    
    // Reset state on open
    setStepIndex(0);
    setSelectedIds(new Set());
    setExpandedJurusanId(null);
    setVocationalPresets({});
    setExistingMapels([]);
    
    const loadInitialData = async () => {
      try {
        setLoading(true);

        // Fetch existing mapels for tenant
        const existingRes = await getMapelList(1, 1000);
        const mapels = existingRes.success ? existingRes.data : [];
        setExistingMapels(mapels);

        // Helper to check if a preset is already added based on local mapels
        const shortTenantId = user?.tenant_id ? user.tenant_id.substring(0, 4).toUpperCase() : '';
        const checkPresetAdded = (p: GlobalMapelPreset) => {
          const pKode = p.kode_mapel.toUpperCase();
          const pName = p.nama_mapel.toLowerCase().trim();
          const pKodeWithSuffix = `${pKode}-${shortTenantId}`.toUpperCase();
          return mapels.some((m: any) => {
            const mKode = (m.kode_mapel || '').toUpperCase();
            const mName = (m.nama_mapel || '').toLowerCase().trim();
            return mKode === pKode || mKode === pKodeWithSuffix || mName === pName;
          });
        };

        const res = await getPresetsByJenjang(jenjang);
        if (res.success) {
          let filtered = res.data;
          if (kurikulum === 'K13') {
            filtered = res.data.filter(p => p.category !== 'SENI_PILIHAN');
          } else {
            if (!isSmkMak) {
              filtered = res.data.filter(p => p.kode_mapel !== 'SENI');
            }
          }
          setPresets(filtered);
          
          // Pre-select UMUM & KEAGAMAAN by default in step 1, AND pre-select Seni Rupa (SRPA) as the default recommended Art subject!
          const initialSelection = new Set<string>();
          filtered.forEach(p => {
            const isDefaultUmum = p.category === 'UMUM' || p.category === 'KEAGAMAAN' || p.category === 'UMUM_KELAS10';
            const isDefaultSeni = p.kode_mapel === 'SRPA'; // Seni Rupa as default recommended Art subject
            
            if (isDefaultUmum || isDefaultSeni) {
              if (!checkPresetAdded(p)) {
                initialSelection.add(p.id);
              }
            }
          });
          setSelectedIds(initialSelection);
        }

        if (isSmkMak) {
          setLoadingVocational(true);
          const jurRes = await getJurusanList(1, 100);
          if (jurRes.success) {
            setJurusans(jurRes.data);
            
            // Map dan fetch preset untuk semua jurusan sekaligus secara paralel
            const checks = [
              { key: 'RPL', regex: /rpl|rekayasa.*perangkat.*lunak/i },
              { key: 'TKJ', regex: /tkj|komputer.*jaringan/i },
              { key: 'AKL', regex: /akl|akuntansi/i },
              { key: 'MPLB', regex: /mplb|perkantoran|administrasi.*perkantoran/i },
              { key: 'DKV', regex: /dkv|multimedia|desain.*komunikasi.*visual/i },
              { key: 'TBSM', regex: /tbsm|sepeda.*motor/i },
              { key: 'TKR', regex: /tkr|kendaraan.*ringan/i },
              { key: 'TP', regex: /\btp\b|pemesinan|mesin/i },
              { key: 'PH', regex: /\bph\b|perhotelan/i },
              { key: 'KL', regex: /\bkl\b|kuliner|jasa.*boga/i },
              { key: 'TB', regex: /\btb\b|tata.*busana|busana/i },
              { key: 'TAV', regex: /tav|audio.*video/i },
              { key: 'TOI', regex: /toi|otomasi.*industri/i }
            ];

            const presetPromises = jurRes.data.map(async (jur: any) => {
              const fields = [
                jur.singkatan || '',
                jur.kode || '',
                jur.nama || ''
              ].map(f => f.toLowerCase());

              let matchedKey = '';
              for (const check of checks) {
                if (fields.some(field => check.regex.test(field))) {
                  matchedKey = check.key;
                  break;
                }
              }

              if (matchedKey) {
                try {
                  const presRes = await getPresetsByJenjang(matchedKey);
                  if (presRes.success) {
                    return {
                      matchedKey,
                      presets: presRes.data.filter(p => p.category === 'KEJURUAN')
                    };
                  }
                } catch (e) {
                  console.error(`Failed to load preset for ${matchedKey}:`, e);
                }
              }
              return null;
            });

            const results = await Promise.all(presetPromises);
            const newVocationalPresets: Record<string, GlobalMapelPreset[]> = {};
            
            // Auto select PKL, PKK, and Dasar-dasar by default
            setSelectedIds(prevSelected => {
              const next = new Set(prevSelected);
              const shortTenantId = user?.tenant_id ? user.tenant_id.substring(0, 4).toUpperCase() : '';
              results.forEach(r => {
                if (r) {
                  r.presets.forEach(p => {
                    const name = p.nama_mapel.toLowerCase();
                    if (
                      name.includes('praktik kerja lapangan') ||
                      name.includes('projek kreatif') ||
                      name.includes('dasar-dasar')
                    ) {
                      // Only select if not already added
                      const pKode = p.kode_mapel.toUpperCase();
                      const pName = p.nama_mapel.toLowerCase().trim();
                      const pKodeWithSuffix = `${pKode}-${shortTenantId}`.toUpperCase();
                      const alreadyAdded = mapels.some((m: any) => {
                        const mKode = (m.kode_mapel || '').toUpperCase();
                        const mName = (m.nama_mapel || '').toLowerCase().trim();
                        return mKode === pKode || mKode === pKodeWithSuffix || mName === pName;
                      });
                      if (!alreadyAdded) {
                        next.add(p.id);
                      }
                    }
                  });
                }
              });
              return next;
            });

            results.forEach(r => {
              if (r) {
                newVocationalPresets[r.matchedKey] = r.presets;
              }
            });
            setVocationalPresets(newVocationalPresets);
            
            if (jurRes.data.length > 0) {
              setExpandedJurusanId(jurRes.data[0].id);
            }
          }
          setLoadingVocational(false);
        }
      } catch (err: any) {
        console.error('Error loading wizard presets:', err);
        toast.error('Gagal memuat preset global mata pelajaran');
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
  }, [isOpen, jenjang, isSmkMak, kurikulum]);

  // Filter Step 1 Presets (Wajib Umum & Keagamaan)
  const step1Presets = useMemo(() => {
    return presets.filter(p => 
      p.category === 'UMUM' || 
      p.category === 'KEAGAMAAN' || 
      p.category === 'UMUM_KELAS10'
    );
  }, [presets]);

  // Filter Step 3 Presets (Pilihan Rumpun/Seni/Prakarya)
  const step3Presets = useMemo(() => {
    return presets.filter(p => 
      p.category === 'SENI_PILIHAN' ||
      p.category === 'PRAKARYA_PILIHAN' ||
      p.category.startsWith('PILIHAN_')
    );
  }, [presets]);

  // Group step 3 presets by category/rumpun
  const step3Grouped = useMemo(() => {
    return step3Presets.reduce((acc: Record<string, GlobalMapelPreset[]>, p) => {
      const cat = p.category;
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(p);
      return acc;
    }, {});
  }, [step3Presets]);

  // Filter Step 4 Presets (Muatan Lokal)
  const step4Presets = useMemo(() => {
    return presets.filter(p => p.category === 'MULOK');
  }, [presets]);

  const handleToggleSelect = (id: string, alreadyAdded: boolean) => {
    if (alreadyAdded) return;
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const handleSelectAllStep = (presetsList: GlobalMapelPreset[], select: boolean) => {
    const next = new Set(selectedIds);
    presetsList.forEach(p => {
      if (select) {
        if (!isPresetAlreadyAdded(p)) {
          next.add(p.id);
        }
      } else {
        next.delete(p.id);
      }
    });
    setSelectedIds(next);
  };

  // Submit selections to backend
  const handleSave = async () => {
    if (selectedIds.size === 0) {
      toast.error('Silakan pilih minimal satu mata pelajaran');
      return;
    }

    try {
      setSaving(true);
      const ids = Array.from(selectedIds);
      const res = await initializeMapelPreset(ids);
      if (res.success) {
        queryClient.invalidateQueries({ queryKey: ['mapel-options-list'] });
        queryClient.invalidateQueries({ queryKey: ['beban-guru-list'] });
        queryClient.invalidateQueries({ queryKey: ['academic-stats'] });
        queryClient.invalidateQueries({ queryKey: ['program-keahlian-options-list'] });
        queryClient.invalidateQueries({ queryKey: ['jurusan-options-list'] });
        queryClient.invalidateQueries({ queryKey: ['kurikulum-struktur'] });

        toast.success(res.message || 'Mata pelajaran preset berhasil diterapkan');
        onSuccess();
        onClose();
      } else {
        toast.error(res.message || 'Gagal menerapkan preset');
      }
    } catch (err: any) {
      console.error('Wizard save error:', err);
      toast.error(err.message || 'Terjadi kesalahan saat menyimpan preset');
    } finally {
      setSaving(false);
    }
  };

  // Get final summary lists
  const selectedPresetsList = useMemo(() => {
    const allAvailable = [
      ...presets,
      ...Object.values(vocationalPresets).flat()
    ];
    return allAvailable.filter(p => selectedIds.has(p.id));
  }, [selectedIds, presets, vocationalPresets]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Wizard Gunakan Preset Kurikulum — ${jenjang}`}
      size="5xl"
    >
      <div className="flex flex-col h-[580px]">
        {/* Step Indicator Header (Dynamic based on school type) */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-gray-100 dark:border-gray-800 bg-slate-50/50 dark:bg-slate-900/10">
          {steps.map((item, idx) => (
            <div key={item.categoryType} className="flex items-center gap-2">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold transition-all duration-300 ${
                  stepIndex === idx
                    ? 'bg-blue-600 text-white ring-4 ring-blue-100 dark:ring-blue-900/30'
                    : stepIndex > idx
                    ? 'bg-emerald-500 text-white'
                    : 'bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                }`}
              >
                {stepIndex > idx ? <Check size={12} /> : idx + 1}
              </div>
              <span
                className={`text-xs font-semibold ${
                  stepIndex === idx
                    ? 'text-blue-600 dark:text-blue-400 font-bold'
                    : stepIndex > idx
                    ? 'text-slate-600 dark:text-slate-300'
                    : 'text-slate-400'
                }`}
              >
                {item.label}
              </span>
              {idx < steps.length - 1 && <ChevronRight size={14} className="text-slate-300 dark:text-slate-600 mx-2" />}
            </div>
          ))}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full gap-2 text-slate-400">
              <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
              <p className="text-xs">Memuat katalog preset...</p>
            </div>
          ) : (
            <>
              {/* STEP 1: Mapel Umum */}
              {currentStepType === 'umum' && (
                <div className="space-y-4">
                  <div className="p-3.5 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 rounded-2xl flex items-start gap-3">
                    <BookOpen className="text-blue-600 mt-0.5 flex-shrink-0" size={16} />
                    <p className="text-xs text-blue-700 dark:text-blue-400 leading-relaxed font-medium">
                      Berikut adalah mata pelajaran wajib nasional standar untuk jenjang <strong>{jenjang}</strong>. Ceklis mata pelajaran umum yang diselenggarakan di sekolah Anda.
                    </p>
                  </div>

                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      Daftar Mata Pelajaran Umum ({step1Presets.filter(p => selectedIds.has(p.id)).length} dipilih)
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSelectAllStep(step1Presets, true)}
                        className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        Pilih Semua
                      </button>
                      <span className="text-slate-300">|</span>
                      <button
                        onClick={() => handleSelectAllStep(step1Presets, false)}
                        className="text-[10px] font-bold text-slate-500 hover:underline"
                      >
                        Bersihkan
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto pr-1">
                    {step1Presets.map((p) => {
                      const alreadyAdded = isPresetAlreadyAdded(p);
                      const isChecked = selectedIds.has(p.id) || alreadyAdded;
                      return (
                        <div
                          key={p.id}
                          onClick={() => handleToggleSelect(p.id, alreadyAdded)}
                          className={`flex items-center gap-3 p-3.5 border rounded-2xl transition-all duration-200 hover:shadow-sm ${
                            alreadyAdded
                              ? 'bg-emerald-50/10 border-emerald-300 dark:bg-emerald-950/5 opacity-75 cursor-not-allowed'
                              : isChecked
                                ? 'bg-blue-50/20 border-blue-500 dark:bg-blue-950/10 cursor-pointer'
                                : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 hover:border-slate-300 cursor-pointer'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            disabled={alreadyAdded}
                            onChange={() => {}} // handled by div click
                            className="rounded border-slate-300 dark:border-slate-700 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">{p.nama_mapel}</p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded font-mono font-bold uppercase">{p.kode_mapel}</span>
                              <span className="text-[10px] text-slate-400 font-medium">({p.category})</span>
                            </div>
                          </div>
                          {alreadyAdded && (
                            <span className="text-[9px] bg-emerald-100 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-450 font-black px-1.5 py-0.5 rounded-lg ml-auto">
                              SUDAH ADA
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* STEP 2: Mapel Kejuruan (Hanya tampil untuk SMK/MAK) */}
              {currentStepType === 'kejuruan' && isSmkMak && (
                <div className="space-y-4">
                  <div className="p-3.5 bg-purple-50/30 dark:bg-purple-950/10 border border-purple-100 dark:border-purple-900/30 rounded-2xl flex items-start gap-3">
                    <GraduationCap className="text-purple-600 mt-0.5 flex-shrink-0" size={16} />
                    <p className="text-xs text-purple-700 dark:text-purple-400 font-medium leading-relaxed">
                      Pilih mata pelajaran produktif kejuruan dari jurusan yang terdaftar di sekolah Anda. Klik header jurusan untuk memperluas (expand) daftar mapel.
                    </p>
                  </div>

                  {loadingVocational ? (
                    <div className="flex items-center justify-center py-10 gap-2 text-slate-400">
                      <RefreshCw className="w-5 h-5 animate-spin text-purple-600" />
                      <span className="text-xs">Memuat katalog kejuruan...</span>
                    </div>
                  ) : jurusans.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                      Belum ada jurusan terdaftar. Hubungi Admin Sekolah untuk menambahkan jurusan terlebih dahulu.
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                      {jurusans.map((jur) => {
                        const matchedKey = getMatchedKey(jur);
                        const jurPresets = vocationalPresets[matchedKey] || [];
                        const selectedCount = jurPresets.filter(p => selectedIds.has(p.id)).length;
                        const isOpenPanel = expandedJurusanId === jur.id;

                        return (
                          <div
                            key={jur.id}
                            className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm transition-all duration-200 bg-white dark:bg-slate-950"
                          >
                            {/* Accordion Header */}
                            <div
                              onClick={() => setExpandedJurusanId(isOpenPanel ? null : jur.id)}
                              className={`flex items-center justify-between px-5 py-3.5 cursor-pointer select-none transition-colors ${
                                isOpenPanel 
                                  ? 'bg-purple-50/40 dark:bg-purple-950/10 border-b border-slate-150 dark:border-slate-800' 
                                  : 'hover:bg-slate-50/50 dark:hover:bg-slate-900/10'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <div className={`p-1.5 rounded-lg ${selectedCount > 0 ? 'bg-purple-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                                  <GraduationCap size={15} />
                                </div>
                                <span className="text-xs font-bold text-slate-850 dark:text-slate-200">
                                  {jur.nama} {selectedCount > 0 ? `(${selectedCount})` : ''}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                {selectedCount > 0 && (
                                  <span className="text-[10px] bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 font-bold px-2 py-0.5 rounded-full">
                                    {selectedCount} Terpilih
                                  </span>
                                )}
                                {isOpenPanel ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                              </div>
                            </div>

                            {/* Accordion Body */}
                            {isOpenPanel && (
                              <div className="p-5 bg-slate-50/10 dark:bg-slate-950/5 space-y-4">
                                {jurPresets.length === 0 ? (
                                  <p className="text-xs text-slate-400 italic text-center py-2">
                                    Preset kurikulum belum tersedia untuk kompetensi keahlian ({matchedKey || 'Tidak teridentifikasi'}).
                                  </p>
                                ) : (
                                  <>
                                    <div className="flex justify-between items-center pb-2 border-b border-dashed border-slate-200 dark:border-slate-800">
                                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                        Daftar Mata Pelajaran Produktif
                                      </span>
                                      <div className="flex gap-2 text-[10px] font-bold">
                                        <button onClick={() => handleSelectAllStep(jurPresets, true)} className="text-purple-600 dark:text-purple-400 hover:underline">Pilih Semua</button>
                                        <span className="text-slate-300">|</span>
                                        <button onClick={() => handleSelectAllStep(jurPresets, false)} className="text-slate-500 hover:underline">Bersihkan</button>
                                      </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                      {jurPresets.map((p) => {
                                        const isChecked = selectedIds.has(p.id);
                                        const nameLower = p.nama_mapel.toLowerCase();

                                        let cardColorClass = '';
                                        let badgeLabel = '';
                                        let badgeClass = '';

                                        if (nameLower.includes('praktik kerja lapangan')) {
                                          cardColorClass = isChecked
                                            ? 'bg-emerald-50/30 border-emerald-500 dark:bg-emerald-950/15'
                                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-emerald-300';
                                          badgeLabel = 'PKL Wajib';
                                          badgeClass = 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400';
                                        } else if (nameLower.includes('projek kreatif')) {
                                          cardColorClass = isChecked
                                            ? 'bg-indigo-50/30 border-indigo-500 dark:bg-indigo-950/15'
                                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-indigo-300';
                                          badgeLabel = 'PKK Wajib';
                                          badgeClass = 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400';
                                        } else if (nameLower.includes('dasar-dasar')) {
                                          cardColorClass = isChecked
                                            ? 'bg-amber-50/30 border-amber-500 dark:bg-amber-950/15'
                                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-amber-300';
                                          badgeLabel = 'Dasar Program';
                                          badgeClass = 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400';
                                        } else {
                                          cardColorClass = isChecked
                                            ? 'bg-purple-50/20 border-purple-500 dark:bg-purple-950/10'
                                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-purple-300';
                                          badgeLabel = 'Konsentrasi';
                                          badgeClass = 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400';
                                        }
                                        const alreadyAdded = isPresetAlreadyAdded(p);
                                        const finalChecked = isChecked || alreadyAdded;
                                        return (
                                          <div
                                            key={p.id}
                                            onClick={() => handleToggleSelect(p.id, alreadyAdded)}
                                            className={`flex items-center justify-between p-3.5 border rounded-2xl transition-all duration-200 hover:shadow-sm ${
                                              alreadyAdded
                                                ? 'bg-emerald-50/10 border-emerald-300 dark:bg-emerald-950/5 opacity-75 cursor-not-allowed'
                                                : cardColorClass
                                            }`}
                                          >
                                            <div className="flex items-center gap-3 min-w-0 flex-1">
                                              <input
                                                type="checkbox"
                                                checked={finalChecked}
                                                disabled={alreadyAdded}
                                                onChange={() => {}} // handled by div click
                                                className="rounded border-slate-300 dark:border-slate-700 text-slate-800 focus:ring-slate-500 disabled:opacity-50"
                                              />
                                              <div className="min-w-0">
                                                <p className="text-xs font-semibold text-slate-850 dark:text-slate-200 truncate">{p.nama_mapel}</p>
                                                <div className="flex items-center gap-1.5 mt-0.5">
                                                  <span className="text-[9px] bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded font-mono font-bold uppercase">{p.kode_mapel}</span>
                                                </div>
                                              </div>
                                            </div>
                                            {alreadyAdded ? (
                                              <span className="text-[9px] bg-emerald-100 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-450 font-black px-2 py-0.5 rounded-full flex-shrink-0 ml-2">
                                                SUDAH ADA
                                              </span>
                                            ) : badgeLabel && (
                                              <span className={`text-[9px] font-black px-2 py-0.5 rounded-full flex-shrink-0 ml-2 ${badgeClass}`}>
                                                {badgeLabel}
                                              </span>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* STEP 3: Mapel Pilihan */}
              {currentStepType === 'pilihan' && (
                <div className="space-y-4">
                  <div className="p-3.5 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/30 rounded-2xl flex items-start gap-3">
                    <Compass className="text-indigo-600 mt-0.5 flex-shrink-0" size={16} />
                    <p className="text-xs text-indigo-700 dark:text-indigo-400 leading-relaxed font-medium">
                      {['SD', 'MI', 'SMP', 'MTs'].includes(jenjang?.toUpperCase() || '')
                        ? 'Pilih cabang Seni & Prakarya yang diajarkan di sekolah Anda.'
                        : 'Pilih mata pelajaran pilihan atau kelompok minat yang disediakan oleh sekolah Anda.'}
                    </p>
                  </div>

                  {Object.keys(step3Grouped).length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                      Tidak ada mata pelajaran pilihan atau muatan seni tambahan untuk jenjang {jenjang}.
                    </div>
                  ) : (
                    <div className="space-y-4 max-h-[360px] overflow-y-auto pr-1">
                      {Object.entries(step3Grouped).map(([category, list]) => (
                        <div key={category} className="space-y-2 border-b border-slate-100 dark:border-slate-900 pb-3 last:border-0 last:pb-0">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                              {category === 'PILIHAN_SMK' 
                                ? 'MAPEL PILIHAN KEJURUAN / MINAT' 
                                : category.replace('PILIHAN_', 'RUMPUN ').replace('_', ' ')}
                            </span>
                            <div className="flex gap-2 text-[9px] font-bold">
                              <button onClick={() => handleSelectAllStep(list, true)} className="text-indigo-650 hover:underline">Pilih Semua</button>
                              <span className="text-slate-355">|</span>
                              <button onClick={() => handleSelectAllStep(list, false)} className="text-slate-500 hover:underline">Bersihkan</button>
                            </div>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {list.map((p) => {
                              const alreadyAdded = isPresetAlreadyAdded(p);
                              const isChecked = selectedIds.has(p.id) || alreadyAdded;
                              return (
                                <div
                                  key={p.id}
                                  onClick={() => handleToggleSelect(p.id, alreadyAdded)}
                                  className={`flex items-center gap-3 p-3.5 border rounded-2xl transition-all duration-200 hover:shadow-sm ${
                                    alreadyAdded
                                      ? 'bg-emerald-50/10 border-emerald-300 dark:bg-emerald-950/5 opacity-75 cursor-not-allowed'
                                      : isChecked
                                        ? 'bg-blue-50/20 border-blue-500 dark:bg-blue-950/10 cursor-pointer'
                                        : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 hover:border-slate-300 cursor-pointer'
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    disabled={alreadyAdded}
                                    onChange={() => {}} // handled by div click
                                    className="rounded border-slate-300 dark:border-slate-700 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
                                  />
                                  <div className="min-w-0 flex-1">
                                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">{p.nama_mapel}</p>
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                      <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded font-mono font-bold uppercase">{p.kode_mapel}</span>
                                    </div>
                                  </div>
                                  {alreadyAdded && (
                                    <span className="text-[9px] bg-emerald-100 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-450 font-black px-1.5 py-0.5 rounded-lg ml-auto">
                                      SUDAH ADA
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* STEP 4: Mapel Muatan Lokal */}
              {currentStepType === 'mulok' && (
                <div className="space-y-4">
                  <div className="p-3.5 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 rounded-2xl flex items-start gap-3">
                    <Flag className="text-amber-600 mt-0.5 flex-shrink-0" size={16} />
                    <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed font-medium">
                      Berikut adalah opsi mata pelajaran Muatan Lokal (seperti Bahasa Daerah, Budaya Lokal, dll). Aktifkan jika sekolah Anda menyelenggarakan mata pelajaran ini.
                    </p>
                  </div>

                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      Daftar Muatan Lokal ({step4Presets.filter(p => selectedIds.has(p.id)).length} dipilih)
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSelectAllStep(step4Presets, true)}
                        className="text-[10px] font-bold text-amber-600 dark:text-amber-400 hover:underline"
                      >
                        Pilih Semua
                      </button>
                      <span className="text-slate-300">|</span>
                      <button
                        onClick={() => handleSelectAllStep(step4Presets, false)}
                        className="text-[10px] font-bold text-slate-500 hover:underline"
                      >
                        Bersihkan
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto pr-1">
                    {step4Presets.map((p) => {
                      const alreadyAdded = isPresetAlreadyAdded(p);
                      const isChecked = selectedIds.has(p.id) || alreadyAdded;
                      return (
                        <div
                          key={p.id}
                          onClick={() => handleToggleSelect(p.id, alreadyAdded)}
                          className={`flex items-center gap-3 p-3.5 border rounded-2xl transition-all duration-200 hover:shadow-sm ${
                            alreadyAdded
                              ? 'bg-emerald-50/10 border-emerald-300 dark:bg-emerald-950/5 opacity-75 cursor-not-allowed'
                              : isChecked
                                ? 'bg-blue-50/20 border-blue-500 dark:bg-blue-950/10 cursor-pointer'
                                : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 hover:border-slate-300 cursor-pointer'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            disabled={alreadyAdded}
                            onChange={() => {}} // handled by div click
                            className="rounded border-slate-300 dark:border-slate-700 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">{p.nama_mapel}</p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded font-mono font-bold uppercase">{p.kode_mapel}</span>
                            </div>
                          </div>
                          {alreadyAdded && (
                            <span className="text-[9px] bg-emerald-100 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-450 font-black px-1.5 py-0.5 rounded-lg ml-auto">
                              SUDAH ADA
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* STEP 5: Summary & Confirmation */}
              {currentStepType === 'summary' && (
                <div className="space-y-4">
                  <div className="p-4 bg-emerald-50/50 dark:bg-emerald-950/10 border border-emerald-100 dark:border-emerald-900/30 rounded-2xl flex items-center gap-3">
                    <div className="p-2 bg-emerald-500 text-white rounded-xl shadow-md shadow-emerald-500/20">
                      <Save size={18} />
                    </div>
                    <div>
                      <h5 className="text-xs font-black text-emerald-950 dark:text-emerald-300 uppercase tracking-wider">Konfirmasi Final</h5>
                      <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">
                        Mohon tinjau kembali daftar mata pelajaran yang akan dibuat untuk sekolah Anda. Klik tombol <strong>Simpan & Terapkan</strong> di kanan bawah untuk menyelesaikan.
                      </p>
                    </div>
                  </div>

                  <div className="border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-950 shadow-sm">
                    <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Daftar Mapel Yang Akan Ditambahkan</span>
                      <span className="text-xs font-black bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full">
                        {selectedPresetsList.length} Mapel
                      </span>
                    </div>

                    <div className="max-h-[300px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-900">
                      {selectedPresetsList.length === 0 ? (
                        <div className="p-8 text-center text-xs text-slate-400">
                          Tidak ada mata pelajaran terpilih. Silakan kembali ke langkah sebelumnya.
                        </div>
                      ) : (
                        selectedPresetsList.map((p, idx) => (
                          <div key={p.id || idx} className="px-4 py-2.5 flex items-center justify-between hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">{p.nama_mapel}</p>
                              <span className="text-[9px] text-slate-400 uppercase font-mono font-bold tracking-tight">{p.kode_mapel}</span>
                            </div>
                            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-850 text-slate-500 uppercase tracking-wider">
                              {p.category.replace('PILIHAN_', '').replace('_', ' ')}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 bg-slate-50/30 dark:bg-slate-900/10 flex items-center justify-between flex-shrink-0">
          <Button
            variant="outline"
            onClick={stepIndex === 0 ? onClose : () => setStepIndex((s) => (s - 1) as any)}
            disabled={saving}
            className="rounded-xl px-5 h-10 text-[11px] font-bold"
          >
            {stepIndex === 0 ? 'Tutup' : <><ChevronLeft size={14} className="inline mr-1" />Kembali</>}
          </Button>

          <div className="flex gap-2">
            {stepIndex < steps.length - 1 ? (
              <Button
                variant="primary"
                onClick={() => setStepIndex((s) => (s + 1) as any)}
                disabled={loading}
                className="rounded-xl px-5 h-10 text-[11px] font-bold bg-blue-600 text-white flex items-center gap-1.5"
              >
                Lanjut<ChevronRight size={14} />
              </Button>
            ) : (
              <Button
                variant="primary"
                onClick={handleSave}
                disabled={saving || selectedIds.size === 0}
                className="rounded-xl px-6 h-10 text-[11px] font-black uppercase tracking-wider bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-2 shadow-md shadow-emerald-600/20"
              >
                {saving ? (
                  <><RefreshCw size={14} className="animate-spin" />Memproses...</>
                ) : (
                  <><Save size={14} />Simpan & Terapkan</>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
});
