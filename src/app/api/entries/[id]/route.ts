import { NextRequest, NextResponse } from "next/server";
import { prisma, serializeDecimal } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { updateEntrySchema } from "@/lib/types";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession(req.headers);
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { id } = await params;

  const entry = await prisma.entry.findUnique({ where: { id }, select: { createdById: true, groupId: true } });
  if (!entry) return NextResponse.json({ error: "Lançamento não encontrado" }, { status: 404 });

  let canDelete = entry.createdById === session.user.id;
  if (!canDelete) {
    const creatorMember = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId: entry.groupId, userId: entry.createdById } },
      select: { countAsId: true },
    });
    canDelete = creatorMember?.countAsId === session.user.id;
  }
  if (!canDelete) {
    return NextResponse.json({ error: "Sem permissão para excluir este lançamento" }, { status: 403 });
  }

  await prisma.entry.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession(req.headers);
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { id } = await params;

  const entry = await prisma.entry.findUnique({ where: { id }, select: { createdById: true } });
  if (!entry) return NextResponse.json({ error: "Lançamento não encontrado" }, { status: 404 });
  if (entry.createdById !== session.user.id) {
    return NextResponse.json({ error: "Sem permissão para editar este lançamento" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = updateEntrySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos", details: parsed.error.flatten() }, { status: 400 });
  }

  const { description, date, items, discount } = parsed.data;

  const updated = await prisma.$transaction(async (tx) => {
    if (items) {
      await tx.entryItem.deleteMany({ where: { entryId: id } });
    }

    return tx.entry.update({
      where: { id },
      data: {
        ...(description && { description }),
        ...(date && { date: new Date(date) }),
        ...(discount !== undefined && { discount }),
        ...(items && {
          items: {
            create: items.map((item) => ({
              description: item.description,
              value: item.value,
            })),
          },
        }),
      },
      include: {
        items: true,
        createdBy: { select: { id: true, name: true } },
        toUser: { select: { id: true, name: true } },
      },
    });
  });

  return NextResponse.json({ entry: serializeDecimal(updated) });
}
