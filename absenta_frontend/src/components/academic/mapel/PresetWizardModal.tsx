import React, { useState, useEffect, useMemo } from 'react';
import { Modal, Button } from '../../ui';
import { getPresetsByJenjang, initializeMapelPreset, type GlobalMapelPreset } from '../../../api/academic/mapel.api';
import { getJurusanList } from '../../../api/academic/jurusan.api';
import { BookOpen, GraduationCap, ChevronRight, ChevronLeft, Save, RefreshCw, Layers, Check } from 'lucide-react';
import toast from 'react-hot-toast';

interface PresetWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  jenjang: string;
  onSuccess: () => void;
}

export const PresetWizardModal: React.FC<PresetWizardModalProps> = ({
  isOpen,
  onClose,
  jenjang,
  onSuccess
}) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Data presets from DB
  const [presets, setPresets] = useState<GlobalMapelPreset[]>([]);
  const [groupedPresets, setGroupedPresets] = useState<Record<string, GlobalMapelPreset[]>>({});
  
  // Vocational specific data
  const [jurusans, setJurusans] = useState<any[]>([]);
  const [activeJurusanId, setActiveJurusanId] = useState<string>('');
  const [vocationalPresets, setVocationalPresets] = useState<Record<string, GlobalMapelPreset[]>>({});
  const [loadingVocational, setLoadingVocational] = useState(false);

  // Selection states
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const isSmkMak = jenjang === 'SMK' || jenjang === 'MAK';
  const isSmaMa = jenjang === 'SMA' || jenjang === 'MA';
  const isSmpMts = jenjang === 'SMP' || jenjang === 'MTs';

  // Load presets & jurusans
  useEffect(() => {
    if (!isOpen) return;
    
    // Reset state on open
    setStep(1);
    setSelectedIds(new Set());
    
    const loadInitialData = async () => {
      try {
        setLoading(true);
        const res = await getPresetsByJenjang(jenjang);
        if (res.success) {
          setPresets(res.data);
          setGroupedPresets(res.grouped || {});
          
          // Pre-select UMUM & KEAGAMAAN by default in step 1
          const initialSelection = new Set<string>();
          res.data.forEach(p => {
            if (p.category === 'UMUM' || p.category === 'KEAGAMAAN' || p.category === 'UMUM_KELAS10') {
              initialSelection.add(p.id);
            }
          });
          setSelectedIds(initialSelection);
        }

        if (isSmkMak) {
          const jurRes = await getJurusanList(1, 100);
          if (jurRes.success) {
            setJurusans(jurRes.data);
            if (jurRes.data.length > 0) {
              setActiveJurusanId(jurRes.data[0].id);
            }
          }
        }
      } catch (err: any) {
        console.error('Error loading wizard presets:', err);
        toast.error('Gagal memuat preset global mata pelajaran');
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
  }, [isOpen, jenjang, isSmkMak]);

  // Load vocational presets dynamically when activeJurusanId changes
  useEffect(() => {
    if (!isOpen || !isSmkMak || !activeJurusanId) return;
    
    const selectedJur = jurusans.find(j => j.id === activeJurusanId);
    if (!selectedJur) return;

    // Determine target code for preset lookup (e.g. RPL, TKJ)
    const fields = [
      selectedJur.singkatan || '',
      selectedJur.kode || '',
      selectedJur.nama || ''
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

    let matchedKey = '';
    for (const check of checks) {
      if (fields.some(field => check.regex.test(field))) {
        matchedKey = check.key;
        break;
      }
    }

    if (!matchedKey) return;
    if (vocationalPresets[matchedKey]) return; // already loaded

    const loadVocationalPresets = async () => {
      try {
        setLoadingVocational(true);
        const res = await getPresetsByJenjang(matchedKey);
        if (res.success) {
          setVocationalPresets(prev => ({
            ...prev,
            [matchedKey]: res.data.filter(p => p.category === 'KEJURUAN')
          }));
        }
      } catch (err) {
        console.error('Failed to load vocational presets:', err);
      } finally {
        setLoadingVocational(false);
      }
    };

    loadVocationalPresets();
  }, [isOpen, activeJurusanId, isSmkMak, jurusans, vocationalPresets]);

  // Determine current matched key for the active vocational department
  const activeMatchedKey = useMemo(() => {
    if (!isSmkMak || !activeJurusanId) return '';
    const selectedJur = jurusans.find(j => j.id === activeJurusanId);
    if (!selectedJur) return '';
    const fields = [
      selectedJur.singkatan || '',
      selectedJur.kode || '',
      selectedJur.nama || ''
    ].map(f => f.toLowerCase());

    const checks = [
      { key: 'RPL', regex: /rpl/i },
      { key: 'TKJ', regex: /tkj/i },
      { key: 'AKL', regex: /akl/i },
      { key: 'MPLB', regex: /mplb/i },
      { key: 'DKV', regex: /dkv/i },
      { key: 'TBSM', regex: /tbsm/i },
      { key: 'TKR', regex: /tkr/i },
      { key: 'TP', regex: /\btp\b/i },
      { key: 'PH', regex: /\bph\b/i },
      { key: 'KL', regex: /\bkl\b/i },
      { key: 'TB', regex: /\btb\b/i },
      { key: 'TAV', regex: /tav/i },
      { key: 'TOI', regex: /toi/i }
    ];

    for (const check of checks) {
      if (fields.some(field => check.regex.test(field))) return check.key;
    }
    return '';
  }, [activeJurusanId, isSmkMak, jurusans]);

  // Filter Step 1 Presets (Wajib Umum & Keagamaan)
  const step1Presets = useMemo(() => {
    return presets.filter(p => 
      p.category === 'UMUM' || 
      p.category === 'KEAGAMAAN' || 
      p.category === 'UMUM_KELAS10'
    );
  }, [presets]);

  // Filter Step 2 Presets (Pilihan Rumpun/Seni/Prakarya/Mulok)
  const step2Presets = useMemo(() => {
    if (isSmkMak) {
      // Vocational uses its own matching logic
      return vocationalPresets[activeMatchedKey] || [];
    }
    // General schools use group categories
    return presets.filter(p => 
      p.category === 'SENI_PILIHAN' ||
      p.category === 'PRAKARYA_PILIHAN' ||
      p.category.startsWith('PILIHAN_') ||
      p.category === 'MULOK'
    );
  }, [presets, isSmkMak, vocationalPresets, activeMatchedKey]);

  // Group step 2 presets by category/rumpun for SMA/MA/SMP/SD
  const step2Grouped = useMemo(() => {
    if (isSmkMak) return {};
    return step2Presets.reduce((acc: Record<string, GlobalMapelPreset[]>, p) => {
      const cat = p.category;
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(p);
      return acc;
    }, {});
  }, [step2Presets, isSmkMak]);

  const handleToggleSelect = (id: string) => {
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
        next.add(p.id);
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
    // Combine standard presets and vocational presets
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
      size="xl"
    >
      <div className="flex flex-col h-[580px]">
        {/* Step Indicator Header */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-gray-100 dark:border-gray-800 bg-slate-50/50 dark:bg-slate-900/10">
          {[
            { s: 1, label: 'Wajib / Keagamaan' },
            { s: 2, label: isSmkMak ? 'Kejuruan' : 'Mapel Pilihan' },
            { s: 3, label: 'Ringkasan & Terapkan' }
          ].map((item) => (
            <div key={item.s} className="flex items-center gap-2">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold transition-all duration-300 ${
                  step === item.s
                    ? 'bg-blue-600 text-white ring-4 ring-blue-100 dark:ring-blue-900/30'
                    : step > item.s
                    ? 'bg-emerald-500 text-white'
                    : 'bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                }`}
              >
                {step > item.s ? <Check size={12} /> : item.s}
              </div>
              <span
                className={`text-xs font-semibold ${
                  step === item.s
                    ? 'text-blue-600 dark:text-blue-400 font-bold'
                    : step > item.s
                    ? 'text-slate-600 dark:text-slate-300'
                    : 'text-slate-400'
                }`}
              >
                {item.label}
              </span>
              {item.s < 3 && <ChevronRight size={14} className="text-slate-300 dark:text-slate-600 mx-2" />}
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
              {/* STEP 1: Mapel Wajib / Keagamaan */}
              {step === 1 && (
                <div className="space-y-4">
                  <div className="p-3.5 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 rounded-2xl">
                    <p className="text-xs text-blue-700 dark:text-blue-400 leading-relaxed font-medium">
                      Berikut adalah mata pelajaran wajib nasional dan muatan keagamaan standar untuk jenjang <strong>{jenjang}</strong>. Kami merekomendasikan untuk menceklis seluruh mapel ini.
                    </p>
                  </div>

                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      Daftar Mata Pelajaran Wajib ({step1Presets.filter(p => selectedIds.has(p.id)).length} dipilih)
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
                      const isChecked = selectedIds.has(p.id);
                      return (
                        <div
                          key={p.id}
                          onClick={() => handleToggleSelect(p.id)}
                          className={`flex items-center gap-3 p-3.5 border rounded-2xl cursor-pointer transition-all duration-200 hover:shadow-sm ${
                            isChecked
                              ? 'bg-blue-50/20 border-blue-500 dark:bg-blue-950/10'
                              : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}} // handled by div click
                            className="rounded border-slate-300 dark:border-slate-700 text-blue-600 focus:ring-blue-500"
                          />
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">{p.nama_mapel}</p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded font-mono font-bold uppercase">{p.kode_mapel}</span>
                              <span className="text-[10px] text-slate-400 font-medium">({p.category})</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* STEP 2: Mapel Pilihan (Rumpun/Kejuruan/Seni/Prakarya) */}
              {step === 2 && (
                <div className="space-y-4">
                  {/* SMK / MAK Specific View */}
                  {isSmkMak && (
                    <div className="space-y-4">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 bg-purple-50/30 dark:bg-purple-950/10 border border-purple-100 dark:border-purple-900/30 rounded-2xl">
                        <div className="space-y-1">
                          <h5 className="text-xs font-black text-purple-950 dark:text-purple-300 uppercase tracking-wider">Mata Pelajaran Produktif Kejuruan</h5>
                          <p className="text-[11px] text-purple-700 dark:text-purple-400 font-medium leading-relaxed">
                            Pilih jurusan sekolah Anda untuk memuat daftar preset mata pelajaran produktif. Anda dapat memilih dari lebih dari satu jurusan secara bergantian.
                          </p>
                        </div>
                        {jurusans.length > 0 && (
                          <select
                            value={activeJurusanId}
                            onChange={(e) => setActiveJurusanId(e.target.value)}
                            className="w-full sm:w-60 text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 shadow-sm focus:outline-none focus:ring-1 focus:ring-purple-500"
                          >
                            {jurusans.map(j => (
                              <option key={j.id} value={j.id}>{j.nama}</option>
                            ))}
                          </select>
                        )}
                      </div>

                      {loadingVocational ? (
                        <div className="flex items-center justify-center py-10 gap-2 text-slate-400">
                          <RefreshCw className="w-5 h-5 animate-spin text-purple-600" />
                          <span className="text-xs">Memuat mata pelajaran produktif...</span>
                        </div>
                      ) : step2Presets.length === 0 ? (
                        <div className="p-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                          Preset belum tersedia untuk singkatan/nama jurusan ini.
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between pb-1">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                              Mapel Kejuruan Jurusan Terpilih
                            </span>
                            <div className="flex gap-2 text-[10px]">
                              <button onClick={() => handleSelectAllStep(step2Presets, true)} className="text-purple-600 hover:underline font-bold">Pilih Semua</button>
                              <span className="text-slate-300">|</span>
                              <button onClick={() => handleSelectAllStep(step2Presets, false)} className="text-slate-500 hover:underline">Bersihkan</button>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-80 overflow-y-auto pr-1">
                            {step2Presets.map((p) => {
                              const isChecked = selectedIds.has(p.id);
                              return (
                                <div
                                  key={p.id}
                                  onClick={() => handleToggleSelect(p.id)}
                                  className={`flex items-center gap-3 p-3.5 border rounded-2xl cursor-pointer transition-all duration-200 hover:shadow-sm ${
                                    isChecked
                                      ? 'bg-purple-50/20 border-purple-500 dark:bg-purple-950/10'
                                      : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => {}} // handled by click
                                    className="rounded border-slate-300 dark:border-slate-700 text-purple-600 focus:ring-purple-500"
                                  />
                                  <div className="min-w-0">
                                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">{p.nama_mapel}</p>
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                      <span className="text-[9px] bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded font-mono font-bold uppercase">{p.kode_mapel}</span>
                                      <span className="text-[9px] text-slate-400 font-medium">({activeMatchedKey})</span>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* SMA / MA & SMP / SD Specific Grouped View */}
                  {!isSmkMak && (
                    <div className="space-y-5">
                      <div className="p-3.5 bg-slate-50/60 dark:bg-slate-900/30 border border-slate-200 dark:border-slate-800 rounded-2xl">
                        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                          Pilih mata pelajaran pilihan, kelompok rumpun minat, seni, prakarya, maupun muatan lokal yang diselenggarakan di sekolah Anda.
                        </p>
                      </div>

                      {Object.keys(step2Grouped).length === 0 ? (
                        <div className="p-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                          Tidak ada mata pelajaran pilihan atau muatan seni tambahan untuk jenjang ini. Anda dapat melewati langkah ini.
                        </div>
                      ) : (
                        <div className="space-y-4 max-h-[340px] overflow-y-auto pr-1">
                          {Object.entries(step2Grouped).map(([category, list]) => (
                            <div key={category} className="space-y-2 border-b border-slate-50 dark:border-slate-900 pb-3 last:border-0 last:pb-0">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                  {category.replace('PILIHAN_', 'RUMPUN ').replace('_', ' ')}
                                </span>
                                <div className="flex gap-2 text-[9px]">
                                  <button onClick={() => handleSelectAllStep(list, true)} className="text-blue-600 hover:underline font-bold">Pilih Semua</button>
                                  <span className="text-slate-300">|</span>
                                  <button onClick={() => handleSelectAllStep(list, false)} className="text-slate-500 hover:underline">Bersihkan</button>
                                </div>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                {list.map((p) => {
                                  const isChecked = selectedIds.has(p.id);
                                  return (
                                    <div
                                      key={p.id}
                                      onClick={() => handleToggleSelect(p.id)}
                                      className={`flex items-center gap-2.5 p-2.5 border rounded-xl cursor-pointer transition-all duration-150 ${
                                        isChecked
                                          ? 'bg-blue-50/10 border-blue-400 dark:bg-blue-950/10'
                                          : 'bg-white dark:bg-slate-950 border-slate-100 dark:border-slate-900 hover:border-slate-200'
                                      }`}
                                    >
                                      <input
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={() => {}}
                                        className="rounded border-slate-300 dark:border-slate-800 text-blue-600 focus:ring-blue-500"
                                      />
                                      <div className="min-w-0">
                                        <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 truncate">{p.nama_mapel}</p>
                                        <span className="text-[8px] bg-slate-50 dark:bg-slate-900 text-slate-400 px-1 py-0.5 rounded font-mono font-bold uppercase">{p.kode_mapel}</span>
                                      </div>
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
                </div>
              )}

              {/* STEP 3: Summary & Confirmation */}
              {step === 3 && (
                <div className="space-y-4">
                  <div className="p-4 bg-emerald-50/50 dark:bg-emerald-950/10 border border-emerald-100 dark:border-emerald-900/30 rounded-2xl flex items-center gap-3">
                    <div className="p-2 bg-emerald-500 text-white rounded-xl shadow-md shadow-emerald-500/20">
                      <Save size={18} />
                    </div>
                    <div>
                      <h5 className="text-xs font-black text-emerald-950 dark:text-emerald-300 uppercase tracking-wider">Konfirmasi Final</h5>
                      <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">
                        Mohon tinjau kembali daftar mata pelajaran yang akan dibuat untuk sekolah Anda. Klik tombol <strong>Simpan</strong> di kanan bawah untuk menyelesaikan.
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
            onClick={step === 1 ? onClose : () => setStep((s) => (s - 1) as any)}
            disabled={saving}
            className="rounded-xl px-5 h-10 text-[11px] font-bold"
          >
            {step === 1 ? 'Tutup' : <><ChevronLeft size={14} className="inline mr-1" />Kembali</>}
          </Button>

          <div className="flex gap-2">
            {step < 3 ? (
              <Button
                variant="primary"
                onClick={() => setStep((s) => (s + 1) as any)}
                disabled={loading || selectedIds.size === 0}
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
};
