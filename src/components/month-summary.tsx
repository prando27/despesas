"use client";

import { Button } from "@/components/ui/button";
import type { Settlement, UserTotal } from "@/lib/types";

interface MonthSummaryProps {
  month: number;
  year: number;
  grandTotal: number;
  perUser: UserTotal[];
  settlements: Settlement[];
  isPaid: boolean;
  paidBy?: string | null;
  paidAt?: string | null;
  currentUserId?: string;
  onMarkPaid: () => void;
  loading?: boolean;
}

function formatBRL(value: number) {
  return `R$ ${value.toFixed(2)}`;
}

export function MonthSummary({
  grandTotal, perUser, settlements, isPaid, paidBy, paidAt, currentUserId, onMarkPaid, loading,
}: MonthSummaryProps) {
  const sorted = [...perUser].sort((a, b) => b.total - a.total);
  const hasSettlements = settlements.length > 0;

  return (
    <div className="space-y-4">
      {/* Grand total */}
      <div className="rounded-xl bg-white border p-5 text-center">
        <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Total do mes</p>
        <p className="text-3xl font-bold tabular-nums">{formatBRL(grandTotal)}</p>
        {sorted.length > 0 && sorted.every((u) => u.share === sorted[0].share) ? (
          <p className="text-xs text-muted-foreground mt-1">{formatBRL(sorted[0].share)} por pessoa</p>
        ) : (
          <p className="text-xs text-muted-foreground mt-1">Divisão por peso</p>
        )}
      </div>

      {/* Per-user breakdown */}
      <div className="grid grid-cols-2 gap-3">
        {sorted.map((u) => {
          const diff = u.total - (u.share || 0);
          const isPositive = diff > 0;
          return (
            <div key={u.id} className="rounded-xl bg-white border p-4">
              <p className="text-sm font-medium truncate">{u.name}</p>
              <p className="text-xl font-bold tabular-nums mt-1">{formatBRL(u.total)}</p>
              {grandTotal > 0 && (
                <p className={`text-xs mt-1 ${isPositive ? "text-emerald-600" : diff < 0 ? "text-amber-600" : "text-muted-foreground"}`}>
                  {isPositive ? `+${formatBRL(diff)} acima` : diff < 0 ? `${formatBRL(Math.abs(diff))} abaixo` : "Exato"}
                </p>
              )}
              {grandTotal > 0 && (
                <div className="mt-2 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${isPositive ? "bg-emerald-400" : "bg-amber-400"}`}
                    style={{ width: `${Math.min((u.total / grandTotal) * 100, 100)}%` }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Settlement cards */}
      {hasSettlements && (
        <div className={`rounded-xl border-2 p-5 space-y-4 ${isPaid ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isPaid ? "bg-emerald-500" : "bg-amber-500 animate-pulse"}`} />
            <p className={`text-xs font-semibold uppercase tracking-widest ${isPaid ? "text-emerald-700" : "text-amber-700"}`}>
              {isPaid ? "Acerto realizado" : settlements.length === 1 ? "Acerto pendente" : `${settlements.length} acertos pendentes`}
            </p>
          </div>

          {settlements.map((s, i) => (
            <div key={i} className="flex items-center gap-3">
              {/* From */}
              <div className="text-center shrink-0">
                <div className="w-10 h-10 rounded-full bg-white border-2 border-current flex items-center justify-center text-sm font-bold text-amber-600">
                  {s.from.charAt(0)}
                </div>
                <p className="text-xs mt-1 font-medium">{s.from}</p>
              </div>

              {/* Arrow + amount */}
              <div className="flex flex-col items-center flex-1">
                <p className="text-lg font-bold tabular-nums">{formatBRL(s.amount)}</p>
                <svg width="60" height="12" viewBox="0 0 60 12" className="text-current opacity-40">
                  <line x1="0" y1="6" x2="52" y2="6" stroke="currentColor" strokeWidth="2" />
                  <polygon points="52,1 60,6 52,11" fill="currentColor" />
                </svg>
              </div>

              {/* To */}
              <div className="text-center shrink-0">
                <div className="w-10 h-10 rounded-full bg-white border-2 border-current flex items-center justify-center text-sm font-bold text-emerald-600">
                  {s.to.charAt(0)}
                </div>
                <p className="text-xs mt-1 font-medium">{s.to}</p>
              </div>
            </div>
          ))}

          {/* Pay button or paid status */}
          {isPaid ? (
            <p className="text-xs text-emerald-700 font-medium">
              Pago por {paidBy} em {paidAt ? new Date(paidAt).toLocaleDateString("pt-BR") : ""}
            </p>
          ) : settlements.some((s) => s.fromId === currentUserId) ? (
            <Button size="sm" className="w-full" onClick={onMarkPaid} disabled={loading}>
              {loading ? "Salvando..." : "Ja paguei"}
            </Button>
          ) : null}
        </div>
      )}

      {/* No settlement needed */}
      {(!hasSettlements && grandTotal > 0) && (
        <div className="rounded-xl border-2 border-emerald-200 bg-emerald-50 p-5 text-center">
          <p className="text-sm font-medium text-emerald-700">Tudo certo este mes!</p>
          <p className="text-xs text-emerald-600 mt-1">Ninguem deve nada.</p>
        </div>
      )}

      {grandTotal === 0 && (
        <div className="rounded-xl border bg-white p-5 text-center">
          <p className="text-sm text-muted-foreground">Nenhuma despesa neste mes.</p>
        </div>
      )}
    </div>
  );
}
