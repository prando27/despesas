import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { z } from "zod";

const updateMemberSchema = z.object({
  memberId: z.string().min(1),
  groupId: z.string().min(1),
  countAsId: z.string().nullable(),
});

export async function PATCH(req: NextRequest) {
  const session = await getSession(req.headers);
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const body = await req.json();
  const parsed = updateMemberSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }

  const { memberId, groupId, countAsId } = parsed.data;

  // Verify requester is admin of the group
  const requesterMembership = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId: session.user.id } },
  });
  if (!requesterMembership || requesterMembership.role !== "admin") {
    return NextResponse.json({ error: "Apenas administradores podem alterar membros" }, { status: 403 });
  }

  // Verify target member exists in this group
  const targetMember = await prisma.groupMember.findFirst({
    where: { id: memberId, groupId },
  });
  if (!targetMember) {
    return NextResponse.json({ error: "Membro não encontrado" }, { status: 404 });
  }

  // If countAsId is set, verify that user is also a member of the group
  if (countAsId) {
    const countAsMember = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId: countAsId } },
    });
    if (!countAsMember) {
      return NextResponse.json({ error: "Usuário alvo não é membro do grupo" }, { status: 400 });
    }
    // Cannot point to self
    if (countAsId === targetMember.userId) {
      return NextResponse.json({ error: "Não pode apontar para si mesmo" }, { status: 400 });
    }
  }

  const updated = await prisma.groupMember.update({
    where: { id: memberId },
    data: { countAsId },
    include: { user: { select: { id: true, name: true } } },
  });

  return NextResponse.json({ member: updated });
}
