import React, { useState, useEffect } from 'react';
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

interface TicketDetail {
  id: string;
  subject: string;
  status: string;
  priority: string;
  member: { name: string } | null;
  messages: Message[];
  createdAt: string;
}

const TicketDetail: React.FC = () => {
  const { subscription, user } = useAuthStore();
  const { id } = useParams<{ id: string }>();

  const features = (subscription as any)?.features || subscription?.Plan?.features_json || subscription?.plan?.features_json || [];
  const isLocked = !Array.isArray(features) || !features.includes('KOPERASI');
  const navigate = useNavigate();
  const hasListPermission = user?.capabilities?.includes('cooperative.tickets.view.list') || user?.role?.name === 'SUPERADMIN';
  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [reply, setReply] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const fetchTicket = async () => {
    try {
      const response = await api.get(`/cooperative/tickets/${id}`);
      setTicket(response.data.data);
    } catch (error) {
      console.error('Failed to fetch ticket details', error);
      toast.error('Gagal memuat detail tiket');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTicket();
  }, [id]);

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reply.trim()) return;

    setSending(true);
    try {
      await api.post(`/cooperative/tickets/${id}/reply`, {
        content: reply,
        isStaff: hasListPermission
      });
      setReply('');
      fetchTicket();
    } catch (error) {
      console.error('Failed to send reply', error);
      toast.error('Gagal mengirim balasan');
    } finally {
      setSending(false);
    }
  };

  const handleStatusChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const status = e.target.value;
    try {
      await api.patch(`/cooperative/tickets/${id}/status`, { status });
      toast.success('Status tiket diperbarui');
      fetchTicket();
    } catch (error) {
      console.error('Failed to update status', error);
      toast.error('Gagal memperbarui status');
    }
  };

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
                    <span className="font-medium mr-2">{ticket.member?.name || 'Unknown'}</span>
                    <span>• {new Date(ticket.createdAt).toLocaleString('id-ID')}</span>
                </div>
            </div>
            </div>
            <div className="w-48">
                <Select
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
        {ticket.messages.length === 0 ? (
            <p className="text-center text-gray-400 py-8">Belum ada percakapan.</p>
        ) : (
            ticket.messages.map((msg) => (
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
          <input
            type="text"
            className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Tulis balasan..."
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            disabled={ticket.status === 'CLOSED'}
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
};

export default TicketDetail;


