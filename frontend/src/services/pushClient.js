// Web Push helper — registers the service worker, asks for permission,
// creates a PushSubscription, and ships it to the backend.

import { api } from './api.js';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

export function pushSupported() {
  return typeof window !== 'undefined'
    && 'serviceWorker' in navigator
    && 'PushManager' in window
    && 'Notification' in window;
}

async function getRegistration() {
  if (!pushSupported()) throw new Error('PUSH_UNSUPPORTED');
  const existing = await navigator.serviceWorker.getRegistration('/sw.js');
  if (existing) return existing;
  return navigator.serviceWorker.register('/sw.js');
}

export async function ensurePushSubscription() {
  if (!pushSupported()) return { ok: false, reason: 'UNSUPPORTED' };

  const permission = Notification.permission === 'granted'
    ? 'granted'
    : await Notification.requestPermission();

  if (permission !== 'granted') return { ok: false, reason: 'DENIED' };

  const reg = await getRegistration();

  // Fetch VAPID public key from backend.
  const { data: keyRes } = await api.get('/push/public-key');
  const publicKey = keyRes?.data?.publicKey;
  if (!publicKey) return { ok: false, reason: 'NO_VAPID' };

  let subscription = await reg.pushManager.getSubscription();
  if (!subscription) {
    subscription = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });
  }

  await api.post('/push/subscribe', { subscription: subscription.toJSON() });
  return { ok: true };
}

export async function unsubscribePush() {
  if (!pushSupported()) return;
  const reg = await navigator.serviceWorker.getRegistration('/sw.js');
  const sub = await reg?.pushManager.getSubscription();
  if (sub) await sub.unsubscribe().catch(() => {});
  await api.delete('/push/subscribe').catch(() => {});
}

export function getPermission() {
  if (typeof Notification === 'undefined') return 'unsupported';
  return Notification.permission;
}
