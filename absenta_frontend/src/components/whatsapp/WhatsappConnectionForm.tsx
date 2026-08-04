/**
 * WhatsappConnectionForm.tsx
 * Tab "Koneksi" — Kredensial gateway + status Local WA (QR/Connect/Disconnect).
 * Subkomponen dari WhatsappSettingsPage.
 */

import React from 'react';
import {
  Card, CardHeader, CardTitle, CardContent,
  Button, Input, Label, Switch, Loader, Badge,
} from '@/components/ui';
import { QrCode, Send, Wifi, WifiOff, RefreshCw } from 'lucide-react';
import type { WhatsappConfig } from '@/api/whatsapp.api';
import { DEFAULT_PROVIDER_NAME, type LocalStatus, type WaValidationErrors } from './whatsappSettings.types';

// ─────────────────────────────────────────────────────────────────────────────
// PROPS
// ─────────────────────────────────────────────────────────────────────────────

export interface WhatsappConnectionFormProps {
  config: WhatsappConfig;
  onConfigChange: (patch: Partial<WhatsappConfig>) => void;
  localStatus: LocalStatus;
  connectedNumber: string | null;
  qrCode: string | null;
  onConnect: () => void;
  onDisconnect: () => void;
  errors: WaValidationErrors;
}

// ─────────────────────────────────────────────────────────────────────────────
// LOCAL GATEWAY STATUS SECTION
// ─────────────────────────────────────────────────────────────────────────────

const LocalStatusBadge: React.FC<{ status: LocalStatus }> = ({ status }) => {
  if (status === 'connected') {
    return (
      <Badge variant="success" className="gap-1 px-3 py-1 text-xs">
        <Wifi className="h-3 w-3" /> Connected
      </Badge>
    );
  }
  if (status === 'connecting') {
    return (
      <Badge variant="warning" className="gap-1 px-3 py-1 text-xs animate-pulse">
        <RefreshCw className="h-3 w-3 animate-spin" /> Connecting
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="gap-1 px-3 py-1 text-xs bg-slate-100 dark:bg-slate-800">
      <WifiOff className="h-3 w-3 text-slate-500" /> Disconnected
    </Badge>
  );
};

const LocalGatewaySection: React.FC<{
  status: LocalStatus;
  connectedNumber: string | null;
  qrCode: string | null;
  onConnect: () => void;
  onDisconnect: () => void;
}> = ({ status, connectedNumber, qrCode, onConnect, onDisconnect }) => (
  <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-6">
    {/* Status header */}
    <div className="flex items-center justify-between">
      <div>
        <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200">Status Local Gateway</h4>
        <p className="text-xs text-slate-500 mt-0.5">Pantau status tautan sesi WhatsApp local Anda.</p>
      </div>
      <LocalStatusBadge status={status} />
    </div>

    {/* CONNECTED */}
    {status === 'connected' && (
      <div className="p-4 bg-green-50 dark:bg-green-950/10 rounded-xl border border-green-100 dark:border-green-900/30 flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div>
          <p className="text-xs text-green-800 dark:text-green-400 font-bold">Nomor WhatsApp Terhubung</p>
          <p className="text-sm font-black text-green-900 dark:text-green-300 mt-1">
            {connectedNumber ? (connectedNumber.startsWith('+') ? connectedNumber : `+${connectedNumber}`) : 'Terotentikasi'}
          </p>
        </div>
        <Button
          variant="outline"
          className="bg-white dark:bg-slate-900 text-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/20 border-slate-200 dark:border-slate-800 text-xs font-bold w-full sm:w-auto"
          onClick={onDisconnect}
        >
          Putuskan Koneksi
        </Button>
      </div>
    )}

    {/* CONNECTING — show QR or loader */}
    {status === 'connecting' && (
      <div className="flex flex-col items-center justify-center py-6 space-y-4">
        {qrCode ? (
          <div className="space-y-4 text-center max-w-sm">
            <div className="bg-white p-4 rounded-2xl inline-block border border-slate-200 shadow-md">
              <img src={qrCode} alt="WhatsApp Connection QR Code" className="w-56 h-56 mx-auto" />
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 font-semibold leading-relaxed">
              Silakan buka WhatsApp di HP Anda &rarr; <b>Perangkat Tertaut</b> &rarr;{' '}
              <b>Tautkan Perangkat</b> lalu scan QR Code di atas.
            </p>
          </div>
        ) : (
          <div className="text-center py-8 space-y-3">
            <Loader size="lg" />
            <p className="text-xs text-slate-500">Menyiapkan sesi &amp; memuat QR Code dari server...</p>
          </div>
        )}
        <Button
          variant="outline"
          className="text-slate-600 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold"
          onClick={onDisconnect}
        >
          Batal / Tutup Sesi
        </Button>
      </div>
    )}

    {/* DISCONNECTED / UNINITIALIZED */}
    {(!status || status === 'disconnected') && (
      <div className="text-center py-8 space-y-4 max-w-md mx-auto">
        <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto border border-slate-200 dark:border-slate-700">
          <QrCode className="h-8 w-8 text-slate-400" />
        </div>
        <div>
          <p className="font-bold text-sm text-slate-800 dark:text-slate-200">WhatsApp Belum Ditautkan</p>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            Hubungkan sistem dengan nomor WhatsApp sekolah untuk mengirimkan notifikasi absensi siswa secara langsung dari server.
          </p>
        </div>
        <Button
          id="btn-connect-local-wa"
          className="bg-green-600 hover:bg-green-700 text-white font-bold px-6 py-2.5 rounded-xl shadow-lg shadow-green-600/20"
          onClick={onConnect}
        >
          Hubungkan WhatsApp
        </Button>
      </div>
    )}
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// EXTERNAL / BYOG CREDENTIAL FIELDS
// ─────────────────────────────────────────────────────────────────────────────

/** Reusable field wrapper — label + input + error message. */
const FieldGroup: React.FC<{
  id: string;
  label: string;
  error?: string;
  children: React.ReactNode;
}> = ({ id, label, error, children }) => (
  <div className="space-y-2">
    <Label htmlFor={id} className="text-xs font-black uppercase tracking-widest text-slate-400">
      {label}
    </Label>
    {children}
    {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
  </div>
);

const ExternalCredentialFields: React.FC<{
  config: WhatsappConfig;
  onChange: (patch: Partial<WhatsappConfig>) => void;
  errors: WaValidationErrors;
}> = ({ config, onChange, errors }) => (
  <div className="space-y-8 animate-in fade-in duration-300">
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <FieldGroup id="provider_name" label="Provider Name" error={errors.provider_name}>
        <Input
          id="provider_name"
          value={config.provider_name}
          onChange={(e) => onChange({ provider_name: e.target.value.toUpperCase() })}
          placeholder="Nama Provider Gateway"
          className="h-12 rounded-xl border-slate-200 focus:ring-green-500"
          aria-invalid={!!errors.provider_name}
        />
      </FieldGroup>

      <FieldGroup id="sender_number" label="Sender Number" error={errors.sender_number}>
        <Input
          id="sender_number"
          value={config.sender_number ?? ''}
          onChange={(e) => onChange({ sender_number: e.target.value })}
          placeholder="Nomor Pengirim"
          className="h-12 rounded-xl border-slate-200"
          aria-invalid={!!errors.sender_number}
        />
      </FieldGroup>
    </div>

    <FieldGroup id="api_url" label="Gateway API URL" error={errors.api_url}>
      <Input
        id="api_url"
        value={config.api_url ?? ''}
        onChange={(e) => onChange({ api_url: e.target.value })}
        placeholder="API URL Gateway"
        className="h-12 rounded-xl border-slate-200"
        aria-invalid={!!errors.api_url}
      />
    </FieldGroup>

    <FieldGroup id="api_token" label="API Token / Key" error={errors.api_token}>
      <Input
        id="api_token"
        type="password"
        value={config.api_token ?? ''}
        onChange={(e) => onChange({ api_token: e.target.value })}
        placeholder="Masukkan API Key dari provider Anda"
        className="h-12 rounded-xl border-slate-200"
        aria-invalid={!!errors.api_token}
      />
    </FieldGroup>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// MAIN EXPORT
// ─────────────────────────────────────────────────────────────────────────────

export const WhatsappConnectionForm: React.FC<WhatsappConnectionFormProps> = ({
  config,
  onConfigChange,
  localStatus,
  connectedNumber,
  qrCode,
  onConnect,
  onDisconnect,
  errors,
}) => {
  const isLocal = config.provider_name === 'LOCAL';

  return (
    <Card className="border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xl shadow-slate-200/20 dark:shadow-none">
      <CardHeader className="bg-slate-50/50 dark:bg-slate-800/30 border-b border-slate-100 dark:border-slate-800">
        <CardTitle className="text-lg font-bold">Kredensial &amp; Tipe Gateway</CardTitle>
      </CardHeader>
      <CardContent className="p-8 space-y-8">

        {/* Status Layanan Toggle */}
        <div className="flex items-center justify-between p-6 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
          <div>
            <p className="font-bold text-slate-800 dark:text-slate-200 text-sm">Status Layanan</p>
            <p className="text-xs text-slate-500 mt-0.5">Aktifkan atau nonaktifkan pengiriman pesan secara global.</p>
          </div>
          <Switch
            checked={config.is_active}
            onCheckedChange={(val) => onConfigChange({ is_active: val })}
          />
        </div>

        {/* Gateway Type Selector */}
        <div className="space-y-3">
          <Label className="text-xs font-black uppercase tracking-widest text-slate-400">Tipe Gateway</Label>
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              type="button"
              id="gateway-type-local"
              onClick={() => onConfigChange({ provider_name: 'LOCAL' })}
              className={`flex-1 py-4 px-6 rounded-2xl border text-left transition-all ${
                isLocal
                  ? 'border-green-600 bg-green-50/50 dark:bg-green-950/20 dark:border-green-800'
                  : 'border-slate-200 hover:border-slate-300 dark:border-slate-700'
              }`}
            >
              <div className="flex items-center gap-3">
                <QrCode className={`h-6 w-6 ${isLocal ? 'text-green-600' : 'text-slate-400'}`} />
                <div>
                  <p className="font-bold text-sm text-slate-800 dark:text-slate-200">Local Gateway (Scan QR)</p>
                  <p className="text-xs text-slate-500 mt-0.5">Tautkan nomor WhatsApp sendiri dengan scan QR code.</p>
                </div>
              </div>
            </button>

            <button
              type="button"
              id="gateway-type-external"
              onClick={() => onConfigChange({ provider_name: DEFAULT_PROVIDER_NAME })}
              className={`flex-1 py-4 px-6 rounded-2xl border text-left transition-all ${
                !isLocal
                  ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/20 dark:border-indigo-800'
                  : 'border-slate-200 hover:border-slate-300 dark:border-slate-700'
              }`}
            >
              <div className="flex items-center gap-3">
                <Send className={`h-6 w-6 ${!isLocal ? 'text-indigo-600' : 'text-slate-400'}`} />
                <div>
                  <p className="font-bold text-sm text-slate-800 dark:text-slate-200">External API (BYOG)</p>
                  <p className="text-xs text-slate-500 mt-0.5">Gunakan provider pihak ketiga seperti Fonnte atau WoWA.</p>
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Conditional: Local vs External */}
        {isLocal ? (
          <LocalGatewaySection
            status={localStatus}
            connectedNumber={connectedNumber}
            qrCode={qrCode}
            onConnect={onConnect}
            onDisconnect={onDisconnect}
          />
        ) : (
          <ExternalCredentialFields config={config} onChange={onConfigChange} errors={errors} />
        )}
      </CardContent>
    </Card>
  );
};

export default WhatsappConnectionForm;
