/**
 * Types for the expense splitting module.
 *
 * SplitStrategy is the core abstraction — each implementation encapsulates
 * a different way to divide expenses among members. Consumers only see
 * SplitResult, never the calculation details.
 */

export interface ExpenseWithItems {
  id: string;
  createdById: string;
  createdBy: { id: string; name: string };
  items: { value: number | { toNumber(): number } }[];
}

export interface MemberWithUser {
  userId: string;
  user: { id: string; name: string };
  countAsId: string | null;
  weight: number;
}

export interface UserTotal {
  id: string;
  name: string;
  total: number;
  share: number;
}

export interface Settlement {
  fromId: string;
  from: string;
  toId: string;
  to: string;
  amount: number;
}

export interface SplitResult {
  perUser: UserTotal[];
  settlements: Settlement[];
  grandTotal: number;
}

/**
 * A split strategy calculates how expenses are divided among members.
 * Each implementation hides its own calculation logic — consumers
 * call calculate() and get a uniform SplitResult.
 */
export interface SplitStrategy {
  calculate(expenses: ExpenseWithItems[], members: MemberWithUser[]): SplitResult;
}

export type GroupSplitType = "equal" | "weighted";
