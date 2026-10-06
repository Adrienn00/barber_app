"use client";

import { useState, useTransition } from "react";
import { setTrustedAction } from "@/backend/customers/customers.actions";
import type { MyCustomer } from "@/backend/customers/customers.service";
import { Badge } from "@/frontend/components/ui/Badge";
import { formatDateHu } from "@/shared/datetime/datetime";

/** Egy vendég: név, telefon, látogatások; „Megbízható” kapcsoló (a kérése azonnal megerősítésre kerül). */
export function CustomerRow({ customer }: { customer: MyCustomer }) {
  const [trusted, setTrusted] = useState(customer.isTrusted);
  const [error, setError] = useState<string | null>(null);
  const [busy, startTransition] = useTransition();

  function toggle(next: boolean) {
    setTrusted(next);
    setError(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.append("customerId", customer.id);
      formData.append("trusted", String(next));
      const state = await setTrustedAction({}, formData);
      if (state.error) {
        setTrusted(!next);
        setError(state.error);
      }
    });
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-1">
        <p className="flex flex-wrap items-center gap-2 font-semibold">
          {customer.name}
          {trusted && <Badge tone="success">Megbízható</Badge>}
        </p>
        {customer.phone && (
          <a href={`tel:${customer.phone.replace(/\s/g, "")}`} className="text-sm text-brass underline">
            {customer.phone}
          </a>
        )}
        <p className="text-sm text-muted">
          {customer.visits} látogatás
          {customer.lastVisit && ` · utoljára: ${formatDateHu(customer.lastVisit)}`}
          {customer.nextVisit && ` · következő: ${formatDateHu(customer.nextVisit)}`}
        </p>
        {error && <p className="text-sm text-danger">{error}</p>}
      </div>
      <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold">
        <input
          type="checkbox"
          checked={trusted}
          disabled={busy}
          onChange={(e) => toggle(e.target.checked)}
          className="size-5 accent-[var(--color-brass)]"
        />
        Megbízható
      </label>
    </div>
  );
}
