import { useState } from 'react';
import { BrandingPanel } from '../components/admin/BrandingPanel';
import { ResourceManager } from '../components/admin/ResourceManager';
import { UserManager } from '../components/admin/UserManager';
import { useTranslation } from '../i18n';

type AdminTab = 'branding' | 'resources' | 'users';

export function AdminPage() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<AdminTab>('branding');

  return (
    <div>
      <div className="page-header">
        <h1>{t('admin.title')}</h1>
      </div>

      <div className="tabs">
        <button className={`tab${tab === 'branding' ? ' active' : ''}`} onClick={() => setTab('branding')}>
          {t('admin.branding')}
        </button>
        <button className={`tab${tab === 'resources' ? ' active' : ''}`} onClick={() => setTab('resources')}>
          {t('admin.resources')}
        </button>
        <button className={`tab${tab === 'users' ? ' active' : ''}`} onClick={() => setTab('users')}>
          {t('admin.users')}
        </button>
      </div>

      {tab === 'branding' && <BrandingPanel />}
      {tab === 'resources' && <ResourceManager />}
      {tab === 'users' && <UserManager />}
    </div>
  );
}
