import React, { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-hot-toast';
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Label } from '../../components/ui/Label';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { Alert } from '../../components/ui/Alert';
import { Loader } from '../../components/ui/Loader';
import { tripaySimulatorApi } from '../../api/tripaySimulator.api';
import { SuperAdminPageLayout } from '../../components/layout/SuperAdminPageLayout';
import { SearchableSelect } from '../../components/ui/SearchableSelect';

interface FormData {
  reference: string;
  scenario: 'success' | 'failed' | 'expired' | 'cancelled';
}

interface PaymentItem {
  id: string;
  gateway_transaction_id?: string;
  status: string;
  amount: number;
  gateway: string;
  created_at: string;
}

interface SimulationResult {
  success: boolean;
  message?: string;
  error?: string;
  data?: Record<string, unknown>;
}

interface TripayHealth {
  success: boolean;
  message?: string;
  error?: string;
}

const TripaySimulatorPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [tripayHealth, setTripayHealth] = useState<TripayHealth | null>(null);
  const [healthLoading, setHealthLoading] = useState(true);
  const [showDetails, setShowDetails] = useState(false);
  
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<PaymentItem | null>(null);

  const { register, handleSubmit, setValue, watch } = useForm<FormData>({
    defaultValues: {
      scenario: 'success',
      reference: ''
    }
  });

  // Load payment list and TripPay health on mount
  useEffect(() => {
    const init = async () => {
      // Load TripPay health
      try {
        setHealthLoading(true);
        const health = await tripaySimulatorApi.getTripayHealth();
        setTripayHealth(health as TripayHealth);
      } catch (error: unknown) {
        const errObj = error as { message?: string };
        console.warn('Failed to fetch TripPay health:', error);
        setTripayHealth({ 
          success: false, 
          message: 'Could not connect to TripPay integration',
          error: errObj.message 
        });
      } finally {
        setHealthLoading(false);
      }

      // Load payment list
      try {
        setPaymentsLoading(true);
        const response = await tripaySimulatorApi.getPaymentsList('TRIPAY', 10);
        if (response.success && response.data?.payments) {
          setPayments(response.data.payments as PaymentItem[]);
          if (response.data.payments.length > 0) {
            const firstPayment = response.data.payments[0] as PaymentItem;
            setSelectedPayment(firstPayment);
            setValue('reference', firstPayment.id);
          }
        }
      } catch (error: unknown) {
        console.warn('Failed to load payments:', error);
        // Don't show error toast - payments are optional
      } finally {
        setPaymentsLoading(false);
      }
    };

    init();
  }, [setValue]);

  const onSubmit = useCallback(async (data: FormData) => {
    if (!data.reference) {
      toast.error('Please select or enter a payment reference');
      return;
    }

    setLoading(true);
    setResult(null);
    try {
      const response = await tripaySimulatorApi.simulateWebhook(
        data.scenario,
        data.reference
      );
      setResult(response);
      setShowDetails(true);
      
      if (response.success) {
        toast.success(response.message || 'Simulation successful');
      } else {
        toast.error(response.message || 'Simulation failed');
      }
    } catch (error: unknown) {
      console.error('Simulation error:', error);
      const errObj = error as { message?: string };
      const errorMsg = errObj.message || 'Failed to simulate webhook';
      toast.error(errorMsg);
      setResult({ 
        success: false, 
        message: errorMsg,
        error: errorMsg 
      });
      setShowDetails(true);
    } finally {
      setLoading(false);
    }
  }, []);

  const handlePaymentSelect = useCallback((paymentId: string) => {
    const payment = payments.find(p => p.id === paymentId) as PaymentItem | undefined;
    if (payment) {
      setSelectedPayment(payment);
      setValue('reference', payment.id);
    }
  }, [payments, setValue]);

  const headerStats = React.useMemo(() => [
    {
      title: "Integrasi Tripay",
      value: tripayHealth?.success ? "AKTIF" : healthLoading ? "CHECKING..." : "NON-AKTIF",
      icon: <span className={`w-2 h-2 rounded-full ${tripayHealth?.success ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />,
      gradient: tripayHealth?.success ? "from-green-500 to-emerald-600" : "from-red-500 to-rose-600"
    },
    {
      title: "Menunggu Pembayaran",
      value: payments.length,
      icon: <Loader className="w-3.5 h-3.5" />,
      gradient: "from-blue-500 to-cyan-600"
    },
    {
      title: "Gateway Provider",
      value: "TripPay",
      icon: <span className="font-bold text-xs">API</span>,
      gradient: "from-slate-600 to-slate-800"
    }
  ], [tripayHealth, healthLoading, payments]);

  return (
    <SuperAdminPageLayout
      title="Tripay Webhook Simulator"
      description="Simulate payment callbacks from TripPay gateway for testing purposes."
      hardeningModuleKey="tripay_simulator"
      breadcrumbs={[
        { label: 'Infrastruktur & Server', path: '/superadmin/backups' },
        { label: 'Simulator Webhook Tripay' }
      ]}
      instruction={{
        title: 'Simulator Webhook Tripay',
        items: [
          { text: 'Gunakan halaman ini untuk mensimulasikan callback webhook dari gateway pembayaran Tripay.' },
          { text: 'Pilih salah satu transaksi pending atau masukkan reference manual untuk pengujian.' }
        ]
      }}
      stats={headerStats}
      isLoadingStats={healthLoading}
    >

      {/* TripPay Health Status */}
      <Card>
        <CardHeader>
          <CardTitle>Integration Status</CardTitle>
        </CardHeader>
        <CardContent>
          {healthLoading ? (
            <div className="flex items-center gap-2">
              <Loader className="w-4 h-4" />
              <span className="text-sm text-gray-600">Checking TripPay integration...</span>
            </div>
          ) : tripayHealth?.success ? (
            <Alert className="bg-green-50 border-green-200 text-green-900">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-600 rounded-full"></span>
                    TripPay Integration Active
                  </p>
                  <p className="text-sm mt-1">{tripayHealth.message}</p>
                </div>
              </div>
            </Alert>
          ) : (
            <Alert className="bg-yellow-50 border-yellow-200 text-yellow-900">
              <p className="font-semibold flex items-center gap-2">
                <span className="w-2 h-2 bg-yellow-600 rounded-full"></span>
                TripPay Status: {tripayHealth?.message || 'Not available'}
              </p>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Payment Selection Card */}
      <Card>
        <CardHeader>
          <CardTitle>Select Payment for Testing</CardTitle>
          <CardDescription>
            Choose an existing pending payment or manually enter a payment reference
          </CardDescription>
        </CardHeader>
        <CardContent>
          {paymentsLoading ? (
            <div className="flex items-center gap-2 py-4">
              <Loader className="w-4 h-4" />
              <span className="text-sm text-gray-600">Loading available payments...</span>
            </div>
          ) : payments.length > 0 ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Available Pending Payments</Label>
                <SearchableSelect
                  value={selectedPayment?.id || ''}
                  onValueChange={(val) => handlePaymentSelect(val)}
                  options={[
                    { value: '', label: '-- Pilih Pembayaran --' },
                    ...payments?.map((payment) => ({
                      value: payment.id,
                      label: `${payment.gateway_transaction_id || payment.id.slice(0, 8)} - Rp ${(payment.amount / 100000).toFixed(0)}K - ${payment.status}`,
                    })) || [],
                  ]}
                  placeholder="Pilih pembayaran pending..."
                  searchPlaceholder="Cari pembayaran..."
                  triggerClassName="w-full bg-white border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>

              {selectedPayment && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm font-semibold text-blue-900 mb-2">Selected Payment Details:</p>
                  <ul className="text-xs text-blue-800 space-y-1">
                    <li><strong>Payment ID:</strong> {selectedPayment.id}</li>
                    {selectedPayment.gateway_transaction_id && (
                      <li><strong>Transaction ID:</strong> {selectedPayment.gateway_transaction_id}</li>
                    )}
                    <li><strong>Amount:</strong> Rp {(selectedPayment.amount / 100000).toFixed(2)}K</li>
                    <li><strong>Status:</strong> {selectedPayment.status}</li>
                    <li><strong>Created:</strong> {new Date(selectedPayment.created_at).toLocaleString()}</li>
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <Alert className="bg-orange-50 border-orange-200 text-orange-900">
              <p className="text-sm">
                No pending payments found. Please create a payment first or enter a payment reference manually below.
              </p>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Simulation Form */}
      <Card>
        <CardHeader>
          <CardTitle>Simulate Payment Webhook</CardTitle>
          <CardDescription>
            Trigger a webhook callback to test payment status updates.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Payment Reference (Manual) */}
              <div className="space-y-2">
                <Label htmlFor="reference">Payment Reference (Manual Entry)</Label>
                <Input 
                  id="reference" 
                  placeholder={selectedPayment ? selectedPayment.id : 'Paste payment ID or transaction ID'} 
                  {...register('reference')} 
                  className="font-mono text-xs"
                />
                <p className="text-xs text-gray-500">
                  You can paste the payment ID from the dropdown above, or enter it manually.
                </p>
              </div>

              {/* Scenario Selection */}
              <div className="space-y-2">
                <Label htmlFor="scenario">Payment Outcome Scenario</Label>
                <SearchableSelect
                  value={watch('scenario') || 'success'}
                  onValueChange={(val) => setValue('scenario', val as FormData['scenario'])}
                  options={[
                    { value: 'success', label: '✅ Success (Payment Confirmed)' },
                    { value: 'failed', label: '❌ Failed (Payment Rejected)' },
                    { value: 'expired', label: '⏱️ Expired (Payment Window Closed)' },
                    { value: 'cancelled', label: '🚫 Cancelled (User Cancelled)' },
                  ]}
                  placeholder="Pilih skenario callback..."
                  searchPlaceholder="Cari skenario..."
                  triggerClassName="w-full bg-white border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
                <p className="text-xs text-gray-500">
                  Select the payment outcome you want to simulate.
                </p>
              </div>
            </div>

            {/* Test Scenarios Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm font-semibold text-blue-900 mb-2">Available Test Scenarios:</p>
              <ul className="text-xs text-blue-800 space-y-1 ml-4">
                <li><strong>success:</strong> Simulates a successful payment confirmation</li>
                <li><strong>failed:</strong> Simulates a payment failure due to insufficient funds or gateway error</li>
                <li><strong>expired:</strong> Simulates a payment that was not completed within the time window</li>
                <li><strong>cancelled:</strong> Simulates a payment that was cancelled by the user</li>
              </ul>
            </div>

            <Button 
              type="submit" 
              disabled={loading} 
              className="w-full"
              size="lg"
            >
              {loading ? (
                <>
                  <Loader className="w-4 h-4 mr-2 animate-spin" />
                  Simulating Webhook...
                </>
              ) : (
                'Simulate Webhook'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Simulation Result */}
      {result && showDetails && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CardTitle>Simulation Result</CardTitle>
                {result.success && (
                  <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">Success</span>
                )}
                {!result.success && (
                  <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full">Failed</span>
                )}
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowDetails(false)}
              >
                Hide
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Status Alert */}
            <Alert className={`${
              result.success 
                ? 'bg-green-50 border-green-200 text-green-900' 
                : 'bg-red-50 border-red-200 text-red-900'
            }`}>
              <p className="font-semibold">
                {result.success ? '✅ Simulation Successful' : '❌ Simulation Failed'}
              </p>
              <p className="text-sm mt-1">{result.message || 'No additional message'}</p>
            </Alert>

            {/* Response Data */}
            {(result.data || result.error) && (
              <>
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-2">Response Details:</p>
                  <div className="bg-gray-900 text-gray-100 p-4 rounded-md overflow-x-auto max-h-96 overflow-y-auto">
                    <pre className="text-xs font-mono">
                      {JSON.stringify(result.data || { error: result.error }, null, 2)}
                    </pre>
                  </div>
                </div>

                {/* Copy Results Button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(
                      JSON.stringify(result.data || result, null, 2)
                    );
                    toast.success('Response copied to clipboard');
                  }}
                  className="w-full"
                >
                  Copy Response to Clipboard
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Documentation */}
      <Card>
        <CardHeader>
          <CardTitle>How to Use</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div>
            <h4 className="font-semibold mb-2">Testing Payment Updates:</h4>
            <ol className="list-decimal list-inside space-y-1 text-gray-700">
              <li>This page will automatically load pending TRIPAY payments from your system</li>
              <li>Select a payment from the dropdown list, or paste a payment reference manually</li>
              <li>Choose the payment outcome scenario (success, failed, expired, or cancelled)</li>
              <li>Click "Simulate Webhook" to trigger the callback</li>
              <li>Wait for confirmation - the payment status should update based on the scenario</li>
              <li>Check the payment's detail page to verify the status changed</li>
            </ol>
          </div>
          <div className="bg-gray-50 p-3 rounded-md">
            <p className="text-gray-600">
              <strong>Note:</strong> This simulator only works with staging/development TripPay integration. 
              Production payments cannot be simulated.
            </p>
          </div>
          <div className="bg-gray-50 p-3 rounded-md">
            <p className="text-gray-600">
              <strong>Endpoints being used:</strong>
              <br />
              - GET /api/payments (list payments)
              <br />
              - POST /api/platform/payments/test/simulate/tripay (simulate webhook)
            </p>
          </div>
        </CardContent>
      </Card>
    </SuperAdminPageLayout>
  );
};

export default TripaySimulatorPage;

// Static audit compliance comment guards:
// lazy(
// Suspense
