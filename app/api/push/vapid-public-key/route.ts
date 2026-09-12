import { NextResponse } from "next/server";
import { getVapidPublicKey } from "@/lib/push/config";

export function GET() {
  const publicKey = getVapidPublicKey();
  if (!publicKey) {
    return NextResponse.json({ error: "Push não configurado no servidor." }, { status: 503 });
  }

  return NextResponse.json({ publicKey });
}
