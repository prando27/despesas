"use client";

import { useState } from "react";
import { useGroup } from "@/hooks/use-group";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSession } from "@/lib/auth-client";

export default function GrupoConfigPage() {
  const { currentGroup, loading, refetch } = useGroup();
  const { data: session } = useSession();
  const [saving, setSaving] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

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

  function getInviteLink(countAsId?: string) {
    const base = `${window.location.origin}/convite/${currentGroup!.inviteCode}`;
    return countAsId ? `${base}?vinculo=${countAsId}` : base;
  }

  async function copyLink(key: string, countAsId?: string) {
    await navigator.clipboard.writeText(getInviteLink(countAsId));
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  }

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
