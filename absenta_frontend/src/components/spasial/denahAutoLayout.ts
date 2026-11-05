import type { DenahElementNode } from '../../types/spasial.types';
import type { UnassignedRoomItem } from './DenahPaletteSidebar';

const snap = (val: number, step = 20) => Math.round(val / step) * step;

export function generateAutoFloorplan(unassignedRooms: UnassignedRoomItem[]): DenahElementNode[] {
  const generated: DenahElementNode[] = [];
  const roomWidth = 100;
  const roomHeight = 60;
  const gap = 20;

  if (unassignedRooms.length > 0) {
    const total = unassignedRooms.length;
    // Landscape aspect ratio: adapt column count based on room count
    let perRow = 5;
    if (total > 40) perRow = 10;
    else if (total > 24) perRow = 8;
    else if (total > 12) perRow = 6;

    const totalRows = Math.ceil(total / perRow);
    const corridorRow = Math.max(1, Math.floor(totalRows / 2));

    unassignedRooms.forEach((room, idx) => {
      const col = idx % perRow;
      const row = Math.floor(idx / perRow);
      // Place blocks with corridor separation
      const yOffset = row >= corridorRow ? row * (roomHeight + gap) + 50 : row * (roomHeight + gap);
      generated.push({
        id: `node-auto-${room.kelas_id}-${idx}`,
        x: snap(60 + col * (roomWidth + gap)),
        y: snap(60 + yOffset),
        width: roomWidth,
        height: roomHeight,
        rotation: 0,
        label_utama: room.slot_ruang || `R.0${idx + 1}`,
        label_sub: room.kelas_nama,
        kategori_ruang: 'RUANG_UJIAN',
        kelas_id: room.kelas_id,
        catatan: room.nama_ruang,
      });
    });

    // Central Corridor
    generated.push({
      id: `node-auto-corridor-1`,
      x: 60,
      y: snap(60 + corridorRow * (roomHeight + gap)),
      width: snap(perRow * (roomWidth + gap) - gap),
      height: 40,
      rotation: 0,
      label_utama: 'KORIDOR UTAMA',
      label_sub: 'Selasar Penghubung Gedung',
      kategori_ruang: 'KORIDOR',
    });
  } else {
    // Standard School Campus Template (4 classrooms + corridor + lab + office + toilet)
    const classes = ['X TJKT 1', 'X TJKT 2', 'X AKL 1', 'X AKL 2'];
    classes.forEach((name, i) => {
      generated.push({
        id: `node-tpl-${i}`,
        x: snap(60 + i * (roomWidth + gap)),
        y: 60,
        width: roomWidth,
        height: roomHeight,
        rotation: 0,
        label_utama: `R.0${i + 1}`,
        label_sub: name,
        kategori_ruang: 'RUANG_UJIAN',
      });
    });

    // Corridor
    generated.push({
      id: `node-tpl-corridor`,
      x: 60,
      y: snap(60 + roomHeight + gap),
      width: snap(4 * (roomWidth + gap) - gap),
      height: 40,
      rotation: 0,
      label_utama: 'KORIDOR UTAMA',
      label_sub: 'Akses Selasar Gedung',
      kategori_ruang: 'KORIDOR',
    });

    // Facilities below corridor
    generated.push({
      id: `node-tpl-lab`,
      x: 60,
      y: snap(60 + roomHeight + gap + 60),
      width: 140,
      height: 80,
      rotation: 0,
      label_utama: 'LAB KOMPUTER 1',
      label_sub: 'Server CBT & Praktik',
      kategori_ruang: 'LAB',
    });
    generated.push({
      id: `node-tpl-office`,
      x: snap(60 + 160),
      y: snap(60 + roomHeight + gap + 60),
      width: 140,
      height: 80,
      rotation: 0,
      label_utama: 'RUANG GURU',
      label_sub: 'Kantor Pengajar',
      kategori_ruang: 'KANTOR',
    });
    generated.push({
      id: `node-tpl-toilet`,
      x: snap(60 + 320),
      y: snap(60 + roomHeight + gap + 60),
      width: 90,
      height: 60,
      rotation: 0,
      label_utama: 'TOILET',
      label_sub: 'Siswa / Guru',
      kategori_ruang: 'TOILET',
    });
  }

  return generated;
}
