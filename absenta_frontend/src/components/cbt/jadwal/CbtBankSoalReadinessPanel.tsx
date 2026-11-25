import React, { useState, useMemo, useEffect } from 'react';
import {
  Search,
  ArrowRight,
  Plus,
  Copy,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  LayoutGrid,
  Check,
  MessageSquare,
} from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { CbtBankSoal, CbtEventItem } from '@/types/cbt.types';
import type { GuruMapel } from '@/types/academic';
import { cbtApi, cbtQueryKeys } from '@/api/cbt.api';
import { useJenjang } from '@/hooks/useJenjang';
import { formatTingkatRomawi } from '../bank-soal/cbtAsesmenHelper';
import {
  evaluateTeacherDutiesSSOT,
  isNonAcademicMapel,
  resolveStrictBankTingkat,
  resolveStrictTingkat,
} from '../bank-soal/cbtDutyEngine';
import { cn } from '@/lib/utils';
import { CbtBankSoalFormModal } from '../bank-soal/CbtBankSoalFormModal';
import { CbtBankSoalDetailModal } from '../bank-soal/CbtBankSoalDetailModal';
import { listGuruMapel } from '@/api/kurikulum/guru-mapel.api';
import { useGuruOptions } from '@/hooks/useGuruOptions';
import { useAuthStore } from '@/store/authStore';
import { Button, UniversalSendWaModal } from '@/components/ui';
import {
  AuditedTargetItem,
  MapelPaketTeoriItem,
  getAllMgmpSharedMap,
  getNudgeHistory,
  recordNudge,
  syncNudgeHistoryFromServer,
} from './cbtMgmpHelper';
import { CbtReadinessTeacherTable } from './CbtReadinessTeacherTable';
import { CbtReadinessPaketTable } from './CbtReadinessPaketTable';
import { buildClassSubjectMatrix, MatrixCellData } from './cbtClassSubjectMatrixHelper';
import { CbtClassSubjectMatrixTable } from './CbtClassSubjectMatrixTable';
import toast from 'react-hot-toast';

interface CbtBankSoalReadinessPanelProps {
  topFlightDeck?: React.ReactNode;
  bankList: CbtBankSoal[];
  activeTpId?: string;
  activeSemId?: string;
  targetTingkat?: number[];
  eventName?: string;
  activeEvent?: CbtEventItem | null;
  onProceedToNextPhase?: () => void;
  onRefreshBankList?: () => void;
}

export type ViewTabMode = 'BELUM' | 'SUDAH' | 'PAKET_MAPEL' | 'MATRIKS';

export const CbtBankSoalReadinessPanel: React.FC<CbtBankSoalReadinessPanelProps> = ({
  topFlightDeck,
  bankList,
  activeTpId,
  activeSemId,
  targetTingkat,
  eventName,
  activeEvent,
  onProceedToNextPhase,
  onRefreshBankList,
}) => {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const tenantId = user?.tenant_id || 'default';
  const schoolName = (user as any)?.tenant?.nama_sekolah || (user as any)?.tenant?.nama || '';
  const { tingkatList } = useJenjang();

  const [activeTab, setActiveTab] = useState<ViewTabMode>('BELUM');
  const [filterTingkat, setFilterTingkat] = useState<number | 'ALL'>(() => {
    if (targetTingkat && targetTingkat.length === 1) return targetTingkat[0];
    return 'ALL';
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [nudgeTick, setNudgeTick] = useState<number>(Date.now());
  const [copied, setCopied] = useState(false);

  // ── 0. Sinkronisasi Riwayat Colek WhatsApp Multi-Device (Server DB) ──
  const { data: serverNudgeHistory } = useQuery({
    queryKey: cbtQueryKeys.nudgeHistory(),
    queryFn: () => cbtApi.getNudgeHistory(),
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    if (serverNudgeHistory) {
      syncNudgeHistoryFromServer(serverNudgeHistory, tenantId);
    }
  }, [serverNudgeHistory, tenantId]);

  useEffect(() => {
    if (targetTingkat && targetTingkat.length === 1) {
      setFilterTingkat(targetTingkat[0]);
    } else {
      setFilterTingkat('ALL');
    }
  }, [targetTingkat]);

  // Listen event update colek WA
  useEffect(() => {
    const handleUpdate = () => setNudgeTick(Date.now());
    window.addEventListener('cbt-nudge-updated', handleUpdate);
    return () => window.removeEventListener('cbt-nudge-updated', handleUpdate);
  }, []);

  // Modals state
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [selectedBankToEdit, setSelectedBankToEdit] = useState<CbtBankSoal | null>(null);
  const [defaultMapelForCreate, setDefaultMapelForCreate] = useState<string | undefined>(undefined);
  const [defaultGuruForCreate, setDefaultGuruForCreate] = useState<string | undefined>(undefined);
  const [defaultTingkatForCreate, setDefaultTingkatForCreate] = useState<'X' | 'XI' | 'XII' | undefined>(undefined);
  const [isWaGroupModalOpen, setIsWaGroupModalOpen] = useState(false);

  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedBankForDetail, setSelectedBankForDetail] = useState<CbtBankSoal | null>(null);

  // ── 1. Fetch SK Penugasan & Data Guru (Termasuk No HP Terdaftar) ──
  const { data: guruMapelRes } = useQuery({
    queryKey: ['guru-mapel-readiness', activeTpId],
    queryFn: () => listGuruMapel({ tahun_pelajaran_id: activeTpId }),
    enabled: !!activeTpId,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
  const rawGuruMapel = guruMapelRes?.data || [];

  // Mapel options yang benar-benar aktif diajarkan oleh guru di sekolah/event ini (Bebas dari mapel dummy ghost)
  const activeCurriculumMapelOptions = useMemo(() => {
    const map = new Map<string, { value: string; label: string; raw?: any }>();
    rawGuruMapel.forEach((gm: GuruMapel) => {
      if (gm.mapel_id && gm.Mapel?.nama_mapel) {
        if (!map.has(gm.mapel_id)) {
          map.set(gm.mapel_id, {
            value: gm.mapel_id,
            label: `${gm.Mapel.nama_mapel}${gm.Mapel.kode_mapel ? ` (${gm.Mapel.kode_mapel})` : ''}`,
            raw: gm.Mapel,
          });
        }
      }
    });
    return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label));
  }, [rawGuruMapel]);

  const { rawList: allGurus = [] } = useGuruOptions({ jenisPtk: 'ALL' });
  const guruPhoneMap = useMemo(() => {
    const map = new Map<string, string>();
    allGurus.forEach((g) => {
      if (g.id && g.no_hp) {
        map.set(g.id, g.no_hp);
      }
    });
    return map;
  }, [allGurus]);

  // ── 2. Rekonsiliasi Otomatis & Pemodelan Data Teori vs Realisasi ──
  const { auditedTeachers, mapelPaketTeoriList, stats } = useMemo(() => {
    const mgmpSharedMap = getAllMgmpSharedMap(tenantId, bankList);
    const nudgeHistory = getNudgeHistory(tenantId);

    // Kumpulkan seluruh bank soal per mapel & tingkat (mendukung varian multi-jurusan vokasi)
    const banksByMapelTingkat = new Map<string, CbtBankSoal[]>();

    bankList.forEach((b) => {
      const tNum = resolveStrictBankTingkat(b);
      const mId = b.mapel_id;
      if (!mId || !tNum) return;

      const mtKey = `${mId}_${tNum}`;
      if (!banksByMapelTingkat.has(mtKey)) {
        banksByMapelTingkat.set(mtKey, []);
      }
      banksByMapelTingkat.get(mtKey)!.push(b);
    });

    const teacherItems: AuditedTargetItem[] = [];
    const mapelPaketMap = new Map<string, MapelPaketTeoriItem>();
    const guruAssignmentsMap = new Map<string, GuruMapel[]>();
    const guruMetaMap = new Map<string, { name: string; phone: string }>();

    if (rawGuruMapel.length > 0) {
      rawGuruMapel.forEach((gm: GuruMapel) => {
        const gId = gm.guru_id;
        const mId = gm.mapel_id;
        if (!gId || !mId) return;

        const mapelName = gm.Mapel?.nama_mapel || 'Mata Pelajaran';
        if (isNonAcademicMapel(mapelName)) {
          return;
        }

        const tNum = resolveStrictTingkat(gm);
        if (!tNum) return;

        // Jika event ujian memiliki sasaran tingkat spesifik, lewati penugasan di luar tingkat sasaran!
        if (targetTingkat && targetTingkat.length > 0 && !targetTingkat.includes(tNum)) {
          return;
        }

        const guruName = gm.Guru?.nama_guru || 'Guru Pengampu';
        const phone = gm.Guru?.no_hp || guruPhoneMap.get(gId) || '';

        if (!guruAssignmentsMap.has(gId)) {
          guruAssignmentsMap.set(gId, []);
          guruMetaMap.set(gId, { name: guruName, phone });
        }
        guruAssignmentsMap.get(gId)!.push(gm);

        // 2a. Model Teori Paket Mapel (Mata Pelajaran x Tingkat)
        const mtKey = `${mId}_${tNum}`;
        const candidateBanks = banksByMapelTingkat.get(mtKey) || [];

        if (!mapelPaketMap.has(mtKey)) {
          const sortedBanks = [...candidateBanks].sort((a, b) => {
            const countA = a.jumlah_soal || a._count?.Soal || 0;
            const countB = b.jumlah_soal || b._count?.Soal || 0;
            return countB - countA;
          });
          const bestMasterBank = sortedBanks[0];
          const hasReadyMaster = candidateBanks.some(
            (b) => (b.jumlah_soal || b._count?.Soal || 0) > 0
          );

          mapelPaketMap.set(mtKey, {
            id: mtKey,
            mapel_id: mId,
            nama_mapel: mapelName,
            tingkat: tNum,
            assignedTeachers: [],
            isReady: hasReadyMaster,
            bankSoal: bestMasterBank,
            masterAuthor: bestMasterBank?.Guru?.nama_guru,
            soalCount: bestMasterBank ? bestMasterBank.jumlah_soal || bestMasterBank._count?.Soal || 0 : 0,
          });
        }
        const paket = mapelPaketMap.get(mtKey)!;
        if (!paket.assignedTeachers.some((t) => t.id === gId)) {
          paket.assignedTeachers.push({ id: gId, nama_guru: guruName });
        }
      });

      // 2b. Evaluasi Kesiapan per Guru & Jurusan menggunakan SSOT tunggal evaluateTeacherDutiesSSOT
      guruAssignmentsMap.forEach((gmList, gId) => {
        const meta = guruMetaMap.get(gId)!;
        const dutyRes = evaluateTeacherDutiesSSOT({
          guruId: gId,
          guruMapelList: gmList,
          bankList,
          targetTingkat,
        });

        dutyRes.items.forEach((duty) => {
          const displayMapel =
            duty.targetJurusan && !duty.mapelName.toUpperCase().includes(duty.targetJurusan.toUpperCase())
              ? `${duty.mapelName} (${duty.targetJurusan})`
              : duty.mapelName;

          const legacyTeacherKey = `${gId}_${duty.mapelId}_${duty.tingkat}`;
          const nudgeMeta =
            nudgeHistory[`${gId}_${duty.key}`] ||
            nudgeHistory[legacyTeacherKey] ||
            (duty.bankSoal ? nudgeHistory[duty.bankSoal.id] : undefined);

          const isReady = duty.status === 'COVERED_OWN' || duty.status === 'COVERED_MGMP';
          const isCoveredByMaster = duty.status === 'COVERED_MGMP' || duty.status === 'DRAFT_MGMP';

          if (duty.bankSoal) {
            const isShared = Boolean(duty.bankSoal.is_shared || duty.bankSoal.status === 'PUBLISHED');
            teacherItems.push({
              id: isCoveredByMaster ? `mgmp_${gId}_${duty.key}_${duty.bankSoal.id}` : `${duty.bankSoal.id}_${duty.key}`,
              guru_id: gId,
              nama_guru: meta.name,
              no_hp: meta.phone,
              mapel_id: duty.mapelId,
              nama_mapel: displayMapel,
              tingkat: duty.tingkat,
              assignedTeachers: [{ id: gId, nama_guru: meta.name, no_hp: meta.phone }],
              bankSoal: duty.bankSoal,
              soalCount: duty.soalCount,
              status: isReady ? 'READY' : 'DRAFT_EMPTY',
              isShared,
              creatorName: meta.name,
              isCoveredByMaster,
              masterAuthorName: isCoveredByMaster ? duty.masterAuthorName || 'Koordinator MGMP' : undefined,
              nudgeMeta,
            });
          } else {
            teacherItems.push({
              id: `${gId}_${duty.key}`,
              guru_id: gId,
              nama_guru: meta.name,
              no_hp: meta.phone,
              mapel_id: duty.mapelId,
              nama_mapel: displayMapel,
              tingkat: duty.tingkat,
              assignedTeachers: [{ id: gId, nama_guru: meta.name, no_hp: meta.phone }],
              bankSoal: undefined,
              soalCount: 0,
              status: 'UNCREATED',
              isShared: false,
              creatorName: meta.name,
              isCoveredByMaster: false,
              nudgeMeta,
            });
          }
        });
      });
    }

    const mapelPaketList = Array.from(mapelPaketMap.values());
    const totalTeoriPaket = mapelPaketList.length;
    const paketSudahSiap = mapelPaketList.filter((p) => p.isReady).length;
    const paketBelumSiap = totalTeoriPaket - paketSudahSiap;

    const totalGuruPenugasan = teacherItems.length;
    const guruSudahSiap = teacherItems.filter((t) => t.status === 'READY').length;
    const guruBelumSiap = totalGuruPenugasan - guruSudahSiap;

    return {
      auditedTeachers: teacherItems,
      mapelPaketTeoriList: mapelPaketList,
      stats: {
        totalTeoriPaket,
        paketSudahSiap,
        paketBelumSiap,
        totalGuruPenugasan,
        guruSudahSiap,
        guruBelumSiap,
      },
    };
  }, [rawGuruMapel, bankList, tenantId, guruPhoneMap, nudgeTick, targetTingkat]);

  // ── 3. Filter & Default Sorting: Tingkat (10 -> 11 -> 12) -> Nama Mapel (A-Z) -> Nama Guru (A-Z) ──
  const guruBelumList = useMemo(() => {
    return auditedTeachers
      .filter((t) => {
        if (t.status === 'READY') return false;
        if (filterTingkat !== 'ALL' && t.tingkat !== filterTingkat) return false;
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          return t.nama_guru.toLowerCase().includes(q) || t.nama_mapel.toLowerCase().includes(q);
        }
        return true;
      })
      .sort((a, b) => {
        if (a.tingkat !== b.tingkat) return a.tingkat - b.tingkat;
        const cmpMapel = a.nama_mapel.localeCompare(b.nama_mapel, 'id');
        if (cmpMapel !== 0) return cmpMapel;
        return a.nama_guru.localeCompare(b.nama_guru, 'id');
      });
  }, [auditedTeachers, filterTingkat, searchQuery]);

  const guruSudahList = useMemo(() => {
    return auditedTeachers
      .filter((t) => {
        if (t.status !== 'READY') return false;
        if (filterTingkat !== 'ALL' && t.tingkat !== filterTingkat) return false;
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          return t.nama_guru.toLowerCase().includes(q) || t.nama_mapel.toLowerCase().includes(q);
        }
        return true;
      })
      .sort((a, b) => {
        if (a.tingkat !== b.tingkat) return a.tingkat - b.tingkat;
        const cmpMapel = a.nama_mapel.localeCompare(b.nama_mapel, 'id');
        if (cmpMapel !== 0) return cmpMapel;
        return a.nama_guru.localeCompare(b.nama_guru, 'id');
      });
  }, [auditedTeachers, filterTingkat, searchQuery]);

  const mapelPaketFilteredList = useMemo(() => {
    return mapelPaketTeoriList
      .filter((p) => {
        if (filterTingkat !== 'ALL' && p.tingkat !== filterTingkat) return false;
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          return p.nama_mapel.toLowerCase().includes(q);
        }
        return true;
      })
      .sort((a, b) => {
        if (a.tingkat !== b.tingkat) return a.tingkat - b.tingkat;
        return a.nama_mapel.localeCompare(b.nama_mapel, 'id');
      });
  }, [mapelPaketTeoriList, filterTingkat, searchQuery]);

  // Statistik Dinamis Menyesuaikan Filter Tingkat
  const activeStats = useMemo(() => {
    const targetMapelList =
      filterTingkat === 'ALL'
        ? mapelPaketTeoriList
        : mapelPaketTeoriList.filter((p) => p.tingkat === filterTingkat);

    const targetTeacherList =
      filterTingkat === 'ALL'
        ? auditedTeachers
        : auditedTeachers.filter((t) => t.tingkat === filterTingkat);

    const totalTeoriPaket = targetMapelList.length;
    const paketSudahSiap = targetMapelList.filter((p) => p.isReady).length;
    const paketBelumSiap = totalTeoriPaket - paketSudahSiap;

    const totalGuruPenugasan = targetTeacherList.length;
    const guruSudahSiap = targetTeacherList.filter((t) => t.status === 'READY').length;
    const guruBelumSiap = totalGuruPenugasan - guruSudahSiap;

    return {
      totalTeoriPaket,
      paketSudahSiap,
      paketBelumSiap,
      totalGuruPenugasan,
      guruSudahSiap,
      guruBelumSiap,
    };
  }, [mapelPaketTeoriList, auditedTeachers, filterTingkat]);

  // ── 4. Handlers ──
  const handleNudgeWhatsApp = (target: AuditedTargetItem) => {
    const rawHp = target.no_hp || guruPhoneMap.get(target.guru_id) || target.assignedTeachers[0]?.no_hp;
    const cleanHp = rawHp ? rawHp.replace(/[^0-9]/g, '').replace(/^0/, '62') : '';
    const teacherName = target.nama_guru;
    const mapelName = target.nama_mapel;
    const tingkatStr = `Tingkat ${formatTingkatRomawi(target.tingkat)} (Kelas ${target.tingkat})`;
    const senderName = user?.full_name || (user as any)?.nama || 'Panitia CBT';

    const msg =
      target.status === 'UNCREATED'
        ? `Halo Bapak/Ibu ${teacherName},\n\nMengingatkan persiapan Asesmen Ujian CBT untuk mata pelajaran ${mapelName} ${tingkatStr} yang saat ini belum terdaftar di sistem.\nMohon kesediaannya segera menginput butir soal atau mengonfirmasi kesiapan paket master MGMP sebelum batas waktu yang ditentukan.\n\nTerima kasih.\n— Panitia CBT (${senderName})`
        : `Halo Bapak/Ibu ${teacherName},\n\nMengingatkan bahwa bank soal untuk mata pelajaran ${mapelName} ${tingkatStr} saat ini masih kosong (0 butir soal).\nMohon kesediaannya melengkapi butir soal agar jadwal ujian dapat segera diterbitkan.\n\nTerima kasih.\n— Panitia CBT (${senderName})`;

    if (!cleanHp) {
      toast.error(`Nomor WhatsApp untuk ${teacherName} belum terdaftar di profil guru. Membuka link umum WhatsApp...`);
    } else {
      toast.success(`Membuka WhatsApp untuk ${teacherName} (${cleanHp})`);
    }

    const waUrl = cleanHp ? `https://wa.me/${cleanHp}?text=${encodeURIComponent(msg)}` : `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(waUrl, '_blank');

    // Catat status telah di-WA (persisten & real-time)
    recordNudge(target.id, senderName, tenantId);
    setNudgeTick(Date.now());
  };

  // Membangun pesan rekapitulasi broadcast untuk grup WhatsApp
  const buildGroupBroadcastMessage = (): string => {
    if (guruBelumList.length === 0) return '';

    // Resolusi domain tenant dinamis
    const getTenantLoginUrl = (): string => {
      if (typeof window !== 'undefined') {
        if (
          window.location.hostname &&
          window.location.hostname !== 'localhost' &&
          window.location.hostname !== '127.0.0.1'
        ) {
          return window.location.origin;
        }
      }
      const storedDomain = typeof window !== 'undefined' ? localStorage.getItem('tenant_domain') : null;
      if (storedDomain) {
        return storedDomain.startsWith('http') ? storedDomain : `https://${storedDomain}`;
      }
      return 'https://smkn1pld.absenta.id';
    };

    const tenantUrl = getTenantLoginUrl();

    // Format penyingkatan mapel baku & standar kurikulum
    const formatMapelAbbr = (namaMapel: string, kodeMapel?: string): string => {
      let clean = (namaMapel || '').trim();
      clean = clean.replace(/\((?!PJOK|IPAS|PKK|BK|PAI|PPKN)[^)]*\)/gi, '').trim();
      let upper = clean.toUpperCase();

      if (upper.includes('INGGRIS')) return 'B. INGG';
      if (upper.includes('INDONESIA')) return 'B. INDO';
      if (upper.includes('SUNDA')) return 'B. SUNDA';
      if (upper.includes('JEPANG')) return 'B. JEPANG';
      if (upper.includes('ARAB')) return 'B. ARAB';
      if (upper.includes('MANDARIN')) return 'B. MANDARIN';
      if (upper.includes('JERMAN')) return 'B. JERMAN';
      if (upper.includes('PRANCIS')) return 'B. PRANCIS';
      if (upper.includes('AGAMA') || upper.startsWith('PAI')) return 'PAI';
      if (upper.includes('PANCASILA') || upper.includes('PPKN')) return 'PPKN';
      if (upper.includes('PJOK') || upper.includes('JASMANI')) return 'PJOK';
      if (upper.includes('IPAS') || upper.includes('ALAM DAN SOSIAL')) return 'IPAS';
      if (upper.includes('PKK') || upper.includes('KREATIF DAN KEWIRAUSAHAAN')) return 'PKK';
      if (upper.includes('INFORMATIKA')) return 'INFORMATIKA';
      if (upper.includes('MATEMATIKA')) return 'MATEMATIKA';
      if (upper.includes('SEJARAH')) return 'SEJARAH';
      if (upper.includes('SENI BUDAYA')) return 'SENI BUDAYA';
      if (upper.includes('BIMBINGAN KONSELING') || upper.includes('BK')) return 'BK';

      if (upper.includes('DASAR-DASAR PROGRAM KEAHLIAN') || upper.includes('DASAR PROGRAM KEAHLIAN')) {
        upper = upper.replace(/DASAR-?DASAR PROGRAM KEAHLIAN|DASAR PROGRAM KEAHLIAN/gi, 'DDPK').trim();
      }
      if (upper.includes('KONSENTRASI KEAHLIAN')) {
        upper = upper.replace(/KONSENTRASI KEAHLIAN/gi, 'KK').trim();
      }
      if (upper.includes('MATA PELAJARAN PILIHAN')) {
        upper = upper.replace(/MATA PELAJARAN PILIHAN/gi, 'MPP').trim();
      }

      return upper;
    };

    const cleanTeacherName = (name: string): string => {
      return (name || '')
        .replace(/,\s*(S[.,][A-Za-z.,]+|M[.,][A-Za-z.,]+|Gr\.?|Dr\.?|Drs\.?|Dra\.?).*$/gi, '')
        .trim()
        .toUpperCase();
    };

    const formatTingkat = (tingkat: any): string => {
      const num = Number(tingkat);
      if (num === 11) return 'XI';
      if (num === 12) return 'XII';
      if (num === 10) return 'X';
      if (String(tingkat).toUpperCase() === 'XI') return 'XI';
      if (String(tingkat).toUpperCase() === 'XII') return 'XII';
      return 'X';
    };

    // Deduplikasi baris per guru - mapel - tingkat
    const teacherMapelList = Array.from(
      new Set(
        guruBelumList.map((t) => {
          const teacherName = cleanTeacherName(t.nama_guru);
          const mapelName = formatMapelAbbr(t.nama_mapel, (t as any).kode_mapel);
          const romanTingkat = formatTingkat(t.tingkat);
          return `${teacherName} - ${mapelName} - ${romanTingkat}`;
        })
      )
    );

    const lines = [
      'Yang Belum Buat Bank Soal :',
      ...teacherMapelList,
      '',
      'bpk ibu bisa cek kewajiban di halaman tugas atau halaman cbt nanti terlihat mana yang sudah dan mana yang belum',
      '',
      `login ke ${tenantUrl}`,
      'Username : NIP',
      'Pass : sudah di beri tahu',
    ];

    return lines.join('\n');
  };

  // Salin teks pengumuman grup ke clipboard
  const handleCopyUncreatedTeachers = () => {
    if (guruBelumList.length === 0) {
      toast.success('Semua guru sudah menyerahkan bank soal');
      return;
    }
    const messageText = buildGroupBroadcastMessage();
    navigator.clipboard.writeText(messageText);
    setCopied(true);
    toast.success('Daftar guru yang belum berhasil disalin untuk WhatsApp!');
    setTimeout(() => setCopied(false), 3000);
  };

  // Colek dalam 1 Group: Buka modal universal pengiriman via WA Gateway
  const handleNudgeGroupWhatsApp = () => {
    if (guruBelumList.length === 0) {
      toast.success('Semua guru sudah menyerahkan bank soal.');
      return;
    }
    setIsWaGroupModalOpen(true);
  };

  const handleCreateForTarget = (target: AuditedTargetItem) => {
    setSelectedBankToEdit(null);
    setDefaultMapelForCreate(target.mapel_id);
    setDefaultGuruForCreate(target.guru_id);
    const romanTingkat = target.tingkat === 11 ? 'XI' : target.tingkat === 12 ? 'XII' : 'X';
    setDefaultTingkatForCreate(romanTingkat);
    setIsFormModalOpen(true);
  };

  // ── 7. Evaluasi Matriks Kesiapan (Kelas x Mapel) ──
  const matrixSelectedTingkat = useMemo(() => {
    if (typeof filterTingkat === 'number') return filterTingkat;
    if (targetTingkat && targetTingkat.length > 0) return targetTingkat[0];
    return tingkatList[0] || 10;
  }, [filterTingkat, targetTingkat, tingkatList]);

  const matrixResult = useMemo(() => {
    return buildClassSubjectMatrix({
      rawGuruMapel: guruMapelRes?.data || [],
      bankList,
      tingkat: matrixSelectedTingkat,
      guruPhoneMap,
    });
  }, [guruMapelRes?.data, bankList, matrixSelectedTingkat, guruPhoneMap]);

  const handleNudgeForMatrixCell = (cell: MatrixCellData) => {
    const rawHp = cell.guruPengampuPhone || (cell.guruPengampuId ? guruPhoneMap.get(cell.guruPengampuId) : '');
    const cleanHp = rawHp ? rawHp.replace(/[^0-9]/g, '').replace(/^0/, '62') : '';
    const teacherName = cell.guruPengampu || 'Bapak/Ibu Guru';
    const mapelName = cell.mapelName;
    const kelasName = cell.kelasName;
    const tingkatStr = `Tingkat ${formatTingkatRomawi(cell.tingkat)}`;
    const senderName = user?.full_name || (user as any)?.nama || 'Panitia CBT';

    const msg = `Halo Bapak/Ibu ${teacherName},\n\nMengingatkan persiapan Asesmen Ujian CBT untuk mata pelajaran *${mapelName}* di rombel *${kelasName}* (${tingkatStr}) yang saat ini belum memiliki bank soal di sistem meja panitia.\nMohon kesediaannya untuk segera menyiapkan dan mengunggah naskah butir soal agar proses penjadwalan ujian dapat berjalan lancar.\n\nTerima kasih atas kerja samanya.\n— Panitia CBT (${senderName})`;

    if (!cleanHp) {
      toast.error(`Nomor WhatsApp untuk ${teacherName} belum terdaftar di data guru. Membuka tautan umum WhatsApp...`);
    } else {
      toast.success(`Membuka WhatsApp untuk ${teacherName} (${cleanHp})`);
    }

    const waUrl = cleanHp ? `https://wa.me/${cleanHp}?text=${encodeURIComponent(msg)}` : `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(waUrl, '_blank');

    if (cell.guruPengampuId) {
      const targetKey = cell.targetId || `${cell.guruPengampuId}_${cell.mapelId}_${cell.tingkat}`;
      recordNudge(targetKey, senderName, tenantId);
      setNudgeTick(Date.now());
    }
  };

  return (
    <div className="space-y-3 w-full">
      {/* ── 1 RUANG SEAMLESS FLIGHT DECK + TOOLBAR ── */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-2xs divide-y divide-slate-100 dark:divide-slate-800/80 overflow-hidden">
        {topFlightDeck}

        {/* ── Unified Master Filter & Action Toolbar (1 Ruang, Label Efisien Maks 2 Kata) ── */}
        <div className="p-2 sm:p-2.5 bg-slate-50/50 dark:bg-slate-800/30 flex flex-col xl:flex-row xl:items-center justify-between gap-2">
          {/* Left: Tab 3 Kategori (Label 1 Kata) */}
          <div className="flex items-center gap-1 p-0.5 bg-slate-100 dark:bg-slate-800 rounded-xl overflow-x-auto no-scrollbar shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab('BELUM')}
              className={cn(
                'px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap',
                activeTab === 'BELUM'
                  ? 'bg-rose-600 text-white shadow-2xs'
                  : 'text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40'
              )}
            >
              <AlertCircle size={12} />
              <span>Belum ({activeStats.guruBelumSiap})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('SUDAH')}
              className={cn(
                'px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap',
                activeTab === 'SUDAH'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
              )}
            >
              <CheckCircle2 size={12} />
              <span>Siap ({activeStats.guruSudahSiap})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('PAKET_MAPEL')}
              className={cn(
                'px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap',
                activeTab === 'PAKET_MAPEL'
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
              )}
            >
              <BookOpen size={12} />
              <span>Paket ({activeStats.totalTeoriPaket})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('MATRIKS')}
              className={cn(
                'px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap',
                activeTab === 'MATRIKS'
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
              )}
            >
              <LayoutGrid size={12} />
              <span>Matriks Kelas</span>
            </button>
          </div>

          {/* Right: Search + Tingkat Chips + Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap xl:flex-nowrap justify-between xl:justify-end w-full xl:w-auto">
            {/* Search Box */}
            <div className="relative w-full sm:w-48 lg:w-56 shrink-0">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari guru/mapel..."
                aria-label="Cari bank soal atau guru"
                className="w-full pl-8 pr-2.5 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 shadow-2xs"
              />
            </div>

            {/* Tingkat Filter Chips */}
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar shrink-0">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-0.5">Tingkat:</span>
              <button
                type="button"
                onClick={() => setFilterTingkat('ALL')}
                className={cn(
                  'px-2 py-0.5 text-[11px] font-bold rounded-md border transition-all cursor-pointer whitespace-nowrap',
                  filterTingkat === 'ALL'
                    ? 'bg-slate-800 text-white border-slate-800 dark:bg-slate-200 dark:text-slate-900 shadow-2xs'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                )}
              >
                Semua
              </button>
              {(targetTingkat && targetTingkat.length > 0 ? tingkatList.filter((t) => targetTingkat.includes(t)) : tingkatList).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setFilterTingkat(t)}
                  className={cn(
                    'px-2 py-0.5 text-[11px] font-bold rounded-md border transition-all cursor-pointer whitespace-nowrap',
                    filterTingkat === t
                      ? 'bg-slate-800 text-white border-slate-800 dark:bg-slate-200 dark:text-slate-900 shadow-2xs'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                  )}
                >
                  Kelas {t}
                </button>
              ))}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-1.5 shrink-0">
              {activeTab === 'BELUM' && (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleCopyUncreatedTeachers}
                    className={cn(
                      'text-xs h-7 px-2.5 font-bold cursor-pointer shadow-2xs flex items-center gap-1 transition-all',
                      copied
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                        : 'border-slate-300 text-slate-700 bg-white hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                    )}
                    title="Salin daftar guru yang belum ke WhatsApp"
                  >
                    {copied ? <Check size={12} className="text-emerald-600" /> : <Copy size={11} className="mr-0.5" />}
                    <span>{copied ? 'Tersalin!' : 'Salin WA'}</span>
                  </Button>

                  <Button
                    type="button"
                    size="sm"
                    onClick={handleNudgeGroupWhatsApp}
                    className="text-xs h-7 px-2.5 font-bold bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-2xs flex items-center gap-1 transition-all"
                    title="Colek semua guru belum buat soal sekaligus dalam 1 Group WhatsApp"
                  >
                    <MessageSquare size={11} />
                    <span>Colek 1 Group</span>
                  </Button>
                </>
              )}

              {onProceedToNextPhase && (
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={onProceedToNextPhase}
                  className="text-xs h-7 px-2.5 font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-2xs cursor-pointer flex items-center gap-1"
                >
                  <span>Lanjut</span>
                  <ArrowRight size={11} />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── 4. Konten Tabel Ramping Bebas Noise ── */}
      {activeTab === 'BELUM' && (
        <div className="space-y-2 w-full">
          {guruBelumList.length > 0 && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-2.5 sm:px-3 sm:py-2 rounded-xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 shadow-2xs text-xs">
              <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200">
                <AlertCircle size={15} className="text-amber-600 dark:text-amber-400 shrink-0" />
                <span>
                  Terdapat <strong>{guruBelumList.length}</strong> penugasan guru/mapel yang belum menyelesaikan bank soal.
                </span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCopyUncreatedTeachers}
                  className={cn(
                    'h-6 sm:h-7 px-2.5 text-xs font-bold cursor-pointer shadow-2xs flex items-center gap-1 transition-all',
                    copied
                      ? 'border-emerald-500 bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200'
                      : 'border-slate-300 text-slate-700 bg-white hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                  )}
                  title="Salin format WhatsApp ke clipboard"
                >
                  {copied ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                  <span>{copied ? 'Tersalin' : 'Salin Teks WA'}</span>
                </Button>

                <Button
                  type="button"
                  size="sm"
                  onClick={handleNudgeGroupWhatsApp}
                  className="h-6 sm:h-7 px-2.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-2xs flex items-center gap-1.5 transition-all"
                  title="Buka WhatsApp untuk colek dalam 1 group dan tandai semua guru dicolek"
                >
                  <MessageSquare size={12} />
                  <span>Colek dalam 1 Group</span>
                </Button>
              </div>
            </div>
          )}

          <CbtReadinessTeacherTable
            items={guruBelumList}
            mode="BELUM"
            onNudgeWhatsApp={handleNudgeWhatsApp}
            onPeriksaButir={(bank) => {
              setSelectedBankForDetail(bank);
              setIsDetailModalOpen(true);
            }}
            onEditBank={(bank) => {
              setSelectedBankToEdit(bank);
              setIsFormModalOpen(true);
            }}
          />
        </div>
      )}

      {activeTab === 'SUDAH' && (
        <CbtReadinessTeacherTable
          items={guruSudahList}
          mode="SUDAH"
          onNudgeWhatsApp={handleNudgeWhatsApp}
          onPeriksaButir={(bank) => {
            setSelectedBankForDetail(bank);
            setIsDetailModalOpen(true);
          }}
          onEditBank={(bank) => {
            setSelectedBankToEdit(bank);
            setIsFormModalOpen(true);
          }}
        />
      )}

      {activeTab === 'PAKET_MAPEL' && (
        <CbtReadinessPaketTable
          items={mapelPaketFilteredList}
          onPeriksaButir={(bank) => {
            setSelectedBankForDetail(bank);
            setIsDetailModalOpen(true);
          }}
        />
      )}

      {activeTab === 'MATRIKS' && (
        <CbtClassSubjectMatrixTable
          matrixResult={matrixResult}
          searchQuery={searchQuery}
          onPeriksaButir={(bank) => {
            setSelectedBankForDetail(bank);
            setIsDetailModalOpen(true);
          }}
          onNudgeWhatsApp={handleNudgeForMatrixCell}
          tenantId={tenantId}
          eventName={eventName}
          schoolName={schoolName}
        />
      )}

      {/* ── 5. Modals (Zero-Manual-Reload via Query Cache Invalidation) ── */}
      {isFormModalOpen && (
        <CbtBankSoalFormModal
          isOpen={isFormModalOpen}
          onClose={() => {
            setIsFormModalOpen(false);
            setDefaultMapelForCreate(undefined);
            setDefaultGuruForCreate(undefined);
            setDefaultTingkatForCreate(undefined);
          }}
          bankSoalToEdit={selectedBankToEdit}
          defaultMapelId={defaultMapelForCreate}
          defaultGuruId={defaultGuruForCreate}
          defaultTingkat={defaultTingkatForCreate}
          activeEvent={activeEvent}
          eventName={eventName}
          targetTingkat={targetTingkat}
          roleContext="KURIKULUM"
          customMapelOptions={activeCurriculumMapelOptions}
          onSuccess={() => {
            setIsFormModalOpen(false);
            setDefaultMapelForCreate(undefined);
            setDefaultGuruForCreate(undefined);
            setDefaultTingkatForCreate(undefined);
            // Invalidate server state caches
            queryClient.invalidateQueries({ queryKey: cbtQueryKeys.all, exact: false });
            queryClient.invalidateQueries({ queryKey: ['cbt-bank-soal'] });
            queryClient.invalidateQueries({ queryKey: ['cbt-bank-soal-readiness'] });
            if (onRefreshBankList) onRefreshBankList();
          }}
        />
      )}

      {isDetailModalOpen && selectedBankForDetail && (
        <CbtBankSoalDetailModal
          isOpen={isDetailModalOpen}
          onClose={() => {
            setIsDetailModalOpen(false);
            setSelectedBankForDetail(null);
          }}
          bankSoal={selectedBankForDetail}
          onBankSoalUpdated={() => {
            queryClient.invalidateQueries({ queryKey: cbtQueryKeys.all, exact: false });
            queryClient.invalidateQueries({ queryKey: ['cbt-bank-soal'] });
            queryClient.invalidateQueries({ queryKey: ['cbt-bank-soal-readiness'] });
            if (onRefreshBankList) onRefreshBankList();
          }}
        />
      )}

      {/* ── Modal Universal Kirim Pesan WA Gateway ── */}
      {isWaGroupModalOpen && (
        <UniversalSendWaModal
          isOpen={isWaGroupModalOpen}
          onClose={() => setIsWaGroupModalOpen(false)}
          title="Colek Persiapan Soal via WA Gateway"
          subtitle="Pilih grup sekolah atau nomor guru untuk mengirim pengingat pembuatan bank soal secara otomatis"
          defaultMessage={buildGroupBroadcastMessage()}
          defaultRecipientType="GROUP"
          onSuccess={(details) => {
            const senderName = user?.full_name || (user as any)?.nama || 'Panitia CBT';
            guruBelumList.forEach((t) => {
              recordNudge(t.id, senderName, tenantId);
            });
            setNudgeTick(Date.now());
            toast.success(`Colek berhasil dikirim ke ${details.targetLabel}! ${guruBelumList.length} guru telah ditandai dicolek.`);
          }}
        />
      )}
    </div>
  );
};
