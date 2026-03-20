import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await getSession(req.headers);
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const body = await req.json();
  const code = body.code?.trim()?.toUpperCase();
  if (!code) {
    return NextResponse.json({ error: "Código de convite é obrigatório" }, { status: 400 });
  }

  const group = await prisma.group.findUnique({ where: { inviteCode: code } });
  if (!group) {
    return NextResponse.json({ error: "Código de convite inválido" }, { status: 404 });
  }

  const existing = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId: group.id, userId: session.user.id } },
  });
  if (existing) {
    return NextResponse.json({ error: "Você já é membro deste grupo", groupId: group.id }, { status: 409 });
  }

  const countAsId = body.countAsId?.trim() || null;

  // If countAsId provided, verify that user exists as member of the group
  if (countAsId) {
    const countAsMember = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId: group.id, userId: countAsId } },
    });
    if (!countAsMember) {
      return NextResponse.json({ error: "Usuário alvo não é membro do grupo" }, { status: 400 });
    }
  }

  await prisma.groupMember.create({
    data: { groupId: group.id, userId: session.user.id, role: "member", countAsId },
  });

  return NextResponse.json({ groupId: group.id, groupName: group.name });
}
