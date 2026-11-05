import { shortenPosition } from './StrukturConfig';
import { getFlagLabel, getAssignmentFlagsForPosition } from '@/config/assignmentFlags';
import type { GroupedStruktur, TopologyNodeData } from './types';

const cleanDetails = (details: string | null): string => {
  if (!details) return '';
  return details.replace(/NIP[:.]?\s?\d+/gi, '').replace(/•\s*$/, '').trim();
};

export interface TransformManagementOptions {
  /**
   * Jika true, slot formasi sub-bidang resmi yang belum diisi akan dirender sebagai slot kosong interaktif.
   * Digunakan khusus untuk sub-tab Dashboard Role agar Waka/Koordinator dapat langsung klik "+ Klik Isi Slot".
   * Jika false (default), halaman pusat (StrukturOrganisasiPage) hanya merender personil yang aktif tanpa slot kosong.
   */
  includeEmptySlots?: boolean;
  /**
   * Jika true, sub-bidang di bawah Waka/Leader akan dirender secara HORIZONTAL menyamping.
   * Digunakan untuk sub-tab Dashboard Role (Kurikulum, Kesiswaan, Hubin, dll).
   */
  horizontalSubSlots?: boolean;
}

/**
 * JALUR VVIP PIMPINAN & MANAJEMEN (ISOLASI TOTAL)
 * Mendukung 2 Perilaku UI:
 * 1. Pusat (Struktur Organisasi Makro): Tampilan bersih tanpa slot kosong, tetap horizontal & vertikal sesuai desain asli.
 * 2. Dashboard Sub-Tab: Formasi lengkap sub-bidang dengan slot kosong vertikal.
 */
export const transformManagementToTree = (
  roleCodes: string[],
  data: GroupedStruktur,
  jurusans: Record<string, string>,
  options: TransformManagementOptions = {}
): TopologyNodeData | null => {
  if (!data) return null;

  const children: TopologyNodeData[] = [];

  roleCodes.forEach(kode => {
    const nodes = data[kode];
    if (nodes && nodes.length > 0) {
      nodes.forEach((n: any) => {
        const area = n.nama.replace(/WAKIL KEPALA SEKOLAH BIDANG|WAKIL KEPALA SEKOLAH|WAKA|& STAF|& STAFF/gi, '').trim();
        const uniqueId = `mgmt-group-${kode}-${n.id}`;
        const isKoordinatorTu = kode === 'TU_KEPALA';

        const flags = getAssignmentFlagsForPosition(kode);
        const members = [...(n.members || [])].sort((a: any, b: any) => {
          if (a.is_leader && !b.is_leader) return -1;
          if (!a.is_leader && b.is_leader) return 1;
          return new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime();
        });

        const memberSlots: TopologyNodeData[] = [];

        if (flags.length > 0) {
          // ── FORMATION SLOTTING BERBASIS REGULASI PENDIDIKAN NASIONAL ──
          const leaderFlagDef = flags.find(f => f.isLeader);
          const subFlags = flags.filter(f => !f.isLeader);

          // 1. Identifikasi Leader (Waka / Ka.)
          let leaderMember = members.find((m: any) => m.is_leader === true);
          if (!leaderMember && leaderFlagDef) {
            leaderMember = members.find((m: any) => m.assignment_flag === leaderFlagDef.flag);
          }
          if (!leaderMember && members.length > 0) {
            // Fallback anggota pertama jika data legacy belum ber-flag
            leaderMember = members[0];
          }

          const defaultLeaderTitle = leaderFlagDef?.label || (isKoordinatorTu ? 'Koordinator TU' : `WAKA ${area}`);

          let leaderNode: TopologyNodeData;
          if (leaderMember) {
            const rawLabel = leaderMember.custom_title || (leaderMember.assignment_flag ? getFlagLabel(kode, leaderMember.assignment_flag) : defaultLeaderTitle);
            leaderNode = {
              id: `boss-${kode}-${n.id}-${leaderMember.id}`,
              label: shortenPosition(rawLabel),
              subLabel: leaderMember.name,
              type: 'STRUCT' as any,
              data: {
                roleCode: kode,
                realMemberId: leaderMember.id,
                realStrukturId: n.id,
                unit_id: n.unit_id,
                isLeader: true,
                assignmentFlag: leaderMember.assignment_flag || leaderFlagDef?.flag,
                customTitle: leaderMember.custom_title,
                isSlot: true,
                forceVertical: options.horizontalSubSlots ? false : true,
              },
              children: []
            };
          } else {
            // Slot Kosong Leader jika belum ada pimpinan
            leaderNode = {
              id: `slot-empty-leader-${kode}-${n.id}`,
              label: shortenPosition(defaultLeaderTitle),
              subLabel: 'Belum Diisi',
              type: 'STRUCT' as any,
              data: {
                roleCode: kode,
                realStrukturId: n.id,
                unit_id: n.unit_id,
                isLeader: true,
                assignmentFlag: leaderFlagDef?.flag,
                customTitle: defaultLeaderTitle,
                isUnassigned: true,
                isSlot: true,
                forceVertical: options.horizontalSubSlots ? false : true,
              },
              children: []
            };
          }

          const remainingMembers = members.filter((m: any) => m.id !== leaderMember?.id);

          if (!options.includeEmptySlots) {
            // ── PERILAKU 1: STRUKTUR ORGANISASI PUSAT (MAKRO) ──
            // Tampilan Pusat TIDAK BOLEH BERUBAH: HANYA menampilkan staf yang aktif terdaftar secara vertikal.
            memberSlots.push(leaderNode);
            remainingMembers.forEach((m: any) => {
              const rawLabel = m.custom_title || (m.assignment_flag ? getFlagLabel(kode, m.assignment_flag) : (isKoordinatorTu ? 'Staf TU' : `STAF ${area}`));
              memberSlots.push({
                id: `staff-${kode}-${n.id}-${m.id}`,
                label: shortenPosition(rawLabel),
                subLabel: m.name,
                type: 'STRUCT' as any,
                data: {
                  roleCode: kode,
                  realMemberId: m.id,
                  realStrukturId: n.id,
                  unit_id: n.unit_id,
                  isLeader: false,
                  assignmentFlag: m.assignment_flag,
                  customTitle: m.custom_title,
                }
              });
            });

            children.push({
              id: uniqueId,
              label: isKoordinatorTu ? 'BIDANG TU' : `BIDANG ${area.replace(/& STAF/gi, '').trim()}`, 
              subLabel: '',
              type: 'CATEGORY' as any,
              data: { roleCode: kode, realStrukturId: n.id, unit_id: n.unit_id, forceVertical: true },
              children: memberSlots
            });

          } else {
            // ── PERILAKU 2: SUB-TAB DASHBOARD ROLE (HORIZONTAL) ──
            // Menampilkan formasi lengkap slot resmi (terisi maupun kosong) secara HORIZONTAL di bawah Waka.
            const subSlots: TopologyNodeData[] = [];
            const legacyUnflaggedMembers = remainingMembers.filter((m: any) => !m.assignment_flag);
            const assignedMembers = new Set<string>();

            subFlags.forEach(subFlag => {
              let matched = remainingMembers.find((m: any) => m.assignment_flag === subFlag.flag && !assignedMembers.has(m.id));
              
              if (!matched && legacyUnflaggedMembers.length > 0) {
                matched = legacyUnflaggedMembers.shift();
              }

              if (matched) {
                assignedMembers.add(matched.id);
                const rawLabel = matched.custom_title || subFlag.label;
                subSlots.push({
                  id: `slot-${kode}-${n.id}-${subFlag.flag}-${matched.id}`,
                  label: shortenPosition(rawLabel),
                  subLabel: matched.name,
                  type: 'STRUCT' as any,
                  data: {
                    roleCode: kode,
                    realMemberId: matched.id,
                    realStrukturId: n.id,
                    unit_id: n.unit_id,
                    isLeader: false,
                    assignmentFlag: subFlag.flag,
                    customTitle: matched.custom_title,
                    isSlot: true,
                  }
                });
              } else {
                // SLOT KOSONG: Siap diklik langsung untuk penugasan tanpa dropdown manual
                subSlots.push({
                  id: `slot-empty-${kode}-${n.id}-${subFlag.flag}`,
                  label: shortenPosition(subFlag.label),
                  subLabel: 'Belum Diisi',
                  type: 'STRUCT' as any,
                  data: {
                    roleCode: kode,
                    realStrukturId: n.id,
                    unit_id: n.unit_id,
                    isLeader: false,
                    assignmentFlag: subFlag.flag,
                    customTitle: subFlag.label,
                    isUnassigned: true,
                    isSlot: true,
                  }
                });
              }
            });

            // Tambahan personil non-slot jika melebihi kuota standar
            const leftoverMembers = remainingMembers.filter((m: any) => !assignedMembers.has(m.id) && !legacyUnflaggedMembers.includes(m));
            leftoverMembers.forEach((extra: any) => {
              const rawLabel = extra.custom_title || (extra.assignment_flag ? getFlagLabel(kode, extra.assignment_flag) : `STAF ${area}`);
              subSlots.push({
                id: `staff-extra-${kode}-${n.id}-${extra.id}`,
                label: shortenPosition(rawLabel),
                subLabel: extra.name,
                type: 'STRUCT' as any,
                data: {
                  roleCode: kode,
                  realMemberId: extra.id,
                  realStrukturId: n.id,
                  unit_id: n.unit_id,
                  isLeader: false,
                  assignmentFlag: extra.assignment_flag,
                  customTitle: extra.custom_title,
                }
              });
            });

            if (options.horizontalSubSlots) {
              // Sub-bagian berjajar secara HORIZONTAL di bawah Leader
              leaderNode.children = subSlots;

              children.push({
                id: uniqueId,
                label: isKoordinatorTu ? 'BIDANG TU' : `BIDANG ${area.replace(/& STAF/gi, '').trim()}`, 
                subLabel: '',
                type: 'CATEGORY' as any,
                data: { 
                  roleCode: kode, 
                  realStrukturId: n.id, 
                  unit_id: n.unit_id, 
                  forceVertical: true // Banner terhubung vertikal ke Leader
                },
                children: [leaderNode]
              });
            } else {
              memberSlots.push(leaderNode, ...subSlots);
              children.push({
                id: uniqueId,
                label: isKoordinatorTu ? 'BIDANG TU' : `BIDANG ${area.replace(/& STAF/gi, '').trim()}`, 
                subLabel: '',
                type: 'CATEGORY' as any,
                data: { roleCode: kode, realStrukturId: n.id, unit_id: n.unit_id, forceVertical: true },
                children: memberSlots
              });
            }
          }

        } else {
          // Fallback jalur non-flags
          const hasExplicitLeader = members.some((m: any) => m.is_leader === true);
          members.forEach((m: any, idx: number) => {
            const isBoss = m.is_leader === true || (!hasExplicitLeader && idx === 0);
            const rawLabel = m.custom_title || (isKoordinatorTu ? (isBoss ? 'Koordinator TU' : 'Staf TU') : (isBoss ? `WAKA ${area}` : `STAF ${area}`));
            memberSlots.push({
              id: isBoss ? `boss-${kode}-${n.id}-${m.id}` : `staff-${kode}-${n.id}-${m.id}`,
              label: shortenPosition(rawLabel),
              subLabel: m.name,
              type: 'STRUCT' as any,
              data: {
                roleCode: kode,
                realMemberId: m.id,
                realStrukturId: n.id,
                unit_id: n.unit_id,
                isLeader: isBoss,
                assignmentFlag: m.assignment_flag,
                customTitle: m.custom_title,
              }
            });
          });
        }

        if (flags.length === 0) {
          children.push({
            id: uniqueId,
            label: isKoordinatorTu ? 'BIDANG TU' : `BIDANG ${area.replace(/& STAF/gi, '').trim()}`, 
            subLabel: '',
            type: 'CATEGORY' as any,
            data: { roleCode: kode, realStrukturId: n.id, unit_id: n.unit_id, forceVertical: true },
            children: memberSlots
          });
        }
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
          const sortedMembers = [...(n.members || [])].sort((a: any, b: any) => {
            if (a.is_leader && !b.is_leader) return -1;
            if (!a.is_leader && b.is_leader) return 1;
            return new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime();
          });
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
        const sortedMembers = [...(node.members || [])].sort((a: any, b: any) => {
          if (a.is_leader && !b.is_leader) return -1;
          if (!a.is_leader && b.is_leader) return 1;
          return new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime();
        });
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
             label: shortenPosition(displayLabel),
             subLabel: m.name,
             type: 'MEMBER' as any,
             data: { 
               roleCode: kode, 
               realMemberId: m.id, 
               realStrukturId: node.id,
               details: cleanDetails(m.details)
             }
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

/**
 * JALUR KHUSUS TAB TATA USAHA (TU TAB)
 */
export const transformTuTabToTree = (
  data: GroupedStruktur,
  jurusans: Record<string, string>,
  tingkatList?: number[]
): TopologyNodeData | null => {
  if (!data) return null;

  // 1. Dapatkan node Koordinator TU
  const tuKepalaNodes = data['TU_KEPALA'] || [];
  const tuKepalaNode = tuKepalaNodes[0];

  if (!tuKepalaNode) {
    // Fallback jika database belum di-seed dengan TU_KEPALA
    return transformDataToTree(['TU_PERSURATAN', 'TU_KEUANGAN', 'TU_KEPEGAWAIAN', 'TU_SARPRAS'], data, jurusans, tingkatList);
  }

  const sortedMembers = [...(tuKepalaNode.members || [])].sort((a, b) => new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime());
  const headMember = sortedMembers[0];

  // 2. Buat node Koordinator TU sebagai root
  const rootNode: TopologyNodeData = {
    id: `node-TU_KEPALA-${tuKepalaNode.id}`,
    label: 'Koordinator TU',
    subLabel: headMember ? headMember.name : 'Belum diisi',
    type: 'STRUCT' as any,
    data: { 
      roleCode: 'TU_KEPALA', 
      realStrukturId: tuKepalaNode.id, 
      realMemberId: headMember?.id, 
      isUnassigned: !headMember 
    },
    children: []
  };

  // 3. Dapatkan 4 slot staf TU
  const staffGroup = transformDataToTree(['TU_PERSURATAN', 'TU_KEUANGAN', 'TU_KEPEGAWAIAN', 'TU_SARPRAS'], data, jurusans, tingkatList);
  if (staffGroup && staffGroup.children) {
    rootNode.children = staffGroup.children;
  }

  return rootNode;
};

/**
 * JALUR KHUSUS TAB KETARUNAAN (HIERARKI TERSTRUKTUR DI BAWAH KESISWAAN)
 */
export const transformKetarunaanTabToTree = (
  data: GroupedStruktur,
  jurusans: Record<string, string>,
  tingkatList?: number[]
): TopologyNodeData | null => {
  if (!data) return null;

  // 1. Puncak Hierarki: Kepala Sekolah
  const kepsekNodes = data['KEPALA_SEKOLAH'] || [];
  const kepsekNode = kepsekNodes[0];
  const kepsekSortedMembers = [...(kepsekNode?.members || [])].sort((a, b) => new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime());
  const kepsekHead = kepsekSortedMembers[0];

  // 2. Penanggung Jawab: Waka Kesiswaan
  const kesiswaanNodes = data['KESISWAAN'] || [];
  const kesiswaanNode = kesiswaanNodes[0];
  const kesiswaanSortedMembers = [...(kesiswaanNode?.members || [])].sort((a, b) => new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime());
  const kesiswaanHead = kesiswaanSortedMembers[0];

  // 3. Koordinator Utama: Ketua Pembina Taruna
  const tarunaNodes = data['KETUA_PEMBINA_TARUNA'] || [];
  const tarunaNode = tarunaNodes[0];
  const tarunaSortedMembers = [...(tarunaNode?.members || [])].sort((a, b) => new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime());
  const tarunaHead = tarunaSortedMembers[0];

  // 4. Mitra Kesiswaan: Pembina OSIS (dari PEMBINA_ESKUL yang memiliki unit OSIS)
  const eskulNodes = data['PEMBINA_ESKUL'] || [];
  const osisNode = eskulNodes.find((n: any) => 
    (n.eskul_name && n.eskul_name.toUpperCase().includes('OSIS')) ||
    (n.nama && n.nama.toUpperCase().includes('OSIS'))
  );
  const osisSortedMembers = [...(osisNode?.members || [])].sort((a, b) => new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime());
  const osisHead = osisSortedMembers[0];

  // Susun Node Ketua Pembina Taruna
  const tarunaTreeNode: TopologyNodeData = {
    id: tarunaNode ? `node-KETUA_PEMBINA_TARUNA-${tarunaNode.id}` : 'virtual-taruna-ketua',
    label: 'Ketua Pembina Taruna',
    subLabel: tarunaHead ? tarunaHead.name : 'Belum diisi',
    type: 'STRUCT' as any,
    data: {
      roleCode: 'KETUA_PEMBINA_TARUNA',
      realStrukturId: tarunaNode?.id,
      realMemberId: tarunaHead?.id,
      isUnassigned: !tarunaHead,
      forceVertical: true
    },
    children: []
  };

  // Tambahkan anggota staf binaan jika ada (members ke-2 dst dari Ketua Pembina Taruna)
  if (tarunaSortedMembers.length > 1) {
    tarunaTreeNode.children = tarunaSortedMembers.slice(1).map((m: any, idx: number) => ({
      id: `member-taruna-${m.id}`,
      label: `Staf Pembina ${idx + 1}`,
      subLabel: m.name,
      type: 'MEMBER' as any,
      data: {
        roleCode: 'KETUA_PEMBINA_TARUNA',
        realMemberId: m.id,
        realStrukturId: tarunaNode?.id,
        details: cleanDetails(m.details)
      }
    }));
  }

  // Node Waka Kesiswaan yang menaungi Ketua Pembina Taruna & Pembina OSIS
  const kesiswaanTreeNode: TopologyNodeData = {
    id: kesiswaanNode ? `node-KESISWAAN-${kesiswaanNode.id}` : 'virtual-kesiswaan-root',
    label: 'Waka Kesiswaan',
    subLabel: kesiswaanHead ? kesiswaanHead.name : 'Belum diisi',
    type: 'STRUCT' as any,
    data: {
      roleCode: 'KESISWAAN',
      realStrukturId: kesiswaanNode?.id,
      realMemberId: kesiswaanHead?.id,
      isUnassigned: !kesiswaanHead
    },
    children: [tarunaTreeNode]
  };

  // Jika ada slot OSIS, letakkan berdampingan dengan Ketua Pembina Taruna di bawah Kesiswaan
  if (osisNode) {
    kesiswaanTreeNode.children!.push({
      id: `node-PEMBINA_OSIS-${osisNode.id}`,
      label: 'Pembina OSIS',
      subLabel: osisHead ? osisHead.name : 'Belum diisi',
      type: 'STRUCT' as any,
      data: {
        roleCode: 'PEMBINA_ESKUL',
        realStrukturId: osisNode.id,
        realMemberId: osisHead?.id,
        jenis_kegiatan_id: osisNode.jenis_kegiatan_id,
        isUnassigned: !osisHead
      }
    });
  }

  // Jika ada Kepala Sekolah, jadikan Kepala Sekolah sebagai Root puncak
  if (kepsekNode) {
    return {
      id: `node-KEPALA_SEKOLAH-${kepsekNode.id}`,
      label: 'Kepala Sekolah',
      subLabel: kepsekHead ? kepsekHead.name : 'Belum diisi',
      type: 'STRUCT' as any,
      data: {
        roleCode: 'KEPALA_SEKOLAH',
        realStrukturId: kepsekNode.id,
        realMemberId: kepsekHead?.id,
        isUnassigned: !kepsekHead
      },
      children: [kesiswaanTreeNode]
    };
  }

  // Fallback: Waka Kesiswaan sebagai Root
  return kesiswaanTreeNode;
};

