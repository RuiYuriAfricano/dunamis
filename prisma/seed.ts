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
  "Cidade/Terceira Igreja Baptista",
  "Dangerreux",
  "Kilamba/11",
];

// Tipos de tenda apenas para orientar o participante sobre o que comprar —
// a inscrição não vende tendas, por isso não há preço associado.
const TENT_TYPES = [
  "Tenda 1-2 pessoas",
  "Tenda 3-4 pessoas",
  "Tenda 5-6 pessoas",
  "Tenda 8+ pessoas (família)",
];

const TEAM_ADMINS = [
  { name: "Rui Malemba", email: "rui.malemba@dunamis.ao" },
  { name: "Mário Giovani", email: "mario.giovani@dunamis.ao" },
  { name: "Adélia Cristina", email: "adelia.cristina@dunamis.ao" },
  { name: "Abrãao Marcos", email: "abraao.marcos@dunamis.ao" },
  { name: "Silas Chama", email: "silas.chama@dunamis.ao" },
  { name: "Marco", email: "marco@dunamis.ao" },
];

// One-time renames for stops that already exist under an old name — applied
// before the upsert below so a rerun never creates a duplicate under the new name.
const TRANSPORT_STOP_RENAMES: [string, string][] = [
  ["Viana", "Zango"],
  ["Kilamba/1", "Kilamba/11"],
  ["Dangerreu", "Dangerreux"],
];

// Stops that turned out to be the same physical meeting point — merged into
// one so participants aren't split across two rows for the same place
// (the Terceira Igreja Baptista is itself in Cidade). Reassigns any
// participant pointing at an old stop before deleting it, so nobody's pickup
// point silently becomes blank.
const TRANSPORT_STOP_MERGES: { into: string; from: string[] }[] = [
  { into: "Cidade/Terceira Igreja Baptista", from: ["Cidade", "Terceira Igreja Baptista"] },
];

async function main() {
  for (const [oldName, newName] of TRANSPORT_STOP_RENAMES) {
    const oldStop = await prisma.transportStop.findUnique({ where: { name: oldName } });
    const newStop = await prisma.transportStop.findUnique({ where: { name: newName } });
    if (oldStop && !newStop) {
      await prisma.transportStop.update({ where: { id: oldStop.id }, data: { name: newName } });
    }
  }

  for (const { into, from } of TRANSPORT_STOP_MERGES) {
    const target = await prisma.transportStop.upsert({
      where: { name: into },
      update: {},
      create: { name: into },
    });

    for (const oldName of from) {
      if (oldName === into) continue;
      const oldStop = await prisma.transportStop.findUnique({ where: { name: oldName } });
      if (!oldStop) continue;

      await prisma.participant.updateMany({
        where: { transportStopId: oldStop.id },
        data: { transportStopId: target.id },
      });
      await prisma.transportStop.delete({ where: { id: oldStop.id } });
    }
  }

  for (const name of TRANSPORT_STOPS) {
    await prisma.transportStop.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  for (const name of TENT_TYPES) {
    await prisma.tentType.upsert({
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

  const teamAdminPasswordHash = await bcrypt.hash("dunamis@2026", 12);
  for (const admin of TEAM_ADMINS) {
    await prisma.user.upsert({
      where: { email: admin.email },
      update: {},
      create: {
        name: admin.name,
        email: admin.email,
        passwordHash: teamAdminPasswordHash,
        role: "ADMIN",
      },
    });
  }

  console.log("Seed concluído: paragens de transporte + tipos de tenda + utilizadores administradores.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
