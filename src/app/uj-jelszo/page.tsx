import type { Metadata } from "next";
import { requireUser } from "@/backend/auth/auth.service";
import { NewPasswordForm } from "@/frontend/components/auth/NewPasswordForm";
import { PageContainer } from "@/frontend/components/layout/PageContainer";
import { PageHeader } from "@/frontend/components/layout/PageHeader";
import { ROUTES } from "@/shared/config/routes";

export const metadata: Metadata = { title: "Új jelszó" };

// /uj-jelszo – a jelszó-visszaállító levél linkje ide hoz (már belépve); bejelentkezve bárki itt cserélhet jelszót
export default async function NewPasswordPage() {
  await requireUser(ROUTES.newPassword);
  return (
    <PageContainer centered>
      <PageHeader title="Új jelszó" subtitle="Add meg az új jelszavad." />
      <NewPasswordForm />
    </PageContainer>
  );
}
