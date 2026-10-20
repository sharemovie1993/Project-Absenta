import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  FileSpreadsheet,
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ArrowRight,
  ArrowLeft,
  Search,
  Building2,
  UserCheck,
  GraduationCap,
  Sparkles,
  RefreshCw,
  Info,
  Calendar,
  Layers,
  Check,
  PlusCircle,
  CheckCheck
} from 'lucide-react';
import { Modal, Button, Input, Badge } from '@/components/ui';
import { SearchableSelect, type SearchableSelectOption } from '@/components/ui/SearchableSelect';
import { siswaApi } from '@/api/academic.api';
import { hubinApi } from '@/api/hubin.api';
import { toast } from 'react-hot-toast';
import {
  parseExcelWorkbook,
  matchExcelRows,
  extractUniqueIdukaMappings,
  applyIdukaMappingsToRows,
  type RawExcelRow,
  type MatchedPklRow,
  type UniqueIdukaMapping,
  type SiswaDbCandidate,
  type MitraDbCandidate,
  type GuruDbCandidate
} from '@/utils/excelPklParser';

interface ImportPlottingPklWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  rawMitra: any[];
  guruOptions: SearchableSelectOption[];
  tpOptions?: SearchableSelectOption[];
  selectedTpFilter?: string;
}

export const ImportPlottingPklWizardModal: React.FC<ImportPlottingPklWizardModalProps> = React.memo(({
  isOpen,
  onClose,
  rawMitra,
  guruOptions,
  tpOptions,
  selectedTpFilter
}) => {
  const queryClient = useQueryClient();
  // 5 Steps: 1: Upload, 2: Smart Matching Summary, 3: Revisi IDUKA, 4: Revisi Siswa, 5: Konfirmasi Import
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4 | 5>(1);

  // Step 1: File & Parsing State
  const [file, setFile] = useState<File | null>(null);
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  const [rawRows, setRawRows] = useState<RawExcelRow[]>([]);
  const [isParsingFile, setIsParsingFile] = useState(false);

  // Step 2 & 3 & 4: Data State
  const [matchedRows, setMatchedRows] = useState<MatchedPklRow[]>([]);
  const [idukaMappings, setIdukaMappings] = useState<UniqueIdukaMapping[]>([]);

  // Step 3 (Revisi IDUKA) Controls
  const [idukaFilter, setIdukaFilter] = useState<'ALL' | 'EXISTING' | 'NEW'>('ALL');
  const [idukaSearch, setIdukaSearch] = useState('');
  const [idukaPage, setIdukaPage] = useState(1);
  const idukaPageSize = 15;

  // Step 4 (Revisi Siswa) Controls
  const [siswaFilter, setSiswaFilter] = useState<'ALL' | 'MATCHED' | 'UNMATCHED'>('ALL');
  const [siswaSearch, setSiswaSearch] = useState('');
  const [siswaPage, setSiswaPage] = useState(1);
  const siswaPageSize = 20;

  // Selected Target TP & Semester
  const [targetTpId, setTargetTpId] = useState<string>(selectedTpFilter || '');

  useEffect(() => {
    if (selectedTpFilter && !targetTpId) {
      setTargetTpId(selectedTpFilter);
    } else if (!targetTpId && tpOptions && tpOptions.length > 0) {
      setTargetTpId(tpOptions[0].value);
    }
  }, [selectedTpFilter, targetTpId, tpOptions]);

  // Step 5: Import Execution Progress
  const [importProgress, setImportProgress] = useState(0);
  const [importResult, setImportResult] = useState<{
    total_imported: number;
    new_mitra_created: number;
    created_new: number;
    updated_existing: number;
  } | null>(null);

  // Fetch all students for accurate matching
  const { data: siswaRes, isLoading: isLoadingSiswa } = useQuery({
    queryKey: ['academic-all-siswa-for-matching'],
    queryFn: async () => {
      const res = await siswaApi.getAll({ limit: 4000 });
      return res.data || [];
    },
    enabled: isOpen,
    staleTime: 5 * 60 * 1000,
  });

  const siswaCandidates = useMemo<SiswaDbCandidate[]>(() => {
    if (!siswaRes) return [];
    return siswaRes.map((s: any) => ({
      id: s.id,
      nisn: s.nisn || null,
      nis: s.nis || null,
      nama_siswa: s.nama_siswa,
      kelas_nama: s.Kelas?.nama_kelas
    }));
  }, [siswaRes]);

  const mitraCandidates = useMemo<MitraDbCandidate[]>(() => {
    if (!rawMitra) return [];
    return rawMitra.map((m: any) => ({
      id: m.id,
      nama: m.nama,
      alamat: m.alamat || null
    }));
  }, [rawMitra]);

  const guruCandidates = useMemo<GuruDbCandidate[]>(() => {
    if (!guruOptions) return [];
    return guruOptions.map((g) => ({
      id: g.value,
      nip: g.subLabel || null,
      nama_guru: g.label
    }));
  }, [guruOptions]);

  // Options for dropdowns in Step 3 & 4
  const studentSelectOptions = useMemo<SearchableSelectOption[]>(() => {
    return siswaCandidates.map((s) => ({
      value: s.id,
      label: s.nama_siswa,
      subLabel: `NISN: ${s.nisn || '-'} | NIS: ${s.nis || '-'} | ${s.kelas_nama || ''}`
    }));
  }, [siswaCandidates]);

  const mitraSelectOptions = useMemo<SearchableSelectOption[]>(() => {
    return mitraCandidates.map((m) => ({
      value: m.id,
      label: m.nama,
      subLabel: m.alamat || undefined
    }));
  }, [mitraCandidates]);

  // Parse Excel when file is uploaded or sheet changes
  const handleFileUpload = useCallback(async (selectedFile: File) => {
    setFile(selectedFile);
    setIsParsingFile(true);
    try {
      const parsed = await parseExcelWorkbook(selectedFile);
      setSheetNames(parsed.sheetNames);
      setSelectedSheet(parsed.selectedSheet);
      setRawRows(parsed.rows);
      toast.success(`Berhasil membaca berkas! Ditemukan ${parsed.rows.length} baris data pada sheet "${parsed.selectedSheet}".`);
    } catch (err: any) {
      toast.error(`Gagal membaca berkas Excel: ${err.message}`);
    } finally {
      setIsParsingFile(false);
    }
  }, []);

  const handleSheetChange = useCallback(async (sheetName: string) => {
    if (!file) return;
    setIsParsingFile(true);
    setSelectedSheet(sheetName);
    try {
      const parsed = await parseExcelWorkbook(file, sheetName);
      setRawRows(parsed.rows);
      toast.success(`Berhasil beralih ke sheet "${sheetName}" (${parsed.rows.length} data).`);
    } catch (err: any) {
      toast.error(`Gagal membaca sheet: ${err.message}`);
    } finally {
      setIsParsingFile(false);
    }
  }, [file]);

  // Run Smart Matching
  const executeSmartMatching = useCallback(() => {
    if (rawRows.length === 0) {
      toast.error('Tidak ada baris data untuk dicocokkan.');
      return;
    }
    const matched = matchExcelRows(rawRows, siswaCandidates, mitraCandidates, guruCandidates);
    const uniqueIdukas = extractUniqueIdukaMappings(rawRows, mitraCandidates);

    setMatchedRows(matched);
    setIdukaMappings(uniqueIdukas);
    setCurrentStep(2);
  }, [rawRows, siswaCandidates, mitraCandidates, guruCandidates]);

  // Sync IDUKA mapping changes into matched rows when progressing to Step 4
  const proceedToSiswaReview = useCallback(() => {
    const updatedRows = applyIdukaMappingsToRows(matchedRows, idukaMappings);
    setMatchedRows(updatedRows);
    setCurrentStep(4);
  }, [matchedRows, idukaMappings]);

  // Summary counts
  const matchStats = useMemo(() => {
    const totalSiswa = matchedRows.length;
    let siswaMatchedNisn = 0;
    let siswaMatchedOther = 0;
    let siswaUnmatched = 0;

    let guruMatched = 0;
    let guruUnmatched = 0;

    matchedRows.forEach((r) => {
      if (r.siswa_match_type === 'NISN_EXACT') siswaMatchedNisn++;
      else if (r.siswa_id) siswaMatchedOther++;
      else siswaUnmatched++;

      if (r.pembimbing_id) guruMatched++;
      else guruUnmatched++;
    });

    const totalIduka = idukaMappings.length;
    let idukaExisting = 0;
    let idukaNew = 0;

    idukaMappings.forEach((im) => {
      if (im.action === 'USE_EXISTING' && im.mitra_id) idukaExisting++;
      else idukaNew++;
    });

    const readyCount = matchedRows.filter((r) => r.is_ready).length;

    return {
      totalSiswa,
      siswaMatchedNisn,
      siswaMatchedOther,
      siswaUnmatched,
      totalIduka,
      idukaExisting,
      idukaNew,
      guruMatched,
      guruUnmatched,
      readyCount,
      percentReady: totalSiswa > 0 ? Math.round((readyCount / totalSiswa) * 100) : 0
    };
  }, [matchedRows, idukaMappings]);

  // Handlers for IDUKA Mapping (Step 3)
  const handleIdukaActionToggle = useCallback((idukaName: string, action: 'USE_EXISTING' | 'CREATE_NEW') => {
    setIdukaMappings((prev) =>
      prev.map((im) => {
        if (im.iduka_name !== idukaName) return im;
        return {
          ...im,
          action,
          mitra_id: action === 'CREATE_NEW' ? null : im.mitra_id,
          mitra_db_nama: action === 'CREATE_NEW' ? null : im.mitra_db_nama,
        };
      })
    );
  }, []);

  const handleIdukaMitraChange = useCallback((idukaName: string, selectedMitraId: string) => {
    const candidate = mitraCandidates.find((m) => m.id === selectedMitraId);
    setIdukaMappings((prev) =>
      prev.map((im) => {
        if (im.iduka_name !== idukaName) return im;
        return {
          ...im,
          action: 'USE_EXISTING',
          mitra_id: selectedMitraId,
          mitra_db_nama: candidate?.nama || null,
          match_type: 'MANUAL',
        };
      })
    );
  }, [mitraCandidates]);

  // Handlers for Siswa Mapping (Step 4)
  const handleUpdateRowSiswa = useCallback((rowId: string, newSiswaId: string) => {
    const student = siswaCandidates.find((s) => s.id === newSiswaId);
    if (!student) return;
    setMatchedRows((prev) =>
      prev.map((r) => {
        if (r.row_id !== rowId) return r;
        return {
          ...r,
          siswa_id: student.id,
          siswa_db_nama: student.nama_siswa,
          siswa_match_type: 'MANUAL',
          is_ready: !!(r.mitra_id || r.tempat_pkl_excel)
        };
      })
    );
  }, [siswaCandidates]);

  const handleUpdateRowGuru = useCallback((rowId: string, newGuruId: string) => {
    const guru = guruCandidates.find((g) => g.id === newGuruId);
    if (!guru) return;
    setMatchedRows((prev) =>
      prev.map((r) => {
        if (r.row_id !== rowId) return r;
        return {
          ...r,
          pembimbing_id: guru.id,
          pembimbing_db_nama: guru.nama_guru,
          pembimbing_match_type: 'MANUAL'
        };
      })
    );
  }, [guruCandidates]);

  // Filtered IDUKA (Step 3)
  const filteredIdukas = useMemo(() => {
    let list = idukaMappings;
    if (idukaFilter === 'EXISTING') {
      list = list.filter((im) => im.action === 'USE_EXISTING' && im.mitra_id);
    } else if (idukaFilter === 'NEW') {
      list = list.filter((im) => im.action === 'CREATE_NEW' || !im.mitra_id);
    }

    if (idukaSearch.trim()) {
      const q = idukaSearch.toLowerCase().trim();
      list = list.filter(
        (im) =>
          im.iduka_name.toLowerCase().includes(q) ||
          (im.alamat && im.alamat.toLowerCase().includes(q)) ||
          (im.mitra_db_nama && im.mitra_db_nama.toLowerCase().includes(q))
      );
    }

    return list;
  }, [idukaMappings, idukaFilter, idukaSearch]);

  const totalIdukaPages = Math.ceil(filteredIdukas.length / idukaPageSize) || 1;
  const paginatedIdukas = useMemo(() => {
    const start = (idukaPage - 1) * idukaPageSize;
    return filteredIdukas.slice(start, start + idukaPageSize);
  }, [filteredIdukas, idukaPage, idukaPageSize]);

  // Filtered Siswa (Step 4)
  const filteredSiswaRows = useMemo(() => {
    let rows = matchedRows;
    if (siswaFilter === 'MATCHED') {
      rows = rows.filter((r) => !!r.siswa_id);
    } else if (siswaFilter === 'UNMATCHED') {
      rows = rows.filter((r) => !r.siswa_id);
    }

    if (siswaSearch.trim()) {
      const q = siswaSearch.toLowerCase().trim();
      rows = rows.filter(
        (r) =>
          r.nama_siswa_excel.toLowerCase().includes(q) ||
          r.nisn.toLowerCase().includes(q) ||
          r.tempat_pkl_excel.toLowerCase().includes(q) ||
          r.pembimbing_excel.toLowerCase().includes(q) ||
          (r.siswa_db_nama && r.siswa_db_nama.toLowerCase().includes(q))
      );
    }

    return rows;
  }, [matchedRows, siswaFilter, siswaSearch]);

  const totalSiswaPages = Math.ceil(filteredSiswaRows.length / siswaPageSize) || 1;
  const paginatedSiswaRows = useMemo(() => {
    const start = (siswaPage - 1) * siswaPageSize;
    return filteredSiswaRows.slice(start, start + siswaPageSize);
  }, [filteredSiswaRows, siswaPage, siswaPageSize]);

  // Import Mutation (Step 5)
  const importMutation = useMutation({
    mutationFn: async (payload: any) => {
      return hubinApi.importExcelPlotting(payload);
    },
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['penempatan-pkl'] });
      queryClient.invalidateQueries({ queryKey: ['pkl-rekap'] });
      queryClient.invalidateQueries({ queryKey: ['hubin-dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['mitra-pkl'] });
      setImportProgress(100);
      setImportResult(res.data);
      toast.success(res.message || 'Import plotting PKL berhasil disimpan!');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || err.message || 'Gagal mengimpor plotting PKL.');
    }
  });

  const handleStartImport = useCallback(() => {
    const validItems = matchedRows
      .filter((r) => r.is_ready && r.siswa_id)
      .map((r) => ({
        siswa_id: r.siswa_id!,
        nisn: r.nisn || undefined,
        nama_siswa_excel: r.nama_siswa_excel,
        mitra_id: r.mitra_id || undefined,
        mitra_nama: r.tempat_pkl_excel,
        mitra_alamat: r.alamat_excel || undefined,
        create_mitra_if_missing: true,
        pembimbing_id: r.pembimbing_id || null,
        tanggal_mulai: r.tanggal_mulai,
        tanggal_selesai: r.tanggal_selesai || null,
        status: 'AKTIF',
        instruktur_nama: r.kontak_person_excel || null,
        penanggung_jawab_nama: r.jabatan_person_excel || null,
        no_telp_mitra: r.no_telp_excel || null
      }));

    if (validItems.length === 0) {
      toast.error('Tidak ada data penempatan yang valid untuk diimpor.');
      return;
    }

    setImportProgress(35);
    importMutation.mutate({
      items: validItems,
      tahun_pelajaran_id: targetTpId || undefined
    });
  }, [matchedRows, targetTpId, importMutation]);

  const handleClose = () => {
    setCurrentStep(1);
    setFile(null);
    setRawRows([]);
    setMatchedRows([]);
    setIdukaMappings([]);
    setImportResult(null);
    setImportProgress(0);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Wizard Import Plotting Siswa PKL (Excel)"
      size="full"
    >
      <div className="flex flex-col h-full w-full max-w-full min-w-0 space-y-4">
        {/* Stepper Header Navigation (5 Steps) */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
          <div
            className={`flex items-center space-x-2 p-2 rounded-lg transition-all ${
              currentStep === 1
                ? 'bg-blue-600 text-white shadow-sm'
                : currentStep > 1
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 font-medium'
                : 'text-slate-400'
            }`}
          >
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
              currentStep === 1 ? 'bg-white text-blue-600' : currentStep > 1 ? 'bg-emerald-600 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
            }`}>
              {currentStep > 1 ? <Check className="w-3.5 h-3.5" /> : '1'}
            </div>
            <span className="text-xs sm:text-sm font-semibold truncate">Upload File</span>
          </div>

          <div
            className={`flex items-center space-x-2 p-2 rounded-lg transition-all ${
              currentStep === 2
                ? 'bg-blue-600 text-white shadow-sm'
                : currentStep > 2
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 font-medium'
                : 'text-slate-400'
            }`}
          >
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
              currentStep === 2 ? 'bg-white text-blue-600' : currentStep > 2 ? 'bg-emerald-600 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
            }`}>
              {currentStep > 2 ? <Check className="w-3.5 h-3.5" /> : '2'}
            </div>
            <span className="text-xs sm:text-sm font-semibold truncate">Smart Matching</span>
          </div>

          <div
            className={`flex items-center space-x-2 p-2 rounded-lg transition-all ${
              currentStep === 3
                ? 'bg-blue-600 text-white shadow-sm'
                : currentStep > 3
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 font-medium'
                : 'text-slate-400'
            }`}
          >
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
              currentStep === 3 ? 'bg-white text-blue-600' : currentStep > 3 ? 'bg-emerald-600 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
            }`}>
              {currentStep > 3 ? <Check className="w-3.5 h-3.5" /> : '3'}
            </div>
            <span className="text-xs sm:text-sm font-semibold truncate">Revisi IDUKA</span>
          </div>

          <div
            className={`flex items-center space-x-2 p-2 rounded-lg transition-all ${
              currentStep === 4
                ? 'bg-blue-600 text-white shadow-sm'
                : currentStep > 4
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 font-medium'
                : 'text-slate-400'
            }`}
          >
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
              currentStep === 4 ? 'bg-white text-blue-600' : currentStep > 4 ? 'bg-emerald-600 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
            }`}>
              {currentStep > 4 ? <Check className="w-3.5 h-3.5" /> : '4'}
            </div>
            <span className="text-xs sm:text-sm font-semibold truncate">Revisi Siswa</span>
          </div>

          <div
            className={`flex items-center space-x-2 p-2 rounded-lg transition-all ${
              currentStep === 5
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400'
            }`}
          >
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
              currentStep === 5 ? 'bg-white text-blue-600' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
            }`}>
              5
            </div>
            <span className="text-xs sm:text-sm font-semibold truncate">Eksekusi Batch</span>
          </div>
        </div>

        {/* ================= STEP 1: UPLOAD & EKSTRAKSI ================= */}
        {currentStep === 1 && (
          <div className="space-y-5 py-2">
            <div className="bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/50 p-4 rounded-xl flex items-start space-x-3">
              <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
              <div className="text-xs sm:text-sm text-blue-800 dark:text-blue-200 space-y-1">
                <p className="font-semibold">Format Pemetaan PKL Rekomendasi:</p>
                <p>
                  Gunakan berkas Excel hasil pemetaan PKL Anda. Sistem secara otomatis membaca sheet target <code className="bg-blue-100 dark:bg-blue-900/60 px-1 py-0.5 rounded text-xs font-mono">pemetaan pkl per-iduka</code> dengan kunci primer <strong>NISN</strong> siswa.
                </p>
              </div>
            </div>

            <div
              className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer ${
                file
                  ? 'border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/20'
                  : 'border-slate-300 dark:border-slate-700 hover:border-blue-500 hover:bg-slate-50 dark:hover:bg-slate-900/50'
              }`}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                  handleFileUpload(e.dataTransfer.files[0]);
                }
              }}
              onClick={() => {
                const el = document.getElementById('excel-file-input');
                el?.click();
              }}
            >
              <input
                id="excel-file-input"
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileUpload(e.target.files[0]);
                  }
                }}
              />
              <div className="flex flex-col items-center justify-center space-y-3">
                <div className={`p-4 rounded-2xl ${file ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-50 dark:bg-blue-900/30 text-blue-600'}`}>
                  {file ? <FileSpreadsheet className="w-10 h-10" /> : <UploadCloud className="w-10 h-10" />}
                </div>
                {file ? (
                  <div>
                    <p className="text-base font-semibold text-slate-800 dark:text-slate-100">{file.name}</p>
                    <p className="text-xs text-slate-500">{(file.size / 1024).toFixed(1)} KB • Klik untuk ganti berkas</p>
                  </div>
                ) : (
                  <div>
                    <p className="text-base font-semibold text-slate-800 dark:text-slate-100">Klik untuk upload atau seret berkas Excel ke sini</p>
                    <p className="text-xs text-slate-500">Mendukung format .xlsx dan .xls</p>
                  </div>
                )}
              </div>
            </div>

            {sheetNames.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Pilih Sheet Sumber:
                  </label>
                  <select
                    value={selectedSheet}
                    onChange={(e) => handleSheetChange(e.target.value)}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-blue-500"
                  >
                    {sheetNames.map((s) => (
                      <option key={s} value={s}>
                        {s} {s.toLowerCase().includes('iduka') ? '(Direkomendasikan)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col justify-center">
                  <div className="text-xs text-slate-500">Status Pembacaan:</div>
                  <div className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center space-x-2 mt-0.5">
                    <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <span>Terbaca {rawRows.length} baris data siswa PKL</span>
                  </div>
                </div>
              </div>
            )}

            {rawRows.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  Cuplikan 5 Baris Pertama Data Excel:
                </div>
                <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
                  <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
                    <thead className="bg-slate-100 dark:bg-slate-800/70 font-semibold text-slate-800 dark:text-slate-200 border-b border-slate-200 dark:border-slate-800">
                      <tr>
                        <th className="p-2.5">No</th>
                        <th className="p-2.5">NISN</th>
                        <th className="p-2.5">Nama Siswa</th>
                        <th className="p-2.5">Kelas</th>
                        <th className="p-2.5">Tempat PKL (DU/DI)</th>
                        <th className="p-2.5">Durasi PKL</th>
                        <th className="p-2.5">Pembimbing</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {rawRows.slice(0, 5).map((r, i) => (
                        <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-900/40">
                          <td className="p-2.5">{r.NO || i + 1}</td>
                          <td className="p-2.5 font-mono font-medium">{r.NISN || r['NISN '] || '-'}</td>
                          <td className="p-2.5 font-semibold text-slate-900 dark:text-slate-100">{r['NAMA SISWA'] || '-'}</td>
                          <td className="p-2.5">{r.KELAS || '-'}</td>
                          <td className="p-2.5 text-blue-600 dark:text-blue-400 font-medium">{r['TEMPAT PKL'] || '-'}</td>
                          <td className="p-2.5">{r['DURASI PKL'] || '-'}</td>
                          <td className="p-2.5">{r['PEMBIMBING SEKOLAH'] || r['PEMBIMBING SEKOLAH '] || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="flex justify-end pt-4 border-t border-slate-200 dark:border-slate-800">
              <Button
                variant="primary"
                disabled={rawRows.length === 0 || isParsingFile || isLoadingSiswa}
                onClick={executeSmartMatching}
                className="flex items-center space-x-2"
              >
                <span>Lanjut ke Smart Matching</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* ================= STEP 2: SMART MATCHING SUMMARY ================= */}
        {currentStep === 2 && (
          <div className="space-y-6 py-2">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 p-5 rounded-2xl border border-blue-200/60 dark:border-blue-800/40">
              <div className="flex items-center space-x-3 mb-2">
                <Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                  Hasil Analisis Pencocokan Cerdas (Smart Matching)
                </h3>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
                Sistem telah melakukan perbandingan <strong>{matchStats.totalSiswa} data siswa</strong> dan <strong>{matchStats.totalIduka} tempat PKL (IDUKA)</strong> dari berkas Excel dengan data master sekolah di database.
              </p>
            </div>

            {/* Metric Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Card 1: Siswa */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-slate-700 dark:text-slate-200 font-semibold text-sm">
                    <UserCheck className="w-4 h-4 text-emerald-600" />
                    <span>Pencocokan Siswa</span>
                  </div>
                  <Badge variant="success">{matchStats.siswaMatchedNisn + matchStats.siswaMatchedOther} Cocok</Badge>
                </div>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-slate-500">100% Cocok via NISN:</span>
                    <span className="font-bold text-emerald-600">{matchStats.siswaMatchedNisn}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-slate-500">Cocok via NIS / Nama:</span>
                    <span className="font-medium text-blue-600">{matchStats.siswaMatchedOther}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-500">Siswa Belum Ditemukan:</span>
                    <span className={`font-bold ${matchStats.siswaUnmatched > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
                      {matchStats.siswaUnmatched}
                    </span>
                  </div>
                </div>
              </div>

              {/* Card 2: Tempat PKL (IDUKA) */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-slate-700 dark:text-slate-200 font-semibold text-sm">
                    <Building2 className="w-4 h-4 text-blue-600" />
                    <span>Tempat PKL (IDUKA)</span>
                  </div>
                  <Badge variant="primary">{matchStats.totalIduka} Tempat Unik</Badge>
                </div>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-slate-500">Mitra Eksisting Sesuai:</span>
                    <span className="font-bold text-blue-600">{matchStats.idukaExisting}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-500">DU/DI Baru (Auto-Create):</span>
                    <span className="font-bold text-amber-600">{matchStats.idukaNew}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 italic pt-1">
                    *Pada langkah berikutnya Anda dapat meninjau & memetakan masing-masing IDUKA secara terpusat.
                  </p>
                </div>
              </div>

              {/* Card 3: Pembimbing */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-slate-700 dark:text-slate-200 font-semibold text-sm">
                    <GraduationCap className="w-4 h-4 text-purple-600" />
                    <span>Guru Pembimbing</span>
                  </div>
                  <Badge variant="secondary">{matchStats.guruMatched} Teridentifikasi</Badge>
                </div>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-slate-500">Cocok via NIP / Nama:</span>
                    <span className="font-bold text-purple-600">{matchStats.guruMatched}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-500">Butuh Verifikasi Guru:</span>
                    <span className="font-medium text-slate-500">{matchStats.guruUnmatched}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 italic pt-1">
                    *Guru pembimbing dapat dikonfirmasi pada tahap revisi siswa atau susulan.
                  </p>
                </div>
              </div>
            </div>

            {/* Total Ready Progress Bar */}
            <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="flex justify-between text-xs sm:text-sm font-semibold">
                <span className="text-slate-700 dark:text-slate-200">Kesiapan Data Penempatan:</span>
                <span className="text-emerald-600 dark:text-emerald-400">
                  {matchStats.readyCount} dari {matchStats.totalSiswa} Siswa Siap Diimpor ({matchStats.percentReady}%)
                </span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-emerald-500 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${matchStats.percentReady}%` }}
                />
              </div>
            </div>

            <div className="flex justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
              <Button variant="outline" onClick={() => setCurrentStep(1)} className="flex items-center space-x-2">
                <ArrowLeft className="w-4 h-4" />
                <span>Kembali ke Upload</span>
              </Button>
              <Button variant="primary" onClick={() => setCurrentStep(3)} className="flex items-center space-x-2">
                <span>Lanjut ke Revisi IDUKA (Tempat PKL)</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* ================= STEP 3: REVISI IDUKA (TERPISAH) ================= */}
        {currentStep === 3 && (
          <div className="space-y-4 py-1 flex-1 flex flex-col min-h-0">
            <div className="bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-800/40 p-3 rounded-xl flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <div>
                  <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                    Tahap 3: Pemetaan & Revisi IDUKA (Tempat PKL)
                  </h4>
                  <p className="text-xs text-slate-500">
                    Tinjau <strong>{idukaMappings.length} tempat PKL unik</strong>. Jika Anda mengubah mitra untuk suatu IDUKA, seluruh siswa di IDUKA tersebut akan otomatis tersinkronisasi.
                  </p>
                </div>
              </div>
            </div>

            {/* Toolbar & Filter Tabs */}
            <div className="flex flex-col sm:flex-row gap-3 justify-between items-stretch sm:items-center">
              <div className="flex items-center space-x-1.5 overflow-x-auto no-scrollbar">
                <button
                  type="button"
                  onClick={() => {
                    setIdukaFilter('ALL');
                    setIdukaPage(1);
                  }}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap transition-all ${
                    idukaFilter === 'ALL'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  Semua IDUKA ({idukaMappings.length})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIdukaFilter('EXISTING');
                    setIdukaPage(1);
                  }}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap transition-all ${
                    idukaFilter === 'EXISTING'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  🟢 Terdaftar di Database ({matchStats.idukaExisting})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIdukaFilter('NEW');
                    setIdukaPage(1);
                  }}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap transition-all ${
                    idukaFilter === 'NEW'
                      ? 'bg-amber-600 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  🟡 DU/DI Baru ({matchStats.idukaNew})
                </button>
              </div>

              <div className="w-full sm:w-64">
                <Input
                  placeholder="Cari nama IDUKA / alamat..."
                  value={idukaSearch}
                  onChange={(e) => {
                    setIdukaSearch(e.target.value);
                    setIdukaPage(1);
                  }}
                  leftIcon={<Search className="w-3.5 h-3.5 text-slate-400" />}
                  className="text-xs h-9"
                />
              </div>
            </div>

            {/* Table IDUKA */}
            <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl max-h-[48vh] overflow-y-auto">
              <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
                <thead className="bg-slate-100 dark:bg-slate-800/90 sticky top-0 z-10 font-semibold text-slate-800 dark:text-slate-200 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="p-2.5 w-10 text-center">No</th>
                    <th className="p-2.5 min-w-[220px]">Nama IDUKA di Excel & Alamat</th>
                    <th className="p-2.5 w-24 text-center">Jumlah Siswa</th>
                    <th className="p-2.5 w-36">Status di Database</th>
                    <th className="p-2.5 min-w-[300px]">Tindakan Pemetaan Mitra</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {paginatedIdukas.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-slate-400">
                        Tidak ada data IDUKA yang sesuai filter.
                      </td>
                    </tr>
                  ) : (
                    paginatedIdukas.map((im, idx) => (
                      <tr key={im.iduka_name} className="hover:bg-slate-50/80 dark:hover:bg-slate-900/40">
                        <td className="p-2.5 text-center font-mono text-slate-400">
                          {(idukaPage - 1) * idukaPageSize + idx + 1}
                        </td>
                        <td className="p-2.5">
                          <div className="font-bold text-slate-900 dark:text-slate-100">
                            {im.iduka_name}
                          </div>
                          {im.alamat && (
                            <div className="text-[11px] text-slate-500 truncate max-w-[260px]">
                              {im.alamat}
                            </div>
                          )}
                        </td>
                        <td className="p-2.5 text-center font-semibold text-blue-600">
                          {im.siswa_count} Siswa
                        </td>
                        <td className="p-2.5">
                          {im.match_type === 'EXACT' && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                              ✓ Cocok Persis
                            </span>
                          )}
                          {im.match_type === 'FUZZY' && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300">
                              ≈ Cocok Mirip
                            </span>
                          )}
                          {im.match_type === 'NEW' && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                              + Belum Terdaftar
                            </span>
                          )}
                          {im.match_type === 'MANUAL' && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300">
                              ✎ Dipilih Manual
                            </span>
                          )}
                        </td>
                        <td className="p-2.5">
                          <div className="space-y-1.5">
                            <div className="flex items-center space-x-3 text-[11px]">
                              <label className="flex items-center space-x-1 cursor-pointer font-medium">
                                <input
                                  type="radio"
                                  name={`action-${im.iduka_name}`}
                                  checked={im.action === 'CREATE_NEW'}
                                  onChange={() => handleIdukaActionToggle(im.iduka_name, 'CREATE_NEW')}
                                  className="text-amber-600 focus:ring-amber-500"
                                />
                                <span className={im.action === 'CREATE_NEW' ? 'text-amber-700 dark:text-amber-400 font-bold' : 'text-slate-500'}>
                                  Daftarkan Sebagai DU/DI Baru
                                </span>
                              </label>

                              <label className="flex items-center space-x-1 cursor-pointer font-medium">
                                <input
                                  type="radio"
                                  name={`action-${im.iduka_name}`}
                                  checked={im.action === 'USE_EXISTING'}
                                  onChange={() => handleIdukaActionToggle(im.iduka_name, 'USE_EXISTING')}
                                  className="text-blue-600 focus:ring-blue-500"
                                />
                                <span className={im.action === 'USE_EXISTING' ? 'text-blue-700 dark:text-blue-400 font-bold' : 'text-slate-500'}>
                                  Petakan ke Mitra DB
                                </span>
                              </label>
                            </div>

                            {im.action === 'USE_EXISTING' && (
                              <SearchableSelect
                                placeholder="Pilih mitra industri dari database..."
                                options={mitraSelectOptions}
                                value={im.mitra_id || ''}
                                onChange={(val) => handleIdukaMitraChange(im.iduka_name, val)}
                                className="text-xs"
                              />
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination IDUKA */}
            {totalIdukaPages > 1 && (
              <div className="flex justify-between items-center text-xs text-slate-500 pt-1">
                <div>
                  Menampilkan {(idukaPage - 1) * idukaPageSize + 1} -{' '}
                  {Math.min(idukaPage * idukaPageSize, filteredIdukas.length)} dari {filteredIdukas.length} IDUKA
                </div>
                <div className="flex space-x-1">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={idukaPage <= 1}
                    onClick={() => setIdukaPage((p) => Math.max(1, p - 1))}
                  >
                    Sebelumnya
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={idukaPage >= totalIdukaPages}
                    onClick={() => setIdukaPage((p) => Math.min(totalIdukaPages, p + 1))}
                  >
                    Berikutnya
                  </Button>
                </div>
              </div>
            )}

            <div className="flex justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
              <Button variant="outline" onClick={() => setCurrentStep(2)} className="flex items-center space-x-2">
                <ArrowLeft className="w-4 h-4" />
                <span>Kembali ke Metrik</span>
              </Button>
              <Button variant="primary" onClick={proceedToSiswaReview} className="flex items-center space-x-2">
                <span>Lanjut ke Revisi Siswa</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* ================= STEP 4: REVISI SISWA (TERPISAH) ================= */}
        {currentStep === 4 && (
          <div className="space-y-4 py-1 flex-1 flex flex-col min-h-0">
            <div className="bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-800/40 p-3 rounded-xl flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <UserCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <div>
                  <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                    Tahap 4: Pemetaan & Revisi Siswa
                  </h4>
                  <p className="text-xs text-slate-500">
                    Tinjau <strong>{matchedRows.length} data siswa</strong>. Kunci primer pencocokan adalah <strong>NISN</strong> (643 siswa cocok otomatis). Anda dapat memilih manual siswa yang belum terdeteksi.
                  </p>
                </div>
              </div>
            </div>

            {/* Toolbar & Filter Tabs */}
            <div className="flex flex-col sm:flex-row gap-3 justify-between items-stretch sm:items-center">
              <div className="flex items-center space-x-1.5 overflow-x-auto no-scrollbar">
                <button
                  type="button"
                  onClick={() => {
                    setSiswaFilter('ALL');
                    setSiswaPage(1);
                  }}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap transition-all ${
                    siswaFilter === 'ALL'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  Semua Siswa ({matchedRows.length})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSiswaFilter('MATCHED');
                    setSiswaPage(1);
                  }}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap transition-all ${
                    siswaFilter === 'MATCHED'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  🟢 Siswa Cocok ({matchStats.siswaMatchedNisn + matchStats.siswaMatchedOther})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSiswaFilter('UNMATCHED');
                    setSiswaPage(1);
                  }}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap transition-all ${
                    siswaFilter === 'UNMATCHED'
                      ? 'bg-rose-600 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  🔴 Belum Cocok ({matchStats.siswaUnmatched})
                </button>
              </div>

              <div className="w-full sm:w-64">
                <Input
                  placeholder="Cari nama siswa / NISN..."
                  value={siswaSearch}
                  onChange={(e) => {
                    setSiswaSearch(e.target.value);
                    setSiswaPage(1);
                  }}
                  leftIcon={<Search className="w-3.5 h-3.5 text-slate-400" />}
                  className="text-xs h-9"
                />
              </div>
            </div>

            {/* Table Siswa */}
            <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl max-h-[48vh] overflow-y-auto">
              <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
                <thead className="bg-slate-100 dark:bg-slate-800/90 sticky top-0 z-10 font-semibold text-slate-800 dark:text-slate-200 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="p-2.5 w-12 text-center">No</th>
                    <th className="p-2.5 min-w-[220px]">Siswa di Excel & Resolusi Database</th>
                    <th className="p-2.5 min-w-[200px]">Tempat PKL (Hasil Tahap 3)</th>
                    <th className="p-2.5 min-w-[180px]">Guru Pembimbing</th>
                    <th className="p-2.5 min-w-[130px]">Durasi PKL</th>
                    <th className="p-2.5 w-20 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {paginatedSiswaRows.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-slate-400">
                        Tidak ada data siswa yang sesuai filter.
                      </td>
                    </tr>
                  ) : (
                    paginatedSiswaRows.map((r) => (
                      <tr key={r.row_id} className="hover:bg-slate-50/80 dark:hover:bg-slate-900/40">
                        <td className="p-2.5 text-center font-mono text-slate-400">{r.no}</td>
                        <td className="p-2.5">
                          <div className="space-y-1">
                            <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-1.5">
                              <span>{r.nama_siswa_excel}</span>
                              {r.siswa_match_type === 'NISN_EXACT' && (
                                <span className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400 px-1 py-0.2 rounded text-[10px] font-mono">
                                  NISN ✓
                                </span>
                              )}
                              {r.siswa_match_type === 'MANUAL' && (
                                <span className="bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-400 px-1 py-0.2 rounded text-[10px]">
                                  Manual ✎
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500 font-mono">
                              NISN: {r.nisn || '-'} • Kelas: {r.kelas_excel || '-'}
                            </div>
                            {!r.siswa_id && (
                              <div className="pt-1">
                                <SearchableSelect
                                  placeholder="Pilih manual siswa dari database..."
                                  options={studentSelectOptions}
                                  value={r.siswa_id || ''}
                                  onChange={(val) => handleUpdateRowSiswa(r.row_id, val)}
                                  className="text-xs"
                                />
                              </div>
                            )}
                          </div>
                        </td>

                        {/* IDUKA Result from Step 3 */}
                        <td className="p-2.5">
                          <div className="space-y-0.5">
                            <div className="font-semibold text-slate-900 dark:text-slate-100 truncate max-w-[220px]">
                              {r.tempat_pkl_excel}
                            </div>
                            <div>
                              {r.mitra_id ? (
                                <span className="text-[10px] text-blue-600 font-medium">
                                  Mitra DB: {r.mitra_db_nama || 'Terhubung ✓'}
                                </span>
                              ) : (
                                <span className="text-[10px] text-amber-600 font-medium">
                                  + DU/DI Baru (Auto-create)
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Pembimbing */}
                        <td className="p-2.5">
                          <div className="space-y-1 min-w-[190px]">
                            <div className="flex items-center space-x-1 text-[11px]">
                              <span className="text-slate-500 truncate max-w-[140px]" title={r.pembimbing_excel}>
                                {r.pembimbing_excel ? `Excel: ${r.pembimbing_excel}` : 'Excel: -'}
                              </span>
                              {r.pembimbing_match_type === 'NIP_EXACT' && (
                                <span className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400 px-1 py-0.2 rounded text-[10px] font-mono whitespace-nowrap">
                                  NIP ✓
                                </span>
                              )}
                              {r.pembimbing_match_type === 'NAME_FUZZY' && (
                                <span className="bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-400 px-1 py-0.2 rounded text-[10px] whitespace-nowrap">
                                  Nama ≈
                                </span>
                              )}
                              {r.pembimbing_match_type === 'MANUAL' && (
                                <span className="bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-400 px-1 py-0.2 rounded text-[10px] whitespace-nowrap">
                                  Manual ✎
                                </span>
                              )}
                            </div>
                            <SearchableSelect
                              placeholder="Tunjuk guru pembimbing..."
                              options={guruOptions}
                              value={r.pembimbing_id || ''}
                              onChange={(val) => handleUpdateRowGuru(r.row_id, val)}
                              className="text-xs"
                            />
                          </div>
                        </td>

                        {/* Durasi */}
                        <td className="p-2.5">
                          <div className="text-[11px] font-medium text-slate-700 dark:text-slate-300">
                            {r.tanggal_mulai}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            s/d {r.tanggal_selesai || 'Selesai'}
                          </div>
                        </td>

                        {/* Status Icon */}
                        <td className="p-2.5 text-center">
                          {r.is_ready ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
                              Siap
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300">
                              Koreksi
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Siswa */}
            {totalSiswaPages > 1 && (
              <div className="flex justify-between items-center text-xs text-slate-500 pt-1">
                <div>
                  Menampilkan {(siswaPage - 1) * siswaPageSize + 1} -{' '}
                  {Math.min(siswaPage * siswaPageSize, filteredSiswaRows.length)} dari {filteredSiswaRows.length} data
                </div>
                <div className="flex space-x-1">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={siswaPage <= 1}
                    onClick={() => setSiswaPage((p) => Math.max(1, p - 1))}
                  >
                    Sebelumnya
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={siswaPage >= totalSiswaPages}
                    onClick={() => setSiswaPage((p) => Math.min(totalSiswaPages, p + 1))}
                  >
                    Berikutnya
                  </Button>
                </div>
              </div>
            )}

            <div className="flex justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
              <Button variant="outline" onClick={() => setCurrentStep(3)} className="flex items-center space-x-2">
                <ArrowLeft className="w-4 h-4" />
                <span>Kembali ke Revisi IDUKA</span>
              </Button>
              <Button
                variant="primary"
                onClick={() => setCurrentStep(5)}
                disabled={matchStats.readyCount === 0}
                className="flex items-center space-x-2"
              >
                <span>Lanjut ke Konfirmasi Import</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* ================= STEP 5: KONFIRMASI & EKSEKUSI BATCH ================= */}
        {currentStep === 5 && (
          <div className="space-y-6 py-4 max-w-2xl mx-auto w-full">
            {!importResult ? (
              <div className="space-y-6">
                <div className="text-center space-y-2">
                  <div className="inline-flex p-3 rounded-2xl bg-blue-50 dark:bg-blue-900/30 text-blue-600">
                    <FileSpreadsheet className="w-10 h-10" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                    Konfirmasi Final Import Plotting PKL
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-500">
                    Data IDUKA dan Siswa telah berhasil Anda petakan. Klik tombol di bawah untuk menyimpan penempatan ke database sekolah.
                  </p>
                </div>

                <div className="bg-slate-50 dark:bg-slate-900/60 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="flex justify-between py-1.5 border-b border-slate-200 dark:border-slate-800 text-sm">
                    <span className="text-slate-600 dark:text-slate-400">Total Siswa Siap Di-Plotting:</span>
                    <span className="font-bold text-emerald-600 text-base">{matchStats.readyCount} Siswa</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-200 dark:border-slate-800 text-sm">
                    <span className="text-slate-600 dark:text-slate-400">Total Tempat PKL (IDUKA):</span>
                    <span className="font-bold text-blue-600">{matchStats.totalIduka} Tempat</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-200 dark:border-slate-800 text-sm">
                    <span className="text-slate-600 dark:text-slate-400">DU/DI Baru Yang Akan Didaftarkan:</span>
                    <span className="font-bold text-amber-600">{matchStats.idukaNew} DU/DI Baru</span>
                  </div>
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center py-2 border-b border-slate-200 dark:border-slate-800 text-sm gap-1">
                    <span className="text-slate-600 dark:text-slate-400 font-medium">Tahun Pelajaran Penempatan:</span>
                    <select
                      value={targetTpId}
                      onChange={(e) => setTargetTpId(e.target.value)}
                      className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500"
                    >
                      {tpOptions?.map((tp) => (
                        <option key={tp.value} value={tp.value}>
                          {tp.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex justify-between py-1.5 text-sm">
                    <span className="text-slate-600 dark:text-slate-400">Status Awal Penempatan:</span>
                    <Badge variant="success">AKTIF</Badge>
                  </div>
                </div>

                {importMutation.isPending && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-semibold text-slate-600">
                      <span>Menyimpan penempatan batch ke database...</span>
                      <span>{importProgress}%</span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-3 overflow-hidden">
                      <div
                        className="bg-blue-600 h-3 rounded-full transition-all duration-300 animate-pulse"
                        style={{ width: `${importProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                <div className="flex justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
                  <Button
                    variant="outline"
                    disabled={importMutation.isPending}
                    onClick={() => setCurrentStep(4)}
                    className="flex items-center space-x-2"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Kembali ke Revisi Siswa</span>
                  </Button>
                  <Button
                    variant="primary"
                    disabled={importMutation.isPending}
                    onClick={handleStartImport}
                    className="flex items-center space-x-2"
                  >
                    {importMutation.isPending ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Sedang Memproses...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Mulai Impor Plotting Sekarang</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>
            ) : (
              /* Success Result Report */
              <div className="text-center space-y-6">
                <div className="inline-flex p-4 rounded-3xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600">
                  <CheckCircle2 className="w-12 h-12" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                    Import Plotting PKL Sukses!
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-500">
                    Seluruh penempatan siswa dan master DU/DI telah berhasil dikomit ke database sekolah.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 text-left">
                  <div className="bg-emerald-50/70 dark:bg-emerald-950/30 p-4 rounded-xl border border-emerald-200/50">
                    <div className="text-xs text-emerald-700 dark:text-emerald-400">Total Penempatan Tersimpan</div>
                    <div className="text-2xl font-bold text-emerald-800 dark:text-emerald-200">
                      {importResult.total_imported}
                    </div>
                  </div>
                  <div className="bg-blue-50/70 dark:bg-blue-950/30 p-4 rounded-xl border border-blue-200/50">
                    <div className="text-xs text-blue-700 dark:text-blue-400">DU/DI Baru Didaftarkan</div>
                    <div className="text-2xl font-bold text-blue-800 dark:text-blue-200">
                      {importResult.new_mitra_created}
                    </div>
                  </div>
                </div>

                <Button variant="primary" onClick={handleClose} className="w-full py-3">
                  Selesai & Buka Daftar Penempatan
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
});

ImportPlottingPklWizardModal.displayName = 'ImportPlottingPklWizardModal';
