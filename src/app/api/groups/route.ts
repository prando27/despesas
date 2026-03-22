import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import crypto from "crypto";

function generateInviteCode(): string {
  return crypto.randomBytes(3).toString("hex").toUpperCase();
}

export async function POST(req: NextRequest) {
  const session = await getSession(req.headers);
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const body = await req.json();
  const name = body.name?.trim();
  if (!name) {
    return NextResponse.json({ error: "Nome do grupo é obrigatório" }, { status: 400 });
  }

  const groupType = body.groupType === "event" ? "event" : "monthly";

  const group = await prisma.group.create({
    data: {
      name,
      groupType,
      inviteCode: generateInviteCode(),
      members: {
        create: { userId: session.user.id, role: "admin" },
      },
    },
    include: { members: { include: { user: { select: { id: true, name: true } } } } },
  });

  return NextResponse.json({ group }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const session = await getSession(req.headers);
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const body = await req.json();
  const { groupId, splitType, memberWeights } = body;

  if (!groupId) {
    return NextResponse.json({ error: "groupId obrigatório" }, { status: 400 });
  }

  // Verify user is admin
  const membership = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId: session.user.id } },
  });
  if (!membership || membership.role !== "admin") {
    return NextResponse.json({ error: "Apenas admins podem alterar configurações" }, { status: 403 });
  }

  const updates: Promise<unknown>[] = [];

  if (splitType && ["equal", "weighted"].includes(splitType)) {
    updates.push(prisma.group.update({ where: { id: groupId }, data: { splitType } }));
  }

  if (memberWeights && typeof memberWeights === "object") {
    for (const [memberId, weight] of Object.entries(memberWeights)) {
      const w = Number(weight);
      if (w >= 1 && Number.isInteger(w)) {
        updates.push(
          prisma.groupMember.update({ where: { id: memberId }, data: { weight: w } })
        );
      }
    }
  }

  await Promise.all(updates);
  return NextResponse.json({ ok: true });
}
