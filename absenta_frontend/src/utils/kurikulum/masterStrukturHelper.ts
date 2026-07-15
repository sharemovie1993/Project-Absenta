import type { Mapel } from '../../types/academic';
import { sekolahApi, Sekolah } from '../../api/academic/sekolah.api';
import { getStrukturList } from '../../api/academic/strukturOrganisasi.api';
import { renderStrukturKurikulumPdf, StrukturPrintRow } from '../print/modules/pdfKurikulum';
import { getBase64ImageFromUrl } from '../cooperative/coopDocUtils';
import { toast } from 'react-hot-toast';

export type StrukturKurikulum = {
  id: string;
  mapel_id: string;
  tahun_pelajaran_id: string;
  tingkat: number;
  jurusan_id?: string;
  jp_per_minggu: number;
  kelompok: string;
  Mapel?: Mapel;
  Jurusan?: {
    nama: string;
  };
};

interface StrukturOrganisasiItem {
  jabatan?: {
    nama_jabatan?: string;
  };
  nama_lengkap?: string;
  nip?: string;
}

export const STANDAR_JP_CONFIG: Record<string, Record<number, number>> = {
  SMA: { 10: 44, 11: 44, 12: 44 },
  SMK: { 10: 46, 11: 48, 12: 48, 13: 48 },
  SMP: { 7: 38, 8: 38, 9: 38 },
  SD: { 1: 30, 2: 32, 3: 34, 4: 36, 5: 36, 6: 36 }
};

export const detectKelompokForMapel = (kodeMapel: string, namaMapel: string): string => {
  const kode = (kodeMapel || '').toUpperCase();
  const nama = (namaMapel || '').toLowerCase();
  
  const kejuruanSuffixes = ['-RPL', '-TKJ', '-AKL', '-MPLB', '-DKV', '-TBSM', '-TKR', '-TP', '-PH', '-KL', '-TB', '-TAV', '-TOI'];
  const isDasar = kode.includes('DAS-') || nama.includes('dasar-dasar') || nama.includes('dasar dasar');
  const isPkl = kode.includes('PKL') || nama.includes('praktik kerja lapangan') || nama.includes('praktek kerja lapangan') || nama.includes('pkl');
  const isPkk = kode.includes('PKK') || nama.includes('projek kreatif') || nama.includes('project kreatif') || nama.includes('pkk');
  const isKk = kode === 'KK' || kode.startsWith('KK-') || nama.includes('konsentrasi keahlian');

  const isKejuruan = isPkl || isPkk || isDasar || isKk || kode.endsWith('-K') || kejuruanSuffixes.some(s => kode.includes(s));
                       
  const isMulok = kode.startsWith('M-') || 
                  nama.includes('bahasa sunda') || 
                  nama.includes('bahasa jawa') || 
                  nama.includes('bahasa bali') || 
                  nama.includes('bahasa madura') || 
                  nama.includes('muatan lokal') || 
                  nama.includes('plh') || 
                  nama.includes('kesenian daerah') ||
                  nama.includes('kepariwisataan');
                  
  const isPilihan = kode.includes('PILIHAN') || 
                    kode.includes('MAPEL-PILIHAN') || 
                    kode.includes('KAI') ||
                    kode.startsWith('SENI_') || // e.g. SENI_MUSIK, SENI_RUPA
                    ['seni musik', 'seni rupa', 'seni tari', 'seni teater', 'pilihan', 'tingkat lanjut', 'koding', 'coding'].some(t => nama.includes(t)) ||
                    ['FIS', 'KIM', 'BIO', 'EKO', 'SOS', 'GEO', 'ANTRO', 'JPN', 'ZHO', 'DEU', 'FRA', 'KOR', 'KAI'].some(k => kode === k);

  if (isKejuruan) return 'MATA PELAJARAN KEJURUAN';
  if (isMulok) return 'MUATAN LOKAL';
  if (isPilihan) return 'MATA PELAJARAN PILIHAN';
  return 'MATA PELAJARAN UMUM';
};

export const detectDefaultJpForMapel = (
  kodeMapel: string,
  namaMapel: string,
  tingkat: number,
  standardReferencesData: any[],
  isSmkOrMak: boolean
): number => {
  const kode = (kodeMapel || '').toUpperCase();
  const nama = (namaMapel || '').toLowerCase();
  
  if (standardReferencesData && Array.isArray(standardReferencesData)) {
    // 1. Exact match by code
    let match = standardReferencesData.find(ref => 
      ref.tingkat === tingkat && 
      (ref.kode_mapel || '').toUpperCase() === kode
    );
    
    // 2. Clean match by base code prefix (e.g. PAI-3C74 -> PAI)
    if (!match) {
      const cleanCode = kode.split('-')[0];
      match = standardReferencesData.find(ref => 
        ref.tingkat === tingkat && 
        (ref.kode_mapel || '').toUpperCase() === cleanCode
      );
    }
    
    // 3. Match by name contains
    if (!match) {
      match = standardReferencesData.find(ref => 
        ref.tingkat === tingkat && 
        (
          nama.includes((ref.nama_mapel || '').toLowerCase()) || 
          (ref.nama_mapel || '').toLowerCase().includes(nama)
        )
      );
    }
    
    // 4. Semantic match by category fallbacks (Religion, Arts, Mulok)
    if (!match) {
      const isReligion = nama.startsWith('pendidikan agama') || nama.includes('agama');
      const isSeniOrPrakarya = nama.includes('seni ') || nama.includes('seni') || nama.includes('prakarya');
      const isMulok = ['sunda', 'jawa', 'bali', 'madura'].some(lang => nama.includes(lang));
      
      if (isReligion) {
        match = standardReferencesData.find(ref => ref.tingkat === tingkat && (ref.kode_mapel === 'PAI' || (ref.nama_mapel || '').toLowerCase().includes('agama')));
      } else if (isSeniOrPrakarya) {
        match = standardReferencesData.find(ref => ref.tingkat === tingkat && (ref.kode_mapel === 'SENI' || (ref.nama_mapel || '').toLowerCase().includes('seni')));
      } else if (isMulok) {
        match = standardReferencesData.find(ref => ref.tingkat === tingkat && ref.kode_mapel === 'MULOK');
      }
    }
    
    // 5. Match by kejuruan rules (SMK/MAK)
    if (!match && isSmkOrMak) {
      const isKejuruan = kode.includes('PKL') || kode.includes('PKK') || kode.includes('DAS-') || nama.includes('praktik kerja') || nama.includes('kreatif') || nama.includes('dasar-dasar');
      if (isKejuruan) {
        if (tingkat === 10) {
          match = standardReferencesData.find(ref => ref.tingkat === tingkat && ref.kode_mapel === 'DASAR-KEJURUAN');
        } else {
          if (kode.includes('PKL') || nama.includes('praktik kerja')) {
            match = standardReferencesData.find(ref => ref.tingkat === tingkat && ref.kode_mapel === 'PKL');
          } else if (kode.includes('PKK') || nama.includes('kreatif')) {
            match = standardReferencesData.find(ref => ref.tingkat === tingkat && ref.kode_mapel === 'PKK');
          } else {
            match = standardReferencesData.find(ref => ref.tingkat === tingkat && ref.kode_mapel === 'KK');
          }
        }
      }
    }
    
    if (match) {
      return match.jp_per_minggu;
    }
  }
  
  if (nama.includes('agama') || kode.includes('PAI') || kode.includes('AGAMA')) {
    if (tingkat === 10 || tingkat === 11) return 3;
    if (tingkat === 12) return 2;
  }
  if (nama.includes('bahasa indonesia') || kode.includes('IND')) {
    if (tingkat === 10) return 4;
    if (tingkat === 11) return 3;
    if (tingkat === 12) return 2;
  }
  if (nama.includes('matematika') || kode.includes('MAT') || kode.includes('MTK')) {
    if (tingkat === 10) return 4;
    if (tingkat === 11) return 3;
    if (tingkat === 12) return 2;
  }
  
  return 2;
};

export const isMapelBelongsToOtherJurusan = (
  s: Mapel,
  isSmkOrMak: boolean,
  jurusansData: any[],
  selectedJurusanId: string
): boolean => {
  if (!isSmkOrMak) return false;
  
  const kode = (s.kode_mapel || '').toUpperCase();
  const nama = (s.nama_mapel || '').toLowerCase();
  
  const otherJurusans = jurusansData?.filter(j => j.id !== selectedJurusanId) || [];
  
  return otherJurusans.some(j => {
    const jKode = (j.kode || '').toUpperCase();
    const jSingkatan = (j.singkatan || '').toUpperCase();
    const jNama = (j.nama || '').toLowerCase();
    
    const hasOtherKode = jKode && (kode === jKode || kode.includes(`-${jKode}`) || kode.includes(`KK-${jKode}`));
    const hasOtherSingkatan = jSingkatan && (kode === jSingkatan || kode.includes(`-${jSingkatan}`) || kode.includes(`KK-${jSingkatan}`));
    const hasOtherNama = jNama && nama.includes(jNama);
    
    return hasOtherKode || hasOtherSingkatan || hasOtherNama;
  });
};

export const isMapelRelevantForTingkat = (
  s: Mapel,
  tingkat: number,
  isSmkOrMak: boolean,
  isMapelBelongsToOtherJurusanFn: (s: Mapel) => boolean
): boolean => {
  if (isMapelBelongsToOtherJurusanFn(s)) return false;
  
  if (s.tingkat !== null && s.tingkat !== undefined) {
    return s.tingkat === tingkat;
  }
  
  const kode = (s.kode_mapel || '').toUpperCase();
  const nama = (s.nama_mapel || '').toLowerCase();
  
  const isDasar = kode.includes('DAS-') || nama.includes('dasar-dasar') || nama.includes('dasar dasar');
  const isPkl = kode.includes('PKL') || nama.includes('praktik kerja lapangan') || nama.includes('praktek kerja lapangan') || nama.includes('pkl');
  const isPkk = kode.includes('PKK') || nama.includes('projek kreatif') || nama.includes('project kreatif') || nama.includes('pkk');
  const isKoding = nama.includes('koding') || nama.includes('coding') || nama.includes('pemrograman dasar') || nama.includes('programming');
  const isMulok = kode.startsWith('M-') || 
                   nama.includes('bahasa sunda') || 
                   nama.includes('bahasa jawa') || 
                   nama.includes('bahasa bali') || 
                   nama.includes('bahasa madura') || 
                   nama.includes('muatan lokal') || 
                   nama.includes('plh') || 
                   nama.includes('kesenian daerah') ||
                   nama.includes('kepariwisataan') ||
                   nama.includes('sunda');
  
  const isKk = kode === 'KK' || kode.startsWith('KK-') || nama.includes('konsentrasi keahlian');
  
  if (isSmkOrMak) {
    if (tingkat === 10) {
      if (isPkl || isPkk || isKk) return false;
      const kejuruanSuffixes = ['-RPL', '-TKJ', '-AKL', '-MPLB', '-DKV', '-TBSM', '-TKR', '-TP', '-PH', '-KL', '-TB', '-TAV', '-TOI'];
      const isProduktifLanjut = kejuruanSuffixes.some(suffix => kode.includes(suffix)) && !isDasar && !isPkl && !isPkk && !isKoding;
      if (isProduktifLanjut) return false;
    } else if (tingkat === 11) {
      if (isDasar || isPkl || isKoding || isMulok) return false;
    } else {
      if (isDasar || isKoding || isMulok) return false;
    }
  } else {
    // For non-SMK (SD, SMP, SMA), hide vocational elements but keep everything else (like Mulok)
    if (isPkl || isPkk || isKk || isDasar) return false;
  }
  
  return true;
};

export const getJpValueForSemester = (mapelName: string, mapelKode: string, tingkat: number, semesterNum: 1 | 2, baseJp: number): string => {
  const nama = mapelName.toLowerCase();
  const kode = (mapelKode || '').toUpperCase();
  
  if (tingkat === 12 && (nama.includes('praktik kerja lapangan') || nama.includes('praktek kerja lapangan') || kode.includes('PKL'))) {
    return semesterNum === 1 ? `${baseJp}` : '-';
  }
  
  if (tingkat === 12 && (nama.includes('konsentrasi keahlian') || kode === 'KK' || kode.startsWith('KK-'))) {
    return semesterNum === 2 ? `${baseJp}` : '-';
  }
  
  if (tingkat === 12 && (nama.includes('projek kreatif') || nama.includes('project kreatif') || kode.includes('PKK'))) {
    return semesterNum === 2 ? `${baseJp}` : '-';
  }
  
  if (tingkat === 12 && (nama.includes('pilihan') || kode.includes('PILIHAN') || kode.includes('MAPEL-PILIHAN'))) {
    return semesterNum === 2 ? `${baseJp}` : '-';
  }
  
  return `${baseJp}`;
};

export const getKelompokTotal = (kelompokList: StrukturPrintRow[], tingkat: number, semesterNum: 1 | 2) => {
  let sum = 0;
  kelompokList.forEach(m => {
    const baseJp = m.jp[tingkat] || 0;
    if (baseJp === 0) return;
    const jpVal = getJpValueForSemester(m.nama, m.kode, tingkat, semesterNum, baseJp);
    if (jpVal !== '-') {
      sum += Number(jpVal);
    }
  });
  return sum > 0 ? sum : 0;
};

interface PrintParams {
  tenantInfo: any;
  selectedTingkat: number;
  selectedTahunNama: string;
  selectedJurusan: any;
  mappingData: StrukturKurikulum[];
  setIsPrinting: (val: boolean) => void;
}

export const performStrukturPrint = async ({
  tenantInfo,
  selectedTingkat,
  selectedTahunNama,
  selectedJurusan,
  mappingData,
  setIsPrinting
}: PrintParams) => {
  setIsPrinting(true);
  const printWindow = window.open('about:blank', '_blank');

  try {
    let sekolah: Sekolah | null = null;
    try { sekolah = await sekolahApi.getProfile(); } catch(e) {}

    let logoDaerahBase64: string | null = null;
    let logoSekolahBase64: string | null = null;
    const leftLogoUrl = tenantInfo?.logo_daerah_url || (sekolah as unknown as Record<string, unknown> | null)?.logo_daerah_url as string | undefined;
    const rightLogoUrl = tenantInfo?.logo_url || sekolah?.logo_url;

    if (leftLogoUrl) {
      try { logoDaerahBase64 = await getBase64ImageFromUrl(leftLogoUrl); } catch(e) {}
    }
    if (rightLogoUrl) {
      try { logoSekolahBase64 = await getBase64ImageFromUrl(rightLogoUrl); } catch(e) {}
    }

    let principalName = 'Kepala Sekolah';
    let principalNip = '';
    try {
      const strukturRes = await getStrukturList({ is_active: true });
      const kepalaRaw = strukturRes.data?.find((s) => {
        const item = s as unknown as StrukturOrganisasiItem;
        return item.jabatan?.nama_jabatan?.toLowerCase().includes('kepala sekolah');
      });
      if (kepalaRaw) {
        const kepala = kepalaRaw as unknown as StrukturOrganisasiItem;
        principalName = kepala.nama_lengkap || '';
        principalNip = kepala.nip || '';
      }
    } catch(e) {}

    const groups = {
      umum: [] as any[],
      kejuruan: [] as any[],
      mulok: [] as any[],
      pilihan: [] as any[]
    };
    
    const mapelMap = new Map<string, {
      id: string;
      nama: string;
      kode: string;
      jp: Record<number, number>;
    }>();
    
    mappingData.forEach((item: StrukturKurikulum) => {
      const mapelId = item.mapel_id;
      const tingkat = item.tingkat;
      const jp = item.jp_per_minggu;
      
      if (!mapelMap.has(mapelId)) {
        mapelMap.set(mapelId, {
          id: mapelId,
          nama: item.Mapel?.nama_mapel || '',
          kode: item.Mapel?.kode_mapel || '',
          jp: {}
        });
      }
      mapelMap.get(mapelId)!.jp[tingkat] = jp;
    });

    mapelMap.forEach((m) => {
      const g = detectKelompokForMapel(m.kode, m.nama);
      if (g === 'MATA PELAJARAN KEJURUAN') {
        groups.kejuruan.push(m);
      } else if (g === 'MUATAN LOKAL') {
        groups.mulok.push(m);
      } else if (g === 'MATA PELAJARAN PILIHAN') {
        groups.pilihan.push(m);
      } else {
        groups.umum.push(m);
      }
    });

    const printRows = {
      umum: groups.umum.map(m => ({ ...m, kelompok: 'MATA PELAJARAN UMUM' })),
      kejuruan: groups.kejuruan.map(m => ({ ...m, kelompok: 'MATA PELAJARAN KEJURUAN' })),
      mulok: groups.mulok.map(m => ({ ...m, kelompok: 'MUATAN LOKAL' })),
      pilihan: groups.pilihan.map(m => ({ ...m, kelompok: 'MATA PELAJARAN PILIHAN' }))
    };

    const city = (() => {
      if (!tenantInfo?.address) return 'Jakarta';
      const addr = tenantInfo.address.toLowerCase();
      if (addr.includes('kediri')) return 'Kediri';
      if (addr.includes('cimahi')) return 'Cimahi';
      if (addr.includes('plered')) return 'Plered';
      if (addr.includes('jakarta')) return 'Jakarta';
      
      const parts = tenantInfo.address.split(',');
      if (parts.length > 1) {
        return parts[parts.length - 2].trim();
      }
      return 'Jakarta';
    })();

    const blob = renderStrukturKurikulumPdf({
      tenantInfo,
      sekolah,
      logoDaerahBase64,
      logoSekolahBase64,
      printRows,
      selectedTahunNama,
      selectedJurusan,
      city,
      principalName,
      principalNip,
      getJpValueForSemester,
      getKelompokTotal
    });

    const blobUrl = URL.createObjectURL(blob);
    if (printWindow && !printWindow.closed) {
      printWindow.location.href = blobUrl;
      setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
    } else {
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `struktur-kurikulum-${selectedTahunNama || 'tp'}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
    }
  } catch (err) {
    printWindow?.close();
    console.error('Gagal membuat PDF struktur kurikulum:', err);
    toast.error('Gagal membuat cetakan PDF struktur kurikulum.');
  } finally {
    setIsPrinting(false);
  }
};

export const getSubjectSortRank = (item: any) => {
  const code = (item.Mapel?.kode_mapel || item.kode_mapel || '').toUpperCase();
  const cleanCode = code.split('-')[0];
  const name = (item.Mapel?.nama_mapel || item.nama_mapel || '').toLowerCase();
  const kelompok = (item.kelompok || '').toUpperCase();
  
  if (['PAI', 'PAKB', 'PAKatB', 'PAHB', 'PABB', 'PAKhB', 'PAIBP'].includes(cleanCode) || name.includes('agama')) return 1;
  if (cleanCode === 'PP' || name.includes('pancasila')) return 2;
  if (cleanCode === 'IND' || name.includes('bahasa indonesia')) return 3;
  if (cleanCode === 'PJOK' || name.includes('jasmani') || name.includes('pjok')) return 4;
  if (cleanCode === 'SEJ' || name.includes('sejarah')) return 5;
  if (cleanCode === 'SENI' || name.includes('seni') || name.includes('prakarya')) return 6;
  if (cleanCode === 'MTK' || name.includes('matematika')) return 7;
  if (['IPA', 'IPAS', 'FIS', 'KIM', 'BIO'].includes(cleanCode) || name.includes('projek ipas') || name.includes('ilmu pengetahuan alam')) return 8;
  if (['IPS', 'GEO', 'SOS', 'EKO', 'ANTRO'].includes(cleanCode) || name.includes('ilmu pengetahuan sosial')) return 9;
  if (cleanCode === 'ING' || name.includes('bahasa inggris')) return 10;
  if (cleanCode === 'INF' || name.includes('informatika')) return 11;
  
  if (kelompok === 'MATA PELAJARAN KEJURUAN' || ['DASAR-KEJURUAN', 'KK', 'PKK', 'PKL'].includes(cleanCode) || name.includes('konsentrasi') || name.includes('praktik kerja') || name.includes('dasar-dasar')) return 12;
  if (kelompok === 'MATA PELAJARAN PILIHAN' || cleanCode === 'KODING-AI' || cleanCode === 'PILIHAN' || name.includes('pilihan')) return 13;
  if (kelompok === 'MUATAN LOKAL' || cleanCode === 'MULOK' || name.includes('muatan lokal')) return 14;
  
  return 15;
};

export const checkMapelHasStandard = (
  s: any,
  selectedTingkat: number,
  standardReferencesData: any[],
  isSmkOrMak: boolean,
  group: string
): boolean => {
  if (!standardReferencesData || !Array.isArray(standardReferencesData) || standardReferencesData.length === 0) {
    return true;
  }
  
  const code = (s.kode_mapel || '').toUpperCase();
  const cleanCode = code.split('-')[0];
  const name = (s.nama_mapel || '').toLowerCase();
  
  return standardReferencesData.some((ref: any) => {
    if (ref.tingkat !== selectedTingkat) return false;
    
    if ((ref.kode_mapel || '').toUpperCase() === code) return true;
    if ((ref.kode_mapel || '').toUpperCase() === cleanCode) return true;
    if (name.includes(ref.nama_mapel.toLowerCase()) || ref.nama_mapel.toLowerCase().includes(name)) return true;
    
    const isReligion = name.startsWith('pendidikan agama') || name.includes('agama');
    const isSeniOrPrakarya = name.includes('seni ') || name.includes('seni') || name.includes('prakarya');
    const isMulok = (group === 'MUATAN LOKAL') || ['sunda', 'jawa', 'bali', 'madura'].some(lang => name.includes(lang));
    
    if (isReligion && (ref.kode_mapel === 'PAI' || (ref.nama_mapel || '').toLowerCase().includes('agama'))) return true;
    if (isSeniOrPrakarya && (ref.kode_mapel === 'SENI' || (ref.nama_mapel || '').toLowerCase().includes('seni'))) return true;
    if (isMulok && ref.kode_mapel === 'MULOK') return true;
    
    if (isSmkOrMak) {
      const isKejuruanMapel = code.includes('PKL') || code.includes('PKK') || code.includes('DAS-') || name.includes('praktik kerja') || name.includes('kreatif') || name.includes('dasar-dasar');
      if (isKejuruanMapel) {
        if (selectedTingkat === 10 && ref.kode_mapel === 'DASAR-KEJURUAN') return true;
        if (selectedTingkat > 10) {
          if ((code.includes('PKL') || name.includes('praktik kerja')) && ref.kode_mapel === 'PKL') return true;
          if ((code.includes('PKK') || name.includes('kreatif')) && ref.kode_mapel === 'PKK') return true;
          if (!code.includes('PKL') && !name.includes('praktik kerja') && !code.includes('PKK') && !name.includes('kreatif') && ref.kode_mapel === 'KK') return true;
        }
      }
    }
    
    return false;
  });
};
