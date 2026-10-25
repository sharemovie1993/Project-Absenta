import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { 
  Crown, 
  UserCheck, 
  FileText, 
  Wallet, 
  Sparkles, 
  ShieldCheck, 
  HeartHandshake, 
  Trophy, 
  Edit3, 
  RotateCcw, 
  Share2, 
  Check, 
  Users,
  GitBranch,
  ListTree,
  Printer
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { toast } from 'sonner';
import { StrukturOrganisasiPrintModal } from './StrukturOrganisasiPrintModal';
import type { Siswa } from '@/types/academic';
import type { PengurusPosition, StrukturOrganisasiKelas } from './strukturTypes';

interface BaganStrukturOrganisasiProps {
  kelasId?: string;
  kelasNama?: string;
  waliKelasNama?: string;
  waliKelasNip?: string;
  studentsList: Siswa[];
  isLoadingStudents?: boolean;
}

const DEFAULT_POSITIONS: PengurusPosition[] = [
  {
    id: 'km',
    roleTitle: 'Ketua Murid (KM)',
    roleCode: 'KM',
    category: 'PIMPINAN',
    description: 'Koordinator utama kelas & penghubung wali kelas',
    assignedStudentIds: [],
    assignedStudentNames: ['(Belum Ditentukan)'],
    maxPersons: 1,
  },
  {
    id: 'wkm',
    roleTitle: 'Wakil Ketua Murid',
    roleCode: 'WKM',
    category: 'PIMPINAN',
    description: 'Pendamping & pelaksana operasional harian KM',
    assignedStudentIds: [],
    assignedStudentNames: ['(Belum Ditentukan)'],
    maxPersons: 1,
  },
  {
    id: 'sekretaris',
    roleTitle: 'Sekretaris Rombel',
    roleCode: 'SEKRETARIS',
    category: 'ADMINISTRASI',
    description: 'Pencatat absensi, agenda harian & notulensi',
    assignedStudentIds: [],
    assignedStudentNames: ['Sekretaris 1', 'Sekretaris 2'],
    maxPersons: 2,
  },
  {
    id: 'bendahara',
    roleTitle: 'Bendahara Rombel',
    roleCode: 'BENDAHARA',
    category: 'KEUANGAN',
    description: 'Pengelola kas kelas & logistik inventaris',
    assignedStudentIds: [],
    assignedStudentNames: ['Bendahara 1', 'Bendahara 2'],
    maxPersons: 2,
  },
  {
    id: 'seksi_kebersihan',
    roleTitle: 'Seksi Kebersihan (5R)',
    roleCode: 'SEKSI_BERSIH',
    category: 'SEKSI',
    description: 'Koordinator ketertiban & piket kebersihan',
    assignedStudentIds: [],
    assignedStudentNames: ['(Belum Ditentukan)'],
    maxPersons: 1,
  },
  {
    id: 'seksi_keamanan',
    roleTitle: 'Seksi Keamanan & Tatib',
    roleCode: 'SEKSI_AMAN',
    category: 'SEKSI',
    description: 'Penegakan kedisiplinan dan kondusifitas rombel',
    assignedStudentIds: [],
    assignedStudentNames: ['(Belum Ditentukan)'],
    maxPersons: 1,
  },
  {
    id: 'seksi_kerohanian',
    roleTitle: 'Seksi Kerohanian',
    roleCode: 'SEKSI_ROHANI',
    category: 'SEKSI',
    description: 'Koordinator ibadah & pembiasaan karakter',
    assignedStudentIds: [],
    assignedStudentNames: ['(Belum Ditentukan)'],
    maxPersons: 1,
  },
  {
    id: 'seksi_humas',
    roleTitle: 'Seksi Olahraga & Humas',
    roleCode: 'SEKSI_HUMAS',
    category: 'SEKSI',
    description: 'Penghubung kegiatan kelas, olahraga & seni',
    assignedStudentIds: [],
    assignedStudentNames: ['(Belum Ditentukan)'],
    maxPersons: 1,
  },
];

export const BaganStrukturOrganisasi: React.FC<BaganStrukturOrganisasiProps> = React.memo(({
  kelasId = 'default',
  kelasNama = 'Kelas',
  waliKelasNama = 'Wali Kelas',
  waliKelasNip,
  studentsList = [],
  isLoadingStudents = false,
}) => {
  const storageKey = `absenta_walas_struktur_${kelasId}`;

  // Local state for positions
  const [positions, setPositions] = useState<PengurusPosition[]>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore
    }
    return DEFAULT_POSITIONS;
  });

  // Mode Tampilan: Bagan Pohon Visual vs List Hierarki Vertikal
  const [viewMode, setViewMode] = useState<'visual_tree' | 'vertical_tree'>('visual_tree');
  const [isPrintModalOpen, setIsPrintModalOpen] = useState<boolean>(false);

  // Modal edit state
  const [editingPosition, setEditingPosition] = useState<PengurusPosition | null>(null);
  const [selectedStudent1, setSelectedStudent1] = useState<string>('');
  const [selectedStudent2, setSelectedStudent2] = useState<string>('');

  // Sinkronisasi data awal jika studentsList baru terload dan posisi masih kosong
  useEffect(() => {
    if (studentsList.length >= 4 && positions.every((p) => p.assignedStudentIds.length === 0)) {
      // Auto-populate intelligent defaults from real students if available
      const updated = positions.map((p, idx) => {
        if (p.maxPersons === 1) {
          const s = studentsList[idx];
          return s
            ? { ...p, assignedStudentIds: [s.id], assignedStudentNames: [s.nama_siswa] }
            : p;
        } else {
          const s1 = studentsList[idx];
          const s2 = studentsList[idx + 1];
          return {
            ...p,
            assignedStudentIds: [s1?.id, s2?.id].filter(Boolean) as string[],
            assignedStudentNames: [s1?.nama_siswa || `${p.roleTitle} 1`, s2?.nama_siswa || `${p.roleTitle} 2`],
          };
        }
      });
      setPositions(updated);
      try {
        localStorage.setItem(storageKey, JSON.stringify(updated));
      } catch {
        // ignore
      }
    }
  }, [studentsList, positions, storageKey]);

  // Save to localStorage when changed
  const handleSavePositions = useCallback((newPositions: PengurusPosition[]) => {
    setPositions(newPositions);
    try {
      localStorage.setItem(storageKey, JSON.stringify(newPositions));
    } catch {
      // ignore
    }
  }, [storageKey]);

  // Open modal edit
  const handleOpenEdit = (pos: PengurusPosition) => {
    setEditingPosition(pos);
    setSelectedStudent1(pos.assignedStudentIds[0] || '');
    setSelectedStudent2(pos.assignedStudentIds[1] || '');
  };

  // Submit modal edit
  const handleSaveEdit = () => {
    if (!editingPosition) return;

    const s1Obj = studentsList.find((s) => s.id === selectedStudent1);
    const s2Obj = studentsList.find((s) => s.id === selectedStudent2);

    const newIds: string[] = [];
    const newNames: string[] = [];

    if (s1Obj) {
      newIds.push(s1Obj.id);
      newNames.push(s1Obj.nama_siswa);
    }
    if (editingPosition.maxPersons > 1 && s2Obj) {
      newIds.push(s2Obj.id);
      newNames.push(s2Obj.nama_siswa);
    }

    const updated = positions.map((p) =>
      p.id === editingPosition.id
        ? {
            ...p,
            assignedStudentIds: newIds,
            assignedStudentNames: newNames.length > 0 ? newNames : ['(Belum Ditentukan)'],
          }
        : p
    );

    handleSavePositions(updated);
    setEditingPosition(null);
    toast.success(`Jabatan ${editingPosition.roleTitle} berhasil diperbarui!`);
  };

  // Student options for Select
  const studentSelectOptions = useMemo(() => {
    return studentsList.map((s) => ({
      value: s.id,
      label: `${s.nama_siswa} (${s.nis || 'Tanpa NIS'})`,
    }));
  }, [studentsList]);

  // Helper getters
  const km = positions.find((p) => p.id === 'km');
  const wkm = positions.find((p) => p.id === 'wkm');
  const sekretaris = positions.find((p) => p.id === 'sekretaris');
  const bendahara = positions.find((p) => p.id === 'bendahara');
  const seksiList = positions.filter((p) => p.category === 'SEKSI');

  return (
    <div className="space-y-4 w-full">
      {/* Action Header & Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-50/80 dark:bg-slate-850/60 rounded-2xl border border-slate-200/80 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
            <GitBranch className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100">
              Bagan Struktur Organisasi Rombel
            </h4>
            <p className="text-[10px] text-slate-500">
              Hirarki kepemimpinan dan pembagian peran kepengurusan siswa
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 ml-auto">
          {/* Switch View Mode */}
          <div className="flex items-center p-1 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-2xs">
            <button
              type="button"
              onClick={() => setViewMode('visual_tree')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                viewMode === 'visual_tree'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <GitBranch className="w-3.5 h-3.5" />
              <span>Bagan Pohon</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('vertical_tree')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                viewMode === 'vertical_tree'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <ListTree className="w-3.5 h-3.5" />
              <span>Daftar Alur</span>
            </button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsPrintModalOpen(true)}
            className="h-8 px-2.5 text-xs text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800 bg-white dark:bg-slate-900 rounded-xl flex items-center gap-1.5 cursor-pointer shadow-2xs"
            title="Cetak Struktur Organisasi Kelas (PDF/Kop Resmi)"
          >
            <Printer className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Cetak Dokumen</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              try {
                localStorage.removeItem(storageKey);
                setPositions(DEFAULT_POSITIONS);
                toast.info('Struktur kepengurusan direset ke standar awal');
              } catch {
                // ignore
              }
            }}
            className="h-8 px-2 text-xs text-slate-500 border-slate-200 dark:border-slate-800 rounded-xl"
            title="Reset ke struktur default"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* ── TAMPILAN 1: BAGAN POHON VISUAL (TRUE ORG TREE) ── */}
      {viewMode === 'visual_tree' && (
        <div className="w-full overflow-x-auto pb-4 pt-1 no-scrollbar">
          <div className="w-full max-w-full flex flex-col items-center">
            {/* LEVEL 1: WALI KELAS (PEMBINA TERTINGGI) */}
            <div className="relative group w-full flex flex-col items-center">
              <div className="w-full max-w-[320px] sm:max-w-sm bg-gradient-to-b from-indigo-50/90 to-white dark:from-indigo-950/40 dark:to-slate-900 border-2 border-indigo-400/80 dark:border-indigo-600/80 rounded-2xl p-2.5 sm:p-3.5 shadow-sm flex items-center gap-2.5 sm:gap-3 text-left">
                <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Crown className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                      Pembina Rombel
                    </span>
                    <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-indigo-300 text-indigo-700 dark:text-indigo-300">
                      Wali Kelas
                    </Badge>
                  </div>
                  <h5 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate" title={waliKelasNama}>
                    {waliKelasNama}
                  </h5>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                    {waliKelasNip ? `NIP. ${waliKelasNip}` : 'Pembimbing & Pengarah'}
                  </p>
                </div>
              </div>

              {/* Vertical connector to KM */}
              <div className="w-0.5 h-4 sm:h-6 bg-indigo-300 dark:bg-indigo-700 mx-auto" />
            </div>

            {/* LEVEL 2: KETUA MURID (KM) */}
            <div className="relative group w-full flex flex-col items-center">
              <div className="w-full max-w-[320px] sm:max-w-sm bg-white dark:bg-slate-900 border-2 border-violet-400/80 dark:border-violet-600/80 rounded-2xl p-2.5 sm:p-3.5 shadow-xs flex items-center gap-2.5 sm:gap-3 text-left hover:border-violet-500 transition-all">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-violet-100 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300 flex items-center justify-center shrink-0 font-black">
                  <UserCheck className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-violet-600 dark:text-violet-400">
                      Ketua Murid (KM)
                    </span>
                    <button
                      type="button"
                      onClick={() => km && handleOpenEdit(km)}
                      className="p-1 text-slate-400 hover:text-violet-600 rounded-md hover:bg-violet-50 dark:hover:bg-violet-950/40 cursor-pointer"
                      title="Edit Ketua Murid"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <h5 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate" title={km?.assignedStudentNames[0]}>
                    {km?.assignedStudentNames[0] || '(Belum Ditentukan)'}
                  </h5>
                  <p className="text-[10px] text-slate-400 truncate">
                    {km?.description}
                  </p>
                </div>
              </div>

              {/* Vertical connector to Wakil KM */}
              <div className="w-0.5 h-4 sm:h-6 bg-slate-300 dark:bg-slate-700 mx-auto" />
            </div>

            {/* LEVEL 3: WAKIL KETUA MURID */}
            <div className="relative group w-full flex flex-col items-center">
              <div className="w-full max-w-[320px] sm:max-w-sm bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-2.5 sm:p-3 shadow-xs flex items-center gap-2.5 sm:gap-3 text-left hover:border-violet-400 transition-all">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0 font-bold">
                  <Users className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-slate-500">
                      Wakil Ketua Murid
                    </span>
                    <button
                      type="button"
                      onClick={() => wkm && handleOpenEdit(wkm)}
                      className="p-1 text-slate-400 hover:text-indigo-600 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                      title="Edit Wakil KM"
                    >
                      <Edit3 className="w-3 h-3" />
                    </button>
                  </div>
                  <h5 className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 truncate" title={wkm?.assignedStudentNames[0]}>
                    {wkm?.assignedStudentNames[0] || '(Belum Ditentukan)'}
                  </h5>
                  <p className="text-[10px] text-slate-400 truncate">
                    {wkm?.description}
                  </p>
                </div>
              </div>

              {/* Vertical connector to horizontal branch */}
              <div className="w-0.5 h-4 sm:h-6 bg-slate-300 dark:bg-slate-700 mx-auto" />
            </div>

            {/* LEVEL 4: BRANCHING TO SEKRETARIS (LEFT) & BENDAHARA (RIGHT) */}
            <div className="w-full max-w-md sm:max-w-[620px] relative px-1">
              {/* Horizontal line connector */}
              <div className="absolute top-0 left-1/4 right-1/4 h-0.5 bg-slate-300 dark:bg-slate-700" />
              
              <div className="grid grid-cols-2 gap-2 sm:gap-6 pt-4 sm:pt-6 relative">
                {/* Connector drop left */}
                <div className="absolute top-0 left-1/4 -translate-x-1/2 w-0.5 h-4 sm:h-6 bg-slate-300 dark:bg-slate-700" />
                {/* Connector drop right */}
                <div className="absolute top-0 right-1/4 translate-x-1/2 w-0.5 h-4 sm:h-6 bg-slate-300 dark:bg-slate-700" />

                {/* SEKRETARIS CARD */}
                <div className="bg-sky-50/40 dark:bg-sky-950/20 border border-sky-200/80 dark:border-sky-800/60 rounded-2xl p-2 sm:p-3 shadow-2xs">
                  <div className="flex items-center justify-between pb-1.5 border-b border-sky-100 dark:border-sky-900/40 mb-1.5">
                    <div className="flex items-center gap-1 sm:gap-1.5 min-w-0">
                      <div className="p-1 sm:p-1.5 rounded-lg bg-sky-100 dark:bg-sky-900/60 text-sky-600 dark:text-sky-400 shrink-0">
                        <FileText className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                      </div>
                      <span className="text-[10px] sm:text-[11px] font-bold text-sky-800 dark:text-sky-300 truncate">
                        Sekretaris
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => sekretaris && handleOpenEdit(sekretaris)}
                      className="p-1 text-slate-400 hover:text-sky-600 rounded-md cursor-pointer shrink-0"
                      title="Edit Sekretaris"
                    >
                      <Edit3 className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="space-y-1 sm:space-y-1.5">
                    {sekretaris?.assignedStudentNames.map((name, i) => (
                      <div key={i} className="flex items-center gap-1.5 p-1 sm:p-1.5 bg-white dark:bg-slate-900 rounded-xl border border-sky-100 dark:border-sky-950 text-xs">
                        <span className="w-4 h-4 sm:w-5 sm:h-5 rounded-md bg-sky-100 text-sky-700 text-[9px] sm:text-[10px] font-bold flex items-center justify-center shrink-0">
                          {i + 1}
                        </span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200 text-[10px] sm:text-xs truncate block" title={name}>
                          {name}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* BENDAHARA CARD */}
                <div className="bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-800/60 rounded-2xl p-2 sm:p-3 shadow-2xs">
                  <div className="flex items-center justify-between pb-1.5 border-b border-emerald-100 dark:border-emerald-900/40 mb-1.5">
                    <div className="flex items-center gap-1 sm:gap-1.5 min-w-0">
                      <div className="p-1 sm:p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400 shrink-0">
                        <Wallet className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                      </div>
                      <span className="text-[10px] sm:text-[11px] font-bold text-emerald-800 dark:text-emerald-300 truncate">
                        Bendahara
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => bendahara && handleOpenEdit(bendahara)}
                      className="p-1 text-slate-400 hover:text-emerald-600 rounded-md cursor-pointer shrink-0"
                      title="Edit Bendahara"
                    >
                      <Edit3 className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="space-y-1 sm:space-y-1.5">
                    {bendahara?.assignedStudentNames.map((name, i) => (
                      <div key={i} className="flex items-center gap-1.5 p-1 sm:p-1.5 bg-white dark:bg-slate-900 rounded-xl border border-emerald-100 dark:border-emerald-950 text-xs">
                        <span className="w-4 h-4 sm:w-5 sm:h-5 rounded-md bg-emerald-100 text-emerald-700 text-[9px] sm:text-[10px] font-bold flex items-center justify-center shrink-0">
                          {i + 1}
                        </span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200 text-[10px] sm:text-xs truncate block" title={name}>
                          {name}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Stem down to Seksi-Seksi */}
              <div className="w-0.5 h-4 sm:h-6 bg-slate-300 dark:bg-slate-700 mx-auto" />
            </div>

            {/* LEVEL 5: SEKSI-SEKSI BIDANG OPERASIONAL */}
            <div className="w-full max-w-md sm:max-w-[660px] px-1">
              <div className="relative pt-1 sm:pt-2">
                <div className="text-center mb-2">
                  <span className="inline-block px-2.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-500 rounded-full border border-slate-200 dark:border-slate-700">
                    Seksi - Seksi Bidang Rombel
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5">
                  {seksiList.map((seksi) => (
                    <div
                      key={seksi.id}
                      className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-2 sm:p-2.5 shadow-2xs hover:border-indigo-300 transition-all text-center flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[8px] sm:text-[9px] font-black uppercase text-indigo-600 dark:text-indigo-400 truncate">
                            {seksi.roleCode.replace('SEKSI_', '')}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(seksi)}
                            className="p-0.5 text-slate-400 hover:text-indigo-600 rounded-md cursor-pointer"
                            title="Edit Seksi"
                          >
                            <Edit3 className="w-3 h-3" />
                          </button>
                        </div>
                        <h6 className="text-[10px] sm:text-[11px] font-bold text-slate-800 dark:text-slate-200 truncate" title={seksi.roleTitle}>
                          {seksi.roleTitle}
                        </h6>
                      </div>

                      <div className="mt-1.5 pt-1 border-t border-slate-100 dark:border-slate-800">
                        <p className="text-[10px] sm:text-[11px] font-semibold text-slate-700 dark:text-slate-300 truncate" title={seksi.assignedStudentNames[0]}>
                          {seksi.assignedStudentNames[0] || '(Belum Ada)'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAMPILAN 2: DAFTAR ALUR HIERARKI (COMPACT HIGH-DENSITY MOBILE) ── */}
      {viewMode === 'vertical_tree' && (
        <div className="space-y-3 p-1">
          {/* Node 1: Walas */}
          <div className="relative pl-6 before:absolute before:left-2 before:top-4 before:bottom-0 before:w-0.5 before:bg-indigo-300 dark:before:bg-indigo-700">
            <div className="p-3 bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-800 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-black">
                  <Crown className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase">
                    Pembina Rombel (Wali Kelas)
                  </span>
                  <p className="text-xs font-bold text-slate-900 dark:text-white">
                    {waliKelasNama}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Node 2: KM */}
          <div className="relative pl-6 before:absolute before:left-2 before:top-0 before:bottom-0 before:w-0.5 before:bg-violet-300 dark:before:bg-violet-700">
            <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-violet-600 dark:text-violet-400 uppercase">
                  Ketua Murid (KM)
                </span>
                <p className="text-xs font-bold text-slate-900 dark:text-white">
                  {km?.assignedStudentNames[0] || '(Belum Ditentukan)'}
                </p>
                <p className="text-[10px] text-slate-400">{km?.description}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => km && handleOpenEdit(km)}
                className="h-7 px-2 text-xs"
              >
                Ubah
              </Button>
            </div>
          </div>

          {/* Node 3: Wakil KM */}
          <div className="relative pl-6 before:absolute before:left-2 before:top-0 before:bottom-0 before:w-0.5 before:bg-slate-300 dark:before:bg-slate-700">
            <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase">
                  Wakil Ketua Murid
                </span>
                <p className="text-xs font-bold text-slate-900 dark:text-white">
                  {wkm?.assignedStudentNames[0] || '(Belum Ditentukan)'}
                </p>
                <p className="text-[10px] text-slate-400">{wkm?.description}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => wkm && handleOpenEdit(wkm)}
                className="h-7 px-2 text-xs"
              >
                Ubah
              </Button>
            </div>
          </div>

          {/* Node 4: Sekretaris */}
          <div className="relative pl-6 before:absolute before:left-2 before:top-0 before:bottom-0 before:w-0.5 before:bg-sky-300 dark:before:bg-sky-700">
            <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-sky-600 dark:text-sky-400 uppercase">
                  Sekretaris 1 & 2
                </span>
                <p className="text-xs font-bold text-slate-900 dark:text-white">
                  {sekretaris?.assignedStudentNames.join(' & ')}
                </p>
                <p className="text-[10px] text-slate-400">{sekretaris?.description}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => sekretaris && handleOpenEdit(sekretaris)}
                className="h-7 px-2 text-xs"
              >
                Ubah
              </Button>
            </div>
          </div>

          {/* Node 5: Bendahara */}
          <div className="relative pl-6 before:absolute before:left-2 before:top-0 before:bottom-0 before:w-0.5 before:bg-emerald-300 dark:before:bg-emerald-700">
            <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase">
                  Bendahara 1 & 2
                </span>
                <p className="text-xs font-bold text-slate-900 dark:text-white">
                  {bendahara?.assignedStudentNames.join(' & ')}
                </p>
                <p className="text-[10px] text-slate-400">{bendahara?.description}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => bendahara && handleOpenEdit(bendahara)}
                className="h-7 px-2 text-xs"
              >
                Ubah
              </Button>
            </div>
          </div>

          {/* Node 6: Seksi-Seksi */}
          <div className="relative pl-6">
            <div className="p-3 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Seksi Bidang Operasional
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {seksiList.map((s) => (
                  <div key={s.id} className="p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <div>
                      <p className="text-[11px] font-bold text-slate-800 dark:text-slate-200">{s.roleTitle}</p>
                      <p className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold">{s.assignedStudentNames[0] || '-'}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenEdit(s)}
                      className="h-6 px-1.5 text-[10px]"
                    >
                      Ubah
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL PILIH / EDIT JABATAN STRUKTUR KELAS ── */}
      {editingPosition && (
        <Modal
          isOpen={Boolean(editingPosition)}
          onClose={() => setEditingPosition(null)}
          title={`Tetapkan ${editingPosition.roleTitle}`}
          size="md"
        >
          <div className="p-4 space-y-4">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Pilih perwakilan siswa dari rombel {kelasNama} untuk menempati jabatan ini.
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  {editingPosition.maxPersons > 1 ? 'Petugas 1' : 'Nama Siswa Terpilih'}
                </label>
                <SearchableSelect
                  options={studentSelectOptions}
                  value={selectedStudent1}
                  onValueChange={setSelectedStudent1}
                  placeholder="Ketik nama atau NIS siswa..."
                />
              </div>

              {editingPosition.maxPersons > 1 && (
                <div>
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Petugas 2 (Pendamping)
                  </label>
                  <SearchableSelect
                    options={studentSelectOptions}
                    value={selectedStudent2}
                    onValueChange={setSelectedStudent2}
                    placeholder="Ketik nama atau NIS siswa kedua..."
                  />
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditingPosition(null)}
              >
                Batal
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleSaveEdit}
                className="bg-indigo-600 text-white"
              >
                Simpan Perubahan
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── MODAL CETAK STRUKTUR ORGANISASI RESMI ── */}
      {isPrintModalOpen && (
        <StrukturOrganisasiPrintModal
          isOpen={isPrintModalOpen}
          onClose={() => setIsPrintModalOpen(false)}
          kelasNama={kelasNama}
          waliKelasNama={waliKelasNama}
          waliKelasNip={waliKelasNip}
          positions={positions}
          studentsList={studentsList}
        />
      )}
    </div>
  );
});

BaganStrukturOrganisasi.displayName = 'BaganStrukturOrganisasi';
