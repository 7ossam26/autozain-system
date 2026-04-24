import { listSettings, findSettingByKey, updateSetting } from '../repositories/settingRepository.js';
import { setSetting } from '../config/settingsCache.js';
import { logAudit } from '../utils/auditLogger.js';

export async function getSettings(req, res, next) {
  try {
    const rows = await listSettings();

    // Group by category
    const grouped = {};
    for (const row of rows) {
      if (!grouped[row.category]) grouped[row.category] = [];
      grouped[row.category].push({
        key: row.key,
        value: parseValue(row.value),
        descriptionAr: row.descriptionAr,
        category: row.category,
        updatedAt: row.updatedAt,
      });
    }

    return res.json({ success: true, data: grouped });
  } catch (err) {
    next(err);
  }
}

export async function putSetting(req, res, next) {
  try {
    const { key } = req.params;
    const { value } = req.body ?? {};

    if (value === undefined) {
      return res.status(400).json({ success: false, message: 'القيمة مطلوبة', error_code: 'VALIDATION_ERROR' });
    }

    const existing = await findSettingByKey(key);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'الإعداد غير موجود', error_code: 'NOT_FOUND' });
    }

    // Store value as JSON-encoded string
    const rawValue = typeof value === 'string' ? value : JSON.stringify(value);
    const updated = await updateSetting(key, rawValue, req.user.userId);

    // Refresh in-memory cache
    setSetting(key, rawValue);

    await logAudit({
      entityType: 'setting',
      entityId: existing.id,
      action: 'update',
      oldValue: { key, value: existing.value },
      newValue: { key, value: rawValue },
      performedBy: req.user.userId,
      ipAddress: req.ip,
    });

    // TODO Phase 4: io.emit('settings:updated', { key, value: parseValue(rawValue) })

    return res.json({
      success: true,
      data: {
        key: updated.key,
        value: parseValue(updated.value),
        descriptionAr: updated.descriptionAr,
        category: updated.category,
      },
    });
  } catch (err) {
    next(err);
  }
}

function parseValue(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}
