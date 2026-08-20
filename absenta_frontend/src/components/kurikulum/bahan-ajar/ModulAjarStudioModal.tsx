import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  BookOpen,
  Sparkles,
  Clock,
  CheckCircle2,
  Plus,
  Trash2,
  Copy,
  Save,
  Presentation,
  HelpCircle,
  FileText,
  Users,
  Compass,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Layers,
  X,
  AlertCircle,
  Eye
} from 'lucide-react';
import { Modal, Button } from '../../ui';
import {
  getReaderContent,
  saveReaderContent,
  getBahanAjarPresets,
  getBahanAjarPresetById,
  PertemuanItem,
  BahanAjarPresetData
} from '../../../api/bahan-ajar.api';
import { toast } from 'react-hot-toast';
import { cn } from '../../../lib/utils';
import { BahanAjarReaderModal } from './BahanAjarReaderModal';

interface ModulAjarStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  perangkatId: string;
  perangkatJudul?: string;
  mapelNama?: string;
  tingkat?: number;
  fase?: string;
}

export const ModulAjarStudioModal: React.FC<ModulAjarStudioModalProps> = ({
  isOpen,
  onClose,
  perangkatId,
  perangkatJudul,
  mapelNama,
  tingkat,
  fase
}) => {
  const queryClient = useQueryClient();
  const [activeMeetingIdx, setActiveMeetingIdx] = useState<number>(0);
  const [pertemuanList, setPertemuanList] = useState<PertemuanItem[]>([]);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState<boolean>(false);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState<boolean>(false);
  const [selectedPresetId, setSelectedPresetId] = useState<string>('');

  // 1. Fetch Existing Structured Content for this Perangkat
  const { data: readerData, isLoading: isLoadingContent } = useQuery({
    queryKey: ['bahanAjarReaderStudio', perangkatId],
    queryFn: () => getReaderContent(perangkatId, { mapel_nama: mapelNama, fase, tingkat }),
    enabled: isOpen && Boolean(perangkatId),
    staleTime: 0
  });

  // 2. Fetch Available Global Templates for Cloning
  const { data: presetsList = [] } = useQuery({
    queryKey: ['bahanAjarPresetsList', fase],
    queryFn: () => getBahanAjarPresets({ fase }),
    enabled: isOpen
  });

  // Populate local state when readerData loads
  useEffect(() => {
    if (readerData?.konten && readerData.konten.length > 0) {
      setPertemuanList(JSON.parse(JSON.stringify(readerData.konten)));
    } else if (pertemuanList.length === 0) {
      // Default initial meeting 1 if completely empty
      setPertemuanList([
        {
          nomor_pertemuan: 1,
          alokasi_jp: 3,
          durasi_menit: 135,
          topik: 'Pertemuan 1: Pengenalan Konsep & Eksplorasi Awal',
          tujuan_pembelajaran: ['Peserta didik mampu memahami konsep dasar materi secara aktif dan bernalar kritis.'],
          langkah_kbm: {
            pendahuluan: {
              durasi_menit: 15,
              kegiatan: [
                'Pembukaan: Guru membuka pelajaran dengan salam, doa bersama, dan presensi siswa.',
                'Apersepsi (Mindful Learning): Guru mengaitkan pembelajaran dengan pengalaman nyata siswa.',
                'Pertanyaan Pemantik: "Bagaimana materi ini membantu kita memecahkan masalah dalam kehidupan sehari-hari?"'
              ]
            },
            inti: {
              durasi_menit: 105,
              kegiatan: [
                'Eksplorasi Konsep: Siswa mengkaji materi dan teks bacaan secara mandiri/kelompok.',
                'Diskusi Kelompok (Gotong Royong): Siswa berkolaborasi mengerjakan tantangan lembar kerja.',
                'Presentasi & Umpan Balik: Perwakilan kelompok menyampaikan hasil temuan di depan kelas.'
              ],
              teks_bacaan: {
                judul: 'Teks Bacaan Materi Pembelajaran',
                paragraf: [
                  'Tuliskan uraian materi pokok, studi kasus, atau teks bacaan siswa pada bagian ini.',
                  'Paragraf ini akan otomatis tampil di layar proyektor kelas saat guru mengaktifkan Mode Proyektor.'
                ]
              },
              lkpd: {
                judul: 'LKPD 1: Lembar Diskusi & Analisis Kelompok',
                petunjuk: '1. Diskusikan teks bacaan di atas bersama kelompokmu!\n2. Selesaikan pertanyaan analisis dan catat kesimpulan kelompokmu!'
              }
            },
            penutup: {
              durasi_menit: 15,
              kegiatan: [
                'Refleksi Pembelajaran: Siswa menyampaikan hal baru yang dipelajari hari ini.',
                'Rangkuman bersama guru dan doa penutup.'
              ]
            }
          }
        }
      ]);
    }
  }, [readerData]);

  // Active meeting object
  const currentMeeting = pertemuanList[activeMeetingIdx] || pertemuanList[0];

  // 3. Save Mutation
  const saveMutation = useMutation({
    mutationFn: (dataToSave: PertemuanItem[]) => saveReaderContent(perangkatId, dataToSave, {
      judul: perangkatJudul,
      mapel_nama: mapelNama,
      fase,
      tingkat
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bahanAjarReader'] });
      queryClient.invalidateQueries({ queryKey: ['bahanAjarReaderStudio'] });
      queryClient.invalidateQueries({ queryKey: ['myPerangkatAjarKbm'] });
      queryClient.invalidateQueries({ queryKey: ['perangkat-ajar'] });
      toast.success('💾 Seluruh Pertemuan Berhasil Disimpan ke Asisten Mengajar!', { icon: '✨' });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Gagal menyimpan modul ajar');
    }
  });

  // Helpers for modifying meetings
  const handleAddMeeting = () => {
    const newNum = pertemuanList.length + 1;
    const newMeeting: PertemuanItem = {
      nomor_pertemuan: newNum,
      alokasi_jp: 3,
      durasi_menit: 135,
      topik: `Pertemuan ${newNum}: Topik Pembelajaran Lanjutan`,
      tujuan_pembelajaran: [`Menguasai indikator capaian pada Pertemuan ${newNum}`],
      langkah_kbm: {
        pendahuluan: {
          durasi_menit: 15,
          kegiatan: [
            'Pembukaan: Salam, doa, dan presensi.',
            'Apersepsi: Mengaitkan dengan pertemuan sebelumnya.',
            'Pertanyaan Pemantik: "Apa hal baru yang ingin kita eksplorasi hari ini?"'
          ]
        },
        inti: {
          durasi_menit: 105,
          kegiatan: [
            'Eksplorasi Konsep & Praktik Penerapan.',
            'Diskusi Kelompok & Pengerjaan LKPD.',
            'Apresiasi & Presentasi Kelas.'
          ],
          teks_bacaan: {
            judul: `Materi Bacaan Pertemuan ${newNum}`,
            paragraf: ['Tuliskan uraian bahan bacaan siswa di sini...']
          },
          lkpd: {
            judul: `LKPD Pertemuan ${newNum}`,
            petunjuk: '1. Pelajari materi bersama kelompok!\n2. Selesaikan tantangan dan presentasikan!'
          }
        },
        penutup: {
          durasi_menit: 15,
          kegiatan: ['Refleksi penutup, rangkuman, dan doa bersama.']
        }
      }
    };

    setPertemuanList([...pertemuanList, newMeeting]);
    setActiveMeetingIdx(pertemuanList.length);
    toast.success(`➕ Pertemuan ${newNum} berhasil ditambahkan!`);
  };

  const handleDeleteMeeting = (idxToDelete: number) => {
    if (pertemuanList.length <= 1) {
      toast.error('Modul ajar minimal harus memiliki 1 pertemuan!');
      return;
    }

    const updated = pertemuanList.filter((_, idx) => idx !== idxToDelete).map((m, i) => ({
      ...m,
      nomor_pertemuan: i + 1
    }));

    setPertemuanList(updated);
    setActiveMeetingIdx(Math.max(0, activeMeetingIdx - 1));
    toast.success('🗑️ Pertemuan berhasil dihapus');
  };

  const handleDuplicateMeeting = (idxToDup: number) => {
    const target = pertemuanList[idxToDup];
    const duplicated: PertemuanItem = JSON.parse(JSON.stringify(target));
    duplicated.topik = `${duplicated.topik} (Salinan)`;
    
    const updated = [...pertemuanList];
    updated.splice(idxToDup + 1, 0, duplicated);
    const renumbered = updated.map((m, i) => ({ ...m, nomor_pertemuan: i + 1 }));

    setPertemuanList(renumbered);
    setActiveMeetingIdx(idxToDup + 1);
    toast.success('📑 Pertemuan berhasil diduplikasi!');
  };

  // Update field on current meeting
  const updateCurrentMeeting = (updater: (prev: PertemuanItem) => PertemuanItem) => {
    setPertemuanList(prevList => {
      const copy = [...prevList];
      if (copy[activeMeetingIdx]) {
        copy[activeMeetingIdx] = updater(copy[activeMeetingIdx]);
      }
      return copy;
    });
  };

  // Clone from preset template
  const handleCloneFromTemplate = async (presetId: string) => {
    try {
      const preset = await getBahanAjarPresetById(presetId);
      if (preset && preset.konten_json && Array.isArray(preset.konten_json)) {
        setPertemuanList(JSON.parse(JSON.stringify(preset.konten_json)));
        setActiveMeetingIdx(0);
        setIsTemplateModalOpen(false);
        toast.success(`📋 Berhasil mengadopsi ${preset.konten_json.length} pertemuan dari '${preset.judul_modul}'!`, { icon: '✨' });
      }
    } catch (err: any) {
      toast.error('Gagal menyalin dari template: ' + err.message);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      zIndex={80}
      size="full"
      className="h-[98vh] max-h-[98vh] flex flex-col rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden bg-slate-50 dark:bg-slate-900"
      title={
        <div className="flex items-center justify-between w-full pr-6 flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-600 text-white rounded-2xl shadow-md shadow-indigo-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-black text-slate-900 dark:text-white text-base">
                  Studio Modul Ajar &amp; Asisten Mengajar Guru
                </span>
                {fase && (
                  <span className="px-2 py-0.5 rounded-lg bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 font-black text-[10px]">
                    Fase {fase} (Kelas {tingkat || 10})
                  </span>
                )}
                <span className="px-2 py-0.5 rounded-lg bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 font-bold text-[10px]">
                  {mapelNama || 'Perangkat Ajar'}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                {perangkatJudul || 'Susun pertemuan pembelajaran bertahap untuk dipakai di kelas & proyektor'}
              </p>
            </div>
          </div>

          {/* Action Header Buttons */}
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsTemplateModalOpen(true)}
              className="h-9 px-3 rounded-xl font-bold text-xs bg-white dark:bg-slate-800 flex items-center gap-1.5 cursor-pointer shadow-xs border-slate-200 dark:border-slate-700 hover:bg-slate-100"
              title="Salin langkah pembelajaran dari Template Nasional yang sudah ada"
            >
              <Copy size={13} className="text-indigo-600 dark:text-indigo-400" />
              <span>Salin dari Template</span>
            </Button>

            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setIsPreviewModalOpen(true)}
              className="h-9 px-3 rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200"
              title="Uji coba tampilan modul ini di Mode Baca & Layar Proyektor"
            >
              <Presentation size={14} className="text-amber-500" />
              <span>Uji Tayang Proyektor</span>
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={() => saveMutation.mutate(pertemuanList)}
              disabled={saveMutation.isPending}
              className="h-9 px-4 rounded-xl font-black text-xs bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5 cursor-pointer shadow-md shadow-emerald-900/20"
            >
              <Save size={14} />
              <span>{saveMutation.isPending ? 'Menyimpan...' : 'Simpan Modul'}</span>
            </Button>
          </div>
        </div>
      }
    >
      <div className="flex flex-1 overflow-hidden">
        {/* ── SIDEBAR KIRI: DAFTAR PERTEMUAN ── */}
        <div className="w-64 sm:w-72 bg-white dark:bg-slate-900 border-r border-slate-200/80 dark:border-slate-800 p-3 flex flex-col shrink-0 overflow-y-auto custom-scrollbar">
          <div className="space-y-2.5 pb-6">
            <div className="flex items-center justify-between px-1 pb-1">
              <span className="text-[11px] font-black tracking-wider uppercase text-slate-400 dark:text-slate-500">
                Daftar Pertemuan ({pertemuanList.length})
              </span>
              <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 font-mono">
                Total {pertemuanList.reduce((acc, p) => acc + (p.alokasi_jp || 3), 0)} JP
              </span>
            </div>

            {pertemuanList.map((pt, idx) => {
              const isActive = idx === activeMeetingIdx;
              return (
                <div
                  key={idx}
                  onClick={() => setActiveMeetingIdx(idx)}
                  className={cn(
                    "p-3 rounded-2xl transition-all cursor-pointer border flex flex-col gap-1 text-xs relative group",
                    isActive
                      ? "bg-indigo-50 dark:bg-indigo-950/70 border-indigo-300 dark:border-indigo-700 shadow-xs"
                      : "bg-slate-50/70 dark:bg-slate-800/40 border-slate-200/60 dark:border-slate-800/60 hover:bg-slate-100"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className={cn(
                      "font-black text-[11px] px-2 py-0.5 rounded-md",
                      isActive
                        ? "bg-indigo-600 text-white"
                        : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold"
                    )}>
                      Pertemuan {pt.nomor_pertemuan || idx + 1}
                    </span>
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] font-bold text-slate-400 font-mono">
                        {pt.alokasi_jp || 3} JP
                      </span>

                      {/* Quick Duplicate / Delete on Hover */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDuplicateMeeting(idx);
                        }}
                        title="Duplikasi pertemuan"
                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-500 transition-opacity"
                      >
                        <Copy size={11} />
                      </button>

                      {pertemuanList.length > 1 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteMeeting(idx);
                          }}
                          title="Hapus pertemuan"
                          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-rose-100 dark:hover:bg-rose-900/50 rounded text-rose-500 transition-opacity"
                        >
                          <Trash2 size={11} />
                        </button>
                      )}
                    </div>
                  </div>
                  <p className={cn(
                    "font-bold text-xs line-clamp-2 leading-snug pt-0.5",
                    isActive ? "text-indigo-950 dark:text-indigo-100" : "text-slate-700 dark:text-slate-300"
                  )}>
                    {pt.topik}
                  </p>
                </div>
              );
            })}

            {/* Dynamic Add Meeting Button - Always right below the last meeting card */}
            <div className="pt-1.5">
              <Button
                type="button"
                variant="outline"
                onClick={handleAddMeeting}
                className="w-full h-11 rounded-2xl font-black text-xs border-dashed border-2 border-indigo-300 dark:border-indigo-700/80 text-indigo-700 dark:text-indigo-300 bg-indigo-50/40 dark:bg-indigo-950/20 hover:bg-indigo-100/70 dark:hover:bg-indigo-900/40 flex items-center justify-center gap-2 cursor-pointer shadow-xs transition-all active:scale-[0.98]"
              >
                <Plus size={15} className="stroke-[2.5]" />
                <span>+ Tambah Pertemuan Baru</span>
              </Button>
            </div>
          </div>
        </div>

        {/* ── AREA EDITOR UTAMA (STUDIO BLOK FORM) ── */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 sm:p-8 space-y-6 bg-white dark:bg-slate-950">
          {currentMeeting && (
            <div className="max-w-4xl mx-auto space-y-6">
              {/* CARD 1: IDENTITAS & TARGET PERTEMUAN */}
              <div className="p-5 rounded-3xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 shadow-xs">
                <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-200/80 dark:border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 rounded-xl bg-indigo-600 text-white font-black text-xs">
                      PERTEMUAN {currentMeeting.nomor_pertemuan}
                    </span>
                    <span className="text-xs font-bold text-slate-500">
                      Identitas &amp; Target Kompetensi
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 text-xs font-bold text-slate-600 dark:text-slate-300">
                      <span>Alokasi JP:</span>
                      <input
                        type="number"
                        min={1}
                        max={10}
                        value={currentMeeting.alokasi_jp || 3}
                        onChange={(e) => {
                          const jp = parseInt(e.target.value, 10) || 1;
                          updateCurrentMeeting(prev => ({
                            ...prev,
                            alokasi_jp: jp,
                            durasi_menit: jp * 45
                          }));
                        }}
                        className="w-14 px-2 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-center font-black"
                      />
                      <span className="text-slate-400 font-mono text-[11px]">({(currentMeeting.alokasi_jp || 3) * 45}m)</span>
                    </div>
                  </div>
                </div>

                {/* Input Judul / Topik Pertemuan */}
                <div className="space-y-1.5">
                  <label className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Topik / Materi Pokok Pertemuan:
                  </label>
                  <input
                    type="text"
                    value={currentMeeting.topik}
                    onChange={(e) => updateCurrentMeeting(prev => ({ ...prev, topik: e.target.value }))}
                    placeholder="Contoh: Pengertian, Fungsi, dan Struktur Teks LHO"
                    className="w-full px-4 py-2.5 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-black text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>

                {/* Input Tujuan Pembelajaran */}
                <div className="space-y-1.5">
                  <label className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center justify-between">
                    <span>Tujuan Pembelajaran (1 baris per poin):</span>
                    <span className="text-[10px] text-slate-400 font-normal">Otomatis dipisah per baris baru</span>
                  </label>
                  <textarea
                    rows={2}
                    value={(currentMeeting.tujuan_pembelajaran || []).join('\n')}
                    onChange={(e) => updateCurrentMeeting(prev => ({
                      ...prev,
                      tujuan_pembelajaran: e.target.value.split('\n').filter(Boolean)
                    }))}
                    placeholder="1. Peserta didik mampu menganalisis struktur teks...\n2. Peserta didik mampu memilah data fakta vs opini..."
                    className="w-full px-4 py-2 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none leading-relaxed"
                  />
                </div>
              </div>

              {/* CARD 2: TAHAP 1 — PENDAHULUAN & APERSEPSI */}
              <div className="p-5 rounded-3xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/50 space-y-4 shadow-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200 font-black text-sm">
                    <HelpCircle className="w-4 h-4 text-amber-600" />
                    <span>Tahap 1: Pendahuluan, Apersepsi &amp; Pertanyaan Pemantik (15 Menit)</span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-lg bg-amber-200/80 dark:bg-amber-900 text-amber-900 dark:text-amber-200 font-black text-xs font-mono">
                    Slide Proyektor 1
                  </span>
                </div>

                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-amber-900 dark:text-amber-300">
                      Runtutan Kegiatan Pembukaan &amp; Pertanyaan Pemantik (1 baris per aktivitas):
                    </label>
                    <textarea
                      rows={3}
                      value={(currentMeeting.langkah_kbm?.pendahuluan?.kegiatan || []).join('\n')}
                      onChange={(e) => updateCurrentMeeting(prev => ({
                        ...prev,
                        langkah_kbm: {
                          ...prev.langkah_kbm,
                          pendahuluan: {
                            durasi_menit: 15,
                            kegiatan: e.target.value.split('\n').filter(Boolean)
                          }
                        }
                      }))}
                      placeholder="Pembukaan: Guru membuka dengan salam dan doa.\nApersepsi: Guru menampilkan gambar fenomena alam.\nPertanyaan Pemantik: Mengapa fakta penting dalam observasi?"
                      className="w-full px-4 py-2.5 rounded-2xl border border-amber-200 dark:border-amber-900/60 bg-white dark:bg-slate-900 text-xs font-medium text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-amber-500 outline-none leading-relaxed"
                    />
                  </div>
                </div>
              </div>

              {/* CARD 3: TAHAP 2 — KEGIATAN INTI, TEKS BACAAN & LKPD */}
              <div className="p-5 rounded-3xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200/80 dark:border-blue-900/50 space-y-4 shadow-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-blue-900 dark:text-blue-200 font-black text-sm">
                    <FileText className="w-4 h-4 text-blue-600" />
                    <span>Tahap 2: Kegiatan Inti, Teks Bacaan Pokok &amp; LKPD Diskusi (105 Menit)</span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-lg bg-blue-200/80 dark:bg-blue-900 text-blue-900 dark:text-blue-200 font-black text-xs font-mono">
                    Slide Proyektor 2 &amp; 3
                  </span>
                </div>

                <div className="space-y-4">
                  {/* Runtutan Kegiatan Inti */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-blue-900 dark:text-blue-300">
                      Runtutan Kegiatan Inti &amp; Eksplorasi Konsep (1 baris per aktivitas):
                    </label>
                    <textarea
                      rows={3}
                      value={(currentMeeting.langkah_kbm?.inti?.kegiatan || []).join('\n')}
                      onChange={(e) => updateCurrentMeeting(prev => ({
                        ...prev,
                        langkah_kbm: {
                          ...prev.langkah_kbm,
                          inti: {
                            ...prev.langkah_kbm.inti,
                            durasi_menit: (prev.alokasi_jp * 45) - 30,
                            kegiatan: e.target.value.split('\n').filter(Boolean)
                          }
                        }
                      }))}
                      placeholder="1. Siswa menyimak penjelasan konsep...\n2. Siswa berdiskusi kelompok membedah teks...\n3. Presentasi perwakilan kelompok..."
                      className="w-full px-4 py-2.5 rounded-2xl border border-blue-200 dark:border-blue-900/60 bg-white dark:bg-slate-900 text-xs font-medium text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none leading-relaxed"
                    />
                  </div>

                  {/* Teks Bacaan Pokok Siswa */}
                  <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-900/60 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black uppercase text-blue-700 dark:text-blue-300 flex items-center gap-1.5">
                        <BookOpen size={13} />
                        <span>Teks Bacaan / Materi Pokok Siswa:</span>
                      </span>
                    </div>

                    <input
                      type="text"
                      value={currentMeeting.langkah_kbm?.inti?.teks_bacaan?.judul || ''}
                      onChange={(e) => updateCurrentMeeting(prev => ({
                        ...prev,
                        langkah_kbm: {
                          ...prev.langkah_kbm,
                          inti: {
                            ...prev.langkah_kbm.inti,
                            teks_bacaan: {
                              judul: e.target.value,
                              paragraf: prev.langkah_kbm.inti?.teks_bacaan?.paragraf || ['']
                            }
                          }
                        }
                      }))}
                      placeholder="Judul Teks Bacaan (Contoh: Observatorium Bosscha)"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white"
                    />

                    <textarea
                      rows={4}
                      value={(currentMeeting.langkah_kbm?.inti?.teks_bacaan?.paragraf || []).join('\n\n')}
                      onChange={(e) => updateCurrentMeeting(prev => ({
                        ...prev,
                        langkah_kbm: {
                          ...prev.langkah_kbm,
                          inti: {
                            ...prev.langkah_kbm.inti,
                            teks_bacaan: {
                              judul: prev.langkah_kbm.inti?.teks_bacaan?.judul || 'Teks Materi',
                              paragraf: e.target.value.split('\n\n').filter(Boolean)
                            }
                          }
                        }
                      }))}
                      placeholder="Isi paragraf teks bacaan (Pisahkan antar-paragraf dengan baris kosong)..."
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 leading-relaxed font-normal"
                    />
                  </div>

                  {/* LKPD / Tugas Kelompok */}
                  <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-900/60 space-y-3">
                    <span className="text-xs font-black uppercase text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                      <Users size={13} />
                      <span>Lembar Kerja Siswa (LKPD) &amp; Instruksi Diskusi:</span>
                    </span>

                    <input
                      type="text"
                      value={currentMeeting.langkah_kbm?.inti?.lkpd?.judul || ''}
                      onChange={(e) => updateCurrentMeeting(prev => ({
                        ...prev,
                        langkah_kbm: {
                          ...prev.langkah_kbm,
                          inti: {
                            ...prev.langkah_kbm.inti,
                            lkpd: {
                              judul: e.target.value,
                              petunjuk: prev.langkah_kbm.inti?.lkpd?.petunjuk || ''
                            }
                          }
                        }
                      }))}
                      placeholder="Judul LKPD (Contoh: LKPD 1: Analisis Struktur Teks)"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white"
                    />

                    <textarea
                      rows={3}
                      value={currentMeeting.langkah_kbm?.inti?.lkpd?.petunjuk || ''}
                      onChange={(e) => updateCurrentMeeting(prev => ({
                        ...prev,
                        langkah_kbm: {
                          ...prev.langkah_kbm,
                          inti: {
                            ...prev.langkah_kbm.inti,
                            lkpd: {
                              judul: prev.langkah_kbm.inti?.lkpd?.judul || 'Petunjuk Tugas',
                              petunjuk: e.target.value
                            }
                          }
                        }
                      }))}
                      placeholder="1. Diskusikan bersama kelompok...\n2. Tuliskan 3 kalimat fakta ilmiah..."
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 leading-relaxed font-normal"
                    />
                  </div>
                </div>
              </div>

              {/* CARD 4: TAHAP 3 — PENUTUP & REFLEKSI */}
              <div className="p-5 rounded-3xl bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-200/80 dark:border-indigo-900/50 space-y-4 shadow-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-indigo-900 dark:text-indigo-200 font-black text-sm">
                    <Compass className="w-4 h-4 text-indigo-600" />
                    <span>Tahap 3: Penutup, Refleksi Pembelajaran &amp; Rangkuman (15 Menit)</span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-lg bg-indigo-200/80 dark:bg-indigo-900 text-indigo-900 dark:text-indigo-200 font-black text-xs font-mono">
                    Slide Proyektor 4
                  </span>
                </div>

                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-indigo-900 dark:text-indigo-300">
                      Runtutan Refleksi &amp; Penutup (1 baris per aktivitas):
                    </label>
                    <textarea
                      rows={3}
                      value={(currentMeeting.langkah_kbm?.penutup?.kegiatan || []).join('\n')}
                      onChange={(e) => updateCurrentMeeting(prev => ({
                        ...prev,
                        langkah_kbm: {
                          ...prev.langkah_kbm,
                          penutup: {
                            durasi_menit: 15,
                            kegiatan: e.target.value.split('\n').filter(Boolean)
                          }
                        }
                      }))}
                      placeholder="Refleksi: Apa pemahaman baru yang kalian dapatkan?\nRangkuman bersama guru dan penugasan tindak lanjut.\nDoa dan salam penutup."
                      className="w-full px-4 py-2.5 rounded-2xl border border-indigo-200 dark:border-indigo-900/60 bg-white dark:bg-slate-900 text-xs font-medium text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none leading-relaxed"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── MODAL 1: PREVIEW PROYEKTOR / READER TEST ── */}
      {isPreviewModalOpen && (
        <BahanAjarReaderModal
          isOpen={isPreviewModalOpen}
          onClose={() => setIsPreviewModalOpen(false)}
          perangkatId={perangkatId}
          mapelNama={mapelNama}
          tingkat={tingkat}
          fase={fase}
        />
      )}

      {/* ── MODAL 2: PILIH TEMPLATE NASIONAL UNTUK DIKLONING ── */}
      {isTemplateModalOpen && (
        <Modal
          isOpen={isTemplateModalOpen}
          onClose={() => setIsTemplateModalOpen(false)}
          size="lg"
          title={
            <div className="flex items-center gap-2">
              <Copy className="w-5 h-5 text-indigo-600" />
              <span className="font-black text-base">Salin dari Template Modul Nasional</span>
            </div>
          }
        >
          <div className="p-4 space-y-4">
            <p className="text-xs text-slate-500 leading-relaxed">
              Pilih salah satu template kurikulum mendalam yang telah disediakan platform. Seluruh pertemuan, teks bacaan, dan LKPD akan otomatis disalin ke editor Anda untuk disesuaikan.
            </p>

            <div className="space-y-2 max-h-80 overflow-y-auto custom-scrollbar">
              {presetsList.map((preset) => (
                <div
                  key={preset.id}
                  onClick={() => setSelectedPresetId(preset.id)}
                  className={cn(
                    "p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3",
                    selectedPresetId === preset.id
                      ? "bg-indigo-50 dark:bg-indigo-950 border-indigo-500"
                      : "bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 hover:bg-slate-100"
                  )}
                >
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-xs text-slate-900 dark:text-white truncate">
                        {preset.judul_modul}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-[10px] font-extrabold">
                        Fase {preset.fase}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">
                      {preset.nama_mapel_ref} • {preset.total_pertemuan} Pertemuan • {preset.total_alokasi_jp} JP
                    </p>
                  </div>

                  <Button
                    type="button"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCloneFromTemplate(preset.id);
                    }}
                    className="h-8 px-3 rounded-xl text-xs font-black bg-indigo-600 hover:bg-indigo-500 text-white shrink-0 cursor-pointer"
                  >
                    <span>Pilih &amp; Salin</span>
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </Modal>
      )}
    </Modal>
  );
};
