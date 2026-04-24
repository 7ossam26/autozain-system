import { useEffect, useState } from 'react';
import { publicApi } from '../services/publicApi.js';
import { setNumeralSystem } from '../utils/formatters.js';

// Fetches the global numeral_system setting once and applies it.
// Call from the public layout on mount.
export function useNumeralSystem() {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    publicApi.get('/settings/numeral_system')
      .then(({ data }) => {
        if (cancelled) return;
        setNumeralSystem(data?.data?.numeral_system ?? 'western');
      })
      .catch(() => {
        // Non-fatal — fall back to default.
      })
      .finally(() => { if (!cancelled) setLoaded(true); });
    return () => { cancelled = true; };
  }, []);

  return loaded;
}
