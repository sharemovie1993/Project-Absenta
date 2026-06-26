import { 
  LayoutDashboard, 
  Users, 
  ShieldAlert, 
  UserCheck, 
  MailOpen, 
  Home, 
  ClipboardList, 
  Send, 
  BarChart3, 
  History, 
  Settings, 
  List 
} from 'lucide-react';

export type HubNavigationType = 'PAGE' | 'WORKSPACE';

export interface WorkspaceTabConfig {
  id: string;
  label: string;
  icon: any;
  path: string;
  sectionKey: string;
  backendPath?: string; // Maps to the path of backend menu for capability resolution
}

export interface HubNavigationConfig {
  hubId: string;
  type: HubNavigationType;
  basePath?: string;
  tabs?: WorkspaceTabConfig[];
}

export const MODULE_REGISTRY: Record<string, HubNavigationConfig> = {
  BPBK: {
    hubId: 'BPBK',
    type: 'PAGE'
  },
  
  AKADEMIK: {
    hubId: 'AKADEMIK',
    type: 'PAGE'
  },
  KURIKULUM: {
    hubId: 'KURIKULUM',
    type: 'PAGE'
  },
  KESISWAAN: {
    hubId: 'KESISWAAN',
    type: 'PAGE'
  },
  ABSENSI: {
    hubId: 'ABSENSI',
    type: 'PAGE'
  },
  KOPERASI: {
    hubId: 'KOPERASI',
    type: 'PAGE'
  },
  HUBIN: {
    hubId: 'HUBIN',
    type: 'PAGE'
  },
  SARPRAS: {
    hubId: 'SARPRAS',
    type: 'PAGE'
  }
};
