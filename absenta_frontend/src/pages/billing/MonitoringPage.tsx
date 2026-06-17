import React, { useState, useEffect, useMemo } from 'react';
import { SuperAdminPageLayout } from '@/components/layout/SuperAdminPageLayout';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import axiosInstance from '@/lib/axiosInstance';
import { LogService } from '@/utils/LogService';
import { Database, Network, ShieldCheck, Zap, Activity, BarChart3 } from 'lucide-react';

// Impor sub-komponen modular kita yang premium
import { InfraMonitoringPanel } from '@/components/superadmin/infra/InfraMonitoringPanel';

interface HealthStatus {
  success: boolean;
  message: string;
  data: {
    overall: {
      status: 'healthy' | 'degraded' | 'unhealthy';
      score: number;
      message: string;
    };
    gateways: {
      [key: string]: {
        status: 'healthy' | 'degraded' | 'unhealthy';
        responseTime: number;
        lastCheck: string;
        errors: string[];
      };
    };
    database: {
      status: 'healthy' | 'degraded' | 'unhealthy';
      responseTime: number;
      connections: number;
    };
    webhook: {
      status: 'healthy' | 'degraded' | 'unhealthy';
      queueSize: number;
      processingRate: number;
    };
  };
}

interface TestResult {
  success: boolean;
  message: string;
  data: {
    gateway: string;
    scenario: string;
    status: string;
    processingTime: number;
    webhookReceived: boolean;
    paymentStatus: string;
    errors: string[];
  };
}

const MonitoringPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [healthStatus, setHealthStatus] = useState<HealthStatus | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [selectedGateway, setSelectedGateway] = useState<string>('STRIPE');

  const fetchHealthStatus = async () => {
    setIsLoading(true);
    try {
      const { data } = await axiosInstance.get('/api/test/health');
      setHealthStatus(data);
    } catch (error) {
      LogService.error('Failed to fetch health status', error, 'MonitoringPage');
    } finally {
      setIsLoading(false);
    }
  };

  const runComprehensiveTest = async () => {
    setIsLoading(true);
    try {
      const { data } = await axiosInstance.post('/api/test/comprehensive', { gateway: selectedGateway });
      setTestResults(data.data || []);
    } catch (error) {
      LogService.error('Failed to run comprehensive test', error, 'MonitoringPage');
    } finally {
      setIsLoading(false);
    }
  };

  const testSignatureVerification = async () => {
    setIsLoading(true);
    try {
      const { data } = await axiosInstance.post('/api/test/signature', { gateway: selectedGateway });
      LogService.info('Signature test result', data, 'MonitoringPage');
    } catch (error) {
      LogService.error('Failed to test signature verification', error, 'MonitoringPage');
    } finally {
      setIsLoading(false);
    }
  };

  const testIdempotency = async () => {
    setIsLoading(true);
    try {
      const { data } = await axiosInstance.post('/api/test/idempotency', { gateway: selectedGateway });
      LogService.info('Idempotency test result', data, 'MonitoringPage');
    } catch (error) {
      LogService.error('Failed to test idempotency', error, 'MonitoringPage');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHealthStatus();
    const interval = setInterval(fetchHealthStatus, 30000); // Segarkan setiap 30 detik
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20';
      case 'degraded': return 'text-amber-600 bg-amber-50 dark:bg-amber-950/20';
      case 'unhealthy': return 'text-rose-600 bg-rose-50 dark:bg-rose-950/20';
      default: return 'text-slate-600 bg-slate-50 dark:bg-slate-900/20';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return '✅';
      case 'degraded': return '⚠️';
      case 'unhealthy': return '❌';
      default: return '❓';
    }
  };

  // Olahan stats terstandar untuk SuperAdminPageLayout
  const statsList = useMemo(() => {
    if (!healthStatus) {
      return [
        { title: "Database Latensi", value: "-", icon: <Database className="h-4 w-4 text-white" />, gradient: "from-blue-500 to-indigo-600", subtitle: "Mendapatkan data..." },
        { title: "Skor Kesehatan Sistem", value: "-", icon: <Activity className="h-4 w-4 text-white" />, gradient: "from-indigo-500 to-violet-600", subtitle: "Mendapatkan data..." },
        { title: "Tumpukan Webhook", value: "-", icon: <Zap className="h-4 w-4 text-white" />, gradient: "from-purple-500 to-fuchsia-600", subtitle: "Mendapatkan data..." },
        { title: "Status Gateway Pembayaran", value: "-", icon: <Network className="h-4 w-4 text-white" />, gradient: "from-orange-500 to-amber-600", subtitle: "Mendapatkan data..." }
      ];
    }

    const gateways = healthStatus.data.gateways || {};
    const totalGateways = Object.keys(gateways).length;
    const activeGateways = Object.values(gateways).filter(g => g.status === 'healthy').length;

    return [
      {
        title: "Database Latensi",
        value: `${healthStatus.data.database.responseTime} ms`,
        icon: <Database className="h-4 w-4 text-white" />,
        gradient: "from-blue-500 to-indigo-600",
        subtitle: "Kecepatan query internal sistem"
      },
      {
        title: "Skor Kesehatan Sistem",
        value: `${healthStatus.data.overall.score}%`,
        icon: <Activity className="h-4 w-4 text-white" />,
        gradient: healthStatus.data.overall.score > 90 ? "from-indigo-500 to-violet-600" : "from-amber-500 to-orange-600",
        subtitle: healthStatus.data.overall.message
      },
      {
        title: "Tumpukan Webhook",
        value: healthStatus.data.webhook.queueSize.toLocaleString(),
        icon: <Zap className="h-4 w-4 text-white" />,
        gradient: healthStatus.data.webhook.queueSize > 20 ? "from-rose-500 to-pink-600" : "from-emerald-500 to-teal-600",
        subtitle: "Webhook callback dalam antrean"
      },
      {
        title: "Gateway Aktif",
        value: `${activeGateways}/${totalGateways}`,
        icon: <Network className="h-4 w-4 text-white" />,
        gradient: "from-purple-500 to-fuchsia-600",
        subtitle: "Koneksi normal ke provider API"
      }
    ];
  }, [healthStatus]);

  return (
    <SuperAdminPageLayout
      title="Pemantauan Gateway Pembayaran (Payment Health)"
      description="Monitor kondisi server pangkalan data, antrean dekripsi webhook, latensi respon API payment gateway, serta simulasikan pengujian transaksi billing."
      breadcrumbs={[
        { label: 'System Utilities' },
        { label: 'Pemantauan Gateway' }
      ]}
      stats={statsList}
      isLoading={isLoading && !healthStatus}
    >
      <div className="space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-slate-100/80 dark:bg-slate-900/80 backdrop-blur-md p-1 rounded-xl border border-slate-200/50 dark:border-slate-800 flex w-max max-w-full overflow-x-auto scrollbar-none">
            <TabsTrigger value="overview" className="gap-2 rounded-xl text-xs font-bold px-4 py-2 uppercase tracking-wider">
              <Activity size={14} /> Kesehatan Sistem
            </TabsTrigger>
            <TabsTrigger value="testing" className="gap-2 rounded-xl text-xs font-bold px-4 py-2 uppercase tracking-wider">
              <Zap size={14} /> Skenario Uji
            </TabsTrigger>
            <TabsTrigger value="reports" className="gap-2 rounded-xl text-xs font-bold px-4 py-2 uppercase tracking-wider">
              <BarChart3 size={14} /> Laporan Latensi
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="outline-none">
            <InfraMonitoringPanel
              activeSubTab="overview"
              healthStatus={healthStatus}
              testResults={testResults}
              selectedGateway={selectedGateway}
              setSelectedGateway={setSelectedGateway}
              isLoading={isLoading}
              onRefreshHealth={fetchHealthStatus}
              onRunComprehensiveTest={runComprehensiveTest}
              onTestSignatureVerification={testSignatureVerification}
              onTestIdempotency={testIdempotency}
              getStatusIcon={getStatusIcon}
              getStatusColor={getStatusColor}
            />
          </TabsContent>

          <TabsContent value="testing" className="outline-none">
            <InfraMonitoringPanel
              activeSubTab="testing"
              healthStatus={healthStatus}
              testResults={testResults}
              selectedGateway={selectedGateway}
              setSelectedGateway={setSelectedGateway}
              isLoading={isLoading}
              onRefreshHealth={fetchHealthStatus}
              onRunComprehensiveTest={runComprehensiveTest}
              onTestSignatureVerification={testSignatureVerification}
              onTestIdempotency={testIdempotency}
              getStatusIcon={getStatusIcon}
              getStatusColor={getStatusColor}
            />
          </TabsContent>

          <TabsContent value="reports" className="outline-none">
            <InfraMonitoringPanel
              activeSubTab="reports"
              healthStatus={healthStatus}
              testResults={testResults}
              selectedGateway={selectedGateway}
              setSelectedGateway={setSelectedGateway}
              isLoading={isLoading}
              onRefreshHealth={fetchHealthStatus}
              onRunComprehensiveTest={runComprehensiveTest}
              onTestSignatureVerification={testSignatureVerification}
              onTestIdempotency={testIdempotency}
              getStatusIcon={getStatusIcon}
              getStatusColor={getStatusColor}
            />
          </TabsContent>
        </Tabs>
      </div>
    </SuperAdminPageLayout>
  );
};

export default MonitoringPage;
