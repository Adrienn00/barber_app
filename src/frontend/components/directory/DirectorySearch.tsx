import { Button } from "@/frontend/components/ui/Button";

/** Keresés név vagy város szerint (sima űrlap: az URL-ben marad, megosztható) */
export function DirectorySearch({ defaultValue }: { defaultValue: string }) {
  return (
    <form method="get" role="search" className="flex gap-2">
      <input
        type="search"
        name="q"
        defaultValue={defaultValue}
        placeholder="Név vagy város, pl. Kolozsvár"
        aria-label="Keresés név vagy város szerint"
        className="min-h-13 flex-1 rounded-lg border border-line bg-surface px-4 outline-none focus:border-brass"
      />
      <Button type="submit">Keresés</Button>
    </form>
  );
}
