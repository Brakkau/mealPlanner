import { NextResponse } from "next/server";
import { getMonthlyLlmUsage } from "@/lib/llm-usage";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const usage = await getMonthlyLlmUsage();
  return NextResponse.json(usage);
}
