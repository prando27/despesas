"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSession } from "@/lib/auth-client";

interface GroupInfo {
  name: string;
  countAsName: string | null;
}

export default function ConvitePage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const code = params.code as string;
  const countAsId = searchParams.get("vinculo");
  const { data: session, isPending } = useSession();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [groupInfo, setGroupInfo] = useState<GroupInfo | null>(null);

  const conviteUrl = `/convite/${code}${countAsId ? `?vinculo=${countAsId}` : ""}`;

  useEffect(() => {
    async function fetchGroupInfo() {
      const res = await fetch(`/api/groups/info?code=${code}&countAsId=${countAsId || ""}`);
      if (res.ok) {
        const data = await res.json();
        setGroupInfo(data);
      }
    }
    fetchGroupInfo();
  }, [code, countAsId]);

  async function handleJoin() {
    if (!session) {
      // Redirecionar para cadastro com redirect de volta
      router.push(`/cadastro?redirect=${encodeURIComponent(conviteUrl)}`);
      return;
    }

    setLoading(true);
    setError("");

    const res = await fetch("/api/groups/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, ...(countAsId ? { countAsId } : {}) }),
    });

    const data = await res.json();

    if (res.ok) {
      router.push("/despesas");
    } else if (res.status === 409) {
      router.push("/despesas");
    } else {
      setError(data.error || "Erro ao entrar no grupo");
    }
    setLoading(false);
  }

  if (isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-center text-xl">Convite</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <p className="text-muted-foreground">
            Você foi convidado para o grupo:
          </p>
          {groupInfo?.name ? (
            <p className="text-lg font-semibold">{groupInfo.name}</p>
          ) : (
            <p className="text-2xl font-bold tracking-widest">{code?.toUpperCase()}</p>
          )}
          {groupInfo?.countAsName && (
            <p className="text-sm text-muted-foreground">
              Seus lançamentos contarão como <span className="font-medium text-foreground">{groupInfo.countAsName}</span>
            </p>
          )}
          {!session && (
            <p className="text-sm text-muted-foreground">
              Você precisa criar uma conta para entrar no grupo.
            </p>
          )}
          {error && <p className="text-sm text-red-500">{error}</p>}
          <Button className="w-full" onClick={handleJoin} disabled={loading}>
            {loading ? "Entrando..." : session ? "Aceitar convite" : "Criar conta e entrar"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
