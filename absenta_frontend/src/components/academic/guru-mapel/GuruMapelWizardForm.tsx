import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Save, X, RefreshCw, Layers, Search, CheckSquare, Square, ChevronLeft, ChevronRight, BookOpen, Users, HelpCircle, Check, AlertCircle } from 'lucide-react';
import { Button, Alert, ModalFooter, Modal } from '../../ui';
import { getGuruList } from '../../../api/academic/guru.api';
import { getMapelList } from '../../../api/academic/mapel.api';
import { listGuruMapel, assignGuruMapel, removeGuruMapel } from '../../../api/kurikulum/guru-mapel.api';
import type { Guru, Mapel, GuruMapel } from '../../../types/academic';
import toast from 'react-hot-toast';

interface GuruMapelWizardFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export const GuruMapelWizardForm: React.FC<GuruMapelWizardFormProps> = React.memo(({
  onSuccess,
  onCancel
}) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Core Data Options
  const [gurus, setGurus] = useState<Guru[]>([]);
  const [mapels, setMapels] = useState<Mapel[]>([]);
  const [existingAssignments, setExistingAssignments] = useState<GuruMapel[]>([]);
  const [allAssignments, setAllAssignments] = useState<GuruMapel[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(true);

  // Selections
  const [selectedMapelId, setSelectedMapelId] = useState<string>('');
  const [selectedGuruIds, setSelectedGuruIds] = useState<string[]>([]);
  const [inspectMapelId, setInspectMapelId] = useState<string | null>(null);
  const [inspectGuruId, setInspectGuruId] = useState<string | null>(null);

  // Load initial option list
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoadingInitial(true);
        const [gurusRes, mapelsRes, assignmentsRes] = await Promise.all([
          getGuruList(1, 1000, ''),
          getMapelList(1, 1000, ''),
          listGuruMapel({})
        ]);
        setGurus(gurusRes.data || []);
        setMapels(mapelsRes.data || []);
        setAllAssignments(assignmentsRes.data || []);
      } catch (err: any) {
        console.error('Failed to load initial data for wizard:', err);
        setSubmitError('Gagal mengambil data referensi guru/mapel.');
      } finally {
        setLoadingInitial(false);
      }
    };
    loadData();
  }, []);

  // Selected Mapel Object Helper
  const selectedMapel = useMemo(() => {
    return mapels.find(m => m.id === selectedMapelId);
  }, [mapels, selectedMapelId]);

  // Compute number of teachers mapped to each mapel
  const mapelTeacherCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    allAssignments.forEach(item => {
      if (item.mapel_id && item.guru_id) {
        counts[item.mapel_id] = (counts[item.mapel_id] || 0) + 1;
      }
    });
    return counts;
  }, [allAssignments]);

  // Compute number of subjects mapped to each guru
  const guruMapelCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    allAssignments.forEach(item => {
      if (item.guru_id && item.mapel_id) {
        counts[item.guru_id] = (counts[item.guru_id] || 0) + 1;
      }
    });
    return counts;
  }, [allAssignments]);

  // Load existing assignments when Mapel changes
  useEffect(() => {
    if (!selectedMapelId) {
      setExistingAssignments([]);
      setSelectedGuruIds([]);
      return;
    }

    const loadAssignments = async () => {
      try {
        setLoading(true);
        const res = await listGuruMapel({ mapel_id: selectedMapelId });
        if (res.success && res.data) {
          setExistingAssignments(res.data);
          // Set initial checked teachers from database
          const activeGurus = res.data.map(item => item.guru_id).filter(Boolean);
          setSelectedGuruIds(activeGurus);
        }
      } catch (err) {
        console.error('Failed to load existing assignments:', err);
      } finally {
        setLoading(false);
      }
    };
    loadAssignments();
  }, [selectedMapelId]);

  // Filters for Step 1 (Mata Pelajaran)
  const filteredMapels = useMemo(() => {
    if (!searchQuery.trim()) return mapels;
    const query = searchQuery.toLowerCase();
    return mapels.filter(m =>
      m.nama_mapel.toLowerCase().includes(query) ||
      (m.kode_mapel && m.kode_mapel.toLowerCase().includes(query))
    );
  }, [mapels, searchQuery]);

  // Filters for Step 2 (Guru)
  const filteredGurus = useMemo(() => {
    if (!searchQuery.trim()) return gurus;
    const query = searchQuery.toLowerCase();
    return gurus.filter(g =>
      g.nama_guru.toLowerCase().includes(query) ||
      (g.nip && g.nip.toLowerCase().includes(query))
    );
  }, [gurus, searchQuery]);

  // Compare to see changes for Step 3 (Summary)
  const diffData = useMemo(() => {
    const originalGuruIds = existingAssignments.map(a => a.guru_id);
    
    // Added: selected ids that were not in original
    const addedIds = selectedGuruIds.filter(id => !originalGuruIds.includes(id));
    
    // Removed: original ids that are not in selected
    const removedIds = originalGuruIds.filter(id => !selectedGuruIds.includes(id));

    const addedGurus = gurus.filter(g => addedIds.includes(g.id));
    const removedAssignments = existingAssignments.filter(a => removedIds.includes(a.guru_id));

    return {
      addedGurus,
      removedAssignments,
      hasChanges: addedGurus.length > 0 || removedAssignments.length > 0
    };
  }, [existingAssignments, selectedGuruIds, gurus]);

  // Selection Toggles
  const handleSelectMapel = (id: string) => {
    setSelectedMapelId(id);
    setSearchQuery('');
    setStep(2);
  };

  const toggleGuru = (id: string) => {
    setSelectedGuruIds(prev =>
      prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id]
    );
  };

  const selectAllGurus = () => {
    const filteredIds = filteredGurus.map(g => g.id);
    setSelectedGuruIds(prev => {
      const allSelected = filteredIds.every(id => prev.includes(id));
      if (allSelected) {
        // Uncheck all in current filtered list
        return prev.filter(id => !filteredIds.includes(id));
      } else {
        // Check all in current filtered list (union)
        return Array.from(new Set([...prev, ...filteredIds]));
      }
    });
  };

  const isAllFilteredSelected = useMemo(() => {
    if (filteredGurus.length === 0) return false;
    const filteredIds = filteredGurus.map(g => g.id);
    return filteredIds.every(id => selectedGuruIds.includes(id));
  }, [filteredGurus, selectedGuruIds]);

  // Bulk Save Logic
  const handleSave = async () => {
    const { addedGurus, removedAssignments, hasChanges } = diffData;
    if (!hasChanges) {
      toast('Tidak ada perubahan penugasan untuk disimpan', { icon: 'ℹ️' });
      return;
    }

    try {
      setSaving(true);
      setSubmitError('');

      // 1. Process Deletions
      if (removedAssignments.length > 0) {
        await Promise.all(removedAssignments.map(a => removeGuruMapel(a.id)));
      }

      // 2. Process Additions
      if (addedGurus.length > 0) {
        await Promise.all(addedGurus.map(g => assignGuruMapel({
          guru_id: g.id,
          mapel_id: selectedMapelId
        })));
      }

      toast.success('Pembaruan penugasan mengajar berhasil disimpan');
      onSuccess?.();
    } catch (err: any) {
      console.error('Error saving assignments wizard:', err);
      setSubmitError(err.response?.data?.message || err.message || 'Gagal menyimpan perubahan penugasan.');
    } finally {
      setSaving(false);
    }
  };

  if (loadingInitial) {
    return (
      <div className="flex flex-col justify-center items-center py-16 gap-3">
        <RefreshCw size={28} className="animate-spin text-indigo-600" />
        <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Memuat Referensi Akademik...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {submitError && (
        <Alert variant="destructive">
          {submitError}
        </Alert>
      )}

      {/* Step Indicator */}
      <div className="flex items-center justify-between px-1 mb-2 bg-slate-50 dark:bg-slate-900/40 p-3 rounded-2xl border border-slate-100 dark:border-slate-800/80 overflow-x-auto gap-2">
        <div className="flex items-center gap-1.5 shrink-0">
          <span className={`flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-black ${step === 1 ? 'bg-indigo-600 text-white' : 'bg-emerald-500 text-white'}`}>
            {step === 1 ? '1' : '✓'}
          </span>
          <span className={`text-[10px] font-black uppercase tracking-tight ${step === 1 ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-555'}`}>
            1. Mata Pelajaran
          </span>
        </div>
        <div className="h-0.5 bg-slate-200 dark:bg-slate-800 flex-1 min-w-[15px]"></div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className={`flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-black ${step === 2 ? 'bg-indigo-600 text-white' : step > 2 ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-655 dark:bg-slate-800 dark:text-slate-455'}`}>
            {step > 2 ? '✓' : '2'}
          </span>
          <span className={`text-[10px] font-black uppercase tracking-tight ${step === 2 ? 'text-indigo-600 dark:text-indigo-400' : step > 2 ? 'text-slate-555' : 'text-slate-400 dark:text-slate-500'}`}>
            2. Guru Pengampu
          </span>
        </div>
        <div className="h-0.5 bg-slate-200 dark:bg-slate-800 flex-1 min-w-[15px]"></div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className={`flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-black ${step === 3 ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-655 dark:bg-slate-800 dark:text-slate-455'}`}>
            3
          </span>
          <span className={`text-[10px] font-black uppercase tracking-tight ${step === 3 ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500'}`}>
            3. Ringkasan
          </span>
        </div>
      </div>

      {/* Step 1: Select Mapel */}
      {step === 1 && (
        <>

          <div className="relative">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama mata pelajaran atau kode..."
              className="w-full pl-10 pr-4 h-10 text-[12px] font-semibold border-2 border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 scrollbar-thin flex flex-col">
            {filteredMapels.map(m => {
              const isSelected = selectedMapelId === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => handleSelectMapel(m.id)}
                  className={`flex items-center text-left p-3.5 rounded-xl border transition-all group ${
                    isSelected
                      ? 'border-indigo-500 bg-indigo-50/10 dark:bg-indigo-950/10 shadow-sm'
                      : 'border-slate-100 dark:border-slate-800/50 hover:border-slate-200 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="min-w-0 flex-1 flex items-center justify-between">
                    <div className="space-y-0.5">
                      <h6 className="text-[12px] font-bold text-slate-800 dark:text-slate-200 leading-tight">
                        {m.nama_mapel}
                      </h6>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className={`text-[9px] font-bold uppercase tracking-wider ${
                          mapelTeacherCounts[m.id] 
                            ? 'text-emerald-600 dark:text-emerald-400' 
                            : 'text-amber-600 dark:text-amber-500'
                        }`}>
                          {mapelTeacherCounts[m.id] ? `Dipetakan ke ${mapelTeacherCounts[m.id]} Guru` : 'Belum dipetakan ke Guru'}
                        </p>
                        {!!mapelTeacherCounts[m.id] && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setInspectMapelId(m.id);
                            }}
                            className="text-[9px] font-extrabold text-indigo-600 dark:text-indigo-400 hover:underline px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/45 cursor-pointer shrink-0 transition-all hover:scale-105 active:scale-95"
                          >
                            Lihat Guru
                          </button>
                        )}
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </button>
              );
            })}

            {filteredMapels.length === 0 && (
              <div className="text-center py-8 text-slate-400 text-[11px] font-semibold">
                Tidak ada mata pelajaran yang cocok dengan pencarian Anda.
              </div>
            )}
          </div>
        </>
      )}

      {/* Step 2: Select Guru */}
      {step === 2 && (
        <>

          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nama guru..."
                className="w-full pl-10 pr-4 h-10 text-[12px] font-semibold border-2 border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
            <Button
              type="button"
              variant="toolbarOutline"
              onClick={selectAllGurus}
              className="h-10 text-xs shrink-0 rounded-xl px-4"
            >
              {isAllFilteredSelected ? 'Batalkan Semua' : 'Centang Semua'}
            </Button>
          </div>

          {loading ? (
            <div className="flex flex-col justify-center items-center py-10 gap-2">
              <RefreshCw size={20} className="animate-spin text-indigo-600" />
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Memuat Penugasan Aktif...</span>
            </div>
          ) : (
            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 scrollbar-thin flex flex-col">
              {filteredGurus.map(g => {
                const isChecked = selectedGuruIds.includes(g.id);
                return (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => toggleGuru(g.id)}
                    className={`flex items-center text-left p-3.5 rounded-xl border transition-all group ${
                      isChecked
                        ? 'border-indigo-500 bg-indigo-50/10 dark:bg-indigo-950/10 shadow-sm'
                        : 'border-slate-100 dark:border-slate-800/50 hover:border-slate-200 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className="mr-3">
                      {isChecked ? (
                        <CheckSquare className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                      ) : (
                        <Square className="w-5 h-5 text-slate-300 dark:text-slate-700 group-hover:text-slate-400" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1 flex items-center justify-between">
                      <div className="space-y-0.5">
                        <h6 className="text-[12px] font-bold text-slate-800 dark:text-slate-200 leading-tight">
                          {g.nama_guru}
                        </h6>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[9px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">
                            NIP: {g.nip || 'Belum Ada NIP'}
                          </span>
                          <span className="text-slate-300 dark:text-slate-700">|</span>
                          <span className={`text-[9px] font-bold uppercase tracking-wider ${
                            guruMapelCounts[g.id]
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-amber-600 dark:text-amber-500'
                          }`}>
                            {guruMapelCounts[g.id] ? `Dipetakan ke ${guruMapelCounts[g.id]} Mapel` : 'Belum dipetakan ke Mapel'}
                          </span>
                          {!!guruMapelCounts[g.id] && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setInspectGuruId(g.id);
                              }}
                              className="text-[9px] font-extrabold text-indigo-600 dark:text-indigo-400 hover:underline px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/45 cursor-pointer shrink-0 transition-all hover:scale-105 active:scale-95"
                            >
                              Lihat Mapel
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}

              {filteredGurus.length === 0 && (
                <div className="text-center py-8 text-slate-400 text-[11px] font-semibold">
                  Tidak ada guru yang cocok dengan pencarian Anda.
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Step 3: Summary & Confirm */}
      {step === 3 && (
        <>
          <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800/80 rounded-2xl p-4 flex items-start gap-4">
            <div className="bg-indigo-100 dark:bg-indigo-900/40 p-2 rounded-xl text-indigo-600 dark:text-indigo-400 mt-0.5">
              <Check size={20} />
            </div>
            <div className="flex-1 space-y-1">
              <h4 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-tight">
                Langkah 3: Tinjau Perubahan
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                Tinjau kembali perubahan penugasan mengajar untuk mata pelajaran <strong className="text-indigo-600 dark:text-indigo-400">{selectedMapel?.nama_mapel}</strong> sebelum menyimpannya ke database.
              </p>
            </div>
          </div>

          <div className="border border-slate-100 dark:border-slate-800 rounded-2xl p-4 space-y-4 bg-white dark:bg-slate-950 shadow-sm">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Mata Pelajaran</span>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{selectedMapel?.nama_mapel}</span>
            </div>

            <div className="space-y-3">
              <h5 className="text-[10px] font-black uppercase tracking-wider text-slate-400">Ringkasan Perubahan:</h5>

              {/* Added list */}
              {diffData.addedGurus.length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                    <Check size={14} />
                    <span>Ditambahkan ({diffData.addedGurus.length} Guru)</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 pl-5">
                    {diffData.addedGurus.map(g => (
                      <span key={g.id} className="text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-900/30 px-2 py-0.5 rounded-lg">
                        {g.nama_guru}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Removed list */}
              {diffData.removedAssignments.length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400">
                    <X size={14} />
                    <span>Dihapus ({diffData.removedAssignments.length} Guru)</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 pl-5">
                    {diffData.removedAssignments.map(a => (
                      <span key={a.id} className="text-[10px] font-bold bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-100 dark:border-rose-900/30 px-2 py-0.5 rounded-lg">
                        {a.Guru?.nama_guru}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* No changes */}
              {!diffData.hasChanges && (
                <div className="p-4 bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 rounded-xl flex items-center gap-3 text-slate-500">
                  <AlertCircle size={16} />
                  <span className="text-[11px] font-bold">Tidak ada perubahan terdeteksi dari data awal di database.</span>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Footer Navigation */}
      <ModalFooter className="pt-4 border-t border-slate-100 dark:border-slate-800 gap-3">
        {step === 1 ? (
          <Button
            type="button"
            variant="toolbarOutline"
            size="toolbar"
            onClick={onCancel}
            disabled={saving}
          >
            <X className="w-3.5 h-3.5 mr-2" />
            Batalkan
          </Button>
        ) : (
          <Button
            type="button"
            variant="toolbarOutline"
            size="toolbar"
            onClick={() => {
              setStep(prev => (prev - 1) as 1 | 2 | 3);
              setSearchQuery('');
            }}
            disabled={saving}
          >
            <ChevronLeft className="w-3.5 h-3.5 mr-2" />
            Kembali
          </Button>
        )}

        {step < 3 ? (
          <Button
            type="button"
            variant="toolbarPrimary"
            size="toolbar"
            onClick={() => {
              if (step === 1 && !selectedMapelId) {
                toast.error('Silakan pilih mata pelajaran terlebih dahulu.');
                return;
              }
              setStep(prev => (prev + 1) as 1 | 2 | 3);
              setSearchQuery('');
            }}
            disabled={step === 1 && !selectedMapelId}
            className="px-8 ml-auto"
          >
            Lanjutkan
            <ChevronRight className="w-3.5 h-3.5 ml-2" />
          </Button>
        ) : (
          <Button
            type="button"
            variant="toolbarPrimary"
            size="toolbar"
            onClick={handleSave}
            disabled={saving || !diffData.hasChanges}
            className="px-8 ml-auto"
          >
            {saving ? (
              <RefreshCw size={14} className="mr-2 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5 mr-2" />
            )}
            Simpan Perubahan
          </Button>
        )}
      </ModalFooter>

      {inspectMapelId && (
        <Modal
          isOpen={true}
          onClose={() => setInspectMapelId(null)}
          title={`Guru Pengampu: ${mapels.find(m => m.id === inspectMapelId)?.nama_mapel || ''}`}
          size="sm"
        >
          <div className="p-4 space-y-3">
            <p className="text-[11px] text-slate-550 dark:text-slate-455">
              Berikut adalah daftar guru yang ditugaskan mengampu mata pelajaran ini:
            </p>
            <div className="space-y-1.5 max-h-[200px] overflow-y-auto pr-1">
              {allAssignments
                .filter(item => item.mapel_id === inspectMapelId)
                .map(item => {
                  const teacher = gurus.find(g => g.id === item.guru_id);
                  return (
                    <div key={item.id} className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></div>
                      <span className="text-[12px] font-bold text-slate-800 dark:text-slate-200">
                        {teacher ? teacher.nama_guru : 'Guru tidak ditemukan'}
                      </span>
                    </div>
                  );
                })}
            </div>
            <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
              <Button
                variant="primary"
                onClick={() => setInspectMapelId(null)}
                className="rounded-xl px-4 text-xs font-bold"
              >
                Tutup
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {inspectGuruId && (
        <Modal
          isOpen={true}
          onClose={() => setInspectGuruId(null)}
          title={`Mata Pelajaran: ${gurus.find(g => g.id === inspectGuruId)?.nama_guru || ''}`}
          size="sm"
        >
          <div className="p-4 space-y-3">
            <p className="text-[11px] text-slate-550 dark:text-slate-455">
              Berikut adalah daftar mata pelajaran yang diampu oleh guru ini:
            </p>
            <div className="space-y-1.5 max-h-[200px] overflow-y-auto pr-1">
              {allAssignments
                .filter(item => item.guru_id === inspectGuruId)
                .map(item => {
                  const subject = mapels.find(m => m.id === item.mapel_id);
                  return (
                    <div key={item.id} className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800">
                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0"></div>
                      <span className="text-[12px] font-bold text-slate-800 dark:text-slate-200">
                        {subject ? `${subject.nama_mapel} (${subject.kode_mapel || '-'})` : 'Mata pelajaran tidak ditemukan'}
                      </span>
                    </div>
                  );
                })}
            </div>
            <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
              <Button
                variant="primary"
                onClick={() => setInspectGuruId(null)}
                className="rounded-xl px-4 text-xs font-bold"
              >
                Tutup
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
});

GuruMapelWizardForm.displayName = 'GuruMapelWizardForm';
export default GuruMapelWizardForm;
