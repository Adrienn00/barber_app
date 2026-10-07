import type { Metadata } from "next";
import { requireApprovedBarber } from "@/backend/auth/auth.service";
import { removeAvatarAction, saveBarberProfileAction, uploadAvatarAction } from "@/backend/barbers/barbers.actions";
import { getMyBarberApplication } from "@/backend/barbers/barbers.service";
import { listMyServicesForEdit } from "@/backend/pricelist/pricelist.service";
import { getMyBookingRules, getMyWorkingWeek, getSetupStatus } from "@/backend/schedule/schedule.service";
import { AvatarUpload } from "@/frontend/components/barber/AvatarUpload";
import { BarberApplicationForm } from "@/frontend/components/barber/BarberApplicationForm";
import { SetupDone } from "@/frontend/components/barber/SetupDone";
import { SETUP_STEPS, SetupWizardNav } from "@/frontend/components/barber/SetupWizardNav";
import { PageContainer } from "@/frontend/components/layout/PageContainer";
import { PageHeader } from "@/frontend/components/layout/PageHeader";
import { PriceListEditor } from "@/frontend/components/pricelist/PriceListEditor";
import { BookingRulesForm } from "@/frontend/components/schedule/BookingRulesForm";
import { WorkingHoursEditor } from "@/frontend/components/schedule/WorkingHoursEditor";
import { Card } from "@/frontend/components/ui/Card";
import { StepIndicator } from "@/frontend/components/ui/StepIndicator";
import { ROUTES, barberPath } from "@/shared/config/routes";

export const metadata: Metadata = { title: "Kezdés" };

const INTRO = [
  "Így látnak a vendégek: egy jó kép és pár mondat rólad sokat számít.",
  "Mit vállalsz, mennyi idő nálad, mennyibe kerül. Az időtartamot és az árat te adod meg.",
  "Mely napokon és mikor foglalhatnak. Ebédszünetet is felvehetsz (egy napon több sáv).",
  "Az alapértékek a legtöbb barbernek jók – ha nem tudod, hagyd így, később is átírhatod.",
  "",
];

// /kezdes?lepes=1..5 – beállító varázsló az új barbernek (a jóváhagyó értesítés ide visz).
// Minden lépés ugyanazt a szerkesztőt használja, mint a Beállítások oldal.
export default async function SetupWizardPage({ searchParams }: PageProps<"/kezdes">) {
  const user = await requireApprovedBarber(ROUTES.barberSetup);
  const barberId = user.barber!.id;
  const raw = Number((await searchParams).lepes);
  const step = Number.isInteger(raw) && raw >= 1 && raw <= SETUP_STEPS.length ? raw - 1 : 0;

  const [profile, services, week, rules, status] = await Promise.all([
    getMyBarberApplication(user.id),
    listMyServicesForEdit(barberId),
    getMyWorkingWeek(barberId),
    getMyBookingRules(barberId),
    getSetupStatus(barberId),
  ]);
  const publicPath = barberPath(user.barber!.slug);

  const blockedReason =
    step === 1 && !status.hasServices
      ? "Vegyél fel legalább egy szolgáltatást a továbblépéshez."
      : step === 2 && !status.hasWorkingHours
        ? "Add meg és mentsd el a munkaidődet a továbblépéshez."
        : undefined;

  return (
    <PageContainer width="wide">
      <PageHeader eyebrow="Kezdés" title={`${step + 1}. ${SETUP_STEPS[step]}`} />
      <StepIndicator steps={SETUP_STEPS} current={step} />
      {INTRO[step] && <p className="text-muted">{INTRO[step]}</p>}

      {step === 0 && profile && (
        <Card>
          <AvatarUpload
            url={profile.avatarUrl}
            name={profile.displayName}
            uploadAction={uploadAvatarAction}
            removeAction={removeAvatarAction}
          />
          <BarberApplicationForm
            initial={profile}
            submitLabel="Mentés"
            action={saveBarberProfileAction}
            slugHint="Ezt a linket osztod meg a vendégeiddel."
          />
        </Card>
      )}
      {step === 1 && <PriceListEditor services={services} />}
      {step === 2 && <WorkingHoursEditor initial={week} />}
      {step === 3 && rules && <BookingRulesForm initial={rules} />}
      {step === 4 && profile && <SetupDone status={status} publicPath={publicPath} isListed={profile.isListed} />}

      <SetupWizardNav step={step} blockedReason={blockedReason} />
    </PageContainer>
  );
}
