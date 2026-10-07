import type { Metadata } from "next";
import { getDirectory } from "@/backend/directory/directory.service";
import { DirectoryCard } from "@/frontend/components/directory/DirectoryCard";
import { DirectorySearch } from "@/frontend/components/directory/DirectorySearch";
import { PageContainer } from "@/frontend/components/layout/PageContainer";
import { PageHeader } from "@/frontend/components/layout/PageHeader";
import { Alert } from "@/frontend/components/ui/Alert";
import { Reveal } from "@/frontend/components/ui/Reveal";

export const metadata: Metadata = { title: "Barberek" };

// /barberek – kereshető lista: egységek és önálló barberek (csak akiknél lehet foglalni)
export default async function DirectoryPage({ searchParams }: PageProps<"/barberek">) {
  const params = await searchParams;
  const search = typeof params.q === "string" ? params.q.trim() : "";
  const entries = await getDirectory(search || null);

  return (
    <PageContainer width="wide">
      <PageHeader eyebrow="Időpontfoglalás" title="Válaszd ki a barbered" subtitle="Keress név vagy város szerint." />
      <DirectorySearch defaultValue={search} />
      {entries.length === 0 ? (
        <Alert tone="info">
          {search ? `Nincs találat erre: „${search}”. Próbáld más névvel vagy várossal.` : "Még nincs foglalható barber."}
        </Alert>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {entries.map((e, i) => (
            <Reveal key={`${e.kind}-${e.slug}`} index={i} className="flex">
              <DirectoryCard entry={e} />
            </Reveal>
          ))}
        </div>
      )}
    </PageContainer>
  );
}
