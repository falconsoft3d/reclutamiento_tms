import { parseId, parseToken, proxyOdooImage } from "@/lib/image-proxy";

export async function GET(_request: Request, ctx: RouteContext<"/api/entrevista/[token]/imagen/[preguntaId]">) {
  const { token, preguntaId } = await ctx.params;
  const valido = parseToken(token);
  const id = parseId(preguntaId);
  if (!valido || !id) return new Response("No encontrado", { status: 404 });
  return proxyOdooImage(`/entrevista/${valido}/imagen/${id}`);
}
