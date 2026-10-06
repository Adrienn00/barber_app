import "server-only";

// =============================================================================
// E-mail csatorna (Resend). Csak akkor küld, ha be van kapcsolva:
//   EMAIL_ENABLED=true, RESEND_API_KEY, EMAIL_FROM (pl. "ChairTime <ertesites@chairtime.ro>"), APP_URL
// A Resend csak igazolt saját domainről enged küldeni – ezért kapcsoljuk be az élesítéskor (8. fázis).
// =============================================================================

export type EmailMessage = { to: string; title: string; body: string; url: string };

export function isEmailEnabled(): boolean {
  return (
    process.env.EMAIL_ENABLED === "true" &&
    Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM && process.env.APP_URL)
  );
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** Az értesítés levélként: márkás, sötét keret, cím, szöveg és egy gomb az app megfelelő oldalára */
export function renderEmail(message: Omit<EmailMessage, "to">, appUrl: string): { html: string; text: string } {
  const link = `${appUrl.replace(/\/$/, "")}${message.url}`;
  const title = escapeHtml(message.title);
  const body = escapeHtml(message.body);
  const html = `<!doctype html><html lang="hu"><body style="margin:0;background:#13100d;font-family:Arial,Helvetica,sans-serif;color:#f2ebe1">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#1c1814;border:1px solid #332c25;border-radius:12px;padding:28px">
<tr><td style="font-size:22px;font-weight:bold;letter-spacing:3px;color:#d4a95e;padding-bottom:20px">CHAIRTIME</td></tr>
<tr><td style="font-size:20px;font-weight:bold;padding-bottom:12px">${title}</td></tr>
<tr><td style="font-size:15px;line-height:1.5;color:#a89d90;padding-bottom:24px">${body}</td></tr>
<tr><td><a href="${escapeHtml(link)}" style="display:inline-block;background:#d4a95e;color:#13100d;font-weight:bold;text-decoration:none;padding:14px 22px;border-radius:8px">Megnyitás az appban</a></td></tr>
</table>
<p style="font-size:12px;color:#a89d90;padding-top:16px">Ezt a levelet a ChairTime küldte, mert van fiókod nálunk.</p>
</td></tr></table></body></html>`;
  const text = `${message.title}\n\n${message.body}\n\n${link}\n\n– ChairTime`;
  return { html, text };
}

/** Egy levél elküldése. Kikapcsolt csatornánál nem csinál semmit (false). */
export async function sendEmail(message: EmailMessage): Promise<boolean> {
  if (!isEmailEnabled()) return false;
  const { html, text } = renderEmail(message, process.env.APP_URL!);
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: process.env.EMAIL_FROM, to: [message.to], subject: message.title, html, text }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
