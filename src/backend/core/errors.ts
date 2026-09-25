import "server-only";

type SupabaseLikeError = { code?: string; message?: string } | null | undefined;

/** Supabase Auth hibák magyarul (a kód alapján, mert az üzenet angol). */
export function authErrorMessage(error: SupabaseLikeError): string {
  switch (error?.code) {
    case "invalid_credentials":
      return "Hibás e-mail-cím vagy jelszó.";
    case "email_not_confirmed":
      return "Még nem erősítetted meg az e-mail-címed. Nézd meg a leveleidet.";
    case "user_already_exists":
    case "email_exists":
      return "Ezzel az e-mail-címmel már van fiók. Lépj be, vagy kérj új jelszót.";
    case "weak_password":
      return "Túl gyenge jelszó. Használj hosszabbat, számmal és betűvel.";
    case "over_email_send_rate_limit":
    case "over_request_rate_limit":
      return "Túl sok próbálkozás. Várj pár percet, és próbáld újra.";
    case "signup_disabled":
      return "A regisztráció jelenleg szünetel.";
    default:
      return "Valami hiba történt. Próbáld újra.";
  }
}

/** Adatbázis-hibák magyarul. A saját függvényeink (raise exception) üzenete már magyar. */
export function dbErrorMessage(error: SupabaseLikeError, fallback = "Nem sikerült menteni. Próbáld újra."): string {
  switch (error?.code) {
    case "23505":
      return "Ez az érték már foglalt.";
    case "23514":
      return "Valamelyik adat nem megfelelő formátumú.";
    case "42501":
      return "Nincs jogosultságod ehhez a művelethez.";
    case "22023":
    case "P0002":
      return error.message ?? fallback;
    default:
      return fallback;
  }
}
