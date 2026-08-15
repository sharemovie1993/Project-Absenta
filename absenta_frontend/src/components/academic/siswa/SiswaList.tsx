import React, { useState, useCallback, useMemo, useRef, Suspense, lazy, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import useConfirm from '../../../hooks/useConfirm';
import { Search, RefreshCw, Plus, Edit, Download, Trash2, Users, Eye, History, FileSpreadsheet, Upload, UserPlus, MoreHorizontal, Key, AlertTriangle, X, KeyRound, LogOut, GraduationCap, CheckSquare, CheckCircle2, AlertCircle, Sparkles, Check, Edit2, Zap, Camera, Wrench, Copy, ExternalLink, MessageSquare } from 'lucide-react';
import { 
  Button, 
  Input, 
  Modal, 
  Badge, 
  Loader,
  Card,
  CardContent,
  Checkbox,
  ModalFooter,
  SectionCard,
  Skeleton,
  Label,
  Textarea,
  Alert,
  AlertDescription
} from '../../ui';

import { SearchableSelect } from '../../ui/SearchableSelect';
import { useCapabilities } from '../../../hooks/useCapabilities';
import { MobileAcademicList } from '../shared/MobileAcademicList';
import { QuickEditCell } from '../shared/QuickEditCell';
import { ExpressRfidPairingModal } from '../shared/ExpressRfidPairingModal';
import { ExpressPhotoStudioModal } from '../shared/ExpressPhotoStudioModal';
import { ToolsModal, type ToolKey } from '../../shared/ToolsModal';
import { WaNormalizationModal } from '../../shared/WaNormalizationModal';
import { getStatusBadgeClass, getStatusLabel } from '../../../utils/layoutUtils';
import { getSiswaList, deleteSiswa, deleteAllSiswa, getSiswaDetail, sendParentAccess, bulkUpdateStatus, generateNisMassal, updateSiswa, siswaQueryKeys, normalizeSiswaWaPhones } from '../../../api/academic/siswa.api';
import { NisGenerateWizard } from './NisGenerateWizard';
import { getKelasList } from '../../../api/academic/kelas.api';
import type { Siswa, Kelas } from '../../../types/academic';
import { resetUserPassword, updateUser } from '../../../api/user.api';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../../store/authStore';
import { useDebounce } from '../../../hooks/useDebounce';
import { useIsMobile } from '../../../hooks/useIsMobile';
import { useJenjang } from '../../../hooks/useJenjang';

import { SiswaBulkPasswordModal } from './SiswaBulkPasswordModal';
import { ParentAccessModal, ParentAccessData } from './ParentAccessModal';

// Lazy load Table to improve mobile performance (TBT)
const Table = lazy(() => import('../../ui/Table').then(module => ({ default: module.Table })));

interface SiswaListProps {
  onEdit?: (siswa: Siswa) => void;
  onView?: (siswa: Siswa) => void;
  onAdd?: () => void;
  onImport?: () => void;
  onSync?: () => void;
  onExport?: () => void;
  isExporting?: boolean;
  refreshTrigger?: number;
  onRefresh?: () => void;
  onHistory?: (siswa: Siswa) => void;
}

const SiswaList: React.FC<SiswaListProps> = React.memo(({ 
  onEdit, 
  onView, 
  onAdd,
  onImport,
  onSync,
  onExport,
  isExporting = false,
  refreshTrigger = 0,
  onRefresh,
  onHistory
}) => {
  const isMobile = useIsMobile();
  const confirm = useConfirm();
  const [loading, setLoading] = useState(false); // Operasi aksi saja
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageInput, setPageInput] = useState('1');
  const [deleting, setDeleting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [bulkErrorDetails, setBulkErrorDetails] = useState<{ id: string; name: string; message: string }[]>([]);

  // Reset Password states
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [selectedSiswaForReset, setSelectedSiswaForReset] = useState<Siswa | null>(null);
  const [emailForReset, setEmailForReset] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [bulkErrorModalOpen, setBulkErrorModalOpen] = useState(false);
  const [isRfidPairingOpen, setIsRfidPairingOpen] = useState(false);
  const [isPhotoStudioOpen, setIsPhotoStudioOpen] = useState(false);
  const [isToolsOpen, setIsToolsOpen] = useState(false);
  const [isWaNormalizeOpen, setIsWaNormalizeOpen] = useState(false);
  const [isBulkPasswordOpen, setIsBulkPasswordOpen] = useState(false);

  // State Modal Copy-Paste Magic Token & Link Akses Ortu
  const [parentAccessModalData, setParentAccessModalData] = useState<{
    isOpen: boolean;
    siswaName: string;
    parentName: string;
    parentPhone: string;
    token: string;
    loginLink: string;
    rawMessage: string;
    waSent: boolean;
    waError: string;
  } | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const handleCopyText = (text: string, fieldLabel: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(fieldLabel);
    toast.success(`${fieldLabel} berhasil disalin!`);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Bulk Class Change States
  const [isBulkClassModalOpen, setIsBulkClassModalOpen] = useState(false);
  const [selectedBulkClassId, setSelectedBulkClassId] = useState('');
  const [bulkClassUpdating, setBulkClassUpdating] = useState(false);
  
  // States untuk Analitis & Validasi Data Siswa
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  const [isAnalysing, setIsAnalysing] = useState(false);
  const [isNisWizardOpen, setIsNisWizardOpen] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [analysisStepText, setAnalysisStepText] = useState('');
  const [analysisResults, setAnalysisResults] = useState<{
    totalChecked: number;
    missingNis: Siswa[];
    missingNisn: Siswa[];
    duplicateNis: { nis: string; students: Siswa[] }[];
    duplicateNisn: { nisn: string; students: Siswa[] }[];
  }>({
    totalChecked: 0,
    missingNis: [],
    missingNisn: [],
    duplicateNis: [],
    duplicateNisn: [],
  });
  const [activeAnalysisTab, setActiveAnalysisTab] = useState<'missingNis' | 'missingNisn' | 'duplicateNis' | 'duplicateNisn'>('missingNis');

  // Handler Pengecekan Kualitas Data (NIS & NISN)
  const handleRunAnalysis = async () => {
    setIsAnalysing(true);
    setAnalysisProgress(0);
    setShowAnalysisModal(true);
    setAnalysisStepText('Menghubungkan ke server dan mengambil data siswa...');

    try {
      setAnalysisProgress(10);
      // Mengambil data maksimal hingga 5000 siswa aktif untuk analisis menyeluruh
      const res = await getSiswaList(1, 5000, '', '', 'AKTIF');
      setAnalysisProgress(35);
      
      const allStudents = res.data || [];
      const totalCount = allStudents.length;

      // 1. Cek NIS Kosong
      setAnalysisStepText('Memeriksa siswa yang belum memiliki NIS...');
      await new Promise(r => setTimeout(r, 200));
      setAnalysisProgress(50);
      const missingNis = allStudents.filter(s => !s.nis || s.nis.trim() === '' || s.nis === '-' || s.nis.startsWith('1111'));

      // 2. Cek NISN Kosong / Tidak Valid
      setAnalysisStepText('Memeriksa format NISN (wajib angka 10-digit)...');
      await new Promise(r => setTimeout(r, 200));
      setAnalysisProgress(65);
      const missingNisn = allStudents.filter(s => {
        const val = s.nisn;
        return !val || val.trim() === '' || val === '-' || !/^\d{10}$/.test(val) || val.startsWith('9999');
      });

      // 3. Cek NIS Ganda
      setAnalysisStepText('Mendeteksi duplikasi NIS di dalam sistem...');
      await new Promise(r => setTimeout(r, 200));
      setAnalysisProgress(80);
      const nisGroups: Record<string, Siswa[]> = {};
      allStudents.forEach(s => {
        const nis = s.nis ? s.nis.trim() : '';
        if (nis && nis !== '-') {
          if (!nisGroups[nis]) nisGroups[nis] = [];
          nisGroups[nis].push(s);
        }
      });
      const duplicateNis = Object.entries(nisGroups)
        .filter(([_, students]) => students.length > 1)
        .map(([nis, students]) => ({ nis, students }));

      // 4. Cek NISN Ganda
      setAnalysisStepText('Mendeteksi duplikasi NISN nasional...');
      await new Promise(r => setTimeout(r, 200));
      setAnalysisProgress(95);
      const nisnGroups: Record<string, Siswa[]> = {};
      allStudents.forEach(s => {
        const nisn = s.nisn ? s.nisn.trim() : '';
        if (nisn && nisn !== '-') {
          if (!nisnGroups[nisn]) nisnGroups[nisn] = [];
          nisnGroups[nisn].push(s);
        }
      });
      const duplicateNisn = Object.entries(nisnGroups)
        .filter(([_, students]) => students.length > 1)
        .map(([nisn, students]) => ({ nisn, students }));

      // Finalisasi progress
      setAnalysisStepText('Menyusun hasil laporan analitik data...');
      await new Promise(r => setTimeout(r, 150));
      setAnalysisProgress(100);

      setAnalysisResults({
        totalChecked: totalCount,
        missingNis,
        missingNisn,
        duplicateNis,
        duplicateNisn,
      });

      // Set tab aktif otomatis ke kategori yang memiliki masalah pertama kali
      if (missingNis.length > 0) setActiveAnalysisTab('missingNis');
      else if (missingNisn.length > 0) setActiveAnalysisTab('missingNisn');
      else if (duplicateNis.length > 0) setActiveAnalysisTab('duplicateNis');
      else if (duplicateNisn.length > 0) setActiveAnalysisTab('duplicateNisn');
      else setActiveAnalysisTab('missingNis');

      setIsAnalysing(false);
      toast.success('Pemeriksaan kualitas data selesai!');
    } catch (err) {
      console.error('Failed to run student data analysis:', err);
      toast.error('Gagal memvalidasi data siswa.');
      setIsAnalysing(false);
      setShowAnalysisModal(false);
    }
  };

  // Mutation & Graduation massal states
  const [isMutationModalOpen, setIsMutationModalOpen] = useState(false);
  const [isGraduationModalOpen, setIsGraduationModalOpen] = useState(false);
  const [mutationDate, setMutationDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [mutationReason, setMutationReason] = useState('');
  const [mutationStatus, setMutationStatus] = useState('PINDAH');
  const [executing, setExecuting] = useState(false);
  
  // Menu states
  const [isToolbarMenuOpen, setIsToolbarMenuOpen] = useState(false);
  const [activeRowId, setActiveRowId] = useState<string | null>(null);

  // Close menus when clicking outside (simple backdrop implementation in render)
  const closeMenus = () => {
    setIsToolbarMenuOpen(false);
    setActiveRowId(null);
  };
  
  // Filter states
  const [filterTingkat, setFilterTingkat] = useState('');
  const [filterKelas, setFilterKelas] = useState('');
  const [filterStatus, setFilterStatus] = useState('AKTIF');
  const [filterGender, setFilterGender] = useState('');
  const [kelasList, setKelasList] = useState<Kelas[]>([]);

  // Filtered class list options based on selected tingkat
  const filteredKelasOptions = useMemo(() => {
    let list = kelasList;
    if (filterTingkat) {
      list = list.filter(k => String(k.tingkat) === filterTingkat);
    }
    return [{ label: 'Semua Kelas', value: '' }, ...list.map(k => ({ label: k.nama_kelas, value: k.id }))];
  }, [kelasList, filterTingkat]);

  const debouncedSearchTerm = useDebounce(searchTerm, 500);


  const { user } = useAuthStore();
  const { can, isAdmin, isKesiswaan, isKurikulum, isKepalaSekolah, isHubin } = useCapabilities();
  const { tingkatList } = useJenjang();
  
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // ── Wali Kelas Detection ──────────────────────────────────────────────────────
  // Deteksi apakah user yang login adalah Wali Kelas berdasarkan guru_profile
  const waliKelasData = useMemo(() => {
    const profile = (user as any)?.guru_profile;
    if (!profile) return null;
    const kelas = profile?.wali_kelas_di;
    if (!kelas?.id) return null;
    return { id: kelas.id, nama: kelas.nama_kelas || kelas.nama || 'Kelas Binaan' };
  }, [user]);

  // Deteksi role manajemen (tidak dibatasi kelas)
  const isManagementRole = useMemo(() => {
    return isAdmin || isKepalaSekolah || isKurikulum || isKesiswaan || isHubin;
  }, [isAdmin, isKepalaSekolah, isKurikulum, isKesiswaan, isHubin]);

  // Wali kelas tanpa role manajemen → filter dikunci ke kelas binaan
  const isWaliKelasLocked = false; // DISABLED: No longer locked to allow teaching scope access

  // Check if user can perform CRUD operations
  const canManage = useMemo(() => {
    return can('academic.students.update');
  }, [can]);

  // Check if user can view
  const canView = useMemo(() => {
    return can('academic.students.view.list');
  }, [can]);

  // Check if user can send parent access
  const canSendAccess = can('academic.students.send.access.token');


  // Fetch kelas list for filter
  useEffect(() => {
    const fetchKelas = async () => {
      try {
        const res = await getKelasList(1, 100);
        if (res.success) {
          setKelasList(res.data);
        }
      } catch (err) {
        console.error('Failed to fetch kelas list', err);
      }
    };
    fetchKelas();
  }, []);

  const queryClient = useQueryClient();
  const invalidateSiswaCache = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['siswa-options-list'] });
    queryClient.invalidateQueries({ queryKey: ['academic-stats'] });
    queryClient.invalidateQueries({ queryKey: ['classmates-roster-list'] });
  }, [queryClient]);
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const urlContext = searchParams.get('context') || searchParams.get('tab') || searchParams.get('mode');

  // Deteksi apakah user memegang Double Jabatan (Wali Kelas + Pimpinan/Struktur Sekolah)
  const isDualRoleUser = useMemo(() => {
    if (!waliKelasData?.id) return false;
    const isLeadershipOrStaff =
      can('academic.students.manage') ||
      can('academic.students.create') ||
      can('dashboard.view.kesiswaan') ||
      can('dashboard.view.kurikulum') ||
      can('dashboard.view.kepsek') ||
      can('dashboard.view.sarpras') ||
      can('dashboard.view.hubin') ||
      isAdmin;
    return isLeadershipOrStaff;
  }, [waliKelasData, can, isAdmin]);

  const isWaliKelasMode = useMemo(() => {
    if (urlContext === 'walikelas') return true;
    if (urlContext === 'sekolah' || urlContext === 'kesiswaan' || urlContext === 'kurikulum') return false;
    if (waliKelasData?.id && !isDualRoleUser) return true;
    return false;
  }, [urlContext, waliKelasData, isDualRoleUser]);

  const handleContextSwitch = useCallback((targetContext: 'walikelas' | 'sekolah') => {
    const params = new URLSearchParams(location.search);
    params.set('context', targetContext);
    navigate({ search: params.toString() }, { replace: true });
  }, [location.search, navigate]);

  // Auto-set filter kelas berdasarkan konteks navigasi (Wali Kelas vs Seluruh Sekolah)
  useEffect(() => {
    if (isWaliKelasMode && waliKelasData?.id) {
      setFilterKelas(waliKelasData.id);
    } else if (urlContext === 'sekolah' || urlContext === 'kesiswaan' || urlContext === 'kurikulum') {
      setFilterKelas('');
    }
  }, [isWaliKelasMode, waliKelasData?.id, urlContext]);

  // ── useQuery: Fetch siswa list ────────────────────────────────────────────
  const { data: listRes, isLoading: isListLoading, refetch } = useQuery({
    queryKey: siswaQueryKeys.list({ 
      page: currentPage, 
      limit: itemsPerPage, 
      search: debouncedSearchTerm, 
      kelas_id: filterKelas, 
      status: filterStatus, 
      gender: filterGender, 
      tingkat: filterTingkat 
    }),
    queryFn: () => getSiswaList(currentPage, itemsPerPage, debouncedSearchTerm, filterKelas, filterStatus, filterGender, '', filterTingkat),
    staleTime: 5 * 60 * 1000,
  });

  const siswas = useMemo(() => listRes?.data || [], [listRes]);
  const totalPages = listRes?.pagination?.totalPages || 1;
  const totalItems = listRes?.pagination?.total || 0;

  const allVisibleSelected = useMemo(() => {
    if (siswas.length === 0) return false;
    return siswas.every(s => selectedIds.has(s.id));
  }, [siswas, selectedIds]);

  // Bulk Class Change Handler
  const handleBulkClassUpdate = useCallback(async () => {
    if (!selectedBulkClassId) {
      toast.error('Pilih kelas tujuan terlebih dahulu');
      return;
    }
    const targetKelas = kelasList.find(k => k.id === selectedBulkClassId);
    const ok = await confirm({
      title: 'Konfirmasi Pindah Kelas Massal',
      description: `Apakah Anda yakin ingin memindahkan ${selectedIds.size} siswa terpilih ke kelas ${targetKelas?.nama_kelas || ''}?`,
      confirmText: 'Pindahkan Kelas',
      cancelText: 'Batal',
      style: 'warning',
    });
    if (!ok) return;

    setBulkClassUpdating(true);
    let successCount = 0;
    let failCount = 0;

    try {
      const ids = Array.from(selectedIds);
      for (const siswaId of ids) {
        try {
          await updateSiswa(siswaId, { kelas_id: selectedBulkClassId });
          successCount++;
        } catch (err) {
          failCount++;
        }
      }

      if (successCount > 0) {
        invalidateSiswaCache();
        toast.success(`${successCount} siswa berhasil dipindahkan ke kelas ${targetKelas?.nama_kelas || ''}!`);
      }
      if (failCount > 0) {
        toast.error(`${failCount} siswa gagal dipindahkan`);
      }

      setIsBulkClassModalOpen(false);
      setSelectedIds(new Set());
      queryClient.invalidateQueries({ queryKey: siswaQueryKeys.all });
      refetch();
    } catch (err: any) {
      toast.error(err?.message || 'Gagal memproses pemindahan kelas');
    } finally {
      setBulkClassUpdating(false);
    }
  }, [selectedBulkClassId, selectedIds, kelasList, confirm, queryClient, refetch, invalidateSiswaCache]);

  const handleDeleteAll = useCallback(async () => {
    const ok = await confirm({
      title: 'Hapus SEMUA Data Siswa?',
      description: (
        <div className="space-y-2">
          <p className="text-red-600 font-bold">PERINGATAN: Tindakan ini tidak dapat dibatalkan!</p>
          <p>Anda akan menghapus <strong>SELURUH ({totalItems})</strong> data siswa di sistem ini, termasuk:</p>
          <ul className="list-disc ml-5 text-sm text-gray-600 dark:text-gray-400">
            <li>Data Profil Siswa & Orang Tua</li>
            <li>Akun User Siswa</li>
            <li>Riwayat Akademik, Absensi, & Pelanggaran</li>
            <li>Template Wajah (Face ID)</li>
          </ul>
          <p>Gunakan fitur ini hanya jika Anda ingin mereset data siswa sepenuhnya.</p>
        </div>
      ),
      confirmText: 'Hapus Semua Data',
      cancelText: 'Batal',
      style: 'danger',
    });

    if (!ok) return;

    // Double confirm for safety
    const doubleOk = await confirm({
      title: 'Konfirmasi Terakhir',
      description: 'Apakah Anda benar-benar yakin? Data yang dihapus tidak dapat dikembalikan.',
      confirmText: 'YA, HAPUS SEMUANYA',
      cancelText: 'Batalkan',
      style: 'danger',
      withProgress: true,
      progressLabel: 'Menghapus seluruh data siswa...',
    });

    if (!doubleOk) return;

    try {
      setLoading(true);
      toast('Sedang menghapus seluruh data siswa...', { icon: 'ℹ️' });
      const res = await deleteAllSiswa();
      if (res.success) {
        toast.success(res.message);
        invalidateSiswaCache();
        // Reset pagination and selection
        setCurrentPage(1);
        setSelectedIds(new Set());
        queryClient.invalidateQueries({ queryKey: siswaQueryKeys.all });
        refetch();
        onRefresh?.();
      } else {
        toast.error(res.message || 'Gagal menghapus data');
      }
    } catch (error: any) {
      console.error('Delete all error:', error);
      toast.error(error?.message || 'Terjadi kesalahan saat menghapus data');
    } finally {
      setLoading(false);
      confirm.setLoading(false);
    }
  }, [confirm, totalItems, queryClient, refetch, invalidateSiswaCache, onRefresh]);

  const handleSendParentAccess = useCallback(async (siswa: Siswa) => {
    try {
      toast('Memproses token & link akses orang tua...', { icon: '🔑' });
      const res = await sendParentAccess(siswa.id);
      if (res.success && res.data) {
        setParentAccessModalData({
          isOpen: true,
          siswaName: siswa.nama_siswa,
          parentName: res.data.nama || siswa.OrangTua?.[0]?.nama || 'Orang Tua',
          parentPhone: res.data.phone || siswa.OrangTua?.[0]?.no_hp || '-',
          token: res.data.token || '',
          loginLink: res.data.loginLink || '',
          rawMessage: res.data.rawMessage || '',
          waSent: !!res.waSent,
          waError: res.waError || '',
        });
        if (res.waSent) {
          toast.success(`Akses berhasil terkirim via WhatsApp ke ${res.data.nama}!`);
        } else {
          toast('Token & Link Magic Ortu berhasil dibuat. (Bisa disalin manual)', { icon: '🔑' });
        }
      } else {
        toast.error(res.message || 'Gagal membuat token akses orang tua');
      }
    } catch (error: any) {
      console.error('Error sending access:', error);
      const msg = error?.response?.data?.message || error?.message || 'Terjadi kesalahan';
      toast.error(msg);
    }
  }, []);

  const handleResetPassword = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSiswaForReset?.user_id) return;

    const originalEmail = selectedSiswaForReset.User?.email || '';
    const isEmailChanged = emailForReset.trim().toLowerCase() !== originalEmail.toLowerCase();
    const isPasswordEntered = newPassword.length > 0;

    if (!isEmailChanged && !isPasswordEntered) {
      toast.error('Tidak ada data yang diubah');
      return;
    }

    if (isPasswordEntered) {
      if (newPassword.length < 6) {
        toast.error('Password baru minimal 6 karakter');
        return;
      }
      if (newPassword !== confirmPassword) {
        toast.error('Konfirmasi password tidak cocok');
        return;
      }
    }

    try {
      setResettingPassword(true);

      // 1. Update Email if changed
      if (isEmailChanged) {
        const emailRes = await updateUser(selectedSiswaForReset.user_id, {
          email: emailForReset.trim().toLowerCase()
        });
        if (!emailRes.success) {
          toast.error(emailRes.message || 'Gagal memperbarui email');
          setResettingPassword(false);
          return;
        }
      }

      // 2. Reset Password if entered
      if (isPasswordEntered) {
        const pwdRes = await resetUserPassword(selectedSiswaForReset.user_id, newPassword);
        if (!pwdRes.success) {
          toast.error(pwdRes.message || 'Gagal mereset password');
          setResettingPassword(false);
          return;
        }
      }

      toast.success(`Kredensial siswa ${selectedSiswaForReset.nama_siswa} berhasil diperbarui`);
      setResetModalOpen(false);
      setNewPassword('');
      setConfirmPassword('');
      queryClient.invalidateQueries({ queryKey: siswaQueryKeys.all });
      refetch();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Terjadi kesalahan saat memperbarui kredensial');
    } finally {
      setResettingPassword(false);
    }
  }, [selectedSiswaForReset, emailForReset, newPassword, confirmPassword, queryClient, refetch]);

  // Reset selected class if it does not belong to the selected tingkat
  useEffect(() => {
    if (filterTingkat && filterKelas) {
      const selectedKelasObj = kelasList.find(k => k.id === filterKelas);
      if (selectedKelasObj && String(selectedKelasObj.tingkat) !== filterTingkat) {
        setFilterKelas('');
      }
    }
  }, [filterTingkat, filterKelas, kelasList]);

  // Reset page input saat currentPage berubah
  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
    setPageInput(String(page));
  }, []);

  const handleItemsPerPageChange = useCallback((value: string) => {
    const n = parseInt(value, 10) || 10;
    setItemsPerPage(n);
    setCurrentPage(1);
  }, []);

  const handlePageJump = useCallback(() => {
    let p = parseInt(pageInput, 10) || 1;
    if (p < 1) p = 1;
    if (p > totalPages) p = totalPages;
    handlePageChange(p);
  }, [pageInput, totalPages, handlePageChange]);

  // Handle delete
  const handleDelete = useCallback(async (siswa: Siswa) => {
    try {
      setLoading(true);
      const detail = await getSiswaDetail(siswa.id);
      const anyDetail: any = detail as any;
      const counts = {
        absenKelas: Number(anyDetail?._count?.AbsenSiswa || 0),
        absenGerbang: Number(anyDetail?._count?.AbsenGerbangSiswa || 0),
        akademik: Number(anyDetail?._count?.SiswaAkademik || 0),
        faceTpl: Number(anyDetail?._count?.SiswaFaceTemplate || 0),
        petugas: 0 
      };
      
      const hasRelated = counts.absenKelas > 0 || counts.absenGerbang > 0 || counts.akademik > 0 || counts.faceTpl > 0;

      const ok = await confirm({
        title: 'Konfirmasi Hapus Siswa',
        description: (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="p-3 rounded-lg border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-slate-900/50">
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Absen Kelas</div>
                <div className="text-sm font-bold text-slate-900 dark:text-slate-100">{counts.absenKelas}</div>
              </div>
              <div className="p-3 rounded-lg border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-slate-900/50">
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Absen Gerbang</div>
                <div className="text-sm font-bold text-slate-900 dark:text-slate-100">{counts.absenGerbang}</div>
              </div>
              <div className="p-3 rounded-lg border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-slate-900/50">
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Akademik</div>
                <div className="text-sm font-bold text-slate-900 dark:text-slate-100">{counts.akademik}</div>
              </div>
              <div className="p-3 rounded-lg border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-slate-900/50">
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Face ID</div>
                <div className="text-sm font-bold text-slate-900 dark:text-slate-100">{counts.faceTpl}</div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-xl">
               <p className="text-sm text-slate-600 dark:text-slate-400">
                 Apakah Anda yakin ingin menghapus siswa <strong>{siswa.nama_siswa}</strong>? 
                 {hasRelated && <span className="block mt-1 text-red-600 dark:text-red-400 font-bold text-xs uppercase tracking-tight">Peringatan: Siswa ini memiliki data terkait yang akan ikut terhapus.</span>}
               </p>
            </div>
            
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Tindakan ini tidak dapat dibatalkan.</p>
          </div>
        ),
        confirmText: 'Hapus Siswa',
        cancelText: 'Batal',
        style: 'danger',
        withProgress: true,
        progressLabel: 'Menghapus data siswa...',
      });

      if (!ok) return;

      setDeleting(true);
      const response = await deleteSiswa(siswa.id);
      
      if (response.success) {
        toast.success(response.message || 'Siswa berhasil dihapus');
        invalidateSiswaCache();
        queryClient.invalidateQueries({ queryKey: siswaQueryKeys.all });
        refetch();
        onRefresh?.();
      } else {
        toast.error(response.message || 'Gagal menghapus siswa');
      }
    } catch (error: any) {
      console.error('Error deleting siswa:', error);
      toast.error(error.response?.data?.message || 'Terjadi kesalahan saat menghapus siswa');
    } finally {
      setDeleting(false);
      setLoading(false);
      confirm.setLoading(false);
    }
  }, [confirm, invalidateSiswaCache, queryClient, refetch, onRefresh]);

  const handleExecuteBulk = useCallback(async (type: 'MUTATION' | 'GRADUATION') => {
    if (!mutationDate) { toast.error('Tanggal wajib diisi.'); return; }
    if (type === 'MUTATION' && !mutationReason) { toast.error('Alasan wajib diisi untuk mutasi.'); return; }
    setExecuting(true);
    try {
      const status = type === 'GRADUATION' ? 'LULUS' : mutationStatus;
      const reason = type === 'GRADUATION' ? 'Lulus Sekolah' : mutationReason;
      await bulkUpdateStatus({ 
        ids: Array.from(selectedIds), 
        status, 
        tanggal: new Date(mutationDate), 
        keterangan: reason 
      });
      toast.success(`Berhasil memproses ${selectedIds.size} siswa.`);
      setSelectedIds(new Set()); 
      setIsMutationModalOpen(false); 
      setIsGraduationModalOpen(false);
      queryClient.invalidateQueries({ queryKey: siswaQueryKeys.all });
      refetch();
      onRefresh?.();
    } catch (e: any) {
      console.error('Error executing bulk status update:', e);
      toast.error(e.response?.data?.message || e.message || 'Gagal memproses data.');
    } finally {
      setExecuting(false);
    }
  }, [mutationDate, mutationReason, mutationStatus, selectedIds, queryClient, refetch, onRefresh]);


  // Format status badge
  const getStatusBadge = (status: string) => {
    const cls = getStatusBadgeClass(status, 'academic');
    const label = getStatusLabel(status, 'academic');
    return <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${cls}`}>{label}</span>;
  };

  // Table columns configuration
  const columns = useMemo(() => [
    { 
      key: 'nama_siswa', 
      label: 'Nama Siswa',
      sortable: true,
      render: (value: string, siswa: Siswa) => (
        <div>
          <div className="font-semibold text-gray-900 dark:text-gray-100">{value}</div>
          <div className="text-xs text-gray-600 dark:text-gray-400">{siswa.User?.email || '-'}</div>
        </div>
      )
    },
    { 
      key: 'nis', 
      label: 'NIS',
      sortable: true,
      render: (value: string, siswa: Siswa) => (
        <QuickEditCell
          value={value}
          placeholder="Tanpa NIS"
          canEdit={canManage}
          tempBadgePrefix="1111"
          onSave={async (newVal) => {
            const res = await updateSiswa(siswa.id, { nis: newVal || null });
            if (res.success) {
              toast.success(`NIS ${siswa.nama_siswa} berhasil diperbarui`);
              queryClient.invalidateQueries({ queryKey: siswaQueryKeys.all });
              refetch();
              onRefresh?.();
            } else {
              toast.error(res.message || 'Gagal memperbarui NIS');
              throw new Error(res.message);
            }
          }}
        />
      )
    },
    { 
      key: 'nisn', 
      label: 'NISN',
      sortable: true,
      render: (value: string, siswa: Siswa) => (
        <QuickEditCell
          value={value}
          placeholder="Tanpa NISN"
          canEdit={canManage}
          tempBadgePrefix="9999"
          onSave={async (newVal) => {
            const res = await updateSiswa(siswa.id, { nisn: newVal || null });
            if (res.success) {
              toast.success(`NISN ${siswa.nama_siswa} berhasil diperbarui`);
              queryClient.invalidateQueries({ queryKey: siswaQueryKeys.all });
              refetch();
              onRefresh?.();
            } else {
              toast.error(res.message || 'Gagal memperbarui NISN');
              throw new Error(res.message);
            }
          }}
        />
      )
    },
    { 
      key: 'jenis_kelamin', 
      label: 'JK',
      render: (value: 'L' | 'P') => value || '-'
    },
    { 
      key: 'Kelas', 
      label: 'Kelas',
      sortable: true,
      render: (kelas: Kelas | null | undefined) => (
        <div>
          <div className="font-semibold text-gray-900 dark:text-gray-100">{kelas?.nama_kelas || '-'}</div>
          {kelas?.tingkat && (
            <div className="text-xs text-gray-600 dark:text-gray-400">Tingkat {kelas.tingkat}</div>
          )}
        </div>
      )
    },
    { 
      key: 'status', 
      label: 'Status',
      render: (value: string) => getStatusBadge(value)
    },
    {
      key: 'no_rfid',
      label: 'No. RFID',
      render: (value: string) => value || '-'
    },
    { 
      key: 'actions', 
      label: 'Aksi', 
      render: (_: unknown, siswa: Siswa) => (
        <div className="flex items-center gap-1">
          {canView && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onView?.(siswa)}
              aria-label="Lihat Detail Siswa"
              className="h-8 w-8 p-0 text-slate-600 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"
            >
              <Eye className="w-4 h-4" />
            </Button>
          )}
          {canManage && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onEdit?.(siswa)}
              aria-label="Edit Data Siswa"
              className="h-8 w-8 p-0 text-slate-600 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20"
            >
              <Edit className="w-4 h-4" />
            </Button>
          )}
          {canSendAccess && (
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                handleSendParentAccess(siswa);
              }}
              aria-label="Kirim Akses Orang Tua"
              className="h-8 w-8 p-0 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20"
            >
              <Key className="w-4 h-4" />
            </Button>
          )}
          {canManage && siswa.user_id && (
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedSiswaForReset(siswa);
                setEmailForReset(siswa.User?.email || '');
                setNewPassword('');
                setConfirmPassword('');
                setResetModalOpen(true);
              }}
              aria-label="Reset Password Siswa"
              className="h-8 w-8 p-0 text-slate-600 hover:text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-900/20"
            >
              <KeyRound className="w-4 h-4" />
            </Button>
          )}
          {onHistory && (
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                onHistory(siswa);
              }}
              aria-label="Riwayat Akademik Siswa"
              className="h-8 w-8 p-0 text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
            >
              <History className="w-4 h-4" />
            </Button>
          )}
          {canManage && (
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                handleDelete(siswa);
              }}
              aria-label="Hapus Data Siswa"
              className="h-8 w-8 p-0 text-slate-600 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      )
    },
  ].filter(Boolean) as any, [canManage, canView, canSendAccess, onEdit, onView, handleDelete, handleSendParentAccess, onHistory]);

  const handleBulkDelete = useCallback(async () => {
    if (selectedIds.size === 0) return;
    try {
      setBulkDeleting(true);
      const ids = Array.from(selectedIds);
      const total = ids.length;
      const succeeded: string[] = [];
      const failed: { id: string; name: string; message: string }[] = [];

      for (let i = 0; i < ids.length; i++) {
        const id = ids[i];
        const siswa = siswas.find(s => s.id === id);
        try {
          const res = await deleteSiswa(id);
          if (!res.success) throw new Error(res.message || 'Gagal menghapus');
          succeeded.push(id);
        } catch (e: any) {
          failed.push({ id, name: siswa?.nama_siswa || id, message: e?.message || 'Gagal menghapus' });
        }
        confirm.setLoading(true, Math.round(((i + 1) / total) * 100));
      }

      if (failed.length > 0) {
        setBulkErrorDetails(failed);
        setBulkErrorModalOpen(true);
        toast(`Berhasil: ${succeeded.length}, Gagal: ${failed.length}`, { icon: '⚠️' });
      } else {
        toast.success(`Berhasil menghapus ${succeeded.length} siswa`);
      }
      if (succeeded.length > 0) {
        invalidateSiswaCache();
      }
      const next = new Set<string>(selectedIds);
      (succeeded || []).forEach(id => next.delete(id));
      setSelectedIds(next);
      queryClient.invalidateQueries({ queryKey: siswaQueryKeys.all });
      refetch();
    } catch (err: any) {
      const msg = err?.message || 'Terjadi kesalahan saat bulk delete';
      toast.error(msg);
    } finally {
      setBulkDeleting(false);
      confirm.setLoading(false);
    }
  }, [selectedIds, siswas, confirm, queryClient, refetch]);

  const renderSiswaMobileCard = useCallback((siswa: Siswa) => (
    <div 
      key={siswa.id}
      role="button"
      tabIndex={0}
      onClick={() => onView?.(siswa)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onView?.(siswa);
        }
      }}
      aria-label={`Lihat detail ${siswa.nama_siswa}`}
      className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl p-4 shadow-sm active:scale-[0.98] transition-transform cursor-pointer"
    >
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <h3 className="font-bold text-slate-900 dark:text-slate-100 leading-tight">{siswa.nama_siswa}</h3>
          <p className="text-[11px] text-slate-600 dark:text-slate-400 font-medium uppercase tracking-tight mt-0.5">
            {siswa.nis || 'Tanpa NIS'} {siswa.nisn ? `(${siswa.nisn})` : ''} • {siswa.Kelas?.nama_kelas || 'Tanpa Kelas'}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          {getStatusBadge(siswa.status)}
        </div>
      </div>
      
      <div className="flex items-center justify-between pt-3 border-t border-slate-50 dark:border-slate-800/50">
        <div className="flex items-center gap-3">
          <div className="flex flex-col">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Gender</span>
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
              {siswa.jenis_kelamin === 'L' ? 'Laki-laki' : 'Perempuan'}
            </span>
          </div>
          {siswa.no_rfid && (
            <div className="flex flex-col">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">RFID</span>
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 font-mono tracking-tighter">
                {siswa.no_rfid}
              </span>
            </div>
          )}
        </div>
        
        <Button
          size="sm"
          variant="ghost"
          onClick={(e) => {
            e.stopPropagation();
            onView?.(siswa);
          }}
          aria-label={`Lihat detail ${siswa.nama_siswa}`}
          className="h-11 px-5 rounded-xl bg-slate-100 dark:bg-slate-800 text-blue-600 font-bold text-[11px] uppercase tracking-wider active:bg-slate-200 dark:active:bg-slate-700"
        >
          Detail
        </Button>
      </div>
    </div>
  ), [onView, getStatusBadge]);

  if (isListLoading) {
    return (
      <div className="flex justify-center p-8">
        <Loader size="lg" />
      </div>
    );
  }

  // Don't render if user doesn't have permission to view
  if (!canView) {
    return (
      <SectionCard title="Akses Ditolak" icon={AlertTriangle}>
        <div className="text-center py-8">
          <p className="text-gray-500 font-medium">Anda tidak memiliki akses untuk melihat data siswa.</p>
        </div>
      </SectionCard>
    );
  }

  return (
    <div className="flex flex-col">
      {/* Backdrop for closing menus */}
      {(isToolbarMenuOpen || activeRowId) && (
        <div className="fixed inset-0 z-10 cursor-default" onClick={closeMenus} aria-hidden="true" />
      )}

      {/* Siswa List Content - Hybrid View */}
      <div className="bg-transparent overflow-hidden">
        {isMobile ? (
          <MobileAcademicList
            title="Direktori Siswa"
            data={siswas}
            loading={isListLoading || loading}
            totalItems={totalItems}
            onRefresh={() => refetch()}
            onAdd={onAdd}
            canManage={canManage}
            pagination={{
              currentPage,
              totalPages,
              onPageChange: handlePageChange
            }}
            renderCard={renderSiswaMobileCard}
          />
        ) : (
          <div className="hidden md:block">
            <Suspense fallback={<div className="p-8 flex justify-center"><Loader /></div>}>
              <Table 
              columns={columns} 
              data={siswas} 
              loading={isListLoading || loading}
              emptyMessage="Tidak ada data siswa"
              compact={true}
              pagination={{
                currentPage,
                totalPages,
                totalItems,
                itemsPerPage,
                onPageChange: handlePageChange,
                onLimitChange: (limit) => {
                  setItemsPerPage(limit);
                  setCurrentPage(1);
                }
              }}
              selectedRowKeys={selectedIds}
              onSelectedRowKeysChange={setSelectedIds}
              toolbarLeft={
                <div className="flex flex-col w-full gap-4 p-4">
                  {/* Context Switcher Pill untuk Dual Role (Wali Kelas + Pimpinan) */}
                  {isDualRoleUser && (
                    <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold shadow-xs w-fit">
                      <button
                        type="button"
                        onClick={() => handleContextSwitch('walikelas')}
                        className={`px-3 py-1.5 rounded-lg transition-all text-xs font-bold cursor-pointer flex items-center gap-1.5 ${
                          isWaliKelasMode
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        <span>🟢</span>
                        <span>Rombel {waliKelasData?.nama || 'Binaan'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleContextSwitch('sekolah')}
                        className={`px-3 py-1.5 rounded-lg transition-all text-xs font-bold cursor-pointer flex items-center gap-1.5 ${
                          !isWaliKelasMode
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        <span>🔵</span>
                        <span>Seluruh Sekolah</span>
                      </button>
                    </div>
                  )}

                  {/* Row 1: Search & Filters */}
                  <div className="flex flex-col md:flex-row gap-4 items-center">
                    <div className="flex-1 w-full">
                      <Input
                        type="text"
                        placeholder="Cari siswa (NIS, Nama, RFID)..."
                        aria-label="Cari siswa"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        leftIcon={<Search className="h-4 w-4 text-gray-400" />}
                        className="h-10 rounded-xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 shadow-sm"
                      />
                    </div>
                    
                    <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
                      <div className="w-full md:w-44">
                        <SearchableSelect
                          value={filterTingkat}
                          onValueChange={setFilterTingkat}
                          options={[
                            { label: 'Semua Tingkat', value: '' },
                            ...tingkatList.map(t => ({ label: `Tingkat ${t}`, value: String(t) }))
                          ]}
                          placeholder="Semua Tingkat"
                          searchPlaceholder="Cari Tingkat..."
                          className="w-full"
                          triggerClassName="h-10 rounded-xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800"
                        />
                      </div>

                      <div className="w-full md:w-48">
                        <SearchableSelect
                          value={filterKelas}
                          onValueChange={setFilterKelas}
                          options={filteredKelasOptions}
                          placeholder="Semua Kelas"
                          searchPlaceholder="Cari Kelas..."
                          className="w-full"
                          triggerClassName="h-10 rounded-xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800"
                        />
                      </div>

                      <div className="w-full md:w-44">
                        <SearchableSelect
                          value={filterStatus}
                          onValueChange={setFilterStatus}
                          options={[
                            { label: 'Semua Status', value: '' },
                            { label: 'Aktif', value: 'AKTIF' },
                            { label: 'Tidak Aktif', value: 'TIDAK_AKTIF' },
                            { label: 'Lulus', value: 'LULUS' },
                            { label: 'Pindah', value: 'PINDAH' },
                            { label: 'Keluar', value: 'KELUAR' }
                          ]}
                          placeholder="Semua Status"
                          searchPlaceholder="Cari Status..."
                          className="w-full"
                          triggerClassName="h-10 rounded-xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800"
                        />
                      </div>

                      <div className="w-full md:w-44">
                        <SearchableSelect
                          value={filterGender}
                          onValueChange={setFilterGender}
                          options={[
                            { label: 'Semua Gender', value: '' },
                            { label: 'Laki-laki', value: 'L' },
                            { label: 'Perempuan', value: 'P' }
                          ]}
                          placeholder="Semua Gender"
                          searchPlaceholder="Cari Gender..."
                          className="w-full"
                          triggerClassName="h-10 rounded-xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Row 2: Secondary Actions */}
                  <div className="flex flex-wrap items-center gap-2 pt-4 border-t border-gray-100 dark:border-gray-800">
                    {canManage && onAdd && (
                        <Button 
                          onClick={onAdd}
                          variant="toolbarPrimary"
                          size="toolbar"
                        >
                          <Plus className="w-4 h-4 mr-1.5" />
                          Tambah Siswa
                        </Button>
                    )}
        
                    {canManage && onImport && (
                        <Button
                          variant="toolbarOutline"
                          size="toolbar"
                          onClick={onImport}
                        >
                          <FileSpreadsheet className="w-3.5 h-3.5 mr-1.5" />
                          Import
                        </Button>
                    )}

                    <Button
                        variant="toolbarOutline"
                        size="toolbar"
                        onClick={onExport}
                        disabled={isExporting}
                        className="rounded-xl"
                      >
                        {isExporting ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                            Exporting...
                          </>
                        ) : (
                          <>
                            <Download className="w-3.5 h-3.5 mr-1.5" />
                            Export
                          </>
                        )}
                      </Button>
        
                    <Button
                      variant="toolbarOutline"
                      size="toolbar"
                      onClick={() => setIsToolsOpen(true)}
                      className="rounded-xl border-indigo-200 hover:bg-indigo-50 dark:border-indigo-900/40 dark:hover:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 font-bold"
                    >
                      <Wrench className="w-3.5 h-3.5 mr-1.5 text-indigo-500" />
                      Tools
                    </Button>
        
                    <Button
                        variant="toolbarOutline"
                        size="toolbarIcon"
                        onClick={() => refetch()}
                        aria-label="Refresh Data"
                        className="rounded-xl"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                      </Button>
        
                    {canManage && (
                        <Button
                          variant="toolbarOutline"
                          size="toolbar"
                          onClick={handleDeleteAll}
                          aria-label="Hapus Seluruh Data Siswa"
                          className="border-red-200 hover:bg-red-50 text-red-600 hover:text-red-700 dark:border-red-900/30 dark:hover:bg-red-900/10 dark:text-red-400 rounded-xl"
                        >
                          <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                          Hapus Semua
                        </Button>
                    )}

                    {/* Bulk actions — tampil hanya saat ada siswa dipilih */}
                    {selectedIds.size > 0 && canManage && (
                      <>
                        <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1" />
                        <Button
                          variant="toolbarDanger"
                          size="toolbar"
                          onClick={async () => {
                            const ok = await confirm({
                              title: 'Hapus Siswa Terpilih',
                              description: `Anda yakin ingin menghapus ${selectedIds.size} siswa terpilih?`,
                              confirmText: 'Hapus',
                              cancelText: 'Batal',
                              style: 'danger',
                              withProgress: true,
                              progressLabel: `Menghapus ${selectedIds.size} siswa...`,
                            });
                            if (ok) await handleBulkDelete();
                          }}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Hapus ({selectedIds.size})
                        </Button>
                        <Button
                          variant="toolbarOutline"
                          size="toolbar"
                          onClick={() => {
                            setSelectedBulkClassId('');
                            setIsBulkClassModalOpen(true);
                          }}
                          className="text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-900/30 bg-blue-50/30 rounded-xl"
                        >
                          <Users className="w-4 h-4 mr-2" />
                          Pindah Kelas ({selectedIds.size})
                        </Button>
                        <Button
                          variant="toolbarOutline"
                          size="toolbar"
                          onClick={() => {
                            setMutationDate(new Date().toISOString().split('T')[0]);
                            setMutationReason('');
                            setMutationStatus('PINDAH');
                            setIsMutationModalOpen(true);
                          }}
                          className="text-orange-600 dark:text-orange-400 border-orange-100 dark:border-orange-900/30 bg-orange-50/30 rounded-xl"
                        >
                          <LogOut className="w-4 h-4 mr-2" />
                          Mutasi ({selectedIds.size})
                        </Button>
                        <Button
                          variant="toolbarOutline"
                          size="toolbar"
                          onClick={() => {
                            setMutationDate(new Date().toISOString().split('T')[0]);
                            setIsGraduationModalOpen(true);
                          }}
                          className="text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/30 bg-emerald-50/30 rounded-xl"
                        >
                          <GraduationCap className="w-4 h-4 mr-2" />
                          Luluskan ({selectedIds.size})
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              }
              toolbarRight={null}
              />
            </Suspense>
          </div>
        )}
      </div>

      <Modal
        isOpen={bulkErrorModalOpen}
        onClose={() => { setBulkErrorModalOpen(false); setBulkErrorDetails([]); }}
        title="Ringkasan Kesalahan Hapus"
        description="Beberapa data tidak dapat dihapus karena pembatasan sistem."
      >
        <div className="space-y-6">
          <div className="bg-slate-50/50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800 p-6 space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="w-10 h-10 bg-rose-100 dark:bg-rose-900/30 rounded-xl flex items-center justify-center text-rose-600 dark:text-rose-400 shadow-sm">
                <AlertTriangle size={20} />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 uppercase tracking-widest">Detail Kegagalan</h3>
                <p className="text-[10px] text-slate-600 dark:text-slate-500 font-bold uppercase tracking-tighter">{bulkErrorDetails.length} Item Bermasalah</p>
              </div>
            </div>

            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-950 max-h-64 overflow-y-auto">
              {bulkErrorDetails.map((e) => (
                <div key={e.id} className="p-3 border-b last:border-b-0 border-slate-100 dark:border-slate-800 flex flex-col gap-1 hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors">
                  <span className="text-[11px] font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight">{e.name}</span>
                  <span className="text-[10px] font-medium text-rose-600 dark:text-rose-400 italic leading-tight">{e.message}</span>
                </div>
              ))}
            </div>
          </div>

          <ModalFooter className="pt-6 border-t border-slate-100 dark:border-slate-800">
            <Button variant="toolbarOutline" size="toolbar" onClick={() => setBulkErrorModalOpen(false)}>
              <X className="w-3.5 h-3.5 mr-2" />
              Tutup Ringkasan
            </Button>
          </ModalFooter>
        </div>
      </Modal>

      <Modal
        isOpen={resetModalOpen}
        onClose={() => setResetModalOpen(false)}
        title="Edit Kredensial Siswa"
        description={`Kelola email akses login dan reset password untuk siswa ${selectedSiswaForReset?.nama_siswa || ''}`}
      >
        <form onSubmit={handleResetPassword} className="space-y-6">
          <div className="bg-slate-50/50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800 p-6 space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="w-10 h-10 bg-sky-100 dark:bg-sky-900/30 rounded-xl flex items-center justify-center text-sky-600 dark:text-sky-400 shadow-sm">
                <KeyRound size={20} />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 uppercase tracking-widest">Kredensial Akun</h3>
                <p className="text-[10px] text-slate-600 dark:text-slate-500 font-bold uppercase tracking-tighter">Email: {selectedSiswaForReset?.User?.email || '-'}</p>
              </div>
            </div>

            <div className="space-y-4">
              <Input
                label="Email Pengguna (Akses Log In)"
                type="email"
                required
                value={emailForReset}
                onChange={(e) => setEmailForReset(e.target.value)}
                placeholder="nama@sekolah.sch.id"
                disabled={resettingPassword}
              />
              <Input
                label="Password Baru (Kosongkan jika tidak diubah)"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimal 6 karakter"
                disabled={resettingPassword}
              />
              <Input
                label="Konfirmasi Password Baru"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Masukkan ulang password baru"
                disabled={resettingPassword}
              />
            </div>
          </div>

          <ModalFooter className="pt-6 border-t border-slate-100 dark:border-slate-800">
            <Button
              variant="toolbarOutline"
              size="toolbar"
              type="button"
              onClick={() => setResetModalOpen(false)}
              disabled={resettingPassword}
            >
              <X className="w-3.5 h-3.5 mr-2" />
              Batal
            </Button>
            <Button
              variant="toolbarPrimary"
              size="toolbar"
              type="submit"
              disabled={resettingPassword}
            >
              {resettingPassword ? (
                <div className="flex items-center">
                  <Loader size="sm" className="mr-2 text-white" />
                  Mereset...
                </div>
              ) : (
                <div className="flex items-center">
                  <KeyRound className="w-3.5 h-3.5 mr-2" />
                  Reset Password
                </div>
              )}
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      {/* Mutation Modal */}
      <Modal 
        isOpen={isMutationModalOpen} 
        onClose={() => setIsMutationModalOpen(false)} 
        title={
          <div className="flex items-center gap-3">
            <div className="p-3 bg-orange-50 dark:bg-orange-900/30 rounded-xl text-orange-600">
              <LogOut size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Proses Mutasi Siswa</h2>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Update Student Academic Status</p>
            </div>
          </div>
        }
        size="lg"
      >
        <div className="space-y-6">
          <div className="bg-orange-50/50 dark:bg-orange-950/20 p-4 rounded-xl border border-orange-100 dark:border-orange-900/30 flex items-center gap-3">
            <div className="h-10 w-10 bg-white dark:bg-slate-900 rounded-xl flex items-center justify-center text-orange-600 shadow-sm font-black text-lg">
              {selectedIds.size}
            </div>
            <div>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Siswa Terpilih</p>
              <p className="text-[10px] text-slate-500 leading-relaxed uppercase tracking-widest font-black">Siap untuk diproses perubahan statusnya</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Jenis Mutasi / Keluar</Label>
              <SearchableSelect 
                triggerClassName="h-10 rounded-xl" 
                value={mutationStatus} 
                onValueChange={setMutationStatus} 
                options={[
                  { label: 'Pindah Sekolah', value: 'PINDAH' }, 
                  { label: 'Undur Diri (Keluar)', value: 'KELUAR' }, 
                  { label: 'Dikeluarkan (DO)', value: 'DO' }, 
                  { label: 'Meninggal Dunia', value: 'MENINGGAL' }
                ]} 
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Tanggal Efektif</Label>
              <Input type="date" value={mutationDate} onChange={e => setMutationDate(e.target.value)} className="h-10 rounded-xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800" />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Alasan / Keterangan <span className="text-red-500">*</span></Label>
            <Textarea 
              placeholder="Berikan alasan detail mutasi atau nomor surat pindah..." 
              value={mutationReason} 
              onChange={e => setMutationReason(e.target.value)} 
              rows={3} 
              className="text-xs rounded-xl border-slate-200 dark:border-slate-800 focus:ring-orange-500" 
            />
          </div>

          <ModalFooter className="pt-6 border-t border-slate-100 dark:border-slate-800">
            <Button variant="ghost" onClick={() => setIsMutationModalOpen(false)} className="rounded-xl font-bold uppercase tracking-widest text-[10px]">Batal</Button>
            <Button 
              variant="danger" 
              onClick={() => handleExecuteBulk('MUTATION')} 
              disabled={executing || !mutationReason}
              className="rounded-xl px-10 shadow-lg shadow-red-100 dark:shadow-none"
            >
              {executing ? <RefreshCw className="animate-spin mr-2" size={16} /> : <LogOut className="mr-2" size={16} />}
              Konfirmasi Mutasi
            </Button>
          </ModalFooter>
        </div>
      </Modal>

      {/* dialog analitik data kualitas nis & nisn */}
      <Modal
        isOpen={showAnalysisModal}
        onClose={() => !isAnalysing && setShowAnalysisModal(false)}
        title={
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-55 dark:bg-indigo-950/40 rounded-2xl text-indigo-600 dark:text-indigo-400">
              <Sparkles size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tight">Analitik Validitas Data</h2>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Integritas & Kualitas Data NIS / NISN</p>
            </div>
          </div>
        }
        size="lg"
      >
        <div className="space-y-6">
          {isAnalysing ? (
            /* tampilan loading progress bar */
            <div className="py-12 flex flex-col items-center justify-center space-y-6">
              <div className="relative flex items-center justify-center">
                <div className="h-16 w-16 rounded-full border-4 border-indigo-100 border-t-indigo-600 animate-spin" />
                <AlertTriangle className="absolute text-indigo-600 animate-pulse" size={24} />
              </div>
              <div className="text-center space-y-2 max-w-sm">
                <p className="text-xs font-black text-slate-700 dark:text-slate-200 uppercase tracking-wide">Sedang Memeriksa Database...</p>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight leading-relaxed animate-pulse">{analysisStepText}</p>
              </div>
              
              {/* Progress Bar Linear */}
              <div className="w-full max-w-md bg-slate-100 dark:bg-slate-800 rounded-full h-3 overflow-hidden shadow-inner relative">
                <div 
                  className="bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-600 h-full rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${analysisProgress}%` }}
                />
              </div>
              <span className="text-xs font-black text-indigo-600 dark:text-indigo-400">{analysisProgress}% Selesai</span>
            </div>
          ) : (
            /* dashboard laporan analitik */
            <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
              
              {/* Grid 4 Statistik Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <button 
                  onClick={() => setActiveAnalysisTab('missingNis')}
                  className={`p-3.5 rounded-2xl border text-left transition-all duration-200 ${
                    activeAnalysisTab === 'missingNis'
                      ? 'border-red-200 bg-red-50/40 dark:border-red-950/40 dark:bg-red-950/20 shadow-sm'
                      : 'border-slate-100 bg-slate-50/20 dark:border-slate-800/40 dark:bg-transparent hover:bg-slate-50/50'
                  }`}
                >
                  <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block">NIS Kosong</span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className={`text-2xl font-black ${analysisResults.missingNis.length > 0 ? 'text-red-650 dark:text-red-400' : 'text-slate-650'}`}>
                      {analysisResults.missingNis.length}
                    </span>
                    {analysisResults.missingNis.length > 0 && <span className="text-[10px] font-black text-red-500 uppercase tracking-tight">Siswa</span>}
                  </div>
                </button>

                <button 
                  onClick={() => setActiveAnalysisTab('missingNisn')}
                  className={`p-3.5 rounded-2xl border text-left transition-all duration-200 ${
                    activeAnalysisTab === 'missingNisn'
                      ? 'border-amber-200 bg-amber-50/40 dark:border-amber-950/40 dark:bg-amber-950/20 shadow-sm'
                      : 'border-slate-100 bg-slate-50/20 dark:border-slate-800/40 dark:bg-transparent hover:bg-slate-50/50'
                  }`}
                >
                  <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block">NISN Invalid</span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className={`text-2xl font-black ${analysisResults.missingNisn.length > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-650'}`}>
                      {analysisResults.missingNisn.length}
                    </span>
                    {analysisResults.missingNisn.length > 0 && <span className="text-[10px] font-black text-amber-500 uppercase tracking-tight">Siswa</span>}
                  </div>
                </button>

                <button 
                  onClick={() => setActiveAnalysisTab('duplicateNis')}
                  className={`p-3.5 rounded-2xl border text-left transition-all duration-200 ${
                    activeAnalysisTab === 'duplicateNis'
                      ? 'border-rose-200 bg-rose-50/40 dark:border-rose-950/40 dark:bg-rose-950/20 shadow-sm'
                      : 'border-slate-100 bg-slate-50/20 dark:border-slate-800/40 dark:bg-transparent hover:bg-slate-50/50'
                  }`}
                >
                  <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block">NIS Ganda</span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className={`text-2xl font-black ${analysisResults.duplicateNis.length > 0 ? 'text-rose-650 dark:text-rose-400' : 'text-slate-650'}`}>
                      {analysisResults.duplicateNis.length}
                    </span>
                    {analysisResults.duplicateNis.length > 0 && <span className="text-[10px] font-black text-rose-500 uppercase tracking-tight">Grup</span>}
                  </div>
                </button>

                <button 
                  onClick={() => setActiveAnalysisTab('duplicateNisn')}
                  className={`p-3.5 rounded-2xl border text-left transition-all duration-200 ${
                    activeAnalysisTab === 'duplicateNisn'
                      ? 'border-rose-200 bg-rose-50/40 dark:border-rose-950/40 dark:bg-rose-950/20 shadow-sm'
                      : 'border-slate-100 bg-slate-50/20 dark:border-slate-800/40 dark:bg-transparent hover:bg-slate-50/50'
                  }`}
                >
                  <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block">NISN Ganda</span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className={`text-2xl font-black ${analysisResults.duplicateNisn.length > 0 ? 'text-rose-650 dark:text-rose-400' : 'text-slate-650'}`}>
                      {analysisResults.duplicateNisn.length}
                    </span>
                    {analysisResults.duplicateNisn.length > 0 && <span className="text-[10px] font-black text-rose-500 uppercase tracking-tight">Grup</span>}
                  </div>
                </button>
              </div>

              {/* Laporan Detail Berdasarkan Tab Terpilih */}
              <div className="bg-slate-50/50 dark:bg-slate-900/10 rounded-2xl border border-slate-100 dark:border-slate-800 p-4 space-y-4">
                
                {/* 1. Detail Tab: NIS Kosong */}
                {activeAnalysisTab === 'missingNis' && (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="text-xs font-black text-slate-700 dark:text-slate-200 uppercase tracking-wide">Daftar Siswa Tanpa NIS</h3>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">Siswa yang tidak memiliki nomor induk sekolah atau masih menggunakan NIS sementara (1111xxxxxx)</p>
                      </div>
                      <span className="px-2 py-1 text-[9px] font-bold bg-slate-100 dark:bg-slate-800 rounded-full text-slate-500 uppercase tracking-widest">
                        {analysisResults.missingNis.length} Siswa
                      </span>
                    </div>

                    {analysisResults.missingNis.length === 0 ? (
                      <div className="py-8 flex flex-col items-center text-center space-y-2">
                        <CheckCircle2 size={36} className="text-emerald-500" />
                        <p className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-tight">Kualitas Data Sempurna!</p>
                        <p className="text-[9px] text-slate-400 uppercase tracking-tight font-bold">Semua siswa aktif sudah memiliki NIS.</p>
                      </div>
                    ) : (
                      <div className="max-h-[260px] overflow-y-auto border border-slate-100/60 dark:border-slate-800/80 rounded-xl bg-white dark:bg-slate-950 scrollbar-thin">
                        <table className="w-full text-xs text-left">
                          <thead className="bg-slate-50 dark:bg-slate-900 text-[9px] font-black text-slate-450 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800">
                            <tr>
                              <th className="px-4 py-2.5">Nama Siswa</th>
                              <th className="px-4 py-2.5">Kelas</th>
                              <th className="px-4 py-2.5">Nilai Saat Ini</th>
                              <th className="px-4 py-2.5 text-right">Aksi</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100/60 dark:divide-slate-800/50">
                            {analysisResults.missingNis.map(siswa => (
                              <tr key={siswa.id} className="hover:bg-slate-50/40 dark:hover:bg-slate-900/30">
                                <td className="px-4 py-3 font-bold text-slate-800 dark:text-slate-200">{siswa.nama_siswa}</td>
                                <td className="px-4 py-3 text-slate-500 font-semibold">{siswa.Kelas?.nama_kelas || '-'}</td>
                                <td className="px-4 py-3 text-red-500 dark:text-red-400 font-black tracking-wider">
                                  {siswa.nis ? (siswa.nis.startsWith('1111') ? 'NIS SEMENTARA (1111)' : `"${siswa.nis}"`) : 'KOSONG'}
                                </td>
                                <td className="px-4 py-3 text-right">
                                  <Button 
                                    variant="ghost" 
                                    size="xs" 
                                    className="h-7 text-[10px] font-bold rounded-lg text-indigo-600 dark:text-indigo-400"
                                    onClick={() => {
                                      setShowAnalysisModal(false);
                                      if (onEdit) onEdit(siswa);
                                    }}
                                  >
                                    <Edit size={11} className="mr-1" /> Edit
                                  </Button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {/* 2. Detail Tab: NISN Kosong / Invalid */}
                {activeAnalysisTab === 'missingNisn' && (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="text-xs font-black text-slate-700 dark:text-slate-200 uppercase tracking-wide">Daftar NISN Tidak Valid / Kosong</h3>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">NISN harus berupa angka dan tepat 10-digit (dan bukan berawalan 9999xxxxxx)</p>
                      </div>
                      <span className="px-2 py-1 text-[9px] font-bold bg-slate-100 dark:bg-slate-800 rounded-full text-slate-500 uppercase tracking-widest">
                        {analysisResults.missingNisn.length} Siswa
                      </span>
                    </div>

                    {analysisResults.missingNisn.length === 0 ? (
                      <div className="py-8 flex flex-col items-center text-center space-y-2">
                        <CheckCircle2 size={36} className="text-emerald-500" />
                        <p className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-tight">Format NISN Bersih!</p>
                        <p className="text-[9px] text-slate-400 uppercase tracking-tight font-bold">Semua siswa aktif sudah memiliki NISN 10-digit valid.</p>
                      </div>
                    ) : (
                      <div className="max-h-[260px] overflow-y-auto border border-slate-100/60 dark:border-slate-800/80 rounded-xl bg-white dark:bg-slate-950 scrollbar-thin">
                        <table className="w-full text-xs text-left">
                          <thead className="bg-slate-50 dark:bg-slate-900 text-[9px] font-black text-slate-450 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800">
                            <tr>
                              <th className="px-4 py-2.5">Nama Siswa</th>
                              <th className="px-4 py-2.5">Kelas</th>
                              <th className="px-4 py-2.5">Nilai Saat Ini</th>
                              <th className="px-4 py-2.5 text-right">Aksi</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100/60 dark:divide-slate-800/50">
                            {analysisResults.missingNisn.map(siswa => (
                              <tr key={siswa.id} className="hover:bg-slate-50/40 dark:hover:bg-slate-900/30">
                                <td className="px-4 py-3 font-bold text-slate-800 dark:text-slate-200">{siswa.nama_siswa}</td>
                                <td className="px-4 py-3 text-slate-500 font-semibold">{siswa.Kelas?.nama_kelas || '-'}</td>
                                <td className="px-4 py-3 text-red-500 dark:text-red-400 font-black tracking-wider">
                                  {siswa.nisn ? (siswa.nisn.startsWith('9999') ? 'NISN SEMENTARA (9999)' : `"${siswa.nisn}" (Bukan 10 Digit)`) : 'KOSONG'}
                                </td>
                                <td className="px-4 py-3 text-right">
                                  <Button 
                                    variant="ghost" 
                                    size="xs" 
                                    className="h-7 text-[10px] font-bold rounded-lg text-indigo-600 dark:text-indigo-400"
                                    onClick={() => {
                                      setShowAnalysisModal(false);
                                      if (onEdit) onEdit(siswa);
                                    }}
                                  >
                                    <Edit size={11} className="mr-1" /> Edit
                                  </Button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {/* 3. Detail Tab: NIS Ganda */}
                {activeAnalysisTab === 'duplicateNis' && (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="text-xs font-black text-slate-700 dark:text-slate-200 uppercase tracking-wide">Duplikasi NIS Terdeteksi</h3>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">Satu nomor induk sekolah tidak boleh dimiliki beberapa siswa</p>
                      </div>
                      <span className="px-2 py-1 text-[9px] font-bold bg-slate-100 dark:bg-slate-800 rounded-full text-slate-500 uppercase tracking-widest">
                        {analysisResults.duplicateNis.length} Grup Duplikat
                      </span>
                    </div>

                    {analysisResults.duplicateNis.length === 0 ? (
                      <div className="py-8 flex flex-col items-center text-center space-y-2">
                        <CheckCircle2 size={36} className="text-emerald-500" />
                        <p className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-tight">Tidak Ada NIS Ganda!</p>
                        <p className="text-[9px] text-slate-400 uppercase tracking-tight font-bold">Semua nomor induk sekolah terdistribusi unik.</p>
                      </div>
                    ) : (
                      <div className="max-h-[260px] overflow-y-auto space-y-3 scrollbar-thin">
                        {analysisResults.duplicateNis.map((group, index) => (
                          <div key={index} className="p-3 bg-white dark:bg-slate-950 rounded-xl border border-rose-100 dark:border-rose-950/40 space-y-2">
                            <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest bg-rose-50 dark:bg-rose-950/20 px-2 py-0.5 rounded-md">
                              NIS Duplikat: {group.nis}
                            </span>
                            <div className="divide-y divide-slate-100/60 dark:divide-slate-800/40">
                              {group.students.map(siswa => (
                                <div key={siswa.id} className="py-2 flex justify-between items-center text-xs">
                                  <div>
                                    <span className="font-bold text-slate-850 dark:text-slate-200 block">{siswa.nama_siswa}</span>
                                    <span className="text-[9px] font-semibold text-slate-400 uppercase">{siswa.Kelas?.nama_kelas || '-'}</span>
                                  </div>
                                  <Button 
                                    variant="ghost" 
                                    size="xs" 
                                    className="h-6 text-[9px] font-bold rounded-lg text-indigo-650 dark:text-indigo-400"
                                    onClick={() => {
                                      setShowAnalysisModal(false);
                                      if (onEdit) onEdit(siswa);
                                    }}
                                  >
                                    Edit
                                  </Button>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* 4. Detail Tab: NISN Ganda */}
                {activeAnalysisTab === 'duplicateNisn' && (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="text-xs font-black text-slate-700 dark:text-slate-200 uppercase tracking-wide">Duplikasi NISN Nasional Terdeteksi</h3>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">Satu NISN unik nasional tidak boleh tertukar atau diduplikasi</p>
                      </div>
                      <span className="px-2 py-1 text-[9px] font-bold bg-slate-100 dark:bg-slate-800 rounded-full text-slate-500 uppercase tracking-widest">
                        {analysisResults.duplicateNisn.length} Grup Duplikat
                      </span>
                    </div>

                    {analysisResults.duplicateNisn.length === 0 ? (
                      <div className="py-8 flex flex-col items-center text-center space-y-2">
                        <CheckCircle2 size={36} className="text-emerald-500" />
                        <p className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-tight">Tidak Ada NISN Ganda!</p>
                        <p className="text-[9px] text-slate-400 uppercase tracking-tight font-bold">Integritas data NISN nasional bersih 100%.</p>
                      </div>
                    ) : (
                      <div className="max-h-[260px] overflow-y-auto space-y-3 scrollbar-thin">
                        {analysisResults.duplicateNisn.map((group, index) => (
                          <div key={index} className="p-3 bg-white dark:bg-slate-950 rounded-xl border border-rose-100 dark:border-rose-950/40 space-y-2">
                            <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest bg-rose-50 dark:bg-rose-950/20 px-2 py-0.5 rounded-md">
                              NISN Duplikat: {group.nisn}
                            </span>
                            <div className="divide-y divide-slate-100/60 dark:divide-slate-800/40">
                              {group.students.map(siswa => (
                                <div key={siswa.id} className="py-2 flex justify-between items-center text-xs">
                                  <div>
                                    <span className="font-bold text-slate-850 dark:text-slate-200 block">{siswa.nama_siswa}</span>
                                    <span className="text-[9px] font-semibold text-slate-400 uppercase">{siswa.Kelas?.nama_kelas || '-'}</span>
                                  </div>
                                  <Button 
                                    variant="ghost" 
                                    size="xs" 
                                    className="h-6 text-[9px] font-bold rounded-lg text-indigo-650 dark:text-indigo-400"
                                    onClick={() => {
                                      setShowAnalysisModal(false);
                                      if (onEdit) onEdit(siswa);
                                    }}
                                  >
                                    Edit
                                  </Button>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

              </div>

              {/* Ringkasan Data yang Diperiksa */}
              <div className="flex justify-between items-center text-[10px] font-black text-slate-400 uppercase tracking-wider px-1">
                <span>Metode Scan: 10-Digit Constraint (NISN)</span>
                <span>Total Data Diperiksa: {analysisResults.totalChecked} Siswa</span>
              </div>

              <ModalFooter className="pt-4 border-t border-slate-100 dark:border-slate-800">
                {analysisResults.missingNis.length > 0 && (
                  <Button
                    onClick={() => {
                      setShowAnalysisModal(false);
                      setIsNisWizardOpen(true);
                    }}
                    className="rounded-xl px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-bold uppercase tracking-widest text-[10px] flex items-center gap-2 shadow-md shadow-indigo-500/20"
                  >
                    <Sparkles size={12} /><span>Generate NIS Massal ({analysisResults.missingNis.length} Siswa)</span>
                  </Button>
                )}
                <Button 
                  onClick={() => setShowAnalysisModal(false)}
                  className="rounded-xl px-8 bg-slate-800 hover:bg-slate-900 text-white font-bold uppercase tracking-widest text-[10px]"
                >
                  Tutup Laporan
                </Button>
              </ModalFooter>

            </div>
          )}
        </div>
      </Modal>

      {/* Graduation Modal */}
      <Modal 
        isOpen={isGraduationModalOpen} 
        onClose={() => setIsGraduationModalOpen(false)} 
        title={
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-50 dark:bg-emerald-900/30 rounded-xl text-emerald-600">
              <GraduationCap size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Proses Kelulusan Massal</h2>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">End of Academic Lifecycle</p>
            </div>
          </div>
        }
        size="md"
      >
        <div className="space-y-6">
          <div className="bg-emerald-50/50 dark:bg-emerald-950/20 p-4 rounded-xl border border-emerald-100 dark:border-emerald-900/30 flex items-center gap-4">
            <div className="h-12 w-12 bg-white dark:bg-slate-900 rounded-xl flex items-center justify-center text-emerald-600 shadow-sm font-black text-xl border-2 border-emerald-100">
              {selectedIds.size}
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200">Siswa akan Diluluskan</p>
              <p className="text-[10px] text-slate-500 leading-relaxed uppercase tracking-widest font-black">Data akan dipindahkan ke arsip alumni</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Tanggal Kelulusan (Ijazah/SKL)</Label>
            <Input type="date" value={mutationDate} onChange={e => setMutationDate(e.target.value)} className="h-11 rounded-xl font-bold bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800" />
          </div>

          <Alert className="bg-amber-50/50 border-amber-100 rounded-xl py-3">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-[10px] font-bold text-amber-700 leading-normal ml-1">
              Tindakan ini permanen. Siswa yang diluluskan tidak dapat lagi melakukan absensi harian dan statusnya akan berubah menjadi TIDAK AKTIF (LULUS).
            </AlertDescription>
          </Alert>

          <ModalFooter className="pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button variant="ghost" onClick={() => setIsGraduationModalOpen(false)} className="rounded-xl font-bold uppercase tracking-widest text-[10px]">Batal</Button>
            <Button 
              onClick={() => handleExecuteBulk('GRADUATION')} 
              disabled={executing}
              className="rounded-xl px-12 bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-100 dark:shadow-none"
            >
              {executing ? <RefreshCw className="animate-spin mr-2" size={16} /> : <CheckSquare className="mr-2" size={16} />}
              Luluskan Sekarang
            </Button>
          </ModalFooter>
        </div>
      </Modal>

      {/* Nis Generate Wizard Modal */}
      <NisGenerateWizard
        isOpen={isNisWizardOpen}
        onClose={() => setIsNisWizardOpen(false)}
        onSuccess={() => {
          refetch();
        }}
      />

      {/* Express RFID Pairing Modal */}
      <ExpressRfidPairingModal
        isOpen={isRfidPairingOpen}
        defaultMode="SISWA"
        onClose={() => setIsRfidPairingOpen(false)}
        onSuccess={() => {
          refetch();
        }}
      />

      {/* Express Photo Studio Modal */}
      <ExpressPhotoStudioModal
        isOpen={isPhotoStudioOpen}
        defaultMode="SISWA"
        onClose={() => setIsPhotoStudioOpen(false)}
        onSuccess={() => {
          refetch();
        }}
      />

      {/* Modal Pindah Kelas Massal */}
      <Modal
        isOpen={isBulkClassModalOpen}
        onClose={() => setIsBulkClassModalOpen(false)}
        title={
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-xl text-blue-600">
              <Users size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Pindah Kelas Massal</h2>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pemindahan Roster Siswa Terpilih</p>
            </div>
          </div>
        }
        size="md"
      >
        <div className="space-y-6">
          <div className="bg-blue-50/50 dark:bg-blue-950/20 p-4 rounded-xl border border-blue-100 dark:border-blue-900/30 flex items-center gap-4">
            <div className="h-12 w-12 bg-white dark:bg-slate-900 rounded-xl flex items-center justify-center text-blue-600 shadow-sm font-black text-xl border-2 border-blue-100">
              {selectedIds.size}
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200">Siswa Terpilih</p>
              <p className="text-[10px] text-slate-500 leading-relaxed uppercase tracking-widest font-black">Akan dipindahkan ke kelas yang ditentukan</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Pilih Kelas Tujuan <span className="text-rose-500">*</span></Label>
            <SearchableSelect
              value={selectedBulkClassId}
              onValueChange={setSelectedBulkClassId}
              options={kelasList.map(k => ({
                label: `${k.nama_kelas} (Tingkat ${k.tingkat})`,
                value: k.id
              }))}
              placeholder="Pilih Kelas Tujuan..."
              searchPlaceholder="Cari Kelas..."
              triggerClassName="h-12 rounded-xl font-bold bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800"
            />
          </div>

          <ModalFooter className="pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button variant="ghost" onClick={() => setIsBulkClassModalOpen(false)} className="rounded-xl font-bold uppercase tracking-widest text-[10px]">Batal</Button>
            <Button
              onClick={handleBulkClassUpdate}
              disabled={bulkClassUpdating || !selectedBulkClassId}
              className="rounded-xl px-10 bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20"
            >
              {bulkClassUpdating ? <Loader className="mr-2" size={16} /> : <Users className="mr-2" size={16} />}
              Pindahkan Sekarang
            </Button>
          </ModalFooter>
        </div>
      </Modal>

      <ToolsModal
        isOpen={isToolsOpen}
        onClose={() => setIsToolsOpen(false)}
        targetType="siswa"
        onSelectTool={(key: ToolKey) => {
          if (key === 'analysis') handleRunAnalysis();
          else if (key === 'generateCode') setIsNisWizardOpen(true);
          else if (key === 'rfidPairing') setIsRfidPairingOpen(true);
          else if (key === 'photoStudio') setIsPhotoStudioOpen(true);
          else if (key === 'waNormalize') setIsWaNormalizeOpen(true);
          else if (key === 'bulkPassword') setIsBulkPasswordOpen(true);
        }}
      />

      <WaNormalizationModal
        isOpen={isWaNormalizeOpen}
        onClose={() => setIsWaNormalizeOpen(false)}
        targetType="siswa"
        onRunNormalization={normalizeSiswaWaPhones}
        onSuccessRefresh={() => refetch()}
      />

      <SiswaBulkPasswordModal
        isOpen={isBulkPasswordOpen}
        onClose={() => setIsBulkPasswordOpen(false)}
        selectedSiswaIds={Array.from(selectedIds)}
        selectedKelasId={filterKelas}
        kelasOptions={kelasList.map(k => ({ label: `${k.nama_kelas} (Tingkat ${k.tingkat})`, value: k.id }))}
        onSuccess={() => refetch()}
      />

      {/* ── Modal Token & Link Magic Login Orang Tua ── */}
      <ParentAccessModal
        data={parentAccessModalData}
        onClose={() => setParentAccessModalData(null)}
      />
    </div>
  );
});

export default SiswaList;
