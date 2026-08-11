import { prisma } from '../utils/prisma';

async function main() {
  const siswa = await prisma.siswa.findFirst({
    where: {
      OR: [
        { nisn: '1122558890' },
        { nis: '1122558890' },
        { User: { email: { contains: '1122558890' } } }
      ]
    }
  });

  console.log('Found Siswa:', siswa?.id, siswa?.nama_siswa);

  if (siswa) {
    const updated = await prisma.siswa.update({
      where: { id: siswa.id },
      data: {
        agama: 'Islam',
        hobi: 'Membaca & Coding',
        cita_cita: 'Software Engineer / Programmer',
        is_osis: true,
        ekskul_1: 'Pramuka',
        ekskul_2: 'Futsal',
        tempat_lahir: 'Purwakarta',
        tanggal_lahir: new Date('2007-05-15'),
        tinggi_badan: 170,
        berat_badan: 60,
        alamat: 'Jl. Teladan No. 10',
      }
    });

    console.log('Updated Profile Data:', {
      nama: updated.nama_siswa,
      agama: updated.agama,
      hobi: updated.hobi,
      cita_cita: updated.cita_cita,
      ekskul_1: updated.ekskul_1,
      ekskul_2: updated.ekskul_2
    });
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
