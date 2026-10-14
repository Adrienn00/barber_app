"use client";

import Image from "next/image";
import { useEffect, useRef, useState, useTransition } from "react";
import { saveCutNoteAction } from "@/backend/cutlog/cutlog.actions";
import { Alert } from "@/frontend/components/ui/Alert";
import { Button } from "@/frontend/components/ui/Button";
import { Icon } from "@/frontend/components/ui/Icon";
import { TextArea } from "@/frontend/components/ui/TextArea";
import { resizeToFit } from "@/frontend/lib/resizeImage";
import { CUT_NOTE_MAX, type CutEntry } from "@/shared/types/cutlog";
import type { FormState } from "@/shared/types/form";

type CutNoteFormProps = {
  bookingId: string;
  current: CutEntry | null;
  /** Sikeres mentés után (a napló újratöltéséhez) */
  onSaved: () => void;
};

/**
 * Vágásnapló szerkesztése egy lezajlott foglaláshoz: fotó (kamera vagy galéria) és rövid jegyzet.
 * A fotót a böngésző előbb kicsinyíti, így telefonról is gyors.
 */
export function CutNoteForm({ bookingId, current, onSaved }: CutNoteFormProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [note, setNote] = useState(current?.note ?? "");
  // Az új (még nem mentett) fotó és az előnézeti linkje
  const [photo, setPhotoState] = useState<{ file: File; url: string } | null>(null);
  const [removePhoto, setRemovePhoto] = useState(false);
  const [result, setResult] = useState<FormState | null>(null);
  const [busy, startTransition] = useTransition();

  // A régi előnézeti linket felszabadítjuk (cserénél, mentés után és bezáráskor)
  function setPhoto(file: File | null) {
    setPhotoState((old) => {
      if (old) URL.revokeObjectURL(old.url);
      return file ? { file, url: URL.createObjectURL(file) } : null;
    });
  }
  const latest = useRef(photo);
  useEffect(() => {
    latest.current = photo;
  }, [photo]);
  useEffect(() => () => {
    if (latest.current) URL.revokeObjectURL(latest.current.url);
  }, []);

  const shownPhoto = photo?.url ?? (removePhoto ? null : current?.photoUrl ?? null);
  const dirty = photo !== null || removePhoto || note.trim() !== (current?.note ?? "");

  function onPick(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setResult(null);
    startTransition(async () => {
      try {
        setPhoto(await resizeToFit(file));
        setRemovePhoto(false);
      } catch {
        setResult({ error: "Ezt a képet nem sikerült beolvasni. Próbálj egy JPG vagy PNG fotót." });
      }
    });
  }

  function onRemovePhoto() {
    setPhoto(null);
    setRemovePhoto(true);
  }

  function onSave() {
    setResult(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.append("note", note);
      if (photo) formData.append("photo", photo.file);
      formData.append("removePhoto", String(removePhoto));
      const state = await saveCutNoteAction(bookingId, {}, formData);
      setResult(state);
      if (!state.error) {
        setPhoto(null);
        setRemovePhoto(false);
        onSaved();
      }
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        {shownPhoto && (
          <Image
            src={shownPhoto}
            alt="A vágás fotója"
            width={96}
            height={96}
            unoptimized
            className="size-24 rounded-lg border border-line object-cover"
          />
        )}
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" disabled={busy} onClick={() => inputRef.current?.click()}>
            <Icon name="camera" size={18} /> {shownPhoto ? "Másik fotó" : "Fotó hozzáadása"}
          </Button>
          {shownPhoto && (
            <Button variant="ghost" disabled={busy} onClick={onRemovePhoto}>
              Fotó törlése
            </Button>
          )}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          aria-label="Fotó kiválasztása"
          onChange={onPick}
        />
      </div>
      <TextArea
        label="Jegyzet"
        name="note"
        rows={3}
        maxLength={CUT_NOTE_MAX}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Pl. oldalt 1-es fade, felül ollóval 4 cm, szakáll 3 mm"
        hint="A vendég is látja a foglalásainál – legközelebb megmutathatja: „ugyanezt kérem”."
      />
      {result?.error && <Alert tone="error">{result.error}</Alert>}
      {result?.success && !dirty && <Alert tone="success">{result.success}</Alert>}
      <Button fullWidth disabled={busy || !dirty} onClick={onSave}>
        {busy ? "Mentés…" : "Mentés a vágásnaplóba"}
      </Button>
    </div>
  );
}
