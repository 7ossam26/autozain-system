import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, X, AlertTriangle, ChevronRight } from 'lucide-react';
import { api } from '../../services/api.js';

const TRANSMISSION_OPTIONS = [
  { value: 'manual',    label: 'عادي (Manual)' },
  { value: 'automatic', label: 'أوتوماتيك (Automatic)' },
];

const FUEL_OPTIONS = [
  { value: '',         label: '— اختياري —' },
  { value: 'benzine',  label: 'بنزين' },
  { value: 'diesel',   label: 'ديزل' },
  { value: 'gas',      label: 'غاز' },
  { value: 'electric', label: 'كهرباء' },
  { value: 'hybrid',   label: 'هايبرد' },
];

function FieldError({ msg }) {
  if (!msg) return null;
  return <p className="text-error text-xs mt-1">{msg}</p>;
}

function PhoneWarning({ phone }) {
  if (!phone) return null;
  const EG_MOBILE = /^(?:\+20|0)1[0125]\d{8}$/;
  if (EG_MOBILE.test(phone.trim())) return null;
  return (
    <p className="text-warning text-xs mt-1 flex items-center gap-1">
      <AlertTriangle size={12} />
      الرقم ممكن يكون غلط — راجعه
    </p>
  );
}

export default function AddCar() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState(null);
  const [serverWarning, setServerWarning] = useState(null);
  const [errors, setErrors] = useState({});

  const [form, setForm] = useState({
    car_type: '', model: '', listing_price: '', license_info: '',
    transmission: 'manual', plate_number: '', odometer: '',
    color: '', fuel_type: '', additional_info: '',
    seller_name: '', seller_phone: '', seller_residence: '',
  });

  const [carImages, setCarImages]             = useState([]);
  const [inspectionImage, setInspectionImage] = useState(null);
  const [licenseFront, setLicenseFront]       = useState(null);
  const [licenseBack, setLicenseBack]         = useState(null);

  const carImagesRef      = useRef();
  const inspectionRef     = useRef();
  const licenseFrontRef   = useRef();
  const licenseBackRef    = useRef();

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((e) => ({ ...e, [field]: undefined }));
  }

  function validateForm() {
    const errs = {};
    if (!form.car_type.trim()) errs.car_type = 'نوع العربية مطلوب';
    if (!form.model.trim()) errs.model = 'الموديل مطلوب';
    if (!form.listing_price) {
      errs.listing_price = 'السعر مطلوب';
    } else if (!Number.isInteger(Number(form.listing_price)) || Number(form.listing_price) < 0) {
      errs.listing_price = 'السعر يجب أن يكون رقم صحيح';
    }
    if (!form.seller_name.trim()) errs.seller_name = 'اسم البائع مطلوب';
    if (!form.seller_phone.trim()) errs.seller_phone = 'رقم البائع مطلوب';
    return errs;
  }

  function handleCarImages(e) {
    const files = Array.from(e.target.files || []);
    setCarImages((prev) => [...prev, ...files].slice(0, 20));
  }

  function removeCarImage(idx) {
    setCarImages((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errs = validateForm();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setSubmitting(true);
    setServerError(null);
    setServerWarning(null);

    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => { if (v !== '') fd.append(k, v); });
    carImages.forEach((f) => fd.append('images', f));
    if (inspectionImage) fd.append('inspection_image', inspectionImage);
    if (licenseFront) fd.append('seller_license_front', licenseFront);
    if (licenseBack) fd.append('seller_license_back', licenseBack);

    try {
      const { data } = await api.post('/cars', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      if (data.warning) setServerWarning(data.warning);
      navigate(`/dashboard/cars/${data.data.id}`);
    } catch (err) {
      setServerError(err.response?.data?.message || 'حصل خطأ أثناء الحفظ');
    } finally {
      setSubmitting(false);
    }
  }

  const Section = ({ title, children }) => (
    <div className="bg-surface border border-border-muted rounded-md p-6 shadow-sm">
      <h2 className="text-base font-semibold text-text-primary mb-5 pb-3 border-b border-border-muted">{title}</h2>
      {children}
    </div>
  );

  const Field = ({ label, required, children, error, hint }) => (
    <div>
      <label className="block text-sm font-medium text-text-primary mb-1.5">
        {label}{required && <span className="text-error mr-0.5">*</span>}
        {!required && <span className="text-text-muted text-xs mr-1">(اختياري)</span>}
      </label>
      {children}
      {hint && !error && <p className="text-text-muted text-xs mt-1">{hint}</p>}
      <FieldError msg={error} />
    </div>
  );

  const inputCls = (err) =>
    `w-full px-3 py-2 border rounded-sm text-sm bg-surface focus:outline-none transition-colors
     ${err ? 'border-error focus:border-error' : 'border-border-muted focus:border-primary'}`;

  return (
    <div dir="rtl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-text-muted mb-6">
        <button onClick={() => navigate('/dashboard/cars')} className="hover:text-text-primary">العربيات</button>
        <ChevronRight size={14} />
        <span className="text-text-primary font-medium">إضافة عربية جديدة</span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Car data */}
        <Section title="بيانات العربية">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Field label="نوع العربية / الماركة" required error={errors.car_type}>
              <input className={inputCls(errors.car_type)} placeholder="مثال: Toyota, Mitsubishi" value={form.car_type} onChange={(e) => set('car_type', e.target.value)} />
            </Field>
            <Field label="الموديل" required error={errors.model}>
              <input className={inputCls(errors.model)} placeholder="مثال: Corolla, Lancer" value={form.model} onChange={(e) => set('model', e.target.value)} />
            </Field>
            <Field label="سعر العرض (ج.م)" required error={errors.listing_price} hint="أرقام صحيحة فقط — بدون كسور">
              <input
                className={inputCls(errors.listing_price)}
                placeholder="مثال: 250000"
                inputMode="numeric"
                value={form.listing_price}
                onChange={(e) => {
                  const v = e.target.value.replace(/[^\d]/g, '');
                  set('listing_price', v);
                }}
              />
            </Field>
            <Field label="ناقل الحركة" required error={errors.transmission}>
              <select className={inputCls(errors.transmission)} value={form.transmission} onChange={(e) => set('transmission', e.target.value)}>
                {TRANSMISSION_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </Field>
            <Field label="نوع الوقود" error={errors.fuel_type}>
              <select className={inputCls(errors.fuel_type)} value={form.fuel_type} onChange={(e) => set('fuel_type', e.target.value)}>
                {FUEL_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </Field>
            <Field label="اللون" error={errors.color}>
              <input className={inputCls(errors.color)} placeholder="مثال: أبيض، أسود" value={form.color} onChange={(e) => set('color', e.target.value)} />
            </Field>
            <Field label="رقم اللوحة (النمرة)" error={errors.plate_number}>
              <input className={inputCls(errors.plate_number)} placeholder="مثال: أ ب ج 1234" value={form.plate_number} onChange={(e) => set('plate_number', e.target.value)} />
            </Field>
            <Field label="العداد (كم)" error={errors.odometer}>
              <input
                className={inputCls(errors.odometer)}
                placeholder="مثال: 85000"
                inputMode="numeric"
                value={form.odometer}
                onChange={(e) => {
                  const v = e.target.value.replace(/[^\d]/g, '');
                  set('odometer', v);
                }}
              />
            </Field>
            <Field label="بيانات الرخصة / التراخيص" error={errors.license_info}>
              <input className={inputCls(errors.license_info)} placeholder="رقم الرخصة أو ملاحظات التراخيص" value={form.license_info} onChange={(e) => set('license_info', e.target.value)} />
            </Field>
          </div>
          <div className="mt-4">
            <Field label="معلومات إضافية" error={errors.additional_info}>
              <textarea
                className={`${inputCls(errors.additional_info)} resize-none h-24`}
                placeholder="أي معلومات تانية عن العربية…"
                value={form.additional_info}
                onChange={(e) => set('additional_info', e.target.value)}
              />
            </Field>
          </div>
        </Section>

        {/* Seller data */}
        <Section title="بيانات البائع">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Field label="اسم البائع" required error={errors.seller_name}>
              <input className={inputCls(errors.seller_name)} placeholder="الاسم الكامل" value={form.seller_name} onChange={(e) => set('seller_name', e.target.value)} />
            </Field>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">
                رقم موبايل البائع<span className="text-error mr-0.5">*</span>
              </label>
              <input
                className={inputCls(errors.seller_phone)}
                placeholder="01xxxxxxxxx"
                value={form.seller_phone}
                onChange={(e) => { set('seller_phone', e.target.value); setErrors((errs) => ({ ...errs, seller_phone: undefined })); }}
              />
              <PhoneWarning phone={form.seller_phone} />
              <FieldError msg={errors.seller_phone} />
            </div>
            <Field label="محل الإقامة" error={errors.seller_residence}>
              <input className={inputCls(errors.seller_residence)} placeholder="المدينة أو المنطقة" value={form.seller_residence} onChange={(e) => set('seller_residence', e.target.value)} />
            </Field>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            <Field label="صورة رخصة القيادة (وجه)" error={null}>
              {licenseFront ? (
                <div className="flex items-center gap-3 p-3 border border-border-muted rounded-sm">
                  <img src={URL.createObjectURL(licenseFront)} alt="" className="w-16 h-10 object-cover rounded-sm" />
                  <span className="flex-1 text-sm text-text-secondary truncate">{licenseFront.name}</span>
                  <button type="button" onClick={() => setLicenseFront(null)} className="text-error hover:text-red-700"><X size={16} /></button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => licenseFrontRef.current?.click()}
                  className="w-full p-3 border-2 border-dashed border-border-muted rounded-sm text-text-muted text-sm hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-2"
                >
                  <Upload size={16} /> رفع صورة (وجه)
                </button>
              )}
              <input ref={licenseFrontRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => setLicenseFront(e.target.files?.[0] || null)} />
            </Field>
            <Field label="صورة رخصة القيادة (ظهر)" error={null}>
              {licenseBack ? (
                <div className="flex items-center gap-3 p-3 border border-border-muted rounded-sm">
                  <img src={URL.createObjectURL(licenseBack)} alt="" className="w-16 h-10 object-cover rounded-sm" />
                  <span className="flex-1 text-sm text-text-secondary truncate">{licenseBack.name}</span>
                  <button type="button" onClick={() => setLicenseBack(null)} className="text-error hover:text-red-700"><X size={16} /></button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => licenseBackRef.current?.click()}
                  className="w-full p-3 border-2 border-dashed border-border-muted rounded-sm text-text-muted text-sm hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-2"
                >
                  <Upload size={16} /> رفع صورة (ظهر)
                </button>
              )}
              <input ref={licenseBackRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => setLicenseBack(e.target.files?.[0] || null)} />
            </Field>
          </div>
        </Section>

        {/* Images */}
        <Section title="الصور">
          {/* Car images drag-drop zone */}
          <div
            className="border-2 border-dashed border-border-muted rounded-sm p-6 text-center hover:border-primary transition-colors cursor-pointer mb-4"
            onClick={() => carImagesRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith('image/'));
              setCarImages((prev) => [...prev, ...files].slice(0, 20));
            }}
          >
            <Upload size={24} className="mx-auto mb-2 text-text-muted" />
            <p className="text-sm text-text-secondary">اسحب الصور هنا أو <span className="text-primary font-medium">اضغط للاختيار</span></p>
            <p className="text-xs text-text-muted mt-1">JPEG, PNG, WebP — حد أقصى 5 ميجا للصورة</p>
            <input ref={carImagesRef} type="file" multiple accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleCarImages} />
          </div>

          {carImages.length > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3 mb-4">
              {carImages.map((f, idx) => (
                <div key={idx} className="relative group">
                  <img src={URL.createObjectURL(f)} alt="" className="w-full h-20 object-cover rounded-sm border border-border-muted" />
                  <button
                    type="button"
                    onClick={() => removeCarImage(idx)}
                    className="absolute top-1 left-1 bg-black/60 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Inspection report */}
          <Field label="صورة تقرير الفحص" error={null}>
            {inspectionImage ? (
              <div className="flex items-center gap-3 p-3 border border-border-muted rounded-sm">
                <img src={URL.createObjectURL(inspectionImage)} alt="" className="w-16 h-10 object-cover rounded-sm" />
                <span className="flex-1 text-sm text-text-secondary truncate">{inspectionImage.name}</span>
                <button type="button" onClick={() => setInspectionImage(null)} className="text-error hover:text-red-700"><X size={16} /></button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => inspectionRef.current?.click()}
                className="w-full p-3 border-2 border-dashed border-border-muted rounded-sm text-text-muted text-sm hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-2"
              >
                <Upload size={16} /> رفع تقرير الفحص
              </button>
            )}
            <input ref={inspectionRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => setInspectionImage(e.target.files?.[0] || null)} />
          </Field>
        </Section>

        {/* Errors / Warnings */}
        {serverError && (
          <div className="bg-red-50 border border-red-200 text-error rounded-sm p-3 text-sm">{serverError}</div>
        )}
        {serverWarning && (
          <div className="bg-yellow-50 border border-yellow-200 text-warning rounded-sm p-3 text-sm flex items-center gap-2">
            <AlertTriangle size={16} />{serverWarning}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3 justify-end">
          <button
            type="button"
            onClick={() => navigate('/dashboard/cars')}
            className="px-5 py-2 text-sm border border-border-muted rounded-sm text-text-secondary hover:bg-background transition-colors"
          >
            إلغاء
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-2 text-sm bg-primary text-white rounded-sm hover:bg-primary-dark transition-colors font-medium disabled:opacity-60"
          >
            {submitting ? 'جاري الحفظ…' : 'حفظ العربية'}
          </button>
        </div>
      </form>
    </div>
  );
}
