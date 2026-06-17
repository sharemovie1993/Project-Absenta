import React, { useEffect, useState } from 'react';
import api from '../../lib/axiosInstance';
import { Button } from '../../components/cooperative/ui/Button';
import { Input } from '../../components/cooperative/ui/Input';
import { Table } from '../../components/cooperative/ui/Table';
import { Card } from '../../components/cooperative/ui/Card';
import { Plus, Trash, Bell } from 'lucide-react';
import toast from 'react-hot-toast';

import { useAuthStore } from '../../store/authStore';
import PremiumFeatureGate from '../../components/auth/PremiumFeatureGate';
import { AcademicPageLayout } from '../../components/academic/AcademicPageLayout';

interface Announcement {
  id: string;
  title: string;
  content: string;
  createdAt: string;
}

const Announcements: React.FC = () => {
  const { subscription, user } = useAuthStore();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);

  // Otorisasi & Gating Logic
  const features = (subscription as any)?.features || subscription?.Plan?.features_json || subscription?.plan?.features_json || [];
  const isLocked = !Array.isArray(features) || !features.includes('KOPERASI');

  const canCreate = user?.capabilities?.includes('cooperative.announcements.create') || user?.role?.name === 'SUPERADMIN';
  const canDelete = user?.capabilities?.includes('cooperative.announcements.delete') || user?.role?.name === 'SUPERADMIN';

  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      const res = await api.get('/cooperative/announcements');
      setAnnouncements(res.data.data);
    } catch (error) {
      console.error(error);
      toast.error('Gagal mengambil pengumuman');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitLoading(true);
    try {
      await api.post('/cooperative/announcements', { title, content });
      toast.success('Pengumuman berhasil dibuat');
      setTitle('');
      setContent('');
      fetchAnnouncements();
    } catch (error) {
      toast.error('Gagal membuat pengumuman');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus pengumuman ini?')) return;
    try {
      await api.delete(`/cooperative/announcements/${id}`);
      toast.success('Pengumuman dihapus');
      fetchAnnouncements();
    } catch (error) {
      toast.error('Gagal menghapus pengumuman');
    }
  };

  const columns = [
    { header: 'Judul', accessor: 'title' as keyof Announcement, className: 'font-medium' },
    { header: 'Isi', accessor: (row: Announcement) => <span className="line-clamp-2">{row.content}</span> },
    { header: 'Tanggal', accessor: (row: Announcement) => new Date(row.createdAt).toLocaleDateString('id-ID') },
    ...(canDelete ? [{
      header: 'Aksi', accessor: (row: Announcement) => (
          <Button size="sm" variant="danger" onClick={() => handleDelete(row.id)} icon={<Trash size={14} />} />
      )
    }] : [])
  ];

  return (
    <PremiumFeatureGate
      isLocked={isLocked}
      moduleName="KOPERASI"
      featureName="Manajemen Pengumuman"
    >
      <AcademicPageLayout
        title={canCreate ? "Manajemen Pengumuman" : "Pengumuman Koperasi"}
        description={canCreate ? "Kelola pengumuman koperasi" : "Pengumuman dan info terbaru dari pengurus koperasi"}
        hardeningModuleKey="coop_announcements"
      >
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center">
          <Bell className="mr-2" /> {canCreate ? "Manajemen Pengumuman" : "Pengumuman Koperasi"}
        </h2>

        <div className={canCreate ? "grid grid-cols-1 md:grid-cols-3 gap-6" : "block"}>
          {/* Form */}
          {canCreate && (
            <div className="md:col-span-1">
              <Card title="Buat Pengumuman Baru">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <Input
                    label="Judul"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                    placeholder="Judul pengumuman..."
                  />
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Isi Pengumuman</label>
                    <textarea
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      rows={4}
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      required
                      placeholder="Tulis isi pengumuman..."
                    ></textarea>
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full"
                    isLoading={submitLoading}
                    icon={<Plus size={18} />}
                  >
                    Publish
                  </Button>
                </form>
              </Card>
            </div>
          )}

          {/* List */}
          <div className={canCreate ? "md:col-span-2" : "w-full"}>
            <Table 
              data={announcements} 
              columns={columns} 
              keyField="id" 
              isLoading={loading}
              emptyMessage="Belum ada pengumuman."
            />
          </div>
        </div>
      </div>
      </AcademicPageLayout>
    </PremiumFeatureGate>
  );
};

export default Announcements;


