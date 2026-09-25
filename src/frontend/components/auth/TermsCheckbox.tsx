import Link from "next/link";
import { Checkbox } from "@/frontend/components/ui/Checkbox";
import { ROUTES } from "@/shared/config/routes";

/** „Elfogadom a feltételeket” jelölőnégyzet a két jogi oldal linkjével. */
export function TermsCheckbox({ error }: { error?: string }) {
  return (
    <Checkbox
      name="terms"
      error={error}
      label={
        <>
          Elfogadom a{" "}
          <Link href={ROUTES.terms} target="_blank" className="text-brass underline">
            felhasználási feltételeket
          </Link>{" "}
          és az{" "}
          <Link href={ROUTES.privacy} target="_blank" className="text-brass underline">
            adatvédelmi tájékoztatót
          </Link>
          .
        </>
      }
    />
  );
}
