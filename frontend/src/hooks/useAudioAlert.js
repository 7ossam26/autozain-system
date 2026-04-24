// Short beep pattern using Web Audio API — no asset shipping required.
// Suitable for "new contact request" alerts; respects mute preference
// persisted in localStorage.

import { useCallback, useEffect, useRef, useState } from 'react';

const MUTE_KEY = 'autozain.audio.muted';

function readMuted() {
  try { return localStorage.getItem(MUTE_KEY) === '1'; } catch { return false; }
}

function writeMuted(v) {
  try { localStorage.setItem(MUTE_KEY, v ? '1' : '0'); } catch { /* ignore */ }
}

export function useAudioAlert() {
  const ctxRef = useRef(null);
  const [muted, setMutedState] = useState(readMuted);

  const ensureCtx = useCallback(() => {
    if (ctxRef.current) return ctxRef.current;
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return null;
    ctxRef.current = new Ctor();
    return ctxRef.current;
  }, []);

  const play = useCallback(() => {
    if (muted) return;
    const ctx = ensureCtx();
    if (!ctx) return;

    if (ctx.state === 'suspended') ctx.resume().catch(() => {});

    const now = ctx.currentTime;
    const tone = (startAt, freq, dur = 0.2, gain = 0.18) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      g.gain.setValueAtTime(0, startAt);
      g.gain.linearRampToValueAtTime(gain, startAt + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, startAt + dur);
      osc.connect(g).connect(ctx.destination);
      osc.start(startAt);
      osc.stop(startAt + dur + 0.02);
    };

    tone(now,        880);
    tone(now + 0.28, 1320);
  }, [muted, ensureCtx]);

  const vibrate = useCallback(() => {
    if (muted) return;
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      try { navigator.vibrate([200, 100, 200]); } catch { /* ignore */ }
    }
  }, [muted]);

  const setMuted = useCallback((v) => {
    writeMuted(!!v);
    setMutedState(!!v);
  }, []);

  // Prime AudioContext on first user interaction (browser autoplay policy).
  useEffect(() => {
    const prime = () => {
      const ctx = ensureCtx();
      if (ctx?.state === 'suspended') ctx.resume().catch(() => {});
    };
    window.addEventListener('pointerdown', prime, { once: true });
    window.addEventListener('keydown',     prime, { once: true });
    return () => {
      window.removeEventListener('pointerdown', prime);
      window.removeEventListener('keydown',     prime);
    };
  }, [ensureCtx]);

  return { play, vibrate, muted, setMuted };
}
