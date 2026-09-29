"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { leaveShopAction } from "@/backend/shops/shops.actions";
import { Alert } from "@/frontend/components/ui/Alert";
import { Card } from "@/frontend/components/ui/Card";
import { ConfirmActionButton } from "@/frontend/components/ui/ConfirmActionButton";
import type { FormState } from "@/shared/types/form";

/** Tagként: melyik egységhez tartozol, és a kilépés lehetősége (utána újra önálló barber leszel). */
export function MembershipCard({ shopName }: { shopName: string }) {
  const router = useRouter();
  const [result, setResult] = useState<FormState | null>(null);

  return (
    <Card title="Az egységed">
      <p>
        A(z) <span className="font-semibold text-brass">{shopName}</span> csapatának tagja vagy. A vendégek az egység oldalán
        találnak meg; önállóként nem jelensz meg a listában.
      </p>
      {result?.error && <Alert tone="error">{result.error}</Alert>}
      <ConfirmActionButton
        action={leaveShopAction}
        label="Kilépés az egységből"
        confirmLabel="Igen, kilépek"
        question="Újra önálló barber leszel, a foglalásaid megmaradnak."
        onDone={(state) => {
          setResult(state);
          if (state.success) router.refresh();
        }}
      />
    </Card>
  );
}
