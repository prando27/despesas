"use client";

import { Receipt, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ExtractionOverlayProps {
  state: "loading" | "error" | "hidden";
  errorMessage?: string;
  onRetry: () => void;
  onDismiss: () => void;
}

export function ExtractionOverlay({ state, errorMessage, onRetry, onDismiss }: ExtractionOverlayProps) {
  if (state === "hidden") return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="mx-4 w-full max-w-xs rounded-2xl bg-white p-6 shadow-2xl">
        {state === "loading" ? (
          <div className="flex flex-col items-center gap-4">
            {/* Receipt icon with scan line */}
            <div className="relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-xl bg-primary/10">
              <Receipt className="h-10 w-10 text-primary" />
              <div className="absolute left-0 h-0.5 w-full animate-scan bg-gradient-to-r from-transparent via-primary to-transparent" />
            </div>

            <div className="text-center">
              <p className="font-semibold text-foreground">
                Extraindo itens do cupom
                <span className="inline-flex w-6 justify-start">
                  <span className="animate-pulse">...</span>
                </span>
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Isso pode levar alguns segundos
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 animate-shake">
            {/* Error icon */}
            <div className="flex h-20 w-20 items-center justify-center rounded-xl bg-destructive/10">
              <AlertCircle className="h-10 w-10 text-destructive" />
            </div>

            <div className="text-center">
              <p className="font-semibold text-foreground">Erro na extração</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {errorMessage || "Não foi possível extrair os itens do cupom."}
              </p>
            </div>

            <div className="flex w-full flex-col gap-2">
              <Button onClick={onRetry} className="w-full">
                Tentar novamente
              </Button>
              <Button variant="ghost" onClick={onDismiss} className="w-full">
                Fechar
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
