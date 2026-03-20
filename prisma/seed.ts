import { PrismaClient } from "@prisma/client";
import { auth } from "../src/lib/auth";

const prisma = new PrismaClient();

async function main() {
  const user = await auth.api.signUpEmail({
    body: { name: "Prando", email: "prando27@gmail.com", password: "12345678" },
  });

  if (!user?.user?.id) {
    throw new Error("Failed to create user");
  }

  const group = await prisma.group.create({
    data: {
      name: "Despesas da Mãe",
      inviteCode: "TEST01",
      members: {
        create: { userId: user.user.id, role: "admin" },
      },
    },
  });

  console.log(`Seed completed:`);
  console.log(`  - User: prando27@gmail.com (senha: 12345678)`);
  console.log(`  - Grupo: "${group.name}" (convite: ${group.inviteCode})`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
