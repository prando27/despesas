import { z } from "zod";

// --- Domain Types ---

export type EntryType = "EXPENSE" | "TRANSFER";

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
  discount: number;
}

export interface Settlement {
  from: string;
  fromId: string;
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
  settlements: Settlement[];
}

// --- Validation Schemas ---

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
    discount: z.number().nonnegative().optional().default(0),
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
  })
  .refine((data) => data.type !== "TRANSFER" || !data.discount, {
    message: "Transferência não aceita desconto",
    path: ["discount"],
  })
  .refine(
    (data) => {
      const itemsTotal = data.items.reduce((s, i) => s + i.value, 0);
      return (data.discount ?? 0) <= itemsTotal + 0.001;
    },
    {
      message: "Desconto não pode exceder o total dos itens",
      path: ["discount"],
    },
  );

export const updateEntrySchema = z.object({
  description: z.string().min(1).optional(),
  date: z.string().min(1).optional(),
  items: z.array(entryItemSchema).optional(),
  discount: z.number().nonnegative().optional(),
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
