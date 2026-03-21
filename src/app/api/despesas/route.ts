import { NextRequest, NextResponse } from "next/server";
import { prisma, serializeDecimal } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { createExpenseSchema } from "@/lib/types";

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

  const expenses = await prisma.expense.findMany({
    where: { groupId, date: { gte: startDate, lt: endDate } },
    include: { items: true, createdBy: { select: { id: true, name: true } } },
    orderBy: { date: "desc" },
  });

  return NextResponse.json({ expenses: serializeDecimal(expenses) });
}

export async function POST(req: NextRequest) {
  const session = await getSession(req.headers);
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const body = await req.json();
  const parsed = createExpenseSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos", details: parsed.error.flatten() }, { status: 400 });
  }

  const { description, date, items, groupId, receiptKey } = parsed.data;

  // Verify user is member of the group
  const membership = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId: session.user.id } },
  });
  if (!membership) {
    return NextResponse.json({ error: "Você não é membro deste grupo" }, { status: 403 });
  }

  try {
    const expense = await prisma.expense.create({
      data: {
        description,
        date: new Date(date),
        receiptUrl: receiptKey || null,
        createdById: session.user.id,
        groupId,
        items: {
          create: items.map((item) => ({
            description: item.description,
            value: item.value,
          })),
        },
      },
      include: { items: true },
    });

    return NextResponse.json({ expense: serializeDecimal(expense) }, { status: 201 });
  } catch (err) {
    console.error("Erro ao salvar despesa:", err);
    return NextResponse.json({ error: "Erro ao salvar despesa" }, { status: 500 });
  }
}
