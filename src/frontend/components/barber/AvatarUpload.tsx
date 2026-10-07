"use client";

import { useRef, useState, useTransition } from "react";
import { Alert } from "@/frontend/components/ui/Alert";
import { Avatar } from "@/frontend/components/ui/Avatar";
import { Button } from "@/frontend/components/ui/Button";
import { resizeToSquare } from "@/frontend/lib/resizeImage";
import type { FormState } from "@/shared/types/form";

type AvatarUploadProps = {
  url: string | null;
  name: string;
  /** Feltöltés (barber: uploadAvatarAction, egység: uploadShopAvatarAction) */
  uploadAction: (prev: FormState, formData: FormData) => Promise<FormState>;
  removeAction: () => Promise<FormState>;
  /** Pl. „Profilkép” vagy „Logó” */
  label?: string;
  hint?: string;
};

/** Profilkép / logó feltöltése, cseréje, törlése. A képet a böngésző előbb kicsinyíti (gyors feltöltés mobilon is). */
export function AvatarUpload({
  url,
  name,
  uploadAction,
  removeAction,
  label = "Profilkép",
  hint = "Egy jó, világos fotó rólad vagy a munkádról. A vendégek a listában és az oldaladon látják.",
}: AvatarUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [result, setResult] = useState<FormState | null>(null);
  const [busy, startTransition] = useTransition();

  function onPick(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setResult(null);
    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.append("avatar", await resizeToSquare(file));
        setResult(await uploadAction({}, formData));
      } catch {
        setResult({ error: "Ezt a képet nem sikerült beolvasni. Próbálj egy JPG vagy PNG fotót." });
      }
    });
  }

  function onRemove() {
    setResult(null);
    startTransition(async () => setResult(await removeAction()));
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4">
        <Avatar url={url} name={name} size={88} />
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" disabled={busy} onClick={() => inputRef.current?.click()}>
            {busy ? "Feltöltés…" : url ? "Kép cseréje" : `${label} feltöltése`}
          </Button>
          {url && (
            <Button variant="ghost" disabled={busy} onClick={onRemove}>
              Törlés
            </Button>
          )}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          aria-label={`${label} kiválasztása`}
          onChange={onPick}
        />
      </div>
      <p className="text-sm text-muted">{hint}</p>
      {result?.error && <Alert tone="error">{result.error}</Alert>}
      {result?.success && <Alert tone="success">{result.success}</Alert>}
    </div>
  );
}
