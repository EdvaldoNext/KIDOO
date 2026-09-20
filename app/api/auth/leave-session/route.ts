import { NextResponse } from "next/server";
import { isSecureRequest, keepFamilyDevice } from "@/lib/dev-cookies";

export async function POST(request: Request) {
  return keepFamilyDevice(NextResponse.json({ ok: true }), isSecureRequest(request));
}
