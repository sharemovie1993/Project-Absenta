import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../../lib/axiosInstance';
import toast from 'react-hot-toast';
import { COOP_QUERY_KEYS, invalidateShuCaches } from '../../../lib/coopQueryKeys';
import { ShuRulesForm } from '../shu/ShuRulesForm';
import type { ShuConfig } from '../../../pages/cooperative/SHU';

interface ShuDistributionSettingProps {
  canManageShu: boolean;
}

export const ShuDistributionSetting: React.FC<ShuDistributionSettingProps> = React.memo(({ canManageShu }) => {
  const queryClient = useQueryClient();

  // 1. Fetch Config
  const configQuery = useQuery({
    queryKey: COOP_QUERY_KEYS.shuConfig,
    queryFn: async () => {
      const res = await api.get('/cooperative/shu/config');
      return (res.data?.data || {}) as ShuConfig;
    },
    staleTime: 5 * 60 * 1000
  });

  const [localConfig, setLocalConfig] = useState<ShuConfig>({
    porsiJasaModal: '30',
    porsiJasaTransaksi: '30',
    porsiCadangan: '20',
    porsiPengurus: '5',
    porsiSosial: '5',
    porsiPembangunan: '10',
    includeStorePurchases: true,
    includeLoans: true,
    includeSavingsDeposit: false,
    enableLiveEstimation: false
  });

  useEffect(() => {
    if (configQuery.data) {
      setLocalConfig({
        porsiJasaModal: String(configQuery.data.porsiJasaModal ?? '30'),
        porsiJasaTransaksi: String(configQuery.data.porsiJasaTransaksi ?? '30'),
        porsiCadangan: String(configQuery.data.porsiCadangan ?? '20'),
        porsiPengurus: String(configQuery.data.porsiPengurus ?? '5'),
        porsiSosial: String(configQuery.data.porsiSosial ?? '5'),
        porsiPembangunan: String(configQuery.data.porsiPembangunan ?? '10'),
        includeStorePurchases: configQuery.data.includeStorePurchases ?? true,
        includeLoans: configQuery.data.includeLoans ?? true,
        includeSavingsDeposit: configQuery.data.includeSavingsDeposit ?? false,
        enableLiveEstimation: configQuery.data.enableLiveEstimation ?? false
      });
    }
  }, [configQuery.data]);

  // 2. Mutation: Save Config
  const saveConfigMutation = useMutation({
    mutationFn: async (payload: ShuConfig) => {
      const res = await api.put('/cooperative/shu/config', payload);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Aturan persentase distribusi SHU berhasil disimpan!');
      invalidateShuCaches(queryClient);
    },
    onError: (err: any) => {
      console.error(err);
      toast.error(err?.response?.data?.message || 'Gagal menyimpan konfigurasi');
    }
  });

  const sumConfig = useMemo(() => {
    return (
      Number(localConfig.porsiJasaModal || 0) +
      Number(localConfig.porsiJasaTransaksi || 0) +
      Number(localConfig.porsiCadangan || 0) +
      Number(localConfig.porsiPengurus || 0) +
      Number(localConfig.porsiSosial || 0) +
      Number(localConfig.porsiPembangunan || 0)
    );
  }, [localConfig]);

  const handleConfigSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (sumConfig !== 100) {
      toast.error(`Total persentase harus tepat 100%! (Saat ini: ${sumConfig}%)`);
      return;
    }
    await saveConfigMutation.mutateAsync(localConfig);
  }, [sumConfig, localConfig, saveConfigMutation]);

  if (configQuery.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[250px]">
        <div className="w-8 h-8 border-4 border-indigo-600/20 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <ShuRulesForm
        config={localConfig}
        setConfig={setLocalConfig}
        handleConfigSubmit={handleConfigSubmit}
        savingConfig={saveConfigMutation.isPending}
        sumConfig={sumConfig}
        canManageShu={canManageShu}
      />
    </div>
  );
});

ShuDistributionSetting.displayName = 'ShuDistributionSetting';
