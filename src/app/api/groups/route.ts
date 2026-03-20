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

  const group = await prisma.group.create({
    data: {
      name,
      inviteCode: generateInviteCode(),
      members: {
        create: { userId: session.user.id, role: "admin" },
      },
    },
    include: { members: { include: { user: { select: { id: true, name: true } } } } },
  });

  return NextResponse.json({ group }, { status: 201 });
}
