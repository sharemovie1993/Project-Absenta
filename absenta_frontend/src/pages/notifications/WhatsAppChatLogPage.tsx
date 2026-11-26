import React from 'react';
import { AcademicPageLayout } from '@/components/academic/AcademicPageLayout';
import { SectionCard } from '@/components/ui/SectionCard';
import { WhatsAppChatLogView } from '@/components/notifications/chatlog/WhatsAppChatLogView';

const WhatsAppChatLogPage: React.FC = () => {
  return (
    <AcademicPageLayout
      hardeningModuleKey="notifications_whatsapp_chatlog"
      title="Riwayat & Grup WhatsApp"
      description="Monitor status pengiriman pesan (Terkirim / Dibaca), percakapan chatbot & daftar grup WA tertaut"
      instruction={{
        title: 'Panduan Chat Log WhatsApp',
        description: 'Monitoring status pengiriman & baca pesan WhatsApp sekolah secara live.',
        items: [
          { text: 'Centang satu (✓) menandakan pesan masuk server WA, centang dua (✓✓) sampai di HP penerima, dan centang biru (✓✓) sudah dibaca.' },
          { text: 'Daftar pesan diperbarui otomatis setiap 5 detik saat percakapan dibuka.' },
        ],
      }}
    >
      <SectionCard
        fullWidth
        className="flex flex-col w-full min-w-0 max-w-full border-none shadow-none bg-transparent p-0"
      >
        <WhatsAppChatLogView />
      </SectionCard>
    </AcademicPageLayout>
  );
};

export default WhatsAppChatLogPage;
