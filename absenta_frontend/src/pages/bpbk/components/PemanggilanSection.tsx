import React, { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { bpbkApi, type PemanggilanOrangTua, bpbkQueryKeys } from '../../../api/bpbk.api';
import { uploadSiswaDocument, deleteSiswaDocument, downloadSiswaDocumentFile } from '../../../api/academic/siswa.api';
import { correspondenceApi } from '../../../api/correspondence.api';
import { sekolahApi } from '../../../api/academic/sekolah.api';
import { getTenantById } from '../../../api/tenants.api';
import { getStrukturList, type StrukturOrganisasi } from '../../../api/academic/strukturOrganisasi.api';
import { useAuth } from '../../../hooks/useAuth';
import { generateGenericPdf } from '../../../utils/print/pdfGeneric';
import { Card } from '../../../components/ui/Card';
import { Table } from '../../../components/ui/Table';
import type { Column } from '../../../components/ui/Table';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { SearchableSelect } from '../../../components/ui/SearchableSelect';
import { Loader } from '../../../components/ui/Loader';
import { Badge } from '../../../components/ui/Badge';
import { Label } from '../../../components/ui/Label';
import toast from 'react-hot-toast';
import useConfirm from '../../../hooks/useConfirm';
import { Search, Plus, RotateCcw, Eye, Printer, FileText, Award, Paperclip, Edit2, Trash2 } from 'lucide-react';
import { useDebounce } from '../../../hooks/useDebounce';
import { PemanggilanCard } from './PemanggilanCard';
import { useSystemConfig } from '../../../hooks/useSystemConfig';

const Modal = lazy(() => import('../../../components/ui/Modal').then(m => ({ default: m.Modal })));
const SmartStudentPicker = lazy(() => import('../../../components/common/SmartStudentPicker').then(m => ({ default: m.SmartStudentPicker })));

interface SignaturePadProps {
  onSave: (base64: string | null) => void;
  label: string;
}

const SignaturePad: React.FC<SignaturePadProps> = ({ onSave, label }) => {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isEmpty, setIsEmpty] = useState(true);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Fill canvas with white background to avoid black background in JPEG
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = '#0f172a'; // slate-900
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, []);

  const getEventCoords = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    
    if ('touches' in e.nativeEvent) {
      if (e.nativeEvent.touches.length === 0) return { x: 0, y: 0 };
      const touch = e.nativeEvent.touches[0];
      return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top
      };
    }
    
    return {
      x: (e as React.MouseEvent).clientX - rect.left,
      y: (e as React.MouseEvent).clientY - rect.top
    };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    setIsEmpty(false);
    const coords = getEventCoords(e);
    ctx.beginPath();
    ctx.moveTo(coords.x, coords.y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (e.cancelable) e.preventDefault();

    const coords = getEventCoords(e);
    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    
    const canvas = canvasRef.current;
    if (canvas) {
      const base64 = canvas.toDataURL('image/jpeg', 0.6);
      onSave(base64);
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setIsEmpty(true);
    onSave(null);
  };

  return (
    <div className="space-y-1 bg-slate-50 dark:bg-slate-900/40 p-2.5 rounded-xl border border-slate-200/50 dark:border-slate-800/60">
      <div className="flex justify-between items-center mb-1">
        <span className="text-[10px] font-black uppercase text-slate-500">{label}</span>
        <button
          type="button"
          onClick={clearCanvas}
          className="text-[10px] font-bold text-slate-400 hover:text-rose-500 flex items-center gap-1 transition-colors"
        >
          <RotateCcw className="w-2.5 h-2.5" /> Bersihkan
        </button>
      </div>
      <canvas
        ref={canvasRef}
        width={350}
        height={90}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        onTouchStart={startDrawing}
        onTouchMove={draw}
        onTouchEnd={stopDrawing}
        className="w-full h-[90px] border border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-lg cursor-crosshair touch-none"
      />
      {isEmpty && (
        <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block text-center pt-0.5">Silakan coret TTD di atas</span>
      )}
    </div>
  );
};

export const PemanggilanSection: React.FC = React.memo(() => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { systemConfig } = useSystemConfig();
  const requireApproval = systemConfig?.bpbk_summons_require_principal_approval ?? true;

  const handleOpenDoc = useCallback(async (siswaId: string, docId: string, _fileName: string) => {
    const toastId = toast.loading('Membuka dokumen...');
    try {
      const blob = await downloadSiswaDocumentFile(siswaId, docId);
      const pdfBlob = new Blob([blob], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(pdfBlob);
      const tab = window.open(url, '_blank');
      if (!tab) {
        toast.error('Popup diblokir browser. Izinkan popup untuk situs ini.', { id: toastId });
      } else {
        toast.success('Dokumen dibuka!', { id: toastId });
        // Clean up after the tab has loaded
        setTimeout(() => window.URL.revokeObjectURL(url), 30000);
      }
    } catch (err: any) {
      toast.error(err.message || 'Gagal membuka dokumen', { id: toastId });
    }
  }, []);

  const [search, setSearch] = useState('');
  
  const { data: strukturRes } = useQuery({
    queryKey: ['struktur-organisasi-active'],
    queryFn: () => getStrukturList({ is_active: true }).catch(() => null),
    staleTime: 10 * 60 * 1000,
  });
  const strukturList = useMemo(() => (strukturRes?.success && strukturRes.data) ? strukturRes.data : [], [strukturRes]);

  const debouncedSearch = useDebounce(search, 500);

  const [selectedStatus, setSelectedStatus] = useState('');

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const [sortBy, setSortBy] = useState<string | undefined>(undefined);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const handleSort = useCallback((key: string, order: 'asc' | 'desc') => {
    setSortBy(key);
    setSortOrder(order);
  }, []);

  const confirm = useConfirm();
  const queryClient = useQueryClient();

  // Form states
  const [modalOpen, setModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedSiswa, setSelectedSiswa] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    siswa_id: '',
    tanggal_pemanggilan: new Date().toISOString().split('T')[0],
    waktu_pertemuan: '08.00 WIB',
    tempat_pertemuan: 'Ruang Konseling / BP-BK',
    alasan: ''
  });

  const [editFormData, setEditFormData] = useState({
    tanggal_pertemuan: new Date().toISOString().split('T')[0],
    keterangan_pertemuan: '',
    status: 'HADIR' as any,
    file: null as File | null
  });
  const [parentSig, setParentSig] = useState<string | null>(null);
  const [studentSig, setStudentSig] = useState<string | null>(null);

  const [uploadingDoc, setUploadingDoc] = useState(false);

  // Detail progress wizard modal states
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [detailItem, setDetailItem] = useState<PemanggilanOrangTua | null>(null);

  // ── useQuery: Pemanggilan List ───────────────────────────────────────────
  const { data: pemanggilanRes, isLoading: loading, refetch } = useQuery({
    queryKey: bpbkQueryKeys.pemanggilanList({ page, limit, status: selectedStatus }),
    queryFn: () => bpbkApi.getPemanggilan({ page, limit, status: selectedStatus }),
    staleTime: 5 * 60 * 1000,
  });

  const data = useMemo(() => pemanggilanRes?.data?.list || [], [pemanggilanRes]);
  const totalPages = pemanggilanRes?.data?.pagination?.totalPages || 1;

  const handleMarkSent = useCallback(async (id: string) => {
    try {
      await bpbkApi.updatePemanggilan(id, { status: 'DIKIRIM' });
      toast.success('Surat ditandai sebagai terkirim!');
      queryClient.invalidateQueries({ queryKey: bpbkQueryKeys.all });
      refetch();
    } catch (err: any) {
      toast.error(err?.message || 'Gagal menandai surat terkirim');
    }
  }, [queryClient, refetch]);

  const resetForm = useCallback(() => {
    setFormData({
      siswa_id: '',
      tanggal_pemanggilan: new Date().toISOString().split('T')[0],
      waktu_pertemuan: '08.00 WIB',
      tempat_pertemuan: 'Ruang Konseling / BP-BK',
      alasan: ''
    });
    setSelectedSiswa(null);
    setSelectedId(null);
  }, []);

  const handlePrintDocument = useCallback(async (item: PemanggilanOrangTua, printType: 'letter_bk_call' | 'bk_minutes' | 'bk_statement') => {
    const toastId = toast.loading('Menyiapkan dokumen PDF...');
    try {
      const [sekolah, tenantRes] = await Promise.all([
        sekolahApi.getProfile().catch(() => null),
        user?.tenant_id ? getTenantById(user.tenant_id).catch(() => null) : Promise.resolve(null)
      ]);

      const tenantInfo = tenantRes?.success ? tenantRes.data : null;

      const getBase64 = async (url: string) => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);
        try {
          const res = await fetch(url, { signal: controller.signal });
          clearTimeout(timeoutId);
          const blob = await res.blob();
          return new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
        } catch (err) {
          clearTimeout(timeoutId);
          console.warn('Print fetch logo timed out or failed:', url, err);
          return null;
        }
      };

      const logoDaerahUrl = sekolah?.logo_url || tenantInfo?.logo_url;
      const logoSekolahUrl = tenantInfo?.logo_url;

      const [logoDaerahBase64, logoSekolahBase64] = await Promise.all([
        logoDaerahUrl ? getBase64(logoDaerahUrl) : Promise.resolve(null),
        logoSekolahUrl ? getBase64(logoSekolahUrl) : Promise.resolve(null)
      ]);

      const blob = await generateGenericPdf({
        module: 'bpbk',
        printType,
        selectedClassId: (item.Siswa as any)?.kelas_id || '',
        sekolah,
        tenantInfo,
        strukturList,
        logoDaerahBase64,
        logoSekolahBase64,
        includeSchoolLogo: true,
        selectedStudentId: item.siswa_id,
        isSigned: item.status === 'DIKIRIM',
        eventDetails: {
          nomorSurat: `800 / ${item.Siswa?.nis || '___'} / BK / ${new Date().getFullYear()}`,
          tanggalPertemuan: item.tanggal_pemanggilan,
          waktuPertemuan: item.waktu_pertemuan || undefined,
          tempatPertemuan: item.tempat_pertemuan || undefined,
          agendaPertemuan: item.alasan
        },
        filterData: {
          selectedStudent: item.Siswa,
          classes: item.Siswa?.Kelas ? [item.Siswa.Kelas] : []
        }
      });

      const pdfUrl = URL.createObjectURL(blob);
      window.open(pdfUrl, '_blank');
      toast.success('Dokumen berhasil dibuka!', { id: toastId });
    } catch (e) {
      console.error('Failed to generate PDF:', e);
      toast.error('Gagal mencetak dokumen', { id: toastId });
    }
  }, [user, strukturList]);

  const handleEdit = useCallback((item: PemanggilanOrangTua) => {
    setSelectedId(item.id);
    setSelectedSiswa(item.Siswa || null);
    setParentSig(null);
    setStudentSig(null);
    setEditFormData({
      tanggal_pertemuan: item.tanggal_pertemuan ? new Date(item.tanggal_pertemuan).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      keterangan_pertemuan: item.keterangan_pertemuan || '',
      status: item.status === 'BARU' || item.status === 'DIKIRIM' ? 'HADIR' : item.status,
      file: null
    });
    setEditModalOpen(true);
  }, []);

  const handleDelete = useCallback(async (id: string) => {
    const ok = await confirm({
      title: 'Hapus Surat Pemanggilan',
      description: 'Apakah Anda yakin ingin menghapus surat pemanggilan ini?',
      confirmText: 'Ya, Hapus',
      cancelText: 'Batal',
      style: 'danger'
    });
    if (!ok) return;

    try {
      const res = await bpbkApi.deletePemanggilan(id);
      if (res.success) {
        toast.success('Surat pemanggilan berhasil dihapus');
        queryClient.invalidateQueries({ queryKey: bpbkQueryKeys.all });
        refetch();
      } else {
        toast.error(res.message || 'Gagal menghapus');
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Koneksi bermasalah';
      toast.error(errorMsg);
    }
  }, [confirm, queryClient, refetch]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.siswa_id) {
      toast.error('Harap pilih siswa terlebih dahulu');
      return;
    }
    if (!formData.alasan.trim()) {
      toast.error('Harap isi alasan pemanggilan');
      return;
    }

    try {
      const res = await bpbkApi.createPemanggilan(formData);
      if (res.success) {
        toast.success('Surat pemanggilan orang tua berhasil dibuat');
        
        setModalOpen(false);
        resetForm();
        queryClient.invalidateQueries({ queryKey: bpbkQueryKeys.all });
        refetch();
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Gagal menyimpan pemanggilan';
      toast.error(errorMsg);
    }
  }, [formData, resetForm, queryClient, refetch]);

  const handleEditSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedId) return;

    try {
      setUploadingDoc(true);
      let docId = undefined;

      // 1. Generate and upload digital Berita Acara PDF if screen signatures exist
      if (editFormData.status === 'HADIR' && (parentSig || studentSig)) {
        const toastGenId = toast.loading('Menghasilkan berkas berita acara bertanda-tangan digital...');
        try {
          const [sekolah, tenantRes] = await Promise.all([
            sekolahApi.getProfile().catch(() => null),
            user?.tenant_id ? getTenantById(user.tenant_id).catch(() => null) : Promise.resolve(null)
          ]);
          const tenantInfo = tenantRes?.success ? tenantRes.data : null;

          const getBase64 = async (url: string) => {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 2000);
            try {
              const res = await fetch(url, { signal: controller.signal });
              clearTimeout(timeoutId);
              const blob = await res.blob();
              return new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
              });
            } catch (err) {
              clearTimeout(timeoutId);
              console.warn('Fetch logo timed out or failed:', url, err);
              return null;
            }
          };

          const logoDaerahUrl = sekolah?.logo_url || tenantInfo?.logo_url;
          const logoSekolahUrl = tenantInfo?.logo_url;

          const [logoDaerahBase64, logoSekolahBase64] = await Promise.all([
            logoDaerahUrl ? getBase64(logoDaerahUrl) : Promise.resolve(null),
            logoSekolahUrl ? getBase64(logoSekolahUrl) : Promise.resolve(null)
          ]);

          const summonItem = data.find(d => d.id === selectedId);

          // Idempotency: Delete old document if it exists before uploading new one!
          if (summonItem?.surat_dokumen_id) {
            try {
              // Unlink first to avoid foreign key violation
              await bpbkApi.updatePemanggilan(selectedId, {
                surat_dokumen_id: null as any
              });
              await deleteSiswaDocument(selectedSiswa.id, summonItem.surat_dokumen_id);
            } catch (delErr) {
              console.warn('Failed to delete old document for idempotency:', delErr);
            }
          }

          const pdfBlob = await generateGenericPdf({
            module: 'bpbk',
            printType: 'bk_minutes',
            selectedClassId: selectedSiswa?.kelas_id || '',
            sekolah,
            tenantInfo,
            strukturList,
            logoDaerahBase64,
            logoSekolahBase64,
            includeSchoolLogo: true,
            selectedStudentId: selectedSiswa?.id,
            isSigned: summonItem?.status === 'DIKIRIM',
            studentSignatureBase64: studentSig,
            parentSignatureBase64: parentSig,
            counselorName: user?.full_name || (user as any)?.Guru?.nama_guru || 'Guru BK',
            eventDetails: {
              nomorSurat: `800 / ${selectedSiswa?.nis || '___'} / BK / ${new Date().getFullYear()}`,
              tanggalPertemuan: editFormData.tanggal_pertemuan,
              waktuPertemuan: summonItem?.waktu_pertemuan || undefined,
              tempatPertemuan: summonItem?.tempat_pertemuan || undefined,
              agendaPertemuan: summonItem?.alasan || ''
            },
            filterData: {
              selectedStudent: selectedSiswa,
              classes: selectedSiswa?.Kelas ? [selectedSiswa.Kelas] : []
            }
          });

          const fileName = `Berita_Acara_BK_${selectedSiswa?.nama_siswa?.replace(/\s+/g, '_')}.pdf`;
          const pdfFile = new File([pdfBlob], fileName, { type: 'application/pdf' });

          const uploadRes = (await uploadSiswaDocument(
            selectedSiswa.id,
            pdfFile,
            `Berita Acara BK Digital - ${selectedSiswa.nama_siswa}`,
            'LAPORAN_BK'
          )) as any;
          docId = uploadRes.data?.id;
          toast.success('Berita Acara Digital berhasil dibuat & diunggah!', { id: toastGenId });
        } catch (pdfErr) {
          console.error('Failed to auto-sign PDF:', pdfErr);
          toast.error('Gagal membuat berita acara digital, mencoba menyimpan data saja...', { id: toastGenId });
        }
      } else if (editFormData.file) {
        // Fallback to manual file upload if chosen
        const summonItem = data.find(d => d.id === selectedId);
        if (summonItem?.surat_dokumen_id) {
          try {
            // Unlink first to avoid foreign key violation
            await bpbkApi.updatePemanggilan(selectedId, {
              surat_dokumen_id: null as any
            });
            await deleteSiswaDocument(selectedSiswa.id, summonItem.surat_dokumen_id);
          } catch (delErr) {
            console.warn('Failed to delete old document for idempotency:', delErr);
          }
        }
        const uploadRes = (await uploadSiswaDocument(
          selectedSiswa.id,
          editFormData.file,
          `Bukti Pertemuan Wali - ${selectedSiswa.nama_siswa}`,
          'LAPORAN_BK'
        )) as any;
        docId = uploadRes.data?.id;
      }

      // 2. Update Pemanggilan record
      await bpbkApi.updatePemanggilan(selectedId, {
        tanggal_pertemuan: editFormData.status === 'HADIR' ? new Date(editFormData.tanggal_pertemuan) : undefined,
        keterangan_pertemuan: editFormData.keterangan_pertemuan,
        status: editFormData.status,
        surat_dokumen_id: docId
      });

      toast.success('Hasil pemanggilan berhasil diperbarui');
      setEditModalOpen(false);
      queryClient.invalidateQueries({ queryKey: bpbkQueryKeys.all });
      refetch();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Gagal memperbarui pemanggilan';
      toast.error(errorMsg);
    } finally {
      setUploadingDoc(false);
    }
  }, [selectedId, selectedSiswa, editFormData, parentSig, studentSig, user, data, strukturList, queryClient, refetch]);


  const columns: Column[] = useMemo(() => [
    {
      key: 'tanggal_pemanggilan',
      label: 'Tanggal Panggilan',
      sortable: true,
      render: (value: string) => (
        <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">
          {new Date(value).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
        </span>
      )
    },
    {
      key: 'siswa',
      label: 'Profil Siswa',
      render: (_, item: any) => (
        <div
          className="cursor-pointer group"
          title="Klik untuk melihat profil siswa"
          onClick={() => item.Siswa?.id && navigate(`/academic/siswa?id=${item.Siswa.id}`)}
        >
          <div className="font-bold text-slate-800 dark:text-white text-xs group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors underline-offset-2 group-hover:underline">
            {item.Siswa?.nama_siswa}
          </div>
          <div className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{item.Siswa?.Kelas?.nama_kelas || '-'}</div>
        </div>
      )
    },
    {
      key: 'alasan',
      label: 'Alasan Pemanggilan',
      render: (value: string) => (
        <p className="text-xs font-medium text-slate-600 line-clamp-1 max-w-xs">{value}</p>
      )
    },
    {
      key: 'status',
      label: 'Status',
      render: (value: string) => {
        let variant: 'success' | 'error' | 'info' | 'warning' = 'warning';
        let label = 'Menunggu Persetujuan';

        if (value === 'HADIR') {
          variant = 'success';
          label = 'Selesai (Hadir)';
        } else if (value === 'TIDAK_HADIR') {
          variant = 'error';
          label = 'Tidak Hadir / Mangkir';
        } else if (value === 'DIKIRIM') {
          variant = 'info';
          label = 'Menunggu Orang Tua';
        }

        return (
          <Badge variant={variant} className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md">
            {label}
          </Badge>
        );
      }
    },
    {
      key: 'realisasi',
      label: 'Tanggal Hadir',
      render: (_, item: any) => (
        <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
          {item.tanggal_pertemuan 
            ? new Date(item.tanggal_pertemuan).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
            : '-'
          }
        </span>
      )
    },
    {
      key: 'actions',
      label: 'Aksi',
      render: (_, item: any) => {
        const isFinal = item.status === 'HADIR';

        return (
          <div className="flex gap-1 justify-end">
            {/* Detail Progress Wizard Modal Trigger */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setDetailItem(item);
                setDetailModalOpen(true);
              }}
              className="w-8 h-8 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
              title="Lihat Alur & Detail Progres"
            >
              <Eye size={13} />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => handlePrintDocument(item, 'letter_bk_call')}
              className="w-8 h-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
              title="Cetak Surat Panggilan"
            >
              <Printer size={13} />
            </Button>

            {item.status !== 'BARU' && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handlePrintDocument(item, 'bk_minutes')}
                  className="w-8 h-8 text-teal-600 hover:text-teal-700 hover:bg-teal-50"
                  title="Cetak Berita Acara Pertemuan"
                >
                  <FileText size={13} />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handlePrintDocument(item, 'bk_statement')}
                  className="w-8 h-8 text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                  title="Cetak Surat Pernyataan Wali"
                >
                  <Award size={13} />
                </Button>
              </>
            )}

            {item.Dokumen && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleOpenDoc(item.Siswa?.id || item.siswa_id, item.Dokumen.id, item.Dokumen.file_original_name || 'dokumen.pdf')}
                className="w-8 h-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                title="Lihat Berita Acara Digital"
              >
                <Paperclip size={13} />
              </Button>
            )}

            {!isFinal && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleEdit(item)}
                  className="w-8 h-8 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                  title="Perbarui Hasil & Upload Scan"
                >
                  <Edit2 size={13} />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(item.id)}
                  className="w-8 h-8 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                  title="Hapus Pemanggilan"
                >
                  <Trash2 size={13} />
                </Button>
              </>
            )}
          </div>
        );
      }
    }
  ], [handleEdit, handleDelete, handlePrintDocument, navigate]);

  return (
    <Card className="border border-slate-200/50 dark:border-slate-800/50 bg-white/50 dark:bg-slate-900/50 p-6 rounded-2xl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white">Pemanggilan Orang Tua / Wali Siswa</h3>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Manajemen surat resmi pemanggilan orang tua untuk kasus kedisiplinan dan koordinasi khusus</p>
        </div>
        <Button
          variant="toolbarPrimary"
          size="toolbar"
          onClick={() => { resetForm(); setModalOpen(true); }}
        >
          <Plus className="w-3.5 h-3.5 mr-1" />
          Buat Panggilan
        </Button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div>
          <SearchableSelect
            options={[
              { value: '', label: 'Semua Status Panggilan' },
              { value: 'BARU', label: 'Menunggu' },
              { value: 'DIKIRIM', label: 'Terkirim' },
              { value: 'HADIR', label: 'Orang Tua Hadir' },
              { value: 'TIDAK_HADIR', label: 'Mangkir / Tidak Hadir' }
            ]}
            value={selectedStatus}
             onValueChange={setSelectedStatus}
            placeholder="Status"
            className="h-10 text-xs border-slate-200/60 dark:border-slate-800 rounded-xl"
          />
        </div>
      </div>

      {/* Table */}
      {loading && data.length === 0 ? (
        <div className="py-20 flex flex-col items-center justify-center">
          <Loader className="mb-4" />
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest animate-pulse">Menghubungkan Database Pemanggilan...</p>
        </div>
      ) : (
        <Table
          columns={columns}
          data={data}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSort={handleSort}
          pagination={{
            currentPage: page,
            itemsPerPage: limit,
            totalItems: totalPages * limit,
            totalPages,
            onPageChange: setPage,
            onLimitChange: (limitVal) => {
              setLimit(limitVal);
              setPage(1);
            }
          }}
        />
      )}

      {/* Create Modal */}
      <Suspense fallback={null}>
        <Modal 
          isOpen={modalOpen} 
          onClose={() => { setModalOpen(false); resetForm(); }} 
          title="Buat Pemanggilan Orang Tua Baru" 
          size="lg"
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Pilih Siswa</Label>
              {selectedSiswa ? (
                <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200/50 rounded-xl">
                  <div>
                    <div className="font-bold text-xs text-slate-800 dark:text-slate-200">{selectedSiswa.nama_siswa}</div>
                    <div className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                      {selectedSiswa.Kelas?.nama_kelas || selectedSiswa.kelas_name || '-'} • NIS: {selectedSiswa.nis || '-'}
                    </div>
                  </div>
                  {!selectedId && (
                    <Button 
                      type="button" 
                      variant="ghost" 
                      onClick={() => {
                        setSelectedSiswa(null);
                        setFormData(prev => ({ ...prev, siswa_id: '' }));
                      }}
                      className="text-xs font-black text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 px-3 py-1.5 rounded-lg"
                    >
                      UBAH SISWA
                    </Button>
                  )}
                </div>
              ) : (
                <Suspense fallback={<div className="h-10 bg-slate-100 animate-pulse rounded-xl" />}>
                  <SmartStudentPicker
                    scope="global"
                    onSelect={(s) => {
                      setSelectedSiswa(s);
                      setFormData(prev => ({ ...prev, siswa_id: s.id }));
                    }}
                    mode="siswa"
                    placeholder="Cari nama atau NIS siswa..."
                  />
                </Suspense>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="tanggal-pemanggilan" className="text-xs font-bold uppercase tracking-wider text-slate-500">Tanggal Rencana Pemanggilan</Label>
              <Input
                id="tanggal-pemanggilan"
                type="date"
                value={formData.tanggal_pemanggilan}
                onChange={(e) => setFormData(prev => ({ ...prev, tanggal_pemanggilan: e.target.value }))}
                className="h-10 text-xs border-slate-200/60 dark:border-slate-800 rounded-xl"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="waktu-pertemuan" className="text-xs font-bold uppercase tracking-wider text-slate-500">Waktu / Jam Pertemuan</Label>
                <Input
                  id="waktu-pertemuan"
                  type="text"
                  placeholder="Contoh: 08.00 WIB"
                  value={formData.waktu_pertemuan}
                  onChange={(e) => setFormData(prev => ({ ...prev, waktu_pertemuan: e.target.value }))}
                  className="h-10 text-xs border-slate-200/60 dark:border-slate-800 rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tempat-pertemuan" className="text-xs font-bold uppercase tracking-wider text-slate-500">Tempat Pertemuan</Label>
                <Input
                  id="tempat-pertemuan"
                  type="text"
                  placeholder="Contoh: Ruang Konseling BK"
                  value={formData.tempat_pertemuan}
                  onChange={(e) => setFormData(prev => ({ ...prev, tempat_pertemuan: e.target.value }))}
                  className="h-10 text-xs border-slate-200/60 dark:border-slate-800 rounded-xl"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="alasan-pemanggilan" className="text-xs font-bold uppercase tracking-wider text-slate-500">Alasan Pemanggilan</Label>
              <textarea
                id="alasan-pemanggilan"
                aria-label="Alasan Pemanggilan"
                value={formData.alasan}
                onChange={(e) => setFormData(prev => ({ ...prev, alasan: e.target.value }))}
                placeholder="Tulis alasan resmi (contoh: Poin pelanggaran mencapai 75, ketidakhadiran berturut-turut)..."
                className="w-full min-h-[100px] p-3 text-xs bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
              <Button type="button" variant="toolbarOutline" size="toolbar" onClick={() => { setModalOpen(false); resetForm(); }}>
                Batal
              </Button>
              <Button type="submit" variant="toolbarPrimary" size="toolbar" className="px-6">
                Buat & Terbitkan Surat
              </Button>
            </div>
          </form>
        </Modal>
      </Suspense>

      {/* Edit Result Modal */}
      <Suspense fallback={null}>
        <Modal isOpen={editModalOpen} onClose={() => setEditModalOpen(false)} title="Perbarui Hasil Pertemuan Wali Murid" size="lg">
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div className="p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200/50 rounded-xl">
              <div className="font-bold text-xs">{selectedSiswa?.nama_siswa}</div>
              <div className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{selectedSiswa?.nis}</div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status-kehadiran" className="text-xs font-bold uppercase tracking-wider text-slate-500">Status Kehadiran Orang Tua</Label>
              <SearchableSelect
                id="status-kehadiran"
                options={[
                  { value: 'DIKIRIM', label: 'Surat Terkirim (Belum Menghadap)' },
                  { value: 'HADIR', label: 'Orang Tua Hadir' },
                  { value: 'TIDAK_HADIR', label: 'Mangkir / Tidak Hadir' }
                ]}
                value={editFormData.status}
                 onValueChange={(val) => setEditFormData(prev => ({ ...prev, status: val }))}
                className="h-10 text-xs border-slate-200/60 dark:border-slate-800 rounded-xl"
              />
            </div>

            {editFormData.status === 'HADIR' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="tanggal-pertemuan" className="text-xs font-bold uppercase tracking-wider text-slate-500">Tanggal Pertemuan</Label>
                  <Input
                    id="tanggal-pertemuan"
                    type="date"
                    value={editFormData.tanggal_pertemuan}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, tanggal_pertemuan: e.target.value }))}
                    className="h-10 text-xs border-slate-200/60 dark:border-slate-800 rounded-xl"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="hasil-pertemuan" className="text-xs font-bold uppercase tracking-wider text-slate-500">Hasil Pertemuan / Berita Acara</Label>
                  <textarea
                    id="hasil-pertemuan"
                    aria-label="Hasil Pertemuan / Berita Acara"
                    value={editFormData.keterangan_pertemuan}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, keterangan_pertemuan: e.target.value }))}
                    placeholder="Tulis komitmen hasil pertemuan dengan wali murid..."
                    className="w-full min-h-[100px] p-3 text-xs bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
                  <SignaturePad
                    label="Tanda Tangan Orang Tua / Wali"
                    onSave={setParentSig}
                  />
                  <SignaturePad
                    label="Tanda Tangan Siswa"
                    onSave={setStudentSig}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="scan-bukti-pertemuan" className="text-xs font-bold uppercase tracking-wider text-slate-500">ATAU Unggah Bukti Hasil Scan Berita Acara / Surat Perjanjian (Fisik)</Label>
                  <Input
                    id="scan-bukti-pertemuan"
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={(e) => setEditFormData(prev => ({ ...prev, file: e.target.files?.[0] || null }))}
                    className="text-xs border-slate-200/60 dark:border-slate-800 rounded-xl"
                  />
                </div>
              </>
            )}

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
              <Button type="button" variant="toolbarOutline" size="toolbar" onClick={() => setEditModalOpen(false)}>
                Batal
              </Button>
              <Button type="submit" variant="toolbarPrimary" size="toolbar" className="px-6" disabled={uploadingDoc}>
                {uploadingDoc ? 'Menyimpan & Mengunggah...' : 'Perbarui Hasil'}
              </Button>
            </div>
          </form>
        </Modal>
      </Suspense>
      {/* Detail Progress Modal (Step-Based Wizard) */}
      <Suspense fallback={null}>
        <Modal
          isOpen={detailModalOpen}
          onClose={() => {
            setDetailModalOpen(false);
            setDetailItem(null);
          }}
          title="Detail Progres Pemanggilan Orang Tua"
          size="md"
        >
          {detailItem && (
            <div className="p-1">
              <PemanggilanCard
                item={detailItem}
                requireApproval={requireApproval}
                onMarkSent={async (id) => {
                  await handleMarkSent(id);
                  // Refresh detailed item state in modal
                  setDetailItem(prev => prev ? { ...prev, status: 'DIKIRIM' } : null);
                }}
                onEdit={(item) => {
                  setDetailModalOpen(false);
                  handleEdit(item);
                }}
                onDelete={(id) => {
                  setDetailModalOpen(false);
                  handleDelete(id);
                }}
                onPrint={handlePrintDocument}
                onOpenDoc={handleOpenDoc}
                onNavigate={(siswaId) => {
                  setDetailModalOpen(false);
                  navigate(`/academic/siswa?id=${siswaId}`);
                }}
              />
            </div>
          )}
        </Modal>
      </Suspense>
    </Card>
  );
});


