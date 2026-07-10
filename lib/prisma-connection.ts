/** True when Prisma cannot connect (e.g. Postgres not running in local dev). */
export function isPrismaConnectionError(error: unknown): boolean {
  if (error !== null && typeof error === "object" && "name" in error) {
    const name = (error as { name?: string }).name;
    if (name === "PrismaClientInitializationError") return true;
    if (name === "PrismaClientKnownRequestError") {
      const rec = error as unknown as { code?: string };
      const code = typeof rec.code === "string" ? rec.code : undefined;
      if (code === "P1001" || code === "P1017") return true;
    }
  }
  const msg = error instanceof Error ? error.message : String(error);
  return /can't reach database server|connection.*refused|connection.*timed out|P1001|P1017/i.test(
    msg
  );
}
