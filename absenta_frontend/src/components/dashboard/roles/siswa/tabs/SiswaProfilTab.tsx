import React from 'react';
import { SiswaProfileTab } from '@/components/academic/siswa/dashboard/SiswaProfileTab';
import type { SectionEditType } from '@/components/academic/siswa/SiswaOnboardingModal';

export interface SiswaProfilTabProps {
  siswaProfile: any;
  user: any;
  studentPhotoUrl: string | null;
  studentInitials: string;
  currentClassName: string;
  currentJurusan: string;
  currentNisn: string;
  currentNik: string;
  currentOrtu: string;
  qrCodeDataUrl: string;
  renderValueOrUnconnectedBadge: (val: any, customConnectedText?: React.ReactNode) => React.ReactNode;
  handleOpenEditSection: (section: SectionEditType) => void;
  setShowDigitalCardModal: (val: boolean) => void;
  handlePasswordSubmit: (e: React.FormEvent) => void;
  oldPassword: string;
  setOldPassword: (val: string) => void;
  newPassword: string;
  setNewPassword: (val: string) => void;
  confirmPassword: string;
  setConfirmPassword: (val: string) => void;
  passwordSubmitting: boolean;
}

export const SiswaProfilTab: React.FC<SiswaProfilTabProps> = (props) => {
  return (
    <div className="space-y-4">
      <SiswaProfileTab {...props} />
    </div>
  );
};
