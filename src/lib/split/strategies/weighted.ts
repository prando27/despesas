import type { SplitStrategy, SplitResult, ExpenseWithItems, MemberWithUser } from "../types";
import { settleDebts } from "../settle";

/**
 * Weighted split: each member's share is proportional to their weight.
 * A member with weight=2 pays twice as much as a member with weight=1.
 * Members with countAsId have their expenses attributed to the target user,
 * and their weight is ignored (it's the target's weight that counts).
 */
export class WeightedSplitStrategy implements SplitStrategy {
  calculate(expenses: ExpenseWithItems[], members: MemberWithUser[]): SplitResult {
    // Build countAs mapping
    const countAsMap: Record<string, string> = {};
    for (const m of members) {
      if (m.countAsId) {
        countAsMap[m.userId] = m.countAsId;
      }
    }

    // Sum totals per effective user
    const totalsPerUser: Record<string, { name: string; total: number }> = {};
    let grandTotal = 0;

    for (const expense of expenses) {
      const effectiveUserId = countAsMap[expense.createdById] || expense.createdById;
      if (!totalsPerUser[effectiveUserId]) {
        const member = members.find((m) => m.userId === effectiveUserId);
        totalsPerUser[effectiveUserId] = {
          name: member?.user.name || expense.createdBy.name,
          total: 0,
        };
      }
      const expenseTotal = expense.items.reduce(
        (sum, item) => sum + Number(item.value),
        0
      );
      totalsPerUser[effectiveUserId].total += expenseTotal;
      grandTotal += expenseTotal;
    }

    // Ensure all independent members appear and collect weights
    const weightMap: Record<string, number> = {};
    for (const m of members) {
      if (!m.countAsId) {
        if (!totalsPerUser[m.userId]) {
          totalsPerUser[m.userId] = { name: m.user.name, total: 0 };
        }
        weightMap[m.userId] = m.weight || 1;
      }
    }

    const totalWeight = Object.values(weightMap).reduce((s, w) => s + w, 0);

    const users = Object.entries(totalsPerUser).map(([id, data]) => ({ id, ...data }));
    const perUser = users
      .map((u) => {
        const weight = weightMap[u.id] || 1;
        const share = totalWeight > 0 ? Math.round((grandTotal * weight / totalWeight) * 100) / 100 : 0;
        return { ...u, share };
      })
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
