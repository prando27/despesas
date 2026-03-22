import type { SplitStrategy, SplitResult, ExpenseWithItems, MemberWithUser } from "../types";
import { settleDebts } from "../settle";

/**
 * Per-expense participant split: each expense is divided only among
 * its participants. If no participants are specified, all independent
 * members participate (fallback to equal split for that expense).
 */
export class PerExpenseParticipantSplit implements SplitStrategy {
  calculate(expenses: ExpenseWithItems[], members: MemberWithUser[]): SplitResult {
    // Build countAs mapping
    const countAsMap: Record<string, string> = {};
    for (const m of members) {
      if (m.countAsId) {
        countAsMap[m.userId] = m.countAsId;
      }
    }

    const independentMembers = members.filter((m) => !m.countAsId);
    const allIndependentIds = independentMembers.map((m) => m.userId);

    // Track: per-user total spent, and per-user share owed
    const userTotals: Record<string, { name: string; totalSpent: number; totalShare: number }> = {};

    function ensureUser(userId: string, name: string) {
      if (!userTotals[userId]) {
        userTotals[userId] = { name, totalSpent: 0, totalShare: 0 };
      }
    }

    // Ensure all independent members appear
    for (const m of independentMembers) {
      ensureUser(m.userId, m.user.name);
    }

    let grandTotal = 0;

    for (const expense of expenses) {
      const expenseTotal = expense.items.reduce(
        (sum, item) => sum + Number(item.value),
        0
      );
      grandTotal += expenseTotal;

      // Who paid (attribute via countAs)
      const effectivePayer = countAsMap[expense.createdById] || expense.createdById;
      const payerMember = members.find((m) => m.userId === effectivePayer);
      ensureUser(effectivePayer, payerMember?.user.name || expense.createdBy.name);
      userTotals[effectivePayer].totalSpent += expenseTotal;

      // Who participates in this expense
      let participantList: string[];
      if (expense.participants && expense.participants.length > 0) {
        // Map participants through countAs, deduplicate
        const mapped = expense.participants.map((p) => countAsMap[p.userId] || p.userId);
        participantList = mapped.filter((v, i) => mapped.indexOf(v) === i);
      } else {
        // No participants specified = all independent members
        participantList = [...allIndependentIds];
      }

      // Each participant owes their share of this expense
      const sharePerParticipant = participantList.length > 0 ? expenseTotal / participantList.length : 0;
      for (const pid of participantList) {
        const member = members.find((m) => m.userId === pid);
        ensureUser(pid, member?.user.name || "");
        userTotals[pid].totalShare += sharePerParticipant;
      }
    }

    const perUser = Object.entries(userTotals)
      .map(([id, data]) => ({
        id,
        name: data.name,
        total: data.totalSpent,
        share: Math.round(data.totalShare * 100) / 100,
      }))
      .sort((a, b) => b.total - a.total);

    const balances = perUser.map((u) => ({
      id: u.id,
      name: u.name,
      balance: u.total - u.share,
    }));
    const settlements = settleDebts(balances);

    return {
      perUser,
      settlements,
      grandTotal: Math.round(grandTotal * 100) / 100,
    };
  }
}
