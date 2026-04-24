// Web Push notification service.
// - Sends push notifications to a user's stored subscription.
// - Handles 410 Gone by clearing the subscription per MASTER_PLAN §13 rule 19.

import webpush from 'web-push';
import { env } from '../config/env.js';
import { prisma } from '../config/db.js';

let configured = false;

function ensureConfigured() {
  if (configured) return true;
  if (!env.vapidPublicKey || !env.vapidPrivateKey) return false;
  webpush.setVapidDetails(env.vapidSubject, env.vapidPublicKey, env.vapidPrivateKey);
  configured = true;
  return true;
}

/**
 * Send a push notification to a user.
 * @param {string} userId
 * @param {{ title: string, body: string, tag?: string, data?: object }} payload
 */
export async function sendPush(userId, payload) {
  if (!ensureConfigured()) return { sent: false, reason: 'VAPID_NOT_CONFIGURED' };

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { pushSubscription: true },
  });

  const subscription = user?.pushSubscription;
  if (!subscription || typeof subscription !== 'object') {
    return { sent: false, reason: 'NO_SUBSCRIPTION' };
  }

  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload));
    return { sent: true };
  } catch (err) {
    if (err?.statusCode === 410 || err?.statusCode === 404) {
      // Subscription is gone — null it out.
      await prisma.user
        .update({ where: { id: userId }, data: { pushSubscription: null } })
        .catch(() => {});
      return { sent: false, reason: 'SUBSCRIPTION_GONE' };
    }
    console.error('[push] send failed:', err?.statusCode, err?.body || err?.message);
    return { sent: false, reason: 'SEND_FAILED' };
  }
}

export function getPublicVapidKey() {
  return env.vapidPublicKey || '';
}
