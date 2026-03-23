import { Sun, Moon, Monitor, LogOut, Globe } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme, type Theme } from '../../context/ThemeContext';
import { useTranslation } from '../../i18n';
import type { Locale } from '../../i18n';
import { api } from '../../api/client';

const themeIcons: Record<Theme, typeof Sun> = {
  light: Sun,
  dark: Moon,
  system: Monitor,
};

const themeOrder: Theme[] = ['light', 'dark', 'system'];

export function Header() {
  const { logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const { locale, setLocale, t } = useTranslation();

  const ThemeIcon = themeIcons[theme];

  const cycleTheme = () => {
    const idx = themeOrder.indexOf(theme);
    const next = themeOrder[(idx + 1) % themeOrder.length];
    setTheme(next);
  };

  const handleLocaleChange = (newLocale: Locale) => {
    setLocale(newLocale);
    api.put('/users/me/preferences', { locale: newLocale }).catch(() => {});
  };

  return (
    <header className="header">
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Globe size={16} style={{ color: 'var(--color-text-muted)' }} />
        <select
          className="input"
          style={{ width: 'auto', padding: '6px 12px', fontSize: '0.8125rem' }}
          value={locale}
          onChange={e => handleLocaleChange(e.target.value as Locale)}
        >
          <option value="es">{t('language.es')}</option>
          <option value="en">{t('language.en')}</option>
          <option value="ca">{t('language.ca')}</option>
        </select>
      </div>

      <button
        className="btn-ghost"
        onClick={cycleTheme}
        title={t(`theme.${theme}`)}
      >
        <ThemeIcon size={18} />
      </button>

      <button className="btn-ghost" onClick={logout} title={t('auth.logout')}>
        <LogOut size={18} />
      </button>
    </header>
  );
}
