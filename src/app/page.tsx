import { EntryCard } from "@/frontend/components/home/EntryCard";
import { PageContainer } from "@/frontend/components/layout/PageContainer";
import { PageHeader } from "@/frontend/components/layout/PageHeader";
import { Button, LinkButton } from "@/frontend/components/ui/Button";
import { ROUTES } from "@/shared/config/routes";

// Kezdőlap: két belépési pont – vendégeknek és barbereknek
export default function HomePage() {
  return (
    <PageContainer centered>
      <PageHeader
        eyebrow="Időpontfoglalás"
        title="Friss fazon, pár kattintással."
        subtitle="Foglalj időpontot a barberedhez, vagy kezeld a saját naptárad."
      />
      <div className="grid gap-4">
        <EntryCard
          title="Barbert keresel?"
          description="Válaszd ki a barberedet, a szolgáltatást és egy szabad időpontot."
          // A barberlista a 4. fázisban készül el
          action={
            <Button fullWidth disabled>
              Barberek böngészése – hamarosan
            </Button>
          }
        />
        <EntryCard
          title="Barber vagy?"
          description="Regisztrálj, és a vendégeid online kérhetnek időpontot tőled. Te döntöd el, mit fogadsz el."
          action={
            <LinkButton href={ROUTES.becomeBarber} variant="secondary" fullWidth>
              Csatlakozom barberként
            </LinkButton>
          }
        />
      </div>
    </PageContainer>
  );
}
