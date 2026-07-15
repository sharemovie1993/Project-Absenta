import React, { useState, useMemo, useEffect } from 'react';
import { Save, X, RefreshCw, Layers, Search, CheckSquare, Square, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button, Alert, ModalFooter } from '../../ui';
import { SMK_PRESETS } from '../../../constants/smk-presets';
import { bulkWizardCreateJurusan } from '../../../api/academic/jurusan.api';
import { getGlobalPresets, type GlobalProgramPreset } from '../../../api/academic/jurusan-presets.api';
import toast from 'react-hot-toast';

interface JurusanWizardFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export const JurusanWizardForm: React.FC<JurusanWizardFormProps> = React.memo(({
  onSuccess,
  onCancel
}) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Loaded presets from database
  const [programPresets, setProgramPresets] = useState<GlobalProgramPreset[]>([]);
  const [loadingPresets, setLoadingPresets] = useState(true);

  // Step 1: Selected Bidang Keahlian names
  const [selectedBidangs, setSelectedBidangs] = useState<string[]>([]);

  // Step 2: Selected Jurusan codes
  const [selectedJurusanCodes, setSelectedJurusanCodes] = useState<string[]>([]);

  // Fetch presets on mount
  useEffect(() => {
    const loadPresets = async () => {
      try {
        setLoadingPresets(true);
        const res = await getGlobalPresets();
        if (res.success && res.data && res.data.length > 0) {
          setProgramPresets(res.data);
        } else {
          // Fallback to static presets if API returns empty
          setProgramPresets(SMK_PRESETS as any);
        }
      } catch (err) {
        console.error('Failed to load global presets:', err);
        // Fallback to static presets if API fails
        setProgramPresets(SMK_PRESETS as any);
      } finally {
        setLoadingPresets(false);
      }
    };
    loadPresets();
  }, []);

  // Unique Bidang Keahlian list from loaded presets
  const bidangKeahlians = useMemo(() => {
    const bids = programPresets.map(p => p.bidang_keahlian);
    return Array.from(new Set(bids)).filter(Boolean);
  }, [programPresets]);

  // Toggle Bidang Keahlian selection (Step 1)
  const toggleBidang = (name: string) => {
    setSelectedBidangs(prev =>
      prev.includes(name) ? prev.filter(b => b !== name) : [...prev, name]
    );
  };

  // Toggle Jurusan selection (Step 2)
  const toggleJurusan = (code: string) => {
    setSelectedJurusanCodes(prev =>
      prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]
    );
  };

  // Filter Bidang Keahlian based on search query (Step 1)
  const filteredBidangs = useMemo(() => {
    if (!searchQuery.trim()) return bidangKeahlians;
    const query = searchQuery.toLowerCase();
    return bidangKeahlians.filter(bid => bid.toLowerCase().includes(query));
  }, [bidangKeahlians, searchQuery]);

  // Filter programs and their jurusans based on selected Bidang Keahlian and search query (Step 2)
  const step2Data = useMemo(() => {
    const selectedProgs = programPresets.filter(p => selectedBidangs.includes(p.bidang_keahlian));
    if (!searchQuery.trim()) return selectedProgs;

    const query = searchQuery.toLowerCase();
    return selectedProgs.map(prog => {
      const filteredJurusans = prog.jurusans.filter(j =>
        j.nama.toLowerCase().includes(query) ||
        j.singkatan.toLowerCase().includes(query) ||
        j.kode.toLowerCase().includes(query)
      );

      if (filteredJurusans.length > 0) {
        return {
          ...prog,
          jurusans: filteredJurusans
        };
      }
      return null;
    }).filter((p): p is typeof programPresets[0] => p !== null);
  }, [programPresets, selectedBidangs, searchQuery]);

  // Proceed to step 2 and pre-select all jurusans under chosen Bidang Keahlian
  const handleNextStep = () => {
    if (selectedBidangs.length === 0) return;

    // Pre-populate jurusans under selected Bidang Keahlian
    const initialJurusans: string[] = [];
    const selectedProgs = programPresets.filter(p => selectedBidangs.includes(p.bidang_keahlian));
    selectedProgs.forEach(prog => {
      prog.jurusans.forEach(j => {
        initialJurusans.push(j.kode);
      });
    });

    setSelectedJurusanCodes(initialJurusans);
    setSearchQuery('');
    setStep(2);
  };

  // Go back to step 1
  const handlePrevStep = () => {
    setSearchQuery('');
    setStep(1);
  };

  // Select/Deselect all jurusans under a specific program in Step 2
  const toggleAllJurusansForProgram = (programKode: string, selectAll: boolean) => {
    const prog = programPresets.find(p => p.kode === programKode);
    if (!prog) return;
    const jurKodes = prog.jurusans.map(j => j.kode);

    if (selectAll) {
      setSelectedJurusanCodes(prev => [...new Set([...prev, ...jurKodes])]);
    } else {
      setSelectedJurusanCodes(prev => prev.filter(c => !jurKodes.includes(c)));
    }
  };

  // Save changes
  const handleSave = async () => {
    if (selectedJurusanCodes.length === 0) {
      setSubmitError('Pilih setidaknya satu Konsentrasi Keahlian (Jurusan) untuk disimpan.');
      return;
    }

    try {
      setLoading(true);
      setSubmitError('');

      // Build payload for chosen programs and jurusans
      const selectedProgramsMap = new Map<string, typeof programPresets[0]>();
      const payloadJurusans: Array<{ nama: string; kode: string; singkatan: string; program_keahlian_kode: string }> = [];

      programPresets.forEach(prog => {
        let hasSelectedJurusan = false;
        prog.jurusans.forEach(j => {
          if (selectedJurusanCodes.includes(j.kode)) {
            hasSelectedJurusan = true;
            payloadJurusans.push({
              nama: j.nama,
              kode: j.kode,
              singkatan: j.singkatan,
              program_keahlian_kode: prog.kode
            });
          }
        });

        if (hasSelectedJurusan) {
          selectedProgramsMap.set(prog.kode, prog);
        }
      });

      const payloadPrograms = Array.from(selectedProgramsMap.values()).map(p => ({
        nama: p.nama,
        kode: p.kode,
        singkatan: p.singkatan,
        bidang_keahlian: p.bidang_keahlian
      }));

      const response = await bulkWizardCreateJurusan({
        programs: payloadPrograms,
        jurusans: payloadJurusans
      });

      if (response.success) {
        toast.success('Berhasil menambahkan Program & Konsentrasi Keahlian secara massal.');
        onSuccess?.();
      } else {
        setSubmitError(response.message || 'Gagal menyimpan data massal.');
      }
    } catch (err: any) {
      console.error('Error in wizard bulk save:', err);
      setSubmitError(err.response?.data?.message || err.message || 'Terjadi kesalahan saat menyimpan data.');
    } finally {
      setLoading(false);
    }
  };

  if (loadingPresets) {
    return (
      <div className="flex flex-col justify-center items-center py-16 gap-3">
        <RefreshCw size={28} className="animate-spin text-violet-600" />
        <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Memuat Preset Global...</span>
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
      <div className="flex items-center justify-between px-1 mb-2 bg-slate-50 dark:bg-slate-900/40 p-3 rounded-2xl border border-slate-100 dark:border-slate-800/80">
        <div className="flex items-center gap-2">
          <span className={`flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-black ${step === 1 ? 'bg-violet-600 text-white' : 'bg-emerald-500 text-white'}`}>
            {step === 1 ? '1' : '✓'}
          </span>
          <span className={`text-[11px] font-black uppercase tracking-tight ${step === 1 ? 'text-violet-600 dark:text-violet-400' : 'text-slate-500'}`}>
            1. Bidang Keahlian
          </span>
        </div>
        <div className="h-0.5 bg-slate-200 dark:bg-slate-800 flex-1 mx-4"></div>
        <div className="flex items-center gap-2">
          <span className={`flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-black ${step === 2 ? 'bg-violet-600 text-white' : 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400'}`}>
            2
          </span>
          <span className={`text-[11px] font-black uppercase tracking-tight ${step === 2 ? 'text-violet-600 dark:text-violet-400' : 'text-slate-400 dark:text-slate-500'}`}>
            2. Konsentrasi Keahlian (Jurusan)
          </span>
        </div>
      </div>

      {/* Step 1 View */}
      {step === 1 && (
        <>
          {/* Info Card */}
          <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800/80 rounded-2xl p-4 flex items-start gap-4">
            <div className="bg-violet-100 dark:bg-violet-900/40 p-2 rounded-xl text-violet-600 dark:text-violet-400 mt-0.5">
              <Layers size={20} />
            </div>
            <div className="flex-1 space-y-1">
              <h4 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-tight">
                Langkah 1: Pilih Bidang Keahlian
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                Tentukan Bidang Keahlian yang ada di sekolah Anda. Di langkah berikutnya, Anda akan memfilter spesifik Konsentrasi/Jurusan di bawah bidang tersebut.
              </p>
            </div>
          </div>

          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama bidang keahlian..."
              className="w-full pl-10 pr-4 h-10 text-[12px] font-semibold border-2 border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-200 focus:outline-none focus:border-violet-500 transition-colors"
            />
          </div>

          {/* Bidang Keahlian List */}
          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 scrollbar-thin flex flex-col">
            {filteredBidangs.map(bid => {
              const isSelected = selectedBidangs.includes(bid);
              return (
                <button
                  key={bid}
                  type="button"
                  onClick={() => toggleBidang(bid)}
                  className={`flex items-center text-left p-3.5 rounded-xl border transition-all group ${
                    isSelected
                      ? 'border-violet-500 bg-violet-50/10 dark:bg-violet-950/10 shadow-sm'
                      : 'border-slate-100 dark:border-slate-800/50 hover:border-slate-200 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="mr-3">
                    {isSelected ? (
                      <CheckSquare className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                    ) : (
                      <Square className="w-5 h-5 text-slate-300 dark:text-slate-700 group-hover:text-slate-400" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1 flex items-center justify-between">
                    <h6 className="text-[12px] font-bold text-slate-800 dark:text-slate-200 leading-tight">
                      {bid}
                    </h6>
                  </div>
                </button>
              );
            })}

            {filteredBidangs.length === 0 && (
              <div className="text-center py-8 text-slate-400 text-[11px] font-semibold">
                Tidak ada bidang keahlian yang cocok dengan pencarian Anda.
              </div>
            )}
          </div>
        </>
      )}

      {/* Step 2 View */}
      {step === 2 && (
        <>
          {/* Info Card */}
          <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800/80 rounded-2xl p-4 flex items-start gap-4">
            <div className="bg-violet-100 dark:bg-violet-900/40 p-2 rounded-xl text-violet-600 dark:text-violet-400 mt-0.5">
              <Layers size={20} />
            </div>
            <div className="flex-1 space-y-1">
              <h4 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-tight">
                Langkah 2: Pilih Konsentrasi Keahlian (Jurusan)
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                Tentukan jurusan spesifik di bawah Bidang Keahlian yang Anda pilih sebelumnya. Jurusan yang tidak dibuka di sekolah Anda dapat dide-check.
              </p>
            </div>
          </div>

          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama jurusan atau singkatan..."
              className="w-full pl-10 pr-4 h-10 text-[12px] font-semibold border-2 border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-200 focus:outline-none focus:border-violet-500 transition-colors"
            />
          </div>

          {/* Jurusan List (Filtered by selected Bidangs in Step 1) */}
          <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1 scrollbar-thin">
            {step2Data.map(prog => {
              const allJurusansSelected = prog.jurusans.every(j => selectedJurusanCodes.includes(j.kode));

              return (
                <div key={prog.kode} className="border border-slate-100 dark:border-slate-800/80 rounded-2xl overflow-hidden shadow-sm bg-white dark:bg-slate-950">
                  <div className="bg-slate-50 dark:bg-slate-900 px-4 py-2 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between flex-wrap gap-2">
                    <div className="space-y-0.5">
                      <span className="text-[8px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">
                        {prog.bidang_keahlian}
                      </span>
                      <h5 className="text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-tight">
                        {prog.nama} ({prog.kode})
                      </h5>
                    </div>

                    <button
                      type="button"
                      onClick={() => toggleAllJurusansForProgram(prog.kode, !allJurusansSelected)}
                      className="text-[9px] font-bold uppercase tracking-widest text-violet-600 dark:text-violet-400 hover:underline"
                    >
                      {allJurusansSelected ? 'Kosongkan Semua' : 'Centang Semua'}
                    </button>
                  </div>

                  <div className="divide-y divide-slate-100 dark:divide-slate-800/60 px-4">
                    {prog.jurusans.map(jur => {
                      const isSelected = selectedJurusanCodes.includes(jur.kode);
                      return (
                        <button
                          key={jur.kode}
                          type="button"
                          onClick={() => toggleJurusan(jur.kode)}
                          className="flex items-center text-left w-full py-3.5 transition-colors group hover:bg-slate-50/50 dark:hover:bg-slate-900/30 px-2 rounded-lg"
                        >
                          <div className="mr-3">
                            {isSelected ? (
                              <CheckSquare className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                            ) : (
                              <Square className="w-5 h-5 text-slate-300 dark:text-slate-700 group-hover:text-slate-400" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1 flex items-center justify-between">
                            <div className="space-y-0.5">
                              <h6 className="text-[12px] font-bold text-slate-800 dark:text-slate-200 leading-tight">
                                {jur.nama}
                              </h6>
                              <p className="text-[9px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">
                                Singkatan: {jur.singkatan}
                              </p>
                            </div>
                            <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-900 px-2 py-0.5 rounded-md ml-2 shrink-0">
                              {jur.kode}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {step2Data.length === 0 && (
              <div className="text-center py-8 text-slate-400 text-[11px] font-semibold">
                Tidak ada preset jurusan yang cocok.
              </div>
            )}
          </div>
        </>
      )}

      {/* Footer Actions */}
      <ModalFooter className="mt-4 pt-6 border-t border-slate-100 dark:border-slate-800 gap-3">
        {step === 1 ? (
          <>
            <Button
              type="button"
              variant="toolbarOutline"
              size="toolbar"
              onClick={onCancel}
              disabled={loading}
            >
              <X className="w-3.5 h-3.5 mr-2" />
              Batalkan
            </Button>
            <div className="flex-1" />
            <Button
              type="button"
              variant="toolbarPrimary"
              size="toolbar"
              onClick={handleNextStep}
              disabled={selectedBidangs.length === 0}
              className="px-6"
            >
              Lanjut
              <ChevronRight className="w-3.5 h-3.5 ml-2" />
            </Button>
          </>
        ) : (
          <>
            <Button
              type="button"
              variant="toolbarOutline"
              size="toolbar"
              onClick={handlePrevStep}
              disabled={loading}
            >
              <ChevronLeft className="w-3.5 h-3.5 mr-2" />
              Kembali
            </Button>
            <div className="flex-1" />
            <Button
              type="button"
              variant="toolbarPrimary"
              size="toolbar"
              onClick={handleSave}
              disabled={loading || selectedJurusanCodes.length === 0}
              className="px-8"
            >
              {loading ? (
                <RefreshCw size={14} className="mr-2 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5 mr-2" />
              )}
              Simpan Massal ({selectedJurusanCodes.length})
            </Button>
          </>
        )}
      </ModalFooter>
    </div>
  );
});

JurusanWizardForm.displayName = 'JurusanWizardForm';
export default JurusanWizardForm;
