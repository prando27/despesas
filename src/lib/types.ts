import { z } from "zod";

// --- Domain Types ---

export type EntryType = "EXPENSE" | "TRANSFER";

export interface ExpenseItem {
  id: string;
  description: string;
  value: number;
}

export interface Expense {
  id: string;
  description: string;
  date: string;
  receiptUrl?: string | null;
  createdBy: { id: string; name: string };
  items: ExpenseItem[];
}

export interface EntryItem {
  id: string;
  description: string;
  value: number;
}

export interface Entry {
  id: string;
  type: EntryType;
  description: string;
  date: string;
  receiptUrl?: string | null;
  createdBy: { id: string; name: string };
  toUser?: { id: string; name: string } | null;
  items: EntryItem[];
}

export interface Settlement {
  from: string;
  fromId: string | null;
  to: string;
  toId: string;
  amount: number;
}

export interface UserTotal {
  id: string;
  name: string;
  total: number;
}

export interface SummaryData {
  month: number;
  year: number;
  grandTotal: number;
  perUser: UserTotal[];
  settlement: Settlement | null;
  isPaid: boolean;
  paidAt: string | null;
  paidBy: string | null;
}

// --- Validation Schemas ---

const expenseItemSchema = z.object({
  description: z.string().min(1),
  value: z.number().positive(),
});

export const createExpenseSchema = z.object({
  description: z.string().min(1),
  date: z.string().min(1),
  groupId: z.string().min(1),
  items: z.array(expenseItemSchema).min(1),
  receiptImage: z.string().optional(),
  receiptMediaType: z.enum(["image/jpeg", "image/png", "image/webp"]).optional(),
  receiptKey: z.string().optional(),
});

export const updateExpenseSchema = z.object({
  description: z.string().min(1).optional(),
  date: z.string().min(1).optional(),
  items: z.array(expenseItemSchema).optional(),
});

const entryItemSchema = z.object({
  description: z.string().min(1),
  value: z.number().positive(),
});

export const createEntrySchema = z
  .object({
    type: z.enum(["EXPENSE", "TRANSFER"]).default("EXPENSE"),
    description: z.string().min(1),
    date: z.string().min(1),
    groupId: z.string().min(1),
    items: z.array(entryItemSchema).min(1),
    toUserId: z.string().optional(),
    receiptImage: z.string().optional(),
    receiptMediaType: z.enum(["image/jpeg", "image/png", "image/webp"]).optional(),
    receiptKey: z.string().optional(),
  })
  .refine((data) => data.type !== "TRANSFER" || !!data.toUserId, {
    message: "Transferência exige um destinatário",
    path: ["toUserId"],
  })
  .refine((data) => data.type !== "TRANSFER" || data.items.length === 1, {
    message: "Transferência deve ter exatamente um valor",
    path: ["items"],
  });

export const updateEntrySchema = z.object({
  description: z.string().min(1).optional(),
  date: z.string().min(1).optional(),
  items: z.array(entryItemSchema).optional(),
});

export const monthYearSchema = z.object({
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2000).max(2100),
  groupId: z.string().min(1),
});

export const ocrSchema = z.object({
  image: z.string().min(1),
  mediaType: z.enum(["image/jpeg", "image/png", "image/webp"]).default("image/jpeg"),
});

// --- Constants ---

export const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
] as const;
