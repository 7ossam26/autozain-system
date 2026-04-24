import { Link } from 'react-router-dom';
import { UserCircle2 } from 'lucide-react';

// Placeholder — the real contact-request flow (employee list, modal, queue) ships in Phase 4.
export default function Employees() {
  return (
    <div dir="rtl" className="max-w-xl mx-auto px-4 py-16 text-center">
      <UserCircle2 size={48} className="mx-auto text-text-muted mb-4" />
      <h1 className="text-2xl font-bold text-text-primary mb-3">تواصل مع موظف</h1>
      <p className="text-text-secondary mb-6">
        خاصية التواصل المباشر مع موظفينا هتكون متاحة قريب.
        بنحضرلها إشعارات فورية وقائمة انتظار ذكية.
      </p>
      <Link
        to="/cars"
        className="inline-flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-md text-sm font-medium hover:bg-primary-dark transition-colors"
      >
        تصفح العربيات
      </Link>
    </div>
  );
}
