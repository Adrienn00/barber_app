import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { isEmailEnabled, parseSender, renderEmail, sendEmail } = await import("./notifications.email");

const message = { to: "anna@pelda.ro", title: "Foglalásod megerősítve", body: "Peti <b>Barber</b> · 10:00", url: "/foglalasaim" };

describe("e-mail csatorna", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("kikapcsolva (alapállapot) nem küld semmit", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    expect(isEmailEnabled()).toBe(false);
    expect(await sendEmail(message)).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("a levél a szöveget biztonságosan (HTML nélkül) teszi bele, és az app megfelelő oldalára mutat", () => {
    const { html, text } = renderEmail(message, "https://chairtime.ro/");
    expect(html).toContain("Peti &lt;b&gt;Barber&lt;/b&gt;");
    expect(html).not.toContain("<b>Barber</b>");
    expect(html).toContain('href="https://chairtime.ro/foglalasaim"');
    expect(text).toContain("https://chairtime.ro/foglalasaim");
  });

  it("feladó: név és cím szétválasztása", () => {
    expect(parseSender("ChairTime <chairtime.ertesites@gmail.com>")).toEqual({
      name: "ChairTime",
      email: "chairtime.ertesites@gmail.com",
    });
    expect(parseSender("cim@pelda.hu")).toEqual({ email: "cim@pelda.hu" });
  });

  it("Brevo (alapértelmezett): a Brevo API-nak küldi, a feladó névvel", async () => {
    vi.stubEnv("EMAIL_ENABLED", "true");
    vi.stubEnv("BREVO_API_KEY", "xkeysib-teszt");
    vi.stubEnv("EMAIL_FROM", "ChairTime <chairtime.ertesites@gmail.com>");
    vi.stubEnv("APP_URL", "https://chairtime.vercel.app");
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    expect(await sendEmail(message)).toBe(true);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.brevo.com/v3/smtp/email");
    expect(init.headers["api-key"]).toBe("xkeysib-teszt");
    expect(JSON.parse(init.body)).toMatchObject({
      sender: { name: "ChairTime", email: "chairtime.ertesites@gmail.com" },
      to: [{ email: "anna@pelda.ro" }],
      subject: "Foglalásod megerősítve",
    });
  });

  it("Resend (saját domainnel): a Resend API-nak küldi", async () => {
    vi.stubEnv("EMAIL_PROVIDER", "resend");
    vi.stubEnv("EMAIL_ENABLED", "true");
    vi.stubEnv("RESEND_API_KEY", "re_teszt");
    vi.stubEnv("EMAIL_FROM", "ChairTime <ertesites@chairtime.ro>");
    vi.stubEnv("APP_URL", "https://chairtime.ro");
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    expect(await sendEmail(message)).toBe(true);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.resend.com/emails");
    expect(init.headers.Authorization).toBe("Bearer re_teszt");
    expect(JSON.parse(init.body)).toMatchObject({
      from: "ChairTime <ertesites@chairtime.ro>",
      to: ["anna@pelda.ro"],
      subject: "Foglalásod megerősítve",
    });
  });
});
