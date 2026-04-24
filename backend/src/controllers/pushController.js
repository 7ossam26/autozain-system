import { savePushSubscription } from '../repositories/userRepository.js';
import { getPublicVapidKey } from '../services/notificationService.js';

// GET /push/public-key — expose VAPID public key to the browser.
export function getVapidKey(req, res) {
  return res.json({ success: true, data: { publicKey: getPublicVapidKey() } });
}

// POST /push/subscribe — store the user's push subscription object.
export async function subscribe(req, res, next) {
  try {
    const sub = req.body?.subscription;
    if (!sub || !sub.endpoint || !sub.keys) {
      return res.status(400).json({
        success: false, message: 'اشتراك غير صالح', error_code: 'VALIDATION_ERROR',
      });
    }
    await savePushSubscription(req.user.userId, sub);
    return res.json({ success: true, data: null });
  } catch (err) {
    next(err);
  }
}

// DELETE /push/subscribe — clear subscription (user denied / logged out).
export async function unsubscribe(req, res, next) {
  try {
    await savePushSubscription(req.user.userId, null);
    return res.json({ success: true, data: null });
  } catch (err) {
    next(err);
  }
}
