"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { serviceRowAction } from "@/backend/pricelist/pricelist.actions";
import { Badge } from "@/frontend/components/ui/Badge";
import { Icon } from "@/frontend/components/ui/Icon";
import type { FormState } from "@/shared/types/form";

export type ServiceRowData = { id: string; name: string; durationMin: number; price: number; isActive: boolean };

type ServiceRowProps = {
  service: ServiceRowData;
  isFirst: boolean;
  isLast: boolean;
  onEdit: () => void;
  onDone: (state: FormState) => void;
};

/** Egy szolgáltatás a listában: név, időtartam, ár + szerkesztés, elrejtés, törlés, sorrend. */
export function ServiceRow({ service, isFirst, isLast, onEdit, onDone }: ServiceRowProps) {
  // Az eredményt közvetlenül a művelet végén adjuk tovább: törléskor a sor eltűnik a listából,
  // így utólag (effectből) már nem tudná jelezni a sikert.
  const [, action] = useActionState<FormState, FormData>(async (prev, formData) => {
    const result = await serviceRowAction(prev, formData);
    onDone(result);
    return result;
  }, {});
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <li className={`rounded-xl border border-line bg-surface p-4 ${service.isActive ? "" : "opacity-60"}`}>
      <form action={action} className="flex flex-wrap items-center gap-3">
        <input type="hidden" name="serviceId" value={service.id} />

        <div className="flex flex-col">
          <RowButton op="up" label="Feljebb" disabled={isFirst}>
            ▲
          </RowButton>
          <RowButton op="down" label="Lejjebb" disabled={isLast}>
            ▼
          </RowButton>
        </div>

        <div className="min-w-40 flex-1">
          <p className="text-lg font-semibold">
            {service.name} {!service.isActive && <Badge>Rejtett</Badge>}
          </p>
          <p className="flex items-center gap-1.5 text-muted">
            <Icon name="clock" size={16} /> {service.durationMin} perc
            <span className="px-1">·</span>
            <span className="font-semibold text-brass">{service.price} lej</span>
          </p>
        </div>

        {confirmDelete ? (
          <div className="flex gap-2">
            <RowButton op="delete" label="Igen, törlöm" tone="danger">
              Igen, törlöm
            </RowButton>
            <button type="button" onClick={() => setConfirmDelete(false)} className="px-3 text-sm text-muted">
              Mégse
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={onEdit} className={chip}>
              Szerkesztés
            </button>
            <RowButton op={service.isActive ? "hide" : "show"} label={service.isActive ? "Elrejtés" : "Megjelenítés"}>
              {service.isActive ? "Elrejtés" : "Megjelenítés"}
            </RowButton>
            <button type="button" onClick={() => setConfirmDelete(true)} className={chip}>
              Törlés
            </button>
          </div>
        )}
      </form>
    </li>
  );
}

const chip = "min-h-10 rounded-lg border border-line px-3 text-sm font-semibold hover:border-brass hover:text-brass";

function RowButton({
  op,
  label,
  disabled,
  tone,
  children,
}: {
  op: string;
  label: string;
  disabled?: boolean;
  tone?: "danger";
  children: React.ReactNode;
}) {
  const { pending } = useFormStatus();
  const isArrow = op === "up" || op === "down";
  return (
    <button
      type="submit"
      name="op"
      value={op}
      aria-label={label}
      disabled={disabled || pending}
      className={
        isArrow
          ? "px-2 text-xs text-muted hover:text-brass disabled:opacity-20"
          : tone === "danger"
            ? "min-h-10 rounded-lg bg-danger px-3 text-sm font-semibold text-background disabled:opacity-50"
            : `${chip} disabled:opacity-50`
      }
    >
      {children}
    </button>
  );
}
