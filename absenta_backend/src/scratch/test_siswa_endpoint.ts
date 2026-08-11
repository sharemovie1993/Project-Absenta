import { prisma } from '../utils/prisma';

async function main() {
  console.log('\n================ USER ACCOUNT FOR AAJ ULIL AJMI ================');

  const userAaj = await prisma.user.findUnique({
    where: { id: 'dc02c6fc-43da-45e6-b5d3-5993ad2327fa' },
  });

  console.log('User Record for AAJ ULIL AJMI:');
  console.log('  ID       :', userAaj?.id);
  console.log('  Email    :', userAaj?.email);
  console.log('  Full Name:', userAaj?.full_name);
  console.log('=================================================================\n');
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
