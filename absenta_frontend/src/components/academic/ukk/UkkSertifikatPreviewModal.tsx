import React from 'react';
import { UkkSertifikatModal, type UkkSertifikatModalProps, type UkkStudentItem } from './UkkSertifikatModal';

export interface UkkSertifikatPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  siswaId?: string;
  namaSiswa?: string;
  nomorSertifikat?: string;
  kelasId?: string;
  kelasNama?: string;
  jurusanId?: string;
  jurusanNama?: string;
  studentsList?: UkkStudentItem[];
}

export const UkkSertifikatPreviewModal: React.FC<UkkSertifikatPreviewModalProps> = (props) => {
  return <UkkSertifikatModal {...props} />;
};
