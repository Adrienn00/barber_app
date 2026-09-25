import { redirect } from "next/navigation";
import { getCurrentUser } from "@/backend/auth/auth.service";
import { getMyBarberApplication } from "@/backend/barbers/barbers.service";
import { ApplicationStatusCard } from "@/frontend/components/barber/ApplicationStatusCard";
import { BarberApplicationForm } from "@/frontend/components/barber/BarberApplicationForm";
import { BecomeBarberIntro } from "@/frontend/components/barber/BecomeBarberIntro";
import { PageContainer } from "@/frontend/components/layout/PageContainer";
import { PageHeader } from "@/frontend/components/layout/PageHeader";
import { LinkButton } from "@/frontend/components/ui/Button";
import { ROUTES, loginPath } from "@/shared/config/routes";
import { formatPhone } from "@/shared/validation/phone";

// /barber-leszek – barberjelentkezés: bemutató, űrlap, majd a jelentkezés állapota
export default async function BecomeBarberPage() {
  const user = await getCurrentUser();

  // Nincs bejelentkezve: bemutató + regisztráció/belépés
  if (!user) {
    return (
      <PageContainer>
        <PageHeader eyebrow="Barbereknek" title="Csatlakozz barberként" subtitle="Így működik:" />
        <BecomeBarberIntro />
        <div className="space-y-3">
          <LinkButton href={`${ROUTES.register}?next=${ROUTES.becomeBarber}`} fullWidth>
            Regisztrálok
          </LinkButton>
          <LinkButton href={loginPath(ROUTES.becomeBarber)} variant="secondary" fullWidth>
            Van fiókom, belépek
          </LinkButton>
        </div>
      </PageContainer>
    );
  }

  if (!user.isProfileComplete) redirect(`${ROUTES.profile}?next=${ROUTES.becomeBarber}`);

  const application = user.barber ? await getMyBarberApplication(user.id) : null;
  const canEdit = !application || application.status === "pending" || application.status === "rejected";

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Barbereknek"
        title={application ? "Barberjelentkezésem" : "Csatlakozz barberként"}
        subtitle={application ? undefined : "Így működik:"}
      />
      {application ? (
        <ApplicationStatusCard status={application.status} rejectReason={application.rejectReason} />
      ) : (
        <BecomeBarberIntro />
      )}
      {canEdit && (
        <BarberApplicationForm
          initial={
            application ?? {
              displayName: user.fullName ?? "",
              slug: "",
              city: "",
              address: "",
              phone: user.phone ? formatPhone(user.phone) : "",
              bio: "",
              instagram: "",
            }
          }
          submitLabel={
            !application
              ? "Jelentkezés elküldése"
              : application.status === "rejected"
                ? "Javítás és újraküldés"
                : "Adatok mentése"
          }
        />
      )}
    </PageContainer>
  );
}
