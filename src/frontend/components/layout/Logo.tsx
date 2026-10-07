import Link from "next/link";
import { Icon } from "@/frontend/components/ui/Icon";
import { APP_NAME } from "@/shared/config/app";
import { ROUTES } from "@/shared/config/routes";

/** Az app logója: arany négyzetben olló + a név nagybetűvel, ritkítva. A főoldalra visz. */
export function Logo() {
  return (
    <Link href={ROUTES.home} className="ct-snip flex items-center gap-3" aria-label={`${APP_NAME} – főoldal`}>
      <span className="flex size-10 items-center justify-center rounded-lg bg-[linear-gradient(135deg,#e2bb73,#b88c42)] text-background shadow-[0_4px_14px_-6px_rgb(212_169_94/0.7)]">
        <Icon name="scissors" size={20} className="ct-snip-icon" />
      </span>
      <span className="font-display text-xl font-bold uppercase tracking-[0.18em]">{APP_NAME}</span>
    </Link>
  );
}
