// Contact request lifecycle + timeout sweeper.
// Accept/reject/complete are driven by the controller; this module adds:
//   - Repeat notification 60s after creation if still pending
//   - Background timeout sweep (expires requests older than
//     `request_timeout_minutes` setting)

import { getSetting } from '../config/settingsCache.js';
import {
  findContactRequestById, findExpiredPending, markExpired,
} from '../repositories/contactRequestRepository.js';
import { emitToEmployee, emitToRoom } from '../socket/index.js';
import { sendPush } from './notificationService.js';

const REPEAT_AFTER_MS = 60 * 1000;
const SWEEP_INTERVAL_MS = 15 * 1000;

let sweepHandle = null;

// ─── Repeat notification ─────────────────────────────────────────────────────

export function scheduleRepeatNotification(request) {
  const repeatEnabled = getSetting('notification_repeat');
  if (repeatEnabled === false) return;

  setTimeout(async () => {
    try {
      const current = await findContactRequestById(request.id);
      if (!current || current.status !== 'pending') return;

      emitToEmployee(current.employeeId, 'contact_request:repeat', {
        requestId: current.id,
        buyerName: current.buyerName,
        buyerPhone: current.buyerPhone,
      });

      sendPush(current.employeeId, {
        title: 'تذكرة: طلب لم يُرد عليه',
        body: `${current.buyerName} مازال في انتظارك`,
        tag: `request-${current.id}`,
        data: { requestId: current.id, type: 'repeat' },
      }).catch(() => {});
    } catch {
      /* swallow — repeat is best-effort */
    }
  }, REPEAT_AFTER_MS).unref?.();
}

// ─── Timeout sweeper ─────────────────────────────────────────────────────────

async function sweepExpired() {
  const minutes = Number(getSetting('request_timeout_minutes') ?? 5);
  const cutoff = new Date(Date.now() - minutes * 60 * 1000);

  let expired;
  try {
    expired = await findExpiredPending(cutoff);
  } catch (err) {
    console.error('[contact] sweep query failed:', err?.message);
    return;
  }

  for (const req of expired) {
    try {
      await markExpired(req.id);
      emitToEmployee(req.employeeId, 'contact_request:timeout', { requestId: req.id });
      emitToRoom('public', 'contact_request:timeout', { requestId: req.id });
    } catch {
      /* next */
    }
  }
}

export function startTimeoutSweeper() {
  if (sweepHandle) return;
  sweepHandle = setInterval(sweepExpired, SWEEP_INTERVAL_MS);
  sweepHandle.unref?.();
}

export function stopTimeoutSweeper() {
  if (sweepHandle) {
    clearInterval(sweepHandle);
    sweepHandle = null;
  }
}
