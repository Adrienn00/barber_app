import { Alert } from "@/frontend/components/ui/Alert";
import { isLegalInfoComplete } from "@/shared/config/legal";

/** Figyelmeztetés, amíg az üzemeltető adatai nincsenek kitöltve (src/shared/config/legal.ts). */
export function DraftNotice() {
  if (isLegalInfoComplete()) return null;
  return (
    <Alert tone="info">
      Tervezet: az üzemeltető adatai még hiányoznak (a szögletes zárójeles részek). Élesítés előtt ki kell tölteni,
      és érdemes jogásszal átnézetni.
    </Alert>
  );
}
