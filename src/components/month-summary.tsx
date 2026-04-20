"use client";

import type { Settlement, UserTotal } from "@/lib/types";

interface MonthSummaryProps {
  grandTotal: number;
  perUser: UserTotal[];
  settlements: Settlement[];
}

function formatBRL(value: number) {
  return `R$ ${value.toFixed(2)}`;
}

export function MonthSummary({ grandTotal, perUser, settlements }: MonthSummaryProps) {
  const shareTotal = perUser.length > 0 ? grandTotal / perUser.length : 0;
  const sorted = [...perUser].sort((a, b) => b.total - a.total);
  const hasSettlements = settlements.length > 0;

  return (
    <div className="space-y-4">
      {/* Grand total */}
      <div className="rounded-xl bg-white border p-5 text-center">
        <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Total do mes</p>
        <p className="text-3xl font-bold tabular-nums">{formatBRL(grandTotal)}</p>
        <p className="text-xs text-muted-foreground mt-1">{formatBRL(shareTotal)} por pessoa</p>
      </div>

      {/* Per-user breakdown */}
      <div className="grid grid-cols-2 gap-3">
        {sorted.map((u) => {
          const diff = u.total - shareTotal;
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
                    style={{ width: `${Math.min((Math.max(u.total, 0) / Math.max(grandTotal, 1)) * 100, 100)}%` }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Pending settlements */}
      {hasSettlements && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-amber-700 pl-1">
            {settlements.length === 1 ? "Acerto pendente" : "Acertos pendentes"}
          </p>
          {settlements.map((s, idx) => (
            <div key={idx} className="rounded-xl border-2 border-amber-200 bg-amber-50 p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="text-center">
                    <div className="w-10 h-10 rounded-full bg-white border-2 border-amber-400 flex items-center justify-center text-sm font-bold text-amber-600">
                      {s.from.charAt(0)}
                    </div>
                    <p className="text-xs mt-1 font-medium">{s.from}</p>
                  </div>

                  <div className="flex flex-col items-center">
                    <p className="text-lg font-bold tabular-nums">{formatBRL(s.amount)}</p>
                    <svg width="60" height="12" viewBox="0 0 60 12" className="text-amber-600 opacity-60">
                      <line x1="0" y1="6" x2="52" y2="6" stroke="currentColor" strokeWidth="2" />
                      <polygon points="52,1 60,6 52,11" fill="currentColor" />
                    </svg>
                  </div>

                  <div className="text-center">
                    <div className="w-10 h-10 rounded-full bg-white border-2 border-emerald-400 flex items-center justify-center text-sm font-bold text-emerald-600">
                      {s.to.charAt(0)}
                    </div>
                    <p className="text-xs mt-1 font-medium">{s.to}</p>
                  </div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-3 leading-relaxed">
                {s.from} deve transferir {formatBRL(s.amount)} para {s.to}.
              </p>
            </div>
          ))}
        </div>
      )}

      {/* No settlement needed */}
      {!hasSettlements && grandTotal > 0 && sorted.length >= 2 && (
        <div className="rounded-xl border-2 border-emerald-200 bg-emerald-50 p-5 text-center">
          <p className="text-sm font-medium text-emerald-700">Tudo acertado este mes!</p>
          <p className="text-xs text-emerald-600 mt-1">Ninguem deve nada.</p>
        </div>
      )}

      {/* Only one independent member */}
      {!hasSettlements && grandTotal > 0 && sorted.length < 2 && (
        <div className="rounded-xl border-2 border-amber-200 bg-amber-50 p-5 text-center">
          <p className="text-sm font-medium text-amber-700">Adicione mais membros para dividir</p>
          <p className="text-xs text-amber-600 mt-1">Convide alguém pelo código do grupo para calcular a divisão.</p>
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
