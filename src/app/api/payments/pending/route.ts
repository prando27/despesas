import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { getSplitStrategy } from "@/lib/split";
import type { ExpenseWithItems, MemberWithUser } from "@/lib/split";

export async function GET(req: NextRequest) {
  const session = await getSession(req.headers);
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const groupId = searchParams.get("groupId");

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
  for (const expense of expenses) {
    const d = new Date(expense.date);
    const key = `${d.getMonth() + 1}-${d.getFullYear()}`;
    if (!monthlyExpenses[key]) monthlyExpenses[key] = [];
    monthlyExpenses[key].push(expense);
  }

  const pending: { month: number; year: number; from: string; fromId: string; to: string; toId: string; amount: number }[] = [];

  for (const [key, monthExpenses] of Object.entries(monthlyExpenses)) {
    if (paidMap.get(key)) continue;

    const [monthStr, yearStr] = key.split("-");
    const result = strategy.calculate(monthExpenses, membersWithWeight);

    for (const s of result.settlements) {
      pending.push({
        month: parseInt(monthStr),
        year: parseInt(yearStr),
        from: s.from,
        fromId: s.fromId,
        to: s.to,
        toId: s.toId,
        amount: s.amount,
      });
    }
  }

  pending.sort((a, b) => a.year - b.year || a.month - b.month);

  // Net bidirectional flows across months
  const totalOwed: Record<string, { from: string; fromId: string; to: string; toId: string; amount: number }> = {};
  for (const p of pending) {
    const dirKey = `${p.fromId}->${p.toId}`;
    const reverseKey = `${p.toId}->${p.fromId}`;
    if (totalOwed[reverseKey]) {
      totalOwed[reverseKey].amount -= p.amount;
    } else {
      if (!totalOwed[dirKey]) totalOwed[dirKey] = { from: p.from, fromId: p.fromId, to: p.to, toId: p.toId, amount: 0 };
      totalOwed[dirKey].amount += p.amount;
    }
  }

  const settlements = Object.values(totalOwed).map((s) => {
    if (s.amount < 0) {
      return { from: s.to, fromId: s.toId, to: s.from, toId: s.fromId, amount: Math.abs(s.amount) };
    }
    return { ...s, amount: Math.round(s.amount * 100) / 100 };
  }).filter((s) => s.amount > 0);

  return NextResponse.json({ pending, settlements, totalPending: pending.length });
}
