import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getPresensiTerpaduSesi } from '../../../../api/attendanceGerbang.api';
import { SesiAttendanceList } from '../../../attendance/sesi/SesiAttendanceList';
import { UniversalKbmCard } from './UniversalKbmCard';
import { PhotoPreviewModal } from './PhotoPreviewModal';

interface KbmSessionCardProps {
  session: any;
  viewMode: 'LIST' | 'GRID';
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  formatTime?: (iso?: string) => string;
  onSendWaReminder?: (item: any, method: 'GATEWAY' | 'PERSONAL_LINK') => void;
  onChangeStatus?: (item: any) => void;
}

export const KbmSessionCard = React.memo<KbmSessionCardProps>(({
  session: sesi,
  isExpanded,
  onToggleExpand,
  onSendWaReminder,
  onChangeStatus,
}) => {
  const targetId = sesi.id;
  const [previewPhotoData, setPreviewPhotoData] = React.useState<{
    photoUrl: string;
    guruNama?: string;
    kelasNama?: string;
    mapelNama?: string;
    timestamp?: string;
  } | null>(null);

  const { data: attendanceRes, isLoading } = useQuery({
    queryKey: ['sesi-detail-attendance-monitoring', targetId],
    queryFn: () => getPresensiTerpaduSesi(targetId),
    enabled: Boolean(isExpanded && targetId),
    staleTime: 10000,
  });

  const records = React.useMemo(() => {
    const raw = attendanceRes?.data || attendanceRes;
    return Array.isArray(raw?.data) ? raw.data : (Array.isArray(raw) ? raw : []);
  }, [attendanceRes]);

  return (
    <>
      <UniversalKbmCard
        mode="MONITORING"
        item={sesi}
        isExpanded={isExpanded}
        onToggleExpand={onToggleExpand}
        onSendWaReminder={onSendWaReminder}
        onChangeStatus={onChangeStatus}
        onViewPhoto={(it) => {
          const pUrl = it.foto_kegiatan || it.foto_masuk || it.session?.foto_kegiatan || it.session?.foto_masuk || it.AbsenGuru?.[0]?.foto_masuk;
          if (pUrl) {
            setPreviewPhotoData({
              photoUrl: pUrl,
              guruNama: it.guru_nama || it.Guru?.nama_guru,
              kelasNama: it.kelas_nama || it.Kelas?.nama_kelas,
              mapelNama: it.mapel_nama || it.Mapel?.nama_mapel || it.kegiatan,
              timestamp: `${it.jam_mulai || ''} - ${it.jam_selesai || ''} WIB`,
            });
          }
        }}
        expandedContent={
          <div className="p-1 space-y-3">
            {isLoading && records.length === 0 ? (
              <div className="py-8 text-center space-y-2">
                <div className="w-6 h-6 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-xs font-bold text-slate-500">Memuat rincian presensi kelas...</p>
              </div>
            ) : (
              <SesiAttendanceList
                records={records}
                sesi={sesi}
                isReportMode={true}
              />
            )}
          </div>
        }
      />

      {previewPhotoData && (
        <PhotoPreviewModal
          isOpen={Boolean(previewPhotoData)}
          onClose={() => setPreviewPhotoData(null)}
          photoUrl={previewPhotoData.photoUrl}
          guruNama={previewPhotoData.guruNama}
          kelasNama={previewPhotoData.kelasNama}
          mapelNama={previewPhotoData.mapelNama}
          timestamp={previewPhotoData.timestamp}
        />
      )}
    </>
  );
});
