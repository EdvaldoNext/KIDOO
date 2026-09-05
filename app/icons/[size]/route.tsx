import { kidooIconResponse } from "@/lib/pwa-icon";

const SIZES = new Set([192, 512]);

export async function GET(_request: Request, { params }: { params: Promise<{ size: string }> }) {
  const size = Number((await params).size);
  if (!SIZES.has(size)) {
    return new Response("Not found", { status: 404 });
  }

  return kidooIconResponse(size, size === 512 ? 64 : 24);
}
