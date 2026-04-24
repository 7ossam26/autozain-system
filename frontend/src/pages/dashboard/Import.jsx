import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, FileSpreadsheet, CheckCircle, AlertTriangle, ArrowRight, X } from 'lucide-react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { api } from '../../services/api.js';
import { useToast } from '../../context/ToastContext.jsx';

const REQUIRED_COLS = [
  'car_type', 'model', 'listing_price', 'transmission',
  'plate_number', 'odometer', 'seller_name', 'seller_phone', 'seller_residence',
];

const OPTIONAL_COLS = ['color', 'fuel_type', 'additional_info', 'license_info'];

const TRANSMISSION_VALUES = ['automatic', 'manual'];

const STEP = { UPLOAD: 'upload', PREVIEW: 'preview', DONE: 'done' };

function validateRow(row, idx) {
  const errors = [];
  const rowNum = idx + 1;

  REQUIRED_COLS.forEach((col) => {
    if (!row[col] && row[col] !== 0) errors.push(`الصف ${rowNum}: ${col} مطلوب`);
  });

  if (row.listing_price !== undefined && row.listing_price !== '') {
    const n = Number(String(row.listing_price).replace(/,/g, ''));
    if (!Number.isInteger(n) || n < 0) errors.push(`الصف ${rowNum}: listing_price يجب أن يكون رقم صحيح بدون كسور (قيمة: ${row.listing_price})`);
  }

  if (row.odometer !== undefined && row.odometer !== '') {
    const n = Number(String(row.odometer).replace(/,/g, ''));
    if (!Number.isInteger(n) || n < 0) errors.push(`الصف ${rowNum}: odometer يجب أن يكون رقم صحيح`);
  }

  if (row.transmission && !TRANSMISSION_VALUES.includes(row.transmission)) {
    errors.push(`الصف ${rowNum}: transmission يجب أن يكون "automatic" أو "manual" (قيمة: ${row.transmission})`);
  }

  return errors;
}

export default function Import() {
  const navigate    = useNavigate();
  const toast       = useToast();
  const fileRef     = useRef(null);

  const [step, setStep]         = useState(STEP.UPLOAD);
  const [rows, setRows]         = useState([]);
  const [errors, setErrors]     = useState([]);
  const [fileName, setFileName] = useState('');
  const [importing, setImporting] = useState(false);
  const [importedCount, setImportedCount] = useState(0);

  const parseFile = (file) => {
    setFileName(file.name);
    const ext = file.name.split('.').pop().toLowerCase();

    if (ext === 'csv') {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (result) => processRows(result.data),
        error: () => toast.error('فشل قراءة ملف CSV'),
      });
    } else if (['xlsx', 'xls'].includes(ext)) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const wb = XLSX.read(e.target.result, { type: 'array' });
          const ws = wb.Sheets[wb.SheetNames[0]];
          const data = XLSX.utils.sheet_to_json(ws, { defval: '' });
          processRows(data);
        } catch {
          toast.error('فشل قراءة ملف Excel');
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      toast.error('نوع الملف غير مدعوم — CSV أو Excel فقط');
    }
  };

  const processRows = (data) => {
    if (!data || data.length === 0) {
      toast.error('الملف فاضي أو مش فيه بيانات');
      return;
    }

    // Check required columns exist
    const cols = Object.keys(data[0] ?? {}).map((k) => k.trim().toLowerCase());
    const missing = REQUIRED_COLS.filter((c) => !cols.includes(c));
    if (missing.length) {
      toast.error(`الأعمدة التالية ناقصة: ${missing.join(', ')}`);
      return;
    }

    // Normalise keys
    const normalized = data.map((row) => {
      const clean = {};
      Object.entries(row).forEach(([k, v]) => { clean[k.trim().toLowerCase()] = String(v ?? '').trim(); });
      return clean;
    });

    // Validate
    const allErrors = normalized.flatMap((row, i) => validateRow(row, i));
    setRows(normalized);
    setErrors(allErrors);
    setStep(STEP.PREVIEW);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) parseFile(file);
  };

  const handleConfirm = async () => {
    if (errors.length > 0) return;
    setImporting(true);
    try {
      const { data } = await api.post('/cars/import', { rows });
      setImportedCount(data.data.imported);
      setStep(STEP.DONE);
      toast.success(`تم استيراد ${data.data.imported} عربية بنجاح`);
    } catch (err) {
      const msg = err.response?.data?.message || 'فشل الاستيراد';
      const serverErrors = err.response?.data?.data?.errors;
      if (serverErrors?.length) {
        setErrors(serverErrors.flatMap((e) => e.errors.map((m) => `الصف ${e.row}: ${m}`)));
      } else {
        toast.error(msg);
      }
    } finally {
      setImporting(false);
    }
  };

  const reset = () => {
    setStep(STEP.UPLOAD);
    setRows([]);
    setErrors([]);
    setFileName('');
    if (fileRef.current) fileRef.current.value = '';
  };

  const validRows  = rows.filter((_, i) => !errors.some((e) => e.startsWith(`الصف ${i + 1}:`)));
  const invalidCount = rows.length - validRows.length;

  return (
    <div dir="rtl" className="max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate('/dashboard/cars')}
          className="text-text-muted hover:text-text-primary transition-colors"
          aria-label="رجوع"
        >
          <ArrowRight size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-text-primary">استيراد عربيات</h1>
          <p className="text-text-secondary text-sm mt-0.5">استيراد من ملف CSV أو Excel</p>
        </div>
      </div>

      {/* Template download hint */}
      <div className="bg-primary-light border border-primary/20 rounded-md p-4 mb-6 text-sm">
        <p className="font-medium text-primary mb-1">الأعمدة المطلوبة:</p>
        <p className="text-text-secondary font-mono text-xs leading-relaxed">
          {REQUIRED_COLS.join(' · ')}
        </p>
        <p className="text-text-muted text-xs mt-2">
          أعمدة اختيارية: {OPTIONAL_COLS.join(' · ')}
        </p>
        <p className="text-text-muted text-xs mt-1">
          transmission يقبل: automatic أو manual فقط. الأسعار والعداد: أرقام صحيحة فقط (بدون كسور).
        </p>
      </div>

      {/* ── STEP 1: Upload ── */}
      {step === STEP.UPLOAD && (
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          className="border-2 border-dashed border-border-muted rounded-md p-12 text-center hover:border-primary transition-colors cursor-pointer"
          onClick={() => fileRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && fileRef.current?.click()}
          aria-label="رفع ملف CSV أو Excel"
        >
          <FileSpreadsheet size={48} className="mx-auto mb-4 text-text-muted opacity-40" />
          <p className="text-text-primary font-medium mb-1">اسحب الملف هنا أو اضغط للاختيار</p>
          <p className="text-text-muted text-sm">CSV أو Excel (.xlsx, .xls)</p>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            className="hidden"
            onChange={(e) => { if (e.target.files[0]) parseFile(e.target.files[0]); }}
          />
        </div>
      )}

      {/* ── STEP 2: Preview ── */}
      {step === STEP.PREVIEW && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <FileSpreadsheet size={18} className="text-primary" />
              <span className="text-sm font-medium text-text-primary">{fileName}</span>
            </div>
            <button
              onClick={reset}
              className="text-text-muted hover:text-text-primary text-sm flex items-center gap-1 transition-colors"
            >
              <X size={14} /> تغيير الملف
            </button>
          </div>

          {/* Summary */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="bg-surface border border-border-muted rounded-md p-3 text-center">
              <p className="text-xl font-bold text-text-primary">{rows.length}</p>
              <p className="text-xs text-text-muted">إجمالي الصفوف</p>
            </div>
            <div className={`border rounded-md p-3 text-center ${errors.length === 0 ? 'bg-green-50 border-green-200' : 'bg-green-50 border-green-200'}`}>
              <p className="text-xl font-bold text-success">{rows.length - invalidCount}</p>
              <p className="text-xs text-text-muted">صالحة للاستيراد</p>
            </div>
            <div className={`border rounded-md p-3 text-center ${invalidCount > 0 ? 'bg-red-50 border-red-200' : 'bg-surface border-border-muted'}`}>
              <p className={`text-xl font-bold ${invalidCount > 0 ? 'text-error' : 'text-text-muted'}`}>{invalidCount}</p>
              <p className="text-xs text-text-muted">بها أخطاء</p>
            </div>
          </div>

          {/* Errors */}
          {errors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4 max-h-48 overflow-y-auto">
              <div className="flex items-center gap-2 text-error font-medium text-sm mb-2">
                <AlertTriangle size={16} />
                {errors.length} خطأ في الملف
              </div>
              <ul className="space-y-1">
                {errors.slice(0, 20).map((err, i) => (
                  <li key={i} className="text-xs text-error">• {err}</li>
                ))}
                {errors.length > 20 && (
                  <li className="text-xs text-text-muted">… و {errors.length - 20} خطأ آخر</li>
                )}
              </ul>
            </div>
          )}

          {/* Preview table */}
          <div className="bg-surface border border-border-muted rounded-md overflow-hidden mb-4">
            <div className="overflow-x-auto max-h-64">
              <table className="w-full text-xs">
                <thead className="bg-background border-b border-border-muted sticky top-0">
                  <tr>
                    {['#', 'النوع', 'الموديل', 'السعر', 'ناقل الحركة', 'النمرة', 'العداد', 'البائع'].map((h) => (
                      <th key={h} className="text-right py-2 px-3 font-medium text-text-secondary whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 50).map((row, i) => {
                    const hasError = errors.some((e) => e.startsWith(`الصف ${i + 1}:`));
                    return (
                      <tr
                        key={i}
                        className={`border-b border-border-muted last:border-0 ${hasError ? 'bg-red-50' : ''}`}
                      >
                        <td className="py-1.5 px-3 text-text-muted">{i + 1}</td>
                        <td className="py-1.5 px-3">{row.car_type}</td>
                        <td className="py-1.5 px-3">{row.model}</td>
                        <td className="py-1.5 px-3">{row.listing_price}</td>
                        <td className="py-1.5 px-3">{row.transmission}</td>
                        <td className="py-1.5 px-3">{row.plate_number}</td>
                        <td className="py-1.5 px-3">{row.odometer}</td>
                        <td className="py-1.5 px-3">{row.seller_name}</td>
                      </tr>
                    );
                  })}
                  {rows.length > 50 && (
                    <tr>
                      <td colSpan={8} className="py-2 px-3 text-center text-text-muted">
                        … و {rows.length - 50} صف آخر
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-end">
            <button
              onClick={reset}
              className="px-4 py-2 text-sm border border-border-muted rounded-sm hover:bg-background transition-colors"
            >
              إلغاء
            </button>
            <button
              onClick={handleConfirm}
              disabled={importing || errors.length > 0 || rows.length === 0}
              className="px-6 py-2 text-sm bg-primary text-white rounded-sm hover:bg-primary-dark disabled:opacity-60 transition-colors flex items-center gap-2"
            >
              {importing ? (
                <>
                  <Upload size={16} className="animate-bounce" />
                  جاري الاستيراد…
                </>
              ) : (
                <>
                  <Upload size={16} />
                  استيراد {rows.length - invalidCount} عربية
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 3: Done ── */}
      {step === STEP.DONE && (
        <div className="text-center py-12">
          <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={36} className="text-success" />
          </div>
          <h2 className="text-xl font-bold text-text-primary mb-2">تم الاستيراد بنجاح</h2>
          <p className="text-text-secondary mb-6">تم إضافة {importedCount} عربية للمخزون</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={reset}
              className="px-4 py-2 text-sm border border-border-muted rounded-sm hover:bg-background transition-colors"
            >
              استيراد ملف آخر
            </button>
            <button
              onClick={() => navigate('/dashboard/cars')}
              className="px-4 py-2 text-sm bg-primary text-white rounded-sm hover:bg-primary-dark transition-colors"
            >
              عرض العربيات
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
