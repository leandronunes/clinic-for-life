const CACHE = "forlife-v1";
const SHELL = ["/", "/index.html", "/forlife-logo.jpeg", "/manifest.webmanifest"];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (e) => {
  const { request } = e;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Deixa passar requisições cross-origin (API, fonts externas, etc.)
  if (url.origin !== location.origin) return;

  // Navegação: rede primeiro, fallback ao index.html (SPA offline)
  if (request.mode === "navigate") {
    e.respondWith(
      fetch(request)
        .then((r) => {
          caches.open(CACHE).then((c) => c.put(request, r.clone()));
          return r;
        })
        .catch(() => caches.match("/index.html")),
    );
    return;
  }

  // Assets estáticos: stale-while-revalidate
  e.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const cached = await cache.match(request);
      const fresh = fetch(request)
        .then((r) => {
          if (r.ok) cache.put(request, r.clone());
          return r;
        })
        .catch(() => cached);
      return cached ?? fresh;
    }),
  );
});

self.addEventListener("push", (event) => {
  let payload = {};
  if (event.data) {
    try {
      payload = event.data.json();
    } catch {
      payload = { title: "Clinic for Life", body: event.data.text() };
    }
  }
  const title = payload.title || "Clinic for Life";
  const options = {
    body: payload.body,
    icon: "/forlife-logo.jpeg",
    badge: "/forlife-logo.jpeg",
    data: { url: payload.url || "/" },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(url) && "focus" in client) return client.focus();
      }
      return self.clients.openWindow ? self.clients.openWindow(url) : undefined;
    }),
  );
});
