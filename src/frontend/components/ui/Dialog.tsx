"use client";

import { type ReactNode, useEffect, useRef } from "react";

type DialogProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
};

/**
 * Felugró ablak. Telefonon alulról felcsúszó lap, nagyobb képernyőn középre igazított ablak.
 * Esc-re, a háttérre kattintva vagy a × gombbal bezárható.
 */
export function Dialog({ open, onClose, title, children }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        // Kattintás a sötét háttérre (magára a dialog elemre, nem a tartalmára) → bezárás
        if (e.target === e.currentTarget) onClose();
      }}
      className="ct-dialog m-0 mt-auto max-h-[90dvh] w-full max-w-none rounded-t-2xl border border-line bg-surface p-0 text-foreground backdrop:bg-black/60 backdrop:backdrop-blur-sm sm:m-auto sm:max-w-lg sm:rounded-2xl"
    >
      {open && (
        <div className="space-y-5 p-6">
          <div className="flex items-start justify-between gap-4">
            <h2 className="text-2xl font-bold">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Bezárás"
              className="-mt-1 -mr-2 flex size-10 items-center justify-center rounded-lg text-2xl text-muted hover:bg-line hover:text-foreground"
            >
              ×
            </button>
          </div>
          {children}
        </div>
      )}
    </dialog>
  );
}
