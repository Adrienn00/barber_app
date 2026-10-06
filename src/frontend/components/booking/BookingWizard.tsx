"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { loadSlotsAction, requestBookingAction } from "@/backend/booking/booking.actions";
import { Alert } from "@/frontend/components/ui/Alert";
import { Button, LinkButton } from "@/frontend/components/ui/Button";
import { Card } from "@/frontend/components/ui/Card";
import { SubmitButton } from "@/frontend/components/ui/SubmitButton";
import { TextArea } from "@/frontend/components/ui/TextArea";
import { useFullPageRedirect } from "@/frontend/lib/useFullPageRedirect";
import { ROUTES } from "@/shared/config/routes";
import { formatDateTimeHu, toBucharestDate, toBucharestTime } from "@/shared/datetime/datetime";
import type { PublicService, Slot } from "@/shared/types/directory";
import type { FormState } from "@/shared/types/form";
import { type BookingDay, DayPicker } from "./DayPicker";
import { ServicePicker } from "./ServicePicker";
import { SlotGrid } from "./SlotGrid";
import { StepIndicator } from "./StepIndicator";

type BookingWizardProps = {
  barber: { id: string; name: string; address: string };
  services: PublicService[];
  days: BookingDay[];
  /** Előre kiválasztott szolgáltatás (pl. az árlistáról kattintva) */
  initialServiceId?: string;
  /** Előre kiválasztott időpont (belépés után ide térünk vissza – ne kelljen újra választani) */
  initialStartsAt?: string;
  /** Ide tér vissza belépés / profil kitöltése után */
  backTo: string;
  /** Be van-e lépve a vendég (ha nem, a küldés előtt belépteti, majd ide visszahozza) */
  isLoggedIn: boolean;
};

const STEPS = ["Szolgáltatás", "Időpont", "Megerősítés"];

/**
 * Foglalás lépésekben: szolgáltatás → nap és szabad időpont → megerősítés (megjegyzéssel).
 * A szabad időpontokat az adatbázis számolja; elküldéskor újra ellenőrzi, hogy még szabad-e.
 */
export function BookingWizard({ barber, services, days, initialServiceId, initialStartsAt, backTo, isLoggedIn }: BookingWizardProps) {
  const [service, setService] = useState<PublicService | null>(
    services.find((s) => s.id === initialServiceId) ?? (services.length === 1 ? services[0] : null),
  );
  // Belépés után visszatérve: a korábban kiválasztott időpont, egyenesen a megerősítéshez
  const resumed = service && initialStartsAt && !Number.isNaN(new Date(initialStartsAt).getTime())
    ? { startsAt: new Date(initialStartsAt).toISOString(), time: toBucharestTime(initialStartsAt) }
    : null;
  const [step, setStep] = useState(resumed ? 2 : service ? 1 : 0);
  const [date, setDate] = useState<string | null>(
    resumed ? toBucharestDate(resumed.startsAt) : (days.find((d) => d.open)?.date ?? null),
  );
  const [slots, setSlots] = useState<Slot[]>([]);
  const [slot, setSlot] = useState<Slot | null>(resumed);
  const [loading, startLoading] = useTransition();

  const [state, action] = useActionState<FormState, FormData>(requestBookingAction, {});
  const redirecting = useFullPageRedirect(state);

  // Szabad időpontok betöltése, ha változik a szolgáltatás vagy a nap
  useEffect(() => {
    if (!service || !date) return;
    startLoading(async () => {
      setSlots(await loadSlotsAction(barber.id, service.id, date));
    });
  }, [barber.id, service, date]);

  if (state.success) {
    return (
      <Card>
        <h2 className="text-3xl font-bold text-brass">Kérésed elküldtük!</h2>
        <p className="text-lg">
          {barber.name} hamarosan visszaigazolja: {service?.name}, {slot && formatDateTimeHu(slot.startsAt)}.
        </p>
        <p className="text-muted">A foglalás a jóváhagyással válik véglegessé. Az állapotát a Foglalásaim oldalon követheted.</p>
        <LinkButton href={ROUTES.myBookings}>Foglalásaim</LinkButton>
      </Card>
    );
  }

  return (
    <Card>
      <StepIndicator steps={STEPS} current={step} />

      {step === 0 && (
        <section className="space-y-4">
          <h2 className="text-3xl font-bold">Válaszd ki a szolgáltatást</h2>
          <ServicePicker
            services={services}
            selectedId={service?.id ?? null}
            onSelect={(s) => {
              setService(s);
              setSlot(null);
              setStep(1);
            }}
          />
        </section>
      )}

      {step === 1 && service && (
        <section className="space-y-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-3xl font-bold">Válassz időpontot</h2>
            <button type="button" onClick={() => setStep(0)} className="text-sm text-brass underline">
              {service.name} · {service.durationMin} perc – módosítás
            </button>
          </div>
          <DayPicker
            days={days}
            selected={date}
            onSelect={(d) => {
              setDate(d);
              setSlot(null);
            }}
          />
          <SlotGrid
            slots={slots}
            selected={slot?.startsAt ?? null}
            loading={loading}
            onSelect={(s) => {
              setSlot(s);
              setStep(2);
            }}
          />
        </section>
      )}

      {step === 2 && service && slot && (
        <form action={action} className="space-y-4">
          <h2 className="text-3xl font-bold">Ellenőrizd és küldd el</h2>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 rounded-xl border border-line bg-background p-4">
            <dt className="text-muted">Barber</dt>
            <dd className="font-semibold">{barber.name}</dd>
            <dt className="text-muted">Szolgáltatás</dt>
            <dd className="font-semibold">
              {service.name} · {service.durationMin} perc · {service.price} lej
            </dd>
            <dt className="text-muted">Időpont</dt>
            <dd className="font-semibold">{formatDateTimeHu(slot.startsAt)}</dd>
            <dt className="text-muted">Cím</dt>
            <dd>{barber.address}</dd>
          </dl>

          {state.error && <Alert tone="error">{state.error}</Alert>}
          <input type="hidden" name="serviceId" value={service.id} />
          <input type="hidden" name="startsAt" value={slot.startsAt} />
          {/* Belépés / profil kitöltése után ide, ugyanezzel a választással tér vissza */}
          <input
            type="hidden"
            name="backTo"
            value={`${backTo}?szolgaltatas=${service.id}&idopont=${encodeURIComponent(slot.startsAt)}`}
          />
          <TextArea
            label="Megjegyzés a barbernek (nem kötelező)"
            name="note"
            rows={2}
            placeholder="pl. rövidebbre szeretném oldalt"
            defaultValue={state.values?.note}
            error={state.fieldErrors?.note}
          />
          {isLoggedIn ? (
            <p className="text-sm text-muted">A foglalás a barber jóváhagyásával válik véglegessé – erről értesítünk.</p>
          ) : (
            <Alert tone="info">
              A kérés elküldéséhez be kell lépned (vagy regisztrálnod – egy perc). Utána ide térsz vissza, a választásod
              megmarad.
            </Alert>
          )}
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button variant="secondary" onClick={() => setStep(1)}>
              Vissza
            </Button>
            <SubmitButton pendingText={isLoggedIn ? "Küldés…" : "Átirányítás…"} forcePending={redirecting}>
              {isLoggedIn ? "Foglalási kérés küldése" : "Belépés és foglalás"}
            </SubmitButton>
          </div>
        </form>
      )}
    </Card>
  );
}
