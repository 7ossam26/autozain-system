import { FileText } from 'lucide-react';

export default function Terms() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12" dir="rtl">
      <div className="flex items-center gap-3 mb-8">
        <FileText size={28} className="text-primary" />
        <h1 className="text-3xl font-bold text-text-primary">الشروط والأحكام</h1>
      </div>

      <div className="prose prose-sm text-text-secondary space-y-6">
        <section>
          <h2 className="text-xl font-semibold text-text-primary mb-3">١. مقدمة</h2>
          <p className="leading-relaxed">
            مرحباً بكم في أوتوزين — معرض السيارات المستعملة. باستخدام هذا الموقع، فأنت توافق على الالتزام بهذه الشروط والأحكام.
            إذا كنت لا توافق على أي من هذه الشروط، يرجى عدم استخدام الموقع.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-text-primary mb-3">٢. طبيعة الخدمة</h2>
          <p className="leading-relaxed">
            أوتوزين هو معرض سيارات مستعملة يعمل كوسيط بين البائعين والمشترين. المعرض لا يمتلك السيارات المعروضة،
            بل يستضيفها نيابة عن أصحابها ويُسهّل عملية البيع. جميع المعاملات المالية تتم خارج المنصة وبشكل شخصي.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-text-primary mb-3">٣. المعلومات المعروضة</h2>
          <p className="leading-relaxed">
            تسعى أوتوزين إلى توفير معلومات دقيقة وشاملة عن كل سيارة. ومع ذلك، لا يتحمل المعرض مسؤولية أي أخطاء
            أو معلومات غير صحيحة وردت من البائع. يُنصح المشترون بالتحقق الشخصي من السيارة وفحصها قبل إتمام الشراء.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-text-primary mb-3">٤. تواصل المشتري مع الموظف</h2>
          <p className="leading-relaxed">
            عند إرسال طلب تواصل، يتحمل المشتري مسؤولية تقديم معلومات صحيحة وكاملة (الاسم ورقم الهاتف).
            التواصل الفعلي يتم عبر الهاتف خارج المنصة ويُسهم موظفو أوتوزين في تيسيره.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-text-primary mb-3">٥. حقوق الملكية الفكرية</h2>
          <p className="leading-relaxed">
            جميع محتويات الموقع بما فيها التصميم والشعارات والصور مملوكة لأوتوزين أو لأصحاب السيارات المعروضة.
            لا يجوز إعادة نشر أي محتوى دون إذن مسبق.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-text-primary mb-3">٦. التعديلات</h2>
          <p className="leading-relaxed">
            تحتفظ أوتوزين بحق تعديل هذه الشروط في أي وقت. سيتم إخطار المستخدمين بالتغييرات الجوهرية عبر الموقع.
          </p>
        </section>

        <p className="text-text-muted text-xs border-t border-border-muted pt-4 mt-8">
          آخر تحديث: أبريل ٢٠٢٦ | للتواصل: أوتوزين، مصر
        </p>
      </div>
    </div>
  );
}
