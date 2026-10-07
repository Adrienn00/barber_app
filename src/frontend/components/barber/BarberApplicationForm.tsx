"use client";

import { useActionState, useState } from "react";
import { useCollapseOnSave } from "@/frontend/lib/useCollapseOnSave";
import { saveBarberApplicationAction } from "@/backend/barbers/barbers.actions";
import { Alert } from "@/frontend/components/ui/Alert";
import { SubmitButton } from "@/frontend/components/ui/SubmitButton";
import { TextArea } from "@/frontend/components/ui/TextArea";
import { TextField } from "@/frontend/components/ui/TextField";
import { useSubmitWithoutReset } from "@/frontend/lib/useSubmitWithoutReset";
import type { FormState } from "@/shared/types/form";
import type { BarberApplicationInput } from "@/shared/validation/forms";
import { slugify } from "@/shared/validation/slug";

type BarberApplicationFormProps = {
  /** Meglévő jelentkezés adatai (javításhoz), vagy üres új jelentkezésnél */
  initial: BarberApplicationInput;
  submitLabel: string;
  /** Jóváhagyott barbernél a profil mentése (alapból: jelentkezés beküldése) */
  action?: (prev: FormState, formData: FormData) => Promise<FormState>;
  /** A link mezője alatti tipp (pl. hogy a régi link megszűnik) */
  slugHint?: string;
};

/** Barberprofil adatai: név, egyedi link, város, cím, telefon, bemutatkozás, Instagram (jelentkezéskor és utána is). */
export function BarberApplicationForm({
  initial,
  submitLabel,
  action: submit = saveBarberApplicationAction,
  slugHint = "Ezt a linket oszthatod meg a vendégeiddel. Kisbetű, szám, kötőjel.",
}: BarberApplicationFormProps) {
  const [state, action, pending] = useActionState<FormState, FormData>(submit, {});
  useCollapseOnSave(state);
  // Beküldés automatikus alaphelyzetbe állítás nélkül (élő mezők vannak az űrlapon)
  const onSubmit = useSubmitWithoutReset(action);
  const values = state.values ?? initial;

  // A linket a névből javasoljuk, amíg a felhasználó kézzel át nem írja
  const [displayName, setDisplayName] = useState(values.displayName);
  // Előre kitöltött névből is azonnal javaslunk linket (ha a nevet nem írják át, se maradjon üres)
  const [slug, setSlug] = useState(values.slug || slugify(values.displayName));
  const [slugTouched, setSlugTouched] = useState(Boolean(initial.slug));

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {state.error && <Alert tone="error">{state.error}</Alert>}
      {state.success && !state.warning && <Alert tone="success">{state.success}</Alert>}
      {state.warning && <Alert tone="info">{state.warning}</Alert>}

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
        hint={slugHint}
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
      <SubmitButton forcePending={pending} pendingText="Küldés…">{submitLabel}</SubmitButton>
    </form>
  );
}
