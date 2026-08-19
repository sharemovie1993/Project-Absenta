import React from 'react';
import { WorkspaceAppLauncherCard, type WorkspaceAppLauncherCardProps } from '../common/WorkspaceAppLauncherCard';

export const KurikulumMenuKerjaCard: React.FC<WorkspaceAppLauncherCardProps> = (props) => {
  return <WorkspaceAppLauncherCard workspaceId="KURIKULUM_WORKSPACE" {...props} />;
};
