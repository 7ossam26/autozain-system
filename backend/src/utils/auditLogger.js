// Audit logger utility — scaffold. Real implementation in Phase 2.

import { prisma } from '../config/db.js';

/**
 * @param {{
 *   entityType: string,
 *   entityId: string,
 *   action: string,
 *   oldValue?: unknown,
 *   newValue?: unknown,
 *   performedBy: string,
 *   ipAddress?: string,
 * }} entry
 */
export async function logAudit(entry) {
  return prisma.auditLog.create({
    data: {
      entityType: entry.entityType,
      entityId: entry.entityId,
      action: entry.action,
      oldValue: entry.oldValue ?? null,
      newValue: entry.newValue ?? null,
      performedBy: entry.performedBy,
      ipAddress: entry.ipAddress,
    },
  });
}
