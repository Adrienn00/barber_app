"use client";

import { useState } from "react";

/** A barber nyilvános linkje „Másolás” gombbal (pl. Instagramra, WhatsAppra). */
export function ShareLinkButton({ path }: { path: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(`${window.location.origin}${path}`);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }}
      className="inline-flex items-center gap-2 rounded-full border border-line px-4 py-2 text-sm font-semibold hover:border-brass hover:text-brass"
    >
      {copied ? "Link kimásolva ✓" : `Foglalási linkem másolása (${path})`}
    </button>
  );
}
