import Link from "next/link";
import { isGoogleAuthEnabled } from "@/backend/auth/auth.service";
import { GoogleSignInButton } from "@/frontend/components/auth/GoogleSignInButton";
import { LoginForm } from "@/frontend/components/auth/LoginForm";
import { PageContainer } from "@/frontend/components/layout/PageContainer";
import { PageHeader } from "@/frontend/components/layout/PageHeader";
import { Alert } from "@/frontend/components/ui/Alert";
import { Divider } from "@/frontend/components/ui/Divider";
import { ROUTES, safeNextPath } from "@/shared/config/routes";

// /belepes – belépés e-maillel vagy Google-lel
export default async function LoginPage({ searchParams }: PageProps<"/belepes">) {
  const params = await searchParams;
  const next = safeNextPath(typeof params.next === "string" ? params.next : null) ?? undefined;
  const googleEnabled = await isGoogleAuthEnabled();

  return (
    <PageContainer centered>
      <PageHeader title="Belépés" subtitle="Örülünk, hogy újra itt vagy!" />
      {params.hiba && <Alert tone="error">A belépés nem sikerült. Próbáld újra.</Alert>}
      <GoogleSignInButton next={next} enabled={googleEnabled} />
      <Divider label="vagy e-maillel" />
      <LoginForm next={next} />
      <p className="text-center text-sm text-muted">
        Még nincs fiókod?{" "}
        <Link
          href={next ? `${ROUTES.register}?next=${encodeURIComponent(next)}` : ROUTES.register}
          className="text-brass underline"
        >
          Regisztrálj
        </Link>
      </p>
    </PageContainer>
  );
}
