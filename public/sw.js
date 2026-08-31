// sw.js — Ducky service worker: show Web Push notifications and focus/open the app on click.
// Payload shape (from webpush.py): {title, body, url}. Kept minimal + dependency-free.
self.addEventListener("push", function (event) {
  var data = {};
  try { data = event.data ? event.data.json() : {}; } catch (e) { data = { body: (event.data && event.data.text()) || "" }; }
  var title = data.title || "Ducky TradeBot";
  var opts = {
    body: data.body || "",
    icon: "/avatar-160.jpg",
    badge: "/avatar-160.jpg",
    data: { url: data.url || "/app/" },
    tag: data.tag || undefined,
  };
  event.waitUntil(self.registration.showNotification(title, opts));
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();
  var url = (event.notification.data && event.notification.data.url) || "/app/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (list) {
      for (var i = 0; i < list.length; i++) {
        if (list[i].url.indexOf(url) >= 0 && "focus" in list[i]) return list[i].focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});
