import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';

export default function Login() {
  const { login } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();
  const from      = location.state?.from?.pathname || '/dashboard';

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [retryAfter, setRetryAfter] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (retryAfter) return;

    setError('');
    setLoading(true);

    try {
      await login(username.trim(), password);
      navigate(from, { replace: true });
    } catch (err) {
      const status = err.response?.status;
      const code   = err.response?.data?.error_code;

      if (status === 429) {
        const resetHeader = err.response?.headers?.['x-ratelimit-reset'];
        const waitMin = resetHeader
          ? Math.ceil((Number(resetHeader) * 1000 - Date.now()) / 60000)
          : 15;
        setRetryAfter(waitMin);
        setError(`حاولت كتير — حاول تاني بعد ${waitMin} دقيقة`);
      } else if (code === 'INVALID_CREDENTIALS') {
        setError('اسم المستخدم أو كلمة المرور غلط');
      } else {
        setError('حصل خطأ — حاول تاني');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4" dir="rtl">
      <div className="w-full max-w-sm bg-surface rounded-lg shadow-lg p-8">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary tracking-tight">أوتوزين</h1>
          <p className="text-text-secondary text-sm mt-1">لوحة تحكم الإدارة</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">
              اسم المستخدم
            </label>
            <input
              type="text"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full border border-border-muted rounded-sm px-3 py-2 text-text-primary bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="superadmin"
              disabled={loading}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">
              كلمة المرور
            </label>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-border-muted rounded-sm px-3 py-2 text-text-primary bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="••••••••"
              disabled={loading}
              required
            />
          </div>

          {error && (
            <p className="text-error text-sm bg-red-50 border border-red-200 rounded-sm px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !!retryAfter}
            className="w-full bg-primary hover:bg-primary-dark text-white font-semibold py-2.5 rounded-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? 'جاري الدخول…' : 'دخول'}
          </button>
        </form>
      </div>
    </div>
  );
}
