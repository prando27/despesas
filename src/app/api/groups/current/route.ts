import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getSession(req.headers);
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const memberships = await prisma.groupMember.findMany({
    where: { userId: session.user.id },
    include: {
      group: {
        include: {
          members: { include: { user: { select: { id: true, name: true, image: true } } } },
        },
      },
    },
    orderBy: { joinedAt: "asc" },
  });

  if (memberships.length === 0) {
    return NextResponse.json({ groups: [], currentGroup: null });
  }

  const groups = memberships.map((m) => ({
    id: m.group.id,
    name: m.group.name,
    inviteCode: m.group.inviteCode,
    splitType: m.group.splitType,
    groupType: m.group.groupType,
    role: m.role,
    members: m.group.members.map((gm) => ({
      memberId: gm.id,
      id: gm.user.id,
      name: gm.user.name,
      image: gm.user.image,
      role: gm.role,
      countAsId: gm.countAsId,
      weight: gm.weight,
    })),
  }));

  return NextResponse.json({ groups, currentGroup: groups[0] });
}
