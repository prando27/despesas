import { NextRequest, NextResponse } from "next/server";
import { prisma, serializeDecimal } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { updateExpenseSchema } from "@/lib/types";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession(req.headers);
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { id } = await params;

  const expense = await prisma.expense.findUnique({ where: { id }, select: { createdById: true, groupId: true } });
  if (!expense) return NextResponse.json({ error: "Despesa não encontrada" }, { status: 404 });

  // Allow delete if user is the creator OR if the creator is linked to the user via countAsId
  let canDelete = expense.createdById === session.user.id;
  if (!canDelete) {
    const creatorMember = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId: expense.groupId, userId: expense.createdById } },
      select: { countAsId: true },
    });
    canDelete = creatorMember?.countAsId === session.user.id;
  }
  if (!canDelete) {
    return NextResponse.json({ error: "Sem permissão para excluir esta despesa" }, { status: 403 });
  }

  await prisma.expense.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession(req.headers);
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { id } = await params;

  const expense = await prisma.expense.findUnique({ where: { id }, select: { createdById: true } });
  if (!expense) return NextResponse.json({ error: "Despesa não encontrada" }, { status: 404 });
  if (expense.createdById !== session.user.id) {
    return NextResponse.json({ error: "Sem permissão para editar esta despesa" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = updateExpenseSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos", details: parsed.error.flatten() }, { status: 400 });
  }

  const { description, date, items } = parsed.data;

  const updated = await prisma.$transaction(async (tx) => {
    if (items) {
      await tx.expenseItem.deleteMany({ where: { expenseId: id } });
    }

    return tx.expense.update({
      where: { id },
      data: {
        ...(description && { description }),
        ...(date && { date: new Date(date) }),
        ...(items && {
          items: {
            create: items.map((item) => ({
              description: item.description,
              value: item.value,
            })),
          },
        }),
      },
      include: { items: true },
    });
  });

  return NextResponse.json({ expense: serializeDecimal(updated) });
}
