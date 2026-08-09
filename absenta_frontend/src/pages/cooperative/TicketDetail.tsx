import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../lib/axiosInstance';
import { Send, ArrowLeft, User } from 'lucide-react';
import { Button } from '../../components/cooperative/ui/Button';
import { Card } from '../../components/cooperative/ui/Card';
import { Select } from '../../components/cooperative/ui/Select';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../store/authStore';
import PremiumFeatureGate from '../../components/auth/PremiumFeatureGate';
import { AcademicPageLayout } from '../../components/academic/AcademicPageLayout';

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

const TicketDetail: React.FC = React.memo(() => {
  const queryClient = useQueryClient();
  const { subscription, user } = useAuthStore();
  const { id } = useParams<{ id: string }>();

  const features = useMemo(() => (subscription as unknown as Record<string, unknown>)?.features as string[] || subscription?.Plan?.features_json || subscription?.plan?.features_json || [], [subscription]);
  const isLocked = useMemo(() => !Array.isArray(features) || !features.includes('KOPERASI'), [features]);
  const navigate = useNavigate();
  const hasListPermission = useMemo(() => user?.capabilities?.includes('cooperative.tickets.view.list') || user?.role?.name === 'SUPERADMIN', [user]);
  const [reply, setReply] = useState('');

  const ticketQuery = useQuery({
    queryKey: ['koperasi-ticket-detail', id],
    queryFn: async () => {
      const response = await api.get(`/cooperative/tickets/${id}`);
      return (response.data.data ?? null) as TicketDetailData;
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });

  const ticket = ticketQuery.data || null;
  const loading = ticketQuery.isLoading;

  const fetchTicket = useCallback(async () => {
    await ticketQuery.refetch();
  }, [ticketQuery]);

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
    onError: (error) => {
      console.error('Failed to send reply', error);
      toast.error('Gagal mengirim balasan');
    }
  });

  const sending = replyMutation.isPending;

  const handleReply = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reply.trim()) return;
    await replyMutation.mutateAsync(reply);
  }, [reply, replyMutation]);

  const updateStatusMutation = useMutation({
    mutationFn: async (status: string) => {
      const res = await api.patch(`/cooperative/tickets/${id}/status`, { status });
      return res.data;
    },
    onSuccess: () => {
      toast.success('Status tiket diperbarui');
      queryClient.invalidateQueries({ queryKey: ['koperasi-ticket-detail', id] });
      queryClient.invalidateQueries({ queryKey: ['koperasi-tickets-list'] });
    },
    onError: (error) => {
      console.error('Failed to update status', error);
      toast.error('Gagal memperbarui status');
    }
  });

  const handleStatusChange = useCallback(async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const status = e.target.value;
    await updateStatusMutation.mutateAsync(status);
  }, [updateStatusMutation]);

  const breadcrumbs = useMemo(() => [
    { label: 'Koperasi', href: '/cooperative' },
    { label: 'Tiket Bantuan', href: '/cooperative/tickets' },
    { label: ticket?.subject ?? 'Detail Tiket' }
  ], [ticket?.subject]);

  const messages = useMemo(() => ticket?.messages ?? [], [ticket?.messages]);

  if (loading) return <div className="p-8 text-center text-gray-500">Loading...</div>;
  if (!ticket) return <div className="p-8 text-center text-gray-500">Ticket not found</div>;

  return (
    <PremiumFeatureGate
      isLocked={isLocked}
      moduleName="KOPERASI"
      featureName="Detail Tiket Bantuan"
    >
      <AcademicPageLayout
        title="Detail Tiket Bantuan"
        description="Percakapan dan status tiket"
        hardeningModuleKey="coop_ticket_detail"
        breadcrumbs={breadcrumbs}
        instruction={{
          title: 'Panduan Detail Tiket',
          description: 'Halaman ini menampilkan percakapan dan pengelolaan status tiket bantuan.',
          items: [
            { text: 'Ketik balasan di kolom bawah dan klik "Kirim" untuk membalas tiket.' },
            { text: 'Admin dapat mengubah status tiket menjadi In Progress atau Closed setelah masalah terselesaikan.' },
            { text: 'Tiket yang sudah Closed tidak dapat dibalas kembali.' }
          ]
        }}
      >
        <div className="max-w-4xl mx-auto h-[calc(100vh-140px)] flex flex-col space-y-4">
          <Card className="flex-none">
            <div className="flex justify-between items-start">
                <div className="flex items-center">
                <Button variant="secondary" size="sm" onClick={() => navigate(-1)} className="mr-4 rounded-full w-10 h-10 p-0 flex items-center justify-center">
                    <ArrowLeft size={20} />
                </Button>
                <div>
                    <h2 className="text-xl font-bold text-gray-800">{ticket.subject}</h2>
                    <div className="flex items-center text-sm text-gray-500 mt-1">
                        <User size={14} className="mr-1" />
                        <span className="font-medium mr-2">{ticket.member?.name ?? 'Unknown'}</span>
                        <span>• {new Date(ticket.createdAt).toLocaleString('id-ID')}</span>
                    </div>
                </div>
                </div>
                <div className="w-48">
                    <Select
                        label="Status"
                        id="ticket-status-select"
                        value={ticket.status}
                        onChange={handleStatusChange}
                        disabled={!hasListPermission}
                        options={[
                            { value: 'OPEN', label: 'Status: Open' },
                            { value: 'IN_PROGRESS', label: 'Status: In Progress' },
                            { value: 'CLOSED', label: 'Status: Closed' },
                        ]}
                    />
                </div>
            </div>
          </Card>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 rounded-xl border border-gray-200">
            {messages.length === 0 ? (
                <p className="text-center text-gray-400 py-8">Belum ada percakapan.</p>
            ) : (
                messages.map((msg) => (
                <div
                    key={msg.id}
                    className={`flex ${msg.isStaff ? 'justify-end' : 'justify-start'}`}
                >
                    <div
                    className={`max-w-[80%] rounded-xl px-4 py-3 shadow-sm ${
                        msg.isStaff
                        ? 'bg-blue-600 text-white rounded-tr-none'
                        : 'bg-white text-gray-800 border border-gray-200 rounded-tl-none'
                    }`}
                    >
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    <p className={`text-[10px] mt-1 text-right ${msg.isStaff ? 'text-blue-200' : 'text-gray-400'}`}>
                        {new Date(msg.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    </div>
                </div>
                ))
            )}
          </div>

          <div className="flex-none bg-white p-4 rounded-xl shadow-sm border border-gray-200">
            <form onSubmit={handleReply} className="flex gap-2">
              <label htmlFor="ticket-reply" className="sr-only">Tulis balasan tiket</label>
              <input
                id="ticket-reply"
                type="text"
                className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Tulis balasan..."
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                disabled={ticket.status === 'CLOSED'}
                aria-label="Kolom balasan tiket"
              />
              <Button
                type="submit"
                disabled={!reply.trim() || ticket.status === 'CLOSED' || sending}
                isLoading={sending}
                icon={<Send size={18} />}
              >
                Kirim
              </Button>
            </form>
            {ticket.status === 'CLOSED' && (
                <p className="text-center text-xs text-gray-500 mt-2">Tiket ini telah ditutup. Anda tidak dapat membalas lagi.</p>
            )}
          </div>
        </div>
      </AcademicPageLayout>
    </PremiumFeatureGate>
  );
});

export default TicketDetail;
