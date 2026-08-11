export interface AlamatComponents {
  alamat?: string | null;
  dusun?: string | null;
  rt?: string | null;
  rw?: string | null;
  kelurahan?: string | null;
  kecamatan?: string | null;
  kabupaten?: string | null;
  provinsi?: string | null;
  kode_pos?: string | null;
}

/**
 * Generates a Virtual Computed Full Formatted Address string.
 * Example Output:
 * "Kp. Cihampelas No. 11, RT 001 / RW 002, Desa/Kel. Cibogo Girang, Kec. Plered, Purwakarta, Prov. Jawa Barat 41162"
 */
export function formatAlamatLengkap(data: AlamatComponents | null | undefined): string {
  if (!data) return '-';

  const parts: string[] = [];

  const mainStreet = (data.alamat || data.dusun || '').trim();
  if (mainStreet) parts.push(mainStreet);

  const rt = (data.rt || '').trim();
  const rw = (data.rw || '').trim();
  if (rt || rw) {
    const rtRwStr = [rt ? `RT ${rt}` : '', rw ? `RW ${rw}` : ''].filter(Boolean).join(' / ');
    parts.push(rtRwStr);
  }

  const kel = (data.kelurahan || '').trim();
  if (kel) parts.push(`Desa/Kel. ${kel}`);

  const kec = (data.kecamatan || '').trim();
  if (kec) parts.push(`Kec. ${kec}`);

  const kab = (data.kabupaten || '').trim();
  if (kab) parts.push(kab);

  const prov = (data.provinsi || '').trim();
  if (prov) parts.push(`Prov. ${prov}`);

  const zip = (data.kode_pos || '').trim();

  let result = parts.length > 0 ? parts.join(', ') : '-';
  if (zip && result !== '-') {
    result += ` ${zip}`;
  }

  return result;
}
