import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code")?.toUpperCase();
  const countAsId = searchParams.get("countAsId");

  if (!code) {
    return NextResponse.json({ error: "Código obrigatório" }, { status: 400 });
  }

  const group = await prisma.group.findUnique({ where: { inviteCode: code } });
  if (!group) {
    return NextResponse.json({ error: "Grupo não encontrado" }, { status: 404 });
  }

  let countAsName: string | null = null;
  if (countAsId) {
    const member = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId: group.id, userId: countAsId } },
      include: { user: { select: { name: true } } },
    });
    countAsName = member?.user.name || null;
  }

  return NextResponse.json({ name: group.name, countAsName });
}
