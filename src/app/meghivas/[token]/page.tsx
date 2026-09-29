import { requireUser } from "@/backend/auth/auth.service";
import { getInvitePreview } from "@/backend/shops/shops.service";
import { BarberApplicationForm } from "@/frontend/components/barber/BarberApplicationForm";
import { PageContainer } from "@/frontend/components/layout/PageContainer";
import { PageHeader } from "@/frontend/components/layout/PageHeader";
import { InviteAnswer } from "@/frontend/components/shops/InviteAnswer";
import { Alert } from "@/frontend/components/ui/Alert";
import { LinkButton } from "@/frontend/components/ui/Button";
import { Card } from "@/frontend/components/ui/Card";
import { ROUTES } from "@/shared/config/routes";
import { formatPhone } from "@/shared/validation/phone";

// /meghivas/[token] – meghívó egy egységbe: elfogadás / elutasítás (előtte, ha kell, barberprofil kitöltése)
export default async function InvitePage({ params }: PageProps<"/meghivas/[token]">) {
  const { token } = await params;
  const user = await requireUser(`${ROUTES.invite}/${token}`);
  const invite = await getInvitePreview(token);

  if (!invite) {
    return (
      <PageContainer centered>
        <PageHeader title="Meghívó" />
        <Alert tone="error">Ez a meghívó nem létezik. Ellenőrizd a linket, vagy kérj újat az egység vezetőjétől.</Alert>
      </PageContainer>
    );
  }

  const unusable =
    invite.status !== "pending"
      ? "Ezt a meghívót már felhasználták vagy visszavonták."
      : invite.isExpired
        ? "Ez a meghívó lejárt. Kérj újat az egység vezetőjétől."
        : !invite.isForMe
          ? `Ez a meghívó a(z) ${invite.email} címre szól, te pedig ${user.email} fiókkal vagy belépve. Lépj ki, és lépj be azzal a fiókkal.`
          : null;

  return (
    <PageContainer>
      <PageHeader eyebrow="Meghívó" title={invite.shopName} subtitle={`${invite.shopCity} – csatlakozz a csapathoz!`} />

      {unusable ? (
        <Alert tone="error">{unusable}</Alert>
      ) : !user.barber ? (
        // Barberprofil nélkül nem lehet csatlakozni – előbb töltse ki (a meghívó elfogadása egyben jóváhagyja)
        <Card title="1. lépés: a barberprofilod">
          <p className="text-sm text-muted">
            Töltsd ki a profilodat. A meghívó elfogadásával egyben jóváhagyott barber leszel – külön admin jóváhagyás nem kell.
          </p>
          <BarberApplicationForm
            initial={{
              displayName: user.fullName ?? "",
              slug: "",
              city: invite.shopCity,
              address: "",
              phone: user.phone ? formatPhone(user.phone) : "",
              bio: "",
              instagram: "",
            }}
            submitLabel="Profil mentése"
          />
        </Card>
      ) : (
        <Card title="Csatlakozol az egységhez?">
          <p className="text-muted">
            Csatlakozás után a vendégek a(z) <span className="font-semibold text-foreground">{invite.shopName}</span> oldalán
            találnak meg, önállóként nem jelensz meg a listában. A foglalásaidat továbbra is te kezeled, és bármikor
            kiléphetsz.
          </p>
          <InviteAnswer token={token} />
        </Card>
      )}

      {unusable && (
        <LinkButton href={ROUTES.home} variant="secondary">
          Vissza a főoldalra
        </LinkButton>
      )}
    </PageContainer>
  );
}
