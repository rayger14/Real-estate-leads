import { NextRequest, NextResponse } from "next/server";

const ROLE_COOKIE = "sb_role";
const USER_COOKIE = "sb_user";

export function isInternalAuthorized(request: NextRequest): boolean {
  const role = request.cookies.get(ROLE_COOKIE)?.value;
  return role === "internal";
}

export function internalUnauthorizedResponse() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export function setInternalSession(response: NextResponse, username: string) {
  response.cookies.set(ROLE_COOKIE, "internal", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12
  });

  response.cookies.set(USER_COOKIE, username, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12
  });
}

export function clearInternalSession(response: NextResponse) {
  response.cookies.set(ROLE_COOKIE, "", { path: "/", maxAge: 0 });
  response.cookies.set(USER_COOKIE, "", { path: "/", maxAge: 0 });
}

export function getSessionUser(request: NextRequest): string | null {
  return request.cookies.get(USER_COOKIE)?.value ?? null;
}
