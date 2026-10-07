import type { ReactNode } from "react";

// Minden oldalváltáskor újra létrejön (a layouttal ellentétben), így az oldal finoman beúszik.
// A frissítés (pl. élő adatfrissítés) nem hozza létre újra – ott nincs animáció.
export default function Template({ children }: { children: ReactNode }) {
  return <div className="ct-page flex flex-1 flex-col">{children}</div>;
}
