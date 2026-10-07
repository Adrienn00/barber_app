"use client";

import {
  type ReactNode,
  createContext,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { Icon } from "./Icon";

/** A benne lévő űrlapok ezen keresztül jelzik a sikeres mentést (lásd useCollapseOnSave) */
export const CollapsibleSectionContext = createContext<{ saved: () => void } | null>(null);

type CollapsibleSectionProps = {
  /** Horgony (pl. „munkaido”): ha az oldal címe #munkaido-ra végződik, nyitva indul */
  id: string;
  title: string;
  /** Rövid összefoglaló összecsukva (pl. „H–P 09:00–17:00”) */
  summary: ReactNode;
  /** Nyitva induljon (pl. ha még nincs kitöltve) */
  defaultOpen?: boolean;
  children: ReactNode;
};

function subscribeHash(onChange: () => void) {
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
}

/**
 * Összecsukható rész: összecsukva csak a cím és egy rövid összefoglaló látszik, kattintásra lenyílik.
 * Ha a benne lévő űrlap sikeresen mentett, „Mentve ✓” jelzés után magától visszacsukódik.
 */
export function CollapsibleSection({ id, title, summary, defaultOpen = false, children }: CollapsibleSectionProps) {
  const bodyId = useId();
  const hash = useSyncExternalStore(subscribeHash, () => window.location.hash, () => "");
  // null: még nem nyúlt hozzá a felhasználó → az alapállapot (vagy a címbeli horgony) dönt
  const [userOpen, setUserOpen] = useState<boolean | null>(null);
  const [flash, setFlash] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const open = userOpen ?? (defaultOpen || hash === `#${id}`);

  // Ugrás erre a részre (pl. a felső gyorslinkekkel) mindig kinyitja
  useEffect(() => {
    const onHash = () => {
      if (window.location.hash === `#${id}`) setUserOpen(true);
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, [id]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const saved = useCallback(() => {
    setFlash(true);
    timers.current.push(
      setTimeout(() => setUserOpen(false), 900),
      setTimeout(() => setFlash(false), 4000),
    );
  }, []);

  const context = useMemo(() => ({ saved }), [saved]);

  return (
    <CollapsibleSectionContext.Provider value={context}>
      <section id={id} className="scroll-mt-24 rounded-xl border border-line bg-surface">
        <h2>
          <button
            type="button"
            aria-expanded={open}
            aria-controls={bodyId}
            onClick={() => setUserOpen(!open)}
            className="group flex w-full items-center gap-4 rounded-xl px-5 py-4 text-left sm:px-6"
          >
            <span className="min-w-0 flex-1">
              <span className="block font-display text-2xl font-bold">{title}</span>
              {!open && <span className="mt-1 line-clamp-2 font-sans text-sm font-normal text-muted">{summary}</span>}
            </span>
            {flash ? (
              <span className="ct-alert shrink-0 font-sans text-sm font-semibold text-ok">Mentve ✓</span>
            ) : (
              <span className="hidden shrink-0 font-sans text-sm font-semibold text-brass sm:inline">{open ? "Bezárás" : "Szerkesztés"}</span>
            )}
            <Icon
              name="chevronDown"
              size={20}
              className={`shrink-0 text-muted transition-transform duration-300 group-hover:text-brass ${open ? "rotate-180" : ""}`}
            />
          </button>
        </h2>
        {/* Lenyíló rész: a magasság finoman nő / csökken; összecsukva nem érhető el billentyűzettel sem */}
        <div
          id={bodyId}
          inert={!open}
          className={`grid transition-[grid-template-rows] duration-300 ease-out ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
        >
          <div className="min-h-0 overflow-hidden">
            <div className="space-y-4 border-t border-line px-5 pt-4 pb-6 sm:px-6">{children}</div>
          </div>
        </div>
      </section>
    </CollapsibleSectionContext.Provider>
  );
}
