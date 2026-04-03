import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, isInternalAuthorized } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const authorized = isInternalAuthorized(request);
  return NextResponse.json({
    authorized,
    user: authorized ? getSessionUser(request) : null
  });
}
