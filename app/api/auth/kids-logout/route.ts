import { NextResponse } from "next/server";
import { clearDevChildCookie } from "@/lib/dev-cookies";

export async function POST() {
  return clearDevChildCookie(NextResponse.json({ ok: true }));
}
