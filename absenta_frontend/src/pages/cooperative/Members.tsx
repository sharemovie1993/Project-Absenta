import React, { useMemo, useCallback, lazy, Suspense } from 'react';
import { Table, SectionCard } from '../../components/ui';
import { Users } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../store/authStore';
import { useCapabilities } from '../../hooks/useCapabilities';
import PremiumFeatureGate from '../../components/auth/PremiumFeatureGate';
import { AcademicPageLayout } from '../../components/academic/AcademicPageLayout';

import type { Member } from '../../components/cooperative/members/types';
import { MemberStatsBanner } from '../../components/cooperative/members/MemberStatsBanner';
import { MemberSkeleton } from '../../components/cooperative/members/MemberSkeleton';
import { getMemberColumns } from '../../components/cooperative/members/MemberTableColumns';
import { MemberTableToolbarLeft, MemberTableToolbarRight } from '../../components/cooperative/members/MemberTableToolbar';
import { useMembersState } from '../../components/cooperative/members/useMembersState';
import { useIsMobile } from '../../hooks/useIsMobile';
import { MobileAcademicList } from '../../components/academic/shared/MobileAcademicList';
import { formatIndonesianDate } from '../../utils/cooperative/coopDocUtils';
import { Eye, Power, PowerOff } from 'lucide-react';
import { Button } from '../../components/ui';

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
  const { subscription } = useAuthStore();
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

  const isMobile = useIsMobile();

  const renderMobileCard = useCallback((record: Member) => {
    return (
      <div
        key={record.id}
        className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-black text-sm shrink-0">
              {record.name?.substring(0, 2).toUpperCase() || 'MB'}
            </div>
            <div className="min-w-0">
              <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100 truncate">{record.name}</h4>
              <p className="text-[10px] text-slate-400 font-mono font-medium">{record.memberNo || '-'}</p>
            </div>
          </div>
          <span
            className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shrink-0 ${
              record.status === 'ACTIVE'
                ? 'bg-green-100 text-green-800 border border-green-200 shadow-sm'
                : 'bg-rose-100 text-rose-800 border border-rose-200'
            }`}
          >
            {record.status === 'ACTIVE' ? 'AKTIF' : 'NONAKTIF'}
          </span>
        </div>

        <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-[10px] text-slate-400 block font-medium">Email</span>
            <span className="font-semibold text-slate-700 dark:text-slate-200 truncate block">{record.email || '-'}</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block font-medium">Telepon</span>
            <span className="font-semibold text-slate-700 dark:text-slate-200">{record.phone || '-'}</span>
          </div>
          <div className="col-span-2">
            <span className="text-[10px] text-slate-400 block font-medium">Bergabung</span>
            <span className="font-semibold text-slate-700 dark:text-slate-200">{formatIndonesianDate(record.createdAt)}</span>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleOpenDetail(record)}
            className="h-8 px-3 rounded-lg border-slate-200 text-slate-600 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all font-bold text-[11px]"
          >
            <Eye size={12} className="mr-1.5" />
            Detail
          </Button>
          {canUpdate && (
            <Button
              variant={record.status === 'ACTIVE' ? 'outline' : 'primary'}
              size="sm"
              disabled={statusLoadingId === record.id}
              onClick={() => handleToggleStatus(record)}
              className={`h-8 px-3 rounded-lg font-bold text-[11px] uppercase transition-all duration-300 ${
                record.status === 'ACTIVE'
                  ? 'border-rose-200 hover:border-rose-300 text-rose-600 hover:text-rose-700 bg-rose-50/20 hover:bg-rose-50/50'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm'
              }`}
            >
              {statusLoadingId === record.id ? (
                <span className="w-3.5 h-3.5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
              ) : (
                record.status === 'ACTIVE' ? (
                  <>
                    <PowerOff size={11} className="mr-1.5" />
                    Nonaktifkan
                  </>
                ) : (
                  <>
                    <Power size={11} className="mr-1.5" />
                    Aktifkan
                  </>
                )
              )}
            </Button>
          )}
        </div>
      </div>
    );
  }, [handleOpenDetail, handleToggleStatus, statusLoadingId, canUpdate]);

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
              {isMobile ? (
                <div className="p-4 space-y-4">
                  <div className="space-y-3">
                    {TableToolbarLeftComponent}
                    <div className="flex flex-wrap gap-2 pt-1">
                      {TableToolbarRightComponent}
                    </div>
                  </div>
                  <MobileAcademicList
                    title="Daftar Anggota Koperasi"
                    data={paginatedMembers}
                    loading={loading}
                    totalItems={sortedMembers.length}
                    emptyMessage="Belum ada data anggota koperasi yang cocok dengan filter."
                    pagination={{
                      currentPage: page,
                      itemsPerPage: limit,
                      totalItems: sortedMembers.length,
                      totalPages,
                      onPageChange: setPage,
                      onLimitChange: setLimit,
                    }}
                    renderCard={renderMobileCard}
                  />
                </div>
              ) : (
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
              )}
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