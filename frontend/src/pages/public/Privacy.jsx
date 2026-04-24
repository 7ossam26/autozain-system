import { ShieldCheck } from 'lucide-react';

export default function Privacy() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12" dir="rtl">
      <div className="flex items-center gap-3 mb-8">
        <ShieldCheck size={28} className="text-primary" />
        <h1 className="text-3xl font-bold text-text-primary">سياسة الخصوصية</h1>
      </div>

      <div className="prose prose-sm text-text-secondary space-y-6">
        <section>
          <h2 className="text-xl font-semibold text-text-primary mb-3">١. المعلومات التي نجمعها</h2>
          <p className="leading-relaxed">
            عند استخدامك لموقع أوتوزين، قد نجمع البيانات التالية:
          </p>
          <ul className="list-disc list-inside space-y-1 mr-4 mt-2">
            <li>اسمك ورقم هاتفك عند إرسال طلب تواصل مع موظف</li>
            <li>السيارات التي أضفتها إلى المفضلة (محفوظة في متصفحك فقط)</li>
            <li>بيانات تقنية مثل نوع المتصفح وعنوان IP لأغراض الأمان</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-text-primary mb-3">٢. كيف نستخدم معلوماتك</h2>
          <p className="leading-relaxed">
            نستخدم معلوماتك حصرياً لتسهيل التواصل بينك وبين موظفي المعرض. لا نقوم ببيع بياناتك أو مشاركتها
            مع أطراف ثالثة خارج نطاق تقديم الخدمة.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-text-primary mb-3">٣. حفظ البيانات</h2>
          <p className="leading-relaxed">
            يتم حفظ طلبات التواصل في قاعدة بياناتنا لمدة محدودة لأغراض تشغيلية. المفضلة محفوظة في ذاكرة
            متصفحك المحلية (localStorage) ولا تصل إليها خوادمنا.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-text-primary mb-3">٤. الإشعارات</h2>
          <p className="leading-relaxed">
            قد يطلب الموقع إذناً لإرسال إشعارات لمتصفحك (للموظفين فقط). يمكنك رفض هذا الإذن في أي وقت
            من إعدادات متصفحك.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-text-primary mb-3">٥. حقوقك</h2>
          <p className="leading-relaxed">
            يحق لك في أي وقت طلب حذف بياناتك الشخصية من سجلاتنا. يرجى التواصل معنا مباشرة لهذا الغرض.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-text-primary mb-3">٦. الأمان</h2>
          <p className="leading-relaxed">
            نحن نتخذ إجراءات تقنية وتنظيمية مناسبة لحماية بياناتك من الوصول غير المصرح به أو الفقدان أو الإساءة.
          </p>
        </section>

        <p className="text-text-muted text-xs border-t border-border-muted pt-4 mt-8">
          آخر تحديث: أبريل ٢٠٢٦ | للتواصل بشأن الخصوصية: أوتوزين، مصر
        </p>
      </div>
    </div>
  );
}
