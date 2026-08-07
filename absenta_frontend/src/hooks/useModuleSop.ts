import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useJenjang } from './useJenjang';
import { DEFAULT_MODULE_SOPS, type ModuleSopConfig } from '../config/moduleSops.config';
import { fetchActiveSystemConfig } from '../services/systemConfig';

export function useModuleSop(moduleKey: string) {
  const { jenjang } = useJenjang();

  const { data: sysConfig, isLoading } = useQuery({
    queryKey: ['system-config-sop', moduleKey],
    queryFn: () => fetchActiveSystemConfig(),
    staleTime: 1000 * 60 * 5, // 5 mins cache
  });

  const sopConfig: ModuleSopConfig = useMemo(() => {
    const activeJenjang = jenjang || 'SMK';
    const fallbackFn = DEFAULT_MODULE_SOPS[moduleKey] || DEFAULT_MODULE_SOPS['piket'];
    const defaultSop = fallbackFn(activeJenjang);

    // If database has custom JSON config for this moduleKey, merge it
    const dbSopConfigs = (sysConfig as any)?.sop_configs;
    if (dbSopConfigs && dbSopConfigs[moduleKey]) {
      return {
        ...defaultSop,
        ...dbSopConfigs[moduleKey]
      };
    }

    return defaultSop;
  }, [moduleKey, jenjang, sysConfig]);

  return {
    sopConfig,
    isLoading,
    jenjang: jenjang || 'SMK'
  };
}
