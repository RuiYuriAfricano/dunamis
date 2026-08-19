import { fileURLToPath } from "node:url";
import * as path from "node:path";
import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcrypt";

process.loadEnvFile(path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../.env"));

const prisma = new PrismaClient();

const TRANSPORT_STOPS = ["Nova Vida", "Viana", "Cidade", "Terceira Igreja Baptista"];

async function main() {
  for (const name of TRANSPORT_STOPS) {
    await prisma.transportStop.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  const adminEmail = process.env.SEED_ADMIN_EMAIL;
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;
  const adminName = process.env.SEED_ADMIN_NAME ?? "Administrador DUNAMIS";

  if (!adminEmail || !adminPassword) {
    throw new Error(
      "SEED_ADMIN_EMAIL e SEED_ADMIN_PASSWORD têm de estar definidas no .env para criar o utilizador administrador.",
    );
  }

  const passwordHash = await bcrypt.hash(adminPassword, 12);

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      name: adminName,
      email: adminEmail,
      passwordHash,
      role: "ADMIN",
    },
  });

  console.log("Seed concluído: paragens de transporte + utilizador administrador.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
