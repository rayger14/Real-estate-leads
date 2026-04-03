import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { appendFunnelEvent } from "@/lib/funnelEventStore";

const eventSchema = z.object({
  eventName: z.string().min(1),
  step: z.string().min(1),
  address: z.string().optional(),
  city: z.string().optional(),
  metadata: z.record(z.union([z.string(), z.number(), z.boolean(), z.null()])).optional()
});

function makeId(seed: string): string {
  let hash = 5381;
  for (let i = 0; i < seed.length; i += 1) hash = (hash * 33) ^ seed.charCodeAt(i);
  return `evt-${Math.abs(hash >>> 0)}`;
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = eventSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid event payload" }, { status: 400 });
  }

  const timestamp = new Date().toISOString();
  const seed = `${parsed.data.eventName}|${parsed.data.step}|${parsed.data.address ?? ""}|${timestamp}`;
  await appendFunnelEvent({
    id: makeId(seed),
    timestamp,
    eventName: parsed.data.eventName,
    step: parsed.data.step,
    address: parsed.data.address,
    city: parsed.data.city,
    metadata: parsed.data.metadata
  });

  return NextResponse.json({ ok: true });
}
