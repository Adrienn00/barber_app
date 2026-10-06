import "server-only";

// =============================================================================
// E-mail csatorna. Csak akkor küld, ha be van kapcsolva:
//   EMAIL_ENABLED=true, EMAIL_FROM (pl. "ChairTime <chairtime.ertesites@gmail.com>"), APP_URL, és a szolgáltató:
//   - EMAIL_PROVIDER=brevo  + BREVO_API_KEY  – domain nélkül is (a Brevóban igazolt feladó címről), napi 300 ingyen
//   - EMAIL_PROVIDER=resend + RESEND_API_KEY – csak igazolt saját domainről
// =============================================================================

export type EmailMessage = { to: string; title: string; body: string; url: string };

type Provider = "brevo" | "resend";

function provider(): Provider {
  return process.env.EMAIL_PROVIDER === "resend" ? "resend" : "brevo";
}

function apiKey(): string | undefined {
  return provider() === "brevo" ? process.env.BREVO_API_KEY : process.env.RESEND_API_KEY;
}

export function isEmailEnabled(): boolean {
  return process.env.EMAIL_ENABLED === "true" && Boolean(apiKey() && process.env.EMAIL_FROM && process.env.APP_URL);
}

/** "ChairTime <cim@pelda.hu>" → { name: "ChairTime", email: "cim@pelda.hu" } */
export function parseSender(from: string): { name?: string; email: string } {
  const match = from.match(/^\s*(.*?)\s*<([^>]+)>\s*$/);
  return match ? { name: match[1] || undefined, email: match[2] } : { email: from.trim() };
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
  const from = process.env.EMAIL_FROM!;
  try {
    const res =
      provider() === "brevo"
        ? await fetch("https://api.brevo.com/v3/smtp/email", {
            method: "POST",
            headers: { "api-key": apiKey()!, "Content-Type": "application/json", Accept: "application/json" },
            body: JSON.stringify({
              sender: parseSender(from),
              to: [{ email: message.to }],
              subject: message.title,
              htmlContent: html,
              textContent: text,
            }),
          })
        : await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: { Authorization: `Bearer ${apiKey()}`, "Content-Type": "application/json" },
            body: JSON.stringify({ from, to: [message.to], subject: message.title, html, text }),
          });
    return res.ok;
  } catch {
    return false;
  }
}
