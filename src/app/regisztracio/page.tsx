import Link from "next/link";
import { isGoogleAuthEnabled } from "@/backend/auth/auth.service";
import { GoogleSignInButton } from "@/frontend/components/auth/GoogleSignInButton";
import { RegisterForm } from "@/frontend/components/auth/RegisterForm";
import { PageContainer } from "@/frontend/components/layout/PageContainer";
import { PageHeader } from "@/frontend/components/layout/PageHeader";
import { Divider } from "@/frontend/components/ui/Divider";
import { loginPath, safeNextPath } from "@/shared/config/routes";

// /regisztracio – új fiók (vendégként; barberként a /barber-leszek oldalon lehet jelentkezni utána)
export default async function RegisterPage({ searchParams }: PageProps<"/regisztracio">) {
  const params = await searchParams;
  const next = safeNextPath(typeof params.next === "string" ? params.next : null) ?? undefined;
  const googleEnabled = await isGoogleAuthEnabled();

  return (
    <PageContainer centered>
      <PageHeader title="Regisztráció" subtitle="Egy fiókkal bármelyik barberhez foglalhatsz." />
      <GoogleSignInButton next={next} enabled={googleEnabled} />
      <Divider label="vagy e-maillel" />
      <RegisterForm next={next} />
      <p className="text-center text-sm text-muted">
        Van már fiókod?{" "}
        <Link href={loginPath(next)} className="text-brass underline">
          Lépj be
        </Link>
      </p>
    </PageContainer>
  );
}
