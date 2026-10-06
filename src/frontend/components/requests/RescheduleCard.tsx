"use client";

import { useActionState, useState } from "react";
import { resolveRescheduleAction } from "@/backend/requests/requests.actions";
import type { OpenReschedule } from "@/backend/requests/requests.service";
import { Alert } from "@/frontend/components/ui/Alert";
import { Badge } from "@/frontend/components/ui/Badge";
import { Button } from "@/frontend/components/ui/Button";
import { Icon } from "@/frontend/components/ui/Icon";
import { SubmitButton } from "@/frontend/components/ui/SubmitButton";
import { TextArea } from "@/frontend/components/ui/TextArea";
import { formatDateTimeHu } from "@/shared/datetime/datetime";
import type { FormState } from "@/shared/types/form";
import { WithdrawProposalButton } from "./WithdrawProposalButton";

/**
 * Egy áthelyezési ügy a „Függő kérések” oldalon:
 * - a vendég válaszára vár → visszavonható;
 * - a vendég nem fogadta el / nem válaszolt → a barber dönt: marad a régi, vagy lemondja (indoklással).
 */
export function RescheduleCard({ item }: { item: OpenReschedule }) {
  const [state, formAction] = useActionState<FormState, FormData>(resolveRescheduleAction, {});
  const [cancelling, setCancelling] = useState(false);

  return (
    <article className="space-y-4 rounded-xl border border-line bg-surface p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="flex items-center gap-2 font-semibold">
          <Icon name="user" size={18} className="text-brass" /> {item.customerName} · {item.serviceName}
        </p>
        {item.needsDecision ? (
          <Badge tone="danger">{item.status === "declined" ? "Nem fogadta el" : "Nem válaszolt"}</Badge>
        ) : (
          <Badge tone="warning">Válaszra vár</Badge>
        )}
      </div>

      <p className="rounded-lg bg-background px-4 py-3">
        <span className="text-muted">Most: </span>
        <span className="font-semibold">{formatDateTimeHu(item.oldStartsAt)}</span>
        <br />
        <span className="text-muted">Javasolt: </span>
        <span className={item.needsDecision ? "text-muted line-through" : "font-semibold text-brass"}>
          {formatDateTimeHu(item.newStartsAt)}
        </span>
      </p>

      {item.customerPhone && (
        <a href={`tel:${item.customerPhone.replace(/\s/g, "")}`} className="flex items-center gap-2 text-brass underline">
          <Icon name="phone" size={18} /> {item.customerPhone}
        </a>
      )}

      {!item.needsDecision ? (
        <>
          <p className="text-sm text-muted">Válaszolhat: {formatDateTimeHu(item.expiresAt)}-ig.</p>
          <WithdrawProposalButton rescheduleId={item.id} />
        </>
      ) : state.success ? (
        <Alert tone="success">{state.success}</Alert>
      ) : (
        <form action={formAction} className="space-y-3">
          <input type="hidden" name="rescheduleId" value={item.id} />
          <p className="text-sm">Mi legyen a régi időponttal?</p>
          {state.error && <Alert tone="error">{state.error}</Alert>}
          {cancelling ? (
            <>
              <input type="hidden" name="decision" value="cancel" />
              <TextArea label="A lemondás oka (a vendég látja)" name="note" rows={2} maxLength={500} error={state.fieldErrors?.note} />
              <div className="flex gap-2">
                <SubmitButton variant="danger" pendingText="Mentés…">
                  Foglalás lemondása
                </SubmitButton>
                <Button variant="ghost" onClick={() => setCancelling(false)}>
                  Vissza
                </Button>
              </div>
            </>
          ) : (
            <div className="flex gap-2">
              <SubmitButton name="decision" value="keep" pendingText="Mentés…">
                Marad a régi
              </SubmitButton>
              <Button variant="secondary" fullWidth onClick={() => setCancelling(true)}>
                Lemondom
              </Button>
            </div>
          )}
        </form>
      )}
    </article>
  );
}
