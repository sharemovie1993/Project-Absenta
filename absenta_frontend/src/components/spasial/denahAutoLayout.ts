import type { DenahElementNode } from '../../types/spasial.types';
import type { UnassignedRoomItem } from './DenahPaletteSidebar';

const snap = (val: number, step = 20) => Math.round(val / step) * step;

export function generateAutoFloorplan(unassignedRooms: UnassignedRoomItem[]): DenahElementNode[] {
  const generated: DenahElementNode[] = [];
  const roomWidth = 180;
  const roomHeight = 110;
  const gap = 20;

  if (unassignedRooms.length > 0) {
    const perRow = 5;
    unassignedRooms.forEach((room, idx) => {
      const col = idx % perRow;
      const row = Math.floor(idx / perRow);
      // Place blocks with corridor separation
      const yOffset = row >= 2 ? row * (roomHeight + gap) + 60 : row * (roomHeight + gap);
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
      y: snap(60 + 2 * (roomHeight + gap)),
      width: snap(perRow * (roomWidth + gap) - gap),
      height: 60,
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
      height: 60,
      rotation: 0,
      label_utama: 'KORIDOR UTAMA',
      label_sub: 'Akses Selasar Gedung',
      kategori_ruang: 'KORIDOR',
    });

    // Facilities below corridor
    generated.push({
      id: `node-tpl-lab`,
      x: 60,
      y: snap(60 + roomHeight + gap + 80),
      width: 220,
      height: 120,
      rotation: 0,
      label_utama: 'LAB KOMPUTER 1',
      label_sub: 'Server CBT & Praktik',
      kategori_ruang: 'LAB',
    });
    generated.push({
      id: `node-tpl-office`,
      x: snap(60 + 240),
      y: snap(60 + roomHeight + gap + 80),
      width: 220,
      height: 120,
      rotation: 0,
      label_utama: 'RUANG GURU',
      label_sub: 'Kantor Pengajar',
      kategori_ruang: 'KANTOR',
    });
    generated.push({
      id: `node-tpl-toilet`,
      x: snap(60 + 480),
      y: snap(60 + roomHeight + gap + 80),
      width: 140,
      height: 80,
      rotation: 0,
      label_utama: 'TOILET',
      label_sub: 'Siswa / Guru',
      kategori_ruang: 'TOILET',
    });
  }

  return generated;
}
