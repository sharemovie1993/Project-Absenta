import React from 'react';
import type { Member, CoopProfile } from './types';
import { MemberAddModal } from './MemberAddModal';
import { MemberDetailModal } from './MemberDetailModal';
import { MemberImportModal } from './MemberImportModal';
import { MemberTerminateModal } from './MemberTerminateModal';
import { MemberBulkAddModal } from './MemberBulkAddModal';
import { MemberPinModal } from './MemberPinModal';

interface MemberModalsProps {
  isModalOpen: boolean;
  resetForm: () => void;
  handleSubmit: (e: React.FormEvent) => Promise<void>;
  formData: any;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleEntitySelect: (selected: any) => void;
  selectedEntityId: string;
  isEmailEditable: boolean;
  isPhoneEditable: boolean;
  isAddressEditable: boolean;
  submitLoading: boolean;
  isExternal: boolean;
  handleExternalToggle: (val: boolean) => void;

  isDetailOpen: boolean;
  setIsDetailOpen: (val: boolean) => void;
  selectedMember: Member | null;
  setSelectedMember: (val: Member | null) => void;
  searchParams: any;
  setSearchParams: any;
  coopName: string;
  coopProfile: CoopProfile;
  qrCodeUrl: string;
  handleDownloadCardPdf: (m: Member) => Promise<void>;
  handleExportSinglePdf: (m: Member) => Promise<void>;
  handleInitiateTerminate: (m: Member) => void;
  handleChangePin: (m: Member) => void;

  isImportModalOpen: boolean;
  setIsImportModalOpen: (val: boolean) => void;
  importFile: File | null;
  setImportFile: (val: File | null) => void;
  handleImportExcelSubmit: (e: React.FormEvent) => Promise<void>;
  handleDownloadTemplate: () => void;
  importLoading: boolean;
  importResults: any;

  isTerminateConfirmOpen: boolean;
  setIsTerminateConfirmOpen: (val: boolean) => void;
  terminatingMember: Member | null;
  setTerminatingMember: (val: Member | null) => void;
  handleTerminateSubmit: () => Promise<void>;
  terminateLoading: boolean;

  isBulkAddOpen: boolean;
  setIsBulkAddOpen: (val: boolean) => void;
  fetchMembers: () => Promise<void>;

  isPinModalOpen: boolean;
  setIsPinModalOpen: (val: boolean) => void;
  handlePinSubmit: (pin: string) => Promise<void>;
  pinLoading: boolean;
  canUpdate?: boolean;
  canDelete?: boolean;
}

export const MemberModals: React.FC<MemberModalsProps> = React.memo(({
  isModalOpen,
  resetForm,
  handleSubmit,
  formData,
  handleInputChange,
  handleEntitySelect,
  selectedEntityId,
  isEmailEditable,
  isPhoneEditable,
  isAddressEditable,
  submitLoading,
  isExternal,
  handleExternalToggle,

  isDetailOpen,
  setIsDetailOpen,
  selectedMember,
  setSelectedMember,
  searchParams,
  setSearchParams,
  coopName,
  coopProfile,
  qrCodeUrl,
  handleDownloadCardPdf,
  handleExportSinglePdf,
  handleInitiateTerminate,
  handleChangePin,

  isImportModalOpen,
  setIsImportModalOpen,
  importFile,
  setImportFile,
  handleImportExcelSubmit,
  handleDownloadTemplate,
  importLoading,
  importResults,

  isTerminateConfirmOpen,
  setIsTerminateConfirmOpen,
  terminatingMember,
  setTerminatingMember,
  handleTerminateSubmit,
  terminateLoading,

  isBulkAddOpen,
  setIsBulkAddOpen,
  fetchMembers,

  isPinModalOpen,
  setIsPinModalOpen,
  handlePinSubmit,
  pinLoading,
  canUpdate = false,
  canDelete = false,
}) => {
  return (
    <>
      {/* Modal Tambah Anggota */}
      <MemberAddModal
        isOpen={isModalOpen}
        onClose={resetForm}
        onSubmit={handleSubmit}
        formData={formData}
        onInputChange={handleInputChange}
        onEntitySelect={handleEntitySelect}
        selectedEntityId={selectedEntityId}
        isEmailEditable={isEmailEditable}
        isPhoneEditable={isPhoneEditable}
        isAddressEditable={isAddressEditable}
        submitLoading={submitLoading}
        isExternal={isExternal}
        onExternalToggle={handleExternalToggle}
      />

      {/* Modal Detail Anggota */}
      <MemberDetailModal
        isOpen={isDetailOpen}
        onClose={() => {
          setIsDetailOpen(false);
          setSelectedMember(null);
          const newParams = new URLSearchParams(searchParams);
          newParams.delete('id');
          newParams.delete('openId');
          setSearchParams(newParams);
        }}
        member={selectedMember}
        coopName={coopName}
        coopProfile={coopProfile}
        qrCodeUrl={qrCodeUrl}
        onDownloadCardPdf={handleDownloadCardPdf}
        onExportSinglePdf={handleExportSinglePdf}
        onInitiateTerminate={handleInitiateTerminate}
        onChangePin={handleChangePin}
        canUpdate={canUpdate}
        canDelete={canDelete}
      />

      {/* Modal Impor Excel */}
      <MemberImportModal
        isOpen={isImportModalOpen}
        onClose={() => {
          setIsImportModalOpen(false);
          setImportFile(null);
        }}
        onFileChange={setImportFile}
        onSubmit={handleImportExcelSubmit}
        onDownloadTemplate={handleDownloadTemplate}
        importLoading={importLoading}
        importResults={importResults}
      />

      {/* Modal Konfirmasi Pemberhentian */}
      <MemberTerminateModal
        isOpen={isTerminateConfirmOpen}
        onClose={() => {
          setIsTerminateConfirmOpen(false);
          setTerminatingMember(null);
        }}
        member={terminatingMember}
        onSubmit={handleTerminateSubmit}
        loading={terminateLoading}
      />

      {/* Modal Tambah Massal Wizard */}
      <MemberBulkAddModal
        isOpen={isBulkAddOpen}
        onClose={() => setIsBulkAddOpen(false)}
        onSuccess={fetchMembers}
      />

      {/* Modal Ganti PIN */}
      <MemberPinModal
        isOpen={isPinModalOpen}
        onClose={() => setIsPinModalOpen(false)}
        member={selectedMember}
        onSubmit={handlePinSubmit}
        loading={pinLoading}
      />
    </>
  );
});
