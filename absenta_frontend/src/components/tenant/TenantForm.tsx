import React, { useState, useEffect } from 'react';
import { 
  createTenant, 
  updateTenant, 
  getTenantById, 
  type Tenant, 
  type CreateTenantRequest, 
  type UpdateTenantRequest,
  type AbsensiMode 
} from '../../api/tenants.api';
import { useAuthStore } from '../../store/authStore';
import { isSystemSuperAdmin } from '../../utils/rbac';
import { SearchableSelect, Modal, Button } from '../ui';

interface TenantFormProps {
  tenantId?: string | null; // Jika ada, berarti mode edit
  onSuccess: () => void;
  onCancel: () => void;
}

const TenantForm: React.FC<TenantFormProps> = ({ tenantId, onSuccess, onCancel }) => {
  const { user } = useAuthStore();
  const [formData, setFormData] = useState<CreateTenantRequest>({
    name: '',
    absensi_mode: 'SIMPLE',
    domain: '',
    logo_url: '',
    status: 'ACTIVE'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingTenant, setLoadingTenant] = useState(false);

  const isEditMode = Boolean(tenantId);

  // Load tenant data jika mode edit
  useEffect(() => {
    if (tenantId) {
      setLoadingTenant(true);
      getTenantById(tenantId)
        .then(response => {
          const tenant = response.data;
          setFormData({
            name: tenant.name,
            absensi_mode: tenant.absensi_mode,
            domain: tenant.domain || '',
            logo_url: tenant.logo_url || '',
            status: (tenant.status as 'ACTIVE' | 'INACTIVE' | 'SUSPENDED') || 'ACTIVE'
          });
        })
        .catch(err => {
          setError('Gagal memuat data tenant');
          console.error('Error loading tenant:', err);
        })
        .finally(() => {
          setLoadingTenant(false);
        });
    }
  }, [tenantId]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isEditMode && tenantId) {
        // Mode edit
        const updateData: UpdateTenantRequest = {
          name: formData.name,
          absensi_mode: formData.absensi_mode,
          domain: formData.domain || undefined,
          logo_url: formData.logo_url || undefined,
          status: formData.status
        };
        await updateTenant(tenantId, updateData);
      } else {
        // Mode create
        const skip = isSystemSuperAdmin(user?.role?.name || user?.role, user?.tenant_id);
        await createTenant(formData, { skipTenantHeader: skip });
      }
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Terjadi kesalahan saat menyimpan tenant');
      console.error('Error saving tenant:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loadingTenant) {
    return (
      <Modal
        isOpen={true}
        onClose={onCancel}
        title="Memuat Data"
        size="sm"
      >
        <div className="flex items-center space-x-3 py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <span>Memuat data tenant...</span>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      isOpen={true}
      onClose={onCancel}
      title={isEditMode ? 'Edit Tenant' : 'Tambah Tenant Baru'}
      size="md"
    >
      <div>
        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nama Tenant */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Nama Tenant *
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Masukkan nama tenant"
            />
          </div>

          

          {/* Mode Absensi */}
          <div>
            <label htmlFor="absensi_mode" className="block text-sm font-medium text-gray-700 mb-1">
              Mode Absensi *
            </label>
            <SearchableSelect
              value={formData.absensi_mode}
              onValueChange={(val) => setFormData(prev => ({ ...prev, absensi_mode: val as AbsensiMode }))}
              options={[
                { label: 'Simple - Gerbang & Rekap Dasar', value: 'SIMPLE' },
                { label: 'Multi Sesi - Fitur Lengkap', value: 'MULTI_SESI' }
              ]}
              placeholder="Pilih Mode Absensi"
              searchPlaceholder="Cari mode..."
            />
            <p className="text-xs text-gray-500 mt-1">
              {formData.absensi_mode === 'SIMPLE' 
                ? 'Mode sederhana dengan fitur gerbang dan rekap dasar'
                : 'Mode lengkap dengan manajemen sesi, absensi manual, dan rekap detail'
              }
            </p>
          </div>

          {/* Domain */}
          <div>
            <label htmlFor="domain" className="block text-sm font-medium text-gray-700 mb-1">
              Domain
            </label>
            <input
              type="text"
              id="domain"
              name="domain"
              value={formData.domain}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="contoh: sekolah.com"
            />
          </div>

          {/* Logo URL */}
          <div>
            <label htmlFor="logo_url" className="block text-sm font-medium text-gray-700 mb-1">
              URL Logo
            </label>
            <input
              type="url"
              id="logo_url"
              name="logo_url"
              value={formData.logo_url}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="https://example.com/logo.png"
            />
          </div>

          {/* Status */}
          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <SearchableSelect
              value={formData.status}
              onValueChange={(val) => setFormData(prev => ({ ...prev, status: val }))}
              options={[
                { label: 'Aktif', value: 'active' },
                { label: 'Tidak Aktif', value: 'inactive' },
                { label: 'Ditangguhkan', value: 'suspended' }
              ]}
              placeholder="Pilih Status"
              searchPlaceholder="Cari status..."
            />
          </div>

          {/* Tombol Aksi */}
          <div className="flex space-x-3 pt-6 border-t mt-6">
            <Button
              type="button"
              onClick={onCancel}
              variant="outline"
              className="flex-1"
              disabled={loading}
            >
              Batal
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
            >
              {loading ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Menyimpan...</span>
                </div>
              ) : (
                isEditMode ? 'Update' : 'Simpan'
              )}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
};

export default TenantForm;
