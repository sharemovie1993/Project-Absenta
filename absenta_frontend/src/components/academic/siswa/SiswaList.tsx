import React, { useState, useEffect, useCallback, useMemo, useRef, Suspense, lazy } from 'react';
import useConfirm from '../../../hooks/useConfirm';
import { Search, RefreshCw, Plus, Edit, Download, Trash2, Users, Eye, History, FileSpreadsheet, Upload, UserPlus, MoreHorizontal, Key, AlertTriangle, X, KeyRound } from 'lucide-react';
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
  Skeleton
} from '../../ui';

// Lazy load Table to improve mobile performance (TBT)
const Table = lazy(() => import('../../ui/Table').then(module => ({ default: module.Table })));
import { SearchableSelect } from '../../ui/SearchableSelect';
import { MobileAcademicList } from '../shared/MobileAcademicList';
import { getStatusBadgeClass, getStatusLabel } from '../../../utils/layoutUtils';
import { getSiswaList, deleteSiswa, deleteAllSiswa, getSiswaDetail, sendParentAccess } from '../../../api/academic/siswa.api';
import { getKelasList } from '../../../api/academic/kelas.api';
import type { Siswa, Kelas } from '../../../types/academic';
import { resetUserPassword, updateUser } from '../../../api/user.api';
import toast from 'react-hot-toast';
import { useAuth } from '../../../hooks/useAuth';
import { useDebounce } from '../../../hooks/useDebounce';
import { useIsMobile } from '../../../hooks/useIsMobile';
import { useJenjang } from '../../../hooks/useJenjang';

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
  onRefresh
}) => {
  const isMobile = useIsMobile();
  const confirm = useConfirm();
  const [siswas, setSiswas] = useState<Siswa[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
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


  const { can, user, hasPermissionCode, isLoading } = useAuth();
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
    const role = (user as any)?.roleName || '';
    return ['ADMIN', 'SUPERADMIN', 'KEPALA_SEKOLAH', 'KURIKULUM', 'KESISWAAN', 'HUBIN'].includes(role);
  }, [user]);

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

  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <Loader size="lg" />
      </div>
    );
  }

  // Check if user can send parent access
  const canSendAccess = can('academic.students.send.access_token');

  const allVisibleSelected = useMemo(() => {
    if (siswas.length === 0) return false;
    return siswas.every(s => selectedIds.has(s.id));
  }, [siswas, selectedIds]);

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

  // Auto-set filter kelas untuk Wali Kelas saat komponen pertama kali dimount
  useEffect(() => {
    // Original logic: set default class if user is a Walas
    if (waliKelasData?.id && !filterKelas) {
      setFilterKelas(waliKelasData.id);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [waliKelasData?.id]);

  // Fetch siswas with debounced search
  const fetchSiswas = useCallback(async (page = 1, search = '') => {
    try {
      setLoading(true);
      const response = await getSiswaList(page, itemsPerPage, search, filterKelas, filterStatus, filterGender, '', filterTingkat);
      
      if (response.success) {
        setSiswas(response.data);
        setTotalPages(response.pagination.totalPages);
        setTotalItems(response.pagination.total);
        setCurrentPage(response.pagination.page);
      } else {
        toast.error('Gagal memuat data siswa');
      }
    } catch (error) {
      console.error('Error fetching siswas:', error);
      toast.error('Terjadi kesalahan saat memuat data siswa');
    } finally {
      setLoading(false);
    }
  }, [itemsPerPage, filterKelas, filterStatus, filterGender, filterTingkat]);

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
        // Reset pagination and selection
        setCurrentPage(1);
        setSelectedIds(new Set());
        fetchSiswas(1, '');
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
  }, [confirm, fetchSiswas, totalItems, onRefresh]);

  const handleSendParentAccess = useCallback(async (siswa: Siswa) => {
    // Check local data if available
    if (siswa.OrangTua && Array.isArray(siswa.OrangTua)) {
      if (siswa.OrangTua.length === 0) {
      toast.error('Siswa belum memiliki data Orang Tua');
        return;
      }
      const hasPhone = siswa.OrangTua.some(p => p.no_hp);
      if (!hasPhone) {
      toast.error('Orang Tua tidak memiliki nomor HP');
        return;
      }
    }

    // Confirm dialog
    const parentName = siswa.OrangTua?.[0]?.nama || 'Orang Tua';
    const parentPhone = siswa.OrangTua?.find(p => p.no_hp)?.no_hp || siswa.OrangTua?.[0]?.no_hp || '';
    
    const ok = await confirm({
      title: 'Kirim Akses Orang Tua',
      description: (
        <div>
          <p>Kirim link akses Parent App ke <strong>{parentName}</strong> {parentPhone ? `(${parentPhone})` : ''}?</p>
          <p className="text-sm text-gray-500 mt-1">Link akan dikirim melalui WhatsApp.</p>
        </div>
      ),
      confirmText: 'Kirim',
      cancelText: 'Batal',
      style: 'primary',
    });

    if (!ok) return;

    try {
      toast('Mengirim akses...', { icon: 'ℹ️' });
      const res = await sendParentAccess(siswa.id);
      if (res.success) {
        if (res.data && res.data.nama && res.data.phone) {
          toast.success(`Akses berhasil dikirim ke ${res.data.nama} (${res.data.phone})`);
        } else {
          toast.success('Akses Orang Tua berhasil dikirim');
        }
      } else {
        toast.error(res.message || 'Gagal mengirim akses');
      }
    } catch (error: any) {
      console.error('Error sending access:', error);
      const msg = error?.response?.data?.message || error?.message || 'Terjadi kesalahan';
      toast.error(msg);
    }
  }, [confirm]);

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
      fetchSiswas(currentPage, searchTerm);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Terjadi kesalahan saat memperbarui kredensial');
    } finally {
      setResettingPassword(false);
    }
  }, [selectedSiswaForReset, emailForReset, newPassword, confirmPassword, currentPage, searchTerm, fetchSiswas]);

  // Reset selected class if it does not belong to the selected tingkat
  useEffect(() => {
    if (filterTingkat && filterKelas) {
      const selectedKelasObj = kelasList.find(k => k.id === filterKelas);
      if (selectedKelasObj && String(selectedKelasObj.tingkat) !== filterTingkat) {
        setFilterKelas('');
      }
    }
  }, [filterTingkat, filterKelas, kelasList]);

  // Effect for search and filters
  useEffect(() => {
    fetchSiswas(1, debouncedSearchTerm);
  }, [debouncedSearchTerm, fetchSiswas]);

  useEffect(() => {
    setPageInput(String(currentPage));
  }, [currentPage]);

  // Refresh when refreshTrigger changes
  useEffect(() => {
    if (refreshTrigger > 0) {
      fetchSiswas(currentPage, debouncedSearchTerm);
    }
  }, [refreshTrigger, fetchSiswas, currentPage, debouncedSearchTerm]);

  // Initial load
  useEffect(() => {
    fetchSiswas();
  }, [fetchSiswas]);

  // Handle page change
  const handlePageChange = useCallback((page: number) => {
    fetchSiswas(page, searchTerm);
  }, [fetchSiswas, searchTerm]);

  const handleItemsPerPageChange = useCallback((value: string) => {
    const n = parseInt(value, 10) || 10;
    setItemsPerPage(n);
    fetchSiswas(1, searchTerm);
  }, [fetchSiswas, searchTerm]);

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
        fetchSiswas(currentPage, searchTerm);
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
  }, [confirm, fetchSiswas, currentPage, searchTerm, onRefresh]);


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
      render: (value: string) => value || '-'
    },
    { 
      key: 'nisn', 
      label: 'NISN',
      sortable: true,
      render: (value: string) => value || '-'
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
  ].filter(Boolean) as any, [canManage, canView, canSendAccess, onEdit, onView, handleDelete, handleSendParentAccess]);

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
      const next = new Set<string>(selectedIds);
      (succeeded || []).forEach(id => next.delete(id));
      setSelectedIds(next);
      fetchSiswas(currentPage, searchTerm);
    } catch (err: any) {
      const msg = err?.message || 'Terjadi kesalahan saat bulk delete';
      toast.error(msg);
    } finally {
      setBulkDeleting(false);
      confirm.setLoading(false);
    }
  }, [selectedIds, siswas, confirm, fetchSiswas, currentPage, searchTerm]);

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
            loading={loading}
            totalItems={totalItems}
            onRefresh={() => fetchSiswas(currentPage, searchTerm)}
            onAdd={onAdd}
            canManage={canManage}
            pagination={{
              currentPage,
              totalPages,
              onPageChange: handlePageChange
            }}
            renderCard={useCallback((siswa: Siswa) => (
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
            ), [onView])}
          />
        ) : (
          <div className="hidden md:block">
            <Suspense fallback={<div className="p-8 flex justify-center"><Loader /></div>}>
              <Table 
              columns={columns} 
              data={siswas} 
              loading={loading}
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
                        size="toolbarIcon"
                        onClick={() => fetchSiswas(currentPage, searchTerm)}
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
                  </div>
                </div>
              }
              toolbarRight={
                selectedIds.size > 0 && canManage && (
                  <div className="p-4">
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
                      Hapus Terpilih ({selectedIds.size})
                    </Button>
                  </div>
                )
              }
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
    </div>
  );
});

export default SiswaList;
