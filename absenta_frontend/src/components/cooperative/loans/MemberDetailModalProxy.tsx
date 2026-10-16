import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../../lib/axiosInstance';
import { MemberDetailModal } from '../members/MemberDetailModal';
import type { Member, CoopProfile } from '../members/types';
import { fetchCoopSettings } from '../../../utils/cooperative/coopDocUtils';
import { handleDownloadCardPdf, handleExportSinglePdf } from '../../../utils/cooperative/memberDocUtils';
import { useAuthStore } from '../../../store/authStore';
import toast from 'react-hot-toast';

interface MemberDetailModalProxyProps {
  isOpen: boolean;
  onClose: () => void;
  memberId: string | null;
}

export const MemberDetailModalProxy: React.FC<MemberDetailModalProxyProps> = React.memo(({
  isOpen,
  onClose,
  memberId,
}) => {
  const { subscription } = useAuthStore();
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');

  // Fetch full member details
  const memberQuery = useQuery({
    queryKey: ['koperasi-member-detail', memberId],
    queryFn: async () => {
      const res = await api.get(`/cooperative/members/${memberId}`);
      return res.data as Member;
    },
    enabled: isOpen && !!memberId,
    staleTime: 60 * 1000,
  });

  const member = memberQuery.data || null;

  // Fetch cooperative settings for card display
  const settingsQuery = useQuery({
    queryKey: ['koperasi-settings-profile-proxy'],
    queryFn: fetchCoopSettings,
    enabled: isOpen,
    staleTime: 5 * 60 * 1000,
  });

  const coopSettings = settingsQuery.data || null;

  const coopName = coopSettings?.school_name || coopSettings?.coop_name || 'KOPERASI SEKOLAH';
  const coopProfile: CoopProfile = {
    legalNo: coopSettings?.legal_no || '',
    address: coopSettings?.address || 'Lingkungan Sekolah',
    phone: coopSettings?.phone || '-',
    email: coopSettings?.email || '-',
    website: coopSettings?.website || '-',
  };

  // Generate QR code for member card
  useEffect(() => {
    let active = true;
    if (member?.memberNo) {
      import('qrcode')
        .then((QRCode) => QRCode.toDataURL(member.memberNo, { margin: 1, width: 200 }))
        .then((url) => {
          if (active) setQrCodeUrl(url);
        })
        .catch((err) => console.error('Error generating QR Code:', err));
    } else {
      setQrCodeUrl('');
    }
    return () => {
      active = false;
    };
  }, [member?.memberNo]);

  if (!isOpen || !memberId) return null;

  return (
    <MemberDetailModal
      isOpen={isOpen}
      onClose={onClose}
      member={member}
      coopName={coopName}
      coopProfile={coopProfile}
      qrCodeUrl={qrCodeUrl}
      onDownloadCardPdf={(m) => handleDownloadCardPdf(m, coopName, coopProfile)}
      onExportSinglePdf={(m) => handleExportSinglePdf(m, subscription)}
      onInitiateTerminate={() => toast('Hubungi Pengurus Koperasi di halaman Anggota untuk penutupan keanggotaan.', { icon: 'ℹ️' })}
      canUpdate={false}
      canDelete={false}
    />
  );
});

MemberDetailModalProxy.displayName = 'MemberDetailModalProxy';
