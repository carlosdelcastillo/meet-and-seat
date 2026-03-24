import { useState, useEffect } from 'react';
import { Calendar, Check, Copy, ExternalLink, HelpCircle, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../i18n';
import { Avatar } from '../components/ui/Avatar';
import { Modal } from '../components/ui/Modal';
import { showToast } from '../components/ui/Toast';
import { api } from '../api/client';
import { translateApiError } from '../utils/apiErrors';
import type { CalendarTokenResponse } from '../types';

function TutorialModal({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const steps = [
    t('profile.tutorialStep1'),
    t('profile.tutorialStep2'),
    t('profile.tutorialStep3'),
    t('profile.tutorialStep4'),
    t('profile.tutorialStep5'),
  ];

  return (
    <Modal title={t('profile.tutorialTitle')} onClose={onClose}>
      <ol style={{ paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
        {steps.map((step, i) => (
          <li key={i} style={{ fontSize: '0.9rem', lineHeight: 1.5, color: 'var(--color-text)' }}>
            {step}
          </li>
        ))}
      </ol>
      <div style={{
        marginTop: 20,
        padding: '12px 14px',
        background: 'var(--color-hover)',
        borderRadius: 'var(--radius-md)',
        fontSize: '0.8125rem',
        color: 'var(--color-text-secondary)',
        lineHeight: 1.5,
      }}>
        {t('profile.tutorialNote')}
      </div>
    </Modal>
  );
}

export function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const { t } = useTranslation();

  const [fullName, setFullName] = useState(user?.full_name ?? '');
  const [department, setDepartment] = useState(user?.department ?? '');
  const [savingProfile, setSavingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  const [calendarUrls, setCalendarUrls] = useState<CalendarTokenResponse | null>(null);
  const [generatingToken, setGeneratingToken] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [showTutorial, setShowTutorial] = useState(false);

  useEffect(() => {
    if (user?.calendar_token) {
      const base = window.location.origin;
      const prefix = `/api/v1/calendar/${user.calendar_token}`;
      setCalendarUrls({
        token: user.calendar_token,
        me_url: `${base}${prefix}/me.ics`,
        rooms_url: `${base}${prefix}/rooms.ics`,
        desks_url: `${base}${prefix}/desks.ics`,
      });
    }
  }, [user?.calendar_token]);

  if (!user) return null;

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    try {
      await api.put('/auth/me', { full_name: fullName, department });
      await refreshUser();
      showToast(t('profile.saved'), 'success');
    } catch (err) {
      showToast(err instanceof Error ? translateApiError(err.message, t) : t('common.error'), 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      showToast(t('profile.passwordMismatch'), 'error');
      return;
    }
    setSavingPassword(true);
    try {
      await api.put('/auth/me', { current_password: currentPassword, new_password: newPassword });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      showToast(t('profile.passwordChanged'), 'success');
    } catch (err) {
      showToast(err instanceof Error ? translateApiError(err.message, t) : t('common.error'), 'error');
    } finally {
      setSavingPassword(false);
    }
  };

  const handleGenerateToken = async () => {
    setGeneratingToken(true);
    try {
      const result = await api.post<CalendarTokenResponse>('/calendar/token', {});
      setCalendarUrls(result);
    } catch (err) {
      showToast(err instanceof Error ? translateApiError(err.message, t) : t('common.error'), 'error');
    } finally {
      setGeneratingToken(false);
    }
  };

  const handleCopy = async (url: string, key: string) => {
    await navigator.clipboard.writeText(url);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
    showToast(t('profile.copied'), 'success');
  };

  const feeds = calendarUrls
    ? [
        { key: 'me', label: t('profile.calendarMe'), url: calendarUrls.me_url },
        { key: 'rooms', label: t('profile.calendarRooms'), url: calendarUrls.rooms_url },
        { key: 'desks', label: t('profile.calendarDesks'), url: calendarUrls.desks_url },
      ]
    : [];

  return (
    <div>
      <div className="page-header">
        <h2>{t('profile.title')}</h2>
      </div>

      {/* ── Avatar ───────────────────────────────────────────── */}
      <div className="card" style={{ marginBottom: 24, display: 'flex', alignItems: 'center', gap: 24 }}>
        <Avatar name={user.full_name} email={user.email} size={80} />
        <div>
          <h3 style={{ marginBottom: 4 }}>{user.full_name}</h3>
          <div style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>{user.email}</div>
          <div style={{ marginTop: 10, fontSize: '0.8125rem', color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
            {t('profile.gravatarInfo')}{' '}
            <a href="https://gravatar.com" target="_blank" rel="noopener noreferrer"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
              {t('profile.gravatarLink')}
              <ExternalLink size={11} />
            </a>
          </div>
        </div>
      </div>

      {/* ── Personal data + Password ──────────────────────────── */}
      <div className="grid-2" style={{ marginBottom: 24 }}>
        <div className="card">
          <h3 style={{ marginBottom: 20 }}>{t('profile.personalData')}</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="input-group">
              <label>{t('profile.fullName')}</label>
              <input
                className="input"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
              />
            </div>
            <div className="input-group">
              <label>{t('profile.department')}</label>
              <input
                className="input"
                value={department}
                onChange={e => setDepartment(e.target.value)}
              />
            </div>
            <button
              className="btn btn-primary"
              onClick={handleSaveProfile}
              disabled={savingProfile || !fullName.trim()}
              style={{ alignSelf: 'flex-start' }}
            >
              {savingProfile ? t('common.loading') : t('common.save')}
            </button>
          </div>
        </div>

        <div className="card">
          <h3 style={{ marginBottom: 20 }}>{t('profile.changePassword')}</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="input-group">
              <label>{t('profile.currentPassword')}</label>
              <input
                className="input"
                type="password"
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>
            <div className="input-group">
              <label>{t('profile.newPassword')}</label>
              <input
                className="input"
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                autoComplete="new-password"
              />
            </div>
            <div className="input-group">
              <label>{t('profile.confirmPassword')}</label>
              <input
                className="input"
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
              />
            </div>
            <button
              className="btn btn-primary"
              onClick={handleChangePassword}
              disabled={savingPassword || !currentPassword || !newPassword || !confirmPassword}
              style={{ alignSelf: 'flex-start' }}
            >
              {savingPassword ? t('common.loading') : t('profile.changePassword')}
            </button>
          </div>
        </div>
      </div>

      {/* ── Calendar sync ─────────────────────────────────────── */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 'var(--radius-md)',
            background: 'rgba(15,118,110,0.08)', color: 'var(--color-primary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Calendar size={18} />
          </div>
          <h3>{t('profile.calendarSync')}</h3>
        </div>
        <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', marginBottom: 20, lineHeight: 1.6 }}>
          {t('profile.calendarDescription')}
        </p>

        {feeds.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
            {feeds.map(({ key, label, url }) => (
              <div key={key} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 14px',
                background: 'var(--color-bg)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
              }}>
                <span style={{ fontSize: '0.8125rem', fontWeight: 500, minWidth: 150, flexShrink: 0 }}>
                  {label}
                </span>
                <span style={{
                  flex: 1, fontSize: '0.75rem', color: 'var(--color-text-muted)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  fontFamily: 'monospace',
                }}>
                  {url}
                </span>
                <button
                  className="btn btn-sm btn-secondary"
                  onClick={() => handleCopy(url, key)}
                  title={label}
                  style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  {copiedKey === key ? <Check size={14} /> : <Copy size={14} />}
                </button>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          {feeds.length === 0 ? (
            <button
              className="btn btn-secondary"
              onClick={handleGenerateToken}
              disabled={generatingToken}
            >
              <Calendar size={16} />
              {generatingToken ? t('common.loading') : t('profile.generateToken')}
            </button>
          ) : (
            <button
              className="btn btn-sm btn-secondary"
              onClick={handleGenerateToken}
              disabled={generatingToken}
            >
              <RefreshCw size={14} />
              {generatingToken ? t('common.loading') : t('profile.regenerateToken')}
            </button>
          )}
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => setShowTutorial(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <HelpCircle size={14} />
            {t('profile.howToAdd')}
          </button>
        </div>

        {feeds.length > 0 && (
          <p style={{ marginTop: 10, fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
            ⚠ {t('profile.regenerateWarning')}
          </p>
        )}
      </div>

      {showTutorial && <TutorialModal onClose={() => setShowTutorial(false)} />}
    </div>
  );
}
