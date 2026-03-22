"use client";

import { useState } from "react";
import { useGroup } from "@/hooks/use-group";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSession } from "@/lib/auth-client";

export default function GroupConfigPage() {
  const { currentGroup, loading, refetch } = useGroup();
  const { data: session } = useSession();
  const [saving, setSaving] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [savingSplit, setSavingSplit] = useState(false);

  if (loading) return <div className="p-4">Carregando...</div>;
  if (!currentGroup) return <div className="p-4">Nenhum grupo encontrado.</div>;

  const isAdmin = currentGroup.members.find(
    (m) => m.id === session?.user.id
  )?.role === "admin";

  const independentMembers = currentGroup.members.filter((m) => !m.countAsId);

  async function handleCountAsChange(memberId: string, countAsId: string | null) {
    setSaving(memberId);
    await fetch("/api/groups/members", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        memberId,
        groupId: currentGroup!.id,
        countAsId,
      }),
    });
    await refetch();
    setSaving(null);
  }

  async function handleSplitTypeChange(splitType: string) {
    setSavingSplit(true);
    await fetch("/api/groups", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ groupId: currentGroup!.id, splitType }),
    });
    await refetch();
    setSavingSplit(false);
  }

  async function handleWeightChange(memberId: string, weight: number) {
    setSaving(memberId);
    await fetch("/api/groups", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        groupId: currentGroup!.id,
        memberWeights: { [memberId]: weight },
      }),
    });
    await refetch();
    setSaving(null);
  }

  function getInviteLink(countAsId?: string) {
    const base = `${window.location.origin}/invite/${currentGroup!.inviteCode}`;
    return countAsId ? `${base}?vinculo=${countAsId}` : base;
  }

  async function copyLink(key: string, countAsId?: string) {
    await navigator.clipboard.writeText(getInviteLink(countAsId));
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  }

  const totalWeight = independentMembers.reduce((s, m) => s + (m.weight || 1), 0);

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold">Configurações do Grupo</h1>

      {/* Info do grupo + convite */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{currentGroup.name}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground mb-1">Código de convite</p>
            <span className="text-xl font-bold tracking-widest">{currentGroup.inviteCode}</span>
          </div>

          <div className="space-y-2">
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => copyLink("normal")}
            >
              {copiedKey === "normal" ? "Link copiado!" : "Copiar link de convite"}
            </Button>

            {isAdmin && independentMembers.map((m) => (
              <Button
                key={m.id}
                variant="outline"
                className="w-full justify-start text-muted-foreground"
                onClick={() => copyLink(m.id, m.id)}
              >
                {copiedKey === m.id
                  ? "Link copiado!"
                  : `Copiar convite vinculado a ${m.name}`}
              </Button>
            ))}
          </div>

          {isAdmin && (
            <p className="text-xs text-muted-foreground">
              Um convite vinculado faz com que os lançamentos do convidado sejam contabilizados como se fossem da pessoa vinculada.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Tipo de divisão */}
      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tipo de divisão</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Button
                variant={currentGroup.splitType === "equal" ? "default" : "outline"}
                size="sm"
                disabled={savingSplit}
                onClick={() => handleSplitTypeChange("equal")}
              >
                Igual
              </Button>
              <Button
                variant={currentGroup.splitType === "weighted" ? "default" : "outline"}
                size="sm"
                disabled={savingSplit}
                onClick={() => handleSplitTypeChange("weighted")}
              >
                Por peso
              </Button>
              <Button
                variant={currentGroup.splitType === "per-expense" ? "default" : "outline"}
                size="sm"
                disabled={savingSplit}
                onClick={() => handleSplitTypeChange("per-expense")}
              >
                Por despesa
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {currentGroup.splitType === "equal"
                ? "Total dividido igualmente entre todos os membros."
                : currentGroup.splitType === "weighted"
                ? "Total dividido proporcionalmente ao peso de cada membro."
                : "Cada despesa é dividida apenas entre quem participou."}
            </p>

            {currentGroup.splitType === "weighted" && (
              <div className="space-y-2 pt-2 border-t">
                <p className="text-xs font-medium text-muted-foreground">Peso por membro</p>
                {independentMembers.map((m) => {
                  const pct = totalWeight > 0
                    ? Math.round(((m.weight || 1) / totalWeight) * 100)
                    : 0;
                  return (
                    <div key={m.memberId} className="flex items-center gap-3">
                      <span className="text-sm flex-1">{m.name}</span>
                      <Input
                        type="number"
                        min="1"
                        step="1"
                        className="w-20 text-center"
                        defaultValue={m.weight || 1}
                        disabled={saving === m.memberId}
                        onBlur={(e) => {
                          const v = parseInt(e.target.value);
                          if (v >= 1 && v !== m.weight) {
                            handleWeightChange(m.memberId, v);
                          }
                        }}
                      />
                      <span className="text-xs text-muted-foreground w-12 text-right">{pct}%</span>
                    </div>
                  );
                })}
                <p className="text-xs text-muted-foreground">
                  Ex: peso 3 e 2 = 60% e 40%. Peso 1 e 1 = 50% e 50%.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Membros */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Membros</CardTitle>
        </CardHeader>
        <CardContent className="space-y-0 divide-y">
          {currentGroup.members.map((member) => {
            const countAsName = member.countAsId
              ? currentGroup.members.find((m) => m.id === member.countAsId)?.name
              : null;

            return (
              <div key={member.memberId} className="py-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-gray-100 border flex items-center justify-center text-sm font-semibold text-gray-600">
                      {member.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        {member.name}
                        {member.role === "admin" && (
                          <span className="text-xs text-muted-foreground ml-1">(admin)</span>
                        )}
                      </p>
                      {countAsName ? (
                        <p className="text-xs text-amber-600">
                          Vinculado a {countAsName}
                        </p>
                      ) : (
                        <p className="text-xs text-muted-foreground">Independente</p>
                      )}
                    </div>
                  </div>

                  {isAdmin && member.id !== session?.user.id && (
                    <select
                      className="text-xs border rounded-md px-2 py-1.5 bg-white"
                      value={member.countAsId || ""}
                      disabled={saving === member.memberId}
                      onChange={(e) =>
                        handleCountAsChange(
                          member.memberId,
                          e.target.value || null
                        )
                      }
                    >
                      <option value="">Independente</option>
                      {independentMembers
                        .filter((m) => m.id !== member.id)
                        .map((m) => (
                          <option key={m.id} value={m.id}>
                            Vinculado a {m.name}
                          </option>
                        ))}
                    </select>
                  )}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
