import type { ReactNode } from "react";

/** Az oldal tartalmát keretező, mobilra optimalizált keskeny oszlop. */
export function PageContainer({ children }: { children: ReactNode }) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-8 px-5 py-12">
      {children}
    </main>
  );
}
