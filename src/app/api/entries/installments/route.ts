import { NextRequest, NextResponse } from "next/server";
import { prisma, serializeDecimal } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { createInstallmentsSchema } from "@/lib/types";
import { uploadReceipt } from "@/lib/storage";

function addMonthsClamped(base: Date, months: number): Date {
  const year = base.getFullYear();
  const month = base.getMonth() + months;
  const day = base.getDate();
  const targetYear = year + Math.floor(month / 12);
  const targetMonth = ((month % 12) + 12) % 12;
  const lastDayOfTarget = new Date(targetYear, targetMonth + 1, 0).getDate();
  const clampedDay = Math.min(day, lastDayOfTarget);
  return new Date(targetYear, targetMonth, clampedDay);
}

export async function POST(req: NextRequest) {
  const session = await getSession(req.headers);
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const body = await req.json();
  const parsed = createInstallmentsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos", details: parsed.error.flatten() }, { status: 400 });
  }

  const { description, startDate, groupId, total, months, receiptImage, receiptMediaType } = parsed.data;

  const membership = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId: session.user.id } },
  });
  if (!membership) {
    return NextResponse.json({ error: "Você não é membro deste grupo" }, { status: 403 });
  }

  let receiptUrl: string | null = null;
  if (receiptImage && receiptMediaType) {
    try {
      receiptUrl = await uploadReceipt(session.user.id, receiptImage, receiptMediaType);
    } catch (err) {
      console.error("Erro ao fazer upload do cupom:", err);
    }
  }

  const totalCents = Math.round(total * 100);
  const baseCents = Math.floor(totalCents / months);
  const remainderCents = totalCents - baseCents * months;

  // Parse YYYY-MM-DD as local date to avoid TZ shifts.
  const [y, m, d] = startDate.split("-").map((s) => parseInt(s, 10));
  const start = new Date(y, (m || 1) - 1, d || 1);

  const creates = Array.from({ length: months }).map((_, i) => {
    const valueCents = i === 0 ? baseCents + remainderCents : baseCents;
    const value = valueCents / 100;
    const date = addMonthsClamped(start, i);
    const fullDescription = `${description} (${i + 1}/${months})`;
    return prisma.entry.create({
      data: {
        type: "EXPENSE",
        description: fullDescription,
        date,
        receiptUrl,
        createdById: session.user.id,
        toUserId: null,
        groupId,
        discount: 0,
        items: {
          create: [{ description: fullDescription, value }],
        },
      },
      include: {
        items: true,
        createdBy: { select: { id: true, name: true } },
        toUser: { select: { id: true, name: true } },
      },
    });
  });

  try {
    const entries = await prisma.$transaction(creates);
    return NextResponse.json({ count: entries.length, entries: serializeDecimal(entries) }, { status: 201 });
  } catch (err) {
    console.error("Erro ao salvar parcelas:", err);
    return NextResponse.json({ error: "Erro ao salvar parcelas" }, { status: 500 });
  }
}
