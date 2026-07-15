import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Save, X, RefreshCw, Layers, GraduationCap, CheckSquare, Square } from 'lucide-react';
import { Button, Alert, Loader, ModalFooter } from '../../ui';
import { SMK_PRESETS, type SMKPresetProgram } from '../../../constants/smk-presets';
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

  // Step 1: Selected Program Keahlian codes
  const [selectedProgramCodes, setSelectedProgramCodes] = useState<string[]>([]);
  
  // Step 2: Selected Jurusan codes
  const [selectedJurusanCodes, setSelectedJurusanCodes] = useState<string[]>([]);

  // Toggle Program Keahlian selection
  const toggleProgram = (code: string) => {
    setSelectedProgramCodes(prev => {
      if (prev.includes(code)) {
        // Remove program & also remove any of its jurusan selected
        const prog = SMK_PRESETS.find(p => p.kode === code);
        if (prog) {
          const jurKodes = prog.jurusans.map(j => j.kode);
          setSelectedJurusanCodes(jPrev => jPrev.filter(jk => !jurKodes.includes(jk)));
        }
        return prev.filter(c => c !== code);
      } else {
        // Add program and auto-select all its jurusan by default for convenience
        const prog = SMK_PRESETS.find(p => p.kode === code);
        if (prog) {
          const jurKodes = prog.jurusans.map(j => j.kode);
          setSelectedJurusanCodes(jPrev => [...new Set([...jPrev, ...jurKodes])]);
        }
        return [...prev, code];
      }
    });
  };

  // Toggle Jurusan selection
  const toggleJurusan = (code: string) => {
    setSelectedJurusanCodes(prev => 
      prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]
    );
  };

  // Filter presets based on selected programs
  const activePrograms = SMK_PRESETS.filter(p => selectedProgramCodes.includes(p.kode));

  // Handle Save / Submit
  const handleSave = async () => {
    if (selectedJurusanCodes.length === 0) {
      setSubmitError('Pilih setidaknya satu Konsentrasi Keahlian (Jurusan) untuk disimpan.');
      return;
    }

    try {
      setLoading(true);
      setSubmitError('');

      // Prepare payload
      const payloadPrograms = SMK_PRESETS.filter(p => selectedProgramCodes.includes(p.kode)).map(p => ({
        nama: p.nama,
        kode: p.kode,
        singkatan: p.singkatan,
        bidang_keahlian: p.bidang_keahlian
      }));

      const payloadJurusans: Array<{ nama: string; kode: string; singkatan: string; program_keahlian_kode: string }> = [];
      activePrograms.forEach(p => {
        p.jurusans.forEach(j => {
          if (selectedJurusanCodes.includes(j.kode)) {
            payloadJurusans.push({
              nama: j.nama,
              kode: j.kode,
              singkatan: j.singkatan,
              program_keahlian_kode: p.kode
            });
          }
        });
      });

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
    <div className="space-y-6">
      {submitError && (
        <Alert variant="destructive">
          {submitError}
        </Alert>
      )}

      {/* Progress Wizard Bar */}
      <div className="flex items-center justify-center py-2">
        <div className="flex items-center space-x-3 w-full max-w-md">
          {/* Step 1 indicator */}
          <div className="flex items-center space-x-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
              step === 1 
                ? 'bg-blue-600 text-white ring-4 ring-blue-100 dark:ring-blue-900/30' 
                : 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 font-black'
            }`}>
              {step > 1 ? '✓' : '1'}
            </div>
            <span className={`text-[11px] font-bold uppercase tracking-wider ${
              step === 1 ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'
            }`}>
              Program Keahlian
            </span>
          </div>

          <div className="flex-1 h-0.5 bg-slate-200 dark:bg-slate-800" />

          {/* Step 2 indicator */}
          <div className="flex items-center space-x-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
              step === 2 
                ? 'bg-blue-600 text-white ring-4 ring-blue-100 dark:ring-blue-900/30' 
                : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
            }`}>
              2
            </div>
            <span className={`text-[11px] font-bold uppercase tracking-wider ${
              step === 2 ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'
            }`}>
              Konsentrasi Keahlian
            </span>
          </div>
        </div>
      </div>

      {/* STEP 1: PILIH PROGRAM KEAHLIAN */}
      {step === 1 && (
        <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-200">
          <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800/80 rounded-2xl p-4">
            <h4 className="text-[12px] font-black text-slate-800 dark:text-slate-200 uppercase tracking-tight flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-500" />
              Langkah 1: Pilih Program Keahlian SMK
            </h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              Centang seluruh Program Keahlian (Induk) yang aktif di sekolah Anda. Konsentrasi Keahlian (Jurusan) akan dikelompokkan di bawah program ini.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pr-1 scrollbar-thin">
            {SMK_PRESETS.map(prog => {
              const isSelected = selectedProgramCodes.includes(prog.kode);
              return (
                <button
                  key={prog.kode}
                  type="button"
                  onClick={() => toggleProgram(prog.kode)}
                  className={`flex items-start text-left p-4 rounded-2xl border-2 transition-all group ${
                    isSelected 
                      ? 'border-blue-500 bg-blue-50/20 dark:bg-blue-950/10' 
                      : 'border-slate-100 dark:border-slate-800/50 bg-white dark:bg-slate-950 hover:border-slate-200 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="mt-0.5 mr-3">
                    {isSelected ? (
                      <CheckSquare className="w-4.5 h-4.5 text-blue-600 dark:text-blue-400" />
                    ) : (
                      <Square className="w-4.5 h-4.5 text-slate-300 dark:text-slate-700 group-hover:text-slate-400" />
                    )}
                  </div>
                  <div className="space-y-1">
                    <span className="text-[9px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">
                      {prog.bidang_keahlian}
                    </span>
                    <h5 className="text-[12px] font-bold text-slate-800 dark:text-slate-200 leading-tight">
                      {prog.nama} ({prog.kode})
                    </h5>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 italic">
                      Memuat {prog.jurusans.length} Konsentrasi Keahlian preset
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* STEP 2: PILIH JURUSAN / KONSENTRASI KEAHLIAN */}
      {step === 2 && (
        <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-200">
          <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800/80 rounded-2xl p-4">
            <h4 className="text-[12px] font-black text-slate-800 dark:text-slate-200 uppercase tracking-tight flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-violet-500" />
              Langkah 2: Pilih Konsentrasi Keahlian (Jurusan)
            </h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              Centang jurusan/konsentrasi keahlian spesifik yang akan dimasukkan ke database sekolah Anda.
            </p>
          </div>

          <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1 scrollbar-thin">
            {activePrograms.map(prog => (
              <div key={prog.kode} className="border border-slate-100 dark:border-slate-800/80 rounded-2xl overflow-hidden shadow-sm">
                <div className="bg-slate-50 dark:bg-slate-900 px-4 py-2.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <span className="text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    {prog.nama} ({prog.kode})
                  </span>
                  <span className="text-[9px] font-black uppercase text-blue-500 dark:text-blue-400 tracking-wider">
                    {prog.bidang_keahlian}
                  </span>
                </div>
                <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3 bg-white dark:bg-slate-950">
                  {prog.jurusans.map(jur => {
                    const isSelected = selectedJurusanCodes.includes(jur.kode);
                    return (
                      <button
                        key={jur.kode}
                        type="button"
                        onClick={() => toggleJurusan(jur.kode)}
                        className={`flex items-center text-left p-3 rounded-xl border transition-all group ${
                          isSelected 
                            ? 'border-violet-500 bg-violet-50/10 dark:bg-violet-950/10' 
                            : 'border-slate-100 dark:border-slate-800/50 hover:border-slate-200 dark:hover:border-slate-700'
                        }`}
                      >
                        <div className="mr-3">
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-300 dark:text-slate-700 group-hover:text-slate-400" />
                          )}
                        </div>
                        <div className="space-y-0.5">
                          <h6 className="text-[11px] font-bold text-slate-800 dark:text-slate-200 leading-tight">
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
            ))}
          </div>
        </div>
      )}

      {/* footer buttons */}
      <ModalFooter className="mt-4 pt-6 border-t border-slate-100 dark:border-slate-800 gap-3">
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

        {step === 2 && (
          <Button
            type="button"
            variant="toolbarOutline"
            size="toolbar"
            onClick={() => setStep(1)}
            disabled={loading}
          >
            <ChevronLeft className="w-3.5 h-3.5 mr-2" />
            Kembali
          </Button>
        )}

        {step === 1 ? (
          <Button
            type="button"
            variant="toolbarPrimary"
            size="toolbar"
            onClick={() => {
              if (selectedProgramCodes.length === 0) {
                setSubmitError('Pilih minimal satu Program Keahlian untuk melanjutkan.');
                return;
              }
              setSubmitError('');
              setStep(2);
            }}
            disabled={selectedProgramCodes.length === 0}
          >
            Selanjutnya
            <ChevronRight className="w-3.5 h-3.5 ml-2" />
          </Button>
        ) : (
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
        )}
      </ModalFooter>
    </div>
  );
});

JurusanWizardForm.displayName = 'JurusanWizardForm';
