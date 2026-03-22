import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { getSplitStrategy } from "@/lib/split";

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

  const [expenses, members, group] = await Promise.all([
    prisma.expense.findMany({
      where: { groupId, date: { gte: startDate, lt: endDate } },
      include: { items: true, createdBy: { select: { id: true, name: true } } },
    }),
    prisma.groupMember.findMany({
      where: { groupId },
      include: { user: { select: { id: true, name: true } } },
    }),
    prisma.group.findUnique({ where: { id: groupId }, select: { splitType: true } }),
  ]);

  const strategy = getSplitStrategy((group?.splitType as "equal" | "weighted") ?? "equal");
  const membersWithWeight = members.map((m) => ({ ...m, weight: m.weight ?? 1 }));
  const result = strategy.calculate(expenses, membersWithWeight);

  // Legacy compatibility: return first settlement as singular object
  const settlement = result.settlements.length > 0 ? result.settlements[0] : null;

  const payment = await prisma.monthPayment.findUnique({
    where: { month_year_groupId: { month, year, groupId } },
  });

  return NextResponse.json({
    month,
    year,
    grandTotal: result.grandTotal,
    perUser: result.perUser,
    settlement,
    isPaid: payment?.isPaid || false,
    paidAt: payment?.paidAt,
    paidBy: payment?.paidBy,
  });
}
