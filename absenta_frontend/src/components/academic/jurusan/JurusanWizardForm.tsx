import React, { useState, useMemo } from 'react';
import { Save, X, RefreshCw, Layers, Search, CheckSquare, Square } from 'lucide-react';
import { Button, Alert, Loader, ModalFooter } from '../../ui';
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
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Selected Jurusan codes
  const [selectedJurusanCodes, setSelectedJurusanCodes] = useState<string[]>([]);

  // Toggle Jurusan selection
  const toggleJurusan = (code: string) => {
    setSelectedJurusanCodes(prev => 
      prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]
    );
  };

  // Select all jurusans under a specific Program Keahlian
  const selectAllUnderProgram = (programKode: string) => {
    const prog = SMK_PRESETS.find(p => p.kode === programKode);
    if (!prog) return;
    const jurKodes = prog.jurusans.map(j => j.kode);
    setSelectedJurusanCodes(prev => [...new Set([...prev, ...jurKodes])]);
  };

  // Deselect all jurusans under a specific Program Keahlian
  const deselectAllUnderProgram = (programKode: string) => {
    const prog = SMK_PRESETS.find(p => p.kode === programKode);
    if (!prog) return;
    const jurKodes = prog.jurusans.map(j => j.kode);
    setSelectedJurusanCodes(prev => prev.filter(c => !jurKodes.includes(c)));
  };

  // Filter presets based on search query
  const filteredPresets = useMemo(() => {
    if (!searchQuery.trim()) return SMK_PRESETS;
    
    const query = searchQuery.toLowerCase();
    return SMK_PRESETS.map(prog => {
      // Check if program matches OR any of its jurusans match
      const programMatches = prog.nama.toLowerCase().includes(query) || prog.kode.toLowerCase().includes(query) || prog.bidang_keahlian.toLowerCase().includes(query);
      const filteredJurusans = prog.jurusans.filter(j => 
        j.nama.toLowerCase().includes(query) || j.singkatan.toLowerCase().includes(query) || j.kode.toLowerCase().includes(query)
      );

      if (programMatches || filteredJurusans.length > 0) {
        return {
          ...prog,
          // If program matches, keep all. Otherwise, only keep matched ones.
          jurusans: programMatches ? prog.jurusans : filteredJurusans
        };
      }
      return null;
    }).filter((p): p is typeof SMK_PRESETS[0] => p !== null);
  }, [searchQuery]);

  // Handle Save / Submit
  const handleSave = async () => {
    if (selectedJurusanCodes.length === 0) {
      setSubmitError('Pilih setidaknya satu Konsentrasi Keahlian (Jurusan) untuk disimpan.');
      return;
    }

    try {
      setLoading(true);
      setSubmitError('');

      // Find all unique programs that are checked (by checking which programs have selected jurusans)
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

      {/* Info Card */}
      <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800/80 rounded-2xl p-4 flex items-start gap-4">
        <div className="bg-violet-100 dark:bg-violet-900/40 p-2 rounded-xl text-violet-600 dark:text-violet-400 mt-0.5">
          <Layers size={20} />
        </div>
        <div className="flex-1 space-y-1">
          <h4 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-tight">
            Tambah Massal (Presets Kurikulum Merdeka)
          </h4>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
            Centang nama Konsentrasi Keahlian (Jurusan) yang dibuka di sekolah Anda. Sistem otomatis membuat kategori induk **Program Keahlian** dan memetakan relasinya secara instan.
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
          placeholder="Cari nama jurusan, singkatan, atau bidang keahlian..."
          className="w-full pl-10 pr-4 h-10 text-[12px] font-semibold border-2 border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-200 focus:outline-none focus:border-violet-500 transition-colors"
        />
      </div>

      {/* Checklist List */}
      <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1 scrollbar-thin">
        {filteredPresets.map(prog => {
          const allJurusansSelected = prog.jurusans.every(j => selectedJurusanCodes.includes(j.kode));
          const someJurusansSelected = prog.jurusans.some(j => selectedJurusanCodes.includes(j.kode));

          return (
            <div key={prog.kode} className="border border-slate-100 dark:border-slate-800/80 rounded-2xl overflow-hidden shadow-sm bg-white dark:bg-slate-950">
              <div className="bg-slate-50 dark:bg-slate-900 px-4 py-2.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between flex-wrap gap-2">
                <div className="space-y-0.5">
                  <span className="text-[9px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">
                    {prog.bidang_keahlian}
                  </span>
                  <h5 className="text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-tight">
                    {prog.nama} ({prog.kode})
                  </h5>
                </div>
                
                {/* Select All Toggle for this Program */}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => allJurusansSelected ? deselectAllUnderProgram(prog.kode) : selectAllUnderProgram(prog.kode)}
                    className="text-[9px] font-bold uppercase tracking-widest text-violet-600 dark:text-violet-400 hover:underline"
                  >
                    {allJurusansSelected ? 'Kosongkan Semua' : 'Centang Semua'}
                  </button>
                </div>
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
                          <Square className="w-4.5 h-4.5 text-slate-300 dark:text-slate-700 group-hover:text-slate-400" />
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
          );
        })}

        {filteredPresets.length === 0 && (
          <div className="text-center py-8 text-slate-400 text-[11px] font-semibold">
            Tidak ada preset jurusan yang cocok dengan pencarian Anda.
          </div>
        )}
      </div>

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
      </ModalFooter>
    </div>
  );
});

JurusanWizardForm.displayName = 'JurusanWizardForm';
export default JurusanWizardForm;
