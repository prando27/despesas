"use client";

import { Suspense } from "react";
import { TransferForm } from "@/components/transfer-form";

export default function TransferPage() {
  return (
    <Suspense fallback={<p className="text-center text-muted-foreground py-8">Carregando...</p>}>
      <div className="space-y-4">
        <h1 className="text-lg font-semibold">Registrar pagamento</h1>
        <TransferForm />
      </div>
    </Suspense>
  );
}
