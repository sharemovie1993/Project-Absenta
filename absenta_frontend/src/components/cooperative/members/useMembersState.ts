import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import api from '../../../lib/axiosInstance';
import toast from 'react-hot-toast';
import type { Student } from '../../common/SmartStudentPicker';
import type { Member, CoopProfile } from './types';
import { fetchCoopSettings } from '../../../utils/cooperative/coopDocUtils';
import { parseImportExcel } from '../../../utils/cooperative/memberDocUtils';
import { useModuleAccess } from '../../../hooks/useModuleAccess';

interface AxiosErrorLike {
  response?: {
    data?: {
      message?: string;
    };
  };
}

interface PickerSelectedEntity {
  id: string;
  _type?: 'siswa' | 'guru';
  nama_siswa?: string;
  nama_guru?: string;
  full_name?: string;
  nip?: string | null;
  nis?: string | null;
  email?: string;
  no_hp?: string;
  alamat?: string;
  user_id?: string;
  User?: {
    email?: string;
  };
}

export const useMembersState = (subscription: any) => {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBulkAddOpen, setIsBulkAddOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);

  // Premium features state variables
  const [coopName, setCoopName] = useState<string>('KOPERASI SEKOLAH');
  const [coopProfile, setCoopProfile] = useState<CoopProfile>({
    legalNo: '',
    address: 'Lingkungan Sekolah',
    phone: '-',
    email: '-',
    website: '-',
  });
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importResults, setImportResults] = useState<{
    successCount: number;
    failCount: number;
    errors: { row: number; memberNo: string; error: string }[];
  } | null>(null);
  const [isTerminateConfirmOpen, setIsTerminateConfirmOpen] = useState(false);
  const [terminatingMember, setTerminatingMember] = useState<Member | null>(null);
  const [isBulkPrinting, setIsBulkPrinting] = useState(false);

  // Filters state
  const [filterType, setFilterType] = useState<'ALL' | 'STUDENT' | 'TEACHER'>('ALL');
  const [filterKelasId, setFilterKelasId] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const [memberType, setMemberType] = useState<'STUDENT' | 'TEACHER'>('STUDENT');
  const [selectedEntityId, setSelectedEntityId] = useState<string>('');

  // Conditional editability states for missing data in school's core database
  const [isEmailEditable, setIsEmailEditable] = useState(false);
  const [isPhoneEditable, setIsPhoneEditable] = useState(false);
  const [isAddressEditable, setIsAddressEditable] = useState(false);
  const [isExternal, setIsExternal] = useState(false);

  const [formData, setFormData] = useState({
    memberNo: '',
    name: '',
    email: '',
    phone: '',
    address: '',
    siswaId: '',
    guruId: '',
    userId: '',
    pin: '',
  });
  const [statusLoadingId, setStatusLoadingId] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [sortBy, setSortBy] = useState('memberNo');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Generate QR Code for virtual card with promise active-flag cleanup
  useEffect(() => {
    let active = true;
    if (selectedMember) {
      import('qrcode')
        .then((QRCode) => QRCode.toDataURL(selectedMember.memberNo, { margin: 1, width: 200 }))
        .then((url) => {
          if (active && isMountedRef.current) {
            setQrCodeUrl(url);
          }
        })
        .catch((err) => console.error('Error generating QR Code:', err));
    } else {
      setQrCodeUrl('');
    }
    return () => {
      active = false;
    };
  }, [selectedMember]);

  // Load Cooperative settings with active-flag cleanup
  useEffect(() => {
    let active = true;
    const loadCoopSettings = async () => {
      try {
        const cfg = await fetchCoopSettings();
        if (active) {
          if (isMountedRef.current) {
            if (cfg.cooperative_name) {
              setCoopName(cfg.cooperative_name);
            }
            setCoopProfile({
              legalNo: cfg.cooperative_legal_no || '',
              address: cfg.cooperative_address || 'Lingkungan Sekolah',
              phone: cfg.cooperative_phone || '-',
              email: cfg.cooperative_email || '-',
              website: cfg.cooperative_website || '-',
            });
          }
        }
      } catch (error) {
        console.warn('Failed to load cooperative settings:', error);
      }
    };
    loadCoopSettings();
    return () => {
      active = false;
    };
  }, []);

  // Gating Logic menggunakan useModuleAccess (Pilar Lisensi Hardening)
  const { isLocked } = useModuleAccess('KOPERASI');

  // React Query setup for members and kelas
  const membersQuery = useQuery({
    queryKey: ['koperasi-members-list'],
    queryFn: async () => {
      const response = await api.get('/cooperative/members');
      return (Array.isArray(response.data) ? response.data : []) as Member[];
    },
    enabled: !isLocked && subscription !== undefined,
    staleTime: 5 * 60 * 1000,
  });
  const members = membersQuery.data || [];
  const loading = membersQuery.isLoading;
  const fetchMembers = useCallback(async () => {
    await membersQuery.refetch();
  }, [membersQuery]);

  const kelasQuery = useQuery({
    queryKey: ['academic-kelas-options'],
    queryFn: async () => {
      const response = await api.get('/academic/kelas');
      return (response.data && response.data.data ? response.data.data : []) as { id: string; nama_kelas: string }[];
    },
    staleTime: 5 * 60 * 1000,
  });
  const kelasOptions = kelasQuery.data || [];

  // Auto-Generate Member No on Modal Open with active-flag cleanup
  useEffect(() => {
    if (!isModalOpen) return;
    let active = true;

    const loadNextMemberNo = async () => {
      try {
        const response = await api.get('/cooperative/members/next-number');
        if (active && response.data && response.data.nextMemberNo) {
          if (isMountedRef.current) {
            setFormData((prev) => ({ ...prev, memberNo: response.data.nextMemberNo }));
          }
        }
      } catch (err) {
        console.error('Error fetching next member number:', err);
      }
    };

    loadNextMemberNo();
    return () => {
      active = false;
    };
  }, [isModalOpen]);

  const handleEntitySelect = useCallback((selected: Student | null) => {
    if (!selected) {
      setSelectedEntityId('');
      setIsEmailEditable(false);
      setIsPhoneEditable(false);
      setIsAddressEditable(false);
      setFormData((prev) => ({
        ...prev,
        name: '',
        email: '',
        phone: '',
        address: '',
        siswaId: '',
        guruId: '',
        userId: '',
      }));
      return;
    }

    const entity = selected as unknown as PickerSelectedEntity;
    setSelectedEntityId(entity.id);
    const type = entity._type || (entity.nama_guru || entity.nip ? 'guru' : 'siswa');

    const emailVal = entity.email || entity.User?.email || '';
    const phoneVal = entity.no_hp || '';
    const addressVal = entity.alamat || '';

    setIsEmailEditable(!emailVal);
    setIsPhoneEditable(!phoneVal);
    setIsAddressEditable(!addressVal);

    if (type === 'siswa') {
      setMemberType('STUDENT');
      setFormData((prev) => ({
        ...prev,
        name: entity.nama_siswa || entity.full_name || 'Siswa',
        email: emailVal,
        phone: phoneVal,
        address: addressVal,
        siswaId: entity.id,
        guruId: '',
        userId: entity.user_id || '',
      }));
    } else {
      setMemberType('TEACHER');
      setFormData((prev) => ({
        ...prev,
        name: entity.nama_guru || entity.full_name || 'Guru',
        email: emailVal,
        phone: phoneVal,
        address: addressVal,
        siswaId: '',
        guruId: entity.id,
        userId: entity.user_id || '',
      }));
    }
  }, []);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }, []);

  const resetForm = useCallback(() => {
    setIsModalOpen(false);
    setFormData({
      memberNo: '',
      name: '',
      email: '',
      phone: '',
      address: '',
      siswaId: '',
      guruId: '',
      userId: '',
      pin: '',
    });
    setSelectedEntityId('');
    setIsEmailEditable(false);
    setIsPhoneEditable(false);
    setIsAddressEditable(false);
    setIsExternal(false);
  }, []);

  const handleExternalToggle = useCallback((val: boolean) => {
    setIsExternal(val);
    setSelectedEntityId('');
    setFormData((prev) => ({
      ...prev,
      name: '',
      email: '',
      phone: '',
      address: '',
      siswaId: '',
      guruId: '',
      userId: '',
      pin: '',
    }));
    setIsEmailEditable(val);
    setIsPhoneEditable(val);
    setIsAddressEditable(val);
  }, []);

  const createMemberMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post('/cooperative/members', payload);
      return res.data;
    },
    onSuccess: (_, variables) => {
      toast.success(
        variables.isExternal
          ? 'Anggota eksternal berhasil ditambahkan! Password login default: koperasi123'
          : 'Anggota berhasil ditambahkan!'
      );
      resetForm();
      queryClient.invalidateQueries({ queryKey: ['koperasi-members-list'] });
    },
    onError: (err: unknown) => {
      console.error(err);
      const errorMsg =
        (err && typeof err === 'object' && 'response' in err
          ? (err as AxiosErrorLike).response?.data?.message
          : null) || 'Gagal menambahkan anggota.';
      toast.error(errorMsg);
    }
  });

  const submitLoading = createMemberMutation.isPending;

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      if (isLocked) return;

      e.preventDefault();
      if (!isExternal && !formData.siswaId && !formData.guruId) {
        toast.error('Silakan pilih Siswa atau Guru terlebih dahulu.');
        return;
      }

      if (formData.pin && !/^\d{6}$/.test(formData.pin)) {
        toast.error('PIN Transaksi harus berupa 6 digit angka.');
        return;
      }

      const payload = {
        memberNo: formData.memberNo,
        type: isExternal ? 'GENERAL' : memberType,
        siswaId: isExternal ? null : formData.siswaId || null,
        guruId: isExternal ? null : formData.guruId || null,
        userId: isExternal ? null : formData.userId || null,
        isExternal: isExternal,
        name: isExternal ? formData.name : undefined,
        address: formData.address || null,
        phone: formData.phone || null,
        email: formData.email || null,
        status: 'ACTIVE',
        pin: formData.pin || '123456',
      };
      await createMemberMutation.mutateAsync(payload);
    },
    [formData, memberType, isLocked, isExternal, createMemberMutation]
  );

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: any }) => {
      const res = await api.put(`/cooperative/members/${id}`, payload);
      return res.data;
    },
    onSuccess: (_, variables) => {
      const newStatus = variables.payload.status;
      toast.success(
        `Anggota berhasil ${newStatus === 'ACTIVE' ? 'diaktifkan' : 'dinonaktifkan'}!`
      );
      setStatusLoadingId(null);
      queryClient.invalidateQueries({ queryKey: ['koperasi-members-list'] });
    },
    onError: (err: unknown) => {
      console.error('Error toggling member status:', err);
      toast.error('Gagal memperbarui status anggota.');
      setStatusLoadingId(null);
    }
  });

  const handleToggleStatus = useCallback(
    async (record: Member) => {
      if (isLocked) return;

      if (isMountedRef.current) setStatusLoadingId(record.id);
      const newStatus = record.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
      const payload = {
        status: newStatus,
        type: record.type,
        siswaId: record.siswaId || null,
        guruId: record.guruId || null,
        userId: record.userId || null,
      };
      await toggleStatusMutation.mutateAsync({ id: record.id, payload });
    },
    [isLocked, toggleStatusMutation]
  );

  const handleChangePin = useCallback(
    (record: Member) => {
      if (isLocked) return;
      setSelectedMember(record);
      setIsPinModalOpen(true);
    },
    [isLocked]
  );

  const updatePinMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: any }) => {
      const res = await api.put(`/cooperative/members/${id}`, payload);
      return res.data;
    },
    onSuccess: (_, variables) => {
      toast.success(`PIN Transaksi untuk ${selectedMember?.name || ''} berhasil diperbarui!`);
      if (isMountedRef.current) {
        setIsPinModalOpen(false);
        setSelectedMember((prev) => (prev ? { ...prev, pin: variables.payload.pin } : null));
      }
      queryClient.invalidateQueries({ queryKey: ['koperasi-members-list'] });
    },
    onError: (err) => {
      console.error(err);
      toast.error('Gagal memperbarui PIN transaksi.');
    }
  });

  const pinLoading = updatePinMutation.isPending;

  const handlePinSubmit = useCallback(
    async (newPin: string) => {
      if (!selectedMember || isLocked) return;

      const payload = {
        type: selectedMember.type,
        status: selectedMember.status,
        siswaId: selectedMember.siswaId || null,
        guruId: selectedMember.guruId || null,
        userId: selectedMember.userId || null,
        pin: newPin,
      };
      await updatePinMutation.mutateAsync({ id: selectedMember.id, payload });
    },
    [selectedMember, isLocked, updatePinMutation]
  );

  const handleOpenDetail = useCallback(async (record: Member) => {
    try {
      if (isMountedRef.current) {
        setSelectedMember(record);
        setIsDetailOpen(true);
      }

      const response = await api.get(`/cooperative/members/${record.id}`);
      if (isMountedRef.current) {
        setSelectedMember(response.data);
      }
    } catch (err) {
      console.error(err);
      toast.error('Gagal memuat mutasi tabungan terbaru.');
    }
  }, []);

  const importExcelMutation = useMutation({
    mutationFn: async (rows: any[]) => {
      const res = await api.post('/cooperative/members/bulk', { rows });
      return res.data;
    },
    onSuccess: (data) => {
      if (isMountedRef.current) {
        setImportResults(data);
        if (data.failCount === 0) {
          toast.success(`Berhasil mengimpor ${data.successCount} anggota!`);
          setIsImportModalOpen(false);
          setImportFile(null);
        } else {
          toast.error(`Impor selesai dengan ${data.failCount} kegagalan.`);
        }
      }
      queryClient.invalidateQueries({ queryKey: ['koperasi-members-list'] });
    },
    onError: (err) => {
      console.error(err);
      toast.error('Gagal memproses data Excel.');
    }
  });

  const importLoading = importExcelMutation.isPending;

  const handleImportExcelSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!importFile) {
        toast.error('Pilih file Excel terlebih dahulu.');
        return;
      }

      if (isMountedRef.current) {
        setImportResults(null);
      }
      try {
        const data = await parseImportExcel(importFile);
        if (data.length === 0) {
          toast.error('File Excel kosong atau format tidak sesuai.');
          return;
        }

        await importExcelMutation.mutateAsync(data);
      } catch (err) {
        console.error(err);
      }
    },
    [importFile, importExcelMutation]
  );

  const handleInitiateTerminate = useCallback((m: Member) => {
    setTerminatingMember(m);
    setIsTerminateConfirmOpen(true);
  }, []);

  const terminateMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post(`/cooperative/members/${id}/terminate`);
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(
        `Anggota berhasil diberhentikan! Total Payout: Rp ${data.total?.toLocaleString('id-ID') || 0}`
      );
      if (isMountedRef.current) {
        setIsTerminateConfirmOpen(false);
        setIsDetailOpen(false);
        setTerminatingMember(null);
      }
      queryClient.invalidateQueries({ queryKey: ['koperasi-members-list'] });
    },
    onError: (err) => {
      console.error(err);
      toast.error('Gagal memberhentikan anggota.');
    }
  });

  const terminateLoading = terminateMutation.isPending;

  const handleTerminateSubmit = useCallback(async () => {
    if (!terminatingMember) return;
    await terminateMutation.mutateAsync(terminatingMember.id);
  }, [terminatingMember, terminateMutation]);

  const handleSort = useCallback((key: string, order: 'asc' | 'desc') => {
    setPage(1);
    setSortBy(key);
    setSortOrder(order);
  }, []);

  // Filter and Search logic
  const filteredMembers = useMemo(() => {
    return (
      (members || [])?.filter((m) => {
        const search = searchQuery.toLowerCase().trim();
        const matchSearch =
          !search ||
          m.name.toLowerCase().includes(search) ||
          m.memberNo.toLowerCase().includes(search) ||
          (m.email && m.email.toLowerCase().includes(search)) ||
          (m.phone && m.phone.toLowerCase().includes(search));

        const matchType = filterType === 'ALL' || m.type === filterType;

        const matchKelas =
          filterKelasId === 'ALL' ||
          (m.type === 'STUDENT' && m.Siswa?.kelas_id === filterKelasId);

        return matchSearch && matchType && matchKelas;
      }) || []
    );
  }, [members, searchQuery, filterType, filterKelasId]);

  const sortedMembers = useMemo(() => {
    return [...filteredMembers].sort((a: Member, b: Member) => {
      const aVal = a[sortBy as keyof Member] as string | number | undefined;
      const bVal = b[sortBy as keyof Member] as string | number | undefined;
      if (aVal === bVal) return 0;
      if (aVal == null) return sortOrder === 'asc' ? 1 : -1;
      if (bVal == null) return sortOrder === 'asc' ? -1 : 1;
      if (sortOrder === 'asc') return aVal < bVal ? -1 : 1;
      return aVal > bVal ? -1 : 1;
    });
  }, [filteredMembers, sortBy, sortOrder]);

  const paginatedMembers = useMemo(() => {
    const start = (page - 1) * limit;
    return sortedMembers.slice(start, start + limit);
  }, [sortedMembers, page, limit]);

  const totalPages = Math.ceil(sortedMembers.length / limit);

  const filterTypeOptions = useMemo(
    () => [
      { label: 'Semua Tipe', value: 'ALL' },
      { label: 'Siswa', value: 'STUDENT' },
      { label: 'Guru & Staf', value: 'TEACHER' },
    ],
    []
  );

  const filterKelasOptions = useMemo(() => {
    const base = [{ label: 'Semua Kelas', value: 'ALL' }];
    const ops =
      (kelasOptions || [])?.map((k) => ({
        label: k?.nama_kelas || '',
        value: k?.id || '',
      })) || [];
    return [...base, ...ops];
  }, [kelasOptions]);

  const stats = useMemo(() => {
    const total = (members || [])?.length || 0;
    const active = (members || [])?.filter((m) => m.status === 'ACTIVE').length || 0;
    const totalSavings =
      (members || [])?.reduce((sum, m) => {
        const pokok =
          parseFloat(String((m.savings || [])?.find((s) => s.type === 'POKOK')?.amount || 0)) ||
          0;
        const wajib =
          parseFloat(String((m.savings || [])?.find((s) => s.type === 'WAJIB')?.amount || 0)) ||
          0;
        const sukarela =
          parseFloat(
            String((m.savings || [])?.find((s) => s.type === 'SUKARELA')?.amount || 0)
          ) || 0;
        return sum + pokok + wajib + sukarela;
      }, 0) || 0;
    return { total, active, totalSavings };
  }, [members]);

  return {
    members,
    loading,
    isModalOpen,
    setIsModalOpen,
    isBulkAddOpen,
    setIsBulkAddOpen,
    isDetailOpen,
    setIsDetailOpen,
    isPinModalOpen,
    setIsPinModalOpen,
    selectedMember,
    setSelectedMember,
    pinLoading,
    coopName,
    coopProfile,
    qrCodeUrl,
    isImportModalOpen,
    setIsImportModalOpen,
    importFile,
    setImportFile,
    importLoading,
    importResults,
    isTerminateConfirmOpen,
    setIsTerminateConfirmOpen,
    terminatingMember,
    setTerminatingMember,
    terminateLoading,
    isBulkPrinting,
    setIsBulkPrinting,
    filterType,
    setFilterType,
    filterKelasId,
    setFilterKelasId,
    kelasOptions,
    searchQuery,
    setSearchQuery,
    memberType,
    selectedEntityId,
    isEmailEditable,
    isPhoneEditable,
    isAddressEditable,
    isExternal,
    formData,
    submitLoading,
    statusLoadingId,
    page,
    setPage,
    limit,
    setLimit,
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,
    isMountedRef,
    searchParams,
    setSearchParams,

    // Handlers
    fetchMembers,
    handleEntitySelect,
    handleInputChange,
    resetForm,
    handleExternalToggle,
    handleSubmit,
    handleToggleStatus,
    handleChangePin,
    handlePinSubmit,
    handleOpenDetail,
    handleImportExcelSubmit,
    handleInitiateTerminate,
    handleTerminateSubmit,
    handleSort,
    filteredMembers,
    sortedMembers,
    paginatedMembers,
    totalPages,
    filterTypeOptions,
    filterKelasOptions,
    stats,
  };
};
