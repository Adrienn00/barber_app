// ChairTime service worker: push-értesítések megjelenítése és a koppintás kezelése.
// (Offline gyorsítótárazás nincs – az app mindig friss adatot mutat.)

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "ChairTime", body: event.data ? event.data.text() : "" };
  }
  const title = data.title || "ChairTime";
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || "",
      icon: "/icons/icon-192.png",
      badge: "/icons/badge-96.png",
      tag: data.tag,
      lang: "hu",
      data: { url: typeof data.url === "string" && data.url.startsWith("/") ? data.url : "/ertesitesek" },
    }),
  );
});

// Koppintásra: ha az app már nyitva van, oda ugrik; különben megnyitja a megfelelő oldalt
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || "/ertesitesek", self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
      for (const client of windows) {
        if (client.url.startsWith(self.location.origin) && "focus" in client) {
          return client.navigate(url).then((c) => (c || client).focus());
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});
