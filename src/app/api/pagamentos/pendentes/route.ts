import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getSession(req.headers);
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const groupId = searchParams.get("groupId");

  if (!groupId) {
    return NextResponse.json({ error: "groupId obrigatório" }, { status: 400 });
  }

  const expenses = await prisma.expense.findMany({
    where: { groupId },
    include: { items: true, createdBy: { select: { id: true, name: true } } },
  });

  const payments = await prisma.monthPayment.findMany({ where: { groupId } });
  const paidMap = new Map(payments.map((p) => [`${p.month}-${p.year}`, p.isPaid]));

  const members = await prisma.groupMember.findMany({
    where: { groupId },
    include: { user: { select: { id: true, name: true } } },
  });

  // Build countAs mapping
  const countAsMap: Record<string, string> = {};
  for (const m of members) {
    if (m.countAsId) countAsMap[m.userId] = m.countAsId;
  }

  const monthlyTotals: Record<string, Record<string, { name: string; total: number }>> = {};
  for (const expense of expenses) {
    const d = new Date(expense.date);
    const key = `${d.getMonth() + 1}-${d.getFullYear()}`;
    if (!monthlyTotals[key]) monthlyTotals[key] = {};
    const effectiveUserId = countAsMap[expense.createdById] || expense.createdById;
    if (!monthlyTotals[key][effectiveUserId]) {
      const member = members.find((m) => m.userId === effectiveUserId);
      monthlyTotals[key][effectiveUserId] = { name: member?.user.name || expense.createdBy.name, total: 0 };
    }
    monthlyTotals[key][effectiveUserId].total += expense.items.reduce((s, i) => s + Number(i.value), 0);
  }

  const pending: { month: number; year: number; from: string; fromId: string; to: string; toId: string; amount: number }[] = [];

  for (const [key, userTotals] of Object.entries(monthlyTotals)) {
    if (paidMap.get(key)) continue;

    const [monthStr, yearStr] = key.split("-");
    const month = parseInt(monthStr);
    const year = parseInt(yearStr);

    // Only include independent members
    for (const m of members) {
      if (!m.countAsId && !userTotals[m.userId]) userTotals[m.userId] = { name: m.user.name, total: 0 };
    }

    const users = Object.entries(userTotals).map(([id, data]) => ({ id, ...data }));
    users.sort((a, b) => b.total - a.total);

    if (users.length >= 2) {
      const n = users.length;
      const share = users.reduce((s, u) => s + u.total, 0) / n;
      const debtor = users[users.length - 1];
      const creditor = users[0];
      const amount = Math.round((share - debtor.total) * 100) / 100;
      if (amount > 0) {
        pending.push({ month, year, from: debtor.name, fromId: debtor.id, to: creditor.name, toId: creditor.id, amount });
      }
    }
  }

  pending.sort((a, b) => a.year - b.year || a.month - b.month);

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
