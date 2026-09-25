"use client";

import { useActionState, useState } from "react";
import { saveBarberApplicationAction } from "@/backend/barbers/barbers.actions";
import { Alert } from "@/frontend/components/ui/Alert";
import { SubmitButton } from "@/frontend/components/ui/SubmitButton";
import { TextArea } from "@/frontend/components/ui/TextArea";
import { TextField } from "@/frontend/components/ui/TextField";
import type { FormState } from "@/shared/types/form";
import type { BarberApplicationInput } from "@/shared/validation/forms";
import { slugify } from "@/shared/validation/slug";

type BarberApplicationFormProps = {
  /** Meglévő jelentkezés adatai (javításhoz), vagy üres új jelentkezésnél */
  initial: BarberApplicationInput;
  submitLabel: string;
};

/** Barberprofil adatai: név, egyedi link, város, cím, telefon, bemutatkozás, Instagram. */
export function BarberApplicationForm({ initial, submitLabel }: BarberApplicationFormProps) {
  const [state, action] = useActionState<FormState, FormData>(saveBarberApplicationAction, {});
  const values = state.values ?? initial;

  // A linket a névből javasoljuk, amíg a felhasználó kézzel át nem írja
  const [displayName, setDisplayName] = useState(values.displayName);
  const [slug, setSlug] = useState(values.slug);
  const [slugTouched, setSlugTouched] = useState(Boolean(initial.slug));

  return (
    <form action={action} className="space-y-4" noValidate>
      {state.error && <Alert tone="error">{state.error}</Alert>}
      {state.success && <Alert tone="success">{state.success}</Alert>}

      <TextField
        label="Megjelenített név"
        name="displayName"
        placeholder="pl. Peti Barber"
        value={displayName}
        onChange={(e) => {
          setDisplayName(e.target.value);
          if (!slugTouched) setSlug(slugify(e.target.value));
        }}
        error={state.fieldErrors?.displayName}
      />
      <TextField
        label="Egyedi link"
        name="slug"
        prefix="/b/"
        value={slug}
        onChange={(e) => {
          setSlugTouched(true);
          setSlug(e.target.value.toLowerCase());
        }}
        hint="Ezt a linket oszthatod meg a vendégeiddel. Kisbetű, szám, kötőjel."
        error={state.fieldErrors?.slug}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="Város" name="city" defaultValue={values.city} error={state.fieldErrors?.city} />
        <TextField
          label="Telefonszám"
          name="phone"
          type="tel"
          inputMode="tel"
          defaultValue={values.phone}
          error={state.fieldErrors?.phone}
        />
      </div>
      <TextField
        label="Cím"
        name="address"
        placeholder="utca, házszám"
        defaultValue={values.address}
        error={state.fieldErrors?.address}
      />
      <TextArea
        label="Rövid bemutatkozás (nem kötelező)"
        name="bio"
        defaultValue={values.bio}
        error={state.fieldErrors?.bio}
      />
      <TextField
        label="Instagram (nem kötelező)"
        name="instagram"
        prefix="@"
        defaultValue={values.instagram}
        error={state.fieldErrors?.instagram}
      />
      <SubmitButton pendingText="Küldés…">{submitLabel}</SubmitButton>
    </form>
  );
}
