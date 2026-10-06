import "server-only";

// =============================================================================
// E-mail csatorna – előkészítve, KIKAPCSOLVA. A 8. fázisban (saját domain + Resend) kapcsoljuk be:
// EMAIL_ENABLED=true és RESEND_API_KEY a környezetben, és itt a Resend API hívása.
// =============================================================================

export type EmailMessage = { to: string; subject: string; text: string; url: string };

export function isEmailEnabled(): boolean {
  return process.env.EMAIL_ENABLED === "true" && Boolean(process.env.RESEND_API_KEY);
}

export async function sendEmail(message: EmailMessage): Promise<boolean> {
  if (!isEmailEnabled()) return false;
  // A 8. fázisban: fetch("https://api.resend.com/emails", …) a saját domain feladójával
  void message;
  return false;
}
