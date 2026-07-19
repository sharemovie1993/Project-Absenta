import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/Tabs';
import { TabSwitcher } from '../../components/ui/TabSwitcher';
import {
  Scan,
  Clock,
  History,
  ShieldCheck,
  FileText,
  CheckCircle
} from 'lucide-react';
import { piketApi } from '../../api/piket.api';
import type { IzinKeluarSiswa } from '../../api/piket.api';
import { useAuthStore } from '../../store/authStore';
import { tenantApi } from '../../api/tenants.api';
import { fetchActiveSystemConfig, type SystemConfig } from '../../services/systemConfig';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { AcademicPageLayout } from '../../components/academic/AcademicPageLayout';
import type { Tenant } from '../../api/tenants.api';

// Import modular components
import { PiketOperations } from '../../components/piket/PiketOperations';
import { PiketMonitoring } from '../../components/piket/PiketMonitoring';
import { PiketHistory } from '../../components/piket/PiketHistory';
import { PiketSecurity } from '../../components/piket/PiketSecurity';
import { PiketRecap } from '../../components/piket/PiketRecap';
import { PiketPrintSlip } from '../../components/piket/PiketPrintSlip';
import { PiketPrintRecap } from '../../components/piket/PiketPrintRecap';

export interface PrintPreset {
  id: string;
  name: string;
  width: string;
  pageSize: string;
  padding: string;
  fontSize: string;
}

export const PRINT_PRESETS: PrintPreset[] = [
  { id: '58mm', name: 'Thermal Mini (58mm)', width: '58mm', pageSize: '58mm auto', padding: '6px', fontSize: '9px' },
  { id: '80mm', name: 'Thermal Standard (80mm)', width: '80mm', pageSize: '80mm auto', padding: '12px', fontSize: '11px' },
  { id: 'a6', name: 'Compact Slip (A6)', width: '105mm', pageSize: '105mm 148mm', padding: '16px', fontSize: '12px' },
  { id: 'a5', name: 'Administrative Slip (A5)', width: '148mm', pageSize: '148mm 210mm', padding: '20px', fontSize: '13px' },
  { id: 'a4', name: 'Official Letter (A4)', width: '210mm', pageSize: 'A4 portrait', padding: '15mm', fontSize: '14px' },
];

export default function PiketPage() {
  const { user } = useAuthStore();


  // Shared States
  const [activeTab, setActiveTab] = useState('scan');
  const [dailyPermits, setDailyPermits] = useState<IzinKeluarSiswa[]>([]);
  const [loadingPermits, setLoadingPermits] = useState(true);
  const [tenantInfo, setTenantInfo] = useState<Tenant | null>(null);
  const [systemConfig, setSystemConfig] = useState<SystemConfig | null>(null);

  // Printing States
  const [printedPermit, setPrintedPermit] = useState<(IzinKeluarSiswa & { qrCodeUrl?: string }) | null>(null);
  const [printPaperSize, setPrintPaperSize] = useState<string>('80mm');
  const [isPrintingRekap, setIsPrintingRekap] = useState(false);
  const [recapPermits, setRecapPermits] = useState<IzinKeluarSiswa[]>([]);
  const [recapDateLabel, setRecapDateLabel] = useState<string>('');
  const [recapSignatureDate, setRecapSignatureDate] = useState<string>('');

  // Search/Filter states
  const [historySearch, setHistorySearch] = useState('');
  const [verificationResult, setVerificationResult] = useState<{
    status: 'IDLE' | 'VALID' | 'INVALID';
    permit?: IzinKeluarSiswa;
    message?: string;
  }>({ status: 'IDLE' });

  // Confirmation dialog states
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [permitToDelete, setPermitToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Load Permits on Mount
  const fetchPermits = useCallback(async () => {
    setLoadingPermits(true);
    try {
      const res = await piketApi.getDailyPermits();
      if (res.success) {
        setDailyPermits(res.data);
      }
    } catch (err: unknown) {
      console.error('Failed to load permits:', err);
      toast.error('Gagal memuat daftar izin hari ini');
    } finally {
      setLoadingPermits(false);
    }
  }, []);

  useEffect(() => {
    fetchPermits();

    // Fetch School Tenant Details
    const fetchTenant = async () => {
      try {
        const [tenantRes, configRes] = await Promise.all([
          tenantApi.getMyTenant(),
          fetchActiveSystemConfig()
        ]);

        if (tenantRes.success) {
          setTenantInfo(tenantRes.data);
        }
        setSystemConfig(configRes);
      } catch (err: unknown) {
        console.error('Gagal memuat profil sekolah atau konfigurasi:', err);
      }
    };
    fetchTenant();
  }, [fetchPermits]);

  // Shared Action: Mark returned (Siswa Kembali)
  const handleMarkReturned = useCallback(async (id: string, namaSiswa: string) => {
    try {
      const res = await piketApi.markReturned(id);
      if (res.success) {
        toast.success(`Siswa ${namaSiswa} dinyatakan telah kembali ke sekolah`);
        await fetchPermits();
      }
    } catch (err: unknown) {
      console.error(err);
      const e = err as { message?: string };
      toast.error(e.message || 'Gagal memproses kepulangan siswa');
    }
  }, [fetchPermits]);

  // Shared Action: Delete/Cancel permit (Batal Izin)
  const handleDeletePermit = useCallback(async (id: string) => {
    setPermitToDelete(id);
    setDeleteConfirmOpen(true);
  }, []);

  // Security Gate Actions
  const handleSecuritySelect = useCallback((permit: IzinKeluarSiswa) => {
    if (permit.status === 'KEMBALI') {
      setVerificationResult({
        status: 'INVALID',
        message: `IZIN SUDAH EXPIRED: Siswa ${permit.SiswaAkademik?.siswa.nama_siswa} sudah kembali sebelumnya!`
      });
      toast.error('Verifikasi Gagal: Izin kedaluwarsa');
    } else {
      setVerificationResult({
        status: 'VALID',
        permit,
        message: `IZIN VALID: ${permit.SiswaAkademik?.siswa.nama_siswa} diperbolehkan keluar`
      });
      toast.success('Verifikasi Berhasil: Izin Valid');
    }
  }, []);

  const handleSecurityEnter = useCallback((code?: string) => {
    if (!code) return;
    const t = code.trim().toLowerCase();

    // Look up in local dailyPermits
    const match = dailyPermits.find(
      p => p.id.toLowerCase() === t ||
        String(p.SiswaAkademik?.siswa.nis || '').toLowerCase() === t ||
        String(p.SiswaAkademik?.siswa.no_rfid || '').toLowerCase() === t ||
        String((p.SiswaAkademik?.siswa as Record<string, unknown>)?.id || '').toLowerCase() === t
    );

    if (match) {
      handleSecuritySelect(match);
    } else {
      setVerificationResult({
        status: 'INVALID',
        message: `TIDAK ADA IZIN AKTIF HARI INI untuk NIS / Kartu: "${code}"`
      });
      toast.error('Verifikasi Gagal: Tidak ada izin aktif');
    }
  }, [dailyPermits, handleSecuritySelect]);

  // Memos
  const activeOutStudents = useMemo(() => {
    return dailyPermits.filter(p => p.status === 'DISETUJUI');
  }, [dailyPermits]);

  const tabOptions = useMemo(() => [
    { id: 'scan', label: 'Operasional Piket', icon: Scan, colorClass: 'text-indigo-650 dark:text-indigo-400' },
    {
      id: 'monitoring',
      label: (
        <span className="relative flex items-center">
          Monitoring Siswa
          {activeOutStudents.length > 0 && (
            <Badge variant="outline" className="ml-1.5 px-1.5 py-0.5 rounded-full text-[9px] font-black bg-rose-500 text-white animate-bounce border-none">
              {activeOutStudents.length}
            </Badge>
          )}
        </span>
      ),
      icon: Clock,
      colorClass: 'text-rose-600 dark:text-rose-400'
    },
    { id: 'history', label: 'Riwayat Hari Ini', icon: History, colorClass: 'text-blue-605 dark:text-blue-400' },
    { id: 'security', label: 'Pos Keamanan', icon: ShieldCheck, colorClass: 'text-slate-700 dark:text-slate-300' },
    { id: 'rekap', label: 'Rekap Harian', icon: FileText, colorClass: 'text-violet-600 dark:text-violet-400' }
  ], [activeOutStudents]);

  const filteredHistory = useMemo(() => {
    if (!historySearch.trim()) return dailyPermits;
    const s = historySearch.toLowerCase();
    return dailyPermits.filter(
      p => p.SiswaAkademik?.siswa?.nama_siswa.toLowerCase().includes(s) ||
        p.SiswaAkademik?.siswa?.nis.includes(s) ||
        p.alasan.toLowerCase().includes(s)
    );
  }, [dailyPermits, historySearch]);

  const breadcrumbs = useMemo(() => [
    { label: 'Kesiswaan', href: '#' },
    { label: 'Piket & Izin Keluar', active: true }
  ], []);

  const currentPreset = useMemo(() => {
    return PRINT_PRESETS.find(p => p.id === printPaperSize) || PRINT_PRESETS[1];
  }, [printPaperSize]);

  const piketStats = useMemo(() => {
    const activeOutCount = dailyPermits.filter(p => p.status === 'DISETUJUI').length;
    const totalCount = dailyPermits.length;
    const returnedCount = dailyPermits.filter(p => p.status === 'KEMBALI').length;

    return [
      {
        title: 'Siswa di Luar (Aktif)',
        value: activeOutCount,
        icon: <Clock size={14} />,
        gradient: 'from-amber-500 to-orange-600',
        subtitle: 'Izin keluar yang masih aktif'
      },
      {
        title: 'Total Izin Terbit',
        value: totalCount,
        icon: <FileText size={14} />,
        gradient: 'from-indigo-500 to-blue-600',
        subtitle: 'Seluruh surat izin hari ini'
      },
      {
        title: 'Siswa Sudah Kembali',
        value: returnedCount,
        icon: <CheckCircle size={14} />,
        gradient: 'from-emerald-500 to-teal-600',
        subtitle: 'Kembali & terverifikasi satpam'
      },
      {
        title: 'Status Gerbang',
        value: 'Siaga',
        icon: <ShieldCheck size={14} />,
        gradient: 'from-rose-500 to-pink-600',
        subtitle: 'Pos satpam terkoneksi real-time'
      }
    ];
  }, [dailyPermits]);

  return (
      <AcademicPageLayout
        title="Sistem Piket & Kedisiplinan"
        description="Kelola izin keluar-masuk siswa dan pemantauan keamanan gerbang secara real-time."
        breadcrumbs={[
          { label: 'Dashboard', path: '/dashboard' },
          { label: 'Kesiswaan', path: '/kesiswaan' },
          { label: 'Piket Gerbang' }
        ]}
        stats={piketStats}
        isLoadingStats={loadingPermits}
        hardeningModuleKey="kesiswaan_piket"
        instruction={{
          title: "Panduan Penggunaan Piket",
          description: "Gunakan menu navigasi (tab) untuk mengakses fitur operasional piket, pemantauan, dan riwayat.",
          items: [
            { text: "Operasional Piket: Untuk melakukan proses scan dan mencetak izin siswa keluar." },
            { text: "Monitoring Siswa: Untuk memantau daftar siswa yang sedang berada di luar sekolah." },
            { text: "Pos Keamanan: Dipergunakan oleh pos satpam untuk validasi izin ketika siswa akan keluar/masuk." },
            { text: "Rekap Harian: Untuk melihat rekapitulasi izin keluar pada hari ini atau rentang tanggal tertentu." }
          ]
        }}
      >
      <div className="space-y-6 pb-20 relative">
        {/* 2. TABS INTERFACE (HIDDEN ON PRINT) */}
        <div className="print:hidden">
          <Card className="p-4 sm:p-6 shadow-sm overflow-hidden">
            <Tabs value={activeTab} onValueChange={setActiveTab} color="indigo" variant="soft">
              <TabSwitcher
                options={tabOptions}
                activeTab={activeTab}
                onChange={setActiveTab}
                className="w-full justify-start overflow-x-auto scrollbar-none"
              />

            {/* TAB 1: OPERASIONAL SCANNER */}
            <TabsContent value="scan" className="mt-8 space-y-8">
              <PiketOperations
                dailyPermits={dailyPermits}
                fetchPermits={fetchPermits}
                tenantInfo={tenantInfo}
                user={user}
                setPrintedPermit={setPrintedPermit}
                printPaperSize={printPaperSize}
                setPrintPaperSize={setPrintPaperSize}
              />
            </TabsContent>

            {/* TAB 2: ACTIVE MONITORING */}
            <TabsContent value="monitoring" className="mt-8 space-y-6">
              <PiketMonitoring
                activeOutStudents={activeOutStudents}
                loadingPermits={loadingPermits}
                handleMarkReturned={handleMarkReturned}
                handleDeletePermit={handleDeletePermit}
              />
            </TabsContent>

            {/* TAB 3: CHRONOLOGICAL TODAY HISTORY */}
            <TabsContent value="history" className="mt-8 space-y-6">
              <PiketHistory
                dailyPermits={dailyPermits}
                historySearch={historySearch}
                setHistorySearch={setHistorySearch}
                filteredHistory={filteredHistory}
                loadingPermits={loadingPermits}
              />
            </TabsContent>

            {/* TAB 4: SECURITY GATE CHECKPOINT */}
            <TabsContent value="security" className="mt-8 space-y-6 max-w-2xl mx-auto">
              <PiketSecurity
                dailyPermits={dailyPermits}
                verificationResult={verificationResult}
                setVerificationResult={setVerificationResult}
                handleSecuritySelect={handleSecuritySelect}
                handleSecurityEnter={handleSecurityEnter}
                handleMarkReturned={handleMarkReturned}
              />
            </TabsContent>

            {/* TAB 5: DAILY PERMIT RECAP REPORT */}
            <TabsContent value="rekap" className="mt-8 space-y-6">
              <PiketRecap
                onUpdatePrintData={(permits, label, sigDate) => {
                  setRecapPermits(permits);
                  setRecapDateLabel(label);
                  setRecapSignatureDate(sigDate || '');
                }}
                printPaperSize={printPaperSize}
                setPrintPaperSize={setPrintPaperSize}
                setIsPrintingRekap={setIsPrintingRekap}
                setPrintedPermit={setPrintedPermit}
                tenantInfo={tenantInfo}
              />
            </TabsContent>
          </Tabs>
          </Card>
        </div>

        {/* 3a. PHYSICAL SINGLE SLIP PRINT SHEET (PORTAL TO DOCUMENT BODY FOR PERFECT TOP ALIGNMENT) */}
        {printedPermit && typeof document !== 'undefined' && createPortal(
          <PiketPrintSlip
            printedPermit={printedPermit}
            tenantInfo={tenantInfo}
            systemConfig={systemConfig}
            user={user}
            printPaperSize={printPaperSize}
          />,
          document.body
        )}

        {/* 3b. PHYSICAL DAILY RECAP PRINT SHEET (PORTAL TO DOCUMENT BODY FOR PERFECT TOP ALIGNMENT) */}
        {isPrintingRekap && typeof document !== 'undefined' && createPortal(
          <PiketPrintRecap
            isPrintingRekap={isPrintingRekap}
            tenantInfo={tenantInfo}
            user={user}
            dailyPermits={recapPermits}
            dateLabel={recapDateLabel}
            signatureDate={recapSignatureDate}
          />,
          document.body
        )}

        {/* Confirm cancel permit dialog */}
        <ConfirmDialog
          isOpen={deleteConfirmOpen}
          title="Batalkan Surat Izin"
          description="Apakah Anda yakin ingin membatalkan surat izin keluar siswa ini? Siswa yang bersangkutan harus mengajukan izin kembali jika ingin keluar gerbang."
          confirmText="Ya, Batalkan"
          cancelText="Kembali"
          style="danger"
          loading={isDeleting}
          onConfirm={async () => {
            if (permitToDelete) {
              setIsDeleting(true);
              try {
                const res = await piketApi.deletePermit(permitToDelete);
                if (res.success) {
                  toast.success('Surat izin keluar berhasil dibatalkan');
                  await fetchPermits();
                }
              } catch (err: unknown) {
                console.error(err);
                const e = err as { message?: string };
                toast.error(e.message || 'Gagal membatalkan surat izin');
              } finally {
                setIsDeleting(false);
                setDeleteConfirmOpen(false);
                setPermitToDelete(null);
              }
            }
          }}
          onCancel={() => {
            setDeleteConfirmOpen(false);
            setPermitToDelete(null);
          }}
        />

        {/* 4. TAILWIND INLINE PRINTSHEET CSS */}
        <style>{`
        @media print {
          @page {
            size: ${currentPreset.pageSize};
            margin: ${currentPreset.id === 'a4' || currentPreset.id === 'a5' ? '15mm' : '0'};
          }
          
          /* Hide all screen elements and other body elements completely from layout flow */
          #root {
            display: none !important;
          }
          body > :not(.print-sheet-receipt):not(.print-rekap-sheet) {
            display: none !important;
          }
          
          body {
            margin: 0 !important;
            padding: 0 !important;
            background: #fff !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          
          /* Show print sheets */
          .print-sheet-receipt {
            display: block !important;
          }
          .print-rekap-sheet {
            display: block !important;
          }
          
          /* Robust multi-page table header repeating */
          table {
            page-break-inside: auto !important;
            break-inside: auto !important;
          }
          thead {
            display: table-header-group !important;
          }
          tr {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          
          .print-sheet-receipt {
            position: absolute !important;
            left: 50% !important;
            top: 0 !important;
            transform: translateX(-50%) !important;
            width: ${currentPreset.width} !important;
            max-width: ${currentPreset.width} !important;
            margin: 0 !important;
            padding: ${currentPreset.padding} !important;
            box-sizing: border-box !important;
            background: white !important;
            color: black !important;
            font-family: ${currentPreset.id === 'a4' || currentPreset.id === 'a5' ? "system-ui, -apple-system, sans-serif" : "'Courier New', Courier, monospace"} !important;
            font-size: ${currentPreset.fontSize} !important;
            line-height: 1.4 !important;
            border: none !important;
            box-shadow: none !important;
          }
          
          .print-rekap-sheet {
            position: absolute !important;
            left: 50% !important;
            top: 0 !important;
            transform: translateX(-50%) !important;
            width: ${currentPreset.width} !important;
            max-width: ${currentPreset.width} !important;
            margin: 0 !important;
            padding: ${currentPreset.padding} !important;
            box-sizing: border-box !important;
            background: white !important;
            color: black !important;
            font-family: ${currentPreset.id === 'a4' || currentPreset.id === 'a5' ? "system-ui, -apple-system, sans-serif" : "'Courier New', Courier, monospace"} !important;
            font-size: ${currentPreset.fontSize} !important;
          }
        }
      `}</style>
      </div>

    </AcademicPageLayout>
  );
}
