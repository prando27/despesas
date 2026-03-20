import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { monthYearSchema } from "@/lib/types";

export async function POST(req: NextRequest) {
  const session = await getSession(req.headers);
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const body = await req.json();
  const parsed = monthYearSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos", details: parsed.error.flatten() }, { status: 400 });
  }

  const { month, year, groupId } = parsed.data;

  const payment = await prisma.monthPayment.upsert({
    where: { month_year_groupId: { month, year, groupId } },
    update: { isPaid: true, paidAt: new Date(), paidBy: session.user.name },
    create: { month, year, groupId, isPaid: true, paidAt: new Date(), paidBy: session.user.name },
  });

  return NextResponse.json({ payment });
}
