import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { uploadReceipt } from "@/lib/storage";

export async function POST(req: NextRequest) {
  const session = await getSession(req.headers);
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  try {
    const body = await req.json();
    const { image, mediaType } = body;

    if (!image || !mediaType) {
      return NextResponse.json({ error: "image e mediaType obrigatórios" }, { status: 400 });
    }

    const key = await uploadReceipt(session.user.id, image, mediaType);
    return NextResponse.json({ key });
  } catch (err) {
    console.error("Erro no upload:", err);
    return NextResponse.json({ error: "Erro ao fazer upload" }, { status: 500 });
  }
}
