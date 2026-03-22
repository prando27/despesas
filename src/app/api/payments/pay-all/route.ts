import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { getSplitStrategy } from "@/lib/split";
import type { ExpenseWithItems, MemberWithUser } from "@/lib/split";

export async function POST(req: NextRequest) {
  const session = await getSession(req.headers);
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const body = await req.json();
  const groupId = body.groupId;

  if (!groupId) {
    return NextResponse.json({ error: "groupId obrigatório" }, { status: 400 });
  }

  const [expenses, payments, members, group] = await Promise.all([
    prisma.expense.findMany({
      where: { groupId },
      include: { items: true, createdBy: { select: { id: true, name: true } }, participants: { select: { userId: true } } },
    }),
    prisma.monthPayment.findMany({ where: { groupId } }),
    prisma.groupMember.findMany({
      where: { groupId },
      include: { user: { select: { id: true, name: true } } },
    }),
    prisma.group.findUnique({ where: { id: groupId }, select: { splitType: true } }),
  ]);

  const paidMap = new Map(payments.map((p) => [`${p.month}-${p.year}`, p.isPaid]));
  const strategy = getSplitStrategy((group?.splitType as "equal" | "weighted" | "per-expense") ?? "equal");
  const membersWithWeight: MemberWithUser[] = members.map((m) => ({ ...m, weight: m.weight ?? 1 }));

  // Group expenses by month
  const monthlyExpenses: Record<string, ExpenseWithItems[]> = {};
  for (const e of expenses) {
    const d = new Date(e.date);
    const key = `${d.getMonth() + 1}-${d.getFullYear()}`;
    if (!monthlyExpenses[key]) monthlyExpenses[key] = [];
    monthlyExpenses[key].push(e);
  }

  const upserts: { month: number; year: number; paidBy: string }[] = [];

  for (const [key, monthExpenses] of Object.entries(monthlyExpenses)) {
    if (paidMap.get(key)) continue;

    const [monthStr, yearStr] = key.split("-");
    const result = strategy.calculate(monthExpenses, membersWithWeight);

    if (result.settlements.length > 0) {
      // Use first debtor's name as paidBy
      upserts.push({
        month: parseInt(monthStr),
        year: parseInt(yearStr),
        paidBy: result.settlements[0].from,
      });
    }
  }

  if (upserts.length === 0) {
    return NextResponse.json({ paid: 0 });
  }

  const now = new Date();
  const results = await prisma.$transaction(
    upserts.map(({ month, year, paidBy }) =>
      prisma.monthPayment.upsert({
        where: { month_year_groupId: { month, year, groupId } },
        update: { isPaid: true, paidAt: now, paidBy },
        create: { month, year, groupId, isPaid: true, paidAt: now, paidBy },
      })
    )
  );

  return NextResponse.json({ paid: results.length });
}
