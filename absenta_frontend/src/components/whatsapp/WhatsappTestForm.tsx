/**
 * WhatsappTestForm.tsx
 * Tab "Uji Coba" — Form pengetesan pengiriman WhatsApp.
 * Subkomponen dari WhatsappSettingsPage.
 */

import React from 'react';
import {
  Card, CardContent, Button, Input, Label, Loader, Alert, AlertTitle, AlertDescription, Badge,
} from '@/components/ui';
import { Send, Info, CheckCircle2, XCircle } from 'lucide-react';
import type { WhatsappConfig } from '@/api/whatsapp.api';
import type { TestResult, WaValidationErrors } from './whatsappSettings.types';

export interface WhatsappTestFormProps {
  config: WhatsappConfig;
  dbProviderName: string | null;
  testNumber: string;
  onTestNumberChange: (num: string) => void;
  onTest: () => void;
  testing: boolean;
  testResult: TestResult | null;
  errors: WaValidationErrors;
}

export const WhatsappTestForm: React.FC<WhatsappTestFormProps> = ({
  config,
  dbProviderName,
  testNumber,
  onTestNumberChange,
  onTest,
  testing,
  testResult,
  errors,
}) => {
  const isLocalDb = dbProviderName === 'LOCAL';
  const isLocalConfig = config.provider_name === 'LOCAL';
  const isProviderChanged = config.provider_name !== dbProviderName;

  return (
    <Card className="border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xl">
      <CardContent className="p-12 text-center space-y-8">
        <div className="max-w-md mx-auto space-y-6">
          <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-xl w-24 h-24 flex items-center justify-center mx-auto shadow-inner border border-slate-100 dark:border-slate-800">
            <Send className="h-10 w-10 text-green-600" />
          </div>
          <div>
            <h3 className="text-xl font-black text-slate-800 dark:text-white">Uji Coba Pengiriman</h3>
            <p className="text-xs text-slate-500 mt-2">
              Kirim pesan uji coba untuk memverifikasi fungsionalitas pengiriman WhatsApp.
            </p>
          </div>

          {/* Gateway aktif info */}
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between p-5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 text-left w-full">
            <div>
              <p className="text-xs font-black text-slate-400 uppercase tracking-wider">Gateway Aktif (Database)</p>
              <p className="font-bold text-sm text-slate-800 dark:text-slate-200 mt-0.5">
                {isLocalDb
                  ? 'Local Gateway (Scan QR)'
                  : `External API (BYOG - ${dbProviderName ?? 'FONNTE'})`}
              </p>
            </div>
            {isLocalDb ? (
              <Badge variant="success" className="px-2.5 py-0.5 text-xs">LOCAL GATEWAY</Badge>
            ) : (
              <Badge variant="outline" className="px-2.5 py-0.5 text-xs border-indigo-300 text-indigo-700 dark:text-indigo-400 dark:border-indigo-700">
                EXTERNAL API
              </Badge>
            )}
          </div>

          {/* Unsaved change warning */}
          {isProviderChanged && (
            <Alert className="bg-amber-50/50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800 rounded-xl shadow-sm text-left">
              <Info className="h-4 w-4 text-amber-600" />
              <AlertTitle className="text-amber-800 dark:text-amber-400 font-bold text-xs">
                Perubahan Belum Disimpan!
              </AlertTitle>
              <AlertDescription className="text-amber-600 dark:text-amber-300 text-xs leading-relaxed mt-1">
                Anda telah mengubah opsi gateway di tab <b>Koneksi</b> menjadi{' '}
                <b>{isLocalConfig ? 'Local Gateway' : 'External API'}</b>.
                Silakan klik tombol <b>Simpan Konfigurasi WhatsApp</b> terlebih dahulu.
              </AlertDescription>
            </Alert>
          )}

          {/* Test input */}
          <div className="space-y-4 text-left">
            <div className="space-y-2">
              <Label htmlFor="test_number" className="text-xs font-black uppercase tracking-widest text-slate-400">
                Nomor WA Tujuan
              </Label>
              <Input
                id="test_number"
                value={testNumber}
                onChange={(e) => onTestNumberChange(e.target.value)}
                placeholder="62812xxxxxx"
                className="h-12 rounded-xl border-slate-200"
                aria-invalid={!!errors.phone}
              />
              {errors.phone && (
                <p className="text-xs text-red-500">{errors.phone}</p>
              )}
            </div>

            <Button
              id="btn-send-test-wa"
              className="w-full h-12 bg-green-600 hover:bg-green-700 text-white rounded-xl shadow-lg shadow-green-600/20 transition-all font-bold"
              onClick={onTest}
              disabled={testing}
            >
              {testing
                ? <Loader className="mr-2 h-4 w-4 animate-spin" />
                : <Send className="mr-2 h-4 w-4" />}
              Kirim Pesan Uji Coba
            </Button>
          </div>

          {/* Test result */}
          {testResult && (
            <div className={`mt-6 p-4 rounded-xl border animate-in zoom-in-95 duration-300 ${
              testResult.success
                ? 'bg-green-50 border-green-100 text-green-800'
                : 'bg-red-50 border-red-100 text-red-800'
            }`}>
              <div className="flex items-center gap-3">
                {testResult.success
                  ? <CheckCircle2 className="h-5 w-5 text-green-600" />
                  : <XCircle className="h-5 w-5 text-red-600" />}
                <div className="text-left">
                  <p className="text-xs font-black uppercase tracking-widest">
                    {testResult.success ? 'Berhasil' : 'Gagal'}
                  </p>
                  <p className="text-xs font-medium opacity-80 mt-0.5">{testResult.message}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default WhatsappTestForm;
