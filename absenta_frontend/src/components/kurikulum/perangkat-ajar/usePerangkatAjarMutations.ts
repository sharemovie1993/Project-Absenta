import { useMutation } from '@tanstack/react-query';
import { kurikulumApi, type PerangkatAjar } from '@/api/kurikulum.api';
import { toast } from 'sonner';

export const usePerangkatAjarMutations = (params: any) => {
  const {
    queryClient, setIsUploadModalOpen, setUploadForm, setIsReviewModalOpen,
    setSelectedPerangkatId, setSelectedRowKeys, setClaimingId, setIsLibraryModalOpen,
    setGeneratedAIContent, JENIS_LABELS, aiForm, isWizardModalOpen, setIsWizardModalOpen,
    setSelectedWordEditItem, currentGuru, activeYear, activeSemester, setIsWordEditorOpen,
    setIsAIModalOpen, setActiveTab, setFilterJenis, setFilterMapel, setPage
  } = params;

  // Mutations
  const uploadMutation = useMutation({
    mutationFn: (formData: FormData) => kurikulumApi.uploadPerangkatAjar(formData),
    onSuccess: () => {
      toast.success('Perangkat ajar berhasil diunggah');
      setIsUploadModalOpen(false);
      setUploadForm({ judul: '', jenis: '', mapel_id: '', guru_id: '', file: null });
      queryClient.invalidateQueries({ queryKey: ['perangkat-ajar-list'] });
      queryClient.invalidateQueries({ queryKey: ['perangkat-ajar-stats-all'] });
      queryClient.invalidateQueries({ queryKey: ['global-topik-presets'] });
      queryClient.invalidateQueries({ queryKey: ['global-perangkat-library'] });
      queryClient.invalidateQueries({ queryKey: ['academic-stats'] });
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Gagal mengunggah berkas';
      toast.error(msg);
    }
  });

  const reviewMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { status: 'APPROVED' | 'REJECTED'; catatan_reviewer?: string } }) =>
      kurikulumApi.reviewPerangkatAjar(id, data),
    onSuccess: () => {
      toast.success('Status verifikasi perangkat ajar berhasil diperbarui');
      setIsReviewModalOpen(false);
      setSelectedPerangkatId(null);
      queryClient.invalidateQueries({ queryKey: ['perangkat-ajar-list'] });
      queryClient.invalidateQueries({ queryKey: ['perangkat-ajar-stats-all'] });
      queryClient.invalidateQueries({ queryKey: ['global-topik-presets'] });
      queryClient.invalidateQueries({ queryKey: ['global-perangkat-library'] });
      queryClient.invalidateQueries({ queryKey: ['academic-stats'] });
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Gagal memperbarui status verifikasi';
      toast.error(msg);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => kurikulumApi.deletePerangkatAjar(id),
    onSuccess: () => {
      toast.success('Dokumen perangkat ajar berhasil dihapus');
      queryClient.invalidateQueries({ queryKey: ['perangkat-ajar-list'] });
      queryClient.invalidateQueries({ queryKey: ['perangkat-ajar-stats-all'] });
      queryClient.invalidateQueries({ queryKey: ['global-topik-presets'] });
      queryClient.invalidateQueries({ queryKey: ['global-perangkat-library'] });
      queryClient.invalidateQueries({ queryKey: ['academic-stats'] });
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Gagal menghapus dokumen';
      toast.error(msg);
    }
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: (ids: string[]) => kurikulumApi.bulkDeletePerangkatAjar(ids),
    onSuccess: (res: { message?: string }) => {
      toast.success(res?.message || 'Dokumen perangkat ajar terpilih berhasil dihapus');
      setSelectedRowKeys(new Set());
      queryClient.invalidateQueries({ queryKey: ['perangkat-ajar-list'] });
      queryClient.invalidateQueries({ queryKey: ['perangkat-ajar-stats-all'] });
      queryClient.invalidateQueries({ queryKey: ['global-topik-presets'] });
      queryClient.invalidateQueries({ queryKey: ['global-perangkat-library'] });
      queryClient.invalidateQueries({ queryKey: ['academic-stats'] });
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Gagal menghapus dokumen terpilih';
      toast.error(msg);
    }
  });

  const handleBulkDelete = useCallback(async () => {
    if (selectedRowKeys.size === 0) return;
    const ok = await confirm({
      title: 'Hapus Masal Perangkat Ajar',
      message: `Apakah Anda yakin ingin menghapus ${selectedRowKeys.size} dokumen terpilih? Tindakan ini tidak dapat dibatalkan.`,
      confirmText: `Hapus ${selectedRowKeys.size} Dokumen`,
      style: 'danger'
    });
    if (ok) {
      bulkDeleteMutation.mutate(Array.from(selectedRowKeys));
    }
  }, [selectedRowKeys, confirm, bulkDeleteMutation]);

  const claimMutation = useMutation({
    mutationFn: (payload: { library_id: string; mapel_id: string; tahun_pelajaran_id: string; semester_id: string; guru_id: string }) =>
      kurikulumApi.claimLibraryTemplate(payload),
    onMutate: (vars) => setClaimingId(vars.library_id),
    onSuccess: () => {
      toast.success('Template nasional berhasil diklaim dan diadopsi!');
      setIsLibraryModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['perangkat-ajar-list'] });
      queryClient.invalidateQueries({ queryKey: ['perangkat-ajar-stats-all'] });
      queryClient.invalidateQueries({ queryKey: ['global-topik-presets'] });
      queryClient.invalidateQueries({ queryKey: ['global-perangkat-library'] });
      queryClient.invalidateQueries({ queryKey: ['academic-stats'] });
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Gagal mengklaim template';
      toast.error(msg);
    },
    onSettled: () => setClaimingId(null)
  });

  const generateAIMutation = useMutation({
    mutationFn: (params: { jenis: string; mapel_name: string; kelas: string; topik: string; alokasi_waktu?: string }) =>
      kurikulumApi.generatePerangkatAjarAI(params),
    onSuccess: (res) => {
      if (res?.data?.content) {
        setGeneratedAIContent(res.data.content);
        toast.success(`Matriks ${JENIS_LABELS[aiForm.jenis] || aiForm.jenis} berhasil disusun!`);

        // Jika dipicu dari Wizard Modal, langsung buka Word Editor Modal
        if (isWizardModalOpen) {
          setIsWizardModalOpen(false);
          setSelectedWordEditItem({
            judul: `${JENIS_LABELS[aiForm.jenis] || aiForm.jenis} - ${aiForm.topik}`,
            jenis: aiForm.jenis,
            mapel_id: aiForm.mapel_id,
            guru_id: currentGuru?.id,
            tahun_pelajaran_id: activeYear?.id || '',
            semester_id: activeSemester?.id || '',
            html_content: res.data.content,
            status: 'PENDING'
          });
          setIsWordEditorOpen(true);
        }
      }
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Gagal menyusun perangkat dengan AI';
      toast.error(msg);
    }
  });

  const saveAIMutation = useMutation({
    mutationFn: (params: unknown) =>
      kurikulumApi.savePerangkatAjarEditor(params),
    onSuccess: () => {
      toast.success('Perangkat ajar AI berhasil disimpan ke repositori!');
      setIsAIModalOpen(false);
      setGeneratedAIContent('');
      setActiveTab('ALL');
      setFilterJenis('');
      setFilterMapel('');
      setPage(1);
      queryClient.invalidateQueries({ queryKey: ['perangkat-ajar-list'] });
      queryClient.invalidateQueries({ queryKey: ['perangkat-ajar-stats-all'] });
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Gagal menyimpan berkas editor';
      toast.error(msg);
    }
  });




  return {
    uploadMutation,
    reviewMutation,
    deleteMutation,
    bulkDeleteMutation,
    claimMutation,
    generateAIMutation,
    saveAIMutation
  };
};
