import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import * as path from "node:path";
import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcrypt";

// Only local dev has a real .env file to load — in production (Render, etc.)
// env vars are injected directly into process.env by the platform.
const envPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../.env");
if (existsSync(envPath)) {
  process.loadEnvFile(envPath);
}

const prisma = new PrismaClient();

const TRANSPORT_STOPS = [
  "Nova Vida",
  "Zango",
  "Cidade",
  "Terceira Igreja Baptista",
  "Dangerreux",
  "Kilamba/11",
];

// One-time renames for stops that already exist under an old name — applied
// before the upsert below so a rerun never creates a duplicate under the new name.
const TRANSPORT_STOP_RENAMES: [string, string][] = [
  ["Viana", "Zango"],
  ["Kilamba/1", "Kilamba/11"],
  ["Dangerreu", "Dangerreux"],
];

async function main() {
  for (const [oldName, newName] of TRANSPORT_STOP_RENAMES) {
    const oldStop = await prisma.transportStop.findUnique({ where: { name: oldName } });
    const newStop = await prisma.transportStop.findUnique({ where: { name: newName } });
    if (oldStop && !newStop) {
      await prisma.transportStop.update({ where: { id: oldStop.id }, data: { name: newName } });
    }
  }

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
