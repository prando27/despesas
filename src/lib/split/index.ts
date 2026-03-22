import type { GroupSplitType, SplitStrategy } from "./types";
import { EqualSplitStrategy } from "./strategies/equal";

export type { SplitResult, SplitStrategy, ExpenseWithItems, MemberWithUser, Settlement, UserTotal, GroupSplitType } from "./types";

/**
 * Returns the appropriate split strategy for a group's split type.
 * New strategies are added here — consumers never need to know which
 * implementation they're using.
 */
export function getSplitStrategy(type: GroupSplitType = "equal"): SplitStrategy {
  switch (type) {
    case "equal":
      return new EqualSplitStrategy();
    case "weighted":
      // TODO: implement WeightedSplitStrategy
      return new EqualSplitStrategy();
    default:
      return new EqualSplitStrategy();
  }
}
