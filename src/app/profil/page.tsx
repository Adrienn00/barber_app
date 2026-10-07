import { requireUser } from "@/backend/auth/auth.service";
import { PageContainer } from "@/frontend/components/layout/PageContainer";
import { PageHeader } from "@/frontend/components/layout/PageHeader";
import { DeleteAccount } from "@/frontend/components/profile/DeleteAccount";
import { ProfileForm } from "@/frontend/components/profile/ProfileForm";
import { Alert } from "@/frontend/components/ui/Alert";
import { CollapsibleSection } from "@/frontend/components/ui/CollapsibleSection";
import { ROUTES, safeNextPath } from "@/shared/config/routes";
import { formatPhone } from "@/shared/validation/phone";

// /profil – saját adatok; az első foglalás / barberjelentkezés előtt kötelező kitölteni. Alul: fiók törlése.
export default async function ProfilePage({ searchParams }: PageProps<"/profil">) {
  const user = await requireUser(ROUTES.profile);
  const params = await searchParams;
  const next = safeNextPath(typeof params.next === "string" ? params.next : null) ?? undefined;

  return (
    <PageContainer>
      <PageHeader title="Profilom" />
      {!user.isProfileComplete && (
        <Alert tone="info">Mielőtt továbblépsz, add meg a neved és a telefonszámod.</Alert>
      )}
      <CollapsibleSection
        id="adataim"
        title="Adataim"
        summary={[user.fullName, user.phone ? formatPhone(user.phone) : null, user.email].filter(Boolean).join(" · ")}
        defaultOpen={!user.isProfileComplete}
      >
        <ProfileForm
          email={user.email}
          fullName={user.fullName ?? ""}
          phone={user.phone ? formatPhone(user.phone) : ""}
          needsTerms={!user.termsAccepted}
          next={next}
        />
      </CollapsibleSection>
      <DeleteAccount isBarber={Boolean(user.barber)} isAdmin={user.isAdmin} />
    </PageContainer>
  );
}
