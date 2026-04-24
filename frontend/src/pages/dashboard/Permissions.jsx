import { useState, useEffect, useCallback } from 'react';
import { api } from '../../services/api.js';

const MODULE_LABELS = {
  cars_view:            'عرض العربيات',
  cars_add:             'إضافة عربية',
  cars_edit:            'تعديل العربيات',
  cars_delete:          'حذف العربيات',
  cars_change_status:   'تغيير حالة العربية',
  financial_view:       'عرض الماليات',
  financial_close_sale: 'قفل البيعة',
  reports_view:         'عرض التقارير',
  reports_export:       'تصدير التقارير',
  settings_view:        'عرض الإعدادات',
  settings_edit:        'تعديل الإعدادات',
  users_view:           'عرض المستخدمين',
  users_create:         'إنشاء مستخدمين',
  users_edit:           'تعديل المستخدمين',
  users_delete:         'حذف المستخدمين',
  archive_view:         'عرض الأرشيف',
  employee_monitor:     'مراقبة الموظفين',
  permissions_manage:   'إدارة الصلاحيات',
};

function Toggle({ checked, onChange, disabled }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={onChange}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none
                  ${checked ? 'bg-primary' : 'bg-border-muted'}
                  ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <span
        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform shadow-sm
                    ${checked ? 'translate-x-1' : 'translate-x-4'}`}
      />
    </button>
  );
}

export default function Permissions() {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [saving, setSaving]   = useState({});

  const load = useCallback(async () => {
    try {
      const { data: res } = await api.get('/permissions');
      setData(res.data);
    } catch {
      setError('فشل تحميل الصلاحيات');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggle = async (roleId, moduleKey, currentValue) => {
    const key = `${roleId}:${moduleKey}`;
    setSaving((s) => ({ ...s, [key]: true }));

    const newValue = !currentValue;

    setData((prev) => {
      const updated = { ...prev };
      updated.matrix = {
        ...updated.matrix,
        [roleId]: {
          ...(updated.matrix[roleId] || {}),
          [moduleKey]: newValue,
        },
      };
      return updated;
    });

    try {
      await api.patch(`/permissions/${roleId}/${moduleKey}`, { isEnabled: newValue });
    } catch {
      setData((prev) => {
        const updated = { ...prev };
        updated.matrix = {
          ...updated.matrix,
          [roleId]: {
            ...(updated.matrix[roleId] || {}),
            [moduleKey]: currentValue,
          },
        };
        return updated;
      });
    } finally {
      setSaving((s) => ({ ...s, [key]: false }));
    }
  };

  if (loading) return <div className="text-text-secondary">جاري التحميل…</div>;
  if (error)   return <div className="text-error">{error}</div>;
  if (!data)   return null;

  const { roles, moduleKeys, matrix } = data;

  return (
    <div dir="rtl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary">إدارة الصلاحيات</h1>
        <p className="text-text-secondary text-sm mt-1">
          تحكم في صلاحيات كل دور — مدير النظام له صلاحيات كاملة دايمًا
        </p>
      </div>

      <div className="bg-surface rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-background border-b border-border-muted">
              <tr>
                <th className="text-right px-4 py-3 font-medium text-text-secondary min-w-[200px]">
                  الصلاحية
                </th>
                {roles.map((role) => (
                  <th key={role.id} className="text-center px-4 py-3 font-medium text-text-secondary min-w-[110px]">
                    <div>{role.displayNameAr}</div>
                    <div className="text-text-muted font-normal text-xs">{role.name}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border-muted">
              {moduleKeys.map((moduleKey) => (
                <tr key={moduleKey} className="hover:bg-background/50">
                  <td className="px-4 py-3 text-text-primary font-medium">
                    {MODULE_LABELS[moduleKey] || moduleKey}
                    <span className="block text-xs text-text-muted font-normal">{moduleKey}</span>
                  </td>
                  {roles.map((role) => {
                    const isEnabled = matrix[role.id]?.[moduleKey] ?? false;
                    const key       = `${role.id}:${moduleKey}`;
                    const isSaving  = saving[key];
                    return (
                      <td key={role.id} className="px-4 py-3 text-center">
                        <Toggle
                          checked={isEnabled}
                          disabled={isSaving}
                          onChange={() => toggle(role.id, moduleKey, isEnabled)}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
