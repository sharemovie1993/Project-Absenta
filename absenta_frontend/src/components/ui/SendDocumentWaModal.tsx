import React, { useEffect, useMemo, useState } from 'react';
import {
  MessageCircle,
  Send,
  Users,
  Phone,
  FileText,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Search,
  GraduationCap,
  UserCheck,
  HeartHandshake,
  Plus,
  X,
  Check,
  Building2,
  User,
  QrCode,
  ExternalLink,
  LogOut,
  Download,
  Share2,
  Link2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Modal } from './Modal';
import { Button } from './Button';
import { useAuthStore } from '@/store/authStore';
import {
  connectWaUserSession,
  disconnectWaUserSession,
  getWaDocumentRecipients,
  getWaDocumentTargets,
  getWaUserSessionStatus,
  sendWaDocument,
  type WaDocumentRecipientItem,
  type WaDocumentTargetsResponse,
} from '@/api/whatsapp.api';
import {
  blobToBase64,
  capturePrintSheetsToPdfBlob,
  sanitizePdfFileName,
} from '@/utils/print/capturePrintSheetsToPdf';

export type WaCustomPdfGenerator = () => Promise<Blob | { blob: Blob; fileName?: string }>;

type RecipientTab = 'GURU' | 'SISWA' | 'ORTU' | 'GROUP' | 'MANUAL';
type SenderIdentityMode = 'GATEWAY' | 'WA_LINK' | 'USER';

// Engine pengiriman langsung via sesi WA Web (QR per user) sudah tersedia di backend/API,
// namun sementara disembunyikan dari UI utama sesuai arahan produk.
const ENABLE_PERSONAL_WA_QR_ENGINE = false;

interface SelectedWaRecipient {
  key: string;
  label: string;
  target: string; // phone digits or @g.us
  badge: string;
}

export interface SendDocumentWaModalProps {
  isOpen: boolean;
  onClose: () => void;
  deskRef?: React.RefObject<HTMLElement | null>;
  targetSelector?: string;
  orientation?: 'portrait' | 'landscape';
  defaultFileName?: string;
  defaultCaption?: string;
  defaultRecipient?: string;
  onGenerateWaPdf?: WaCustomPdfGenerator;
}

function formatFileSize(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 KB';
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function normalizePhoneToWaMeDigits(target: string): string | null {
  if (!target || target.includes('@g.us')) return null;
  let digits = target.replace(/\D/g, '');
  if (digits.startsWith('0')) {
    digits = `62${digits.slice(1)}`;
  } else if (digits.startsWith('8')) {
    digits = `62${digits}`;
  }
  return digits.length >= 9 ? digits : null;
}

function buildWaMeLink(phoneDigits: string, text: string): string {
  const cleanText = text.trim();
  return cleanText
    ? `https://wa.me/${phoneDigits}?text=${encodeURIComponent(cleanText)}`
    : `https://wa.me/${phoneDigits}`;
}

const RECIPIENT_BADGE_MAP: Record<string, string> = {
  GURU: 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300',
  SISWA: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300',
  ORTU: 'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300',
  GROUP: 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300',
  MANUAL: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
};

export const SendDocumentWaModal: React.FC<SendDocumentWaModalProps> = ({
  isOpen,
  onClose,
  deskRef,
  targetSelector,
  orientation = 'portrait',
  defaultFileName = 'Dokumen_Resmi.pdf',
  defaultCaption = '',
  defaultRecipient = '',
  onGenerateWaPdf,
}) => {
  const { user } = useAuthStore();
  const loggedUserName =
    (user as any)?.full_name || (user as any)?.nama || (user as any)?.name || 'User Login';

  const [senderMode, setSenderMode] = useState<SenderIdentityMode>('GATEWAY');
  const [activeTab, setActiveTab] = useState<RecipientTab>('GURU');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [manualPhone, setManualPhone] = useState<string>(defaultRecipient);
  const [selectedRecipients, setSelectedRecipients] = useState<SelectedWaRecipient[]>([]);

  const [fileName, setFileName] = useState<string>(() => sanitizePdfFileName(defaultFileName));
  const [caption, setCaption] = useState<string>(defaultCaption);

  const [targetsInfo, setTargetsInfo] = useState<WaDocumentTargetsResponse | null>(null);
  const [isLoadingTargets, setIsLoadingTargets] = useState<boolean>(false);

  // User Personal QR Session state
  const [userQr, setUserQr] = useState<string | null>(null);
  const [isConnectingUserQr, setIsConnectingUserQr] = useState<boolean>(false);
  const [isDisconnectingUserQr, setIsDisconnectingUserQr] = useState<boolean>(false);
  const [showUserQrPanel, setShowUserQrPanel] = useState<boolean>(false);

  const [directoryItems, setDirectoryItems] = useState<WaDocumentRecipientItem[]>([]);
  const [isLoadingDirectory, setIsLoadingDirectory] = useState<boolean>(false);

  const [isSending, setIsSending] = useState<boolean>(false);
  const [statusStep, setStatusStep] = useState<string>('');
  const [downloadedPdfInfo, setDownloadedPdfInfo] = useState<{
    fileName: string;
    sizeBytes: number;
    url: string;
  } | null>(null);
  const [openedWaKeys, setOpenedWaKeys] = useState<Set<string>>(() => new Set());

  const fetchTargets = async (refresh = false) => {
    setIsLoadingTargets(true);
    try {
      const data = await getWaDocumentTargets(refresh);
      setTargetsInfo(data);
      setUserQr(data.userSession?.qr || null);

      // Smart default sender: jika Gateway Sekolah belum aktif, arahkan ke Link WA (atau WA User QR jika diaktifkan & terhubung)
      const gatewayReady = Boolean(
        data.gateway?.connected ||
          data.gateway?.externalActive ||
          data.gateway?.platformFallbackAvailable ||
          data.connected,
      );
      if (!gatewayReady) {
        if (ENABLE_PERSONAL_WA_QR_ENGINE && data.userSession?.connected) {
          setSenderMode('USER');
        } else {
          setSenderMode('WA_LINK');
        }
      }
    } catch {
      setTargetsInfo({
        status: 'disconnected',
        connected: false,
        phoneNumber: null,
        groups: [],
      });
    } finally {
      setIsLoadingTargets(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    setFileName(sanitizePdfFileName(defaultFileName));
    setCaption(defaultCaption || '');
    setStatusStep('');
    setShowUserQrPanel(false);
    setOpenedWaKeys(new Set());
    setDownloadedPdfInfo((prev) => {
      if (prev?.url) URL.revokeObjectURL(prev.url);
      return null;
    });
    if (defaultRecipient && defaultRecipient.trim()) {
      setManualPhone(defaultRecipient.trim());
      setSelectedRecipients([
        {
          key: `default:${defaultRecipient.trim()}`,
          label: defaultRecipient.trim(),
          target: defaultRecipient.trim(),
          badge: 'MANUAL',
        },
      ]);
    } else {
      setManualPhone('');
      setSelectedRecipients([]);
    }
    void fetchTargets(false);
  }, [isOpen, defaultFileName, defaultCaption, defaultRecipient]);

  // Revoke object URL on unmount / close
  useEffect(() => {
    if (isOpen) return;
    setDownloadedPdfInfo((prev) => {
      if (prev?.url) URL.revokeObjectURL(prev.url);
      return null;
    });
  }, [isOpen]);

  // Poll user session status while QR panel is open and not connected (when engine is enabled)
  useEffect(() => {
    if (!ENABLE_PERSONAL_WA_QR_ENGINE || !isOpen || !showUserQrPanel || targetsInfo?.userSession?.connected) {
      return;
    }
    const interval = setInterval(async () => {
      try {
        const st = await getWaUserSessionStatus();
        setUserQr(st.qr || null);
        if (st.connected) {
          toast.success(`WA Pribadi terhubung (${st.phoneNumber || 'Aktif'})!`);
          setShowUserQrPanel(false);
          void fetchTargets(false);
        }
      } catch {}
    }, 3000);
    return () => clearInterval(interval);
  }, [isOpen, showUserQrPanel, targetsInfo?.userSession?.connected]);

  // Fetch biodata WA recipients whenever modal is open on GURU / SISWA / ORTU tab
  useEffect(() => {
    if (!isOpen) return;
    if (activeTab !== 'GURU' && activeTab !== 'SISWA' && activeTab !== 'ORTU') return;

    let cancelled = false;
    const timer = setTimeout(async () => {
      setIsLoadingDirectory(true);
      try {
        const list = await getWaDocumentRecipients({
          type: activeTab,
          search: searchQuery.trim() || undefined,
          limit: 50,
        });
        if (!cancelled) {
          setDirectoryItems(list);
        }
      } catch {
        if (!cancelled) {
          setDirectoryItems([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoadingDirectory(false);
        }
      }
    }, 220);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [isOpen, activeTab, searchQuery]);

  const activeGroups = useMemo(() => {
    if (senderMode === 'USER' && targetsInfo?.userSession?.groups?.length) {
      return targetsInfo.userSession.groups;
    }
    return targetsInfo?.gateway?.groups?.length
      ? targetsInfo.gateway.groups
      : targetsInfo?.groups || [];
  }, [senderMode, targetsInfo]);

  const filteredGroups = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return activeGroups;
    return activeGroups.filter((g) => (g.subject || '').toLowerCase().includes(q));
  }, [activeGroups, searchQuery]);

  const gatewayReady = Boolean(
    targetsInfo?.gateway?.connected ||
      targetsInfo?.gateway?.externalActive ||
      targetsInfo?.gateway?.platformFallbackAvailable ||
      targetsInfo?.connected,
  );
  const userSessionReady = Boolean(targetsInfo?.userSession?.connected);

  const toggleRecipient = (candidate: SelectedWaRecipient) => {
    setSelectedRecipients((prev) => {
      const exists = prev.some((r) => r.key === candidate.key || r.target === candidate.target);
      if (exists) {
        return prev.filter((r) => r.key !== candidate.key && r.target !== candidate.target);
      }
      return [...prev, candidate];
    });
  };

  const handleAddManualNumber = () => {
    const raw = manualPhone.trim();
    const digits = raw.replace(/\D/g, '');
    if (digits.length < 9) {
      toast.error('Masukkan nomor WhatsApp minimal 9 digit (contoh: 081234567890).');
      return;
    }
    toggleRecipient({
      key: `manual:${digits}`,
      label: raw,
      target: raw,
      badge: 'MANUAL',
    });
    setManualPhone('');
  };

  const handleConnectUserQr = async () => {
    setIsConnectingUserQr(true);
    setShowUserQrPanel(true);
    try {
      const res = await connectWaUserSession();
      setUserQr(res.qr || null);
      if (res.connected) {
        toast.success(`WA Pribadi sudah terhubung (${res.phoneNumber || 'Aktif'}).`);
        setShowUserQrPanel(false);
        void fetchTargets(false);
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Gagal membuat QR Code WA User.');
    } finally {
      setIsConnectingUserQr(false);
    }
  };

  const handleDisconnectUserQr = async () => {
    setIsDisconnectingUserQr(true);
    try {
      await disconnectWaUserSession();
      toast.success('Sesi WA pribadi berhasil diputuskan.');
      setUserQr(null);
      setShowUserQrPanel(false);
      void fetchTargets(false);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Gagal memutuskan sesi WA pribadi.');
    } finally {
      setIsDisconnectingUserQr(false);
    }
  };

  const resolvePrintContainerEl = (): HTMLElement | null => {
    if (deskRef?.current) return deskRef.current;
    if (targetSelector) {
      const el = document.querySelector(targetSelector) as HTMLElement | null;
      if (el) return el;
    }
    const sheets = document.querySelectorAll('.print-sheet');
    if (sheets.length > 0) {
      return (sheets[0].parentElement as HTMLElement | null) || (sheets[0] as HTMLElement);
    }
    return document.getElementById('print-desk-canvas-area');
  };

  const preparePdf = async () => {
    setStatusStep('Menyiapkan dokumen PDF True WYSIWYG...');
    let finalFileName = sanitizePdfFileName(fileName);
    let blob: Blob;

    if (onGenerateWaPdf) {
      const customRes = await onGenerateWaPdf();
      blob = customRes instanceof Blob ? customRes : customRes.blob;
      if (!(customRes instanceof Blob) && customRes.fileName && fileName === sanitizePdfFileName(defaultFileName)) {
        finalFileName = sanitizePdfFileName(customRes.fileName);
      }
    } else {
      const containerEl = resolvePrintContainerEl();
      const captured = await capturePrintSheetsToPdfBlob(containerEl, {
        orientation,
        fileName: finalFileName,
        scale: 2,
      });
      blob = captured.blob;
      finalFileName = captured.fileName;
    }

    const base64 = await blobToBase64(blob);
    return { blob, base64, fileName: finalFileName, sizeBytes: blob.size };
  };

  const collectFinalTargets = (): SelectedWaRecipient[] | null => {
    const targetsToSend: SelectedWaRecipient[] = [...selectedRecipients];
    const typedManual = manualPhone.trim();
    if (typedManual) {
      const digits = typedManual.replace(/\D/g, '');
      if (digits.length < 9) {
        toast.error('Nomor WhatsApp manual minimal 9 digit.');
        return null;
      }
      if (!targetsToSend.some((r) => r.target.replace(/\D/g, '') === digits)) {
        targetsToSend.push({
          key: `manual:${digits}`,
          label: typedManual,
          target: typedManual,
          badge: 'MANUAL',
        });
      }
    }
    if (targetsToSend.length === 0) {
      toast.error('Pilih minimal 1 penerima (Guru, Siswa, Orang Tua, Grup WA, atau Nomor Manual).');
      return null;
    }
    return targetsToSend;
  };

  // Rakit daftar link wa.me untuk penerima yang dipilih saat ini (termasuk input manual bila valid)
  const previewTargets = useMemo(() => {
    const list: SelectedWaRecipient[] = [...selectedRecipients];
    const typedManual = manualPhone.trim();
    const typedDigits = typedManual ? normalizePhoneToWaMeDigits(typedManual) : null;
    if (typedDigits && !list.some((r) => normalizePhoneToWaMeDigits(r.target) === typedDigits)) {
      list.push({
        key: `manual:${typedDigits}`,
        label: typedManual,
        target: typedManual,
        badge: 'MANUAL',
      });
    }
    return list;
  }, [selectedRecipients, manualPhone]);

  const waLinkTargets = useMemo(() => {
    const resolvedFileName = sanitizePdfFileName(fileName);
    const defaultMessage = caption.trim()
      ? `${caption.trim()}\n\n(Lampiran dokumen: ${resolvedFileName})`
      : `Berikut terlampir dokumen resmi: ${resolvedFileName}`;

    return previewTargets.map((rec) => {
      const digits = normalizePhoneToWaMeDigits(rec.target);
      return {
        ...rec,
        digits,
        waUrl: digits ? buildWaMeLink(digits, defaultMessage) : null,
      };
    });
  }, [previewTargets, caption, fileName]);

  const triggerDownloadPdf = (blob: Blob, finalFileName: string) => {
    const url = URL.createObjectURL(blob);
    setDownloadedPdfInfo((prev) => {
      if (prev?.url) URL.revokeObjectURL(prev.url);
      return { fileName: finalFileName, sizeBytes: blob.size, url };
    });
    const a = document.createElement('a');
    a.href = url;
    a.download = finalFileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Share Sheet HP (Android / iOS modern) atau Unduh PDF + Buka Link WA (WA Web Laptop / WA HP)
  const handleSharePdfMobile = async () => {
    setIsSending(true);
    try {
      const { blob, fileName: finalFileName } = await preparePdf();
      const pdfFile = new File([blob], finalFileName, { type: 'application/pdf' });

      const nav: any = navigator;
      if (typeof nav.canShare === 'function' && nav.canShare({ files: [pdfFile] })) {
        try {
          await nav.share({
            files: [pdfFile],
            title: finalFileName,
            text: caption.trim() || finalFileName,
          });
          toast.success(`Dokumen ${finalFileName} siap dibagikan ke WhatsApp Anda.`);
          return;
        } catch (shareErr: any) {
          if (shareErr?.name === 'AbortError') return;
        }
      }

      triggerDownloadPdf(blob, finalFileName);
      toast.success(`PDF ${finalFileName} terunduh ke perangkat Anda.`);
    } catch (err: any) {
      toast.error(err?.message || 'Gagal menyiapkan dokumen PDF.');
    } finally {
      setIsSending(false);
      setStatusStep('');
    }
  };

  const handlePrepareAndOpenWaLinks = async () => {
    const targetsToSend = collectFinalTargets();
    if (!targetsToSend) return;

    const validPhoneLinks = targetsToSend
      .map((rec) => {
        const digits = normalizePhoneToWaMeDigits(rec.target);
        return { rec, digits };
      })
      .filter((item): item is { rec: SelectedWaRecipient; digits: string } => Boolean(item.digits));

    if (validPhoneLinks.length === 0) {
      toast.error('Link WA hanya mendukung nomor WhatsApp tujuan (bukan grup @g.us).');
      return;
    }

    setIsSending(true);
    try {
      const { blob, fileName: finalFileName, sizeBytes } = await preparePdf();
      triggerDownloadPdf(blob, finalFileName);

      const textBody = caption.trim()
        ? `${caption.trim()}\n\n(Lampiran dokumen: ${finalFileName})`
        : `Berikut terlampir dokumen resmi: ${finalFileName}`;

      // Buka langsung link pertama (aman dari popup blocker); bila lebih dari 1, semua link tersedia di daftar siap klik
      const first = validPhoneLinks[0];
      const firstUrl = buildWaMeLink(first.digits, textBody);
      window.open(firstUrl, '_blank', 'noopener,noreferrer');
      setOpenedWaKeys((prev) => new Set(prev).add(first.rec.key));

      if (validPhoneLinks.length === 1) {
        toast.success(
          `PDF (${formatFileSize(sizeBytes)}) terunduh & Link WA dibuka. Tinggal lampirkan ${finalFileName} di chat WA Web / WA HP Anda.`,
          { duration: 6000 },
        );
      } else {
        toast.success(
          `PDF (${formatFileSize(sizeBytes)}) terunduh & Link WA pertama dibuka. Klik tombol "Buka WA" pada ${validPhoneLinks.length - 1} penerima lainnya di bawah.`,
          { duration: 7000 },
        );
      }
    } catch (err: any) {
      toast.error(err?.message || 'Gagal menyiapkan dokumen PDF & Link WA.');
    } finally {
      setIsSending(false);
      setStatusStep('');
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();

    if (senderMode === 'WA_LINK') {
      await handlePrepareAndOpenWaLinks();
      return;
    }

    const targetsToSend = collectFinalTargets();
    if (!targetsToSend) return;

    if (senderMode === 'USER' && !userSessionReady) {
      toast.error('Silakan klik "Scan QR WA Saya" terlebih dahulu atau pilih metode Link WA.');
      setShowUserQrPanel(true);
      return;
    }

    setIsSending(true);
    try {
      const { base64, fileName: finalFileName, sizeBytes } = await preparePdf();

      let successCount = 0;
      const failedNames: string[] = [];

      for (let idx = 0; idx < targetsToSend.length; idx++) {
        const rec = targetsToSend[idx];
        setStatusStep(
          targetsToSend.length > 1
            ? `Mengirim (${idx + 1}/${targetsToSend.length}) ke ${rec.label} (${formatFileSize(sizeBytes)})...`
            : `Mengirim ${finalFileName} (${formatFileSize(sizeBytes)}) ke ${rec.label}...`,
        );

        try {
          await sendWaDocument({
            to: rec.target,
            fileBase64: base64,
            fileName: finalFileName,
            mimetype: 'application/pdf',
            caption: caption.trim(),
            senderMode,
          });
          successCount++;
        } catch (sendErr: any) {
          const reason = sendErr?.response?.data?.message || sendErr?.message || 'Gagal';
          failedNames.push(`${rec.label} (${reason})`);
        }
      }

      if (successCount > 0 && failedNames.length === 0) {
        const viaLabel = senderMode === 'USER' ? `WA Saya (${loggedUserName})` : 'WA Sekolah';
        toast.success(
          targetsToSend.length === 1
            ? `Terkirim atas nama ${viaLabel} ke ${targetsToSend[0].label} (${formatFileSize(sizeBytes)}).`
            : `Terkirim atas nama ${viaLabel} ke ${successCount} penerima (${formatFileSize(sizeBytes)}).`,
        );
        onClose();
      } else if (successCount > 0 && failedNames.length > 0) {
        toast.error(
          `Terkirim ke ${successCount} penerima, gagal ke ${failedNames.length}: ${failedNames[0]}`,
          { duration: 6000 },
        );
      } else {
        throw new Error(failedNames[0] || 'Gagal mengirim dokumen ke WhatsApp.');
      }
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        'Gagal mengirim dokumen ke WhatsApp.';
      toast.error(msg, { duration: 5000 });
    } finally {
      setIsSending(false);
      setStatusStep('');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={isSending ? () => {} : onClose}
      disableClose={isSending}
      zIndex={150}
      size="lg"
      title={
        <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
          <MessageCircle className="w-5 h-5" />
          <span>Kirim Dokumen Resmi via WhatsApp</span>
        </div>
      }
    >
      <form onSubmit={handleSend} className="space-y-3.5 text-sm">
        {/* PILIH IDENTITAS PENGIRIM: ATAS NAMA WA SEKOLAH vs LINK WA USER LOGIN */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Kirim Atas Nama Pengirim
            </label>
            <button
              type="button"
              onClick={() => void fetchTargets(true)}
              disabled={isLoadingTargets || isSending}
              className="text-[11px] text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1 cursor-pointer disabled:opacity-40"
              title="Segarkan status WA Sekolah / Gateway"
            >
              <RefreshCw className={`w-3 h-3 ${isLoadingTargets ? 'animate-spin' : ''}`} />
              <span>Segarkan Status</span>
            </button>
          </div>

          <div
            className={`grid grid-cols-1 ${
              ENABLE_PERSONAL_WA_QR_ENGINE ? 'sm:grid-cols-3' : 'sm:grid-cols-2'
            } gap-2`}
          >
            {/* Option 1: Atas Nama WA Sekolah / Platform Gateway */}
            <button
              type="button"
              disabled={isSending}
              onClick={() => setSenderMode('GATEWAY')}
              className={`text-left p-2.5 rounded-xl border transition-all cursor-pointer ${
                senderMode === 'GATEWAY'
                  ? 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/30 ring-1 ring-emerald-500/40'
                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 font-bold text-xs text-slate-800 dark:text-slate-100">
                  <Building2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>WA Sekolah / Gateway</span>
                </div>
                {gatewayReady ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                )}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1 truncate">
                {isLoadingTargets
                  ? 'Memeriksa gateway...'
                  : targetsInfo?.gateway?.connected
                    ? `Kirim langsung (${targetsInfo.gateway.phoneNumber || 'Aktif'})`
                    : targetsInfo?.gateway?.externalActive
                      ? `Aktif (${targetsInfo.gateway.providerName})`
                      : targetsInfo?.gateway?.platformFallbackAvailable
                        ? 'Gateway Platform Pusat siap digunakan'
                        : 'Gateway Sekolah belum ditautkan'}
              </p>
            </button>

            {/* Option 2: Atas Nama WA User yang Login via Link WA (wa.me -> WA Web Laptop / WA HP) */}
            <button
              type="button"
              disabled={isSending}
              onClick={() => setSenderMode('WA_LINK')}
              className={`text-left p-2.5 rounded-xl border transition-all cursor-pointer ${
                senderMode === 'WA_LINK'
                  ? 'border-sky-500 bg-sky-50/70 dark:bg-sky-950/30 ring-1 ring-sky-500/40'
                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 font-bold text-xs text-slate-800 dark:text-slate-100 min-w-0">
                  <Link2 className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0" />
                  <span className="truncate">Link WA • WA Saya ({loggedUserName})</span>
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-sky-600 shrink-0" />
              </div>
              <p className="text-[11px] text-muted-foreground mt-1 truncate">
                Buka via WA Web (laptop) / aplikasi WA (HP)
              </p>
            </button>

            {/* Option 3 (Hidden): Engine Langsung Sesi WA Web / QR Pribadi User */}
            {ENABLE_PERSONAL_WA_QR_ENGINE && (
              <div
                onClick={() => !isSending && setSenderMode('USER')}
                className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                  senderMode === 'USER'
                    ? 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/30 ring-1 ring-emerald-500/40'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-slate-800 dark:text-slate-100 min-w-0">
                    <User className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0" />
                    <span className="truncate">WA Web Engine ({loggedUserName})</span>
                  </div>
                  {userSessionReady ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <QrCode className="w-4 h-4 text-sky-600 shrink-0" />
                  )}
                </div>
                <div className="flex items-center justify-between gap-1.5 mt-1">
                  <span className="text-[11px] text-muted-foreground truncate">
                    {userSessionReady
                      ? `Terhubung (${targetsInfo?.userSession?.phoneNumber || 'Aktif'})`
                      : 'Scan QR WA Web pribadi'}
                  </span>
                  {userSessionReady ? (
                    <button
                      type="button"
                      disabled={isDisconnectingUserQr || isSending}
                      onClick={(ev) => {
                        ev.stopPropagation();
                        void handleDisconnectUserQr();
                      }}
                      className="text-[10.5px] font-semibold text-red-600 hover:underline flex items-center gap-0.5 shrink-0 cursor-pointer"
                      title="Putuskan sesi WA pribadi Anda"
                    >
                      <LogOut className="w-3 h-3" />
                      <span>Putus</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={isConnectingUserQr || isSending}
                      onClick={(ev) => {
                        ev.stopPropagation();
                        setSenderMode('USER');
                        void handleConnectUserQr();
                      }}
                      className="text-[10.5px] font-semibold text-sky-700 dark:text-sky-400 hover:underline shrink-0 cursor-pointer"
                    >
                      {isConnectingUserQr ? 'Memuat QR...' : 'Scan QR Saya'}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Inline QR Scanner Drawer for Logged-in User Personal WA (hanya muncul bila feature flag aktif) */}
          {ENABLE_PERSONAL_WA_QR_ENGINE && senderMode === 'USER' && !userSessionReady && showUserQrPanel && (
            <div className="p-3 rounded-xl border border-sky-200 dark:border-sky-800 bg-sky-50/60 dark:bg-sky-950/30 flex flex-col sm:flex-row items-center gap-3 text-xs">
              {userQr ? (
                <img
                  src={userQr}
                  alt="QR WhatsApp User"
                  className="w-28 h-28 rounded-lg border border-slate-200 bg-white p-1 shrink-0"
                />
              ) : (
                <div className="w-28 h-28 rounded-lg border border-dashed border-sky-300 flex items-center justify-center bg-white/80 shrink-0">
                  <Loader2 className="w-6 h-6 animate-spin text-sky-600" />
                </div>
              )}
              <div className="space-y-1 text-center sm:text-left">
                <div className="font-bold text-slate-800 dark:text-slate-100">
                  Tautkan Akun WhatsApp Anda ({loggedUserName})
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                  Buka WhatsApp di HP Anda → <strong>Perangkat Tertaut → Tautkan Perangkat</strong> lalu scan QR ini.
                  Dokumen akan dikirim langsung memakai nomor WA Anda (bot sekolah tidak membalas chat pribadi Anda).
                </p>
                <div className="flex items-center justify-center sm:justify-start gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => void handleConnectUserQr()}
                    className="text-[11px] font-semibold text-sky-700 dark:text-sky-400 hover:underline cursor-pointer"
                  >
                    Muat Ulang QR
                  </button>
                  <span className="text-slate-300">•</span>
                  <button
                    type="button"
                    onClick={() => setShowUserQrPanel(false)}
                    className="text-[11px] text-slate-500 hover:underline cursor-pointer"
                  >
                    Tutup QR
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Selected Recipients Chips */}
        {selectedRecipients.length > 0 && (
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11.5px] font-semibold text-slate-700 dark:text-slate-300">
                Penerima Dipilih ({selectedRecipients.length})
              </span>
              <button
                type="button"
                onClick={() => setSelectedRecipients([])}
                disabled={isSending}
                className="text-[11px] text-red-600 hover:underline cursor-pointer"
              >
                Kosongkan
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto p-1.5 rounded-lg border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/40 dark:bg-emerald-950/20">
              {selectedRecipients.map((rec) => (
                <span
                  key={rec.key}
                  className="inline-flex items-center gap-1.5 pl-2 pr-1 py-0.5 rounded-md bg-white dark:bg-slate-800 border border-emerald-300 dark:border-emerald-700 text-xs shadow-2xs"
                >
                  <span className={`px-1 py-0.2 rounded text-[9.5px] font-bold ${RECIPIENT_BADGE_MAP[rec.badge] || RECIPIENT_BADGE_MAP.MANUAL}`}>
                    {rec.badge}
                  </span>
                  <span className="font-medium text-slate-800 dark:text-slate-100 max-w-[170px] truncate">
                    {rec.label}
                  </span>
                  <button
                    type="button"
                    disabled={isSending}
                    onClick={() =>
                      setSelectedRecipients((prev) => prev.filter((p) => p.key !== rec.key))
                    }
                    className="p-0.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Tab Sumber Penerima Biodata / Grup / Manual */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
            Pilih Tujuan dari Biodata Sekolah / Grup WA / Manual
          </label>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            {[
              { id: 'GURU' as RecipientTab, label: 'Guru', icon: UserCheck },
              { id: 'SISWA' as RecipientTab, label: 'Siswa', icon: GraduationCap },
              { id: 'ORTU' as RecipientTab, label: 'Orang Tua', icon: HeartHandshake },
              { id: 'GROUP' as RecipientTab, label: `Grup (${activeGroups.length})`, icon: Users },
              { id: 'MANUAL' as RecipientTab, label: 'Manual', icon: Phone },
            ].map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setActiveTab(tab.id);
                    setSearchQuery('');
                  }}
                  disabled={isSending}
                  className={`flex items-center justify-center gap-1 py-1.5 px-1.5 rounded-md text-[11.5px] font-semibold transition-all cursor-pointer ${
                    active
                      ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Konten Tab Direktori Biodata (Guru / Siswa / Orang Tua) */}
          {(activeTab === 'GURU' || activeTab === 'SISWA' || activeTab === 'ORTU') && (
            <div className="space-y-1.5">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  disabled={isSending}
                  placeholder={
                    activeTab === 'GURU'
                      ? 'Cari nama guru, NIP, jabatan, atau nomor WA...'
                      : activeTab === 'SISWA'
                        ? 'Cari nama siswa, kelas, NIS/NISN, atau nomor WA...'
                        : 'Cari nama ayah/ibu/wali, nama siswa, kelas, atau nomor WA...'
                  }
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div className="max-h-40 overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-800 bg-slate-50/50 dark:bg-slate-900/40">
                {isLoadingDirectory ? (
                  <div className="p-4 flex items-center justify-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Memuat data biodata {activeTab === 'ORTU' ? 'Orang Tua/Wali' : activeTab}...</span>
                  </div>
                ) : directoryItems.length === 0 ? (
                  <div className="p-4 text-center text-xs text-muted-foreground">
                    Tidak ditemukan kontak bernomor WA aktif di biodata{' '}
                    {activeTab === 'GURU' ? 'Guru' : activeTab === 'SISWA' ? 'Siswa' : 'Orang Tua/Wali'}
                    {searchQuery ? ` untuk "${searchQuery}"` : ''}.
                  </div>
                ) : (
                  directoryItems.map((item) => {
                    const checked = selectedRecipients.some(
                      (r) => r.key === item.id || r.target === item.normalizedPhone,
                    );
                    return (
                      <button
                        key={item.id}
                        type="button"
                        disabled={isSending}
                        onClick={() =>
                          toggleRecipient({
                            key: item.id,
                            label: `${item.name} (${item.phone})`,
                            target: item.normalizedPhone,
                            badge: item.recipientType,
                          })
                        }
                        className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                          checked
                            ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-900 dark:text-emerald-200'
                            : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200'
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="font-semibold truncate">{item.name}</div>
                          <div className="text-[11px] text-muted-foreground truncate">
                            {item.subtitle}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="font-mono text-[11px] text-slate-600 dark:text-slate-400">
                            {item.phone}
                          </span>
                          <span
                            className={`w-4 h-4 rounded flex items-center justify-center border ${
                              checked
                                ? 'bg-emerald-600 border-emerald-600 text-white'
                                : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900'
                            }`}
                          >
                            {checked && <Check className="w-3 h-3" />}
                          </span>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* Konten Tab Grup WA */}
          {activeTab === 'GROUP' && (
            <div className="space-y-1.5">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  disabled={isSending}
                  placeholder="Cari nama grup WhatsApp..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
              <div className="max-h-40 overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-800 bg-slate-50/50 dark:bg-slate-900/40">
                {filteredGroups.length === 0 ? (
                  <div className="p-4 text-center text-xs text-muted-foreground">
                    {activeGroups.length > 0
                      ? 'Tidak ada grup WhatsApp yang cocok.'
                      : 'Daftar grup tersedia jika WA Sekolah atau WA Saya berstatus Terhubung.'}
                  </div>
                ) : (
                  filteredGroups.map((g) => {
                    const checked = selectedRecipients.some((r) => r.target === g.id);
                    return (
                      <button
                        key={g.id}
                        type="button"
                        disabled={isSending}
                        onClick={() =>
                          toggleRecipient({
                            key: `group:${g.id}`,
                            label: g.subject || g.id,
                            target: g.id,
                            badge: 'GROUP',
                          })
                        }
                        className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                          checked
                            ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-900 dark:text-emerald-200 font-semibold'
                            : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <span className="truncate">{g.subject || g.id}</span>
                        <div className="flex items-center gap-2 shrink-0">
                          {typeof g.participantsCount === 'number' && (
                            <span className="text-[10.5px] text-muted-foreground">
                              {g.participantsCount} anggota
                            </span>
                          )}
                          <span
                            className={`w-4 h-4 rounded flex items-center justify-center border ${
                              checked
                                ? 'bg-emerald-600 border-emerald-600 text-white'
                                : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900'
                            }`}
                          >
                            {checked && <Check className="w-3 h-3" />}
                          </span>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* Konten Tab Nomor WA Manual */}
          {activeTab === 'MANUAL' && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={manualPhone}
                  onChange={(e) => setManualPhone(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && selectedRecipients.length > 0 && manualPhone.trim()) {
                      e.preventDefault();
                      handleAddManualNumber();
                    }
                  }}
                  disabled={isSending}
                  placeholder="Contoh: 081234567890 atau 6281234567890"
                  className="flex-1 px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 outline-none"
                  autoFocus
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddManualNumber}
                  disabled={isSending || !manualPhone.trim()}
                  className="h-8 px-2.5 text-xs gap-1"
                  title="Tambahkan ke daftar penerima"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah</span>
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Format 08xxx otomatis dinormalisasi ke 628xxx.
              </p>
            </div>
          )}
        </div>

        {/* Nama File & Pesan Pengantar */}
        <div className="grid grid-cols-1 gap-2.5 pt-1 border-t border-slate-200 dark:border-slate-800">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-500" />
              <span>Nama File Lampiran (PDF)</span>
            </label>
            <input
              type="text"
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              disabled={isSending}
              placeholder="Dokumen_Resmi.pdf"
              className="w-full px-3 py-1.5 text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Pesan Pengantar (Opsional)
            </label>
            <textarea
              rows={2}
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              disabled={isSending}
              placeholder="Contoh: Yth. Bapak/Ibu, berikut kami lampirkan dokumen resmi..."
              className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 outline-none resize-none"
            />
          </div>
        </div>

        {/* Panel Preview Link WA (Khusus Mode Link WA -> WA Web Laptop / Aplikasi WA HP) */}
        {senderMode === 'WA_LINK' && (
          <div className="p-3 rounded-xl border border-sky-200 dark:border-sky-800/80 bg-sky-50/60 dark:bg-sky-950/25 space-y-2 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="font-bold text-sky-900 dark:text-sky-200 flex items-center gap-1.5">
                <Link2 className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                <span>Daftar Link WhatsApp Siap Buka (WA Web Laptop / WA HP)</span>
              </div>
              {downloadedPdfInfo && (
                <a
                  href={downloadedPdfInfo.url}
                  download={downloadedPdfInfo.fileName}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 hover:underline"
                >
                  <Download className="w-3 h-3" />
                  <span>
                    PDF Terunduh ({formatFileSize(downloadedPdfInfo.sizeBytes)})
                  </span>
                </a>
              )}
            </div>

            {waLinkTargets.length === 0 ? (
              <p className="text-[11px] text-slate-600 dark:text-slate-300">
                Pilih nomor tujuan (Guru / Siswa / Orang Tua / Manual) di atas untuk menyusun link <code className="font-mono">wa.me</code> secara otomatis.
              </p>
            ) : (
              <div className="max-h-32 overflow-y-auto space-y-1.5 pr-0.5">
                {waLinkTargets.map((item) => {
                  const isOpened = openedWaKeys.has(item.key);
                  return (
                    <div
                      key={item.key}
                      className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-slate-800 dark:text-slate-100 truncate">
                          {item.label}
                        </div>
                        <div className="text-[10.5px] font-mono text-slate-500 truncate">
                          {item.waUrl ? `https://wa.me/${item.digits}` : 'Target Grup @g.us hanya tersedia via WA Sekolah / Gateway'}
                        </div>
                      </div>
                      {item.waUrl && (
                        <a
                          href={item.waUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() =>
                            setOpenedWaKeys((prev) => new Set(prev).add(item.key))
                          }
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold shrink-0 transition-colors ${
                            isOpened
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                              : 'bg-sky-600 hover:bg-sky-700 text-white'
                          }`}
                        >
                          {isOpened ? (
                            <>
                              <Check className="w-3 h-3" />
                              <span>Terbuka</span>
                            </>
                          ) : (
                            <>
                              <ExternalLink className="w-3 h-3" />
                              <span>Buka WA</span>
                            </>
                          )}
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <p className="text-[10.5px] text-slate-600 dark:text-slate-400 leading-relaxed">
              Klik tombol biru di bawah untuk <strong>mengunduh PDF</strong> dan langsung membuka link WA tujuan (otomatis ke <strong>WA Web</strong> di laptop atau aplikasi <strong>WhatsApp</strong> di HP), lalu lampirkan file PDF tersebut di ruang chat.
            </p>
          </div>
        )}

        {/* Progress Indicator */}
        {isSending && statusStep && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-xs text-blue-700 dark:text-blue-300">
            <Loader2 className="w-4 h-4 animate-spin shrink-0" />
            <span>{statusStep}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void handleSharePdfMobile()}
            disabled={isSending}
            className="text-xs gap-1.5 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
            title="Unduh file PDF atau bagikan langsung lewat menu Share di HP"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Unduh / Share PDF</span>
          </Button>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isSending}
            >
              Batal
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSending}
              className={`${
                senderMode === 'WA_LINK'
                  ? 'bg-sky-600 hover:bg-sky-700'
                  : 'bg-emerald-600 hover:bg-emerald-700'
              } text-white gap-1.5 font-semibold`}
            >
              {isSending ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Memproses...</span>
                </>
              ) : senderMode === 'WA_LINK' ? (
                <>
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>
                    Unduh PDF &amp; Buka Link WA
                    {previewTargets.length > 0 ? ` (${previewTargets.length})` : ''}
                  </span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>
                    {senderMode === 'USER' ? 'Kirim Pakai WA Web' : 'Kirim Pakai WA Sekolah'}
                    {selectedRecipients.length > 0 ? ` (${selectedRecipients.length})` : ''}
                  </span>
                </>
              )}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
};

export interface SendDocumentWaButtonProps {
  targetRef?: React.RefObject<HTMLElement | null>;
  targetSelector?: string;
  orientation?: 'portrait' | 'landscape';
  defaultFileName?: string;
  defaultCaption?: string;
  defaultRecipient?: string;
  onGenerateWaPdf?: WaCustomPdfGenerator;
  label?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Tombol + Modal "Kirim WA" mandiri untuk modal cetak kustom yang belum memakai UniversalDocumentModal.
 */
export const SendDocumentWaButton: React.FC<SendDocumentWaButtonProps> = ({
  targetRef,
  targetSelector,
  orientation = 'portrait',
  defaultFileName,
  defaultCaption,
  defaultRecipient,
  onGenerateWaPdf,
  label = 'Kirim WA',
  className = '',
  size = 'sm',
}) => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size={size}
        onClick={() => setOpen(true)}
        className={`text-xs gap-1.5 h-8 px-2.5 border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 font-semibold ${className}`}
        title="Kirim file PDF dokumen ini via WhatsApp (Atas Nama WA Sekolah atau WA Saya) ke Guru / Siswa / Orang Tua / Grup"
      >
        <MessageCircle className="w-3.5 h-3.5" />
        <span>{label}</span>
      </Button>

      <SendDocumentWaModal
        isOpen={open}
        onClose={() => setOpen(false)}
        deskRef={targetRef}
        targetSelector={targetSelector}
        orientation={orientation}
        defaultFileName={defaultFileName}
        defaultCaption={defaultCaption}
        defaultRecipient={defaultRecipient}
        onGenerateWaPdf={onGenerateWaPdf}
      />
    </>
  );
};
