import React from 'react';
import {
  UkkSertifikatView,
  type UniversalUkkSertifikatViewProps,
  type UkkStudentItem,
} from './UkkSertifikatView';

export { UkkSertifikatView, type UniversalUkkSertifikatViewProps, type UkkStudentItem };

export interface UkkSertifikatModalProps extends UniversalUkkSertifikatViewProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UkkSertifikatModal: React.FC<UkkSertifikatModalProps> = ({
  isOpen,
  onClose,
  siswaId,
  namaSiswa,
  nomorSertifikat,
  kelasId,
  kelasNama,
  jurusanId,
  jurusanNama,
  studentsList = [],
}) => {
  if (!isOpen) return null;

  return (
    <UkkSertifikatView
      isModal={true}
      isOpen={isOpen}
      onClose={onClose}
      siswaId={siswaId}
      namaSiswa={namaSiswa}
      nomorSertifikat={nomorSertifikat}
      kelasId={kelasId}
      kelasNama={kelasNama}
      jurusanId={jurusanId}
      jurusanNama={jurusanNama}
      studentsList={studentsList}
    />
  );
};

export default UkkSertifikatModal;
