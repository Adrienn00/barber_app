import { requireApprovedBarber } from "@/backend/auth/auth.service";
import { PageContainer } from "@/frontend/components/layout/PageContainer";
import { PageHeader } from "@/frontend/components/layout/PageHeader";
import { Card } from "@/frontend/components/ui/Card";
import { ROUTES } from "@/shared/config/routes";

// /naptar – a barber naptára (a naptár maga a 3. fázisban készül el)
export default async function CalendarPage() {
  const user = await requireApprovedBarber(ROUTES.barberCalendar);

  return (
    <PageContainer width="wide">
      <PageHeader eyebrow="Barber felület" title={`Szia, ${user.barber?.displayName}!`} />
      <Card title="Naptár">
        <p className="text-muted">
          Itt fogod látni és kezelni a foglalásaidat és a magánprogramjaidat. A naptár a következő fázisban készül el.
        </p>
        <p className="text-sm text-muted">
          A nyilvános linked: <span className="text-foreground">/b/{user.barber?.slug}</span>
        </p>
      </Card>
    </PageContainer>
  );
}
