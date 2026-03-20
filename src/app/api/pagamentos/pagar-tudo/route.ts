import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await getSession(req.headers);
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const body = await req.json();
  const groupId = body.groupId;

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

  const monthlyTotals: Record<string, Record<string, { name: string; total: number }>> = {};
  for (const e of expenses) {
    const d = new Date(e.date);
    const key = `${d.getMonth() + 1}-${d.getFullYear()}`;
    if (!monthlyTotals[key]) monthlyTotals[key] = {};
    if (!monthlyTotals[key][e.createdById]) {
      monthlyTotals[key][e.createdById] = { name: e.createdBy.name, total: 0 };
    }
    monthlyTotals[key][e.createdById].total += e.items.reduce((s, i) => s + Number(i.value), 0);
  }

  const upserts: { month: number; year: number; paidBy: string }[] = [];

  for (const [key, userTotals] of Object.entries(monthlyTotals)) {
    if (paidMap.get(key)) continue;

    const [monthStr, yearStr] = key.split("-");

    for (const m of members) {
      if (!userTotals[m.userId]) userTotals[m.userId] = { name: m.user.name, total: 0 };
    }

    const users = Object.entries(userTotals).map(([id, data]) => ({ id, ...data }));
    users.sort((a, b) => b.total - a.total);

    if (users.length >= 2) {
      const n = users.length;
      const share = users.reduce((s, u) => s + u.total, 0) / n;
      const debtor = users[users.length - 1];
      if (debtor.total < share) {
        upserts.push({ month: parseInt(monthStr), year: parseInt(yearStr), paidBy: debtor.name });
      }
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
