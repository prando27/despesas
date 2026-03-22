"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function NewGroupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [groupType, setGroupType] = useState<"monthly" | "event">("monthly");
  const [inviteCode, setInviteCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"create" | "join">("create");

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/groups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, groupType }),
    });

    if (res.ok) {
      router.push("/expenses");
    } else {
      const data = await res.json();
      setError(data.error || "Erro ao criar grupo");
    }
    setLoading(false);
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/groups/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: inviteCode }),
    });

    if (res.ok) {
      router.push("/expenses");
    } else {
      const data = await res.json();
      setError(data.error || "Erro ao entrar no grupo");
    }
    setLoading(false);
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-center text-xl">
            {mode === "create" ? "Criar Grupo" : "Entrar no Grupo"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button
              variant={mode === "create" ? "default" : "outline"}
              size="sm"
              className="flex-1"
              onClick={() => { setMode("create"); setError(""); }}
            >
              Criar
            </Button>
            <Button
              variant={mode === "join" ? "default" : "outline"}
              size="sm"
              className="flex-1"
              onClick={() => { setMode("join"); setError(""); }}
            >
              Entrar com convite
            </Button>
          </div>

          {mode === "create" ? (
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome do grupo</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Despesas da Mae"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Tipo do grupo</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={groupType === "monthly" ? "default" : "outline"}
                    size="sm"
                    className="flex-1"
                    onClick={() => setGroupType("monthly")}
                  >
                    Mensal
                  </Button>
                  <Button
                    type="button"
                    variant={groupType === "event" ? "default" : "outline"}
                    size="sm"
                    className="flex-1"
                    onClick={() => setGroupType("event")}
                  >
                    Evento
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  {groupType === "monthly"
                    ? "Despesas recorrentes divididas por mês."
                    : "Evento único (viagem, churrasco). Sem divisão mensal."}
                </p>
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Criando..." : "Criar grupo"}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleJoin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="code">Código de convite</Label>
                <Input
                  id="code"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  placeholder="Ex: A3F8K2"
                  required
                  className="uppercase tracking-widest text-center text-lg"
                />
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Entrando..." : "Entrar no grupo"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
