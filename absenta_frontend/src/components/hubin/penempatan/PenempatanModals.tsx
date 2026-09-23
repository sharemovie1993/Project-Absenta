import React, { lazy, Suspense } from 'react';
import { Loader } from '@/components/ui';
import type { SiswaPkl } from '@/pages/hubin/types/penempatan.types';
import type { usePenempatanActions } from './usePenempatanActions';

const HubinPklPlottingModal = lazy(() => import('@/components/hubin/HubinPklPlottingModal').then(m => ({ default: m.HubinPklPlottingModal })));
const HubinPklBulkPlottingModal = lazy(() => import('@/components/hubin/HubinPklBulkPlottingModal').then(m => ({ default: m.HubinPklBulkPlottingModal })));
const HubinPklNilaiModal = lazy(() => import('@/components/hubin/HubinPklNilaiModal').then(m => ({ default: m.HubinPklNilaiModal })));
const HubinPklKunjunganModal = lazy(() => import('@/components/hubin/HubinPklKunjunganModal').then(m => ({ default: m.HubinPklKunjunganModal })));
const HubinPklReviewJurnalModal = lazy(() => import('@/components/hubin/HubinPklReviewJurnalModal').then(m => ({ default: m.HubinPklReviewJurnalModal })));
const HubinPklPrintSurat = lazy(() => import('@/components/hubin/HubinPklPrintSurat').then(m => ({ default: m.HubinPklPrintSurat })));
const HubinPklPrintMonitoringModal = lazy(() => import('@/components/hubin/HubinPklPrintMonitoringModal').then(m => ({ default: m.HubinPklPrintMonitoringModal })));
const HubinPklMutasiModal = lazy(() => import('@/components/hubin/HubinPklMutasiModal').then(m => ({ default: m.HubinPklMutasiModal })));
const MitraFormModal = lazy(() => import('@/components/hubin/MitraFormModal').then(m => ({ default: m.MitraFormModal })));

export interface PenempatanModalsProps {
  actions: ReturnType<typeof usePenempatanActions>;
  mitraOptions: { value: string; label: string }[];
  guruOptions: { value: string; label: string }[];
  kelasOptions: { value: string; label: string }[];
  tpOptions: { value: string; label: string }[];
  placedStudentIds: Set<string>;
  tenantData: unknown;
  collectiveStudents: SiswaPkl[];
  representativeRow: SiswaPkl | null;
  currentSelectedPkl: SiswaPkl | null;
  selectedKunjunganList: SiswaPkl['kunjungan_json'];
  setGuruSearch: (val: string) => void;
  setMitraSearch: (val: string) => void;
  isLoadingGuru?: boolean;
  isLoadingMitra?: boolean;
  selectedTpFilter?: string;
  filterJurusan?: string;
  canManage: boolean;
}

export const PenempatanModals: React.FC<PenempatanModalsProps> = React.memo(({
  actions,
  mitraOptions,
  guruOptions,
  kelasOptions,
  tpOptions,
  placedStudentIds,
  tenantData,
  collectiveStudents,
  representativeRow,
  currentSelectedPkl,
  selectedKunjunganList,
  setGuruSearch,
  setMitraSearch,
  isLoadingGuru,
  isLoadingMitra,
  selectedTpFilter,
  filterJurusan,
  canManage
}) => {
  return (
    <>
      <Suspense fallback={<div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm"><Loader size="lg" /></div>}>
        <HubinPklPlottingModal
          isOpen={actions.isPlottingOpen}
          onClose={() => {
            actions.setIsPlottingOpen(false);
            actions.setSelectedPkl(null);
            actions.setSelectedSiswaId('');
            actions.setSelectedMitraId('');
            actions.setSelectedPembimbingId('');
          }}
          mitraOptions={mitraOptions}
          guruOptions={guruOptions}
          selectedSiswaId={actions.selectedSiswaId}
          setSelectedSiswaId={actions.setSelectedSiswaId}
          selectedMitraId={actions.selectedMitraId}
          setSelectedMitraId={actions.setSelectedMitraId}
          selectedPembimbingId={actions.selectedPembimbingId}
          setSelectedPembimbingId={actions.setSelectedPembimbingId}
          handlePlottingSubmit={actions.handlePlottingSubmit}
          isPending={actions.createMutation.isPending || actions.updateMutation.isPending}
          onGuruSearch={setGuruSearch}
          onMitraSearch={setMitraSearch}
          isLoadingGuru={isLoadingGuru}
          isLoadingMitra={isLoadingMitra}
          editingPkl={actions.selectedPkl}
          filterJurusan={filterJurusan}
        />
      </Suspense>

      <Suspense fallback={null}>
        {actions.isMutasiOpen && (
          <HubinPklMutasiModal
            isOpen={actions.isMutasiOpen}
            onClose={() => {
              actions.setIsMutasiOpen(false);
              actions.setSelectedMutasiPkl(null);
            }}
            row={actions.selectedMutasiPkl}
            mitraOptions={mitraOptions}
            guruOptions={guruOptions}
            onSubmit={actions.handleMutasiSubmit}
            isPending={actions.mutasiMutation.isPending}
          />
        )}
      </Suspense>

      <Suspense fallback={null}>
        <HubinPklBulkPlottingModal
          isOpen={actions.isBulkPlottingOpen}
          onClose={() => actions.setIsBulkPlottingOpen(false)}
          mitraOptions={mitraOptions}
          guruOptions={guruOptions}
          kelasOptions={kelasOptions}
          tpOptions={tpOptions}
          placedStudentIds={placedStudentIds}
          onSubmit={actions.handleBulkPlottingSubmit}
          isPending={actions.bulkCreateMutation.isPending}
          isLoadingGuru={isLoadingGuru}
          isLoadingMitra={isLoadingMitra}
          selectedTpFilter={selectedTpFilter}
        />
      </Suspense>

      <Suspense fallback={null}>
        <HubinPklNilaiModal
          isOpen={actions.isNilaiOpen}
          onClose={() => {
            actions.setIsNilaiOpen(false);
            actions.setSelectedPkl(null);
          }}
          selectedPkl={actions.selectedPkl}
          handleNilaiSubmit={actions.handleNilaiSubmit}
          isPending={actions.nilaiMutation.isPending}
        />
      </Suspense>

      <Suspense fallback={null}>
        <HubinPklKunjunganModal
          isOpen={actions.isKunjunganOpen}
          onClose={() => {
            actions.setIsKunjunganOpen(false);
            actions.setSelectedPkl(null);
            actions.setVisitFotoUrl('');
            actions.setVisitLat('');
            actions.setVisitLng('');
          }}
          selectedPkl={currentSelectedPkl}
          selectedKunjunganList={selectedKunjunganList}
          handleKunjunganSubmit={actions.handleKunjunganSubmit}
          handleDeleteKunjungan={actions.handleDeleteKunjungan}
          isPending={actions.kunjunganMutation.isPending || actions.updateKunjunganMutation.isPending || actions.deleteKunjunganMutation.isPending}
          isDetectingGps={actions.isDetectingGps}
          setIsDetectingGps={actions.setIsDetectingGps}
          visitLat={actions.visitLat}
          setVisitLat={actions.setVisitLat}
          visitLng={actions.visitLng}
          setVisitLng={actions.setVisitLng}
          visitFotoUrl={actions.visitFotoUrl}
          setVisitFotoUrl={actions.setVisitFotoUrl}
          onPrintMonitoring={(row) => {
            actions.setSelectedMonitoringPkl(row);
            actions.setIsMonitoringConfigModalOpen(true);
          }}
        />
      </Suspense>

      <Suspense fallback={null}>
        <HubinPklReviewJurnalModal
          isOpen={actions.isReviewJurnalOpen}
          onClose={() => {
            actions.setIsReviewJurnalOpen(false);
            actions.setSelectedPkl(null);
          }}
          selectedPkl={actions.selectedPkl}
          reviewJurnalStatus={actions.reviewJurnalStatus}
          setReviewJurnalStatus={actions.setReviewJurnalStatus}
          reviewJurnalCatatan={actions.reviewJurnalCatatan}
          setReviewJurnalCatatan={actions.setReviewJurnalCatatan}
          reviewJurnalMutation={actions.reviewJurnalMutation}
        />
      </Suspense>

      <Suspense fallback={null}>
        <HubinPklPrintSurat
          printData={actions.printData}
          printKolektifMitraId={actions.printKolektifMitraId}
          tenantData={tenantData}
          collectiveStudents={collectiveStudents}
          representativeRow={representativeRow}
          printMode={actions.printMode}
          monitoringConfig={actions.monitoringPrintConfig}
        />
      </Suspense>

      <Suspense fallback={null}>
        {actions.isMonitoringConfigModalOpen && actions.selectedMonitoringPkl && (
          <HubinPklPrintMonitoringModal
            isOpen={actions.isMonitoringConfigModalOpen}
            onClose={() => {
              actions.setIsMonitoringConfigModalOpen(false);
              actions.setSelectedMonitoringPkl(null);
            }}
            selectedPkl={actions.selectedMonitoringPkl}
            onConfirmPrint={actions.handleConfirmMonitoringPrint}
          />
        )}
      </Suspense>

      <Suspense fallback={null}>
        {actions.isEditMitraKontakOpen && actions.editingMitraForKontak && (
          <MitraFormModal
            isOpen={actions.isEditMitraKontakOpen}
            onClose={() => {
              actions.setIsEditMitraKontakOpen(false);
              actions.setEditingMitraForKontak(null);
            }}
            onSubmit={actions.handleMitraKontakSubmit}
            editingMitra={actions.editingMitraForKontak}
            isPending={actions.updateMitraMutation.isPending}
            isEditKontakOnly={!canManage}
          />
        )}
      </Suspense>
    </>
  );
});
