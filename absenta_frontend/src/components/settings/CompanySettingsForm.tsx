import React from 'react';
import { Card, CardHeader, CardTitle, CardContent, Input, Label } from '@/components/ui';
import type { SystemConfigPayload } from '@/services/systemConfig';

interface CompanySettingsFormProps {
  config: SystemConfigPayload;
  onChange: (field: keyof SystemConfigPayload, value: string | number | boolean) => void;
  canEdit: boolean;
}

export const CompanySettingsForm: React.FC<CompanySettingsFormProps> = ({ config, onChange, canEdit }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Identitas Perusahaan / Yayasan</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2">
          <Label htmlFor="company_legal_name">Nama Legal Perusahaan</Label>
          <Input
            id="company_legal_name"
            value={config.company_legal_name || ''}
            onChange={(e) => onChange('company_legal_name', e.target.value)}
            placeholder="PT. Pendidikan Maju Sejahtera"
            disabled={!canEdit}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="company_trade_name">Nama Dagang (Brand)</Label>
          <Input
            id="company_trade_name"
            value={config.company_trade_name || ''}
            onChange={(e) => onChange('company_trade_name', e.target.value)}
            placeholder="Sekolah Juara"
            disabled={!canEdit}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="company_npwp">NPWP</Label>
          <Input
            id="company_npwp"
            value={config.company_npwp || ''}
            onChange={(e) => onChange('company_npwp', e.target.value)}
            placeholder="00.000.000.0-000.000"
            disabled={!canEdit}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="company_address">Alamat Lengkap</Label>
          <Input
            id="company_address"
            value={config.company_address || ''}
            onChange={(e) => onChange('company_address', e.target.value)}
            placeholder="Jl. Raya No. 1..."
            disabled={!canEdit}
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="company_email_billing">Email Tagihan</Label>
            <Input
              id="company_email_billing"
              value={config.company_email_billing || ''}
              onChange={(e) => onChange('company_email_billing', e.target.value)}
              placeholder="finance@sekolah.id"
              disabled={!canEdit}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="company_phone_billing">Telepon Tagihan</Label>
            <Input
              id="company_phone_billing"
              value={config.company_phone_billing || ''}
              onChange={(e) => onChange('company_phone_billing', e.target.value)}
              placeholder="+62..."
              disabled={!canEdit}
            />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="company_signature_name">Nama Penanda Tangan (Invoice)</Label>
            <Input
              id="company_signature_name"
              value={config.company_signature_name || ''}
              onChange={(e) => onChange('company_signature_name', e.target.value)}
              placeholder="Budi Santoso"
              disabled={!canEdit}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="company_signature_title">Jabatan Penanda Tangan</Label>
            <Input
              id="company_signature_title"
              value={config.company_signature_title || ''}
              onChange={(e) => onChange('company_signature_title', e.target.value)}
              placeholder="Direktur Keuangan"
              disabled={!canEdit}
            />
          </div>
        </div>
        <div className="border-t pt-4 mt-4">
          <h3 className="font-medium mb-4">Informasi Rekening Bank (Manual Transfer)</h3>
          <div className="grid gap-2">
            <Label htmlFor="company_bank_name">Nama Bank</Label>
            <Input
              id="company_bank_name"
              value={config.company_bank_name || ''}
              onChange={(e) => onChange('company_bank_name', e.target.value)}
              placeholder="Contoh: BANK MANDIRI"
              disabled={!canEdit}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div className="grid gap-2">
              <Label htmlFor="company_bank_account">Nomor Rekening</Label>
              <Input
                id="company_bank_account"
                value={config.company_bank_account || ''}
                onChange={(e) => onChange('company_bank_account', e.target.value)}
                placeholder="Contoh: 1310018448883"
                disabled={!canEdit}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="company_bank_holder">Nama Pemilik Rekening (Atas Nama)</Label>
              <Input
                id="company_bank_holder"
                value={config.company_bank_holder || ''}
                onChange={(e) => onChange('company_bank_holder', e.target.value)}
                placeholder="Contoh: PT BARAYA TEKNOLOGI INDONESIA"
                disabled={!canEdit}
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
