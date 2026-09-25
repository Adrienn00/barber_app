import { requireUser } from "@/backend/auth/auth.service";
import { PageContainer } from "@/frontend/components/layout/PageContainer";
import { PageHeader } from "@/frontend/components/layout/PageHeader";
import { ProfileForm } from "@/frontend/components/profile/ProfileForm";
import { Alert } from "@/frontend/components/ui/Alert";
import { ROUTES, safeNextPath } from "@/shared/config/routes";
import { formatPhone } from "@/shared/validation/phone";

// /profil – saját adatok; az első foglalás / barberjelentkezés előtt kötelező kitölteni
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
      <ProfileForm
        email={user.email}
        fullName={user.fullName ?? ""}
        phone={user.phone ? formatPhone(user.phone) : ""}
        needsTerms={!user.termsAccepted}
        next={next}
      />
    </PageContainer>
  );
}
