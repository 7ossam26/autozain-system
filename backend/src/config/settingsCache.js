// In-memory settings cache. Loaded once on server start, refreshed on every PUT /settings/:key.
// Single-process model (Phase 1–6) — no Redis needed.

import { prisma } from './db.js';

const cache = new Map();

export async function loadSettingsCache() {
  const rows = await prisma.setting.findMany();
  for (const row of rows) {
    cache.set(row.key, parseValue(row.value));
  }
  console.log(`[settings] Loaded ${cache.size} settings into cache`);
}

export function getSetting(key) {
  return cache.get(key);
}

export function setSetting(key, rawValue) {
  cache.set(key, parseValue(rawValue));
}

export function getAllSettings() {
  return Object.fromEntries(cache);
}

function parseValue(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}
