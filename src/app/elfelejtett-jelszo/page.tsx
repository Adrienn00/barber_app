import type { Metadata } from "next";
import Link from "next/link";
import { ForgotPasswordForm } from "@/frontend/components/auth/ForgotPasswordForm";
import { PageContainer } from "@/frontend/components/layout/PageContainer";
import { PageHeader } from "@/frontend/components/layout/PageHeader";
import { ROUTES } from "@/shared/config/routes";

export const metadata: Metadata = { title: "Elfelejtett jelszó" };

// /elfelejtett-jelszo – visszaállító link kérése e-mailben
export default function ForgotPasswordPage() {
  return (
    <PageContainer centered>
      <PageHeader title="Elfelejtett jelszó" subtitle="Küldünk egy linket, amivel új jelszót adhatsz meg." />
      <ForgotPasswordForm />
      <p className="text-center text-sm text-muted">
        Eszedbe jutott?{" "}
        <Link href={ROUTES.login} className="text-brass underline">
          Vissza a belépéshez
        </Link>
      </p>
    </PageContainer>
  );
}
