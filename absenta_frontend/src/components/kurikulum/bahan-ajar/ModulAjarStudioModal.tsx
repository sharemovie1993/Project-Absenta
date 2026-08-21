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
  Eye,
  Image as ImageIcon,
  UploadCloud
} from 'lucide-react';
import { Modal, Button } from '../../ui';
import {
  getReaderContent,
  saveReaderContent,
  getBahanAjarPresets,
  getBahanAjarPresetById,
  uploadBahanAjarImage,
  getMateriSlides,
  MateriSlideItem,
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
  mapelId?: string;
  mapelNama?: string;
  guruId?: string;
  tingkat?: number;
  fase?: string;
}

export const ModulAjarStudioModal: React.FC<ModulAjarStudioModalProps> = ({
  isOpen,
  onClose,
  perangkatId,
  perangkatJudul,
  mapelId,
  mapelNama,
  guruId,
  tingkat,
  fase
}) => {
  const queryClient = useQueryClient();
  const [activeMeetingIdx, setActiveMeetingIdx] = useState<number>(0);
  const [pertemuanList, setPertemuanList] = useState<PertemuanItem[]>([]);
  const [moduleJudul, setModuleJudul] = useState<string>(perangkatJudul || '');
  const [selectedFase, setSelectedFase] = useState<string>(fase || 'E');
  const [selectedTingkat, setSelectedTingkat] = useState<number>(tingkat || 10);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState<boolean>(false);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState<boolean>(false);
  const [selectedPresetId, setSelectedPresetId] = useState<string>('');

  useEffect(() => {
    if (perangkatJudul) {
      setModuleJudul(perangkatJudul);
    }
  }, [perangkatJudul]);

  useEffect(() => {
    if (fase) setSelectedFase(fase);
    if (tingkat) setSelectedTingkat(tingkat);
  }, [fase, tingkat]);

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

// ── CONTOH LENGKAP REALISTIS MODUL AJAR (FULL SAMPLE TEMPLATE) ──
const FULL_SAMPLE_MEETINGS: PertemuanItem[] = [
  {
    nomor_pertemuan: 1,
    alokasi_jp: 3,
    durasi_menit: 135,
    topik: 'Pertemuan 1: Karakteristik & Struktur Pokok Teks Laporan Hasil Observasi (LHO)',
    tujuan_pembelajaran: [
      'Peserta didik mampu menganalisis 3 struktur utama teks laporan hasil observasi (pernyataan umum, deskripsi bagian, dan deskripsi manfaat) secara kritis.',
      'Peserta didik mampu memilah data fakta objektif dengan opini dalam teks bacaan sains.',
      'Peserta didik mampu menyusun kesimpulan hasil diskusi kelompok dengan bergotong royong.'
    ],
    langkah_kbm: {
      pendahuluan: {
        durasi_menit: 15,
        kegiatan: [
          'Pembukaan: Guru membuka pelajaran dengan salam hangat, berdoa bersama, dan mengecek presensi siswa.',
          'Apersepsi (Mindful Learning): Guru mengaitkan materi dengan tayangan visual tentang fenomena alam di sekitar kita.',
          'Pertanyaan Pemantik: "Mengapa pengamatan yang objektif dan berbasis data sangat penting dalam menyusun laporan ilmiah?"'
        ],
        gambar_url: 'https://images.unsplash.com/photo-1507668077129-56e32842fceb?w=800&q=80',
        gambar_caption: 'Gambar 1.1: Pengamatan Fenomena Sains dan Observasi Lapangan'
      },
      inti: {
        durasi_menit: 105,
        kegiatan: [
          '1. Stimulasi & Eksplorasi: Siswa membaca teks observasi "Observatorium Bosscha" secara saksama.',
          '2. Diskusi Kelompok: Siswa bekerja dalam kelompok (4-5 orang) membedah struktur paragraf dan data kuantitatif.',
          '3. Pengerjaan LKPD: Setiap kelompok menuliskan hasil telaah pada lembar kerja analisis.',
          '4. Presentasi & Umpan Balik: Perwakilan kelompok memaparkan temuan di depan kelas dan ditanggapi kelompok lain.'
        ],
        teks_bacaan: {
          judul: 'Observatorium Bosscha: Jejak Astronomi Modern di Bumi Nusantara',
          paragraf: [
            'Observatorium Bosscha merupakan salah satu fasilitas observatorium astronomi tertua dan paling bersejarah di Indonesia. Terletak di Lembang, Kabupaten Bandung Barat pada ketinggian 1.310 meter di atas permukaan laut, fasilitas ini berdiri di bawah naungan Institut Teknologi Bandung (ITB) untuk menunjang penelitian dan pendidikan astrofisika.',
            'Secara struktur fisik, Bosscha memiliki kubah teleskop besar yang menaungi Teleskop Ganda Zeiss 60 cm. Instrumen optik ini digunakan untuk mengamati bintang ganda, planet-planet di tata surya, serta gerhana matahari dan bulan dengan tingkat akurasi tinggi.',
            'Keberadaan Observatorium Bosscha memiliki manfaat strategis tidak hanya bagi kemajuan riset astronomi nasional, tetapi juga sebagai cagar budaya sains yang menginspirasi generasi muda untuk mendalami literasi teknologi antariksa.'
          ],
          gambar_url: 'https://images.unsplash.com/photo-1516339901601-2e1b62dc0c45?w=800&q=80',
          gambar_caption: 'Gambar 1.2: Teropong Bintang & Kubah Observatorium Astronomi'
        },
        lkpd: {
          judul: 'LKPD 1: Bedah Struktur & Uji Fakta Ilmiah Teks Observasi',
          petunjuk: '1. Bacalah teks "Observatorium Bosscha" secara saksama bersama kelompokmu!\n2. Identifikasi bagian mana yang merupakan Pernyataan Umum, Deskripsi Bagian, dan Deskripsi Manfaat!\n3. Tuliskan minimal 3 kalimat fakta berbasis data yang terdapat di dalam teks!\n4. Siapkan 1 juru bicara kelompok untuk mempresentasikan hasil analisis di depan kelas!',
          gambar_url: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=800&q=80',
          gambar_caption: 'Gambar 1.3: Format Lembar Analisis Kolaborasi Siswa'
        }
      },
      penutup: {
        durasi_menit: 15,
        kegiatan: [
          'Refleksi Bersama: Siswa menyampaikan 1 wawasan baru yang didapatkan dan bagian yang paling menarik hari ini.',
          'Penguatan Konsep: Guru memberikan apresiasi atas kerja sama seluruh kelompok dan merangkum poin esensial.',
          'Doa penutup dan penyampaian sekilas agenda materi untuk pertemuan berikutnya.'
        ]
      }
    }
  },
  {
    nomor_pertemuan: 2,
    alokasi_jp: 3,
    durasi_menit: 135,
    topik: 'Pertemuan 2: Kaidah Kebahasaan Teks LHO (Verba Material, Nomina, dan Kalimat Definisi)',
    tujuan_pembelajaran: [
      'Peserta didik mampu mengidentifikasi kaidah kebahasaan teks laporan hasil observasi (kata benda, kata kerja aksi, istilah teknis).',
      'Peserta didik mampu menyunting ketepatan kalimat definisi dan deskripsi dalam draf laporan.'
    ],
    langkah_kbm: {
      pendahuluan: {
        durasi_menit: 15,
        kegiatan: [
          'Pembukaan: Salam hangat, doa, dan apersepsi mengaitkan dengan struktur teks pada Pertemuan 1.',
          'Pertanyaan Pemantik: "Bagaimana pemilihan kata kerja dan istilah ilmiah membuat laporan kita terdengar lebih akurat dan terpercaya?"'
        ]
      },
      inti: {
        durasi_menit: 105,
        kegiatan: [
          '1. Telaah Kalimat: Siswa mengamati tabel perbandingan kalimat definisi vs kalimat deskripsi.',
          '2. Praktik Berkelompok: Menemukan verba material dan kata istilah dalam artikel biologi/teknologi.',
          '3. Uji Coba Kuis Singkat: Diskusi interaktif menebak istilah baku vs tidak baku.'
        ],
        teks_bacaan: {
          judul: 'Kaidah Bahasa Ilmiah Populer dalam Laporan Observasi',
          paragraf: [
            'Teks laporan hasil observasi menggunakan bahasa yang lugas, baku, dan objektif. Ciri kebahasaan utamanya mencakup penggunaan verba relasional (seperti "ialah", "merupakan", "termasuk") untuk menyatakan definisi, serta verba material yang menggambarkan tindakan nyata.',
            'Selain itu, teks observasi kerap memuat istilah teknis bidang keilmuan tertentu guna menyampaikan informasi secara presisi kepada pembaca.'
          ]
        },
        lkpd: {
          judul: 'LKPD 2: Berburu Istilah Teknis & Perbaikan Kalimat Observasi',
          petunjuk: '1. Temukan 5 istilah ilmiah dalam teks bacaan dan tuliskan maknanya!\n2. Ubahlah 3 kalimat opini di bawah ini menjadi kalimat fakta objektif!'
        }
      },
      penutup: {
        durasi_menit: 15,
        kegiatan: [
          'Refleksi kilas balik pemahaman istilah kebahasaan.',
          'Rangkuman bersama dan doa penutup.'
        ]
      }
    }
  }
];

// Populate local state when readerData loads
  useEffect(() => {
    if (readerData?.konten && readerData.konten.length > 0) {
      setPertemuanList(JSON.parse(JSON.stringify(readerData.konten)));
    } else if (pertemuanList.length === 0) {
      // Default initial meeting 1 if completely empty
      setPertemuanList(JSON.parse(JSON.stringify(FULL_SAMPLE_MEETINGS)));
    }
  }, [readerData]);

  // Active meeting object
  const currentMeeting = pertemuanList[activeMeetingIdx] || pertemuanList[0];

  // 3. Save Mutation
  const saveMutation = useMutation({
    mutationFn: (dataToSave: PertemuanItem[]) => saveReaderContent(perangkatId, dataToSave, {
      judul: moduleJudul.trim() || perangkatJudul || `Modul Ajar: ${mapelNama || 'Mata Pelajaran'}`,
      mapel_id: mapelId,
      mapel_nama: mapelNama,
      guru_id: guruId,
      fase: selectedFase,
      tingkat: selectedTingkat
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

  // Clean topic name helper
  const cleanTopicName = (topik: string) => {
    if (!topik) return '';
    return topik.replace(/^Pertemuan\s*\d+\s*:\s*/i, '').trim();
  };

  // Check if meeting has content
  const isMeetingComplete = (m: PertemuanItem) => {
    const cleanTopik = cleanTopicName(m.topik);
    const hasTopic = Boolean(cleanTopik && cleanTopik !== 'Topik Pembelajaran Lanjutan' && cleanTopik !== 'Pengenalan Konsep & Eksplorasi Awal');
    const hasTujuan = Boolean(m.tujuan_pembelajaran && m.tujuan_pembelajaran.length > 0 && m.tujuan_pembelajaran[0].trim());
    const hasInti = Boolean(m.langkah_kbm?.inti?.kegiatan && m.langkah_kbm.inti.kegiatan.length > 0);
    return Boolean(hasTopic || (hasTujuan && hasInti));
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

  const [isUploadingImage, setIsUploadingImage] = useState<boolean>(false);
  const [activeMateriSlideIdx, setActiveMateriSlideIdx] = useState<number>(0);

  // Get current slides
  const currentMateriSlides: MateriSlideItem[] = getMateriSlides(currentMeeting?.langkah_kbm?.inti);
  const activeSlide: MateriSlideItem = currentMateriSlides[activeMateriSlideIdx] || currentMateriSlides[0] || {
    judul: 'Materi Pembelajaran Pokok',
    paragraf: [''],
    gambar_url: undefined,
    gambar_caption: undefined
  };

  // Update active slide
  const updateActiveSlide = (updater: (prevSlide: MateriSlideItem) => MateriSlideItem) => {
    const allSlides = [...currentMateriSlides];
    const targetIdx = Math.min(activeMateriSlideIdx, allSlides.length - 1);
    if (targetIdx >= 0 && allSlides[targetIdx]) {
      allSlides[targetIdx] = updater(allSlides[targetIdx]);
    }
    updateCurrentMeeting(prev => ({
      ...prev,
      langkah_kbm: {
        ...prev.langkah_kbm,
        inti: {
          ...prev.langkah_kbm.inti,
          materi_slides: allSlides,
          teks_bacaan: allSlides[0]
        }
      }
    }));
  };

  // Add new slide
  const handleAddMateriSlide = () => {
    const newNum = currentMateriSlides.length + 1;
    const newSlide: MateriSlideItem = {
      judul: `Materi Pokok: Bagian ${newNum}`,
      paragraf: ['Tuliskan uraian sub-materi lanjutan di sini...'],
      gambar_url: undefined,
      gambar_caption: undefined
    };
    const updated = [...currentMateriSlides, newSlide];
    updateCurrentMeeting(prev => ({
      ...prev,
      langkah_kbm: {
        ...prev.langkah_kbm,
        inti: {
          ...prev.langkah_kbm.inti,
          materi_slides: updated,
          teks_bacaan: updated[0]
        }
      }
    }));
    setActiveMateriSlideIdx(updated.length - 1);
    toast.success(`Slide Materi ${newNum} berhasil ditambahkan!`, { icon: '📄' });
  };

  // Delete slide
  const handleDeleteMateriSlide = (idxToDelete: number) => {
    if (currentMateriSlides.length <= 1) {
      toast.error('Minimal harus ada 1 slide materi pokok!');
      return;
    }
    const updated = currentMateriSlides.filter((_, i) => i !== idxToDelete);
    updateCurrentMeeting(prev => ({
      ...prev,
      langkah_kbm: {
        ...prev.langkah_kbm,
        inti: {
          ...prev.langkah_kbm.inti,
          materi_slides: updated,
          teks_bacaan: updated[0]
        }
      }
    }));
    setActiveMateriSlideIdx(Math.max(0, idxToDelete - 1));
    toast.success('Slide materi berhasil dihapus!');
  };

  // Upload image to Storage Engine (S3 / MinIO / Local)
  const handleFileUpload = async (file: File, onSuccess: (url: string) => void) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Hanya berkas gambar (JPG, PNG, WebP, GIF) yang diperbolehkan!');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Ukuran berkas gambar maksimal 5MB!');
      return;
    }

    const toastId = toast.loading('Mengunggah gambar ke Storage Engine...');
    setIsUploadingImage(true);
    try {
      const url = await uploadBahanAjarImage(file);
      onSuccess(url);
      toast.success('Gambar berhasil disimpan ke storage!', { id: toastId, icon: '🖼️' });
    } catch (err: any) {
      toast.error(err.message || 'Gagal mengunggah gambar', { id: toastId });
    } finally {
      setIsUploadingImage(false);
    }
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

  const handleLoadFullSample = () => {
    setModuleJudul('BAB 1: Teks Laporan Hasil Observasi (LHO) & Literasi Sains');
    setSelectedFase('E');
    setSelectedTingkat(10);
    setPertemuanList(JSON.parse(JSON.stringify(FULL_SAMPLE_MEETINGS)));
    setActiveMeetingIdx(0);
    toast.success('🪄 Contoh Modul Lengkap Siap Tayang Berhasil Dimuat!', { icon: '✨' });
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
                <span className="px-2 py-0.5 rounded-lg bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 font-black text-[10px]">
                  Fase {selectedFase} (Kelas {selectedTingkat})
                </span>
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
              onClick={handleLoadFullSample}
              className="h-9 px-3 rounded-xl font-bold text-xs bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300 hover:bg-purple-100 flex items-center gap-1.5 cursor-pointer shadow-xs transition-all active:scale-95"
              title="Muat contoh lengkap modul ajar beserta teks bacaan, LKPD, dan gambar nyata"
            >
              <Sparkles size={13} className="text-purple-600 dark:text-purple-400" />
              <span>Contoh Lengkap</span>
            </Button>

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
              const isComplete = isMeetingComplete(pt);
              const cleanTopic = cleanTopicName(pt.topik);

              return (
                <div
                  key={idx}
                  onClick={() => setActiveMeetingIdx(idx)}
                  className={cn(
                    "p-3 rounded-2xl transition-all cursor-pointer border flex flex-col gap-1 text-xs relative group",
                    isActive
                      ? "bg-indigo-50 dark:bg-indigo-950/70 border-indigo-300 dark:border-indigo-700 shadow-xs ring-1 ring-indigo-400"
                      : "bg-slate-50/70 dark:bg-slate-800/40 border-slate-200/60 dark:border-slate-800/60 hover:bg-slate-100"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className={cn(
                        "font-black text-[11px] px-2 py-0.5 rounded-md",
                        isActive
                          ? "bg-indigo-600 text-white"
                          : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold"
                      )}>
                        Pertemuan {pt.nomor_pertemuan || idx + 1}
                      </span>
                      {isComplete ? (
                        <span className="px-1.5 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 font-black text-[9px]">
                          🟢 Lengkap
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 font-black text-[9px]">
                          🟡 Draf
                        </span>
                      )}
                    </div>

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
                    isActive ? "text-indigo-950 dark:text-indigo-100 font-black" : "text-slate-700 dark:text-slate-300"
                  )}>
                    {cleanTopic || 'Belum ada topik'}
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
              {/* CARD 0: IDENTITAS BAB / LINGKUP MATERI UTAMA */}
              <div className="p-5 rounded-3xl bg-indigo-50/60 dark:bg-indigo-950/30 border-2 border-indigo-200/80 dark:border-indigo-800/60 space-y-3.5 shadow-xs">
                <div className="flex items-center justify-between flex-wrap gap-2 border-b border-indigo-200/60 dark:border-indigo-800/60 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 rounded-xl bg-indigo-600 text-white font-black text-xs">
                      IDENTITAS BAB &amp; MODUL
                    </span>
                    <span className="text-xs font-bold text-indigo-950 dark:text-indigo-200">
                      Lingkup Materi Pokok Modul Ini
                    </span>
                  </div>
                  <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
                    *Tampil pada Peta Bab Dashboard KBM
                  </span>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">
                    Judul Bab / Modul Ajar (Contoh: Bab 1: Teks Laporan Hasil Observasi / LHO):
                  </label>
                  <input
                    type="text"
                    value={moduleJudul}
                    onChange={(e) => setModuleJudul(e.target.value)}
                    placeholder="Contoh: Bab 1: Teks Laporan Hasil Observasi (LHO)"
                    className="w-full px-4 py-2.5 rounded-2xl border border-indigo-200 dark:border-indigo-800 bg-white dark:bg-slate-900 font-black text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 focus:outline-none shadow-xs"
                  />
                </div>

                {/* Fase & Tingkat Kelas Target Selector */}
                <div className="space-y-1.5 pt-1">
                  <label className="text-[11px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">
                    Fase &amp; Tingkat Kelas Target:
                  </label>
                  <div className="flex items-center gap-2 flex-wrap">
                    {[
                      { label: 'Fase E (Kelas 10)', faseVal: 'E', tingkatVal: 10, desc: 'Kurikulum Kelas X' },
                      { label: 'Fase F (Kelas 11)', faseVal: 'F', tingkatVal: 11, desc: 'Kurikulum Kelas XI' },
                      { label: 'Fase F (Kelas 12)', faseVal: 'F', tingkatVal: 12, desc: 'Kurikulum Kelas XII' }
                    ].map((opt) => {
                      const isSelected = selectedFase === opt.faseVal && selectedTingkat === opt.tingkatVal;
                      return (
                        <button
                          key={`${opt.faseVal}-${opt.tingkatVal}`}
                          type="button"
                          onClick={() => {
                            setSelectedFase(opt.faseVal);
                            setSelectedTingkat(opt.tingkatVal);
                          }}
                          className={cn(
                            "px-3.5 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer border flex flex-col items-start gap-0.5 text-left active:scale-95",
                            isSelected
                              ? "bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/20 ring-2 ring-indigo-400 font-black"
                              : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700/60"
                          )}
                        >
                          <span className="font-black text-xs">{opt.label}</span>
                          <span className={cn(
                            "text-[10px]",
                            isSelected ? "text-indigo-100" : "text-slate-400"
                          )}>
                            {opt.desc}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

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
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-300">
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
                      <span className="px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-mono text-[11px] font-bold">
                        {(currentMeeting.alokasi_jp || 3) * 45} Menit
                      </span>
                    </div>
                  </div>
                </div>

                {/* Input Judul / Topik Pertemuan dengan Locked Prefix */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      Topik / Materi Pokok Pertemuan Ini:
                    </label>
                    <span className="text-[11px] font-bold text-slate-400 font-mono">
                      15m Pembuka • {(currentMeeting.alokasi_jp || 3) * 45 - 30}m Inti • 15m Penutup
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="px-3.5 py-2.5 rounded-2xl bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 font-black text-xs shrink-0 border border-indigo-200 dark:border-indigo-800 shadow-xs">
                      Pertemuan {currentMeeting.nomor_pertemuan}:
                    </span>
                    <input
                      type="text"
                      value={cleanTopicName(currentMeeting.topik)}
                      onChange={(e) => {
                        const val = e.target.value;
                        updateCurrentMeeting(prev => ({
                          ...prev,
                          topik: `Pertemuan ${currentMeeting.nomor_pertemuan}: ${val}`
                        }));
                      }}
                      placeholder="Contoh: Pengenalan Konsep, Ciri-ciri & Struktur Teks"
                      className="flex-1 px-4 py-2.5 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-black text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none shadow-xs"
                    />
                  </div>
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

                  {/* Foto Pemantik / Kasus */}
                  <div className="pt-2 border-t border-amber-200/60 dark:border-amber-900/40 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-black uppercase tracking-wider text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                        <ImageIcon size={13} className="text-amber-600" />
                        <span>Foto / Ilustrasi Pemantik (Opsional - Tampil di Slide 1):</span>
                      </label>
                      {currentMeeting.langkah_kbm?.pendahuluan?.gambar_url && (
                        <button
                          type="button"
                          onClick={() => updateCurrentMeeting(prev => ({
                            ...prev,
                            langkah_kbm: {
                              ...prev.langkah_kbm,
                              pendahuluan: {
                                ...prev.langkah_kbm.pendahuluan,
                                gambar_url: undefined,
                                gambar_caption: undefined
                              }
                            }
                          }))}
                          className="text-[10px] font-bold text-rose-500 hover:text-rose-600 cursor-pointer"
                        >
                          Hapus Foto
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={currentMeeting.langkah_kbm?.pendahuluan?.gambar_url || ''}
                          onChange={(e) => updateCurrentMeeting(prev => ({
                            ...prev,
                            langkah_kbm: {
                              ...prev.langkah_kbm,
                              pendahuluan: {
                                ...prev.langkah_kbm.pendahuluan,
                                gambar_url: e.target.value
                              }
                            }
                          }))}
                          placeholder="Tempel URL atau klik Unggah..."
                          className="flex-1 px-3.5 py-2 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-white dark:bg-slate-900 text-xs font-medium text-slate-800 dark:text-slate-200 outline-none"
                        />
                        <label className="px-3 py-2 rounded-xl bg-amber-100 hover:bg-amber-200 dark:bg-amber-900/60 dark:hover:bg-amber-900 text-amber-900 dark:text-amber-200 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer border border-amber-300 dark:border-amber-800 transition-all shrink-0 active:scale-95 shadow-xs">
                          <UploadCloud size={14} className="text-amber-700 dark:text-amber-300" />
                          <span>{isUploadingImage ? 'Mengunggah...' : 'Upload'}</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            disabled={isUploadingImage}
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) {
                                handleFileUpload(f, (uploadedUrl) => {
                                  updateCurrentMeeting(prev => ({
                                    ...prev,
                                    langkah_kbm: {
                                      ...prev.langkah_kbm,
                                      pendahuluan: {
                                        ...prev.langkah_kbm.pendahuluan,
                                        gambar_url: uploadedUrl
                                      }
                                    }
                                  }));
                                });
                              }
                            }}
                          />
                        </label>
                      </div>

                      <input
                        type="text"
                        value={currentMeeting.langkah_kbm?.pendahuluan?.gambar_caption || ''}
                        onChange={(e) => updateCurrentMeeting(prev => ({
                          ...prev,
                          langkah_kbm: {
                            ...prev.langkah_kbm,
                            pendahuluan: {
                              ...prev.langkah_kbm.pendahuluan,
                              gambar_caption: e.target.value
                            }
                          }
                        }))}
                        placeholder="Keterangan / Caption Foto Kasus"
                        className="w-full px-3.5 py-2 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-white dark:bg-slate-900 text-xs font-medium text-slate-800 dark:text-slate-200 outline-none"
                      />
                    </div>

                    {currentMeeting.langkah_kbm?.pendahuluan?.gambar_url && (
                      <div className="relative rounded-2xl overflow-hidden border border-amber-300 dark:border-amber-800 max-w-xs bg-slate-900/40 mt-1">
                        <img
                          src={currentMeeting.langkah_kbm?.pendahuluan?.gambar_url}
                          alt="Preview Pemantik"
                          className="w-full h-32 object-cover"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                        {currentMeeting.langkah_kbm?.pendahuluan?.gambar_caption && (
                          <div className="p-1.5 text-[10px] text-amber-900 dark:text-amber-200 italic bg-amber-100/90 dark:bg-amber-950/90 text-center font-medium">
                            {currentMeeting.langkah_kbm?.pendahuluan?.gambar_caption}
                          </div>
                        )}
                      </div>
                    )}
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

                  {/* Multi-Slide Materi Pokok Siswa */}
                  <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-900/60 space-y-3">
                    {/* Header with Slide Chips & Add Slide Button */}
                    <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-black uppercase text-blue-700 dark:text-blue-300 flex items-center gap-1.5">
                          <BookOpen size={13} />
                          <span>Slide Materi Pokok ({currentMateriSlides.length} Slide):</span>
                        </span>

                        {/* Slide Selector Chips */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {currentMateriSlides.map((s, sIdx) => (
                            <button
                              key={sIdx}
                              type="button"
                              onClick={() => setActiveMateriSlideIdx(sIdx)}
                              className={cn(
                                "px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1",
                                activeMateriSlideIdx === sIdx
                                  ? "bg-blue-600 text-white shadow-xs"
                                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                              )}
                            >
                              <span>Slide {sIdx + 1}</span>
                              {s.gambar_url && <ImageIcon size={10} className="opacity-80" />}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleAddMateriSlide}
                          className="px-2.5 py-1 rounded-xl bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 font-bold text-xs flex items-center gap-1 cursor-pointer transition-all active:scale-95 shadow-xs"
                          title="Tambahkan slide materi baru untuk topik ini"
                        >
                          <Plus size={12} />
                          <span>Tambah Slide</span>
                        </button>

                        {currentMateriSlides.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleDeleteMateriSlide(activeMateriSlideIdx)}
                            className="px-2 py-1 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-xs font-bold flex items-center gap-1 cursor-pointer transition-all"
                            title="Hapus slide materi ini"
                          >
                            <Trash2 size={12} />
                            <span>Hapus Slide {activeMateriSlideIdx + 1}</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Active Slide Form Fields */}
                    <div className="space-y-3 pt-1">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-black uppercase text-slate-500 dark:text-slate-400">
                          Judul Sub-Materi (Slide {activeMateriSlideIdx + 1}):
                        </label>
                      </div>

                      <input
                        type="text"
                        value={activeSlide.judul || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          updateActiveSlide(prev => ({ ...prev, judul: val }));
                        }}
                        placeholder={`Judul Slide Materi ${activeMateriSlideIdx + 1} (Contoh: Pengertian & Karakteristik Pokok)`}
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white"
                      />

                      <textarea
                        rows={4}
                        value={(activeSlide.paragraf || []).join('\n\n')}
                        onChange={(e) => {
                          const paras = e.target.value.split('\n\n').filter(Boolean);
                          updateActiveSlide(prev => ({ ...prev, paragraf: paras }));
                        }}
                        placeholder={`Isi paragraf teks bacaan untuk Slide ${activeMateriSlideIdx + 1} (Pisahkan antar-paragraf dengan baris kosong)...`}
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 leading-relaxed font-normal"
                      />

                      {/* Lampiran Gambar / Diagram Materi untuk Slide Ini */}
                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                            <ImageIcon size={13} className="text-blue-600" />
                            <span>Lampiran Gambar / Diagram (Slide {activeMateriSlideIdx + 1}):</span>
                          </label>
                          {activeSlide.gambar_url && (
                            <button
                              type="button"
                              onClick={() => updateActiveSlide(prev => ({
                                ...prev,
                                gambar_url: undefined,
                                gambar_caption: undefined
                              }))}
                              className="text-[10px] font-bold text-rose-500 hover:text-rose-600 cursor-pointer"
                            >
                              Hapus Gambar
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={activeSlide.gambar_url || ''}
                              onChange={(e) => {
                                const val = e.target.value;
                                updateActiveSlide(prev => ({ ...prev, gambar_url: val }));
                              }}
                              placeholder="Tempel URL atau klik Unggah..."
                              className="flex-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900 outline-none"
                            />
                            <label className="px-3 py-2 rounded-xl bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/60 dark:hover:bg-blue-900 text-blue-900 dark:text-blue-200 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer border border-blue-300 dark:border-blue-800 transition-all shrink-0 active:scale-95 shadow-xs">
                              <UploadCloud size={14} className="text-blue-700 dark:text-blue-300" />
                              <span>{isUploadingImage ? 'Mengunggah...' : 'Upload'}</span>
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                disabled={isUploadingImage}
                                onChange={(e) => {
                                  const f = e.target.files?.[0];
                                  if (f) {
                                    handleFileUpload(f, (uploadedUrl) => {
                                      updateActiveSlide(prev => ({ ...prev, gambar_url: uploadedUrl }));
                                    });
                                  }
                                }}
                              />
                            </label>
                          </div>

                          <input
                            type="text"
                            value={activeSlide.gambar_caption || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              updateActiveSlide(prev => ({ ...prev, gambar_caption: val }));
                            }}
                            placeholder="Keterangan / Caption Gambar Diagram"
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900 outline-none"
                          />
                        </div>

                        {activeSlide.gambar_url && (
                          <div className="relative rounded-2xl overflow-hidden border border-blue-300 dark:border-blue-800 max-w-xs bg-slate-900/40 mt-1">
                            <img
                              src={activeSlide.gambar_url}
                              alt={`Preview Materi Slide ${activeMateriSlideIdx + 1}`}
                              className="w-full h-32 object-cover"
                              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                            />
                            {activeSlide.gambar_caption && (
                              <div className="p-1.5 text-[10px] text-blue-900 dark:text-blue-200 italic bg-blue-100/90 dark:bg-blue-950/90 text-center font-medium">
                                {activeSlide.gambar_caption}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
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
                              petunjuk: prev.langkah_kbm.inti?.lkpd?.petunjuk || '',
                              gambar_url: prev.langkah_kbm.inti?.lkpd?.gambar_url,
                              gambar_caption: prev.langkah_kbm.inti?.lkpd?.gambar_caption
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
                              petunjuk: e.target.value,
                              gambar_url: prev.langkah_kbm.inti?.lkpd?.gambar_url,
                              gambar_caption: prev.langkah_kbm.inti?.lkpd?.gambar_caption
                            }
                          }
                        }
                      }))}
                      placeholder="1. Diskusikan bersama kelompok...\n2. Tuliskan 3 kalimat fakta ilmiah..."
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 leading-relaxed font-normal"
                    />

                    {/* Lampiran Gambar Soal LKPD */}
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                          <ImageIcon size={13} className="text-emerald-600" />
                          <span>Lampiran Gambar Soal / Kasus LKPD (Opsional - Tampil di Slide 3):</span>
                        </label>
                        {currentMeeting.langkah_kbm?.inti?.lkpd?.gambar_url && (
                          <button
                            type="button"
                            onClick={() => updateCurrentMeeting(prev => ({
                              ...prev,
                              langkah_kbm: {
                                ...prev.langkah_kbm,
                                inti: {
                                  ...prev.langkah_kbm.inti,
                                  lkpd: {
                                    judul: prev.langkah_kbm.inti?.lkpd?.judul || 'Petunjuk Tugas',
                                    petunjuk: prev.langkah_kbm.inti?.lkpd?.petunjuk || '',
                                    gambar_url: undefined,
                                    gambar_caption: undefined
                                  }
                                }
                              }
                            }))}
                            className="text-[10px] font-bold text-rose-500 hover:text-rose-600 cursor-pointer"
                          >
                            Hapus Gambar
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={currentMeeting.langkah_kbm?.inti?.lkpd?.gambar_url || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              updateCurrentMeeting(prev => ({
                                ...prev,
                                langkah_kbm: {
                                  ...prev.langkah_kbm,
                                  inti: {
                                    ...prev.langkah_kbm.inti,
                                    lkpd: {
                                      judul: prev.langkah_kbm.inti?.lkpd?.judul || 'Petunjuk Tugas',
                                      petunjuk: prev.langkah_kbm.inti?.lkpd?.petunjuk || '',
                                      gambar_url: val,
                                      gambar_caption: prev.langkah_kbm.inti?.lkpd?.gambar_caption
                                    }
                                  }
                                }
                              }));
                            }}
                            placeholder="Tempel URL atau klik Unggah..."
                            className="flex-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900 outline-none"
                          />
                          <label className="px-3 py-2 rounded-xl bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-900/60 dark:hover:bg-emerald-900 text-emerald-900 dark:text-emerald-200 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer border border-emerald-300 dark:border-emerald-800 transition-all shrink-0 active:scale-95 shadow-xs">
                            <UploadCloud size={14} className="text-emerald-700 dark:text-emerald-300" />
                            <span>{isUploadingImage ? 'Mengunggah...' : 'Upload'}</span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              disabled={isUploadingImage}
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) {
                                  handleFileUpload(f, (uploadedUrl) => {
                                    updateCurrentMeeting(prev => ({
                                      ...prev,
                                      langkah_kbm: {
                                        ...prev.langkah_kbm,
                                        inti: {
                                          ...prev.langkah_kbm.inti,
                                          lkpd: {
                                            judul: prev.langkah_kbm.inti?.lkpd?.judul || 'Petunjuk Tugas',
                                            petunjuk: prev.langkah_kbm.inti?.lkpd?.petunjuk || '',
                                            gambar_url: uploadedUrl,
                                            gambar_caption: prev.langkah_kbm.inti?.lkpd?.gambar_caption
                                          }
                                        }
                                      }
                                    }));
                                  });
                                }
                              }}
                            />
                          </label>
                        </div>

                        <input
                          type="text"
                          value={currentMeeting.langkah_kbm?.inti?.lkpd?.gambar_caption || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            updateCurrentMeeting(prev => ({
                              ...prev,
                              langkah_kbm: {
                                ...prev.langkah_kbm,
                                inti: {
                                  ...prev.langkah_kbm.inti,
                                  lkpd: {
                                    judul: prev.langkah_kbm.inti?.lkpd?.judul || 'Petunjuk Tugas',
                                    petunjuk: prev.langkah_kbm.inti?.lkpd?.petunjuk || '',
                                    gambar_url: prev.langkah_kbm.inti?.lkpd?.gambar_url,
                                    gambar_caption: val
                                  }
                                }
                              }
                            }));
                          }}
                          placeholder="Keterangan / Caption Gambar Soal LKPD"
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900 outline-none"
                        />
                      </div>

                      {currentMeeting.langkah_kbm?.inti?.lkpd?.gambar_url && (
                        <div className="relative rounded-2xl overflow-hidden border border-emerald-300 dark:border-emerald-800 max-w-xs bg-slate-900/40 mt-1">
                          <img
                            src={currentMeeting.langkah_kbm?.inti?.lkpd?.gambar_url}
                            alt="Preview LKPD"
                            className="w-full h-32 object-cover"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                          />
                          {currentMeeting.langkah_kbm?.inti?.lkpd?.gambar_caption && (
                            <div className="p-1.5 text-[10px] text-emerald-900 dark:text-emerald-200 italic bg-emerald-100/90 dark:bg-emerald-950/90 text-center font-medium">
                              {currentMeeting.langkah_kbm?.inti?.lkpd?.gambar_caption}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
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
