import { proxyOdooImage } from "@/lib/image-proxy";

export async function GET() {
  return proxyOdooImage("/empresa/logo", 86400);
}
