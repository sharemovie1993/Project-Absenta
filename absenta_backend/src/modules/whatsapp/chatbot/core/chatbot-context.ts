export interface RoleItem {
  key: 'G' | 'S' | 'O';
  label: string;
}

export interface ChatbotContext {
  rawJid: string;
  cleanJid: string;
  fullJid: string;
  resolvedPhone: string;
  messageText: string;
  commandUpper: string;
  guru: any | null;
  siswa: any | null;
  ortu: any | null;
  roles: RoleItem[];
  activeCount: number;
  activeRole: 'G' | 'S' | 'O' | null;
  tenantId: string | null;
}
