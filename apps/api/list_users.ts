import prisma from './src/lib/prisma';

async function main() {
  const users = await prisma.user.findMany();
  console.log("Users:");
  console.log(users.map(u => `${u.email} | ${(u as any).role}`).join('\n'));
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
