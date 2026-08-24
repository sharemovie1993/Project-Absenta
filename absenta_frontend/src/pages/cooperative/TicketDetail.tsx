import React, { useState, useCallback, useMemo } from 'react';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../lib/axiosInstance';
import { Send, ArrowLeft, User } from 'lucide-react';
import { Button, Card, SearchableSelect, Input, SectionCard } from '@/components/ui';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../store/authStore';
import { useCapabilities } from '../../hooks/useCapabilities';
import PremiumFeatureGate from '../../components/auth/PremiumFeatureGate';
import { AcademicPageLayout } from '../../components/academic/AcademicPageLayout';
import { InfraErrorBoundary } from '@/components/superadmin/infra/InfraErrorBoundary';
import { formatDate } from '@/utils/layoutUtils';

const replySchema = z.object({
  reply: z.string().min(1, 'Pesan balasan tidak boleh kosong'),
});

interface Message {
  id: string;
  content: string;
  isStaff: boolean;
  createdAt: string;
}

interface TicketDetailData {
  id: string;
  subject: string;
  status: string;
  priority: string;
  member: { name: string } | null;
  messages: Message[];
  createdAt: string;
}

export const TicketDetail: React.FC = React.memo(() => {
  const queryClient = useQueryClient();
  const { subscription } = useAuthStore();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const features = useMemo(() => {
    const sub = subscription as { features?: string[]; Plan?: { features_json?: string[] }; plan?: { features_json?: string[] } } | null;
    return sub?.features || sub?.Plan?.features_json || sub?.plan?.features_json || [];
  }, [subscription]);

  const isLocked = useMemo(() => !Array.isArray(features) || !features.includes('KOPERASI'), [features]);
  const { isKoperasi, isAdmin, can } = useCapabilities();
  const hasListPermission = useMemo(() => isAdmin || isKoperasi || can('cooperative.tickets.view.list'), [isAdmin, isKoperasi, can]);
  const [reply, setReply] = useState('');

  const ticketQuery = useQuery({
    queryKey: ['koperasi-ticket-detail', id],
    queryFn: async () => {
      const response = await api.get(`/cooperative/tickets/${id}`);
      return (response.data.data ?? null) as TicketDetailData;
    },
    enabled: !isLocked && !!id,
    staleTime: 5 * 60 * 1000,
  });

  const ticket = ticketQuery.data || null;
  const loading = ticketQuery.isLoading;

  const replyMutation = useMutation({
    mutationFn: async (content: string) => {
      const res = await api.post(`/cooperative/tickets/${id}/reply`, {
        content,
        isStaff: hasListPermission
      });
      return res.data;
    },
    onSuccess: () => {
      setReply('');
      queryClient.invalidateQueries({ queryKey: ['koperasi-ticket-detail', id] });
      queryClient.invalidateQueries({ queryKey: ['koperasi-tickets-list'] });
    },
    onError: () => {
      toast.error('Gagal mengirim balasan');
    }
  });

  const changeTicketStatusMutation = useMutation({
    mutationFn: async (status: string) => {
      const res = await api.patch(`/cooperative/tickets/${id}/status`, { status });
      return res.data;
    },
    onSuccess: () => {
      toast.success('Status tiket diperbarui');
      queryClient.invalidateQueries({ queryKey: ['koperasi-ticket-detail', id] });
      queryClient.invalidateQueries({ queryKey: ['koperasi-tickets-list'] });
    },
    onError: () => {
      toast.error('Gagal memperbarui status');
    }
  });

  const handleReply = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = replySchema.safeParse({ reply });
    if (!parsed.success) {
      toast.error(parsed.error.errors[0]?.message || 'Pesan balasan belum valid');
      return;
    }
    await replyMutation.mutateAsync(reply);
  }, [reply, replyMutation]);

  const breadcrumbs = useMemo(() => [
    { label: 'Koperasi', path: '/cooperative/dashboard' },
    { label: 'Tiket Bantuan', path: '/cooperative/tickets' },
    { label: ticket?.subject || 'Detail Tiket' }
  ], [ticket?.subject]);

  const messages = useMemo(() => ticket?.messages || [], [ticket?.messages]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-emerald-500 border-t-transparent mb-2" />
        <p className="text-xs text-slate-400">Memuat rincian tiket...</p>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 text-xs text-slate-400">
        Tiket tidak ditemukan atau telah dihapus.
      </div>
    );
  }

  return (
    <PremiumFeatureGate
      moduleName="KOPERASI"
      featureName="Detail Tiket Bantuan"
      description="Percakapan dan status tiket layanan bantuan anggota koperasi sekolah."
    >
      <InfraErrorBoundary>
        <AcademicPageLayout
          title="Detail Tiket Bantuan Koperasi"
          description="Pantau diskusi, klarifikasi keluhan, dan kelola status penyelesaian tiket anggota."
          breadcrumbs={breadcrumbs}
          hardeningModuleKey="coop_ticket_detail"
          topSlot={
            <div className="flex items-center justify-end gap-2">
              <Button
                variant="toolbarOutline"
                size="toolbar"
                onClick={() => navigate('/cooperative/tickets')}
                className="flex items-center gap-1.5 font-bold rounded-xl"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Kembali ke Daftar
              </Button>
            </div>
          }
          instruction={{
            title: "Panduan Detail Tiket",
            description: "Halaman ini menampilkan percakapan dan pengelolaan status tiket bantuan.",
            items: [
              { text: "Ketik balasan di kolom bawah dan klik Kirim untuk membalas percakapan." },
              { text: "Ubah status tiket menjadi Selesai setelah masalah berhasil diselesaikan." },
              { text: "Tiket dengan status Ditutup tidak dapat dibalas kembali." }
            ]
          }}
        >
          <SectionCard fullWidth className="flex flex-col w-full min-w-0 border-none shadow-none bg-transparent p-0">
            <div className="max-w-4xl mx-auto w-full space-y-4">
              {/* Ticket Subject Card */}
              <Card className="p-5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      {ticket.subject}
                    </h3>
                    <div className="flex items-center text-xs text-slate-400 gap-2 mt-1">
                      <User size={14} className="text-slate-400" />
                      <span className="font-bold text-slate-700 dark:text-slate-300">{ticket.member?.name || 'Anggota'}</span>
                      <span>• {formatDate(ticket.createdAt, { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                    </div>
                  </div>

                  {hasListPermission && (
                    <div className="w-48">
                      <SearchableSelect
                        id="ticket-status-select"
                        aria-label="Pilih status tiket"
                        value={ticket.status}
                        onValueChange={(val) => changeTicketStatusMutation.mutate(val)}
                        options={[
                          { value: 'OPEN', label: 'Status: Open' },
                          { value: 'IN_PROGRESS', label: 'Status: In Progress' },
                          { value: 'CLOSED', label: 'Status: Closed' },
                        ]}
                        placeholder="Status Tiket"
                      />
                    </div>
                  )}
                </div>
              </Card>

              {/* Messages Discussion Box */}
              <div className="min-h-[360px] max-h-[460px] overflow-y-auto p-4 space-y-3 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-100 dark:border-slate-800">
                {messages.length === 0 ? (
                  <p className="text-center text-slate-400 text-xs py-12">Belum ada percakapan pada tiket ini.</p>
                ) : (
                  messages?.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.isStaff ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-2xl px-4 py-3 shadow-sm text-xs ${
                          msg.isStaff
                            ? 'bg-emerald-600 text-white rounded-tr-none'
                            : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-100 dark:border-slate-700 rounded-tl-none'
                        }`}
                      >
                        <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                        <p className={`text-[10px] mt-1 text-right font-medium ${msg.isStaff ? 'text-emerald-100' : 'text-slate-400'}`}>
                          {formatDate(msg.createdAt, { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Reply Box */}
              <Card className="p-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm">
                <form onSubmit={handleReply} className="flex gap-2">
                  <Input
                    id="ticket-reply-input"
                    aria-label="Tulis pesan balasan tiket"
                    type="text"
                    placeholder="Tulis pesan balasan..."
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    disabled={ticket.status === 'CLOSED'}
                    className="flex-1 text-xs rounded-xl"
                  />
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={!reply.trim() || ticket.status === 'CLOSED' || replyMutation.isPending}
                    className="flex items-center gap-1.5 font-bold rounded-xl"
                  >
                    <Send size={14} />
                    {replyMutation.isPending ? 'Mengirim...' : 'Kirim'}
                  </Button>
                </form>
                {ticket.status === 'CLOSED' && (
                  <p className="text-center text-[10px] text-slate-400 mt-2 font-medium">
                    Tiket ini telah ditutup. Anda tidak dapat membalas lagi.
                  </p>
                )}
              </Card>
            </div>
          </SectionCard>
        </AcademicPageLayout>
      </InfraErrorBoundary>
    </PremiumFeatureGate>
  );
});

export default TicketDetail;
