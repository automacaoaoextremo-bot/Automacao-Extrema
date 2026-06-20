import { NextResponse } from "next/server";
import { BAZAR_CLIENT_EMAIL, signSession } from "@/lib/bazar-sementinha";

export async function POST(request: Request) {
  const body = await request.json();
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");
  const expectedPassword = process.env.BAZAR_SEMENTINHA_PASSWORD || "Sementinha@2026";

  if (email !== BAZAR_CLIENT_EMAIL || password !== expectedPassword) {
    return NextResponse.json({ error: "E-mail ou senha inválidos." }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set("bazar_sementinha_session", signSession(email), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set("bazar_sementinha_session", "", { path: "/", maxAge: 0 });
  return response;
}

export async function GET(request: Request) {
  const response = NextResponse.redirect(new URL("/bazar-sementinha/login", request.url));
  response.cookies.set("bazar_sementinha_session", "", { path: "/", maxAge: 0 });
  return response;
}
