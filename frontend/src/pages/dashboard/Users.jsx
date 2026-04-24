import { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2, KeyRound, X, Check } from 'lucide-react';
import { api } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.jsx';

const ROLE_NAMES = { superadmin: 'مدير النظام', admin: 'شريك', cfo: 'مدير حسابات', team_manager: 'مدير فريق', employee: 'موظف' };
const STATUS_LABELS = { available: 'متاح', busy: 'مشغول', offline: 'غير متاح' };
const STATUS_COLORS = { available: 'bg-green-100 text-green-700', busy: 'bg-orange-100 text-orange-700', offline: 'bg-gray-100 text-gray-500' };

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-surface rounded-lg shadow-lg w-full max-w-md p-6 z-10" dir="rtl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-text-primary">{title}</h2>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary">
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function DeleteConfirm({ user, onConfirm, onClose, loading }) {
  return (
    <Modal title="تأكيد الحذف" onClose={onClose}>
      <p className="text-text-secondary mb-6">
        هل أنت متأكد إنك عايز تمسح المستخدم <strong className="text-text-primary">{user.fullName}</strong>؟
        <br /><span className="text-error text-sm">العملية دي مش ممكن ترجعها.</span>
      </p>
      <div className="flex gap-3 justify-end">
        <button onClick={onClose} className="px-4 py-2 text-sm border border-border-muted rounded-sm hover:bg-background">
          إلغاء
        </button>
        <button
          onClick={onConfirm}
          disabled={loading}
          className="px-4 py-2 text-sm bg-error text-white rounded-sm hover:bg-red-600 disabled:opacity-60"
        >
          {loading ? 'جاري الحذف…' : 'حذف'}
        </button>
      </div>
    </Modal>
  );
}

const EMPTY_FORM = { username: '', fullName: '', password: '', roleId: '' };

export default function Users() {
  const { user: currentUser } = useAuth();
  const isSuperAdmin = currentUser?.role?.name === 'superadmin';

  const [users, setUsers]           = useState([]);
  const [roles, setRoles]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');

  // Modal states
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [passwordTarget, setPasswordTarget] = useState(null);

  const [form, setForm]             = useState(EMPTY_FORM);
  const [formError, setFormError]   = useState('');
  const [saving, setSaving]         = useState(false);
  const [newPassword, setNewPassword] = useState('');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [usersRes, rolesRes] = await Promise.all([
        api.get('/users'),
        api.get('/users/roles'),
      ]);
      setUsers(usersRes.data.data);
      setRoles(rolesRes.data.data.filter((r) => r.name !== 'superadmin'));
    } catch {
      setError('فشل تحميل البيانات');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setFormError('');
    setCreateOpen(true);
  };

  const openEdit = (u) => {
    setForm({ username: u.username, fullName: u.fullName, password: '', roleId: u.role.id });
    setFormError('');
    setEditTarget(u);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setFormError('');
    setSaving(true);
    try {
      await api.post('/users', { username: form.username, fullName: form.fullName, password: form.password, roleId: form.roleId });
      setCreateOpen(false);
      load();
    } catch (err) {
      setFormError(err.response?.data?.message || 'فشل الإنشاء');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    setFormError('');
    setSaving(true);
    try {
      await api.put(`/users/${editTarget.id}`, { fullName: form.fullName, roleId: form.roleId });
      setEditTarget(null);
      load();
    } catch (err) {
      setFormError(err.response?.data?.message || 'فشل التعديل');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setSaving(true);
    try {
      await api.delete(`/users/${deleteTarget.id}`);
      setDeleteTarget(null);
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'فشل الحذف');
      setDeleteTarget(null);
    } finally {
      setSaving(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post(`/users/${passwordTarget.id}/password`, { password: newPassword });
      setPasswordTarget(null);
      setNewPassword('');
    } catch (err) {
      setFormError(err.response?.data?.message || 'فشل تغيير كلمة المرور');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-text-secondary">جاري التحميل…</div>;
  if (error)   return <div className="text-error">{error}</div>;

  return (
    <div dir="rtl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-text-primary">المستخدمين</h1>
        {(isSuperAdmin || currentUser?.permissions?.users_create) && (
          <button
            onClick={openCreate}
            className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-sm text-sm font-medium hover:bg-primary-dark transition-colors"
          >
            <Plus size={16} />
            إضافة مستخدم
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-surface rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-background border-b border-border-muted">
              <tr>
                <th className="text-right px-4 py-3 font-medium text-text-secondary">الاسم الكامل</th>
                <th className="text-right px-4 py-3 font-medium text-text-secondary">اسم المستخدم</th>
                <th className="text-right px-4 py-3 font-medium text-text-secondary">الدور</th>
                <th className="text-right px-4 py-3 font-medium text-text-secondary">الحالة</th>
                <th className="text-right px-4 py-3 font-medium text-text-secondary">نشط</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border-muted">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-background/50">
                  <td className="px-4 py-3 font-medium text-text-primary">{u.fullName}</td>
                  <td className="px-4 py-3 text-text-secondary">{u.username}</td>
                  <td className="px-4 py-3">
                    <span className="bg-primary-light text-primary text-xs px-2 py-0.5 rounded-full">
                      {u.role.displayNameAr}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[u.status]}`}>
                      {STATUS_LABELS[u.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {u.isActive
                      ? <Check size={16} className="text-success" />
                      : <X size={16} className="text-error" />
                    }
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 justify-end">
                      {(isSuperAdmin || currentUser?.permissions?.users_edit) && u.role.name !== 'superadmin' && (
                        <>
                          <button
                            onClick={() => { setPasswordTarget(u); setFormError(''); setNewPassword(''); }}
                            className="p-1.5 text-text-muted hover:text-warning transition-colors"
                            title="تغيير كلمة المرور"
                          >
                            <KeyRound size={15} />
                          </button>
                          <button
                            onClick={() => openEdit(u)}
                            className="p-1.5 text-text-muted hover:text-primary transition-colors"
                            title="تعديل"
                          >
                            <Pencil size={15} />
                          </button>
                        </>
                      )}
                      {(isSuperAdmin || currentUser?.permissions?.users_delete) && u.role.name !== 'superadmin' && (
                        <button
                          onClick={() => setDeleteTarget(u)}
                          className="p-1.5 text-text-muted hover:text-error transition-colors"
                          title="حذف"
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-text-muted">
                    مفيش مستخدمين
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create modal */}
      {createOpen && (
        <Modal title="إضافة مستخدم جديد" onClose={() => setCreateOpen(false)}>
          <form onSubmit={handleCreate} className="space-y-4">
            <Field label="اسم المستخدم" value={form.username} onChange={(v) => setForm((f) => ({ ...f, username: v }))} required />
            <Field label="الاسم الكامل"  value={form.fullName} onChange={(v) => setForm((f) => ({ ...f, fullName: v }))} required />
            <Field label="كلمة المرور"   value={form.password} onChange={(v) => setForm((f) => ({ ...f, password: v }))} type="password" required />
            <RoleSelect roles={roles} value={form.roleId} onChange={(v) => setForm((f) => ({ ...f, roleId: v }))} />
            {formError && <p className="text-error text-sm">{formError}</p>}
            <ModalActions onClose={() => setCreateOpen(false)} saving={saving} label="إنشاء" />
          </form>
        </Modal>
      )}

      {/* Edit modal */}
      {editTarget && (
        <Modal title="تعديل المستخدم" onClose={() => setEditTarget(null)}>
          <form onSubmit={handleEdit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">اسم المستخدم</label>
              <p className="text-text-primary font-medium">{editTarget.username}</p>
            </div>
            <Field label="الاسم الكامل" value={form.fullName} onChange={(v) => setForm((f) => ({ ...f, fullName: v }))} required />
            <RoleSelect roles={roles} value={form.roleId} onChange={(v) => setForm((f) => ({ ...f, roleId: v }))} />
            {formError && <p className="text-error text-sm">{formError}</p>}
            <ModalActions onClose={() => setEditTarget(null)} saving={saving} label="حفظ" />
          </form>
        </Modal>
      )}

      {/* Reset password modal */}
      {passwordTarget && (
        <Modal title={`تغيير كلمة مرور ${passwordTarget.fullName}`} onClose={() => setPasswordTarget(null)}>
          <form onSubmit={handleResetPassword} className="space-y-4">
            <Field label="كلمة المرور الجديدة" value={newPassword} onChange={setNewPassword} type="password" required />
            {formError && <p className="text-error text-sm">{formError}</p>}
            <ModalActions onClose={() => setPasswordTarget(null)} saving={saving} label="تغيير" />
          </form>
        </Modal>
      )}

      {/* Delete confirm */}
      {deleteTarget && (
        <DeleteConfirm
          user={deleteTarget}
          onConfirm={handleDelete}
          onClose={() => setDeleteTarget(null)}
          loading={saving}
        />
      )}
    </div>
  );
}

function Field({ label, value, onChange, type = 'text', required }) {
  return (
    <div>
      <label className="block text-sm font-medium text-text-primary mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border border-border-muted rounded-sm px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        required={required}
      />
    </div>
  );
}

function RoleSelect({ roles, value, onChange }) {
  return (
    <div>
      <label className="block text-sm font-medium text-text-primary mb-1">الدور</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border border-border-muted rounded-sm px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        required
      >
        <option value="">اختر الدور</option>
        {roles.map((r) => (
          <option key={r.id} value={r.id}>{r.displayNameAr}</option>
        ))}
      </select>
    </div>
  );
}

function ModalActions({ onClose, saving, label }) {
  return (
    <div className="flex gap-3 justify-end pt-2">
      <button type="button" onClick={onClose} className="px-4 py-2 text-sm border border-border-muted rounded-sm hover:bg-background">
        إلغاء
      </button>
      <button
        type="submit"
        disabled={saving}
        className="px-4 py-2 text-sm bg-primary text-white rounded-sm hover:bg-primary-dark disabled:opacity-60"
      >
        {saving ? 'جاري الحفظ…' : label}
      </button>
    </div>
  );
}
