import { NextResponse } from "next/server";
import { marketUpdates } from "@/data/marketUpdates";
import { getSouthBayMacro } from "@/lib/providers/fred";

export async function GET() {
  const macro = await getSouthBayMacro(process.env.FRED_API_KEY);

  return NextResponse.json({
    asOfDate: new Date().toISOString().slice(0, 10),
    updates: marketUpdates,
    macro: macro
      ? {
          mortgage30y: macro.mortgage30y,
          fedFunds: macro.fedFunds,
          hpiSanJose: macro.hpiSanJose
        }
      : null
  });
}
