import React from 'react';
import { Building2, Mail, Phone, MapPin, Calendar } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui';
import type { TenantDetail } from '@/api/tenant-detail.api';
import { formatDateTime } from '@/utils/layoutUtils';

interface TenantInfoCardProps {
  tenantDetail: TenantDetail;
}

export const TenantInfoCard: React.FC<TenantInfoCardProps> = ({ tenantDetail }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Building2 className="mr-2 h-5 w-5" />
          Informasi Tenant
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="space-y-2">
            <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
              <Building2 className="mr-2 h-4 w-4" />
              Domain
            </div>
            <p className="font-medium">{tenantDetail.domain}</p>
          </div>
          
          {tenantDetail.contact_email && (
            <div className="space-y-2">
              <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                <Mail className="mr-2 h-4 w-4" />
                Email Kontak
              </div>
              <p className="font-medium">{tenantDetail.contact_email}</p>
            </div>
          )}
          
          {tenantDetail.contact_phone && (
            <div className="space-y-2">
              <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                <Phone className="mr-2 h-4 w-4" />
                Telepon
              </div>
              <p className="font-medium">{tenantDetail.contact_phone}</p>
            </div>
          )}
          
          {tenantDetail.address && (
            <div className="space-y-2 md:col-span-2 lg:col-span-3">
              <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                <MapPin className="mr-2 h-4 w-4" />
                Alamat
              </div>
              <p className="font-medium">{tenantDetail.address}</p>
            </div>
          )}
          
          <div className="space-y-2">
            <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
              <Calendar className="mr-2 h-4 w-4" />
              Dibuat
            </div>
            <p className="font-medium">{formatDateTime(tenantDetail.created_at)}</p>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
              <Calendar className="mr-2 h-4 w-4" />
              Diperbarui
            </div>
            <p className="font-medium">{formatDateTime(tenantDetail.updated_at)}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
