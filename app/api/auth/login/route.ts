import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { setInternalSession } from "@/lib/auth";

const loginSchema = z.object({
  username: z.string().min(2),
  password: z.string().min(4)
});

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = loginSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const expectedPassword = process.env.INTERNAL_DASHBOARD_PASSWORD;
  if (!expectedPassword) {
    return NextResponse.json({ error: "INTERNAL_DASHBOARD_PASSWORD is not set" }, { status: 500 });
  }

  if (parsed.data.password !== expectedPassword) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  setInternalSession(response, parsed.data.username);
  return response;
}
