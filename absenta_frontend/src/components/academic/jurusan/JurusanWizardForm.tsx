import React, { useState, useMemo } from 'react';
import { Save, X, RefreshCw, Layers, Search, CheckSquare, Square, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button, Alert, ModalFooter } from '../../ui';
import { SMK_PRESETS } from '../../../constants/smk-presets';
import { bulkWizardCreateJurusan } from '../../../api/academic/jurusan.api';
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

  // Step 1: Selected Program Keahlian codes
  const [selectedProgramKodes, setSelectedProgramKodes] = useState<string[]>([]);

  // Step 2: Selected Jurusan codes
  const [selectedJurusanCodes, setSelectedJurusanCodes] = useState<string[]>([]);

  // Toggle Program Keahlian selection (Step 1)
  const toggleProgram = (kode: string) => {
    setSelectedProgramKodes(prev =>
      prev.includes(kode) ? prev.filter(k => k !== kode) : [...prev, kode]
    );
  };

  // Toggle Jurusan selection (Step 2)
  const toggleJurusan = (code: string) => {
    setSelectedJurusanCodes(prev =>
      prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]
    );
  };

  // Filter programs based on search query (Step 1)
  const filteredPrograms = useMemo(() => {
    if (!searchQuery.trim()) return SMK_PRESETS;
    const query = searchQuery.toLowerCase();
    return SMK_PRESETS.filter(prog =>
      prog.nama.toLowerCase().includes(query) ||
      prog.kode.toLowerCase().includes(query) ||
      prog.bidang_keahlian.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  // Filter programs and their jurusans based on selected programs and search query (Step 2)
  const step2Data = useMemo(() => {
    const selectedProgs = SMK_PRESETS.filter(p => selectedProgramKodes.includes(p.kode));
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
    }).filter((p): p is typeof SMK_PRESETS[0] => p !== null);
  }, [selectedProgramKodes, searchQuery]);

  // Proceed to step 2 and pre-select all jurusans under chosen programs
  const handleNextStep = () => {
    if (selectedProgramKodes.length === 0) return;

    // Pre-populate jurusans under selected programs
    const initialJurusans: string[] = [];
    selectedProgramKodes.forEach(kode => {
      const prog = SMK_PRESETS.find(p => p.kode === kode);
      if (prog) {
        prog.jurusans.forEach(j => {
          initialJurusans.push(j.kode);
        });
      }
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
    const prog = SMK_PRESETS.find(p => p.kode === programKode);
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
      const selectedProgramsMap = new Map<string, typeof SMK_PRESETS[0]>();
      const payloadJurusans: Array<{ nama: string; kode: string; singkatan: string; program_keahlian_kode: string }> = [];

      SMK_PRESETS.forEach(prog => {
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
            1. Program Keahlian
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
                Langkah 1: Pilih Program Keahlian
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                Tentukan Program Keahlian yang ada di sekolah Anda. Di langkah berikutnya, Anda akan memfilter spesifik Konsentrasi/Jurusan di bawah program tersebut.
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
              placeholder="Cari nama program keahlian, kode, atau bidang keahlian..."
              className="w-full pl-10 pr-4 h-10 text-[12px] font-semibold border-2 border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-200 focus:outline-none focus:border-violet-500 transition-colors"
            />
          </div>

          {/* Program Keahlian List */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pr-1 scrollbar-thin">
            {filteredPrograms.map(prog => {
              const isSelected = selectedProgramKodes.includes(prog.kode);
              return (
                <button
                  key={prog.kode}
                  type="button"
                  onClick={() => toggleProgram(prog.kode)}
                  className={`flex items-center text-left p-3.5 rounded-2xl border transition-all group ${
                    isSelected
                      ? 'border-violet-500 bg-violet-50/10 dark:bg-violet-950/10 shadow-sm'
                      : 'border-slate-100 dark:border-slate-800/50 hover:border-slate-200 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="mr-3">
                    {isSelected ? (
                      <CheckSquare className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                    ) : (
                      <Square className="w-5 h-5 text-slate-300 dark:text-slate-750 group-hover:text-slate-400" />
                    )}
                  </div>
                  <div className="space-y-0.5 min-w-0 flex-1">
                    <span className="text-[8px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">
                      {prog.bidang_keahlian}
                    </span>
                    <h6 className="text-[11px] font-bold text-slate-800 dark:text-slate-200 leading-tight truncate">
                      {prog.nama}
                    </h6>
                    <p className="text-[9px] font-semibold text-slate-500 dark:text-slate-400">
                      Kode: {prog.kode} · ({prog.jurusans.length} Jurusan)
                    </p>
                  </div>
                </button>
              );
            })}

            {filteredPrograms.length === 0 && (
              <div className="text-center py-8 text-slate-400 text-[11px] font-semibold col-span-2">
                Tidak ada program keahlian yang cocok dengan pencarian Anda.
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
                Tentukan jurusan spesifik di bawah Program Keahlian yang Anda pilih sebelumnya. Jurusan yang tidak dibuka di sekolah Anda dapat dide-check.
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

          {/* Jurusan List (Filtered by selected Programs in Step 1) */}
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

                  <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                    {prog.jurusans.map(jur => {
                      const isSelected = selectedJurusanCodes.includes(jur.kode);
                      return (
                        <button
                          key={jur.kode}
                          type="button"
                          onClick={() => toggleJurusan(jur.kode)}
                          className={`flex items-center text-left p-3 rounded-xl border transition-all group ${
                            isSelected
                              ? 'border-violet-500 bg-violet-50/10 dark:bg-violet-950/10 shadow-sm'
                              : 'border-slate-100 dark:border-slate-800/50 hover:border-slate-200 dark:hover:border-slate-700'
                          }`}
                        >
                          <div className="mr-3">
                            {isSelected ? (
                              <CheckSquare className="w-4.5 h-4.5 text-violet-600 dark:text-violet-400" />
                            ) : (
                              <Square className="w-4.5 h-4.5 text-slate-300 dark:text-slate-750 group-hover:text-slate-400" />
                            )}
                          </div>
                          <div className="space-y-0.5 min-w-0 flex-1">
                            <h6 className="text-[11px] font-bold text-slate-800 dark:text-slate-200 leading-tight truncate">
                              {jur.nama}
                            </h6>
                            <p className="text-[9px] font-black uppercase text-slate-400 dark:text-slate-500">
                              Singkatan: {jur.singkatan} · Kode: {jur.kode}
                            </p>
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
              disabled={selectedProgramKodes.length === 0}
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
