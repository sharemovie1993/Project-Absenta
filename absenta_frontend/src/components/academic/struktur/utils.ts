import { shortenPosition } from './StrukturConfig';
import type { GroupedStruktur, TopologyNodeData } from './types';

const cleanDetails = (details: string | null): string => {
  if (!details) return '';
  return details.replace(/NIP[:.]?\s?\d+/gi, '').replace(/•\s*$/, '').trim();
};

/**
 * JALUR VVIP PIMPINAN & MANAJEMEN (ISOLASI TOTAL)
 */
export const transformManagementToTree = (
  roleCodes: string[],
  data: GroupedStruktur,
  jurusans: Record<string, string>
): TopologyNodeData | null => {
  if (!data) return null;

  const children: TopologyNodeData[] = [];

  roleCodes.forEach(kode => {
    const nodes = data[kode];
    if (nodes && nodes.length > 0) {
      nodes.forEach((n: any) => {
        const area = n.nama.replace(/WAKIL KEPALA SEKOLAH BIDANG|WAKIL KEPALA SEKOLAH|WAKA|& STAF|& STAFF/gi, '').trim();
        const uniqueId = `mgmt-group-${kode}-${n.id}`;

        const members = [...(n.members || [])].sort((a, b) => new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime());
        const memberSlots: TopologyNodeData[] = members.map((m: any, idx: number) => {
          const isBoss = idx === 0;
          const rawLabel = isBoss ? `WAKA ${area}` : `STAF ${area}`;
          return {
            id: isBoss ? `boss-${kode}-${n.id}-${m.id}` : `staff-${kode}-${n.id}-${m.id}`,
            label: shortenPosition(rawLabel),
            subLabel: m.name,
            type: 'STRUCT' as any,
            data: { roleCode: kode, realMemberId: m.id, realStrukturId: n.id, unit_id: n.unit_id }
          };
        });

        children.push({
          id: uniqueId,
          label: `BIDANG ${area.replace(/& STAF/gi, '').trim()}`, 
          subLabel: '',
          type: 'CATEGORY' as any, // New Type for 1-row design
          data: { roleCode: kode, realStrukturId: n.id, unit_id: n.unit_id, forceVertical: true },
          children: memberSlots
        });
      });
    }
  });

  if (children.length === 0) return null;

  return {
    id: 'management-root',
    label: 'PIMPINAN & MANAJEMEN',
    type: 'GROUP' as any,
    children
  };
};

/**
 * JALUR STANDAR (KAPROG, WALI KELAS, DLL) - RESTORED LOGIC
 */
export const transformDataToTree = (
  groupCodes: string[], 
  data: GroupedStruktur, 
  jurusans: Record<string, string>
): TopologyNodeData | null => {
  if (!data) return null;
  let allRoots: TopologyNodeData[] = [];

  groupCodes.forEach(kode => {
    if (!data[kode]) return;
    const nodes = data[kode];

    // Kelompok yang butuh grouping per Tingkat & Vertikal
    const isAcademicOrService = ['KAPROG', 'KABENG', 'TOOLMAN', 'WALIKELAS', 'PETUGAS_KELAS', 'BPBK', 'BKK', 'GERBANG', 'PETUGAS_ABSENSI'].includes(kode);

    if (isAcademicOrService) {
      if (['WALIKELAS', 'PETUGAS_KELAS', 'PETUGAS_ABSENSI'].includes(kode)) {
        // Logika Grouping per Tingkat (10, 11, 12)
        const levels = Array.from(new Set(nodes.map((n: any) => n.tingkat)))
          .filter(t => t !== null && t !== undefined)
          .sort((a: any, b: any) => Number(a) - Number(b));

        const levelNodes = levels.map(tingkat => {
          const nodesInLevel = nodes.filter((n: any) => n.tingkat === tingkat);
          return {
            id: `level-${kode}-${tingkat}`,
            label: `TINGKAT ${tingkat}`,
            type: 'CATEGORY' as any,
            data: { roleCode: kode, tingkat, forceVertical: true },
            children: nodesInLevel.map((n: any) => {
               const sortedMembers = [...(n.members || [])].sort((a: any, b: any) => new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime());
               const headMember = sortedMembers[0];
               return {
                 id: `node-${kode}-${n.id}-${n.kelas_id || 'no-class'}`,
                 label: shortenPosition(n.kelas_name || n.nama),
                 subLabel: headMember ? headMember.name : 'Belum diisi',
                 type: 'STRUCT' as any,
                 data: { roleCode: kode, isUnassigned: !headMember, realMemberId: headMember?.id, realStrukturId: n.id, kelas_id: n.kelas_id, tingkat },
                 children: sortedMembers.slice(1).map((m: any) => ({
                   id: `member-${kode}-${n.id}-${m.id}`,
                   label: m.name,
                   subLabel: cleanDetails(m.details),
                   type: 'MEMBER' as any,
                   data: { roleCode: kode, realMemberId: m.id, realStrukturId: n.id, kelas_id: n.kelas_id, tingkat }
                 }))
               };
            })
          };
        });

        allRoots.push({
          id: `group-header-${kode}`,
          label: kode.replace('_', ' '),
          type: 'GROUP' as any,
          children: levelNodes
        });
      } else {
        // Logika Kaprog/Kabeng (Horizontal Positions with Vertical Staff)
        const instanceNodes = nodes.map((n: any) => {
          const sortedMembers = [...(n.members || [])].sort((a: any, b: any) => new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime());
          const headMember = sortedMembers[0];
          const unitLabel = (n.unit_id ? jurusans[n.unit_id] : null) || n.unit_kode || '';
          return {
            id: `node-${kode}-${n.id}-${n.unit_id || 'no-unit'}`,
            label: shortenPosition(unitLabel ? `${n.nama} ${unitLabel}` : n.nama),
            subLabel: headMember ? headMember.name : 'Belum diisi',
            type: 'STRUCT' as any,
            data: { roleCode: kode, realMemberId: headMember?.id, realStrukturId: n.id, unit_id: n.unit_id, forceVertical: true, isCoordinator: true },
            children: [...(n.members || [])]
              .sort((a: any, b: any) => new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime())
              .slice(1)
              .map((m: any) => {
                const isBPBK = kode === 'BPBK';
                const isGerbang = kode === 'GERBANG';
                const isStruct = isBPBK || isGerbang;
                return {
                  id: isStruct ? `staff-${kode}-${n.id}-${m.id}` : `member-${kode}-${n.id}-${m.id}`,
                  label: isBPBK ? 'STAF BP/BK' : isGerbang ? 'PETUGAS GERBANG' : m.name,
                  subLabel: isStruct ? m.name : cleanDetails(m.details),
                  type: (isStruct ? 'STRUCT' : 'MEMBER') as any,
                  data: { roleCode: kode, realMemberId: m.id, realStrukturId: n.id, unit_id: n.unit_id }
                };
              })
          };
        });

        allRoots.push({
          id: `role-header-${kode}`,
          label: kode.replace('_', ' '),
          type: 'GROUP' as any,
          data: { forceVertical: true },
          children: instanceNodes
        });
      }
    } else {
      // Jalur fallback untuk role lain
      nodes.forEach(node => {
        const sortedMembers = [...(node.members || [])].sort((a: any, b: any) => new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime());
        const headMember = sortedMembers[0];
        allRoots.push({
          id: `node-${kode}-${node.id}`,
          label: shortenPosition(node.nama),
          subLabel: headMember ? headMember.name : 'Belum diisi',
          type: 'STRUCT' as any,
          data: { roleCode: kode, realStrukturId: node.id, realMemberId: headMember?.id },
          children: sortedMembers.slice(1).map((m: any) => ({
             id: `member-${kode}-${node.id}-${m.id}`,
             label: m.name,
             subLabel: cleanDetails(m.details),
             type: 'MEMBER' as any,
             data: { roleCode: kode, realMemberId: m.id, realStrukturId: node.id }
          }))
        });
      });
    }
  });

  if (allRoots.length === 0) return null;
  if (allRoots.length === 1) return allRoots[0];

  return {
    id: `root-group-${groupCodes.join('-')}`,
    label: 'STRUKTUR ORGANISASI',
    type: 'GROUP' as any,
    children: allRoots
  };
};
