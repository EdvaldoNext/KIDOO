import { NextResponse } from "next/server";
import { isSecureRequest, keepFamilyDevice } from "@/lib/dev-cookies";
import { safeNextPath } from "@/lib/safe-next-path";

export async function POST(request: Request) {
  let next = "/entrar";
  try {
    const form = await request.formData();
    next = safeNextPath(form.get("next"), next);
  } catch {
    next = safeNextPath(new URL(request.url).searchParams.get("next"), next);
  }

  return keepFamilyDevice(
    NextResponse.redirect(new URL(next, request.url), 303),
    isSecureRequest(request),
  );
}
