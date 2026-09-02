export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { runDueSchedules } from "@/lib/run-schedules";

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return true;
  const header = request.headers.get("authorization") ?? "";
  return header === `Bearer ${secret}`;
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runDueSchedules();
    return Response.json({ status: "ok", ...result });
  } catch (error) {
    console.error("Error:", error);
    return Response.json({ error: "Failed to run schedules" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return POST(request);
}
