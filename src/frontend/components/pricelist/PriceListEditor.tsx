"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert } from "@/frontend/components/ui/Alert";
import { Button } from "@/frontend/components/ui/Button";
import { Dialog } from "@/frontend/components/ui/Dialog";
import type { FormState } from "@/shared/types/form";
import { ServiceForm } from "./ServiceForm";
import { ServiceRow, type ServiceRowData } from "./ServiceRow";

/** A barber árlistája: szolgáltatások saját időtartammal és árral, szerkesztés felugró ablakban. */
export function PriceListEditor({ services, embedded = false }: { services: ServiceRowData[]; embedded?: boolean }) {
  const router = useRouter();
  const [editing, setEditing] = useState<ServiceRowData | "new" | null>(null);
  const [notice, setNotice] = useState<FormState | null>(null);

  function handleDone(state: FormState) {
    setNotice(state);
    if (state.success) setEditing(null);
    router.refresh();
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          {!embedded && <h2 className="text-2xl font-bold">Szolgáltatásaim</h2>}
          <p className="text-muted">Te döntöd el, mennyi idő nálad egy-egy szolgáltatás, és mennyibe kerül.</p>
        </div>
        <Button onClick={() => setEditing("new")}>+ Új szolgáltatás</Button>
      </div>

      {notice?.error && <Alert tone="error">{notice.error}</Alert>}
      {notice?.success && <Alert tone="success">{notice.success}</Alert>}

      {services.length === 0 ? (
        <Alert tone="info">Még nincs szolgáltatásod. Vegyél fel legalább egyet, hogy a vendégek foglalhassanak nálad.</Alert>
      ) : (
        <ul className="space-y-3">
          {services.map((s, i) => (
            <ServiceRow
              key={s.id}
              service={s}
              isFirst={i === 0}
              isLast={i === services.length - 1}
              onEdit={() => setEditing(s)}
              onDone={handleDone}
            />
          ))}
        </ul>
      )}

      <Dialog
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing === "new" ? "Új szolgáltatás" : "Szolgáltatás szerkesztése"}
      >
        {editing !== null && (
          <ServiceForm
            key={editing === "new" ? "new" : editing.id}
            service={editing === "new" ? undefined : editing}
            onSaved={handleDone}
          />
        )}
      </Dialog>
    </section>
  );
}
