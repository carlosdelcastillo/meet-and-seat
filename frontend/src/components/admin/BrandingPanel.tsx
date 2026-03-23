import { useState } from 'react';
import { Building2 } from 'lucide-react';
import { api } from '../../api/client';
import { useBrand } from '../../context/BrandContext';
import { useTranslation } from '../../i18n';
import { showToast } from '../ui/Toast';
import type { BrandSettings } from '../../types';
import { translateApiError } from '../../utils/apiErrors';

export function BrandingPanel() {
  const { brand, refreshBrand } = useBrand();
  const { t } = useTranslation();
  const [form, setForm] = useState<BrandSettings>({ ...brand });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put<BrandSettings>('/brand', form);
      await refreshBrand();
      showToast(t('admin.brandUpdated'));
    } catch (err) {
      showToast(err instanceof Error ? translateApiError(err.message, t) : t('common.error'), 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="grid-2">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="input-group">
            <label>{t('admin.companyName')}</label>
            <input
              className="input"
              value={form.company_name}
              onChange={e => setForm({ ...form, company_name: e.target.value })}
            />
          </div>
          <div className="input-group">
            <label>{t('admin.logoUrl')}</label>
            <input
              className="input"
              value={form.logo_url}
              onChange={e => setForm({ ...form, logo_url: e.target.value })}
              placeholder="https://..."
            />
          </div>
          <div className="grid-2">
            <div className="input-group">
              <label>{t('admin.primaryColor')}</label>
              <div className="color-picker-group">
                <input
                  type="color"
                  value={form.primary_color}
                  onChange={e => setForm({ ...form, primary_color: e.target.value })}
                />
                <input
                  className="input"
                  value={form.primary_color}
                  onChange={e => setForm({ ...form, primary_color: e.target.value })}
                  style={{ flex: 1 }}
                />
              </div>
            </div>
            <div className="input-group">
              <label>{t('admin.accentColor')}</label>
              <div className="color-picker-group">
                <input
                  type="color"
                  value={form.accent_color}
                  onChange={e => setForm({ ...form, accent_color: e.target.value })}
                />
                <input
                  className="input"
                  value={form.accent_color}
                  onChange={e => setForm({ ...form, accent_color: e.target.value })}
                  style={{ flex: 1 }}
                />
              </div>
            </div>
          </div>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? t('common.loading') : t('common.save')}
          </button>
        </div>

        <div className="branding-preview">
          <h4 style={{ marginBottom: '16px' }}>{t('admin.preview')}</h4>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            {form.logo_url ? (
              <img src={form.logo_url} alt="Logo" style={{ height: '40px' }} />
            ) : (
              <Building2 size={32} style={{ color: form.primary_color }} />
            )}
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.25rem' }}>
              {form.company_name}
            </span>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <div style={{
              width: '80px', height: '40px', borderRadius: '8px',
              background: form.primary_color, display: 'flex', alignItems: 'center',
              justifyContent: 'center', color: 'white', fontSize: '0.75rem'
            }}>
              Primary
            </div>
            <div style={{
              width: '80px', height: '40px', borderRadius: '8px',
              background: form.accent_color, display: 'flex', alignItems: 'center',
              justifyContent: 'center', color: 'white', fontSize: '0.75rem'
            }}>
              Accent
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
