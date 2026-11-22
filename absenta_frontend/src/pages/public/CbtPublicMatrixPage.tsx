import React, { useState, useMemo, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Layers,
  Search,
  Share2,
  Copy,
  Check,
  RefreshCw,
  Calendar,
  Sparkles,
  School,
  ExternalLink,
  MessageSquare,
  AlertCircle,
  FileQuestion,
  GraduationCap,
  ArrowLeft,
} from 'lucide-react';
import { cbtApi } from '@/api/cbt.api';
import { CbtClassSubjectMatrixTable } from '@/components/cbt/jadwal/CbtClassSubjectMatrixTable';
import { buildClassSubjectMatrix, MatrixCellData } from '@/components/cbt/jadwal/cbtClassSubjectMatrixHelper';
import { formatTingkatRomawi } from '@/components/cbt/bank-soal/cbtAsesmenHelper';
import { recordNudge } from '@/components/cbt/jadwal/cbtMgmpHelper';
import { Button, Modal } from '@/components/ui';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

export const CbtPublicMatrixPage: React.FC = () => {
  const { tenantSlug } = useParams<{ tenantSlug?: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [copiedLink, setCopiedLink] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [nudgeTick, setNudgeTick] = useState<number>(Date.now());

  // ── 1. Fetch Data Matriks Publik ──
  const {
    data: publicDataRes,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['cbt-public-matrix', tenantSlug],
    queryFn: () => cbtApi.getPublicMatrix(tenantSlug),
    staleTime: 45 * 1000,
    refetchInterval: 60 * 1000, // Live poll per 1 menit
    refetchOnWindowFocus: true,
  });

  const matrixData = publicDataRes;
  const tenant = matrixData?.tenant;
  const activeEvent = matrixData?.activeEvent;
  const activeTp = matrixData?.activeTp;
  const rawGuruMapel = matrixData?.rawGuruMapel || [];
  const bankList = matrixData?.bankList || [];
  const tenantId = tenant?.id || 'default';

  // ── 2. Tingkat Sasaran & Active Tingkat Tab ──
  const targetTingkatList = useMemo(() => {
    if (activeEvent?.target_tingkat && activeEvent.target_tingkat.length > 0) {
      return [...activeEvent.target_tingkat].sort((a, b) => a - b);
    }
    return [10, 11, 12];
  }, [activeEvent]);

  const paramTingkat = Number(searchParams.get('tingkat'));
  const [selectedTingkat, setSelectedTingkat] = useState<number>(() => {
    if (paramTingkat && targetTingkatList.includes(paramTingkat)) {
      return paramTingkat;
    }
    return targetTingkatList[0] || 10;
  });

  useEffect(() => {
    if (paramTingkat && targetTingkatList.includes(paramTingkat)) {
      setSelectedTingkat(paramTingkat);
    } else if (targetTingkatList.length > 0 && !targetTingkatList.includes(selectedTingkat)) {
      setSelectedTingkat(targetTingkatList[0]);
    }
  }, [paramTingkat, targetTingkatList, selectedTingkat]);

  const handleSelectTingkat = (tingkat: number) => {
    setSelectedTingkat(tingkat);
    setSearchParams((prev) => {
      prev.set('tingkat', String(tingkat));
      return prev;
    }, { replace: true });
  };

  // ── 3. Pemetaan Nomor Telepon Guru ──
  const guruPhoneMap = useMemo(() => {
    const map = new Map<string, string>();
    rawGuruMapel.forEach((gm: any) => {
      if (gm.guru_id && gm.Guru?.no_hp) {
        map.set(gm.guru_id, gm.Guru.no_hp);
      }
    });
    return map;
  }, [rawGuruMapel]);

  // ── 4. Evaluasi Matriks Kelas x Mapel untuk Tingkat Terpilih ──
  const matrixResult = useMemo(() => {
    return buildClassSubjectMatrix({
      rawGuruMapel,
      bankList,
      tingkat: selectedTingkat,
      guruPhoneMap,
    });
  }, [rawGuruMapel, bankList, selectedTingkat, guruPhoneMap]);

  // ── 5. Handler Colek WhatsApp dari Halaman Publik ──
  const handleNudgeWhatsApp = async (cell: MatrixCellData) => {
    const rawHp = cell.guruPengampuPhone || (cell.guruPengampuId ? guruPhoneMap.get(cell.guruPengampuId) : '');
    const cleanHp = rawHp ? rawHp.replace(/[^0-9]/g, '').replace(/^0/, '62') : '';
    const teacherName = cell.guruPengampu || 'Bapak/Ibu Guru';
    const mapelName = cell.mapelName;
    const kelasName = cell.kelasName;
    const tingkatStr = `Tingkat ${formatTingkatRomawi(cell.tingkat)} (Kelas ${cell.tingkat})`;
    const eventTitle = activeEvent?.nama_event || 'Asesmen CBT';
    const schoolName = tenant?.nama_sekolah || 'Sekolah';

    const msg = `Halo Bapak/Ibu ${teacherName},\n\nMengingatkan persiapan ${eventTitle} di ${schoolName} untuk mata pelajaran *${mapelName}* di rombel *${kelasName}* (${tingkatStr}) yang saat ini belum memiliki bank soal di meja panitia.\n\nMohon kesediaannya untuk segera menyiapkan dan mengunggah butir soal agar proses verifikasi dan pencetakan jadwal ujian dapat berjalan tepat waktu.\n\nProgres kesiapan bank soal dapat dipantau bersama di:\n${window.location.href}\n\nTerima kasih atas kerja samanya.\n— Panitia Pelaksana CBT`;

    if (!cleanHp) {
      toast.error(`Nomor WhatsApp untuk ${teacherName} belum tercatat di sistem. Membuka tautan umum WhatsApp...`);
    } else {
      toast.success(`Membuka WhatsApp untuk ${teacherName} (${cleanHp})`);
    }

    const waUrl = cleanHp
      ? `https://wa.me/${cleanHp}?text=${encodeURIComponent(msg)}`
      : `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(waUrl, '_blank');

    if (cell.guruPengampuId) {
      const targetKey = cell.targetId || `${cell.guruPengampuId}_${cell.mapelId}_${cell.tingkat}`;
      try {
        await cbtApi.recordPublicNudge(targetKey, 'Panitia CBT (Public Link)', tenantSlug);
      } catch (err) {
        console.warn('Gagal mencatat nudge ke server:', err);
      }
      recordNudge(targetKey, 'Panitia CBT (Public)', tenantId);
      setNudgeTick(Date.now());
    }
  };

  // ── 6. Salin Tautan & Susun Teks Forward WhatsApp ──
  const publicShareUrl = typeof window !== 'undefined' ? window.location.href : '';

  const handleCopyLink = () => {
    navigator.clipboard.writeText(publicShareUrl);
    setCopiedLink(true);
    toast.success('Tautan matriks berhasil disalin ke papan klip!');
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleShareToWhatsAppGroup = () => {
    const schoolName = tenant?.nama_sekolah || 'Sekolah';
    const eventTitle = activeEvent?.nama_event || 'Asesmen CBT';
    const tingkatRomawi = formatTingkatRomawi(selectedTingkat);
    const { totalCellsCovered, totalCellsRequired, overallPercentage } = matrixResult;

    const message = `📢 *MATRIKS KESIAPAN BANK SOAL CBT*\n🏛️ *${schoolName}*\n📝 *${eventTitle}*\n\n📊 *Progres Tingkat ${tingkatRomawi} (Kelas ${selectedTingkat}):*\n- Terisi: *${totalCellsCovered}* dari *${totalCellsRequired}* slot mapel (${overallPercentage}%)\n- Rombel: *${matrixResult.classes.length} Kelas*\n- Mata Pelajaran: *${matrixResult.subjects.length} Mapel*\n\nBapak/Ibu Guru dapat memeriksa status kesiapan butir soal dan kelengkapan mapel rombel masing-masing melalui tautan resmi Meja Panitia:\n👉 ${publicShareUrl}\n\n_Mohon kerja samanya untuk melengkapi butir soal sebelum batas waktu penjadwalan._\n— *Panitia Pelaksana CBT*`;

    const waGroupUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(waGroupUrl, '_blank');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6 space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-500/20 animate-bounce">
          <Layers size={24} />
        </div>
        <div className="text-center space-y-1">
          <h3 className="font-bold text-slate-800 dark:text-slate-100 text-base">
            Memuat Matriks Kesiapan Bank Soal...
          </h3>
          <p className="text-xs text-slate-400">
            Menghubungkan ke data kurikulum dan bank soal CBT sekolah
          </p>
        </div>
      </div>
    );
  }

  if (isError || !matrixData) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 text-center space-y-4 shadow-xl">
          <div className="w-14 h-14 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 mx-auto flex items-center justify-center">
            <AlertCircle size={28} />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Matriks Tidak Dapat Dimuat
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              {(error as any)?.message || 'Sekolah atau event ujian aktif tidak ditemukan.'}
            </p>
          </div>
          <Button onClick={() => refetch()} className="w-full">
            <RefreshCw size={14} className="mr-2" />
            Coba Muat Ulang
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/80 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col">
      {/* ── Top Header Bar (Public Branding) ── */}
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 shadow-2xs">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5 flex items-center justify-between gap-3">
          {/* Logo & School Brand */}
          <div className="flex items-center gap-3 min-w-0">
            {tenant?.logo_url ? (
              <img
                src={tenant.logo_url}
                alt="Logo Sekolah"
                className="w-9 h-9 rounded-xl object-contain border border-slate-200 dark:border-slate-800 bg-white p-0.5 shrink-0"
              />
            ) : (
              <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black text-sm shrink-0 shadow-xs">
                <School size={18} />
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-black tracking-tight text-slate-900 dark:text-white truncate">
                  {tenant?.nama_sekolah || 'Absenta School'}
                </h1>
                <span className="text-[10px] font-black uppercase px-1.5 py-0.2 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 shrink-0">
                  Meja Panitia CBT
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                {activeEvent?.nama_event || 'Asesmen CBT'} {activeTp ? `• TP ${activeTp.tahun}` : ''}
              </p>
            </div>
          </div>

          {/* Action Header: Share & Refresh */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => refetch()}
              disabled={isFetching}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Perbarui Data Matriks"
            >
              <RefreshCw size={15} className={cn(isFetching && 'animate-spin text-indigo-600')} />
            </button>

            <button
              type="button"
              onClick={handleCopyLink}
              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 shadow-2xs"
              title="Salin Tautan Halaman Ini"
            >
              {copiedLink ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
              <span className="hidden sm:inline">{copiedLink ? 'Tersalin' : 'Salin Link'}</span>
            </button>

            <button
              type="button"
              onClick={() => setIsShareModalOpen(true)}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 shadow-sm shadow-emerald-500/20"
              title="Bagikan Ringkasan Matriks ke WhatsApp"
            >
              <MessageSquare size={13} />
              <span>Bagikan ke WA</span>
            </button>
          </div>
        </div>
      </header>

      {/* ── Main Content Area ── */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-5 space-y-4 min-w-0">
        {/* Banner Navigasi Tingkat & Search */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 shadow-2xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Tab Pilihan Tingkat */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 mr-1.5 shrink-0">
                Pilih Tingkat:
              </span>
              {targetTingkatList.map((t) => {
                const isSelected = selectedTingkat === t;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => handleSelectTingkat(t)}
                    className={cn(
                      'px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1.5',
                      isSelected
                        ? 'bg-indigo-600 text-white shadow-xs shadow-indigo-600/30 font-black'
                        : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                    )}
                  >
                    <span>Kelas {t}</span>
                    <span className="text-[10px] opacity-75">({formatTingkatRomawi(t)})</span>
                  </button>
                );
              })}
            </div>

            {/* Search Input Filter Mapel */}
            <div className="relative w-full sm:w-64">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Cari mapel / kode..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Tabel Matriks Kesiapan (Kelas x Mapel) */}
        <CbtClassSubjectMatrixTable
          matrixResult={matrixResult}
          searchQuery={searchQuery}
          onNudgeWhatsApp={handleNudgeWhatsApp}
          tenantId={tenantId}
        />
      </main>

      {/* ── Footer ── */}
      <footer className="mt-auto py-4 border-t border-slate-200 dark:border-slate-800 text-center text-xs text-slate-400">
        <p>
          Meja Panitia CBT &bull; {tenant?.nama_sekolah || 'Absenta'}{' '}
          &bull; Powered by <span className="font-bold text-slate-600 dark:text-slate-300">Absenta Ecosystem</span>
        </p>
      </footer>

      {/* ── Modal Bagikan ke WhatsApp ── */}
      {isShareModalOpen && (
        <Modal
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
          title="Bagikan Matriks ke WhatsApp"
          size="md"
        >
          <div className="space-y-4 text-xs">
            <p className="text-slate-600 dark:text-slate-400">
              Kirimkan ringkasan progres kesiapan bank soal Tingkat {formatTingkatRomawi(selectedTingkat)} ke Grup WhatsApp Dewan Guru / Panitia agar para guru dapat memantau kesiapan soal masing-masing:
            </p>

            <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-mono text-[11px] leading-relaxed text-slate-700 dark:text-slate-300 whitespace-pre-wrap select-all">
              {`📢 *MATRIKS KESIAPAN BANK SOAL CBT*\n🏛️ *${tenant?.nama_sekolah || 'Sekolah'}*\n📝 *${activeEvent?.nama_event || 'Asesmen CBT'}*\n\n📊 *Progres Tingkat ${formatTingkatRomawi(selectedTingkat)} (Kelas ${selectedTingkat}):*\n- Terisi: ${matrixResult.totalCellsCovered} dari ${matrixResult.totalCellsRequired} slot (${matrixResult.overallPercentage}%)\n- Rombel: ${matrixResult.classes.length} Kelas\n- Mata Pelajaran: ${matrixResult.subjects.length} Mapel\n\nBuka tautan matriks:\n👉 ${publicShareUrl}`}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={handleCopyLink}>
                {copiedLink ? <Check size={13} className="mr-1 text-emerald-600" /> : <Copy size={13} className="mr-1" />}
                {copiedLink ? 'Tersalin' : 'Salin Teks & Link'}
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleShareToWhatsAppGroup}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <MessageSquare size={13} className="mr-1.5" />
                Buka WhatsApp Sekarang
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default CbtPublicMatrixPage;
