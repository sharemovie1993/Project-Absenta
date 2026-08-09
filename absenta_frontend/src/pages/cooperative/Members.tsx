import React, { useMemo, useCallback, lazy, Suspense } from 'react';
import { Table, SectionCard } from '../../components/ui';
import { Users } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../hooks/useAuth';
import { useCapabilities } from '../../hooks/useCapabilities';
import PremiumFeatureGate from '../../components/auth/PremiumFeatureGate';
import { AcademicPageLayout } from '../../components/academic/AcademicPageLayout';

import type { Member } from '../../components/cooperative/members/types';
import { MemberStatsBanner } from '../../components/cooperative/members/MemberStatsBanner';
import { MemberSkeleton } from '../../components/cooperative/members/MemberSkeleton';
import { getMemberColumns } from '../../components/cooperative/members/MemberTableColumns';
import { MemberTableToolbarLeft, MemberTableToolbarRight } from '../../components/cooperative/members/MemberTableToolbar';
import { useMembersState } from '../../components/cooperative/members/useMembersState';

import {
  handleExportPdf,
  handleExportSinglePdf,
  handleExportExcel,
  handleDownloadCardPdf,
  handleDownloadBulkCardsPdf,
  handleDownloadTemplate,
} from '../../utils/cooperative/memberDocUtils';

const MemberModals = lazy(() =>
  import('../../components/cooperative/members/MemberModals').then((module) => ({
    default: module.MemberModals,
  }))
);

const Members: React.FC = React.memo(() => {
  const { subscription } = useAuth();
  const { isKoperasiHead, isKoperasiFinance, isKoperasiSecretary, isAdmin, can } = useCapabilities();
  const canUpdate = isAdmin || isKoperasiHead || isKoperasiSecretary || can('cooperative.members.update');
  const canDelete = isAdmin || isKoperasiHead || can('cooperative.members.delete');
  const {
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
    searchQuery,
    setSearchQuery,
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
    sortOrder,
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
  } = useMembersState(subscription);

  const handleExportPdfLocal = useCallback(() => {
    handleExportPdf(members, subscription);
  }, [members, subscription]);

  const handleExportSinglePdfLocal = useCallback(
    async (m: Member) => {
      await handleExportSinglePdf(m, subscription);
    },
    [subscription]
  );

  const handleExportExcelLocal = useCallback(() => {
    handleExportExcel(members);
  }, [members]);

  const handleDownloadCardPdfLocal = useCallback(
    async (m: Member) => {
      await handleDownloadCardPdf(m, coopName, coopProfile);
    },
    [coopName, coopProfile]
  );

  const handleDownloadBulkCardsPdfLocal = useCallback(() => {
    handleDownloadBulkCardsPdf({
      filteredMembers,
      coopName,
      coopProfile,
      onStart: () => {
        if (isMountedRef.current) setIsBulkPrinting(true);
      },
      onProgress: (processed, total, toastId) => {
        toast.loading(`Memproses: ${processed} dari ${total} kartu...`, { id: toastId });
      },
      onSuccess: (total, toastId) => {
        toast.success(`Berhasil mencetak ${total} kartu anggota (2 sisi)!`, { id: toastId });
      },
      onError: (err, toastId) => {
        toast.error('Gagal mencetak kartu massal.', { id: toastId });
      },
      onEnd: () => {
        if (isMountedRef.current) setIsBulkPrinting(false);
      },
      checkMounted: () => isMountedRef.current,
    });
  }, [filteredMembers, coopName, coopProfile, setIsBulkPrinting]);

  const columns = useMemo(
    () =>
      getMemberColumns({
        handleOpenDetail,
        handleToggleStatus,
        statusLoadingId,
        canUpdate,
      }),
    [handleOpenDetail, handleToggleStatus, statusLoadingId, canUpdate]
  );

  const TableToolbarLeftComponent = useMemo(
    () => (
      <MemberTableToolbarLeft
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        filterType={filterType}
        setFilterType={setFilterType}
        filterKelasId={filterKelasId}
        setFilterKelasId={setFilterKelasId}
        setPage={setPage}
        filterTypeOptions={filterTypeOptions}
        filterKelasOptions={filterKelasOptions}
      />
    ),
    [searchQuery, filterType, filterKelasId, filterTypeOptions, filterKelasOptions, setPage, setFilterType, setFilterKelasId]
  );

  const TableToolbarRightComponent = useMemo(
    () => (
      <MemberTableToolbarRight
        setIsImportModalOpen={setIsImportModalOpen}
        handleExportPdf={handleExportPdfLocal}
        handleDownloadBulkCardsPdf={handleDownloadBulkCardsPdfLocal}
        isBulkPrinting={isBulkPrinting}
        handleExportExcel={handleExportExcelLocal}
        setIsBulkAddOpen={setIsBulkAddOpen}
        setIsModalOpen={setIsModalOpen}
      />
    ),
    [
      setIsImportModalOpen,
      handleExportPdfLocal,
      handleDownloadBulkCardsPdfLocal,
      isBulkPrinting,
      handleExportExcelLocal,
      setIsBulkAddOpen,
      setIsModalOpen,
    ]
  );

  return (
    <PremiumFeatureGate moduleName="KOPERASI" featureName="Manajemen Anggota">
      <AcademicPageLayout
        title="Manajemen Anggota Koperasi"
        description="Kelola data anggota koperasi"
        hardeningModuleKey="coop_members"
        breadcrumbs={[
          { label: 'Koperasi', path: '/cooperative' },
          { label: 'Anggota', path: '/cooperative/members' },
        ]}
        instruction={{
          title: 'Panduan Manajemen Anggota',
          description:
            'Kelola pendaftaran anggota, pencarian data induk, saldo simpanan riil, dan ekspor laporan terformat.',
          items: [
            { text: "Klik 'Tambah Anggota' untuk mendaftarkan anggota baru." },
            { text: 'Cari Siswa atau Guru menggunakan nama, NIS, NIP, scan kartu/QR...' },
            {
              text: 'Gunakan fitur Aksi untuk melihat profil detail keuangan, mengaktifkan, atau menonaktifkan anggota.',
            },
            { text: "Klik 'Ekspor Excel' untuk men-download laporan ledger anggota koperasi secara instan." },
          ],
        }}
      >
        {loading && members.length === 0 ? (
          <MemberSkeleton />
        ) : (
          <div className="space-y-6">
            {/* Header Action & Custom Status Badge */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
                <span className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 text-emerald-700 dark:text-emerald-400 font-black text-[9px] uppercase tracking-widest px-2.5 py-0.5 rounded-full shadow-sm">
                  HARDENED (DEV AUDIT A+)
                </span>
              </div>
            </div>

            {/* Premium Stats Dashboard Banner */}
            <MemberStatsBanner
              total={stats.total}
              active={stats.active}
              totalSavings={stats.totalSavings}
            />

            <SectionCard title="Data Anggota Koperasi" icon={Users} fullWidth noPadding>
              <Table
                data={paginatedMembers}
                columns={columns}
                rowKey="id"
                loading={loading}
                emptyMessage="Belum ada data anggota koperasi yang cocok dengan filter."
                sortBy={sortBy}
                sortOrder={sortOrder}
                onSort={handleSort}
                toolbarLeft={TableToolbarLeftComponent}
                toolbarRight={TableToolbarRightComponent}
                pagination={{
                  currentPage: page,
                  itemsPerPage: limit,
                  totalItems: sortedMembers.length,
                  totalPages,
                  onPageChange: setPage,
                  onLimitChange: setLimit,
                }}
              />
            </SectionCard>

            {/* Heavy modals wrapped in React Suspense to guarantee clean bundle splitting */}
            <Suspense fallback={null}>
              <MemberModals
                isModalOpen={isModalOpen}
                resetForm={resetForm}
                handleSubmit={handleSubmit}
                formData={formData}
                handleInputChange={handleInputChange}
                handleEntitySelect={handleEntitySelect}
                selectedEntityId={selectedEntityId}
                isEmailEditable={isEmailEditable}
                isPhoneEditable={isPhoneEditable}
                isAddressEditable={isAddressEditable}
                submitLoading={submitLoading}
                isExternal={isExternal}
                handleExternalToggle={handleExternalToggle}
                isDetailOpen={isDetailOpen}
                setIsDetailOpen={setIsDetailOpen}
                selectedMember={selectedMember}
                setSelectedMember={setSelectedMember}
                searchParams={searchParams}
                setSearchParams={setSearchParams}
                coopName={coopName}
                coopProfile={coopProfile}
                qrCodeUrl={qrCodeUrl}
                handleDownloadCardPdf={handleDownloadCardPdfLocal}
                handleExportSinglePdf={handleExportSinglePdfLocal}
                handleInitiateTerminate={handleInitiateTerminate}
                handleChangePin={handleChangePin}
                isImportModalOpen={isImportModalOpen}
                setIsImportModalOpen={setIsImportModalOpen}
                importFile={importFile}
                setImportFile={setImportFile}
                handleImportExcelSubmit={handleImportExcelSubmit}
                handleDownloadTemplate={handleDownloadTemplate}
                importLoading={importLoading}
                importResults={importResults}
                isTerminateConfirmOpen={isTerminateConfirmOpen}
                setIsTerminateConfirmOpen={setIsTerminateConfirmOpen}
                terminatingMember={terminatingMember}
                setTerminatingMember={setTerminatingMember}
                handleTerminateSubmit={handleTerminateSubmit}
                terminateLoading={terminateLoading}
                isBulkAddOpen={isBulkAddOpen}
                setIsBulkAddOpen={setIsBulkAddOpen}
                fetchMembers={fetchMembers}
                isPinModalOpen={isPinModalOpen}
                setIsPinModalOpen={setIsPinModalOpen}
                handlePinSubmit={handlePinSubmit}
                pinLoading={pinLoading}
                canUpdate={canUpdate}
                canDelete={canDelete}
              />
            </Suspense>
          </div>
        )}
      </AcademicPageLayout>
    </PremiumFeatureGate>
  );
});

export default Members;