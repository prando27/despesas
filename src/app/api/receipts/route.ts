import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getReceiptBuffer } from "@/lib/storage";

export async function GET(req: NextRequest) {
  const session = await getSession(req.headers);
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const key = req.nextUrl.searchParams.get("key");
  if (!key) return NextResponse.json({ error: "key obrigatória" }, { status: 400 });

  try {
    const { buffer, contentType } = await getReceiptBuffer(key);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    return NextResponse.json({ error: "Cupom não encontrado" }, { status: 404 });
  }
}
