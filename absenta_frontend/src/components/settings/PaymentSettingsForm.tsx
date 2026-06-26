import React from 'react';
import { Card, CardHeader, CardTitle, CardContent, Input, Label, SearchableSelect, Switch } from '@/components/ui';
import type { SystemConfigPayload } from '@/services/systemConfig';

interface PaymentSettingsFormProps {
  config: SystemConfigPayload;
  onChange: (field: keyof SystemConfigPayload, value: string | number | boolean) => void;
  canEdit: boolean;
}

export const PaymentSettingsForm: React.FC<PaymentSettingsFormProps> = ({ config, onChange, canEdit }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Metode Pembayaran</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="text-base">Stripe</Label>
            <p className="text-sm text-gray-500">Aktifkan pembayaran kartu kredit via Stripe</p>
          </div>
          <Switch
            checked={config.stripe_enabled ?? false}
            onCheckedChange={(checked) => onChange('stripe_enabled', checked)}
            disabled={!canEdit}
          />
        </div>

        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 font-bold">X</div>
            <div>
              <p className="font-medium">Xendit</p>
              <p className="text-sm text-gray-500">Virtual Account, E-Wallet, Retail Outlet</p>
            </div>
          </div>
          <Switch
            checked={config.xendit_enabled ?? false}
            onCheckedChange={(checked) => onChange('xendit_enabled', checked)}
            disabled={!canEdit}
          />
        </div>

        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center text-orange-600 font-bold">T</div>
            <div>
              <p className="font-medium">Tripay</p>
              <p className="text-sm text-gray-500">Payment Gateway Aggregator</p>
            </div>
          </div>
          <Switch
            checked={config.tripay_enabled ?? false}
            onCheckedChange={(checked) => onChange('tripay_enabled', checked)}
            disabled={!canEdit}
          />
        </div>

        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-600 font-bold">M</div>
            <div>
              <p className="font-medium">Midtrans</p>
              <p className="text-sm text-gray-500">GoPay, ShopeePay, QRIS, dll</p>
            </div>
          </div>
          <Switch
            checked={config.midtrans_enabled ?? false}
            onCheckedChange={(checked) => onChange('midtrans_enabled', checked)}
            disabled={!canEdit}
          />
        </div>

        {config.midtrans_enabled && (
          <div className="pl-6 border-l-2 border-gray-100 ml-2">
            <div className="grid gap-2">
              <Label>Midtrans Environment</Label>
              <SearchableSelect
                value={config.midtrans_environment || 'sandbox'}
                onValueChange={(val: string) => onChange('midtrans_environment', val)}
                options={[
                  { value: 'sandbox', label: 'Sandbox (Test)' },
                  { value: 'production', label: 'Production (Live)' }
                ]}
                disabled={!canEdit}
              />
            </div>
          </div>
        )}

        <div className="border-t pt-4 mt-4">
          <h3 className="font-medium mb-4">Pajak</h3>
          <div className="flex items-center justify-between mb-4">
            <div className="space-y-0.5">
              <Label className="text-base">Pengusaha Kena Pajak (PKP)</Label>
              <p className="text-sm text-gray-500">Aktifkan jika perusahaan anda PKP dan memungut PPN</p>
            </div>
            <Switch
              checked={config.is_pkp ?? false}
              onCheckedChange={(checked) => onChange('is_pkp', checked)}
              disabled={!canEdit}
            />
          </div>
          {config.is_pkp && (
            <div className="grid gap-2 max-w-xs">
              <Label>Tarif PPN (%)</Label>
              <Input
                type="number"
                value={config.ppn_rate || 11}
                onChange={(e) => onChange('ppn_rate', e.target.value)}
                disabled={!canEdit}
              />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
