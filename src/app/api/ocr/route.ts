import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getReceiptExtractor } from "@/lib/receipt-extractor";
import { ocrSchema } from "@/lib/types";

export async function POST(req: NextRequest) {
  const session = await getSession(req.headers);
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const body = await req.json();
  const parsed = ocrSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos", details: parsed.error.flatten() }, { status: 400 });
  }

  const { image, mediaType } = parsed.data;
  const result = await getReceiptExtractor().extract(image, mediaType);
  return NextResponse.json(result);
}
