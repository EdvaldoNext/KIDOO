import { NextResponse } from "next/server";
import { clearDeviceCookies, isSecureRequest } from "@/lib/dev-cookies";

export async function POST(request: Request) {
  return clearDeviceCookies(NextResponse.json({ ok: true }), isSecureRequest(request));
}
