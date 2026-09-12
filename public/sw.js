self.addEventListener("push", (event) => {
  let payload = {
    title: "KIDOO",
    body: "Nova tarefa para aprovar",
    icon: "/icons/192.png",
    badge: "/icons/192.png",
    tag: "kidoo-task",
    data: { url: "/app/aprovacoes" },
  };

  try {
    payload = { ...payload, ...event.data?.json() };
  } catch {
    // Keep defaults when payload is not JSON.
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: payload.icon,
      badge: payload.badge,
      tag: payload.tag,
      data: payload.data,
      renotify: true,
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url ?? "/app/aprovacoes";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client && client.url.includes(targetUrl)) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
      return undefined;
    }),
  );
});
