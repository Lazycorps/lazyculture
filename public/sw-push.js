self.addEventListener("push", (event) => {
  let payload = {};
  if (event.data) {
    try {
      payload = event.data.json();
    } catch {
      payload = { body: event.data.text() };
    }
  }

  const title = payload.title || "Lazyculture";
  const options = {
    body: payload.body || "Ne manquez pas votre défi du jour ! 🧠",
    icon: payload.icon || "/pwa-192x192.png",
    badge: payload.badge || "/pwa-64x64.png",
    data: payload.data || { url: "/" },
    vibrate: [100, 50, 100],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  let targetUrl = "/";
  if (event.notification.data && event.notification.data.url) {
    targetUrl = event.notification.data.url;
  }

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      // Rechercher si une fenêtre de notre application est déjà ouverte
      for (const client of clientList) {
        if (client.url && "focus" in client) {
          client.focus();
          if (client.navigate) {
            client.navigate(targetUrl);
          }
          return;
        }
      }
      // Sinon, ouvrir une nouvelle fenêtre
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    }),
  );
});
