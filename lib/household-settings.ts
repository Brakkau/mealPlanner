import { prisma } from "@/lib/db";

function asStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((entry): entry is string => typeof entry === "string")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export async function getDislikes(): Promise<string[]> {
  const row = await prisma.householdSettings
    .findUnique({ where: { id: "default" } })
    .catch(() => null);
  return asStringList(row?.dislikes);
}

export async function saveDislikes(dislikes: string[]): Promise<string[]> {
  const cleaned = asStringList(dislikes);
  const row = await prisma.householdSettings.upsert({
    where: { id: "default" },
    update: { dislikes: cleaned },
    create: { id: "default", dislikes: cleaned }
  });
  return asStringList(row.dislikes);
}
