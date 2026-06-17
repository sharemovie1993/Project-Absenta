export type TopologyNodeData = {
  id: string;
  label: string;
  subLabel?: string;
  type: 'ROOT' | 'GROUP' | 'STRUCT' | 'MEMBER' | 'LEADER' | 'CATEGORY';
  data?: any;
  children?: TopologyNodeData[];
  actionType?: string;
  parentStrukturId?: string;
};

export type Member = {
  id: string;
  user_id?: string;
  guru_id?: string;
  siswa_id?: string;
  type: 'GURU' | 'SISWA';
  name: string;
  details: string;
  structId: string;
  structName: string;
  unit_id?: string | null;
  unit_kode?: string | null;
  kelas_id?: string | null;
  User?: {
    id: string;
    Guru?: { id: string };
    Siswa?: { id: string };
  };
};

export type StrukturNode = {
  id: string;
  kode: string;
  nama: string;
  deskripsi: string | null;
  parent_id: string | null;
  scope: string;
  unit_id: string | null;
  unit_kode?: string | null;
  kelas_id: string | null;
  kelas_name?: string | null;
  tingkat?: string | number | null;
  members: Member[];
};

export type GroupedStruktur = Record<string, StrukturNode[]>;

export type GroupConfig = {
  id: string;
  title: string;
  subtitle: string;
  codes: string[];
  gradient: string;
};

export type StrukturDiagramProps = {
  activeCodes?: string[];
  activeTab?: string;
  onNodeClick?: (id: string) => void;
  refreshKey?: number;
};
