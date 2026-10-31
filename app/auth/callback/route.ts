import { NextResponse } from "next/server";

/**
 * Legacy endpoint from the old e-mail links. Password reset now uses
 * /redefinir-senha?token=..., so old links just land on the recovery screen.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  return NextResponse.redirect(new URL("/recuperar-senha", url.origin));
}
