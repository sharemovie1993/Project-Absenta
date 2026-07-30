/**
 * WhatsappTemplateForm.tsx
 * Tab "Template" — Pengaturan template notifikasi otomatis.
 * Subkomponen dari WhatsappSettingsPage.
 */

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent, Label, Badge } from '@/components/ui';
import { Info } from 'lucide-react';
import type { WhatsappConfig } from '@/api/whatsapp.api';
import type { WaValidationErrors } from './whatsappSettings.types';

export interface WhatsappTemplateFormProps {
  config: WhatsappConfig;
  onConfigChange: (patch: Partial<WhatsappConfig>) => void;
  errors: WaValidationErrors;
}

const TemplateField: React.FC<{
  id: string;
  label: string;
  value: string;
  onChange: (val: string) => void;
  error?: string;
}> = ({ id, label, value, onChange, error }) => (
  <div className="space-y-3">
    <Label htmlFor={id} className="flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-300">
      {label}
      <Badge variant="outline" className="bg-green-50 text-green-600 text-xs border-green-100 dark:bg-green-950/20 dark:border-green-800 dark:text-green-400">
        AUTO-SEND
      </Badge>
    </Label>
    <textarea
      id={id}
      className="flex min-h-24 w-full rounded-xl border border-slate-200 bg-background px-4 py-3 text-sm focus:ring-2 focus:ring-green-500 outline-none transition-all dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
    {error && <p className="text-xs text-red-500">{error}</p>}
  </div>
);

export const WhatsappTemplateForm: React.FC<WhatsappTemplateFormProps> = ({
  config,
  onConfigChange,
  errors,
}) => {
  return (
    <Card className="border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xl">
      <CardHeader className="bg-slate-50/50 dark:bg-slate-800/30 border-b border-slate-100 dark:border-slate-800">
        <CardTitle className="text-lg font-bold">Template Notifikasi Otomatis</CardTitle>
      </CardHeader>
      <CardContent className="p-8 space-y-8">
        <div className="p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-800 rounded-xl flex gap-3">
          <Info className="h-5 w-5 text-amber-600 shrink-0" />
          <div className="text-xs text-amber-700 dark:text-amber-400 space-y-1">
            <p className="font-bold">Panduan Variabel:</p>
            <p>
              <code>{'{{nama_siswa}}'}</code>, <code>{'{{waktu}}'}</code>, <code>{'{{tipe}}'}</code>
            </p>
          </div>
        </div>

        <div className="space-y-6">
          <TemplateField
            id="template_absen_masuk"
            label="Template Absen Masuk"
            value={config.template_absen_masuk ?? ''}
            onChange={(val) => onConfigChange({ template_absen_masuk: val })}
            error={errors.template_absen_masuk}
          />

          <TemplateField
            id="template_absen_pulang"
            label="Template Absen Pulang"
            value={config.template_absen_pulang ?? ''}
            onChange={(val) => onConfigChange({ template_absen_pulang: val })}
            error={errors.template_absen_pulang}
          />
        </div>
      </CardContent>
    </Card>
  );
};

export default WhatsappTemplateForm;
