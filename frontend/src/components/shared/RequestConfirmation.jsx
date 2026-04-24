import { useEffect, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';

export default function RequestConfirmation({ timeoutMinutes = 5, onDone }) {
  const [secondsLeft, setSecondsLeft] = useState(Math.round(timeoutMinutes * 60));

  useEffect(() => {
    if (secondsLeft <= 0) {
      onDone?.();
      return undefined;
    }
    const t = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [secondsLeft, onDone]);

  const m = Math.floor(secondsLeft / 60);
  const s = secondsLeft % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');

  return (
    <div dir="rtl" className="bg-surface border border-border-muted rounded-md p-6 text-center">
      <CheckCircle2 size={48} className="mx-auto text-primary mb-3" />
      <h2 className="text-xl font-bold text-text-primary mb-2">تم إرسال طلبك</h2>
      <p className="text-text-secondary mb-4">
        الموظف هيتواصل معاك في أقرب وقت.
      </p>
      <div className="inline-flex items-center gap-2 bg-background px-4 py-2 rounded-full text-sm">
        <span className="text-text-secondary">الوقت المتبقي:</span>
        <span className="font-mono font-bold text-text-primary tabular-nums">{mm}:{ss}</span>
      </div>
      <p className="text-xs text-text-muted mt-4">
        لو الموظف مردش، هتقدر تبعت لموظف تاني بعد انتهاء الوقت.
      </p>
    </div>
  );
}
