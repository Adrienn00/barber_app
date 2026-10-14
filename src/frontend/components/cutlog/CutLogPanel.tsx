"use client";

import { useCallback, useEffect, useState } from "react";
import { loadCutLogAction } from "@/backend/cutlog/cutlog.actions";
import { Icon } from "@/frontend/components/ui/Icon";
import type { CutLog } from "@/shared/types/cutlog";
import { CutEntryView } from "./CutEntryView";
import { CutNoteForm } from "./CutNoteForm";

/**
 * Vágásnapló a foglalás ablakában: lezajlott foglalásnál fotó + jegyzet mentése, és mindig a vendég
 * korábbi vágásai ennél a barbernél („mit csináltam legutóbb?”).
 */
export function CutLogPanel({ bookingId }: { bookingId: string }) {
  const [log, setLog] = useState<CutLog | null>(null);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    setLog(await loadCutLogAction(bookingId).catch(() => null));
    setLoaded(true);
  }, [bookingId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- betöltés megnyitáskor
    void load();
  }, [load]);

  if (!loaded) return <p className="text-sm text-muted">Vágásnapló betöltése…</p>;
  if (!log || (!log.canEdit && log.history.length === 0)) return null;

  return (
    <section className="space-y-4 rounded-lg border border-line px-4 py-3">
      <h3 className="flex items-center gap-2 font-semibold">
        <Icon name="scissors" size={18} className="text-brass" /> Vágásnapló
      </h3>

      {log.canEdit && <CutNoteForm bookingId={bookingId} current={log.current} onSaved={load} />}

      {log.history.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-semibold text-muted">Korábbi vágásai nálad</p>
          {log.history.map((entry) => (
            <CutEntryView key={entry.bookingId} entry={entry} compact />
          ))}
        </div>
      )}
    </section>
  );
}
