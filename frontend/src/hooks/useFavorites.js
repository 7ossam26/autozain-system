import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'autozain_favorites';
const EVENT = 'autozain:favorites-changed';

function read() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

function write(ids) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  window.dispatchEvent(new CustomEvent(EVENT));
}

export function useFavorites() {
  const [ids, setIds] = useState(() => read());

  useEffect(() => {
    const refresh = () => setIds(read());
    window.addEventListener(EVENT, refresh);
    // Cross-tab sync
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener(EVENT, refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);

  const isFavorite = useCallback((id) => ids.includes(id), [ids]);

  const toggle = useCallback((id) => {
    const current = read();
    const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
    write(next);
  }, []);

  const remove = useCallback((id) => {
    const current = read();
    write(current.filter((x) => x !== id));
  }, []);

  return { ids, count: ids.length, isFavorite, toggle, remove };
}
