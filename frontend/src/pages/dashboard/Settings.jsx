import { useState, useEffect } from 'react';
import { Save, CheckCircle } from 'lucide-react';
import { api } from '../../services/api.js';

const CATEGORY_LABELS = {
  general:       'عام',
  employee:      'الموظفين',
  buyer:         'المشتري',
  financial:     'المالية',
  notifications: 'الإشعارات',
};

const BOOLEAN_KEYS = new Set([
  'escalation_enabled', 'employee_can_edit_car', 'employee_can_delete_car',
  'employee_can_change_status', 'buyer_can_attach_car', 'notification_repeat',
]);

const SELECT_OPTIONS = {
  employee_display_mode: [
    { value: 'list',        label: 'قائمة' },
    { value: 'auto_assign', label: 'توزيع تلقائي' },
  ],
  notification_sound: [
    { value: 'default', label: 'افتراضي' },
    { value: 'bell',    label: 'جرس' },
    { value: 'chime',   label: 'نغمة' },
  ],
  numeral_system: [
    { value: 'western', label: '١٢٣ غربية (1, 2, 3)' },
    { value: 'arabic',  label: '١٢٣ عربية (١, ٢, ٣)' },
  ],
};

export default function Settings() {
  const [grouped, setGrouped]   = useState({});
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [dirty, setDirty]       = useState({});      // key → new value
  const [saving, setSaving]     = useState({});      // key → bool
  const [saved, setSaved]       = useState({});      // key → bool (flash)
  const [saveErrors, setSaveErrors] = useState({});

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get('/settings');
        setGrouped(data.data);
      } catch (err) {
        setError(err.response?.data?.message || 'فشل تحميل الإعدادات');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  function handleChange(key, value) {
    setDirty((d) => ({ ...d, [key]: value }));
    setSaved((s) => ({ ...s, [key]: false }));
    setSaveErrors((e) => ({ ...e, [key]: undefined }));
  }

  async function saveSetting(key) {
    const value = dirty[key];
    setSaving((s) => ({ ...s, [key]: true }));
    setSaveErrors((e) => ({ ...e, [key]: undefined }));
    try {
      const { data } = await api.put(`/settings/${key}`, { value });
      // Update local state
      setGrouped((prev) => {
        const next = { ...prev };
        for (const cat of Object.keys(next)) {
          next[cat] = next[cat].map((s) => s.key === key ? { ...s, value: data.data.value } : s);
        }
        return next;
      });
      setDirty((d) => { const n = { ...d }; delete n[key]; return n; });
      setSaved((s) => ({ ...s, [key]: true }));
      setTimeout(() => setSaved((s) => ({ ...s, [key]: false })), 2000);
    } catch (err) {
      setSaveErrors((e) => ({ ...e, [key]: err.response?.data?.message || 'فشل الحفظ' }));
    } finally {
      setSaving((s) => ({ ...s, [key]: false }));
    }
  }

  if (loading) return <div dir="rtl" className="text-text-muted py-8 text-center">جاري التحميل…</div>;
  if (error) return <div dir="rtl" className="text-error py-8 text-center">{error}</div>;

  const categoryOrder = ['general', 'employee', 'buyer', 'financial', 'notifications'];
  const orderedCategories = [
    ...categoryOrder.filter((c) => grouped[c]),
    ...Object.keys(grouped).filter((c) => !categoryOrder.includes(c)),
  ];

  return (
    <div dir="rtl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary">الإعدادات</h1>
        <p className="text-text-secondary text-sm mt-0.5">إعدادات النظام المختلفة — كل تغيير يُحفظ فوراً</p>
      </div>

      <div className="space-y-6">
        {orderedCategories.map((cat) => {
          const items = grouped[cat];
          if (!items?.length) return null;
          return (
            <div key={cat} className="bg-surface border border-border-muted rounded-md shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-border-muted bg-background">
                <h2 className="font-semibold text-text-primary">{CATEGORY_LABELS[cat] ?? cat}</h2>
              </div>
              <div className="divide-y divide-border-muted">
                {items.map((setting) => {
                  const isDirty = setting.key in dirty;
                  return (
                    <SettingRow
                      key={setting.key}
                      setting={setting}
                      currentVal={isDirty ? dirty[setting.key] : setting.value}
                      isDirty={isDirty}
                      isSaving={saving[setting.key]}
                      isSaved={saved[setting.key]}
                      saveError={saveErrors[setting.key]}
                      onChange={(v) => handleChange(setting.key, v)}
                      onSave={() => saveSetting(setting.key)}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SettingRow({ setting, currentVal, isDirty, isSaving, isSaved, saveError, onChange, onSave }) {
  const isBoolean = BOOLEAN_KEYS.has(setting.key);
  const selectOpts = SELECT_OPTIONS[setting.key];

  return (
    <div className="flex items-start justify-between px-6 py-4 gap-4">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-text-primary">{setting.descriptionAr}</p>
        <p className="text-xs text-text-muted mt-0.5 font-mono">{setting.key}</p>
        {saveError && <p className="text-xs text-error mt-1">{saveError}</p>}
      </div>

      <div className="flex items-center gap-3 shrink-0">
        {isBoolean ? (
          <Toggle
            checked={currentVal === true || currentVal === 'true'}
            onChange={(v) => onChange(v)}
          />
        ) : selectOpts ? (
          <select
            value={currentVal ?? ''}
            onChange={(e) => onChange(e.target.value)}
            className="border border-border-muted rounded-sm text-sm px-2 py-1.5 bg-surface focus:outline-none focus:border-primary"
          >
            {selectOpts.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        ) : (
          <input
            type="number"
            value={currentVal ?? ''}
            min={0}
            step={setting.key === 'tax_percentage' ? 0.01 : 1}
            onChange={(e) => onChange(
              setting.key === 'tax_percentage' ? parseFloat(e.target.value) : parseInt(e.target.value, 10)
            )}
            className="w-24 border border-border-muted rounded-sm text-sm px-2 py-1.5 bg-surface focus:outline-none focus:border-primary"
          />
        )}

        {isDirty && (
          <button
            onClick={onSave}
            disabled={isSaving}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white text-xs rounded-sm hover:bg-primary-dark disabled:opacity-60 transition-colors"
          >
            <Save size={12} /> حفظ
          </button>
        )}

        {isSaved && (
          <CheckCircle size={16} className="text-primary" />
        )}
      </div>
    </div>
  );
}

function Toggle({ checked, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative inline-flex w-11 h-6 rounded-full transition-colors focus:outline-none shrink-0 ${checked ? 'bg-primary' : 'bg-gray-300'}`}
    >
      <span
        className="inline-block w-4 h-4 bg-white rounded-full shadow transition-transform absolute top-1"
        style={{ transform: checked ? 'translateX(24px)' : 'translateX(4px)' }}
      />
    </button>
  );
}
