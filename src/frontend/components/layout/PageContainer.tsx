import type { ReactNode } from "react";

type PageContainerProps = {
  children: ReactNode;
  /** narrow: űrlapok (alapból), wide: listák, admin felület */
  width?: "narrow" | "wide";
  /** Függőlegesen középre (pl. belépés oldal) */
  centered?: boolean;
};

/** Az oldal tartalmát keretező, mobilra optimalizált oszlop. */
export function PageContainer({ children, width = "narrow", centered = false }: PageContainerProps) {
  return (
    <main
      className={`mx-auto flex w-full flex-1 flex-col gap-8 px-5 py-10 ${width === "wide" ? "max-w-3xl" : "max-w-md"} ${
        centered ? "justify-center" : ""
      }`}
    >
      {children}
    </main>
  );
}
