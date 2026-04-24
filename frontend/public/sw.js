// Service Worker — scaffold.
// Phase 4 will register push event handlers (web-push) and click-through behavior.

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// self.addEventListener('push', (event) => { /* Phase 4 */ });
// self.addEventListener('notificationclick', (event) => { /* Phase 4 */ });
