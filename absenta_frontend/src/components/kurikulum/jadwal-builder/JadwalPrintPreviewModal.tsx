import React, { useState, useMemo, useRef } from 'react';
import { X, Printer, Download, Filter, BookOpen, User, School, CheckCircle2 } from 'lucide-react';
import { Button } from '../../ui/Button';
import { SearchableSelect } from '../../ui/SearchableSelect';
import { cn } from '../../../lib/utils';
import { generateGenericPdf } from '../../../utils/pdf/genericPdfGenerator';
import { toast } from 'react-hot-toast';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  jadwalList: any[];
  kelasList: any[];
  guruList: any[];
  mapelList: any[];
  initialMode?: 'KELAS' | 'GURU';
  initialKelasId?: string;
  initialGuruId?: string;
  tahunPelajaranName?: string;
  semesterName?: string;
  sekolahInfo?: any;
}

const HARI_LIST = ['SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU'];
const SLOTS = Array.from({ length: 12 }, (_, i) => i + 1);

export const JadwalPrintPreviewModal: React.FC<Props> = ({
  isOpen,
  onClose,
  jadwalList = [],
  kelasList = [],
  guruList = [],
  mapelList = [],
  initialMode = 'KELAS',
  initialKelasId = '',
  initialGuruId = '',
  tahunPelajaranName = '2026/2027',
  semesterName = 'Ganjil',
  sekolahInfo,
}) => {
  const [mode, setMode] = useState<'KELAS' | 'GURU'>(initialMode);
  const [selectedKelasId, setSelectedKelasId] = useState<string>(initialKelasId || (kelasList[0]?.id || kelasList[0]?.value || ''));
  const [selectedGuruId, setSelectedGuruId] = useState<string>(initialGuruId || (guruList[0]?.id || guruList[0]?.value || ''));
  const [fokusMapelId, setFokusMapelId] = useState<string>('');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const printAreaRef = useRef<HTMLDivElement>(null);

  // Sync default selection if empty
  React.useEffect(() => {
    if (!selectedKelasId && kelasList.length > 0) {
      setSelectedKelasId(kelasList[0].id || kelasList[0].value || '');
    }
    if (!selectedGuruId && guruList.length > 0) {
      setSelectedGuruId(guruList[0].id || guruList[0].value || '');
    }
  }, [kelasList, guruList, selectedKelasId, selectedGuruId]);

  // Options
  const kelasOptions = useMemo(() => {
    return kelasList.map((k: any) => ({
      label: k.nama_kelas || k.label || 'Kelas',
      value: k.id || k.value || '',
    }));
  }, [kelasList]);

  const guruOptions = useMemo(() => {
    return guruList.map((g: any) => ({
      label: g.nama_guru || g.label || g.User?.full_name || 'Guru',
      value: g.id || g.value || '',
    }));
  }, [guruList]);

  const mapelOptions = useMemo(() => {
    const list = [{ label: '✨ Semua Mata Pelajaran', value: '' }];
    mapelList.forEach((m: any) => {
      list.push({
        label: m.nama_mapel || m.label || 'Mapel',
        value: m.id || m.value || '',
      });
    });
    return list;
  }, [mapelList]);

  // Current entity metadata
  const currentKelas = useMemo(() => {
    return kelasList.find((k: any) => (k.id || k.value) === selectedKelasId);
  }, [kelasList, selectedKelasId]);

  const currentGuru = useMemo(() => {
    return guruList.find((g: any) => (g.id || g.value) === selectedGuruId);
  }, [guruList, selectedGuruId]);

  // Filtered schedules for grid preview
  const previewJadwalMap = useMemo(() => {
    const map = new Map<string, any>();
    (jadwalList || []).forEach((j: any) => {
      if (mode === 'KELAS' && selectedKelasId && j.kelas_id === selectedKelasId) {
        map.set(`${j.hari}-${j.slot_index}`, j);
      } else if (mode === 'GURU' && selectedGuruId && j.guru_id === selectedGuruId) {
        map.set(`${j.hari}-${j.slot_index}`, j);
      }
    });
    return map;
  }, [jadwalList, mode, selectedKelasId, selectedGuruId]);

  // Calculate total JP for current view
  const totalJpCount = useMemo(() => {
    let count = 0;
    previewJadwalMap.forEach((j) => {
      if (!fokusMapelId || j.mapel_id === fokusMapelId) {
        count++;
      }
    });
    return count;
  }, [previewJadwalMap, fokusMapelId]);

  if (!isOpen) return null;

  // Handle direct window print
  const handleDirectPrint = () => {
    window.print();
  };

  // Handle PDF Download
  const handleDownloadPdf = async () => {
    setIsGeneratingPdf(true);
    const toastId = toast.loading('Menyiapkan file PDF pratinjau...');
    try {
      const activeJadwal = (jadwalList || []).filter(j => {
        if (mode === 'KELAS') return j.kelas_id === selectedKelasId;
        if (mode === 'GURU') return j.guru_id === selectedGuruId;
        return true;
      });

      const blob = await generateGenericPdf({
        module: 'kurikulum',
        printType: mode === 'GURU' ? 'roster_teacher' : 'roster',
        selectedClassId: mode === 'KELAS' ? selectedKelasId : 'all',
        selectedGuruId: mode === 'GURU' ? selectedGuruId : 'all',
        sekolah: sekolahInfo,
        tenantInfo: sekolahInfo,
        includeSchoolLogo: true,
        filterData: {
          jadwalList: activeJadwal,
          classes: kelasList,
          gurus: guruList,
        }
      });

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const title = mode === 'KELAS' 
        ? `Jadwal_Kelas_${currentKelas?.nama_kelas || 'Selected'}` 
        : `Jadwal_Guru_${currentGuru?.nama_guru || 'Selected'}`;
      link.setAttribute('download', `${title.replace(/[^a-z0-9]/gi, '_')}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.dismiss(toastId);
      toast.success('File PDF berhasil diunduh!');
    } catch (err) {
      console.error('Failed to generate PDF:', err);
      toast.dismiss(toastId);
      toast.error('Gagal mengunduh file PDF.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden">
        
        {/* Modal Header */}
        <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-850/50 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold">
              🖨️
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-850 dark:text-slate-100 tracking-wide">
                Pratinjau Cetak & Dokumen PDF Jadwal Pelajaran
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">
                Format resmi siap cetak printer & diunduh sebagai dokumen PDF
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-200/60 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Filter Controls Bar */}
        <div className="p-4 bg-slate-100/60 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 space-y-3 shrink-0">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            {/* Mode Switcher */}
            <div className="flex items-center bg-slate-200/70 dark:bg-slate-900 p-1 rounded-xl border border-slate-300/60 dark:border-slate-750">
              <button
                onClick={() => setMode('KELAS')}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1 text-xs font-extrabold rounded-lg transition-all',
                  mode === 'KELAS'
                    ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                )}
              >
                <School size={14} />
                <span>Cetak Per Kelas</span>
              </button>
              <button
                onClick={() => setMode('GURU')}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1 text-xs font-extrabold rounded-lg transition-all',
                  mode === 'GURU'
                    ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                )}
              >
                <User size={14} />
                <span>Cetak Per Guru</span>
              </button>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDirectPrint}
                className="flex items-center gap-1.5 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-extrabold text-xs"
              >
                <Printer size={14} />
                <span>Cetak Printer</span>
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleDownloadPdf}
                disabled={isGeneratingPdf}
                className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs shadow-md"
              >
                <Download size={14} />
                <span>{isGeneratingPdf ? 'Memproses PDF...' : 'Unduh File PDF'}</span>
              </Button>
            </div>
          </div>

          {/* Sub Filter Dropdowns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {/* Entity Selector */}
            {mode === 'KELAS' ? (
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1">
                  <School size={12} className="text-indigo-500" />
                  <span>Pilih Kelas Cetak:</span>
                </label>
                <SearchableSelect
                  value={selectedKelasId}
                  onValueChange={setSelectedKelasId}
                  options={kelasOptions}
                  placeholder="Pilih Kelas..."
                  className="w-full"
                />
              </div>
            ) : (
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1">
                  <User size={12} className="text-indigo-500" />
                  <span>Pilih Guru Cetak:</span>
                </label>
                <SearchableSelect
                  value={selectedGuruId}
                  onValueChange={setSelectedGuruId}
                  options={guruOptions}
                  placeholder="Pilih Guru..."
                  className="w-full"
                />
              </div>
            )}

            {/* Filter Fokus Mapel */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1">
                <BookOpen size={12} className="text-amber-500" />
                <span>🎯 Filter Fokus Mapel:</span>
              </label>
              <SearchableSelect
                value={fokusMapelId}
                onValueChange={setFokusMapelId}
                options={mapelOptions}
                placeholder="Semua Mapel..."
                className="w-full"
              />
            </div>

            {/* JP Summary Pill */}
            <div className="space-y-1 flex flex-col justify-end">
              <div className="p-2 bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/80 rounded-xl flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-600 dark:text-slate-400">Total Alokasi Terpasang:</span>
                <span className="font-black text-indigo-600 dark:text-indigo-400 text-sm">
                  {totalJpCount} JP / Minggu
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Printable Document Preview Paper */}
        <div className="flex-1 p-4 overflow-y-auto bg-slate-200/50 dark:bg-slate-950/80 flex justify-center">
          <div
            ref={printAreaRef}
            className="w-full max-w-[800px] bg-white text-slate-900 p-6 sm:p-8 rounded-xl shadow-lg border border-slate-200 font-sans print:shadow-none print:border-none print:p-0 print:w-full print:max-w-none space-y-5"
          >
            {/* Kop Sekolah Header */}
            <div className="border-b-2 border-slate-900 pb-3 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                {sekolahInfo?.logo_url ? (
                  <img src={sekolahInfo.logo_url} alt="Logo" className="w-14 h-14 object-contain" />
                ) : (
                  <div className="w-12 h-12 bg-indigo-600 text-white font-black text-xl rounded-xl flex items-center justify-center">
                    A
                  </div>
                )}
                <div>
                  <h2 className="text-base font-black uppercase tracking-wider text-slate-900 leading-tight">
                    {sekolahInfo?.nama_sekolah || sekolahInfo?.nama || 'SEKOLAH ABSENTA ACADEMY'}
                  </h2>
                  <p className="text-[11px] text-slate-600 font-semibold leading-tight">
                    {sekolahInfo?.alamat || 'Jl. Pendidikan No. 100, Indonesia'}
                  </p>
                  <p className="text-[10px] text-slate-500 font-medium">
                    Tahun Pelajaran: {tahunPelajaranName} | Semester: {semesterName}
                  </p>
                </div>
              </div>
            </div>

            {/* Document Title Banner */}
            <div className="text-center space-y-1">
              <h1 className="text-base font-black uppercase tracking-widest text-slate-900">
                {mode === 'KELAS'
                  ? `JADWAL PELAJARAN KELAS ${currentKelas?.nama_kelas || currentKelas?.label || '...'}`
                  : `JADWAL MENGAJAR GURU: ${currentGuru?.nama_guru || currentGuru?.label || '...'}`}
              </h1>
              {fokusMapelId && (
                <div className="inline-block bg-amber-100 text-amber-800 text-[10px] font-black px-2.5 py-0.5 rounded-full border border-amber-300">
                  🎯 FOKUS MAPEL: {mapelList.find(m => (m.id || m.value) === fokusMapelId)?.nama_mapel || 'Mapel Terpilih'}
                </div>
              )}
            </div>

            {/* Main Timetable Grid Table */}
            <div className="overflow-x-auto border border-slate-900 rounded-lg">
              <table className="w-full text-center border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-900 font-black text-[10px] uppercase">
                    <th className="p-2 border-r border-slate-900 w-16">JAM</th>
                    {HARI_LIST.map(h => (
                      <th key={h} className="p-2 border-r last:border-r-0 border-slate-900">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {SLOTS.map((slotIndex) => (
                    <tr key={slotIndex} className="hover:bg-slate-50">
                      <td className="p-1.5 border-r border-slate-900 font-black text-[10px] bg-slate-50">
                        {slotIndex}
                      </td>
                      {HARI_LIST.map((h) => {
                        const item = previewJadwalMap.get(`${h}-${slotIndex}`);
                        const isFocused = !fokusMapelId || (item && item.mapel_id === fokusMapelId);

                        if (!item) {
                          return (
                            <td key={h} className="p-1.5 border-r last:border-r-0 border-slate-300 text-slate-300 text-[9px]">
                              -
                            </td>
                          );
                        }

                        return (
                          <td
                            key={h}
                            className={cn(
                              'p-1.5 border-r last:border-r-0 border-slate-400 transition-all',
                              isFocused ? 'bg-indigo-50/50 font-bold' : 'opacity-30 bg-slate-100/50'
                            )}
                          >
                            <div className="space-y-0.5">
                              <div className="font-black text-[10.5px] text-slate-900 leading-tight">
                                {item.Mapel?.nama_mapel || item.jenis_kegiatan}
                              </div>
                              <div className="text-[9px] text-slate-600 font-semibold leading-none">
                                {mode === 'KELAS'
                                  ? (item.Guru?.nama_guru || item.Guru?.User?.full_name || 'Guru KBM')
                                  : (item.Kelas?.nama_kelas || 'Kelas KBM')}
                              </div>
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Legal Signatures / Approval Block */}
            <div className="pt-6 grid grid-cols-2 text-center text-xs font-semibold text-slate-800">
              <div>
                <p className="text-[10px] text-slate-500">Mengetahui,</p>
                <p className="font-bold">Wakasek Kurikulum</p>
                <div className="h-14"></div>
                <p className="font-black underline">( .................................................. )</p>
                <p className="text-[10px] text-slate-500">NIP. -</p>
              </div>

              <div>
                <p className="text-[10px] text-slate-500">
                  {sekolahInfo?.kota || 'Kabupaten'}, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
                <p className="font-bold">
                  {mode === 'KELAS' ? 'Wali Kelas' : 'Kepala Sekolah'}
                </p>
                <div className="h-14"></div>
                <p className="font-black underline">( .................................................. )</p>
                <p className="text-[10px] text-slate-500">NIP. -</p>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};
