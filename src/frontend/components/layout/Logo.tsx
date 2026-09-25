import Link from "next/link";
import { Icon } from "@/frontend/components/ui/Icon";
import { APP_NAME } from "@/shared/config/app";
import { ROUTES } from "@/shared/config/routes";

/** Az app logója: arany négyzetben olló + a név nagybetűvel, ritkítva. A főoldalra visz. */
export function Logo() {
  return (
    <Link href={ROUTES.home} className="flex items-center gap-3" aria-label={`${APP_NAME} – főoldal`}>
      <span className="flex size-10 items-center justify-center rounded-lg bg-brass text-background">
        <Icon name="scissors" size={20} />
      </span>
      <span className="font-display text-xl font-bold uppercase tracking-[0.18em]">{APP_NAME}</span>
    </Link>
  );
}
