import type { SplitStrategy, SplitResult, ExpenseWithItems, MemberWithUser } from "../types";
import { settleDebts } from "../settle";

/**
 * Equal split: total / N among all independent members.
 * Members with countAsId have their expenses attributed to the target user.
 */
export class EqualSplitStrategy implements SplitStrategy {
  calculate(expenses: ExpenseWithItems[], members: MemberWithUser[]): SplitResult {
    // Build countAs mapping: userId -> countAsId
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

    // Ensure all independent members appear
    for (const m of members) {
      if (!m.countAsId && !totalsPerUser[m.userId]) {
        totalsPerUser[m.userId] = { name: m.user.name, total: 0 };
      }
    }

    const users = Object.entries(totalsPerUser).map(([id, data]) => ({ id, ...data }));
    const n = users.length;
    const share = n > 0 ? grandTotal / n : 0;

    const perUser = users
      .map((u) => ({ ...u, share: Math.round(share * 100) / 100 }))
      .sort((a, b) => b.total - a.total);

    // Calculate settlements using generic N-way algorithm
    const balances = perUser.map((u) => ({
      id: u.id,
      name: u.name,
      balance: u.total - share,
    }));
    const settlements = settleDebts(balances);

    return {
      perUser,
      settlements,
      grandTotal: Math.round(grandTotal * 100) / 100,
    };
  }
}
