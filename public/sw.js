const CACHE_NAME = "jyoti-hydraulic-v1";
const APP_SHELL = ["/", "/offline/"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET" || event.request.mode !== "navigate") return;
  event.respondWith(fetch(event.request).catch(() => caches.match("/offline/")));
});

self.addEventListener("push", (event) => {
  const payload = event.data
    ? event.data.json()
    : { title: "Jyoti Hydraulic", body: "You have a new notification.", url: "/admin/" };
  event.waitUntil(
    self.registration.showNotification(payload.title || "Jyoti Hydraulic", {
      body: payload.body || "You have a new notification.",
      icon: "/brand/favicon.png",
      badge: "/brand/favicon.png",
      data: { url: payload.url || "/admin/" },
      tag: payload.tag || "jyoti-hydraulic-notification",
      renotify: true,
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/admin/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      const existing = clients.find((client) => new URL(client.url).pathname === url);
      return existing ? existing.focus() : self.clients.openWindow(url);
    }),
  );
});
