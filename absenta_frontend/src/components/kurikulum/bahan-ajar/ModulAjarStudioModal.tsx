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
  ChevronDown,
  Layers,
  Folder,
  FolderOpen,
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

export interface BabItem {
  id: string;
  nomorBab: number;
  judulBab: string;
  deskripsi: string;
  fase: string;
  tingkat: number;
  pertemuanList: PertemuanItem[];
}

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
  const [babs, setBabs] = useState<BabItem[]>([
    {
      id: perangkatId || 'new-1',
      nomorBab: 1,
      judulBab: '',
      deskripsi: '',
      fase: fase || 'E',
      tingkat: tingkat || 10,
      pertemuanList: []
    }
  ]);
  const [activeBabIdx, setActiveBabIdx] = useState<number>(0);
  const [activeMeetingIdx, setActiveMeetingIdx] = useState<number>(0);
  const [activeView, setActiveView] = useState<'BAB_INFO' | 'MEETING'>('BAB_INFO');
  const [mobileTab, setMobileTab] = useState<'TREE' | 'EDITOR'>('TREE');
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

// ── EMPTY CLEAN MEETING STRUCTURE FOR BLANK WORKSPACE ──
const createEmptyMeeting = (num: number = 1): PertemuanItem => ({
  nomor_pertemuan: num,
  alokasi_jp: 2,
  durasi_menit: 90,
  topik: `Pertemuan ${num}`,
  tujuan_pembelajaran: [''],
  langkah_kbm: {
    pendahuluan: {
      durasi_menit: 15,
      kegiatan: ['']
    },
    inti: {
      durasi_menit: 60,
      kegiatan: [''],
      teks_bacaan: {
        judul: '',
        paragraf: ['']
      },
      lkpd: {
        judul: '',
        petunjuk: ''
      }
    },
    penutup: {
      durasi_menit: 15,
      kegiatan: ['']
    }
  }
});

// ── CONTOH LENGKAP REALISTIS MODUL AJAR (REFERENSI JIKA DIPILIH) ──
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
          'Siswa menyimpulkan 3 struktur teks observasi dengan bimbingan guru.',
          'Refleksi pembelajaran dan doa penutup.'
        ]
      }
    }
  }
];

  // Populate local state when readerData loads
  useEffect(() => {
    if (!isOpen) return;

    if (perangkatId === 'new') {
      const initBab: BabItem = {
        id: 'new-1',
        nomorBab: 1,
        judulBab: perangkatJudul && !perangkatJudul.startsWith('Modul Ajar:') ? perangkatJudul.replace(/^Bab\s*\d+\s*[:\s]*/i, '') : '',
        deskripsi: '',
        fase: fase || 'E',
        tingkat: tingkat || 10,
        pertemuanList: [createEmptyMeeting(1)]
      };
      setBabs([initBab]);
      setActiveBabIdx(0);
      setActiveMeetingIdx(0);
      setActiveView('BAB_INFO');
      return;
    }

    if (readerData?.konten && readerData.konten.length > 0 && readerData.source === 'CUSTOM') {
      const rawJudul = perangkatJudul || readerData.perangkat?.judul || '';
      const matchBabNum = rawJudul.match(/^Bab\s*(\d+)/i);
      const babNum = matchBabNum ? parseInt(matchBabNum[1], 10) : 1;
      const cleanJudul = rawJudul.replace(/^Bab\s*\d+\s*[:\s]*/i, '').replace(/^Modul Ajar:\s*/i, '');

      const loadedBab: BabItem = {
        id: perangkatId,
        nomorBab: babNum,
        judulBab: cleanJudul,
        deskripsi: readerData.perangkat?.deskripsi || '',
        fase: readerData.perangkat?.fase || fase || 'E',
        tingkat: readerData.perangkat?.tingkat || tingkat || 10,
        pertemuanList: JSON.parse(JSON.stringify(readerData.konten))
      };
      setBabs([loadedBab]);
      setActiveBabIdx(0);
      setActiveMeetingIdx(0);
      setActiveView('BAB_INFO');
    } else if (!readerData?.konten || readerData.source === 'NONE') {
      const cleanJudul = (perangkatJudul || '').replace(/^Bab\s*\d+\s*[:\s]*/i, '').replace(/^Modul Ajar:\s*/i, '');
      const initBab: BabItem = {
        id: perangkatId,
        nomorBab: 1,
        judulBab: cleanJudul.startsWith('Modul Ajar:') ? '' : cleanJudul,
        deskripsi: '',
        fase: fase || 'E',
        tingkat: tingkat || 10,
        pertemuanList: [createEmptyMeeting(1)]
      };
      setBabs([initBab]);
      setActiveBabIdx(0);
      setActiveMeetingIdx(0);
      setActiveView('BAB_INFO');
    }
  }, [isOpen, perangkatId, readerData, perangkatJudul, fase, tingkat]);

  // Active bab and meeting objects
  const currentBab: BabItem = babs[activeBabIdx] || babs[0];
  const currentMeeting: PertemuanItem = currentBab?.pertemuanList?.[activeMeetingIdx] || currentBab?.pertemuanList?.[0] || createEmptyMeeting(1);

  // 3. Save Mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const targetPerangkatId = currentBab.id.startsWith('new-') ? 'new' : currentBab.id;
      const effectiveJudul = currentBab.judulBab.trim()
        ? `Bab ${currentBab.nomorBab}: ${currentBab.judulBab.trim()}`
        : `Bab ${currentBab.nomorBab}: Modul Ajar ${mapelNama || 'Mata Pelajaran'}`;

      return saveReaderContent(targetPerangkatId, currentBab.pertemuanList, {
        judul: effectiveJudul,
        mapel_id: mapelId,
        mapel_nama: mapelNama,
        guru_id: guruId,
        fase: currentBab.fase,
        tingkat: currentBab.tingkat
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bahanAjarReader'] });
      queryClient.invalidateQueries({ queryKey: ['bahanAjarReaderStudio'] });
      queryClient.invalidateQueries({ queryKey: ['myPerangkatAjarKbm'] });
      queryClient.invalidateQueries({ queryKey: ['perangkat-ajar'] });
      toast.success('💾 Bab & Seluruh Sesi Berhasil Disimpan ke Asisten Mengajar!', { icon: '✨' });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Gagal menyimpan modul ajar');
    }
  });

  // Bab Mutators
  const updateCurrentBab = (updater: (prev: BabItem) => BabItem) => {
    setBabs(prevBabs => {
      const copy = [...prevBabs];
      const target = copy[activeBabIdx] || copy[0];
      if (!target) return prevBabs;
      copy[activeBabIdx] = updater(target);
      return copy;
    });
  };

  const handleAddBab = () => {
    const nextBabNum = babs.length + 1;
    const newBab: BabItem = {
      id: `new-${nextBabNum}-${Date.now()}`,
      nomorBab: nextBabNum,
      judulBab: '',
      deskripsi: '',
      fase: currentBab.fase || 'E',
      tingkat: currentBab.tingkat || 10,
      pertemuanList: [createEmptyMeeting(1)]
    };
    setBabs(prev => [...prev, newBab]);
    setActiveBabIdx(babs.length);
    setActiveMeetingIdx(0);
    setActiveView('BAB_INFO');
    toast.success(`📂 Bab ${nextBabNum} baru berhasil ditambahkan! Silakan atur judul bab.`, { icon: '✨' });
  };

  const handleDeleteBab = (babIdxToDelete: number) => {
    if (babs.length <= 1) {
      toast.error('Minimal harus ada 1 Bab pembelajaran!');
      return;
    }
    const updated = babs.filter((_, i) => i !== babIdxToDelete).map((b, i) => ({
      ...b,
      nomorBab: i + 1
    }));
    setBabs(updated);
    setActiveBabIdx(Math.max(0, activeBabIdx - 1));
    setActiveMeetingIdx(0);
    setActiveView('BAB_INFO');
    toast.success('🗑️ Bab berhasil dihapus');
  };

  // Helpers for modifying meetings in current Bab
  const updateCurrentMeeting = (updater: (prev: PertemuanItem) => PertemuanItem) => {
    setBabs(prevBabs => {
      const copy = [...prevBabs];
      const targetBab = copy[activeBabIdx] || copy[0];
      if (!targetBab) return prevBabs;
      const targetMeeting = targetBab.pertemuanList[activeMeetingIdx] || targetBab.pertemuanList[0];
      if (!targetMeeting) return prevBabs;

      const updatedMeeting = updater(targetMeeting);
      const updatedList = [...targetBab.pertemuanList];
      updatedList[activeMeetingIdx] = updatedMeeting;
      copy[activeBabIdx] = {
        ...targetBab,
        pertemuanList: updatedList
      };
      return copy;
    });
  };

  const handleAddMeeting = () => {
    const nextSesiNum = (currentBab.pertemuanList?.length || 0) + 1;
    const newMeeting = createEmptyMeeting(nextSesiNum);

    setBabs(prevBabs => {
      const copy = [...prevBabs];
      const targetBab = copy[activeBabIdx] || copy[0];
      if (!targetBab) return prevBabs;
      copy[activeBabIdx] = {
        ...targetBab,
        pertemuanList: [...targetBab.pertemuanList, newMeeting]
      };
      return copy;
    });
    setActiveMeetingIdx(currentBab.pertemuanList.length);
    setActiveView('MEETING');
    toast.success(`➕ Sesi ${nextSesiNum} berhasil ditambahkan!`, { icon: '✨' });
  };

  const handleDeleteMeeting = (idxToDelete: number) => {
    if (currentBab.pertemuanList.length <= 1) {
      toast.error('Bab minimal harus memiliki 1 pertemuan!');
      return;
    }

    const updatedList = currentBab.pertemuanList
      .filter((_, idx) => idx !== idxToDelete)
      .map((m, i) => ({ ...m, nomor_pertemuan: i + 1 }));

    setBabs(prevBabs => {
      const copy = [...prevBabs];
      copy[activeBabIdx] = {
        ...copy[activeBabIdx],
        pertemuanList: updatedList
      };
      return copy;
    });
    setActiveMeetingIdx(Math.max(0, activeMeetingIdx - 1));
    toast.success('🗑️ Pertemuan berhasil dihapus');
  };

  const handleDuplicateMeeting = (idxToDup: number) => {
    const target = currentBab.pertemuanList[idxToDup];
    const duplicated: PertemuanItem = JSON.parse(JSON.stringify(target));
    duplicated.topik = `${duplicated.topik} (Salinan)`;
    
    const updated = [...currentBab.pertemuanList];
    updated.splice(idxToDup + 1, 0, duplicated);
    const renumbered = updated.map((m, i) => ({ ...m, nomor_pertemuan: i + 1 }));

    setBabs(prevBabs => {
      const copy = [...prevBabs];
      copy[activeBabIdx] = {
        ...copy[activeBabIdx],
        pertemuanList: renumbered
      };
      return copy;
    });
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
        updateCurrentBab(prev => ({
          ...prev,
          judulBab: preset.judul_modul.replace(/^Bab\s*\d+\s*[:\s]*/i, ''),
          fase: preset.fase || prev.fase,
          pertemuanList: JSON.parse(JSON.stringify(preset.konten_json))
        }));
        setActiveMeetingIdx(0);
        setActiveView('MEETING');
        setIsTemplateModalOpen(false);
        toast.success(`📋 Berhasil mengadopsi ${preset.konten_json.length} pertemuan dari '${preset.judul_modul}'!`, { icon: '✨' });
      }
    } catch (err: any) {
      toast.error('Gagal menyalin dari template: ' + err.message);
    }
  };

  const handleLoadFullSample = () => {
    updateCurrentBab(prev => ({
      ...prev,
      judulBab: 'Teks Laporan Hasil Observasi (LHO)',
      fase: 'E',
      tingkat: 10,
      pertemuanList: JSON.parse(JSON.stringify(FULL_SAMPLE_MEETINGS))
    }));
    setActiveMeetingIdx(0);
    setActiveView('MEETING');
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
        <div className="flex flex-col gap-2.5 w-full pr-4 sm:pr-6">
          <div className="flex items-center justify-between w-full flex-wrap gap-2">
            <div className="flex items-center gap-2.5 sm:gap-3">
              <div className="p-2 sm:p-2.5 bg-indigo-600 text-white rounded-2xl shadow-md shadow-indigo-500/20 shrink-0">
                <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div>
                <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                  <span className="font-black text-slate-900 dark:text-white text-sm sm:text-base">
                    Studio Modul Ajar
                  </span>
                  <span className="px-2 py-0.5 rounded-lg bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 font-black text-[10px]">
                    Fase {currentBab?.fase || 'E'} (Kelas {currentBab?.tingkat || 10})
                  </span>
                  <span className="px-2 py-0.5 rounded-lg bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 font-bold text-[10px] hidden sm:inline-block">
                    {mapelNama || 'Perangkat Ajar'}
                  </span>
                </div>
                <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium truncate max-w-xs sm:max-w-md">
                  {currentBab?.judulBab ? `Bab ${currentBab.nomorBab}: ${currentBab.judulBab}` : (mapelNama || 'Susun pertemuan mengajar bertahap')}
                </p>
              </div>
            </div>

            {/* Action Header Buttons */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleLoadFullSample}
                className="h-8 sm:h-9 px-2.5 sm:px-3 rounded-xl font-bold text-xs bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300 hover:bg-purple-100 hidden md:flex items-center gap-1.5 cursor-pointer shadow-xs transition-all active:scale-95"
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
                className="h-8 sm:h-9 px-2.5 sm:px-3 rounded-xl font-bold text-xs bg-white dark:bg-slate-800 hidden sm:flex items-center gap-1.5 cursor-pointer shadow-xs border-slate-200 dark:border-slate-700 hover:bg-slate-100"
                title="Salin langkah pembelajaran dari Template Nasional yang sudah ada"
              >
                <Copy size={13} className="text-indigo-600 dark:text-indigo-400" />
                <span>Template</span>
              </Button>

              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setIsPreviewModalOpen(true)}
                className="h-8 sm:h-9 px-2.5 sm:px-3 rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 shadow-2xs"
                title="Uji coba tampilan modul ini di Mode Baca & Layar Proyektor"
              >
                <Presentation size={13} className="text-amber-500" />
                <span className="hidden sm:inline">Uji Tayang</span>
                <span className="sm:hidden">Tayang</span>
              </Button>

              <Button
                type="button"
                size="sm"
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending}
                className="h-8 sm:h-9 px-3 sm:px-4 rounded-xl font-black text-xs bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5 cursor-pointer shadow-md shadow-emerald-900/20"
              >
                <Save size={13} />
                <span>{saveMutation.isPending ? 'Menyimpan...' : 'Simpan'}</span>
              </Button>
            </div>
          </div>

          {/* Tab Switcher Mobile (Hanya tampil di HP / Layar < md) */}
          <div className="flex md:hidden items-center bg-slate-200/80 dark:bg-slate-800 p-1 rounded-2xl w-full">
            <button
              type="button"
              onClick={() => setMobileTab('TREE')}
              className={cn(
                "flex-1 py-1.5 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer",
                mobileTab === 'TREE'
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-300"
              )}
            >
              <Layers size={13} />
              <span>1. Struktur ({babs.length} Bab)</span>
            </button>
            <button
              type="button"
              onClick={() => setMobileTab('EDITOR')}
              className={cn(
                "flex-1 py-1.5 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer",
                mobileTab === 'EDITOR'
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-300"
              )}
            >
              <FileText size={13} />
              <span>2. Form Kerja</span>
            </button>
          </div>
        </div>
      }
    >
      <div className="flex flex-1 overflow-hidden">
        {/* ── SIDEBAR KIRI: EXPLORER TREE HIERARKI (WINDOWS EXPLORER STYLE) ── */}
        <div className={cn(
          "bg-slate-50/90 dark:bg-slate-900/90 border-r border-slate-200/80 dark:border-slate-800 p-3 sm:p-4 flex-col shrink-0 overflow-y-auto custom-scrollbar select-none justify-between",
          mobileTab === 'TREE' ? "w-full md:w-80 flex" : "hidden md:flex md:w-80"
        )}>
          <div className="space-y-3">
            {/* Header Explorer */}
            <div className="flex items-center justify-between px-2 pb-2 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-1.5 text-xs font-black text-slate-500 uppercase tracking-wider">
                <Layers size={13} className="text-indigo-600" />
                <span>STRUKTUR KURIKULUM</span>
              </div>
              <span className="text-[10px] font-mono font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-950 px-1.5 py-0.5 rounded">
                {babs.length} Bab
              </span>
            </div>

            {/* Root Subject Node */}
            <div className="flex items-center gap-2 px-2.5 py-2 text-xs font-black text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-800 rounded-xl border border-slate-200/80 dark:border-slate-700 shadow-2xs">
              <BookOpen size={14} className="text-blue-600 shrink-0" />
              <span className="truncate">{mapelNama || 'Mata Pelajaran'}</span>
              <span className="ml-auto text-[9px] px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold shrink-0">
                Fase {currentBab?.fase || 'E'}
              </span>
            </div>

            {/* Tree Branch: List of Babs */}
            <div className="space-y-3 pl-1">
              {babs.map((bab, bIdx) => {
                const isBabActive = activeBabIdx === bIdx;
                const isBabInfoView = isBabActive && activeView === 'BAB_INFO';

                return (
                  <div key={bab.id} className="space-y-1.5">
                    {/* Bab Folder Node */}
                    <div className="flex items-center gap-1 group">
                      <button
                        type="button"
                        onClick={() => {
                          setActiveBabIdx(bIdx);
                          setActiveView('BAB_INFO');
                          setMobileTab('EDITOR');
                        }}
                        className={cn(
                          "w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-xl text-xs font-bold transition-all text-left cursor-pointer border",
                          isBabInfoView
                            ? "bg-indigo-600 text-white shadow-sm font-black border-indigo-600"
                            : isBabActive
                              ? "bg-indigo-50/80 dark:bg-indigo-950/60 text-indigo-900 dark:text-indigo-200 border-indigo-200 dark:border-indigo-800 font-black"
                              : "bg-white/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 hover:bg-white hover:text-indigo-600 border-slate-200/60 dark:border-slate-700/60"
                        )}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <FolderOpen size={14} className={cn("shrink-0", isBabInfoView ? "text-amber-300" : isBabActive ? "text-indigo-600" : "text-amber-500")} />
                          <span className="truncate">
                            Bab {bab.nomorBab}: {bab.judulBab || 'Tanpa Judul'}
                          </span>
                        </div>
                        <span className={cn(
                          "text-[10px] font-mono px-1.5 py-0.5 rounded shrink-0",
                          isBabInfoView ? "bg-indigo-700 text-indigo-100" : "bg-slate-100 dark:bg-slate-700 text-slate-500"
                        )}>
                          {bab.pertemuanList?.length || 0} Sesi
                        </span>
                      </button>

                      {babs.length > 1 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteBab(bIdx);
                          }}
                          title="Hapus Bab"
                          className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-rose-100 dark:hover:bg-rose-900/50 rounded-lg text-rose-500 transition-opacity"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>

                    {/* Sesi List under this Bab */}
                    {isBabActive && (
                      <div className="pl-3 border-l-2 border-dashed border-indigo-200 dark:border-indigo-900/60 ml-3 space-y-1">
                        {(bab.pertemuanList || []).map((pt, mIdx) => {
                          const isMeetingSelected = isBabActive && activeView === 'MEETING' && activeMeetingIdx === mIdx;
                          const isComplete = isMeetingComplete(pt);
                          const cleanTopic = cleanTopicName(pt.topik);

                          return (
                            <div
                              key={mIdx}
                              onClick={() => {
                                setActiveBabIdx(bIdx);
                                setActiveMeetingIdx(mIdx);
                                setActiveView('MEETING');
                                setMobileTab('EDITOR');
                              }}
                              className={cn(
                                "group flex items-center justify-between gap-1.5 px-2.5 py-2 rounded-xl text-xs transition-all cursor-pointer border",
                                isMeetingSelected
                                  ? "bg-indigo-50 dark:bg-indigo-950/80 border-indigo-300 dark:border-indigo-700 text-indigo-950 dark:text-indigo-100 font-black shadow-2xs ring-1 ring-indigo-400"
                                  : "bg-white dark:bg-slate-800/60 border-slate-200/60 dark:border-slate-700/40 text-slate-600 dark:text-slate-300 hover:bg-slate-100"
                              )}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <FileText size={13} className={cn("shrink-0", isMeetingSelected ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400")} />
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[11px] font-mono font-bold shrink-0">
                                      Sesi {pt.nomor_pertemuan || mIdx + 1}
                                    </span>
                                    <span className="text-[9px] text-slate-400 font-mono">
                                      ({pt.alokasi_jp || 2} JP)
                                    </span>
                                    {isComplete ? (
                                      <span className="text-[9px] text-emerald-600 font-bold">●</span>
                                    ) : (
                                      <span className="text-[9px] text-amber-500 font-bold">○</span>
                                    )}
                                  </div>
                                  <p className="text-[11px] truncate font-normal leading-tight text-slate-500 dark:text-slate-400">
                                    {cleanTopic || 'Draf Baru'}
                                  </p>
                                </div>
                              </div>

                              {/* Action buttons on hover */}
                              <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDuplicateMeeting(mIdx);
                                  }}
                                  title="Duplikasi"
                                  className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-500"
                                >
                                  <Copy size={11} />
                                </button>
                                {bab.pertemuanList.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteMeeting(mIdx);
                                    }}
                                    title="Hapus"
                                    className="p-1 hover:bg-rose-100 dark:hover:bg-rose-900/50 rounded text-rose-500"
                                  >
                                    <Trash2 size={11} />
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}

                        {/* Button add meeting inside this Bab */}
                        <button
                          type="button"
                          onClick={() => {
                            handleAddMeeting();
                            setMobileTab('EDITOR');
                          }}
                          className="w-full flex items-center gap-2 px-2.5 py-1.5 mt-1 rounded-xl text-xs font-bold border border-dashed border-indigo-300 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-all cursor-pointer"
                        >
                          <Plus size={13} />
                          <span>+ Tambah Sesi</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bottom Sidebar: Button Tambah Bab Baru */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => {
                handleAddBab();
                setMobileTab('EDITOR');
              }}
              className="w-full h-10 rounded-2xl font-black text-xs bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center gap-2 cursor-pointer shadow-xs transition-all active:scale-[0.98]"
            >
              <Plus size={15} />
              <span>+ Tambah Bab Baru</span>
            </button>
          </div>
        </div>

        {/* ── AREA EDITOR UTAMA (STUDIO BLOK FORM) ── */}
        <div className={cn(
          "flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-8 space-y-6 bg-white dark:bg-slate-950",
          mobileTab === 'EDITOR' ? "block" : "hidden md:block"
        )}>
          {/* Mobile Back to Tree Bar */}
          <div className="flex md:hidden items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setMobileTab('TREE')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold text-xs border border-indigo-200 dark:border-indigo-800 cursor-pointer active:scale-95"
            >
              <ChevronLeft size={14} />
              <span>Kembali ke Struktur Bab</span>
            </button>

            <span className="text-[11px] font-mono font-bold text-slate-500">
              {activeView === 'BAB_INFO' ? `Bab ${currentBab?.nomorBab || 1}` : `Sesi ${currentMeeting?.nomor_pertemuan || 1}`}
            </span>
          </div>
          {activeView === 'BAB_INFO' && currentBab ? (
            <div className="max-w-2xl mx-auto space-y-6 pt-4 animate-in fade-in duration-150">
              <div className="p-6 sm:p-7 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-5 shadow-xs">
                {/* Header Bab */}
                <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                  <div className="w-9 h-9 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-black shrink-0 shadow-xs">
                    <FolderOpen size={18} />
                  </div>
                  <div>
                    <h3 className="font-black text-base text-slate-900 dark:text-white">
                      Pengaturan Bab
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Isi judul bab dan tentukan target fase kurikulum
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Judul Bab */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center justify-between">
                      <span>Judul Bab:</span>
                      <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-bold">
                        *Nomor bab otomatis diatur oleh sistem
                      </span>
                    </label>
                    <div className="flex items-center gap-2">
                      <span className="px-3.5 py-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-black text-sm border border-indigo-200 dark:border-indigo-800 shrink-0">
                        Bab {currentBab?.nomorBab || 1}:
                      </span>
                      <input
                        type="text"
                        value={currentBab.judulBab || ''}
                        onChange={(e) => updateCurrentBab(prev => ({ ...prev, judulBab: e.target.value.replace(/^Bab\s*\d+\s*[:\s]*/i, '') }))}
                        placeholder="Contoh: Membuat Puisi"
                        className="flex-1 px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 outline-none shadow-2xs"
                        autoFocus
                      />
                    </div>
                  </div>

                  {/* Dropdown Fase & Tingkat Kelas */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      Fase &amp; Tingkat Kelas:
                    </label>
                    <select
                      value={`${currentBab.fase || 'E'}-${currentBab.tingkat || 10}`}
                      onChange={(e) => {
                        const [faseVal, tingkatVal] = e.target.value.split('-');
                        updateCurrentBab(prev => ({
                          ...prev,
                          fase: faseVal,
                          tingkat: parseInt(tingkatVal, 10)
                        }));
                      }}
                      className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none shadow-2xs cursor-pointer"
                    >
                      <option value="E-10">Fase E (Kelas 10) - Kurikulum Kelas X</option>
                      <option value="F-11">Fase F (Kelas 11) - Kurikulum Kelas XI</option>
                      <option value="F-12">Fase F (Kelas 12) - Kurikulum Kelas XII</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          ) : currentMeeting ? (
            <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-150">
              {/* Breadcrumb Context Bar */}
              <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-bold px-1">
                <span>{mapelNama || 'Mapel'}</span>
                <span>›</span>
                <button
                  type="button"
                  onClick={() => setActiveView('BAB_INFO')}
                  className="text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer font-bold"
                >
                  Bab {currentBab?.nomorBab || 1}: {currentBab?.judulBab || 'Tanpa Judul'}
                </button>
                <span>›</span>
                <span className="text-slate-900 dark:text-white font-black">Pertemuan {currentMeeting.nomor_pertemuan}</span>
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

                {/* Input Tujuan Pembelajaran (Slot-based) */}
                <div className="space-y-2.5 pt-1">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <label className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      Tujuan Pembelajaran:
                    </label>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const topicName = cleanTopicName(currentMeeting.topik) || 'materi pembelajaran';
                          updateCurrentMeeting(prev => ({
                            ...prev,
                            tujuan_pembelajaran: [
                              `Peserta didik mampu memahami dan menjelaskan konsep ${topicName} secara mendalam.`,
                              `Peserta didik mampu menganalisis permasalahan kontekstual terkait ${topicName} secara kritis.`,
                              `Peserta didik mampu menyajikan hasil karya/analisis ${topicName} secara kolaboratif.`
                            ]
                          }));
                          toast.success('🪄 Template Pola Standar Tujuan Pembelajaran dimuat!', { icon: '✨' });
                        }}
                        className="h-7 px-2.5 rounded-xl text-xs font-bold bg-white dark:bg-slate-900 border-indigo-300 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 flex items-center gap-1 cursor-pointer shadow-2xs"
                        title="Isi otomatis dengan 3 indikator tujuan kompetensi standar"
                      >
                        <Sparkles size={12} className="text-indigo-600" />
                        <span>Isi Pola Standar</span>
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {(currentMeeting.tujuan_pembelajaran && currentMeeting.tujuan_pembelajaran.length > 0
                      ? currentMeeting.tujuan_pembelajaran
                      : ['']
                    ).map((tp, tpIdx) => (
                      <div key={tpIdx} className="flex items-center gap-2">
                        <span className="w-7 h-7 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-black text-xs flex items-center justify-center shrink-0 border border-indigo-200 dark:border-indigo-800 shadow-2xs">
                          {tpIdx + 1}
                        </span>
                        <input
                          type="text"
                          value={tp}
                          onChange={(e) => {
                            const currentList = currentMeeting.tujuan_pembelajaran && currentMeeting.tujuan_pembelajaran.length > 0
                              ? [...currentMeeting.tujuan_pembelajaran]
                              : [''];
                            currentList[tpIdx] = e.target.value;
                            updateCurrentMeeting(prev => ({
                              ...prev,
                              tujuan_pembelajaran: currentList
                            }));
                          }}
                          placeholder={`Tujuan pembelajaran ke-${tpIdx + 1}...`}
                          className="flex-1 px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 outline-none shadow-2xs"
                        />
                        {(currentMeeting.tujuan_pembelajaran?.length || 1) > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              const list = (currentMeeting.tujuan_pembelajaran || []).filter((_, i) => i !== tpIdx);
                              updateCurrentMeeting(prev => ({
                                ...prev,
                                tujuan_pembelajaran: list.length > 0 ? list : ['']
                              }));
                            }}
                            title="Hapus poin tujuan"
                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-xl transition-colors shrink-0 cursor-pointer"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    ))}

                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const currentList = currentMeeting.tujuan_pembelajaran && currentMeeting.tujuan_pembelajaran.length > 0
                          ? [...currentMeeting.tujuan_pembelajaran, '']
                          : ['', ''];
                        updateCurrentMeeting(prev => ({
                          ...prev,
                          tujuan_pembelajaran: currentList
                        }));
                      }}
                      className="h-8 px-3 rounded-xl text-xs font-bold border-dashed border-2 border-indigo-300 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950 flex items-center gap-1.5 cursor-pointer mt-1"
                    >
                      <Plus size={13} />
                      <span>+ Tambah Tujuan Pembelajaran</span>
                    </Button>
                  </div>
                </div>
              </div>

              {/* CARD 2: TAHAP 1 — PENDAHULUAN & APERSEPSI */}
              <div className="p-5 rounded-3xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/50 space-y-4 shadow-xs">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200 font-black text-sm">
                    <HelpCircle className="w-4 h-4 text-amber-600" />
                    <span>Tahap 1: Pendahuluan, Apersepsi &amp; Pertanyaan Pemantik (15 Menit)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const topicName = cleanTopicName(currentMeeting.topik) || 'materi pelajaran';
                        updateCurrentMeeting(prev => ({
                          ...prev,
                          langkah_kbm: {
                            ...prev.langkah_kbm,
                            pendahuluan: {
                              ...prev.langkah_kbm.pendahuluan,
                              kegiatan: [
                                'Guru membuka pelajaran dengan salam hangat, berdoa bersama, dan mengecek kehadiran serta kesiapan belajar siswa.',
                                `Apersepsi: Guru mengaitkan topik ${topicName} dengan tayangan visual dan fenomena nyata di sekitar siswa.`,
                                `Pertanyaan Pemantik: "Mengapa pemahaman tentang ${topicName} sangat penting dalam kehidupan kita?"`
                              ]
                            }
                          }
                        }));
                        toast.success('🪄 Template Standar Pendahuluan berhasil dimuat!', { icon: '✨' });
                      }}
                      className="h-7 px-2.5 rounded-xl text-xs font-bold bg-white dark:bg-slate-900 border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-300 hover:bg-amber-100 flex items-center gap-1 cursor-pointer shadow-2xs"
                      title="Isi otomatis dengan 3 runtutan pembuka standar (Doa, Apersepsi, Pemantik)"
                    >
                      <Sparkles size={12} className="text-amber-600" />
                      <span>Isi Pola Standar</span>
                    </Button>
                    <span className="px-2.5 py-0.5 rounded-lg bg-amber-200/80 dark:bg-amber-900 text-amber-900 dark:text-amber-200 font-black text-xs font-mono">
                      Slide Proyektor 1
                    </span>
                  </div>
                </div>

                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-amber-900 dark:text-amber-300">
                      Runtutan Kegiatan Pembukaan &amp; Pertanyaan Pemantik:
                    </label>
                    <span className="text-[11px] text-amber-700/80 dark:text-amber-400 font-bold">
                      Otomatis menjadi alur tayang Slide Proyektor 1
                    </span>
                  </div>

                  <div className="space-y-2">
                    {(currentMeeting.langkah_kbm?.pendahuluan?.kegiatan && currentMeeting.langkah_kbm.pendahuluan.kegiatan.length > 0
                      ? currentMeeting.langkah_kbm.pendahuluan.kegiatan
                      : ['']
                    ).map((act, actIdx) => {
                      const defaultPlaceholders = [
                        'Contoh: Guru membuka pelajaran dengan salam hangat, berdoa, dan mengecek presensi...',
                        'Contoh: Guru mengaitkan materi dengan tayangan visual / fenomena alam...',
                        'Contoh: "Mengapa pengamatan yang objektif penting dalam laporan sains?"'
                      ];

                      return (
                        <div key={actIdx} className="flex items-center gap-2">
                          <span className="w-7 h-7 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-black text-xs flex items-center justify-center shrink-0 border border-amber-300 dark:border-amber-800 shadow-2xs">
                            {actIdx + 1}
                          </span>
                          <input
                            type="text"
                            value={act}
                            onChange={(e) => {
                              const list = currentMeeting.langkah_kbm?.pendahuluan?.kegiatan && currentMeeting.langkah_kbm.pendahuluan.kegiatan.length > 0
                                ? [...currentMeeting.langkah_kbm.pendahuluan.kegiatan]
                                : [''];
                              list[actIdx] = e.target.value;
                              updateCurrentMeeting(prev => ({
                                ...prev,
                                langkah_kbm: {
                                  ...prev.langkah_kbm,
                                  pendahuluan: {
                                    ...prev.langkah_kbm.pendahuluan,
                                    kegiatan: list
                                  }
                                }
                              }));
                            }}
                            placeholder={defaultPlaceholders[actIdx] || `Aktivitas pembuka ke-${actIdx + 1}...`}
                            className="flex-1 px-4 py-2.5 rounded-2xl border border-amber-200 dark:border-amber-900/60 bg-white dark:bg-slate-900 text-xs font-medium text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-amber-500 outline-none shadow-2xs"
                          />
                          {(currentMeeting.langkah_kbm?.pendahuluan?.kegiatan?.length || 1) > 1 && (
                            <button
                              type="button"
                              onClick={() => {
                                const list = (currentMeeting.langkah_kbm?.pendahuluan?.kegiatan || []).filter((_, i) => i !== actIdx);
                                updateCurrentMeeting(prev => ({
                                  ...prev,
                                  langkah_kbm: {
                                    ...prev.langkah_kbm,
                                    pendahuluan: {
                                      ...prev.langkah_kbm.pendahuluan,
                                      kegiatan: list.length > 0 ? list : ['']
                                    }
                                  }
                                }));
                              }}
                              title="Hapus langkah pembuka"
                              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors shrink-0 cursor-pointer"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      );
                    })}

                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const list = currentMeeting.langkah_kbm?.pendahuluan?.kegiatan && currentMeeting.langkah_kbm.pendahuluan.kegiatan.length > 0
                          ? [...currentMeeting.langkah_kbm.pendahuluan.kegiatan, '']
                          : ['', ''];
                        updateCurrentMeeting(prev => ({
                          ...prev,
                          langkah_kbm: {
                            ...prev.langkah_kbm,
                            pendahuluan: {
                              ...prev.langkah_kbm.pendahuluan,
                              kegiatan: list
                            }
                          }
                        }));
                      }}
                      className="h-8 px-3 rounded-xl text-xs font-bold border-dashed border-2 border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-300 hover:bg-amber-100/60 flex items-center gap-1.5 cursor-pointer mt-1"
                    >
                      <Plus size={13} />
                      <span>+ Tambah Langkah Pembuka</span>
                    </Button>
                  </div>
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

              {/* CARD 3: TAHAP 2 — KEGIATAN INTI, TEKS BACAAN & LKPD */}
              <div className="p-5 rounded-3xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200/80 dark:border-blue-900/50 space-y-4 shadow-xs">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2 text-blue-900 dark:text-blue-200 font-black text-sm">
                    <FileText className="w-4 h-4 text-blue-600" />
                    <span>Tahap 2: Kegiatan Inti, Teks Bacaan Pokok &amp; LKPD Diskusi (105 Menit)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const topicName = cleanTopicName(currentMeeting.topik) || 'materi pokok';
                        updateCurrentMeeting(prev => ({
                          ...prev,
                          langkah_kbm: {
                            ...prev.langkah_kbm,
                            inti: {
                              ...prev.langkah_kbm.inti,
                              kegiatan: [
                                `Orientasi Materi: Siswa menyimak tayangan slide penjelasan materi ${topicName} dan mencatat poin-poin penting.`,
                                `Eksplorasi & Kolaborasi: Siswa berkelompok (4-5 orang) membedah studi kasus dan mengerjakan Lembar Kerja (LKPD).`,
                                'Verifikasi & Presentasi: Perwakilan kelompok mempresentasikan hasil diskusi dan menarik simpulan bersama guru.'
                              ]
                            }
                          }
                        }));
                        toast.success('🪄 Template Standar Kegiatan Inti (PBL) berhasil dimuat!', { icon: '✨' });
                      }}
                      className="h-7 px-2.5 rounded-xl text-xs font-bold bg-white dark:bg-slate-900 border-blue-300 dark:border-blue-800 text-blue-800 dark:text-blue-300 hover:bg-blue-100 flex items-center gap-1 cursor-pointer shadow-2xs"
                      title="Isi otomatis dengan 3 langkah inti standar (Orientasi, Kolaborasi LKPD, Presentasi)"
                    >
                      <Sparkles size={12} className="text-blue-600" />
                      <span>Isi Pola Standar</span>
                    </Button>
                    <span className="px-2.5 py-0.5 rounded-lg bg-blue-200/80 dark:bg-blue-900 text-blue-900 dark:text-blue-200 font-black text-xs font-mono">
                      Slide Proyektor 2 &amp; 3
                    </span>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Runtutan Kegiatan Inti (Slot-based) */}
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-blue-900 dark:text-blue-300">
                        Runtutan Kegiatan Inti &amp; Eksplorasi Konsep:
                      </label>
                      <span className="text-[11px] text-blue-700/80 dark:text-blue-400 font-bold">
                        Langkah operasional belajar di kelas
                      </span>
                    </div>

                    <div className="space-y-2">
                      {(currentMeeting.langkah_kbm?.inti?.kegiatan && currentMeeting.langkah_kbm.inti.kegiatan.length > 0
                        ? currentMeeting.langkah_kbm.inti.kegiatan
                        : ['']
                      ).map((act, actIdx) => {
                        const defaultPlaceholders = [
                          'Contoh: Siswa menyimak tayangan slide materi pokok dan mencatat poin penting...',
                          'Contoh: Siswa berkelompok (4-5 orang) untuk menganalisis studi kasus pada LKPD...',
                          'Contoh: Setiap kelompok mempresentasikan hasil diskusinya di depan kelas...'
                        ];

                        return (
                          <div key={actIdx} className="flex items-center gap-2">
                            <span className="w-7 h-7 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 font-black text-xs flex items-center justify-center shrink-0 border border-blue-300 dark:border-blue-800 shadow-2xs">
                              {actIdx + 1}
                            </span>
                            <input
                              type="text"
                              value={act}
                              onChange={(e) => {
                                const list = currentMeeting.langkah_kbm?.inti?.kegiatan && currentMeeting.langkah_kbm.inti.kegiatan.length > 0
                                  ? [...currentMeeting.langkah_kbm.inti.kegiatan]
                                  : [''];
                                list[actIdx] = e.target.value;
                                updateCurrentMeeting(prev => ({
                                  ...prev,
                                  langkah_kbm: {
                                    ...prev.langkah_kbm,
                                    inti: {
                                      ...prev.langkah_kbm.inti,
                                      durasi_menit: (prev.alokasi_jp * 45) - 30,
                                      kegiatan: list
                                    }
                                  }
                                }));
                              }}
                              placeholder={defaultPlaceholders[actIdx] || `Langkah inti ke-${actIdx + 1}...`}
                              className="flex-1 px-4 py-2.5 rounded-2xl border border-blue-200 dark:border-blue-900/60 bg-white dark:bg-slate-900 text-xs font-medium text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none shadow-2xs"
                            />
                            {(currentMeeting.langkah_kbm?.inti?.kegiatan?.length || 1) > 1 && (
                              <button
                                type="button"
                                onClick={() => {
                                  const list = (currentMeeting.langkah_kbm?.inti?.kegiatan || []).filter((_, i) => i !== actIdx);
                                  updateCurrentMeeting(prev => ({
                                    ...prev,
                                    langkah_kbm: {
                                      ...prev.langkah_kbm,
                                      inti: {
                                        ...prev.langkah_kbm.inti,
                                        kegiatan: list.length > 0 ? list : ['']
                                      }
                                    }
                                  }));
                                }}
                                title="Hapus langkah inti"
                                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors shrink-0 cursor-pointer"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        );
                      })}

                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          const list = currentMeeting.langkah_kbm?.inti?.kegiatan && currentMeeting.langkah_kbm.inti.kegiatan.length > 0
                            ? [...currentMeeting.langkah_kbm.inti.kegiatan, '']
                            : ['', ''];
                          updateCurrentMeeting(prev => ({
                            ...prev,
                            langkah_kbm: {
                              ...prev.langkah_kbm,
                              inti: {
                                ...prev.langkah_kbm.inti,
                                kegiatan: list
                              }
                            }
                          }));
                        }}
                        className="h-8 px-3 rounded-xl text-xs font-bold border-dashed border-2 border-blue-300 dark:border-blue-800 text-blue-800 dark:text-blue-300 hover:bg-blue-100/60 flex items-center gap-1.5 cursor-pointer mt-1"
                      >
                        <Plus size={13} />
                        <span>+ Tambah Langkah Inti</span>
                      </Button>
                    </div>
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
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2 text-indigo-900 dark:text-indigo-200 font-black text-sm">
                    <Compass className="w-4 h-4 text-indigo-600" />
                    <span>Tahap 3: Penutup, Refleksi Pembelajaran &amp; Rangkuman (15 Menit)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const topicName = cleanTopicName(currentMeeting.topik) || 'materi hari ini';
                        updateCurrentMeeting(prev => ({
                          ...prev,
                          langkah_kbm: {
                            ...prev.langkah_kbm,
                            penutup: {
                              ...prev.langkah_kbm.penutup,
                              kegiatan: [
                                `Refleksi Siswa: Guru memfasilitasi siswa mengungkapkan hal baru yang dipelajari dari ${topicName} dan manfaatnya dalam kehidupan.`,
                                'Rangkuman Bersama: Guru bersama siswa merangkum poin-poin esensial dan memberikan apresiasi atas partisipasi aktif seluruh kelas.',
                                'Tindak Lanjut & Doa: Guru menyampaikan rencana materi pertemuan berikutnya dan menutup pembelajaran dengan doa bersama.'
                              ]
                            }
                          }
                        }));
                        toast.success('🪄 Template Standar Penutup berhasil dimuat!', { icon: '✨' });
                      }}
                      className="h-7 px-2.5 rounded-xl text-xs font-bold bg-white dark:bg-slate-900 border-indigo-300 dark:border-indigo-800 text-indigo-800 dark:text-indigo-300 hover:bg-indigo-100 flex items-center gap-1 cursor-pointer shadow-2xs"
                      title="Isi otomatis dengan 3 langkah penutup standar (Refleksi, Rangkuman, Doa & Tindak Lanjut)"
                    >
                      <Sparkles size={12} className="text-indigo-600" />
                      <span>Isi Pola Standar</span>
                    </Button>
                    <span className="px-2.5 py-0.5 rounded-lg bg-indigo-200/80 dark:bg-indigo-900 text-indigo-900 dark:text-indigo-200 font-black text-xs font-mono">
                      Slide Proyektor 4
                    </span>
                  </div>
                </div>

                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-indigo-900 dark:text-indigo-300">
                      Runtutan Refleksi &amp; Penutup:
                    </label>
                    <span className="text-[11px] text-indigo-700/80 dark:text-indigo-400 font-bold">
                      Otomatis menjadi alur tayang Slide Proyektor 4
                    </span>
                  </div>

                  <div className="space-y-2">
                    {(currentMeeting.langkah_kbm?.penutup?.kegiatan && currentMeeting.langkah_kbm.penutup.kegiatan.length > 0
                      ? currentMeeting.langkah_kbm.penutup.kegiatan
                      : ['']
                    ).map((act, actIdx) => {
                      const defaultPlaceholders = [
                        'Contoh: Siswa menyampaikan refleksi: "Apa konsep paling menarik yang kalian pelajari hari ini?"',
                        'Contoh: Guru bersama siswa merangkum poin-poin utama kesimpulan materi...',
                        'Contoh: Guru memberikan apresiasi, info materi pertemuan berikutnya, dan doa penutup.'
                      ];

                      return (
                        <div key={actIdx} className="flex items-center gap-2">
                          <span className="w-7 h-7 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300 font-black text-xs flex items-center justify-center shrink-0 border border-indigo-300 dark:border-indigo-800 shadow-2xs">
                            {actIdx + 1}
                          </span>
                          <input
                            type="text"
                            value={act}
                            onChange={(e) => {
                              const list = currentMeeting.langkah_kbm?.penutup?.kegiatan && currentMeeting.langkah_kbm.penutup.kegiatan.length > 0
                                ? [...currentMeeting.langkah_kbm.penutup.kegiatan]
                                : [''];
                              list[actIdx] = e.target.value;
                              updateCurrentMeeting(prev => ({
                                ...prev,
                                langkah_kbm: {
                                  ...prev.langkah_kbm,
                                  penutup: {
                                    ...prev.langkah_kbm.penutup,
                                    durasi_menit: 15,
                                    kegiatan: list
                                  }
                                }
                              }));
                            }}
                            placeholder={defaultPlaceholders[actIdx] || `Langkah penutup ke-${actIdx + 1}...`}
                            className="flex-1 px-4 py-2.5 rounded-2xl border border-indigo-200 dark:border-indigo-900/60 bg-white dark:bg-slate-900 text-xs font-medium text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none shadow-2xs"
                          />
                          {(currentMeeting.langkah_kbm?.penutup?.kegiatan?.length || 1) > 1 && (
                            <button
                              type="button"
                              onClick={() => {
                                const list = (currentMeeting.langkah_kbm?.penutup?.kegiatan || []).filter((_, i) => i !== actIdx);
                                updateCurrentMeeting(prev => ({
                                  ...prev,
                                  langkah_kbm: {
                                    ...prev.langkah_kbm,
                                    penutup: {
                                      ...prev.langkah_kbm.penutup,
                                      kegiatan: list.length > 0 ? list : ['']
                                    }
                                  }
                                }));
                              }}
                              title="Hapus langkah penutup"
                              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors shrink-0 cursor-pointer"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      );
                    })}

                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const list = currentMeeting.langkah_kbm?.penutup?.kegiatan && currentMeeting.langkah_kbm.penutup.kegiatan.length > 0
                          ? [...currentMeeting.langkah_kbm.penutup.kegiatan, '']
                          : ['', ''];
                        updateCurrentMeeting(prev => ({
                          ...prev,
                          langkah_kbm: {
                            ...prev.langkah_kbm,
                            penutup: {
                              ...prev.langkah_kbm.penutup,
                              kegiatan: list
                            }
                          }
                        }));
                      }}
                      className="h-8 px-3 rounded-xl text-xs font-bold border-dashed border-2 border-indigo-300 dark:border-indigo-800 text-indigo-800 dark:text-indigo-300 hover:bg-indigo-100/60 flex items-center gap-1.5 cursor-pointer mt-1"
                    >
                      <Plus size={13} />
                      <span>+ Tambah Langkah Penutup</span>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
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
