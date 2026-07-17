import React, { useState, useMemo, useEffect } from 'react';
import { Modal } from '../../ui/Modal';
import { Button } from '../../ui/Button';
import { Badge } from '../../ui/Badge';
import { Input } from '../../ui/Input';
import { useJenjang } from '../../../hooks/useJenjang';
import { createKelas } from '../../../api/academic/kelas.api';
import { getJurusanList } from '../../../api/academic/jurusan.api';
import type { Jurusan } from '../../../types/academic';
import { Loader2, Plus, LayoutGrid, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface BulkClassModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function BulkClassModal({ isOpen, onClose, onSuccess }: BulkClassModalProps) {
  const { tingkatList, jenjang } = useJenjang();
  const [jurusanList, setJurusanList] = useState<Jurusan[]>([]);
  const hasJurusan = ['SMA', 'MA', 'SMK', 'MAK'].includes(String(jenjang || '').toUpperCase());

  // Form State
  const [selectedTingkat, setSelectedTingkat] = useState<number[]>([]);
  const [parallelCount, setParallelCount] = useState<number>(3);
  const [selectedJurusanId, setSelectedJurusanId] = useState<string>('');
  const [appendJurusan, setAppendJurusan] = useState<boolean>(false);

  // New granular naming states
  const [useRoman, setUseRoman] = useState<boolean>(false);
  const [suffixType, setSuffixType] = useState<'alphabet' | 'number'>('alphabet');
  const [separator, setSeparator] = useState<string>('');
  const [useKelasPrefix, setUseKelasPrefix] = useState<boolean>(false);

  // Preview State (Editable)
  const [previewClasses, setPreviewClasses] = useState<{ tingkat: number; nama_kelas: string; jurusan_id?: string }[]>([]);

  // Execution State
  const [isGenerating, setIsGenerating] = useState(false);
  const [progressIndex, setProgressIndex] = useState(0);
  const [progressTotal, setProgressTotal] = useState(0);
  const [currentProgressName, setCurrentProgressName] = useState('');

  // Fetch Jurusan if applicable
  useEffect(() => {
    if (hasJurusan && isOpen) {
      getJurusanList(1, 100)
        .then(res => {
          if (res.success) setJurusanList(res.data);
        })
        .catch(err => console.error('Failed to load jurusans for bulk wizard', err));
    }
  }, [hasJurusan, isOpen]);

  // Reset state on open
  useEffect(() => {
    if (isOpen) {
      setSelectedTingkat([]);
      setParallelCount(3);
      setSelectedJurusanId('');
      setAppendJurusan(false);
      setUseRoman(false);
      setSuffixType('alphabet');
      setSeparator('');
      setUseKelasPrefix(false);
      setIsGenerating(false);
      setProgressIndex(0);
      setProgressTotal(0);
      setCurrentProgressName('');
    }
  }, [isOpen]);

  const getRoman = (num: number): string => {
    const lookup: Array<[string, number]> = [
      ['M', 1000], ['CM', 900], ['D', 500], ['CD', 400],
      ['C', 100], ['XC', 90], ['L', 50], ['XL', 40],
      ['X', 10], ['IX', 9], ['VIII', 8], ['VII', 7],
      ['VI', 6], ['V', 5], ['IV', 4], ['III', 3],
      ['II', 2], ['I', 1]
    ];
    let res = '';
    let val = num;
    for (const [roman, limit] of lookup) {
      while (val >= limit) {
        res += roman;
        val -= limit;
      }
    }
    return res || String(num);
  };

  const getSuffix = (index: number, type: 'alphabet' | 'number') => {
    if (type === 'number') {
      return String(index + 1);
    }
    return String.fromCharCode(65 + index); // 65 is 'A'
  };

  const activeJurusanObj = useMemo(() => {
    return jurusanList.find(j => j.id === selectedJurusanId);
  }, [jurusanList, selectedJurusanId]);

  // Sync previewClasses when inputs change
  useEffect(() => {
    if (selectedTingkat.length === 0 || parallelCount <= 0) {
      setPreviewClasses([]);
      return;
    }

    const classes: { tingkat: number; nama_kelas: string; jurusan_id?: string }[] = [];
    const sortedTingkat = [...selectedTingkat].sort((a, b) => a - b);

    for (const t of sortedTingkat) {
      for (let i = 0; i < parallelCount; i++) {
        const suffix = getSuffix(i, suffixType);
        let nameStr = '';
        const gradeRep = useRoman ? getRoman(t) : String(t);
        const prefix = useKelasPrefix ? 'Kelas ' : '';

        if (appendJurusan && activeJurusanObj) {
          const code = activeJurusanObj.singkatan || activeJurusanObj.kode || activeJurusanObj.nama;
          // Format: [Prefix] [Grade] [Code] [Suffix] -> Kelas 10 AKL 1
          nameStr = `${prefix}${gradeRep} ${code} ${suffix}`;
        } else {
          // Format: [Prefix] [Grade] [Separator] [Suffix] -> Kelas 10-A
          nameStr = `${prefix}${gradeRep}${separator}${suffix}`;
        }

        classes.push({
          tingkat: t,
          nama_kelas: nameStr,
          jurusan_id: selectedJurusanId || undefined
        });
      }
    }
    setPreviewClasses(classes);
  }, [selectedTingkat, parallelCount, useRoman, suffixType, separator, useKelasPrefix, selectedJurusanId, appendJurusan, activeJurusanObj]);

  const updatePreviewClassName = (index: number, newName: string) => {
    setPreviewClasses(prev => {
      const next = [...prev];
      next[index] = { ...next[index], nama_kelas: newName };
      return next;
    });
  };

  const handleToggleTingkat = (t: number) => {
    setSelectedTingkat(prev =>
      prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]
    );
  };

  const handleSelectAllTingkat = () => {
    if (selectedTingkat.length === tingkatList.length) {
      setSelectedTingkat([]);
    } else {
      setSelectedTingkat([...tingkatList]);
    }
  };

  const handleGenerate = async () => {
    if (previewClasses.length === 0) return;
    try {
      setIsGenerating(true);
      setProgressTotal(previewClasses.length);
      setProgressIndex(0);

      for (let i = 0; i < previewClasses.length; i++) {
        const item = previewClasses[i];
        setCurrentProgressName(item.nama_kelas);
        
        const response = await createKelas({
          nama_kelas: item.nama_kelas,
          tingkat: item.tingkat,
          jurusan_id: item.jurusan_id || ''
        });

        if (!response.success) {
          throw new Error(response.message || `Gagal membuat kelas ${item.nama_kelas}`);
        }
        setProgressIndex(i + 1);
      }

      toast.success(`Berhasil membuat ${previewClasses.length} kelas secara massal!`);
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Bulk class generation error:', error);
      const errMsg = error.response?.data?.message || error.message || 'Gagal memproses pembuatan kelas';
      toast.error(errMsg);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => !isGenerating && onClose()}
      title="Wizard Pembuatan Kelas Massal"
      size="4xl"
    >
      <div className="p-6 pt-2 space-y-6">
        {isGenerating ? (
          /* Processing Screen */
          <div className="flex flex-col items-center justify-center py-16 space-y-4 animate-in fade-in duration-300">
            <div className="relative flex items-center justify-center">
              <Loader2 className="w-16 h-16 text-indigo-600 animate-spin" />
              <span className="absolute text-xs font-black text-indigo-600">
                {Math.round((progressIndex / progressTotal) * 100)}%
              </span>
            </div>
            <div className="text-center space-y-1">
              <p className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider">
                Sedang Memproses Kelas...
              </p>
              <p className="text-xs text-slate-400 font-bold">
                Membuat {currentProgressName} ({progressIndex} dari {progressTotal})
              </p>
            </div>
            <div className="w-64 bg-slate-100 dark:bg-slate-850 h-2 rounded-full overflow-hidden">
              <div 
                className="bg-indigo-600 h-full rounded-full transition-all duration-300"
                style={{ width: `${(progressIndex / progressTotal) * 100}%` }}
              ></div>
            </div>
          </div>
        ) : (
          /* Form Wizard */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left side settings: Col 6 */}
            <div className="lg:col-span-6 space-y-5">
              {/* Tingkat Selection */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                    Pilih Tingkat Kelas
                  </label>
                  <button 
                    type="button" 
                    onClick={handleSelectAllTingkat}
                    className="text-[9px] font-black text-indigo-600 hover:underline uppercase"
                  >
                    {selectedTingkat.length === tingkatList.length ? 'Kosongkan Semua' : 'Pilih Semua'}
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {tingkatList?.map((t) => {
                    const isSelected = selectedTingkat.includes(t);
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => handleToggleTingkat(t)}
                        className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all ${
                          isSelected
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                            : 'bg-white dark:bg-slate-900 text-slate-600 border-slate-200 dark:border-slate-800 hover:border-indigo-300'
                        }`}
                      >
                        Kelas {t}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Parallel Count & Naming Options */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                    Jumlah Rombel Paralel
                  </label>
                  <Input
                    type="number"
                    min={1}
                    max={20}
                    value={parallelCount}
                    onChange={(e) => setParallelCount(Math.max(1, Number(e.target.value)))}
                    className="h-10 text-[13px] rounded-xl"
                  />
                  <span className="text-[9px] text-slate-400 font-bold block mt-1">
                    Misal: 3 = menghasilkan kelas A, B, C (atau 1, 2, 3)
                  </span>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                    Pola Penamaan
                  </label>
                  <div className="flex gap-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl h-10">
                    <button
                      type="button"
                      onClick={() => setSuffixType('alphabet')}
                      className={`flex-1 text-[10px] font-black uppercase rounded-lg transition-all ${
                        suffixType === 'alphabet' 
                          ? 'bg-white dark:bg-slate-800 text-indigo-600 shadow-sm' 
                          : 'text-slate-400 hover:text-slate-600'
                      }`}
                    >
                      A, B, C
                    </button>
                    <button
                      type="button"
                      onClick={() => setSuffixType('number')}
                      className={`flex-1 text-[10px] font-black uppercase rounded-lg transition-all ${
                        suffixType === 'number' 
                          ? 'bg-white dark:bg-slate-800 text-indigo-600 shadow-sm' 
                          : 'text-slate-400 hover:text-slate-600'
                      }`}
                    >
                      1, 2, 3
                    </button>
                  </div>
                </div>
              </div>

              {/* Advanced Naming Options */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                    Format Tingkat
                  </label>
                  <div className="flex gap-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl h-10">
                    <button
                      type="button"
                      onClick={() => setUseRoman(false)}
                      className={`flex-1 text-[10px] font-black uppercase rounded-lg transition-all ${
                        !useRoman 
                          ? 'bg-white dark:bg-slate-800 text-indigo-600 shadow-sm' 
                          : 'text-slate-400 hover:text-slate-600'
                      }`}
                    >
                      10, 11, 12
                    </button>
                    <button
                      type="button"
                      onClick={() => setUseRoman(true)}
                      className={`flex-1 text-[10px] font-black uppercase rounded-lg transition-all ${
                        useRoman 
                          ? 'bg-white dark:bg-slate-800 text-indigo-600 shadow-sm' 
                          : 'text-slate-400 hover:text-slate-600'
                      }`}
                    >
                      X, XI, XII
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                    Pemisah
                  </label>
                  <div className="flex gap-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl h-10">
                    {[
                      { label: 'None', value: '' },
                      { label: '-', value: '-' },
                      { label: '.', value: '.' },
                      { label: 'Spasi', value: ' ' }
                    ].map((opt) => (
                      <button
                        key={opt.label}
                        type="button"
                        onClick={() => setSeparator(opt.value)}
                        className={`flex-1 text-[9px] font-black uppercase rounded-lg transition-all ${
                          separator === opt.value 
                            ? 'bg-white dark:bg-slate-800 text-indigo-600 shadow-sm' 
                            : 'text-slate-400 hover:text-slate-600'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2.5 pt-1">
                <input
                  type="checkbox"
                  id="use-prefix"
                  checked={useKelasPrefix}
                  onChange={(e) => setUseKelasPrefix(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="use-prefix" className="text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                  Gunakan awalan "Kelas"
                  <span className="block text-[9px] text-slate-400 font-normal">
                    Contoh: Kelas 10-A (atau Kelas X AKL 1)
                  </span>
                </label>
              </div>

              {/* Jurusan Selection (SMK/SMA) */}
              {hasJurusan && (
                <div className="space-y-3 bg-slate-50 dark:bg-slate-900/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/80 animate-in fade-in duration-200">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                      Hubungkan dengan Jurusan (Khusus SMA/SMK)
                    </label>
                    <select
                      value={selectedJurusanId}
                      onChange={(e) => {
                        setSelectedJurusanId(e.target.value);
                        if (!e.target.value) setAppendJurusan(false);
                      }}
                      className="h-10 text-[13px] w-full rounded-xl border border-slate-250 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="">Umum (Tanpa Jurusan)</option>
                      {jurusanList?.map(j => (
                        <option key={j.id} value={j.id}>{j.nama}</option>
                      ))}
                    </select>
                  </div>

                  {selectedJurusanId && (
                    <div className="flex items-center gap-2.5 pt-1.5 animate-in slide-in-from-top-1 duration-200">
                      <input
                        type="checkbox"
                        id="append-jurusan"
                        checked={appendJurusan}
                        onChange={(e) => setAppendJurusan(e.target.checked)}
                        className="rounded text-indigo-600 focus:ring-indigo-500"
                      />
                      <label htmlFor="append-jurusan" className="text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                        Sertakan kode/singkatan jurusan dalam nama kelas
                        <span className="block text-[9px] text-slate-400 font-normal">
                          Contoh: RPL = 10 RPL A (atau Kelas 10 RPL A)
                        </span>
                      </label>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Right side preview: Col 6 */}
            <div className="lg:col-span-6 border border-slate-150 dark:border-slate-800 rounded-2xl p-4 bg-slate-50/40 dark:bg-slate-950/20 h-full flex flex-col justify-between min-h-[280px]">
              <div className="space-y-3 flex-1 flex flex-col min-h-0">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block shrink-0">
                  Pratinjau Hasil ({previewClasses.length} Kelas)
                </span>
                <div className="overflow-y-auto max-h-[220px] pr-1 space-y-1.5 flex-1 min-h-0">
                  {previewClasses.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 opacity-30 text-center space-y-2">
                      <LayoutGrid size={24} />
                      <p className="text-[10px] font-bold uppercase">Belum ada pratinjau</p>
                      <p className="text-[9px]">Pilih tingkat kelas dan isi rombel paralel</p>
                    </div>
                  ) : (
                    previewClasses.map((item, index) => (
                      <div 
                        key={index}
                        className="flex items-center justify-between p-2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-xl px-3 animate-in fade-in duration-200"
                      >
                        <div className="flex-1 mr-2">
                          <input
                            type="text"
                            value={item.nama_kelas}
                            onChange={(e) => updatePreviewClassName(index, e.target.value)}
                            className="w-full bg-transparent border-none text-xs font-black text-slate-700 dark:text-slate-200 focus:ring-0 p-0"
                          />
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <Badge variant="outline" className="text-[8.5px] px-1.5 font-black uppercase tracking-wider">
                            Tingkat {item.tingkat}
                          </Badge>
                          {appendJurusan && activeJurusanObj && (
                            <Badge variant="info" className="text-[8.5px] px-1.5 font-black uppercase tracking-wider">
                              {activeJurusanObj.singkatan || activeJurusanObj.kode}
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {previewClasses.length > 0 && (
                <div className="pt-4 border-t border-slate-200/50 dark:border-slate-800/50 flex flex-col gap-2 shrink-0">
                  <div className="p-2.5 bg-amber-50/50 dark:bg-amber-950/10 border border-amber-100 dark:border-amber-900/30 rounded-xl flex items-start gap-2">
                    <CheckCircle2 size={13} className="text-amber-600 mt-0.5 shrink-0" />
                    <p className="text-[9px] text-amber-800 dark:text-amber-400 font-bold leading-normal">
                      Wizard akan membuat {previewClasses.length} kelas secara berurutan. Anda dapat menghubungkan Wali Kelas setelah kelas berhasil dibuat.
                    </p>
                  </div>
                  <Button
                    onClick={handleGenerate}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-wider text-xs py-2.5 rounded-xl shadow-md"
                  >
                    <Plus className="w-4 h-4 mr-1.5" />
                    Buat Kelas Sekarang
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
