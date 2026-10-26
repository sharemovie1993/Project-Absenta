import React from 'react';
import { SatpamDashboard } from './satpam/SatpamDashboard';

/**
 * GerbangDashboard - Legacy backward compatibility re-export
 * Directed to the modern Shopee-Grade modular SatpamDashboard
 */
export const GerbangDashboard: React.FC = () => {
  return <SatpamDashboard />;
};

export default GerbangDashboard;
