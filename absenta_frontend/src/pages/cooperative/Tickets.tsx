import React, { useState, useEffect } from 'react';
import api from '../../lib/axiosInstance';
import { Button } from '../../components/cooperative/ui/Button';
import { Table } from '../../components/cooperative/ui/Table';
import { Modal } from '../../components/cooperative/ui/Modal';
import { Input } from '../../components/cooperative/ui/Input';
import { Select } from '../../components/cooperative/ui/Select';
import { Plus, MessageSquare } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../store/authStore';
import PremiumFeatureGate from '../../components/auth/PremiumFeatureGate';
import { AcademicPageLayout } from '../../components/academic/AcademicPageLayout';

interface Ticket {
  id: string;
  subject: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'CLOSED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  member: { name: string } | null;
  createdAt: string;
  updatedAt: string;
  _count: { messages: number };
}

const Tickets: React.FC = () => {
  const { subscription } = useAuthStore();
  const location = useLocation();
  const isManageRoute = location.pathname.endsWith('/manage');
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [formData, setFormData] = useState({
    subject: '',
    priority: 'MEDIUM',
    message: ''
  });

  const features = (subscription as any)?.features || subscription?.Plan?.features_json || subscription?.plan?.features_json || [];
  const isLocked = !Array.isArray(features) || !features.includes('KOPERASI');

  const fetchTickets = async () => {
    if (isLocked) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const response = await api.get('/cooperative/tickets');
      setTickets(response.data.data);
    } catch (error) {
      console.error('Failed to fetch tickets', error);
      toast.error('Gagal mengambil data tiket');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (subscription === undefined) return;
    fetchTickets();
  }, [subscription, isLocked]);

  const handleSubmit = async (e: React.FormEvent) => {
    if (isLocked) return;
    e.preventDefault();
    setSubmitLoading(true);
    try {
      await api.post('/cooperative/tickets', formData);
      toast.success('Tiket berhasil dibuat');
      setShowModal(false);
      setFormData({ subject: '', priority: 'MEDIUM', message: '' });
      fetchTickets();
    } catch (error) {
      console.error('Failed to create ticket', error);
      toast.error('Gagal membuat tiket');
    } finally {
      setSubmitLoading(false);
    }
  };

  const columns = [
    { header: 'Subjek', accessor: 'subject' as keyof Ticket, className: 'font-medium' },
    { header: 'Pengirim', accessor: (row: Ticket) => row.member?.name || 'Unknown' },
    { header: 'Prioritas', accessor: (row: Ticket) => (
        <span className={`text-xs font-bold ${
            row.priority === 'HIGH' ? 'text-red-600' : 
            row.priority === 'MEDIUM' ? 'text-yellow-600' : 'text-green-600'
        }`}>
            {row.priority}
        </span>
    )},
    { header: 'Status', accessor: (row: Ticket) => (
        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
            row.status === 'OPEN' ? 'bg-green-100 text-green-800' : 
            row.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
        }`}>
            {row.status.replace('_', ' ')}
        </span>
    )},
    { header: 'Dibuat', accessor: (row: Ticket) => new Date(row.createdAt).toLocaleDateString('id-ID') },
    { header: 'Aksi', accessor: (row: Ticket) => (
        <Link to={`/cooperative/tickets/${row.id}`}>
            <Button size="sm" variant="outline">Lihat Detail</Button>
        </Link>
    )}
  ];

  return (
    <PremiumFeatureGate 
      isLocked={isLocked} 
      moduleName="KOPERASI" 
      featureName="Layanan Bantuan (Tiket)"
    >
      <AcademicPageLayout
        title={isManageRoute ? "Kelola Keluhan Koperasi" : "Aduan & Keluhan Anggota"}
        description={isManageRoute ? "Kelola tiket aduan dan pertanyaan dari anggota koperasi" : "Sampaikan keluhan dan pertanyaan Anda kepada pengurus koperasi"}
        hardeningModuleKey="coop_tickets"
      >
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-800 flex items-center">
              <MessageSquare className="mr-2" /> {isManageRoute ? "Kelola Tiket Bantuan" : "Aduan & Keluhan"}
          </h2>
          {!isManageRoute && (
            <Button onClick={() => setShowModal(true)} icon={<Plus size={18} />}>
              Buat Tiket Baru
            </Button>
          )}
        </div>

        <Table 
          data={tickets} 
          columns={columns} 
          keyField="id" 
          isLoading={loading}
          emptyMessage="Belum ada tiket bantuan."
        />

        <Modal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          title="Buat Tiket Bantuan Baru"
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Subjek / Judul Masalah"
              value={formData.subject}
              onChange={(e) => setFormData({...formData, subject: e.target.value})}
              required
              placeholder="Contoh: Tidak bisa login"
            />
            
            <Select
              label="Prioritas"
              value={formData.priority}
              onChange={(e) => setFormData({...formData, priority: e.target.value})}
              options={[
                  { value: 'LOW', label: 'Low - Tidak Mendesak' },
                  { value: 'MEDIUM', label: 'Medium - Biasa' },
                  { value: 'HIGH', label: 'High - Sangat Mendesak' },
              ]}
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Pesan / Detail Masalah</label>
              <textarea
                className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                rows={4}
                value={formData.message}
                onChange={(e) => setFormData({...formData, message: e.target.value})}
                required
                placeholder="Jelaskan masalah anda secara detail..."
              ></textarea>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <Button 
                type="button" 
                variant="secondary" 
                onClick={() => setShowModal(false)}
              >
                Batal
              </Button>
              <Button 
                type="submit" 
                isLoading={submitLoading}
              >
                Kirim Tiket
              </Button>
            </div>
          </form>
        </Modal>
      </div>
      </AcademicPageLayout>
    </PremiumFeatureGate>
  );
};

export default Tickets;
