import React, { useState, useEffect } from 'react';
import { createPayment, getSupportedGateways, getTripayChannels } from '../../api/paymentGateway.api';
import type { 
  CreatePaymentFormProps, 
  PaymentGateway, 
  PaymentMethod, 
  PaymentStatusData,
  GatewayConfig 
} from '../../types/paymentGateway.d';
import { Loader, Button, SearchableSelect } from '../ui';
import { useAuth } from '../../hooks/useAuth';

const GATEWAY_OPTIONS: { value: PaymentGateway; label: string }[] = [
  { value: 'MIDTRANS', label: 'Midtrans' },
  { value: 'STRIPE', label: 'Stripe' },
  { value: 'XENDIT', label: 'Xendit' },
  { value: 'TRIPAY', label: 'Tripay' },
  { value: 'MANUAL', label: 'Manual' },
];

const METHOD_OPTIONS: { value: PaymentMethod; label: string }[] = [
  { value: 'QRIS', label: 'QRIS' },
  { value: 'BANK_TRANSFER', label: 'Transfer Bank' },
  { value: 'CREDIT_CARD', label: 'Kartu Kredit' },
  { value: 'DEBIT_CARD', label: 'Kartu Debit' },
  { value: 'E_WALLET', label: 'E-Wallet' },
  { value: 'CASH', label: 'Tunai' },
];

export default function CreatePaymentForm({ 
  billingId, 
  onPaymentCreated, 
  onError 
}: CreatePaymentFormProps) {
  const { user, isLoading: isAuthLoading } = useAuth();

  if (isAuthLoading) {
    return (
      <div className="flex justify-center items-center py-8">
        <Loader size="lg" />
      </div>
    );
  }

  const [gateway, setGateway] = useState<PaymentGateway>('MIDTRANS');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('QRIS');
  const [returnUrl, setReturnUrl] = useState('');
  const [cancelUrl, setCancelUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [supportedConfig, setSupportedConfig] = useState<GatewayConfig | null>(null);
  const [paymentResult, setPaymentResult] = useState<PaymentStatusData | null>(null);
  const [tripayChannels, setTripayChannels] = useState<Array<{ code: string; name: string; group?: string }>>([]);
  const [selectedChannelCode, setSelectedChannelCode] = useState<string>('');
  const [tripayChannelsError, setTripayChannelsError] = useState<string>('');

  useEffect(() => {
    fetchSupportedGateways();
  }, []);

  useEffect(() => {
    const loadTripayChannels = async () => {
      try {
        if (gateway !== 'TRIPAY') {
          setTripayChannels([]);
          setSelectedChannelCode('');
          setTripayChannelsError('');
          return;
        }
        const resp = await getTripayChannels();
        if (!resp?.success) {
          setTripayChannels([]);
          setTripayChannelsError(resp?.message || 'Gagal memuat channel Tripay');
          return;
        }
        const items = Array.isArray(resp?.data) ? resp.data : [];
        const normalized = items.map((it: any) => {
          const code = String(it.code || it.channel_code || '').toUpperCase();
          const name = String(it.name || it.label || code);
          const group = String(it.group || it.category || '');
          return { code, name, group };
        });
        setTripayChannels(normalized);
        setTripayChannelsError(items.length === 0 ? 'Tidak ada channel Tripay yang tersedia' : '');
      } catch (e: any) {
        console.error('Load Tripay channels failed:', e);
        setTripayChannels([]);
        const msg = e?.response?.data?.message || e?.message || 'Gagal memuat channel Tripay';
        setTripayChannelsError(msg);
      }
    };
    loadTripayChannels();
  }, [gateway]);

  useEffect(() => {
    // Reset channel selection if method changes or gateway changes
    setSelectedChannelCode('');
  }, [paymentMethod, gateway]);

  useEffect(() => {
    if (gateway !== 'TRIPAY') return;
    const code = (selectedChannelCode || '').toUpperCase();
    if (!code) return;
    const vaCodes = ['BRIVA','BCAVA','BNIVA','MANDIRIVA','CIMBVA','BSIVA','PERMATAVA','BJBVA','BNCVA','MAYBANKVA','BTNVA','BTSVA'];
    const ewCodes = ['OVO','DANA','SHOPEEPAY','LINKAJA','GOPAY'];
    if (code === 'QRIS') {
      setPaymentMethod('QRIS');
    } else if (vaCodes.includes(code)) {
      setPaymentMethod('BANK_TRANSFER');
    } else if (ewCodes.includes(code)) {
      setPaymentMethod('E_WALLET');
    } else {
      setPaymentMethod('QRIS');
    }
  }, [selectedChannelCode, gateway]);

  const fetchSupportedGateways = async () => {
    try {
      const response = await getSupportedGateways();
      if (response.success) {
        const raw: any = response.data;
        const gateways: any[] = Array.isArray(raw?.gateways) ? [...raw.gateways] : [];
        if (!gateways.includes('TRIPAY')) gateways.push('TRIPAY');
        const methods: any[] = Array.isArray(raw?.methods) ? [...raw.methods] : ['QRIS','BANK_TRANSFER','CREDIT_CARD','DEBIT_CARD','E_WALLET','CASH'];
        setSupportedConfig({ gateways: gateways as any, methods: methods as any });
      }
    } catch (err) {
      console.error('Failed to fetch supported gateways:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    setPaymentResult(null);

    try {
      if (!billingId) {
        setError('Billing ID is required');
        return;
      }

      if (gateway === 'TRIPAY') {
        // Option B: require specific Tripay channel selection
        if (!selectedChannelCode) {
          setError('Silakan pilih channel Tripay spesifik (mis. BRIVA, DANA)');
          return;
        }
      }

      const payload = {
        billingId,
        gateway,
        paymentMethod,
        channelCode: selectedChannelCode || undefined,
        return_url: returnUrl.trim() || undefined,
        cancel_url: cancelUrl.trim() || undefined,
        customerInfo: user?.email ? { email: String(user.email || '') } : undefined,
      };

      const response = await createPayment(payload);
      if (response.success) {
        setPaymentResult(response.data);
        onPaymentCreated?.(response.data);
      } else {
        const errorMsg = response.message || 'Gagal membuat pembayaran';
        setError(errorMsg);
        onError?.(errorMsg);
      }
    } catch (err: any) {
      const errorMsg = err?.response?.data?.message || err?.message || 'Gagal membuat pembayaran';
      setError(errorMsg);
      onError?.(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setGateway('MIDTRANS');
    setPaymentMethod('QRIS');
    setReturnUrl('');
    setCancelUrl('');
    setError('');
    setPaymentResult(null);
    setSelectedChannelCode('');
  };

  const isGatewaySupported = (gatewayValue: PaymentGateway) => {
    if (!supportedConfig) return true;
    const list = (supportedConfig as any)?.gateways;
    return Array.isArray(list) ? list.includes(gatewayValue) : true;
  };

  const isMethodSupported = (methodValue: PaymentMethod) => {
    const byConfig = (() => {
      if (!supportedConfig) return true;
      const list = (supportedConfig as any)?.methods;
      return Array.isArray(list) ? list.includes(methodValue) : true;
    })();
    if (!byConfig) return false;
    if (gateway !== 'TRIPAY') return true;
    if (!tripayChannels || tripayChannels.length === 0) {
      return methodValue === 'QRIS' || methodValue === 'BANK_TRANSFER';
    }
    const codes = tripayChannels.map((c) => c.code.toUpperCase());
    if (methodValue === 'QRIS') {
      return codes.includes('QRIS');
    }
    if (methodValue === 'BANK_TRANSFER') {
      const vaCodes = ['BRIVA','BCAVA','BNIVA','MANDIRIVA','CIMBVA','BSIVA','PERMATAVA'];
      return vaCodes.some((c) => codes.includes(c));
    }
    if (methodValue === 'E_WALLET') {
      const ewCodes = ['OVO','DANA','SHOPEEPAY'];
      return ewCodes.some((c) => codes.includes(c)) || codes.includes('QRIS');
    }
    return false;
  };

  const filteredTripayChannels = (() => {
    if (gateway !== 'TRIPAY') return [];
    const list = tripayChannels || [];
    return list;
  })();

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h3 className="text-lg font-semibold mb-4">Buat Pembayaran Baru</h3>
      
      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      {paymentResult ? (
        <div className="space-y-4">
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <h4 className="font-medium text-green-800 mb-2">Pembayaran Berhasil Dibuat</h4>
            <p className="text-sm text-green-600">
              ID Pembayaran: <span className="font-mono">{paymentResult.id}</span>
            </p>
            <p className="text-sm text-green-600">
              Status: <span className="font-medium">{paymentResult.status}</span>
            </p>
          </div>

          {paymentResult.qrString && (
            <div className="text-center">
              <h4 className="font-medium mb-2">Scan QR Code untuk Pembayaran</h4>
              <div className="inline-block p-4 bg-white border-2 border-gray-200 rounded-lg">
                <img 
                  src={paymentResult.qrString} 
                  alt="QR Code Pembayaran" 
                  className="w-48 h-48 mx-auto"
                />
              </div>
              {paymentResult.expiresAt && (
                <p className="text-sm text-gray-600 mt-2">
                  Berlaku hingga: {new Date(paymentResult.expiresAt).toLocaleString('id-ID')}
                </p>
              )}
            </div>
          )}

          {paymentResult.paymentUrl && !paymentResult.qrString && (
            <div className="text-center">
              <h4 className="font-medium mb-2">Link Pembayaran</h4>
              <a 
                href={paymentResult.paymentUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              >
                Buka Halaman Pembayaran
              </a>
            </div>
          )}

          <div className="flex gap-2">
            <Button 
              onClick={resetForm}
              variant="outline"
              className="flex-1"
            >
              Buat Pembayaran Lain
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Gateway Selection */}
          <div>
            <label htmlFor="gateway" className="block text-sm font-medium text-gray-700 mb-2">
              Payment Gateway *
            </label>
            <SearchableSelect
              value={gateway}
              onValueChange={(val) => setGateway(val as PaymentGateway)}
              options={GATEWAY_OPTIONS.map((option) => ({
                label: `${option.label} ${!isGatewaySupported(option.value) ? '(Tidak Didukung)' : ''}`,
                value: option.value,
                disabled: !isGatewaySupported(option.value)
              }))}
              placeholder="Pilih Gateway"
              searchPlaceholder="Cari gateway..."
              triggerClassName="w-full"
            />
          </div>

          {/* Payment Method Selection */}
          {gateway !== 'TRIPAY' && (
            <div>
              <label htmlFor="paymentMethod" className="block text-sm font-medium text-gray-700 mb-2">
                Metode Pembayaran *
              </label>
              <SearchableSelect
                value={paymentMethod}
                onValueChange={(val) => setPaymentMethod(val as PaymentMethod)}
                options={METHOD_OPTIONS.map((option) => ({
                  label: `${option.label} ${!isMethodSupported(option.value) ? '(Tidak Didukung)' : ''}`,
                  value: option.value,
                  disabled: !isMethodSupported(option.value)
                }))}
                placeholder="Pilih Metode Pembayaran"
                searchPlaceholder="Cari metode..."
                triggerClassName="w-full"
              />
            </div>
          )}

          {/* Tripay Channel Selection (Option B) */}
          {gateway === 'TRIPAY' && (
            <div>
              <label htmlFor="tripayChannel" className="block text-sm font-medium text-gray-700 mb-2">
                Channel Tripay *
              </label>
              <SearchableSelect
                value={selectedChannelCode}
                onValueChange={(val) => setSelectedChannelCode(val)}
                options={[
                  { label: '-- Pilih Channel --', value: '' },
                  ...filteredTripayChannels.map((ch) => ({
                    label: ch.name || ch.code,
                    value: ch.code
                  }))
                ]}
                placeholder="Pilih Channel"
                searchPlaceholder="Cari channel..."
                triggerClassName="w-full"
              />
              {tripayChannelsError && (
                <p className="text-xs text-red-600 mt-1">
                  {tripayChannelsError}
                </p>
              )}
              {!tripayChannelsError && filteredTripayChannels.length === 0 && (
                <p className="text-xs text-gray-500 mt-1">
                  Tidak ada channel Tripay yang tersedia.
                </p>
              )}
            </div>
          )}

          {/* Return URL (Optional) */}
          <div>
            <label htmlFor="returnUrl" className="block text-sm font-medium text-gray-700 mb-2">
              URL Redirect Sukses (Opsional)
            </label>
            <input
              type="url"
              id="returnUrl"
              value={returnUrl}
              onChange={(e) => setReturnUrl(e.target.value)}
              placeholder="https://example.com/success"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Cancel URL (Optional) */}
          <div>
            <label htmlFor="cancelUrl" className="block text-sm font-medium text-gray-700 mb-2">
              URL Redirect Batal (Opsional)
            </label>
            <input
              type="url"
              id="cancelUrl"
              value={cancelUrl}
              onChange={(e) => setCancelUrl(e.target.value)}
              placeholder="https://example.com/cancel"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Submit Button */}
          <div className="flex justify-end pt-4 border-t mt-6">
            <Button
              type="submit"
              disabled={isSubmitting || !!tripayChannelsError}
            >
              {isSubmitting ? (
                <div className="flex items-center gap-2">
                  <Loader size="sm" />
                  <span>Memproses...</span>
                </div>
              ) : (
                'Buat Pembayaran'
              )}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
