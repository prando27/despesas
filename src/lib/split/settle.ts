import type { Settlement } from "./types";

/**
 * Minimizes the number of transactions to settle debts among N people.
 *
 * Uses a greedy algorithm: repeatedly match the largest creditor with
 * the largest debtor until all balances are zero.
 *
 * @param balances - Per-user balance (positive = owed money, negative = owes money)
 */
export function settleDebts(
  balances: { id: string; name: string; balance: number }[]
): Settlement[] {
  const settlements: Settlement[] = [];

  // Copy and filter out zero balances
  const active = balances
    .map((b) => ({ ...b, balance: Math.round(b.balance * 100) / 100 }))
    .filter((b) => Math.abs(b.balance) > 0.01);

  while (active.length >= 2) {
    active.sort((a, b) => a.balance - b.balance);

    const debtor = active[0]; // most negative
    const creditor = active[active.length - 1]; // most positive

    if (debtor.balance >= -0.01 || creditor.balance <= 0.01) break;

    const amount = Math.min(-debtor.balance, creditor.balance);
    const rounded = Math.round(amount * 100) / 100;

    if (rounded > 0) {
      settlements.push({
        fromId: debtor.id,
        from: debtor.name,
        toId: creditor.id,
        to: creditor.name,
        amount: rounded,
      });
    }

    debtor.balance += amount;
    creditor.balance -= amount;

    // Remove settled entries
    for (let i = active.length - 1; i >= 0; i--) {
      if (Math.abs(active[i].balance) < 0.01) active.splice(i, 1);
    }
  }

  return settlements;
}
