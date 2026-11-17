import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  UniversalDocumentModal,
  PrintDocumentSheet,
  PrintHeader,
  usePrintHeaderData,
} from '@/components/ui/PrintHeader';
import { ScoreRow } from './types';
import { capturePrintSheetsToPdfBlob } from '@/utils/print/capturePrintSheetsToPdf';
import { useDocumentSigners } from '@/hooks/useDocumentSigners';
import { useJurusanOptions } from '@/hooks/useJurusanOptions';
import { useGuruOptions } from '@/hooks/useGuruOptions';
import { useQuery } from '@tanstack/react-query';
import { getStrukturTree, getStrukturList } from '@/api/academic/strukturOrganisasi.api';
import { Button, Input, Label, DigitalSignaturePadModal, DigitalSignatureField } from '@/components/ui';
import Modal from '@/components/ui/Modal';
import { toast } from 'sonner';
import {
  Check,
  AlertCircle,
  FileText,
  UserCheck,
  Award,
  PenTool,
  RotateCcw,
  Download,
  Settings,
  Printer,
  Calendar,
  Clock,
  MapPin,
} from 'lucide-react';
import { cn, resolveProfilePhotoUrl } from '@/lib/utils';

export interface PklSidangCetakModalProps {
  isOpen: boolean;
  onClose: () => void;
  scores: ScoreRow[];
  jurusanId?: string;
  jurusanNama?: string;
  selectedTpNama?: string;
  selectedSemesterNama?: string;
  activePengujiNama?: string;
  isKaprog?: boolean;
  initialDocType?: 'BERITA_ACARA' | 'PENGUJI' | 'JURUSAN' | 'DAFTAR_HADIR' | 'REKAP_PENGUJI' | 'REKAP_JURUSAN';
}

export type PklDocType = 'BERITA_ACARA' | 'REKAP_PENGUJI' | 'REKAP_JURUSAN' | 'DAFTAR_HADIR';

export const PklSidangCetakModal: React.FC<PklSidangCetakModalProps> = ({
  isOpen,
  onClose,
  scores,
  jurusanId: propJurusanId,
  jurusanNama: propJurusanNama,
  selectedTpNama = '',
  selectedSemesterNama = '',
  activePengujiNama = '',
  isKaprog = false,
  initialDocType,
}) => {
  const { tenantInfo, rawSekolah } = usePrintHeaderData();
  const { rawList: allJurusanListRaw } = useJurusanOptions();
  const allJurusanList = useMemo(() => allJurusanListRaw || [], [allJurusanListRaw]);
  const { rawList: rawGuruList } = useGuruOptions({ jenisPtk: 'ALL', onlyActive: false });
  const guruList = useMemo(() => rawGuruList || [], [rawGuruList]);
  const printSheetRef = useRef<HTMLDivElement>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // Mode Dokumen: 'BERITA_ACARA' (Format Resmi A4 Portrait) | 'REKAP_PENGUJI' | 'REKAP_JURUSAN' | 'DAFTAR_HADIR'
  const [docType, setDocType] = useState<PklDocType>(() => {
    if (initialDocType === 'DAFTAR_HADIR') return 'DAFTAR_HADIR';
    if (initialDocType === 'JURUSAN' || initialDocType === 'REKAP_JURUSAN') return 'REKAP_JURUSAN';
    if (initialDocType === 'PENGUJI' || initialDocType === 'REKAP_PENGUJI') return 'REKAP_PENGUJI';
    return 'BERITA_ACARA';
  });

  // Sinkronisasi jika initialDocType berubah dari luar
  useEffect(() => {
    if (initialDocType) {
      if (initialDocType === 'DAFTAR_HADIR') setDocType('DAFTAR_HADIR');
      else if (initialDocType === 'JURUSAN' || initialDocType === 'REKAP_JURUSAN') setDocType('REKAP_JURUSAN');
      else if (initialDocType === 'PENGUJI' || initialDocType === 'REKAP_PENGUJI') setDocType('REKAP_PENGUJI');
      else setDocType('BERITA_ACARA');
    }
  }, [initialDocType]);

  // =========================================================================
  // 1. RESOLUSI PROGRAM KEAHLIAN YANG AKURAT (SSOT)
  // =========================================================================
  const availableJurusanList = useMemo(() => {
    const map = new Map<string, { id: string; nama: string; singkatan: string }>();

    scores.forEach((s) => {
      let jId = s.jurusan_id;
      let jNama = s.nama_jurusan;
      let jSingkatan = s.singkatan_jurusan;

      // 1. Cocokkan dari allJurusanList via ID
      if (jId && !jNama) {
        const found = (allJurusanList || []).find((j) => j.id === jId);
        if (found) {
          jNama = found.nama || (found as any).nama_jurusan;
          jSingkatan = found.singkatan || (found as any).kode;
        }
      }

      // 2. Deteksi cerdas dari nama kelas siswa (contoh "XII AK 1" -> "AK")
      if (!jNama && s.nama_kelas) {
        const parts = s.nama_kelas.trim().split(/[\s-]+/);
        const codeCandidate = parts.length >= 2 ? parts[1].toUpperCase() : '';
        if (codeCandidate) {
          const found = (allJurusanList || []).find((j) => {
            const sKode = (j.singkatan || (j as any).kode || (j as any).kode_jurusan || '').toUpperCase();
            const sNama = (j.nama || (j as any).nama_jurusan || '').toUpperCase();
            return sKode === codeCandidate || sNama.includes(codeCandidate);
          });
          if (found) {
            jId = found.id;
            jNama = found.nama || (found as any).nama_jurusan;
            jSingkatan = found.singkatan || (found as any).kode;
          }
        }
      }

      if (jNama) {
        const key = jId || jNama;
        if (!map.has(key)) {
          map.set(key, {
            id: jId || key,
            nama: jNama,
            singkatan: jSingkatan || '',
          });
        }
      }
    });

    return Array.from(map.values());
  }, [scores, allJurusanList]);

  // Default filter jurusan
  const [selectedJurusanFilter, setSelectedJurusanFilter] = useState<string>(() => {
    if (propJurusanId) return propJurusanId;
    if (availableJurusanList.length === 1) return availableJurusanList[0].id;
    return 'ALL';
  });

  useEffect(() => {
    if (propJurusanId) {
      setSelectedJurusanFilter(propJurusanId);
    } else if (availableJurusanList.length === 1) {
      setSelectedJurusanFilter(availableJurusanList[0].id);
    }
  }, [availableJurusanList, propJurusanId]);

  // Program Keahlian Aktif yang Terpilih
  const activeJurusanObj = useMemo(() => {
    if (selectedJurusanFilter !== 'ALL') {
      const foundAvailable = (availableJurusanList || []).find((j) => j.id === selectedJurusanFilter);
      if (foundAvailable) return foundAvailable;
      const foundAll = (allJurusanList || []).find((j) => j.id === selectedJurusanFilter);
      if (foundAll) {
        return {
          id: foundAll.id,
          nama: foundAll.nama || (foundAll as any).nama_jurusan,
          singkatan: foundAll.singkatan || (foundAll as any).kode || '',
        };
      }
    }
    if (availableJurusanList.length === 1) {
      return availableJurusanList[0];
    }
    if (propJurusanNama && propJurusanNama !== 'Semua Program Keahlian' && propJurusanNama !== 'Kejuruan') {
      return { id: propJurusanId || '', nama: propJurusanNama, singkatan: '' };
    }
    return null;
  }, [selectedJurusanFilter, availableJurusanList, allJurusanList, propJurusanNama, propJurusanId]);

  const displayJurusanTitle = useMemo(() => {
    if (activeJurusanObj) {
      return `${activeJurusanObj.nama}${activeJurusanObj.singkatan ? ` (${activeJurusanObj.singkatan})` : ''}`.toUpperCase();
    }
    if (propJurusanNama && propJurusanNama !== 'Semua Program Keahlian') {
      return propJurusanNama.toUpperCase();
    }
    return 'SEMUA PROGRAM KEAHLIAN';
  }, [activeJurusanObj, propJurusanNama]);

  // =========================================================================
  // 2. FILTER PENGUJI & KELAS DALAM MODAL
  // =========================================================================
  const pengujiList = useMemo(() => {
    const set = new Set<string>();
    scores.forEach((s) => {
      if (s.penguji_nama) set.add(s.penguji_nama);
    });
    return Array.from(set).sort();
  }, [scores]);

  const [selectedPengujiFilter, setSelectedPengujiFilter] = useState<string>(() => {
    if (activePengujiNama && pengujiList.includes(activePengujiNama)) {
      return activePengujiNama;
    }
    return pengujiList[0] || 'ALL';
  });

  const kelasList = useMemo(() => {
    const set = new Set<string>();
    scores.forEach((s) => {
      if (s.nama_kelas) set.add(s.nama_kelas);
    });
    return Array.from(set).sort();
  }, [scores]);

  const [selectedKelasFilter, setSelectedKelasFilter] = useState<string>('ALL');

  // Filter Siswa yang tampil di dokumen cetak
  const filteredScores = useMemo(() => {
    return scores.filter((s) => {
      // Filter Jurusan jika dipilih spesifik
      if (selectedJurusanFilter !== 'ALL') {
        const matchId = s.jurusan_id === selectedJurusanFilter;
        let matchClass = false;
        if (s.nama_kelas) {
          const target = (availableJurusanList || []).find((j) => j.id === selectedJurusanFilter);
          if (target?.singkatan) {
            matchClass = s.nama_kelas.toUpperCase().includes(target.singkatan.toUpperCase());
          }
        }
        if (!matchId && !matchClass) return false;
      }
      // Filter Penguji (pada Berita Acara, Rekap Penguji, atau Daftar Hadir)
      if ((docType === 'BERITA_ACARA' || docType === 'REKAP_PENGUJI' || docType === 'DAFTAR_HADIR') && selectedPengujiFilter !== 'ALL') {
        if (s.penguji_nama !== selectedPengujiFilter) return false;
      }
      // Filter Kelas
      if (selectedKelasFilter !== 'ALL' && s.nama_kelas !== selectedKelasFilter) {
        return false;
      }
      return true;
    });
  }, [scores, selectedJurusanFilter, availableJurusanList, docType, selectedPengujiFilter, selectedKelasFilter]);

  // Statistik Hasil Sidang & Presensi
  const stats = useMemo(() => {
    const total = filteredScores.length;
    let lulus = 0;
    let revisi = 0;
    let belum = 0;
    let totalScore = 0;
    let countScored = 0;
    let sudahTtd = 0;
    let belumTtd = 0;

    filteredScores.forEach((s) => {
      if (s.ttd_siswa) {
        sudahTtd++;
      } else {
        belumTtd++;
      }

      if (s.nilai_sidang !== null && s.nilai_sidang !== undefined && s.nilai_sidang !== '') {
        const num = Number(s.nilai_sidang);
        totalScore += num;
        countScored++;
        if (num >= 70) lulus++;
        else revisi++;
      } else {
        belum++;
      }
    });

    const avg = countScored > 0 ? (totalScore / countScored).toFixed(1) : '-';
    return { total, lulus, revisi, belum, avg, countScored, sudahTtd, belumTtd };
  }, [filteredScores]);

  // Titimangsa & Tanggal Dokumen
  const titimangsaCity = useMemo(() => {
    if (tenantInfo.address) {
      const parts = tenantInfo.address.split(',');
      const candidate = parts[parts.length - 1]?.trim() || parts[0]?.trim();
      return candidate.replace(/^kabupaten\s+|^kab\.\s+|^kota\s+/i, '').trim();
    }
    return 'Tempat';
  }, [tenantInfo.address]);

  const currentDateFormatted = useMemo(() => {
    const now = new Date();
    return now.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }, []);

  const defaultHariTanggalIndo = useMemo(() => {
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const months = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    const now = new Date();
    return `${days[now.getDay()]}, ${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;
  }, []);

  // =========================================================================
  // 3. PENGATURAN NASKAH RESMI BERITA ACARA SIDANG PKL
  // =========================================================================
  const [beritaAcaraConfig, setBeritaAcaraConfig] = useState({
    nomorSurat: `421.5 / ..... / Hubin-PKL / ${new Date().getFullYear()}`,
    hariTanggal: defaultHariTanggalIndo,
    waktuSidang: '08.00 s.d 15.30 WIB',
    ruangSidang: 'Ruang Sidang PKL / Laboratorium Komputer',
    catatanPelaksanaan:
      'Ujian Sidang Pertanggungjawaban Praktik Kerja Lapangan (PKL) telah dilaksanakan sesuai jadwal dengan tertib, aman, dan lancar. Seluruh peserta memaparkan laporan hasil magang di industri serta menyelesaikan sesi tanya jawab dengan baik berpedoman pada rubrik penilaian kejuruan.',
    includeLampiran: true,
  });

  const [showEditBeritaAcara, setShowEditBeritaAcara] = useState(false);

  // =========================================================================
  // 4. AUTO-RESOLVING STRUKTUR PENANDATANGAN 2-TIER (TREE + FLAT LIST SSOT)
  // =========================================================================
  const { data: treeRes } = useQuery({
    queryKey: ['academic-struktur-tree'],
    queryFn: () => getStrukturTree().catch(() => null),
    staleTime: 5 * 60 * 1000,
  });

  const { data: listRes } = useQuery({
    queryKey: ['academic-struktur-list-active'],
    queryFn: () => getStrukturList({ is_active: true }).catch(() => null),
    staleTime: 5 * 60 * 1000,
  });

  const effectiveJurusanIdForSigners = activeJurusanObj?.id || propJurusanId;
  const signersHook = useDocumentSigners({
    jurusanId: effectiveJurusanIdForSigners,
  });

  const cleanNip = (rawDetails?: string): string => {
    if (!rawDetails) return '-';
    const match = rawDetails.match(/NIP[:\s]+([0-9\s]+)/i);
    if (match && match[1]) {
      return match[1].trim();
    }
    const digitsOnly = rawDetails.replace(/[^0-9]/g, '');
    if (digitsOnly.length >= 8) {
      return digitsOnly;
    }
    return rawDetails === 'GURU' || rawDetails === 'SISWA' ? '-' : rawDetails;
  };

  // Resolusi Akurat Ketua Program Keahlian (Multi-Layer Hierarchy)
  const resolvedKaprog = useMemo(() => {
    const tree = (treeRes as any)?.data || treeRes || {};
    const list = Array.isArray((listRes as any)?.data)
      ? (listRes as any).data
      : Array.isArray(listRes)
      ? listRes
      : [];

    const targetId = activeJurusanObj?.id || propJurusanId || (scores.find((s) => s.jurusan_id)?.jurusan_id);
    let targetKode = (activeJurusanObj?.singkatan || (scores.find((s) => s.singkatan_jurusan)?.singkatan_jurusan) || '').trim().toUpperCase();
    let targetNama = (activeJurusanObj?.nama || propJurusanNama || (scores.find((s) => s.nama_jurusan)?.nama_jurusan) || '').trim();

    // Fallback: deteksi singkatan dari nama kelas siswa (contoh "XII TKJ 1" -> "TKJ")
    if (!targetKode) {
      for (const s of scores) {
        if (s.nama_kelas) {
          const parts = s.nama_kelas.trim().split(/[\s-]+/);
          if (parts.length >= 2 && parts[1].length >= 2) {
            targetKode = parts[1].toUpperCase();
            break;
          }
        }
      }
    }

    // LAYER 1: Topology Tree Nodes ('KAPROG')
    const kaprogNodes = Array.isArray(tree['KAPROG']) ? tree['KAPROG'] : [];
    const matchingTree = kaprogNodes.find((node: any) => {
      if (targetId && node.unit_id === targetId) return true;
      const nKode = (node.unit_kode || '').toUpperCase();
      const nNama = (node.unit_name || '').toUpperCase();

      if (targetKode && (nKode === targetKode || nNama.includes(targetKode))) return true;
      if (targetNama && (nNama === targetNama.toUpperCase() || nNama.includes(targetNama.toUpperCase()) || targetNama.toUpperCase().includes(nNama))) return true;
      return false;
    });

    if (matchingTree && matchingTree.members && matchingTree.members.length > 0) {
      const m = matchingTree.members[0];
      if (m && m.name && m.name !== 'Unknown') {
        return {
          nama: m.name,
          nip: cleanNip(m.details),
          isAssigned: true,
        };
      }
    }

    // LAYER 2: Flat Positions List ('KAPROG')
    const kaprogPos = list.find((p: any) => (p.kode || p.code || '').toUpperCase() === 'KAPROG');
    if (kaprogPos && Array.isArray(kaprogPos.organizationalAssigns)) {
      const matchingAssign = kaprogPos.organizationalAssigns.find((a: any) => {
        if (targetId && a.unit_id === targetId && a.is_active !== false) return true;
        const uKode = (a.Unit?.singkatan || a.Unit?.kode || '').toUpperCase();
        const uNama = (a.Unit?.nama || '').toUpperCase();
        if (targetKode && (uKode === targetKode || uNama.includes(targetKode))) return true;
        if (targetNama && (uNama === targetNama.toUpperCase() || uNama.includes(targetNama.toUpperCase()))) return true;
        return false;
      });

      if (matchingAssign && matchingAssign.User?.Guru) {
        return {
          nama: matchingAssign.User.Guru.nama_guru,
          nip: cleanNip(matchingAssign.User.Guru.nip),
          isAssigned: true,
        };
      }
    }

    // LAYER 3: Fallback ke signersHook jika berhasil di-resolve
    if (signersHook.kaprog?.isAssigned && signersHook.kaprog.personName && signersHook.kaprog.personName !== 'Ketua Program Keahlian') {
      return {
        nama: signersHook.kaprog.personName,
        nip: signersHook.kaprog.nip || '-',
        isAssigned: true,
      };
    }

    // LAYER 4: Fallback Defensif Teruji Institusi SMKN 1 Plered
    if (targetKode === 'TKJ' || targetNama.toUpperCase().includes('KOMPUTER') || targetNama.toUpperCase().includes('TKJ')) {
      return {
        nama: 'M. FIRMAN ZAMAL MUSTOFA, S.Kom.',
        nip: '198909032025211142',
        isAssigned: true,
      };
    }

    return {
      nama: targetNama ? `Ketua Program Keahlian ${targetNama}` : 'Ketua Program Keahlian',
      nip: '-',
      isAssigned: false,
    };
  }, [treeRes, listRes, activeJurusanObj, propJurusanId, propJurusanNama, scores, signersHook.kaprog]);

  // Temukan guru penguji aktif dan NIP-nya
  const currentPengujiObj = useMemo(() => {
    const targetName = selectedPengujiFilter !== 'ALL' ? selectedPengujiFilter : activePengujiNama;
    if (!targetName) return null;
    return (guruList || []).find((g) => g.nama_guru?.trim().toLowerCase() === targetName.trim().toLowerCase()) || null;
  }, [guruList, selectedPengujiFilter, activePengujiNama]);

  // Default Signers Data
  const defaultSigners = useMemo(() => {
    // 1. Kaprog (dari resolvedKaprog)
    const kaprogNama = resolvedKaprog.nama;
    const kaprogNip = resolvedKaprog.nip;

    // 2. Guru Penguji
    const pengujiNama = selectedPengujiFilter !== 'ALL'
      ? selectedPengujiFilter
      : (activePengujiNama || 'Guru Penguji');
    const pengujiNip = currentPengujiObj?.nip || '-';

    // 3. Waka Hubin
    let wakaHubinNama = signersHook.wakaHubin?.personName || '';
    let wakaHubinNip = signersHook.wakaHubin?.nip || '-';
    if (!wakaHubinNama || wakaHubinNama === 'Wakasek Bidang Hubin' || !signersHook.wakaHubin?.isAssigned) {
      wakaHubinNama = 'Samsurizal Manahan Tan., M.Pd.';
      wakaHubinNip = '197112302009021001';
    }

    // 4. Kepala Sekolah
    const kepsekNama = tenantInfo.kepala_sekolah || rawSekolah?.kepala_sekolah || signersHook.kepsek?.personName || 'Kepala Sekolah';
    const kepsekNip = tenantInfo.nip_kepala || rawSekolah?.nip_kepala || signersHook.kepsek?.nip || '-';

    return {
      kaprog: { nama: kaprogNama, nip: kaprogNip },
      penguji: { nama: pengujiNama, nip: pengujiNip },
      wakaHubin: { nama: wakaHubinNama, nip: wakaHubinNip },
      kepsek: { nama: kepsekNama, nip: kepsekNip },
    };
  }, [resolvedKaprog, signersHook, tenantInfo, rawSekolah, selectedPengujiFilter, activePengujiNama, currentPengujiObj]);

  const [customSigners, setCustomSigners] = useState(defaultSigners);
  const [showEditSigners, setShowEditSigners] = useState(false);

  // =========================================================================
  // 5. ENGINE SIGNATURE DIGITAL PERSISTEN (GURU PENGUJI, KAPROG, WAKA HUBIN)
  // =========================================================================
  const [signaturePenguji, setSignaturePenguji] = useState<string | null>(() => {
    try {
      return localStorage.getItem('absenta_sig_sidang_penguji') || null;
    } catch {
      return null;
    }
  });

  const [signatureKaprog, setSignatureKaprog] = useState<string | null>(() => {
    try {
      return localStorage.getItem('absenta_sig_sidang_kaprog') || null;
    } catch {
      return null;
    }
  });

  const [signatureWakaHubin, setSignatureWakaHubin] = useState<string | null>(() => {
    try {
      return localStorage.getItem('absenta_sig_sidang_wakahubin') || null;
    } catch {
      return null;
    }
  });

  const [signatureKepsek, setSignatureKepsek] = useState<string | null>(() => {
    try {
      return localStorage.getItem('absenta_sig_sidang_kepsek') || null;
    } catch {
      return null;
    }
  });

  // Modal Pad Signature Aktif
  const [activeSigningTarget, setActiveSigningTarget] = useState<'PENGUJI' | 'KAPROG' | 'WAKA_HUBIN' | 'KEPSEK' | null>(null);

  const handleSaveSignature = (target: 'PENGUJI' | 'KAPROG' | 'WAKA_HUBIN' | 'KEPSEK' | null, base64: string | null) => {
    if (!target) return;
    try {
      if (target === 'PENGUJI') {
        setSignaturePenguji(base64);
        if (base64) localStorage.setItem('absenta_sig_sidang_penguji', base64);
        else localStorage.removeItem('absenta_sig_sidang_penguji');
      } else if (target === 'KAPROG') {
        setSignatureKaprog(base64);
        if (base64) localStorage.setItem('absenta_sig_sidang_kaprog', base64);
        else localStorage.removeItem('absenta_sig_sidang_kaprog');
      } else if (target === 'WAKA_HUBIN') {
        setSignatureWakaHubin(base64);
        if (base64) localStorage.setItem('absenta_sig_sidang_wakahubin', base64);
        else localStorage.removeItem('absenta_sig_sidang_wakahubin');
      } else if (target === 'KEPSEK') {
        setSignatureKepsek(base64);
        if (base64) localStorage.setItem('absenta_sig_sidang_kepsek', base64);
        else localStorage.removeItem('absenta_sig_sidang_kepsek');
      }
      toast.success('Tanda tangan digital berhasil diperbarui!');
    } catch (e) {
      console.error(e);
    }
  };

  // Reusable Interactive Signature Renderer Block for Paper Document
  const renderSignatureBox = (
    target: 'KAPROG' | 'PENGUJI' | 'WAKA_HUBIN' | 'KEPSEK',
    title: string,
    align: 'left' | 'center' | 'right' = 'left',
    heightMm: number = 20
  ) => {
    let sigImg: string | null = null;
    let personName = '';
    if (target === 'KAPROG') {
      sigImg = signatureKaprog;
      personName = customSigners.kaprog.nama;
    } else if (target === 'PENGUJI') {
      sigImg = signaturePenguji;
      personName = customSigners.penguji.nama;
    } else if (target === 'WAKA_HUBIN') {
      sigImg = signatureWakaHubin;
      personName = customSigners.wakaHubin.nama;
    } else if (target === 'KEPSEK') {
      sigImg = signatureKepsek;
      personName = customSigners.kepsek.nama;
    }

    const justifyClass = align === 'right' ? 'justify-end' : align === 'center' ? 'justify-center' : 'justify-start';

    return (
      <div
        onClick={() => setActiveSigningTarget(target)}
        style={{ height: `${heightMm}mm` }}
        className={cn(
          'flex items-center my-1 cursor-pointer group relative rounded border border-transparent hover:border-dashed hover:border-indigo-400 p-1 transition-all',
          justifyClass
        )}
        title={`Klik untuk membuat / mengubah Tanda Tangan Digital ${title}`}
      >
        {sigImg ? (
          <img
            src={resolveProfilePhotoUrl(sigImg)}
            alt={`TTD ${personName}`}
            style={{ maxHeight: `${heightMm - 2}mm` }}
            className="max-w-[55mm] object-contain select-none"
          />
        ) : (
          <div className={cn(
            'h-full w-full flex items-center gap-1.5 text-slate-400 group-hover:text-indigo-600 print:hidden text-[9px] font-mono select-none',
            justifyClass
          )}>
            <PenTool className="w-3.5 h-3.5 shrink-0" />
            <span>(Klik untuk TTD Digital)</span>
          </div>
        )}
      </div>
    );
  };

  useEffect(() => {
    setCustomSigners(defaultSigners);
  }, [defaultSigners]);

  const handleResetSigners = () => {
    setCustomSigners(defaultSigners);
    toast.info('Data penandatangan dikembalikan ke konfigurasi resmi sistem.');
  };

  // =========================================================================
  // 5. TRUE WYSIWYG EXPORT PDF
  // =========================================================================
  const pdfFileName = useMemo(() => {
    const cleanJurusan = displayJurusanTitle.replace(/[^a-zA-Z0-9]/g, '_');
    const cleanPenguji = (selectedPengujiFilter !== 'ALL' ? selectedPengujiFilter : 'Semua_Penguji').replace(/[^a-zA-Z0-9]/g, '_');
    if (docType === 'BERITA_ACARA') {
      return `Berita_Acara_Sidang_PKL_${cleanJurusan}_${cleanPenguji}`;
    }
    if (docType === 'DAFTAR_HADIR') {
      return `Daftar_Hadir_Sidang_PKL_${cleanJurusan}_${cleanPenguji}`;
    }
    return docType === 'REKAP_PENGUJI'
      ? `Rekap_Nilai_Sidang_Penguji_${cleanJurusan}_${cleanPenguji}`
      : `Rekap_Hasil_Sidang_PKL_${cleanJurusan}`;
  }, [docType, displayJurusanTitle, selectedPengujiFilter]);

  const handleDownloadPdf = async () => {
    if (!printSheetRef.current) {
      toast.error('Lembar dokumen tidak ditemukan.');
      return;
    }
    try {
      setIsGeneratingPdf(true);
      toast.info('Sedang merender lembar dokumen ke berkas PDF True WYSIWYG...', { duration: 3000 });
      const res = await capturePrintSheetsToPdfBlob(printSheetRef.current, {
        orientation: docType === 'BERITA_ACARA' ? 'portrait' : 'landscape',
        fileName: pdfFileName,
        scale: 2.5,
      });

      const url = URL.createObjectURL(res.blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = res.fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('Dokumen PDF berhasil diunduh!');
    } catch (err: any) {
      toast.error(err?.message || 'Gagal membuat file PDF.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const isPortraitDoc = docType === 'BERITA_ACARA';

  const documentTitle = docType === 'BERITA_ACARA'
    ? 'BERITA ACARA PELAKSANAAN SIDANG / UJIAN PRAKTIK KERJA LAPANGAN (PKL)'
    : docType === 'DAFTAR_HADIR'
    ? 'DAFTAR HADIR PESERTA UJIAN SIDANG PRAKTIK KERJA LAPANGAN (PKL)'
    : docType === 'REKAP_PENGUJI'
    ? 'LEMBAR PENILAIAN & REKAPITULASI HASIL SIDANG PKL (PENGUJI)'
    : 'REKAPITULASI HASIL UJIAN SIDANG PRAKTIK KERJA LAPANGAN (PKL)';

  return (
    <>
      <UniversalDocumentModal
        isOpen={isOpen}
        onClose={onClose}
        title={docType === 'BERITA_ACARA' ? 'Pratinjau Berita Acara Sidang PKL' : 'Cetak Berkas Hasil Sidang PKL'}
        defaultVariant={isPortraitDoc ? 'portrait' : 'landscape'}
        allowLogoToggles={true}
        onDownloadPdf={handleDownloadPdf}
        downloadPdfText={isGeneratingPdf ? 'Memproses...' : 'Unduh PDF'}
        customToolbarContent={
          <div className="flex items-center gap-2 flex-wrap">
            {/* Toggle Jenis Dokumen */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs">
              <button
                type="button"
                onClick={() => setDocType('BERITA_ACARA')}
                className={cn(
                  'px-2.5 py-1 rounded-md font-bold transition-all flex items-center gap-1.5 cursor-pointer',
                  docType === 'BERITA_ACARA'
                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                )}
                title="Format Khusus Berita Acara Resmi Pelaksanaan Sidang PKL (A4 Portrait)"
              >
                <FileText size={13} />
                <span>Berita Acara Resmi</span>
              </button>
              <button
                type="button"
                onClick={() => setDocType('REKAP_PENGUJI')}
                className={cn(
                  'px-2.5 py-1 rounded-md font-bold transition-all flex items-center gap-1.5 cursor-pointer',
                  docType === 'REKAP_PENGUJI'
                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                )}
                title="Tabel Rekap Nilai 4 Aspek Penilaian per Penguji"
              >
                <Award size={13} />
                <span>Rekap Penguji</span>
              </button>
              <button
                type="button"
                onClick={() => setDocType('REKAP_JURUSAN')}
                className={cn(
                  'px-2.5 py-1 rounded-md font-bold transition-all flex items-center gap-1.5 cursor-pointer',
                  docType === 'REKAP_JURUSAN'
                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                )}
                title="Tabel Rekap Nilai Sidang Seluruh Siswa Jurusan"
              >
                <Award size={13} />
                <span>Rekap Jurusan</span>
              </button>
              <button
                type="button"
                onClick={() => setDocType('DAFTAR_HADIR')}
                className={cn(
                  'px-2.5 py-1 rounded-md font-bold transition-all flex items-center gap-1.5 cursor-pointer',
                  docType === 'DAFTAR_HADIR'
                    ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-300 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                )}
                title="Tabel Daftar Hadir Presensi Siswa & TTD"
              >
                <UserCheck size={13} />
                <span>Daftar Hadir</span>
              </button>
            </div>

            {/* Filter Jurusan / Program Keahlian jika lebih dari 1 */}
            {availableJurusanList.length > 1 && (
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-slate-500 font-medium">Program Keahlian:</span>
                <select
                  value={selectedJurusanFilter}
                  onChange={(e) => setSelectedJurusanFilter(e.target.value)}
                  className="h-8 px-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-semibold text-slate-800 dark:text-slate-200 focus:outline-none"
                >
                  <option value="ALL">Semua Program Keahlian</option>
                  {availableJurusanList.map((j) => (
                    <option key={j.id} value={j.id}>
                      {j.nama} {j.singkatan ? `(${j.singkatan})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Filter Penguji */}
            {(docType === 'BERITA_ACARA' || docType === 'REKAP_PENGUJI' || docType === 'DAFTAR_HADIR') && pengujiList.length > 0 && (
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-slate-500 font-medium">Penguji:</span>
                <select
                  value={selectedPengujiFilter}
                  onChange={(e) => setSelectedPengujiFilter(e.target.value)}
                  className="h-8 px-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-semibold text-slate-800 dark:text-slate-200 focus:outline-none"
                >
                  <option value="ALL">Semua Guru Penguji</option>
                  {pengujiList.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Filter Kelas */}
            {kelasList.length > 0 && (
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-slate-500 font-medium">Kelas:</span>
                <select
                  value={selectedKelasFilter}
                  onChange={(e) => setSelectedKelasFilter(e.target.value)}
                  className="h-8 px-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-semibold text-slate-800 dark:text-slate-200 focus:outline-none"
                >
                  <option value="ALL">Semua Kelas</option>
                  {kelasList.map((k) => (
                    <option key={k} value={k}>{k}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Tombol Detail Berita Acara (Khusus Mode Berita Acara) */}
            {docType === 'BERITA_ACARA' && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowEditBeritaAcara(true)}
                className="text-xs gap-1.5 h-8 px-2.5 border-dashed border-indigo-300 dark:border-indigo-600 text-indigo-700 dark:text-indigo-300 bg-indigo-50/50"
                title="Sesuaikan Nomor Surat, Waktu, Ruang, dan Catatan Berita Acara"
              >
                <Settings className="w-3.5 h-3.5 text-indigo-600" />
                <span>Isi Berita Acara</span>
              </Button>
            )}

            {/* Tombol Sesuaikan Penandatangan */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowEditSigners(true)}
              className="text-xs gap-1.5 h-8 px-2.5 border-dashed border-slate-300 dark:border-slate-600"
              title="Sesuaikan nama dan NIP pejabat penandatangan bila ada Plt/Pengganti"
            >
              <PenTool className="w-3.5 h-3.5 text-indigo-600" />
              <span>Pejabat TTD</span>
            </Button>
          </div>
        }
      >
        <div ref={printSheetRef} className="space-y-6">
          {/* ========================================================================= */}
          {/* DOKUMEN 1: KHUSUS BERITA ACARA RESMI SIDANG PKL (STANDAR A4 PORTRAIT)      */}
          {/* ========================================================================= */}
          {docType === 'BERITA_ACARA' ? (
            <>
              {/* LEMBAR 1: NASKAH BERITA ACARA UTAMA */}
              <PrintDocumentSheet
                orientation="portrait"
                pageNumber={1}
                totalPages={beritaAcaraConfig.includeLampiran ? 2 : 1}
                footerText={`Berita Acara Pelaksanaan Sidang PKL — ${displayJurusanTitle}`}
                className="p-8 text-black bg-white"
              >
                {/* KOP RESMI SEKOLAH */}
                <PrintHeader
                  variant="portrait"
                  tenantInfo={tenantInfo}
                  showLogoDaerah={true}
                  showLogoSekolah={true}
                  showDivider={true}
                  className="mb-3"
                />

                {/* JUDUL DOKUMEN & NOMOR RESMI */}
                <div className="text-center my-3 space-y-0.5">
                  <h1 className="text-sm font-bold tracking-wider uppercase underline">
                    BERITA ACARA PELAKSANAAN
                  </h1>
                  <h2 className="text-sm font-bold tracking-wider uppercase">
                    SIDANG / UJIAN PRAKTIK KERJA LAPANGAN (PKL)
                  </h2>
                  <p className="text-[11px] font-semibold text-slate-700">
                    Tahun Pelajaran {selectedTpNama || '-'} {selectedSemesterNama ? `• Semester ${selectedSemesterNama}` : ''}
                  </p>
                  <p className="text-[10px] font-mono text-slate-600 mt-1">
                    Nomor: {beritaAcaraConfig.nomorSurat}
                  </p>
                </div>

                {/* KLAUSUL NARASI PEMBUKA */}
                <p className="text-justify indent-8 my-3 text-[11px] leading-relaxed text-slate-900">
                  Pada hari ini, <strong>{beritaAcaraConfig.hariTanggal}</strong>, bertempat di <strong>{beritaAcaraConfig.ruangSidang}</strong> {tenantInfo.name || 'SMK'}, telah diselenggarakan Ujian Sidang Pertanggungjawaban Praktik Kerja Lapangan (PKL) Tahun Pelajaran <strong>{selectedTpNama || '-'}</strong> bagi peserta didik Program Keahlian <strong>{displayJurusanTitle}</strong>, dengan rincian pelaksanaan sebagai berikut:
                </p>

                {/* TABEL RINCIAN INFORMASI PELAKSANAAN */}
                <table className="w-full my-3 text-[11px] border-collapse border border-slate-300">
                  <tbody>
                    <tr className="border-b border-slate-200">
                      <td className="w-6 p-1.5 align-top font-bold text-center bg-slate-50 border-r border-slate-300">1.</td>
                      <td className="w-48 p-1.5 align-top font-semibold bg-slate-50 border-r border-slate-300">Program Keahlian</td>
                      <td className="p-1.5 align-top font-bold text-slate-900">: {displayJurusanTitle}</td>
                    </tr>
                    <tr className="border-b border-slate-200">
                      <td className="p-1.5 align-top font-bold text-center bg-slate-50 border-r border-slate-300">2.</td>
                      <td className="p-1.5 align-top font-semibold bg-slate-50 border-r border-slate-300">Hari, Tanggal Pelaksanaan</td>
                      <td className="p-1.5 align-top">: {beritaAcaraConfig.hariTanggal}</td>
                    </tr>
                    <tr className="border-b border-slate-200">
                      <td className="p-1.5 align-top font-bold text-center bg-slate-50 border-r border-slate-300">3.</td>
                      <td className="p-1.5 align-top font-semibold bg-slate-50 border-r border-slate-300">Waktu / Sesi Pelaksanaan</td>
                      <td className="p-1.5 align-top">: {beritaAcaraConfig.waktuSidang}</td>
                    </tr>
                    <tr className="border-b border-slate-200">
                      <td className="p-1.5 align-top font-bold text-center bg-slate-50 border-r border-slate-300">4.</td>
                      <td className="p-1.5 align-top font-semibold bg-slate-50 border-r border-slate-300">Ruang / Tempat Ujian</td>
                      <td className="p-1.5 align-top">: {beritaAcaraConfig.ruangSidang}</td>
                    </tr>
                    <tr className="border-b border-slate-200">
                      <td className="p-1.5 align-top font-bold text-center bg-slate-50 border-r border-slate-300">5.</td>
                      <td className="p-1.5 align-top font-semibold bg-slate-50 border-r border-slate-300">Guru Penguji Sidang PKL</td>
                      <td className="p-1.5 align-top font-bold">
                        : {customSigners.penguji.nama} {customSigners.penguji.nip && customSigners.penguji.nip !== '-' ? `(NIP. ${customSigners.penguji.nip})` : ''}
                      </td>
                    </tr>
                    <tr className="border-b border-slate-200">
                      <td className="p-1.5 align-top font-bold text-center bg-slate-50 border-r border-slate-300">6.</td>
                      <td className="p-1.5 align-top font-semibold bg-slate-50 border-r border-slate-300">Ketua Program Keahlian</td>
                      <td className="p-1.5 align-top">
                        : {customSigners.kaprog.nama} {customSigners.kaprog.nip && customSigners.kaprog.nip !== '-' ? `(NIP. ${customSigners.kaprog.nip})` : ''}
                      </td>
                    </tr>
                    <tr className="border-b border-slate-200">
                      <td className="p-1.5 align-top font-bold text-center bg-slate-50 border-r border-slate-300">7.</td>
                      <td className="p-1.5 align-top font-semibold bg-slate-50 border-r border-slate-300">Data Kehadiran Peserta</td>
                      <td className="p-1.5 align-top">
                        : Terdaftar <strong>{stats.total}</strong> orang, Hadir & Selesai Diuji <strong>{stats.total - stats.belum}</strong> orang, Belum / Tidak Hadir <strong>{stats.belum}</strong> orang
                      </td>
                    </tr>
                    <tr>
                      <td className="p-1.5 align-top font-bold text-center bg-slate-50 border-r border-slate-300">8.</td>
                      <td className="p-1.5 align-top font-semibold bg-slate-50 border-r border-slate-300">Hasil Evaluasi Kelulusan</td>
                      <td className="p-1.5 align-top">
                        : Dinyatakan Lulus <strong>{stats.lulus}</strong> orang ({stats.total > 0 ? Math.round((stats.lulus / stats.total) * 100) : 0}%), Revisi <strong>{stats.revisi}</strong> orang ({stats.total > 0 ? Math.round((stats.revisi / stats.total) * 100) : 0}%), Rata-rata Nilai: <strong>{stats.avg}</strong> (KKM: 70,00)
                      </td>
                    </tr>
                  </tbody>
                </table>

                {/* CATATAN PELAKSANAAN & KEJADIAN KHUSUS */}
                <div className="my-3">
                  <p className="font-bold text-[11px] mb-1">Catatan Pelaksanaan & Kejadian Khusus Selama Sidang:</p>
                  <div className="p-3 bg-slate-50/80 border border-slate-300 rounded text-[10.5px] leading-relaxed italic text-slate-800">
                    {beritaAcaraConfig.catatanPelaksanaan}
                  </div>
                </div>

                {/* KLAUSUL PENUTUP */}
                <p className="my-3 text-[11px] leading-relaxed text-slate-900">
                  Demikian Berita Acara pelaksanaan Sidang Praktik Kerja Lapangan (PKL) ini dibuat dengan sebenarnya dalam rangkap secukupnya untuk dapat dipergunakan sebagaimana mestinya.
                </p>

                {/* TANDA TANGAN RESMI 2-TIER (DENGAN ENGINE SIGNATURE DIGITAL INTERAKTIF) */}
                <div className="space-y-4 pt-3 break-inside-avoid">
                  {/* Baris 1: Kiri (Kaprog) & Kanan (Guru Penguji + Titimangsa) */}
                  <div className="flex items-start justify-between w-full text-[11px]">
                    <div className="w-[80mm] text-left">
                      <div>
                        <p className="font-semibold text-slate-700">Mengetahui,</p>
                        <p className="font-bold uppercase tracking-tight">
                          Ketua Program Keahlian
                        </p>
                        <p className="text-[10px] text-slate-600 font-medium">
                          {displayJurusanTitle}
                        </p>
                      </div>
                      {renderSignatureBox('KAPROG', 'Ketua Program Keahlian', 'left', 22)}
                      <div>
                        <p className="font-bold underline uppercase text-slate-900">
                          {customSigners.kaprog.nama}
                        </p>
                        <p className="text-[10px] text-slate-600 font-mono">
                          NIP. {customSigners.kaprog.nip || '-'}
                        </p>
                      </div>
                    </div>

                    <div className="w-[80mm] text-right">
                      <div>
                        <p className="text-slate-700">
                          {titimangsaCity}, {currentDateFormatted}
                        </p>
                        <p className="font-bold uppercase tracking-tight">
                          Guru Penguji Sidang PKL
                        </p>
                      </div>
                      {renderSignatureBox('PENGUJI', 'Guru Penguji Sidang PKL', 'right', 22)}
                      <div>
                        <p className="font-bold underline uppercase text-slate-900">
                          {customSigners.penguji.nama}
                        </p>
                        <p className="text-[10px] text-slate-600 font-mono">
                          NIP. {customSigners.penguji.nip || '-'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Baris 2: Tengah Bawah (Wakil Kepala Sekolah Bidang Hubin) */}
                  <div className="flex flex-col items-center justify-center text-center w-full pt-1">
                    <div className="w-[90mm]">
                      <div>
                        <p className="font-semibold text-slate-700">Mengetahui / Menyetujui,</p>
                        <p className="font-bold uppercase tracking-tight">
                          Wakil Kepala Sekolah Bidang Hubungan Industri
                        </p>
                      </div>
                      {renderSignatureBox('WAKA_HUBIN', 'Wakil Kepala Sekolah Bidang Hubin', 'center', 22)}
                      <div>
                        <p className="font-bold underline uppercase text-slate-900">
                          {customSigners.wakaHubin.nama}
                        </p>
                        <p className="text-[10px] text-slate-600 font-mono">
                          NIP. {customSigners.wakaHubin.nip || '-'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </PrintDocumentSheet>

              {/* LEMBAR 2: LAMPIRAN DAFTAR PESERTA & NILAI SIDANG (JIKA DIAKTIFKAN) */}
              {beritaAcaraConfig.includeLampiran && (
                <PrintDocumentSheet
                  orientation="portrait"
                  pageNumber={2}
                  totalPages={2}
                  footerText={`Lampiran Berita Acara Sidang PKL — ${displayJurusanTitle}`}
                  className="p-8 text-black bg-white"
                >
                  <div className="text-center mb-3 space-y-0.5">
                    <h3 className="text-xs font-bold uppercase tracking-wider underline">
                      LAMPIRAN BERITA ACARA SIDANG PKL
                    </h3>
                    <p className="text-[11px] font-bold text-slate-800">
                      DAFTAR PESERTA & HASIL EVALUASI NILAI SIDANG
                    </p>
                    <p className="text-[10px] text-slate-600 font-mono">
                      Program Keahlian: {displayJurusanTitle} &bull; Penguji: {selectedPengujiFilter !== 'ALL' ? selectedPengujiFilter : 'Semua Guru Penguji'}
                    </p>
                  </div>

                  {/* Tabel Daftar Peserta & Nilai Ringkas */}
                  <table className="w-full text-[9.5px] border-collapse border border-black mb-4">
                    <thead>
                      <tr className="bg-slate-100 text-center font-bold">
                        <th className="border border-black px-1 py-1.5 w-6">No</th>
                        <th className="border border-black px-1.5 py-1.5 w-20">NIS / NISN</th>
                        <th className="border border-black px-2 py-1.5 text-left">Nama Lengkap Siswa</th>
                        <th className="border border-black px-1 py-1.5 w-14">Kelas</th>
                        <th className="border border-black px-2 py-1.5 text-left">Tempat PKL (DUDI)</th>
                        <th className="border border-black px-1 py-1.5 w-12 bg-indigo-50/80">Nilai</th>
                        <th className="border border-black px-1 py-1.5 w-14">Status</th>
                        <th className="border border-black px-2 py-1.5 text-left min-w-[100px]">Catatan Penguji</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredScores.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="border border-black p-4 text-center italic text-slate-500">
                            Tidak ada data peserta sidang.
                          </td>
                        </tr>
                      ) : (
                        filteredScores.map((row, idx) => {
                          const hasScore = row.nilai_sidang !== null && row.nilai_sidang !== undefined && row.nilai_sidang !== '';
                          const isLulus = hasScore && Number(row.nilai_sidang) >= 70;
                          return (
                            <tr key={row.siswa_pkl_id || idx} className="h-6">
                              <td className="border border-black px-1 py-0.5 text-center font-mono">{idx + 1}</td>
                              <td className="border border-black px-1.5 py-0.5 font-mono text-center">{row.nis || '-'}</td>
                              <td className="border border-black px-2 py-0.5 font-semibold truncate max-w-[150px]">{row.nama_siswa}</td>
                              <td className="border border-black px-1 py-0.5 text-center">{row.nama_kelas || '-'}</td>
                              <td className="border border-black px-2 py-0.5 text-slate-800 truncate max-w-[140px]">{row.mitra_nama || '-'}</td>
                              <td className="border border-black px-1 py-0.5 text-center font-mono font-bold bg-indigo-50/40">
                                {row.nilai_sidang ?? '-'}
                              </td>
                              <td className="border border-black px-1 py-0.5 text-center font-bold text-[8.5px]">
                                {!hasScore ? (
                                  <span className="text-slate-400">Belum</span>
                                ) : isLulus ? (
                                  <span className="text-emerald-700">LULUS</span>
                                ) : (
                                  <span className="text-amber-700">REVISI</span>
                                )}
                              </td>
                              <td className="border border-black px-2 py-0.5 text-[8.5px] italic text-slate-700 truncate max-w-[140px]">
                                {row.catatan_sidang || '-'}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>

                  {/* Pengesahan Penguji di Kanan Bawah Lampiran */}
                  <div className="flex justify-end pt-2 break-inside-avoid">
                    <div className="w-[75mm] text-right text-[10.5px]">
                      <div>
                        <p className="text-slate-700">{titimangsaCity}, {currentDateFormatted}</p>
                        <p className="font-bold uppercase tracking-tight">Guru Penguji Sidang PKL</p>
                      </div>
                      {renderSignatureBox('PENGUJI', 'Guru Penguji Sidang PKL', 'right', 20)}
                      <div>
                        <p className="font-bold underline uppercase text-slate-900">{customSigners.penguji.nama}</p>
                        <p className="text-[10px] text-slate-600 font-mono">NIP. {customSigners.penguji.nip || '-'}</p>
                      </div>
                    </div>
                  </div>
                </PrintDocumentSheet>
              )}
            </>
          ) : (
            /* ========================================================================= */
            /* DOKUMEN 2: FORMAT LANDSCAPE (REKAP NILAI 4 ASPEK & DAFTAR HADIR)           */
            /* ========================================================================= */
            <PrintDocumentSheet orientation="landscape" className="p-8 text-black bg-white">
              {/* KOP RESMI SEKOLAH */}
              <PrintHeader
                variant="landscape"
                tenantInfo={tenantInfo}
                showLogoDaerah={true}
                showLogoSekolah={true}
                showDivider={true}
                className="mb-3"
              />

              {/* JUDUL DOKUMEN & SUB-METADATA */}
              <div className="text-center my-3 space-y-1">
                <h1 className="text-sm font-bold tracking-wide uppercase underline">
                  {documentTitle}
                </h1>
                <p className="text-xs font-semibold text-slate-700">
                  Tahun Ajaran {selectedTpNama || '-'} {selectedSemesterNama ? `• Semester ${selectedSemesterNama}` : ''}
                </p>
              </div>

              {/* METADATA INFO TABLE */}
              <div className="grid grid-cols-2 gap-4 text-[11px] mb-3 border-b border-black/20 pb-2">
                <div className="space-y-1">
                  <div className="flex">
                    <span className="w-36 font-semibold">Program Keahlian</span>
                    <span className="w-3">:</span>
                    <span className="font-bold uppercase tracking-tight text-slate-900">
                      {displayJurusanTitle}
                    </span>
                  </div>
                  {(docType === 'REKAP_PENGUJI' || docType === 'DAFTAR_HADIR') && (
                    <div className="flex">
                      <span className="w-36 font-semibold">Guru Penguji</span>
                      <span className="w-3">:</span>
                      <span className="font-bold">
                        {selectedPengujiFilter !== 'ALL' ? selectedPengujiFilter : 'Semua Guru Penguji'}
                      </span>
                    </div>
                  )}
                  {selectedKelasFilter !== 'ALL' && (
                    <div className="flex">
                      <span className="w-36 font-semibold">Rombel / Kelas</span>
                      <span className="w-3">:</span>
                      <span>{selectedKelasFilter}</span>
                    </div>
                  )}
                </div>

                <div className="space-y-1 text-right">
                  <div className="flex justify-end gap-1">
                    <span className="font-semibold">Jumlah Peserta Terdata:</span>
                    <span className="font-bold font-mono">{stats.total} Siswa</span>
                  </div>
                  {docType === 'DAFTAR_HADIR' ? (
                    <div className="flex justify-end gap-3 text-[10px]">
                      <span className="text-emerald-700 font-bold">Sudah TTD Digital: {stats.sudahTtd}</span>
                      <span className="text-slate-500 font-medium">Belum TTD: {stats.belumTtd}</span>
                    </div>
                  ) : (
                    <div className="flex justify-end gap-3 text-[10px]">
                      <span className="text-emerald-700 font-bold">Lulus: {stats.lulus}</span>
                      <span className="text-amber-700 font-bold">Revisi: {stats.revisi}</span>
                      <span className="text-slate-500 font-medium">Belum Diuji: {stats.belum}</span>
                      <span className="text-indigo-700 font-bold font-mono">Rata-rata: {stats.avg}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* TABEL DATA: PRESENSI ATAU NILAI 4 ASPEK */}
              {docType === 'DAFTAR_HADIR' ? (
                <table className="w-full text-[10px] border-collapse border border-black mb-4">
                  <thead>
                    <tr className="bg-slate-100 text-center font-bold">
                      <th className="border border-black px-1.5 py-2 w-8">No</th>
                      <th className="border border-black px-2 py-2 w-24">NIS / NISN</th>
                      <th className="border border-black px-2 py-2 text-left min-w-[150px]">Nama Lengkap Siswa</th>
                      <th className="border border-black px-1.5 py-2 w-16">Kelas</th>
                      <th className="border border-black px-2 py-2 text-left min-w-[140px]">Tempat PKL (DUDI)</th>
                      <th className="border border-black px-2 py-2 text-left w-36">Guru Penguji</th>
                      <th className="border border-black px-2 py-2 text-center w-56">Tanda Tangan Kehadiran</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredScores.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="border border-black p-4 text-center italic text-slate-500">
                          Tidak ada data peserta sidang yang memenuhi kriteria filter.
                        </td>
                      </tr>
                    ) : (
                      filteredScores.map((row, idx) => {
                        const rowNum = idx + 1;
                        const isOdd = rowNum % 2 !== 0;

                        return (
                          <tr key={row.siswa_pkl_id || idx} className="h-10 hover:bg-slate-50/50">
                            <td className="border border-black px-1 py-1 text-center font-mono align-middle">{rowNum}</td>
                            <td className="border border-black px-1.5 py-1 font-mono text-center align-middle">{row.nis || '-'}</td>
                            <td className="border border-black px-2 py-1 font-semibold align-middle">{row.nama_siswa}</td>
                            <td className="border border-black px-1.5 py-1 text-center align-middle">{row.nama_kelas || '-'}</td>
                            <td className="border border-black px-2 py-1 text-slate-800 align-middle truncate max-w-[150px]">
                              {row.mitra_nama || '-'}
                            </td>
                            <td className="border border-black px-2 py-1 text-slate-800 align-middle truncate max-w-[140px]">
                              {row.penguji_nama || '-'}
                            </td>
                            <td className="border border-black px-2 py-1 align-middle">
                              <div className="flex items-center h-full">
                                <div className={cn("w-full flex items-center", isOdd ? "justify-start pl-1" : "justify-end pr-1")}>
                                  <div className="flex items-center gap-1.5 min-w-[110px]">
                                    <span className="font-mono font-bold text-[10px] text-slate-700">{rowNum}.</span>
                                    {row.ttd_siswa ? (
                                      <div className="flex flex-col items-start leading-none">
                                        <img
                                          src={resolveProfilePhotoUrl(row.ttd_siswa)}
                                          alt={`TTD ${row.nama_siswa}`}
                                          className="h-8 max-w-[90px] object-contain filter contrast-125"
                                        />
                                        {row.waktu_ttd_siswa && (
                                          <span className="text-[7px] text-slate-400 font-mono scale-90 -mt-0.5">
                                            {new Date(row.waktu_ttd_siswa).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                                          </span>
                                        )}
                                      </div>
                                    ) : (
                                      <span className="text-slate-400 font-mono tracking-wider text-[11px] select-none">
                                        ..............................
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              ) : (
                <table className="w-full text-[10px] border-collapse border border-black mb-4">
                  <thead>
                    <tr className="bg-slate-100 text-center font-bold">
                      <th rowSpan={2} className="border border-black px-1.5 py-1.5 w-7">No</th>
                      <th rowSpan={2} className="border border-black px-2 py-1.5 w-20">NIS / NISN</th>
                      <th rowSpan={2} className="border border-black px-2 py-1.5 text-left min-w-[130px]">Nama Lengkap Siswa</th>
                      <th rowSpan={2} className="border border-black px-1.5 py-1.5 w-16">Kelas</th>
                      {docType === 'REKAP_JURUSAN' && (
                        <th rowSpan={2} className="border border-black px-2 py-1.5 text-left w-28">Guru Penguji</th>
                      )}
                      <th colSpan={4} className="border border-black px-1 py-1">
                        Komponen Penilaian Aspek Sidang PKL
                      </th>
                      <th rowSpan={2} className="border border-black px-1.5 py-1.5 w-12 bg-indigo-50/80">
                        Nilai Sidang
                      </th>
                      <th rowSpan={2} className="border border-black px-1.5 py-1.5 w-14">Status</th>
                      <th rowSpan={2} className="border border-black px-2 py-1.5 text-left min-w-[110px]">
                        Catatan Penguji / Revisi
                      </th>
                    </tr>
                    <tr className="bg-slate-50 text-center font-semibold text-[9px]">
                      <th className="border border-black px-1 py-1 w-12" title="Penguasaan Materi & Problem Solving">
                        Materi<br/>(40%)
                      </th>
                      <th className="border border-black px-1 py-1 w-12" title="Penyampaian & Komunikasi Lisan">
                        Komunikasi<br/>(25%)
                      </th>
                      <th className="border border-black px-1 py-1 w-12" title="Kualitas Laporan & Media Paparan">
                        Portofolio<br/>(20%)
                      </th>
                      <th className="border border-black px-1 py-1 w-12" title="Etika, Sikap & Karakter Kerja">
                        Sikap<br/>(15%)
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredScores.length === 0 ? (
                      <tr>
                        <td colSpan={docType === 'REKAP_JURUSAN' ? 11 : 10} className="border border-black p-4 text-center italic text-slate-500">
                          Tidak ada data sidang siswa yang memenuhi kriteria filter.
                        </td>
                      </tr>
                    ) : (
                      filteredScores.map((row, idx) => {
                        const hasExamined = row.nilai_sidang !== null && row.nilai_sidang !== undefined && row.nilai_sidang !== '';
                        const isLulus = hasExamined && Number(row.nilai_sidang) >= 70;

                        return (
                          <tr key={row.siswa_pkl_id || idx} className="hover:bg-slate-50/50">
                            <td className="border border-black px-1 py-1 text-center font-mono">{idx + 1}</td>
                            <td className="border border-black px-1.5 py-1 font-mono text-center">{row.nis || '-'}</td>
                            <td className="border border-black px-2 py-1 font-semibold">{row.nama_siswa}</td>
                            <td className="border border-black px-1.5 py-1 text-center">{row.nama_kelas || '-'}</td>
                            {docType === 'REKAP_JURUSAN' && (
                              <td className="border border-black px-2 py-1 truncate max-w-[110px]">{row.penguji_nama || '-'}</td>
                            )}
                            <td className="border border-black px-1 py-1 text-center font-mono">
                              {row.sidang_materi ?? '-'}
                            </td>
                            <td className="border border-black px-1 py-1 text-center font-mono">
                              {row.sidang_komunikasi ?? '-'}
                            </td>
                            <td className="border border-black px-1 py-1 text-center font-mono">
                              {row.sidang_portofolio ?? '-'}
                            </td>
                            <td className="border border-black px-1 py-1 text-center font-mono">
                              {row.sidang_sikap ?? '-'}
                            </td>
                            <td className="border border-black px-1 py-1 text-center font-mono font-bold bg-indigo-50/40">
                              {row.nilai_sidang ?? '-'}
                            </td>
                            <td className="border border-black px-1 py-1 text-center font-bold text-[9px]">
                              {!hasExamined ? (
                                <span className="text-slate-400">Belum</span>
                              ) : isLulus ? (
                                <span className="text-emerald-700">LULUS</span>
                              ) : (
                                <span className="text-amber-700">REVISI</span>
                              )}
                            </td>
                            <td className="border border-black px-2 py-1 text-[9px] italic text-slate-700">
                              {row.catatan_sidang || '-'}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              )}

              {/* CATATAN & KETERANGAN DOKUMEN */}
              {docType === 'DAFTAR_HADIR' ? (
                <div className="text-[9px] text-slate-600 mb-6 space-y-0.5">
                  <p className="font-semibold">* Dokumen ini merupakan bukti presensi resmi pelaksanaan Ujian Sidang Praktik Kerja Lapangan (PKL).</p>
                  <p>* Kehadiran dan tanda tangan digital terverifikasi secara elektronik melalui modul digitalisasi Absenta Hubin.</p>
                </div>
              ) : (
                <div className="text-[9px] text-slate-600 mb-6 space-y-0.5">
                  <p className="font-semibold">* Kriteria Ketuntasan Minimal (KKM) Sidang PKL: 70,00.</p>
                  <p>* Siswa dengan status REVISI wajib menyelesaikan perbaikan laporan/portofolio paling lambat 7 hari kerja setelah tanggal ujian sidang.</p>
                </div>
              )}

              {/* TANDA TANGAN RESMI 2-TIER */}
              <div className="space-y-6 pt-3 break-inside-avoid">
                {docType === 'REKAP_PENGUJI' || docType === 'DAFTAR_HADIR' ? (
                  <>
                    <div className="flex items-start justify-between w-full text-[11px]">
                      <div className="w-[85mm] text-left">
                        <div>
                          <p className="font-semibold text-slate-700">Mengetahui,</p>
                          <p className="font-bold uppercase tracking-tight">
                            Ketua Program Keahlian
                          </p>
                          <p className="text-[10px] text-slate-600 font-medium">
                            {displayJurusanTitle}
                          </p>
                        </div>
                        {renderSignatureBox('KAPROG', 'Ketua Program Keahlian', 'left', 22)}
                        <div>
                          <p className="font-bold underline uppercase text-slate-900">
                            {customSigners.kaprog.nama}
                          </p>
                          <p className="text-[10px] text-slate-600 font-mono">
                            NIP. {customSigners.kaprog.nip || '-'}
                          </p>
                        </div>
                      </div>

                      <div className="w-[85mm] text-right">
                        <div>
                          <p className="text-slate-700">
                            {titimangsaCity}, {currentDateFormatted}
                          </p>
                          <p className="font-bold uppercase tracking-tight">
                            Guru Penguji Sidang PKL
                          </p>
                        </div>
                        {renderSignatureBox('PENGUJI', 'Guru Penguji Sidang PKL', 'right', 22)}
                        <div>
                          <p className="font-bold underline uppercase text-slate-900">
                            {customSigners.penguji.nama}
                          </p>
                          <p className="text-[10px] text-slate-600 font-mono">
                            NIP. {customSigners.penguji.nip || '-'}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-center justify-center text-center w-full pt-1">
                      <div className="w-[95mm]">
                        <div>
                          <p className="font-semibold text-slate-700">Mengetahui / Menyetujui,</p>
                          <p className="font-bold uppercase tracking-tight">
                            Wakil Kepala Sekolah Bidang Hubungan Industri
                          </p>
                        </div>
                        {renderSignatureBox('WAKA_HUBIN', 'Wakil Kepala Sekolah Bidang Hubin', 'center', 22)}
                        <div>
                          <p className="font-bold underline uppercase text-slate-900">
                            {customSigners.wakaHubin.nama}
                          </p>
                          <p className="text-[10px] text-slate-600 font-mono">
                            NIP. {customSigners.wakaHubin.nip || '-'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-start justify-between w-full text-[11px]">
                      <div className="w-[85mm] text-left space-y-12">
                        <div>
                          <p className="font-semibold text-slate-700">Mengetahui,</p>
                          <p className="font-bold uppercase tracking-tight">
                            Wakil Kepala Sekolah Bidang Hubungan Industri
                          </p>
                        </div>
                        <div>
                          <p className="font-bold underline uppercase text-slate-900">
                            {customSigners.wakaHubin.nama}
                          </p>
                          <p className="text-[10px] text-slate-600 font-mono">
                            NIP. {customSigners.wakaHubin.nip || '-'}
                          </p>
                        </div>
                      </div>

                      <div className="w-[85mm] text-right space-y-12">
                        <div>
                          <p className="text-slate-700">
                            {titimangsaCity}, {currentDateFormatted}
                          </p>
                          <p className="font-bold uppercase tracking-tight">
                            Ketua Program Keahlian
                          </p>
                          <p className="text-[10px] text-slate-600 font-medium">
                            {displayJurusanTitle}
                          </p>
                        </div>
                        <div>
                          <p className="font-bold underline uppercase text-slate-900">
                            {customSigners.kaprog.nama}
                          </p>
                          <p className="text-[10px] text-slate-600 font-mono">
                            NIP. {customSigners.kaprog.nip || '-'}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-center justify-center text-center w-full pt-1">
                      <div className="w-[95mm] space-y-12">
                        <div>
                          <p className="font-semibold text-slate-700">Mengetahui / Menyetujui,</p>
                          <p className="font-bold uppercase tracking-tight">
                            Kepala Sekolah
                          </p>
                        </div>
                        <div>
                          <p className="font-bold underline uppercase text-slate-900">
                            {customSigners.kepsek.nama}
                          </p>
                          <p className="text-[10px] text-slate-600 font-mono">
                            NIP. {customSigners.kepsek.nip || '-'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </PrintDocumentSheet>
          )}
        </div>
      </UniversalDocumentModal>

      {/* ========================================================================= */}
      {/* MODAL 1: FORM PENGATURAN NASKAH BERITA ACARA SIDANG PKL                   */}
      {/* ========================================================================= */}
      {showEditBeritaAcara && (
        <Modal
          isOpen={showEditBeritaAcara}
          onClose={() => setShowEditBeritaAcara(false)}
          title="Pengaturan Naskah Berita Acara Sidang PKL"
          size="md"
          zIndex={200}
        >
          <div className="p-6 space-y-4">
            <p className="text-xs text-slate-500">
              Sesuaikan nomor surat, jadwal, lokasi, dan catatan kejadian khusus untuk naskah Berita Acara resmi.
            </p>

            <div className="space-y-3">
              <div>
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Nomor Surat Berita Acara
                </Label>
                <Input
                  value={beritaAcaraConfig.nomorSurat}
                  onChange={(e) =>
                    setBeritaAcaraConfig((prev) => ({ ...prev, nomorSurat: e.target.value }))
                  }
                  className="h-8 text-xs mt-1"
                  placeholder="Contoh: 421.5 / 042 / Hubin-PKL / 2026"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Hari & Tanggal Sidang
                  </Label>
                  <Input
                    value={beritaAcaraConfig.hariTanggal}
                    onChange={(e) =>
                      setBeritaAcaraConfig((prev) => ({ ...prev, hariTanggal: e.target.value }))
                    }
                    className="h-8 text-xs mt-1"
                    placeholder="Contoh: Senin, 17 November 2026"
                  />
                </div>
                <div>
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Waktu / Sesi Pelaksanaan
                  </Label>
                  <Input
                    value={beritaAcaraConfig.waktuSidang}
                    onChange={(e) =>
                      setBeritaAcaraConfig((prev) => ({ ...prev, waktuSidang: e.target.value }))
                    }
                    className="h-8 text-xs mt-1"
                    placeholder="Contoh: 08.00 s.d 15.30 WIB"
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Ruang / Tempat Ujian
                </Label>
                <Input
                  value={beritaAcaraConfig.ruangSidang}
                  onChange={(e) =>
                    setBeritaAcaraConfig((prev) => ({ ...prev, ruangSidang: e.target.value }))
                  }
                  className="h-8 text-xs mt-1"
                  placeholder="Contoh: Ruang Sidang Hubin / Lab Komputer"
                />
              </div>

              <div>
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Catatan Pelaksanaan & Kejadian Khusus
                </Label>
                <textarea
                  value={beritaAcaraConfig.catatanPelaksanaan}
                  onChange={(e) =>
                    setBeritaAcaraConfig((prev) => ({ ...prev, catatanPelaksanaan: e.target.value }))
                  }
                  rows={3}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 mt-1"
                  placeholder="Catatan pelaksanaan sidang..."
                />
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={beritaAcaraConfig.includeLampiran}
                    onChange={(e) =>
                      setBeritaAcaraConfig((prev) => ({ ...prev, includeLampiran: e.target.checked }))
                    }
                    className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                  />
                  <span>Sertakan Lembar Lampiran (Daftar Peserta & Nilai Ujian Sidang PKL)</span>
                </label>
              </div>
            </div>

            <div className="flex justify-end pt-3">
              <Button
                type="button"
                variant="primary"
                onClick={() => {
                  setShowEditBeritaAcara(false);
                  toast.success('Pengaturan Berita Acara berhasil diperbarui.');
                }}
              >
                Simpan & Terapkan
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: EDIT PENANDATANGAN (PLT / PENGGANTI)                              */}
      {/* ========================================================================= */}
      {showEditSigners && (
        <Modal
          isOpen={showEditSigners}
          onClose={() => setShowEditSigners(false)}
          title="Sesuaikan Pejabat Penandatangan"
          size="md"
          zIndex={200}
        >
          <div className="p-6 space-y-5">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <p className="text-xs text-slate-500">
                Gunakan formulir ini untuk mengubah nama atau NIP penandatangan sementara jika ada Plt/Pengganti.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleResetSigners}
                className="text-xs gap-1 h-7 text-indigo-600"
              >
                <RotateCcw className="w-3 h-3" />
                Reset Sistem
              </Button>
            </div>

            {/* Form Kaprog */}
            <div className="space-y-3 bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-lg border border-slate-200 dark:border-slate-700">
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Ketua Program Keahlian ({displayJurusanTitle})
              </Label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[10px] text-slate-500">Nama Lengkap & Gelar</span>
                  <Input
                    value={customSigners.kaprog.nama}
                    onChange={(e) =>
                      setCustomSigners((prev) => ({
                        ...prev,
                        kaprog: { ...prev.kaprog, nama: e.target.value },
                      }))
                    }
                    className="h-8 text-xs"
                    placeholder="Nama Kaprog..."
                  />
                </div>
                <div>
                  <span className="text-[10px] text-slate-500">NIP / NUPTK</span>
                  <Input
                    value={customSigners.kaprog.nip}
                    onChange={(e) =>
                      setCustomSigners((prev) => ({
                        ...prev,
                        kaprog: { ...prev.kaprog, nip: e.target.value },
                      }))
                    }
                    className="h-8 text-xs"
                    placeholder="NIP Kaprog..."
                  />
                </div>
              </div>
              <DigitalSignatureField
                label="Tanda Tangan Digital Kaprog"
                penName={customSigners.kaprog.nama}
                value={signatureKaprog}
                onChange={(val) => handleSaveSignature('KAPROG', val)}
              />
            </div>

            {/* Form Guru Penguji */}
            {(docType === 'BERITA_ACARA' || docType === 'REKAP_PENGUJI' || docType === 'DAFTAR_HADIR') && (
              <div className="space-y-3 bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-lg border border-slate-200 dark:border-slate-700">
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Guru Penguji Sidang PKL
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-[10px] text-slate-500">Nama Penguji</span>
                    <Input
                      value={customSigners.penguji.nama}
                      onChange={(e) =>
                        setCustomSigners((prev) => ({
                          ...prev,
                          penguji: { ...prev.penguji, nama: e.target.value },
                        }))
                      }
                      className="h-8 text-xs"
                      placeholder="Nama Penguji..."
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500">NIP Penguji</span>
                    <Input
                      value={customSigners.penguji.nip}
                      onChange={(e) =>
                        setCustomSigners((prev) => ({
                          ...prev,
                          penguji: { ...prev.penguji, nip: e.target.value },
                        }))
                      }
                      className="h-8 text-xs"
                      placeholder="NIP Penguji..."
                    />
                  </div>
                </div>
                <DigitalSignatureField
                  label="Tanda Tangan Digital Guru Penguji"
                  penName={customSigners.penguji.nama}
                  value={signaturePenguji}
                  onChange={(val) => handleSaveSignature('PENGUJI', val)}
                />
              </div>
            )}

            {/* Form Waka Hubin */}
            <div className="space-y-3 bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-lg border border-slate-200 dark:border-slate-700">
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Wakil Kepala Sekolah Bidang Hubin
              </Label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[10px] text-slate-500">Nama Waka Hubin</span>
                  <Input
                    value={customSigners.wakaHubin.nama}
                    onChange={(e) =>
                      setCustomSigners((prev) => ({
                        ...prev,
                        wakaHubin: { ...prev.wakaHubin, nama: e.target.value },
                      }))
                    }
                    className="h-8 text-xs"
                    placeholder="Nama Waka Hubin..."
                  />
                </div>
                <div>
                  <span className="text-[10px] text-slate-500">NIP Waka Hubin</span>
                  <Input
                    value={customSigners.wakaHubin.nip}
                    onChange={(e) =>
                      setCustomSigners((prev) => ({
                        ...prev,
                        wakaHubin: { ...prev.wakaHubin, nip: e.target.value },
                      }))
                    }
                    className="h-8 text-xs"
                    placeholder="NIP Waka Hubin..."
                  />
                </div>
              </div>
              <DigitalSignatureField
                label="Tanda Tangan Digital Waka Hubin"
                penName={customSigners.wakaHubin.nama}
                value={signatureWakaHubin}
                onChange={(val) => handleSaveSignature('WAKA_HUBIN', val)}
              />
            </div>

            {/* Form Kepala Sekolah */}
            {docType === 'REKAP_JURUSAN' && (
              <div className="space-y-3 bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-lg border border-slate-200 dark:border-slate-700">
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Kepala Sekolah
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-[10px] text-slate-500">Nama Kepala Sekolah</span>
                    <Input
                      value={customSigners.kepsek.nama}
                      onChange={(e) =>
                        setCustomSigners((prev) => ({
                          ...prev,
                          kepsek: { ...prev.kepsek, nama: e.target.value },
                        }))
                      }
                      className="h-8 text-xs"
                      placeholder="Nama Kepala Sekolah..."
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500">NIP Kepala Sekolah</span>
                    <Input
                      value={customSigners.kepsek.nip}
                      onChange={(e) =>
                        setCustomSigners((prev) => ({
                          ...prev,
                          kepsek: { ...prev.kepsek, nip: e.target.value },
                        }))
                      }
                      className="h-8 text-xs"
                      placeholder="NIP Kepala Sekolah..."
                    />
                  </div>
                </div>
                <DigitalSignatureField
                  label="Tanda Tangan Digital Kepala Sekolah"
                  penName={customSigners.kepsek.nama}
                  value={signatureKepsek}
                  onChange={(val) => handleSaveSignature('KEPSEK', val)}
                />
              </div>
            )}

            <div className="flex justify-end pt-2">
              <Button
                type="button"
                variant="primary"
                onClick={() => {
                  setShowEditSigners(false);
                  toast.success('Data penandatangan dan tanda tangan digital berhasil diterapkan.');
                }}
              >
                Terapkan Perubahan
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: PAD TANDA TANGAN DIGITAL INTERAKTIF (CANVAS + UPLOAD ALTERNATIF)  */}
      {/* ========================================================================= */}
      {activeSigningTarget && (
        <DigitalSignaturePadModal
          isOpen={Boolean(activeSigningTarget)}
          onClose={() => setActiveSigningTarget(null)}
          title={`Tanda Tangan Digital • ${
            activeSigningTarget === 'PENGUJI'
              ? 'Guru Penguji Sidang PKL'
              : activeSigningTarget === 'KAPROG'
              ? 'Ketua Program Keahlian'
              : activeSigningTarget === 'WAKA_HUBIN'
              ? 'Wakasek Bidang Hubin'
              : 'Kepala Sekolah'
          }`}
          subtitle={
            activeSigningTarget === 'PENGUJI'
              ? customSigners.penguji.nama
              : activeSigningTarget === 'KAPROG'
              ? customSigners.kaprog.nama
              : activeSigningTarget === 'WAKA_HUBIN'
              ? customSigners.wakaHubin.nama
              : customSigners.kepsek.nama
          }
          penName={
            activeSigningTarget === 'PENGUJI'
              ? customSigners.penguji.nama
              : activeSigningTarget === 'KAPROG'
              ? customSigners.kaprog.nama
              : activeSigningTarget === 'WAKA_HUBIN'
              ? customSigners.wakaHubin.nama
              : customSigners.kepsek.nama
          }
          initialSignature={
            activeSigningTarget === 'PENGUJI'
              ? signaturePenguji
              : activeSigningTarget === 'KAPROG'
              ? signatureKaprog
              : activeSigningTarget === 'WAKA_HUBIN'
              ? signatureWakaHubin
              : signatureKepsek
          }
          allowUploadAlternative={true}
          onSave={(base64) => {
            handleSaveSignature(activeSigningTarget, base64);
            setActiveSigningTarget(null);
          }}
        />
      )}
    </>
  );
};

export default PklSidangCetakModal;
