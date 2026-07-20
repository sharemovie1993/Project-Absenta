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
  jurusans: Record<string, string>,
  tingkatList?: number[]
): TopologyNodeData | null => {
  if (!data) return null;
  let allRoots: TopologyNodeData[] = [];

  groupCodes.forEach(kode => {
    if (!data[kode]) return;
    const nodes = data[kode];

    // Kelompok yang butuh grouping per Tingkat & Vertikal
    const isAcademicOrService = ['KAPROG', 'KABENG', 'TOOLMAN', 'WALIKELAS', 'PETUGAS_KELAS', 'BPBK', 'BKK', 'GERBANG', 'PETUGAS_ABSENSI', 'PEMBINA_ESKUL'].includes(kode);

    if (isAcademicOrService) {
      if (['WALIKELAS', 'PETUGAS_KELAS', 'PETUGAS_ABSENSI'].includes(kode)) {
        // Logika Grouping per Tingkat (10, 11, 12)
        let levels = Array.from(new Set(nodes.map((n: any) => n.tingkat)))
          .filter(t => t !== null && t !== undefined)
          .sort((a: any, b: any) => Number(a) - Number(b));

        if (tingkatList && tingkatList.length > 0) {
          levels = levels.filter(t => tingkatList.includes(Number(t)));
        }

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
        // Logika Kaprog/Kabeng / Pembina Eskul (Horizontal Positions with Vertical Staff)
        const instanceNodes = nodes.map((n: any) => {
          const sortedMembers = [...(n.members || [])].sort((a: any, b: any) => new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime());
          const headMember = sortedMembers[0];
          
          const isEskul = kode === 'PEMBINA_ESKUL';
          const eskulLabel = isEskul ? n.eskul_name : null;
          const unitLabel = (n.unit_id ? jurusans[n.unit_id] : null) || n.unit_kode || '';
          
          const displayLabel = isEskul 
            ? `${n.nama} ${eskulLabel || ''}`
            : (unitLabel ? `${n.nama} ${unitLabel}` : n.nama);

          return {
            id: `node-${kode}-${n.id}-${isEskul ? (n.jenis_kegiatan_id || 'no-eskul') : (n.unit_id || 'no-unit')}`,
            label: shortenPosition(displayLabel),
            subLabel: headMember ? headMember.name : 'Belum diisi',
            type: 'STRUCT' as any,
            data: { 
              roleCode: kode, 
              realMemberId: headMember?.id, 
              realStrukturId: n.id, 
              unit_id: n.unit_id, 
              jenis_kegiatan_id: n.jenis_kegiatan_id,
              forceVertical: true, 
              isCoordinator: true 
            },
            children: [...(n.members || [])]
              .sort((a: any, b: any) => new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime())
              .slice(1)
              .map((m: any) => {
                const isBPBK = kode === 'BPBK';
                const isGerbang = kode === 'GERBANG';
                const isStruct = isBPBK || isGerbang || isEskul;
                return {
                  id: isStruct ? `staff-${kode}-${n.id}-${m.id}` : `member-${kode}-${n.id}-${m.id}`,
                  label: isBPBK ? 'STAF BP/BK' : isGerbang ? 'PETUGAS GERBANG' : isEskul ? 'STAF PEMBINA' : m.name,
                  subLabel: isStruct ? m.name : cleanDetails(m.details),
                  type: (isStruct ? 'STRUCT' : 'MEMBER') as any,
                  data: { roleCode: kode, realMemberId: m.id, realStrukturId: n.id, unit_id: n.unit_id, jenis_kegiatan_id: n.jenis_kegiatan_id }
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
      // Jalur fallback untuk role lain (termasuk TU sub-codes)
      nodes.forEach(node => {
        const sortedMembers = [...(node.members || [])].sort((a: any, b: any) => new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime());
        const headMember = sortedMembers[0];
        
        let displayLabel = node.nama;
        if (kode.includes('KOPERASI')) {
          displayLabel = displayLabel.replace(/\s*KOPERASI/gi, '').trim();
        }

        allRoots.push({
          id: `node-${kode}-${node.id}`,
          label: shortenPosition(displayLabel),
          subLabel: headMember ? headMember.name : 'Belum diisi',
          type: 'STRUCT' as any,
          data: { 
            roleCode: kode, 
            realStrukturId: node.id, 
            realMemberId: headMember?.id, 
            isUnassigned: !headMember, 
            forceVertical: String(kode).startsWith('TU_') ? true : undefined 
          },
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

  const isKoperasi = groupCodes.some(c => String(c).includes('KOPERASI'));
  const isTataUsaha = groupCodes.some(c => String(c).startsWith('TU_'));
  return {
    id: `root-group-${groupCodes.join('-')}`,
    label: isTataUsaha ? 'LINGKUNGAN TATA USAHA' : isKoperasi ? 'STRUKTUR ORGANISASI KOPERASI' : 'STRUKTUR ORGANISASI',
    type: 'GROUP' as any,
    children: allRoots
  };
};

