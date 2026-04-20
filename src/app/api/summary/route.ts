import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import type { Settlement } from "@/lib/types";

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

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

  const entries = await prisma.entry.findMany({
    where: { groupId, date: { gte: startDate, lt: endDate } },
    include: { items: true },
  });

  const members = await prisma.groupMember.findMany({
    where: { groupId },
    include: { user: { select: { id: true, name: true } } },
  });

  const countAsMap: Record<string, string> = {};
  for (const m of members) {
    if (m.countAsId) countAsMap[m.userId] = m.countAsId;
  }

  const independents = members.filter((m) => !m.countAsId);
  const nameById: Record<string, string> = {};
  for (const m of independents) nameById[m.userId] = m.user.name;

  // Net contribution per independent user:
  //   sum(EXPENSE created by user) + sum(TRANSFER sent) - sum(TRANSFER received)
  const net: Record<string, number> = {};
  for (const m of independents) net[m.userId] = 0;

  let grandTotal = 0;

  for (const entry of entries) {
    const itemsTotal = entry.items.reduce((sum, item) => sum + Number(item.value), 0);
    const entryTotal = itemsTotal - Number(entry.discount);
    const creatorEffective = countAsMap[entry.createdById] || entry.createdById;

    if (entry.type === "TRANSFER") {
      if (creatorEffective in net) net[creatorEffective] += entryTotal;
      if (entry.toUserId) {
        const receiverEffective = countAsMap[entry.toUserId] || entry.toUserId;
        if (receiverEffective in net) net[receiverEffective] -= entryTotal;
      }
    } else {
      if (creatorEffective in net) net[creatorEffective] += entryTotal;
      grandTotal += entryTotal;
    }
  }

  const n = independents.length;
  const share = n > 0 ? grandTotal / n : 0;

  const perUser = independents
    .map((m) => ({ id: m.userId, name: m.user.name, total: round2(net[m.userId] ?? 0) }))
    .sort((a, b) => b.total - a.total);

  // Greedy settlement: pair largest creditor with largest debtor until balances zero
  const settlements: Settlement[] = [];
  if (n >= 2) {
    const creditors = independents
      .map((m) => ({ id: m.userId, balance: (net[m.userId] ?? 0) - share }))
      .filter((u) => u.balance > 0.005)
      .sort((a, b) => b.balance - a.balance);
    const debtors = independents
      .map((m) => ({ id: m.userId, balance: share - (net[m.userId] ?? 0) }))
      .filter((u) => u.balance > 0.005)
      .sort((a, b) => b.balance - a.balance);

    let i = 0;
    let j = 0;
    while (i < debtors.length && j < creditors.length) {
      const amount = Math.min(debtors[i].balance, creditors[j].balance);
      const rounded = round2(amount);
      if (rounded > 0) {
        settlements.push({
          from: nameById[debtors[i].id] || "",
          fromId: debtors[i].id,
          to: nameById[creditors[j].id] || "",
          toId: creditors[j].id,
          amount: rounded,
        });
      }
      debtors[i].balance -= amount;
      creditors[j].balance -= amount;
      if (debtors[i].balance < 0.005) i++;
      if (creditors[j].balance < 0.005) j++;
    }
  }

  return NextResponse.json({
    month,
    year,
    grandTotal: round2(grandTotal),
    perUser,
    settlements,
  });
}
