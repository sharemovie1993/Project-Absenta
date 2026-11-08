import type { DenahElementNode } from '../../types/spasial.types';
import type { UnassignedRoomItem } from './DenahPaletteSidebar';
import { detectNodeTingkat } from './denahTingkatHelper';

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
      const tingkat = room.tingkat || detectNodeTingkat({ label_sub: room.kelas_nama, catatan: room.nama_ruang });

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
        tingkat: tingkat || undefined,
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
    // Standard School Campus Template (16 Ruang Ujian + Selasar Koridor + Lab CBT + Kantor Pengawas + Toilet)
    const standardClasses = [
      { room: 'R.01', name: 'X TJKT 1', tingkat: 10 },
      { room: 'R.02', name: 'X TJKT 2', tingkat: 10 },
      { room: 'R.03', name: 'X AKL 1', tingkat: 10 },
      { room: 'R.04', name: 'X AKL 2', tingkat: 10 },
      { room: 'R.05', name: 'X MPLB 1', tingkat: 10 },
      { room: 'R.06', name: 'X MPLB 2', tingkat: 10 },
      { room: 'R.07', name: 'XI TJKT 1', tingkat: 11 },
      { room: 'R.08', name: 'XI TJKT 2', tingkat: 11 },
      { room: 'R.09', name: 'XI AKL 1', tingkat: 11 },
      { room: 'R.10', name: 'XI AKL 2', tingkat: 11 },
      { room: 'R.11', name: 'XI MPLB 1', tingkat: 11 },
      { room: 'R.12', name: 'XI MPLB 2', tingkat: 11 },
      { room: 'R.13', name: 'XII TJKT 1', tingkat: 12 },
      { room: 'R.14', name: 'XII TJKT 2', tingkat: 12 },
      { room: 'R.15', name: 'XII AKL 1', tingkat: 12 },
      { room: 'R.16', name: 'XII AKL 2', tingkat: 12 },
    ];

    const perRow = 6;
    standardClasses.forEach((item, idx) => {
      const col = idx % perRow;
      const row = Math.floor(idx / perRow);
      const yOffset = row * (roomHeight + 60); // Jarak antar baris untuk koridor

      generated.push({
        id: `node-tpl-${idx}`,
        x: snap(60 + col * (roomWidth + gap)),
        y: snap(60 + yOffset),
        width: roomWidth,
        height: roomHeight,
        rotation: 0,
        label_utama: item.room,
        label_sub: item.name,
        kategori_ruang: 'RUANG_UJIAN',
        catatan: `Ruang Ujian Resmi ${item.room}`,
        tingkat: item.tingkat,
      });
    });

    // Koridor Utama Sayap Utara
    generated.push({
      id: `node-tpl-corridor-1`,
      x: 60,
      y: snap(60 + roomHeight + 10),
      width: snap(perRow * (roomWidth + gap) - gap),
      height: 40,
      rotation: 0,
      label_utama: 'KORIDOR UTAMA LANTAI 1',
      label_sub: 'Selasar Penghubung Ruang 01 - 06',
      kategori_ruang: 'KORIDOR',
    });

    // Koridor Utama Sayap Selatan
    generated.push({
      id: `node-tpl-corridor-2`,
      x: 60,
      y: snap(60 + (roomHeight + 60) + roomHeight + 10),
      width: snap(perRow * (roomWidth + gap) - gap),
      height: 40,
      rotation: 0,
      label_utama: 'KORIDOR UTAMA LANTAI 2',
      label_sub: 'Selasar Penghubung Ruang 07 - 12 & Lab',
      kategori_ruang: 'KORIDOR',
    });

    // Fasilitas Penunjang Ujian: Lab Komputer CBT, Ruang Pengawas, Toilet
    const facilityY = snap(60 + 2 * (roomHeight + 60) + roomHeight + 60);

    generated.push({
      id: `node-tpl-lab-1`,
      x: 60,
      y: facilityY,
      width: 150,
      height: 80,
      rotation: 0,
      label_utama: 'LAB KOMPUTER 1',
      label_sub: 'Pusat Server CBT Utama',
      kategori_ruang: 'LAB',
    });

    generated.push({
      id: `node-tpl-lab-2`,
      x: snap(60 + 170),
      y: facilityY,
      width: 150,
      height: 80,
      rotation: 0,
      label_utama: 'LAB KOMPUTER 2',
      label_sub: 'Ruang Ujian Cadangan',
      kategori_ruang: 'LAB',
    });

    generated.push({
      id: `node-tpl-office`,
      x: snap(60 + 340),
      y: facilityY,
      width: 160,
      height: 80,
      rotation: 0,
      label_utama: 'RUANG PENGAWAS',
      label_sub: 'Sekretariat Panitia CBT',
      kategori_ruang: 'KANTOR',
    });

    generated.push({
      id: `node-tpl-toilet`,
      x: snap(60 + 520),
      y: facilityY,
      width: 110,
      height: 80,
      rotation: 0,
      label_utama: 'TOILET SISWA',
      label_sub: 'Area Sanitasi Kampus',
      kategori_ruang: 'TOILET',
    });
  }

  return generated;
}
