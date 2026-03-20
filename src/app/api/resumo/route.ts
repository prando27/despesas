import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

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

  const expenses = await prisma.expense.findMany({
    where: { groupId, date: { gte: startDate, lt: endDate } },
    include: { items: true, createdBy: { select: { id: true, name: true } } },
  });

  // Load members with countAsId mapping
  const members = await prisma.groupMember.findMany({
    where: { groupId },
    include: { user: { select: { id: true, name: true } } },
  });

  // Build countAs mapping: userId -> countAsId (if set)
  const countAsMap: Record<string, string> = {};
  for (const m of members) {
    if (m.countAsId) {
      countAsMap[m.userId] = m.countAsId;
    }
  }

  const totalsPerUser: Record<string, { name: string; total: number }> = {};
  let grandTotal = 0;

  for (const expense of expenses) {
    // If creator has countAsId, attribute expense to that user
    const effectiveUserId = countAsMap[expense.createdById] || expense.createdById;
    if (!totalsPerUser[effectiveUserId]) {
      const member = members.find((m) => m.userId === effectiveUserId);
      totalsPerUser[effectiveUserId] = { name: member?.user.name || expense.createdBy.name, total: 0 };
    }
    const expenseTotal = expense.items.reduce((sum, item) => sum + Number(item.value), 0);
    totalsPerUser[effectiveUserId].total += expenseTotal;
    grandTotal += expenseTotal;
  }

  // Ensure all independent members appear (exclude those with countAsId)
  for (const m of members) {
    if (!m.countAsId && !totalsPerUser[m.userId]) {
      totalsPerUser[m.userId] = { name: m.user.name, total: 0 };
    }
  }

  const users = Object.entries(totalsPerUser).map(([id, data]) => ({ id, ...data }));
  users.sort((a, b) => b.total - a.total);

  // Settlement: N-person split — total / N, whoever paid less owes the difference
  const n = users.length;
  let settlement = null;
  if (n >= 2) {
    const share = grandTotal / n;
    // Find who owes the most (spent the least below share)
    const debtors = users.filter((u) => u.total < share).map((u) => ({
      ...u,
      owes: Math.round((share - u.total) * 100) / 100,
    }));
    const creditors = users.filter((u) => u.total > share).map((u) => ({
      ...u,
      owed: Math.round((u.total - share) * 100) / 100,
    }));

    // For 2 people, simplify to single settlement
    if (debtors.length === 1 && creditors.length === 1) {
      settlement = {
        from: debtors[0].name,
        fromId: debtors[0].id,
        to: creditors[0].name,
        toId: creditors[0].id,
        amount: debtors[0].owes,
      };
    } else if (debtors.length > 0 && creditors.length > 0) {
      // For N people, pick largest debtor → largest creditor (simplified)
      settlement = {
        from: debtors[0].name,
        fromId: debtors[0].id,
        to: creditors[0].name,
        toId: creditors[0].id,
        amount: debtors[0].owes,
      };
    }
  }

  const payment = await prisma.monthPayment.findUnique({
    where: { month_year_groupId: { month, year, groupId } },
  });

  return NextResponse.json({
    month,
    year,
    grandTotal: Math.round(grandTotal * 100) / 100,
    perUser: users,
    settlement,
    isPaid: payment?.isPaid || false,
    paidAt: payment?.paidAt,
    paidBy: payment?.paidBy,
  });
}
