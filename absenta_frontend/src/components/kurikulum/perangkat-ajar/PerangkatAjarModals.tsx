import React, { lazy, Suspense } from 'react';
import type { PerangkatAjar } from '@/api/kurikulum.api';

const PerangkatAjarUploadModal = lazy(() => import('./PerangkatAjarUploadModal'));
const PerangkatAjarReviewModal = lazy(() => import('./PerangkatAjarReviewModal'));
const PerangkatAjarLibraryModal = lazy(() => import('./PerangkatAjarLibraryModal'));
const PerangkatAjarAIModal = lazy(() => import('./PerangkatAjarAIModal'));
const PerangkatAjarWordEditorModal = lazy(() => import('./PerangkatAjarWordEditorModal'));
const PerangkatAjarWizardModal = lazy(() => import('./PerangkatAjarWizardModal'));
const BahanAjarReaderModal = lazy(() => import('../bahan-ajar/BahanAjarReaderModal').then(m => ({ default: m.BahanAjarReaderModal })));
const ModulAjarStudioModal = lazy(() => import('../bahan-ajar/ModulAjarStudioModal').then(m => ({ default: m.ModulAjarStudioModal })));

interface PerangkatAjarModalsProps {
  isUploadModalOpen: boolean;
  setIsUploadModalOpen: (v: boolean) => void;
  uploadForm: any;
  setUploadForm: any;
  filterJenisOptions: any;
  mapelOptions: any;
  teacherOptions: any;
  uploadMutation: any;
  handleUploadSubmit: any;
  isReviewModalOpen: boolean;
  setIsReviewModalOpen: (v: boolean) => void;
  reviewForm: any;
  setReviewForm: any;
  reviewMutation: any;
  handleReviewSubmit: any;
  isLibraryModalOpen: boolean;
  setIsLibraryModalOpen: (v: boolean) => void;
  librarySearch: string;
  setLibrarySearch: (v: string) => void;
  libraryJenisFilter: string;
  setLibraryJenisFilter: (v: string) => void;
  claimMapelId: string;
  setClaimMapelId: (v: string) => void;
  claimingId: string | null;
  libraryTemplatesData: any;
  listPerangkat: any;
  handleOpenWordEditor: (item: any) => void;
  isLoadingLibrary: boolean;
  teacherAssignedMapels: any;
  activeYear: any;
  activeSemester: any;
  currentGuru: any;
  JENIS_LABELS: any;
  claimMutation: any;
  isAIModalOpen: boolean;
  setIsAIModalOpen: (v: boolean) => void;
  aiForm: any;
  setAiForm: any;
  aiPresetsData: any;
  generateAIMutation: any;
  saveAIMutation: any;
  generatedAIContent: string;
  setGeneratedAIContent: (v: string) => void;
  handleAISubmit: any;
  handleAISave: any;
  isWizardModalOpen: boolean;
  setIsWizardModalOpen: (v: boolean) => void;
  isWordEditorOpen: boolean;
  setIsWordEditorOpen: (v: boolean) => void;
  selectedWordEditItem: any;
  setSelectedWordEditItem: (v: any) => void;
  queryClient: any;
  isReaderModalOpen: boolean;
  setIsReaderModalOpen: (v: boolean) => void;
  readerPerangkatId: string;
  isStudioModalOpen: boolean;
  setIsStudioModalOpen: (v: boolean) => void;
  studioPerangkat: any;
  setStudioPerangkat: (v: any) => void;
}

export const PerangkatAjarModals: React.FC<PerangkatAjarModalsProps> = React.memo((props) => {
  const {
    isUploadModalOpen, setIsUploadModalOpen, uploadForm, setUploadForm,
    filterJenisOptions, mapelOptions, teacherOptions, uploadMutation, handleUploadSubmit,
    isReviewModalOpen, setIsReviewModalOpen, reviewForm, setReviewForm, reviewMutation, handleReviewSubmit,
    isLibraryModalOpen, setIsLibraryModalOpen, librarySearch, setLibrarySearch, libraryJenisFilter, setLibraryJenisFilter,
    claimMapelId, setClaimMapelId, claimingId, libraryTemplatesData, listPerangkat, handleOpenWordEditor,
    isLoadingLibrary, teacherAssignedMapels, activeYear, activeSemester, currentGuru, JENIS_LABELS, claimMutation,
    isAIModalOpen, setIsAIModalOpen, aiForm, setAiForm, aiPresetsData, generateAIMutation, saveAIMutation,
    generatedAIContent, setGeneratedAIContent, handleAISubmit, handleAISave,
    isWizardModalOpen, setIsWizardModalOpen, isWordEditorOpen, setIsWordEditorOpen,
    selectedWordEditItem, setSelectedWordEditItem, queryClient,
    isReaderModalOpen, setIsReaderModalOpen, readerPerangkatId,
    isStudioModalOpen, setIsStudioModalOpen, studioPerangkat, setStudioPerangkat
  } = props;

  return (
    <Suspense fallback={null}>
      {isUploadModalOpen && (
            <PerangkatAjarUploadModal
              isOpen={isUploadModalOpen}
              onClose={() => setIsUploadModalOpen(false)}
              uploadForm={uploadForm}
              setUploadForm={setUploadForm}
              filterJenisOptions={filterJenisOptions}
              mapelOptions={mapelOptions}
              teacherOptions={teacherOptions}
              isSubmitting={uploadMutation.isPending}
              onSubmit={handleUploadSubmit}
            />
          )}

          {isReviewModalOpen && (
            <PerangkatAjarReviewModal
              isOpen={isReviewModalOpen}
              onClose={() => setIsReviewModalOpen(false)}
              reviewForm={reviewForm}
              setReviewForm={setReviewForm}
              isSubmitting={reviewMutation.isPending}
              onSubmit={handleReviewSubmit}
            />
          )}

          {isLibraryModalOpen && (
            <PerangkatAjarLibraryModal
              isOpen={isLibraryModalOpen}
              onClose={() => setIsLibraryModalOpen(false)}
              librarySearch={librarySearch}
              setLibrarySearch={setLibrarySearch}
              libraryJenisFilter={libraryJenisFilter}
              setLibraryJenisFilter={setLibraryJenisFilter}
              claimMapelId={claimMapelId}
              setClaimMapelId={setClaimMapelId}
              claimingId={claimingId}
              libraryTemplates={libraryTemplatesData?.data ?? []}
              myPerangkatList={listPerangkat?.data ?? []}
              onEditExistingPerangkat={(item: any) => {
                setIsLibraryModalOpen(false);
                handleOpenWordEditor(item);
              }}
              isLoadingLibrary={isLoadingLibrary}
              filterJenisOptions={filterJenisOptions}
              mapelOptions={mapelOptions}
              teacherAssignedMapels={teacherAssignedMapels?.data}
              activeYear={activeYear}
              activeSemester={activeSemester}
              currentGuru={currentGuru}
              jenisLabels={JENIS_LABELS}
              onClaim={(payload) => claimMutation.mutate(payload)}
            />
          )}

          {isAIModalOpen && (
            <PerangkatAjarAIModal
              isOpen={isAIModalOpen}
              onClose={() => setIsAIModalOpen(false)}
              aiForm={aiForm}
              setAiForm={setAiForm}
              filterJenisOptions={filterJenisOptions}
              mapelOptions={mapelOptions}
              aiTopikPresets={aiPresetsData?.data}
              libraryTemplates={libraryTemplatesData?.data ?? []}
              myPerangkatList={listPerangkat?.data ?? []}
              onOpenLibraryCatalog={() => {
                setIsAIModalOpen(false);
                setIsLibraryModalOpen(true);
              }}
              onEditExistingPerangkat={(item: any) => {
                setIsAIModalOpen(false);
                handleOpenWordEditor(item);
              }}
              isGeneratingAI={generateAIMutation.isPending}
              isSavingAI={saveAIMutation.isPending}
              generatedAIContent={generatedAIContent}
              setGeneratedAIContent={setGeneratedAIContent}
              onSubmitAI={handleAISubmit}
              onSaveAI={handleAISave}
            />
          )}

          {isWizardModalOpen && (
            <PerangkatAjarWizardModal
              isOpen={isWizardModalOpen}
              onClose={() => setIsWizardModalOpen(false)}
              aiForm={aiForm}
              setAiForm={setAiForm}
              mapelOptions={mapelOptions}
              aiTopikPresets={aiPresetsData?.data}
              libraryTemplates={libraryTemplatesData?.data ?? []}
              myPerangkatList={listPerangkat?.data ?? []}
              onOpenLibraryCatalog={() => {
                setIsWizardModalOpen(false);
                setIsLibraryModalOpen(true);
              }}
              onEditExistingPerangkat={(item: any) => {
                setIsWizardModalOpen(false);
                handleOpenWordEditor(item);
              }}
              isGeneratingAI={generateAIMutation.isPending}
              onSubmitAI={handleAISubmit}
            />
          )}

          {isWordEditorOpen && (
            <PerangkatAjarWordEditorModal
              isOpen={isWordEditorOpen}
              onClose={() => {
                setIsWordEditorOpen(false);
                setSelectedWordEditItem(null);
              }}
              itemData={selectedWordEditItem}
              onSaveSuccess={() => {
                queryClient.invalidateQueries({ queryKey: ['perangkat-ajar'] });
              }}
            />
          )}

          {isReaderModalOpen && (
            <BahanAjarReaderModal
              isOpen={isReaderModalOpen}
              onClose={() => setIsReaderModalOpen(false)}
              perangkatId={readerPerangkatId}
            />
          )}

          {isStudioModalOpen && studioPerangkat && (
            <ModulAjarStudioModal
              isOpen={isStudioModalOpen}
              onClose={() => {
                setIsStudioModalOpen(false);
                setStudioPerangkat(null);
              }}
              perangkatId={studioPerangkat.id}
              perangkatJudul={studioPerangkat.judul}
              mapelNama={studioPerangkat.Mapel?.nama_mapel}
            />
          )}

        </Suspense>
  );
});
