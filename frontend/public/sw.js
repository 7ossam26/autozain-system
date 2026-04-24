// AutoZain Service Worker — Web Push handler.
// On `push` events, show a native notification with buyer info.
// On `notificationclick`, focus/open the dashboard.

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: 'أوتوزين', body: event.data?.text?.() ?? '' };
  }

  const title = data.title || 'أوتوزين';
  const options = {
    body: data.body || '',
    tag: data.tag || 'autozain',
    dir: 'rtl',
    lang: 'ar',
    badge: '/favicon.svg',
    icon: '/logo.svg',
    data: data.data || {},
    requireInteraction: true,
    vibrate: [200, 100, 200],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = '/dashboard';

  event.waitUntil((async () => {
    const allClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of allClients) {
      if (client.url.includes('/dashboard') && 'focus' in client) {
        return client.focus();
      }
    }
    if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
    return null;
  })());
});
