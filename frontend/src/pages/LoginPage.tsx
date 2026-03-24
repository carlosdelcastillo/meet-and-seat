import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useBrand } from '../context/BrandContext';
import { useTranslation } from '../i18n';
import { translateApiError } from '../utils/apiErrors';

export function LoginPage() {
  const { login, register } = useAuth();
  const { brand } = useBrand();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [department, setDepartment] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isRegister) {
        await register(email, password, fullName, department);
      } else {
        await login(email, password);
      }
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? translateApiError(err.message, t) : t('auth.invalidCredentials'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="card login-card">
        <div className="login-header">
          {brand.logo_url ? (
            <img src={brand.logo_url} alt={brand.company_name} className="login-logo" />
          ) : (
            <Building2 size={48} style={{ color: 'var(--color-primary)', marginBottom: '16px' }} />
          )}
          <h1>{isRegister ? t('auth.registerTitle') : t('auth.loginTitle')}</h1>
          <p>{brand.company_name} — {t('auth.loginSubtitle')}</p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          {isRegister && (
            <>
              <div className="input-group">
                <label>{t('auth.fullName')}</label>
                <input
                  className="input"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  required
                />
              </div>
              <div className="input-group">
                <label>{t('auth.department')}</label>
                <input
                  className="input"
                  value={department}
                  onChange={e => setDepartment(e.target.value)}
                />
              </div>
            </>
          )}
          <div className="input-group">
            <label>{t('auth.email')}</label>
            <input
              type="email"
              className="input"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="input-group">
            <label>{t('auth.password')}</label>
            <input
              type="password"
              className="input"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>

          {error && <div data-testid="login-error" style={{ color: 'var(--color-danger)', fontSize: '0.875rem' }}>{error}</div>}

          <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
            {loading ? t('common.loading') : (isRegister ? t('auth.register') : t('auth.login'))}
          </button>
        </form>

        <div className="login-footer">
          {isRegister ? (
            <span>{t('auth.hasAccount')} <a href="#" onClick={e => { e.preventDefault(); setIsRegister(false); }}>{t('auth.login')}</a></span>
          ) : (
            <span>{t('auth.noAccount')} <a href="#" onClick={e => { e.preventDefault(); setIsRegister(true); }}>{t('auth.register')}</a></span>
          )}
        </div>
      </div>
    </div>
  );
}
