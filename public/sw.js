// sw.js — Ducky service worker: show Web Push notifications and focus/open the app on click.
// Payload shape (from webpush.py): {title, body, url, tag}. No caches or third-party scripts.
// This worker owns notifications only. Its compatible update can take over open tabs.
self.addEventListener("install", function (event) { event.waitUntil(self.skipWaiting()); });
self.addEventListener("activate", function (event) { event.waitUntil(self.clients.claim()); });
function appURL(value) {
  try {
    var url = new URL(typeof value === "string" ? value : "/app/", self.location.origin);
    if (url.origin === self.location.origin && !url.username && !url.password &&
        (url.pathname === "/app/" || url.pathname === "/en/app/")) return url.href;
  } catch (e) { /* Unknown payloads return to the app. */ }
  return self.location.origin + "/app/";
}

function plain(value, fallback, limit) {
  return typeof value === "string" ? value.replace(/[\x00-\x1f\x7f]/g, " ").slice(0, limit) : fallback;
}

self.addEventListener("push", function (event) {
  var data = {};
  try { data = event.data ? event.data.json() : {}; } catch (e) { data = { body: (event.data && event.data.text()) || "" }; }
  if (!data || typeof data !== "object" || Array.isArray(data)) data = {};
  var title = plain(data.title, "Ducky TradeBot", 100);
  var opts = {
    body: plain(data.body, "", 400),
    icon: "/avatar-160.jpg",
    badge: "/avatar-160.jpg",
    data: { url: appURL(data.url) },
    tag: plain(data.tag, "", 120) || undefined,
    renotify: false,
  };
  event.waitUntil(Promise.all([
    self.registration.showNotification(title, opts),
    // Open pages fetch their own authenticated inbox. Never broadcast another account's payload.
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (list) {
      list.forEach(function (client) {
        try {
          if (new URL(client.url).origin === self.location.origin) client.postMessage({ type: "ducky-creator-update" });
        } catch (e) { /* An unavailable client cannot break notification display. */ }
      });
    }),
  ]));
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();
  var url = appURL(event.notification.data && event.notification.data.url);
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (list) {
      for (var j = 0; j < list.length; j++) {
        try {
          var existing = new URL(list[j].url);
          if (existing.origin === self.location.origin &&
              (existing.pathname === "/app/" || existing.pathname === "/en/app/") &&
              "navigate" in list[j]) {
            // Client.url can retain the URL from before a SPA hash navigation.
            // Reload the app shell so a long-open old route graph can open new features.
            var target = new URL(url);
            target.searchParams.set("notice", Date.now().toString(36));
            return list[j].navigate(target.href).then(function (client) {
              return client && "focus" in client ? client.focus() : self.clients.openWindow(url);
            }).catch(function () {
              // The tab may have closed between matchAll and navigation.
              if (self.clients.openWindow) return self.clients.openWindow(url);
            });
          }
        } catch (e) { /* Try the next application window. */ }
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});
