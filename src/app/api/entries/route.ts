import { NextRequest, NextResponse } from "next/server";
import { prisma, serializeDecimal } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { createEntrySchema } from "@/lib/types";
import { uploadReceipt } from "@/lib/storage";

export async function GET(req: NextRequest) {
  const session = await getSession(req.headers);
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const month = parseInt(searchParams.get("month") || String(new Date().getMonth() + 1));
  const year = parseInt(searchParams.get("year") || String(new Date().getFullYear()));
  const groupId = searchParams.get("groupId");

  if (!groupId) {
    return NextResponse.json({ error: "groupId obrigatório" }, { status: 400 });
  }

  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 1);

  const entries = await prisma.entry.findMany({
    where: { groupId, date: { gte: startDate, lt: endDate } },
    include: {
      items: true,
      createdBy: { select: { id: true, name: true } },
      toUser: { select: { id: true, name: true } },
    },
    orderBy: { date: "desc" },
  });

  return NextResponse.json({ entries: serializeDecimal(entries) });
}

export async function POST(req: NextRequest) {
  const session = await getSession(req.headers);
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const body = await req.json();
  const parsed = createEntrySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos", details: parsed.error.flatten() }, { status: 400 });
  }

  const { type, description, date, items, groupId, toUserId, discount } = parsed.data;

  const membership = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId: session.user.id } },
  });
  if (!membership) {
    return NextResponse.json({ error: "Você não é membro deste grupo" }, { status: 403 });
  }

  if (type === "TRANSFER") {
    if (!toUserId) {
      return NextResponse.json({ error: "Transferência exige destinatário" }, { status: 400 });
    }

    const recipient = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId: toUserId } },
      select: { countAsId: true },
    });
    if (!recipient) {
      return NextResponse.json({ error: "Destinatário não é membro deste grupo" }, { status: 400 });
    }
    if (recipient.countAsId) {
      return NextResponse.json(
        { error: "Não é possível transferir para membros vinculados" },
        { status: 400 },
      );
    }

    const senderEffective = membership.countAsId || session.user.id;
    const recipientEffective = toUserId;
    if (senderEffective === recipientEffective) {
      return NextResponse.json(
        { error: "Não é possível transferir para si mesmo" },
        { status: 400 },
      );
    }
  }

  let receiptUrl: string | null = parsed.data.receiptKey || null;
  if (type === "EXPENSE" && !receiptUrl && parsed.data.receiptImage && parsed.data.receiptMediaType) {
    try {
      receiptUrl = await uploadReceipt(session.user.id, parsed.data.receiptImage, parsed.data.receiptMediaType);
    } catch (err) {
      console.error("Erro ao fazer upload do cupom:", err);
    }
  }

  try {
    const entry = await prisma.entry.create({
      data: {
        type,
        description,
        date: new Date(date),
        receiptUrl: type === "EXPENSE" ? receiptUrl : null,
        createdById: session.user.id,
        toUserId: type === "TRANSFER" ? toUserId : null,
        groupId,
        discount: type === "EXPENSE" ? discount : 0,
        items: {
          create: items.map((item) => ({
            description: item.description,
            value: item.value,
          })),
        },
      },
      include: {
        items: true,
        createdBy: { select: { id: true, name: true } },
        toUser: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ entry: serializeDecimal(entry) }, { status: 201 });
  } catch (err) {
    console.error("Erro ao salvar lançamento:", err);
    return NextResponse.json({ error: "Erro ao salvar lançamento" }, { status: 500 });
  }
}
