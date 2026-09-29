"use client";

import { useActionState, useState } from "react";
import { saveShopAction } from "@/backend/shops/shops.actions";
import { Alert } from "@/frontend/components/ui/Alert";
import { SubmitButton } from "@/frontend/components/ui/SubmitButton";
import { TextArea } from "@/frontend/components/ui/TextArea";
import { TextField } from "@/frontend/components/ui/TextField";
import type { FormState } from "@/shared/types/form";
import type { ShopInput } from "@/shared/validation/forms";
import { slugify } from "@/shared/validation/slug";

type ShopFormProps = {
  initial: ShopInput;
  submitLabel: string;
};

/** Az egység adatai: név, egyedi link, város, cím, telefon, bemutatkozás, Instagram. */
export function ShopForm({ initial, submitLabel }: ShopFormProps) {
  const [state, action] = useActionState<FormState, FormData>(saveShopAction, {});
  const values = { ...initial, ...state.values };

  // A linket a névből javasoljuk, amíg kézzel át nem írják
  const [name, setName] = useState(values.name);
  // Előre kitöltött névből is azonnal javaslunk linket
  const [slug, setSlug] = useState(values.slug || slugify(values.name));
  const [slugTouched, setSlugTouched] = useState(Boolean(initial.slug));

  return (
    <form action={action} className="space-y-4" noValidate>
      {state.error && <Alert tone="error">{state.error}</Alert>}
      {state.success && <Alert tone="success">{state.success}</Alert>}

      <TextField
        label="Az egység neve"
        name="name"
        placeholder="pl. Klasszik Barbershop"
        value={name}
        onChange={(e) => {
          setName(e.target.value);
          if (!slugTouched) setSlug(slugify(e.target.value));
        }}
        error={state.fieldErrors?.name}
      />
      <TextField
        label="Egyedi link"
        name="slug"
        prefix="/u/"
        value={slug}
        onChange={(e) => {
          setSlugTouched(true);
          setSlug(e.target.value.toLowerCase());
        }}
        hint="Ezen a linken éri el a vendég az egységet és a csapatot."
        error={state.fieldErrors?.slug}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="Város" name="city" defaultValue={values.city} error={state.fieldErrors?.city} />
        <TextField label="Telefonszám" name="phone" type="tel" inputMode="tel" defaultValue={values.phone} error={state.fieldErrors?.phone} />
      </div>
      <TextField label="Cím" name="address" placeholder="utca, házszám" defaultValue={values.address} error={state.fieldErrors?.address} />
      <TextArea label="Bemutatkozás (nem kötelező)" name="bio" defaultValue={values.bio} error={state.fieldErrors?.bio} />
      <TextField label="Instagram (nem kötelező)" name="instagram" prefix="@" defaultValue={values.instagram} error={state.fieldErrors?.instagram} />
      <SubmitButton pendingText="Mentés…">{submitLabel}</SubmitButton>
    </form>
  );
}
