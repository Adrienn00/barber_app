import { beforeEach, describe, expect, it, vi } from "vitest";

// A push-küldés eredménye: kiment / a feliratkozás megszűnt (törölni kell) / később újra
vi.mock("server-only", () => ({}));
const sendNotification = vi.fn();
vi.mock("web-push", () => ({ default: { setVapidDetails: vi.fn(), sendNotification } }));

const { sendPush } = await import("./notifications.push");
const target = { endpoint: "https://push.example.test/1", p256dh: "k", auth: "a" };
const message = { title: "Cím", body: "Szöveg", url: "/foglalasaim", tag: "n1" };

describe("sendPush", () => {
  beforeEach(() => sendNotification.mockReset());

  it("sikeres küldés; a tartalom JSON (cím, szöveg, hová vigyen)", async () => {
    sendNotification.mockResolvedValue({ statusCode: 201 });
    expect(await sendPush(target, message)).toBe("sent");
    expect(JSON.parse(sendNotification.mock.calls[0][1])).toEqual(message);
  });

  it("404 / 410: a feliratkozás megszűnt → törölni kell", async () => {
    sendNotification.mockRejectedValueOnce({ statusCode: 410 });
    expect(await sendPush(target, message)).toBe("gone");
    sendNotification.mockRejectedValueOnce({ statusCode: 404 });
    expect(await sendPush(target, message)).toBe("gone");
  });

  it("egyéb hiba (pl. szolgáltató túlterhelt, hálózat): később újra", async () => {
    sendNotification.mockRejectedValueOnce({ statusCode: 503 });
    expect(await sendPush(target, message)).toBe("failed");
    sendNotification.mockRejectedValueOnce(new Error("ECONNRESET"));
    expect(await sendPush(target, message)).toBe("failed");
  });
});
