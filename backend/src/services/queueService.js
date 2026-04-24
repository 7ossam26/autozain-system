// Queue auto-assignment service.
// When an employee becomes available, pull the oldest waiting buyer from the
// queue, create a contact request bound to that employee, and notify them.

import { findOldestWaiting, assignQueueEntry } from '../repositories/queueRepository.js';
import { createContactRequest } from '../repositories/contactRequestRepository.js';
import { emitToEmployee, emitToRoom } from '../socket/index.js';
import { sendPush } from './notificationService.js';

export async function tryAssignFromQueue(employeeId) {
  const entry = await findOldestWaiting();
  if (!entry) return null;

  const assigned = await assignQueueEntry(entry.id, employeeId);

  // Create a pending contact request linked to the queued buyer.
  const request = await createContactRequest({
    buyerName: assigned.buyerName,
    buyerPhone: assigned.buyerPhone,
    employeeId,
    interestedCarId: assigned.interestedCarId,
  });

  // Notify the assigned employee (socket + push).
  emitToEmployee(employeeId, 'queue:assigned', {
    buyerName: request.buyerName,
    buyerPhone: request.buyerPhone,
    requestId: request.id,
    interestedCar: request.interestedCar,
  });

  emitToEmployee(employeeId, 'contact_request:new', {
    requestId: request.id,
    buyerName: request.buyerName,
    buyerPhone: request.buyerPhone,
    interestedCar: request.interestedCar,
    fromQueue: true,
  });

  // Let team managers see queue activity.
  emitToRoom('role:team_manager', 'queue:updated', { id: assigned.id, status: 'assigned' });

  sendPush(employeeId, {
    title: 'طلب من قائمة الانتظار',
    body: `${request.buyerName} — ${request.buyerPhone}`,
    tag: `request-${request.id}`,
    data: { requestId: request.id, type: 'queue_assigned' },
  }).catch(() => {});

  return request;
}
