export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { getDislikes, saveDislikes } from "@/lib/household-settings";

export async function GET() {
  try {
    const dislikes = await getDislikes();
    return Response.json({ dislikes });
  } catch (error) {
    console.error("Error:", error);
    return Response.json({ error: "Failed to load settings" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = (await request.json()) as { dislikes?: unknown };
    const dislikes = await saveDislikes(Array.isArray(body.dislikes) ? body.dislikes as string[] : []);
    return Response.json({ dislikes });
  } catch (error) {
    console.error("Error:", error);
    return Response.json({ error: "Failed to save settings" }, { status: 500 });
  }
}
