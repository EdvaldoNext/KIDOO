import { NextResponse } from "next/server";
import { clearDeviceCookies } from "@/lib/dev-cookies";

export async function POST() {
  return clearDeviceCookies(NextResponse.json({ ok: true }));
}
