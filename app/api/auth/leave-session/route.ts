import { NextResponse } from "next/server";
import { keepFamilyDevice } from "@/lib/dev-cookies";

export async function POST() {
  return keepFamilyDevice(NextResponse.json({ ok: true }));
}
